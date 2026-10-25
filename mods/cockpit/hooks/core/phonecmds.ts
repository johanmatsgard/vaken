// Phone mode: the setting `phone.mode` and its one system-prompt section. Pure; the code that runs is in features/phone.ts.
import type { Setting } from './settings'
import { AWAKE_AWAY_MAX_MS } from './awakeplan'

// A detach ends it sooner.
export const PHONE_MODE_MAX_MS = AWAKE_AWAY_MAX_MS

export const PHONE_MODE_KEY = 'phone.mode'
export const PHONE_ASKED_KEY = 'cockpit:phone:asked'
export const PHONE_SECTION_ID = 'cockpit:phone'

export type PhoneMode = 'off' | 'ask' | 'on'
export const modeOf = (v: unknown): PhoneMode => (v === 'off' || v === 'on' ? v : 'ask')

export const PHONE_SETTINGS_MODE: Setting[] = [
  {
    key: PHONE_MODE_KEY,
    group: 'Attention',
    label: 'Phone mode',
    note: 'When a phone joins, vaken makes answers short and numbered.',
    options: [
      { value: 'off', label: 'Off' },
      { value: 'ask', label: 'Ask' },
      { value: 'on', label: 'On' },
    ],
    default: 'ask',
  },
]

// A constant, so the prompt cache is not disturbed.
export const PHONE_SECTION_TEXT =
  'The person is on a phone. Keep answers short. When you ask the person something or offer choices, number them so the person can reply with a digit. Put commands in code blocks one per block.'

export const PHONE_ASK_LINE = 'Short, numbered answers while you are on the phone? Turn on Phone mode: Settings > Attention.'

export const phoneAskDue = (mode: string, asked: unknown): boolean => mode === 'ask' && asked === undefined

// `joined`: the join times of attached phones.
export const phoneSectionOn = (mode: string, joined: Iterable<number>, now: number): boolean => {
  if (mode !== 'on') return false
  for (const at of joined) if (now - at < PHONE_MODE_MAX_MS && now >= at) return true
  return false
}

// Said on the phone only (its status answer): on the Mac, Settings shows it
const MODE_LINE: Record<PhoneMode, string> = { on: 'Phone mode: on · Settings > Attention', off: 'Phone mode: off · Settings > Attention', ask: 'Phone mode: asks once · Settings > Attention' }
export const phoneModeLine = (mode: PhoneMode, t: (english: string) => string): string => t(MODE_LINE[mode])

export const PHONECMDS_STRINGS: string[] = [
  'Phone mode',
  'this session',
  'Stopped',
  'Cost',
  'Nothing needs you.',
  'Working',
  'Short, numbered answers while you are on the phone? Turn on Phone mode: Settings > Attention.',
  ...Object.values(MODE_LINE),
]

