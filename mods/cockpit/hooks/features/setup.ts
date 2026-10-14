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
import { bindSafeFs, refusedWords } from '../core/safewrite'

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
  const id = (s: string): string => s
  const scope = parseScope(values['setup.scope'])
  const lines = [`${setupShort(facts, id)}. Set up agents for me: ${setupApplyOn(values) ? 'on' : 'off'}. Where: ${scope === 'all' ? 'All projects' : scope === 'project' ? 'This project' : 'This session'}.`]
  for (const it of setupItems(facts)) {
    lines.push(`  ${it.name}: ${it.state} (${it.path})`)
    for (const d of it.diff.slice(0, 6)) lines.push(`    ${d}`)
  }
  for (const c of conflictsOf(facts)) {
    lines.push(
      c.kind === 'cap'
        ? `  Conflict: your ${c.from} says at most ${c.n} agents; your vaken limit is ${c.now}. /vaken-help run setup cap use yes sets ${c.use}${c.use === c.n ? '' : c.use > c.n ? ` (the lowest choice, above your ${c.n})` : ` (the nearest choice below ${c.n})`}; /vaken-help run setup cap keep yes keeps ${c.now}.`
        : `  Conflict: ${c.path} uses ${c.file}; the model map says ${c.map} for the ${c.role}. Settings > Agents changes the map; vaken never changes your file.`,
    )
  }
  const capNote = capNoteOf(facts)
  if (capNote !== undefined) lines.push(`  Your ${capNote.from} says at most ${capNote.n} agents; vaken follows the computer (information only, nothing is changed).`)
  lines.push('', setupApplyOn(values) ? 'Create a missing item: /vaken-help run setup make <name> yes. Change one that exists: /vaken-help run setup replace <name> yes yes (a copy is saved first).' : 'Nothing is written. /vaken-help run setup on turns it on.', 'Where: /vaken-help run setup scope all|project|session.') // en-only: plain answer of a slash command (text twin)
  return lines.join('\n')
}

const whyText = (why: string | undefined, name: string, typed: string): string =>
  why === 'off'
    ? 'Set up agents for me is off. /vaken-help run setup on turns it on.' // en-only: plain answer of a slash command (text twin)
    : why === 'session'
      ? 'This session writes no files. /vaken-help run setup scope all or project first.' // en-only: plain answer of a slash command (text twin)
      : why === 'confirm'
        ? `${name} exists. Nothing was written. To change it: /vaken-help run setup replace ${typed} yes yes (a copy is saved first).`
        : why === 'unreadable'
          ? `${name} could not be read, so nothing was written over it.`
          : why === 'none'
            ? `No item named ${typed}. /vaken-help run setup lists them.`
            : why === 'link'
              ? refusedWords(name, tr)
              : `Could not write ${name}.`

export async function setupRun(i: Io, cwd: string, args: string): Promise<string> {
  const w = args.trim().toLowerCase().split(/\s+/).filter(x => x !== '')
  if (w.length === 0) return listText(i, cwd)
  if (w[0] === 'on' || w[0] === 'off') {
    await writeSetting(i, 'setup.apply', w[0])
    return `Set up agents for me is ${w[0]}.`
  }
  if (w[0] === 'scope') {
    const v = w[1]
    if (v !== 'all' && v !== 'project' && v !== 'session') return 'Say where: /vaken-help run setup scope all, project or session.' // en-only: plain answer of a slash command (text twin)
    await writeSetting(i, 'setup.scope', v)
    return v === 'session' ? 'Agent setup applies to this session only. No file is written.' : `Agent setup applies to ${v === 'all' ? 'all projects' : 'this project'}.` // en-only: plain answer of a slash command (text twin)
  }
  if (w[0] === 'cap') {
    const c = conflictsOf(await factsOf(i, cwd)).find(x => x.kind === 'cap')
    if (c === undefined || c.kind !== 'cap') return 'No conflict about the agent cap.' // en-only: plain answer of a slash command (text twin)
    if (w[2] !== 'yes' || (w[1] !== 'use' && w[1] !== 'keep')) return 'Type /vaken-help run setup cap use yes or /vaken-help run setup cap keep yes.' // en-only: plain answer of a slash command (text twin)
    if (w[1] === 'use') await writeSetting(i, 'cap.max', `n${c.use}`)
    else await writeSetting(i, 'setup.keep', String(c.n))
    return w[1] === 'use' ? `Agent cap set to ${c.use}.` : `Kept the vaken limit of ${c.now}.`
  }
  if (w[0] === 'make' || w[0] === 'replace') {
    const name = w[1]
    const yes = w[0] === 'make' ? w[2] === 'yes' : w[2] === 'yes' && w[3] === 'yes'
    if (name === undefined || !yes) return w[0] === 'make' ? 'Type /vaken-help run setup make <name> yes.' : 'Type /vaken-help run setup replace <name> yes yes. The second yes is the double check.' // en-only: plain answer of a slash command (text twin)
    const values = await readSettings(i)
    const root = (await projectOf(i)) ?? (cwd === '' ? undefined : cwd)
    const r = await writeItem(i, values, await i.home(), root, name, w[0] === 'replace', 'typed')
    if (r.ok) return r.wrote ? `Wrote ${r.name}.${r.bak === undefined ? '' : ` Your copy is saved as ${r.bak}.`}` : `${r.name} is already in sync.`
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
    setSetupExists(path => $.fs.exists(path))
    // A write never follows a link (core/safewrite.ts).
    const i = bindSafeFs(io($), { stat: (path, options) => $.fs.stat(path, options), list: path => $.fs.list(path) })
    const cwd = await $.session.cwd()
    return { text: await setupRun(i, cwd, rest0) }
  })
}
