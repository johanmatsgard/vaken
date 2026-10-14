// Proof (Settings > Safety): drift watch, diff of intent, confidence score, anomaly sentinel, risk-ordered review queue and reviewer heat.
import { tr } from '../core/lang'
import type { EngineInterface, On } from 'claude-code'
import { fieldsOf } from '../core/eventfields'

import { postBand } from '../core/band'
import { holdNote, readNote } from '../core/flush'
import { withToastGate } from '../core/io'
import { homeFrom } from '../core/platform'
import type { Io } from '../core/io'
import { isPersonMessage, readState as readProof, stateKey as proofKey } from '../core/proof'
import { ANOMALY_WHAT, DRIFT_WHAT, afterMessage, afterTurn2, confidence, confidenceLines, driftBand, driftDetail, driftNote, driftOf, intentText, kindOfCommand, linesOf, newAnomalies, readState2, recordCall, recordEdit, state2Key, withFlags, writesFiles } from '../core/proof2'
import type { Anomaly, Drift, Proof2State } from '../core/proof2'
import { heatLines, queueLines } from '../core/proof2risk'
import { readSetting, settingStoreKey } from '../core/settings'
import { tellsClaude } from '../core/tellclaude'
import { LEDGER_KEY, pushLog } from './compaction'
import { isEditTool, isShellTool } from '../core/tools'
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

// A Setting of Proof itself (the definition of done is read here, never written).
const doneIsOn = async (i: Io): Promise<boolean> => {
  const v = await i.get(settingStoreKey('proof.done'))
  return v !== 'off'
}

const load2 = async (i: Io): Promise<Proof2State> => readState2(await readNote(i, state2Key(await i.sessionId())))
const loadProof = async (i: Io) => readProof(await readNote(i, proofKey(await i.sessionId())))

let tail: Promise<unknown> = Promise.resolve()
function change2<T>(i: Io, fn: (s: Proof2State) => { state: Proof2State; out: T }): Promise<T> {
  const run = tail.then(async () => {
    const r = fn(await load2(i))
    await holdNote(i, state2Key(await i.sessionId()), r.state, 'own')
    return r.out
  })
  tail = run.catch(() => undefined)
  return run
}

type Raised = { drift?: Drift; anomalies: Anomaly[] }

export function registerProof2(on: On): void {
  on('session.start', { cwd: /(?<proof2>)/ }, async ($, e, next) => {
    try {
    } catch {
      // the commands are optional: a failure shows less, never breaks the session
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: /(?<proof2>)/ }, async ($, e, next) => {
    const i = io($)
    const result = await next(e)
    // Nothing below may throw: a failure after next must not run the tool twice.
    try {
      if (result.deny !== undefined) return result
      const input = fieldsOf(e)
      const tool = String(e.tool)
      const helper = e.agentId !== undefined
      if (helper && !(isEditTool(tool) && result.isError !== true)) return result
      const driftOn = (await readSetting(i, 'proof.drift')) === 'warn'
      const anomalyOn = (await readSetting(i, 'proof.anomaly')) === 'warn'
      const goal = driftOn ? (await loadProof(i)).goal?.text : undefined
      const isEdit = isEditTool(tool) && result.isError !== true
      const command = isShellTool(tool) && typeof input.command === 'string' && input.run_in_background !== true ? input.command : undefined
      const interrupted = (result.result as { interrupted?: unknown } | undefined)?.interrupted === true
      const kind = command === undefined || interrupted ? undefined : kindOfCommand(command)
      const chars = typeof result.text === 'string' ? result.text.length : 0
      const raised = await change2<Raised>(i, s => {
        let st = isEdit
          ? recordEdit(s, String(input.file_path ?? input.notebook_path ?? input.path ?? tool), linesOf(tool, input))
          : recordCall(s, { chars, progress: command !== undefined && writesFiles(command), ...(kind === undefined || command === undefined ? {} : { bash: { kind, cmd: command, failed: result.isError === true } }) })
        const anomalies = anomalyOn && !helper ? newAnomalies(st) : []
        st = withFlags(st, anomalies)
        let drift: Drift | undefined
        if (driftOn && isEdit && !helper && !st.flags.includes('drift')) {
          const d = driftOf(st, goal)
          if (d.over) {
            drift = d
            st = { ...st, flags: [...st.flags, 'drift'] }
          }
        }
        return { state: st, out: { anomalies, ...(drift === undefined ? {} : { drift }) } }
      })
      if (raised.drift === undefined && raised.anomalies.length === 0) return result
      const notes: string[] = []
      const at = await i.now()
      const session = await i.sessionId()
      if (raised.drift !== undefined) {
        notes.push(driftNote(raised.drift))
        await pushLog(i, LEDGER_KEY, { at, session, what: DRIFT_WHAT, detail: driftDetail(raised.drift), how: 'auto', did: true })
        await postBand(i, 'warn', 'proof2:drift', driftBand(raised.drift))
        i.toast(tr('Edits are wandering from your goal: {folders}.').replace('{folders}', raised.drift.folders.slice(0, 2).join(', ')))
      }
      for (const a of raised.anomalies) {
        if (a.flag !== 'idle') notes.push(a.note)
        await pushLog(i, LEDGER_KEY, { at, session, what: ANOMALY_WHAT, detail: a.detail, how: 'auto', did: true })
        await postBand(i, 'warn', 'proof2:anomaly', a.band)
        i.toast(a.toast)
      }
      i.invalidate()
      return notes.length === 0 || !(await tellsClaude(i)) ? result : { ...result, context: [...(result.context ?? []), ...notes] }
    } catch {
      return result
    }
  }).catch(($, e, next) => next(e))

  on('prompt.submit', { text: /(?<proof2>)/ }, async ($, e, next) => {
    try {
      if (isPersonMessage(e.text, e.origin)) await change2(io($), s => ({ state: afterMessage(s), out: undefined }))
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('turn.complete', { turnId: /(?<proof2>)/ }, async ($, e, next) => {
    const r = await next(e)
    if (e.agentId !== undefined) return r
    const i = io($)
    try {
      const p = await loadProof(i)
      const at = await i.now()
      await change2(i, s => ({ state: afterTurn2(s, p, at), out: undefined }))
      i.invalidate()
    } catch {
    }
    return r
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'vaken-help' }, async ($, e, next) => {
    const rest0 = subArgs(e.args, 'run', 'intent')
    if (rest0 === undefined) return next(e)
    const i = io($)
    try {
      const p = await loadProof(i)
      return { text: intentText(p, await load2(i), { doneOn: await doneIsOn(i), goal: p.goal?.text }) }
    } catch {
      return { text: '/vaken-help run intent could not run just now.' }
    }
  })

  on('command.run', { command: 'vaken-help' }, async ($, e, next) => {
    const rest0 = subArgs(e.args, 'run', 'confidence')
    if (rest0 === undefined) return next(e)
    const i = io($)
    try {
      if ((await readSetting(i, 'proof.confidence')) === 'off') return { text: 'The confidence score is off. Turn it on: Settings > Safety.' } // en-only: plain answer of a slash command (text twin)
      const p = await loadProof(i)
      return { text: confidenceLines(confidence(p, await load2(i), { doneOn: await doneIsOn(i), goal: p.goal?.text })).join('\n') }
    } catch {
      return { text: '/vaken-help run confidence could not run just now.' }
    }
  })

  on('command.run', { command: 'vaken-ship' }, async ($, e, next) => {
    const rest0 = subArgs(e.args, 'queue')
    if (rest0 === undefined) return next(e)
    const i = io($)
    try {
      const p = await loadProof(i)
      return { text: queueLines((await load2(i)).changes, p.debt).join('\n') }
    } catch {
      return { text: '/vaken-ship queue could not run just now.' }
    }
  })

  on('command.run', { command: 'vaken-ship' }, async ($, e, next) => {
    const rest0 = subArgs(e.args, 'heat')
    if (rest0 === undefined) return next(e)
    const i = io($)
    try {
      const s = await load2(i)
      return { text: heatLines(s.files, s.testTurns).join('\n') }
    } catch {
      return { text: '/vaken-ship heat could not run just now.' }
    }
  })
}
