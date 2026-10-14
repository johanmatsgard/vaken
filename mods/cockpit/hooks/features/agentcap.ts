// Agent cap runtime: count helper agents in flight (this session in memory, every session in the shared store) and warn or hold at the limit.
import type { EngineInterface, On, Timer } from 'claude-code'

import { APP_USAGE_KEY, parseStoredUsage } from '../core/appusage'
import { postBand } from '../core/band'
import { BOARD_KEY, parseBoard, runningCount } from '../core/agentboard'
import { CAP_HOLD_WHAT, CAP_WHAT, capMaxOf, capVerdict, parseCount, roomVerdict, totalRunning } from '../core/agentcap'
import { roomOf } from '../core/computer'
import type { Room } from '../core/computer'
import { LAPTOP_KEY } from '../core/crewlaptop'
import type { Laptop } from '../core/crewlaptop'
import { withToastGate } from '../core/io'
import { homeFrom } from '../core/platform'
import type { Io } from '../core/io'
import { HISTORY_KEY, parseHistory } from '../core/pace'
import { HELPER_NOTE_MIN, helperFitNote, windowMinutesLeft } from '../core/planfit'
import { readSetting } from '../core/settings'
import { tellsClaude } from '../core/tellclaude'
import { LEDGER_KEY, pushLog } from './compaction'

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

const PREFIX = 'cockpit:agents:'
let mine = 0
let warnedAt = 0
const WARN_GAP_MS = 5 * 60_000
let fitAt = -Infinity
const FIT_GAP_MS = 10 * 60_000

export async function runningNow(i: Io): Promise<number> {
  const keys = (await i.keys()).filter(k => k.startsWith(PREFIX))
  const counts = []
  for (const k of keys) counts.push(parseCount(await i.get(k)))
  const now = await i.now()
  // Background helpers are counted from the agent board: only the start call of one runs inside this hook.
  return totalRunning(counts, now) + runningCount(parseBoard(await i.get(BOARD_KEY)), now)
}
async function roomNow(i: Io, running: number): Promise<Room | undefined> {
  if ((await readSetting(i, 'laptop.mode')) !== 'on') return undefined
  const kept = (await i.get(LAPTOP_KEY)) as Laptop | undefined
  if (typeof kept !== 'object' || kept === null || typeof kept.at !== 'number') return undefined
  return roomOf(kept, { running, max: capMaxOf(await readSetting(i, 'cap.max')), capOn: (await readSetting(i, 'cap.mode')) !== 'off' }, await i.now())
}

// Never holds a helper.
async function fitNote(i: Io): Promise<string | undefined> {
  const now = await i.now()
  if (now - fitAt < FIT_GAP_MS || (await readSetting(i, 'limits.warn')) === 'off') return undefined
  const usage = parseStoredUsage(await i.get(APP_USAGE_KEY))
  if (usage === undefined) return undefined
  const left = windowMinutesLeft(usage, parseHistory(await i.get(HISTORY_KEY)), now)
  if (left === undefined || left > HELPER_NOTE_MIN) return undefined
  fitAt = now
  return helperFitNote(left)
}

const publish = async (i: Io): Promise<void> => i.set(PREFIX + (await i.sessionId()), { n: mine, at: await i.now() })

const HEARTBEAT_MS = 4 * 60_000
let heartbeat: Timer | undefined
function startHeartbeat($: EngineInterface): void {
  if (heartbeat !== undefined) return
  const timer = $.clock.every(HEARTBEAT_MS, () => void publish(io($)).catch(() => undefined))
  heartbeat = timer
}
const stopHeartbeat = (): void => {
  if (mine > 0) return
  heartbeat?.cancel()
  heartbeat = undefined
}

export function registerAgentCap(on: On): void {
  on('tool.call', { tool: /(?<agentcap>)/ }, async ($, e, next) => {
    if (e.tool !== 'Agent') return next(e)
    const i = io($)
    let counted = false
    let note: string | undefined
    try {
      const mode = await readSetting(i, 'cap.mode')
      const running = await runningNow(i)
      let v = capVerdict(mode, running, capMaxOf(await readSetting(i, 'cap.max')))
      if (!v.act && mode !== 'off') v = roomVerdict(mode, await roomNow(i, running))
      if (v.act) {
        const now = await i.now()
        if (v.hold) {
          await pushLog(i, LEDGER_KEY, { at: now, session: await i.sessionId(), what: CAP_HOLD_WHAT, detail: v.reason, how: 'auto', did: true })
          await postBand(i, 'warn', 'agentcap', v.reason.includes('computer is full') ? 'Agent stopped: the computer is full' : 'Agent cap reached', 3 * 60_000)
          return { deny: v.reason }
        }
        if (now - warnedAt >= WARN_GAP_MS) {
          warnedAt = now
          await pushLog(i, LEDGER_KEY, { at: now, session: await i.sessionId(), what: CAP_WHAT, detail: v.reason, how: 'auto', did: true })
          i.toast(v.reason)
        }
      }
      mine += 1
      counted = true
      startHeartbeat($)
      await publish(i)
      note = (await tellsClaude(i)) ? await fitNote(i) : undefined
    } catch {
      // the limit never breaks the session
    }
    try {
      const result = await next(e)
      return note === undefined || result.deny !== undefined ? result : { ...result, context: [...(result.context ?? []), note] }
    } finally {
      if (counted) {
        mine = Math.max(0, mine - 1)
        stopHeartbeat()
        try {
          await publish(i)
        } catch {
        }
      }
    }
  }).catch(($, e, next) => next(e))

  // A closed session takes its count away at once; it does not wait out the count's time limit.
  on('session.end', { sessionId: /(?<agentcapend>)/ }, async ($, e, next) => {
    try {
      mine = 0
      stopHeartbeat()
      await io($).del(PREFIX + e.sessionId)
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))
}
