// Explain at my level: the last answer retold in short plain words by a small model, held in memory only and sent only on request.
export const SIMPLE_MODEL = 'haiku'
// Only the end of the answer is sent, since it holds the outcome.
export const SIMPLE_MAX_CHARS = 6_000
export const SIMPLE_REPLY_TOKENS = 500
export const SIMPLE_TIMEOUT_MS = 30_000

export const SIMPLE_SYSTEM = [
  'You re-tell a coding assistant\'s answer for a person who is not an engineer.',
  'Use short sentences and common words. One idea per sentence. Active voice.',
  'Say what was done, whether it worked, and what the person should do now.',
  'Explain any technical word in a few words right after it. Keep file names and commands exact.',
  'At most 8 short lines. No headings. Do not add facts that are not in the answer.',
].join(' ')

export function answerPart(answer: string): string {
  const t = answer.trim()
  if (t.length <= SIMPLE_MAX_CHARS) return t
  const tail = t.slice(-SIMPLE_MAX_CHARS)
  const nl = tail.indexOf('\n')
  return nl >= 0 && nl < 400 ? tail.slice(nl + 1) : tail
}

export const simplePrompt = (answer: string): string => `Re-tell this answer in plain words:\n\n${answerPart(answer)}`

export const simpleLines = (text: string): string[] =>
  text
    .split('\n')
    .map(l => l.trim())
    .filter(l => l !== '')
    .slice(0, 10)

export const NO_ANSWER_WORDS = 'There is no answer from Claude in this session yet.'
export const FAILED_WORDS = 'The small model did not answer. Try again in a moment.'
