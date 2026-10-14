// Starter agents runtime: /vaken-tasks agents lists two starter agent files; /vaken-tasks agents make yes writes the ones that are not there yet.
import type { EngineInterface, On } from 'claude-code'

import { withToastGate } from '../core/io'
import { homeFrom } from '../core/platform'
import type { Io } from '../core/io'
import type { Starter } from '../core/starters'
import { LEGACY_STARTER, STARTERS, STARTERS_WHAT, agentPath, planStarters, startersPreview, startersResult } from '../core/starters'
import { LEDGER_KEY, pushLog, why } from './compaction'
import { subArgs } from '../core/menu'
import { bindSafeFs, checkHomeWrite, safeFsOf } from '../core/safewrite'

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

// A check that fails counts as "there", so a file is never overwritten by mistake.
export async function startersRun(i: Io, exists: (path: string) => Promise<boolean>, args: string, project?: string): Promise<string> {
  const home = await i.home()
  if (home === '') return 'Vaken cannot find your home folder, so it cannot say where the agents go.' // en-only: plain answer of a slash command (text twin)
  const there = new Set<string>()
  for (const s of STARTERS) {
    try {
      if ((await exists(agentPath(home, s.name))) || (await exists(agentPath(home, LEGACY_STARTER[s.name] ?? s.name)))) there.add(s.name)
    } catch {
      there.add(s.name)
    }
  }
  const words = args.trim().toLowerCase().split(/\s+/)
  if (!(words[0] === 'make' && words[1] === 'yes')) return startersPreview(home, there)
  const { write, skip } = planStarters(there)
  const wrote: Starter[] = []
  const failed: { name: string; why: string }[] = []
  const fs = safeFsOf(i)
  for (const s of write) {
    try {
      if (fs === undefined || !(await checkHomeWrite(fs, agentPath(home, s.name), project)).ok) {
        failed.push({ name: s.name, why: 'it is a link that leads nowhere or into this project, and vaken does not write through it.' }) // en-only: plain answer of a slash command (text twin)
        continue
      }
      await i.write(agentPath(home, s.name), s.text)
      wrote.push(s)
    } catch (err) {
      failed.push({ name: s.name, why: why(err) })
    }
  }
  if (wrote.length > 0) {
    try {
      await pushLog(i, LEDGER_KEY, { at: await i.now(), session: await i.sessionId(), what: STARTERS_WHAT, detail: wrote.map(s => s.name).join(', '), how: 'typed', did: true })
    } catch {
    }
  }
  return startersResult(home, wrote, skip, failed)
}

export function registerStarters(on: On): void {
  on('session.start', { cwd: /(?<starters>)/ }, async ($, e, next) => {
    try {
    } catch {
      // the command is optional: a failure shows less, never breaks the session
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'vaken-tasks' }, async ($, e, next) => {
    const rest0 = subArgs(e.args, 'agents')
    if (rest0 === undefined) return next(e)
    const i = bindSafeFs(io($), { stat: (path, options) => $.fs.stat(path, options), list: path => $.fs.list(path) })
    let root: string | undefined
    try {
      root = await $.session.root()
    } catch {
      root = undefined
    }
    return { text: await startersRun(i, path => $.fs.exists(path), rest0, root) }
  })
}
