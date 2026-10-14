// Hello on the phone: when a phone joins the session, one short notice goes into the chat that the person reads and Claude never does (a `system` row).
import type { EngineInterface, On } from 'claude-code'

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
import { PHONE_ASKED_KEY, PHONE_ASK_LINE, PHONE_MODE_KEY, PHONE_SECTION_ID, PHONE_SECTION_TEXT, modeOf, phoneAskDue, phoneSectionOn } from '../core/phonecmds'
import { LEDGER_KEY, readLog } from './compaction'
import { inboxFrom } from './inbox'
import { flags, langOf } from './home/state'
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
  const lang = langOf(await readSetting(i, 'look.language'), flags.macLang)
  if (lang === 'en') return s => sysWord(s)
  const ix = byEnglish(lang)
  return s => ix[sysWord(s)] ?? sysWord(s)
}

// Exported so that a test can run it with a small Io.
export async function phoneHello(i: Io, say: (text: string) => Promise<boolean>): Promise<boolean> {
  if ((await readSetting(i, 'phone.hello')) === 'off') return false
  const now = await i.now()
  if (!helloDue(lastHelloAt, now)) return false
  const t = await sayOf(i)
  const lines = helloLines(await phoneFacts(i), t)
  // Asked once ever: the guard is off and the person was never asked.
  const ask = askDue(await readSetting(i, 'awake.mode'), await i.get(AWAKE_ASKED_KEY))
  if (ask) lines.push(t(ASK_LINE))
  // Phone mode asks once ever: one more line, never together with the awake question.
  const askPhone = !ask && phoneAskDue(await readSetting(i, PHONE_MODE_KEY), await i.get(PHONE_ASKED_KEY))
  if (askPhone) lines.splice(PHONE_MAX_LINES - 1, lines.length, t(PHONE_ASK_LINE))
  if (lines.length === 0) return false
  if (!(await say(lines.join('\n')))) return false
  if (ask) await i.set(AWAKE_ASKED_KEY, now)
  if (askPhone) await i.set(PHONE_ASKED_KEY, now)
  lastHelloAt = now
  return true
}

export const forgetHello = (): void => {
  lastHelloAt = undefined
}

// The phones attached to this session now (client id to join time)
const attached = new Map<string, number>()
export const forgetPhones = (): void => attached.clear()

export function registerPhone(on: On): void {
  on('prompt.compose', { model: /(?<phonemode>)/ }, async ($, e, next) => {
    const result = await next(e)
    try {
      if (attached.size > 0 && !result.sections.some(s => s.id === PHONE_SECTION_ID) && phoneSectionOn(modeOf(await readSetting(io($), PHONE_MODE_KEY)), attached.values(), await $.clock.now())) {
        return { ...result, sections: [...result.sections, { id: PHONE_SECTION_ID, text: PHONE_SECTION_TEXT, scope: 'session' as const }] }
      }
    } catch {
    }
    return result
  }).catch(($, e, next) => next(e))

  on('session.attach', { surface: 'mobile' }, async ($, e, next) => {
    const r = await next(e)
    try {
      attached.set(e.clientId, await $.clock.now())
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
