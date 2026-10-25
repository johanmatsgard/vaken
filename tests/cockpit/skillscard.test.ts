// The Skills card on the home pane: drawn from the stored counts and skill list, its three looks, a press that starts a skill.
import { expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'

import { setLang } from '../hooks/core/lang'
import { FIND_PAUSE_MS, SKILLS_COUNTS_KEY, SKILLS_LISTING_KEY, UNUSED_FOLD } from '../hooks/core/skills'
import { lineCard } from '../hooks/features/home/linecards'
import type { CardCtx } from '../hooks/features/home/linecards'
import { CARD_IDS, LINE_CARD_IDS, parseOrder } from '../hooks/features/home/logic'
import { SETTINGS } from '../hooks/core/settings'
import { SLOW, test } from './slow'

const NOW = new Date(2026, 9, 10, 14, 0).getTime()
const counts = { '2026-10-09': { grilling: 4, 'code-review': 1 }, '2026-10-10': { grilling: 2, 'code-review': 2 } }
const listing = { at: NOW - 60_000, total: 5, included: 5, tokens: 2100, names: ['grilling', 'code-review', 'unused-one', 'unused-two'] }
const ctx = (over: Partial<CardCtx> = {}): CardCtx => ({ now: NOW, ledger: [], halted: false, modes: {}, ...over })

const sectionLabel = async (ui: { find: (q: unknown) => Promise<unknown>; findAll: (q: unknown) => Promise<unknown[]> }, re: RegExp): Promise<unknown> =>
  (await ui.find({ type: 'Text', text: re })) ?? ((await ui.findAll({ type: 'Svg' })) as { props: { alt?: string } }[]).find(x => re.test(x.props.alt ?? ''))

test('the card is a line card, shown by default, with its own Show or Hide and its own level; a saved order gets it at the end', () => {
  expect(LINE_CARD_IDS).toContain('skills')
  expect(CARD_IDS).toContain('skills')
  const kept = 'limit,here,others,autopilot,proof,guard,agents,computer'.split(',')
  expect(parseOrder(kept.join(','))).toEqual([...kept, ...CARD_IDS.filter(id => !kept.includes(id))])
  expect(parseOrder(kept.join(',')).slice(kept.length)).toContain('skills')
  const row = SETTINGS.find(s => s.key === 'cards.skills')
  expect(row?.label).toBe('Skills')
  expect(row?.default).toBe('auto')
  expect((row?.note ?? '').split(' ').length).toBeLessThanOrEqual(12)
  expect(SETTINGS.find(s => s.key === 'detail.skills')?.hidden).toBe(true)
})

test('the three looks: groups by use with the press word, the short line, an honest line when nothing is known', () => {
  const v = lineCard('skills', ctx({ skills: { counts, listing } }))
  expect(v.title).toBe('Skills')
  expect(v.short).toBe('Top: grilling · 6 times, code review · 3 times')
  const g = v.groups ?? []
  expect(g.map(x => x.head)).toEqual(['Used this week', 'Skill list', 'Not used this week'])
  expect(g[0]?.rows.map(r => [r.title, r.right, r.action])).toEqual([
    ['grilling', '6 times · Start', { kind: 'skill', name: 'grilling' }],
    ['code review', '3 times · Start', { kind: 'skill', name: 'code-review' }],
  ])
  // The listing says 5 skills but names 4 (the built-in one is left out), so the figure says "2 of 4"; the counts cover 2 days.
  expect(g[1]?.rows[0]?.title).toBe('5 skills listed, 2.1k tokens; 2 of 4 not used this week; counted for 2 days')
  expect(g[1]?.rows[0]?.action).toBeUndefined()
  expect(g[2]?.rows.map(r => [r.title, r.action])).toEqual([
    ['unused one', undefined],
    ['unused two', undefined],
  ])
  const none = lineCard('skills', ctx())
  expect(none.groups).toBeUndefined()
  expect(none.lines).toEqual(['No skill used this week'])
  expect(none.short).toBe('No skill used this week')
})

const paneProps = { title: 'Vaken', isFocused: false, bodyColumns: 120, placement: 'inline' as const, scroll: { bodyRows: 60, offset: 0, total: 60 }, view: {} }

function engine(on: On, onInvalidate: () => void = () => undefined) {
  on('session.id', () => ({ value: 'test-session' }))
  on('session.model', () => ({ value: 'claude-opus-5' }))
  on('command.register', () => ({ value: { command: 'x' } }))
  on('ui.invalidate', () => {
    onInvalidate()
    return { value: undefined }
  })
  on('ui.panes', () => ({ value: [] }) as never)
  on('ui.open', () => ({ value: { isPlaced: true } }) as never)
  on('process.run', () => ({ value: { exitCode: 0, stdout: '4242\n', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  on('session.end', (_$, e) => ({ sessionId: e.sessionId }))
}

function memStore(on: On, seed: Record<string, unknown>): Map<string, unknown> {
  const mem = new Map<string, unknown>(Object.entries({ 'cockpit:setting:look.view': 'custom', 'cockpit:setting:detail': 'explained', ...seed }))
  on('store.get', (_$, e) => ({ value: mem.get(e.key) }) as never)
  on('store.set', (_$, e) => {
    mem.set(e.key, e.value)
    return { value: undefined } as never
  })
  on('store.delete', (_$, e) => {
    mem.delete(e.key)
    return { value: undefined } as never
  })
  on('store.keys', () => ({ value: [...mem.keys()] }) as never)
  return mem
}

const world = (over: Record<string, unknown> = {}) => ({
  'cockpit:firstrun': 'done',
  'cockpit:session:test-session': { sessionId: 'test-session', cwd: '/work/app', model: 'm', state: 'idle', startedAt: NOW - 1000, updatedAt: NOW, lastEventAt: NOW, stateSince: NOW },
  [SKILLS_COUNTS_KEY]: counts,
  [SKILLS_LISTING_KEY]: listing,
  ...over,
})

const toastsOf = (on: On): string[] => {
  const toasts: string[] = []
  on('ui.toast', (_$, e) => {
    toasts.push((e as { text: string }).text)
    return { value: undefined } as never
  })
  return toasts
}

test('the pane draws the card from the store on the desktop and in a terminal, its groups at Full', SLOW, async ($, on) => {
  mock.clock(on, { now: NOW })
  memStore(on, world())
  mock.env(on, { HOME: '/home/test' })
  engine(on)
  for (const surface of ['desktop', 'terminal'] as const) {
    const ui = await $.ui.mount({ plugin: 'vaken', surface, component: 'Pane', requestId: 'cockpit-home', props: paneProps })
    expect(await ui.find({ type: 'Text', text: /^Skills$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^grilling$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^grilling$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^6 times · Start$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^5 skills listed$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^2\.1k tokens$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^2 of 4 not used this week; counted for 2 days$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^unused one$/ })).toBeDefined()
    expect(await ui.find({ key: 'detail-skills' })).toBeDefined()
    await ui.unmount()
  }
})

test('Short shows one line, and a stored Minimal draws as Short; the card hides with cards.skills and then its store keys are not read', async ($, on) => {
  mock.clock(on, { now: NOW })
  const reads: string[] = []
  const mem = new Map<string, unknown>(Object.entries(world({ 'cockpit:setting:look.view': 'custom', 'cockpit:setting:detail': 'explained', 'cockpit:setting:detail.skills': 'simple' })))
  on('store.get', (_$, e) => {
    reads.push(e.key)
    return { value: mem.get(e.key) } as never
  })
  on('store.set', (_$, e) => {
    mem.set(e.key, e.value)
    return { value: undefined } as never
  })
  on('store.delete', (_$, e) => {
    mem.delete(e.key)
    return { value: undefined } as never
  })
  on('store.keys', () => ({ value: [...mem.keys()] }) as never)
  mock.env(on, { HOME: '/home/test' })
  engine(on)
  const mount = () => $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps })
  const short = await mount()
  expect(await short.find({ type: 'Text', text: /^Top: grilling · 6 times, code review · 3 times$/ })).toBeDefined()
  expect(await sectionLabel(short, /^Used this week$/)).toBeUndefined()
  await short.unmount()
  mem.set('cockpit:setting:detail.skills', 'minimal')
  const minimal = await mount()
  expect(await minimal.find({ type: 'Text', text: /^Top: grilling · 6 times, code review · 3 times$/ })).toBeDefined()
  await minimal.unmount()
  mem.set('cockpit:setting:cards.skills', 'hide')
  reads.length = 0
  const hidden = await mount()
  expect(await hidden.find({ type: 'Text', text: /^Skills$/ })).toBeUndefined()
  expect(reads.filter(k => k === SKILLS_COUNTS_KEY || k === SKILLS_LISTING_KEY)).toEqual([])
  await hidden.unmount()
})

test('a press on a skill row starts that skill as a command and says so; a press on the memory line starts nothing', async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  memStore(on, world())
  mock.env(on, { HOME: '/home/test' })
  engine(on)
  const toasts = toastsOf(on)
  const ran: string[] = []
  on('command.run', { command: 'grilling' }, (_$, e) => {
    ran.push(`${e.command}|${e.args}`)
    return { text: '' }
  })
  const ui = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps })
  await ui.press({ key: 'press-ol-skills:skill-grilling-0' })
  await clock.settle()
  expect(ran).toEqual(['grilling|'])
  expect(toasts).toContain('Started /grilling')
  await ui.press({ key: 'press-ol-skills:cost-0' })
  await clock.settle()
  expect(ran).toEqual(['grilling|'])
  await ui.unmount()
})

test('when the skill cannot be started from the pane, the toast says to type it in the chat, in Swedish too', async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  memStore(on, world({ 'cockpit:setting:look.language': 'sv' }))
  mock.env(on, { HOME: '/home/test' })
  engine(on)
  const toasts = toastsOf(on)
  on('command.run', { command: 'code-review' }, () => {
    throw new Error('refused')
  })
  try {
    const ui = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps })
    expect(await ui.find({ type: 'Text', text: /^Färdigheter$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^grilling$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^6 gånger · Starta$/ })).toBeDefined()
    await ui.press({ key: 'press-ol-skills:skill-code-review-0' })
    await clock.settle()
    expect(toasts).toContain('Kunde inte starta /code-review härifrån. Skriv /code-review i sessionen.')
    await ui.unmount()
  } finally {
    setLang('en')
  }
})

const commands = [
  { name: 'grilling', description: 'Grill the user about a plan', source: 'plugin', plugin: 'a' },
  { name: 'code-review', description: 'Review the current diff for bugs', source: 'plugin', plugin: 'a' },
  { name: 'review-plan', description: 'Check a plan before building', source: 'plugin', plugin: 'a' },
  { name: 'compact', description: 'Shorten the session', source: 'builtin' },
  ...Array.from({ length: 6 }, (_, n) => ({ name: `many-${n}`, description: 'one of a long list', source: 'user' })),
]

const box = { key: 'skills-find-box' }
type Mounted = { input: (a: { key: string; text: string; kind: 'change' | 'submit' }) => Promise<void>; redraw: () => Promise<void> }
type Ticks = { advance: (ms: number) => Promise<void>; settle: () => Promise<void> }
async function typeInto(ui: Mounted, clock: Ticks, text: string): Promise<void> {
  await ui.input({ ...box, text, kind: 'change' })
  await clock.advance(FIND_PAUSE_MS)
  await clock.settle()
  await ui.redraw()
}

test('the search box types into the card: matches replace the groups, a press starts the match, an empty box shows the card again', async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  const mem = memStore(on, world())
  mock.env(on, { HOME: '/home/test' })
  let redraws = 0
  engine(on, () => {
    redraws += 1
  })
  let listed = 0
  on('command.list', () => {
    listed += 1
    return { value: commands } as never
  })
  const ran: string[] = []
  on('command.run', { command: 'code-review' }, (_$, e) => {
    ran.push(`${e.command}|${e.args}`)
    return { text: '' }
  })
  const toasts = toastsOf(on)
  const ui = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps })
  // The box is there, the groups too, and nothing was read from the engine yet.
  expect(await ui.find(box)).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^grilling$/ })).toBeDefined()
  expect(listed).toBe(0)
  const before = JSON.stringify([...mem.entries()])
  const redrawsBefore = redraws
  await ui.input({ ...box, text: 'rev', kind: 'change' })
  await ui.input({ ...box, text: 'review', kind: 'change' })
  expect(redraws).toBe(redrawsBefore)
  expect(listed).toBe(0)
  await clock.advance(FIND_PAUSE_MS)
  await clock.settle()
  expect(redraws).toBe(redrawsBefore + 1)
  await ui.redraw()
  expect(listed).toBe(1)
  expect(JSON.stringify([...mem.entries()])).toBe(before)
  expect(await ui.find({ type: 'Text', text: /^\/code-review$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^Review the current diff for bugs$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^3 times · Start$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^\/review-plan$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^Start$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^\/compact$/ })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /^grilling$/ })).toBeUndefined()
  await ui.press({ key: 'press-ol-skills:find-code-review-0' })
  await clock.settle()
  expect(ran).toEqual(['code-review|'])
  expect(toasts).toContain('Started /code-review')
  await typeInto(ui, clock, 'grill')
  expect(listed).toBe(1)
  expect(await ui.find({ type: 'Text', text: /^\/grilling$/ })).toBeDefined()
  await typeInto(ui, clock, 'zzzz')
  expect(await ui.find({ type: 'Text', text: /^No skill or command matches\.$/ })).toBeDefined()
  await typeInto(ui, clock, '')
  expect(await ui.find({ type: 'Text', text: /^grilling$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^No skill or command matches\.$/ })).toBeUndefined()
  expect(listed).toBe(1)
  await ui.unmount()
})

test('a long list of matches shows five and Show N more, which opens the rest; Find reads the engine list again', async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  memStore(on, world())
  mock.env(on, { HOME: '/home/test' })
  engine(on)
  let listed = 0
  on('command.list', () => {
    listed += 1
    return { value: commands } as never
  })
  const ui = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps })
  await typeInto(ui, clock, 'many')
  expect(await ui.find({ type: 'Text', text: /^\/many-4$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^\/many-5$/ })).toBeUndefined()
  expect(await ui.find({ key: 'morel-skills-find' })).toBeDefined()
  await ui.press({ key: 'morel-skills-find' })
  await clock.settle()
  await ui.redraw()
  expect(await ui.find({ type: 'Text', text: /^\/many-5$/ })).toBeDefined()
  await ui.input({ ...box, text: 'many', kind: 'submit' })
  await clock.settle()
  expect(listed).toBe(2)
  await ui.unmount()
})

test('where the engine cannot list commands the search says so, in Swedish too', async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  memStore(on, world({ 'cockpit:setting:look.language': 'sv' }))
  mock.env(on, { HOME: '/home/test' })
  engine(on)
  on('command.list', () => {
    throw new Error('no list')
  })
  try {
    const ui = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps })
    expect(await ui.find(box)).toBeDefined()
    await typeInto(ui, clock, 'x')
    expect(await ui.find({ type: 'Text', text: /^Kommandona gick inte att läsa\.$/ })).toBeDefined()
    await ui.unmount()
  } finally {
    setLang('en')
  }
})

test('on the phone there is no search box and the card still draws; Short has none either', async ($, on) => {
  mock.clock(on, { now: NOW })
  const mem = memStore(on, world())
  mock.env(on, { HOME: '/home/test' })
  engine(on)
  const mobile = await $.ui.mount({ plugin: 'vaken', surface: 'mobile', component: 'Pane', requestId: 'cockpit-home', props: paneProps })
  expect(await mobile.find({ type: 'Text', text: /^grilling$/ })).toBeDefined()
  expect(await mobile.find(box)).toBeUndefined()
  await mobile.unmount()
  mem.set('cockpit:setting:detail.skills', 'simple')
  const short = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps })
  expect(await short.find(box)).toBeUndefined()
  await short.unmount()
})

const manyListing = { at: NOW - 60_000, total: 40, included: 40, tokens: 9000, names: ['grilling', 'code-review', ...Array.from({ length: 38 }, (_, n) => `idle-${String(n).padStart(2, '0')}`)] }

test('the unused group holds back all but UNUSED_FOLD names behind a fold, and a short list has no fold', () => {
  const v = lineCard('skills', ctx({ skills: { counts, listing: manyListing } }))
  const unused = (v.groups ?? []).find(g => g.head === 'Not used this week')
  expect(unused?.fold).toEqual({ id: 'unused', shown: UNUSED_FOLD, more: 38 - UNUSED_FOLD })
  expect(unused?.rows.length).toBe(38)
  expect(unused?.rows.some(r => r.title.startsWith('and '))).toBe(false)
  const few = lineCard('skills', ctx({ skills: { counts, listing } }))
  expect((few.groups ?? []).find(g => g.head === 'Not used this week')?.fold).toBeUndefined()
  expect(few.blurb).toBe('')
})

test('the pane shows three unused names and Show 35 more; a press opens the rest and Show fewer folds them again', async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  memStore(on, world({ [SKILLS_LISTING_KEY]: manyListing }))
  mock.env(on, { HOME: '/home/test' })
  engine(on)
  const ui = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps })
  const names = (await Promise.all(Array.from({ length: 12 }, async (_, n) => ((await ui.find({ type: 'Text', text: new RegExp(`^idle ${String(n).padStart(2, '0')}$`) })) === undefined ? 0 : 1) as number))).reduce((a, b) => a + b, 0)
  expect(names).toBe(UNUSED_FOLD)
  expect(await ui.find({ key: 'morel-skills-unused' })).toBeDefined()
  await ui.press({ key: 'morel-skills-unused' })
  await clock.settle()
  await ui.redraw()
  expect(await ui.find({ type: 'Text', text: new RegExp(`^idle 07$`) })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^idle 37$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^and \d+ more$/ })).toBeUndefined()
  await ui.press({ key: 'morel-skills-unused' })
  await clock.settle()
  await ui.redraw()
  expect(await ui.find({ type: 'Text', text: new RegExp(`^idle 07$`) })).toBeUndefined()
  await ui.unmount()
})
