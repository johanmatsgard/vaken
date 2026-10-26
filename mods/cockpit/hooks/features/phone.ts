// Hello on the phone: when a phone joins the session, one short notice goes into the chat that the person reads and Claude never does (a `system` row).
// A phone joins by the engine's attach, or by a prompt or command that came through the Remote Control bridge; a prompt typed at the Mac ends that.
import type { EngineInterface, FsStat, On, PromptSubmitInput, PromptSubmitResult } from 'claude-code'

import { parseStoredUsage, APP_USAGE_KEY } from '../core/appusage'
import { parseStoredSessions, APP_SESSIONS_KEY } from '../core/appsessions'
import { heldCount } from '../core/inbox'
import { withToastGate } from '../core/io'
import { homeFrom } from '../core/platform'
import type { Io } from '../core/io'
import { alivePids, listRecords } from '../core/record'
import { readSetting } from '../core/settings'
import { ASK_LINE, AWAKE_ASKED_KEY, AWAKE_PHONE_KEY, askDue, phonesJoined, phonesLeft } from '../core/awakeplan'
import { PHONE_MAX_LINES, helloDue, helloLines } from '../core/phone'
import type { PhoneFacts, Say } from '../core/phone'
import { PHONE_ASKED_KEY, PHONE_ASK_LINE, PHONE_MODE_KEY, PHONE_MODE_MAX_MS, PHONE_SECTION_ID, PHONE_SECTION_TEXT, modeOf, phoneAskDue, phoneModeLine, phoneSectionOn } from '../core/phonecmds'
import { ASK_FAILED, MENU, PHONE_NOTE_KEY, PHONE_NOTE_SECTION_ID, PHONE_NOTE_TEXT, PHONE_TIP_LINE, RUN_ASKED, RUN_EMPTY, SHOW_ASKED, SHOW_MISSING, SUBMIT_AFTER_MS, checkLanded, checkShow, menuLines, menuOpen, menuPick, menuText, phoneNoteOn, runPrompt, showPrompt, showWhy, vakenWords } from '../core/phonenote'
import type { MenuLine } from '../core/phonenote'
import { OWN_KEY, livePicks, nextMem, ownAction, parseOwn } from '../core/actions'
import { brokeOff, welcomeActions } from '../core/welcome'
import { NIGHT_FIX_ROW, nightFixPrompt, nightHeadLine, nightLead, nightMem, nightShowPrompt } from '../core/night'
import { HISTORY_KEY, REPORT_KEY, parseReports } from '../core/overnight'
import { BACK_AWAY_MS } from '../core/backcard'
import { quickAnswer } from './nextsteps'
import { subArgs } from '../core/menu'
import { BY_PERSON_ONLY, byPerson, originKind } from '../core/origin'
import { LEDGER_KEY, readLog } from './compaction'
import { inboxFrom } from './inbox'
import { langFor } from './saylang'
import { mdList } from '../core/chatmd'
import { sysWord } from '../core/syswords'
import { byEnglish } from '../i18n/table'
import { buildView, limitBlocks } from './home/logic'
import type { Row } from './home/logic'

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

let lastHelloAt: number | undefined

export async function phoneFacts(i: Io): Promise<PhoneFacts> {
  return (await phoneRead(i)).facts
}

export async function phoneRead(i: Io): Promise<{ facts: PhoneFacts }> {
  const now = await i.now()
  const sid = await i.sessionId()
  // A join is rare, so the records are read fresh, not as the band's light copy (which may be two minutes old).
  const records = await listRecords(i)
  const alive = await alivePids(i, records)
  const view = buildView(records, now, sid, alive, parseStoredUsage(await i.get(APP_USAGE_KEY)), undefined, parseStoredSessions(await i.get(APP_SESSIONS_KEY)))
  const rows = [view.here, ...view.needs, ...view.working, ...view.waiting, ...view.idle].filter((r): r is Row => r !== undefined)
  const items = await inboxFrom(i, { now, sid, rows, ledger: await readLog(i, LEDGER_KEY) }, false)
  const needs = items.filter(x => !x.here && (x.kind === 'question' || x.kind === 'permission')).map(x => ({ name: x.name, kind: x.kind as 'question' | 'permission' }))
  const lead = limitBlocks(view)[0]
  const plan = lead === undefined ? undefined : { name: lead.short, percent: lead.percent, withDay: lead.withDay, ...(lead.resetsAt === undefined ? {} : { resetsAt: lead.resetsAt }) }
  const usd = rows.reduce((n, r) => n + (r.rec.costUsd ?? 0), 0)
  const holds = items.filter(x => x.kind === 'hold' && !x.allowed).map(x => ({ name: x.name, here: x.here }))
  const facts: PhoneFacts = { needs, held: heldCount(items), finished: view.waiting.length, ...(holds.length > 0 ? { holds } : {}), ...(usd > 0 ? { usd } : {}), ...(plan === undefined ? {} : { plan }) }
  return { facts }
}

export async function sayOf(i: Io): Promise<Say> {
  const lang = await langFor(i)
  if (lang === 'en') return s => sysWord(s)
  const ix = byEnglish(lang)
  return s => ix[sysWord(s)] ?? sysWord(s)
}

// Exported so that a test can run it with a small Io. `always`: a phone that came by the bridge hears the phone words even when nothing waits.
export async function phoneHello(i: Io, say: (text: string) => Promise<boolean>, always = false): Promise<boolean> {
  if ((await readSetting(i, 'phone.hello')) === 'off') return false
  const now = await i.now()
  if (!helloDue(lastHelloAt, now)) return false
  const t = await sayOf(i)
  const lines = helloLines(await phoneFacts(i), t, await langFor(i))
  // Asked once ever: the guard is off and the person was never asked.
  const ask = askDue(await readSetting(i, 'awake.mode'), await i.get(AWAKE_ASKED_KEY))
  // Phone mode asks once ever: one more line, never together with the awake question.
  const askPhone = !ask && phoneAskDue(await readSetting(i, PHONE_MODE_KEY), await i.get(PHONE_ASKED_KEY))
  if (lines.length === 0 && !ask && !askPhone && !always) return false
  // The phone words ride on a hello that is said anyway; the questions stay last and the facts give way to keep the cap.
  const tail = [t(PHONE_TIP_LINE), ...(ask ? [t(ASK_LINE)] : []), ...(askPhone ? [t(PHONE_ASK_LINE)] : [])]
  lines.splice(Math.max(0, PHONE_MAX_LINES - tail.length), lines.length, ...tail)
  if (!(await say(mdList(lines)))) return false
  if (ask) await i.set(AWAKE_ASKED_KEY, now)
  if (askPhone) await i.set(PHONE_ASKED_KEY, now)
  lastHelloAt = now
  return true
}

export const forgetHello = (): void => {
  lastHelloAt = undefined
}

// The phones attached to this session now (client id to join time). The bridge is one entry, its time the last prompt that came through it.
const attached = new Map<string, number>()
const BRIDGE = 'bridge'
// When the number menu was shown; a digit from the phone picks a line until then plus MENU_WINDOW_MS.
let menuAt: number | undefined
// The lines of the menu last shown, so a digit picks what the person read.
let menuShown: ReadonlyArray<MenuLine> = MENU
// When the bridge's join was last written for the awake guard.
let awakeAt: number | undefined
const AWAKE_REFRESH_MS = 10 * 60_000
// A phone stint started and its hello is not said yet.
let helloPending = false
// The origin kinds seen, for a look after a live test: kind to last time.
let lastKind: string | undefined
export const ORIGINS_KEY = 'cockpit:phone:origins'

export const forgetPhones = (): void => {
  attached.clear()
  menuAt = undefined
  menuShown = MENU
  awakeAt = undefined
  helloPending = false
  lastKind = undefined
}

// A prompt or command came through the bridge: the person is on the phone.
async function bridgeSeen($: EngineInterface): Promise<number> {
  const now = await $.clock.now()
  const was = attached.get(BRIDGE)
  const fresh = was === undefined || now < was || now - was >= PHONE_MODE_MAX_MS
  attached.set(BRIDGE, now)
  if (fresh) helloPending = true
  if (fresh || awakeAt === undefined || now - awakeAt >= AWAKE_REFRESH_MS) {
    try {
      const i = io($)
      await i.set(AWAKE_PHONE_KEY, phonesJoined(await i.get(AWAKE_PHONE_KEY), await i.sessionId(), BRIDGE, now))
      awakeAt = now
    } catch {
      // the guard misses this join; the note still comes
    }
  }
  return now
}

// A prompt typed at the Mac: the person is back, so the bridge's stint and the menu end.
async function composerSeen($: EngineInterface): Promise<void> {
  menuAt = undefined
  helloPending = false
  if (!attached.has(BRIDGE)) return
  attached.delete(BRIDGE)
  awakeAt = undefined
  try {
    const i = io($)
    await i.set(AWAKE_PHONE_KEY, phonesLeft(await i.get(AWAKE_PHONE_KEY), await i.sessionId(), BRIDGE))
  } catch {
  }
}

// Written only when the kind differs from the last one, so a run of prompts from one place writes nothing.
async function noteKind($: EngineInterface, kind: string | undefined): Promise<void> {
  if (kind === lastKind) return
  lastKind = kind
  try {
    const i = io($)
    const raw = await i.get(ORIGINS_KEY)
    const seen = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {}
    await i.set(ORIGINS_KEY, { ...seen, [kind ?? 'none']: await i.now() })
  } catch {
  }
}

async function sayHello($: EngineInterface): Promise<void> {
  if (!helloPending) return
  helloPending = false
  try {
    await phoneHello(
      io($),
      async text => {
        const done = await $.session.append({ message: { type: 'system', content: [{ type: 'text', text }] } })
        return done.deny === undefined
      },
      true,
    )
  } catch {
  }
}

// A reply that is not a prompt: a row the person reads, and the prompt does not go to Claude (the reason of the drop says it again where the app shows it).
async function answer($: EngineInterface, text: string): Promise<PromptSubmitResult> {
  try {
    await $.session.append({ message: { type: 'system', content: [{ type: 'text', text }] } })
  } catch {
  }
  return { drop: text }
}

// The short glance the hello gives, asked for: what waits, or that nothing does, and Phone mode, which matters only here.
async function glanceText($: EngineInterface): Promise<string> {
  const i = io($)
  const t = await sayOf(i)
  const lines = helloLines(await phoneFacts(i), t, await langFor(i))
  return mdList([...(lines.length > 0 ? lines : [t('Nothing needs you.')]), phoneModeLine(modeOf(await readSetting(i, PHONE_MODE_KEY)), t)])
}

type Next = (e: PromptSubmitInput) => Promise<PromptSubmitResult>

// A night run that ended while the person was away leads the menu: its result, and Fix it when tasks failed.
async function nightActions(i: Io, now: number, t: Say): Promise<{ id: string; label: string; prompt: string }[]> {
  const id = await i.get(REPORT_KEY)
  const report = typeof id === 'string' ? parseReports(await i.get(HISTORY_KEY)).find(r => r.id === id) : undefined
  const lead = nightLead(report, now, nightMem.lastPrompt, BACK_AWAY_MS)
  if (lead === undefined) return []
  return [{ id: 'night', label: nightHeadLine(lead, t), prompt: nightShowPrompt(lead) }, ...(lead.failedTasks.length === 0 ? [] : [{ id: 'nightfix', label: NIGHT_FIX_ROW, prompt: nightFixPrompt(lead) }])]
}

// After a break the Where was I card's presses lead, then the picked next steps and the person's own actions; the store is read only when the menu is asked for.
async function menuNow($: EngineInterface): Promise<string> {
  const i = io($)
  const now = await i.now()
  const back = brokeOff(nextMem.endedAt, now, nextMem.busy) && (await readSetting(i, 'recap.mode')) !== 'off' && nextMem.end !== undefined
    ? welcomeActions({ end: nextMem.end, edits: nextMem.facts.edits })
    : []
  const t = await sayOf(i)
  menuShown = menuLines([...(await nightActions(i, now, t)), ...back, ...livePicks(now), ...parseOwn(await i.get(OWN_KEY)).map(ownAction)])
  return menuText(t, menuShown)
}

// `/vaken`, `/vaken show` and `/vaken run` that came as prompt text; `/vaken pic` is answered in features/eyes.ts.
async function wordsAsText($: EngineInterface, e: PromptSubmitInput, proceed: Next, fromPhone: boolean): Promise<PromptSubmitResult | undefined> {
  const words = vakenWords(e.text)
  if (words === undefined || words.kind === 'pic') return undefined
  if (words.kind === 'menu') {
    if (!fromPhone) return undefined
    const now = await $.clock.now()
    menuAt = now
    return answer($, await menuNow($))
  }
  if (words.kind === 'quick') {
    const i = io($)
    const quick = await quickAnswer(i, words.rest, await sayOf(i), true)
    return quick.prompt === undefined ? answer($, quick.said) : proceed({ ...e, text: quick.prompt })
  }
  const asked = words.kind === 'show' ? await showFor($, words.rest) : await runFor($, words.rest)
  if (asked.prompt === undefined) return answer($, asked.said)
  return proceed({ ...e, text: asked.prompt })
}

// A digit right after the menu: its fixed prompt, the picture word, or the glance.
async function pickAsText($: EngineInterface, e: PromptSubmitInput, proceed: Next, open: boolean): Promise<PromptSubmitResult | undefined> {
  if (!open) return undefined
  const pick = menuPick(e.text, menuShown)
  if (pick === undefined) return undefined
  if (pick.kind === 'prompt') return proceed({ ...e, text: pick.text })
  if (pick.kind === 'pic') return proceed({ ...e, text: '/vaken pic' })
  return answer($, await glanceText($))
}

export function registerPhone(on: On): void {
  // Where a prompt came from decides if the person is on the phone; the phone words and the menu's digits are answered here when they come as text.
  on('prompt.submit', { text: /(?<phone>)/ }, async ($, e, next) => {
    const kind = originKind(e.origin)
    await noteKind($, kind)
    if (kind === 'composer') {
      await composerSeen($)
      return (await wordsAsText($, e, next, false)) ?? next(e)
    }
    if (kind !== 'bridge') return next(e)
    const now = await bridgeSeen($)
    // Any prompt from the phone closes the menu: a digit after that is an answer to Claude.
    const open = menuOpen(menuAt, now)
    menuAt = undefined
    const out = (await wordsAsText($, e, next, true)) ?? (await pickAsText($, e, next, open)) ?? (await next(e))
    await sayHello($)
    return out
  }).catch(($, e, next) => next(e))

  // A delivery from the Remote Control bridge, before it becomes a prompt.
  on('session.receive', { origin: { kind: 'bridge' } }, async ($, e, next) => {
    try {
      await bridgeSeen($)
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  // `/vaken` alone, typed on the phone: the number menu (the pane does not show on a phone).
  on('command.run', { command: 'vaken' }, async ($, e, next) => {
    if (e.args.trim() !== '' || originKind(e.origin) !== 'bridge') return next(e)
    menuAt = await bridgeSeen($)
    const text = await menuNow($)
    await sayHello($)
    return { text }
  })

  on('prompt.compose', { model: /(?<phonemode>)/ }, async ($, e, next) => {
    const result = await next(e)
    try {
      const nowMs = await $.clock.now()
      if (attached.size > 0 && !result.sections.some(s => s.id === PHONE_SECTION_ID) && phoneSectionOn(modeOf(await readSetting(io($), PHONE_MODE_KEY)), attached.values(), nowMs)) {
        return { ...result, sections: [...result.sections, { id: PHONE_SECTION_ID, text: PHONE_SECTION_TEXT, scope: 'session' as const }] }
      }
    } catch {
    }
    return result
  }).catch(($, e, next) => next(e))

  // The phone note: what a phone cannot do, for Claude, while a phone is attached. Independent of Phone mode.
  on('prompt.compose', { model: /(?<phonenote>)/ }, async ($, e, next) => {
    const result = await next(e)
    try {
      if (attached.size === 0 || result.sections.some(s => s.id === PHONE_NOTE_SECTION_ID)) return result
      const nowMs = await $.clock.now()
      if (phoneNoteOn(await readSetting(io($), PHONE_NOTE_KEY), attached.values(), nowMs)) {
        return { ...result, sections: [...result.sections, { id: PHONE_NOTE_SECTION_ID, text: PHONE_NOTE_TEXT, scope: 'session' as const }] }
      }
    } catch {
    }
    return result
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'vaken' }, async ($, e, next) => {
    const rest = subArgs(e.args, 'show')
    if (rest === undefined) return next(e)
    if (originKind(e.origin) === 'bridge') await bridgeSeen($)
    return { text: await showWord($, rest, e.origin) }
  })

  on('command.run', { command: 'vaken' }, async ($, e, next) => {
    const rest = subArgs(e.args, 'run')
    if (rest === undefined) return next(e)
    if (originKind(e.origin) === 'bridge') await bridgeSeen($)
    return { text: await runWord($, rest, e.origin) }
  })

  on('session.attach', { surface: 'mobile' }, async ($, e, next) => {
    const r = await next(e)
    try {
      const nowMs = await $.clock.now()
      attached.set(e.clientId, nowMs)
    } catch {
    }
    try {
      // The awake guard keeps the join time (core/awakeplan.ts), a detach removes it
      const i = io($)
      await i.set(AWAKE_PHONE_KEY, phonesJoined(await i.get(AWAKE_PHONE_KEY), await i.sessionId(), e.clientId, await i.now()))
    } catch {
      // the guard misses this join; nothing else changes
    }
    try {
      await phoneHello(io($), async text => {
        const done = await $.session.append({ message: { type: 'system', content: [{ type: 'text', text }] } })
        return done.deny === undefined
      })
    } catch {
    }
    return r
  }).catch(($, e, next) => next(e))

  on('session.detach', { surface: 'mobile' }, async ($, e, next) => {
    try {
      attached.delete(e.clientId)
      const i = io($)
      await i.set(AWAKE_PHONE_KEY, phonesLeft(await i.get(AWAKE_PHONE_KEY), await i.sessionId(), e.clientId))
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))
}

// The project folder of this session, else its working folder.
async function rootOf($: EngineInterface): Promise<string> {
  const root = await $.session.root()
  if (root !== '') return root
  const cwd = await $.session.cwd()
  return cwd
}

// Never throws: undefined when nothing is there.
async function statOf($: EngineInterface, path: string): Promise<FsStat | undefined> {
  try {
    const st = await $.fs.stat(path, { resolve: true })
    return st
  } catch {
    return undefined
  }
}

// The prompt goes in as the person's own words: they typed the line. Claude's permission prompts and the guard still apply.
function submitter($: EngineInterface): (text: string) => Promise<PromptSubmitResult> {
  return text => $.prompt.submit({ text, asUser: true })
}

// A prompt cannot be submitted while the command's own hook holds the turn, so it goes a moment after; a refusal is said in a toast.
function submitSoon($: EngineInterface, text: string, failed: string): void {
  const send = submitter($)
  const i = io($)
  $.clock.after(SUBMIT_AFTER_MS, () => {
    send(text).then(
      r => {
        if ('drop' in r && r.drop !== undefined) i.toast(failed, true)
      },
      () => i.toast(failed, true),
    )
  })
}

type Asked = { said: string; prompt?: string }

// `/vaken show <file>`: a file inside the project, not a secret, that is there; Claude is asked to send it.
async function showFor($: EngineInterface, rest: string): Promise<Asked> {
  const i = io($)
  const t = await sayOf(i)
  const root = await rootOf($)
  const checked = checkShow(rest, root, await i.home())
  if (!checked.ok) return { said: t(showWhy(checked.why)) }
  const shown = rest.trim()
  const st = await statOf($, checked.path)
  if (st === undefined || st.kind !== 'file') return { said: t(SHOW_MISSING).replace('{path}', shown) }
  const rootSt = await statOf($, root)
  const landed = checkLanded(st.realPath ?? checked.path, rootSt?.realPath ?? root)
  if (!landed.ok) return { said: t(showWhy(landed.why)) }
  return { said: t(SHOW_ASKED).replace('{path}', shown), prompt: showPrompt(checked.path) }
}

// `/vaken run <command>`: Claude is asked to run it; vaken itself runs nothing.
async function runFor($: EngineInterface, rest: string): Promise<Asked> {
  const t = await sayOf(io($))
  const command = rest.trim()
  if (command === '') return { said: t(RUN_EMPTY) }
  return { said: t(RUN_ASKED), prompt: runPrompt(command) }
}

async function showWord($: EngineInterface, rest: string, origin: unknown): Promise<string> {
  if (!byPerson(origin)) return (await sayOf(io($)))(BY_PERSON_ONLY)
  const asked = await showFor($, rest)
  if (asked.prompt !== undefined) submitSoon($, asked.prompt, (await sayOf(io($)))(ASK_FAILED))
  return asked.said
}

async function runWord($: EngineInterface, rest: string, origin: unknown): Promise<string> {
  if (!byPerson(origin)) return (await sayOf(io($)))(BY_PERSON_ONLY)
  const asked = await runFor($, rest)
  if (asked.prompt !== undefined) submitSoon($, asked.prompt, (await sayOf(io($)))(ASK_FAILED))
  return asked.said
}
