// Explain at my level: the end of the last answer goes to a small model, the reply comes back as at most 10 lines.
import { expect } from 'claude-code/testing'
import { test } from './slow'

import { FAILED_WORDS, NO_ANSWER_WORDS, SIMPLE_MAX_CHARS, answerPart, simpleLines, simplePrompt } from '../hooks/core/simple'
import { lastAnswer, noteAnswer, simpler } from '../hooks/features/simple'
import type { Io } from '../hooks/core/io'

const io = (reply: { isAnswered: boolean; text?: string } | 'throw', seen: string[] = []): Io =>
  ({
    complete: async (req: { prompt: string }) => {
      seen.push(req.prompt)
      if (reply === 'throw') throw new Error('no')
      return { ...reply, reason: 'x', usage: {} }
    },
  }) as unknown as Io

test('a long answer sends only its end', () => {
  const long = `${'a'.repeat(100)}\n${'b'.repeat(SIMPLE_MAX_CHARS)}`
  expect(answerPart(long).length).toBeLessThanOrEqual(SIMPLE_MAX_CHARS)
  expect(answerPart('  short  ')).toBe('short')
  expect(simplePrompt('Done.')).toMatch(/plain words:\n\nDone\.$/)
})

test('the reply is at most 10 lines, with no empty ones', () => {
  expect(simpleLines('One.\n\n  Two.  \n')).toEqual(['One.', 'Two.'])
  expect(simpleLines(Array.from({ length: 15 }, (_, k) => `L${k}`).join('\n'))).toHaveLength(10)
})

test('no answer yet, a reply, and a failure', async () => {
  expect(await simpler(io({ isAnswered: true, text: 'x' }), undefined)).toEqual([NO_ANSWER_WORDS])
  const seen: string[] = []
  expect(await simpler(io({ isAnswered: true, text: 'I fixed the file.\nIt works.' }, seen), 'Long technical answer')).toEqual(['I fixed the file.', 'It works.'])
  expect(seen[0]).toMatch(/Long technical answer/)
  expect(await simpler(io({ isAnswered: false }), 'x')).toEqual([FAILED_WORDS])
  expect(await simpler(io('throw'), 'x')).toEqual([FAILED_WORDS])
})

test('only a real answer replaces the last one', () => {
  noteAnswer('First')
  noteAnswer('   ')
  expect(lastAnswer()).toBe('First')
})
