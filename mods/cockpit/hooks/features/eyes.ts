// The Preview card's eyes: finding the project's dev server
import { tr } from '../core/lang'
import { fillIn } from '../core/fillin'
import type { EngineInterface, On, PromptSubmitResult } from 'claude-code'
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
import { homeFrom, isInside } from '../core/platform'
import { winCwds } from '../core/winprocs'
import { WIN_LIST_MS, bindChrome, findChrome, psArgvOf, runChrome, sleepArgvOf } from '../core/chrome'
import type { Io } from '../core/io'
import { LEDGER_KEY, pushLog } from './compaction'
import { isEditTool } from '../core/tools'
import { ASK_FAILED, PIC_ASKED, SUBMIT_AFTER_MS, PIC_DOWN, PIC_FAILED, PIC_LOCAL_ONLY, PIC_NO_CHROME, PIC_NO_SERVER, picPrompt, picTarget, vakenWords } from '../core/phonenote'
import { subArgs } from '../core/menu'
import { BY_PERSON_ONLY, byPerson } from '../core/origin'
import { sayOf } from './phone'

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

type LookOut = { ok: false; text: string; why?: 'chrome' | 'down' } | { ok: true; url: string; name: string; taken: Taken[]; folder: string; text: string }
type LookIn = { url: string; name: string; widths: readonly Width[]; force?: boolean }

async function look(i: Io, root: string, inp: LookIn): Promise<LookOut> {
  const home = await i.home()
  if (!(await hasChrome(i))) return { ok: false, text: tr(sysWord(NEED_CHROME, await platformOfIo(i))), why: 'chrome' }
  if (home === '') return { ok: false, text: tr('Eyes could not find your home folder, so it has nowhere to keep its Chrome profile.') }
  const r = await sh(i, reachArgv(inp.url, await platformOfIo(i)), 8_000)
  const code = r === undefined ? undefined : parseReach(r.exitCode, r.stdout)
  if (code === undefined) return { ok: false, text: fillIn(tr('Nothing answers at {url}. No picture was taken. Start the dev server, then try again.'), { url: inp.url }), why: 'down' }
  const eyes = eyesDir(root)
  const folder = `${eyes}/${stamp(await i.now())}`
  const profiles: string[] = []
  const one = async (width: Width): Promise<Taken> => {
    const profile = await newProfile(i, home)
    if (profile === undefined) return { width, status: 'failed', why: tr('the Chrome profile folder could not be made') }
    profiles.push(profile)
    const file = `${profile}/shot.png`
    await chromeRun(i, profile, 'run.out', SHOT_MARK, SHOT_QUARTERS, shotArgs(profile, file, width, inp.url, false, true))
    const [hashes, sizes] = await Promise.all([fileHashes(opsOf(i), [file]), fileSizes(opsOf(i), [file])])
    const sum = hashes.get(file)
    const bytes = sizes.get(file)
    if (sum === undefined || bytes === undefined || bytes === 0) return { width, status: 'failed', why: tr('Chrome wrote no picture') }
    const key = lastKey(root, inp.name, width)
    const last = (await i.get(key)) as { hash?: string; path?: string } | undefined
    if (inp.force !== true && last?.hash === sum) return { width, status: 'unchanged', path: last.path }
    const dest = `${folder}/${shotFile(inp.name, width)}`
    const fs = safeFsOf(i)
    if (fs === undefined || !(await checkWrite(fs, root, dest)).ok) return { width, status: 'failed', why: tr('the pictures folder is a link or leads outside the project') }
    if (!(await makeDir(opsOf(i), folder)) || !(await moveFile(opsOf(i), file, dest))) return { width, status: 'failed', why: tr('the picture could not be saved') }
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
  for (const l of (await readWinListeners(i.run, 4_000)) ?? []) if (!heard.has(l.port)) heard.set(l.port, { command: l.command === '' ? tr('unknown program') : l.command, pid: l.pid })
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
    // Only a server whose working folder is in the session's folder counts. On Windows the folder is read from the program, the command line as the fallback.
    if (heard.size > 0) {
      if (root === undefined || root === '') return undefined
      const pids = [...new Set([...heard.values()].map(l => l.pid))]
      let where: Map<number, string>
      if (win) where = await winCwds(i.run, pids.map(pid => ({ pid, command: [...heard.values()].find(l => l.pid === pid)?.command ?? '' })), [root], 4_000)
      else {
        const cwds = await sh(i, lsofCwdArgv(pids), 4_000)
        where = cwds === undefined ? new Map<number, string>() : parseCwds(cwds.exitCode, cwds.stdout)
      }
      for (const [port, l] of [...heard]) {
        const cwd = where.get(l.pid)
        if (cwd === undefined || !(win ? isInside(root, cwd, 'win32') : inProject(cwd, root))) heard.delete(port)
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
// `paths`: each picture saved, in the order asked.
export async function paneLook(i: Io, root: string, port: number, widths: readonly Width[]): Promise<{ said: string; saved: boolean; paths: { width: Width; path: string }[] }> {
  try {
    const url = `http://localhost:${port}/`
    const got = await look(i, root, { url, name: nameOfPort(port), widths, force: true })
    const paths = got.ok ? got.taken.flatMap(t => (t.path === undefined ? [] : [{ width: t.width, path: t.path }])) : []
    return { said: got.text.split('\n').slice(0, 2).join(' '), saved: paths.length > 0, paths }
  } catch {
    return { said: '', saved: false, paths: [] }
  }
}
const nameOfPort = (port: number): string => `localhost-${port}`

// One phone-wide picture of a page on this computer, for `/vaken pic`: the path of the picture, or why there is none when it is known. Never throws.
export async function phoneLook(i: Io, root: string, url: string): Promise<{ path?: string; why?: 'chrome' | 'down' }> {
  try {
    const got = await look(i, root, { url, name: 'phone', widths: [390], force: true })
    if (!got.ok) return got.why === undefined ? {} : { why: got.why }
    const path = got.taken.find(x => x.status === 'saved')?.path
    return path === undefined ? {} : { path }
  } catch {
    return {}
  }
}

// The project folder of this session, else its working folder.
async function rootOf($: EngineInterface): Promise<string> {
  const root = await $.session.root()
  if (root !== '') return root
  const cwd = await $.session.cwd()
  return cwd
}

// The picture goes to Claude as the person's own words: they typed the line.
function submitter($: EngineInterface): (text: string) => Promise<PromptSubmitResult> {
  return text => $.prompt.submit({ text, asUser: true })
}

// A prompt cannot be submitted while the command's own hook holds the turn, so it goes a moment after; a refusal is said in a toast.
function submitSoon($: EngineInterface, text: string, failed: string): void {
  const send = submitter($)
  const i = io($)
  $.clock.after(SUBMIT_AFTER_MS, () => {
    send(text).then(
      r => {
        if ('drop' in r && r.drop !== undefined) i.toast(failed, true)
      },
      () => i.toast(failed, true),
    )
  })
}

// `/vaken pic [url or port]`: a picture of a page on this computer (the dev server vaken knows, by default), then Claude is asked to send it.
async function picFor($: EngineInterface, rest: string): Promise<{ said: string; prompt?: string }> {
  const i = ioFs($)
  const t = await sayOf(i)
  const target = picTarget(rest)
  if (target.kind === 'refused') return { said: t(PIC_LOCAL_ONLY) }
  const root = await rootOf($)
  if (root === '') return { said: t(PIC_NO_SERVER) }
  let url: string
  if (target.kind === 'url') url = target.url
  else {
    const dev = await devFound(i, root)
    if (dev === undefined || dev.status === undefined) return { said: t(PIC_NO_SERVER) }
    url = `http://localhost:${dev.port}/`
  }
  const got = await phoneLook(i, root, url)
  if (got.path === undefined) return { said: t(got.why === 'chrome' ? PIC_NO_CHROME : got.why === 'down' ? PIC_DOWN : PIC_FAILED).replace('{url}', url) }
  return { said: t(PIC_ASKED).replace('{url}', url), prompt: picPrompt(got.path) }
}

async function picWord($: EngineInterface, rest: string, origin: unknown): Promise<string> {
  if (!byPerson(origin)) return (await sayOf(io($)))(BY_PERSON_ONLY)
  const asked = await picFor($, rest)
  if (asked.prompt !== undefined) submitSoon($, asked.prompt, (await sayOf(io($)))(ASK_FAILED))
  return asked.said
}

export function registerEyes(on: On): void {
  on('command.run', { command: 'vaken' }, async ($, e, next) => {
    const rest = subArgs(e.args, 'pic')
    if (rest === undefined) return next(e)
    return { text: await picWord($, rest, e.origin) }
  })

  // `/vaken pic` that came as prompt text (from the phone, or typed while Claude works): the prompt becomes the fixed one; a refusal goes to the person, not to Claude.
  on('prompt.submit', { text: /(?<eyespic>)/ }, async ($, e, next) => {
    if (!byPerson(e.origin)) return next(e)
    const words = vakenWords(e.text)
    if (words?.kind !== 'pic') return next(e)
    const asked = await picFor($, words.rest)
    if (asked.prompt !== undefined) return next({ ...e, text: asked.prompt })
    try {
      await $.session.append({ message: { type: 'system', content: [{ type: 'text', text: asked.said }] } })
    } catch {
    }
    return { drop: asked.said }
  }).catch(($, e, next) => next(e))

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
