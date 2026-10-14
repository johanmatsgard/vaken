import { expect } from 'claude-code/testing'
import { test } from './slow'

import { contextFacts, parseContext, tokenWord } from '../hooks/core/appcontext'
import { hereLines } from '../hooks/features/home/logic'
import type { Row } from '../hooks/features/home/logic'

const answer = JSON.stringify({
  plan: { status: 'ok' },
  context: {
    session: 'self',
    status: 'ok',
    tokensUsed: 93234,
    contextWindow: 1000000,
    percentUsed: 9,
    autoCompactsAtPercent: 97,
    categories: [
      { name: 'Messages', tokens: 25583, percent: 3 },
      { name: 'System tools', tokens: 25121, percent: 3 },
      { name: 'MCP tools', tokens: 19687, percent: 2 },
      { name: 'Skills', tokens: 9862, percent: 1 },
    ],
  },
})

test('the context answer is read: tokens, window, the auto-compact point and the three largest parts', () => {
  const c = parseContext(answer)
  expect(c?.tokens).toBe(93234)
  expect(c?.window).toBe(1000000)
  expect(c?.compactAt).toBe(97)
  expect(c?.top?.map(t => t.name)).toEqual(['Messages', 'System tools', 'MCP tools'])
})

test('a context that is not ok, or not json, gives nothing', () => {
  expect(parseContext('nope')).toBeUndefined()
  expect(parseContext(JSON.stringify({ context: { status: 'unavailable', note: 'idle' } }))).toBeUndefined()
  expect(parseContext(JSON.stringify({ plan: {} }))).toBeUndefined()
})

test('tokens are short words', () => {
  expect(tokenWord(93234)).toBe('93k')
  expect(tokenWord(1_000_000)).toBe('1M')
  expect(tokenWord(950)).toBe('950')
})

test('the compact line warns inside the last ten percent and when it is due', () => {
  const f = { compactAt: 97 }
  expect(contextFacts(f, 9).compact).toBe('Compacts at 97%')
  expect(contextFacts(f, 90).compact).toBe('Compacts by itself soon, at 97%')
  expect(contextFacts(f, 98).compact).toBe('Compacts by itself now')
  expect(contextFacts({ tokens: 93234, window: 1000000 }, 9).used).toBe('93k of 1M tokens')
})

test('the session card gets the compact point, the tokens and the biggest parts when it is explained', () => {
  const row = { kind: 'working', reason: '', sinceMs: 0, name: 'x', rec: { sessionId: 's', cwd: '/a', model: 'm', state: 'working', startedAt: 0, updatedAt: 0, lastEventAt: 0, stateSince: 0, contextPercent: 9, ctx: parseContext(answer) } } as unknown as Row
  const l = hereLines(row, 'explained')
  expect(l.compact).toBe('Compacts at 97%')
  expect(l.used).toBe('93k of 1M tokens')
  expect(l.top).toBe('Biggest: Messages 3%, System tools 3%, MCP tools 2%')
  expect(hereLines(row, 'simple').head).toBe('Working')
})
