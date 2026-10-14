// The safety of the translation work: a dialog's yes is decided so that the same word on both buttons is a No.
import { expect } from 'claude-code/testing'
import { test } from './slow'

import { saidYes } from '../hooks/core/confirm'
import { sendButtons } from '../hooks/core/inbox'
import { BAND_MAX_CHARS, bandKey, parseItems, postBand } from '../hooks/core/band'
import type { BandItem } from '../hooks/core/band'
import { bandWords } from '../hooks/core/happened'
import type { Io } from '../hooks/core/io'
import { setLang, t, tr, trFill } from '../hooks/core/lang'
import { sysWord } from '../hooks/core/syswords'
import { checkClaims, promptOf } from '../hooks/features/home/rowact'
import type { RowPrompt } from '../hooks/features/home/rowact'
import { KEYED_VALUE_MAX, KEYED_VARS_MAX, sayStored, tIn, tLine } from '../hooks/i18n/t'
import { TABLE, byEnglish } from '../hooks/i18n/table'

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
const ROW = 'band.plugin_updated_name_to'
const inSv = <T>(f: () => T): T => {
  setLang('sv')
  try {
    return f()
  } finally {
    setLang('en')
  }
}

test('a dialog says yes only for the yes label, and never when both buttons say the same word', () => {
  expect(saidYes('Send', { yes: 'Send', no: 'Cancel' })).toBe(true)
  expect(saidYes('Cancel', { yes: 'Send', no: 'Cancel' })).toBe(false)
  expect(saidYes('send', { yes: 'Send', no: 'Cancel' })).toBe(false)
  // A language that gives both buttons one word: the answer cannot tell them apart, so it is a No.
  expect(saidYes('OK', { yes: 'OK', no: 'OK' })).toBe(false)
  expect(saidYes('Ok', { yes: 'Ok', no: 'ok ' })).toBe(false)
  expect(saidYes('', { yes: '', no: 'Cancel' })).toBe(false)
  expect(saidYes(sendButtons().yes, sendButtons())).toBe(true)
  inSv(() => {
    expect(saidYes(sendButtons().yes, sendButtons())).toBe(true)
    expect(t('engines.packet_write_it')).not.toBe(t('engines.packet_do_not_write'))
  })
})

test('the claims prompt is English code, not a table row, in every language', () => {
  expect(Object.hasOwn(TABLE, 'words.claims_prompt')).toBe(false)
  const one = (checkClaims(1) as { prompt: RowPrompt }).prompt
  const three = (checkClaims(3) as { prompt: RowPrompt }).prompt
  const en = [promptOf(one).text, promptOf(three).text]
  expect(en).toEqual([
    'Your last answer says one thing is done with no check behind it. Run the checks that prove it, and show me the results.',
    'Your last answer says 3 things are done with no check behind them. Run the checks that prove them, and show me the results.',
  ])
  expect(inSv(() => [promptOf(one).text, promptOf(three).text])).toEqual(en)
})

test('a stored band line is said from its row only when the row gives the English it showed', () => {
  const text = tLine(ROW, { name: 'lint', to: '1.2' })
  expect(inSv(() => sayStored({ text, key: ROW, vars: { name: 'lint', to: '1.2' } }))).toBe('Tillägg uppdaterat: lint 1.2')
  expect(sayStored({ text: 'Gone idle', key: ROW, vars: { name: 'lint', to: '1.2' } })).toBeUndefined()
  expect(sayStored({ text, key: ROW, vars: { name: 'other', to: '1.2' } })).toBeUndefined()
  expect(sayStored({ key: ROW, vars: { name: 'lint', to: '1.2' } })).toBeUndefined()
  const plain: BandItem = { id: 'x', level: 'warn', text: 'Gone idle', at: NOW, ttlMs: 10 * MIN }
  const item: BandItem = { ...plain, key: ROW, vars: { name: 'lint', to: '1.2' } }
  expect(inSv(() => bandWords(item, tr))).toBe(inSv(() => bandWords(plain, tr)))
})

test('stored facts are capped in number and length, on read and on write', async () => {
  expect(BAND_MAX_CHARS).toBe(KEYED_VALUE_MAX)
  const many: Record<string, string> = { name: 'lint', to: '1.2' }
  for (let k = 0; k < KEYED_VARS_MAX; k += 1) many[`x${k}`] = 'y'
  const manyText = tIn('en', ROW, many)
  expect(sayStored({ text: manyText, key: ROW, vars: many })).toBeUndefined()
  const long = { name: 'n'.repeat(KEYED_VALUE_MAX + 1), to: '1.2' }
  expect(sayStored({ text: tIn('en', ROW, long), key: ROW, vars: long })).toBeUndefined()
  expect(sayStored({ text: 'Plugin updated: lint Infinity', key: ROW, vars: { name: 'lint', to: Infinity } })).toBeUndefined()
  const [read] = parseItems([{ id: 'x', level: 'warn', text: manyText, at: NOW, ttlMs: MIN, key: ROW, vars: many }])
  expect(read).toEqual({ id: 'x', level: 'warn', text: manyText, at: NOW, ttlMs: MIN })
  const { io, mem } = memIo()
  await postBand(io, 'warn', 'x', tLine(ROW, many))
  const [stored] = mem.get(bandKey('me')) as BandItem[]
  expect(stored.key).toBeUndefined()
  expect(stored.vars).toBeUndefined()
  await postBand(io, 'warn', 'y', tLine(ROW, { name: 'lint', to: '1.2' }))
  expect((mem.get(bandKey('me')) as BandItem[])[0]).toMatchObject({ key: ROW, vars: { name: 'lint', to: '1.2' } })
})

test('"constructor" and "toString" are never found in the table or its indexes', () => {
  for (const w of ['constructor', 'toString', '__proto__', 'hasOwnProperty']) {
    expect(Object.hasOwn(TABLE, w)).toBe(false)
    expect(TABLE[w]).toBeUndefined()
    expect(byEnglish('sv')[w]).toBeUndefined()
    expect(byEnglish('sv', 'band')[w]).toBeUndefined()
    expect(tIn('sv', w)).toBe(w)
    expect(sysWord(w, 'win32')).toBe(w)
    expect(inSv(() => [tr(w), trFill(w), t(w)])).toEqual([w, w, w])
    expect(sayStored({ text: w, key: w })).toBeUndefined()
  }
})
