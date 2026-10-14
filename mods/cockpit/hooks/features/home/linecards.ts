// The Where was I card: the rows and words come from core/backcard.ts, built from the facts the pane gathers (features/home/back.ts)
function backCard(c: CardCtx): LineCardView {
  const { groups, ...v } = backView(c.back, c.t ?? ((s: string): string => s), c.t === undefined ? undefined : trFill)
  const actionOf = (_p: BackDo): RowAction => GOT_IT
  return { ...v, groups: groups.map(g => ({ head: g.head, rows: g.rows.map(({ press, ...r }): GroupRow => (press === undefined ? r : { ...r, action: actionOf(press) })) })) }
}

// Line cards: cards that show a short list of plain lines
import { GUARD_WHATS, SETTING_KEY, BLOCKS } from '../../core/guard'
import { didKind, didToday, shownTitle, startOfDay, timesWord } from '../../core/ledger'
import type { Entry } from '../../core/ledger'
import { checkClaims, fixCheck } from './rowact'
import type { RowAction } from './rowact'
import { kindWord, relevantKinds, statusOf, statusWord } from '../../core/proof'
import type { ProofState } from '../../core/proof'
import { boardCardLines } from '../../core/agentboard'
import type { BoardRow } from '../../core/agentboard'
import type { LineCardId } from './logic'
import { FILES_KEEP, UNPROVEN_WHAT, lookWords } from '../../core/proof'
import { SHIP_CLAIMS } from '../../core/shipwords'
import { HALT_WHAT } from '../../core/guard'
import { didWhatIs, lastTimes, topicWhatIs } from '../../core/whatis'
import type { WhatIs } from '../../core/whatis'
import { awakeCardLines } from '../../core/awakeplan'
import { claudeLine, offLine, powerLine, roomLine, roomOf, roomReasons, sharesLine } from '../../core/computer'
import type { AgentLoad } from '../../core/computer'
import type { Laptop } from '../../core/crewlaptop'
import { skillsWhat } from '../../core/skills'
import type { SkillsFacts } from '../../core/skills'
import { fillIn } from '../../core/fillin'
import { trFill } from '../../core/lang'
import { prsView } from '../../core/prcard'
import type { PrsFacts } from '../../core/prcard'
import { backView } from '../../core/backcard'
import type { BackDo, BackFacts } from '../../core/backcard'
import { shipView } from '../../core/shipcard'
import { stoppedWhat } from '../../core/ship'
import type { ShipDo } from '../../core/shipcard'
import { safetyView } from '../../core/safetycard'
import type { Checkpoint, SafetyDo, SafetyFacts } from '../../core/safetycard'
import { contextView } from '../../core/contextcard'
import type { ContextFacts } from '../../core/contextcard'
import { previewView } from '../../core/previewcard'
import type { PreviewDo, PreviewFacts } from '../../core/previewcard'
import { setupApplyOn, setupView } from '../../core/setupcard'
import type { SetupDo, SetupFacts } from '../../core/setupcard'
import { doView } from '../../core/docard'
import type { DoDo, DoFacts } from '../../core/docard'
import { BRIEF_LOOK, GOT_IT, HALT_ALL, doRow, PR_FIX, PR_LOOK, RESUME_ALL, UNDO_LAST, lookPreview, prShip, setupRow, undoNamed } from './rowact'

export type CardCtx = { guardWarn?: 'warn' | 'worst' | 'maybe'; now: number; ledger: Entry[]; counts?: Record<string, number>; proof?: ProofState; halted: boolean; modes: Record<string, string>; agents?: BoardRow[]; computer?: { laptop?: Laptop; load: AgentLoad }; skills?: Omit<SkillsFacts, 'now'>; t?: (s: string) => string; prs?: PrsFacts; shipShown?: string[]; back?: BackFacts; safety?: { undoFiles: number; checkpoints: Checkpoint[]; preview?: string[]; previewOf?: string }; homes?: { ship: boolean; prs: boolean }; context?: ContextFacts; preview?: PreviewFacts; setup?: SetupFacts; doc?: DoFacts }
// A row with an `action` does not open: a press does that action (a small typed one
export type GroupRow = { key: string; title: string; right?: string; what: WhatIs; acted?: string; action?: RowAction }
// `fold`: only the first `shown` rows show until the fold is opened (`flags.openSections` holds `fold:<card>:<id>`)
export type LineGroup = { head: string; rows: GroupRow[]; fold?: { id: string; shown: number; more: number }; behind?: string; toggle?: string }
export type LineCardView = { title: string; blurb: string; short: string; lines: string[]; whats: WhatIs[]; shortWhat: WhatIs; groups?: LineGroup[]; pointer?: { card: string; word: string } }

const cut = (s: string, n: number): string => (s.length > n ? `${s.slice(0, n - 1)}…` : s)
const times = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`
const count = (n: number, one: string, many: string, t: (s: string) => string): string => (n === 1 ? t(one) : t(many).replace('{n}', String(n)))
const cap = (s: string): string => `${s.charAt(0).toUpperCase()}${s.slice(1)}`

const GOAL_WHAT: WhatIs = { means: 'The goal Claude works toward, taken from the key words of your first message. Vaken warns when edits wander away from it.', setting: 'proof.drift' }
const checkWhat = (kind: string, t: (s: string) => string = s => s): WhatIs => ({ means: fillIn(t('Whether {what} ran after the last change, and passed. Passed means the command ended with no error.'), { what: t(kind) }), next: t('Ask Claude to run the tests or the build and show the result. /vaken-ship proof shows what ran.'), setting: 'proof.receipts' })
const LOOK_WHAT: WhatIs = { means: 'Answers that changed files and that you have not looked at yet. Your next message counts as your look.', setting: 'proof.receipts' }
const RULES_WHAT: WhatIs = { means: 'How strict each safety rule is. Warn tells you and Claude. Stop stops the step until you say yes. Off does nothing.', setting: 'guard.destructive' }

function proofCard(c: CardCtx): LineCardView {
  const t = c.t ?? ((s: string): string => s)
  const p = c.proof
  const base = { title: 'Checks', blurb: 'Did it really work?', shortWhat: topicWhatIs('proof') }
  if (p === undefined || (p.turns === 0 && p.receipts.length === 0 && p.goal === undefined)) return { ...base, short: t('Nothing yet'), lines: [t('Nothing yet. Checks that ran and this session\'s goal show up here.')], whats: [topicWhatIs('proof')] }
  const kinds = relevantKinds(p)
  const checks = kinds.map(k => `${t(cap(kindWord(k)))} ${t(statusWord(statusOf(p, k)))}`)
  const unproven = p.last?.unproven.length ?? 0
  const shipHome = c.homes?.ship === true && p.edits > 0
  const rows = [
    ...(p.goal === undefined ? [] : [{ line: fillIn(t('Goal: {goal}'), { goal: cut(p.goal.text, 80) }), what: GOAL_WHAT }]),
    ...checks.map((line, n) => ({ line, what: checkWhat(kindWord(kinds[n] ?? 'tests'), t) })),
    ...(unproven > 0 ? [{ line: fillIn(t(unproven === 1 ? '1 statement in the last answer has no check behind it.' : '{n} statements in the last answer have no check behind them.'), { n: unproven }), what: didWhatIs(UNPROVEN_WHAT, [], c.now) ?? topicWhatIs('proof') }] : []),
    { line: p.debt > 0 ? lookWords(p.debt, t) : t('Nothing waits for your look.'), what: LOOK_WHAT },
  ]
  const lines = rows.map(r => r.line)
  const short = [...checks.slice(0, 2).map(x => x.toLowerCase()), ...(unproven > 0 ? [t('{n} unproven').replace('{n}', String(unproven))] : []), ...(p.debt > 0 ? [t('{n} to review').replace('{n}', String(p.debt))] : [])].join(' · ')
  const groups: LineGroup[] = [
    ...(p.goal === undefined ? [] : [{ head: 'Goal', rows: [{ key: 'goal', title: p.goal.text, what: GOAL_WHAT }] }]),
    ...(kinds.length === 0 ? [] : [{ head: 'Checks after the last change', rows: kinds.map(k => (statusOf(p, k) === 'failed' && !shipHome ? { key: `check-${k}`, title: t(cap(kindWord(k))), right: `${t(statusWord('failed'))} · ${t('Fix')}`, what: checkWhat(kindWord(k), t), action: fixCheck(k) } : { key: `check-${k}`, title: t(cap(kindWord(k))), right: t(statusWord(statusOf(p, k))), what: checkWhat(kindWord(k), t) })) }]),
    {
      head: 'Waiting for you',
      rows: [
        ...(unproven > 0 ? [{ key: 'unproven', title: t(SHIP_CLAIMS), right: `${count(unproven, '1 claim', '{n} claims', t)} · ${t('Check')}`, what: didWhatIs(UNPROVEN_WHAT, [], c.now) ?? topicWhatIs('proof'), action: checkClaims(unproven) }] : []),
        { key: 'look', title: t(p.debt > 0 ? 'Changes to look at' : 'Nothing waits for your look'), ...(p.debt > 0 ? { right: count(p.debt, '1 answer', '{n} answers', t) } : {}), what: p.debt > 0 && p.files.length > 0 ? { ...LOOK_WHAT, facts: [fillIn(t(p.files.length >= FILES_KEEP ? 'Files changed in this session: 300 or more.' : 'Files changed in this session: {n}.'), { n: p.files.length })] } : LOOK_WHAT },
      ],
    },
  ]
  const failedAny = kinds.some(k => statusOf(p, k) === 'failed')
  return { ...base, short: short === '' ? t('Nothing yet') : cap(short), lines, whats: rows.map(r => r.what), groups, ...(shipHome && failedAny ? { pointer: { card: 'ship', word: 'Ship' } } : {}) }
}

// "1 stopped, 1 warned today.": the two counts named, never one sum that reads as the number of stopped steps.
const guardWhy = (stopped: number, warned: number, t: (s: string) => string = s => s): string =>
  stopped + warned === 0 ? t('Nothing risky happened today.') : stopped === 0 ? fillIn(t('{n} warned today.'), { n: warned }) : warned === 0 ? fillIn(t('{n} stopped today.'), { n: stopped }) : fillIn(t('{a} stopped, {b} warned today.'), { a: stopped, b: warned })

const warnedWhat = (what: string): boolean => (GUARD_WHATS.includes(what) ? what.startsWith('Warned') : didKind(what) === 'warned')
function byTitle(rows: { what: string; n: number }[], t: (s: string) => string = s => s): string[] {
  return [...rows].sort((a, b) => b.n - a.n).map(({ what, n }) => `${t(shownTitle(what))}: ${n === 1 ? t('once') : fillIn(t('{n} times'), { n })}.`)
}
const total = (rows: { n: number }[]): number => rows.reduce((n, r) => n + r.n, 0)

// What was stopped and warned today
function guardCard(c: CardCtx): LineCardView {
  const t = c.t ?? ((s: string): string => s)
  const rules = BLOCKS.map(b => c.modes[SETTING_KEY[b]] ?? 'warn')
  const allSame = rules.every(r => r === rules[0])
  const word = (mode: string): string => (mode === 'hold' ? 'stop' : mode)
  const warnWord = allSame && rules[0] === 'warn' && c.guardWarn !== undefined && c.guardWarn !== 'warn' ? t(c.guardWarn === 'worst' ? 'worst stop' : 'warn, worst may stop') : undefined
  const ruleWord = warnWord ?? (allSame ? t('all {n}').replace('{n}', t(word(rules[0]))) : t('mixed'))
  const ruleFacts = BLOCKS.map((b, n) => `${t(['Commands', 'Edits', 'Packages', 'Tests'][n] ?? b)}: ${t(word(rules[n] ?? 'warn'))}.`)
  return {
    title: 'Risky steps',
    blurb: 'Commands, edits, packages, tests.',
    shortWhat: RULES_WHAT,
    groups: [{ head: 'Rules', rows: [{ key: 'rules', title: t('How strict'), right: ruleWord, what: { ...RULES_WHAT, facts: ruleFacts } }] }],
    short: cap(ruleWord),
    lines: [warnWord !== undefined ? `Rules: ${warnWord}.` : allSame ? `Rules: ${word(rules[0])}.` : `Rules: commands ${word(rules[0])}, edits ${word(rules[1])}, packages ${word(rules[2])}, tests ${word(rules[3])}.`],
    whats: [RULES_WHAT],
  }
}

export function safetyFacts(c: CardCtx): SafetyFacts {
  // The numbers come from today's counts store, which keeps every line
  const today = didToday(c.ledger, c.now, c.counts)
  const stoppedRows = today.filter(d => stoppedWhat(d.what))
  const warnedRows = today.filter(d => warnedWhat(d.what))
  const stoppedLines = c.ledger.filter(e => e.at >= startOfDay(c.now) && e.did === true && stoppedWhat(e.what))
  const warnedLines = c.ledger.filter(e => e.at >= startOfDay(c.now) && e.did === true && warnedWhat(e.what))
  const why = guardWhy(total(stoppedRows), total(warnedRows), c.t)
  const s = c.safety
  return {
    now: c.now,
    halted: c.halted,
    ...(c.halted ? { haltWhat: didWhatIs(HALT_WHAT, [], c.now) ?? topicWhatIs('guard') } : {}),
    held: total(stoppedRows),
    warned: total(warnedRows),
    heldWhat: { ...topicWhatIs('guard', why), facts: byTitle(stoppedRows, c.t), last: lastTimes(stoppedLines, c.now), ...(total(stoppedRows) > 0 ? { next: (c.t ?? ((x: string): string => x))('To let a stopped step through, use Allow once in Needs you.') } : {}) },
    warnedWhat: { ...topicWhatIs('guard', why), facts: byTitle(warnedRows, c.t), last: lastTimes(warnedLines, c.now) },
    undoFiles: s?.undoFiles ?? 0,
    checkpoints: s?.checkpoints ?? [],
    ...(s?.preview === undefined ? {} : { preview: s.preview }),
    ...(s?.previewOf === undefined ? {} : { previewOf: s.previewOf }),
  }
}
function safetyCard(c: CardCtx): LineCardView {
  const { groups, ...v } = safetyView(safetyFacts(c), c.t ?? ((x: string): string => x))
  const actionOf = (p: SafetyDo): RowAction => (p.do === 'halt' ? HALT_ALL : p.do === 'resume' ? RESUME_ALL : p.do === 'undoLast' ? UNDO_LAST : undoNamed(p.name))
  return { ...v, groups: groups.map(g => ({ head: g.head, rows: g.rows.map(({ press, ...r }): GroupRow => (press === undefined ? r : { ...r, action: actionOf(press) })) })) }
}

function contextCard(c: CardCtx): LineCardView {
  const { groups, ...v } = contextView(c.context, c.t ?? ((x: string): string => x))
  return { ...v, groups: groups.map(g => ({ head: g.head, rows: g.rows.map(({ press, ...r }): GroupRow => (press === undefined ? r : { ...r, action: BRIEF_LOOK })) })) }
}

function doCard(c: CardCtx): LineCardView {
  const { groups, ...v } = doView(c.doc ?? { blocks: [], mode: 'ask' }, c.t ?? ((x: string): string => x))
  const actionOf = (p: DoDo): RowAction => doRow(p)
  return { ...v, groups: groups.map(g => ({ head: g.head, rows: g.rows.map(({ press, ...r }): GroupRow => (press === undefined ? r : { ...r, action: actionOf(press) })) })) }
}

function previewCard(c: CardCtx): LineCardView {
  const { groups, ...v } = previewView(c.preview, c.t ?? ((x: string): string => x))
  const actionOf = (p: PreviewDo): RowAction => lookPreview(p.width)
  return { ...v, groups: groups.map(g => ({ head: g.head, rows: g.rows.map(({ press, ...r }): GroupRow => (press === undefined ? r : { ...r, action: actionOf(press) })) })) }
}

export const SETUP_DETAILS = 'setup-details'
function setupCard(c: CardCtx): LineCardView {
  const { groups, summary, ...v } = setupView(c.setup, c.t ?? ((x: string): string => x))
  const actionOf = (p: SetupDo): RowAction => setupRow(p)
  const rowOf = ({ press, ...r }: (typeof groups)[number]['rows'][number]): GroupRow => (press === undefined ? r : { ...r, action: actionOf(press) })
  const asGroup = (g: (typeof groups)[number]): LineGroup => ({ head: g.head, rows: g.rows.map(rowOf) })
  const conflicts = groups.filter(g => g.conflict === true).map(asGroup)
  const rest = groups.filter(g => g.conflict !== true)
  if (summary === undefined || setupApplyOn(c.setup?.values ?? {})) return { ...v, groups: [...conflicts, ...rest.map(asGroup)] }
  return { ...v, groups: [...conflicts, { head: '', rows: [{ key: 'summary', title: summary, what: v.shortWhat }], toggle: SETUP_DETAILS }, ...rest.map(g => ({ ...asGroup(g), behind: SETUP_DETAILS }))] }
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
  const groups: LineGroup[] = (v.groups ?? []).map(g => ({
    head: g.head,
    ...(g.fold === undefined ? {} : { fold: g.fold }),
    rows: g.rows.map(({ command, ...r }): GroupRow => (command === undefined ? r : { ...r, right: r.right === undefined ? t('Start') : `${r.right} · ${t('Start')}`, action: { kind: 'skill', name: command } })),
  }))
  // Nothing used and no list read: no groups
  const { groups: _drop, ...rest } = v
  return groups.length === 0 ? rest : { ...rest, groups }
}

function prsCard(c: CardCtx): LineCardView {
  const { groups, ...v } = prsView(c.prs, c.now, c.t ?? ((s: string): string => s))
  if (groups === undefined) return v
  const actionOf = (press: string, key: string): RowAction => (press === 'fix' ? PR_FIX : press === 'look' ? PR_LOOK : prShip(`prs:${key}`))
  return { ...v, groups: groups.map(g => ({ head: g.head, rows: g.rows.map(({ press, ...r }): GroupRow => (press === undefined ? r : { ...r, action: actionOf(press, r.key) })) })) }
}

function shipCard(c: CardCtx): LineCardView {
  const { groups, pointer, ...v } = shipView({ ...(c.proof === undefined ? {} : { proof: c.proof }), ledger: c.ledger, ...(c.counts === undefined ? {} : { counts: c.counts }), now: c.now, ...(c.prs === undefined ? {} : { prs: c.prs }), ...(c.homes?.prs === true ? { prsHome: true } : {}), ...(c.shipShown === undefined ? {} : { shown: c.shipShown }) }, c.t ?? ((s: string): string => s))
  const actionOf = (p: ShipDo, key: string): RowAction => (p.do === 'fixCheck' ? fixCheck(p.kind) : p.do === 'claims' ? checkClaims(p.n) : p.do === 'prFix' ? PR_FIX : prShip(`ship:${key}`))
  return { ...v, ...(pointer === undefined ? {} : { pointer: { card: 'prs', word: 'Pull requests' } }), groups: groups.map(g => ({ head: g.head, rows: g.rows.map(({ press, ...r }): GroupRow => (press === undefined ? r : { ...r, action: actionOf(press, r.key) })) })) }
}

export function lineCard(id: LineCardId, c: CardCtx): LineCardView {
  return id === 'proof' ? proofCard(c) : id === 'guard' ? guardCard(c) : id === 'computer' ? computerCard(c) : id === 'skills' ? skillsCard(c) : id === 'prs' ? prsCard(c) : id === 'ship' ? shipCard(c) : id === 'back' ? backCard(c) : id === 'safety' ? safetyCard(c) : id === 'context' ? contextCard(c) : id === 'preview' ? previewCard(c) : id === 'setup' ? setupCard(c) : id === 'do' ? doCard(c) : agentsCard(c)
}
