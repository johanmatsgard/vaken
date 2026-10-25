// /vaken-help run setup: the text twin of the Agent setup card (core/setupcard.ts).
import type { EngineInterface, On } from 'claude-code'

import { withToastGate } from '../core/io'
import { homeFrom } from '../core/platform'
import type { Io } from '../core/io'
import { projectOf } from '../core/projects'
import { readSettings, writeSetting } from '../core/settings'
import { capNoteOf, conflictsOf, parseScope, setupApplyOn, setupItems, setupShort } from '../core/setupcard'
import type { SetupFacts } from '../core/setupcard'
import { readSetup, setSetupExists, writeItem } from './setupfiles'
import { subArgs } from '../core/menu'
import { tr } from '../core/lang'
import { fillIn } from '../core/fillin'
import { sayIn } from './saylang'
import { bindSafeFs, refusedWords } from '../core/safewrite'
import { BY_PERSON_ONLY, byPerson } from '../core/origin'

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

async function factsOf(i: Io, cwd: string): Promise<SetupFacts> {
  const values = await readSettings(i)
  const root = (await projectOf(i)) ?? (cwd === '' ? undefined : cwd)
  return { values, read: await readSetup(i, values, await i.home(), root) }
}

async function listText(i: Io, cwd: string): Promise<string> {
  const facts = await factsOf(i, cwd)
  const values = facts.values
  const scope = parseScope(values['setup.scope'])
  const lines = [fillIn(tr('Agent setup: {short}. Set up agents for me: {on}. Where: {where}.'), { short: setupShort(facts, tr), on: setupApplyOn(values) ? tr('on') : tr('off'), where: tr(scope === 'all' ? 'All projects' : scope === 'project' ? 'This project' : 'This session') })]
  for (const it of setupItems(facts)) {
    lines.push(`  ${it.name}: ${tr(it.state)} (${it.path})`)
    for (const d of it.diff.slice(0, 6)) lines.push(`    ${d}`)
  }
  for (const c of conflictsOf(facts)) {
    const note = c.kind === 'cap' && c.use !== c.n ? ` ${fillIn(tr(c.use > c.n ? '(the lowest choice, above your {n})' : '(the nearest choice below {n})'), { n: c.n })}` : ''
    lines.push(
      c.kind === 'cap'
        ? `  ${fillIn(tr('Conflict: your {from} says at most {n} agents; your vaken limit is {now}. /vaken-help run setup cap use yes sets {use}{note}; /vaken-help run setup cap keep yes keeps {now}.'), { from: tr(c.from), n: c.n, now: c.now, use: c.use, note })}`
        : `  ${fillIn(tr('Conflict: {path} uses {file}; the model map says {map} for the {role}. Settings > Agents changes the map; vaken never changes your file.'), { path: c.path, file: c.file, map: c.map, role: tr(c.role) })}`,
    )
  }
  const capNote = capNoteOf(facts)
  if (capNote !== undefined) lines.push(`  ${fillIn(tr('Your {from} says at most {n} agents; vaken follows the computer (information only, nothing is changed).'), { from: tr(capNote.from), n: capNote.n })}`)
  lines.push('', setupApplyOn(values) ? tr('Create a missing item: /vaken-help run setup make <name> yes. Change one that exists: /vaken-help run setup replace <name> yes yes (a copy is saved first).') : tr('Nothing is written. /vaken-help run setup on turns it on.'), tr('Where: /vaken-help run setup scope all|project|session.'))
  return lines.join('\n')
}

const whyText = (why: string | undefined, name: string, typed: string): string =>
  why === 'off'
    ? tr('Set up agents for me is off. /vaken-help run setup on turns it on.')
    : why === 'session'
      ? tr('This session writes no files. /vaken-help run setup scope all or project first.')
      : why === 'confirm'
        ? fillIn(tr('{name} exists. Nothing was written. To change it: /vaken-help run setup replace {typed} yes yes (a copy is saved first).'), { name, typed })
        : why === 'unreadable'
          ? fillIn(tr('{name} could not be read, so nothing was written over it.'), { name })
          : why === 'none'
            ? fillIn(tr('No item named {typed}. /vaken-help run setup lists them.'), { typed })
            : why === 'link'
              ? refusedWords(name, tr)
              : fillIn(tr('Could not write {name}.'), { name })

// Every word but the list changes a setting or writes a file, so it needs the person.
export const setupWrites = (args: string): boolean => /^\s*(on|off|scope|cap|make|replace)\b/i.test(args)

export async function setupRun(i: Io, cwd: string, args: string): Promise<string> {
  const w = args.trim().toLowerCase().split(/\s+/).filter(x => x !== '')
  if (w.length === 0) return listText(i, cwd)
  if (w[0] === 'on' || w[0] === 'off') {
    await writeSetting(i, 'setup.apply', w[0])
    return fillIn(tr('Set up agents for me is {state}.'), { state: tr(w[0]) })
  }
  if (w[0] === 'scope') {
    const v = w[1]
    if (v !== 'all' && v !== 'project' && v !== 'session') return tr('Say where: /vaken-help run setup scope all, project or session.')
    await writeSetting(i, 'setup.scope', v)
    return v === 'session' ? tr('Agent setup applies to this session only. No file is written.') : v === 'all' ? tr('Agent setup applies to all projects.') : tr('Agent setup applies to this project.')
  }
  if (w[0] === 'cap') {
    const c = conflictsOf(await factsOf(i, cwd)).find(x => x.kind === 'cap')
    if (c === undefined || c.kind !== 'cap') return tr('No conflict about the agent cap.')
    if (w[2] !== 'yes' || (w[1] !== 'use' && w[1] !== 'keep')) return tr('Type /vaken-help run setup cap use yes or /vaken-help run setup cap keep yes.')
    if (w[1] === 'use') await writeSetting(i, 'cap.max', `n${c.use}`)
    else await writeSetting(i, 'setup.keep', String(c.n))
    return w[1] === 'use' ? fillIn(tr('Agent cap set to {n}.'), { n: c.use }) : fillIn(tr('Kept the vaken limit of {n}.'), { n: c.now })
  }
  if (w[0] === 'make' || w[0] === 'replace') {
    const name = w[1]
    const yes = w[0] === 'make' ? w[2] === 'yes' : w[2] === 'yes' && w[3] === 'yes'
    if (name === undefined || !yes) return w[0] === 'make' ? tr('Type /vaken-help run setup make <name> yes.') : tr('Type /vaken-help run setup replace <name> yes yes. The second yes is the double check.')
    const values = await readSettings(i)
    const root = (await projectOf(i)) ?? (cwd === '' ? undefined : cwd)
    const r = await writeItem(i, values, await i.home(), root, name, w[0] === 'replace', 'typed')
    if (r.ok) return r.wrote ? (r.bak === undefined ? fillIn(tr('Wrote {name}.'), { name: r.name }) : fillIn(tr('Wrote {name}. Your copy is saved as {bak}.'), { name: r.name, bak: r.bak })) : fillIn(tr('{name} is already in sync.'), { name: r.name })
    return whyText(r.why, r.name, name)
  }
  return listText(i, cwd)
}

export function registerSetup(on: On): void {
  on('session.start', { cwd: /(?<setup>)/ }, async ($, e, next) => {
    try {
    } catch {
      // the command is optional: a failure shows less, never breaks the session
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'vaken-help' }, async ($, e, next) => {
    const rest0 = subArgs(e.args, 'run', 'setup')
    if (rest0 === undefined) return next(e)
    await sayIn(io($)).catch(() => undefined)
    if (!byPerson(e.origin) && setupWrites(rest0)) return { text: tr(BY_PERSON_ONLY) }
    setSetupExists(path => $.fs.exists(path))
    // A write never follows a link (core/safewrite.ts).
    const i = bindSafeFs(io($), { stat: (path, options) => $.fs.stat(path, options), list: path => $.fs.list(path) })
    const cwd = await $.session.cwd()
    return { text: await setupRun(i, cwd, rest0) }
  })
}
