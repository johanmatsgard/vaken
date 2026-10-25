// Big-file guard: a file named after "@" with more than 2000 lines or 200 KB gets one calm question before Claude reads it.
// "Send the last 200 lines instead" reads only the end (prompt.mention's offset and limit); anything else, or no answer, sends the file whole as typed.
// It follows Lean session (lean.mode): Off turns it off. Nothing is stored; the answer per file is remembered in memory for this session.
import type { EngineInterface, On } from 'claude-code'
import { withToastGate } from '../core/io'
import { homeFrom } from '../core/platform'
import type { Io } from '../core/io'
import { readSetting } from '../core/settings'
import { leanModeOf } from '../core/lean'
import { sysWord } from '../core/syswords'
import { byEnglish } from '../i18n/table'
import { BIG_ASK_WAIT_MS, BIG_COUNT_MAX_BYTES, BIG_MENTION_LINES, askWords, askedAbout, bigMem, countLines, failedWords, forgetBig, isBig, isWholeMention, tailNote, tailRange } from '../core/bigfile'
import type { Say } from '../core/bigfile'
import type { Lang } from '../i18n/types'
import { flags, langOf } from './home/state'

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

async function sayIn(i: Io): Promise<{ t: Say; lang: Lang }> {
  const lang = langOf(await readSetting(i, 'look.language'), flags.macLang)
  if (lang === 'en') return { t: s => sysWord(s), lang }
  const ix = byEnglish(lang)
  return { t: s => ix[sysWord(s)] ?? sysWord(s), lang }
}

// The question, or undefined when no answer came in time; a dismissed question rejects, which is no answer too.
// The timer is stopped as soon as the question is answered or dismissed.
function askInTime($: EngineInterface, question: string, options: string[], header: string): Promise<string | undefined> {
  return new Promise(done => {
    const timer = $.clock.after(BIG_ASK_WAIT_MS, () => done(undefined))
    const asked = $.ui.ask(question, { options, header })
    asked.then(
      answer => {
        timer.cancel()
        done(answer)
      },
      () => {
        timer.cancel()
        done(undefined)
      },
    )
  })
}

// The file's kind and size, or undefined when it cannot be looked at.
async function statOf($: EngineInterface, path: string): Promise<{ kind: string; size: number } | undefined> {
  try {
    const st = await $.fs.stat(path)
    return st
  } catch {
    return undefined
  }
}

// The file's text, or undefined when it cannot be read.
async function textOf($: EngineInterface, path: string): Promise<string | undefined> {
  try {
    const text = await $.fs.read(path)
    return text
  } catch {
    return undefined
  }
}

export function registerBigFile(on: On): void {
  on('session.start', { cwd: /(?<bigfile>)/ }, async ($, e, next) => {
    forgetBig(e.isInteractive === true)
    return next(e)
  }).catch(($, e, next) => next(e))

  // The desktop app runs the session as the SDK (`isInteractive` false); a person is at the prompt once the app joins
  on('session.attach', { surface: 'desktop' }, async ($, e, next) => {
    bigMem.interactive = true
    return next(e)
  }).catch(($, e, next) => next(e))

  // A new prompt may ask about one file again
  on('prompt.submit', { text: /(?<bigfile>)/ }, async ($, e, next) => {
    bigMem.askedThisPrompt = false
    return next(e)
  }).catch(($, e, next) => next(e))

  // Only the person's own prompt in the main loop, only a whole-file mention, only a file that is big. A failure reads the file as typed.
  on('prompt.mention', { path: /(?<bigfile>)/ }, async ($, e, next) => {
    if (!bigMem.interactive || e.agentId !== undefined || !isWholeMention(e.mention, e.offset, e.limit) || !askedAbout(e.path)) return next(e)
    // The answer given for this file this session stands; a file not answered yet is asked about only when no other file of this prompt was
    const known = bigMem.answers.get(e.path)
    if (known === 'whole' || (known === undefined && bigMem.askedThisPrompt)) return next(e)
    const i = io($)
    if (leanModeOf(await readSetting(i, 'lean.mode')) === 'off') return next(e)
    const st = await statOf($, e.path)
    // A file under BIG_MENTION_LINES bytes cannot hold that many lines, so it is not read to count them.
    if (st === undefined || st.kind !== 'file' || st.size < BIG_MENTION_LINES || st.size > BIG_COUNT_MAX_BYTES) return next(e)
    const text = await textOf($, e.path)
    if (text === undefined) return next(e)
    const lines = countLines(text)
    if (!isBig(lines, st.size)) return next(e)
    const { t, lang } = await sayIn(i)
    if (known !== 'tail') {
      if (bigMem.askedThisPrompt) return next(e)
      bigMem.askedThisPrompt = true
      const w = askWords(e.path, lines, st.size, t, lang)
      const answer = await askInTime($, w.question, [w.tail, w.whole], w.head)
      // No answer, or a dismissed question, is a whole file too, and is not asked about again this session
      bigMem.answers.set(e.path, answer === w.tail ? 'tail' : 'whole')
      if (answer !== w.tail) return next(e)
    }
    const r = await next({ ...e, ...tailRange(lines) })
    if (r.deny !== undefined) return r
    if (r.type === null) {
      $.ui.toast(failedWords(e.path, e.mention, lines, t))
      return r
    }
    return { ...r, context: [...(r.context ?? []), tailNote(e.path, lines)] }
  }).catch(($, e, next) => next(e))
}
