// Prompt review runtime: judge each message of the person with a cheap local test
import type { EngineInterface, On } from 'claude-code'

import { postBand } from '../core/band'
import { withToastGate } from '../core/io'
import { homeFrom } from '../core/platform'
import type { Io } from '../core/io'
import { PROMPT_CHECK_BAND, PROMPT_CHECK_BAND_MS, PROMPT_CHECK_KEY, PROMPT_CHECK_NOTE, checkMode, explainLast, judgePrompt, lastKey, parseLast } from '../core/promptcheck'
import { isPersonMessage } from '../core/proof'
import { noteVerdict } from '../core/talk'
import { readSetting } from '../core/settings'
import { holdNote, readNote } from '../core/flush'
import { subArgs } from '../core/menu'

// IO-BLOCK-START
function io($: EngineInterface): Io {
  return withToastGate({
    now: () => $.clock.now(),
    home: () => homeFrom({ HOME: () => $.env.get('HOME'), USERPROFILE: () => $.env.get('USERPROFILE'), HOMEDRIVE: () => $.env.get('HOMEDRIVE'), HOMEPATH: () => $.env.get('HOMEPATH') }),
    sessionId: () => $.session.id(),
    get: key => $.store.get(key),
    set: (key, value) => $.store.set(key, value),
    del: key => $.store.delete(key),
    keys: () => $.store.keys(),
    read: path => $.fs.read(path),
    write: (path, text) => $.fs.write(path, text),
    run: (argv, init) => $.process.run(argv, init),
    ask: (question, options) => $.ui.ask(question, options),
    complete: req => $.model.complete(req),
    toast: text => $.ui.toast(text),
    invalidate: () => $.ui.invalidate('ui.render'),
  })
}
// IO-BLOCK-END

export function registerPromptCheck(on: On): void {
  on('session.start', { cwd: /(?<promptcheck>)/ }, async ($, e, next) => {
    try {
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('prompt.submit', { text: /(?<promptcheck>)/ }, async ($, e, next) => {
    let note: string | undefined
    try {
      const i = io($)
      const mode = checkMode(await readSetting(i, PROMPT_CHECK_KEY))
      if (mode === 'off' || !isPersonMessage(e.text, e.origin)) {
        if (isPersonMessage(e.text, e.origin)) noteVerdict('', 0, '', { vague: false, why: 'clear' })
      } else {
        const verdict = judgePrompt(e.text)
        const sid = await i.sessionId()
        const at = await i.now()
        await holdNote(i, lastKey(sid), { at, words: verdict.words, why: verdict.why, vague: verdict.vague, mode }, 'own')
        // The pane's "Send the better one" (core/talk.ts): the last vague prompt, in memory only, never in the store.
        noteVerdict(sid, at, e.text, verdict)
        if (verdict.vague) {
          await postBand(i, 'info', 'promptcheck', PROMPT_CHECK_BAND, PROMPT_CHECK_BAND_MS)
          if (mode === 'ask') note = PROMPT_CHECK_NOTE
        }
      }
    } catch {
    }
    return next(note === undefined ? e : { ...e, context: [...(e.context ?? []), note] })
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'vaken-explain' }, async ($, e0, next) => {
    const rest0 = subArgs(e0.args, 'promptcheck')
    if (rest0 === undefined) return next(e0)
    const i = io($)
    const mode = checkMode(await readSetting(i, PROMPT_CHECK_KEY))
    return { text: explainLast(parseLast(await readNote(i, lastKey(await i.sessionId()))), mode) }
  })
}
