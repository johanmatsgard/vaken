// The next prompt hint: with Buttons and hint, the first pick's request in short form becomes the dim hint in the prompt box; the engine's own hint always wins.
import { expect, mock } from 'claude-code/testing'
import type { EngineInterface, On } from 'claude-code'

import { BUILT_IN, NEXT_STRINGS, engineHintNow, hintMem, hintOf, nextModeOf } from '../hooks/core/actions'
import { SUBMIT_AFTER_MS } from '../hooks/core/phonenote'
import { PRESETS } from '../hooks/core/presets'
import { fullHintToWrite } from '../hooks/core/nextupgrade'
import { byEnglish } from '../hooks/i18n/table'
import { SLOW, test } from './slow'

const NOW = Date.parse('2026-10-16T12:00:00Z')
const ROOT = '/w/me'
const SV = byEnglish('sv')

test('the hint is the first pick in short form, only with Buttons and hint, and every built-in step has one', () => {
  expect(nextModeOf('hint')).toBe('hint')
  expect(nextModeOf('buttons')).toBe('buttons')
  expect(nextModeOf(undefined)).toBe('buttons')
  expect(hintOf('hint', ['tests', 'diff'])).toBe('Run the tests and tell me the result')
  expect(hintOf('buttons', ['tests', 'diff'])).toBeUndefined()
  expect(hintOf('off', ['tests'])).toBeUndefined()
  expect(hintOf('hint', [])).toBeUndefined()
  for (const a of BUILT_IN) {
    expect((a.hint ?? '').length).toBeGreaterThan(0)
    expect(a.hint ?? '').not.toContain('—')
  }
  expect(SV['Buttons and hint'] ?? '').not.toBe('')
  expect(NEXT_STRINGS).toContain('Buttons and hint')
})

test('the engine hint wins only when it came after the turn began', () => {
  hintMem.turnAt = NOW
  hintMem.engineAt = undefined
  expect(engineHintNow()).toBe(false)
  hintMem.engineAt = NOW - 1
  expect(engineHintNow()).toBe(false)
  hintMem.engineAt = NOW + 5
  expect(engineHintNow()).toBe(true)
  hintMem.turnAt = undefined
  hintMem.engineAt = undefined
})

test('Everything useful sets Buttons and hint; an older store on that mode moves to it once, any other mode stays', () => {
  const full = { ...(PRESETS.find(p => p.name === 'full')?.values ?? {}) }
  expect(full['next.mode']).toBe('hint')
  expect(fullHintToWrite({ ...full, 'next.mode': 'buttons' })).toBe('hint')
  expect(fullHintToWrite(full)).toBeUndefined()
  const balanced = { ...(PRESETS.find(p => p.name === 'balanced')?.values ?? {}) }
  expect(fullHintToWrite(balanced)).toBeUndefined()
  expect(fullHintToWrite({ ...full, 'next.mode': 'off' })).toBeUndefined()
})

function world(on: On, mode: string) {
  const clock = mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test', LANG: 'en_US.UTF-8' })
  const mem = new Map<string, unknown>(Object.entries({ 'cockpit:setting:plain.mode': 'off', 'cockpit:firstrun': 'done', 'cockpit:awake:asked': 1, 'cockpit:phone:asked': 1, 'cockpit:setting:next.mode': mode }))
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
  mock.session(on)
  on('session.id', () => ({ value: 'me' }))
  on('session.model', () => ({ value: 'claude-opus-5' }))
  on('session.root', () => ({ value: ROOT }) as never)
  on('session.cwd', () => ({ value: ROOT }) as never)
  on('session.surfaces', () => ({ value: ['desktop'] }) as never)
  on('command.register', () => ({ value: { command: 'x' } }))
  on('process.run', () => ({ value: { exitCode: 1, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never)
  on('ui.toast', () => ({ value: undefined }) as never)
  on('ui.invalidate', () => ({ value: undefined }))
  on('ui.panes', () => ({ value: [] }) as never)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('turn.start', (_$, e) => ({ turnId: e.turnId }))
  on('turn.complete', (_$, e) => ({ text: e.answer }))
  on('tool.call', () => ({ result: {}, text: 'ok' }) as never)
  const shown: string[] = []
  on('prompt.suggest', (_$, e) => {
    shown.push(e.text)
    return { isShown: true }
  })
  return { clock, shown }
}

const turn = async ($: EngineInterface): Promise<void> => {
  await $.turn.start({ text: 'go', turnId: 't1' } as never)
  await $.tool.call({ tool: 'Edit', file_path: `${ROOT}/a.ts` } as never)
  await $.turn.complete({ answer: 'I changed the file.', durationMs: 1000, isAborted: false, turnId: 't1', reason: 'answer' } as never)
}

test('Buttons and hint: after an edit the prompt box gets the first step as a dim hint, a moment after the answer', SLOW, async ($, on) => {
  const w = world(on, 'hint')
  await $.session.start({ cwd: ROOT, surface: 'desktop', isInteractive: true } as never)
  await turn($)
  expect(w.shown).toEqual([])
  await w.clock.advance(SUBMIT_AFTER_MS)
  expect(w.shown).toEqual(['Run the tests and tell me the result'])
})

test('Buttons alone shows no hint', SLOW, async ($, on) => {
  const w = world(on, 'buttons')
  await $.session.start({ cwd: ROOT, surface: 'desktop', isInteractive: true } as never)
  await turn($)
  await w.clock.advance(SUBMIT_AFTER_MS)
  expect(w.shown).toEqual([])
})

test("the engine's own hint is kept: vaken proposes none after it, and its hook drops vaken's text", SLOW, async ($, on) => {
  const w = world(on, 'hint')
  await $.session.start({ cwd: ROOT, surface: 'desktop', isInteractive: true } as never)
  await turn($)
  await w.clock.advance(1)
  const engine = (await $.prompt.suggest({ text: 'Add a test for the edge case', origin: { kind: 'suggestion' } } as never)) as { isShown: boolean }
  expect(engine.isShown).toBe(true)
  await w.clock.advance(SUBMIT_AFTER_MS)
  expect(w.shown).toEqual(['Add a test for the edge case'])
  const mine = (await $.prompt.suggest({ text: 'Run the tests and tell me the result', origin: { kind: 'plugin', name: 'vaken' } } as never)) as { isShown: boolean }
  expect(mine.isShown).toBe(false)
})
