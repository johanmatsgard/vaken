import { expect } from 'claude-code/testing'
import { test } from './slow'

import { extraLines, parseStoredUsage, parseUsage } from '../hooks/core/appusage'
import { setLang } from '../hooks/core/lang'

const answer = JSON.stringify({
  plan: {
    status: 'ok',
    plan: 'Max',
    windows: [
      { label: '5-hour limit', percentUsed: 4, resetsAt: '2026-10-10T06:30:00.271Z', resetsIn: '2h 52m' },
      { label: 'Weekly · all models', percentUsed: 25, resetsAt: '2026-10-12T09:00:00.271Z' },
      { label: 'Weekly · Fable', percentUsed: 4, resetsAt: '2026-10-12T09:00:00.271Z' },
    ],
    extraUsage: { enabled: false, currency: 'USD' },
  },
  context: { session: 'self', status: 'ok' },
})

test('the usage answer is read into windows, the plan and extra usage', () => {
  const u = parseUsage(answer, 5)
  expect(u?.plan).toBe('Max')
  expect(u?.windows.map(w => [w.label, w.percent])).toEqual([['5-hour limit', 4], ['Weekly · all models', 25], ['Weekly · Fable', 4]])
  expect(u?.windows[1].resetsAt).toBe('2026-10-12T09:00:00.271Z')
  expect(u?.extra).toEqual({ enabled: false, currency: 'USD' })
})

test('an answer that does not fit gives nothing, never a guess', () => {
  expect(parseUsage('not json', 1)).toBeUndefined()
  expect(parseUsage(JSON.stringify({ plan: { status: 'not_applicable' } }), 1)).toBeUndefined()
  expect(parseUsage(JSON.stringify({ plan: { status: 'ok', windows: [{ label: 'x' }] } }), 1)).toBeUndefined()
})

test('a kept reading comes back the same, and a broken one gives nothing', () => {
  const u = parseUsage(answer, 5)
  expect(parseStoredUsage(JSON.parse(JSON.stringify(u)))).toEqual(u)
  expect(parseStoredUsage({ at: 'x' })).toBeUndefined()
  expect(parseStoredUsage(undefined)).toBeUndefined()
})

test('extra usage is words: off, or on with the credit limit and what is used when the app gives figures', () => {
  expect(extraLines({ enabled: false, currency: 'USD' })).toEqual(['Extra usage: Off'])
  expect(extraLines({ enabled: true, currency: 'USD' })).toEqual(['Extra usage: On'])
  expect(extraLines({ enabled: true, currency: 'USD', details: { monthlyLimit: 50, usedCredits: 12.4 } })).toEqual(['Extra usage: On', 'Credit limit: $50.00', 'Used: $12.40'])
  expect(extraLines({ enabled: true, currency: 'EUR', details: { limitCents: 5000, spentCents: 1240, resetsAt: 5 } })).toEqual(['Extra usage: On', 'Credit limit: €50.00', 'Used: €12.40'])
  expect(extraLines({ enabled: true, details: { percentUsed: 24.8 } })).toEqual(['Extra usage: On', '25% of the credit limit used'])
  expect(extraLines({ enabled: true, details: { tier: 'x', other: 3 } })).toEqual(['Extra usage: On'])
})

test('the figures the app gives for extra usage are kept by name, and only plain ones', () => {
  const answer = JSON.stringify({ plan: { status: 'ok', windows: [{ label: '5-hour limit', percentUsed: 1 }], extraUsage: { enabled: true, currency: 'USD', monthlyLimit: 50, usedCredits: 12.4, nested: { a: 1 }, note: 'x'.repeat(80) } } })
  const u = parseUsage(answer, 1)
  expect(u?.extra).toEqual({ enabled: true, currency: 'USD', details: { monthlyLimit: 50, usedCredits: 12.4 } })
  expect(parseStoredUsage(JSON.parse(JSON.stringify(u)))?.extra).toEqual(u?.extra)
})

test('extra usage amounts go through fmt: Swedish says a decimal comma and the code after the figure', () => {
  setLang('sv')
  try {
    expect(extraLines({ enabled: true, currency: 'USD', details: { monthlyLimit: 50, usedCredits: 12.4 } }).slice(1)).toEqual(['Credit limit: 50,00\u00a0USD', 'Used: 12,40\u00a0USD'])
    expect(extraLines({ enabled: true, currency: 'EUR', details: { limitCents: 5000 } }).slice(1)).toEqual(['Credit limit: 50,00\u00a0EUR'])
  } finally {
    setLang('en')
  }
  expect(extraLines({ enabled: true, details: { monthlyLimit: 50, percentUsed: 99.6 } }).slice(1)).toEqual(['Credit limit: 50.00', '99% of the credit limit used'])
})
