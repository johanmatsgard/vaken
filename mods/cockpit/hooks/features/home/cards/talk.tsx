// Rules and words: core/talk.ts; presses: home/talk.ts.
import { topicWhatIs, whatIsLines } from '../../../core/whatis'
import { tr, trFill } from '../../../core/lang'
import { fillIn } from '../../../core/fillin'
import { ANSWER_HINT, ANSWER_NOTE, BETTER_DROP, BETTER_HEAD, BETTER_SEND, BETTER_TITLE, BETTER_WORD, MISSES, NUDGED_WORD, NUDGE_WORD, REPLY_HINT, REPLY_NOTE, SEND, STUCK_TITLE, NO_SIGN_TITLE, askWhat, betterPrompt, canAnswer, canNudge, factsOf, mayBeStuck, quietMinutes, talkMem } from '../../../core/talk'
import type { SessionRecord } from '../../../core/record'
import { WhatIsBody } from '../../../ui/kit'
import type { Drawn } from '../../../ui/kit'
import { LIST_COL_GAP, cols } from '../../../ui/tokens'
import { ageWord } from '../logic'
import type { Row } from '../logic'
import { sentenceLine } from '../parts'
import type { PaneCtx } from '../parts'
import { BETTER_OPEN } from '../talk'

// `inset`: under an opened question, the box and its note stand at the detail's inset (WhatIsBody's)
function sendBox(c: PaneCtx, r: Row, hint: string, note: string, inset = false): Drawn {
  const { Box, Text, Input } = c.el
  const sid = r.rec.sessionId
  if (Input === undefined || c.act.talk === undefined) return null
  const talk = c.act.talk
  return (
    <Box key={`send-${sid}`} flexDirection="column" {...(inset ? { paddingLeft: cols(LIST_COL_GAP) } : {})}>
      <Input key={`answer-${sid}`} placeholder={tr(hint).replace('{name}', r.name)} value={talkMem.drafts.get(sid) ?? ''} submitLabel={tr(SEND)} onInput={v => talk.draft(sid, v)} onSubmit={v => talk.answer(sid, r.name, v)} />
      <Text dimColor>{tr(note).replace('{name}', r.name)}</Text>
    </Box>
  )
}

// What opens under a Needs you row of another session: what it waits on and what vaken knows, then the answer box (no pointer to notice settings: the question is the one thing here)
export function askOpen(c: PaneCtx, r: Row): Drawn[] {
  const key = `needs:${r.rec.sessionId}`
  if (c.prefs.open !== key) return []
  const what = askWhat(topicWhatIs('needs').means, r.rec, ageWord(r.sinceMs), tr, r.name)
  return [WhatIsBody(c.el, `w-${key}`, whatIsLines(what, trFill)), canAnswer(r.rec) ? sendBox(c, r, ANSWER_HINT, ANSWER_NOTE, true) : null]
}

export const replyOpen = (c: PaneCtx, r: Row): Drawn => (r.kind !== 'waiting' || c.prefs.open !== `other:${r.rec.sessionId}` ? null : sendBox(c, r, REPLY_HINT, REPLY_NOTE))

// Whether a session shows as stuck with its Nudge line (the heartbeat on, a way to send)
export const stuckShown = (c: PaneCtx, rec: SessionRecord): boolean => c.act.talk !== undefined && c.prefs.values['heartbeat.mode'] !== 'off' && mayBeStuck(rec, c.view.now ?? 0)
// `said`: the row above already says "May be stuck" as its state word, so this line says only how long
export function nudgeLine(c: PaneCtx, rec: SessionRecord, name: string, here: boolean, said = false): Drawn {
  const now = c.view.now ?? 0
  const talk = c.act.talk
  if (talk === undefined || !stuckShown(c, rec)) return null
  const sid = rec.sessionId
  return sentenceLine(c, `ol-nudge:${sid}`, fillIn(tr(said ? NO_SIGN_TITLE : STUCK_TITLE), { n: quietMinutes(rec, now) }), tr(canNudge(sid, now) ? NUDGE_WORD : NUDGED_WORD), false, () => talk.nudge(sid, name, here))
}

export function betterLine(c: PaneCtx): Drawn[] {
  const v = talkMem.vague
  const talk = c.act.talk
  if (v === undefined || talk === undefined || v.sid !== c.prefs.sid) return []
  const isOpen = c.prefs.open === BETTER_OPEN
  const lines = [`${tr('What it misses')}: ${tr(MISSES[v.why])}`, tr(BETTER_HEAD), ...betterPrompt(v.text, factsOf(c.prefs.proof)).split('\n')]
  return [
    sentenceLine(c, 'ol-better', tr(BETTER_TITLE), tr(BETTER_WORD), isOpen, () => c.act.open(isOpen ? undefined : BETTER_OPEN)),
    isOpen ? WhatIsBody(c.el, 'w-better', lines, { label: BETTER_SEND, onPress: () => talk.sendBetter(c.prefs.proof) }, [{ key: 'better-drop', label: BETTER_DROP, onPress: talk.dropBetter }]) : null,
  ]
}

export const hereTalk = (c: PaneCtx): Drawn[] => {
  const here = c.view.here
  return [...(here === undefined ? [] : [nudgeLine(c, here.rec, here.name, true)]), ...betterLine(c)]
}
