// The model and effort hints at run time (core/modelfit.ts holds the rules and words).
import type { McpToolResult } from 'claude-code'

import type { Io } from '../../core/io'
import { isShellTool } from '../../core/tools'
import { tr } from '../../core/lang'
import { readNote } from '../../core/flush'
import { lookupModel } from '../../core/models'
import { checksIn, readState, stateKey } from '../../core/proof'
import { weekWindow } from '../../core/dayshare'
import { USAGE_SERVER } from '../../core/appusage'
import { FIT_ASKED_BACK, FIT_FAILED, FIT_KEY, FIT_UNDO_MS, askedWord, endFit, failsInRow, fitFacts, fitKey, fitOn, isEffort, ledgerWord, modelIdIn, nextStretch, oldWord, paceFit, parseFit, parseSessionSetting, stepKind, suggestFit, undoWord } from '../../core/modelfit'
import type { Effort, FitFacts, FitPace, Stretch, Suggestion, Week } from '../../core/modelfit'
import type { SessionRecord } from '../../core/record'
import type { Values } from '../../core/settings'
import { LEDGER_KEY, pushLog } from '../compaction'
import type { HomeEngine } from './engine'
import { USAGE_STALE_MS } from './logic'
import type { Row, View } from './logic'

// ---- This session's own facts (memory of this process; only the record carries them to the others)

export const fitMem: {
  stretch: Stretch
  fails: number
  effort?: Effort
  model?: string
  pace: Map<string, FitPace>
  undo: Map<string, FitUndo>
} = { stretch: { n: 0 }, fails: 0, pace: new Map(), undo: new Map() }

export type FitUndo = { at: number; name: string; tool: 'set_session_effort' | 'set_session_model'; field: 'effort' | 'model'; old: string; title: string }

// Only read, never rewritten.
export function noteStep(model: unknown, effort: unknown): void {
  if (typeof model === 'string' && model.trim() !== '') fitMem.model = model
  if (isEffort(effort)) fitMem.effort = effort
}

// The same facts give the same object, so the record is saved only when one of them changes (core/record.ts).
export async function fitPatch(i: Io, tool: string, command: unknown): Promise<Partial<SessionRecord>> {
  try {
    const cmd = typeof command === 'string' ? command : undefined
    fitMem.stretch = nextStretch(fitMem.stretch, stepKind(tool, cmd), await i.now())
    if (isShellTool(tool) && cmd !== undefined && checksIn(cmd).length > 0) fitMem.fails = failsInRow(readState(await readNote(i, stateKey(await i.sessionId()))).receipts)
    return { fit: fitFacts(fitMem.stretch, fitMem.fails, fitMem.effort), ...(fitMem.model === undefined ? {} : { model: fitMem.model }) }
  } catch {
    return {}
  }
}

// The week as the hints read it: the app's weekly window while its reading is fresh
export function weekOf(view: View): Week | undefined {
  const now = view.now ?? 0
  const usage = view.usage
  if (usage !== undefined && view.now !== undefined && now - usage.at < USAGE_STALE_MS) {
    const w = weekWindow(usage.windows)
    if (w !== undefined) return w
  }
  return view.week === undefined ? undefined : { percent: view.week.percent, ...(view.week.resetsAt === undefined ? {} : { resetsAt: view.week.resetsAt }) }
}

export function fitFor(view: View, values: Values, r: Row): Suggestion | undefined {
  const now = view.now ?? 0
  const sid = r.rec.sessionId
  const s = suggestFit({
    on: fitOn(values[FIT_KEY]),
    running: r.kind === 'working' || r.kind === 'needs' || r.rec.state === 'working',
    model: r.rec.model,
    fit: parseFit(r.rec.fit),
    week: weekOf(view),
    lookup: lookupModel(values['runner.researcher'], undefined),
    now,
  })
  const paced = paceFit(fitMem.pace.get(sid), s, now)
  fitMem.pace.set(sid, paced.pace)
  return paced.show ? s : undefined
}

export function undoFor(sid: string, now: number): FitUndo | undefined {
  const u = fitMem.undo.get(sid)
  return u !== undefined && now - u.at < FIT_UNDO_MS ? u : undefined
}

export function fitSignature(view: View, values: Values): string {
  const now = view.now ?? 0
  const rows = [...(view.here === undefined ? [] : [view.here]), ...view.needs, ...view.working, ...view.waiting, ...view.idle]
  return rows
    .map(r => {
      const s = fitFor(view, values, r)
      return `${s === undefined ? '' : fitKey(s)}${undoFor(r.rec.sessionId, now) === undefined ? '' : '+u'}`
    })
    .join(',')
}

export type FitActs = {
  change: (sid: string, name: string, s: Suggestion, rec: { model: string; fit?: FitFacts }) => void
  undo: (sid: string) => void
  notNow: (sid: string) => void
}

const busy = new Set<string>()
async function once(id: string, run: () => Promise<void>): Promise<void> {
  if (busy.has(id)) return
  busy.add(id)
  try {
    await run()
  } catch {
  } finally {
    busy.delete(id)
  }
}

const textOf = (r: McpToolResult): string => (r.content.find(c => c.type === 'text') as { text?: string } | undefined)?.text ?? ''

// The old value, from the app (get_session), else from the record.
async function oldOf(eng: HomeEngine, sid: string, field: 'effort' | 'model', rec: { model: string; fit?: FitFacts }): Promise<string | undefined> {
  try {
    const r = await eng.mcpCall(USAGE_SERVER, 'get_session', { session_id: sid })
    const got = r.isError ? {} : parseSessionSetting(textOf(r))
    const v = got[field]
    if (v !== undefined) return v
  } catch {
  }
  if (field === 'effort') return parseFit(rec.fit).effort
  return rec.model === '' || rec.model === 'unknown' ? undefined : rec.model
}

// A model the app does not take by its family name is tried once more with the id the app's answer offers.
async function setOn(eng: HomeEngine, sid: string, tool: FitUndo['tool'], value: string): Promise<boolean> {
  const field = tool === 'set_session_effort' ? 'effort' : 'model'
  const r = await eng.mcpCall(USAGE_SERVER, tool, { session_id: sid, [field]: value })
  if (!r.isError) return true
  if (tool !== 'set_session_model') return false
  const id = modelIdIn(textOf(r), value as never)
  if (id === undefined || id === value) return false
  return !(await eng.mcpCall(USAGE_SERVER, tool, { session_id: sid, model: id })).isError
}

function failed(i: Io, sid: string, now: number): void {
  fitMem.pace.set(sid, { ...endFit(fitMem.pace.get(sid), now), quiet: true })
  i.toast(tr(FIT_FAILED), true)
  i.invalidate()
}

export async function changeSession(eng: HomeEngine, sid: string, name: string, s: Suggestion, rec: { model: string; fit?: FitFacts }): Promise<void> {
  const i = eng.io()
  // Never this session: the app refuses it, and the pane gives advice there instead.
  if (sid === (await i.sessionId())) return
  await once(`fit:${sid}`, async () => {
    const now = await eng.now()
    const tool = 'effort' in s.change ? 'set_session_effort' : 'set_session_model'
    const field = 'effort' in s.change ? 'effort' : 'model'
    const value = 'effort' in s.change ? s.change.effort : s.change.model
    try {
      const old = await oldOf(eng, sid, field, rec)
      if (!(await setOn(eng, sid, tool, value))) {
        failed(i, sid, now)
        return
      }
      fitMem.pace.set(sid, endFit(fitMem.pace.get(sid), now))
      if (old !== undefined && old !== value) fitMem.undo.set(sid, { at: now, name, tool, field, old, title: undoWord(s, tr) })
      i.toast(askedWord(s, name, tr), true)
      await pushLog(i, LEDGER_KEY, { at: now, session: await i.sessionId(), what: ledgerWord(s, name), how: 'button', did: true })
      i.invalidate()
    } catch {
      failed(i, sid, now)
    }
  })
}

export async function undoSession(eng: HomeEngine, sid: string): Promise<void> {
  const i = eng.io()
  const u = fitMem.undo.get(sid)
  if (u === undefined || sid === (await i.sessionId())) return
  await once(`fit:${sid}`, async () => {
    const now = await eng.now()
    fitMem.undo.delete(sid)
    try {
      if (!(await setOn(eng, sid, u.tool, u.old))) {
        failed(i, sid, now)
        return
      }
      i.toast(tr(FIT_ASKED_BACK).replace('{name}', u.name).replace('{old}', oldWord(u.old)), true)
      await pushLog(i, LEDGER_KEY, { at: now, session: await i.sessionId(), what: `Put ${u.name} back to ${oldWord(u.old)}`, how: 'button', did: true })
      i.invalidate()
    } catch {
      failed(i, sid, now)
    }
  })
}

export function fitActsOf(eng: HomeEngine): FitActs {
  return {
    change: (sid, name, s, rec) => void changeSession(eng, sid, name, s, rec),
    undo: sid => void undoSession(eng, sid),
    notNow: sid => {
      void (async () => {
        fitMem.pace.set(sid, endFit(fitMem.pace.get(sid), await eng.now()))
        eng.io().invalidate()
      })().catch(() => undefined)
    },
  }
}
