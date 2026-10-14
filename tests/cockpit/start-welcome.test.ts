// First-user fixes for the start: a shorter Welcome card, counts and words that match the screen.
import { expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'

import { START_VIEW_ABOUT } from '../hooks/core/cardrules'
import { GUIDE_NEEDS, GUIDE_VIEW_STRINGS } from '../hooks/core/cardguide'
import { COUNT_CHIP, ERASE_NOTE, RESET_NOTE, SETTINGS_VIEW_STRINGS } from '../hooks/core/settingsmap'
import { POPOUT_BUTTON } from '../hooks/core/popout'
import { changedBySection } from '../hooks/core/changed'
import { SETTINGS, defaults } from '../hooks/core/settings'
import { HELP, HELP_BY_TOPIC, PRIVACY_HELP } from '../hooks/features/home/views/help'
import { helpText } from '../hooks/features/home/commands'
import { setLang, tr } from '../hooks/core/lang'
import { textsOf, walk } from './statefixtures'
import type { Node } from './statefixtures'
import { SLOW, test } from './slow'

const NOW = new Date(2026, 9, 12, 9, 0).getTime()
const paneProps = { title: 'Vaken', isFocused: false, bodyColumns: 120, placement: 'inline' as const, scroll: { bodyRows: 60, offset: 0, total: 60 }, view: {} }
type Pane = { drawn: (scope?: { in: string }) => Promise<Node>; find: (q: unknown) => Promise<unknown>; press: (q: unknown) => Promise<void>; unmount: () => Promise<void> }

function engine(on: On, seed: Record<string, unknown> = {}): Map<string, unknown> {
  const mem = new Map<string, unknown>(Object.entries(seed))
  mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
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
  on('process.run', () => ({ value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  on('session.end', (_$, e) => ({ sessionId: e.sessionId }))
  return mem
}
const mount = ($: unknown): Promise<Pane> => ($ as { ui: { mount: (o: unknown) => Promise<Pane> } }).ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps })
const textNodes = (n: Node): Node[] => walk(n).filter(x => x.type === 'Text')

test('F11: the Welcome card has one sentence, the mode choice, Got it, the sentence of the mode on now and a shorter view sentence; a press still closes it for good', SLOW, async ($, on) => {
  const mem = engine(on)
  const pane = await mount($)
  // The card's body: the deepest part that holds both its first and its last line (walk is in reading order, parents first).
  const card = walk(await pane.drawn()).filter(x => { const all = textsOf(x).join('\n'); return all.includes('Vaken watches your sessions') && all.includes('Send your first message') }).pop() as Node
  const texts = textsOf(card).join('')
  expect(texts).toContain('Vaken watches your sessions')
  expect(texts.indexOf('Send your first message')).toBeLessThan(texts.indexOf('Only alerts'))
  expect(texts).toMatch(/Recommended \(the usual choice\): /)
  expect(texts).not.toMatch(/Only alerts: /)
  expect(texts).not.toMatch(/Everything useful: /)
  expect(texts).toContain(START_VIEW_ABOUT)
  expect(texts).not.toContain('Pick a view:')
  const body = textNodes(card).filter(x => textsOf(x).join('').length > 30)
  expect(body.length).toBeLessThan(6)
  expect(body.length).toBe(4)
  expect(START_VIEW_ABOUT.length).toBeLessThan('Pick a view: Standard shows six cards, All shows every card, Custom is your own choice and order. Change it any time in Settings.'.length)
  await pane.press({ key: 'start-skip' })
  await pane.unmount()
  expect(mem.get('cockpit:firstrun')).toBeDefined()
  const again = await mount($)
  expect(await again.find({ key: 'start-skip' })).toBeUndefined()
  await again.unmount()
})

test('F6: Standard is said as the screen shows it, the guide says where Needs you is, and a section chip names its unit', () => {
  expect(START_VIEW_ABOUT).toMatch(/^Standard shows Needs you and six cards\./)
  expect(GUIDE_NEEDS).toBe('Needs you sits on top of every view.')
  expect(GUIDE_VIEW_STRINGS).toContain(GUIDE_NEEDS)
  expect(COUNT_CHIP).toBe('{on} of {total} settings on')
  setLang('sv')
  try {
    expect(tr(GUIDE_NEEDS)).toBe('Behöver dig ligger överst i varje vy.')
    expect(tr(COUNT_CHIP)).toBe('{on} av {total} inställningar på')
    expect(tr(START_VIEW_ABOUT)).toMatch(/^Vanlig visar Behöver dig och sex kort\./)
  } finally {
    setLang('en')
  }
})

test('F6: the guide shows the Needs you line, and a Settings chip says "settings"', SLOW, async ($, on) => {
  engine(on, { 'cockpit:firstrun': 'done', 'cockpit:setting:look.view': 'custom' })
  const pane = await mount($)
  await pane.press({ key: 'morel-more-cards' })
  await pane.unmount()
  const guide = await mount($)
  expect(textsOf(await guide.drawn())).toContain(GUIDE_NEEDS)
  await guide.press({ key: 'guide-done' })
  await guide.unmount()
  const home = await mount($)
  await home.press({ key: 'settings' })
  await home.unmount()
  const settings = await mount($)
  const all = textsOf(await settings.drawn()).join('\n')
  expect(all).toMatch(/\d+ of \d+ on, \d+ off\. \d+ only suggest\./)
  expect(all).not.toMatch(/\d+ of \d+ on(?![, ])/)
  expect(all).toContain(RESET_NOTE)
  expect(all).toContain(ERASE_NOTE)
  await settings.unmount()
})

test('F5: the Help entry "What vaken keeps and sends" is on the page, in English and Swedish, in the Safety topic and the text twin', () => {
  expect(PRIVACY_HELP.title).toBe('What vaken keeps and sends')
  expect(HELP.map(h => h.title)).toContain(PRIVACY_HELP.title)
  expect(HELP_BY_TOPIC.find(g => g.topic === 'safety')?.entries.map(e => e.title)).toContain(PRIVACY_HELP.title)
  expect(HELP_BY_TOPIC.flatMap(g => g.entries).length).toBe(HELP.length)
  for (const w of ['plugin store', 'own folder under ~/.claude', 'no telemetry', 'Notes to Claude', 'npm registry', 'localhost']) expect(PRIVACY_HELP.text).toContain(w)
  expect(helpText('telemetry')).toContain(PRIVACY_HELP.title)
  for (const w of [RESET_NOTE, ERASE_NOTE]) expect(SETTINGS_VIEW_STRINGS).toContain(w)
  setLang('sv')
  try {
    expect(tr(PRIVACY_HELP.title)).toBe('Vad vaken sparar och skickar')
    expect(tr(PRIVACY_HELP.text)).toMatch(/^Vaken sparar dina inställningar/)
    expect(tr(RESET_NOTE)).toMatch(/^Dina val går tillbaka/)
    expect(tr(ERASE_NOTE)).toMatch(/^Tar bort allt/)
  } finally {
    setLang('en')
  }
})

test('F8 and F15: plainer Help titles, and the footer button says what it opens', () => {
  const titles = HELP.map(h => h.title)
  for (const t of ['Keeping the session cheap', 'Saved ideas', 'Sending a message to another session']) expect(titles).toContain(t)
  for (const t of ['What the keeper does', 'What the parking lot is', 'What steering does']) expect(titles).not.toContain(t)
  expect(POPOUT_BUTTON).toBe('Open in new window')
  setLang('sv')
  try {
    expect(tr('Saved ideas')).toBe('Sparade idéer')
    expect(tr('Keeping the session cheap')).toBe('Hålla sessionen billig')
    expect(tr('Sending a message to another session')).toBe('Skicka ett meddelande till en annan session')
    expect(tr(POPOUT_BUTTON)).toBe('Öppna i nytt fönster')
  } finally {
    setLang('en')
  }
})

test('F13 row 14: the Help page does not ask the person to type a command to filter', SLOW, async ($, on) => {
  engine(on, { 'cockpit:firstrun': 'done' })
  const pane = await mount($)
  await pane.press({ key: 'help' })
  await pane.unmount()
  const help = await mount($)
  const all = textsOf(await help.drawn()).join('\n')
  expect(all).toContain('Help')
  expect(all).not.toContain('Type a word after')
  await help.unmount()
})

test('F6: a card hidden in Custom is not "1 changed" once the view is Standard, where its row is not drawn', () => {
  const base = defaults()
  const sum = (m: Map<string, number>): number => [...m.values()].reduce((n, v) => n + v, 0)
  const custom = sum(changedBySection(SETTINGS, { ...base, 'look.view': 'custom', 'cards.limit': 'hide' }, true))
  const customPlain = sum(changedBySection(SETTINGS, { ...base, 'look.view': 'custom' }, true))
  expect(custom - customPlain).toBe(1)
  const standard = sum(changedBySection(SETTINGS, { ...base, 'look.view': 'standard', 'cards.limit': 'hide' }, true))
  const standardPlain = sum(changedBySection(SETTINGS, { ...base, 'look.view': 'standard' }, true))
  expect(standard).toBe(standardPlain)
})

test('F5: the Delete everything line says a pause that is on stays, and the Help entry names the features and buttons that talk to Claude', () => {
  expect(ERASE_NOTE).toContain('except a pause that is on')
  expect(ERASE_NOTE).toContain('this computer')
  expect(RESET_NOTE).toContain('There is no undo.')
  for (const w of ['Plan first', 'Prompt review', 'Assumption review', 'press a button that sends a message']) expect(PRIVACY_HELP.text).toContain(w)
})
