// The quiet note to Claude at the 30 % crossing: once per crossing, only when a mode that shows advice is on.
import { expect } from 'claude-code/testing'
import { test } from './slow'

import { NUDGE_NOTE, fromOf, nudge } from '../hooks/core/compactnudge'
import type { ScoreFacts } from '../hooks/core/compactscore'
import { SETTINGS } from '../hooks/core/settings'

const MIN = 60_000
const facts = (over: Partial<ScoreFacts> = {}): ScoreFacts => ({ working: true, waits: false, helpers: 0, background: 0, guardHeld: false, percent: 30, tokens: 60_000, saved: false, quietMs: 0, cacheLeftMs: 40 * MIN, ...over })

test('the note goes once at 30 %, not again, and goes again only after a compaction brought the chat below the line', () => {
  let sent = false
  const step = (over: Partial<ScoreFacts>, mode = 'auto'): string | undefined => {
    const r = nudge({ mode, sent, facts: facts(over) })
    sent = r.sent
    return r.note
  }
  expect(step({ percent: 29 })).toBeUndefined()
  expect(step({ percent: 30 })).toBe('Context is 30% full. Finish the current step, then end your turn so vaken can compact the session at a good moment. Do not start a new large step first.')
  expect(NUDGE_NOTE).toContain('end your turn')
  expect(step({ percent: 31 })).toBeUndefined()
  expect(step({ percent: 45 })).toBeUndefined()
  expect(step({ percent: 8 })).toBeUndefined()
  expect(step({ percent: 30 })).toContain('Context is 30% full')
  expect(step({ percent: 33 })).toBeUndefined()
})

test('no note when the mode is Off; Suggest and Watch and Auto send it', () => {
  expect(nudge({ mode: 'off', sent: false, facts: facts() }).note).toBeUndefined()
  for (const mode of ['suggest', 'watch', 'auto']) expect(nudge({ mode, sent: false, facts: facts() }).note).toContain('Context is')
})

test('no note for a stop Claude cannot fix: a question waits, helpers or background jobs run, the guard holds a step, a compaction just happened', () => {
  for (const over of [{ waits: true }, { helpers: 1 }, { background: 1 }, { guardHeld: true }, { sinceCompactMs: 5 * MIN }]) expect(nudge({ mode: 'auto', sent: false, facts: facts(over) }).note).toBeUndefined()
  // Work that is not at a checked point is something Claude can finish.
  expect(nudge({ mode: 'auto', sent: false, facts: facts({ working: false }) }).note).toBeDefined()
})

test('the cache is considered: with the cache nearly lapsed the note waits; the setting moves the line (50 %)', () => {
  expect(nudge({ mode: 'auto', sent: false, facts: facts({ cacheLeftMs: 30_000 }) }).note).toBeUndefined()
  expect(nudge({ mode: 'auto', sent: false, from: 50, facts: facts({ percent: 40 }) }).note).toBeUndefined()
  expect(nudge({ mode: 'auto', sent: false, from: 50, facts: facts({ percent: 50 }) }).note).toContain('50% full')
})

test('Compact from is a setting: 30, 50 or 70, default 30', () => {
  const row = SETTINGS.find(s => s.key === 'compact.from')
  expect(row?.default).toBe('30')
  expect(row?.options.map(o => o.value)).toEqual(['30', '50', '70'])
  expect([fromOf(undefined), fromOf('50'), fromOf('70'), fromOf('x')]).toEqual([30, 50, 70, 30])
})
