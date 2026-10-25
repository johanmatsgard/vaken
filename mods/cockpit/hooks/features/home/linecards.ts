// The Where was I card: the rows and words come from core/backcard.ts, built from the facts the pane gathers (features/home/back.ts)
function backCard(c: CardCtx): LineCardView {
  const { groups, ...v } = backView(c.back, c.t ?? ((s: string): string => s), c.t === undefined ? undefined : trFill)
  const actionOf = (p: BackDo): RowAction => (p.do === 'ask' ? { kind: 'ask', id: p.id } : p.do === 'hold' ? { kind: 'openHold', key: p.key } : p.do === 'run' ? { kind: 'openRun' } : p.do === 'nightFix' ? { kind: 'nightFix' } : p.do === 'promise' ? { kind: 'promise', n: p.n } : GOT_IT)
  return { ...v, groups: groups.map(g => ({ head: g.head, ...(g.fold === undefined ? {} : { fold: g.fold }), rows: g.rows.map(({ press, ...r }): GroupRow => (press === undefined ? r : { ...r, action: actionOf(press) })) })) }
}

// Line cards: cards that show a short list of plain lines
import { GUARD_SETTINGS, SETTING_KEY, BLOCKS } from '../../core/guard'
import { didToday, shownTitle, startOfDay, timesWord } from '../../core/ledger'
import type { Entry } from '../../core/ledger'
import { checkClaims, fixCheck } from './rowact'
import type { RowAction } from './rowact'
import { KIND_SHORT, LOOK_TITLE, claimsUnchecked, stateWord, kindWord, latestOf, packLines, relevantKinds, statusOf } from '../../core/proof'
import type { ProofKind, ProofState, Status, Unclear } from '../../core/proof'
import { fmt } from '../../core/fmt'
import { langNow, t as tn } from '../../i18n/t'
import { boardCardLines } from '../../core/agentboard'
import type { BoardRow } from '../../core/agentboard'
import type { LineCardId } from './logic'
import { FILES_KEEP, UNPROVEN_WHAT, lookWords } from '../../core/proof'
import { SHIP_CLAIMS } from '../../core/shipwords'
import { HALT_WHAT } from '../../core/guard'
import { didWhatIs, lastTimes, topicWhatIs } from '../../core/whatis'
import { guardWord } from '../../core/headline'
import type { WhatIs } from '../../core/whatis'
import { awakeCardLines } from '../../core/awakeplan'
import { claudeLine, offLine, powerLine, roomLine, roomOf, roomReasons, sharesLine } from '../../core/computer'
import type { AgentLoad } from '../../core/computer'
import type { Laptop } from '../../core/crewlaptop'
import { skillsWhat } from '../../core/skills'
import { repeatMem } from '../../core/repeat'
import { repeatGroups } from './needs'
import type { SkillsFacts } from '../../core/skills'
import { fillIn } from '../../core/fillin'
import { trFill } from '../../core/lang'
import { prsView } from '../../core/prcard'
import type { PrsFacts } from '../../core/prcard'
import { backView } from '../../core/backcard'
import type { BackDo, BackFacts } from '../../core/backcard'
import { shipView } from '../../core/shipcard'
import { riskyStopped, riskyWarned } from '../../core/ship'
import type { ShipDo } from '../../core/shipcard'
import { safetyView } from '../../core/safetycard'
import type { Checkpoint, SafetyDo, SafetyFacts } from '../../core/safetycard'
import { contextView } from '../../core/contextcard'
import type { ContextFacts } from '../../core/contextcard'
import { previewView } from '../../core/previewcard'
import type { PreviewDo, PreviewFacts } from '../../core/previewcard'
import { setupView } from '../../core/setupcard'
import type { SetupDo, SetupFacts } from '../../core/setupcard'
import { doView } from '../../core/docard'
import type { DoDo, DoFacts } from '../../core/docard'
import { CHANGED_MEANS, CHANGED_NEXT, CHANGED_TITLE, KEEP_ON_WHAT, KEEP_ROUNDS, KEEP_ROUNDS_USED, KEEP_START, KEEP_START_WHAT, KEEP_STOP, KEEP_TITLE, changedSince, keepRowOf } from '../../core/keepgoing'
import { liveStuck, stuckMem } from '../../core/loopbreaker'
import { BRIEF_LOOK, GOT_IT, HALT_ALL, KEEP_STOP_ROW, keepStart, doRow, PR_FIX, PR_LOOK, RESUME_ALL, UNDO_LAST, lookPreview, prShip, removeCopyRow, setupRow, undoNamed } from './rowact'
import type { Copy } from '../../core/crew3git'

export type CardCtx = { guardWarn?: 'warn' | 'worst' | 'maybe'; now: number; ledger: Entry[]; counts?: Record<string, number>; proof?: ProofState; halted: boolean; modes: Record<string, string>; agents?: BoardRow[]; computer?: { laptop?: Laptop; load: AgentLoad }; skills?: Omit<SkillsFacts, 'now'>; t?: (s: string) => string; prs?: PrsFacts; shipShown?: string[]; back?: BackFacts; safety?: { undoFiles: number; checkpoints: Checkpoint[]; preview?: string[]; previewOf?: string; sid?: string; names?: Record<string, string> }; homes?: { ship: boolean; prs: boolean; proof?: boolean }; context?: ContextFacts; preview?: PreviewFacts; setup?: SetupFacts; doc?: DoFacts; noGit?: boolean }
// A row with an `action` does not open: a press does that action (a small typed one
// `marks`: fact rows shown under the row's "What it means" when it opens
// `note`: whole dim lines under the title (failing test names); `wrap`: a title with no value wraps instead of being cut
// `middle`: a word too wide for the row (a folder name) is cut in the middle, so the rest of the sentence stays whole
// `session`: a Needs you row drawn as its question rows: another session's name its bold line, the title the dim line under it, the age at that line's end; with no `name` (this session) the title is the bold line and the age alone the dim line; `calm` draws the plain ring, not the amber mark
export type GroupRow = { key: string; title: string; right?: string; what: WhatIs; acted?: string; action?: RowAction; marks?: { label: string; value: string }[]; note?: string[]; wrap?: boolean; middle?: boolean; session?: { name?: string; calm?: boolean } }
// `fold`: only the first `shown` rows show until the fold is opened (`flags.openSections` holds `fold:<card>:<id>`)
export type LineGroup = { head: string; rows: GroupRow[]; fold?: { id: string; shown: number; more: number }; behind?: string; toggle?: string }
export type LineCardView = { title: string; blurb: string; short: string; lines: string[]; whats: WhatIs[]; shortWhat: WhatIs; groups?: LineGroup[]; pointer?: { card: string; word: string }[] }

const cut = (s: string, n: number): string => (s.length > n ? `${s.slice(0, n - 1)}…` : s)
const times = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`
const count = (n: number, one: string, many: string, t: (s: string) => string): string => (n === 1 ? t(one) : t(many).replace('{n}', String(n)))
const cap = (s: string): string => `${s.charAt(0).toUpperCase()}${s.slice(1)}`

const GOAL_WHAT: WhatIs = { means: 'The goal Claude works toward, taken from the key words of your first message. Vaken warns when edits wander away from it.', setting: 'proof.drift' }
const checkWhat = (kind: string, t: (s: string) => string = s => s): WhatIs => ({ means: fillIn(t('Whether {what} ran after the last change, and passed. Passed means the command ended with no error.'), { what: t(kind) }), next: t('Ask Claude to run the tests or the build and show the result. /vaken-ship proof shows what ran.'), setting: 'proof.receipts' })
const UNSAVED_WHAT: WhatIs = { means: 'Files changed and not committed yet, as git counted them when the last answer ended. Below is what /vaken-ship proof shows.', setting: 'proof.receipts' }
const LOOK_WHAT: WhatIs = { means: 'Answers that changed files and that you have not looked at yet. Your next message counts as your look.', setting: 'proof.receipts' }
const RULES_WHAT: WhatIs = { means: 'How strict each safety rule is. Warn tells you and Claude. Stop stops the step until you say yes. Off does nothing.', setting: 'guard.destructive' }

// Ship shares the short names, the state word and the look title (core/proof.ts), so both cards say a check the same way
export { KIND_SHORT, LOOK_TITLE, stateWord }
const UNCLEAR_WHY: Record<Unclear, string> = { pipe: 'Output was cut by a pipe.', chain: 'Another command ran after it.', many: 'Several checks ran in one command.', norun: 'Its program was not found, so no test ran.' }
export const NO_RUN_WORD = 'could not run'
// Worst first: the Short look says only the worst one
const WORST: Status[] = ['failed', 'unknown', 'stale', 'notrun']
// Cut at a space, never inside a word
const cutWords = (s: string, n: number): string => {
  if (s.length <= n) return s
  const head = s.slice(0, n - 1)
  const space = head.lastIndexOf(' ')
  return `${(space > n / 2 ? head.slice(0, space) : head).trimEnd()}…`
}

function proofCard(c: CardCtx): LineCardView {
  const t = c.t ?? ((s: string): string => s)
  const p = c.proof
  const base = { title: 'Checks', blurb: 'Did it really work?', shortWhat: topicWhatIs('proof') }
  const none = { ...base, short: t('No checks yet'), lines: [t('No checks yet')], whats: [topicWhatIs('proof')] }
  if (p === undefined || (p.turns === 0 && p.receipts.length === 0 && p.goal === undefined)) return none
  // A check that never ran says nothing while no file changed (only a goal so far)
  const kinds = relevantKinds(p).filter(k => p.edits > 0 || statusOf(p, k) !== 'notrun')
  const unproven = claimsUnchecked(p)
  const unsaved = p.last?.diff?.files ?? 0
  const name = (k: ProofKind): string => t(KIND_SHORT[k])
  const agoOf = (k: ProofKind): string | undefined => {
    const r = latestOf(p, k)
    return r === undefined ? undefined : fmt.ago(Math.max(0, c.now - r.at), 'plain', langNow())
  }
  // A check that ran before the last edit says when, in one fact: "ran 6 min ago, before the last edit"
  const stateOf = (k: ProofKind, st: Status): string => {
    const ago = st === 'notrun' ? undefined : agoOf(k)
    // A check whose program could not run is not a failed one: no Fix asks Claude to fix tests that never ran
    if (st === 'unknown' && latestOf(p, k)?.why === 'norun') return ago === undefined ? t(NO_RUN_WORD) : `${t(NO_RUN_WORD)} · ${ago}`
    if (ago === undefined) return stateWord(k, st, t)
    return st === 'stale' ? fillIn(t('ran {ago}, before the last edit'), { ago }) : `${stateWord(k, st, t)} · ${ago}`
  }
  const noteOf = (k: ProofKind, st: Status): string[] => {
    const r = latestOf(p, k)
    if (r === undefined) return []
    if (st === 'failed' && r.names !== undefined) return [...r.names, ...(r.more === undefined || r.more === 0 ? [] : [fillIn(t('and {n} more'), { n: r.more })])]
    return st === 'unknown' && r.why !== undefined ? [t(UNCLEAR_WHY[r.why])] : []
  }
  const checkRow = (k: ProofKind): GroupRow => {
    const st = statusOf(p, k)
    const right = stateOf(k, st)
    const note = noteOf(k, st)
    const row = { key: `check-${k}`, title: name(k), what: checkWhat(kindWord(k), t), ...(note.length === 0 ? {} : { note }) }
    // A failed check is never a dead end: the Fix press stays here, its one home
    return st === 'failed' ? { ...row, right: `${right} · ${t('Fix')}`, action: fixCheck(k) } : { ...row, right }
  }
  // Keep going until green (core/keepgoing.ts): one press under the checks; Check runs Off hides it, and the stuck ladder's offer wins over it
  const keep = keepRowOf(p, kinds, { receiptsOn: c.modes['proof.receipts'] !== 'off', stuck: liveStuck(stuckMem.offer, c.now) !== undefined })
  const keepRows: GroupRow[] =
    keep === undefined
      ? []
      : keep.press === 'start'
        ? [{ key: 'keepgoing', title: t(KEEP_TITLE[keep.kind]), right: t(KEEP_START), what: { means: t(KEEP_START_WHAT), setting: 'proof.receipts' }, action: keepStart(keep.kind) }]
        : [{ key: 'keepgoing', title: t(KEEP_STOP), right: fillIn(t(KEEP_ROUNDS_USED), { n: keep.rounds, max: KEEP_ROUNDS }), what: { means: t(KEEP_ON_WHAT), setting: 'proof.receipts' }, action: KEEP_STOP_ROW }]
  // The wider done check: a file changed after a check passed, said once the turn ended; a calm row with the file's name, nothing stopped
  const changed = changedSince(p)
  const changedRow: GroupRow[] = changed === undefined ? [] : [{ key: 'changed', title: t(CHANGED_TITLE[changed]), ...(p.lastEditFile === undefined ? {} : { right: p.lastEditFile }), what: { means: t(CHANGED_MEANS), next: t(CHANGED_NEXT), setting: 'proof.receipts' } }]
  const goalText = p.goal?.text
  const lookRow: GroupRow[] = p.debt > 0 ? [{ key: 'look', title: t(LOOK_TITLE), right: count(p.debt, '1 answer', '{n} answers', t), what: p.files.length > 0 ? { ...LOOK_WHAT, facts: [fillIn(t(p.files.length >= FILES_KEEP ? 'Files changed in this session: 300 or more.' : 'Files changed in this session: {n}.'), { n: p.files.length })] } : LOOK_WHAT }] : []
  const waiting: GroupRow[] = [
    ...changedRow,
    ...(unproven > 0 ? [{ key: 'unproven', title: t(SHIP_CLAIMS), right: `${count(unproven, '1 claim', '{n} claims', t)} · ${t('Check')}`, what: didWhatIs(UNPROVEN_WHAT, [], c.now) ?? topicWhatIs('proof'), action: checkClaims(unproven) }] : []),
    ...(unsaved > 0 ? [{ key: 'unsaved', title: t('Not committed'), right: tn('words.file', { n: unsaved }), what: { ...UNSAVED_WHAT, facts: packLines(p.last, p) } }] : []),
    ...lookRow,
  ]
  const groups: LineGroup[] = [
    ...(goalText === undefined ? [] : [{ head: 'Goal', rows: [{ key: 'goal', title: goalText, wrap: true, what: GOAL_WHAT }] }]),
    ...(kinds.length === 0 ? [] : [{ head: 'Checks after the last change', rows: [...kinds.map(checkRow), ...keepRows] }]),
    ...(waiting.length === 0 ? [] : [{ head: 'Waiting for you', rows: waiting }]),
  ]
  if (groups.length === 0) return none
  const rows = [
    ...(goalText === undefined ? [] : [{ line: fillIn(t('Goal: {goal}'), { goal: cutWords(goalText, 80) }), what: GOAL_WHAT }]),
    ...kinds.map(k => ({ line: `${name(k)} ${stateWord(k, statusOf(p, k), t)}`, what: checkWhat(kindWord(k), t) })),
    ...(unproven > 0 ? [{ line: fillIn(t(unproven === 1 ? '1 statement in the last answer has no check behind it.' : '{n} statements in the last answer have no check behind them.'), { n: unproven }), what: didWhatIs(UNPROVEN_WHAT, [], c.now) ?? topicWhatIs('proof') }] : []),
    ...(changed === undefined ? [] : [{ line: t(CHANGED_TITLE[changed]), what: { means: t(CHANGED_MEANS), next: t(CHANGED_NEXT), setting: 'proof.receipts' } }]),
    ...(p.debt > 0 ? [{ line: lookWords(p.debt, t), what: LOOK_WHAT }] : []),
  ]
  // The Short look says only the worst one
  const worst = WORST.flatMap(st => kinds.filter(k => statusOf(p, k) === st).map(k => `${name(k)} ${stateWord(k, st, t)}`))[0]
  const first = kinds[0]
  const short = worst ?? (unproven > 0 ? count(unproven, '1 claim not checked', '{n} claims not checked', t) : p.debt > 0 ? t('{n} to review').replace('{n}', String(p.debt)) : first !== undefined ? `${name(first)} ${stateWord(first, 'ok', t)}` : goalText !== undefined ? cutWords(goalText, 60) : t('Nothing yet'))
  return { ...base, short: cap(short), lines: rows.map(r => r.line), whats: rows.map(r => r.what), groups }
}

// "1 stopped, 1 warned today.": the two counts named, never one sum that reads as the number of stopped steps.
const guardWhy = (stopped: number, warned: number, t: (s: string) => string = s => s): string =>
  stopped + warned === 0 ? t('Nothing risky happened today.') : stopped === 0 ? fillIn(t('{n} warned today.'), { n: warned }) : warned === 0 ? fillIn(t('{n} stopped today.'), { n: stopped }) : fillIn(t('{a} stopped, {b} warned today.'), { a: stopped, b: warned })

// Only a real risky step counts as warned; the other notices are the Autopilot card's
const warnedWhat = riskyWarned
function byTitle(rows: { what: string; n: number }[], t: (s: string) => string = s => s): string[] {
  return [...rows].sort((a, b) => b.n - a.n).map(({ what, n }) => `${t(shownTitle(what))}: ${n === 1 ? t('once') : fillIn(t('{n} times'), { n })}.`)
}
const total = (rows: { n: number }[]): number => rows.reduce((n, r) => n + r.n, 0)

// What was stopped and warned today
function guardCard(c: CardCtx): LineCardView {
  const t = c.t ?? ((s: string): string => s)
  const rules = BLOCKS.map(b => c.modes[SETTING_KEY[b]] ?? 'warn')
  const word = (mode: string): string => (mode === 'hold' ? 'stop' : mode)
  // The same word as the Glance row (core/headline.ts guardWord)
  const ruleWord = guardWord(rules, t, c.guardWarn)
  // The rules by the names their settings have (the flip side and Settings say the same)
  const ruleName = (b: string): string => t(GUARD_SETTINGS.find(s => s.key === SETTING_KEY[b as keyof typeof SETTING_KEY])?.label ?? b)
  const ruleFacts = BLOCKS.map((b, n) => `${ruleName(b)}: ${t(word(rules[n] ?? 'warn'))}.`)
  return {
    title: 'Risky steps',
    blurb: 'Commands, edits, packages, tests.',
    shortWhat: RULES_WHAT,
    groups: [{ head: 'Rules', rows: [{ key: 'rules', title: t('How strict'), right: ruleWord, what: { ...RULES_WHAT, facts: ruleFacts } }] }],
    short: ruleWord,
    lines: [rules.every(r => r === rules[0]) ? `${t('Rules')}: ${ruleWord}.` : `${BLOCKS.map((b, n) => `${ruleName(b)}: ${t(word(rules[n] ?? 'warn'))}`).join(', ')}.`],
    whats: [RULES_WHAT],
  }
}

export function safetyFacts(c: CardCtx): SafetyFacts {
  // The numbers come from today's counts store, which keeps every line
  const today = didToday(c.ledger, c.now, c.counts)
  const stoppedRows = today.filter(d => riskyStopped(d.what))
  const warnedRows = today.filter(d => warnedWhat(d.what))
  const s = c.safety
  // A line from another session names that session, so it is never read as this one's
  const whose = (e: Entry): { at: number; detail?: string; who?: string } => ({ at: e.at, ...(e.detail === undefined ? {} : { detail: e.detail }), ...(e.session === undefined || s?.sid === undefined || e.session === s.sid ? {} : { who: s.names?.[e.session] ?? (c.t ?? ((x: string): string => x))('Another session') }) })
  const stoppedLines = c.ledger.filter(e => e.at >= startOfDay(c.now) && e.did === true && riskyStopped(e.what)).map(whose)
  const warnedLines = c.ledger.filter(e => e.at >= startOfDay(c.now) && e.did === true && warnedWhat(e.what)).map(whose)
  const why = guardWhy(total(stoppedRows), total(warnedRows), c.t)
  return {
    now: c.now,
    halted: c.halted,
    ...(c.halted ? { haltWhat: didWhatIs(HALT_WHAT, [], c.now) ?? topicWhatIs('guard') } : {}),
    held: total(stoppedRows),
    warned: total(warnedRows),
    heldWhat: { ...topicWhatIs('guard', why), facts: byTitle(stoppedRows, c.t), last: lastTimes(stoppedLines, c.now, true), ...(total(stoppedRows) > 0 ? { next: (c.t ?? ((x: string): string => x))('To let a stopped step through, use Allow once in Needs you.') } : {}) },
    warnedWhat: { ...topicWhatIs('guard', why), facts: byTitle(warnedRows, c.t), last: lastTimes(warnedLines, c.now, true) },
    undoFiles: s?.undoFiles ?? 0,
    checkpoints: s?.checkpoints ?? [],
    ...(s?.preview === undefined ? {} : { preview: s.preview }),
    ...(s?.previewOf === undefined ? {} : { previewOf: s.previewOf }),
  }
}
function safetyCard(c: CardCtx): LineCardView {
  const { groups, ...v } = safetyView(safetyFacts(c), c.t ?? ((x: string): string => x))
  const actionOf = (p: SafetyDo): RowAction => (p.do === 'halt' ? HALT_ALL : p.do === 'resume' ? RESUME_ALL : p.do === 'undoLast' ? UNDO_LAST : undoNamed(p.name))
  return { ...v, groups: groups.map(g => ({ head: g.head, ...(g.fold === undefined ? {} : { fold: g.fold }), rows: g.rows.map(({ press, ...r }): GroupRow => (press === undefined ? r : { ...r, action: actionOf(press) })) })) }
}

function contextCard(c: CardCtx): LineCardView {
  const { groups, ...v } = contextView(c.context, c.t ?? ((x: string): string => x))
  return { ...v, groups: groups.map(g => ({ head: g.head, rows: g.rows.map(({ press, ...r }): GroupRow => (press === undefined ? r : { ...r, action: BRIEF_LOOK })) })) }
}

function doCard(c: CardCtx): LineCardView {
  const { groups, ...v } = doView(c.doc ?? { blocks: [], mode: 'ask' }, c.t ?? ((x: string): string => x))
  const actionOf = (p: DoDo): RowAction => doRow(p)
  return { ...v, groups: groups.map(g => ({ head: g.head, ...(g.fold === undefined ? {} : { fold: g.fold }), rows: g.rows.map(({ press, ...r }): GroupRow => (press === undefined ? r : { ...r, action: actionOf(press) })) })) }
}

function previewCard(c: CardCtx): LineCardView {
  const { groups, ...v } = previewView(c.preview, c.t ?? ((x: string): string => x))
  const actionOf = (p: PreviewDo): RowAction => (p.do === 'see' ? { kind: 'seePicture', path: p.path, width: p.width } : lookPreview(p.width))
  return { ...v, groups: groups.map(g => ({ head: g.head, rows: g.rows.map(({ press, ...r }): GroupRow => (press === undefined ? r : { ...r, action: actionOf(press) })) })) }
}

// Off draws only its Turn on row (features/home/cards/lines.tsx); on, every row shows, the conflicts first.
function setupCard(c: CardCtx): LineCardView {
  const { groups, ...v } = setupView(c.setup, c.t ?? ((x: string): string => x))
  const actionOf = (p: SetupDo): RowAction => setupRow(p)
  const rowOf = ({ press, ...r }: (typeof groups)[number]['rows'][number]): GroupRow => (press === undefined ? r : { ...r, action: actionOf(press) })
  const asGroup = (g: (typeof groups)[number]): LineGroup => ({ head: g.head, rows: g.rows.map(rowOf) })
  return { ...v, groups: [...groups.filter(g => g.conflict === true), ...groups.filter(g => g.conflict !== true)].map(asGroup) }
}

function agentsShort(rows: BoardRow[], t: (s: string) => string): string {
  if (rows.length === 0) return t('None seen')
  const running = rows.filter(r => r.state === 'running').length
  const unknown = rows.filter(r => r.state === 'unknown').length
  return [running === 0 ? t('None running') : t('{n} running').replace('{n}', String(running)), ...(unknown > 0 ? [t('{n} no end seen').replace('{n}', String(unknown))] : [])].join(', ')
}
function agentsCard(c: CardCtx): LineCardView {
  const rows = c.agents ?? []
  const full = boardCardLines(rows, c.now, 'explained', c.t)
  const brief = boardCardLines(rows, c.now, 'simple', c.t)
  const lines = rows.length === 0 ? full.lines : brief.lines.length > 0 && full.lines.length > 0 ? full.lines : brief.lines
  const what = topicWhatIs('agents', rows.length === 0 ? (c.t ?? ((x: string): string => x))('No agent ran in this session yet.') : full.note)
  return { title: full.title, blurb: full.note, short: agentsShort(rows, c.t ?? ((s: string): string => s)), lines, whats: lines.map(() => what), shortWhat: what }
}

export function computerWhat(c: CardCtx): WhatIs {
  const mode = c.modes['laptop.mode'] ?? 'off'
  const l = c.computer?.laptop
  const load = c.computer?.load ?? { running: 0, max: 3, capOn: false }
  const room = roomOf(l, load, c.now)
  if (room === undefined || l === undefined) return topicWhatIs('computer', (c.t ?? ((x: string): string => x))(mode === 'on' ? 'Computer load is read every 3 minutes. Nothing is read yet.' : 'Computer load is off, so vaken cannot see memory or the processor.'))
  return { ...topicWhatIs('computer'), facts: roomReasons(room, l, load, c.t) }
}
function computerCard(c: CardCtx): LineCardView {
  const mode = c.modes['laptop.mode'] ?? 'off'
  const l = c.computer?.laptop
  const load = c.computer?.load ?? { running: 0, max: 3, capOn: false }
  const room = roomOf(l, load, c.now)
  const what = computerWhat(c)
  const base = { title: 'Computer', blurb: 'now', shortWhat: what }
  const awake = awakeCardLines(c.t ?? ((s: string): string => s))
  if (room === undefined || l === undefined) return { ...base, short: offLine(mode, c.t), lines: [offLine(mode, c.t), ...awake], whats: [what, ...awake.map(() => what)] }
  const lines = [roomLine(room, c.t), sharesLine(l, c.t), claudeLine(l, undefined, c.t), ...(powerLine(l, c.t) === undefined ? [] : [powerLine(l, c.t) as string]), ...awake]
  return { ...base, short: roomLine(room, c.t), lines, whats: lines.map(() => what) }
}

function skillsCard(c: CardCtx): LineCardView {
  const t = c.t ?? ((s: string): string => s)
  const v = skillsWhat({ counts: c.skills?.counts ?? {}, ...(c.skills?.listing === undefined ? {} : { listing: c.skills.listing }), now: c.now }, t)
  // Repeat to skill's calm offer leads the card (core/repeat.ts), from memory only
  const offer = repeatMem.offer
  const groups: LineGroup[] = [...(offer === undefined ? [] : repeatGroups(offer, t)), ...(v.groups ?? []).map(g => ({
    head: g.head,
    ...(g.fold === undefined ? {} : { fold: g.fold }),
    rows: g.rows.map(({ command, ...r }): GroupRow => (command === undefined ? r : { ...r, right: r.right === undefined ? t('Start') : `${r.right} · ${t('Start')}`, action: { kind: 'skill', name: command } })),
  }))]
  // Nothing used and no list read: no groups
  const { groups: _drop, ...rest } = v
  return groups.length === 0 ? rest : { ...rest, groups }
}

function prsCard(c: CardCtx): LineCardView {
  const { groups, ...v } = prsView(c.prs, c.now, c.t ?? ((s: string): string => s))
  if (groups === undefined) return v
  const actionOf = (press: string, key: string, copy: Copy | undefined): RowAction => (press === 'remove' && copy !== undefined ? removeCopyRow(copy) : press === 'fix' ? PR_FIX : press === 'look' ? PR_LOOK : prShip(`prs:${key}`))
  return { ...v, groups: groups.map(g => ({ head: g.head, rows: g.rows.map(({ press, copy, ...r }): GroupRow => (press === undefined ? r : { ...r, action: actionOf(press, r.key, copy) })) })) }
}

function shipCard(c: CardCtx): LineCardView {
  const { groups, pointer, checks, ...v } = shipView({ ...(c.proof === undefined ? {} : { proof: c.proof }), ledger: c.ledger, ...(c.counts === undefined ? {} : { counts: c.counts }), now: c.now, ...(c.prs === undefined ? {} : { prs: c.prs }), ...(c.homes?.prs === true ? { prsHome: true } : {}), ...(c.homes?.proof === true ? { proofHome: true } : {}), ...(c.shipShown === undefined ? {} : { shown: c.shipShown }), ...(c.noGit === true ? { noGit: true } : {}) }, c.t ?? ((s: string): string => s))
  const actionOf = (p: ShipDo, key: string): RowAction => (p.do === 'fixCheck' ? fixCheck(p.kind) : p.do === 'claims' ? checkClaims(p.n) : p.do === 'prFix' ? PR_FIX : p.do === 'prLook' ? PR_LOOK : prShip(`ship:${key}`))
  const pointers = [...(checks === true ? [{ card: 'proof', word: 'Checks' }] : []), ...(pointer === undefined ? [] : [{ card: 'prs', word: 'Pull requests' }])]
  return { ...v, ...(pointers.length === 0 ? {} : { pointer: pointers }), groups: groups.map(g => ({ head: g.head, ...(g.fold === undefined ? {} : { fold: g.fold }), rows: g.rows.map(({ press, ...r }): GroupRow => (press === undefined ? r : { ...r, action: actionOf(press, r.key) })) })) }
}

export function lineCard(id: LineCardId, c: CardCtx): LineCardView {
  return id === 'proof' ? proofCard(c) : id === 'guard' ? guardCard(c) : id === 'computer' ? computerCard(c) : id === 'skills' ? skillsCard(c) : id === 'prs' ? prsCard(c) : id === 'ship' ? shipCard(c) : id === 'back' ? backCard(c) : id === 'safety' ? safetyCard(c) : id === 'context' ? contextCard(c) : id === 'preview' ? previewCard(c) : id === 'setup' ? setupCard(c) : id === 'do' ? doCard(c) : agentsCard(c)
}
