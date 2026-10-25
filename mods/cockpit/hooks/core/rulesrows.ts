// The Memory and notes card's rules rows (core/contextcard.ts): which instruction files and allow rules apply now, a file that changed mid-session,
// a rule both allowed and denied. Names and counts only (core/allowrules.ts rulesMem). Pure.
import type { ContextGroupRow } from './contextcard'
import { CONTEXT_RULES, CONTEXT_RULES_ALLOWS, CONTEXT_RULES_ALLOW_MANY, CONTEXT_RULES_ALLOW_ONE, CONTEXT_RULES_CHANGED, CONTEXT_RULES_CLASH, CONTEXT_RULES_DENIES, CONTEXT_RULES_FILES, CONTEXT_RULES_FILE_MANY, CONTEXT_RULES_FILE_ONE } from './contextwords'

// `files`: the instruction files' names; `fileCount`: their count when no name is known yet; `read`: the settings files were read
export type RulesFacts = { files: string[]; fileCount: number; allow: string[]; deny: string[]; read: boolean; changed: string[]; clash: string[] }

// A fact line lists this many names, then "+N"
export const RULES_LIST_MAX = 8
const NAMES_MAX = 3
const list = (names: readonly string[], max: number): string => `${names.slice(0, max).join(', ')}${names.length > max ? ` +${names.length - max}` : ''}`
const count = (n: number, one: string, many: string, t: (s: string) => string): string => (n === 1 ? t(one) : t(many).replace('{n}', String(n)))

const RULES_MEANS = 'What Claude follows now: the instruction files Claude Code loaded in this session, and the allow and deny rules of every settings file. Vaken only reads them, and keeps names and counts only.'
const RULES_NEXT = 'The rules are under "permissions" in .claude/settings.json, .claude/settings.local.json and ~/.claude/settings.json. Vaken never changes them.'
const CHANGED_MEANS = 'A settings file or an instruction file changed after this session started. Settings apply at once. Claude may follow the old text of an instruction file until the session is compacted or a new one starts.'
const CHANGED_NEXT = 'If Claude should follow the new text now, start a new session.'
const CLASH_MEANS = 'The same rule is in an allow list and in a deny list. Claude Code follows the deny, so the allow does nothing.'
const CLASH_NEXT = 'Keep the rule in one list only.'

export function rulesRows(r: RulesFacts | undefined, t: (s: string) => string): ContextGroupRow[] {
  if (r === undefined) return []
  const files = Math.max(r.files.length, r.fileCount)
  const right = [...(files === 0 ? [] : [count(files, CONTEXT_RULES_FILE_ONE, CONTEXT_RULES_FILE_MANY, t)]), ...(r.read ? [count(r.allow.length, CONTEXT_RULES_ALLOW_ONE, CONTEXT_RULES_ALLOW_MANY, t)] : [])]
  const facts = [
    ...(r.files.length === 0 ? [] : [t(CONTEXT_RULES_FILES).replace('{names}', list(r.files, RULES_LIST_MAX))]),
    ...(r.allow.length === 0 ? [] : [t(CONTEXT_RULES_ALLOWS).replace('{names}', list(r.allow, RULES_LIST_MAX))]),
    ...(r.deny.length === 0 ? [] : [t(CONTEXT_RULES_DENIES).replace('{names}', list(r.deny, RULES_LIST_MAX))]),
  ]
  return [
    ...(right.length === 0 ? [] : [{ key: 'rules', title: t(CONTEXT_RULES), right: right.join(' · '), what: { means: RULES_MEANS, ...(facts.length === 0 ? {} : { facts }), next: RULES_NEXT, setting: 'allow.rules' } }]),
    // The label stays whole; the names are the value (beside it, or under it when the row is narrow)
    ...(r.changed.length === 0 ? [] : [{ key: 'rules-changed', title: t(CONTEXT_RULES_CHANGED), right: list(r.changed, NAMES_MAX), what: { means: CHANGED_MEANS, facts: r.changed.slice(0, RULES_LIST_MAX), next: CHANGED_NEXT } }]),
    ...(r.clash.length === 0 ? [] : [{ key: 'rules-clash', title: t(CONTEXT_RULES_CLASH), right: list(r.clash, 1), what: { means: CLASH_MEANS, facts: r.clash.slice(0, RULES_LIST_MAX), next: CLASH_NEXT, setting: 'allow.rules' } }]),
  ]
}
