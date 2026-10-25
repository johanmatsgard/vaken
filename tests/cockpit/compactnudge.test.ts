// The quiet note to Claude at the 60 % crossing: once per crossing, only when a mode that shows advice is on, only for a session worth compacting.
import { expect } from 'claude-code/testing'
import { test } from './slow'

import { COMPACT_GAP_MS } from '../hooks/core/compactauto'
import { NUDGE_NOTE, fromOf, nudge } from '../hooks/core/compactnudge'
import type { NudgeFacts } from '../hooks/core/compactnudge'
import { SETTINGS } from '../hooks/core/settings'

const MIN = 60_000
const facts = (over: Partial<NudgeFacts> = {}): NudgeFacts => ({ percent: 60, tokens: 300_000, ...over })

test('the note goes once at 60 %, not again, and goes again only after a compaction brought the chat below the line', () => {
  let sent = false
  const step = (over: Partial<NudgeFacts>, mode = 'auto'): string | undefined => {
    const r = nudge({ mode, sent, facts: facts(over) })
    sent = r.sent
    return r.note
  }
  expect(step({ percent: 59 })).toBeUndefined()
  expect(step({ percent: 60 })).toBe('Context is 60% full. Finish the current step, then end your turn so vaken can compact the session at a good moment. Do not start a new large step first.')
  expect(NUDGE_NOTE).toContain('end your turn')
  expect(step({ percent: 61 })).toBeUndefined()
  expect(step({ percent: 75 })).toBeUndefined()
  expect(step({ percent: 8 })).toBeUndefined()
  expect(step({ percent: 60 })).toContain('Context is 60% full')
  expect(step({ percent: 63 })).toBeUndefined()
})

test('no note when the mode is Off; Suggest and Watch and Auto send it', () => {
  expect(nudge({ mode: 'off', sent: false, facts: facts() }).note).toBeUndefined()
  for (const mode of ['suggest', 'watch', 'auto']) expect(nudge({ mode, sent: false, facts: facts() }).note).toContain('Context is')
})

test('mid-task is what the note is for: agents, a background command or a risky step waiting do not hold it back; a small session and a compaction just made do', () => {
  expect(nudge({ mode: 'auto', sent: false, facts: facts() }).note).toBeDefined()
  expect(nudge({ mode: 'auto', sent: false, facts: facts({ tokens: 99_999 }) }).note).toBeUndefined()
  expect(nudge({ mode: 'auto', sent: false, facts: facts({ tokens: undefined }) }).note).toBeUndefined()
  expect(nudge({ mode: 'auto', sent: false, minTokens: 200_000, facts: facts({ tokens: 150_000 }) }).note).toBeUndefined()
  expect(nudge({ mode: 'auto', sent: false, facts: facts({ sinceCompactMs: COMPACT_GAP_MS - 1 }) }).note).toBeUndefined()
  expect(nudge({ mode: 'auto', sent: false, facts: facts({ sinceCompactMs: 25 * MIN }) }).note).toBeDefined()
  // A small session that is not sent leaves the crossing open: the note can still come later.
  expect(nudge({ mode: 'auto', sent: false, facts: facts({ tokens: 10_000 }) }).sent).toBe(false)
})

test('the setting moves the line (70 %)', () => {
  expect(nudge({ mode: 'auto', sent: false, from: 70, facts: facts({ percent: 65 }) }).note).toBeUndefined()
  expect(nudge({ mode: 'auto', sent: false, from: 70, facts: facts({ percent: 70 }) }).note).toContain('70% full')
})

test('Compact when it fills is a setting: 50, 60 or 70, default 60', () => {
  const row = SETTINGS.find(s => s.key === 'compact.from')
  expect(row?.default).toBe('60')
  expect(row?.options.map(o => o.value)).toEqual(['50', '60', '70'])
  expect([fromOf(undefined), fromOf('50'), fromOf('60'), fromOf('70'), fromOf('30'), fromOf('x')]).toEqual([60, 50, 60, 70, 50, 60])
})
