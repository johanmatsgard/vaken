// The Safety card's facts (core/safetycard.ts), gathered from what the pane has already loaded: the files "Undo last answer" would put back,
// and the names of the other sessions, so a stopped step from one of them says whose it was
import type { CardCtx } from './linecards'
import type { Prefs } from './prefs'

export const safetyFactsOf = (prefs: Prefs): NonNullable<CardCtx['safety']> => ({
  undoFiles: prefs.undoFiles,
  checkpoints: prefs.checkpoints ?? [],
  ...(prefs.undoPreview === undefined ? {} : { preview: prefs.undoPreview }),
  ...(prefs.undoPreviewOf === undefined ? {} : { previewOf: prefs.undoPreviewOf }),
  sid: prefs.sid,
  names: Object.fromEntries([...(prefs.inbox ?? []).filter(it => it.name !== '').map(it => [it.sid, it.name]), ...(prefs.allOthers ?? []).map(r => [r.rec.sessionId, r.name])]),
})
