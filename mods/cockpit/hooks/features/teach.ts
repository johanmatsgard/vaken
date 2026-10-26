// Learn from you, runtime: counts a repeated correction, saves a rule into the project's CLAUDE.md block on a press, and counts task outcomes per role and model.
import { learnMem, learnNote, quietNow } from '../core/offerlearn'
import { weekStamp } from '../core/value'
import type { EngineInterface, On } from 'claude-code'

import { tr } from '../core/lang'
import { sayIn } from './saylang'
import { fillIn } from '../core/fillin'
import { withToastGate } from '../core/io'
import type { Io } from '../core/io'
import { homeFrom, under } from '../core/platform'
import { hashOf, isPersonMessage } from '../core/proof'
import { checkWrite } from '../core/safewrite'
import type { SafeFs } from '../core/safewrite'
import { readSetting, readSettings } from '../core/settings'
import { saveBefore, utf8Bytes } from '../core/undo'
import type { Probe } from '../core/undo'
import { subArgs } from '../core/menu'
import { BY_PERSON_ONLY, byPerson } from '../core/origin'
import type { Role, Run } from '../core/orchestra'
import {
  OUTCOMES_KEY, TEACH_NOT_SAVED, TEACH_REMOVED_WHAT, TEACH_WHAT, TEACH_SAVED, TEACH_TOAST, addRun, askedModel, countRule, hasRule, modelOffer, parseOutcomes, parseTeach, ruleFrom, rulesListText, savedRules, teachKey, teachMem, teachOn, withRule, withoutRule,
} from '../core/teach'
import type { Rule, SavedFile } from '../core/teach'
import { LEDGER_KEY, pushLog } from './compaction'
import { isMissing } from '../core/fileops'

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

function safeFs($: EngineInterface): SafeFs {
  return { stat: (path, options) => $.fs.stat(path, options), list: path => $.fs.list(path) }
}


const sameDir = (a: string, b: string): boolean => a.replace(/[\\/]+$/, '').toLowerCase() === b.replace(/[\\/]+$/, '').toLowerCase()

// Only the project's own CLAUDE.md: never the one in the home folder, never settings.
export function projectFile(root: string, home: string): string | undefined {
  if (root.trim() === '' || (home !== '' && sameDir(root, home))) return undefined
  return under(root, 'CLAUDE.md')
}

// null: no file yet; false: there but not readable.
async function readOne(i: Io, path: string): Promise<string | null | false> {
  try {
    return await i.read(path)
  } catch (err) {
    return isMissing(err) ? null : false
  }
}

export type SaveResult = { ok: true; path: string } | { ok: false; why: 'secret' | 'same' | 'none' | 'place' | 'unreadable' | 'link' | 'failed' }

async function change(i: Io, fs: SafeFs | undefined, root: string, how: (disk: string | null) => SavedFile, what: string, detail: string): Promise<SaveResult> {
  const path = projectFile(root, await i.home())
  if (path === undefined) return { ok: false, why: 'place' }
  const disk = await readOne(i, path)
  if (disk === false) return { ok: false, why: 'unreadable' }
  const howNow = how(disk)
  if (!('text' in howNow)) return { ok: false, why: howNow.why }
  if (fs === undefined || !(await checkWrite(fs, root, path)).ok) return { ok: false, why: 'link' }
  try {
    const probe: Probe = async p => {
      try {
        return { kind: 'file', size: utf8Bytes(await i.read(p)) }
      } catch {
        return undefined
      }
    }
    await saveBefore(i, probe, await i.sessionId(), [{ path, create: disk === null }], 'vaken-teach')
    await i.write(path, howNow.text)
    try {
      await pushLog(i, LEDGER_KEY, { at: await i.now(), session: await i.sessionId(), what, detail, how: 'button', did: true })
    } catch {
    }
    return { ok: true, path }
  } catch {
    return { ok: false, why: 'failed' }
  }
}

export async function saveRule(i: Io, fs: SafeFs | undefined, root: string, line: string): Promise<SaveResult> {
  const values = await readSettings(i)
  return change(i, fs, root, disk => withRule(disk, values, line), TEACH_WHAT, line)
}

export async function removeRule(i: Io, fs: SafeFs | undefined, root: string, n: number): Promise<SaveResult> {
  return change(i, fs, root, disk => (disk === null ? { why: 'none' } : withoutRule(disk, n)), TEACH_REMOVED_WHAT, String(n))
}

// The reason a save or a removal did not happen, in words
const WHY_WORD: Record<string, string> = { secret: 'it holds a secret', same: 'it is already saved', none: 'there is no such rule', place: 'this folder has no project file for it', unreadable: 'the file could not be read', link: 'the file is a link', failed: 'the write failed' }
const whyWords = (why: string): string => tr(WHY_WORD[why] ?? why)

export const savedWords = (r: SaveResult, line: string): string => (r.ok ? fillIn(tr(TEACH_SAVED), { line }) : tr(TEACH_NOT_SAVED))

// The pane's press: the offer in memory is the one saved, then it leaves.
export async function answerOffer(i: Io, fs: SafeFs | undefined, save: boolean): Promise<void> {
  const offer = teachMem.offer
  teachMem.offer = undefined
  if (offer === undefined || !save) return
  const r = await saveRule(i, fs, offer.root, offer.rule.line)
  i.toast(savedWords(r, offer.rule.line), true)
}

// Read only when the message holds a rule-like sentence, so a plain prompt costs no store read.
export async function noteRule(i: Io, root: string, text: string, origin: { kind?: string } | undefined): Promise<Rule | undefined> {
  if (!isPersonMessage(text, origin)) return undefined
  const rule = ruleFrom(text)
  if (rule === undefined || !teachOn(await readSetting(i, 'teach.mode'))) return undefined
  const key = teachKey(hashOf(root))
  const r = countRule(parseTeach(await i.get(key)), rule.code, await i.now())
  await i.set(key, r.state)
  if (!r.offer) return undefined
  const path = projectFile(root, await i.home())
  if (path === undefined || hasRule(await readOne(i, path), rule.line)) return undefined
  // Put off 3 times in a row in this project: no offer for a week (core/offerlearn.ts)
  const now = await i.now()
  if (quietNow(learnMem.book, 'teach', now)) return undefined
  learnNote('teach', 'shown', now, weekStamp(now))
  teachMem.offer = { rule, root }
  i.toast(fillIn(tr(TEACH_TOAST), { rule: rule.said }))
  i.invalidate()
  return rule
}

// Once per run, when it ends; the offer waits in memory for the Agents view.
export async function noteOutcomes(i: Io, run: Run, roleModels: Partial<Record<Role, string>>): Promise<void> {
  try {
    const now = await i.now()
    let o = addRun(parseOutcomes(await i.get(OUTCOMES_KEY)), run)
    const offer = teachOn(await readSetting(i, 'teach.mode')) ? modelOffer(o, roleModels, now) : undefined
    if (offer !== undefined) {
      o = askedModel(o, offer.role, now)
      teachMem.model = offer
    }
    await i.set(OUTCOMES_KEY, o)
  } catch {
  }
}

export function registerTeach(on: On): void {
  on('command.run', { command: 'vaken-memory' }, async ($, e, next) => {
    const rest0 = subArgs(e.args, 'rules')
    if (rest0 === undefined) return next(e)
    const i = io($)
    await sayIn(i).catch(() => undefined)
    const root = await $.session.root()
    const words = rest0.trim().split(/\s+/)
    const word = (words[0] ?? '').toLowerCase()
    // Saving or removing a rule writes a project file: only the person typing it in this session may.
    if ((word === 'save' || word === 'remove') && !byPerson(e.origin)) return { text: tr(BY_PERSON_ONLY) }
    if (word === 'save') {
      const offer = teachMem.offer
      if (offer === undefined) return { text: tr('No rule waits to be saved.') }
      teachMem.offer = undefined
      const r = await saveRule(i, safeFs($), offer.root, offer.rule.line)
      return { text: r.ok ? fillIn(tr('Saved in {path}: {line}'), { path: r.path, line: offer.rule.line }) : fillIn(tr('Not saved ({why}).'), { why: whyWords(r.why) }) }
    }
    if (word === 'remove') {
      const n = Number(words[1])
      if (!Number.isInteger(n) || n < 1) return { text: tr('Say which one: /vaken-memory rules remove 1') }
      const r = await removeRule(i, safeFs($), root, n)
      return { text: r.ok ? fillIn(tr('Removed rule {n} from {path}.'), { n, path: r.path }) : fillIn(tr('Nothing removed ({why}).'), { why: whyWords(r.why) }) }
    }
    if (word !== '') return next(e)
    const before = await next(e)
    const path = projectFile(root, await i.home())
    const mine = rulesListText(path === undefined ? [] : savedRules(await readOne(i, path)), teachMem.offer)
    return { ...before, text: [before.text ?? '', mine].filter(x => x !== '').join('\n\n') }
  })
}
