// The Preview card's eyes: finding the project's dev server
import { tr } from '../core/lang'
import type { EngineInterface, On } from 'claude-code'
import { fieldsOf } from '../core/eventfields'

import { DEV_PORTS, DEV_TIMEOUT_S, curlArgv, inProject, lsofAllArgv, lsofArgv, lsofCwdArgv, parseCurl, parseCwds, parseListeners, parseLsof } from '../core/eyesdev'
import type { Listener } from '../core/eyesdev'
import { devFact, frontEdits, isFrontFile } from '../core/previewcard'
import type { DevFact } from '../core/previewcard'
import { LOOK_WHAT, NEED_CHROME, PROBE_MS, SHOT_MARK, SHOT_QUARTERS, eyesDir, isOwnProfile, lastKey, lookDetail, lookText, parseReach, pidsOfProfile, profilePath, profilesDir, reachArgv, shotArgs, shotFile, stamp, urlKey } from '../core/eyes'
import type { Taken, Width } from '../core/eyes'
import { bindFs, fileHashes, fileSizes, isMissing, makeDir, moveFile, opsOf, removeTree } from '../core/fileops'
import { bindSafeFs, checkWrite, safeFsOf, safeWrite, takenProbe } from '../core/safewrite'
import { withToastGate } from '../core/io'
import { bindPlatform, platformOfIo, stopPid } from '../core/procs'
import { readWinListeners } from '../core/winnet'
import { sysWord } from '../core/syswords'
import { homeFrom } from '../core/platform'
import { WIN_LIST_MS, bindChrome, findChrome, psArgvOf, runChrome, sleepArgvOf } from '../core/chrome'
import type { Io } from '../core/io'
import { LEDGER_KEY, pushLog } from './compaction'
import { isEditTool } from '../core/tools'

// IO-BLOCK-START
function io($: EngineInterface): Io {
  return withToastGate({
    now: () => $.clock.now(),
    home: () => homeFrom({ HOME: () => $.env.get('HOME'), USERPROFILE: () => $.env.get('USERPROFILE'), HOMEDRIVE: () => $.env.get('HOMEDRIVE'), HOMEPATH: () => $.env.get('HOMEPATH') }),
    sessionId: () => $.session.id(),
    get: key => $.store.get(key),
    set: (key, value) => $.store.set(key, value),
    del: key => $.store.delete(key),
    keys: () => $.store.keys(),
    read: path => $.fs.read(path),
    write: (path, text) => $.fs.write(path, text),
    run: (argv, init) => $.process.run(argv, init),
    ask: (question, options) => $.ui.ask(question, options),
    complete: req => $.model.complete(req),
    toast: text => $.ui.toast(text),
    invalidate: () => $.ui.invalidate('ui.render'),
  })
}
// IO-BLOCK-END

// FS-BLOCK-START
// The Io of this file, with the runtime's file calls bound to it (core/fileops.ts reads them; closures only, `$` is not passed on).
function ioFs($: EngineInterface): Io {
  const made = bindFs(io($), {
    stat: path => $.fs.stat(path),
    list: path => $.fs.list(path),
    readBytes: async path => await $.fs.read(path, { as: 'bytes' }),
  })
  bindSafeFs(made, { stat: (path, options) => $.fs.stat(path, options), list: path => $.fs.list(path) })
  const plat = bindPlatform(made, () => $.env.get('OS'))
  return bindChrome(plat, {
    exists: path => $.fs.exists(path),
    env: async () => {
      const programFiles = await $.env.get('ProgramFiles')
      const programFilesX86 = await $.env.get('ProgramFiles(x86)')
      const localAppData = await $.env.get('LOCALAPPDATA')
      return { programFiles, programFilesX86, localAppData }
    },
  })
}
// FS-BLOCK-END

type Ran = { exitCode: number; stdout: string; stderr: string }
// Never throws.
async function sh(i: Io, argv: readonly string[], ms = PROBE_MS): Promise<Ran | undefined> {
  try {
    return await i.run(argv, { timeoutMs: ms })
  } catch {
    return undefined
  }
}

let seq = 0

async function hasChrome(i: Io): Promise<boolean> {
  return (await findChrome(i)) !== undefined
}

// A new empty profile folder for one Chrome run; undefined when it cannot be made.
async function newProfile(i: Io, home: string): Promise<string | undefined> {
  const profile = profilePath(home, await i.now(), (seq += 1))
  return isOwnProfile(home, profile) && (await makeDir(opsOf(i), profile)) ? profile : undefined
}

async function chromeRun(i: Io, profile: string, outName: string, mark: string, quarters: number, args: readonly string[]): Promise<boolean> {
  return runChrome(i, profile, outName, mark, quarters, args)
}

// Never throws, never ends anything by name.
async function endChrome(i: Io, home: string, profiles: readonly string[]): Promise<void> {
  try {
    if (profiles.length === 0) return
    const plat = await platformOfIo(i)
    const psArgv = psArgvOf(plat)
    let ps = await sh(i, psArgv, plat === 'win32' ? WIN_LIST_MS : PROBE_MS)
    if (ps === undefined) return
    const mine = (text: string): number[] => profiles.flatMap(p => pidsOfProfile(text, p, plat === 'win32'))
    const all = mine(ps.stdout)
    for (const pid of all) await stopPid(i.run, plat, pid, { ms: PROBE_MS })
    let left = all
    for (let t = 0; t < 2 && left.length > 0; t += 1) {
      await sh(i, sleepArgvOf(plat), plat === 'win32' ? WIN_LIST_MS : 3_000)
      ps = await sh(i, psArgv, plat === 'win32' ? WIN_LIST_MS : PROBE_MS)
      if (ps === undefined) return
      const now = new Set(mine(ps.stdout))
      left = all.filter(pid => now.has(pid))
    }
    for (const pid of left) await stopPid(i.run, plat, pid, { force: true, ms: PROBE_MS })
    for (const p of profiles) if (isOwnProfile(home, p)) await removeTree(opsOf(i), p, profilesDir(home))
  } catch {
  }
}

type LookOut = { ok: false; text: string } | { ok: true; url: string; name: string; taken: Taken[]; folder: string; text: string }
type LookIn = { url: string; name: string; widths: readonly Width[]; force?: boolean }

async function look(i: Io, root: string, inp: LookIn): Promise<LookOut> {
  const home = await i.home()
  if (!(await hasChrome(i))) return { ok: false, text: sysWord(NEED_CHROME, await platformOfIo(i)) }
  if (home === '') return { ok: false, text: 'Eyes could not find your home folder, so it has nowhere to keep its Chrome profile.' } // en-only: plain answer of a slash command (text twin)
  const r = await sh(i, reachArgv(inp.url), 8_000)
  const code = r === undefined ? undefined : parseReach(r.exitCode, r.stdout)
  if (code === undefined) return { ok: false, text: `Nothing answers at ${inp.url}. No picture was taken. Start the dev server, then try again.` }
  const eyes = eyesDir(root)
  const folder = `${eyes}/${stamp(await i.now())}`
  const profiles: string[] = []
  const one = async (width: Width): Promise<Taken> => {
    const profile = await newProfile(i, home)
    if (profile === undefined) return { width, status: 'failed', why: 'the Chrome profile folder could not be made' } // en-only: plain answer of a slash command (text twin)
    profiles.push(profile)
    const file = `${profile}/shot.png`
    await chromeRun(i, profile, 'run.out', SHOT_MARK, SHOT_QUARTERS, shotArgs(profile, file, width, inp.url, false, true))
    const [hashes, sizes] = await Promise.all([fileHashes(opsOf(i), [file]), fileSizes(opsOf(i), [file])])
    const sum = hashes.get(file)
    const bytes = sizes.get(file)
    if (sum === undefined || bytes === undefined || bytes === 0) return { width, status: 'failed', why: 'Chrome wrote no picture' } // en-only: plain answer of a slash command (text twin)
    const key = lastKey(root, inp.name, width)
    const last = (await i.get(key)) as { hash?: string; path?: string } | undefined
    if (inp.force !== true && last?.hash === sum) return { width, status: 'unchanged', path: last.path }
    const dest = `${folder}/${shotFile(inp.name, width)}`
    const fs = safeFsOf(i)
    if (fs === undefined || !(await checkWrite(fs, root, dest)).ok) return { width, status: 'failed', why: 'the pictures folder is a link or leads outside the project' } // en-only: plain answer of a slash command (text twin)
    if (!(await makeDir(opsOf(i), folder)) || !(await moveFile(opsOf(i), file, dest))) return { width, status: 'failed', why: 'the picture could not be saved' } // en-only: plain answer of a slash command (text twin)
    await i.set(key, { hash: sum, path: dest, at: await i.now() })
    return { width, status: 'saved', path: dest, bytes }
  }
  let taken: Taken[]
  try {
    taken = await Promise.all(inp.widths.map(one))
  } finally {
    await endChrome(i, home, profiles)
  }
  const saved = taken.filter(t => t.status === 'saved').length
  if (saved > 0) {
    await keepIgnore(i, root, eyes)
    await i.set(urlKey(root, inp.name), inp.url)
    await pushLog(i, LEDGER_KEY, { at: await i.now(), session: await i.sessionId(), what: LOOK_WHAT, detail: lookDetail(inp.name, saved), how: 'typed', did: true })
  }
  return { ok: true, url: inp.url, name: inp.name, taken, folder, text: lookText(inp.url, inp.name, taken, false) }
}

async function keepIgnore(i: Io, root: string, eyes: string): Promise<void> {
  try {
    const fs = safeFsOf(i)
    if (fs === undefined) return
    const file = `${eyes}/.gitignore`
    const free = await takenProbe(fs)(file).then(
      () => false,
      err => isMissing(err),
    )
    if (free) await safeWrite(fs, (p, x) => i.write(p, x), root, file, '*\n')
  } catch {
  }
}

async function winHeard(i: Io): Promise<Map<number, Listener>> {
  const heard = new Map<number, Listener>()
  for (const l of (await readWinListeners(i.run, 4_000)) ?? []) if (!heard.has(l.port)) heard.set(l.port, { command: l.command === '' ? 'unknown program' : l.command, pid: l.pid }) // en-only: plain answer of a slash command (text twin)
  return heard
}

// The lookups of the ports run together and only the first listener is asked for its page.
export async function devFound(i: Io, root: string | undefined): Promise<DevFact | undefined> {
  try {
    let heard: Map<number, Listener>
    const win = (await platformOfIo(i)) === 'win32'
    if (win) heard = await winHeard(i)
    else {
      const all = await sh(i, lsofAllArgv(), 4_000)
      heard = all === undefined ? new Map<number, Listener>() : parseListeners(all.exitCode, all.stdout)
    }
    // On Windows the folder of a program cannot be read the same way, so that reading is not narrowed to the folder.
    if (!win && heard.size > 0) {
      if (root === undefined) return undefined
      const cwds = await sh(i, lsofCwdArgv([...new Set([...heard.values()].map(l => l.pid))]), 4_000)
      const where = cwds === undefined ? new Map<number, string>() : parseCwds(cwds.exitCode, cwds.stdout)
      for (const [port, l] of [...heard]) {
        const cwd = where.get(l.pid)
        if (cwd === undefined || !inProject(cwd, root)) heard.delete(port)
      }
    }
    const port = DEV_PORTS.find(p => heard.has(p))
    const who = port === undefined ? undefined : heard.get(port)
    const first = port === undefined || who === undefined ? undefined : ([port, who] as [number, Listener])
    if (first === undefined) return undefined
    const c = await sh(i, curlArgv(first[0]), (DEV_TIMEOUT_S + 3) * 1_000)
    return devFact(first[0], first[1], c === undefined ? undefined : parseCurl(c.exitCode, c.stdout))
  } catch {
    return undefined
  }
}

// Never throws.
export async function paneLook(i: Io, root: string, port: number, widths: readonly Width[]): Promise<{ said: string; saved: boolean }> {
  try {
    const url = `http://localhost:${port}/`
    const got = await look(i, root, { url, name: nameOfPort(port), widths, force: true })
    return { said: got.text.split('\n').slice(0, 2).join(' '), saved: got.ok && got.taken.some(t => t.path !== undefined) }
  } catch {
    return { said: '', saved: false }
  }
}
const nameOfPort = (port: number): string => `localhost-${port}`

export function registerEyes(on: On): void {
  on('tool.call', { tool: /(?<eyesedit>)/ }, async ($, e, next) => {
    const result = await next(e)
    try {
      if (isEditTool(e.tool) && result.deny === undefined && result.isError !== true) {
        const path = fieldsOf(e).file_path
        if (typeof path === 'string' && isFrontFile(path)) frontEdits.n += 1
      }
    } catch {
    }
    return result
  }).catch(($, e, next) => next(e))
}
