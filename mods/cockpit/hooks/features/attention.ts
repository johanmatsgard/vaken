// Attention runtime: the heartbeat (a working session that went quiet, or one shell step that runs long), the notification router (toasts for other sessions)
import type { EngineInterface, On } from 'claude-code'

import { parseStoredUsage, APP_USAGE_KEY } from '../core/appusage'
import { parseStoredSessions, APP_SESSIONS_KEY } from '../core/appsessions'
import { RECAP_AFTER_MS, RUNAWAY_BAND_ID, batchText, glanceLines, heartbeat, isQuiet, noticePlan, notices, recapWords, runawayLine, runawayMem, runawayNow, stepAsked, stepEnd, stepStart, stepsReset } from '../core/attention'
import { stepHash } from '../core/allowrules'
import { fieldsOf } from '../core/eventfields'
import { redrawIfChanged } from '../core/redraw'
import { isShellTool } from '../core/tools'
import type { NoticeRow, Seen } from '../core/attention'
import { clearBand, postBand } from '../core/band'
import { cacheWords } from '../core/cachefacts'
import { actedToday } from '../core/ledger'
import { withToastGate } from '../core/io'
import { homeFrom } from '../core/platform'
import type { Io } from '../core/io'
import { alivePids, listRecords, readRecord } from '../core/record'
import type { SessionRecord } from '../core/record'
import { readNote } from '../core/flush'
import { readState, stateKey } from '../core/proof'
import { readSetting } from '../core/settings'
import { WATCH_BAND_ID, WATCH_BAND_MS, stepWatches } from '../core/watch'
import { buildView, cacheTtlMs, hereWord, limitAgo, limitBlocks, limitLabel, needsCount, resetSaid } from './home/logic'
import type { View } from './home/logic'
import { loadView } from './home/load'
import { armOnce } from './everyonce'
import { subArgs } from '../core/menu'
import { tellNow } from '../core/tellme'
import { sayIn } from './saylang'
import { tr } from '../core/lang'

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

const CHECK_MS = 20_000
const TOLD_KEY = 'cockpit:notified'

// The runaway step's band line (core/attention.ts runawayNow): posted again only when its minutes change or its time to live runs low
const RUNAWAY_TTL_MS = 2 * 60_000
const RUNAWAY_REPOST_MS = 60_000
let runawayPosted: { text: string; at: number } | undefined
let ownIds = 0
async function postRunaway(i: Io, minutes: number, now: number): Promise<void> {
  const text = runawayLine(minutes, runawayMem.turnId !== undefined)
  if (runawayPosted !== undefined && runawayPosted.text === text && now - runawayPosted.at < RUNAWAY_REPOST_MS) return
  runawayPosted = { text, at: now }
  await postBand(i, 'info', RUNAWAY_BAND_ID, text, RUNAWAY_TTL_MS)
}
async function dropRunaway(i: Io): Promise<void> {
  if (runawayPosted === undefined) return
  runawayPosted = undefined
  await clearBand(i, RUNAWAY_BAND_ID)
  await redrawIfChanged(i)
}

let prev: Record<string, Seen> = {}

async function viewNow(i: Io) {
  const now = await i.now()
  const records = await listRecords(i)
  const alive = await alivePids(i, records)
  return buildView(records, now, await i.sessionId(), alive, parseStoredUsage(await i.get(APP_USAGE_KEY)), undefined, parseStoredSessions(await i.get(APP_SESSIONS_KEY)))
}

async function check($: EngineInterface): Promise<void> {
  const i = io($)
  try {
    const now = await i.now()
    const id = await i.sessionId()
    const step = (await readSetting(i, 'heartbeat.mode')) === 'on' ? runawayNow(now) : undefined
    // A long shell step is the reason for the silence: its own calm line stands in for Gone idle and May be stuck
    if (step !== undefined) {
      await clearBand(i, 'heartbeat')
      await postRunaway(i, step.minutes, now)
    } else {
      await dropRunaway(i)
      if ((await readSetting(i, 'heartbeat.mode')) === 'on') {
        const rec = await readRecord(i, id)
        if (rec !== undefined) {
          const silent = now - rec.lastEventAt
          const beat = rec.ask !== undefined ? 'ok' : heartbeat(rec.state, silent)
          if (beat === 'ok') await clearBand(i, 'heartbeat')
          else await postBand(i, beat === 'stuck' ? 'urgent' : 'warn', 'heartbeat', beat === 'stuck' ? 'May be stuck' : 'Gone idle', 2 * 60_000)
        }
      }
    }
    const mode = await readSetting(i, 'notify.mode')
    const view = await viewNow(i)
    const rows = noticeRows(view)
    const raw = await i.get(TOLD_KEY)
    const told: Record<string, string> = typeof raw === 'object' && raw !== null ? (raw as Record<string, string>) : {}
    const fired = await stepWatches(i, [...view.needs, ...view.working, ...view.waiting, ...view.idle].map(w => ({ id: w.rec.sessionId, name: w.name, kind: w.kind, ...(w.rec.done === undefined ? {} : { done: w.rec.done }) })), now)
    for (const f of fired) {
      i.toast(f.text, true)
      await postBand(i, 'info', WATCH_BAND_ID, f.text, WATCH_BAND_MS)
    }
    const r = notices(prev, rows, told, mode, now)
    r.notices = r.notices.filter(n => !fired.some(f => f.id === n.id) || !n.marker.startsWith('done:'))
    const plan = noticePlan(prev, r, r.notices.length > 0 && isQuiet(await readSetting(i, 'notify.quiet'), new Date(now).getHours()))
    prev = plan.next
    if (plan.tell.length > 0) {
      for (const n of plan.tell) told[n.id] = n.marker
      await i.set(TOLD_KEY, told)
      i.toast(batchText(plan.tell), plan.urgent)
      const needs = plan.tell.filter(n => n.marker.startsWith('needs')).length
      if (needs > 0) tellNow({ kind: 'needs', n: needs })
    }
  } catch {
    // the router never breaks the session
  }
}

// A working session that went silent reads idle on the board, but for the notices it is still at work, so its finish is told.
export function noticeRows(view: Pick<View, 'needs' | 'waiting' | 'working' | 'idle'>): NoticeRow[] {
  const silent = view.idle.filter(r => r.rec.state === 'working').map(r => ({ ...r, kind: 'working' as const }))
  return [...view.needs, ...view.waiting, ...view.working, ...silent].map(r => ({ id: r.rec.sessionId, name: r.name, kind: r.kind, reason: r.reason, since: r.rec.ask !== undefined && r.kind === 'needs' ? r.rec.ask.since : r.rec.stateSince }))
}

// The recap's facts: the goal, and how many sessions need you, counted now.
async function recapOf(i: Io, rec: SessionRecord, now: number, say?: (s: string) => string): Promise<string> {
  const goal = readState(await readNote(i, stateKey(rec.sessionId))).goal?.text
  const needs = (await viewNow(i)).needs.length
  return recapWords({ gapMs: now - rec.lastEventAt, branch: rec.branch, cache: rec.cache === undefined ? undefined : cacheWords(rec.cache, now, cacheTtlMs(parseStoredUsage(await i.get(APP_USAGE_KEY))), false, say), ...(goal === undefined || goal === '' ? {} : { goal }), needs }, say)
}

export function registerAttention(on: On): void {
  on('session.start', { cwd: /(?<attention>)/ }, async ($, e, next) => {
    try {
      // Always at full pace
      const timer = $.clock.every(CHECK_MS, () => void check($).catch(() => undefined))
      armOnce('attention', timer)
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  // The runaway step's clock (core/attention.ts): a main-loop shell step from its call to its end; a hash and times only, never the command
  on('tool.call', { tool: /(?<runaway>)/ }, async ($, e, next) => {
    // A call with no id of its own (a plugin's own call) gets one here, so its end still finds it
    const id = e.agentId === undefined && isShellTool(e.tool) ? (typeof e.tool_use_id === 'string' ? e.tool_use_id : `own-${(ownIds += 1)}`) : undefined
    if (id !== undefined) {
      try {
        const startedAt = await $.clock.now()
        stepStart(id, stepHash(e.tool, { command: fieldsOf(e).command }), startedAt)
      } catch {
      }
    }
    try {
      return await next(e)
    } finally {
      if (id !== undefined) {
        stepEnd(id)
        void dropRunaway(io($)).catch(() => undefined)
      }
    }
  }).catch(($, e, next) => next(e))

  // Claude Code tells the person it needs a permission: the step that waits for the OK is not timed. It only notes it, never answers.
  on('classic.Notification', { notification_type: /permission/i }, async ($, e, next) => {
    try {
      // The notice says the tool ("... permission to use Bash"); only a shell step is timed
      const tool = /\buse (.+?)\s*$/i.exec(e.message)?.[1] ?? ''
      if (e.agent_id === undefined && isShellTool(tool)) {
        const askedAt = await $.clock.now()
        stepAsked(askedAt)
      }
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  // The main loop's running answer, so Stop the answer can end it; a new or ended answer has no step left running
  on('turn.start', { turnId: /(?<runaway>)/ }, async ($, e, next) => {
    try {
      if (fieldsOf(e).agentId === undefined) stepsReset(e.turnId)
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('turn.complete', { turnId: /(?<runaway>)/ }, async ($, e, next) => {
    try {
      if (e.agentId === undefined) {
        stepsReset()
        await dropRunaway(io($))
      }
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('prompt.submit', { text: /(?<attention>)/ }, async ($, e, next) => {
    try {
      const i = io($)
      if ((await readSetting(i, 'recap.mode')) === 'on' && !e.text.trimStart().startsWith('/')) {
        const rec = await readRecord(i, await i.sessionId())
        const now = await i.now()
        if (rec !== undefined && rec.state !== 'working' && now - rec.lastEventAt >= RECAP_AFTER_MS) {
          await postBand(i, 'info', 'recap', await recapOf(i, rec, now), 3 * 60_000)
        }
      }
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'vaken-today' }, async ($, e, next) => {
    const rest0 = subArgs(e.args, 'recap')
    if (rest0 === undefined) return next(e)
    const i = io($)
    await sayIn(i)
    const rec = await readRecord(i, await i.sessionId())
    const now = await i.now()
    if (rec === undefined) return { text: tr('Nothing to recap yet.') }
    return { text: await recapOf(i, rec, now, tr) }
  })

  on('command.run', { command: 'vaken-today' }, async ($, e, next) => {
    const rest0 = subArgs(e.args, 'glance')
    if (rest0 === undefined) return next(e)
    await sayIn(io($))
    // The same load as the pane and /vaken (loadView): the limit that leads with its reset and age
    const { view, now } = await loadView(io($))
    const ledger = view.ledger ?? []
    const lead = limitBlocks(view)[0]
    return {
      text: glanceLines({
        needs: view.needs.map(r => ({ name: r.name, reason: r.reason })),
        needsTotal: needsCount(view),
        limitPercent: lead?.percent,
        limitLabel: lead === undefined ? undefined : limitLabel(lead.label, tr),
        limitReset: lead === undefined || lead.reset === '' ? undefined : resetSaid(lead.reset, tr),
        limitAgo: lead === undefined ? undefined : limitAgo([lead], tr),
        hereState: hereWord(view.here, 'explained', view.hereWaits, tr),
        didCount: actedToday(ledger, now, view.counts),
      }, tr).join('\n'),
    }
  })
}
