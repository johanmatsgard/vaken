// Every switch row says its state in a chip (On or Off); a row moved off the mode in use carries the word Changed in its chip
import { orderedOptions, switchOf } from '../../../core/settings'
import { fmt } from '../../../core/fmt'
import type { Setting } from '../../../core/settings'
import { CHANGED_WORD, chipWord, toneOf } from '../../../core/settingsmap'
import { isChanged } from '../../../core/changed'
import { STRONG_KEYS, WARN_CHOSEN, WARN_UNCHOSEN } from '../../../core/guardhost'
import { modeNow } from '../../../core/presets'
import { t, tr } from '../../../core/lang'
import { SwitchRow, choiceStacks, pickLines, pickWidthPt, wrappedLines } from '../../../ui/kit'
import type { Drawn, El } from '../../../ui/kit'
import type { Acts, Prefs } from '../prefs'
import { ChoiceRow } from '../parts'
import { cardGapX, CHEVRON_GAP, CHEVRON_SLOT, CHOICE_NOTE_GAP, CHOICE_NOTE_MIN_PT, PRESS_FRAME_H, PRESS_ROW_H, ROW_PT, switchHitW } from '../../../ui/tokens'

// The lines a text wraps into in a room (wrappedLines keeps a chevron's room, given back here)
const linesOf = (text: string, roomPt: number): number => (text === '' ? 0 : wrappedLines(text, roomPt + CHEVRON_SLOT + CHEVRON_GAP))
// How tall settingRowOf draws a row, in points: its label, its note's lines, and its choices beside or under them (the radio rows one each).
// The flipped card counts these, so its face is about the front's height (faceOf).
// The choices of a row in the words drawn: a figure in the reader's language, and the Warn of Risky commands and Secrets as it really acts (core/guardhost.ts)
export function optionsOf(r: Setting, prefs: Prefs): Setting['options'] {
  const strong = STRONG_KEYS.includes(r.key) && prefs.guardExplicit !== undefined
  const chosen = strong && (prefs.guardExplicit?.includes(r.key) === true || prefs.project?.set[r.key] !== undefined)
  return orderedOptions(r).map(o => ({ ...o, label: strong && o.value === 'warn' ? (chosen ? WARN_CHOSEN : WARN_UNCHOSEN) : fmt.choiceWord(o.label) }))
}

export function settingRowPt(prefs: Prefs, innerPt: number): (r: Setting) => number {
  const valuesNow = prefs.project !== undefined && prefs.settingsScope === 'project' ? prefs.values : prefs.globalValues
  const mode = modeNow(valuesNow)
  return r => {
    const note = tr(r.note)
    if (switchOf(r) !== undefined) return Math.max(PRESS_ROW_H, (1 + linesOf(note, innerPt - switchHitW())) * ROW_PT)
    const options = optionsOf(r, prefs)
    const chip = isChanged(r, valuesNow, mode) ? t(CHANGED_WORD) : undefined
    const stacked = options.length > 3 || choiceStacks(innerPt, r.label, options.map(o => o.label), chip, note)
    if (!stacked) return Math.max(PRESS_FRAME_H, (1 + linesOf(note, Math.max(CHOICE_NOTE_MIN_PT, innerPt - pickWidthPt(options.map(o => o.label)) - cardGapX()))) * ROW_PT)
    const lines = pickLines(options, innerPt)
    const tags = options.filter(o => o.tag !== undefined).length
    const choices = lines.length > 1 ? options.length * PRESS_FRAME_H + tags * ROW_PT : PRESS_FRAME_H
    return (1 + linesOf(note, innerPt)) * ROW_PT + CHOICE_NOTE_GAP + choices
  }
}

export function settingRowOf(el: El, prefs: Prefs, act: Acts, innerPt: number): (r: Setting) => Drawn {
  const project = prefs.project
  const here = project !== undefined && prefs.settingsScope === 'project'
  const valuesNow = here ? prefs.values : prefs.globalValues
  const mode = modeNow(valuesNow)
  const noteOf = (r: Setting): string => {
    const v = project?.set[r.key]
    if (v === undefined) return r.note
    const own = r.note === '' ? '' : `${r.note} `
    return here ? `${own}${t('common.only_this_project')}` : `${own}${t('common.this_project_uses')} ${r.options.find(o => o.value === v)?.label ?? v}.`
  }
  return r => {
    const sw = switchOf(r)
    const cur = valuesNow[r.key] ?? r.default
    const moved = isChanged(r, valuesNow, mode)
    if (sw !== undefined && el.Svg) {
      const tone = toneOf(r, cur)
      const word = tr(chipWord(r, cur, true))
      const chip = { word: moved ? `${word} \u00b7 ${t(CHANGED_WORD)}` : word, on: tone === 'on' || tone === 'suggest' }
      const next = cur === sw.on ? sw.off : sw.on
      return SwitchRow(el, r.key, r.label, noteOf(r), cur === sw.on, next, () => act.setSetting(r.key, next), innerPt, chip)
    }
    // A choice's figure ("60%", "$25") in the reader's language ("60 %", "25 USD")
    const options = optionsOf(r, prefs)
    return ChoiceRow(el, r.key, r.label, noteOf(r), options, cur, v => act.setSetting(r.key, v), moved ? { word: t(CHANGED_WORD), on: false } : undefined, innerPt)
  }
}
