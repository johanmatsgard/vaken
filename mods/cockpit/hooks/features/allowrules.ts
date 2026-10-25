// Fewer may-I stops: sees Claude Code's own "Allow?" question (tool.check says ask) and whether the step then ran, and offers the rule once (core/allowrules.ts).
// Approve in the band: while that question waits (classic PermissionRequest), the band says what the step does and whether Undo has a copy. It never answers.
import { tr } from '../core/lang'
import type { EngineInterface, On } from 'claude-code'
import { withToastGate } from '../core/io'
import type { Io } from '../core/io'
import { homeFrom } from '../core/platform'
import { fieldsOf } from '../core/eventfields'
import { readSetting, settingStoreKey } from '../core/settings'
import { RULE_SOURCES, addOffer, allowMem, allowRulesModeOf, askLineOf, changedName, closeAsk, countAllow, hasPending, noteAskId, noteBandOffer, noteChanged, noteDenied, noteFile, notePending, offerWords, openAsk, ruleFormOf, rulesFrom, rulesMem, stepHash, takePending, wasAsked } from '../core/allowrules'
import type { Env } from '../core/allowrules'
import { deniedLineOf } from '../core/denied'
import { UNDO_SETTING, fileToolTargets, loadIndex, shellPlan } from '../core/undo'
import { isInside } from '../core/guardpaths'
import { isEditTool, shellFlavorOfTool } from '../core/tools'

// Undo's copies are taken just before the question opens (its tool.call hook runs first), so a copy this fresh is of this step
const COPY_FRESH_MS = 2 * 60_000

// What undo knows of the step: the files it changes and whether every one has a fresh copy. Never throws.
async function undoFacts(i: Io, tool: string, args: Record<string, unknown>, env: Env): Promise<{ on: boolean; changed: string[]; copied: boolean }> {
  try {
    const on = (await readSetting(i, UNDO_SETTING)) !== 'off'
    const flavor = shellFlavorOfTool(tool)
    const targets = flavor !== undefined ? (typeof args.command === 'string' ? shellPlan(args.command, env, flavor).targets : []) : isEditTool(tool) ? fileToolTargets(tool, args, env) : []
    if (targets.length === 0) return { on, changed: [], copied: false }
    const now = await i.now()
    const snaps = on ? (await loadIndex(i, await i.sessionId())).snaps.filter(s => now - s.at < COPY_FRESH_MS && s.at <= now) : []
    const inside = (path: string) => snaps.filter(s => s.path === path || isInside(s.path, path))
    const copied = on && targets.every(t => t.create || inside(t.path).length > 0)
    // A folder counts its files: the copies inside it
    const changed = targets.flatMap(t => {
      const got = inside(t.path).filter(s => s.path !== t.path)
      return got.length > 0 ? got.map(s => s.path) : [t.path]
    })
    return { on, changed: [...new Set(changed)], copied }
  } catch {
    return { on: false, changed: [], copied: false }
  }
}

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

async function readMode($: EngineInterface): Promise<void> {
  try {
    const raw = await $.store.get(settingStoreKey('allow.rules'))
    allowMem.mode = allowRulesModeOf(raw)
  } catch {
  }
}

// Rules in force (core/allowrules.ts rulesMem): every settings source's allow and deny rules, names only. Never throws.
async function readRules($: EngineInterface): Promise<void> {
  const sources: unknown[] = []
  for (const source of RULE_SOURCES) {
    try {
      const read = await $.settings.read({ source })
      sources.push(read)
    } catch {
    }
  }
  const r = rulesFrom(sources)
  rulesMem.allow = r.allow
  rulesMem.deny = r.deny
  rulesMem.read = sources.length > 0
}

async function envOf($: EngineInterface): Promise<Env> {
  const home = await io($).home()
  const cwd = await $.session.cwd()
  const root = await $.session.root()
  return { home, cwd, root }
}

export function registerAllowRules(on: On): void {
  on('session.start', { cwd: /(?<allowrules>)/ }, async ($, e, next) => {
    await readMode($)
    // Not awaited: the start stays quick
    void readRules($)
    return next(e)
  }).catch(($, e, next) => next(e))

  // Which instruction files apply now: names and tiers only, never the text
  on('classic.InstructionsLoaded', { file_path: /(?<rulesnow>)/ }, async ($, e, next) => {
    try {
      noteFile(rulesMem, e.file_path, e.memory_type)
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  // A settings file changed mid-session: the card names it, and the rules are read again
  on('classic.ConfigChange', { source: /(?<rulesnow>)/ }, async ($, e, next) => {
    try {
      const now = await $.clock.now()
      noteChanged(rulesMem, changedName(e.file_path, e.source), now)
      await readRules($)
      $.ui.invalidate('ui.render')
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  // Runs for every step: only an ask on a real call does more than read memory.
  on('tool.check', { tool: /(?<allowrules>)/ }, async ($, e, next) => {
    const r = await next(e)
    try {
      if (r.decision !== 'ask' || allowMem.mode === 'off' || e.tool_use_id === undefined) return r
      const input = e.input === null || typeof e.input !== 'object' ? {} : fieldsOf(e.input)
      noteAskId(e.tool_use_id, e.tool, stepHash(e.tool, input))
      const form = ruleFormOf(e.tool, input, await envOf($))
      if (form !== undefined) notePending(e.tool_use_id, form)
    } catch {
    }
    return r
  }).catch(($, e, next) => next(e))

  // Claude Code is about to ask the person "Allow?": the band says what the step does. The hooks beneath (settings hooks) answer first;
  // only a question that will really show gets the line. The answer stays the person's: this hook never returns a decision of its own.
  on('classic.PermissionRequest', { tool_name: /(?<allowrules>)/ }, async ($, e, next) => {
    const r = await next(e)
    try {
      if (r.decision !== undefined || allowMem.mode === 'off' || e.agent_id !== undefined) return r
      const i = io($)
      const env = await envOf($)
      const args = e.tool_input === null || typeof e.tool_input !== 'object' ? {} : fieldsOf(e.tool_input)
      openAsk(askLineOf(e.tool_name, args, env, await undoFacts(i, e.tool_name, args, env), await i.now()))
      i.invalidate()
    } catch {
    }
    return r
  }).catch(($, e, next) => next(e))

  // Claude Code itself stopped a step (auto mode, a deny rule, don't ask mode): the band says why in one line. This hook never retries the step for the
  // person (a retry is the engine's `retry` answer inside this hook, which only a clear press could justify) and keeps nothing but the step's kind and a hash.
  on('classic.PermissionDenied', { tool_name: /(?<allowrules>)/ }, async ($, e, next) => {
    const r = await next(e)
    try {
      if (allowMem.mode === 'off' || e.agent_id !== undefined) return r
      const i = io($)
      const args = e.tool_input === null || typeof e.tool_input !== 'object' ? {} : fieldsOf(e.tool_input)
      const line = deniedLineOf(e.tool_name, args, await envOf($), e.permission_mode, typeof e.reason === 'string' ? e.reason : '', await i.now())
      if (line !== undefined) {
        noteDenied(line)
        i.invalidate()
      }
    } catch {
    }
    return r
  }).catch(($, e, next) => next(e))

  // The step ran after the ask, so the person said yes; a refusal comes back as a deny. Either way the question is over and its band line goes.
  on('tool.call', { tool: /(?<allowrules>)/ }, async ($, e, next) => {
    const result = await next(e)
    try {
      const id = typeof e.tool_use_id === 'string' ? e.tool_use_id : undefined
      // A yes counts only when vaken saw the question for this very step; a step that ran with no question (auto-approved) is not a yes
      const asked = wasAsked(id)
      if (closeAsk(id, e.tool)) {
        $.ui.invalidate('ui.render')
      }
      if (!hasPending()) return result
      const form = takePending(id)
      if (form === undefined || !asked || result.deny !== undefined || allowMem.mode === 'off') return result
      const i = io($)
      const now = await i.now()
      const offer = await countAllow(i, form, now)
      if (offer !== undefined) {
        addOffer(offer)
        noteBandOffer(offer, now)
        i.toast(offerWords(offer, tr))
        i.invalidate()
      }
    } catch {
    }
    return result
  }).catch(($, e, next) => next(e))
}
