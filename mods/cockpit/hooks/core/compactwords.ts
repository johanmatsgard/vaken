// The plain words of the compaction score; a leaf file with no imports, so lang.ts can read it without a cycle.

type Say = (s: string) => string
const same: Say = s => s

export const STOP_WORDS: Record<string, string> = {
  working: 'Claude is working',
  waiting: 'a question or a permission waits for you',
  running: 'an agent or a background command still runs',
  open: 'the work is still open',
  guard: 'a risky step was stopped and waits for your yes',
  recent: 'the session was compacted in the last 10 minutes',
  small: 'the session is still small',
}
export const REASON_WORDS: Record<string, string> = {
  checks: 'checks passed',
  unchanged: 'no file changed',
  tasks: 'task finished',
  saved: 'work saved',
  context: 'context {n}%',
  cache: 'cache warm',
  quiet: 'idle for 2 minutes',
  payback: 'pays back soon',
}
export const WHY_NOW = 'Compacting now because: {why}'
export const WHY_GOOD = 'Good moment because: {why}'
export const WHY_NOT_YET = 'Not yet: {why}. Score {n} of {of}.'
export const WHY_READY = 'Now is a good moment: {why}. Score {n} of {of}.'
export const WHY_LOW = 'not enough reasons yet'
export const WHY_SMALL_WINDOW = 'the session fills less than {pct}% of its window'
export const WHY_ROW = 'When to compact'
export const WHY_RIGHT = 'Show advice'
export const NOTE_RIGHT = 'See'
export const SKIPPED = 'Skipped: {why}'
export const NEW_TURN = 'a new answer started'
export const AUTO_NOTE = 'Compacted the session. Kept: goal, branch, files, decisions, next steps. Brief saved: {name}.'
export const NOTE_ROW = 'Last compaction'
export const BRIEF_LINE = 'A handoff note of this session is saved as {where}.'
export const NO_BRIEF = 'could not save the handoff note'
export const ASK_TITLE = 'Vaken can compact the session at good moments. Let it?'
export const ASK_YES = 'Yes'
export const ASK_LATER = 'Not now'

export function reasonWords(reasons: { id: string; points: number; value?: number }[], t: Say = same): string {
  return [...reasons]
    .sort((a, b) => b.points - a.points)
    .slice(0, 5)
    .map(r => t(REASON_WORDS[r.id] ?? r.id).replace('{n}', String(r.value ?? '')))
    .join(', ')
}

export const stopWords = (id: string, t: Say = same): string => t(STOP_WORDS[id] ?? id)

export const becauseWords = (reasons: { id: string; points: number; value?: number }[], t: Say = same, now = true): string => t(now ? WHY_NOW : WHY_GOOD).replace('{why}', reasonWords(reasons, t))

export const skippedWords = (why: string, t: Say = same): string => t(SKIPPED).replace('{why}', why)

export function notYetWords(s: { score: number; hardStops: string[]; reasons: { id: string; points: number; value?: number }[] }, at: { auto: number; minPct: number }, percent: number | undefined, t: Say = same): string {
  const fill = (template: string, why: string): string => t(template).replace('{why}', why).replace('{n}', String(s.score)).replace('{of}', String(at.auto))
  const first = s.hardStops[0]
  if (first !== undefined) return fill(WHY_NOT_YET, stopWords(first, t))
  if (s.score < at.auto) return fill(WHY_NOT_YET, t(WHY_LOW))
  if (percent === undefined || percent < at.minPct) return fill(WHY_NOT_YET, t(WHY_SMALL_WINDOW).replace('{pct}', String(at.minPct)))
  return fill(WHY_READY, reasonWords(s.reasons, t))
}


export const COMPACT_VIEW_STRINGS: string[] = [...Object.values(STOP_WORDS), ...Object.values(REASON_WORDS), WHY_NOW, WHY_GOOD, WHY_NOT_YET, WHY_READY, WHY_LOW, WHY_SMALL_WINDOW, WHY_ROW, WHY_RIGHT, NOTE_RIGHT, SKIPPED, NEW_TURN, AUTO_NOTE, NOTE_ROW, BRIEF_LINE, NO_BRIEF, ASK_TITLE, ASK_YES, ASK_LATER]
