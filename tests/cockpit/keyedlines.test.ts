// Lines kept with their row and facts (i18n lane B): a band line.
import { expect } from 'claude-code/testing'
import { test } from './slow'

import { bandKey, postBand, topLine } from '../hooks/core/band'
import type { BandItem } from '../hooks/core/band'
import { bandWords } from '../hooks/core/happened'
import { batchText, notices } from '../hooks/core/attention'
import type { Io } from '../hooks/core/io'
import { bandText } from '../hooks/core/rules'
import { sendButtons, sendQuestion } from '../hooks/core/inbox'
import { setLang, tr, trFill } from '../hooks/core/lang'
import { keyedOf, sayStored, tLine } from '../hooks/i18n/t'

const NOW = Date.parse('2026-10-13T12:00:00Z')
const MIN = 60_000

const memIo = (): { io: Io; mem: Map<string, unknown> } => {
  const mem = new Map<string, unknown>()
  const io = {
    now: async () => NOW,
    sessionId: async () => 'me',
    get: async (k: string) => mem.get(k),
    set: async (k: string, v: unknown) => void mem.set(k, v),
    del: async (k: string) => void mem.delete(k),
    invalidate: () => undefined,
  } as unknown as Io
  return { io, mem }
}

test('tLine gives the English with the facts, and keeps its row and facts', () => {
  const en = tLine('band.plugin_updated_name_to', { name: 'lint', to: '1.2' })
  expect(en).toBe('Plugin updated: lint 1.2')
  expect(keyedOf(en)).toEqual({ key: 'band.plugin_updated_name_to', vars: { name: 'lint', to: '1.2' } })
  expect(bandText([{ command: 'pkill', text: 'Never run `pkill`.', source: 'CLAUDE.md' } as never])).toBe('Rule broken: pkill')
})

test('a toast made with tLine is said from its row in Swedish; English stays as it is', () => {
  const en = tLine('needs.name_needs_you_reason', { name: 'api', reason: 'typed by you' })
  expect(trFill(en)).toBe(en)
  setLang('sv')
  try {
    expect(trFill(en)).toBe('"api" behöver dig: skrivet av dig.')
  } finally {
    setLang('en')
  }
})

test('a band item that holds its row is said from the row, only when the row gives the English it showed', async () => {
  const { io, mem } = memIo()
  await postBand(io, 'warn', 'trust:update', tLine('band.plugin_updated_name_to', { name: 'lint', to: '1.2' }))
  const [stored] = mem.get(bandKey('me')) as BandItem[]
  expect(stored).toMatchObject({ text: 'Plugin updated: lint 1.2', key: 'band.plugin_updated_name_to', vars: { name: 'lint', to: '1.2' } })
  const odd: BandItem = { ...stored, text: 'something else entirely' }
  setLang('sv')
  try {
    expect(bandWords(stored, tr)).toBe('Tillägg uppdaterat: lint 1.2')
    expect(bandWords(odd, tr)).toBe('something else entirely')
    expect(bandWords(topLine(0, [stored], NOW) ?? '', tr)).toBe('Tillägg uppdaterat: lint 1.2')
  } finally {
    setLang('en')
  }
  expect(bandWords(stored, tr)).toBe('Plugin updated: lint 1.2')
})

test('an item stored by an older version (English only) is still said by its shape', () => {
  const old: BandItem = { id: 'trust:update', level: 'warn', text: 'Plugin updated: lint 1.2', at: NOW, ttlMs: 10 * MIN }
  setLang('sv')
  try {
    expect(bandWords(old, tr)).toBe('Tillägg uppdaterat: lint 1.2')
  } finally {
    setLang('en')
  }
})

test('a stored row that is unknown, or facts that are not words and numbers, fall back to the English', () => {
  expect(sayStored({ key: 'band.no_such_row' })).toBeUndefined()
  expect(sayStored({ key: 'band.plugin_updated_name_to', vars: { name: { x: 1 } } })).toBeUndefined()
  expect(sayStored({ key: 42 })).toBeUndefined()
  expect(bandWords({ text: 'Gone idle', key: 'band.no_such_row' }, s => s)).toBe('Gone idle')
})

test('a cut band line keeps no row, so the row never says more than the line', async () => {
  const { io, mem } = memIo()
  await postBand(io, 'info', 'x', tLine('band.left_open_in_project_words', { project: 'app', words: 'w '.repeat(400) }))
  const [stored] = mem.get(bandKey('me')) as BandItem[]
  expect(stored.key).toBeUndefined()
  expect(stored.text.endsWith('…')).toBe(true)
})

test('the Needs you notices are made from their rows', () => {
  const rows = [{ id: 'a', name: 'api', kind: 'needs', reason: '', since: NOW }]
  const r = notices({}, rows, {}, 'all', NOW)
  expect(r.notices.map(n => n.text)).toEqual(['"api" needs you.'])
  expect(keyedOf('"api" needs you.')?.key).toBe('needs.name_needs_you')
  expect(batchText(r.notices)).toBe('"api" needs you.')
  setLang('sv')
  try {
    expect(trFill(batchText(r.notices))).toBe('"api" behöver dig.')
  } finally {
    setLang('en')
  }
})

test('the send question and its buttons follow the language, and English stays as it was', () => {
  expect(sendQuestion('api')).toBe('Send this message into "api"? It reads it as a message from a peer session, and may act on it.')
  expect(sendButtons()).toEqual({ yes: 'Send', no: 'Cancel' })
  setLang('sv')
  try {
    expect(sendQuestion('api').startsWith('Skicka det här meddelandet till "api"?')).toBe(true)
    expect(sendButtons()).toEqual({ yes: 'Skicka', no: 'Avbryt' })
  } finally {
    setLang('en')
  }
})
