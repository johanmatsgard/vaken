// Which cards a new person sees: FIRST_CARDS at first run, every other card only when APPEARS says it has something to show.
import type { Setting } from './settings'

export const FIRST_CARDS = ['limit', 'here', 'others', 'autopilot', 'safety'] as const

export type AppearFacts = {
  proof: 'none' | 'ok' | 'problem'
  guardToday: number
  agents: boolean
  computer: { gaugeOn: boolean; full: boolean }
  skillsUsed: boolean
  prs: 'none' | 'open' | 'failing'
  ship: 'blocked' | 'ready' | 'none'
  back: boolean
  context: 'heavy' | 'unverified' | 'none'
  preview: boolean
  setup: 'conflict' | 'drift' | 'none'
  commands: number
}

export const APPEARS: Record<string, (f: AppearFacts) => boolean> = {
  proof: f => f.proof !== 'none',
  guard: f => f.guardToday > 0,
  agents: f => f.agents,
  computer: f => f.computer.gaugeOn || f.computer.full,
  skills: f => f.skillsUsed,
  prs: f => f.prs !== 'none',
  ship: f => f.ship !== 'none',
  back: f => f.back,
  context: f => f.context !== 'none',
  preview: f => f.preview,
  setup: f => f.setup !== 'none',
  do: f => f.commands > 0,
}

export const isFirstCard = (id: string): boolean => (FIRST_CARDS as readonly string[]).includes(id)
// Cards the Desktop app now covers itself start hidden: Preview, as the app's browser pane shows the page. A stored Show or Auto keeps it.
export const HIDDEN_FIRST = ['preview'] as const
const isHiddenFirst = (id: string): boolean => (HIDDEN_FIRST as readonly string[]).includes(id)
export const cardsOptions = (id: string): Setting['options'] => [
  ...(isFirstCard(id) ? [] : [{ value: 'auto', label: 'Auto' }]),
  { value: 'show', label: 'Show' },
  { value: 'hide', label: 'Hide' },
]
export const cardsDefault = (id: string): string => (isFirstCard(id) ? 'show' : isHiddenFirst(id) ? 'hide' : 'auto')

export function autoHidden<T extends string>(ids: readonly T[], values: Record<string, string>, facts: AppearFacts): T[] {
  return ids.filter(id => {
    const rule = APPEARS[id]
    return rule !== undefined && (values[`cards.${id}`] ?? cardsDefault(id)) === 'auto' && !rule(facts)
  })
}

export const NEW_TOAST = 'New card: {title}'
export const NEW_TOAST_MANY = 'New cards: {title}'
export const NEW_CHIP = 'new'
const NEW_TITLES_MAX = 3
export const newKey = (id: string): string => `new:${id}`
export const seenKey = (id: string): string => `seen:${id}`
export const isNewCard = (seen: readonly string[] | undefined, id: string): boolean => seen !== undefined && seen.includes(newKey(id)) && !seen.includes(seenKey(id))

// A load writes only when a card is announced; the session start makes the history once so a draw never pays for it.
export function arrivals(appearing: readonly string[], history: readonly string[] | undefined): { next: string[] | undefined; announce: string[] } {
  if (history === undefined) return { next: undefined, announce: [] }
  const announce = appearing.filter(id => !history.includes(newKey(id)) && !history.includes(seenKey(id)))
  return { next: announce.length === 0 ? undefined : [...history, ...announce.map(newKey)], announce }
}
// A person updating from a version without a history starts with the cards that existed then; only later cards are new.
export const startHistory = (known: readonly string[], firstRunDone: boolean): string[] => (firstRunDone ? known.map(seenKey) : [])
export function openedCard(seen: readonly string[] | undefined, id: string): string[] | undefined {
  if (seen === undefined || !seen.includes(newKey(id)) || seen.includes(seenKey(id))) return undefined
  return [...seen.filter(k => k !== newKey(id)), seenKey(id)]
}
export function newToast(titles: readonly string[], t: (s: string) => string): string {
  const named = titles.slice(0, NEW_TITLES_MAX).join(', ')
  return t(titles.length === 1 ? NEW_TOAST : NEW_TOAST_MANY).replace('{title}', titles.length > NEW_TITLES_MAX ? `${named} ${t('and {n} more').replace('{n}', String(titles.length - NEW_TITLES_MAX))}` : named)
}

export const WELCOME_TITLE = 'Start here'
export const WELCOME_ABOUT = 'Vaken watches your sessions and warns you before a limit or a risky step.'
export const WELCOME_CARDS = 'Cards appear when they have something to show.'
// The band's Needs you chip, after its ◆, in amber words: "◆ 1 needs you", "◆ 2 need you", the same words as the band's own page
export const NEEDS_CHIP = '{n} needs you'
export const NEEDS_CHIP_MANY = '{n} need you'
export const needsChip = (n: number, t: (s: string) => string): string => t(n === 1 ? NEEDS_CHIP : NEEDS_CHIP_MANY).replace('{n}', String(n))
export const WELCOME_FIRST = 'Send your first message. The plan, this session and your other sessions show here after the first answer.'
export const USUAL_CHOICE = 'the usual choice'
export const MODE_IS_ON = '{mode} is on. Change it any time in Settings.'

export const START_VIEW_ABOUT = 'Standard: Needs you plus seven cards. All: every card. Custom: your own choice and order.'
export const START_MODE_LABEL = 'How much it tells you'
export const START_VIEW_LABEL = 'Which cards show'

export const CARDS_VIEW_STRINGS: string[] = [START_VIEW_ABOUT, START_MODE_LABEL, START_VIEW_LABEL, 'Auto', NEW_TOAST, NEW_CHIP, 'and {n} more', NEW_TOAST_MANY, NEEDS_CHIP_MANY, WELCOME_TITLE, WELCOME_ABOUT, WELCOME_CARDS, NEEDS_CHIP, WELCOME_FIRST, USUAL_CHOICE, MODE_IS_ON]
