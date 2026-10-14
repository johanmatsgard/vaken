// The Welcome card: shown on the first run, once.
import { START_VIEW_ABOUT, USUAL_CHOICE, WELCOME_ABOUT, WELCOME_FIRST, WELCOME_TITLE } from '../../../core/cardrules'
import { MODES, USUAL_MODE, modeNow } from '../../../core/presets'
import { VIEW_MODES, viewModeOf } from '../viewset'
import { MODE_ABOUT, modeLabel } from '../../../core/settingsmap'
import { langNow, t, tr } from '../../../core/lang'
import { ActionButton, Card, Pick, RadioList, pickLines, vstep } from '../../../ui/kit'
import type { El } from '../../../ui/kit'
import { GROUP_GAP } from '../../../ui/tokens'
import type { Acts, Prefs } from '../prefs'

export const VIEW_LABEL: Record<(typeof VIEW_MODES)[number], string> = { standard: 'Standard', all: 'All', custom: 'Custom' }


export function StartCard(el: El, prefs: Prefs, act: Acts, widthPt: number) {
  const { Box, Text } = el
  const lang = langNow()
  // The mode of the scope a press sets (features/home/acts.ts startHere): the project's own values at This project
  const mode = modeNow(prefs.settingsScope === 'project' ? prefs.values : prefs.globalValues)
  const modeOptions = MODES.map(m => ({ value: m, label: modeLabel(m, lang) }))
  const gotIt = ActionButton(el, 'start-skip', t('calm.got_it'), () => act.startHere(''))
  const modePicks = RadioList(el, 'start-mode', modeOptions, mode, v => act.startHere(v), widthPt)
  // The view: a short choice of three (kind A), framed segments on one line when they fit
  const viewOptions = VIEW_MODES.map(m => ({ value: m, label: tr(VIEW_LABEL[m]) }))
  const view = viewModeOf(prefs.values)
  const setView = (v: string): void => act.setSetting('look.view', v)
  const viewPicks = pickLines(viewOptions, widthPt).length > 1 ? RadioList(el, 'start-view', viewOptions, view, setView, widthPt) : Pick(el, 'start-view', viewOptions, view, setView, true)
  return Card(
    el,
    'start',
    WELCOME_TITLE,
    '',
    <Box flexDirection="column" rowGap={vstep(GROUP_GAP)}>
      <Text>{tr(WELCOME_ABOUT)}</Text>
      <Text>{tr(WELCOME_FIRST)}</Text>
      <Box flexDirection="column" rowGap={vstep(GROUP_GAP)}>
        {modePicks}
        <Box key="start-skip-row" flexDirection="row" justifyContent="flex-end">
          {gotIt}
        </Box>
      </Box>
      {/* Only the sentence of the mode on now (Settings' own), not all three */}
      <Text key={`start-about-${mode}`} dimColor>
        {modeLabel(mode, lang)}
        {mode === USUAL_MODE ? ` (${tr(USUAL_CHOICE)})` : ''}: {t(MODE_ABOUT[mode] ?? '')}
      </Text>
      <Box flexDirection="column" rowGap={vstep(GROUP_GAP)}>
        <Text>{tr(START_VIEW_ABOUT)}</Text>
        {viewPicks}
      </Box>
    </Box>,
  )
}
