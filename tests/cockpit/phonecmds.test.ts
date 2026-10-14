// Phone mode: the setting phone.mode, the ask-once line and the prompt section.
import { expect, mock } from 'claude-code/testing'
import type { EngineInterface, On } from 'claude-code'

import { helloLines } from '../hooks/core/phone'
import { PHONECMDS_STRINGS, PHONE_ASK_LINE, PHONE_MODE_MAX_MS, PHONE_SECTION_ID, PHONE_SECTION_TEXT, PHONE_SETTINGS_MODE, phoneAskDue, phoneSectionOn } from '../hooks/core/phonecmds'
import { checkRegistry } from '../hooks/core/settings'
import { forgetHello, forgetPhones } from '../hooks/features/phone'
import { SLOW, test } from './slow'
import { viaParent } from './viaparent'
import { byEnglish, englishOf } from '../hooks/i18n/table'
const SV = byEnglish('sv')

const MIN = 60_000
const NOW = Date.parse('2026-10-10T12:00:00Z')
const en = (s: string): string => s
const sv = (s: string): string => SV[s] ?? s

test('the section is on only when the mode is On and a phone joined less than the cap ago', () => {
  expect(phoneSectionOn('on', [NOW - MIN], NOW)).toBe(true)
  expect(phoneSectionOn('ask', [NOW - MIN], NOW)).toBe(false)
  expect(phoneSectionOn('off', [NOW - MIN], NOW)).toBe(false)
  expect(phoneSectionOn('on', [], NOW)).toBe(false)
  expect(phoneSectionOn('on', [NOW - PHONE_MODE_MAX_MS], NOW)).toBe(false)
  expect(phoneAskDue('ask', undefined)).toBe(true)
  expect(phoneAskDue('ask', NOW)).toBe(false)
  expect(phoneAskDue('on', undefined)).toBe(false)
  expect(phoneAskDue('off', undefined)).toBe(false)
  expect(PHONE_SECTION_TEXT.length).toBeLessThan(260)
})

test('the setting row is valid, in Attention, Ask by default; every word has a Swedish line', () => {
  expect(checkRegistry(PHONE_SETTINGS_MODE)).toEqual([])
  expect(PHONE_SETTINGS_MODE[0]?.group).toBe('Attention')
  expect(PHONE_SETTINGS_MODE[0]?.options.map(o => o.value)).toEqual(['off', 'ask', 'on'])
  expect(PHONE_SETTINGS_MODE[0]?.default).toBe('ask')
  expect(PHONE_SETTINGS_MODE[0]?.note.split(' ').length).toBeLessThanOrEqual(16)
  for (const w of PHONECMDS_STRINGS) expect(SV[w] ?? '').not.toBe('')
  for (const w of englishOf('phonecmds')) expect(PHONECMDS_STRINGS).toContain(w)
  expect(PHONE_ASK_LINE).toBe('Short, numbered answers while you are on the phone? Turn on Phone mode: Settings > Attention.')
})

test('the hello says what waits, in at most three lines, and names no command', () => {
  const week = { name: 'Week', percent: 72, withDay: true }
  const lines = helloLines({ needs: [{ name: 'app', kind: 'question' }], held: 1, finished: 1, plan: week }, en)
  expect(lines[0]).toBe('Vaken · 1 step stopped · 1 session needs you · 1 finished')
  expect(lines).toHaveLength(3)
  expect(helloLines({ needs: [], held: 0, finished: 0, plan: week }, en)).toEqual(['Vaken · Plan: week 72%'])
})

// ---- through the engine

function world(on: On, seed: Record<string, unknown>) {
  const clock = mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test', LANG: 'en_US.UTF-8' })
  const mem = new Map<string, unknown>(Object.entries(seed))
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
  const session = mock.session(on)
  on('session.id', () => ({ value: 'me' }))
  on('session.root', () => ({ value: '/w/me' }) as never)
  on('command.register', () => ({ value: { command: 'x' } }))
  on('process.run', () => ({ value: { exitCode: 1, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never)
  on('ui.toast', () => ({ value: undefined }) as never)
  on('ui.invalidate', () => ({ value: undefined }))
  on('ui.panes', () => ({ value: [] }) as never)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.attach', (_$, e) => ({ clientId: e.clientId }))
  on('session.detach', (_$, e) => ({ clientId: e.clientId }) as never)
  on('prompt.compose', () => ({ sections: [{ id: 'intro', text: 'base', scope: 'shared' }] }) as never)
  const submitted: string[] = []
  on('prompt.submit', (_$, e) => {
    submitted.push(e.text)
    return { text: e.text, context: e.context } as never
  })
  return { clock, mem, session, submitted }
}

const rec = (id: string, at: number, over: Record<string, unknown> = {}) => ({ sessionId: id, cwd: `/w/${id}`, model: 'm', state: 'working', startedAt: at - 30 * MIN, updatedAt: at - 5_000, lastEventAt: at - 5_000, stateSince: at - 30 * MIN, ...over })
const sessions = (at = NOW): Record<string, unknown> => ({
  'cockpit:firstrun': 'done',
  'cockpit:awake:asked': 1,
  'cockpit:phone:asked': 1,
  'cockpit:session:me': rec('me', at, { title: 'Docs', costUsd: 1.5 }),
  'cockpit:session:a': rec('a', at, { title: 'Fix login', state: 'waiting', ask: { kind: 'question', tool: 'AskUserQuestion', since: at - 12 * MIN }, costUsd: 2.7 }),
  'cockpit:session:b': rec('b', at, { title: 'Billing', state: 'waiting', stateSince: at - 20 * MIN }),
})
const reseed = (w: ReturnType<typeof world>): void => {
  for (const [k, v] of Object.entries(sessions(w.clock.now()))) if (k.startsWith('cockpit:session:')) w.mem.set(k, v)
}
const say = async ($: EngineInterface, command: string, args = ''): Promise<string> => ((await $.command.run({ ...viaParent(command, args), origin: { kind: 'composer' } } as never)) as { text: string }).text
const start = ($: EngineInterface): Promise<unknown> => $.session.start({ cwd: '/w/me', surface: 'desktop', isInteractive: true } as never)
const mobile = ($: EngineInterface, id = 'mobile:default'): Promise<unknown> => $.session.attach({ surface: 'mobile', clientId: id })
const FACTS = { model: 'm', promptModel: 'm', surfaces: [], tools: [], outputStyle: null, traits: [] } as never
const sectionIds = async ($: EngineInterface): Promise<string[]> => ((await $.prompt.compose(FACTS)) as unknown as { sections: Array<{ id: string }> }).sections.map(s => s.id)
const appendedText = (w: ReturnType<typeof world>): string[] => w.session.appended().map(r => (r.message.content[0] as { text: string }).text)

test('the first phone hello asks once: one line, not again, and not when the mode is Off', SLOW, async ($, on) => {
  forgetHello()
  forgetPhones()
  const w = world(on, sessions())
  w.mem.delete('cockpit:phone:asked')
  await start($)
  await mobile($)
  expect(appendedText(w)).toHaveLength(1)
  const lines = (appendedText(w)[0] as string).split('\n')
  expect(lines.length).toBeLessThanOrEqual(4)
  expect(lines.at(-1)).toBe(PHONE_ASK_LINE)
  expect(lines[0]).not.toContain('/ok')
  expect(w.mem.get('cockpit:phone:asked')).toBe(NOW)
  await w.clock.advance(31 * MIN)
  reseed(w)
  await mobile($, 'mobile:two')
  expect(appendedText(w)).toHaveLength(2)
  expect(appendedText(w)[1]).not.toContain('/vaken-phone')
})

test('the ask is not made when the mode is Off, nor beside the awake question', SLOW, async ($, on) => {
  forgetHello()
  forgetPhones()
  const w = world(on, { ...sessions(), 'cockpit:setting:phone.mode': 'off' })
  w.mem.delete('cockpit:phone:asked')
  await start($)
  await mobile($)
  expect(appendedText(w).join('\n')).not.toContain('/vaken-phone')
  expect(w.mem.has('cockpit:phone:asked')).toBe(false)
  await say($, 'vaken-settings', 'phone.mode ask')
  w.mem.delete('cockpit:awake:asked')
  await w.clock.advance(31 * MIN)
  reseed(w)
  await mobile($, 'mobile:two')
  const last = appendedText(w).pop() ?? ''
  expect(last).toContain('/vaken-help run awake on')
  expect(last).not.toContain('/vaken-phone')
})

test('the prompt section: only with mode On and a phone attached; gone after the phone leaves; no phone, no section', async ($, on) => {
  forgetHello()
  forgetPhones()
  const w = world(on, { ...sessions(), 'cockpit:setting:phone.mode': 'on' })
  await start($)
  expect(await sectionIds($)).toEqual(['intro'])
  await mobile($)
  expect(await sectionIds($)).toEqual(['intro', PHONE_SECTION_ID])
  expect(JSON.stringify(await $.prompt.compose(FACTS))).toContain('number them so the person can reply with a digit')
  await say($, 'vaken-settings', 'phone.mode ask')
  expect(['A', ...(await sectionIds($))]).toEqual(['A', 'intro'])
  await say($, 'vaken-settings', 'phone.mode on')
  expect(await sectionIds($)).toEqual(['intro', PHONE_SECTION_ID])
  await $.session.detach({ surface: 'mobile', clientId: 'mobile:default' } as never)
  expect(['B', ...(await sectionIds($))]).toEqual(['B', 'intro'])
})

test('the section ends by itself when the phone never says it left', SLOW, async ($, on) => {
  forgetHello()
  forgetPhones()
  const w = world(on, { ...sessions(), 'cockpit:setting:phone.mode': 'on' })
  await start($)
  await mobile($)
  await w.clock.advance(PHONE_MODE_MAX_MS - MIN)
  expect(await sectionIds($)).toEqual(['intro', PHONE_SECTION_ID])
  await w.clock.advance(2 * MIN)
  expect(await sectionIds($)).toEqual(['intro'])
})

test('a desktop that joins does not turn the section on', async ($, on) => {
  forgetHello()
  forgetPhones()
  world(on, { ...sessions(), 'cockpit:setting:phone.mode': 'on' })
  await start($)
  await $.session.attach({ surface: 'desktop', clientId: 'desktop:default' })
  expect(await sectionIds($)).toEqual(['intro'])
})

test('/vaken shows the phone mode line', async ($, on) => {
  world(on, { 'cockpit:firstrun': 'done', 'cockpit:session:me': rec('me', NOW) })
  on('ui.open', () => ({ value: undefined }) as never)
  await start($)
  expect(await say($, 'vaken')).toMatch(/\nPhone mode: asks once · Settings > Attention$/)
})
