// The Guard, part 2 (Settings > Safety): the real-world action guard, the secret tripwire, the outbox and the away policy.
import { tr } from '../core/lang'
import type { EngineInterface, On } from 'claude-code'

import { noteHeld, stepOf, takeAllow } from '../core/allowonce'
import { ALLOW_USED_WHAT, canChange } from '../core/guard'
import type { Mode } from '../core/guard'
import { clearBand, postBand } from '../core/band'
import { judgeTool } from '../core/guardjudge'
import type { Env } from '../core/guardjudge'
import { secretsAfter } from '../core/guardsecrets'
import { DEFAULT_HOLD_WHY, hostView, noteHostView, strongMode } from '../core/guardhost'
import type { HostView } from '../core/guardhost'
import { AWAY_BAND, AWAY_BAND_TTL_MS, AWAY_DENY_WHAT, AWAY_KEY, AWAY_OFF_WHAT, AWAY_ON_WHAT, AWAY_POLICY_KEY, GUARDWORLD_WHATS, HELD_WHAT, OUTBOX_KEY, RULES, SECRETS_KEY, WARNED_WHAT, WORLD_KEY, addOutbox, allowedNote, awayReason, awayText, awayToast, brokeReason, detailOf, emptyOutbox, heldToast, holdReason, judgeWorld, outboxBand, outboxKey, outboxText, parseAway, parseAwayAsk, parseOutbox, warnNote, warnToast, withheldReason } from '../core/guardworld'
import type { Judged, Modes, Rule, WorldFound } from '../core/guardworld'
import { bindFs } from '../core/fileops'
import { withToastGate } from '../core/io'
import { bindPlatform } from '../core/procs'
import { homeFrom } from '../core/platform'
import type { Io } from '../core/io'
import { readSetting, settingStoreKey } from '../core/settings'
import { undoOffer } from '../core/undo'
import { LEDGER_KEY, logLines, pushLog, readLog } from './compaction'
import { argsOf, guardMode, takeFresh } from '../core/guardcommon'
import { subArgs, isFolded } from '../core/menu'

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

// A hold, a warning or an away refusal already reported for this session
const heldSeen = new Set<string>()
const warnSeen = new Set<string>()
const awaySeen = new Set<string>()

const SETTING_OF: Record<Rule, string> = { world: WORLD_KEY, secrets: SECRETS_KEY }

const modeOf = (i: Io, r: Rule): Promise<Mode> => guardMode(i, SETTING_OF[r])
const modesOf = async (i: Io): Promise<Modes> => ({ world: await modeOf(i, 'world'), secrets: await modeOf(i, 'secrets') })
const outboxOn = async (i: Io): Promise<boolean> => (await readSetting(i, OUTBOX_KEY)) !== 'off'
const policyOf = async (i: Io): Promise<string> => {
  const v = await i.get(settingStoreKey(AWAY_POLICY_KEY))
  return v === 'careful' ? 'careful' : 'off'
}
const awayActive = async (i: Io): Promise<boolean> => parseAway(await i.get(AWAY_KEY)) !== undefined && (await policyOf(i)) === 'careful'

// The keys of held findings for the one "allow once" (core/allowonce.ts): the rule's name goes first
const heldKeys = (list: WorldFound[]): string[] => list.map(f => `${f.rule}|${f.key}`)

async function envOf($: EngineInterface): Promise<Env> {
  return { home: await homeFrom({ HOME: () => $.env.get('HOME'), USERPROFILE: () => $.env.get('USERPROFILE'), HOMEDRIVE: () => $.env.get('HOMEDRIVE'), HOMEPATH: () => $.env.get('HOMEPATH') }), cwd: await $.session.cwd(), root: await $.session.root() }
}

const ledger = async (i: Io, sid: string, what: string, detail: string, how: 'auto' | 'typed'): Promise<void> => pushLog(i, LEDGER_KEY, { at: await i.now(), session: sid, what, detail, how, did: true })
const byRule = (list: WorldFound[], r: Rule): WorldFound[] => list.filter(f => f.rule === r)

// Never throws.
async function recordOutbox(i: Io, sid: string, outs: Judged['outs']): Promise<void> {
  try {
    const old = parseOutbox(await i.get(outboxKey(sid)))
    const base = old !== undefined && old.open ? old : emptyOutbox(await i.now())
    await i.set(outboxKey(sid), addOutbox(base, outs))
    i.invalidate()
  } catch {
  }
}

export function registerGuardWorld(on: On): void {
  on('session.start', { cwd: /(?<guardworld>)/ }, async ($, e, next) => {
    try {
      await $.command.register({ name: 'vaken-away', description: 'Tell vaken you are away: /vaken-away on, /vaken-away off. A word after it runs a part: digest.', argumentHint: 'digest | on | off', immediate: true })
    } catch {
      // the commands are optional: a failure shows less, never breaks the session
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('prompt.submit', { text: /(?<guardworld>)/ }, async ($, e, next) => {
    if (!e.text.trimStart().startsWith('/')) heldSeen.clear()
    return next(e)
  }).catch(($, e, next) => next(e))

  on('turn.start', { turnId: /(?<guardworld>)/ }, async ($, e, next) => {
    try {
      const i = io($)
      const sid = await i.sessionId()
      await i.set(outboxKey(sid), emptyOutbox(await i.now()))
      await clearBand(i, 'outbox', sid)
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('turn.complete', { turnId: /(?<guardworld>)/ }, async ($, e, next) => {
    const r = await next(e)
    if (e.agentId !== undefined) return r
    try {
      const i = io($)
      const sid = await i.sessionId()
      const box = parseOutbox(await i.get(outboxKey(sid)))
      if (box === undefined || !box.open) return r
      await i.set(outboxKey(sid), { ...box, open: false })
      if (await outboxOn(i)) {
        const line = outboxBand(box)
        if (line !== '') await postBand(i, 'warn', 'outbox', line, 30 * 60_000, sid)
      }
    } catch {
    }
    return r
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: /(?<guardworld>)/ }, async ($, e, next) => {
    const i = ioFs($)
    const sid = await i.sessionId()
    const modes = await modesOf(i)
    const args = argsOf(e)
    const anyHold = RULES.some(r => modes[r] === 'hold')
    let judged: Judged = { found: [], outs: [] }
    try {
      judged = judgeWorld(e.tool, args, modes)
    } catch {
      // A check that breaks must not stop the work in Warn; in Hold it cannot say the step is safe.
      if (anyHold && canChange(e.tool)) return { deny: brokeReason }
    }

    // This never lets anything through, and it does not use "allow once".
    try {
      if (await awayActive(i)) {
        const strict = modes.world === 'warn' ? judgeWorld(e.tool, args, { ...modes, world: 'hold' }).found : judged.found
        const words = strict.map(f => f.words)
        const d1 = await readSetting(i, 'guard.destructive')
        if (d1 !== 'off') {
          const d = await judgeTool(i, await envOf($), e.tool, args, { destructive: d1 === 'hold' ? 'hold' : 'warn', scope: 'off', packages: 'off', tests: 'off' })
          words.push(...d.found.map(f => f.words))
        }
        if (words.length > 0) {
          const key = `${sid}|${words.join('|')}`
          if (!awaySeen.has(key)) {
            awaySeen.add(key)
            await ledger(i, sid, AWAY_DENY_WHAT, words.join(' ').slice(0, 220), 'auto')
            i.toast(tr(awayToast))
            i.invalidate()
          }
          return { deny: awayReason }
        }
      }
    } catch {
      // A check that breaks while away cannot say the step is safe: refuse what can change things.
      if (canChange(e.tool) && (await awayActive(i).catch(() => false))) return { deny: awayReason }
    }

    // A setting the person chose is never changed, and an unreadable answer stays Warn.
    let seen: HostView | undefined
    const view = async (): Promise<HostView> => {
      if (seen === undefined) {
        seen = await hostView(() => $.tool.check({ tool: e.tool, input: args } as never), () => $.settings.read())
        await noteHostView(i, seen)
      }
      return seen
    }
    const eff: Modes = { ...modes }
    if (judged.found.some(f => f.rule === 'secrets')) eff.secrets = await strongMode(i, SECRETS_KEY, modes.secrets, view)
    const holds = judged.found.filter(f => eff[f.rule] === 'hold')
    const warns = judged.found.filter(f => eff[f.rule] === 'warn')
    const step = stepOf(e)
    if (holds.length > 0) {
      if (await takeAllow(i, sid, step, heldKeys(holds))) {
        await ledger(i, sid, ALLOW_USED_WHAT, detailOf(holds), 'typed')
        i.invalidate()
      } else {
        await noteHeld(i, sid, step, heldKeys(holds), detailOf(holds))
        const offer = await undoOffer(i)
        let first = false
        for (const r of RULES) {
          const mine = takeFresh(heldSeen, byRule(holds, r), f => `${sid}|${r}|${f.key}`)
          if (mine.length === 0) continue
          first = true
          await ledger(i, sid, HELD_WHAT[r], detailOf(mine), 'auto')
        }
        if (first) {
          i.toast(`${heldToast(holds)}${offer.toast}`, true)
          i.invalidate()
        }
        return { deny: `${holdReason(holds)}${eff.secrets !== modes.secrets && holds.some(f => f.rule === 'secrets') ? ` ${DEFAULT_HOLD_WHY}` : ''}${offer.note}` }
      }
    }
    const allowedHere = holds.length > 0
    const result = await next(e)
    // Nothing below may throw: a failure after next must not run the tool twice.
    try {
      if (result.deny !== undefined) return result
      if (judged.outs.length > 0 && (await outboxOn(i))) await recordOutbox(i, sid, judged.outs)
      // A step already flagged for secrets before it ran (or allowed) is not told twice.
      const seenBefore = judged.found.some(f => f.rule === 'secrets')
      let late: WorldFound[] = []
      if (modes.secrets !== 'off' && !seenBefore && !allowedHere && typeof result.text === 'string') {
        late = secretsAfter(e.tool, result.text).map(s => ({ rule: 'secrets' as const, key: s.key, words: s.words }))
      }
      if (late.length > 0) eff.secrets = await strongMode(i, SECRETS_KEY, modes.secrets, view)
      if (late.length > 0 && eff.secrets === 'hold') {
        if (await takeAllow(i, sid, step, heldKeys(late))) {
          await ledger(i, sid, ALLOW_USED_WHAT, detailOf(late), 'typed')
          i.invalidate()
        } else {
          await noteHeld(i, sid, step, heldKeys(late), detailOf(late))
          await ledger(i, sid, HELD_WHAT.secrets, detailOf(late), 'auto')
          const offer = await undoOffer(i)
          i.toast(`${heldToast(late)}${offer.toast}`, true)
          i.invalidate()
          return { deny: `${withheldReason(late)}${modes.secrets === 'warn' ? ` ${DEFAULT_HOLD_WHY}` : ''}${offer.note}` }
        }
      }
      const noteList = [...warns, ...(eff.secrets === 'warn' ? late : [])]
      const allowedList = allowedHere ? holds : []
      if (noteList.length === 0 && allowedList.length === 0) return result
      for (const r of RULES) {
        const mine = byRule(noteList, r)
        if (mine.length > 0) await ledger(i, sid, WARNED_WHAT[r], detailOf(mine), 'auto')
      }
      const fresh = takeFresh(warnSeen, noteList, f => `${sid}|${f.rule}|${f.key}`)
      const notes: string[] = []
      const freshEarly = fresh.filter(f => !late.includes(f))
      const freshLate = fresh.filter(f => late.includes(f))
      if (freshEarly.length > 0) notes.push(warnNote(freshEarly, true))
      if (freshLate.length > 0) notes.push(warnNote(freshLate, false))
      if (fresh.length > 0) i.toast(warnToast(fresh))
      if (allowedList.length > 0) notes.push(allowedNote(allowedList))
      if (notes.length === 0) return result
      i.invalidate()
      return { ...result, context: [...(result.context ?? []), ...notes] }
    } catch {
      return result
    }
  }).catch(($, e, next) => {
    if (next.called) return next(e)
    // The check itself broke before the step ran: refuse only what can change things
    return canChange(String(e.tool)) ? { deny: brokeReason } : next(e)
  })

  on('command.run', { command: 'vaken-guard' }, async ($, e0, next) => {
    const rest0 = subArgs(e0.args, 'outbox')
    if (rest0 === undefined) return next(e0)
    const i = io($)
    return { text: outboxText(parseOutbox(await i.get(outboxKey(await i.sessionId()))), await outboxOn(i)) }
  })

  on('command.run', { command: 'vaken-away' }, async ($, e, next) => {
    if (isFolded(e.command, e.args)) return next(e)
    const i = io($)
    const sid = await i.sessionId()
    const ask = parseAwayAsk(e.args)
    if (ask.kind === 'bad') return { text: ask.why }
    const isAway = parseAway(await i.get(AWAY_KEY)) !== undefined
    if (ask.kind === 'on' && !isAway) {
      await i.set(AWAY_KEY, { at: await i.now() })
      await ledger(i, sid, AWAY_ON_WHAT, 'Risky steps are stopped by themselves while you are away (if While away is set to Careful).', 'typed')
      await postBand(i, 'info', 'away', AWAY_BAND, AWAY_BAND_TTL_MS, sid)
      i.toast(tr('Away is on. /vaken-away off when you are back.'), true)
      i.invalidate()
    } else if (ask.kind === 'off' && isAway) {
      await i.del(AWAY_KEY)
      awaySeen.clear()
      await ledger(i, sid, AWAY_OFF_WHAT, 'Steps are checked as before.', 'typed')
      await clearBand(i, 'away', sid)
      i.toast(tr('Away is off. Welcome back.'), true)
      i.invalidate()
    }
    return {
      text: awayText({
        away: parseAway(await i.get(AWAY_KEY)) !== undefined,
        policy: await policyOf(i),
        refused: logLines((await readLog(i, LEDGER_KEY)).filter(x => GUARDWORLD_WHATS.includes(x.what) && x.what === AWAY_DENY_WHAT), 3),
      }),
    }
  })
}
