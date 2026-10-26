// Why a step stopped: when Claude Code itself stops a step (classic PermissionDenied), the band says why in one line (core/allowrules.ts). It never answers.
// Rules in force: which instruction files and settings rules apply now, for the Memory card. Names only.
import type { EngineInterface, On } from 'claude-code'
import { withToastGate } from '../core/io'
import type { Io } from '../core/io'
import { homeFrom } from '../core/platform'
import { fieldsOf } from '../core/eventfields'
import { settingStoreKey } from '../core/settings'
import { RULE_SOURCES, allowMem, allowRulesModeOf, changedName, noteChanged, noteDenied, noteFile, rulesFrom, rulesMem } from '../core/allowrules'
import type { Env } from '../core/allowrules'
import { deniedLineOf } from '../core/denied'

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

  // Claude Code itself stopped a step (auto mode, a deny rule, don't ask mode): the band says why in one line. This hook never retries the step for the
  // person (a retry is the engine's `retry` answer inside this hook, which only a clear press could justify) and keeps nothing but the step's kind and a hash.
  on('classic.PermissionDenied', { tool_name: /(?<allowrules>)/ }, async ($, e, next) => {
    try {
      if (allowMem.mode !== 'off' && e.agent_id === undefined) {
        const i = io($)
        const args = e.tool_input === null || typeof e.tool_input !== 'object' ? {} : fieldsOf(e.tool_input)
        const line = deniedLineOf(e.tool_name, args, await envOf($), e.permission_mode, typeof e.reason === 'string' ? e.reason : '', await i.now())
        if (line !== undefined) {
          noteDenied(line)
          i.invalidate()
        }
      }
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))
}
