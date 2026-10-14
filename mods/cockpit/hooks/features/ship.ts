// The "Ship it" command: one answer from the evidence the other blocks keep.
import type { EngineInterface, On } from 'claude-code'

import { readNote } from '../core/flush'
import { withToastGate } from '../core/io'
import { homeFrom } from '../core/platform'
import type { Io } from '../core/io'
import { readLog } from './compaction'
import { LEDGER_KEY } from './compaction'
import { readState, stateKey } from '../core/proof'
import { confidence, readState2, state2Key } from '../core/proof2'
import { readSetting } from '../core/settings'
import { COUNTS_KEY, countsSince } from '../core/counts'
import { ship, shipText } from '../core/ship'
import { tr } from '../core/lang'
import { DO_T_TELL_FAILED } from '../core/dowords'
import { shipStepText } from './shipsteps'
import { isFolded } from '../core/menu'
import { byPerson } from '../core/origin'

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

export async function shipNow(i: Io, t?: (s: string) => string): Promise<string> {
  const id = await i.sessionId()
  const proof = readState(await readNote(i, stateKey(id)))
  const doneOn = (await readSetting(i, 'proof.done')) === 'on'
  const conf = confidence(proof, readState2(await readNote(i, state2Key(id))), { doneOn, goal: proof.goal?.text })
  return shipText(ship({ proof, confidence: conf, ledger: await readLog(i, LEDGER_KEY), counts: countsSince(await i.get(COUNTS_KEY), await i.now()), now: await i.now(), doneOn }, t), t)
}

// The note to Claude goes into the prompt box for the person to send with Enter
function tellClaude($: EngineInterface, note: string): boolean {
  const failed = (): void => $.ui.toast(tr(DO_T_TELL_FAILED))
  $.clock.after(1_500, () => void $.prompt.fill({ text: note, mode: 'append' }).then(r => (r.isFilled ? undefined : failed()), failed))
  return true
}

export function registerShip(on: On): void {
  on('session.start', { cwd: /(?<ship>)/ }, async ($, e, next) => {
    try {
      await $.command.register({ name: 'vaken-ship', description: 'Ship it: does the work look ready? Then: check, fix yes, merge yes yes (typed steps, nothing automatic). A word after it runs a part: proof, done, pr, queue, heat, merge-order, worktrees, review-story, ci-fix, digest-branch, reviewed, orphans.', argumentHint: 'proof | done | pr | queue | heat | merge-order | worktrees | review-story | ci-fix | digest-branch | reviewed | orphans | [check | fix yes | merge yes yes]', immediate: true })
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'vaken-ship' }, async ($, e, next) => {
    if (isFolded(e.command, e.args)) return next(e)
    const i = io($)
    const env = { home: await homeFrom({ HOME: () => $.env.get('HOME'), USERPROFILE: () => $.env.get('USERPROFILE'), HOMEDRIVE: () => $.env.get('HOMEDRIVE'), HOMEPATH: () => $.env.get('HOMEPATH') }), cwd: await $.session.cwd(), root: await $.session.root() }
    const said = await shipStepText(i, env, e.args, { tell: note => tellClaude($, note), shipLine: async () => (await shipNow(i)).split('\n')[0] ?? '', byPerson: byPerson(e.origin) })
    return { text: said ?? (await shipNow(i)) }
  })
}
