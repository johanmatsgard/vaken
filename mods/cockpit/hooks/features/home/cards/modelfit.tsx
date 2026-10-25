// On This session: advice only, a plain line and a plain Not now.
import { tr } from '../../../core/lang'
import { FIT_ASK_FITS, FIT_ASK_ON, FIT_ASK_USE, FIT_BACK, FIT_KEY, FIT_NOT_NOW, fitOn, hereWord, oldWord, pressWord, whyText } from '../../../core/modelfit'
import { ActionButton, vstep } from '../../../ui/kit'
import type { Drawn } from '../../../ui/kit'
import { ADVICE_BUTTON_GAP } from '../../../ui/tokens'
import type { Row } from '../logic'
import { askHint, fitFor, undoFor } from '../modelfit'
import { sentenceLine } from '../parts'
import type { PaneCtx } from '../parts'

export function fitLines(c: PaneCtx, r: Row): Drawn[] {
  const fit = c.act.fit
  if (fit === undefined) return []
  const sid = r.rec.sessionId
  const out: Drawn[] = []
  const s = c.prefs.open === `other:${sid}` ? fitFor(c.view, c.prefs.values, r) : undefined
  if (s !== undefined) {
    out.push(
      sentenceLine(c, `ol-fit:${sid}`, whyText(s, tr), pressWord(s, tr), false, () => fit.change(sid, r.name, s, { model: r.rec.model, fit: r.rec.fit })),
    )
  }
  const u = undoFor(sid, c.view.now ?? 0)
  if (u !== undefined) {
    out.push(
      sentenceLine(c, `ol-fitundo:${sid}`, u.title, tr(FIT_BACK).replace('{old}', oldWord(u.old)), false, () => fit.undo(sid)),
    )
  }
  return out
}

// This session's quick asks at high effort: one line, one press; after it, the same line puts it back.
function AskLine(c: PaneCtx, fit: NonNullable<PaneCtx['act']['fit']>): Drawn {
  const hint = askHint(fitOn(c.prefs.values[FIT_KEY]))
  if (hint === undefined) return null
  if (hint.kind === 'low') return sentenceLine(c, 'fit-ask-back', tr(FIT_ASK_ON), tr(FIT_BACK).replace('{old}', hint.old), false, () => fit.askBack())
  return sentenceLine(c, 'fit-ask', tr(FIT_ASK_FITS), tr(FIT_ASK_USE), false, () => fit.askLow())
}

export function FitAdvice(c: PaneCtx): Drawn {
  const here = c.view.here
  const fit = c.act.fit
  if (here === undefined || fit === undefined) return null
  const s = fitFor(c.view, c.prefs.values, here)
  if (s === undefined) return AskLine(c, fit)
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
