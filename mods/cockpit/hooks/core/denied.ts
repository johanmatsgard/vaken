// Denied-step explainer: when Claude Code itself stops a step (its auto mode, a deny rule, don't ask mode), the band says why in one plain line.
// The step's words are the guard's own readings (allowrules.ts stepSaid); this file only decides who stopped it and whether an allow rule would help.
// A plugin can retry a stopped step only inside the PermissionDenied hook, never from a later press, so the one press is Copy the allow rule.
import type { DeniedLine, DeniedWhy, Env } from './allowrules'
import { clashesOf, rulesMem, ruleFormOf, stepHash, stepSaid } from './allowrules'

// A step a settings hook stopped is told by that hook's own line; the engine's reason is read here and never kept
const HOOK = /\bhooks?\b/i
const RULE = /\bdeny rules?\b|\b(?:denied|blocked) by (?:a |your |the )?(?:permission |deny )?rules?\b|\bpermission rules?\b/i
const AUTO = /\bclassifier\b|\bauto mode\b/i
const DONT_ASK = /\bdon'?t ask\b|\bdont_?ask\b/i

// Who stopped the step; undefined when this file is not the one to say it (a hook did).
export function deniedWhy(mode: string | undefined, reason: string, tool: string, deny: readonly string[]): DeniedWhy | undefined {
  if (HOOK.test(reason)) return undefined
  if (RULE.test(reason)) return 'rule'
  if (AUTO.test(reason)) return 'auto'
  // A deny rule that names this tool: in auto mode the classifier may be the one, so then only the plain word is honest
  const named = deny.some(d => d === tool || d.startsWith(`${tool}(`))
  if (named) return mode === 'auto' ? 'other' : 'rule'
  if (mode === 'auto') return 'auto'
  if (mode === 'dontAsk' || DONT_ASK.test(reason)) return 'dontask'
  return 'other'
}

// The line for a stopped step. The allow rule shows only for a safe kind (ruleFormOf rates it), when no deny rule is the cause and it is not already allowed.
export function deniedLineOf(tool: string, args: Record<string, unknown>, env: Env, mode: string | undefined, reason: string, now: number): DeniedLine | undefined {
  const why = deniedWhy(mode, reason, tool, rulesMem.deny)
  if (why === undefined) return undefined
  const s = stepSaid(tool, args, env, [])
  const form = why === 'rule' || s.risky ? undefined : ruleFormOf(tool, args, env)
  const rule = form === undefined || clashesOf([form.rule], rulesMem.allow).length > 0 ? undefined : form.rule
  return { why, said: s.said, tool, hash: stepHash(tool, args), at: now, ...(rule === undefined ? {} : { rule }) }
}
