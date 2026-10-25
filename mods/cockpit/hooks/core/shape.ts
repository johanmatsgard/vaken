// Answer shape: one section in the system prompt, next to the Plain mode section; both can be on.
import type { HelpEntry } from './registry'
import type { Setting } from './settings'

export const SHAPE_KEY = 'answer.shape'
export const SHAPE_SECTION_ID = 'cockpit:shape'
export type Shape = 'default' | 'short' | 'report'
const SHAPES: Shape[] = ['default', 'short', 'report']
export const shapeOf = (raw: unknown): Shape => (raw === 'short' || raw === 'report' ? raw : 'default')

export const SHAPE_TEXT: Record<Shape, string> = {
  default: '',
  short: 'Vaken rule: lead with the result in one sentence. Then at most 8 lines. No preamble, no recap of the question.', // en-only: the text added to Claude's system prompt
  report: 'Vaken rule: answer in three short parts: Done, Evidence (what you ran or read), Next (one step).', // en-only: the text added to Claude's system prompt
}
const LABEL: Record<Shape, string> = { default: 'Default', short: 'Short', report: 'Report' }
export const shapeLabel = (s: Shape): string => LABEL[s]

export const SHAPE_SETTINGS: Setting[] = [
  {
    key: SHAPE_KEY,
    group: 'Prompts',
    label: 'Answer shape',
    note: 'How Claude shapes its answers: Short, or a Report (Done, Evidence, Next).',
    options: [
      { value: 'default', label: 'Default' },
      { value: 'short', label: 'Short' },
      { value: 'report', label: 'Report' },
    ],
    default: 'default',
  },
]
export const SHAPE_HELP: HelpEntry[] = [
  {
    title: 'What the answer shape does',
    text: 'Short asks Claude to lead with the result in one sentence, then at most 8 lines. Report asks for three parts: Done, Evidence, Next. Default adds nothing. It works with Plain mode. It takes effect from the next message. /vaken-settings shape shows it and changes it.',
  },
]

type Ask = { kind: 'show' } | { kind: 'set'; shape: Shape } | { kind: 'bad'; why: string }
export function parseAsk(args: string): Ask {
  const word = args.trim().toLowerCase()
  if (word === '') return { kind: 'show' }
  const shape = SHAPES.find(s => s === word)
  return shape === undefined ? { kind: 'bad', why: `"${word.slice(0, 20)}" is not a shape. Use: /vaken-settings shape short, report or default.` } : { kind: 'set', shape }
}

export function shapeLines(shape: Shape): string {
  return shape === 'default'
    ? 'Answer shape: Default. Claude is told nothing extra.\nChange it: /vaken-settings shape short, report or default.' // en-only: the text of /vaken-settings shape, English by rule (the allow file rule of /vaken-settings)
    : `Answer shape: ${LABEL[shape]}. Claude is told:\n${SHAPE_TEXT[shape]}\nChange it: /vaken-settings shape short, report or default.`
}
export const changedLine = (shape: Shape): string =>
  shape === 'default' ? 'Answer shape: Default. Claude is told nothing extra from the next message.' : `Answer shape: ${LABEL[shape]}. Claude is told this from the next message:\n${SHAPE_TEXT[shape]}` // en-only: the text of /vaken-settings shape, English by rule
