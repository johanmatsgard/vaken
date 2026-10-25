// Insight runtime: the audit export, wait tracking, the quota planner, review by story and cost per outcome.
import type { EngineInterface, On } from 'claude-code'
import { fieldsOf } from '../core/eventfields'

import { parseStoredUsage, APP_USAGE_KEY } from '../core/appusage'
import { parseState as parseCost, spendOf } from '../core/cost'
import { freePath } from '../core/fileops'
import { t, tr } from '../core/lang'
import { sayIn } from './saylang'
import { refusedWords, safeWrite, takenProbe } from '../core/safewrite'
import type { SafeFs } from '../core/safewrite'
import { readNote } from '../core/flush'
import { withToastGate } from '../core/io'
import { isShellTool } from '../core/tools'
import { homeFrom } from '../core/platform'
import type { Io } from '../core/io'
import { AUDIT_KEY, OUTCOMES_KEY, tidyKeys, tidyText, addOutcome, addWait, auditFile, auditText, fitText, outcomesText, parseAudit, parseNumstat, parseOutcomes, parseWaits, storyText, waitsKey, waitsText } from '../core/insight'
import { doneMet, readState, stateKey } from '../core/proof'
import { listRecords, readRecord } from '../core/record'
import { serialUpdate } from '../core/serial'
import { LEDGER_KEY, pushLog } from './compaction'
import { armOnce } from './everyonce'
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

// The engine's file calls a safe write needs (core/safewrite.ts).
function safeFs($: EngineInterface): SafeFs {
  return { stat: (path, options) => $.fs.stat(path, options), list: path => $.fs.list(path) }
}

let askOpen: { since: number; kind: 'question' | 'permission' } | undefined
const COST_PREFIX = 'cockpit:cost:s:'
const lastCostKey = (id: string): string => `cockpit:outcomes:last:${id}`
const MIN_OUTCOME_USD = 0.01
let doneMark = ''

async function noteWait(i: Io, kind: 'question' | 'permission' | 'after', ms: number): Promise<void> {
  const now = await i.now()
  await serialUpdate(i, waitsKey(), old => addWait(parseWaits(old, now), kind, ms))
}

async function noteOutcome(i: Io, kind: 'done' | 'merged'): Promise<void> {
  const id = await i.sessionId()
  const now = await i.now()
  const spend = spendOf(parseCost(await i.get(COST_PREFIX + id), now))
  const before = typeof (await i.get(lastCostKey(id))) === 'number' ? ((await i.get(lastCostKey(id))) as number) : 0
  const usd = Math.max(0, spend.usd - before)
  if (usd < MIN_OUTCOME_USD) return
  await i.set(lastCostKey(id), spend.usd)
  const outcome = { at: now, kind, usd, session: id.slice(0, 8) }
  await serialUpdate(i, OUTCOMES_KEY, old => addOutcome(parseOutcomes(old), outcome), stored => parseOutcomes(stored).some(o => o.at === now && o.session === outcome.session && o.kind === kind))
  await pushLog(i, LEDGER_KEY, { at: now, session: id, what: kind === 'merged' ? 'Noted a merged pull request' : 'Noted finished work', detail: `Cost since the last outcome: about $${usd.toFixed(2)} (estimate).`, how: 'auto' })
}

export function registerInsight(on: On): void {
  on('session.start', { cwd: /(?<insight>)/ }, async ($, e, next) => {
    try {
      const timer = $.clock.every(15_000, () => {
        void (async () => {
          try {
            const i = io($)
            const rec = await readRecord(i, await i.sessionId())
            const now = await i.now()
            if (rec?.ask !== undefined && askOpen === undefined) askOpen = { since: rec.ask.since, kind: rec.ask.kind }
            else if (rec?.ask === undefined && askOpen !== undefined) {
              await noteWait(i, askOpen.kind, now - askOpen.since)
              askOpen = undefined
            }
          } catch {
          }
        })()
      })
      armOnce('insight', timer)
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('prompt.submit', { text: /(?<insight>)/ }, async ($, e, next) => {
    try {
      const i = io($)
      if (!e.text.trimStart().startsWith('/')) {
        const rec = await readRecord(i, await i.sessionId())
        if (rec !== undefined && rec.state === 'waiting') await noteWait(i, 'after', (await i.now()) - rec.stateSince)
      }
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: /(?<insight>)/ }, async ($, e, next) => {
    const result = await next(e)
    try {
      if (isShellTool(e.tool) && e.agentId === undefined && result.deny === undefined && result.isError !== true && /(^|[;&|]\s*)gh\s+pr\s+merge\b/.test(String(fieldsOf(e).command ?? ''))) await noteOutcome(io($), 'merged')
    } catch {
    }
    return result
  }).catch(($, e, next) => next(e))

  on('turn.complete', { turnId: /(?<insight>)/ }, async ($, e, next) => {
    if (e.agentId === undefined) {
      $.clock.after(4_000, () => {
        void (async () => {
          try {
            const i = io($)
            const s = readState(await readNote(i, stateKey(await i.sessionId())))
            const mark = `${s.seq}:${s.done.join(',')}`
            if (s.done.length > 0 && doneMet(s, s.done) && mark !== doneMark) {
              doneMark = mark
              await noteOutcome(i, 'done')
            }
          } catch {
          }
        })()
      })
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'vaken-help' }, async ($, e, next) => {
    const rest0 = subArgs(e.args, 'run', 'audit')
    if (rest0 === undefined) return next(e)
    const i = io($)
    await sayIn(i).catch(() => undefined)
    const rows = parseAudit(await i.get(AUDIT_KEY))
    if (rest0.trim().toLowerCase() === 'export') {
      if (rows.length === 0) return { text: tr('Nothing to export yet.') }
      // An export never overwrites a file that is there: it takes the next free name (cockpit-audit-2.md).
      const root = await $.session.root()
      const fs = safeFs($)
      const path = await freePath(takenProbe(fs), `${root}/.claude/cockpit-audit.md`)
      if (path === undefined) return { text: tr('Too many exports are in the .claude folder already. Remove an old .claude/cockpit-audit*.md file and try again.') }
      if (!(await safeWrite(fs, (p, x) => i.write(p, x), root, path, auditFile(rows))).ok) return { text: refusedWords(path, tr) }
      return { text: t('cmdd.wrote_path_n_actions', { path, n: rows.length }) }
    }
    return { text: auditText(rows) }
  })

  on('command.run', { command: 'vaken-today' }, async ($, e, next) => {
    const rest0 = subArgs(e.args, 'waits')
    if (rest0 === undefined) return next(e)
    const i = io($)
    await sayIn(i).catch(() => undefined)
    return { text: waitsText(parseWaits(await i.get(waitsKey()), await i.now())) }
  })

  on('command.run', { command: 'vaken-usage' }, async ($, e, next) => {
    const rest0 = subArgs(e.args, 'fit')
    if (rest0 === undefined) return next(e)
    const i = io($)
    await sayIn(i).catch(() => undefined)
    return { text: fitText(parseStoredUsage(await i.get(APP_USAGE_KEY)), Number(rest0.trim().replace('%', '')), await i.now()) }
  })

  on('command.run', { command: 'vaken-ship' }, async ($, e, next) => {
    const rest0 = subArgs(e.args, 'review-story')
    if (rest0 === undefined) return next(e)
    const i = io($)
    await sayIn(i).catch(() => undefined)
    try {
      const cwd = await $.session.cwd()
      const r = await i.run(['git', 'diff', '--numstat', 'HEAD'], { cwd, timeoutMs: 5_000 })
      const goal = readState(await readNote(i, stateKey(await i.sessionId()))).goal?.text
      return { text: storyText(goal, r.exitCode === 0 ? parseNumstat(r.stdout) : []) }
    } catch {
      return { text: tr('Vaken could not read the change with git.') }
    }
  })

  on('command.run', { command: 'vaken-help' }, async ($, e, next) => {
    const rest0 = subArgs(e.args, 'run', 'outcomes')
    if (rest0 === undefined) return next(e)
    const i = io($)
    await sayIn(i).catch(() => undefined)
    return { text: outcomesText(parseOutcomes(await i.get(OUTCOMES_KEY)), await i.now()) }
  })

  on('command.run', { command: 'vaken-help' }, async ($, e, next) => {
    const rest0 = subArgs(e.args, 'run', 'tidy')
    if (rest0 === undefined) return next(e)
    const i = io($)
    await sayIn(i).catch(() => undefined)
    const live = [...(await listRecords(i)).map(r => r.sessionId), await i.sessionId()]
    const keys = tidyKeys(await i.keys(), live)
    if (rest0.trim().toLowerCase() !== 'yes') return { text: tidyText(keys, false) }
    for (const k of keys) await i.del(k)
    return { text: tidyText(keys, true) }
  })
}
