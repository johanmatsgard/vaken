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
  // The two stops of Auto's own rule (core/compactauto.ts)
  gap: 'the session was compacted in the last 20 minutes',
  early: 'it is not time yet: the session is not full and no break is near its end',
  // Auto's rule with helpers: an agent in the foreground stops it; background helpers only raise the fill level it needs
  foreground: 'an agent runs in the foreground',
  busy: 'it is not time yet: agents still run and the session is not full enough',
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
export const WAIT_ANSWERING = 'Waiting: Claude is still answering.'
export const WAIT_ASKS = 'Waiting: a question or a permission waits for you.'
export const WAIT_HELPERS = 'Waiting: an agent is running in the foreground.'
export const WAIT_GUARD = 'Waiting: a risky step was stopped and waits for your yes.'
export const WAIT_GAP = 'Waiting: the session was compacted {n} min ago. Auto leaves 20 min between two.'
export const WAIT_PAYBACK = 'Waiting: the session is full, but compacting would not pay back soon.'
// The real compact points, never the fill alone: Auto's own point, Claude Code's when it is known, then the fill now
export const READY_SIZE = 'Now is a good moment: Auto compacts at {from}% (now {pct}%).'
export const READY_SIZE_APP = 'Now is a good moment: Auto compacts at {from}%, Claude Code at {app}% (now {pct}%).'
export const READY_BREAK = 'Now is a good moment: Auto compacts during this break.'
export const RULE_WARM = 'Auto compacts at {from}% (now {pct}%), or during a break: after {m} min away while the cache is warm. With agents running, Auto waits until {busy}%. Not under {min} tokens (now {tok}).'
export const RULE_NOPLAN = 'Auto compacts at {from}% (now {pct}%). Your plan is not known yet, so not during a break. With agents running, Auto waits until {busy}%. Not under {min} tokens (now {tok}).'
export const WAIT_GAVE_UP = 'Waiting: Auto could not compact this session. It tries again in {n} min.'
export const RULE_COLD = 'Auto compacts at {from}% (now {pct}%). The cache has lapsed, so not during a break. With agents running, Auto waits until {busy}%. Not under {min} tokens (now {tok}).'
// Helpers still run in the background: the size trigger needs more, and there is no break trigger
export const RULE_BUSY = 'With agents running, Auto waits until {busy}% (now {pct}%), and not during a break. Not under {min} tokens (now {tok}).'
export const WHY_ROW = 'When to compact'
export const WHY_RIGHT = 'Show advice'
export const NOTE_RIGHT = 'See'
export const SKIPPED = 'Skipped: {why}'
export const NEW_TURN = 'a new answer started'
// Auto does not compact over a prompt the person is typing
export const TYPING = 'you are typing a prompt'
export const AUTO_NOTE = 'Compacted the session. Kept: goal, branch, files, decisions, next steps. Brief saved: {name}.'
export const NOTE_ROW = 'Last compaction'
export const BRIEF_LINE = 'A handoff note of this session is saved as {where}.'
export const NO_BRIEF = 'could not save the handoff note'
export const ASK_TITLE = 'Vaken can compact the session at good moments. Let it?'
// Why Auto compacted: the toast and the ledger line
export const BECAUSE_BREAK = 'Compacting during a break, while the cache is still warm'
export const BECAUSE_SIZE = 'Compacting because the session reached {pct}% of its window'
export const DETAIL_BREAK = 'during a break'
export const DETAIL_SIZE = 'at {pct}% of the window'
export const ASK_YES = 'Yes'
export const ASK_LATER = 'Not now'

export const triggerWords = (kind: 'break' | 'size', pct: number, t: Say = same): string => t(kind === 'break' ? BECAUSE_BREAK : BECAUSE_SIZE).replace('{pct}', String(Math.round(pct)))
export const detailWords = (kind: 'break' | 'size', pct: number | undefined): string => (kind === 'break' ? DETAIL_BREAK : DETAIL_SIZE.replace('{pct}', String(Math.round(pct ?? 0))))

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


export const COMPACT_VIEW_STRINGS: string[] = [...Object.values(STOP_WORDS), ...Object.values(REASON_WORDS), WHY_NOW, WHY_GOOD, WAIT_ANSWERING, WAIT_ASKS, WAIT_HELPERS, WAIT_GUARD, WAIT_GAP, WAIT_PAYBACK, READY_SIZE, READY_SIZE_APP, READY_BREAK, RULE_WARM, RULE_COLD, RULE_NOPLAN, RULE_BUSY, WAIT_GAVE_UP, TYPING, WHY_ROW, WHY_RIGHT, NOTE_RIGHT, SKIPPED, NEW_TURN, BECAUSE_BREAK, BECAUSE_SIZE, DETAIL_BREAK, DETAIL_SIZE, AUTO_NOTE, NOTE_ROW, BRIEF_LINE, NO_BRIEF, ASK_TITLE, ASK_YES, ASK_LATER]
