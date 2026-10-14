// Skill coach and decision log runtime.
import type { EngineInterface, On } from 'claude-code'

import { COACH_AFTER, COACH_WHAT, addDecision, addStated, cleanDecision, decisionFrom, coachKey, count, decisionsFile, decisionsKey, decisionsText, normalize, offerToast, parseDecisions, parseSeen, skillFile, skillName } from '../core/coach'
import { postBand } from '../core/band'
import { freePath } from '../core/fileops'
import { tr } from '../core/lang'
import { refusedWords, safeWrite, takenProbe } from '../core/safewrite'
import type { SafeFs } from '../core/safewrite'
import { withToastGate } from '../core/io'
import { homeFrom } from '../core/platform'
import type { Io } from '../core/io'
import { hashOf, isPersonMessage } from '../core/proof'
import { readSetting } from '../core/settings'
import { LEDGER_KEY, pushLog } from './compaction'
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

// The engine's file calls a safe write needs (core/safewrite.ts).
const safeFs = ($: EngineInterface): SafeFs => ({ stat: (path, options) => $.fs.stat(path, options), list: path => $.fs.list(path) })

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
          const key = decisionsKey(hashOf(await $.session.root()))
          await i.set(key, addStated(parseDecisions(await i.get(key)), await i.now(), stated))
        }
      }
    } catch {
    }
    try {
      const i = io($)
      const key = normalize(e.text)
      if (key !== undefined && (await readSetting(i, 'coach.mode')) === 'on') {
        const store = coachKey(hashOf(await $.session.root()))
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

  on('command.run', { command: 'vaken-help' }, async ($, e0, next) => {
    const rest0 = subArgs(e0.args, 'run', 'coach')
    if (rest0 === undefined) return next(e0)
    const e = { ...e0, args: rest0 }
    const i = io($)
    const m = /^make\s+([\w-]{1,40})(?:\s+(yes))?$/i.exec(e.args.trim())
    if (m === null) return { text: pending === undefined ? 'No repeated request yet. After you ask for the same kind of thing 3 times, vaken offers to save it as a skill.' : `A request you repeated:\n  ${pending.slice(0, 160)}\nSave it as a skill: /vaken-help run coach make ${skillName(pending)}` } // en-only: plain answer of a slash command (text twin)
    if (pending === undefined) return { text: 'There is no repeated request to save yet.' } // en-only: plain answer of a slash command (text twin)
    const name = skillName(m[1])
    const path = `${await $.session.root()}/.claude/skills/${name}/SKILL.md`
    if (m[2] === undefined) return { text: `This would write ${path}:\n\n${skillFile(name, pending).slice(0, 400)}\nTo write it: /vaken-help run coach make ${name} yes` }
    if (await $.fs.exists(path)) return { text: `${path} already exists. Pick another name.` }
    await i.write(path, skillFile(name, pending))
    pending = undefined
    return { text: `Wrote ${path}. Claude can use it by the name "${name}" in a new session.` }
  })

  on('tool.call', { tool: /(?<coach>)/ }, async ($, e, next) => {
    const result = await next(e)
    try {
      const i = io($)
      if (e.tool === 'AskUserQuestion' && e.agentId === undefined && result.deny === undefined && result.isError !== true && (await readSetting(i, 'decisions.mode')) === 'on') {
        const text = cleanDecision((result.text ?? '').replace(/^User has answered your questions:\s*/i, ''))
        if (text !== '') {
          const key = decisionsKey(hashOf(await $.session.root()))
          await i.set(key, addDecision(parseDecisions(await i.get(key)), { at: await i.now(), text, how: 'asked' }))
        }
      }
    } catch {
    }
    return result
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'vaken-memory' }, async ($, e0, next) => {
    const rest0 = subArgs(e0.args, 'decide')
    if (rest0 === undefined) return next(e0)
    const e = { ...e0, args: rest0 }
    const i = io($)
    const text = cleanDecision(e.args)
    if (text === '') return { text: 'Say the decision: /vaken-memory decide We use the blue theme.' } // en-only: plain answer of a slash command (text twin)
    const key = decisionsKey(hashOf(await $.session.root()))
    await i.set(key, addDecision(parseDecisions(await i.get(key)), { at: await i.now(), text, how: 'typed' }))
    return { text: `Written down: ${text}` }
  })

  on('command.run', { command: 'vaken-memory' }, async ($, e0, next) => {
    const rest0 = subArgs(e0.args, 'decisions')
    if (rest0 === undefined) return next(e0)
    const e = { ...e0, args: rest0 }
    const i = io($)
    const list = parseDecisions(await i.get(decisionsKey(hashOf(await $.session.root()))))
    if (e.args.trim().toLowerCase() === 'export') {
      if (list.length === 0) return { text: 'Nothing to export yet.' } // en-only: plain answer of a slash command (text twin)
      // An export never overwrites a file that is there: it takes the next free name (cockpit-decisions-2.md).
      const root = await $.session.root()
      const fs = safeFs($)
      const path = await freePath(takenProbe(fs), `${root}/.claude/cockpit-decisions.md`)
      if (path === undefined) return { text: 'Too many exports are in the .claude folder already. Remove an old .claude/cockpit-decisions*.md file and try again.' } // en-only: plain answer of a slash command (text twin)
      if (!(await safeWrite(fs, (p, x) => i.write(p, x), root, path, decisionsFile(list))).ok) return { text: refusedWords(path, tr) }
      return { text: `Wrote ${path} (${list.length} decisions).` }
    }
    return { text: decisionsText(list, (await readSetting(i, 'decisions.mode')) === 'on') }
  })
}
