// Audit fixes: a word a command does not take is named, the slash menu says every word, and small answers say the truth plainly.
import { expect, mock } from 'claude-code/testing'
import type { EngineInterface, On } from 'claude-code'

import { SLOW, test } from './slow'
import { COMPACT_ASK_MS, compactAsk, settleCompactAsk } from '../hooks/features/home/state'
import { HINTS } from '../hooks/core/menu'
import { COACH_HELP } from '../hooks/core/coach'
import { CREW_HELP } from '../hooks/core/crew'
import { PRIVACY_HELP } from '../hooks/features/home/views/help'
import { SETTINGS } from '../hooks/core/settings'
import { viaParent } from './viaparent'

const NOW = Date.parse('2026-10-11T12:00:00Z')
const SID = 'session-a'

function world(on: On, seed: Record<string, unknown> = {}): { mem: Map<string, unknown>; registered: Map<string, { description?: string; argumentHint?: string }> } {
  mock.clock(on, { now: NOW })
  mock.session(on)
  mock.env(on, { HOME: '/home/user' })
  const mem = new Map<string, unknown>(Object.entries(seed))
  const registered = new Map<string, { description?: string; argumentHint?: string }>()
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
  on('session.id', () => ({ value: SID }))
  on('session.cwd', () => ({ value: '/home/user/app' }))
  on('session.root', () => ({ value: '/home/user/app' }))
  on('ui.open', () => ({ value: { isPlaced: true } }) as never)
  on('ui.panes', () => ({ value: [] }) as never)
  on('command.register', (_$, e) => {
    const c = e as { name: string; description?: string; argumentHint?: string }
    registered.set(c.name, c)
    return { value: { command: c.name } } as never
  })
  on('fs.read', () => {
    throw new Error('no such file')
  })
  on('process.run', () => ({ value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never)
  return { mem, registered }
}

const say = async ($: EngineInterface, command: string, args: string): Promise<string> =>
  ((await $.command.run({ ...viaParent(command, args), origin: { kind: 'composer' } } as never)) as { text: string }).text

test('an unknown word is named with the words the command takes; an empty line and the command\'s own words still answer as before', SLOW, async ($, on) => {
  world(on)
  expect(await say($, 'vaken', 'zzz')).toBe('Unknown word: zzz. Words: inbox | neighbors')
  expect(await say($, 'vaken-usage', 'zzz')).toBe('Unknown word: zzz. Words: cost | budget | limits | fit | why')
  expect(await say($, 'vaken-compact', 'zzz')).toBe('Unknown word: zzz. Words: now | why')
  expect(await say($, 'vaken-today', 'zzz')).toBe('Unknown word: zzz. Words: value | recap | glance | standup | waits')
  for (const [c, a] of [['vaken', ''], ['vaken-usage', ''], ['vaken-compact', ''], ['vaken-compact', 'why'], ['vaken-today', ''], ['vaken-usage', 'fit']] as const) expect(await say($, c, a), `${c} ${a}`).not.toMatch(/^Unknown word/)
})

test('the slash menu: every word of settings and tasks is in the hint, and a description ends a sentence before "A word after it"', SLOW, async ($, on) => {
  const w = world(on)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/home/user/app', surface: 'desktop', isInteractive: true } as never)
  const settings = w.registered.get('vaken-settings')?.argumentHint ?? ''
  for (const word of ['all', 'preset', 'shape', 'simple', 'here', 'session', 'reset', 'layout', 'card', '<key> <value>']) expect(settings, word).toContain(word)
  const tasks = (w.registered.get('vaken-tasks')?.argumentHint ?? '').split(' | ').map(x => x.split(' ')[0])
  for (const word of ['load', 'add', 'set', 'remove', 'again', 'say', 'at', 'check', 'limit', 'name', 'template', 'afterlimit']) expect(tasks, word).toContain(word)
  for (const c of Object.keys(HINTS)) expect(w.registered.get(c)?.argumentHint, c).toBe(HINTS[c])
  for (const [name, c] of w.registered) if (!['vaken-pause', 'vaken-guard', 'vaken-away'].includes(name)) expect(c.description ?? '', name).not.toMatch(/[^.?] A word after it/)
})

test('small answers: no empty note, one reason once, fit says the command, here names the values, card takes the explain words, find says plainly', SLOW, async ($, on) => {
  world(on, { [`cockpit:projectof:${SID}`]: '/home/user/app' })
  const all = await say($, 'vaken-settings', 'all')
  expect(all).not.toMatch(/: \.$/m)
  expect(all).toMatch(/^ {2}Plan limits$/m)
  const usage = await say($, 'vaken-usage', '')
  const reasons = (/Not everything could be read just now: (.*)\.$/m.exec(usage)?.[1] ?? '').split('; ')
  expect(new Set(reasons).size).toBe(reasons.length)
  expect(await say($, 'vaken-usage', 'fit 20')).toMatch(/Type \/vaken-usage to read them now/)
  expect(await say($, 'vaken-settings', 'here compact.from 40')).toBe('No such choice: compact.from 40. compact.from takes: 30, 50, 70.')
  expect(await say($, 'vaken-settings', 'card limits')).toMatch(/^Settings of the limit card:/)
  expect(await say($, 'vaken-settings', 'card session')).toMatch(/^Settings of the here card:/)
  const found = await say($, 'vaken-resume', 'find hello')
  expect(found).not.toMatch(/no implementation|mcp\.call/)
  expect(found).toMatch(/It is not offered in this kind of session\.$/)
})

test('help says what is on by default: the decision log and the computer reading are on, not "off until you turn it on"', () => {
  const byKey = (k: string): string | undefined => SETTINGS.find(s => s.key === k)?.default
  expect([byKey('decisions.mode'), byKey('coach.mode'), byKey('laptop.mode')]).toEqual(['on', 'on', 'on'])
  for (const h of [...COACH_HELP, ...CREW_HELP, PRIVACY_HELP]) expect(h.text, h.title).not.toMatch(/off until (you turn it|turned) on/)
})

test('the Compact now ask closes after COMPACT_ASK_MS or at a new turn, and stays up before', () => {
  compactAsk.lines = ['Claude is still working.']
  compactAsk.at = NOW
  expect(settleCompactAsk(NOW + COMPACT_ASK_MS - 1)).toBe(false)
  expect(compactAsk.lines).toEqual(['Claude is still working.'])
  expect(settleCompactAsk(NOW + COMPACT_ASK_MS)).toBe(true)
  expect(compactAsk.lines).toBeUndefined()
  compactAsk.lines = ['Claude is still working.']
  compactAsk.at = NOW
  expect(settleCompactAsk(NOW + 1000, true)).toBe(true)
  expect(compactAsk.lines).toBeUndefined()
  expect(settleCompactAsk(NOW, true)).toBe(false)
})
