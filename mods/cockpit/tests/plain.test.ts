import { expect, mock } from 'claude-code/testing'
import { test } from './slow'

import { GLOSSARY, PLAIN_TEXT, glossaryText } from '../hooks/core/plain'
import { viaParent } from './viaparent'

test('the plain-words section is short and says the four things', () => {
  expect(PLAIN_TEXT.length).toBeLessThan(600)
  expect(PLAIN_TEXT).toMatch(/short sentences/)
  expect(PLAIN_TEXT).toMatch(/at most two options/)
  expect(PLAIN_TEXT).toMatch(/what the person must do/)
})

test('every glossary word has a meaning in plain words', () => {
  for (const [term, meaning] of GLOSSARY) {
    expect(term.length).toBeGreaterThan(0)
    expect(meaning.endsWith('.')).toBe(true)
    expect(meaning.split(' ').length).toBeLessThan(30)
  }
  expect(glossaryText()).toMatch(/Cache: /)
})

test('/vaken-help glossary lists the words', async ($, on) => {
  mock.session(on)
  const r = (await $.command.run(viaParent('vaken-glossary', '') as never)) as { text: string }
  expect(r.text).toMatch(/Compact: /)
})
