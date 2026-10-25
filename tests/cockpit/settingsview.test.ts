// The Settings view in sections: the modes at the top, the counts line, a state chip on every row, the Advanced fold.
import { expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'

import { MODES, PRESETS, findPreset, modeNow } from '../hooks/core/presets'
import { ADVANCED_SECTION, SECTIONS, SETTINGS, checkRegistry, defaults, focusRows, rowsFor, sectionOf, sectionRows, settingsText } from '../hooks/core/settings'
import { ADVANCED_KEYS, COUNT_CHIP, SECTION_TABLE, ZONE_SECTION, cardFocus, chipWord, focusOfSetting, sectionOfSetting, tally, toneOf, viewLocksRow } from '../hooks/core/settingsmap'
import { CARD_SETTINGS, GLOBAL_SETTINGS, listedCardOf } from '../hooks/core/cardhome'
import { faceOf, isSpending } from '../hooks/core/cardsettings'
import { baselineOf, changedBySection, isChanged } from '../hooks/core/changed'
import { ZONES, ZONE_OF } from '../hooks/features/home/logic'
import type { CardId } from '../hooks/features/home/logic'
import { setLang, tr } from '../hooks/core/lang'
import { SLOW, test } from './slow'
import { byEnglish } from '../hooks/i18n/table'
const SV = byEnglish('sv')

const NOW = new Date(2026, 9, 11, 9, 0).getTime()

test('the table: every shown row has a section (its card\'s zone, or one that names its group), and a note in 16 words or fewer; every expert key is a real row', () => {
  const named = new Set(SECTION_TABLE.flatMap(s => s.groups))
  const shown = SETTINGS.filter(s => s.hidden !== true)
  for (const s of shown) {
    expect(listedCardOf(s.key) !== undefined || named.has(s.group), `${s.key}: no card lists it and group "${s.group}" is in no section`).toBe(true)
    expect(s.note.trim(), `${s.key}: no note`).not.toBe('')
    expect(s.note.split(/\s+/).length, `${s.key}: note too long`).toBeLessThanOrEqual(16)
  }
  expect(checkRegistry()).toEqual([])
  const keys = new Set(SETTINGS.map(s => s.key))
  for (const k of ADVANCED_KEYS) expect(keys.has(k), `${k} is not a setting`).toBe(true)
  for (const sec of SECTION_TABLE) if (sec.jump !== undefined) expect(['helpers', 'arrange', 'safety']).toContain(sec.jump.to)
  expect(SECTIONS.map(s => s.title)).toEqual(['Notices', 'Money and plan', 'Agents', 'Safety', 'Prompts and memory', 'Cards and look', 'Health'])
})

test('every visible note and every new view word has a Swedish line', () => {
  const missing = SETTINGS.filter(s => s.hidden !== true && s.note !== '' && (SV[s.note] ?? '') === '').map(s => s.key)
  expect(missing).toEqual([])
  setLang('sv')
  try {
    expect(tr('Manage agents ›')).toBe('Hantera agenter ›')
    expect(tr('Agents')).toBe('Agenter')
  } finally {
    setLang('en')
  }
})

test('the modes: defaults read as Recommended, each mode reads as itself, and a changed row reads as Custom', () => {
  const base = defaults()
  expect(modeNow(base)).toBe('balanced')
  for (const m of MODES) expect(modeNow({ ...base, ...findPreset(m)!.values })).toBe(m)
  expect(modeNow({ ...base, 'guard.world': 'hold' })).toBe('custom')
  expect([findPreset('quiet')!.values['hints.model'], base['hints.model'], findPreset('balanced')!.values['hints.model']]).toEqual(['off', 'on', 'on'])
  expect(modeNow({ ...base, ...findPreset('quiet')!.values, 'value.weekly': 'on' })).toBe('custom')
  expect(modeNow({ ...base, ...findPreset('thrifty')!.values })).toBe('custom')
})

test('no mode sets Compact by itself; none turns a usage-spending block on', () => {
  for (const m of MODES) {
    const v = findPreset(m)!.values
    // No mode sets Compact by itself: a choice the person made stays, and an unset row reads Auto
    expect(v['compact.mode']).toBeUndefined()
    for (const k of ['cache.keeper', 'laptop.mode', 'awake.mode', 'setup.apply']) expect(v[k] ?? defaults()[k], `${m}: ${k}`).toBe(defaults()[k])
    expect(v['resume.mode'] ?? defaults()['resume.mode'], `${m}: resume.mode`).not.toBe('resume')
    // The agent model row is a tip (Suggest only tells you): never Auto in a mode.
    expect(v['route.mode'] ?? defaults()['route.mode'], `${m}: route.mode`).not.toBe('auto')
  }
  const quiet = findPreset('quiet')!.values
  for (const k of ['guard.destructive', 'limits.warn', 'notify.mode']) expect(findPreset('balanced')!.values[k]).toBe(quiet[k])
  const turnedOn = ['prompt.check', 'assume.check', 'plan.first', 'claude.notes', 'next.mode']
  for (const [k, v] of Object.entries(findPreset('balanced')!.values)) if (findPreset('full')!.values[k] !== undefined && !turnedOn.includes(k)) expect(findPreset('full')!.values[k], k).toBe(v)
  for (const n of ['careful', 'balanced', 'thrifty', 'everything', 'backoffice']) expect(PRESETS.some(p => p.name === n)).toBe(true)
})

test('the counts: one pass gives on, suggest-only and off, and each section its "N of M on"', () => {
  const v = defaults()
  const t = tally(SETTINGS, v, true)
  let on = 0
  let suggest = 0
  let off = 0
  for (const s of SETTINGS) {
    if (s.hidden === true || viewLocksRow(s.key, v['look.view'])) continue
    const tone = toneOf(s, v[s.key]!)
    if (tone === 'on') on += 1
    if (tone === 'suggest') suggest += 1
    if (tone === 'off') off += 1
  }
  expect([t.on, t.suggest, t.off]).toEqual([on, suggest, off])
  expect(on + suggest + off).toBeGreaterThan(40)
  expect(suggest).toBeGreaterThanOrEqual(1)
  const turnedOff = tally(SETTINGS, { ...v, 'guard.destructive': 'off' }, true)
  expect(turnedOff.off).toBe(off + 1)
  expect(turnedOff.on).toBe(on - 1)
  const sum = [...t.bySection.values()].reduce((n, c) => n + c.total, 0)
  expect(sum).toBe(on + suggest + off)
  expect([...t.bySection.values()].reduce((n, c) => n + c.on, 0)).toBe(on + suggest)
  expect(t.bySection.get('Advanced')!.total).toBeGreaterThanOrEqual(15)
  const custom = tally(SETTINGS, { ...v, 'look.view': 'custom' }, true)
  const cardRows = SETTINGS.filter(x => x.hidden !== true && viewLocksRow(x.key, undefined) && toneOf(x, v[x.key]!) !== 'plain').length
  expect(cardRows).toBeGreaterThan(10)
  expect(custom.on + custom.suggest + custom.off).toBe(on + suggest + off + cardRows)
  expect(COUNT_CHIP).toBe('{on} of {total} settings on')
})

test('state words: a switch says On or Off, a choice says itself, Watch only reads Watch', () => {
  const by = (k: string) => SETTINGS.find(s => s.key === k)!
  expect(chipWord(by('undo.mode'), 'on', true)).toBe('On')
  expect(chipWord(by('cards.limit'), 'hide', true)).toBe('Off')
  expect(chipWord(by('guard.destructive'), 'hold', false)).toBe('Stop')
  expect(chipWord(by('compact.mode'), 'watch', false)).toBe('Watch')
  expect(toneOf(by('compact.mode'), 'suggest')).toBe('suggest')
  expect(toneOf(by('look.theme'), 'rose')).toBe('plain')
  // An Ask row acts (it sends Claude a request), so the mode card counts it as on, not as only suggest
  expect(toneOf(by('prompt.check'), 'ask')).toBe('on')
  expect(toneOf(by('plan.first'), 'ask')).toBe('on')
})

test('the expert rows leave their sections for the Advanced fold, and stay in the registry and the text command', () => {
  const inSections = new Set(SECTIONS.flatMap(sec => sectionRows(sec, true).flatMap(g => g.rows.map(r => r.key))))
  const inAdvanced = sectionRows(ADVANCED_SECTION, true).flatMap(g => g.rows.map(r => r.key))
  for (const k of ADVANCED_KEYS) {
    expect(inSections.has(k), `${k} is still in a section`).toBe(false)
    expect(inAdvanced).toContain(k)
  }
  expect(inAdvanced.length).toBe(ADVANCED_KEYS.length)
  // Everything else shown is in exactly one section.
  for (const s of SETTINGS.filter(x => x.hidden !== true && !ADVANCED_KEYS.includes(x.key))) expect(inSections.has(s.key), s.key).toBe(true)
  expect(rowsFor(true).flatMap(g => g.rows.map(r => r.key))).toContain('guard.outbox')
  expect(settingsText(defaults(), true, [], true)).toMatch(/guard\.outbox: /)
  expect(sectionOfSetting(SETTINGS.find(s => s.key === 'guard.destructive')!).name).toBe('Safety')
})

test('every setting has a section, a card\'s own setting sits in its card\'s zone section, and the sections follow the zone order', () => {
  const byName = new Map(SECTION_TABLE.map(sec => [sec.name, sec]))
  for (const z of ZONES) expect(byName.has(ZONE_SECTION[z]), `zone ${z} has no section`).toBe(true)
  // Every row, hidden ones too: a card lists it (its zone's section) or a section names its group (never the catch-all by accident).
  const named = new Set(SECTION_TABLE.flatMap(sec => sec.groups))
  for (const s of SETTINGS) {
    const card = listedCardOf(s.key)
    expect(card !== undefined || named.has(s.group), `${s.key} has no section`).toBe(true)
    expect(SECTION_TABLE).toContain(sectionOfSetting(s))
    if (card !== undefined) expect(sectionOfSetting(s).name, `${s.key} (card ${card})`).toBe(ZONE_SECTION[ZONE_OF[card as CardId]])
  }
  for (const k of GLOBAL_SETTINGS) {
    const s = SETTINGS.find(x => x.key === k)!
    expect(named.has(s.group), `global ${k}: group "${s.group}" is in no section`).toBe(true)
  }
  // The zone sections come first, in the zones' order; the global ones (no zone points at them) follow.
  const zoneAt = (name: string): number => {
    const at = ZONES.findIndex(z => ZONE_SECTION[z] === name)
    return at === -1 ? ZONES.length : at
  }
  const at = SECTION_TABLE.map(sec => zoneAt(sec.name))
  expect(at).toEqual([...at].sort((a, b) => a - b))
  // Spot checks a person would make: the board and Settings agree.
  const where = (k: string): string => sectionOfSetting(SETTINGS.find(s => s.key === k)!).title
  expect(where('preview.auto')).toBe('Agents')
  expect(SETTINGS.filter(s => s.key.startsWith('ship.')).map(s => s.key), 'ship.* settings exist now: give Ship its own section (core/settingsmap.ts ZONE_SECTION)').toEqual([])
  expect(where('plain.mode')).toBe('Money and plan')
  expect(where('value.weekly')).toBe('Prompts and memory')
  expect(where('phone.mode')).toBe('Notices')
  expect(where('notify.mode')).toBe('Notices')
  expect(where('cards.guard')).toBe('Cards and look')
})

const paneProps = (bodyColumns: number) => ({ title: 'Vaken', isFocused: false, bodyColumns, placement: 'inline' as const, scroll: { bodyRows: 40, offset: 0, total: 40 }, view: {} })
function engine(on: On): Map<string, unknown> {
  const mem = new Map<string, unknown>([['cockpit:setting:look.view', 'custom']])
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
  return mem
}
type Pane = { find: (q: unknown) => Promise<unknown>; findAll: (q: unknown) => Promise<unknown[]>; press: (q: unknown) => Promise<void>; unmount: () => Promise<void> }
const mountAt = ($: { ui: { mount: (o: unknown) => Promise<never> } }, bodyColumns: number) => () => $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps(bodyColumns) }) as unknown as Promise<Pane>
const textOf = async (pane: Pane, text: RegExp): Promise<boolean> => (await pane.find({ type: 'Text', text })) !== undefined

async function openSettings($: unknown, on: On, bodyColumns = 120): Promise<{ mem: Map<string, unknown>; mount: () => Promise<Pane> }> {
  mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  const mem = engine(on)
  mem.set('cockpit:firstrun', 'done')
  const mount = mountAt($ as never, bodyColumns)
  const home = await mount()
  await home.press({ key: 'settings' })
  await home.unmount()
  return { mem, mount }
}

test('Settings: the mode card, the counts line, a chip on every row and the hover wash', SLOW, async ($, on) => {
  const { mem, mount } = await openSettings($, on)
  const top = await mount()
  expect(await textOf(top, /^How much should it tell you\?$/)).toBe(true)
  const marks = ((await top.findAll({ type: 'Svg' })) as { props: { alt?: string } }[]).map(x => x.props.alt ?? '')
  expect(marks).toContain('Recommended, selected')
  expect(marks).toContain('Only alerts')
  expect(marks).toContain('Everything useful')
  expect(await textOf(top, /^Tips, recaps, cost tips, decision log\. This mode sends Claude only short safety notes\.$/)).toBe(true)
  expect(await textOf(top, /^Alerts when a session needs you/)).toBe(false)
  expect(await textOf(top, /^uses a little plan$/)).toBe(true)
  expect(await textOf(top, /^Picking a mode sets its settings\. Your own changes to them are replaced\.$/)).toBe(true)
  expect(await textOf(top, /^\d+ of \d+ on, \d+ off\. \d+ only suggest\.$/)).toBe(true)
  expect(await top.find({ key: 'count-settings-mode' }), 'the mode card has no chip: the filled mark says the mode').toBeUndefined()
  expect(await top.find({ key: 'mode-quiet' }), 'mode pick').toBeDefined()
  await top.press({ key: 'press-ol-section:Safety-0' })
  await top.unmount()
  const safety = await mount()
  expect(await safety.find({ key: 'chip-undo.mode' }), 'switch chip').toBeDefined()
  expect(await safety.find({ key: 'chip-guard.destructive' }), 'no choice chip').toBeUndefined()
  expect(await safety.find({ key: 'row-guard.destructive' }), 'choice row').toBeDefined()
  expect(await safety.find({ key: 'count-settings-safety' }), 'count chip').toBeDefined()
  await safety.press({ key: 'mode-full' })
  await safety.unmount()
  // Full was applied in one press: the weekly line goes on, notes go to Claude, compaction is Auto.
  expect(mem.get('cockpit:setting:value.weekly')).toBe('on')
  expect(mem.get('cockpit:setting:claude.notes')).toBe('all')
  expect(mem.get('cockpit:setting:compact.mode') ?? 'auto').toBe('auto')
  expect(mem.has('cockpit:setting:guard.destructive')).toBe(false)
  const after = await mount()
  expect(await after.find({ key: 'mode-full' })).toBeDefined()
  await after.unmount()
})

test('Advanced: closed on arrival, and its rows are there once it opens, not in the section they came from', SLOW, async ($, on) => {
  const { mount } = await openSettings($, on)
  const first = await mount()
  expect(await first.find({ key: 'press-ol-section:Advanced-0' })).toBeDefined()
  expect(await first.find({ key: 'row-guard.outbox' })).toBeUndefined()
  await first.press({ key: 'press-ol-section:Advanced-0' })
  await first.unmount()
  const open = await mount()
  expect(await open.find({ key: 'row-guard.outbox' })).toBeDefined()
  expect(await open.find({ key: 'row-look.columns' })).toBeDefined()
  expect(await open.find({ key: 'chip-guard.outbox' })).toBeDefined()
  await open.unmount()
})

test('the jump buttons: Helpers opens the Agents view; Money and plan has no button', SLOW, async ($, on) => {
  const { mount } = await openSettings($, on)
  const view = await mount()
  expect(await view.find({ key: 'jump-settings-plan-and-cost' })).toBeUndefined()
  expect(await view.find({ key: 'jump-settings-agents-and-tasks' })).toBeDefined()
  await view.press({ key: 'jump-settings-agents-and-tasks' })
  await view.unmount()
  const runner = await mount()
  expect(await runner.find({ key: 'runner-done' })).toBeDefined()
  expect(await runner.find({ key: 'settings-done' })).toBeUndefined()
  await runner.unmount()
})

test('the jump buttons: Cards and look starts Arrange', SLOW, async ($, on) => {
  const { mount } = await openSettings($, on)
  const view = await mount()
  await view.press({ key: 'jump-settings-look-and-cards' })
  await view.unmount()
  const arranging = await mount()
  expect(await arranging.find({ key: 'settings-done' })).toBeUndefined()
  expect(await arranging.find({ key: 'arrange-bar' })).toBeDefined()
  await arranging.unmount()
})

test('the jump buttons: Open Safety leaves Settings for the home screen', SLOW, async ($, on) => {
  const { mount } = await openSettings($, on)
  const view = await mount()
  await view.press({ key: 'jump-settings-safety' })
  await view.unmount()
  const home = await mount()
  expect(await home.find({ key: 'settings' })).toBeDefined()
  expect(await home.find({ key: 'settings-done' })).toBeUndefined()
  await home.unmount()
})

for (const [width, cols] of [[60, 1], [100, 2], [140, 3]] as const) {
  test(`the sections lay out in ${cols} column${cols === 1 ? '' : 's'} at ${width} text columns, by the cards' own rule`, async ($, on) => {
    const { mount } = await openSettings($, on, width)
    const view = await mount()
    expect((await view.find({ key: 'settings-columns' })) !== undefined, 'columns box').toBe(cols > 1)
    for (let n = 0; n < 3; n += 1) expect((await view.find({ key: `settings-col-${n}` })) !== undefined, `column ${n}`).toBe(n < cols && cols > 1)
    await view.unmount()
  })
}

test('the flip\'s "More in Settings" opens the section holding the card\'s own settings, for every card', () => {
  for (const id of Object.keys(CARD_SETTINGS)) {
    const focus = faceOf(id, true, 100).group
    expect(focus, `${id}: the face jumps by the card, not a group`).toBe(cardFocus(id))
    expect(sectionOf(focus).name, `${id}: the zone's section`).toBe(ZONE_SECTION[ZONE_OF[id as CardId]])
    for (const k of CARD_SETTINGS[id] ?? []) {
      const s = SETTINGS.find(x => x.key === k)
      expect(s, k).toBeDefined()
      expect(sectionOfSetting(s as never).name, `${id}: ${k} sits in the section the jump opens`).toBe(sectionOf(focus).name)
    }
  }
})

test('a card\'s "Change in Settings" opens its card; a global row or a view block opens its group', () => {
  expect(focusOfSetting('route.mode', 'Model choice')).toBe(cardFocus('agents'))
  expect(focusOfSetting('hints.model', 'Model choice')).toBe(cardFocus('here'))
  expect(focusOfSetting('notify.mode', 'Attention')).toBe('Attention')
  expect(focusOfSetting('sessions', 'Sessions')).toBe('Sessions')
})

test('a group split across sections: its focus shows the rows that sit in the one section it opens (Attention, Crew, Routing)', () => {
  const keys = (group: string): string[] => focusRows(group, true).flatMap(g => g.rows.map(s => s.key))
  for (const group of ['Attention', 'Crew', 'Model choice']) {
    const at = sectionOf(group)
    const shown = keys(group)
    expect(shown.length, `${group}: shows rows`).toBeGreaterThan(0)
    for (const k of shown) expect(sectionOfSetting(SETTINGS.find(s => s.key === k) as never).name, `${group}: ${k}`).toBe(at.name)
    const left = SETTINGS.filter(s => s.group === group && s.hidden !== true && !shown.includes(s.key))
    for (const s of left) expect(sectionOfSetting(s).name, `${group}: ${s.key} is shown in its own section's card`).not.toBe(at.name)
  }
  expect(sectionOf('Attention').name).toBe('Notices')
  expect(keys('Attention')).toContain('notify.mode')
  expect(keys('Attention')).toContain('phone.mode')
  expect(keys('Attention')).not.toContain('away.policy')
  // Routing: the agents card's row and the Chat card's hint row sit in two sections; the focus shows one part, never both.
  const routing = keys('Model choice')
  expect(routing.includes('route.mode') && routing.includes('hints.model')).toBe(false)
})

test('changed: a row differs from the mode in use, or from its default when the values match no mode; the sections count them', () => {
  const base = defaults()
  expect(changedBySection(SETTINGS, base, true).size, 'nothing changed on a fresh store').toBe(0)
  const notify = SETTINGS.find(s => s.key === 'notify.mode')!
  const moved = { ...base, 'notify.mode': 'all' }
  expect(isChanged(notify, moved, modeNow(moved))).toBe(true)
  expect(changedBySection(SETTINGS, moved, true).get('Notices')).toBe(1)
  const full = { ...base, ...(findPreset('full')?.values ?? {}) }
  expect(modeNow(full)).toBe('full')
  expect(changedBySection(SETTINGS, full, true).size).toBe(0)
  expect(baselineOf(notify, 'full')).toBe(findPreset('full')?.values['notify.mode'] ?? notify.default)
  const fullMoved = { ...full, 'cache.keeper': full['cache.keeper'] === 'on' ? 'off' : 'on' }
  expect([...changedBySection(SETTINGS, fullMoved, true).values()].reduce((a, b) => a + b, 0)).toBe(1)
})

test('the dollar rows of a card are told apart so the flipped Plan limits card can title them', () => {
  const keys = faceOf('limit', true, 100).rows.map(r => r.key)
  expect(keys.filter(isSpending)).toEqual(['cost.budget', 'cost.session', 'cost.day'])
  expect(tr('Spending limits (estimates)')).toBe('Spending limits (estimates)')
  setLang('sv')
  expect(tr('Spending limits (estimates)')).toBe('Utgiftsgränser (uppskattningar)')
  setLang('en')
})

test('Settings: Reset to defaults asks first, Keep leaves everything, Clear wipes and says so; the counts line has a unit', SLOW, async ($, on) => {
  const { mem, mount } = await openSettings($, on)
  mem.set('cockpit:setting:notify.mode', 'all')
  const top = await mount()
  expect(await textOf(top, /^\d+ of \d+ on, \d+ off\. \d+ only suggest\.$/)).toBe(true)
  await top.press({ key: 'settings-reset' })
  expect(mem.get('cockpit:setting:notify.mode'), 'the first press only asks').toBe('all')
  await top.unmount()
  const asked = await mount()
  expect(await textOf(asked, /^Clear every setting, the card order and your pins\?$/)).toBe(true)
  await asked.press({ key: 'settings-reset-keep' })
  expect(mem.get('cockpit:setting:notify.mode')).toBe('all')
  await asked.unmount()
  const kept = await mount()
  expect(await kept.find({ key: 'settings-reset-clear' })).toBeUndefined()
  await kept.press({ key: 'settings-reset' })
  await kept.unmount()
  const again = await mount()
  await again.press({ key: 'settings-reset-clear' })
  expect(mem.get('cockpit:setting:notify.mode')).toBeUndefined()
  await again.unmount()
  const done = await mount()
  expect(await textOf(done, /^Everything is back to the usual choice\.$/)).toBe(true)
  await done.unmount()
})

test('Settings: Delete everything vaken stored only shows a preview on the first press, Keep leaves it all, the second press deletes', SLOW, async ($, on) => {
  const { mem, mount } = await openSettings($, on)
  mem.set('cockpit:setting:notify.mode', 'all')
  mem.set('cockpit:note:keep-me', 1)
  mem.set('elsewhere:key', 'stays')
  const top = await mount()
  expect(await top.find({ key: 'settings-erase' }), 'the press is on the page').toBeDefined()
  expect(await top.find({ key: 'settings-erase-confirm' }), 'no delete press before the preview').toBeUndefined()
  await top.press({ key: 'settings-erase' })
  expect(mem.get('cockpit:setting:notify.mode'), 'the first press deletes nothing').toBe('all')
  await top.unmount()
  const asked = await mount()
  expect(await textOf(asked, /^This would delete everything vaken stored\. It cannot be undone\. Nothing has been deleted yet\.$/)).toBe(true)
  expect(await textOf(asked, /^Saved notes and choices: \d+$/)).toBe(true)
  expect(await textOf(asked, /^Your project files, CLAUDE\.md and settings\.json are never touched\.$/)).toBe(true)
  await asked.press({ key: 'settings-erase-keep' })
  expect(mem.get('cockpit:note:keep-me')).toBe(1)
  await asked.unmount()
  const kept = await mount()
  expect(await kept.find({ key: 'settings-erase-confirm' })).toBeUndefined()
  await kept.press({ key: 'settings-erase' })
  await kept.unmount()
  const again = await mount()
  await again.press({ key: 'settings-erase-confirm' })
  expect(mem.get('cockpit:setting:notify.mode')).toBeUndefined()
  expect(mem.get('cockpit:note:keep-me')).toBeUndefined()
  expect(mem.get('elsewhere:key'), 'only the plugin keys go').toBe('stays')
  await again.unmount()
  const done = await mount()
  expect(await textOf(done, /^Everything vaken stored is deleted\. It starts fresh from here\./)).toBe(true)
  await done.unmount()
})

test('the Start here card asks the first question with what a fresh store reads as (the mode Recommended) chosen and marked Recommended', SLOW, async ($, on) => {
  mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  engine(on)
  const pane = await mountAt($ as never, 120)()
  expect(await textOf(pane, /^Step 1 of 5$/)).toBe(true)
  // Every answer says what it means; the recommended one is named Recommended, said once (no chip repeats its name)
  expect(await textOf(pane, /^A session waits for you, a limit is near, a risky step\.$/)).toBe(true)
  expect(await textOf(pane, /^Plus recaps, cost tips and a check that Claude did what it said\. Free\. On from the start: vaken compacts the session by itself when it fills, and plain mode asks Claude for short, simple words\.$/)).toBe(true)
  expect(await pane.find({ key: 'start-mode-balanced-chip' })).toBeUndefined()
  expect(await pane.find({ key: 'start-mode-full-chip' })).toBeUndefined()
  // The first-message line waits for the summary
  expect(await textOf(pane, /^Send your first message\./)).toBe(false)
  await pane.unmount()
})
