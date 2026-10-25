// Lean session: cuts a long shell output (and, with All long output, a huge read, search, page or tool answer) before Claude reads it, skips a file read again with no change, and adds a few start facts to a conversation's first message (core/lean.ts).
import type { EngineInterface, On } from 'claude-code'
import { settingStoreKey } from '../core/settings'
import { isShellTool } from '../core/tools'
import { fieldsOf } from '../core/eventfields'
import { PR_SHARED_KEY } from '../core/crewpr'
import { withToastGate } from '../core/io'
import type { Io } from '../core/io'
import { homeFrom } from '../core/platform'
import { noteLeanDay } from './compaction'
import { LEAN_FLUSH_MS, EDIT_TOOLS, REPEAT_KINDS_RE, START_BLOCK, START_GIT_ARGV, START_GIT_TIMEOUT_MS, cutBig, cutResponse, cutsAll, forgetPath, forgetSession, leanMem, leanModeOf, mayCut, noteCut, noteRepeat, noteStep, parseStatus, repeatOf, rereadOf, startPrOf, startText } from '../core/lean'

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

// The cuts are in memory already; one write a while later adds them to the day's row of the Autopilot log (never a write per cut).
async function flushLean($: EngineInterface): Promise<void> {
  const cuts = leanMem.pendCuts
  const tokens = leanMem.pendTokens
  leanMem.pendCuts = 0
  leanMem.pendTokens = 0
  leanMem.timer = false
  if (cuts === 0) return
  try {
    const now = await $.clock.now()
    await noteLeanDay(io($), now, cuts, tokens)
  } catch {
  }
}
function leanSoon($: EngineInterface): void {
  if (leanMem.timer) return
  leanMem.timer = true
  $.clock.after(LEAN_FLUSH_MS, () => flushLean($))
}

async function readMode($: EngineInterface): Promise<void> {
  try {
    const raw = await $.store.get(settingStoreKey('lean.mode'))
    leanMem.mode = leanModeOf(raw)
  } catch {
  }
}

export function registerLean(on: On): void {
  on('session.start', { cwd: /(?<lean>)/ }, async ($, e, next) => {
    await readMode($)
    try {
      const sid = await $.session.id()
      forgetSession(sid)
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  // A compaction drops the earlier reads from Claude's context, so none of them counts as read any more.
  on('session.compact', { trigger: /(?<lean>)/ }, async ($, e, next) => {
    try {
      const sid = await $.session.id()
      forgetSession(sid)
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  // The busiest hook: every tool call passes (a step for No double reads); the mode is read from memory, never from the store.
  on('classic.PostToolUse', { tool_name: /^(?<lean>)/ }, async ($, e, next) => {
    const r = await next(e)
    try {
      if (leanMem.mode === 'off') return r
      const input = e.tool_input === null || typeof e.tool_input !== 'object' ? {} : fieldsOf(e.tool_input)
      noteStep(e.session_id, e.agent_id)
      if (EDIT_TOOLS.has(e.tool_name)) {
        const path = input.file_path ?? input.notebook_path
        if (typeof path === 'string') forgetPath(e.session_id, path)
        return r
      }
      if (!isShellTool(e.tool_name)) {
        if (e.tool_name === 'Read' && r.updatedToolOutput === undefined) {
          const again = rereadOf(e.session_id, e.agent_id, input, e.tool_response)
          if (again !== undefined) {
            const now = await $.clock.now()
            noteCut(again.lines, now)
            leanSoon($)
            return { ...r, updatedToolOutput: again.response }
          }
        }
        if (!cutsAll(leanMem.mode)) return r
        const mcp = e.tool_name.startsWith('mcp__')
        const big = cutBig(e.tool_name, input, (mcp ? r.updatedMCPToolOutput : undefined) ?? r.updatedToolOutput ?? e.tool_response)
        if (big === undefined) return r
        const now = await $.clock.now()
        noteCut(big.cut, now)
        leanSoon($)
        return mcp ? { ...r, updatedMCPToolOutput: big.response } : { ...r, updatedToolOutput: big.response }
      }
      const command = typeof input.command === 'string' ? input.command : ''
      if (!mayCut({ mode: leanMem.mode, command, byAgent: e.agent_id !== undefined })) return r
      const cut = cutResponse(r.updatedToolOutput ?? e.tool_response)
      if (cut === undefined) return r
      const now = await $.clock.now()
      noteCut(cut.cut, now)
      leanSoon($)
      return { ...r, updatedToolOutput: cut.response }
    } catch {
      return r
    }
  }).catch(($, e, next) => next(e))

  // The engine fires this once per conversation, for the context of its first message (again only after a compaction or /clear), so the status call is not made on every prompt.
  // Quiet repeat reminders (only with All, skip repeats): a reminder the engine repeats with the same text is answered with one short note. The mode is read from memory.
  on('prompt.attachment', { type: REPEAT_KINDS_RE }, async ($, e, next) => {
    const r = await next(e)
    try {
      if (leanMem.mode !== 'repeats' || e.origin.kind !== 'engine' || r.text === null) return r
      const sid = await $.session.id()
      const again = repeatOf(sid, e.agentId, e.type, r.text)
      if (again === undefined) return r
      const now = await $.clock.now()
      noteRepeat(again.saved, now)
      leanSoon($)
      return { ...r, text: again.text }
    } catch {
      return r
    }
  }).catch(($, e, next) => next(e))

  on('prompt.context', async ($, e, next) => {
    const r = await next(e)
    try {
      await readMode($)
      if (leanMem.mode === 'off') return r
      const cwd = await $.session.cwd()
      const g = await $.process.run(START_GIT_ARGV, { cwd, timeoutMs: START_GIT_TIMEOUT_MS })
      if (g.exitCode !== 0) return r
      const git = parseStatus(g.stdout)
      const shared = await $.store.get(PR_SHARED_KEY)
      const now = await $.clock.now()
      const pr = startPrOf(shared, cwd, git.branch, now)
      return { ...r, blocks: [...r.blocks.filter(b => b.name !== START_BLOCK), { name: START_BLOCK, text: startText(git, pr) }] }
    } catch {
      return r
    }
  }).catch(($, e, next) => next(e))
}
