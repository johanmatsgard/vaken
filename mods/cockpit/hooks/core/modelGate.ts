// The one door for a model call: every call goes through here and leaves one line in the Autopilot ledger. It takes an Io, never `$`.
import type { Io } from './io'
import { LEDGER_KEY, pushLog } from '../features/compaction'

// The stored title is English; the pane shows it through the table.
export const MODEL_SIMPLER_WHAT = 'Asked a model: Say simpler'
export const MODEL_KEEPER_WHAT = 'Asked a model: Keep the cache warm'

export type ModelCtx = {
  // The ledger title of this call (a table row), saying why the model was asked.
  what: string
  // False when the caller writes its own line for the call.
  log?: boolean
}

export type ModelReq = Parameters<Io['complete']>[0]
export type ForkReq = Parameters<NonNullable<Io['fork']>>[0]

// One line per call, written before the call so a failed call is still on the list. A failed write never stops the call.
async function note(i: Io, ctx: ModelCtx): Promise<void> {
  if (ctx.log === false) return
  try {
    await pushLog(i, LEDGER_KEY, { at: await i.now(), session: await i.sessionId(), what: ctx.what, how: 'typed' })
  } catch {
    // The ledger is a note, not a condition.
  }
}

export async function askModel(i: Io, ctx: ModelCtx, req: ModelReq): ReturnType<Io['complete']> {
  await note(i, ctx)
  return i.complete(req)
}

// The same door for a call that continues this session's own chat (the cache keeper's ping).
export async function askFork(i: Io, ctx: ModelCtx, req: ForkReq): ReturnType<NonNullable<Io['fork']>> {
  await note(i, ctx)
  if (i.fork === undefined) throw new Error('model.fork-missing')
  return i.fork(req)
}
