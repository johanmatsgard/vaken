// The Skills card: skills used most in the last 7 days and what the skill list costs the context.
import { ymd } from './budget'
import type { HelpEntry } from './registry'
import type { WhatIs } from './whatis'
import { fmt } from './fmt'
import { langNow } from '../i18n/t'
import { tEn } from '../i18n/t'

export const SKILLS_COUNTS_KEY = 'cockpit:skills:counts'
export const SKILLS_LISTING_KEY = 'cockpit:skills:listing'
export const SKILLS_DAYS = 7
export const SKILLS_NAMES_MAX = 200
export const SKILL_NAME_MAX = 64
export const SKILLS_FLUSH_MS = 60_000
export const UNUSED_SHOWN = 8
export const UNUSED_FOLD = 3
export const LISTING_TRIES = 3

export const SKILLS_HELP: HelpEntry[] = [
  {
    title: 'What the Skills card shows',
    text: 'It counts the skills you and Claude used in the last 7 days (names and counts only, never what was said). It also says how many skills are listed in Claude\'s memory, what that list costs, and which ones you did not use this week. A skill you never use only costs memory.',
  },
]

export type SkillCounts = Record<string, Record<string, number>>

const DAY = /^\d{4}-\d{2}-\d{2}$/

export function cleanName(name: unknown): string | undefined {
  if (typeof name !== 'string') return undefined
  // eslint-disable-next-line no-control-regex
  const n = name.replace(/[\u0000-\u001f\u007f]/g, '').trim().replace(/^\/+/, '').trim().slice(0, SKILL_NAME_MAX)
  return n === '' ? undefined : n
}

export function parseSkillCounts(raw: unknown): SkillCounts {
  const out: SkillCounts = {}
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return out
  for (const [day, names] of Object.entries(raw)) {
    if (!DAY.test(day) || typeof names !== 'object' || names === null || Array.isArray(names)) continue
    const row: Record<string, number> = {}
    for (const [name, n] of Object.entries(names)) {
      const clean = cleanName(name)
      if (clean !== undefined && typeof n === 'number' && Number.isFinite(n) && n > 0) row[clean] = (row[clean] ?? 0) + Math.floor(n)
    }
    if (Object.keys(row).length > 0) out[day] = row
  }
  return out
}

export function windowStart(now: number): string {
  const d = new Date(now)
  return ymd(new Date(d.getFullYear(), d.getMonth(), d.getDate() - (SKILLS_DAYS - 1)).getTime())
}

export function noteSkill(pending: SkillCounts, name: unknown, now: number): boolean {
  const clean = cleanName(name)
  if (clean === undefined) return false
  const day = ymd(now)
  const row = pending[day] ?? (pending[day] = {})
  if (row[clean] === undefined && Object.keys(row).length >= SKILLS_NAMES_MAX) return false
  row[clean] = (row[clean] ?? 0) + 1
  return true
}

export const pendingSize = (pending: SkillCounts): number => Object.values(pending).reduce((n, row) => n + Object.keys(row).length, 0)

export function addSkillCounts(raw: unknown, delta: SkillCounts, now: number): SkillCounts {
  const all = parseSkillCounts(raw)
  for (const [day, names] of Object.entries(parseSkillCounts(delta))) {
    const row = { ...(all[day] ?? {}) }
    for (const [name, n] of Object.entries(names)) row[name] = (row[name] ?? 0) + n
    all[day] = row
  }
  const start = windowStart(now)
  const total: Record<string, number> = {}
  for (const day of Object.keys(all)) {
    if (day < start) delete all[day]
    else for (const [name, n] of Object.entries(all[day] ?? {})) total[name] = (total[name] ?? 0) + n
  }
  const names = Object.keys(total)
  if (names.length > SKILLS_NAMES_MAX) {
    const keep = new Set(names.sort((a, b) => (total[b] ?? 0) - (total[a] ?? 0) || a.localeCompare(b)).slice(0, SKILLS_NAMES_MAX))
    for (const day of Object.keys(all)) {
      const row = Object.fromEntries(Object.entries(all[day] ?? {}).filter(([name]) => keep.has(name)))
      if (Object.keys(row).length > 0) all[day] = row
      else delete all[day]
    }
  }
  return all
}

export function holdsCounts(stored: unknown, delta: SkillCounts): boolean {
  const have = parseSkillCounts(stored)
  return Object.entries(parseSkillCounts(delta)).every(([day, names]) => Object.entries(names).every(([name, n]) => (have[day]?.[name] ?? 0) >= n))
}

export function weekTotals(raw: unknown, now: number): Record<string, number> {
  const start = windowStart(now)
  const today = ymd(now)
  const sum: Record<string, number> = {}
  for (const [day, names] of Object.entries(parseSkillCounts(raw))) if (day >= start && day <= today) for (const [name, n] of Object.entries(names)) sum[name] = (sum[name] ?? 0) + n
  return sum
}

export type TopSkill = { name: string; count: number }

export function topSkills(raw: unknown, now: number, n: number): TopSkill[] {
  return Object.entries(weekTotals(raw, now))
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, Math.max(0, n))
}

export type SkillListing = { at: number; total: number; included: number; tokens: number; names: string[] }

export const tokensWord = (n: number): string => fmt.tokensFine(n, langNow())

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const count = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : undefined)

export function listingFrom(skills: unknown, now: number): SkillListing | undefined {
  if (!isObj(skills)) return undefined
  const total = count(skills.totalSkills)
  if (total === undefined) return undefined
  const names: string[] = []
  if (Array.isArray(skills.skillFrontmatter)) {
    for (const s of skills.skillFrontmatter) {
      if (!isObj(s) || s.source === 'built-in') continue
      const name = cleanName(s.name)
      if (name !== undefined && !names.includes(name) && names.length < SKILLS_NAMES_MAX) names.push(name)
    }
  }
  return { at: now, total, included: Math.min(count(skills.includedSkills) ?? total, total), tokens: count(skills.tokens) ?? 0, names }
}

export function parseListing(raw: unknown): SkillListing | undefined {
  if (!isObj(raw)) return undefined
  const at = count(raw.at)
  const total = count(raw.total)
  if (at === undefined || total === undefined) return undefined
  const names = Array.isArray(raw.names) ? raw.names.map(cleanName).filter((x): x is string => x !== undefined).slice(0, SKILLS_NAMES_MAX) : []
  return { at, total, included: Math.min(count(raw.included) ?? total, total), tokens: count(raw.tokens) ?? 0, names }
}

export function unusedSkills(listing: SkillListing | undefined, counts: unknown, now: number): string[] {
  if (listing === undefined) return []
  const used = weekTotals(counts, now)
  return listing.names.filter(n => (used[n] ?? 0) === 0).sort((a, b) => a.localeCompare(b))
}

export function skillsCostLine(listing: SkillListing | undefined, counts: unknown, now: number, t: (s: string) => string = s => s): string | undefined {
  if (listing === undefined) return undefined
  const unused = unusedSkills(listing, counts, now).length
  const fit = listing.included < listing.total ? t('{n} skills, {m} fit the list, {k} tokens') : listing.total === 1 ? t('1 skill listed, {k} tokens') : t('{n} skills listed, {k} tokens')
  const head = fit.replace('{n}', String(listing.total)).replace('{m}', String(listing.included)).replace('{k}', tokensWord(listing.tokens))
  // Counts start the day vaken began to count, so a young count says how old it is.
  const kept = listing.names.length
  const of = kept >= SKILLS_NAMES_MAX ? t('; {n} of the first {m} not used this week') : kept < listing.total ? t('; {n} of {m} not used this week') : t('; {n} not used this week')
  const days = countedDays(counts, now)
  const age = days === undefined ? '' : days === 1 ? t('; counted for 1 day') : t('; counted for {n} days').replace('{n}', String(days))
  const tail = kept === 0 ? '' : `${unused === 0 ? t('; all used this week') : of.replace('{n}', String(unused)).replace('{m}', String(kept))}${age}`
  return `${head}${tail}`
}

export function countedDays(counts: unknown, now: number): number | undefined {
  const start = windowStart(now)
  const days = Object.keys(parseSkillCounts(counts)).filter(d => d >= start && d <= ymd(now)).sort()
  const first = days[0]
  if (first === undefined || first <= start) return undefined
  const a = new Date(`${first}T12:00:00`).getTime()
  const b = new Date(`${ymd(now)}T12:00:00`).getTime()
  return Math.max(1, Math.round((b - a) / 86_400_000) + 1)
}

export const plainSkillName = (name: string): string => {
  const tail = name.slice(name.lastIndexOf(':') + 1).replace(/-/g, ' ').trim()
  return tail === '' ? name : tail
}

// `$.command.run` is the documented call; the engine does not say it parses a slash in `$.prompt.submit`.
export function startSkillCommand(name: string): string | undefined {
  const clean = cleanName(name)
  return clean !== undefined && /^[A-Za-z0-9_][A-Za-z0-9_:.-]*$/.test(clean) ? clean : undefined
}

export const COMMANDS_FRESH_MS = 5 * 60_000
export const FIND_PAUSE_MS = 250
export const COMMANDS_MAX = 1500
export const FIND_DESC_MAX = 90

// `own` marks this plugin's commands, which its pane cannot run.
export type CommandEntry = { name: string; description: string; own?: true }
export type FoundCommand = CommandEntry & { count: number }

// eslint-disable-next-line no-control-regex
const oneLine = (s: unknown): string => (typeof s === 'string' ? s.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim() : '')

export const isOwnCommand = (c: { name: string; source?: unknown; plugin?: unknown }, ownPlugin: string | undefined): boolean =>
  ownPlugin !== undefined && ownPlugin !== '' && (c.plugin === ownPlugin || (c.plugin === undefined && c.source === 'plugin' && (c.name === ownPlugin || c.name.startsWith(`${ownPlugin}-`))))
export function commandEntries(raw: unknown, ownPlugin?: string): CommandEntry[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const out: CommandEntry[] = []
  for (const c of raw) {
    if (out.length >= COMMANDS_MAX) break
    if (!isObj(c)) continue
    const name = startSkillCommand(typeof c.name === 'string' ? c.name : '')
    if (name === undefined || seen.has(name.toLowerCase())) continue
    seen.add(name.toLowerCase())
    out.push({ name, description: oneLine(c.description), ...(isOwnCommand({ name, source: c.source, plugin: c.plugin }, ownPlugin) ? { own: true as const } : {}) })
  }
  return out
}

export const findWords = (query: string): string[] =>
  oneLine(query)
    .toLowerCase()
    .split(' ')
    .map(w => w.replace(/^\/+/, ''))
    .filter(w => w !== '')

export function findCommands(list: CommandEntry[] | undefined, query: string, counts: unknown, now: number): FoundCommand[] {
  const words = findWords(query)
  if (list === undefined || words.length === 0) return []
  const used = weekTotals(counts, now)
  const out: (FoundCommand & { inName: boolean })[] = []
  for (const c of list) {
    const name = c.name.toLowerCase()
    const text = c.description.toLowerCase()
    if (!words.every(w => name.includes(w) || text.includes(w))) continue
    out.push({ ...c, count: used[c.name] ?? 0, inName: words.every(w => name.includes(w)) })
  }
  out.sort((a, b) => b.count - a.count || Number(b.inName) - Number(a.inName) || a.name.localeCompare(b.name))
  return out.map(({ name, description, count, own }) => ({ name, description, count, ...(own === true ? { own } : {}) }))
}

export const findDescription = (description: string): string => (description.length > FIND_DESC_MAX ? `${description.slice(0, FIND_DESC_MAX - 1).trimEnd()}…` : description)

export const findRight = (count: number, t: (s: string) => string = s => s): string => (count > 0 ? `${times(count, t)} · ${t('Start')}` : t('Start'))

export type SkillRow = { key: string; title: string; right?: string; what: WhatIs; command?: string }
export type SkillGroup = { head: string; rows: SkillRow[]; fold?: { id: string; shown: number; more: number } }
export type SkillsView = { title: string; blurb: string; short: string; lines: string[]; whats: WhatIs[]; shortWhat: WhatIs; groups?: SkillGroup[] }
export type SkillsFacts = { counts: unknown; listing?: SkillListing; now: number }

export const TOP_SHOWN = 6

const times = (n: number, t: (s: string) => string): string => (n === 1 ? t('1 time') : t('{n} times').replace('{n}', String(n)))

const SKILLS_MEANS = 'A skill is a ready-made way of working that Claude can load, such as grilling or a code review. The count is how often one was used in the last 7 days.'

export function skillsWhat(f: SkillsFacts, t: (s: string) => string = s => s): SkillsView {
  const top = topSkills(f.counts, f.now, TOP_SHOWN)
  const cost = skillsCostLine(f.listing, f.counts, f.now, t)
  const unused = unusedSkills(f.listing, f.counts, f.now)
  const base: WhatIs = { means: t(SKILLS_MEANS) }
  const useWhat = (s: TopSkill): WhatIs => ({
    means: s.count === 1 ? t('Used 1 time in the last 7 days.') : t('Used {n} times in the last 7 days.').replace('{n}', String(s.count)),
    ...(startSkillCommand(s.name) === undefined ? {} : { next: t('Press to start it.') }),
  })
  const costWhat: WhatIs = {
    means: t('Every skill the session lists takes a little room in every session, used or not. To make room, delete the folder of a skill you do not use, in .claude/skills.'),
    ...(f.listing === undefined ? {} : { facts: f.listing.included < f.listing.total ? [t('Only part of the list fits; Claude does not see the rest.')] : [] }),
  }
  const unusedWhat = (name: string): WhatIs => ({ means: t('Listed for Claude, but not used in the last 7 days.'), facts: [name] })
  const groups: SkillGroup[] = [
    ...(top.length === 0 ? [] : [{ head: t('Used this week'), rows: top.map(s => ({ key: `skill-${s.name}`, title: plainSkillName(s.name), right: times(s.count, t), what: useWhat(s), ...(startSkillCommand(s.name) === undefined ? {} : { command: startSkillCommand(s.name) as string }) })) }]),
    ...(cost === undefined ? [] : [{ head: t('Skill list'), rows: [{ key: 'cost', title: cost, what: costWhat }] }]),
    ...(unused.length === 0
      ? []
      : [
          {
            head: t('Not used this week'),
            ...(unused.length > UNUSED_FOLD ? { fold: { id: 'unused', shown: UNUSED_FOLD, more: Math.min(unused.length, UNUSED_SHOWN) - UNUSED_FOLD } } : {}),
            rows: [
              ...unused.slice(0, UNUSED_SHOWN).map(name => ({ key: `unused-${name}`, title: plainSkillName(name), what: unusedWhat(name) })),
              ...(unused.length > UNUSED_SHOWN ? [{ key: 'unused-more', title: t('and {n} more').replace('{n}', String(unused.length - UNUSED_SHOWN)), what: costWhat }] : []),
            ],
          },
        ]),
  ]
  const nothing = t('No skill used yet this week.')
  const short = top.length === 0 ? (cost ?? nothing) : `${t('Top:')} ${top.slice(0, 3).map(s => `${plainSkillName(s.name)} ${s.count}`).join(', ')}`
  const lines = [...(top.length === 0 ? [nothing] : top.map(s => `${plainSkillName(s.name)}: ${times(s.count, t)}`)), ...(cost === undefined ? [] : [cost])]
  return { title: t('Skills'), blurb: '', short, lines, whats: lines.map(() => base), shortWhat: base, groups }
}

export function skillsText(f: SkillsFacts): string[] {
  const top = topSkills(f.counts, f.now, 15)
  const cost = skillsCostLine(f.listing, f.counts, f.now)
  const unused = unusedSkills(f.listing, f.counts, f.now)
  return [
    top.length === 0 ? 'No skill was used in the last 7 days.' : 'Skills used in the last 7 days:',
    ...top.map(s => `  ${s.name}: ${tEn('words.time', { n: s.count })}`),
    '',
    cost ?? 'The list of skills in memory could not be read, so the cost is not shown.',
    ...(unused.length === 0 ? [] : ['Not used this week:', `  ${unused.slice(0, 30).join(', ')}${unused.length > 30 ? `, and ${unused.length - 30} more` : ''}`]),
  ]
}

