// Prompt review: a cheap local test finds a vague prompt. No model call, nothing rewritten, and the prompt text is never stored, only the word count and verdict.
import type { HelpEntry } from './registry'
import type { Setting } from './settings'
import { tEn } from '../i18n/t'

export const PROMPT_CHECK_KEY = 'prompt.check'
type CheckMode = 'off' | 'tip' | 'ask'
export const checkMode = (raw: unknown): CheckMode => (raw === 'tip' || raw === 'ask' ? raw : 'off')

const VAGUE_WORDS = 6
// From this many words a command carries enough on its own.
const COMMAND_MAX_WORDS = 8
export const PROMPT_CHECK_BAND = 'Vague prompt. Add the file or the goal.'
export const PROMPT_CHECK_BAND_MS = 5 * 60_000
export const PROMPT_CHECK_NOTE = 'Vaken note: the request is short. If the goal is unclear, ask one short question before you start.'

export const PROMPT_CHECK_SETTINGS: Setting[] = [
  {
    key: PROMPT_CHECK_KEY,
    group: 'Prompts',
    label: 'Prompt review',
    note: 'Finds vague prompts. Tip shows a line. Ask also tells Claude.',
    options: [
      { value: 'off', label: 'Off' },
      { value: 'tip', label: 'Tip' },
      { value: 'ask', label: 'Ask' },
    ],
    default: 'tip',
  },
]
export const PROMPT_CHECK_HELP: HelpEntry[] = [
  {
    title: 'What the prompt review does',
    text: 'The prompt review finds a vague message: fewer than 6 words, or a command such as "fix it" with no file name, path, number or quoted text. Tip shows one line above the prompt. Ask also tells Claude to ask one short question if the goal is unclear. Your words are never changed or stored; only the last vague one stays in memory, for the pane\'s better prompt.',
  },
]

type Why = 'short' | 'command' | 'clear' | 'reply'
type Judgement = { vague: boolean; why: Why; words: number }

export const wordCount = (text: string): number => text.trim().split(/\s+/).filter(w => w !== '').length

const DIGIT = /\d/
const PATH = /(?:^|[\s("'`])(?:~|\.{0,2})\/[\w@.-]+|[\w@.-]+\/[\w@.-]+\/|[\w@-]+\/[\w@-]+\.[A-Za-z]\w{0,5}/
const FILE = /(?:^|[\s("'`/])[\w@-]+\.[A-Za-z][A-Za-z0-9]{0,5}(?!\w)/
const QUOTE = /"[^"\n]+"|`[^`\n]+`|“[^”\n]+”|(?:^|\s)'[^'\n]+'(?=$|[\s.,;:!?)])/
const IDENT = /\b[a-z]+[A-Z][A-Za-z0-9]*\b|\b[a-z0-9]+_[a-z0-9_]+\b/
export const hasAnchor = (text: string): boolean => DIGIT.test(text) || PATH.test(text) || FILE.test(text) || QUOTE.test(text) || IDENT.test(text)

const REPLY = /^(?:(?:yes|yep|yeah|ok|okay|sure|no|nope)\s+)?(?:please\s+)?(?:yes|yep|yeah|no|nope|ok|okay|sure|thanks|thank you|thx|continue|go on|go ahead|proceed|stop|done|please do|do it|go|looks good|lgtm|sounds good|that works|correct|right|exactly|great|good|nice|perfect|hm+)$/
const COMMAND = /^(?:(?:please|pls|can you|could you)\s+)?(fix|make|change|update|improve|do|clean|finish|redo|handle|try|sort|polish|tidy|optimi[sz]e|refactor|check|look|solve|repair|speed|simplify|adjust|tweak|rewrite|redesign|continue|add|remove|delete|build|create|write|implement)\b/i
const VAGUE_OBJECT = /\b(it|this|that|these|those|them|thing|things|stuff|everything|something|better|nicer|faster|cleaner|good|properly|right|working)\b/i

export function judgePrompt(text: string): Judgement {
  const flat = text.trim()
  const words = wordCount(flat)
  const lower = flat.toLowerCase().replace(/[.!?,;:]/g, '').replace(/\s+/g, ' ').trim()
  if (words === 0 || flat.startsWith('/')) return { vague: false, why: 'clear', words }
  if (REPLY.test(lower)) return { vague: false, why: 'reply', words }
  if (hasAnchor(flat)) return { vague: false, why: 'clear', words }
  if (words <= COMMAND_MAX_WORDS && COMMAND.test(flat) && VAGUE_OBJECT.test(flat)) return { vague: true, why: 'command', words }
  if (words < VAGUE_WORDS) return { vague: true, why: 'short', words }
  return { vague: false, why: 'clear', words }
}

type LastCheck = { at: number; words: number; why: Why; vague: boolean; mode: CheckMode }
export const lastKey = (sessionId: string): string => `cockpit:promptcheck:last:${sessionId}`
export function parseLast(raw: unknown): LastCheck | undefined {
  const o = raw as LastCheck
  const okWhy = o?.why === 'short' || o?.why === 'command' || o?.why === 'clear' || o?.why === 'reply'
  return typeof o === 'object' && o !== null && typeof o.at === 'number' && typeof o.words === 'number' && okWhy && typeof o.vague === 'boolean' && (o.mode === 'tip' || o.mode === 'ask') ? o : undefined
}

const MODE_WORDS: Record<CheckMode, string> = { off: 'Off', tip: 'Tip', ask: 'Ask' }

export function explainLast(last: LastCheck | undefined, mode: CheckMode): string {
  if (last === undefined) {
    return mode === 'off' ? 'Prompt review is off. Turn it on: Settings > Prompts and memory.' : `Prompt review is ${MODE_WORDS[mode]}. No prompt reviewed yet in this session.`
  }
  const off = mode === 'off' ? ' Prompt review is off now.' : ''
  if (!last.vague) {
    const why = last.why === 'reply' ? 'a short reply, which is fine' : 'clear enough'
    return `Last prompt: ${tEn('words.word', { n: last.words })}. Judged ${why}. Nothing was done.${off}`
  }
  const reason = last.why === 'command' ? 'a short command with no file name, path, number or quoted text' : `fewer than ${VAGUE_WORDS} words and no file name, path, number or quoted text`
  const did = last.mode === 'ask' ? 'A tip showed above the chat box, and Claude was told to ask one short question if the goal is unclear.' : 'A tip showed above the chat box. Claude was told nothing.'
  return `Last prompt: ${tEn('words.word', { n: last.words })}, ${reason}. Judged vague. ${did}${off}`
}
