// Reflection from vaken's own ledger: what went wrong and repeated, with a rule you could write down. Reads titles, counts and error kinds, never the chat.
import type { HelpEntry } from './registry'
import type { Entry } from './ledger'
import { startOfDay } from './ledger'
import { tr } from './lang'

export const REFLECT_HELP: HelpEntry[] = [{ title: 'What reflection does', text: '/vaken-memory reflect looks at what vaken caught today (loops, stopped steps, unproven claims, drift) and, when the same thing happened twice or more, suggests a rule to write in your CLAUDE.md.' }]

type Pattern = { what: RegExp; label: string; rule: string }
export const PATTERNS: Pattern[] = [
  { what: /^Caught a repeating step|^Blocked the same step again/, label: 'a step kept failing the same way', rule: 'If a step fails twice the same way, stop and ask me before trying a third time.' }, // en-only: the label is said by tr() where shown; the rule is pasted into CLAUDE.md in English, the rule counter reads English
  { what: /^Claude said done without proof/, label: 'Claude said it was done without proof', rule: 'Run the tests and show the result before you say the work is done.' }, // en-only: the label is said by tr() where shown; the rule is pasted into CLAUDE.md in English, the rule counter reads English
  { what: /^Noticed work far from the goal/, label: 'edits wandered away from the task', rule: 'Only change files for this task. Ask before touching other folders.' }, // en-only: the label is said by tr() where shown; the rule is pasted into CLAUDE.md in English, the rule counter reads English
  { what: /^Spotted odd behaviour|^Going round in circles/, label: 'work went in circles', rule: 'If you edit the same file more than four times in one answer, stop and explain what is wrong.' }, // en-only: the label is said by tr() where shown; the rule is pasted into CLAUDE.md in English, the rule counter reads English
  { what: /^Held a risky command|^Warned about a risky command/, label: 'risky commands were tried', rule: 'Never run destructive commands (rm -rf, force push, reset --hard) without asking first.' }, // en-only: the label is said by tr() where shown; the rule is pasted into CLAUDE.md in English, the rule counter reads English
  { what: /^Held a package install|^Warned about a package install/, label: 'new packages were installed', rule: 'Ask me before you add a new package. Say why it is needed.' }, // en-only: the label is said by tr() where shown; the rule is pasted into CLAUDE.md in English, the rule counter reads English
  { what: /^Held a weakened test|^Warned about a weakened test/, label: 'tests were weakened', rule: 'Never skip, delete or loosen a test to make it pass. Fix the code.' }, // en-only: the label is said by tr() where shown; the rule is pasted into CLAUDE.md in English, the rule counter reads English
  { what: /^Warned about a file another session is editing/, label: 'two sessions edited the same file', rule: 'Before you edit a file, check that no other session is changing it.' }, // en-only: the label is said by tr() where shown; the rule is pasted into CLAUDE.md in English, the rule counter reads English
  { what: /^Held a step that touches a secret|^Warned about a secret/, label: 'a secret was touched', rule: 'Never read or print .env files or keys. Ask me for the value if you need it.' }, // en-only: the label is said by tr() where shown; the rule is pasted into CLAUDE.md in English, the rule counter reads English
  { what: /^Warned about the budget|^Held a call over budget/, label: 'the budget ran short', rule: 'Tell me before a step that will cost a lot of usage.' }, // en-only: the label is said by tr() where shown; the rule is pasted into CLAUDE.md in English, the rule counter reads English
]

type Finding = { label: string; count: number; rule: string }

export function reflect(ledger: Entry[], now: number): Finding[] {
  const today = ledger.filter(e => e.at >= startOfDay(now))
  return PATTERNS.map(p => ({ label: p.label, rule: p.rule, count: today.filter(e => p.what.test(e.what)).length })).filter(f => f.count > 0).sort((a, b) => b.count - a.count)
}

export function reflectText(found: Finding[]): string {
  if (found.length === 0) return tr('Nothing went wrong that vaken saw today. Nothing to suggest.')
  const lines = found.map(f => `  ${f.count}x ${tr(f.label)}`)
  const rules = found.filter(f => f.count >= 2)
  return [
    tr('What vaken saw today:'),
    ...lines,
    '',
    ...(rules.length === 0 ? [tr('Each thing happened once, so there is no rule to suggest yet.')] : [tr('A rule you could add to your CLAUDE.md:'), ...rules.map(f => `  - ${f.rule}`)]),
  ].join('\n')
}
