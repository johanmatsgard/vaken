// The pane's keys: one lowercase letter per press, the engine's `hotkey`. A key presses its Button only while the pane holds the
// keyboard (a click on it, or ctrl+x tab); a key typed in the chat box never reaches the pane. The band gets none: a bare digit in an empty chat box
// would press a band Button. Cards get none either: two Buttons on one key and the later wins. The letters are the same in every language.
// The main page (the footer, the view switch) has none: a plain Button draws its key before its label ("h: Help"), and those say plain words.
// The engine presses a Button by its `hotkey` only, so a press with no key on its Button has no key.
import type { HelpEntry } from './registry'

// b on a view's own Back, s on Help's Open settings
export const PANE_KEYS = {
  settings: 's',
  back: 'b',
} as const

export const KEYS_TITLE = 'Keys in the pane'
// Which keys work where: b in a view, s in Help; none on the main page
const KEYS_TEXT = 'Keyboard shortcuts: click the vaken pane, or press ctrl+x tab, so it has the keyboard. Then one key presses a button.\nIn Settings, Help and Arranging:\nb Back\nIn Help:\ns Open settings\nThe main page has no keys: its buttons say their plain words. A card turned to its settings has no key for its Back: press it.\nKeys typed in the chat box never press anything in the pane, and the keys are the same in every language.'

export const KEYS_HELP: HelpEntry[] = [{ title: KEYS_TITLE, text: KEYS_TEXT }]
