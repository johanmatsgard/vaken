// Same-folder awareness: a band line when another live session works in the same folder (or the same git worktree) as this one
import { keptValue } from '../core/negcache'
import type { Kept } from '../core/negcache'
import type { EngineInterface, On } from 'claude-code'

import { clearBand, postBand } from '../core/band'
import { withToastGate } from '../core/io'
import { homeFrom, isAbsolute } from '../core/platform'
import type { Io } from '../core/io'
import { NEIGHBORS_BAND_ID, NEIGHBORS_BAND_TEXT, NEIGHBORS_TTL_MS, NEIGHBORS_WHAT, ledgerDetail, neighborsOf, neighborsText, parseStamp, stampKey, verdict } from '../core/neighbors'
import type { Candidate, Neighbor, Place } from '../core/neighbors'
import { alivePids, listRecords } from '../core/record'
import { readSetting } from '../core/settings'
import { LEDGER_KEY, pushLog } from './compaction'
import { classify, nameOf } from './home/logic'
import { subArgs } from '../core/menu'

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

const GIT_MS = 3_000
// The worktree root of a folder never changes while the session runs, so an answer is kept per folder
export const tops = new Map<string, Kept<string>>()
const TOPS_MAX = 200

// The root of the git worktree that holds `cwd`; undefined when it is not in one, or git does not answer.
async function topOf(i: Io, cwd: string): Promise<string | undefined> {
  if (cwd === '') return undefined
  const now = await i.now()
  const kept = keptValue(tops, cwd, now)
  if (kept.hit) return kept.value
  let top: string | undefined
  try {
    const r = await i.run(['git', 'rev-parse', '--show-toplevel'], { cwd, timeoutMs: GIT_MS })
    const line = r.exitCode === 0 ? (r.stdout.trim().split('\n')[0] ?? '').trim() : ''
    top = isAbsolute(line) ? line : undefined
  } catch {
    top = undefined
  }
  if (tops.size >= TOPS_MAX) tops.clear()
  tops.set(cwd, { value: top, at: now })
  return top
}

// Only the sessions that are not gone are asked for their worktree root.
async function candidates(i: Io, me: string, now: number): Promise<Candidate[]> {
  const records = (await listRecords(i)).filter(r => r.sessionId !== me)
  const alive = await alivePids(i, records)
  const out: Candidate[] = []
  for (const rec of records) {
    const kind = classify(rec, now, alive)
    if (kind === 'gone') continue
    out.push({ sessionId: rec.sessionId, name: nameOf(rec), kind, place: { cwd: rec.cwd, top: await topOf(i, rec.cwd) } })
  }
  return out
}

export async function findNeighbors(i: Io, cwd: string): Promise<Neighbor[]> {
  const me = await i.sessionId()
  const here: Place = { cwd, top: await topOf(i, cwd) }
  return neighborsOf(me, here, await candidates(i, me, await i.now()))
}

// Never throws.
export async function neighborsCheck(i: Io, cwd: string): Promise<'off' | 'clear' | 'quiet' | 'post'> {
  try {
    const sid = await i.sessionId()
    const mode = await readSetting(i, 'neighbors.warn')
    if (mode !== 'on') {
      await clearBand(i, NEIGHBORS_BAND_ID)
      return 'off'
    }
    const list = await findNeighbors(i, cwd)
    const now = await i.now()
    const v = verdict(mode, list.length, parseStamp(await i.get(stampKey(sid))), now)
    if (v === 'clear') {
      await clearBand(i, NEIGHBORS_BAND_ID)
      await i.del(stampKey(sid))
    } else if (v === 'post') {
      await postBand(i, 'warn', NEIGHBORS_BAND_ID, NEIGHBORS_BAND_TEXT, NEIGHBORS_TTL_MS)
      await i.set(stampKey(sid), now)
      await pushLog(i, LEDGER_KEY, { at: now, session: sid, what: NEIGHBORS_WHAT, detail: ledgerDetail(list.length), how: 'auto', did: true })
    }
    return v
  } catch {
    return 'quiet'
  }
}

const LOOK_EVERY_MS = 60_000
let lookedAt: number | undefined
async function look($: EngineInterface, always = false): Promise<void> {
  try {
    const now = await $.clock.now()
    if (!always && lookedAt !== undefined && now - lookedAt >= 0 && now - lookedAt < LOOK_EVERY_MS) return
    lookedAt = now
    const cwd = await $.session.cwd()
    await neighborsCheck(io($), cwd)
  } catch {
  }
}

export function registerNeighbors(on: On): void {
  on('session.start', { cwd: /(?<neighbors>)/ }, async ($, e, next) => {
    try {
    } catch {
      // the command is optional: a failure shows less, never breaks the session
    }
    void look($, true)
    return next(e)
  }).catch(($, e, next) => next(e))

  on('prompt.submit', { text: /(?<neighbors>)/ }, async ($, e, next) => {
    void look($)
    return next(e)
  }).catch(($, e, next) => next(e))

  on('session.end', { sessionId: /(?<neighbors>)/ }, async ($, e, next) => {
    try {
      await io($).del(stampKey(e.sessionId))
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'vaken' }, async ($, e, next) => {
    const rest0 = subArgs(e.args, 'neighbors')
    if (rest0 === undefined) return next(e)
    try {
      const i = io($)
      const cwd = await $.session.cwd()
      return { text: neighborsText(await readSetting(i, 'neighbors.warn'), cwd === '' ? [] : await findNeighbors(i, cwd), cwd !== '') }
    } catch {
      return { text: 'Vaken could not look for other sessions now. Try again in a moment.' } // en-only: plain answer of a slash command (text twin)
    }
  })
}
