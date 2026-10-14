// Every row says its state in a chip: On or Off for a switch, else the current choice
import { orderedOptions, switchOf } from '../../../core/settings'
import type { Setting } from '../../../core/settings'
import { CHANGED_DOT, chipWord, toneOf } from '../../../core/settingsmap'
import { isChanged } from '../../../core/changed'
import { modeNow } from '../../../core/presets'
import { t, tr } from '../../../core/lang'
import { SwitchRow } from '../../../ui/kit'
import type { Drawn, El } from '../../../ui/kit'
import type { Acts, Prefs } from '../prefs'
import { ChoiceRow } from '../parts'

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
      const chip = { word: moved ? `${CHANGED_DOT} ${word}` : word, on: tone === 'on' || tone === 'suggest' }
      const next = cur === sw.on ? sw.off : sw.on
      return SwitchRow(el, r.key, r.label, noteOf(r), cur === sw.on, next, () => act.setSetting(r.key, next), innerPt, chip)
    }
    const label = moved ? `${CHANGED_DOT} ${tr(r.label)}` : r.label
    return ChoiceRow(el, r.key, label, noteOf(r), orderedOptions(r), cur, v => act.setSetting(r.key, v), undefined, innerPt)
  }
}
