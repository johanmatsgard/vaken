// The phone note and the phone words of `/vaken`: show, run, pic. Pure; the code that runs is in features/phone.ts.
import type { Setting } from './settings'
import { absolute, isInside } from './guardpaths'
import { secretPathKind } from './guardsecrets'
import { PHONE_MODE_MAX_MS } from './phonecmds'
import { subArgs } from './menu'

export const PHONE_NOTE_KEY = 'phone.note'
export const PHONE_NOTE_SECTION_ID = 'cockpit:phonenote'

export const PHONE_NOTE_LABEL = 'Phone note'
export const PHONE_NOTE_NOTE = 'While your phone is attached, Claude is told what a phone cannot do.'

export const PHONE_NOTE_SETTINGS: Setting[] = [
  {
    key: PHONE_NOTE_KEY,
    group: 'Attention',
    label: PHONE_NOTE_LABEL,
    note: PHONE_NOTE_NOTE,
    options: [
      { value: 'on', label: 'On' },
      { value: 'off', label: 'Off' },
    ],
    default: 'on',
  },
]

// A constant, so the prompt cache is not disturbed. Claude reads it; the person never does.
export const PHONE_NOTE_TEXT = [
  'The person is on a phone now. They cannot run commands, open files, see the computer screen or open a localhost link.', // en-only: a note sent to Claude
  'Run commands yourself and show the short result. Never ask them to open, run or look at something on the computer.', // en-only: a note sent to Claude
  'To show a file or picture, send it with your tool that sends files to the person, if you have one; otherwise show the key lines as text. For a localhost page, send a picture of it, never the link.', // en-only: a note sent to Claude
  'Sum up diffs and long output in a few plain lines, without long code blocks.', // en-only: a note sent to Claude
  "When a sign-in or a connector needs the computer's browser, say so in one line, so the person knows it waits for the computer.", // en-only: a note sent to Claude
  'When you offer next steps, ask with your question tool so they can tap an option (for example "Run it", "Show me", "Picture").', // en-only: a note sent to Claude
].join('\n')

// `joined`: the join times of attached phones. A phone that never said it left counts for as long as Phone mode would.
export const phoneNoteOn = (value: string, joined: Iterable<number>, now: number): boolean => {
  if (value === 'off') return false
  for (const at of joined) if (now - at < PHONE_MODE_MAX_MS && now >= at) return true
  return false
}

// A prompt waits this long after the command that asked for it: the command's hook holds the turn until it ends.
export const SUBMIT_AFTER_MS = 500

export const PHONE_TIP_LINE = 'On the phone: /vaken for a menu, or /vaken show, /vaken run, /vaken pic.'

// What the person reads after a phone word; translated where it is said.
export const SHOW_EMPTY = 'Type a file after /vaken show, for example /vaken show README.md.'
export const SHOW_OUTSIDE = 'That file is outside this project, so vaken does not send it.'
export const SHOW_SECRET = 'That looks like a file with secrets, so vaken does not send it.'
export const SHOW_MISSING = 'There is no file at {path}.'
export const SHOW_ASKED = 'Asked Claude to send {path}.'
export const RUN_EMPTY = 'Type a command after /vaken run, for example /vaken run npm test.'
export const RUN_ASKED = 'Asked Claude to run it and show the short output. Claude still asks before a risky step.'
export const PIC_LOCAL_ONLY = 'Only a page on this computer: type a port or a localhost address.'
export const PIC_NO_SERVER = 'No dev server found. Type its port, for example /vaken pic 3000.'
export const PIC_FAILED = 'No picture was taken of {url}. Try again in a moment.'
export const PIC_DOWN = 'Nothing answers at {url}, so no picture was taken. Start the dev server, then try again.'
export const PIC_NO_CHROME = 'No picture was taken: Google Chrome was not found. Install it, then try again.'
export const PIC_ASKED = 'Took a picture of {url}. Asked Claude to send it.'
export const ASK_FAILED = 'Claude could not be asked now. Try again in a moment.'

// The number menu: `/vaken` alone on the phone. A bare digit soon after picks a line.
export const MENU_CHANGED = 'What changed (short)'
export const MENU_TESTS = 'Run the tests'
export const MENU_PIC = 'Picture of my app'
export const MENU_CONTINUE = 'Continue'
export const MENU_STATUS = 'Status'
export const MENU_REPLY = 'Reply with a number.'

export const PHONENOTE_STRINGS: string[] = [PHONE_NOTE_LABEL, PHONE_NOTE_NOTE, PHONE_TIP_LINE, SHOW_EMPTY, SHOW_OUTSIDE, SHOW_SECRET, SHOW_MISSING, SHOW_ASKED, RUN_EMPTY, RUN_ASKED, PIC_LOCAL_ONLY, PIC_NO_SERVER, PIC_FAILED, PIC_DOWN, PIC_NO_CHROME, PIC_ASKED, ASK_FAILED, MENU_CHANGED, MENU_TESTS, MENU_PIC, MENU_CONTINUE, MENU_STATUS, MENU_REPLY]

// The prompts the phone words submit. Fixed text; the path or the command is the only part that changes.
// en-only: a prompt sent to Claude
export const showPrompt = (path: string): string => `Please send me the file ${path} with your tool that sends files to the person. If you have no such tool, show its first 40 lines as text; for a picture, describe it in a few lines.`
// en-only: a prompt sent to Claude
export const runPrompt = (command: string): string => `Please run exactly this command in the project folder and show me the short output (the last lines, or a few plain lines if it is long):\n\n${command}`
// en-only: a prompt sent to Claude
export const picPrompt = (path: string): string => `Please send me the picture ${path} with your tool that sends files to the person. If you have no such tool, describe what the picture shows in a few lines.`

export type ShowCheck = { ok: true; path: string } | { ok: false; why: 'empty' | 'outside' | 'secret' }

// The path as typed, read from the project folder. A link that leads out is caught later, by where it lands.
export function checkShow(raw: string, root: string, home: string): ShowCheck {
  const typed = raw.trim().replace(/^["']|["']$/g, '')
  if (typed === '' || root === '') return { ok: false, why: 'empty' }
  const path = absolute(typed, home, root)
  if (!isInside(path, root)) return { ok: false, why: 'outside' }
  if (secretPathKind(path) !== undefined) return { ok: false, why: 'secret' }
  return { ok: true, path }
}

// The real place a path lands on, checked again.
export function checkLanded(real: string, realRoot: string): ShowCheck {
  if (!isInside(real, realRoot)) return { ok: false, why: 'outside' }
  if (secretPathKind(real) !== undefined) return { ok: false, why: 'secret' }
  return { ok: true, path: real }
}

export const showWhy = (why: 'empty' | 'outside' | 'secret'): string => (why === 'empty' ? SHOW_EMPTY : why === 'outside' ? SHOW_OUTSIDE : SHOW_SECRET)

export type PicTarget = { kind: 'dev' } | { kind: 'url'; url: string } | { kind: 'refused' }

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]']

// A bare port, `localhost:3000`, or an http address on this computer. Any other host is refused.
export function picTarget(raw: string): PicTarget {
  const s = raw.trim()
  if (s === '') return { kind: 'dev' }
  if (/^\d{2,5}$/.test(s)) {
    const port = Number(s)
    return port > 0 && port < 65536 ? { kind: 'url', url: `http://localhost:${port}/` } : { kind: 'refused' }
  }
  const withScheme = /^https?:\/\//i.test(s) ? s : `http://${s}`
  const m = /^(https?):\/\/(localhost|127\.0\.0\.1|\[::1\])(?::(\d{2,5}))?(\/[^\s]*)?$/i.exec(withScheme)
  if (m === null || !LOCAL_HOSTS.includes((m[2] ?? '').toLowerCase())) return { kind: 'refused' }
  const port = m[3] === undefined ? undefined : Number(m[3])
  if (port !== undefined && (port <= 0 || port >= 65536)) return { kind: 'refused' }
  return { kind: 'url', url: `${(m[1] ?? 'http').toLowerCase()}://${(m[2] ?? '').toLowerCase()}${port === undefined ? '' : `:${port}`}${m[4] ?? '/'}` }
}

// The fixed prompts of the number menu. A digit becomes one of them; nothing the person typed is added.
// en-only: a prompt sent to Claude
export const CHANGED_PROMPT = 'Sum up what changed since my last message in a few plain lines.'
// en-only: a prompt sent to Claude
export const TESTS_PROMPT = "Run the project's tests and show the short result."
// en-only: a prompt sent to Claude
export const CONTINUE_PROMPT = 'continue'

// A digit stays a menu pick this long after the menu, and only until the next prompt from the phone.
export const MENU_WINDOW_MS = 10 * 60_000

export type MenuPick = { kind: 'prompt'; text: string } | { kind: 'pic' } | { kind: 'status' }
// `id`: the next step a line stands for, so a picked step and the fixed line are not both shown.
export type MenuLine = { label: string; pick: MenuPick; id?: string }

export const MENU: ReadonlyArray<MenuLine> = [
  { label: MENU_CHANGED, pick: { kind: 'prompt', text: CHANGED_PROMPT }, id: 'diff' },
  { label: MENU_TESTS, pick: { kind: 'prompt', text: TESTS_PROMPT }, id: 'tests' },
  { label: MENU_PIC, pick: { kind: 'pic' } },
  { label: MENU_CONTINUE, pick: { kind: 'prompt', text: CONTINUE_PROMPT }, id: 'continue' },
  { label: MENU_STATUS, pick: { kind: 'status' } },
]

// The reply line counts too.
export const MENU_MAX_LINES = 7

// The picked next steps first, then the person's own actions, then the fixed lines; Status is always the last choice.
export function menuLines(extra: ReadonlyArray<{ id: string; label: string; prompt: string }> = []): MenuLine[] {
  if (extra.length === 0) return [...MENU]
  const status = MENU[MENU.length - 1] as MenuLine
  const once = extra.filter((a, n) => extra.findIndex(b => b.id === a.id) === n)
  const ids = new Set(once.map(a => a.id))
  const lines: MenuLine[] = [...once.map(a => ({ label: a.label, pick: { kind: 'prompt' as const, text: a.prompt }, id: a.id })), ...MENU.slice(0, -1).filter(m => m.id === undefined || !ids.has(m.id))]
  return [...lines.slice(0, MENU_MAX_LINES - 2), status]
}

// The ask, then a markdown numbered list, so the lines never run together and no blank line costs a line of the phone
export const menuText = (t: (english: string) => string, lines: ReadonlyArray<MenuLine> = MENU): string => [t(MENU_REPLY), ...lines.map((m, n) => `${n + 1}. ${t(m.label)}`)].join('\n')

export const menuOpen = (at: number | undefined, now: number): boolean => at !== undefined && now >= at && now - at < MENU_WINDOW_MS

// Only a prompt that is exactly one digit of the menu.
export function menuPick(text: string, lines: ReadonlyArray<MenuLine> = MENU): MenuPick | undefined {
  const m = /^\s*([1-9])\s*$/.exec(text)
  if (m === null) return undefined
  return lines[Number(m[1]) - 1]?.pick
}

export type VakenWords = { kind: 'menu' } | { kind: 'show' | 'run' | 'pic' | 'quick'; rest: string }

// `/vaken` and its phone words when they arrive as prompt text, not as a command. `/vaken-usage` and other words are not ours.
export function vakenWords(text: string): VakenWords | undefined {
  const m = /^\/vaken(?:\s+([\s\S]*))?$/i.exec(text.trim())
  if (m === null) return undefined
  const args = m[1] ?? ''
  if (args.trim() === '') return { kind: 'menu' }
  for (const w of ['show', 'run', 'pic', 'quick'] as const) {
    const rest = subArgs(args, w)
    if (rest !== undefined) return { kind: w, rest }
  }
  return undefined
}
