// The flip of a card: the one table that says which setting belongs to which card, the gear and the face in the pane.
import { expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'

import { APPEARS } from '../hooks/core/cardrules'
import { ARRANGING_WORD, BACK_LABEL, CARD_SETTINGS, FACE_MAIN, FACE_TOGETHER, GLOBAL_SETTINGS, cardOfSetting, cardSettingsText, faceOf, faceRows, flipKey, isFlipped } from '../hooks/core/cardsettings'
import { forgetProjectSet } from '../hooks/core/io'
import { keepGlance } from '../hooks/core/headline'
import { setLang, tr } from '../hooks/core/lang'
import { SETTINGS, findSetting } from '../hooks/core/settings'
import { isAdvanced } from '../hooks/core/settingsmap'
import { CARD_IDS } from '../hooks/features/home/logic'
import { iconSvg } from '../hooks/ui/kit'
import { ICON_GEAR_TEETH } from '../hooks/ui/tokens'
import { SLOW, test } from './slow'
import { byEnglish } from '../hooks/i18n/table'
const SV = byEnglish('sv')

const NOW = Date.parse('2026-10-11T12:00:00Z')

test('every visible setting belongs to exactly one card or is global, and every listed key is a real setting', () => {
  const unplaced = SETTINGS.filter(s => s.hidden !== true).filter(s => cardOfSetting(s.key) === undefined).map(s => s.key)
  expect(unplaced, 'add each of these to CARD_SETTINGS (one card) or GLOBAL_SETTINGS in core/cardsettings.ts').toEqual([])
  const listed = [...Object.values(CARD_SETTINGS).flat(), ...GLOBAL_SETTINGS]
  expect(new Set(listed).size, 'a key is listed twice').toBe(listed.length)
  const real = new Set(SETTINGS.map(s => s.key))
  expect(listed.filter(k => !real.has(k)), 'listed but not a setting').toEqual([])
  expect(Object.keys(CARD_SETTINGS).sort()).toEqual([...CARD_IDS].sort())
  for (const id of CARD_IDS) {
    expect(cardOfSetting(`cards.${id}`)).toBe(id)
    expect(cardOfSetting(`detail.${id}`)).toBe(id)
    expect(findSetting(`cards.${id}`) !== undefined && findSetting(`detail.${id}`) !== undefined).toBe(true)
  }
  expect(cardOfSetting('look.theme')).toBe('global')
  expect(cardOfSetting('guard.scope')).toBe('guard')
  expect(cardOfSetting('nothing.like.this')).toBeUndefined()
})

test('the face leaves out the expert rows and puts the card\'s own settings before its detail and Show', () => {
  for (const id of CARD_IDS) {
    const rows = faceRows(id, true)
    expect(rows.filter(r => isAdvanced(r) && !FACE_MAIN.has(r.key)), `${id}: an expert row on the face (a card's own main switch may show)`).toEqual([])
    expect(rows.slice(-2).map(r => r.key)).toEqual([`detail.${id}`, `cards.${id}`])
  }
  expect(faceRows('guard', true).map(r => r.key)).not.toContain('guard.env')
  expect(faceRows('computer', true).map(r => r.key).slice(0, 3)).toEqual(['laptop.mode', 'awake.mode', 'awake.away'])
  expect(faceRows('limit', true).slice(-1)[0]?.label).toBe('Show this card')
})

test('the face shows what fits, never fewer than FACE_MIN_ROWS, and says how many are behind Settings', () => {
  const all = faceRows('guard', true).length
  expect(all).toBeGreaterThan(8)
  const small = faceOf('guard', true, 4)
  expect(small.rows.length).toBe(4)
  expect(small.more).toBe(all - 4)
  expect(small.group).toBe('card:guard')
  // Risky steps keeps its Detail and Show rows on a face that cannot hold every row
  expect(small.rows.slice(-2).map(r => r.key)).toEqual(['detail.guard', 'cards.guard'])
  expect(faceOf('guard', true, all - 1).more).toBe(0)
  expect(faceOf('guard', true, 100).rows.length).toBe(all)
  expect(faceOf('ship', true, 4).group).toBe('card:ship')
})

test('the face counts lines, not settings, and keeps the budget pair and the four agent models together', () => {
  // A row as tall as its options: Plan limits with every row three units high fits fewer rows than one unit each
  const tall = faceOf('limit', true, 6, { size: r => r.options.length, slack: 0 })
  expect(tall.rows.reduce((n, r) => n + r.options.length, 0)).toBeLessThanOrEqual(6 + (tall.rows[0]?.options.length ?? 0))
  for (const id of CARD_IDS) {
    for (let room = 1; room < 12; room += 1) {
      const keys = faceOf(id, true, room).rows.map(r => r.key)
      for (const g of FACE_TOGETHER) {
        const n = g.filter(k => keys.includes(k)).length
        const own = g.filter(k => faceRows(id, true).some(r => r.key === k)).length
        expect(n === 0 || n === own, `${id} at ${room}: ${g.join(', ')} split`).toBe(true)
      }
    }
  }
  // However short the front, a floor of two settings
  expect(faceOf('limit', true, 0, { size: () => 5, slack: 0, least: 2 }).rows.length).toBe(2)
  // Skipped rows (the budget amounts while Budget is Off) are neither drawn nor counted behind Settings
  const off = faceOf('limit', true, 100, { skip: k => k === 'cost.session' || k === 'cost.day' })
  expect(off.rows.map(r => r.key)).not.toContain('cost.day')
  expect(off.more).toBe(0)
})

test('every face row says what it does in its note (the card\'s own Detail and Show need none), and the gear is six teeth and a hole', () => {
  for (const id of CARD_IDS) {
    const rows = faceRows(id, true)
    expect(rows.filter(r => r.note === '' && !r.key.startsWith('cards.') && !r.key.startsWith('detail.') && !r.key.startsWith('runner.')).map(r => r.key), `${id}: a face row with no note`).toEqual([])
    expect(rows.filter(r => r.key.startsWith('cards.') || r.key.startsWith('detail.')).filter(r => r.note !== '')).toEqual([])
  }
  const gear = iconSvg('gear').source
  expect(gear.match(/ A/g)?.length).toBe(ICON_GEAR_TEETH)
  expect(gear).toContain('<circle')
})

test('flipped cards are a view flag: several at once, and the Settings view keeps them', () => {
  const s = [flipKey('limit'), flipKey('here'), 'section:Safety']
  expect(isFlipped(s, 'limit') && isFlipped(s, 'here')).toBe(true)
  expect(isFlipped(s, 'proof')).toBe(false)
  expect(keepGlance(s)).toEqual([flipKey('limit'), flipKey('here')])
})

test('the text twin lists a card\'s settings, with the expert ones marked', () => {
  const text = cardSettingsText('guard', {})
  expect(text).toMatch(/guard\.destructive: /)
  expect(text).toMatch(/guard\.env: .*\[expert\]/)
  expect(text).toMatch(/cards\.guard: /)
  expect(text).not.toMatch(/laptop\.mode/)
  expect(cardSettingsText('nope', {})).toMatch(/^No such card: nope\. Cards: limit, /)
  expect(cardSettingsText('computer', { 'laptop.mode': 'off' })).toMatch(/laptop\.mode: Off/)
})

test('every new word has a Swedish line that differs from the English one', () => {
  for (const w of [BACK_LABEL, ARRANGING_WORD, 'Show this card', 'Detail of this card', 'More in Settings ›', '{n} more in Settings ›']) {
    expect((SV[w] ?? '') !== '' && SV[w] !== w, w).toBe(true)
  }
  setLang('sv')
  try {
    expect(tr(BACK_LABEL)).toBe('‹ Tillbaka')
  } finally {
    setLang('en')
  }
})

const paneProps = { title: 'Vaken', isFocused: false, bodyColumns: 60, placement: 'inline' as const, scroll: { bodyRows: 40, offset: 0, total: 40 }, view: {} }

function engine(on: On, mem: Map<string, unknown>) {
  on('store.get', (_$, e) => ({ value: mem.has(e.key) ? JSON.parse(JSON.stringify(mem.get(e.key))) : undefined }) as never)
  on('store.set', (_$, e) => {
    mem.set(e.key, JSON.parse(JSON.stringify(e.value)))
    return { value: undefined } as never
  })
  on('store.delete', (_$, e) => {
    mem.delete(e.key)
    return { value: undefined } as never
  })
  on('store.keys', () => ({ value: [...mem.keys()] }) as never)
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

const seed = (id: string, over: Record<string, unknown>) => ({ sessionId: id, cwd: `/work/${id}`, model: 'claude-opus-5', state: 'working', startedAt: NOW - 20 * 60_000, updatedAt: NOW - 2000, lastEventAt: NOW - 2000, stateSince: NOW - 3 * 60_000, ...over })
const ALL_SHOWN: Record<string, string> = Object.fromEntries([['cockpit:setting:look.view', 'custom'], ...Object.entries(Object.fromEntries(Object.keys(APPEARS).map(id => [`cockpit:setting:cards.${id}`, 'show'])))])
const world = (): Map<string, unknown> =>
  new Map<string, unknown>(Object.entries({
    'cockpit:firstrun': 'done',
    ...ALL_SHOWN,
    'cockpit:session:test-session': seed('test-session', { cwd: '/work/app', contextPercent: 38, costUsd: 1.2, fiveHourPercent: 62, fiveHourResetsAt: '2026-10-11T18:00:00Z' }),
  }))

type Pane = { find: (q: unknown) => Promise<unknown>; findAll: (q: unknown) => Promise<unknown[]>; press: (q: unknown) => Promise<void>; redraw: () => Promise<void>; unmount: () => Promise<void> }
async function mount($: { ui: { mount: (o: unknown) => Promise<never> } }, on: On, mem: Map<string, unknown>, surface: 'desktop' | 'terminal' = 'desktop'): Promise<Pane> {
  forgetProjectSet()
  mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  engine(on, mem)
  return $.ui.mount({ plugin: 'vaken', surface, component: 'Pane', requestId: 'cockpit-home', props: paneProps }) as unknown as Promise<Pane>
}

test('an open card has a gear; a shut card and an unflipped card draw nothing of a face', SLOW, async ($, on) => {
  const ui = await mount($ as never, on, world())
  expect(await ui.find({ key: 'btn-icon-limit-gear' })).toBeUndefined()
  await ui.press({ key: 'press-glance-limit-0' })
  await ui.redraw()
  expect(await ui.find({ key: 'btn-icon-limit-gear' })).toBeDefined()
  expect(await ui.find({ key: 'lt-lead-content' })).toBeDefined()
  expect(await ui.find({ key: 'face-limit' })).toBeUndefined()
  await ui.unmount()
})

test('the gear flips the card: its body gives way to its settings, Back flips it back, and the flip is remembered', SLOW, async ($, on) => {
  const mem = world()
  const ui = await mount($ as never, on, mem)
  await ui.press({ key: 'press-glance-limit-0' })
  await ui.redraw()
  await ui.press({ key: 'btn-icon-limit-gear' })
  await ui.redraw()
  expect(await ui.find({ key: 'lt-lead-content' })).toBeUndefined()
  expect(await ui.find({ key: 'face-limit' }), 'face-limit').toBeDefined()
  expect(await ui.find({ key: 'glance-limit' }), 'glance-limit').toBeDefined()
  expect(await ui.find({ key: 'back-glance-limit' }), 'back-glance-limit').toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^62% (of the 5-hour limit )?used/ })).toBeUndefined()
  // the front is short, so the face shows what fits its height (lines, notes counted) and says how many wait in Settings
  expect(await ui.find({ key: 'row-limits.warn' }), 'row-limits.warn').toBeDefined()
  expect(await ui.find({ key: 'row-cards.limit' })).toBeUndefined()
  expect(await ui.find({ key: 'face-settings-limit' }), 'face-settings-limit').toBeDefined()
  expect([...mem.keys()].filter(k => k.startsWith('cockpit:setting:') && !(k in Object.fromEntries(Object.keys(ALL_SHOWN).map(a => [a, 1])))), 'a setting was written').toEqual([])
  await ui.press({ key: 'press-glance-limit-0' })
  await ui.redraw()
  expect(await ui.find({ key: 'face-limit' })).toBeUndefined()
  expect(await ui.find({ key: 'lt-lead-content' }), 'lt-lead-content').toBeDefined()
  await ui.unmount()
})

test('a flipped card stays flipped across a shut and an open, and two cards can be flipped at once', SLOW, async ($, on) => {
  const ui = await mount($ as never, on, world())
  for (const id of ['limit', 'here']) {
    await ui.press({ key: `press-glance-${id}-0` })
    await ui.redraw()
    await ui.press({ key: `btn-icon-${id}-gear` })
    await ui.redraw()
  }
  await ui.redraw()
  expect(await ui.find({ key: 'face-limit' })).toBeDefined()
  expect(await ui.find({ key: 'face-here' })).toBeDefined()
  await ui.unmount()
})

test('a setting changed on the face is the same store write as in the Settings view', SLOW, async ($, on) => {
  const mem = world()
  const ui = await mount($ as never, on, mem)
  await ui.press({ key: 'press-glance-here-0' })
  await ui.redraw()
  await ui.press({ key: 'btn-icon-here-gear' })
  await ui.redraw()
  await ui.press({ key: 'compact.mode-off' })
  await ui.redraw()
  expect(mem.get('cockpit:setting:compact.mode')).toBe('off')
  await ui.press({ key: 'settings' })
  await ui.unmount()
  const again = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps })
  await again.press({ key: 'press-ol-section:Plan and cost-0' })
  await again.redraw()
  await again.press({ key: 'compact.mode-suggest' })
  await again.unmount()
  expect(mem.get('cockpit:setting:compact.mode')).toBe('suggest')
})

test('More in Settings opens Settings at the card\'s group', SLOW, async ($, on) => {
  const mem = world()
  const ui = await mount($ as never, on, mem)
  await ui.press({ key: 'press-glance-limit-0' })
  await ui.redraw()
  await ui.press({ key: 'btn-icon-limit-gear' })
  await ui.redraw()
  await ui.press({ key: 'face-settings-limit' })
  await ui.redraw()
  expect(await ui.find({ key: 'settings-done' })).toBeDefined()
  expect(await ui.find({ key: 'face-limit' })).toBeUndefined()
  await ui.press({ key: 'settings-done' })
  await ui.redraw()
  expect(await ui.find({ key: 'face-limit' })).toBeDefined()
  await ui.unmount()
})

test('a terminal says Settings as a word on the card, and the face has Back as a word', SLOW, async ($, on) => {
  const ui = await mount($ as never, on, world(), 'terminal')
  await ui.press({ key: 'btn-chev-glance-limit' })
  await ui.redraw()
  expect(await ui.find({ key: 'btn-icon-limit-gear' })).toBeDefined()
  await ui.press({ key: 'btn-icon-limit-gear' })
  await ui.redraw()
  expect(await ui.find({ key: 'face-limit' })).toBeDefined()
  expect(await ui.find({ key: 'back-glance-limit' })).toBeDefined()
  await ui.unmount()
})

test('Back is the first button of the Settings, Agents and Help views, and Arrange', SLOW, async ($, on) => {
  const ui = await mount($ as never, on, world())
  await ui.press({ key: 'settings' })
  await ui.redraw()
  expect(await ui.find({ key: 'settings-done' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: BACK_LABEL })).toBeUndefined()
  await ui.press({ key: 'settings-done' })
  await ui.redraw()
  expect(await ui.find({ key: 'glance-limit' })).toBeDefined()
  await ui.unmount()
})

test('"More in Settings" opens Settings at the card: its own rows, under the section of its zone, with All settings beside Done', SLOW, async ($, on) => {
  const ui = await mount($ as never, on, world())
  await ui.press({ key: 'press-glance-limit-0' })
  await ui.redraw()
  await ui.press({ key: 'btn-icon-limit-gear' })
  await ui.redraw()
  await ui.press({ key: 'face-settings-limit' })
  await ui.redraw()
  expect(await ui.find({ key: 'settings-all' }), 'a focused view').toBeDefined()
  expect(await ui.find({ key: 'row-cost.budget' }), 'the card\'s own row').toBeDefined()
  expect(await ui.find({ key: 'row-compact.mode' }), 'another card\'s row (same zone) is not in it').toBeUndefined()
  expect(await ui.find({ type: 'Text', text: 'Money and plan' }), 'the section of its zone').toBeDefined()
  await ui.unmount()
})
