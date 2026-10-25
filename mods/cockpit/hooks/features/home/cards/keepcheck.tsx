// On This session: after a compaction whose summary left kept items out (core/compactcheck.ts), one calm line; the whole row presses Put it back.
import { fillIn } from '../../../core/fillin'
import { tr } from '../../../core/lang'
import { KEEP_LOST_LINE, PUT_BACK, keepMem, liveCheck, lostNames } from '../../../core/compactcheck'
import { KIND_SHORT } from '../../../core/proof'
import type { Drawn } from '../../../ui/kit'
import { PUT_BACK_ROW } from '../rowact'
import { sentenceLine } from '../parts'
import type { PaneCtx } from '../parts'

export function KeepCheckLine(c: PaneCtx): Drawn {
  const last = keepMem.last
  const k = liveCheck(last, c.view.here?.rec.sessionId, c.view.now ?? last?.at ?? 0)
  if (k === undefined) return null
  const words = fillIn(tr(KEEP_LOST_LINE), { names: lostNames(k.missing, tr, kind => tr(KIND_SHORT[kind])) })
  return sentenceLine(c, 'keep-check', words, tr(PUT_BACK), false, () => c.act.run(PUT_BACK_ROW))
}
