// The Glance look: each card is one row (title, headline value, status dot) and a press opens its rows.
import { expect, mock } from 'claude-code/testing'
import { test } from './slow'
import type { On } from 'claude-code'
import { APPEARS } from '../hooks/core/cardrules'
import { forgetProjectSet } from '../hooks/core/io'
import { agentsHead, agentsShort, autopilotHead, backHead, computerHead, contextHead, doHead, glanceDot, glanceIsOpen, glanceToggled, guardHead, hereHead, factOf, keepGlance, limitHead, othersHead, previewHead, proofHead, prsHead, prsShortHead, safetyHead, setupHead, shipHead, skillsHead } from '../hooks/core/headline'
import { findSetting } from '../hooks/core/settings'
import { HEADLINES, glanceDotOf, glanceWordOf } from '../hooks/features/home/headline'
import type { GlanceFacts } from '../hooks/features/home/headline'
import { CARD_IDS, LINE_CARD_IDS, parseDetail, parseOpenDetail } from '../hooks/features/home/logic'

const sectionLabel = async (ui: { find: (q: unknown) => Promise<unknown>; findAll: (q: unknown) => Promise<unknown[]> }, re: RegExp): Promise<unknown> =>
  (await ui.find({ type: 'Text', text: re })) ?? ((await ui.findAll({ type: 'Svg' })) as { props: { alt?: string } }[]).find(x => re.test(x.props.alt ?? ''))

const NOW = Date.parse('2026-10-11T12:00:00Z')
const MIN = 60_000

test('every card has a headline, in the one table', () => {
  expect(Object.keys(HEADLINES).sort()).toEqual([...CARD_IDS].sort())
  for (const id of LINE_CARD_IDS) expect(typeof HEADLINES[id], `line card ${id} has no headline`).toBe('function')
})

test('the headline values are short and say the one thing', () => {
  expect(limitHead([{ short: 'Week', percent: 58.4 }, { short: 'Session', percent: 12 }])).toBe('5-hour limit: 12% used')
  expect(limitHead([{ short: 'Week', percent: 88.4, hot: true }, { short: 'Session', percent: 12 }])).toBe('Week: 88% used')
  expect(limitHead([])).toBe('Not known yet')
  expect(hereHead({ state: 'Working', costUsd: 1.42 })).toBe('Working · $1.42')
  expect(hereHead({ state: 'Quiet' })).toBe('Quiet')
  expect(hereHead(undefined)).toBe('Not started')
  expect(othersHead({ waiting: 1, working: 2, total: 3 })).toBe('1 your turn')
  expect(othersHead({ waiting: 0, working: 2, total: 3 })).toBe('2 working')
  expect(othersHead({ waiting: 0, working: 0, total: 3 })).toBe('3 idle')
  expect(othersHead({ waiting: 0, working: 0, total: 0 })).toBe('None')
  expect(autopilotHead(0)).toBe('Nothing today')
  expect(autopilotHead(4)).toBe('4 today')
  expect(agentsHead({ running: 2, stuck: 0, total: 5 })).toBe('2 running')
  expect(agentsHead({ running: 2, stuck: 1, total: 5 })).toBe('1 with no progress')
  expect(agentsHead({ running: 0, stuck: 0, total: 5 })).toBe('All done')
  expect(agentsHead({ running: 0, stuck: 0, total: 0 })).toBe('None')
  expect(computerHead({ gaugeOn: false, room: undefined })).toBe('Off')
  expect(computerHead({ gaugeOn: true, room: undefined })).toBe('')
  expect(computerHead({ gaugeOn: true, room: { n: 0 } })).toBe('No room for another agent')
  expect(computerHead({ gaugeOn: true, room: { n: 2 } })).toBe('Room for about 2')
  expect(proofHead({ none: true, failed: 0, unproven: 0, debt: 0 })).toBe('None')
  expect(proofHead({ none: false, failed: 1, unproven: 2, debt: 3 })).toBe('1 failed')
  expect(proofHead({ none: false, failed: 0, unproven: 2, debt: 3 })).toBe('Not checked')
  expect(proofHead({ none: false, failed: 0, unproven: 0, debt: 3 })).toBe('3 to review')
  expect(proofHead({ none: false, failed: 0, unproven: 0, debt: 0 })).toBe('All clear')
  expect(guardHead(['warn', 'warn', 'warn', 'warn'])).toBe('Warns only')
  expect(guardHead(['warn', 'warn', 'warn', 'warn'], s => s, 'worst')).toBe('Warns, stops the worst')
  expect(guardHead(['warn', 'warn', 'warn', 'warn'], s => s, 'maybe')).toBe('Warns, worst may stop')
  expect(guardHead(['warn', 'warn', 'warn', 'warn'], s => s, 'maybe', s => s.length < 10)).toBe('Warns')
  expect(guardHead(['hold', 'hold', 'hold', 'hold'])).toBe('All stop')
  expect(guardHead(['warn', 'hold', 'warn', 'warn'])).toBe('Mixed')
  expect(skillsHead(1)).toBe('1 used')
  expect(skillsHead(1, s => (s === '1 used' ? '1 använd' : s))).toBe('1 använd')
  expect(skillsHead(3)).toBe('3 used')
  expect(skillsHead(0)).toBe('None')
  // The summary counts what the rows show: open pull requests (no CI words), then worktrees to remove, then idle ones
  expect(prsHead({ on: false, open: 0 })).toBe('Off')
  expect(prsHead({ on: true, open: 3 })).toBe('3 open')
  expect(prsHead({ on: true, open: 0 })).toBe('None')
  expect(prsHead({ on: true, open: 0, unknown: 'look' })).toBe('Not checked')
  expect(prsHead({ on: true, open: 0, copies: { merged: 2, idle: 1 } })).toBe('2 worktrees to remove')
  expect(prsHead({ on: true, open: 0, copies: { merged: 0, idle: 1 } })).toBe('1 worktree idle')
  expect(prsHead({ on: true, open: 1, copies: { merged: 1, idle: 0 } })).toBe('1 open')
  expect(prsShortHead({ on: true, open: 0, copies: { merged: 1, idle: 0 } })).toBe('1 merged')
  expect(prsShortHead({ on: true, open: 2, copies: { merged: 1, idle: 0 } })).toBeUndefined()
  // Repeat to skill's offer is the card's lead, never "None"
  expect(skillsHead(0, s => s, true)).toBe('Repeated routine')
  expect(shipHead('ready', 0)).toBe('Ready')
  expect(shipHead('none', 0)).toBe('None')
  expect(shipHead('blocked', 4)).toBe('4 things block it')
  expect(shipHead('blocked', 1)).toBe('1 thing blocks it')
  expect(backHead(0)).toBe('None')
  expect(backHead(2)).toBe('2 open')
  expect(safetyHead({ halted: true, held: 3 })).toBe('Paused')
  // The stopped steps wait in Needs you; Safety says today's tally
  expect(safetyHead({ halted: false, held: 3 })).toBe('3 steps stopped today')
  expect(safetyHead({ halted: false, held: 1 })).toBe('1 step stopped today')
  expect(safetyHead({ halted: false, held: 0 })).toBe('All clear')
  expect(contextHead({ loud: 'heavy', goodMoment: true })).toBe('Heavy files')
  expect(contextHead({ loud: 'none', goodMoment: true })).toBe('Compact now')
  expect(contextHead({ loud: 'none', goodMoment: false })).toBe('Small')
  expect(contextHead({ loud: 'unverified', goodMoment: false })).toBe('Not checked')
  expect(contextHead({ loud: 'none', goodMoment: false, noFile: true })).toBe('No instruction file')
  expect(previewHead({ state: 'up', changed: true })).toBe('Changed')
  expect(previewHead({ state: 'none', changed: false })).toBe('None')
  expect(setupHead('conflict')).toBe('Conflict')
  expect(setupHead('none')).toBe('Up to date')
  expect(doHead({ on: true, blocks: 2 })).toBe('2 to run')
  expect(doHead({ on: false, blocks: 2 })).toBe('Off')
})

test('the dot follows the loudness: quiet ring, accent dot, amber for a problem', () => {
  expect(glanceDot('calm')).toBe('neutral')
  expect(glanceDot('normal')).toBe('accent')
  expect(glanceDot('warn')).toBe('amber')
  expect(glanceDot('urgent')).toBe('amber')
})

test('no card opens by itself, whatever it has to say; a press flips it and is remembered', () => {
  expect(glanceIsOpen([], 'proof', 'calm')).toBe(false)
  expect(glanceIsOpen([], 'proof', 'normal')).toBe(false)
  expect(glanceIsOpen([], 'proof', 'warn')).toBe(false)
  expect(glanceIsOpen([], 'safety', 'urgent')).toBe(false)
  const opened = glanceToggled([], 'proof', 'warn')
  expect(glanceIsOpen(opened, 'proof', 'warn')).toBe(true)
  expect(glanceIsOpen(glanceToggled(opened, 'proof', 'warn'), 'proof', 'warn')).toBe(false)
  const two = glanceToggled(glanceToggled(['section:Safety'], 'limit', 'normal'), 'here', 'normal')
  expect(glanceIsOpen(two, 'limit', 'normal') && glanceIsOpen(two, 'here', 'normal')).toBe(true)
  expect(two).toContain('section:Safety')
  expect(keepGlance(two)).toEqual(two.filter(k => k.startsWith('glance')))
})

test('Glance is the default look; an old stored Short or Full is kept; an open Glance card shows its Full rows', () => {
  const s = findSetting('detail')
  expect(s?.default).toBe('glance')
  expect(s?.options.map(o => o.value)).toEqual(['glance', 'simple', 'explained'])
  expect(parseDetail('glance')).toBe('simple')
  expect(parseOpenDetail('glance')).toBe('explained')
  expect(parseOpenDetail('simple')).toBe('simple')
  expect(parseOpenDetail('explained')).toBe('explained')
})

const paneProps = { title: 'Vaken', isFocused: false, bodyColumns: 60, placement: 'inline' as const, scroll: { bodyRows: 40, offset: 0, total: 40 }, view: {} }

function engine(on: On) {
  on('session.id', () => ({ value: 'test-session' }))
  on('session.model', () => ({ value: 'claude-opus-5' }))
  on('command.register', () => ({ value: { command: 'x' } }))
  on('ui.invalidate', () => ({ value: undefined }))
  on('ui.panes', () => ({ value: [] }) as never)
  on('ui.open', () => ({ value: { isPlaced: true } }) as never)
  on('process.run', () => ({ value: { exitCode: 0, stdout: '4242\n', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  on('session.end', (_$, e) => ({ sessionId: e.sessionId }))
}

const seed = (id: string, over: Record<string, unknown>) => ({ sessionId: id, cwd: `/work/${id}`, model: 'claude-opus-5', state: 'working', startedAt: NOW - 20 * MIN, updatedAt: NOW - 2000, lastEventAt: NOW - 2000, stateSince: NOW - 3 * MIN, ...over })
const ALL_SHOWN: Record<string, string> = Object.fromEntries([['cockpit:setting:look.view', 'custom'], ...Object.entries(Object.fromEntries(Object.keys(APPEARS).map(id => [`cockpit:setting:cards.${id}`, 'show'])))])
const world = (over: Record<string, unknown> = {}) => ({
  ...ALL_SHOWN,
  'cockpit:session:test-session': seed('test-session', { cwd: '/work/app', contextPercent: 38, costUsd: 1.2, fiveHourPercent: 62, fiveHourResetsAt: '2026-10-11T18:00:00Z' }),
  'cockpit:session:s2': seed('s2', { state: 'waiting', stateSince: NOW - 12 * MIN }),
  ...over,
})
const failing = {
  seq: 10,
  lastEditSeq: 5,
  edits: 3,
  files: ['/work/app/src/a.ts'],
  receipts: [{ kind: 'tests', ok: false, at: NOW - MIN, seq: 8 }],
  turnStartSeq: 0,
  turnEdits: 3,
  turnFiles: ['/work/app/src/a.ts'],
  turns: 2,
  done: [],
  doneSeen: false,
  debt: 1,
  note: [],
  messages: 2,
}

async function mount($: Parameters<Parameters<typeof test>[1]>[0], on: On, store: Record<string, unknown>) {
  forgetProjectSet()
  mock.clock(on, { now: NOW })
  // Setup done: until then the first screen shows only Start here and Needs you
  mock.store(on, { 'cockpit:firstrun': 'done', ...store })
  mock.env(on, { HOME: '/home/test' })
  engine(on)
  return $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps })
}

test('by default every card is one Glance row with its headline, and a calm card is shut', async ($, on) => {
  const ui = await mount($, on, world())
  for (const id of ['limit', 'here', 'others', 'autopilot', 'proof', 'guard', 'agents', 'computer', 'skills', 'prs', 'ship', 'back', 'safety', 'context', 'preview', 'setup', 'do']) {
    expect(await ui.find({ key: `glance-${id}` }), `${id} has no Glance row`).toBeDefined()
  }
  expect(await ui.find({ type: 'Text', text: /^(5-hour limit|5 h): 62% used( · resets \d\d:\d\d)?$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^(Working|Your turn|Idle) · \$1\.20$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: '1 your turn' })).toBeDefined()
  // The card is shut: its rows are not drawn (the headline names the limit)
  expect(await ui.find({ key: 'lt-lead-content' })).toBeUndefined()
  await ui.unmount()
})

test('the Glance dot has a shape and a word for its state, never a colour name', async ($, on) => {
  const ui = await mount($, on, world())
  const svgs = (await ui.findAll({ type: 'Svg' })) as { props: { alt?: string; source?: string } }[]
  const alts = svgs.map(x => x.props.alt)
  for (const colour of ['neutral', 'accent', 'amber']) expect(alts, `${colour} is not an alt`).not.toContain(colour)
  const calm = svgs.find(x => x.props.alt === 'OK')
  const active = svgs.find(x => x.props.alt === 'Active')
  expect(calm, 'a calm card has a dot called OK').toBeDefined()
  expect(active, 'an active card (a session waits for you) has a dot called Active').toBeDefined()
  expect(String(calm?.props.source)).toContain('fill="none"')
  expect(String(active?.props.source)).not.toContain('fill="none"')
  expect(String(active?.props.source)).not.toContain('<polygon')
  await ui.unmount()
})

test('a press opens a card under its row and a press again closes it', async ($, on) => {
  const ui = await mount($, on, world())
  expect(await ui.find({ key: 'lt-lead-content' })).toBeUndefined()
  await ui.press({ key: 'press-glance-limit-0' })
  await ui.redraw()
  expect(await ui.find({ key: 'lt-lead-content' })).toBeDefined()
  expect(await ui.find({ key: 'glance-limit' })).toBeDefined()
  await ui.press({ key: 'press-glance-limit-0' })
  await ui.redraw()
  expect(await ui.find({ key: 'lt-lead-content' })).toBeUndefined()
  await ui.unmount()
})

test('a card with a problem stays shut: its value and dot say so, a press opens it and a press shuts it', async ($, on) => {
  const ui = await mount($, on, world({ 'cockpit:proof:test-session': failing }))
  expect(await ui.find({ type: 'Text', text: '1 failed' })).toBeDefined()
  expect(await ui.find({ key: 'ol-proof:check-tests' })).toBeUndefined()
  await ui.press({ key: 'press-glance-proof-0' })
  await ui.redraw()
  expect(await ui.find({ key: 'ol-proof:check-tests' })).toBeDefined()
  await ui.press({ key: 'press-glance-proof-0' })
  await ui.redraw()
  expect(await ui.find({ key: 'ol-proof:check-tests' })).toBeUndefined()
  await ui.unmount()
})

test('an open card shows tidy rows: a label on the left, a value on the right, long sentences dim under', async ($, on) => {
  const ui = await mount($, on, world())
  await ui.press({ key: 'press-glance-limit-0' })
  await ui.press({ key: 'press-glance-here-0' })
  await ui.redraw()
  const lead = await ui.find({ key: 'lt-lead-content' })
  expect(lead).toBeDefined()
  expect(JSON.stringify(lead)).toContain('"62% used"')
  expect(JSON.stringify(lead)).toContain('"5-hour limit"')
  expect(await ui.find({ type: 'Text', text: /5-hour limit: 62% used/ })).toBeUndefined()
  expect(await ui.find({ key: 'here-ctx' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: 'State' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Context is \d+% full/ })).toBeUndefined()
  await ui.unmount()
})

test('a "Label: value" line splits into the two sides of a row, and a long value goes under it', () => {
  expect(factOf('Subscription: Max')).toEqual({ label: 'Subscription', value: 'Max', note: [] })
  expect(factOf('Battery 80%, plugged in')).toEqual({ label: 'Battery 80%, plugged in', value: '', note: [] })
  expect(factOf('Claude: 3 sessions use 4.1 GB · 2 agents running')).toEqual({ label: 'Claude', value: '', note: ['3 sessions use 4.1 GB · 2 agents running'] })
})

test('a person who chose Full keeps the full cards and no Glance row is drawn', async ($, on) => {
  const ui = await mount($, on, world({ 'cockpit:setting:detail': 'explained' }))
  expect(await ui.find({ key: 'glance-limit' })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: '5-hour limit' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: '62% used' })).toBeDefined()
  await ui.unmount()
})

// One engine per test: the two draws are counted in two tests, the second compares.
let glanceElements = 0
test('a Glance draw of the pane (counted)', async ($, on) => {
  const ui = await mount($, on, world())
  glanceElements = (await ui.findAll({})).length
  await ui.unmount()
  expect(glanceElements).toBeGreaterThan(0)
})
test('a Glance draw has fewer elements than a Full draw of the same pane', async ($, on) => {
  const ui = await mount($, on, world({ 'cockpit:setting:detail': 'explained' }))
  const full = (await ui.findAll({})).length
  await ui.unmount()
  expect(glanceElements).toBeLessThan(full)
})

test('Settings offers Glance, Short and Full', async ($, on) => {
  const ui = await mount($, on, world())
  await ui.press({ key: 'settings' })
  await ui.unmount()
  const again = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps })
  await again.press({ key: 'press-ol-section:Look and cards-0' })
  await again.redraw()
  for (const k of ['detail-glance', 'detail-simple', 'detail-explained']) expect(await again.find({ key: k }), k).toBeDefined()
  await again.unmount()
})

test('Other sessions never points at Needs you (one fact, one place): its dot is its own loudness', () => {
  const facts = (others: number, needs: number) => ({ others: { others: Array.from({ length: others }, () => ({})) }, view: { needs: Array.from({ length: needs }, () => ({})) } }) as unknown as GlanceFacts
  expect(glanceDotOf('others', facts(0, 1), 'calm')).toBe('neutral')
  expect(glanceDotOf('others', facts(1, 1), 'normal')).toBe('accent')
  expect(glanceDotOf('others', facts(0, 0), 'calm')).toBe('neutral')
  expect(glanceDotOf('agents', facts(0, 1), 'calm')).toBe('neutral')
})

test('Agents: a paused or set-up run says so; no progress is the grey dot with its words; a failure is the plain ring with its words in red (never amber, never the blue dot)', () => {
  expect(agentsHead({ running: 0, stuck: 0, total: 3, run: 'paused' })).toBe('Paused')
  expect(agentsHead({ running: 0, stuck: 0, total: 2, run: 'setup' })).toBe('Not started')
  expect(agentsHead({ running: 1, stuck: 0, total: 3, run: 'paused' })).toBe('1 running')
  expect(agentsHead({ running: 2, stuck: 1, total: 3, stuckMin: 11 })).toBe('No progress for 11 min')
  expect(agentsHead({ running: 2, stuck: 1, total: 3, stuckMin: 11, failed: 1 })).toBe('1 failed')
  expect(agentsShort({ running: 2, stuck: 1, total: 3 })).toBe('No progress')
  expect(agentsShort({ running: 0, stuck: 0, total: 3, run: 'paused' })).toBe('Paused')
  expect(agentsShort({ running: 0, stuck: 0, total: 3 })).toBeUndefined()
  // "None here" keeps a word where it does not fit
  expect(agentsShort({ running: 0, stuck: 0, total: 0, others: 2 })).toBe('None')
  const facts = (head: Record<string, unknown>) => ({ agents: { head: { running: 1, stuck: 0, total: 1, ...head } }, others: { others: [] }, view: { needs: [] } }) as unknown as GlanceFacts
  expect(glanceDotOf('agents', facts({ stuck: 1, stuckMin: 11 }), 'warn')).toBe('neutral')
  expect(glanceWordOf('agents', facts({ stuck: 1, stuckMin: 11 }), 'warn')).toEqual({ word: 'No progress for 11 min', short: 'No progress' })
  expect(glanceDotOf('agents', facts({ failed: 1 }), 'warn')).toBe('neutral')
  expect(glanceWordOf('agents', facts({ failed: 1 }), 'warn')).toEqual({ word: '1 failed', short: 'Failed', failed: true })
  expect(glanceDotOf('agents', facts({}), 'normal')).toBe('accent')
})
