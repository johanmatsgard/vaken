// Undo and named checkpoints (Settings > Safety > Undo).
import { tr } from '../core/lang'
import type { EngineInterface, On } from 'claude-code'

import { noteFailure, noteSlow } from '../core/health'
import { holdNote, readNote } from '../core/flush'
import { withToastGate } from '../core/io'
import { bindSafeFs } from '../core/safewrite'
import { homeFrom } from '../core/platform'
import type { Io } from '../core/io'
import { readSetting } from '../core/settings'
import { LAST_NONE, LAST_TITLE, NAMED_WHAT, RESTORED_WHAT, UNDO_SETTING, buildPlan, deleteNotes, fileToolTargets, filesWord, findNamed, gitChanged, hashText, lastChanged, listText, loadIndex, madeText, makeCheckpoint, markKey, namedKey, namedListText, parseCheckpointAsk, parseNamed, parsePending, parseUndoAsk, pendingKey, previewText, restorable, restore, restoredText, saveBefore, shellPlan, shown, sinceWants, wantsSig } from '../core/undo'
import type { Pending, PlanFile, Probe, Target, Want } from '../core/undo'
import { LEDGER_KEY, pushLog } from './compaction'
import { isEditTool, isShellTool, shellFlavorOfTool } from '../core/tools'
import { subArgs, isFolded } from '../core/menu'
import { BY_PERSON_ONLY, byPerson } from '../core/origin'

// IO-BLOCK-START
function io($: EngineInterface): Io {
  // Bound to the safe file calls (core/safewrite.ts)
  return bindSafeFs(withToastGate({
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
  }), { stat: (path, options) => $.fs.stat(path, options), list: path => $.fs.list(path) })
}
// IO-BLOCK-END

// What a path is, from the engine: a file, a folder, or something else.
const probeOf =
  ($: EngineInterface): Probe =>
  async path => {
    try {
      const s = await $.fs.stat(path)
      return { kind: s.kind, size: s.size }
    } catch {
      return undefined
    }
  }

// The preview of /vaken-undo last, its one way in: the command
export async function previewLast(i: Io, base: string): Promise<string> {
  const sid = await i.sessionId()
  const now = await i.now()
  const idx = await loadIndex(i, sid)
  const mark = (await readNote(i, markKey(sid))) as unknown
  const wants = sinceWants(idx, typeof mark === 'number' ? mark : 0)
  if (wants.length === 0) return LAST_NONE
  const plan = await buildPlan(i, await i.home(), sid, idx, wants)
  const pending: Pending = { kind: 'last', sig: hashText(wantsSig(wants)), at: now }
  await i.set(pendingKey(sid), pending)
  return previewText(LAST_TITLE, plan, now, base, '/vaken-undo last yes')
}

const noCheckpoint = (name: string, named: { name: string }[]): string => `No checkpoint named "${name}". ${named.length === 0 ? 'None is named yet: /vaken-undo checkpoint <name>.' : `Named: ${named.map(n => n.name).join(', ')}.`}`

export async function previewNamed(i: Io, base: string, name: string): Promise<string> {
  const sid = await i.sessionId()
  const now = await i.now()
  const named = parseNamed(await i.get(namedKey(sid)))
  const cp = findNamed(named, name)
  if (cp === undefined) return noCheckpoint(name, named)
  const plan = await buildPlan(i, await i.home(), sid, await loadIndex(i, sid), cp.items)
  const pending: Pending = { kind: 'named', name: cp.name, at: now }
  await i.set(pendingKey(sid), pending)
  return previewText(`Preview of going back to checkpoint "${cp.name}".`, plan, now, base, `/vaken-undo name ${cp.name} yes`)
}

const isOn = async (i: Io): Promise<boolean> => (await readSetting(i, UNDO_SETTING)) !== 'off'

// The call's own arguments: the event without the keys the engine adds.
function argsOf(e: unknown): Record<string, unknown> {
  const args = { ...(e as Record<string, unknown>) }
  delete args.tool
  delete args.tool_use_id
  delete args.agentId
  return args
}

const ledger = async (i: Io, sid: string, what: string, detail: string): Promise<void> => pushLog(i, LEDGER_KEY, { at: await i.now(), session: sid, what, detail, how: 'typed', did: true })

async function pendingOf(i: Io, sid: string): Promise<Pending | undefined> {
  const p = parsePending(await i.get(pendingKey(sid)))
  return p !== undefined && (await i.now()) - p.at < 10 * 60_000 ? p : undefined
}

export function registerUndo(on: On): void {
  on('session.start', { cwd: /(?<undo>)/ }, async ($, e, next) => {
    try {
      await $.command.register({ name: 'vaken-undo', description: 'List the last changed files, see what a restore would do, restore with yes. A word after it runs a part: checkpoint.', argumentHint: 'checkpoint | <number> | last | name <checkpoint> | ... yes', immediate: true }) // en-only: slash menu hint
    } catch {
      // the commands are optional: a failure shows less, never breaks the session
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('prompt.submit', { text: /(?<undo>)/ }, async ($, e, next) => {
    if (!e.text.trimStart().startsWith('/')) {
      try {
        const i = io($)
        await holdNote(i, markKey(await i.sessionId()), await i.now(), 'own')
      } catch {
      }
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  // The hook only watches; it never refuses and never stops the step.
  on('tool.call', { tool: /(?<undo>)/ }, async ($, e, next) => {
    const i = io($)
    try {
      if ((isEditTool(e.tool) || isShellTool(e.tool)) && (await isOn(i))) {
        const t0 = await i.now()
        const env = { home: await i.home(), cwd: await $.session.cwd() }
        const args = argsOf(e)
        let targets: Target[]
        if (isShellTool(e.tool)) {
          const plan = typeof args.command === 'string' ? shellPlan(args.command, env, shellFlavorOfTool(e.tool)) : { targets: [] as Target[], gitDir: undefined }
          targets = plan.gitDir === undefined ? plan.targets : [...plan.targets, ...(await gitChanged(i, plan.gitDir))]
        } else targets = fileToolTargets(e.tool, args, env)
        if (targets.length > 0) await saveBefore(i, probeOf($), await i.sessionId(), targets, e.tool)
        await noteSlow(i, 'undo', (await i.now()) - t0)
      }
    } catch {
    }
    return next(e)
  }).catch(async ($, e, next) => {
    if (next.error.kind !== 're-entry') await noteFailure(io($), 'undo', next.error.kind)
    return next(e)
  })

  on('command.run', { command: 'vaken-undo' }, async ($, e0, next) => {
    const rest0 = subArgs(e0.args, 'checkpoint')
    if (rest0 === undefined) return next(e0)
    const e = { ...e0, args: rest0 }
    const i = io($)
    const sid = await i.sessionId()
    const ask = parseCheckpointAsk(e.args)
    if (ask.kind === 'bad') return { text: ask.why }
    if (ask.kind === 'list') return { text: namedListText(parseNamed(await i.get(namedKey(sid))), await loadIndex(i, sid), await i.now()) }
    const made = await makeCheckpoint(i, probeOf($), sid, ask.name)
    if (!made.ok) return { text: made.why }
    await ledger(i, sid, NAMED_WHAT, `${made.named.name}: ${filesWord(made.held)}`)
    i.invalidate()
    return { text: madeText(made) }
  })

  on('command.run', { command: 'vaken-undo' }, async ($, e, next) => {
    if (isFolded(e.command, e.args)) return next(e)
    const i = io($)
    const sid = await i.sessionId()
    const now = await i.now()
    const base = await $.session.cwd()
    const home = await i.home()
    const ask = parseUndoAsk(e.args)
    if (ask.kind === 'bad') return { text: ask.why }
    const idx = await loadIndex(i, sid)
    const named = parseNamed(await i.get(namedKey(sid)))
    if (ask.kind === 'list') return { text: listText(idx, named, now, base, (await isOn(i)) ? 'on' : 'off') }
    if (ask.kind === 'last' && !ask.yes) return { text: await previewLast(i, base) }
    if (ask.kind === 'named' && !ask.yes) return { text: await previewNamed(i, base, ask.name) }

    let wants: Want[]
    let title: string
    let confirm: string
    let pending: Pending
    if (ask.kind === 'last') {
      const mark = (await readNote(i, markKey(sid))) as unknown
      wants = sinceWants(idx, typeof mark === 'number' ? mark : 0)
      if (wants.length === 0) return { text: LAST_NONE }
      title = LAST_TITLE
      confirm = '/vaken-undo last yes'
      pending = { kind: 'last', sig: hashText(wantsSig(wants)), at: now }
    } else if (ask.kind === 'file') {
      const item = lastChanged(idx).find(x => x.n === ask.n)
      if (item === undefined) return { text: `There is no number ${ask.n} in the list. Run /vaken-undo to see it.` }
      wants = [{ path: item.snap.path, snap: item.snap.id }]
      title = `Undo preview for ${shown(item.snap.path, base)}.`
      confirm = `/vaken-undo ${ask.n} yes`
      pending = { kind: 'file', n: ask.n, path: item.snap.path, snap: item.snap.id, at: now }
    } else {
      const cp = findNamed(named, ask.name)
      if (cp === undefined) return { text: noCheckpoint(ask.name, named) }
      wants = cp.items
      title = `Preview of going back to checkpoint "${cp.name}".`
      confirm = `/vaken-undo name ${cp.name} yes`
      pending = { kind: 'named', name: cp.name, at: now }
    }
    const plan: PlanFile[] = await buildPlan(i, home, sid, idx, wants)

    if (!ask.yes) {
      await i.set(pendingKey(sid), pending)
      return { text: previewText(title, plan, now, base, confirm) }
    }
    // A yes writes files back, so only the person may type it.
    if (!byPerson(e.origin)) return { text: BY_PERSON_ONLY }
    const held = await pendingOf(i, sid)
    const same = held !== undefined && (held.kind === 'file' ? pending.kind === 'file' && held.n === pending.n && held.snap === pending.snap && held.path === pending.path : held.kind === 'named' ? pending.kind === 'named' && held.name === pending.name : pending.kind === 'last' && held.sig === pending.sig)
    if (!same) return { text: `Run the preview first: ${confirm.replace(/ yes$/, '')}. The list may have changed since you last looked, and a restore only happens after you have seen what it does.` }
    if (restorable(plan) === 0) {
      await i.del(pendingKey(sid))
      return { text: previewText(title, plan, now, base, confirm) }
    }
    // A restore writes only inside the project, never through a link (core/safewrite.ts).
    const r = await restore(i, probeOf($), sid, plan, { fs: { stat: (path, options) => $.fs.stat(path, options), list: path => $.fs.list(path) }, root: await $.session.root() })
    await i.del(pendingKey(sid))
    if (r.done > 0) {
      await ledger(i, sid, RESTORED_WHAT, ask.kind === 'file' ? shown(wants[0].path, base) : ask.kind === 'last' ? `edits since your last message: ${filesWord(r.done)}` : `checkpoint ${ask.name}: ${filesWord(r.done)}`)
      i.toast(tr(r.done === 1 ? 'Restored {n} file.' : 'Restored {n} files.').replace('{n}', String(r.done)), true)
      i.invalidate()
    }
    const left = deleteNotes(plan, now, base)
    return { text: [restoredText(r, base), ...(left.length > 0 ? ['', 'Left for you, because vaken never deletes a file:', ...left] : [])].join('\n') } // en-only: plain answer of a slash command (text twin)
  })
}
