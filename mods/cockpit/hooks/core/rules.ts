// Watches rules written in CLAUDE.md as 'Never `pkill`...': when a shell command starts with the named command it counts it, tells Claude and shows it in the band. Only command words are looked at, so a file name in a rule never gives a false hit.
import type { HelpEntry } from './registry'
import type { Setting } from './settings'
import { t, tLine, tr } from '../i18n/t'
import { fillIn } from './fillin'

export const RULES_SETTINGS: Setting[] = [
  {
    key: 'rules.mode',
    group: 'Notes for the next session',
    label: 'Rules count',
    note: 'Counts steps that break a Never rule in your CLAUDE.md.',
    options: [
      { value: 'off', label: 'Off' },
      { value: 'count', label: 'Count only' },
      { value: 'warn', label: 'Warn' },
    ],
    default: 'warn',
  },
]
export const RULES_HELP: HelpEntry[] = [{ title: 'Does it count the rules I wrote?', text: 'If your CLAUDE.md says "Never `pkill`", vaken counts each shell command that starts with pkill. In Warn mode it shows it above the chat box, and Claude hears it only when Notes to Claude is set to All checks. /vaken-memory rules lists the rules it watches.' }]

export const RULE_WHAT = 'Caught a step that breaks a rule'

export type Rule = { id: string; command: string; text: string; source: string }

const NEGATIVE = /^\s*(?:[-*]\s+|\d+[.)]\s+)?(?:\*\*)?[^`\n]{0,40}?\b(?:never|do not|don't|must not|should not|avoid)\b/i

const idOf = (command: string): string => command.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export function parseRules(text: string, source: string): Rule[] {
  const out: Rule[] = []
  for (const line of text.split(/\r?\n/)) {
    if (!NEGATIVE.test(line)) continue
    for (const m of line.matchAll(/`([^`\n]{2,48})`/g)) {
      const command = m[1].trim()
      // 'package.json' or 'console.log' are not commands here.
      if (!/^[a-z][a-z0-9_-]*(?:\s+[-a-z0-9_./=:]+){0,4}$/.test(command) && !/^(?:\.{0,2}\/)?[\w./-]+\.sh$/.test(command)) continue
      if (/\.(?:json|ts|tsx|js|md|yml|yaml|toml|lock)$/.test(command)) continue
      if (!out.some(r => r.command === command)) out.push({ id: idOf(command), command, text: line.trim().replace(/\*\*/g, '').slice(0, 140), source })
    }
  }
  return out
}

export function commandStarts(line: string): string[] {
  return line
    .split(/&&|\|\||;|\||\n/)
    .map(part => part.trim().replace(/^(?:\w+=\S*\s+)+/, '').replace(/^(?:sudo|env|nohup|time)\s+/, '').trim())
    .filter(part => part !== '')
}

export function breaks(rule: Rule, command: string): boolean {
  const want = rule.command.replace(/\s+/g, ' ')
  return commandStarts(command).some(start => {
    const s = start.replace(/\s+/g, ' ')
    return s === want || s.startsWith(`${want} `)
  })
}

export const hitsOf = (rules: Rule[], command: string): Rule[] => rules.filter(r => breaks(r, command))

export type Counts = Record<string, number>
export const rulesKey = (sessionId: string): string => `cockpit:rules:${sessionId}`

// en-only: a note to Claude
export const noteFor = (rules: Rule[]): string => `Vaken saw a step that your own rules forbid: ${rules.map(r => `"${r.text.slice(0, 100)}" (${r.source})`).join('; ')} Tell the person, and do not do it again unless they say so.`
export const bandText = (rules: Rule[]): string => tLine('band.rule_broken_command', { command: rules[0].command })

export function rulesText(rules: Rule[], counts: Counts): string {
  if (rules.length === 0) return tr('No rule with a command in backticks was found in your CLAUDE.md files. Write one like: Never run `pkill`.')
  const lines = rules.map(r => `  ${fillIn(tr('{command}: {times} this session ({source})'), { command: r.command, times: t('words.time', { n: counts[r.id] ?? 0 }), source: r.source })}`)
  return [fillIn(tr('Rules vaken watches ({n}):'), { n: rules.length }), ...lines, '', tr('It checks the start of each shell command. A rule it cannot read as a command is left out.')].join('\n')
}
