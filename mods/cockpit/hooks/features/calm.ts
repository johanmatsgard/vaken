// Calm: Focus 50 minutes and the open ends of yesterday.
import type { EngineInterface, On } from 'claude-code'

import { DIGEST_KEY, parseDigest } from '../core/away'
import { postBand, clearBand } from '../core/band'
import { CALM_KEY, parseCalm } from '../core/calm'
import type { Calm } from '../core/calm'
import { forgetNote, holdNote, readNote } from '../core/flush'
import { FOCUS_KEY, FOCUS_MS, FOCUS_POLL_MS, focusEmpty, focusMem, focusSummary, isFocused, minutesLeft, parseFocus } from '../core/focus'
import type { Focus } from '../core/focus'
import { allowKey } from '../core/guard'
import { heldKey, parseAllowOnce, parseHeld } from '../core/allowonce'
import { withToastGate } from '../core/io'
import { homeFrom } from '../core/platform'
import type { Io } from '../core/io'
import { didKind } from '../core/ledger'
import { OPEN_ENDS_BAND_MS, OPEN_ENDS_PREFIX, OPEN_ENDS_SHOW, noteMatters, openBand, openDayOf, openDayStart, openEnds, openEndsKey, openShown, parseOpenNote } from '../core/openends'
import type { OpenEnd, OpenNote } from '../core/openends'
import { ORCH_KEY, parseRun } from '../core/orchestra'
import { projectName } from '../core/projects'
import { relevantKinds, readState, stateKey, statusOf } from '../core/proof'
import { quietly } from '../core/quiet'
import { alivePids, listRecords } from '../core/record'
import { serialUpdate } from '../core/serial'
import { weeklyShown } from '../core/weekly'
import type { WeeklyNote } from '../core/weekly'
import { LEDGER_KEY, readLog } from './compaction'
import { classify } from './home/logic'
import { armOnce } from './everyonce'
import { subArgs } from '../core/menu'
import { fillIn } from '../core/fillin'
import { tr } from '../core/lang'
import { sayIn } from './saylang'

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

// `kept`: the session whose open-ends note this copy wrote while it ran.
// `resumed`: this session has had its first answer, so an older mid-answer end in its project was cleared once
const calmMem: { checkedDay?: string; root?: string; inTurn: boolean; kept?: string; resumed?: boolean } = { inTurn: false }

export async function readFocus(i: Io): Promise<Focus | undefined> {
  const f = parseFocus(await i.get(FOCUS_KEY))
  focusMem.focus = f
  return f
}

export async function startFocus(i: Io): Promise<Focus> {
  const now = await i.now()
  const f: Focus = { from: now, until: now + FOCUS_MS }
  await i.set(FOCUS_KEY, f)
  focusMem.focus = f
  i.invalidate()
  return f
}

async function summaryOf(i: Io, f: Focus, now: number): Promise<{ finished: number; warnings: number }> {
  const records = await listRecords(i)
  const alive = await alivePids(i, records)
  const finished = records.filter(r => r.stateSince >= f.from && classify(r, now, alive) === 'waiting').length
  const warnings = (await readLog(i, LEDGER_KEY)).filter(x => x.did === true && x.at >= f.from && x.at <= now && didKind(x.what) !== 'did').length
  return { finished, warnings }
}

export async function endFocus(i: Io, isPress = false): Promise<string | undefined> {
  const f = parseFocus(await i.get(FOCUS_KEY))
  focusMem.focus = undefined
  if (f === undefined) return undefined
  await i.del(FOCUS_KEY)
  const now = await i.now()
  const facts = await summaryOf(i, f, Math.min(now, Math.max(f.from, f.until)))
  const text = focusSummary(facts)
  if (isPress || (now >= f.until && !focusEmpty(facts))) i.toast(text, true)
  i.invalidate()
  return text
}

export async function focusPoll(i: Io): Promise<void> {
  try {
    const before = focusMem.focus
    const f = await readFocus(i)
    if (f !== undefined && (await i.now()) >= f.until) await endFocus(i)
    else if ((before === undefined) !== (f === undefined)) i.invalidate()
  } catch {
  }
}

export async function focusCommand(i: Io, args: string): Promise<string> {
  const ask = args.trim().toLowerCase()
  if (ask === 'off' || ask === 'end' || ask === 'stop') return (await endFocus(i)) ?? tr('Quiet is not on.')
  const now = await i.now()
  const f = await readFocus(i)
  if (isFocused(f, now)) return fillIn(tr('Quiet: {n} min left. Only what needs you gets through. /vaken-help run focus off ends it.'), { n: minutesLeft(f, now) })
  await startFocus(i)
  return tr('Quiet is on for 50 minutes in every session: toasts and the band\'s other lines wait, only what needs you gets through. /vaken-help run focus off ends it.')
}

// `atEnd` false: the note is kept while the session runs too (saved within OWN_SAVE_EVERY_MS), so a crash still leaves it; one that no longer matters is removed.
export async function noteOpenEnds(i: Io, sid: string, root: string | undefined, midTurn: boolean, atEnd = true): Promise<OpenNote | undefined> {
  if (root === undefined || root === '') return undefined
  const proof = readState(await readNote(i, stateKey(sid)))
  const checks: OpenNote['checks'] = {}
  for (const k of relevantKinds(proof)) {
    const st = statusOf(proof, k)
    if (st === 'ok' || st === 'failed') checks[k] = st
  }
  const held = parseHeld(await i.get(heldKey(sid)))
  const allow = parseAllowOnce(await i.get(allowKey(sid)))
  const run = parseRun(await i.get(ORCH_KEY(sid)))
  const note: OpenNote = {
    at: await i.now(),
    project: projectName(root),
    checks,
    held: held !== undefined && held.keys.length > 0 && !(allow !== undefined && allow.at >= held.at) ? 1 : 0,
    tasks: run === undefined ? 0 : run.tasks.filter(t => t.state !== 'done').length,
    midTurn,
  }
  const key = openEndsKey(sid)
  if (!noteMatters(note)) {
    if (calmMem.kept === sid) {
      calmMem.kept = undefined
      forgetNote(key)
      await i.del(key)
    }
    return undefined
  }
  if (atEnd) {
    forgetNote(key)
    await i.set(key, note)
  } else {
    calmMem.kept = sid
    await holdNote(i, key, note, 'own')
  }
  return note
}

// The end of an answer reads nothing from the store: the note kept at the turn's start only loses its mid-answer mark.
export async function answeredOpenEnds(i: Io, sid: string): Promise<void> {
  if (calmMem.kept !== sid) return
  const key = openEndsKey(sid)
  const kept = parseOpenNote(await readNote(i, key))
  if (kept === undefined || !kept.midTurn) return
  const note = { ...kept, at: await i.now(), midTurn: false }
  if (noteMatters(note)) await holdNote(i, key, note, 'own')
  else {
    calmMem.kept = undefined
    forgetNote(key)
    await i.del(key)
  }
}

// A new session in a project that has its first answer picks up where the last one stopped: an older "ended mid-answer" there no longer counts (in the notes and in today's open ends)
export async function resumedOpenEnds(i: Io, sid: string, root: string | undefined): Promise<void> {
  if (root === undefined || root === '') return
  const project = projectName(root)
  for (const k of (await i.keys()).filter(x => x.startsWith(OPEN_ENDS_PREFIX) && x !== openEndsKey(sid))) {
    const n = parseOpenNote(await i.get(k))
    if (n === undefined || n.project !== project || !n.midTurn) continue
    const note = { ...n, midTurn: false }
    forgetNote(k)
    if (noteMatters(note)) await i.set(k, note)
    else await i.del(k)
  }
  await serialUpdate(i, CALM_KEY, old => {
    const c = parseCalm(old)
    if (c.open === undefined) return c
    const ends = c.open.ends.map(e => (e.project === project ? { ...e, midTurn: 0 } : e)).filter(e => e.failed.length > 0 || e.held > 0 || e.tasks > 0 || e.midTurn > 0)
    return { ...c, open: { ...c.open, ends } }
  })
}

// Never throws.
export async function morningCheck(i: Io): Promise<void> {
  try {
    const now = await i.now()
    const day = openDayOf(now)
    if (calmMem.checkedDay === day) return
    calmMem.checkedDay = day
    if (parseCalm(await i.get(CALM_KEY)).open?.day === day) return
    const notes: OpenNote[] = []
    for (const k of (await i.keys()).filter(x => x.startsWith(OPEN_ENDS_PREFIX))) {
      const n = parseOpenNote(await i.get(k))
      if (n !== undefined) notes.push(n)
    }
    const ends = openEnds(notes, openDayStart(now))
    await serialUpdate(i, CALM_KEY, old => ({ ...parseCalm(old), open: { day, ends, dismissed: false } }))
    for (const [n, end] of ends.slice(0, OPEN_ENDS_SHOW).entries()) await postBand(i, 'info', `openends:${n}`, openBand(end), OPEN_ENDS_BAND_MS)
  } catch {
  }
}

export async function dismissOpenEnds(i: Io): Promise<void> {
  await serialUpdate(i, CALM_KEY, old => {
    const c = parseCalm(old)
    return c.open === undefined ? c : { ...c, open: { ...c.open, dismissed: true } }
  })
  // The notes go too, so the same note never comes back on a later day; today's notes are tomorrow's open ends and stay
  const dayStart = openDayStart(await i.now())
  for (const k of (await i.keys()).filter(x => x.startsWith(OPEN_ENDS_PREFIX))) {
    const n = parseOpenNote(await i.get(k))
    if (n === undefined || n.at < dayStart) {
      forgetNote(k)
      await i.del(k)
    }
  }
  for (let n = 0; n < OPEN_ENDS_SHOW; n += 1) await clearBand(i, `openends:${n}`)
  i.invalidate()
}

// `rest`: the projects past the first few, behind the card's "Show N more" fold
export type CalmView = { weekly?: WeeklyNote; open: OpenEnd[]; more: number; rest?: OpenEnd[]; focus?: Focus; away?: { to: number; text: string } }
export async function loadCalm(i: Io, now: number): Promise<CalmView> {
  await morningCheck(i)
  const c: Calm = parseCalm(await i.get(CALM_KEY))
  const weekly = weeklyShown(c.weekly, now)
  const open = openShown(c.open, now)
  const focus = focusMem.focus
  const digest = parseDigest(await i.get(DIGEST_KEY))
  return { ...(weekly === undefined ? {} : { weekly }), open: open.slice(0, OPEN_ENDS_SHOW), more: Math.max(0, open.length - OPEN_ENDS_SHOW), ...(open.length > OPEN_ENDS_SHOW ? { rest: open.slice(OPEN_ENDS_SHOW) } : {}), ...(isFocused(focus, now) ? { focus } : {}), ...(digest === undefined ? {} : { away: { to: digest.to, text: digest.text } }) }
}
export const calmSignature = (c: CalmView | undefined, now: number): string =>
  c === undefined ? '' : `${c.weekly?.at ?? 0}|${[...c.open, ...(c.rest ?? [])].map(x => `${x.project}${x.failed.join('/')}${x.held}${x.tasks}${x.midTurn}`).join(',')}${c.more}|${c.focus === undefined ? '' : minutesLeft(c.focus, now)}|${c.away?.to ?? 0}`

export function registerCalm(on: On): void {
  on('session.start', { cwd: /(?<calm>)/ }, async ($, e, next) => {
    try {
      calmMem.checkedDay = undefined
      calmMem.inTurn = false
      calmMem.resumed = false
      try {
        const root = await $.session.root()
        calmMem.root = root || e.cwd
      } catch {
        calmMem.root = e.cwd
      }
      await readFocus(io($))
      const timer = $.clock.every(FOCUS_POLL_MS, quietly('calm:focus', () => $.clock.now(), () => focusPoll(io($))))
      armOnce('calm', timer)
    } catch {
      // Focus and the open ends are optional: a failure shows less, never breaks the session
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('prompt.submit', { text: /(?<calm>)/ }, async ($, e, next) => {
    await morningCheck(io($))
    return next(e)
  }).catch(($, e, next) => next(e))

  on('turn.start', { turnId: /(?<calm>)/ }, async ($, e, next) => {
    calmMem.inTurn = true
    try {
      const sid = await $.session.id()
      await noteOpenEnds(io($), sid, calmMem.root, true, false)
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))
  on('turn.complete', { turnId: /(?<calm>)/ }, async ($, e, next) => {
    if (e.agentId === undefined) {
      calmMem.inTurn = false
      try {
        const sid = await $.session.id()
        await answeredOpenEnds(io($), sid)
        if (calmMem.resumed !== true) {
          calmMem.resumed = true
          await resumedOpenEnds(io($), sid, calmMem.root)
        }
      } catch {
      }
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('session.end', { sessionId: /(?<calm>)/ }, async ($, e, next) => {
    try {
      await noteOpenEnds(io($), e.sessionId, calmMem.root, calmMem.inTurn)
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'vaken-help' }, async ($, e, next) => {
    const rest0 = subArgs(e.args, 'run', 'focus')
    if (rest0 === undefined) return next(e)
    const i = io($)
    await sayIn(i)
    return { text: await focusCommand(i, rest0) }
  })
}
