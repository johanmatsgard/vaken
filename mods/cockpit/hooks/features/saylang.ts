// The language a chat answer is said in: the one chosen in Settings, else the Mac's own, as the pane draws it.
import type { Io } from '../core/io'
import { readSetting } from '../core/settings'
import { setLang } from '../i18n/t'
import type { Lang } from '../i18n/types'
import { flags, langOf } from './home/state'

export async function langFor(i: Io): Promise<Lang> {
  return langOf(await readSetting(i, 'look.language'), flags.macLang)
}

// A command's answer can come before any pane draw set the language, so it sets it first
export async function sayIn(i: Io): Promise<Lang> {
  const lang = await langFor(i)
  setLang(lang)
  return lang
}
