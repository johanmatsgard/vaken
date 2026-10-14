// What the pane's presses do (core/talk.ts holds the rules and words): send an answer or a reply to another session, nudge a session that may be stuck
import { tr } from '../../core/lang'
import { BETTER_SAID, NOT_SENT, NOT_SENT_HERE, NUDGE_SAID, NUDGE_SAID_HERE, NUDGE_TEXT, NUDGE_WAIT, OWN_SAID, SENT_TO, answerText, betterPrompt, canNudge, factsOf, talkMem } from '../../core/talk'
import type { ProofState } from '../../core/proof'
import { PROMPT_FAILED } from './rowact'
import type { HomeEngine } from './engine'
import { flags } from './state'

export type TalkActs = {
  draft: (sid: string, text: string) => void
  answer: (sid: string, name: string, text: string) => void
  nudge: (sid: string, name: string, here: boolean) => void
  sendBetter: (proof: ProofState | undefined) => void
  dropBetter: () => void
  ownCommand: (name: string) => void
}

export const BETTER_OPEN = 'better'

const busy = new Set<string>()
async function once(id: string, run: () => Promise<void>): Promise<void> {
  if (busy.has(id)) return
  busy.add(id)
  try {
    await run()
  } catch {
  } finally {
    busy.delete(id)
  }
}

export async function sendAnswer(eng: HomeEngine, sid: string, name: string, typed: string): Promise<void> {
  const text = answerText(typed)
  if (text === undefined) return
  const i = eng.io()
  await once(`answer:${sid}`, async () => {
    try {
      const r = await eng.send(sid, text)
      if (!r.isDelivered) {
        i.toast(tr(NOT_SENT).replace('{why}', r.reason), true)
        return
      }
      talkMem.drafts.delete(sid)
      i.toast(tr(SENT_TO).replace('{name}', name), true)
      i.invalidate()
    } catch {
      i.toast(tr(NOT_SENT_HERE), true)
    }
  })
}

export async function nudge(eng: HomeEngine, sid: string, name: string, here: boolean): Promise<void> {
  const i = eng.io()
  const now = await eng.now()
  if (!canNudge(sid, now)) {
    i.toast(tr(NUDGE_WAIT), true)
    return
  }
  await once(`nudge:${sid}`, async () => {
    talkMem.nudged.set(sid, now)
    i.invalidate()
    if (here) {
      i.toast(tr(NUDGE_SAID_HERE), true)
      await eng.submit(NUDGE_TEXT).catch(() => {
        talkMem.nudged.delete(sid)
        i.toast(tr(PROMPT_FAILED), true)
        i.invalidate()
      })
      return
    }
    try {
      const r = await eng.send(sid, NUDGE_TEXT)
      if (r.isDelivered) i.toast(tr(NUDGE_SAID), true)
      else {
        talkMem.nudged.delete(sid)
        i.toast(tr(NOT_SENT).replace('{why}', r.reason), true)
      }
    } catch {
      talkMem.nudged.delete(sid)
      i.toast(tr(NOT_SENT_HERE), true)
    }
    i.invalidate()
  })
}

export async function sendBetter(eng: HomeEngine, proof: ProofState | undefined): Promise<void> {
  const v = talkMem.vague
  if (v === undefined) return
  const i = eng.io()
  await once('better', async () => {
    const text = betterPrompt(v.text, factsOf(proof))
    talkMem.vague = undefined
    if (flags.openWhat === BETTER_OPEN) flags.openWhat = undefined
    i.toast(tr(BETTER_SAID), true)
    i.invalidate()
    await eng.submit(text).catch(() => {
      talkMem.vague = v
      i.toast(tr(PROMPT_FAILED), true)
      i.invalidate()
    })
  })
}

export function talkActsOf(eng: HomeEngine): TalkActs {
  return {
    draft: (sid, text) => {
      talkMem.drafts.set(sid, text)
    },
    answer: (sid, name, text) => void sendAnswer(eng, sid, name, text),
    nudge: (sid, name, here) => void nudge(eng, sid, name, here),
    sendBetter: proof => void sendBetter(eng, proof),
    dropBetter: () => {
      talkMem.vague = undefined
      if (flags.openWhat === BETTER_OPEN) flags.openWhat = undefined
      eng.io().invalidate()
    },
    // A plugin's own command never reaches its own hook when its pane runs it: no failed run
    ownCommand: name => eng.io().toast(tr(OWN_SAID).split('{name}').join(name), true),
  }
}

// The typed words are left out: typing never redraws.
export const talkSignature = (now: number): string => `${[...talkMem.nudged.keys()].filter(sid => !canNudge(sid, now)).join(',')}|${talkMem.vague?.at ?? 0}`
