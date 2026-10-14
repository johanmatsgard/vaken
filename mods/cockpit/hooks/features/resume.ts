// Auto-resume runtime: note a limit stop, wait for the reset, then remind or continue.
import { tr } from '../core/lang'
import type { EngineInterface, On } from 'claude-code'

import { parseStoredUsage, APP_USAGE_KEY } from '../core/appusage'
import { postBand } from '../core/band'
import { haltKey, parseHalt } from '../core/guard'
import { withToastGate } from '../core/io'
import { homeFrom } from '../core/platform'
import type { Io } from '../core/io'
import { startOfDay } from '../core/ledger'
import { readRecord } from '../core/record'
import { CONTINUE_TEXT, MAX_PER_DAY, REMIND_WHAT, RESUME_WHAT, countKey, dueVerdict, parseWait, planWait, remindToast, replanWait, statusText, waitKey, waitingToast } from '../core/resume'
import { LIMIT_HIT_KEY, atLimit } from '../core/overnight'
import { parseRun } from '../core/orchestra'
import { readSetting } from '../core/settings'
import { serialUpdate } from '../core/serial'
import { LEDGER_KEY, pushLog } from './compaction'
import { armOnce } from './everyonce'
import { subArgs } from '../core/menu'
import { tEn } from '../i18n/t'

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

const dayKey = (now: number): string => String(startOfDay(now))
const countOfDay = (raw: unknown): number => (typeof raw === 'number' && Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : 0)

async function takeSlot(i: Io, day: string): Promise<number | undefined> {
  let took: number | undefined
  await serialUpdate(
    i,
    countKey(day),
    old => {
      const n = countOfDay(old)
      took = n < MAX_PER_DAY ? n + 1 : undefined
      return took ?? n
    },
    stored => took === undefined || countOfDay(stored) >= took,
  )
  return took
}

async function check($: EngineInterface): Promise<void> {
  const i = io($)
  try {
    const id = await i.sessionId()
    const w = parseWait(await i.get(waitKey(id)))
    if (w === undefined) return
    const now = await i.now()
    const rec = await readRecord(i, id)
    const doneToday = Number((await i.get(countKey(dayKey(now)))) ?? 0)
    const usage = now >= w.dueAt ? parseStoredUsage(await i.get(APP_USAGE_KEY)) : undefined
    const v = dueVerdict(w, { now, halted: parseHalt(await i.get(haltKey(id))) !== undefined, wroteSince: rec !== undefined && rec.lastEventAt > w.failedAt + 5_000 && rec.state === 'working', doneToday, stillFull: atLimit(usage, now) })
    if (v.act === 'again') {
      await i.set(waitKey(id), replanWait(w, usage, now))
      return
    }
    if (!v.act) {
      if (v.why !== 'not yet') {
        await i.del(waitKey(id))
        i.toast(v.why)
      }
      return
    }
    await i.del(waitKey(id))
    if (w.mode === 'remind') {
      await pushLog(i, LEDGER_KEY, { at: now, session: id, what: REMIND_WHAT, how: 'auto', did: true })
      await postBand(i, 'warn', 'resume', 'Limit reset: type continue', 15 * 60_000)
      i.toast(remindToast())
      return
    }
    // The daily cap is shared by every chat: the slot is taken through one writer at a time
    const slot = await takeSlot(i, dayKey(now))
    if (slot === undefined) {
      i.toast(tr('It already resumed {n} times today.').replace('{n}', String(MAX_PER_DAY)))
      return
    }
    await pushLog(i, LEDGER_KEY, { at: now, session: id, what: RESUME_WHAT, detail: `Resume ${slot} of today.`, how: 'auto', did: true })
    await $.prompt.submit({ text: CONTINUE_TEXT })
  } catch {
    // the wait never breaks the session
  }
}

export function registerResume(on: On): void {
  on('session.start', { cwd: /(?<resume>)/ }, async ($, e, next) => {
    try {
      armOnce('resume', $.clock.every(30_000, () => void check($)))
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('classic.StopFailure', { error: /(?<resume>)/ }, async ($, e, next) => {
    try {
      if (e.error === 'rate_limit') {
        const i = io($)
        const now = await i.now()
        await i.set(LIMIT_HIT_KEY, { at: now })
        const w = planWait(await readSetting(i, 'resume.mode'), parseStoredUsage(await i.get(APP_USAGE_KEY)), now)
        if (w !== undefined) {
          await i.set(waitKey(await i.sessionId()), w)
          i.toast(waitingToast(w))
          await postBand(i, 'warn', 'resume', 'Waiting for the limit to reset', 60 * 60_000)
        }
      }
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'vaken-help' }, async ($, e, next) => {
    const rest0 = subArgs(e.args, 'run', 'after-limit')
    if (rest0 === undefined) return next(e)
    const i = io($)
    const id = await i.sessionId()
    const arg = rest0.trim().toLowerCase()
    if (arg === 'off') {
      await i.del(waitKey(id))
      return { text: 'Cancelled. Nothing waits for a reset in this session now.' } // en-only: plain answer of a slash command (text twin)
    }
    if (arg === 'off all') { // en-only: plain answer of a slash command (text twin)
      let n = 0
      for (const k of await i.keys()) {
        if (k.startsWith('cockpit:resume:') && !k.startsWith('cockpit:resume:count:')) {
          await i.del(k)
          n += 1
        }
        if (k.startsWith('cockpit:orch:') && !k.startsWith('cockpit:orch:history') && !k.startsWith('cockpit:orch:report')) {
          const run = parseRun(await i.get(k))
          if (run?.resumeAt !== undefined) {
            const { resumeAt: _r, replans: _p, ...rest } = run
            await i.set(k, rest)
            n += 1
          }
        }
      }
      return { text: n === 0 ? 'Nothing was waiting for a reset.' : `Cancelled ${tEn('words.wait', { n: n })}. A paused task run stays paused: /vaken-tasks go starts it again.` } // en-only: plain answer of a slash command (text twin)
    }
    const now = await i.now()
    return { text: statusText(await readSetting(i, 'resume.mode'), parseWait(await i.get(waitKey(id))), now, Number((await i.get(countKey(dayKey(now)))) ?? 0)) }
  })
}
