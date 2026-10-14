// Rules and words: core/talk.ts; presses: home/talk.ts.
import { focusOf, topicWhatIs, whatIsLines } from '../../../core/whatis'
import { tr, trFill } from '../../../core/lang'
import { ANSWER_HINT, ANSWER_NOTE, BETTER_DROP, BETTER_HEAD, BETTER_SEND, BETTER_TITLE, BETTER_WORD, MISSES, NUDGED_WORD, NUDGE_WORD, REPLY_HINT, REPLY_NOTE, SEND, STUCK_TITLE, ASK_SETTING_BUTTON, askWhat, betterPrompt, canAnswer, canNudge, factsOf, mayBeStuck, quietMinutes, talkMem } from '../../../core/talk'
import type { SessionRecord } from '../../../core/record'
import { OpenLine, WhatIsBody } from '../../../ui/kit'
import type { Drawn } from '../../../ui/kit'
import { LIST_COL_GAP, cols } from '../../../ui/tokens'
import { ageWord } from '../logic'
import type { Row } from '../logic'
import type { PaneCtx } from '../parts'
import { BETTER_OPEN } from '../talk'

function sendBox(c: PaneCtx, r: Row, hint: string, note: string): Drawn {
  const { Box, Text, Input } = c.el
  const sid = r.rec.sessionId
  if (Input === undefined || c.act.talk === undefined) return null
  const talk = c.act.talk
  return (
    <Box key={`send-${sid}`} flexDirection="column" paddingLeft={cols(LIST_COL_GAP)}>
      <Input key={`answer-${sid}`} placeholder={`${tr(hint)} ${r.name}`} value={talkMem.drafts.get(sid) ?? ''} submitLabel={tr(SEND)} onInput={v => talk.draft(sid, v)} onSubmit={v => talk.answer(sid, r.name, v)} />
      <Text dimColor>{tr(note).replace('{name}', r.name)}</Text>
    </Box>
  )
}

// What opens under a Needs you row of another session: what it waits on and what vaken knows
export function askOpen(c: PaneCtx, r: Row): Drawn[] {
  const key = `needs:${r.rec.sessionId}`
  if (c.prefs.open !== key) return []
  const base = topicWhatIs('needs')
  const what = askWhat(base.means, r.rec, ageWord(r.sinceMs), tr, r.name)
  const setting = focusOf(base.setting)
  return [
    WhatIsBody(c.el, `w-${key}`, whatIsLines(what, trFill), setting === undefined ? undefined : { label: ASK_SETTING_BUTTON, onPress: () => c.act.openSettingsAt(setting), go: true }),
    canAnswer(r.rec) ? sendBox(c, r, ANSWER_HINT, ANSWER_NOTE) : null,
  ]
}

export const replyOpen = (c: PaneCtx, r: Row): Drawn => (r.kind !== 'waiting' || c.prefs.open !== `other:${r.rec.sessionId}` ? null : sendBox(c, r, REPLY_HINT, REPLY_NOTE))

export function nudgeLine(c: PaneCtx, rec: SessionRecord, name: string, here: boolean): Drawn {
  const now = c.view.now ?? 0
  const talk = c.act.talk
  if (talk === undefined || c.prefs.values['heartbeat.mode'] === 'off' || !mayBeStuck(rec, now)) return null
  const sid = rec.sessionId
  const { Text } = c.el
  return OpenLine(c.el, `ol-nudge:${sid}`, <Text wrap="truncate-end">{tr(STUCK_TITLE).replace('{n}', String(quietMinutes(rec, now)))}</Text>, false, () => talk.nudge(sid, name, here), {
    widthPt: c.widthPt,
    lines: 1,
    right: tr(canNudge(sid, now) ? NUDGE_WORD : NUDGED_WORD),
    tall: true,
  })
}

export function betterLine(c: PaneCtx): Drawn[] {
  const v = talkMem.vague
  const talk = c.act.talk
  if (v === undefined || talk === undefined || v.sid !== c.prefs.sid) return []
  const { Text } = c.el
  const isOpen = c.prefs.open === BETTER_OPEN
  const lines = [`${tr('What it misses')}: ${tr(MISSES[v.why])}`, tr(BETTER_HEAD), ...betterPrompt(v.text, factsOf(c.prefs.proof)).split('\n')]
  return [
    OpenLine(c.el, 'ol-better', <Text wrap="truncate-end">{tr(BETTER_TITLE)}</Text>, isOpen, () => c.act.open(isOpen ? undefined : BETTER_OPEN), { widthPt: c.widthPt, lines: 1, right: tr(BETTER_WORD), tall: true }),
    isOpen ? WhatIsBody(c.el, 'w-better', lines, { label: BETTER_SEND, onPress: () => talk.sendBetter(c.prefs.proof) }, [{ key: 'better-drop', label: BETTER_DROP, onPress: talk.dropBetter }]) : null,
  ]
}

export const hereTalk = (c: PaneCtx): Drawn[] => {
  const here = c.view.here
  return [...(here === undefined ? [] : [nudgeLine(c, here.rec, here.name, true)]), ...betterLine(c)]
}
