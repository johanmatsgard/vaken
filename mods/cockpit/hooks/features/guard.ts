// The Guard (Settings > Safety): risky commands, edits outside the fence, odd new packages, weakened tests, and Pause all.
import { tr } from '../core/lang'
import type { EngineInterface, On } from 'claude-code'

import { ALLOW_SET_WHAT, ALLOW_USED_WHAT, BLOCKS, DISMISS_WHAT, GUARD_WHATS, HALT_DENY_WHAT, HALT_SCOPE, HALT_WHAT, HELD_WHAT, OTHER_RULES, OTHER_SETTING_KEY, RESUME_WHAT, SETTING_KEY, WARNED_WHAT, allowKey, allowLive, canChange, detailOf, guardBrokeReason, haltKey, haltMem, haltReason, haltStops, heldToast, holdReason, parseAllow, parseGuardAsk, parseHalt, parsePkg, pkgKey, scopeFrom, scopeKey, statusText, strings, warnNote, warnToast, withPkg } from '../core/guard'
import type { Block, Found, Mode, OtherRule } from '../core/guard'
import { GUARD_UPGRADE_WHAT, upgradeGuardWorst } from '../core/guardupgrade'
import { findSetting } from '../core/settings'
import { grantAllow, noteHeld, stepOf, takeAllow } from '../core/allowonce'
import { judgeTool } from '../core/guardjudge'
import type { Env, Judged, Modes } from '../core/guardjudge'
import { bindFs } from '../core/fileops'
import { withToastGate } from '../core/io'
import { bindPlatform } from '../core/procs'
import { homeFrom } from '../core/platform'
import type { Io } from '../core/io'
import { undoOffer } from '../core/undo'
import { LEDGER_KEY, logLines, pushLog, readLog } from './compaction'
import { argsOf, guardMode, takeFresh } from '../core/guardcommon'
import { DEFAULT_HOLD_WHY, HOST_NOTE_KEY, hostView, isExplicit, noteHostView, parseHostNote, strongMode } from '../core/guardhost'
import type { HostView } from '../core/guardhost'
import { isFolded } from '../core/menu'
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

const modeOf = (i: Io, b: Block): Promise<Mode> => guardMode(i, SETTING_KEY[b])

const modesOf = async (i: Io): Promise<Modes> => ({ destructive: await modeOf(i, 'destructive'), scope: await modeOf(i, 'scope'), packages: await modeOf(i, 'packages'), tests: await modeOf(i, 'tests') })

const HALT_SCOPE_CAP = `${HALT_SCOPE.charAt(0).toUpperCase()}${HALT_SCOPE.slice(1)}`

async function othersOf(i: Io): Promise<Record<OtherRule, Mode>> {
  const out = {} as Record<OtherRule, Mode>
  for (const r of OTHER_RULES) out[r] = await guardMode(i, OTHER_SETTING_KEY[r])
  return out
}

const isHalted = async (i: Io, sid: string): Promise<boolean> => parseHalt(await i.get(haltKey(sid))) !== undefined

// The keys of held findings, as the one "allow once" (core/allowonce.ts) knows them: the block's name goes first
const heldKeys = (list: Found[]): string[] => list.map(f => `${f.block}|${f.key}`)

async function envOf($: EngineInterface): Promise<Env> {
  return { home: await homeFrom({ HOME: () => $.env.get('HOME'), USERPROFILE: () => $.env.get('USERPROFILE'), HOMEDRIVE: () => $.env.get('HOMEDRIVE'), HOMEPATH: () => $.env.get('HOMEPATH') }), cwd: await $.session.cwd(), root: await $.session.root() }
}

const ledger = async (i: Io, sid: string, what: string, detail: string, how: 'auto' | 'typed' | 'button'): Promise<void> => pushLog(i, LEDGER_KEY, { at: await i.now(), session: sid, what, detail, how, did: true })

const byBlock = (list: Found[], b: Block): Found[] => list.filter(f => f.block === b)

// "Allow once", the one way in: /vaken-guard allow once (`typed`)
export async function allowHeldOnce(i: Io, sid: string, how: 'typed' | 'button', onlyBound = false): Promise<{ set: boolean; bound: boolean; words?: string }> {
  const g = await grantAllow(i, sid, onlyBound)
  if (!g.set) return g
  const what = g.bound ? `The stopped step goes through once${g.words === undefined ? '' : `: ${g.words}`}` : 'The next stopped step goes through once.'
  await pushLog(i, LEDGER_KEY, { at: await i.now(), session: sid, what: ALLOW_SET_WHAT, detail: what.slice(0, 220), how, did: true })
  i.invalidate()
  return g
}

// "Dismiss": the stopped steps of that session leave Needs you. It writes only the ledger line and never touches the allowance, so nothing goes through.
export async function dismissHeld(i: Io, sid: string, how: 'typed' | 'button'): Promise<void> {
  await ledger(i, sid, DISMISS_WHAT, 'The stopped step was dismissed. It did not run.', how)
  i.invalidate()
}

// Takes an Io, never `$`.
export async function setHalt(i: Io, sid: string, on: boolean, how: 'typed' | 'button'): Promise<boolean> {
  if ((await isHalted(i, sid)) === on) return false
  haltMem.on = on
  if (on) {
    await i.set(haltKey(sid), { at: await i.now() })
    await ledger(i, sid, HALT_WHAT, 'Commands, edits, tools, agents and web fetches are stopped in this session.', how)
  } else {
    await i.del(haltKey(sid))
    await ledger(i, sid, RESUME_WHAT, 'Steps that change things work again.', how)
  }
  i.invalidate()
  return true
}

export function registerGuard(on: On): void {
  on('session.start', { cwd: /(?<guard>)/ }, async ($, e, next) => {
    try {
      await $.command.register({ name: 'vaken-pause', description: 'Stop commands, edits, tools, agents and web fetches in this session: /vaken-pause, /vaken-pause off. A word after it runs a part: steer.', argumentHint: 'steer | off | status', immediate: true })
      await $.command.register({ name: 'vaken-guard', description: 'Show the guard, allow one stopped step, set the edit fence. A word after it runs a part: outbox, fence, commands.', argumentHint: 'outbox | fence | commands | allow once | scope <folders...> | scope off', immediate: true }) // en-only: slash menu hint
    } catch {
      // the commands are optional: a failure shows less, never breaks the session
    }
    try {
      const i = io($)
      const cleared = await upgradeGuardWorst(i)
      if (cleared.length > 0) await ledger(i, await i.sessionId(), GUARD_UPGRADE_WHAT, cleared.map(k => findSetting(k)?.label ?? k).join(', '), 'auto')
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('prompt.submit', { text: /(?<guard>)/ }, async ($, e, next) => {
    if (!e.text.trimStart().startsWith('/')) heldSeen.clear()
    return next(e)
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: /(?<guard>)/ }, async ($, e, next) => {
    const i = ioFs($)
    const sid = await i.sessionId()
    // Halt comes first and does not depend on any setting.
    if (haltStops(e.tool) && (await isHalted(i, sid))) {
      await ledger(i, sid, HALT_DENY_WHAT, `Stopped ${e.tool.length > 32 ? `${e.tool.slice(0, 31)}…` : e.tool}.`, 'auto')
      return { deny: haltReason }
    }
    const modes = await modesOf(i)
    const anyHold = BLOCKS.some(b => modes[b] === 'hold')
    let judged: Judged = { found: [], learn: [] }
    if (BLOCKS.some(b => modes[b] !== 'off')) {
      try {
        judged = await judgeTool(i, await envOf($), e.tool, argsOf(e), modes)
      } catch {
        // A check that breaks must not stop the work in Warn; in Hold it cannot say the step is safe.
        if (anyHold && canChange(e.tool)) return { deny: guardBrokeReason }
      }
    }
    // A setting the person chose is never changed, and an unreadable answer stays Warn.
    let seen: HostView | undefined
    const view = async (): Promise<HostView> => {
      if (seen === undefined) {
        seen = await hostView(() => $.tool.check({ tool: e.tool, input: argsOf(e) } as never), () => $.settings.read())
        await noteHostView(i, seen)
      }
      return seen
    }
    const eff: Modes = { ...modes }
    if (judged.found.some(f => f.block === 'destructive')) eff.destructive = await strongMode(i, SETTING_KEY.destructive, modes.destructive, view)
    const byDefault = (f: Found): boolean => eff[f.block] === 'hold' && modes[f.block] === 'warn'
    const holds = judged.found.filter(f => eff[f.block] === 'hold' && f.soft !== true)
    const warns = judged.found.filter(f => eff[f.block] === 'warn' || (eff[f.block] === 'hold' && f.soft === true))
    const step = stepOf(e)
    let allowed = false
    if (holds.length > 0) {
      if (await takeAllow(i, sid, step, heldKeys(holds))) {
        allowed = true
        await ledger(i, sid, ALLOW_USED_WHAT, detailOf(holds), 'typed')
        i.invalidate()
      } else {
        await noteHeld(i, sid, step, heldKeys(holds), detailOf(holds))
        const offer = await undoOffer(i)
        let first = false
        for (const b of BLOCKS) {
          const mine = takeFresh(heldSeen, byBlock(holds, b), f => `${sid}|${b}|${f.key}`)
          if (mine.length === 0) continue
          first = true
          await ledger(i, sid, HELD_WHAT[b], detailOf(mine), 'auto')
        }
        if (first) {
          i.toast(`${heldToast(holds)}${offer.toast}`, true)
          i.invalidate()
        }
        return { deny: `${holdReason(holds)}${holds.some(byDefault) ? ` ${DEFAULT_HOLD_WHY}` : ''}${offer.note}` }
      }
    }
    const result = await next(e)
    // Nothing below may throw: a failure after next must not run the tool twice.
    try {
      if (result.deny !== undefined) return result
      // An ordinary new package is not checked again, an odd one the person let through is approved
      const odd = judged.warned ?? []
      if (judged.learn.length > 0 || odd.length > 0) {
        const approved = allowed ? [...judged.learn, ...odd] : judged.learn
        await i.set(pkgKey(sid), withPkg(parsePkg(await i.get(pkgKey(sid))), approved, allowed ? [] : odd))
      }
      if (warns.length === 0) return result
      for (const b of BLOCKS) {
        const mine = byBlock(warns, b)
        if (mine.length > 0) await ledger(i, sid, WARNED_WHAT[b], detailOf(mine), 'auto')
      }
      const fresh = takeFresh(warnSeen, warns, f => `${sid}|${f.block}|${f.key}`)
      if (fresh.length === 0) return result
      i.toast(warnToast(fresh))
      i.invalidate()
      return { ...result, context: [...(result.context ?? []), warnNote(fresh)] }
    } catch {
      return result
    }
  }).catch(($, e, next) => {
    if (next.called) return next(e)
    // The guard itself broke before the step ran: refuse only what can change things
    return canChange(String(e.tool)) ? { deny: guardBrokeReason } : next(e)
  })

  on('command.run', { command: 'vaken-pause' }, async ($, e, next) => {
    if (isFolded(e.command, e.args)) return next(e)
    const i = io($)
    const sid = await i.sessionId()
    const word = e.args.trim().toLowerCase()
    const halted = await isHalted(i, sid)
    if (word === 'status') return { text: halted ? `Paused for safety. ${HALT_SCOPE_CAP} are stopped in this session. Resume with /vaken-pause off.` : 'Not paused.' } // en-only: plain answer of a slash command (text twin)
    if (word === 'off') {
      if (!halted) return { text: 'It was not halted.' } // en-only: plain answer of a slash command (text twin)
      // Lifting a pause unlocks every step, so only the person may type it.
      if (!byPerson(e.origin)) return { text: BY_PERSON_ONLY }
      await setHalt(i, sid, false, 'typed')
      i.toast(tr('Resumed.'), true)
      return { text: 'Resumed. Steps that change things work again in this session.' } // en-only: plain answer of a slash command (text twin)
    }
    if (word !== '' && word !== 'on') return { text: 'Use /vaken-pause to stop, /vaken-pause off to lift it, /vaken-pause status to look.' } // en-only: plain answer of a slash command (text twin)
    if (halted) return { text: 'Already paused. Resume with /vaken-pause off.' } // en-only: plain answer of a slash command (text twin)
    await setHalt(i, sid, true, 'typed')
    i.toast(tr('Paused for safety. Resume with /vaken-pause off.'), true)
    return { text: `Paused for safety. ${HALT_SCOPE_CAP} are stopped in this session. Reading still works. A step that is already running keeps running. Resume with /vaken-pause off.` }
  })

  on('command.run', { command: 'vaken-guard' }, async ($, e, next) => {
    if (isFolded(e.command, e.args)) return next(e)
    const i = io($)
    const sid = await i.sessionId()
    const ask = parseGuardAsk(e.args)
    if (ask.kind === 'bad') return { text: ask.why }
    // Letting a held step through or changing your folders loosens the guard, so only the person may type it.
    if ((ask.kind === 'allow' || ask.kind === 'scope-off' || ask.kind === 'scope-set') && !byPerson(e.origin)) return { text: BY_PERSON_ONLY }
    if (ask.kind === 'allow') {
      const g = await allowHeldOnce(i, sid, 'typed')
      const modes = await modesOf(i)
      const others = await othersOf(i)
      const anyHold = BLOCKS.some(b => modes[b] === 'hold') || OTHER_RULES.some(r => others[r] === 'hold')
      const note = parseHostNote(await i.get(HOST_NOTE_KEY))
      const unasked = note?.sid === sid && note.view === 'unasked'
      const worstStop = unasked && ((modes.destructive === 'warn' && !(await isExplicit(i, SETTING_KEY.destructive))) || (others.secrets === 'warn' && !(await isExplicit(i, OTHER_SETTING_KEY.secrets))))
      const said = g.bound ? 'Done. The step held last goes through, once, and no other stopped step.' : 'Done. The next stopped step goes through, once.' // en-only: plain answer of a slash command (text twin)
      const tail = anyHold ? '' : worstStop ? ' In this mode Claude Code does not ask first, so risky commands and secrets stop even on Warn.' : g.bound ? '' : ' Nothing is on Hold now: set a check to Hold in Settings > Safety.' // en-only: plain answer of a slash command (text twin)
      return { text: `${said} It fades if not used within 30 minutes.${tail}` }
    }
    if (ask.kind === 'scope-off') {
      await i.del(scopeKey(sid))
      return { text: 'Your folders cleared: only protected files count now.' } // en-only: plain answer of a slash command (text twin)
    }
    if (ask.kind === 'scope-set') {
      const paths = scopeFrom(ask.words, await i.home(), await $.session.cwd())
      await i.set(scopeKey(sid), paths)
      return { text: `Your folders set for this session: ${paths.join(', ')}. An edit outside them is flagged (see Settings > Safety). /vaken-guard scope off clears it.` }
    }
    const scope = strings(await i.get(scopeKey(sid)))
    if (ask.kind === 'scope-show') return { text: scope.length > 0 ? `Your folders: ${scope.join(', ')}. /vaken-guard scope off clears them.` : 'No folders set. /vaken-guard scope <folders...> sets them for this session.' } // en-only: plain answer of a slash command (text twin)
    const last = logLines((await readLog(i, LEDGER_KEY)).filter(x => GUARD_WHATS.includes(x.what)), 3)
    return {
      text: statusText({
        modes: await modesOf(i),
        others: await othersOf(i),
        halted: await isHalted(i, sid),
        allowPending: allowLive(parseAllow(await i.get(allowKey(sid))), await i.now()),
        scope,
        last,
      }),
    }
  })
}
