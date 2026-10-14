// On This session: advice only, a plain line and a plain Not now.
import { tr } from '../../../core/lang'
import { FIT_BACK, FIT_NOT_NOW, hereWord, oldWord, pressWord, whyWord } from '../../../core/modelfit'
import { ActionButton, OpenLine, vstep } from '../../../ui/kit'
import type { Drawn } from '../../../ui/kit'
import { ADVICE_BUTTON_GAP } from '../../../ui/tokens'
import type { Row } from '../logic'
import { fitFor, undoFor } from '../modelfit'
import type { PaneCtx } from '../parts'

export function fitLines(c: PaneCtx, r: Row): Drawn[] {
  const fit = c.act.fit
  if (fit === undefined) return []
  const { Text } = c.el
  const sid = r.rec.sessionId
  const out: Drawn[] = []
  const s = c.prefs.open === `other:${sid}` ? fitFor(c.view, c.prefs.values, r) : undefined
  if (s !== undefined) {
    out.push(
      OpenLine(c.el, `ol-fit:${sid}`, <Text wrap="truncate-end">{tr(whyWord(s))}</Text>, false, () => fit.change(sid, r.name, s, { model: r.rec.model, fit: r.rec.fit }), {
        widthPt: c.widthPt,
        lines: 1,
        right: pressWord(s, tr),
        tall: true,
      }),
    )
  }
  const u = undoFor(sid, c.view.now ?? 0)
  if (u !== undefined) {
    out.push(
      OpenLine(c.el, `ol-fitundo:${sid}`, <Text wrap="truncate-end">{u.title}</Text>, false, () => fit.undo(sid), {
        widthPt: c.widthPt,
        lines: 1,
        right: tr(FIT_BACK).replace('{old}', oldWord(u.old)),
        tall: true,
      }),
    )
  }
  return out
}

export function FitAdvice(c: PaneCtx): Drawn {
  const here = c.view.here
  const fit = c.act.fit
  if (here === undefined || fit === undefined) return null
  const s = fitFor(c.view, c.prefs.values, here)
  if (s === undefined) return null
  const { Box, Text } = c.el
  const sid = here.rec.sessionId
  return (
    <Box key="fit-here" flexDirection="column" rowGap={vstep(ADVICE_BUTTON_GAP)}>
      <Text>{hereWord(s, tr)}</Text>
      <Box flexDirection="row" justifyContent="flex-end">
        {ActionButton(c.el, 'fit-notnow', FIT_NOT_NOW, () => fit.notNow(sid))}
      </Box>
    </Box>
  )
}
