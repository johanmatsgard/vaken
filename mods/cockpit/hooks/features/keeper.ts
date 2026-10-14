// The store keeper runtime: removes a session's notes when it ends, sweeps old notes once a day, and makes room when the store is full.
import type { EngineInterface, On } from 'claude-code'

import { briefSweepArgv, isBriefFile } from '../core/autosafe'
import { removeEmptyDir, removeFiles } from '../core/fileops'
import { withToastGate } from '../core/io'
import { bindSafeFs } from '../core/safewrite'
import { detectStyle, homeFrom } from '../core/platform'
import type { Io } from '../core/io'
import { DAY_KEY, ENDED_KEY, GONE_MS, KEPT_FAMILIES, endKeys, fullToast, localDay, parseEnded, planSweep, withEnded } from '../core/keeper'
import { CHECKPOINTS_REL, copyDir, indexKey, isCopyFile, loadIndex, namedKey, parseNamed, removeCopies, removeCopyDir, safeId, shrinkIndex } from '../core/undo'

// IO-BLOCK-START
function io($: EngineInterface): Io {
  // Bound to the safe file calls
  return bindSafeFs(withToastGate({
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
  }), { stat: (path, options) => $.fs.stat(path, options), list: path => $.fs.list(path) })
}
// IO-BLOCK-END

// The daily sweep waits a little after the session starts, so the start itself stays quick.
const SWEEP_DELAY_MS = 30_000
const SESSION_PREFIX = 'cockpit:session:'
const EYES_PREFIX = 'cockpit:eyes:last:'
const UNDO_INDEX_PREFIX = 'cockpit:undo:index:'

let sweeping = false
let toldFull = false

const atOf = (v: unknown): number | undefined => {
  const at = (v as { at?: unknown; updatedAt?: unknown } | undefined)?.at ?? (v as { updatedAt?: unknown } | undefined)?.updatedAt
  return typeof at === 'number' && Number.isFinite(at) ? at : undefined
}

export async function sweep(i: Io, full: boolean): Promise<number> {
  const now = await i.now()
  const me = await i.sessionId()
  const keys = await i.keys()
  const records = new Map<string, number>()
  const live = new Set<string>([me])
  const eyesAt = new Map<string, number | undefined>()
  for (const k of keys) {
    if (k.startsWith(SESSION_PREFIX)) {
      const at = atOf(await i.get(k))
      const sid = k.slice(SESSION_PREFIX.length)
      if (at !== undefined) records.set(sid, at)
      if (at !== undefined && now - at <= GONE_MS) live.add(sid)
    } else if (k.startsWith(EYES_PREFIX)) eyesAt.set(k, atOf(await i.get(k)))
  }
  const before = parseEnded(await i.get(ENDED_KEY))
  const plan = planSweep(keys, { now, live, ended: before, eyesAt, records, full })
  const home = await i.home()
  let n = 0
  for (const k of plan.remove) {
    try {
      if (k.startsWith(UNDO_INDEX_PREFIX) && home !== '') {
        const sid = k.slice(UNDO_INDEX_PREFIX.length)
        await removeCopies(i, home, sid, (await loadIndex(i, sid)).snaps.filter(s => s.kind === 'saved').map(s => s.id))
        await removeCopyDir(i, home, sid)
      }
      await i.del(k)
      n += 1
    } catch {
    }
  }
  if (JSON.stringify(plan.ended) !== JSON.stringify(before)) await i.set(ENDED_KEY, plan.ended).catch(() => undefined)
  return n
}

const linesOfOut = (out: string): string[] => out.split('\n').map(l => l.trim()).filter(l => l !== '')

// Folders on disk vaken made and nothing else removes, swept with the daily sweep, never on a hot path.
export async function sweepFolders(i: Io, keys: readonly string[]): Promise<number> {
  let n = 0
  try {
    const home = await i.home()
    if (home === '' || detectStyle(home) !== 'posix') return 0
    const old = await i.run(briefSweepArgv(home), { timeoutMs: 10_000 })
    const briefs = old.exitCode === 0 ? linesOfOut(old.stdout).filter(p => isBriefFile(home, p)) : []
    if (briefs.length > 0 && (await removeFiles({ run: i.run }, briefs))) n += briefs.length
    const known = new Set(keys.filter(k => k.startsWith(UNDO_INDEX_PREFIX)).map(k => safeId(k.slice(UNDO_INDEX_PREFIX.length))))
    const root = `${home.replace(/\/+$/, '')}/${CHECKPOINTS_REL}`
    const keepDays = KEPT_FAMILIES[UNDO_INDEX_PREFIX] ?? 7
    const dirs = await i.run(['find', root, '-mindepth', '1', '-maxdepth', '1', '-type', 'd', '-mtime', `+${keepDays}`], { timeoutMs: 10_000 })
    for (const dir of dirs.exitCode === 0 ? linesOfOut(dirs.stdout) : []) {
      const name = dir.slice(root.length + 1)
      if (!/^[A-Za-z0-9_-]{1,80}$/.test(name) || known.has(name) || copyDir(home, name) !== dir) continue
      const inside = await i.run(['find', dir, '-maxdepth', '1', '-type', 'f', '-name', '*.txt'], { timeoutMs: 10_000 })
      const files = (inside.exitCode === 0 ? linesOfOut(inside.stdout) : []).filter(p => isCopyFile(home, p))
      if (files.length > 0 && (await removeFiles({ run: i.run }, files))) n += files.length
      await removeEmptyDir({ run: i.run }, dir)
    }
  } catch {
  }
  return n
}

async function atEnd(i: Io, sid: string): Promise<void> {
  const keys = await i.keys()
  for (const k of endKeys(keys, sid)) await i.del(k).catch(() => undefined)
  const now = await i.now()
  await i.set(ENDED_KEY, withEnded(parseEnded(await i.get(ENDED_KEY)), sid, now))
  if (keys.includes(indexKey(sid))) {
    const idx = await loadIndex(i, sid)
    const cut = shrinkIndex(idx, parseNamed(await i.get(namedKey(sid))))
    if (cut.idx.snaps.length < idx.snaps.length) {
      await i.set(indexKey(sid), cut.idx)
      const home = await i.home()
      if (home !== '') await removeCopies(i, home, sid, cut.gone)
    }
  }
}

export function registerKeeper(on: On): void {
  on('session.start', { cwd: /(?<keeper>)/ }, async ($, e, next) => {
    try {
      const i = io($)
      const today = localDay(await i.now())
      if ((await i.get(DAY_KEY)) !== today) {
        await i.set(DAY_KEY, today)
        $.clock.after(SWEEP_DELAY_MS, () => {
          void (async () => {
            if (sweeping) return
            sweeping = true
            try {
              const i2 = io($)
              await sweep(i2, false)
              await sweepFolders(i2, await i2.keys())
            } catch {
            } finally {
              sweeping = false
            }
          })()
        })
      }
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('session.end', { sessionId: /(?<keeper>)/ }, async ($, e, next) => {
    try {
      await atEnd(io($), e.sessionId)
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('store.set', { key: /(?<keeper>)/ }, async ($, e, next) => {
    try {
      return await next(e)
    } catch (err) {
      if (sweeping) throw err
      sweeping = true
      let n = 0
      try {
        n = await sweep(io($), true)
      } catch {
        n = 0
      } finally {
        sweeping = false
      }
      if (n === 0) throw err
      if (!toldFull) {
        toldFull = true
        io($).toast(fullToast(n), true)
      }
      return await next(e)
    }
  }).catch(($, e, next) => next(e))
}
