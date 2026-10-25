// Switch cost warning: the warning before a model switch is one calm band line with vaken's own percent of the 5-hour window.
// It only warns: the hook never answers the switch, and a cold cache, a small chat or the same model say nothing. Once per switch.
import { expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'

import { HINT_KEY } from '../hooks/core/costhint'
import { setLang } from '../hooks/core/lang'
import { trFill } from '../hooks/i18n/t'
import { switchBandLine, switchPercent } from '../hooks/core/route'
import { test } from './slow'

const NOW = Date.parse('2026-10-18T12:00:00Z')
const turns = (n: number) => Array.from({ length: n }, () => ({ usd: 2, pct: 3, big: false }))

function memStore(on: On): Map<string, unknown> {
  const mem = new Map<string, unknown>()
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

const switchEvent = { from_model: 'claude-opus-4-1', to_model: 'claude-sonnet-4-5', requested_model: 'sonnet', source: 'command' as const, context_tokens: 150_000, prompt_cache_warm: true, cache_ttl: '5m' as const, estimated_cache_write_usd: 4, pricing: 'catalog' as const }
const whats = (mem: Map<string, unknown>): string[] => ((mem.get('cockpit:ledger:compact') as Array<{ what: string }> | undefined) ?? []).map(l => l.what)
const bandOf = (mem: Map<string, unknown>) => (mem.get('cockpit:band:test-session') ?? []) as { id: string; text: string; level: string; key?: string }[]

test('the percent comes from the past turns (points per dollar), and is none without enough of them or under a point', () => {
  // 3 points for 2 dollars: a 0.90 dollar rewrite is about 1.35 points, said as 1
  expect(switchPercent(turns(5), 0.9)).toBe(1)
  expect(switchPercent(turns(5), 4)).toBe(6)
  expect(switchPercent(turns(5), 1000)).toBe(100)
  expect(switchPercent(turns(4), 4)).toBeUndefined()
  expect(switchPercent(turns(5), 0.1)).toBeUndefined()
})

test('the line says the percent in English and Swedish', () => {
  expect(switchBandLine(6)).toBe('A switch drops the cache: about 6% of your 5-hour window.')
  setLang('sv')
  try {
    expect(trFill(switchBandLine(6))).toBe('Ett byte släpper cachen: ungefär 6 % av ditt 5-timmarsfönster.')
  } finally {
    setLang('en')
  }
})

test('a switch that drops a warm big cache posts one calm band line with the percent, once, and never blocks', async ($, on) => {
  mock.clock(on, { now: NOW })
  const mem = memStore(on)
  mock.session(on)
  on('session.id', () => ({ value: 'test-session' }))
  mem.set(HINT_KEY, turns(6))
  const shown: string[] = []
  on('ui.toast', (_$, e) => {
    shown.push(e.text)
    return { value: undefined } as never
  })
  on('classic.PreModelSwitch', () => ({}) as never)
  const a = await $.classic.PreModelSwitch(switchEvent)
  await $.classic.PreModelSwitch(switchEvent)
  expect(JSON.stringify(a)).not.toMatch(/deny|ask|block/)
  expect(bandOf(mem).filter(x => x.id === 'switch-cache')).toEqual([expect.objectContaining({ text: 'A switch drops the cache: about 6% of your 5-hour window.', level: 'info' })])
  // The ledger keeps the dollars once; a toast does not say it twice
  expect(whats(mem)).toEqual(['Warned before a model switch'])
  for (let n = 0; n < 50; n += 1) await Promise.resolve()
  expect(shown).toEqual([])
  // A cold cache, a small chat and the same model say nothing
  await $.classic.PreModelSwitch({ ...switchEvent, prompt_cache_warm: false, to_model: 'claude-haiku-4-5' })
  await $.classic.PreModelSwitch({ ...switchEvent, context_tokens: 50_000, to_model: 'claude-fable-1' })
  await $.classic.PreModelSwitch({ ...switchEvent, to_model: switchEvent.from_model })
  expect(whats(mem)).toEqual(['Warned before a model switch'])
  expect(bandOf(mem).filter(x => x.id === 'switch-cache')).toHaveLength(1)
})

test('with too few past turns there is no honest percent: the old toast says the dollars and the band stays empty', async ($, on) => {
  mock.clock(on, { now: NOW })
  const mem = memStore(on)
  mock.session(on)
  on('session.id', () => ({ value: 'test-session' }))
  mem.set(HINT_KEY, turns(2))
  const shown: string[] = []
  on('ui.toast', (_$, e) => {
    shown.push(e.text)
    return { value: undefined } as never
  })
  on('classic.PreModelSwitch', () => ({}) as never)
  await $.classic.PreModelSwitch(switchEvent)
  for (let n = 0; n < 200 && shown.length === 0; n += 1) await Promise.resolve()
  expect(shown).toEqual(['A model switch writes the saved session again (150k tokens) and costs about\u00a0$4.0.'])
  expect(bandOf(mem).some(x => x.id === 'switch-cache')).toBe(false)
})
