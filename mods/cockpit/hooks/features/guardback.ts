// The Guard, back-end blocks (Settings > Safety): migration hold (Off, Warn, Hold), env names check, command ledger, untrusted-data fence.
import type { EngineInterface, On } from 'claude-code'

import { noteHeld, stepOf, takeAllow } from '../core/allowonce'
import { ALLOW_USED_WHAT, canChange, guardBrokeReason } from '../core/guard'
import { ENV_WHAT, FENCE_HIT_NOTE, FENCE_NOTE, FENCE_WHAT, GUARDBACK_WHATS, HELD_WHAT, SETTING_KEY, WARNED_WHAT, addHit, detailOf, envDetail, envNote, envNotedKey, envToast, fenceDetail, fenceKey, fenceText, fenceToast, heldToast, holdReason, isOutside, orderKinds, parseFence, warnNote, warnToast } from '../core/guardback'
import type { Mode } from '../core/guardback'
import { addEntry, commandsKey, commandsText, makeEntry, parseEntries, statusOf } from '../core/guardcmds'
import { isCodeFile, namesInCode, readDeclared, undeclaredIn } from '../core/guardenv'
import { judgeMigration, proposedText } from '../core/guardmigrate'
import type { BackFound } from '../core/guardmigrate'
import { looksLikeTest } from '../core/guardtests'
import { holdNote, readNote } from '../core/flush'
import { bindFs } from '../core/fileops'
import { withToastGate } from '../core/io'
import { homeFrom } from '../core/platform'
import { bindPlatform } from '../core/procs'
import type { Io } from '../core/io'
import { readSetting } from '../core/settings'
import { tellsClaude } from '../core/tellclaude'
import { undoOffer } from '../core/undo'
import { LEDGER_KEY, logLines, pushLog, readLog } from './compaction'
import { isEditTool, isShellTool } from '../core/tools'
import { argsOf, guardMode, takeFresh } from '../core/guardcommon'
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

// FS-BLOCK-START
// The Io of this file, with the runtime's file calls bound to it (core/fileops.ts reads them; closures only, `$` is not passed on).
function ioFs($: EngineInterface): Io {
  const made = bindFs(io($), {
    stat: path => $.fs.stat(path),
    list: path => $.fs.list(path),
    readBytes: async path => await $.fs.read(path, { as: 'bytes' }),
  })
  return bindPlatform(made, () => $.env.get('OS'))
}
// FS-BLOCK-END

// A hold already reported (the ledger line and the toast) for this session
const heldSeen = new Set<string>()
const warnSeen = new Set<string>()
// Writes to the command list run one after the other, so two steps at the same moment do not lose a line.
let listChain: Promise<unknown> = Promise.resolve()

const modeOf = (i: Io): Promise<Mode> => guardMode(i, SETTING_KEY.migrations)
const isOn = async (i: Io, key: string): Promise<boolean> => (await readSetting(i, key)) !== 'off'

// The keys of held findings for the one "allow once" (core/allowonce.ts)
const heldKeys = (list: BackFound[]): string[] => list.map(f => `migrations|${f.key}`)

const ledger = async (i: Io, sid: string, what: string, detail: string, how: 'auto' | 'typed'): Promise<void> => pushLog(i, LEDGER_KEY, { at: await i.now(), session: sid, what, detail, how, did: true })

function addToList(i: Io, sid: string, command: string, outcome: { status: 'ok' | 'failed' | 'interrupted' | 'denied'; exit?: number }): Promise<void> {
  const p = listChain.then(async () => {
    const entry = makeEntry(await i.now(), command, outcome)
    await holdNote(i, commandsKey(sid), addEntry(parseEntries(await readNote(i, commandsKey(sid))), entry), 'own')
  })
  listChain = p.catch(() => undefined)
  return p
}

async function rootOf($: EngineInterface): Promise<string> {
  return await $.session.root()
}

export function registerGuardBack(on: On): void {
  on('session.start', { cwd: /(?<guardback>)/ }, async ($, e, next) => {
    try {
    } catch {
      // the commands are optional: a failure shows less, never breaks the session
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('prompt.submit', { text: /(?<guardback>)/ }, async ($, e, next) => {
    if (!e.text.trimStart().startsWith('/')) heldSeen.clear()
    return next(e)
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: /(?<guardback>)/ }, async ($, e, next) => {
    const i = io($)
    const sid = await i.sessionId()
    const tool = String(e.tool)
    const args = argsOf(e)
    let mode: Mode = 'off'
    let found: BackFound[] = []
    try {
      mode = await modeOf(i)
      if (mode !== 'off') {
        const cwd = await $.session.cwd()
        const root = await rootOf($)
        found = await judgeMigration(i, { cwd, root }, tool, args)
      }
    } catch {
      // A check that breaks must not stop the work in Warn; in Hold it cannot say the step is safe.
      if (mode === 'hold' && canChange(tool)) return { deny: guardBrokeReason }
    }
    const command = isShellTool(tool) && typeof args.command === 'string' ? args.command : undefined
    if (found.length > 0 && mode === 'hold') {
      if (await takeAllow(i, sid, stepOf(e), heldKeys(found))) {
        await ledger(i, sid, ALLOW_USED_WHAT, detailOf(found), 'typed')
        i.invalidate()
      } else {
        await noteHeld(i, sid, stepOf(e), heldKeys(found), detailOf(found))
        const offer = await undoOffer(i)
        const fresh = takeFresh(heldSeen, found, f => `${sid}|${f.key}`)
        if (fresh.length > 0) {
          await ledger(i, sid, HELD_WHAT, detailOf(fresh), 'auto')
          i.toast(`${heldToast()}${offer.toast}`, true)
          i.invalidate()
        }
        try {
          if (command !== undefined && (await isOn(i, SETTING_KEY.commands))) await addToList(i, sid, command, { status: 'denied' })
        } catch {
        }
        return { deny: `${holdReason(found)}${offer.note}` }
      }
    }
    const result = await next(e)
    // Nothing below may throw: a failure after next must not run the tool twice.
    if (result.deny !== undefined) {
      try {
        if (command !== undefined && (await isOn(i, SETTING_KEY.commands))) await addToList(i, sid, command, { status: 'denied' })
      } catch {
      }
      return result
    }
    const notes: string[] = []
    try {
      if (command !== undefined && (await isOn(i, SETTING_KEY.commands))) {
        const interrupted = (result.result as { interrupted?: unknown } | undefined)?.interrupted === true
        await addToList(i, sid, command, statusOf(false, result.isError === true, interrupted, result.text ?? ''))
      }
    } catch {
    }
    try {
      if (found.length > 0 && mode === 'warn') {
        await ledger(i, sid, WARNED_WHAT, detailOf(found), 'auto')
        const fresh = takeFresh(warnSeen, found, f => `${sid}|${f.key}`)
        if (fresh.length > 0) {
          i.toast(warnToast())
          i.invalidate()
          notes.push(warnNote(fresh))
        }
      }
    } catch {
    }
    try {
      const path = typeof args.file_path === 'string' ? args.file_path : ''
      if (isEditTool(tool) && path !== '' && isCodeFile(path) && !looksLikeTest(path) && result.isError !== true && (await isOn(i, SETTING_KEY.env))) {
        const text = proposedText(tool, args)
        const names = namesInCode(text).length === 0 ? [] : undeclaredIn(text, await readDeclared(i, await rootOf($)))
        const noted = names.length === 0 ? undefined : await i.get(envNotedKey(sid))
        const old = new Set(Array.isArray(noted) ? (noted as unknown[]).filter((x): x is string => typeof x === 'string') : [])
        const fresh = names.filter(n => !old.has(n))
        if (fresh.length > 0) {
          await i.set(envNotedKey(sid), [...old, ...fresh].slice(-200))
          await ledger(i, sid, ENV_WHAT, envDetail(fresh), 'auto')
          i.toast(envToast(fresh))
          i.invalidate()
          if (await tellsClaude(i)) notes.push(envNote(fresh))
        }
      }
    } catch {
    }
    try {
      if (isOutside(tool, args) && (await isOn(i, SETTING_KEY.fence))) {
        const hit = orderKinds(result.text ?? '') > 0
        notes.push(hit ? `${FENCE_NOTE} ${FENCE_HIT_NOTE}` : FENCE_NOTE)
        if (hit) {
          await i.set(fenceKey(sid), addHit(parseFence(await i.get(fenceKey(sid))), tool))
          await ledger(i, sid, FENCE_WHAT, fenceDetail(tool, 1), 'auto')
          i.toast(fenceToast(tool))
          i.invalidate()
        }
      }
    } catch {
    }
    return notes.length === 0 ? result : { ...result, context: [...(result.context ?? []), ...notes] }
  }).catch(($, e, next) => {
    if (next.called) return next(e)
    // The guard itself broke before the step ran: refuse only what can change things
    return canChange(String(e.tool)) ? { deny: guardBrokeReason } : next(e)
  })

  on('command.run', { command: 'vaken-guard' }, async ($, e, next) => {
    const rest0 = subArgs(e.args, 'commands')
    if (rest0 === undefined) return next(e)
    const i = io($)
    return { text: commandsText(parseEntries(await readNote(i, commandsKey(await i.sessionId()))), await isOn(i, SETTING_KEY.commands)) }
  })

  on('command.run', { command: 'vaken-guard' }, async ($, e, next) => {
    const rest0 = subArgs(e.args, 'fence')
    if (rest0 === undefined) return next(e)
    const i = io($)
    const last = logLines((await readLog(i, LEDGER_KEY)).filter(x => GUARDBACK_WHATS.includes(x.what)), 3)
    const text = fenceText(parseFence(await i.get(fenceKey(await i.sessionId()))), await isOn(i, SETTING_KEY.fence))
    return { text: last.length === 0 ? text : `${text}\n\nLast back-end guard lines:\n${last.join('\n')}` }
  })
}
