// Tell me: one Mac notification while you are away from the app, and the status line under the prompt box.
import type { EngineInterface, On } from 'claude-code'

import { isQuiet } from '../core/attention'
import { FOCUS_KEY, isFocused, parseFocus } from '../core/focus'
import { withToastGate } from '../core/io'
import { homeFrom } from '../core/platform'
import type { Io } from '../core/io'
import { readSetting } from '../core/settings'
import { bindPlatform, platformOfIo } from '../core/procs'
import { LONG_ANSWER_MS, PERSON_KEY, PERSON_SAVE_MS, TELL_RUN_MS, TELL_TITLE, isAwayAt, isMacHome, latestAt, mayTell, notifyArgv, statusMem, statusNext, statusText, tellBus, tellStep, tellText, waysOf, winSoundArgv } from '../core/tellme'
import type { HowWay, TellGate, TellItem, TellKind } from '../core/tellme'

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

// A limit warning repeats while it holds, so it is told once an hour at most.
const AGAIN_MS: Partial<Record<TellKind, number>> = { limit: 60 * 60_000 }

let gate: TellGate = { held: [] }
let personAt: number | undefined
let personSavedAt: number | undefined
let waiting = false
const toldAt = new Map<TellKind, number>()

async function seen($: EngineInterface): Promise<void> {
  const now = await $.clock.now()
  personAt = now
  // Shared with the other sessions, so a press in one counts for all; written at most once in PERSON_SAVE_MS.
  if (personSavedAt === undefined || now - personSavedAt >= PERSON_SAVE_MS) {
    personSavedAt = now
    await $.store.set(PERSON_KEY, now)
  }
}

async function deliver($: EngineInterface, items: TellItem[]): Promise<void> {
  const i = bindPlatform(io($), () => $.env.get('OS'))
  const text = tellText(items)
  const how = await readSetting(i, 'notify.how')
  const mac = isMacHome(await i.home())
  const ways = waysOf(how, mac, (await platformOfIo(i)) === 'win32')
  // The Windows sound plays beside the banner: one failing never stops the other.
  const sound = ways.includes('winsound') ? playWinSound($) : undefined
  await banner($, text, how, ways.filter(w => w !== 'winsound'))
  await sound
}

async function playWinSound($: EngineInterface): Promise<void> {
  try {
    await $.process.run(winSoundArgv(), { timeoutMs: TELL_RUN_MS })
  } catch {
  }
}

async function banner($: EngineInterface, text: string, how: string, ways: readonly HowWay[]): Promise<void> {
  for (const way of ways) {
    try {
      if (way === 'speak') {
        await $.audio.speak(text)
        return
      }
      if (way === 'notify') {
        const r = await $.ui.notify(text, { title: TELL_TITLE })
        if (r.isSent) return
        continue
      }
      const r = await $.process.run(notifyArgv(text, how === 'sound'), { timeoutMs: TELL_RUN_MS })
      if (r.exitCode === 0) return
    } catch {
    }
  }
}

async function offer($: EngineInterface, item: TellItem | undefined): Promise<void> {
  const now = await $.clock.now()
  const step = tellStep(gate, item, now)
  gate = step.gate
  if (step.send !== undefined) await deliver($, step.send)
  else if (step.waitMs !== undefined && !waiting) {
    waiting = true
    $.clock.after(step.waitMs, () => {
      waiting = false
      void offer($, undefined).catch(() => undefined)
    })
  }
}

async function push($: EngineInterface, item: TellItem): Promise<void> {
  const now = await $.clock.now()
  // The memory answers first, so a person at the keys costs no read.
  if (!isAwayAt(personAt, now)) return
  const again = AGAIN_MS[item.kind]
  const last = toldAt.get(item.kind)
  if (again !== undefined && last !== undefined && now - last < again) return
  const i = io($)
  const away = isAwayAt(latestAt(personAt, await i.get(PERSON_KEY)), now)
  const facts = { mode: await readSetting(i, 'notify.mode'), quiet: isQuiet(await readSetting(i, 'notify.quiet'), new Date(now).getHours()), focused: isFocused(parseFocus(await i.get(FOCUS_KEY)), now), away }
  if (!mayTell(item.kind, facts)) return
  toldAt.set(item.kind, now)
  await offer($, item)
}

function applyStatus($: EngineInterface): void {
  const line = statusNext(statusMem.on, statusText(statusMem.facts), statusMem.shown)
  if (line === null) return
  statusMem.shown = line
  $.ui.status(line)
}

export function registerTellMe(on: On): void {
  on('session.start', { cwd: /(?<tellme>)/ }, async ($, e, next) => {
    try {
      const startAt = await $.clock.now()
      personAt = startAt
      tellBus.push = item => void push($, item).catch(() => undefined)
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('prompt.submit', { text: /(?<tellme>)/ }, async ($, e, next) => {
    try {
      await seen($)
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('ui.press', { element: /(?<tellme>)/ }, async ($, e, next) => {
    try {
      await seen($)
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('turn.complete', { turnId: /(?<tellme>)/ }, async ($, e, next) => {
    try {
      if (e.agentId === undefined) {
        if (!e.isAborted && e.durationMs >= LONG_ANSWER_MS) tellBus.push?.({ kind: 'done' })
        applyStatus($)
      }
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))
}
