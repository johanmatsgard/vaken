// Next step buttons and quick actions: the facts of the turns, the picks at the end of an answer, and /vaken quick. The band draws the picks (home/band.tsx).
import type { EngineInterface, On } from 'claude-code'
import { fieldsOf } from '../core/eventfields'

import { withToastGate } from '../core/io'
import { homeFrom } from '../core/platform'
import type { Io } from '../core/io'
import { readSetting } from '../core/settings'
import { subArgs } from '../core/menu'
import { BY_PERSON_ONLY, byPerson } from '../core/origin'
import { haltMem } from '../core/guard'
import { sysWord } from '../core/syswords'
import { byEnglish } from '../i18n/table'
import { ASK_FAILED, SUBMIT_AFTER_MS } from '../core/phonenote'
import {
  OWN_KEY, QUICK_ADDED, engineHintNow, hintMem, hintOf, QUICK_ASKED, QUICK_BUSY, QUICK_NOT_YOURS, QUICK_NO_SUCH, QUICK_REMOVED, addOwn, addWhyText, clearPicks, endsWithQuestion, findAction, lastEndOf, forgetNext, livePicks, nextMem, nextModeOf, noteTool, parseOwn, parseQuick,
  pickNext, quickListText, quickSaid, removeOwn, setPicks, toolKind,
} from '../core/actions'
import type { Say } from '../core/actions'
import { compacting } from './compaction'
import { flushLearn, forgetLearn, learnMem, learnNote, loadLearn, rankPicks } from '../core/offerlearn'
import type { OfferKind } from '../core/offerlearn'
import { weekStamp } from '../core/value'
import { flags, langOf } from './home/state'
import { forgetTypeahead, typeaheadRows } from '../core/typeahead'

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

export async function quickSay(i: Io): Promise<Say> {
  const lang = langOf(await readSetting(i, 'look.language'), flags.macLang)
  if (lang === 'en') return s => sysWord(s)
  const ix = byEnglish(lang)
  return s => ix[sysWord(s)] ?? sysWord(s)
}

// What this answer's own steps did, for the outcome of a press (core/offerlearn.ts): a check passed, a check failed, a commit ran. In memory only.
const turnSaw = { passed: false, failed: false, commit: false }

// The end of the first answer after a press tells whether the press worked: a check passed after Fix it or the stuck ladder, the tests passed, a commit ran,
// or the answer ended without a failure.
export function pressWorked(kind: OfferKind, saw: { passed: boolean; failed: boolean; commit: boolean }, reason: string, failedNow: boolean): boolean | undefined {
  if (kind === 'fix' || kind === 'fixit' || kind === 'stuck' || kind === 'tests') return saw.passed && !failedNow
  if (kind === 'commit') return saw.commit
  if (kind === 'diff' || kind === 'continue') return reason === 'answer' && !failedNow
  return undefined
}

export type QuickAnswer = { said: string; prompt?: string }

// `/vaken quick` and its words, typed as a command or sent as text; `person`: typed here or on the phone (core/origin.ts).
export async function quickAnswer(i: Io, args: string, t: Say, person: boolean): Promise<QuickAnswer> {
  const ask = parseQuick(args)
  const own = parseOwn(await i.get(OWN_KEY))
  if (ask.kind === 'list') return { said: quickListText(own, livePicks(await i.now()), t) }
  if (!person) return { said: t(BY_PERSON_ONLY) }
  if (ask.kind === 'add') {
    const made = addOwn(own, ask.name, ask.prompt)
    if (!made.ok) return { said: addWhyText(made.why, t) }
    await i.set(OWN_KEY, made.list)
    forgetTypeahead()
    return { said: quickSaid(QUICK_ADDED, t, made.name) }
  }
  if (ask.kind === 'remove') {
    const kept = removeOwn(own, ask.name)
    if (kept === undefined) return { said: quickSaid(QUICK_NOT_YOURS, t, ask.name) }
    await i.set(OWN_KEY, kept)
    forgetTypeahead()
    return { said: quickSaid(QUICK_REMOVED, t, ask.name) }
  }
  const a = findAction(ask.word, own)
  if (a === undefined) return { said: quickSaid(QUICK_NO_SUCH, t, ask.word.trim()) }
  return { said: quickSaid(QUICK_ASKED, t, a.id.startsWith('own:') ? a.label : t(a.label)), prompt: a.prompt }
}

export function registerNextSteps(on: On): void {
  on('session.start', { cwd: /(?<nextsteps>)/ }, async ($, e, next) => {
    forgetNext()
    forgetLearn()
    forgetTypeahead()
    try {
      nextMem.mode = nextModeOf(await readSetting(io($), 'next.mode'))
      const root = await $.session.root()
      await loadLearn(io($), root)
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  // Any message the person sends clears the buttons; a prompt dropped on the way changes nothing.
  // Buttons still offered then were left (counted in memory); the dim hint taken with Tab counts as a press on the first button.
  on('prompt.submit', { text: /(?<nextsteps>)/ }, async ($, e, next) => {
    const r = await next(e)
    if (!('drop' in r && r.drop !== undefined)) {
      try {
        const now = await $.clock.now()
        const live = livePicks(now)
        const took = hintMem.own !== undefined && e.text.trim() === hintMem.own && live[0] !== undefined ? (live[0].id as OfferKind) : undefined
        for (const a of live) learnNote(a.id as OfferKind, a.id === took ? 'pressed' : 'ignored', now, weekStamp(now))
        if (took !== undefined) learnMem.wait = { kind: took, at: now }
      } catch {
      }
      clearPicks()
    }
    return r
  }).catch(($, e, next) => next(e))

  on('turn.start', { turnId: /(?<nextsteps>)/ }, async ($, e, next) => {
    const startedAt = await $.clock.now()
    hintMem.turnAt = startedAt
    nextMem.busy = true
    nextMem.end = undefined
    nextMem.endedAt = undefined
    turnSaw.passed = false
    turnSaw.failed = false
    turnSaw.commit = false
    clearPicks()
    return next(e)
  }).catch(($, e, next) => next(e))

  // Counts only, in memory: no store read on the busiest hook.
  on('tool.call', { tool: /(?<nextsteps>)/ }, async ($, e, next) => {
    const result = await next(e)
    try {
      if (e.agentId === undefined && result.deny === undefined) {
        const kind = toolKind(e.tool, fieldsOf(e).command)
        const ok = result.isError !== true
        nextMem.facts = noteTool(nextMem.facts, kind, ok)
        if (kind === 'test' || kind === 'check') turnSaw[ok ? 'passed' : 'failed'] = true
        if (kind === 'commit' && ok) turnSaw.commit = true
      }
    } catch {
    }
    return result
  }).catch(($, e, next) => next(e))

  // Picked before the band's own turn hook looks, so its one redraw check shows them.
  on('turn.complete', { turnId: /(?<nextsteps>)/ }, async ($, e, next) => {
    try {
      if (e.agentId === undefined) {
        nextMem.busy = false
        nextMem.end = lastEndOf(e.reason, e.answer ?? '', nextMem.facts.failed)
        const endedAt = await $.clock.now()
        nextMem.endedAt = nextMem.end === undefined ? undefined : endedAt
        // The outcome of the last press, then the counts wait in memory (written at most every 10 minutes from here)
        const wait = learnMem.wait
        if (wait !== undefined && wait.at <= endedAt) {
          learnMem.wait = undefined
          const worked = pressWorked(wait.kind, turnSaw, e.reason, nextMem.facts.failed)
          if (worked === true) learnNote(wait.kind, 'worked', endedAt, weekStamp(endedAt))
        }
        const quiet = e.reason !== 'answer' || nextMem.mode === 'off' || endsWithQuestion(e.answer) || compacting.pending || haltMem.held
        if (quiet) clearPicks()
        else {
          const now = await $.clock.now()
          setPicks(rankPicks(pickNext(nextMem.facts), learnMem.book), now)
          for (const id of nextMem.picks) learnNote(id, 'shown', now, weekStamp(now))
          const hint = hintOf(nextMem.mode, nextMem.picks)
          if (hint !== undefined && !engineHintNow()) {
            hintMem.own = hint
            $.clock.after(SUBMIT_AFTER_MS, () => {
              void (async () => {
                try {
                  if (!engineHintNow()) await $.prompt.suggest({ text: hint })
                } catch {
                }
              })()
            })
          }
        }
      }
      if (learnMem.pending.length > 0) {
        const at = await $.clock.now()
        await flushLearn(io($), weekStamp(at))
      }
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  // Typeahead rows with Buttons and hint: the person's quick actions and task sets after "/" or a word, open pull requests after "#", changed files after "@".
  // A key press reads nothing: what is read is kept for a short while (core/typeahead.ts). The engine's own rows stay first; Tab takes one.
  on('prompt.autocomplete', { token: /^(?:[/#@]|[^\s/#@]{3})/ }, async ($, e, next) => {
    const r = await next(e)
    if (nextMem.mode !== 'hint') return r
    try {
      const i = io($)
      const cwd = await $.session.cwd()
      const now = await $.clock.now()
      const rows = await typeaheadRows(i, e.token, cwd, now, () => quickSay(i))
      return rows.length === 0 ? r : { suggestions: [...r.suggestions, ...rows] }
    } catch {
      return r
    }
  }).catch(($, e, next) => next(e))

  // The engine's own hint is kept: vaken's is dropped when the engine proposed one after this turn began.
  on('prompt.suggest', { text: /(?<nexthint>)/ }, async ($, e, next) => {
    try {
      if (e.origin.kind === 'suggestion') {
        const at = await $.clock.now()
        hintMem.engineAt = at
      } else if (e.text === hintMem.own && engineHintNow()) return { isShown: false }
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'vaken' }, async ($, e, next) => {
    const rest = subArgs(e.args, 'quick')
    if (rest === undefined) return next(e)
    const i = io($)
    const t = await quickSay(i)
    const asked = await quickAnswer(i, rest, t, byPerson(e.origin))
    if (asked.prompt === undefined) return { text: asked.said }
    if (nextMem.busy) return { text: t(QUICK_BUSY) }
    clearPicks()
    // The command's own hook holds the turn until it ends, so the request goes a moment later.
    const failed = t(ASK_FAILED)
    const text = asked.prompt
    $.clock.after(SUBMIT_AFTER_MS, () => {
      void (async () => {
        try {
          const r = await $.prompt.submit({ text, asUser: true })
          if ('drop' in r && r.drop !== undefined) i.toast(failed, true)
        } catch {
          i.toast(failed, true)
        }
      })()
    })
    return { text: asked.said }
  })
}
