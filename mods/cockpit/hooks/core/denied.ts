// Denied-step explainer: when Claude Code itself stops a step (its auto mode, a deny rule, don't ask mode), the band says why in one plain line.
// The step's words are the guard's own readings (allowrules.ts stepSaid); this file only decides who stopped it. The line has no press: vaken never retries a step.
import type { DeniedLine, DeniedWhy, Env } from './allowrules'
import { rulesMem, stepHash, stepSaid } from './allowrules'

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

// The line for a stopped step: who stopped it and what the step was.
export function deniedLineOf(tool: string, args: Record<string, unknown>, env: Env, mode: string | undefined, reason: string, now: number): DeniedLine | undefined {
  const why = deniedWhy(mode, reason, tool, rulesMem.deny)
  if (why === undefined) return undefined
  const s = stepSaid(tool, args, env, [])
  return { why, said: s.said, tool, hash: stepHash(tool, args), at: now }
}
