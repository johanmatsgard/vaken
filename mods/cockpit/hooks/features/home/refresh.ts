// Reads from the app's own usage tool: the plan limits (every session shares one reading), the list of sessions, and this session's context window.
import type { Io } from '../../core/io'
import { redrawIfChanged } from '../../core/redraw'
import { LIMITWARN_ID, bandWords, limitWarning } from '../../core/limitwarn'
import { DAYSHARE_BAND_MS, DAYSHARE_ID, DAYSHARE_SAID_KEY, dayShare, dayShareBand, dayShareDue, dayShareToast, weekWindow } from '../../core/dayshare'
import { ymd } from '../../core/time'
import { readSetting } from '../../core/settings'
import { APP_USAGE_KEY, USAGE_FRESH_MS, USAGE_SERVER, USAGE_TOOL, parseStoredUsage, parseUsage } from '../../core/appusage'
import type { UsageWindow } from '../../core/appusage'
import { APP_SESSIONS_KEY, SESSIONS_LIMIT, SESSIONS_TOOL, parseSessions, parseStoredSessions } from '../../core/appsessions'
import { withTranscriptTitles } from '../../core/transcripttitle'
import { listRecordsLight } from '../../core/record'
import { parseContext } from '../../core/appcontext'
import { clearBand, postBand } from '../../core/band'
import { HISTORY_KEY, addSamples, parseHistory } from '../../core/pace'
import type { History } from '../../core/pace'
import type { HomeEngine } from './engine'
import { collect } from './load'
import { mayScan } from '../../core/leader'

// The data is the account's
const USAGE_TRIED_KEY = 'cockpit:usage:tried'
const USAGE_RETRY_MS = 60_000
export async function refreshUsage(eng: HomeEngine, force = false): Promise<string> {
  try {
    const i = eng.io()
    const now = await i.now()
    const old = parseStoredUsage(await i.get(APP_USAGE_KEY))
    if (!force && old !== undefined && now - old.at < USAGE_FRESH_MS) return 'fresh'
    // One leader session reads it for all (core/leader.ts); another session only when the reading is twice as old.
    if (!force && !(await mayScan(i, old?.at, USAGE_FRESH_MS))) return 'the leader session reads it' // en-only: the reason a refresh command gives (text twin)
    const tried = await i.get(USAGE_TRIED_KEY)
    if (!force && typeof tried === 'number' && now - tried < USAGE_RETRY_MS) return 'waiting to retry' // en-only: the reason a refresh command gives (text twin)
    const r = await eng.mcpCall(USAGE_SERVER, USAGE_TOOL, {})
    const block = r.content.find(c => c.type === 'text') as { text?: string } | undefined
    const usage = r.isError === true ? undefined : parseUsage(block?.text ?? '', now)
    if (usage === undefined) {
      await i.set(USAGE_TRIED_KEY, now)
      return 'the app gave no plan limits' // en-only: the reason a refresh command gives (text twin)
    }
    await i.set(APP_USAGE_KEY, usage)
    const hist = addSamples(parseHistory(await i.get(HISTORY_KEY)), usage.windows, now)
    await i.set(HISTORY_KEY, hist)
    await noteLimitWarning(i, usage.windows, hist, now)
    await noteDayShare(i, usage.windows, hist, now)
    await redrawIfChanged(i)
    return 'ok'
  } catch {
    try {
      await eng.io().set(USAGE_TRIED_KEY, await eng.io().now())
    } catch {
    }
    return "the app's usage card did not answer (it is not offered in this kind of session)" // en-only: the reason a refresh command gives (text twin)
  }
}

async function noteLimitWarning(i: Io, windows: UsageWindow[], hist: History, now: number): Promise<void> {
  try {
    const w = (await readSetting(i, 'limits.warn')) === 'on' ? limitWarning(windows, now, hist) : undefined
    if (w === undefined) {
      await clearBand(i, LIMITWARN_ID)
      return
    }
    await postBand(i, 'warn', LIMITWARN_ID, bandWords(w, now), 15 * 60_000)
    i.toast(w.text)
  } catch {
  }
}

async function noteDayShare(i: Io, windows: UsageWindow[], hist: History, now: number): Promise<void> {
  try {
    if ((await readSetting(i, 'limits.warn')) !== 'on') return
    const w = weekWindow(windows)
    const d = w === undefined ? undefined : dayShare(w, now, hist[w.label])
    if (d === undefined || !d.usedUp || !dayShareDue(d, await i.get(DAYSHARE_SAID_KEY), now)) return
    await i.set(DAYSHARE_SAID_KEY, ymd(now))
    await postBand(i, 'warn', DAYSHARE_ID, dayShareBand(), DAYSHARE_BAND_MS)
    i.toast(dayShareToast(d))
  } catch {
  }
}

const SESSIONS_TRIED_KEY = 'cockpit:sessions:tried'
export async function refreshSessions(eng: HomeEngine, force = false): Promise<string> {
  try {
    const i = eng.io()
    const now = await i.now()
    const old = parseStoredSessions(await i.get(APP_SESSIONS_KEY))
    if (!force && old !== undefined && now - old.at < USAGE_FRESH_MS) return 'fresh'
    if (!force && !(await mayScan(i, old?.at, USAGE_FRESH_MS))) return 'the leader session reads it' // en-only: the reason a refresh command gives (text twin)
    const tried = await i.get(SESSIONS_TRIED_KEY)
    if (!force && typeof tried === 'number' && now - tried < USAGE_RETRY_MS) return 'waiting to retry' // en-only: the reason a refresh command gives (text twin)
    const r = await eng.mcpCall(USAGE_SERVER, SESSIONS_TOOL, { limit: SESSIONS_LIMIT })
    const block = r.content.find(c => c.type === 'text') as { text?: string } | undefined
    const list = r.isError === true ? undefined : parseSessions(block?.text ?? '', now)
    if (list === undefined) {
      await i.set(SESSIONS_TRIED_KEY, now)
      return 'the app gave no session list' // en-only: the reason a refresh command gives (text twin)
    }
    // A session the app gave no title for (the app's list leaves it empty
    const src = eng.titleSource?.()
    const named = src === undefined ? list : await withTranscriptTitles(list, await listRecordsLight(i), src)
    await i.set(APP_SESSIONS_KEY, named)
    await redrawIfChanged(i)
    return `ok, ${named.sessions.length} sessions`
  } catch {
    try {
      await eng.io().set(SESSIONS_TRIED_KEY, await eng.io().now())
    } catch {
    }
    return "the app's session list did not answer (it is not offered in this kind of session)" // en-only: the reason a refresh command gives (text twin)
  }
}

// It is kept in this session's record, so the card shows where auto-compact starts.
const CONTEXT_EVERY_MS = 60_000
const CONTEXT_RETRY_MS = 15_000
let contextAt = 0
export async function refreshContext(eng: HomeEngine, force = false): Promise<string> {
  try {
    const now = await eng.now()
    if (!force && now - contextAt < CONTEXT_EVERY_MS) return 'fresh'
    contextAt = now
    const r = await eng.mcpCall(USAGE_SERVER, USAGE_TOOL, { session_id: 'self' })
    const block = r.content.find(c => c.type === 'text') as { text?: string } | undefined
    const ctx = r.isError === true ? undefined : parseContext(block?.text ?? '')
    if (ctx === undefined) {
      contextAt = now - CONTEXT_EVERY_MS + CONTEXT_RETRY_MS
      return 'the app gave no context' // en-only: the reason a refresh command gives (text twin)
    }
    await collect(eng.io, { ctx }, false)
    return `ok, compacts at ${ctx.compactAt ?? '?'}%`
  } catch {
    return "the app's context reading did not answer (it is not offered in this kind of session)" // en-only: the reason a refresh command gives (text twin)
  }
}
