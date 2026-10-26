// The settings registry: one list read by the settings view and the text command.
import { PROJSET_PREFIX, SESSSET_PREFIX, SETTINGS_KEY, SETTING_PREFIX } from './io'
import type { Io } from './io'
import { PREVIEW_NOTE, PREVIEW_TITLE } from './previewwords'
import { SETUP_NOTE, SETUP_TITLE } from './setupwords'
import { sysWord } from './syswords'
import { DO_CARD_LABEL, DO_NOTE } from './dowords'
import { FEATURE_SETTINGS } from './registry'
import { cardsDefault, cardsOptions } from './cardrules'
import { ADVANCED_SECTION, COUNT_CHIP, SECTION_TABLE, cardOfFocus, decorate, isAdvanced, isTextOnly, sectionNamed, sectionOfCard, sectionOfGroup, sectionOfSetting, tally } from './settingsmap'
import type { Section } from './settingsmap'
import { REGISTRY } from '../i18n/langs'
import { tEn, tr } from '../i18n/t'
import { fmt } from './fmt'
import { OPEN_START_LABEL, OPEN_START_NOTE, OPEN_START_SETTING } from './openstart'

// A size choice in the words of the front of the card ("100k tokens", as "164k of 200k tokens"): the one formatter, core/fmt.ts
// The cost word of a choice that sends Claude extra text: the same words as the tag of Settings' mode list (settings.mode_tag_plan)
export const COST_TAG = 'uses a little plan'

const tokensLabel = (n: number): string => tEn('pane.n_tokens', { n: fmt.tokens(n) })

// tag: a dim cost word for a choice that uses plan ("uses a little plan"), drawn at the right of its radio row, as Settings' mode list draws it
export type Choice = { value: string; label: string; tag?: string }
export type Setting = {
  key: string
  group: string
  label: string
  note: string // at most 16 words, "When X, vaken does Y"
  options: Choice[]
  default: string
  desktopOnly?: boolean
  hidden?: boolean
  advanced?: boolean
  // Old stored words that now read as another option.
  legacy?: Record<string, string>
}

const DETAIL_LEGACY: Record<string, string> = { minimal: 'simple' }

const CARD_DETAIL_OPTIONS: Choice[] = [
  { value: 'inherit', label: 'Default' },
  { value: 'simple', label: 'Short' },
  { value: 'explained', label: 'Explained' },
]

const BASE: Setting[] = [
  {
    key: 'detail',
    group: 'View',
    label: 'Detail level',
    note: "How much each card shows. A card's own Show more button changes only that card.",
    options: [
      { value: 'glance', label: 'Glance' },
      { value: 'simple', label: 'Short' },
      { value: 'explained', label: 'Explained' },
    ],
    default: 'glance',
    legacy: DETAIL_LEGACY,
  },
  {
    key: 'view.problems',
    group: 'View',
    label: 'Problems first',
    note: 'Cards with a problem move up; quiet ones shrink to one line.',
    options: [
      { value: 'off', label: 'Off' },
      { value: 'on', label: 'On' },
    ],
    default: 'on',
  },
  {
    key: OPEN_START_SETTING,
    group: 'View',
    label: OPEN_START_LABEL,
    note: OPEN_START_NOTE,
    options: [
      { value: 'off', label: 'Off' },
      { value: 'on', label: 'On' },
    ],
    default: 'on',
    desktopOnly: true,
  },
  {
    key: 'look.view',
    group: 'View',
    label: 'View',
    note: 'Standard: Needs you plus seven cards. All: every card. Custom: your own choice and order.',
    options: [
      { value: 'standard', label: 'Standard' },
      { value: 'all', label: 'All' },
      { value: 'custom', label: 'Custom' },
    ],
    default: 'standard',
  },
  {
    key: 'look.needs',
    group: 'View',
    label: 'Needs you card',
    note: 'Always shows it first, even when nothing waits. Or only when something waits, or never.',
    options: [
      { value: 'always', label: 'Always' },
      { value: 'waits', label: 'When it waits' },
      { value: 'hidden', label: 'Hidden' },
    ],
    default: 'always',
  },
  {
    key: 'look.columns',
    group: 'View',
    label: 'Columns',
    note: 'Auto fits the screen. Fewer columns give wider cards with more rows.',
    options: [
      { value: 'auto', label: 'Auto' },
      { value: '1', label: '1' },
      { value: '2', label: '2' },
      { value: '3', label: '3' },
      { value: '4', label: '4' },
      { value: '5', label: '5' },
      { value: '6', label: '6' },
    ],
    default: 'auto',
  },
  {
    key: 'compact.mode',
    group: 'Compacting',
    label: 'Compact by itself',
    note: 'Suggest hints Claude (uses a little plan). Watch only shows it. Auto compacts for you.',
    options: [
      { value: 'off', label: 'Off' },
      { value: 'suggest', label: 'Suggest', tag: COST_TAG },
      { value: 'watch', label: 'Watch only' },
      { value: 'auto', label: 'Auto' },
    ],
    default: 'watch',
  },
  {
    key: 'compact.from',
    group: 'Compacting',
    label: 'Compact when it fills',
    note: 'Auto compacts after an answer once the session fills this much of its window.',
    options: [
      { value: '50', label: fmt.percent(50) },
      { value: '60', label: fmt.percent(60) },
      { value: '70', label: fmt.percent(70) },
    ],
    default: '60',
  },
  {
    key: 'compact.min',
    group: 'Compacting',
    label: 'Never compact under',
    note: "Auto leaves a smaller session alone. A small window uses half its size instead.",
    options: [
      { value: '50000', label: tokensLabel(50000) },
      { value: '100000', label: tokensLabel(100000) },
      { value: '200000', label: tokensLabel(200000) },
    ],
    default: '100000',
  },
  {
    key: 'compact.lead',
    group: 'Compacting',
    label: 'Compact in a break',
    note: 'Auto compacts a break this long before the one-hour cache runs out.',
    options: [
      { value: '10', label: '10 min before' },
      { value: '15', label: '15 min before' },
      { value: '20', label: '20 min before' },
    ],
    default: '15',
  },
  {
    key: 'compact.card',
    group: 'Compacting',
    label: 'What Claude keeps',
    note: 'Adds goal, branch, next steps, edited files and failing checks to every compaction.',
    options: [
      { value: 'off', label: 'Off' },
      { value: 'on', label: 'On' },
    ],
    default: 'on',
  },
  {
    key: 'cache.keeper',
    group: 'Cache',
    label: 'Keep session cheap',
    note: 'Stops a long break from making your next answer cost more.',
    options: [
      { value: 'off', label: 'Off' },
      { value: 'on', label: 'On', tag: COST_TAG },
    ],
    default: 'off',
  },
  {
    key: 'loop.breaker',
    group: 'Repeated failures',
    label: 'Loop breaker',
    note: 'Stops Claude from trying a failing step again and again.',
    options: [
      { value: 'off', label: 'Off' },
      { value: 'warn', label: 'Warn' },
      { value: 'stop', label: 'Stop' },
    ],
    default: 'warn',
  },
  {
    key: 'look.theme',
    group: 'Look',
    label: 'Accent colour',
    note: 'Dark or light follows the app. Warnings and words stay the same.',
    options: [
      { value: 'native', label: 'Native' },
      { value: 'violet', label: 'Violet' },
      { value: 'teal', label: 'Teal' },
      { value: 'rose', label: 'Rose' },
      { value: 'green', label: 'Green' },
      { value: 'ocean', label: 'Ocean' },
      { value: 'slate', label: 'Slate' },
      { value: 'plum', label: 'Plum' },
    ],
    default: 'native',
  },
  {
    key: 'look.language',
    group: 'Look',
    label: 'Language',
    note: 'Menus and help pages. Answers in the session stay English.',
    options: [
      { value: 'auto', label: 'Like the Mac' },
      ...REGISTRY.map(l => ({ value: l.code, label: l.name })),
    ],
    default: 'auto',
    hidden: true,
  },
  // The engine does not say whether the Mac reduces motion and a host may ignore the query, so the row is shown.
  {
    key: 'look.motion',
    group: 'Look',
    label: 'Motion',
    note: 'Reduced holds the pulsing dot and the moving bar still.',
    options: [
      { value: 'normal', label: 'Normal' },
      { value: 'reduced', label: 'Reduced' },
    ],
    default: 'normal',
  },
  {
    key: 'claude.notes',
    group: 'Attention',
    label: 'Notes to Claude',
    note: 'Which checks also write a note to Claude. Safety notes always do.',
    options: [
      { value: 'safety', label: 'Safety only' },
      { value: 'all', label: 'All checks' },
    ],
    default: 'safety',
  },
  ...FEATURE_SETTINGS,
  ...(
    [
      ['limit', 'Plan limits', 'How much of your plan is used.'],
      ['here', 'This session', 'This session: state, context and cost.'],
      ['others', 'Other sessions', 'Your other sessions, live.'],
      ['autopilot', 'Autopilot', 'What vaken did for you.'],
      ['proof', 'Checks', 'Did it really work: checks, claims, goal.'],
      ['guard', 'Risky steps', 'How strict the safety rules are.'],
      ['agents', 'Agents', 'Agents: running and done.'],
      ['computer', 'Computer', 'Memory, processor and room for agents.'],
      ['skills', 'Skills', 'Which skills you use most, and what the list costs.'],
      ['prs', 'Pull requests', 'Your open pull requests: checks, merging and the next step.'],
      ['ship', 'Ship', 'Ready to ship: what blocks it, and the next step.'],
      ['back', 'Where was I', 'Where you were, what is still open, what happened while away.'],
      ['safety', 'Safety', 'Pause this session, undo, saved points and which risky steps were stopped.'],
      ['context', 'Memory and notes', 'Instruction files, memory notes, handoff and what compacting keeps.'],
      ['preview', PREVIEW_TITLE, PREVIEW_NOTE],
      ['setup', SETUP_TITLE, SETUP_NOTE],
      ['do', DO_CARD_LABEL, DO_NOTE],
    ] as const
  ).map(
    ([id, label, note]): Setting => ({
      key: `cards.${id}`,
      group: 'Cards',
      label,
      note,
      options: cardsOptions(id),
      default: cardsDefault(id),
    }),
  ),
  ...(
    [
      ['limit', 'Plan limits'],
      ['here', 'This session'],
      ['others', 'Other sessions'],
      ['autopilot', 'Autopilot'],
      ['proof', 'Checks'],
      ['guard', 'Risky steps'],
      ['agents', 'Agents'],
      ['computer', 'Computer'],
      ['skills', 'Skills'],
      ['prs', 'Pull requests'],
      ['ship', 'Ship'],
      ['back', 'Where was I'],
      ['safety', 'Safety'],
      ['context', 'Memory and notes'],
      ['preview', PREVIEW_TITLE],
      ['setup', SETUP_TITLE],
      ['do', DO_CARD_LABEL],
    ] as const
  ).map(
    ([id, label]): Setting => ({
      key: `detail.${id}`,
      group: 'Detail per card',
      label,
      note: '',
      options: CARD_DETAIL_OPTIONS,
      default: 'inherit',
      hidden: true,
      legacy: DETAIL_LEGACY,
    }),
  ),
]

export const SETTINGS: Setting[] = BASE.map(decorate)

export type Values = Record<string, string>

export const settingStoreKey = (key: string): string => `cockpit:setting:${key}`
export const findSetting = (key: string): Setting | undefined => SETTINGS.find(s => s.key === key)
export const defaults = (): Values => Object.fromEntries(SETTINGS.map(s => [s.key, s.default]))

export const normalValue = (s: Setting, raw: string): string => s.legacy?.[raw] ?? raw

export const validValue = (s: Setting, raw: unknown): string => {
  const v = typeof raw === 'string' ? normalValue(s, raw) : undefined
  return v !== undefined && s.options.some(o => o.value === v) ? v : s.default
}

export async function readSettings(i: Io): Promise<Values> {
  const out: Values = {}
  if (i.getMany !== undefined) {
    const got = await i.getMany(settingKeys())
    for (const [n, s] of SETTINGS.entries()) out[s.key] = validValue(s, got[n])
    return out
  }
  for (const s of SETTINGS) out[s.key] = validValue(s, await i.get(settingStoreKey(s.key)))
  return out
}
let storeKeys: string[] | undefined
export const settingKeys = (): string[] => (storeKeys ??= SETTINGS.map(s => settingStoreKey(s.key)))

export async function readSetting(i: Io, key: string): Promise<string> {
  const s = findSetting(key)
  return s === undefined ? '' : validValue(s, await i.get(settingStoreKey(key)))
}

export async function writeSetting(i: Io, key: string, value: string): Promise<boolean> {
  const s = findSetting(key)
  const v = s === undefined ? value : s.options.some(o => o.value === value) ? value : s.legacy !== undefined && s.options.some(o => o.label === value) ? s.options.find(o => o.label === value)!.value : normalValue(s, value)
  if (s === undefined || !s.options.some(o => o.value === v)) return false
  await i.set(settingStoreKey(key), v)
  return true
}

// Every choice: All projects, each project's own rows and each session's own rows
export async function resetSettings(i: Io): Promise<void> {
  for (const k of await i.keys()) if (k.startsWith(SETTING_PREFIX) || k.startsWith(PROJSET_PREFIX) || k.startsWith(SESSSET_PREFIX)) await i.del(k)
  await i.set(SETTINGS_KEY, {})
}

export function rowsFor(canDrag: boolean, withHidden = false): { group: string; rows: Setting[] }[] {
  const groups: { group: string; rows: Setting[] }[] = []
  for (const s of SETTINGS) {
    if (s.desktopOnly === true && !canDrag) continue
    if (s.hidden === true && !withHidden) continue
    const g = groups.find(x => x.group === s.group) ?? groups[groups.push({ group: s.group, rows: [] }) - 1]
    g.rows.push(s)
  }
  return groups
}

export const settingPath = (s: Setting): string => (isTextOnly(s) ? '/vaken-settings all' : `Settings > ${isAdvanced(s) ? ADVANCED_SECTION.title : sectionOfSetting(s).title} > ${s.label}`)
// The same path in the language of this answer (each part through the table)
export const settingPathSaid = (s: Setting): string => (isTextOnly(s) ? '/vaken-settings all' : [tr('Settings'), tr(isAdvanced(s) ? ADVANCED_SECTION.title : sectionOfSetting(s).title), tr(s.label)].join(' > '))
const labelOf = (s: Setting, value: string): string => sysWord(s.options.find(o => o.value === value)?.label ?? value)

export function settingsText(values: Values, canDrag: boolean, layoutNames: string[] = [], all = false): string {
  const lines: string[] = ['Vaken settings']
  for (const { group, rows } of rowsFor(canDrag, true)) {
    const shown = rows.filter(s => s.hidden !== true)
    const changed = rows.filter(s => (values[s.key] ?? s.default) !== s.default)
    if (!all && shown.length === 0 && changed.length === 0) continue
    const changedShown = changed.filter(s => s.hidden !== true).length
    lines.push('', all || shown.length === 0 ? group : `${group}: ${tEn('words.setting', { n: shown.length })}${changedShown === 0 ? ', all at the default' : `, ${changedShown} changed`}`)
    for (const s of all ? rows : changed) lines.push(s.note === '' ? `  ${sysWord(s.label)}` : `  ${sysWord(s.label)}: ${sysWord(s.note).replace(/\.$/, '')}.`, `    ${s.key}: ${labelOf(s, values[s.key] ?? s.default)} (${s.options.map(o => o.value).join(' / ')})`)
  }
  if (!all) lines.push('', 'See every row: /vaken-settings all')
  lines.push('', `Layouts: ${layoutNames.length === 0 ? 'none saved' : layoutNames.join(', ')}`)
  lines.push('', 'Change one: /vaken-settings <key> <value>. Back to the defaults: /vaken-settings reset (it asks first)', 'Layouts: /vaken-settings layout save <name>, layout apply <name>, layout delete <name>')
  return lines.join('\n')
}

export type Ask = { kind: 'list'; all?: boolean } | { kind: 'reset'; yes?: boolean } | { kind: 'layout'; action: 'save' | 'apply' | 'delete'; name: string } | { kind: 'set'; key: string; value: string; old?: string } | { kind: 'bad'; why: string }
export function parseAsk(args: string): Ask {
  const words = args.trim().split(/\s+/).filter(w => w !== '')
  if (words.length === 0) return { kind: 'list' }
  if (words.length === 1 && words[0].toLowerCase() === 'reset') return { kind: 'reset' }
  if (words.length === 2 && words[0].toLowerCase() === 'reset' && words[1].toLowerCase() === 'yes') return { kind: 'reset', yes: true }
  if (words.length === 1 && words[0].toLowerCase() === 'all') return { kind: 'list', all: true }
  if (words[0].toLowerCase() === 'layout') {
    const action = words[1]?.toLowerCase()
    if (action !== 'save' && action !== 'apply' && action !== 'delete') return { kind: 'bad', why: 'Use: /vaken-settings layout save|apply|delete <name>' }
    const name = words.slice(2).join(' ')
    if (name === '' && action !== 'save') return { kind: 'bad', why: `Name the layout: /vaken-settings layout ${action} <name>` }
    return { kind: 'layout', action, name }
  }
  if (words.length !== 2) return { kind: 'bad', why: 'Use: /vaken-settings <key> <value>' }
  const [key, value] = [words[0], words[1].toLowerCase()]
  const s = findSetting(key)
  if (s === undefined) return { kind: 'bad', why: `No setting named "${key}". Run /vaken-settings to see them.` }
  const now = normalValue(s, value)
  if (!s.options.some(o => o.value === now)) return { kind: 'bad', why: `"${key}" takes: ${s.options.map(o => o.value).join(', ')}.` }
  return now === value ? { kind: 'set', key, value } : { kind: 'set', key, value: now, old: value }
}

export function checkRegistry(list: Setting[] = SETTINGS): string[] {
  const problems: string[] = []
  const seen = new Set<string>()
  for (const s of list) {
    if (seen.has(s.key)) problems.push(`${s.key}: key is used twice`)
    seen.add(s.key)
    if (s.label.split(/\s+/).length > 4) problems.push(`${s.key}: label has more than 4 words`)
    if (s.note.split(/\s+/).length > 16) problems.push(`${s.key}: note has more than 16 words`)
    if (s.options.length < 2) problems.push(`${s.key}: needs at least 2 options`)
    if (!s.options.some(o => o.value === s.default)) problems.push(`${s.key}: the default is not an option`)
    if (new Set(s.options.map(o => o.value)).size !== s.options.length) problems.push(`${s.key}: an option value is used twice`)
  }
  return problems
}

const OFF_VALUES = ['off', 'hide']
export function switchOf(s: Setting): { off: string; on: string } | undefined {
  if (s.options.length !== 2) return undefined
  const off = s.options.find(o => OFF_VALUES.includes(o.value))
  const onOption = s.options.find(o => !OFF_VALUES.includes(o.value))
  return off === undefined || onOption === undefined ? undefined : { off: off.value, on: onOption.value }
}
export const orderedOptions = (s: Setting): Choice[] => [...s.options.filter(o => OFF_VALUES.includes(o.value)), ...s.options.filter(o => !OFF_VALUES.includes(o.value))]

export type { Section }
export const SECTIONS: Section[] = SECTION_TABLE
export const sectionOf = (group: string): Section => {
  const card = cardOfFocus(group)
  if (card !== undefined) return sectionOfCard(card) ?? sectionOfGroup(group)
  const named = sectionNamed(group)
  if (named !== undefined) return named
  const first = SETTINGS.find(s => s.group === group && s.hidden !== true && !isAdvanced(s))
  return first === undefined ? sectionOfGroup(group) : sectionOfSetting(first)
}
export const focusRows = (group: string, canDrag: boolean): { group: string; rows: Setting[] }[] =>
  rowsFor(canDrag).filter(g => g.group === group).map(g => ({ group: g.group, rows: g.rows.filter(s => sectionOfSetting(s) === sectionOf(group)) })).filter(g => g.rows.length > 0)
export function sectionSummary(sec: Section, values: Record<string, string>): string {
  const cell = tally(SETTINGS, values, true).bySection.get(sec.name)
  return cell === undefined ? '' : COUNT_CHIP.replace('{on}', String(cell.on)).replace('{total}', String(cell.total))
}
// Built once per surface: the view asks for every section on every draw.
const sectionRowsKept = new Map<string, { size: number; rows: { group: string; rows: Setting[] }[] }>()
let sectionRowsBuilt = 0
export const sectionRowsBuilds = (): number => sectionRowsBuilt
export function sectionRows(sec: Section, canDrag: boolean): { group: string; rows: Setting[] }[] {
  const at = `${canDrag ? 1 : 0}:${sec.name}`
  const kept = sectionRowsKept.get(at)
  if (kept !== undefined && kept.size === SETTINGS.length) return kept.rows
  sectionRowsBuilt += 1
  const rows = rowsFor(canDrag)
    .map(g => ({ group: g.group, rows: g.rows.filter(s => (sec.advanced === true ? isAdvanced(s) : !isAdvanced(s) && sectionOfSetting(s) === sec)) }))
    .filter(g => g.rows.length > 0)
  sectionRowsKept.set(at, { size: SETTINGS.length, rows })
  return rows
}
export { ADVANCED_SECTION }

// Windows sets no LANG and the engine has no locale call, so LANG, LC_ALL, LANGUAGE are tried, then PowerShell.
export function systemLanguage(env: { LANG?: string; LC_ALL?: string; LANGUAGE?: string }, sys: 'posix' | 'win32'): string {
  if (sys !== 'win32') return env.LANG ?? 'en'
  return [env.LANG, env.LC_ALL, env.LANGUAGE].find(v => v !== undefined && v !== '') ?? 'en'
}

// "sv-SE\r\n" gives "sv"; anything that is not a plain language tag gives undefined.
const WINDOWS_LANG_MS = 4_000
export const WINDOWS_LANG_ARGV: readonly string[] = ['powershell', '-NoProfile', '-NonInteractive', '-Command', '(Get-UICulture).Name']
export function windowsUiLanguage(out: string): string | undefined {
  const tag = (out.trim().split(/\r?\n/)[0] ?? '').trim()
  const m = /^([A-Za-z]{2,3})(?:-[A-Za-z0-9]{2,8})*$/.exec(tag)
  return m === null ? undefined : m[1].toLowerCase()
}
export function startWindowsLanguage(run: Io['run'], env: { LANG?: string; LC_ALL?: string; LANGUAGE?: string }, fallback: string, apply: (found: string) => void): void {
  void windowsLanguageRead(run, env, fallback)
    .then(found => {
      if (found !== fallback) apply(found)
    })
    .catch(() => {
    })
}
export async function windowsLanguageRead(
  run: Io['run'],
  env: { LANG?: string; LC_ALL?: string; LANGUAGE?: string },
  fallback: string,
): Promise<string> {
  if ([env.LANG, env.LC_ALL, env.LANGUAGE].some(v => v !== undefined && v !== '')) return fallback
  try {
    const r = await run([...WINDOWS_LANG_ARGV], { timeoutMs: WINDOWS_LANG_MS })
    return r.exitCode === 0 ? (windowsUiLanguage(r.stdout) ?? fallback) : fallback
  } catch {
    return fallback
  }
}
