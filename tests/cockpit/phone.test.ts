// Hello on the phone: the pure notice and the hook through the engine.
import { expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'

import { PHONE_EVERY_MS, PHONE_SETTINGS, PHONE_VIEW_STRINGS, helloDue, helloLines, planLine } from '../hooks/core/phone'
import type { PhoneFacts } from '../hooks/core/phone'
import { forgetHello } from '../hooks/features/phone'
import { PHONENOTE_STRINGS } from '../hooks/core/phonenote'
import { checkRegistry } from '../hooks/core/settings'
import { SLOW, test } from './slow'
import { viaParent } from './viaparent'
import { byEnglish, englishOf } from '../hooks/i18n/table'
const SV = byEnglish('sv')

const MIN = 60_000
const NOW = Date.parse('2026-10-10T12:00:00Z')
const en = (s: string): string => s
const sv = (s: string): string => SV[s] ?? s
// A Thursday in local time, so the day word is the same in every time zone that matters here.
const THU = new Date(2026, 9, 15, 14, 0, 0).toISOString()

const facts = (over: Partial<PhoneFacts> = {}): PhoneFacts => ({ needs: [], held: 0, finished: 0, ...over })

test('the Settings row: group Attention, On or Off, On by default, a valid row', () => {
  expect(PHONE_SETTINGS.map(s => s.key)).toEqual(['phone.hello'])
  expect(PHONE_SETTINGS[0]?.group).toBe('Attention')
  expect(PHONE_SETTINGS[0]?.options.map(o => o.value)).toEqual(['on', 'off'])
  expect(PHONE_SETTINGS[0]?.default).toBe('on')
  expect(checkRegistry(PHONE_SETTINGS)).toEqual([])
})

test('a hello is due when none was said or the last is 30 minutes old', () => {
  expect(helloDue(undefined, NOW)).toBe(true)
  expect(helloDue(NOW - PHONE_EVERY_MS + 1, NOW)).toBe(false)
  expect(helloDue(NOW - PHONE_EVERY_MS, NOW)).toBe(true)
  expect(helloDue(NOW + MIN, NOW)).toBe(false)
})

test('the plan line names the window and its reset: a day for a week, a time for a short window', () => {
  expect(planLine({ name: 'Week', percent: 72.4, resetsAt: THU, withDay: true }, en)).toBe('72% of the weekly limit, resets Thu')
  expect(planLine({ name: 'Session', percent: 61, resetsAt: new Date(2026, 9, 10, 9, 5).toISOString(), withDay: false }, en)).toBe('61% of the 5-hour limit, resets 09:05')
  expect(planLine({ name: 'Fable', percent: 55, withDay: true }, en)).toBe('55% of the weekly limit (Fable)')
  expect(planLine({ name: 'Week', percent: 72, resetsAt: THU, withDay: true }, sv, 'sv')).toBe('72\u00a0% av veckogränsen, återställs tors')
})

test('the notice: a summary line, who needs you (said once), the plan; four lines at most', () => {
  const all = helloLines(facts({ needs: [{ name: 'app', kind: 'question' }], held: 2, finished: 3, plan: { name: 'Week', percent: 72, resetsAt: THU, withDay: true } }), en)
  expect(all).toEqual(['Vaken · 2 steps stopped · 3 your turn', 'Needs you: app (asks a question)', '72% of the weekly limit, resets Thu'])
  const many = helloLines(facts({ needs: [{ name: 'a', kind: 'question' }, { name: 'b', kind: 'permission' }, { name: 'c', kind: 'question' }], plan: { name: 'Week', percent: 90, withDay: true } }), en)
  expect(many).toEqual(['Vaken · Needs you: a (asks a question) · b (waits for an OK) · and 1 more', '90% of the weekly limit'])
  expect(many.length).toBeLessThanOrEqual(4)
  expect(helloLines(facts({ held: 1 }), en)).toEqual(['Vaken · 1 step stopped'])
})

test('held first: a stopped step is the first thing in the notice, here first, and a line names who holds it before the line of who asks', () => {
  const lines = helloLines(
    facts({ needs: [{ name: 'app', kind: 'question' }], held: 2, finished: 1, holds: [{ name: 'api', here: false }, { name: 'web', here: true }] }),
    en,
  )
  expect(lines[0]).toBe('Vaken · 2 steps stopped · 1 your turn')
  expect(lines[1]).toBe('Stopped: this session · api')
  expect(lines[2]).toBe('Needs you: app (asks a question)')
  expect(helloLines(facts({ needs: [{ name: 'app', kind: 'question' }], held: 1, holds: [{ name: 'api', here: false }] }), sv)).toEqual([
    'Vaken · 1 steg stoppat',
    'Stoppat: api',
    'Behöver dig: app (ställer en fråga)',
  ])
})

test('the cost so far rides with the plan in a notice that is said anyway; alone it makes no notice', () => {
  const week = { name: 'Week', percent: 72, resetsAt: THU, withDay: true }
  expect(helloLines(facts({ held: 1, usd: 1.234, plan: week }), en)).toEqual(['Vaken · 1 step stopped', '72% of the weekly limit, resets Thu · Cost: $1.23'])
  expect(helloLines(facts({ finished: 1, usd: 0.5 }), en)).toEqual(['Vaken · 1 your turn', 'Cost: $0.50'])
  expect(helloLines(facts({ finished: 1, usd: 0.5 }), sv, 'sv')[1]).toBe('Kostnad: 0,50\u00a0USD')
  expect(helloLines(facts({ usd: 3 }), en)).toEqual([])
  expect(helloLines(facts({ held: 1, usd: 0 }), en)).toEqual(['Vaken · 1 step stopped'])
})

test('with nothing to say there is no notice; the plan alone counts only above half', () => {
  expect(helloLines(facts(), en)).toEqual([])
  expect(helloLines(facts({ plan: { name: 'Week', percent: 50, withDay: true } }), en)).toEqual([])
  expect(helloLines(facts({ plan: { name: 'Week', percent: 51, resetsAt: THU, withDay: true } }), en)).toEqual(['Vaken · 51% of the weekly limit, resets Thu'])
})

test('in Swedish every word of the notice is Swedish', () => {
  const lines = helloLines(facts({ needs: [{ name: 'app', kind: 'permission' }], held: 1, finished: 2, plan: { name: 'Week', percent: 72, resetsAt: THU, withDay: true } }), sv, 'sv')
  expect(lines).toEqual(['Vaken · 1 steg stoppat · 2 din tur', 'Behöver dig: app (väntar på ett OK)', '72\u00a0% av veckogränsen, återställs tors'])
  for (const w of PHONE_VIEW_STRINGS) expect(byEnglish('sv', 'phone')[w] ?? '').not.toBe('')
  for (const w of englishOf('phone')) expect([...PHONE_VIEW_STRINGS, ...PHONENOTE_STRINGS, 'Phone hello', 'A short notice in the chat when your phone joins.']).toContain(w)
})

// ---- the hook, as the engine runs it

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
  return { clock, mem, session }
}

const rec = (id: string, at: number, over: Record<string, unknown> = {}) => ({ sessionId: id, cwd: `/w/${id}`, model: 'm', state: 'working', startedAt: at - 30 * MIN, updatedAt: at - 5_000, lastEventAt: at - 5_000, stateSince: at - 30 * MIN, ...over })
const busy = (now: number): Record<string, unknown> => ({
  'cockpit:firstrun': 'done',
  'cockpit:awake:asked': 1,
  'cockpit:phone:asked': 1,
  'cockpit:session:me': rec('me', now, { title: 'Docs' }),
  'cockpit:session:a': rec('a', now, { title: 'Fix login', state: 'waiting', ask: { kind: 'question', tool: 'AskUserQuestion', since: now - 12 * MIN } }),
  'cockpit:session:b': rec('b', now, { title: 'Billing', state: 'waiting', stateSince: now - 20 * MIN, sevenDayPercent: 72, sevenDayResetsAt: THU }),
})
const rows = (w: ReturnType<typeof world>): string[] => w.session.appended().map(r => (r.message.content[0] as { text: string }).text)

test('a phone joins: one system notice with what waits; the model never reads it', SLOW, async ($, on) => {
  forgetHello()
  const w = world(on, busy(NOW))
  await $.session.start({ cwd: '/w/me', surface: 'desktop', isInteractive: true } as never)
  await $.session.attach({ surface: 'mobile', clientId: 'mobile:default' })
  const got = w.session.appended()
  expect(got).toHaveLength(1)
  expect(got[0]?.message.type).toBe('system')
  expect(got[0]?.door).toBe('note')
  expect(rows(w)[0]).toBe('- Vaken · 1 your turn\n- Needs you: Fix login (asks a question)\n- 72% of the weekly limit, resets Thu\n- On the phone: /vaken for a menu, or /vaken show, /vaken run, /vaken pic.')
})

test('a desktop, a terminal or a vscode surface that joins gets no notice', async ($, on) => {
  forgetHello()
  const w = world(on, busy(NOW))
  await $.session.start({ cwd: '/w/me', surface: 'desktop', isInteractive: true } as never)
  for (const surface of ['desktop', 'vscode', 'terminal'] as const) await $.session.attach({ surface, clientId: `${surface}:default` })
  expect(w.session.appended()).toHaveLength(0)
})

test('a second join within 30 minutes is quiet; after 30 minutes the notice comes again', { timeoutMs: 15_000 }, async ($, on) => {
  forgetHello()
  const w = world(on, busy(NOW))
  await $.session.start({ cwd: '/w/me', surface: 'desktop', isInteractive: true } as never)
  await $.session.attach({ surface: 'mobile', clientId: 'mobile:one' })
  await w.clock.advance(10 * MIN)
  await $.session.attach({ surface: 'mobile', clientId: 'mobile:two' })
  expect(w.session.appended()).toHaveLength(1)
  await w.clock.advance(21 * MIN)
  for (const [k, v] of Object.entries(busy(w.clock.now()))) w.mem.set(k, v)
  await $.session.attach({ surface: 'mobile', clientId: 'mobile:one' })
  expect(w.session.appended()).toHaveLength(2)
})

test('with nothing waiting and the plan under half, nothing is said and the 30 minutes are not used up', async ($, on) => {
  forgetHello()
  const w = world(on, { 'cockpit:firstrun': 'done', 'cockpit:awake:asked': 1,
  'cockpit:phone:asked': 1, 'cockpit:session:me': rec('me', NOW, { title: 'Docs', sevenDayPercent: 20 }) })
  await $.session.start({ cwd: '/w/me', surface: 'desktop', isInteractive: true } as never)
  await $.session.attach({ surface: 'mobile', clientId: 'mobile:default' })
  expect(w.session.appended()).toHaveLength(0)
  for (const [k, v] of Object.entries(busy(w.clock.now()))) w.mem.set(k, v)
  await $.session.attach({ surface: 'mobile', clientId: 'mobile:default' })
  expect(w.session.appended()).toHaveLength(1)
})

test('Phone hello Off says nothing; in Swedish the notice is Swedish', async ($, on) => {
  forgetHello()
  const w = world(on, busy(NOW))
  await $.session.start({ cwd: '/w/me', surface: 'desktop', isInteractive: true } as never)
  await $.command.run({ ...viaParent('vaken-settings', 'phone.hello off'), origin: { kind: 'composer' } } as never)
  await $.session.attach({ surface: 'mobile', clientId: 'mobile:default' })
  expect(w.session.appended()).toHaveLength(0)
  await $.command.run({ ...viaParent('vaken-settings', 'phone.hello on'), origin: { kind: 'composer' } } as never)
  await $.command.run({ ...viaParent('vaken-settings', 'look.language sv'), origin: { kind: 'composer' } } as never)
  await $.session.attach({ surface: 'mobile', clientId: 'mobile:default' })
  expect(rows(w)[0]).toMatch(/^- Vaken · 1 din tur\n- Behöver dig: Fix login \(ställer en fråga\)\n- 72\u00a0% av veckogränsen, återställs /)
})

test('the first phone join with the awake guard Off adds one line that asks; it never comes again', SLOW, async ($, on) => {
  forgetHello()
  const w = world(on, busy(NOW))
  w.mem.delete('cockpit:awake:asked')
  await $.session.start({ cwd: '/w/me', surface: 'desktop', isInteractive: true } as never)
  await $.session.attach({ surface: 'mobile', clientId: 'mobile:default' })
  expect(rows(w)).toHaveLength(1)
  expect(rows(w)[0]?.split('\n').pop()).toBe('- Keep the Mac awake while you are away? Reply /vaken-help run awake on')
  expect(w.mem.get('cockpit:awake:asked')).toBe(NOW)
  expect(w.mem.get('cockpit:awake:phone')).toEqual({ 'me:mobile:default': NOW })
  await w.clock.advance(31 * MIN)
  for (const [k, v] of Object.entries(busy(w.clock.now()))) w.mem.set(k, v)
  await $.session.attach({ surface: 'mobile', clientId: 'mobile:default' })
  expect(rows(w)).toHaveLength(2)
  expect(rows(w)[1]).not.toMatch(/vaken-help run awake/)
})

test('the ask comes with only the phone words when nothing waits, and not at all when the guard is already On', async ($, on) => {
  forgetHello()
  const w = world(on, { 'cockpit:firstrun': 'done', 'cockpit:session:me': rec('me', NOW, { title: 'Docs' }) })
  await $.session.start({ cwd: '/w/me', surface: 'desktop', isInteractive: true } as never)
  await $.session.attach({ surface: 'mobile', clientId: 'mobile:default' })
  expect(rows(w)).toEqual(['- On the phone: /vaken for a menu, or /vaken show, /vaken run, /vaken pic.\n- Keep the Mac awake while you are away? Reply /vaken-help run awake on'])
  forgetHello()
  w.mem.delete('cockpit:awake:asked')
  w.mem.set('cockpit:setting:awake.mode', 'on')
  await $.session.attach({ surface: 'mobile', clientId: 'mobile:default' })
  expect(rows(w)).toHaveLength(1)
})
