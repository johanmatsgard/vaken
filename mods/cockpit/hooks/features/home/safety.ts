// The Safety card's facts (core/safetycard.ts), gathered from what the pane has already loaded: the files "Undo last answer" would put back
import type { CardCtx } from './linecards'
import type { Prefs } from './prefs'

export const safetyFactsOf = (prefs: Prefs): NonNullable<CardCtx['safety']> => ({
  undoFiles: prefs.undoFiles,
  checkpoints: prefs.checkpoints ?? [],
  ...(prefs.undoPreview === undefined ? {} : { preview: prefs.undoPreview }),
  ...(prefs.undoPreviewOf === undefined ? {} : { previewOf: prefs.undoPreviewOf }),
})
