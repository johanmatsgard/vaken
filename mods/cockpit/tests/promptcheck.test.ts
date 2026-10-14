// The prompt review's rule and its hook as the engine runs them.
import { expect, mock } from 'claude-code/testing'
import type { EngineInterface, On } from 'claude-code'

import { PROMPT_CHECK_BAND, PROMPT_CHECK_NOTE, PROMPT_CHECK_SETTINGS, checkMode, explainLast, hasAnchor, judgePrompt, wordCount } from '../hooks/core/promptcheck'
import { SLOW, test } from './slow'
import { viaParent } from './viaparent'

const NOW = Date.parse('2026-10-10T12:00:00Z')

test('a short prompt with nothing concrete is vague; five words is short, six is not', () => {
  expect(judgePrompt('Fix the bug')).toEqual({ vague: true, why: 'short', words: 3 })
  expect(judgePrompt('please add a dark mode')).toMatchObject({ vague: true, why: 'short', words: 5 })
  expect(judgePrompt('please add a dark mode toggle').vague).toBe(false)
  expect(wordCount('  one   two\nthree ')).toBe(3)
  expect(wordCount('')).toBe(0)
})

test('a command with a vague object is vague, even at six or seven words', () => {
  expect(judgePrompt('fix it')).toMatchObject({ vague: true, why: 'command' })
  expect(judgePrompt('make it better')).toMatchObject({ vague: true, why: 'command' })
  expect(judgePrompt('do the thing')).toMatchObject({ vague: true, why: 'command' })
  expect(judgePrompt('please make it a lot better now')).toMatchObject({ vague: true, why: 'command', words: 7 })
  expect(judgePrompt('make the login form much better for people on small phones').vague).toBe(false)
  expect(judgePrompt('refactor the parser module cleanly and carefully today').vague).toBe(false)
})

test('a file name, a path, a number, a quote or a code name makes a short prompt concrete', () => {
  for (const text of ['fix login.ts', 'fix src/auth/login', 'fix ./auth', 'fix it on line 12', 'fix "the header"', 'fix `header`', 'fix getUser', 'fix get_user', "fix 'the header'", 'fix ~/notes']) {
    expect(hasAnchor(text)).toBe(true)
    expect(judgePrompt(text).vague).toBe(false)
  }
  for (const text of ['fix it.', "don't fix it", 'make it better', 'and/or something']) expect(hasAnchor(text)).toBe(false)
})

test('a slash command, an empty text and a short reply are never vague', () => {
  expect(judgePrompt('/compact')).toMatchObject({ vague: false })
  expect(judgePrompt('/vaken-settings')).toMatchObject({ vague: false })
  expect(judgePrompt('   ')).toMatchObject({ vague: false, words: 0 })
  for (const text of ['yes', 'Yes, please do.', 'ok', 'Thanks!', 'continue', 'go ahead', 'looks good', 'do it']) expect(judgePrompt(text)).toMatchObject({ vague: false, why: 'reply' })
})

test('the setting: group Prompts, Off Tip Ask, default Tip (Recommended); an unknown value reads as Off', () => {
  const s = PROMPT_CHECK_SETTINGS[0]
  expect(s.key).toBe('prompt.check')
  expect(s.group).toBe('Prompts')
  expect(s.options.map(o => o.value)).toEqual(['off', 'tip', 'ask'])
  expect(s.default).toBe('tip')
  expect(checkMode('ask')).toBe('ask')
  expect(checkMode('nonsense')).toBe('off')
  expect(checkMode(undefined)).toBe('off')
})

test('the words: the band line and the note are the agreed ones, and fit a band row', () => {
  expect(PROMPT_CHECK_BAND).toBe('Vague prompt. Add the file or the goal.')
  expect(PROMPT_CHECK_BAND.length).toBeLessThanOrEqual(60)
  expect(PROMPT_CHECK_NOTE).toBe('Vaken note: the request is short. If the goal is unclear, ask one short question before you start.')
})

test('the one-line explanation says the count, the verdict and what was done', () => {
  expect(explainLast(undefined, 'off')).toMatch(/is off\. Turn it on: Settings > Prompts and memory/)
  expect(explainLast(undefined, 'tip')).toMatch(/No prompt reviewed yet/)
  const vagueAsk = explainLast({ at: NOW, words: 2, why: 'command', vague: true, mode: 'ask' }, 'ask')
  expect(vagueAsk).toMatch(/Last prompt: 2 words, a short command/)
  expect(vagueAsk).toMatch(/Judged vague\. A tip showed above the chat box, and Claude was told to ask one short question/)
  expect(explainLast({ at: NOW, words: 3, why: 'short', vague: true, mode: 'tip' }, 'tip')).toMatch(/fewer than 6 words.*Claude was told nothing/)
  expect(explainLast({ at: NOW, words: 12, why: 'clear', vague: false, mode: 'tip' }, 'tip')).toBe('Last prompt: 12 words. Judged clear enough. Nothing was done.')
  expect(explainLast({ at: NOW, words: 1, why: 'reply', vague: false, mode: 'tip' }, 'off')).toMatch(/1 word\. Judged a short reply.*Prompt review is off now\./)
})

function memStore(on: On, seed: Record<string, unknown> = {}): Map<string, unknown> {
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
  return mem
}

function world(on: On, seed: Record<string, unknown> = {}): Map<string, unknown> {
  mock.clock(on, { now: NOW })
  const mem = memStore(on, seed)
  mock.session(on)
  mock.env(on, { HOME: '/home/test' })
  on('session.id', () => ({ value: 'me' }))
  on('command.register', () => ({ value: { command: 'x' } }))
  on('ui.invalidate', () => ({ value: undefined }))
  on('ui.toast', () => ({ value: undefined }) as never)
  on('prompt.submit', (_$, e) => ({ text: e.text, context: e.context }) as never)
  return mem
}

const submit = async ($: EngineInterface, text: string): Promise<{ text: string; context?: readonly string[] }> =>
  ((await $.prompt.submit({ text } as never).catch(() => ({ text }))) ?? { text }) as { text: string; context?: readonly string[] }
const explain = async ($: EngineInterface): Promise<string> => ((await $.command.run(viaParent('vaken-promptcheck', '') as never)) as { text: string }).text
const bandOf = (mem: Map<string, unknown>): string => JSON.stringify(mem.get('cockpit:band:me') ?? [])

test('Off: nothing is judged, nothing is added, nothing is kept', SLOW, async ($, on) => {
  const mem = world(on, { 'cockpit:setting:prompt.check': 'off' })
  const r = await submit($, 'fix it')
  expect(r.context ?? []).toEqual([])
  expect(bandOf(mem)).not.toMatch(/Vague prompt/)
  expect([...mem.keys()].some(k => k.startsWith('cockpit:promptcheck:last'))).toBe(false)
  expect(await explain($)).toMatch(/is off\. Turn it on/)
})

test('Tip: a vague prompt posts one band line and sends nothing to Claude; a clear one posts nothing', async ($, on) => {
  const mem = world(on, { 'cockpit:setting:prompt.check': 'tip' })
  const clear = await submit($, 'Fix the null error in src/auth/login.ts on line 40')
  expect(clear.context ?? []).toEqual([])
  expect(bandOf(mem)).not.toMatch(/Vague prompt/)
  const vague = await submit($, 'fix it')
  expect(vague.text).toBe('fix it')
  expect(vague.context ?? []).toEqual([])
  const band = mem.get('cockpit:band:me') as Array<{ text: string; level: string; ttlMs: number }>
  expect(band.filter(b => b.text === PROMPT_CHECK_BAND)).toHaveLength(1)
  expect(band.find(b => b.text === PROMPT_CHECK_BAND)).toMatchObject({ level: 'info', ttlMs: 5 * 60_000 })
  expect(await explain($)).toMatch(/Last prompt: 2 words.*Judged vague\. A tip showed above the chat box\. Claude was told nothing\./)
})

test('Ask: a vague prompt also carries the note for Claude, and the words stay the same', async ($, on) => {
  const mem = world(on, { 'cockpit:setting:prompt.check': 'ask' })
  const r = await submit($, 'make it better')
  expect(r.text).toBe('make it better')
  expect(r.context).toEqual([PROMPT_CHECK_NOTE])
  expect(bandOf(mem)).toMatch(/Vague prompt/)
  expect((await submit($, '/compact')).context ?? []).toEqual([])
  expect((await submit($, 'yes')).context ?? []).toEqual([])
  expect(await explain($)).toMatch(/Last prompt: 1 word\. Judged a short reply/)
})

test('what is kept is a count and a verdict, never the words of the prompt', async ($, on) => {
  const mem = world(on, { 'cockpit:setting:prompt.check': 'ask' })
  await submit($, 'fix the secretproject thing')
  expect(JSON.stringify([...mem.entries()].filter(([k]) => k.startsWith('cockpit:promptcheck:') || k.startsWith('cockpit:band:')))).not.toMatch(/secretproject/)
})
