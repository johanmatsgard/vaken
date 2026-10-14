// The back face of a flipped card: the card's BODY is replaced by its settings
import { MORE_IN_SETTINGS, N_MORE_IN_SETTINGS, faceOf, isSpending } from '../../../core/cardsettings'
import { tr } from '../../../core/lang'
import { LinkButton, vstep } from '../../../ui/kit'
import type { Drawn, El } from '../../../ui/kit'
import { SETTING_ROW_GAP } from '../../../ui/tokens'
import type { Acts, Prefs } from '../prefs'
import type { CardId } from '../logic'
import { settingRowOf } from './settingrow'

export function FlipFace(el: El, prefs: Prefs, act: Acts, id: CardId, innerPt: number, fit: number): Drawn {
  const { Box } = el
  const face = faceOf(id, el.drag, fit)
  const rowOf = settingRowOf(el, prefs, act, innerPt)
  const spending = face.rows.filter(r => isSpending(r.key))
  const label = face.more > 0 ? tr(N_MORE_IN_SETTINGS).replace('{n}', String(face.more)) : tr(MORE_IN_SETTINGS)
  return (
    // Compact (the face was about twice its front): one row per setting, SETTING_ROW_GAP apart
    <Box key={`face-${id}`} flexDirection="column" rowGap={vstep(SETTING_ROW_GAP)}>
      {[...face.rows.filter(r => !isSpending(r.key)).map(rowOf), ...spending.map(rowOf)]}
      <Box key={`face-more-${id}`} flexDirection="column">
        {LinkButton(el, `face-settings-${id}`, label, () => act.openSettingsAt(face.more > 0 ? face.group : undefined), { row: true, chevron: true, widthPt: innerPt })}
      </Box>
    </Box>
  )
}
