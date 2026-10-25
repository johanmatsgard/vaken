// Skill coach and decision log runtime.
import type { EngineInterface, On } from 'claude-code'

import { COACH_AFTER, COACH_WHAT, addDecision, addStated, cleanDecision, decisionFrom, coachKey, count, decisionsFile, decisionsKey, decisionsText, normalize, offerToast, parseDecisions, parseSeen, skillFile, skillName } from '../core/coach'
import { postBand } from '../core/band'
import { freePath } from '../core/fileops'
import { t, tr } from '../core/lang'
import { fillIn } from '../core/fillin'
import { sayIn } from './saylang'
import { refusedWords, safeWrite, takenProbe } from '../core/safewrite'
import type { SafeFs } from '../core/safewrite'
import { withToastGate } from '../core/io'
import { homeFrom } from '../core/platform'
import type { Io } from '../core/io'
import { hashOf, isPersonMessage } from '../core/proof'
import { readSetting } from '../core/settings'
import { LEDGER_KEY, pushLog } from './compaction'
import { subArgs } from '../core/menu'
import { noteRule } from './teach'

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

// The engine's file calls a safe write needs (core/safewrite.ts).
function safeFs($: EngineInterface): SafeFs {
  return { stat: (path, options) => $.fs.stat(path, options), list: path => $.fs.list(path) }
}

// The request that reached the offer, kept in memory only (never stored)
let pending: string | undefined

export function registerCoach(on: On): void {
  on('session.start', { cwd: /(?<coach>)/ }, async ($, e, next) => {
    try {
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('prompt.submit', { text: /(?<coach>)/ }, async ($, e, next) => {
    try {
      const stated = isPersonMessage(e.text, e.origin) ? decisionFrom(e.text) : undefined
      if (stated !== undefined) {
        const i = io($)
        if ((await readSetting(i, 'decisions.mode')) === 'on') {
          const root = await $.session.root()
          const key = decisionsKey(hashOf(root))
          await i.set(key, addStated(parseDecisions(await i.get(key)), await i.now(), stated))
        }
      }
    } catch {
    }
    try {
      const root = await $.session.root()
      await noteRule(io($), root, e.text, e.origin)
    } catch {
    }
    try {
      const i = io($)
      const key = normalize(e.text)
      if (key !== undefined && (await readSetting(i, 'coach.mode')) === 'on') {
        const root = await $.session.root()
        const store = coachKey(hashOf(root))
        const r = count(parseSeen(await i.get(store)), hashOf(key), await i.now())
        await i.set(store, r.seen)
        if (r.offer) {
          pending = e.text.trim().slice(0, 600)
          await pushLog(i, LEDGER_KEY, { at: await i.now(), session: await i.sessionId(), what: COACH_WHAT, detail: `Asked ${COACH_AFTER} times.`, how: 'auto', did: true })
          await postBand(i, 'info', 'coach', 'A repeated request can be a skill', 10 * 60_000)
          i.toast(offerToast())
        }
      }
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'vaken-help' }, async ($, e, next) => {
    const rest0 = subArgs(e.args, 'run', 'coach')
    if (rest0 === undefined) return next(e)
    const i = io($)
    await sayIn(i).catch(() => undefined)
    const m = /^make\s+([\w-]{1,40})(?:\s+(yes))?$/i.exec(rest0.trim())
    if (m === null) return { text: pending === undefined ? tr('No repeated request yet. After you ask for the same kind of thing 3 times, vaken offers to save it as a skill.') : `${tr('A request you repeated:')}\n  ${pending.slice(0, 160)}\n${fillIn(tr('Save it as a skill: /vaken-help run coach make {name}'), { name: skillName(pending) })}` }
    if (pending === undefined) return { text: tr('There is no repeated request to save yet.') }
    const name = skillName(m[1])
    const root = await $.session.root()
    const path = `${root}/.claude/skills/${name}/SKILL.md`
    if (m[2] === undefined) return { text: `${fillIn(tr('This would write {path}:'), { path })}\n\n${skillFile(name, pending).slice(0, 400)}\n${fillIn(tr('To write it: /vaken-help run coach make {name} yes'), { name })}` }
    const taken = await $.fs.exists(path)
    if (taken) return { text: fillIn(tr('{path} already exists. Pick another name.'), { path }) }
    await i.write(path, skillFile(name, pending))
    pending = undefined
    return { text: fillIn(tr('Wrote {path}. Claude can use it by the name "{name}" in a new session.'), { path, name }) }
  })

  on('tool.call', { tool: /(?<coach>)/ }, async ($, e, next) => {
    const result = await next(e)
    try {
      const i = io($)
      if (e.tool === 'AskUserQuestion' && e.agentId === undefined && result.deny === undefined && result.isError !== true && (await readSetting(i, 'decisions.mode')) === 'on') {
        const text = cleanDecision((result.text ?? '').replace(/^User has answered your questions:\s*/i, ''))
        if (text !== '') {
          const root = await $.session.root()
          const key = decisionsKey(hashOf(root))
          await i.set(key, addDecision(parseDecisions(await i.get(key)), { at: await i.now(), text, how: 'asked' }))
        }
      }
    } catch {
    }
    return result
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'vaken-memory' }, async ($, e, next) => {
    const rest0 = subArgs(e.args, 'decide')
    if (rest0 === undefined) return next(e)
    const i = io($)
    await sayIn(i).catch(() => undefined)
    const text = cleanDecision(rest0)
    if (text === '') return { text: tr('Say the decision: /vaken-memory decide We use the blue theme.') }
    const root = await $.session.root()
    const key = decisionsKey(hashOf(root))
    await i.set(key, addDecision(parseDecisions(await i.get(key)), { at: await i.now(), text, how: 'typed' }))
    return { text: fillIn(tr('Written down: {text}'), { text }) }
  })

  on('command.run', { command: 'vaken-memory' }, async ($, e, next) => {
    const rest0 = subArgs(e.args, 'decisions')
    if (rest0 === undefined) return next(e)
    const i = io($)
    await sayIn(i).catch(() => undefined)
    const root = await $.session.root()
    const list = parseDecisions(await i.get(decisionsKey(hashOf(root))))
    if (rest0.trim().toLowerCase() === 'export') {
      if (list.length === 0) return { text: tr('Nothing to export yet.') }
      // An export never overwrites a file that is there: it takes the next free name (cockpit-decisions-2.md).
      const fs = safeFs($)
      const path = await freePath(takenProbe(fs), `${root}/.claude/cockpit-decisions.md`)
      if (path === undefined) return { text: tr('Too many exports are in the .claude folder already. Remove an old .claude/cockpit-decisions*.md file and try again.') }
      if (!(await safeWrite(fs, (p, x) => i.write(p, x), root, path, decisionsFile(list))).ok) return { text: refusedWords(path, tr) }
      return { text: t('cmdd.wrote_path_n_decisions', { path, n: list.length }) }
    }
    return { text: decisionsText(list, (await readSetting(i, 'decisions.mode')) === 'on') }
  })
}
