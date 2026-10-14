// /vaken-explain: the reason behind each line of the Autopilot card.
import type { EngineInterface, On } from 'claude-code'

import { AUDIT_KEY, parseAudit } from '../core/insight'
import { withToastGate } from '../core/io'
import { homeFrom } from '../core/platform'
import { shownTitle } from '../core/ledger'
import type { Io } from '../core/io'
import { EXPLAIN_TITLES, LINES_MAX, closestTitles, explainLines, matchTitles, recentKinds, titleFor } from '../core/explain'
import { LEDGER_KEY, readLog } from './compaction'
import { findSetting, settingPath } from '../core/settings'
import { SESSIONS_SETTING, TOPICS, TOPIC_NAMES, topicOf, topicWhatIs, whatIsLines } from '../core/whatis'
import { timesWord } from '../core/words'
import { isFolded } from '../core/menu'
import { tEn } from '../i18n/t'

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

type DidRow = { at: number; what: string; detail?: string }

export async function didRows(i: Io): Promise<DidRow[]> {
  const audit = parseAudit(await i.get(AUDIT_KEY))
  const seen = new Set(audit.map(r => `${r.at}|${r.what}`))
  const out: DidRow[] = audit.map(r => ({ at: r.at, what: r.what, ...(r.detail === undefined ? {} : { detail: r.detail }) }))
  for (const e of await readLog(i, LEDGER_KEY)) if (e.did === true && !seen.has(`${e.at}|${e.what}`)) out.push({ at: e.at, what: e.what, ...(e.detail === undefined ? {} : { detail: e.detail }) })
  return out
}

const shown = (text: string): string => (text.length > 40 ? `${text.slice(0, 39)}…` : text)

// Reads only; never throws on odd words.
export async function explainText(i: Io, args: string): Promise<string> {
  const now = await i.now()
  const rows = await didRows(i)
  const words = args.trim()
  const titleOf = (what: string): string => titleFor(what) ?? what
  const lastAt = (title: string): number => rows.reduce((at, r) => (titleOf(r.what) === title ? Math.max(at, r.at) : at), 0)

  const topic = topicOf(words)
  if (topic !== undefined) {
    const key = TOPICS[topic].setting
    const s = key === undefined || key === SESSIONS_SETTING ? undefined : findSetting(key)
    const change = key === SESSIONS_SETTING ? 'Change it: Settings > Cards and look. The Sessions list there pins or hides a session.' : s === undefined ? undefined : `Change it: ${settingPath(s)}, or /vaken-settings ${s.key} <value>.`
    return [TOPICS[topic].title, ...whatIsLines(topicWhatIs(topic)), ...(change === undefined ? [] : [change])].join('\n')
  }

  if (words === '') {
    const kinds = recentKinds(rows, now, 10)
    const parts = `Parts of the pane: ${TOPIC_NAMES.join(', ')}.`
    if (kinds.length === 0) return ['Vaken did nothing today that it wrote down.', 'Say /vaken-explain <words> to read about any line, for example /vaken-explain without proof.', parts].join('\n')
    return [`Today vaken did ${tEn('words.different_thing', { n: kinds.length })}:`, ...kinds.map(k => `  ${shownTitle(titleOf(k.what))} (${timesWord(k.n)} today)`), 'Say /vaken-explain <words> for the reason.', parts].join('\n')
  }

  const known = [...new Set([...EXPLAIN_TITLES, ...rows.map(r => titleOf(r.what))])]
  const exact = titleFor(words)
  const matches = exact !== undefined ? [exact] : matchTitles(words, known, lastAt)
  if (matches.length === 0) {
    return [`Nothing matches "${shown(words)}".`, 'The closest lines:', ...closestTitles(words, known, 5, lastAt).map(t => `  ${t}`), 'Say /vaken-explain alone to see what vaken did today.'].join('\n')
  }
  const best = matches[0] as string
  const lines = explainLines(
    best,
    rows.filter(r => titleOf(r.what) === best),
    now,
  )
  if (matches.length > 1 && lines.length < LINES_MAX) {
    const more = matches.slice(1, 3)
    lines.push(`Also matches: ${more.join('; ')}${matches.length > 3 ? ` and ${matches.length - 3} more` : ''}.`)
  }
  return lines.slice(0, LINES_MAX).join('\n')
}

export function registerExplain(on: On): void {
  on('session.start', { cwd: /(?<explain>)/ }, async ($, e, next) => {
    try {
      await $.command.register({ name: 'vaken-explain', description: 'What a line of vaken means and why it shows: a part (guard, limits) or words of an Autopilot line. A word after it runs a part: error, happened, assumptions, planfirst, fresh, promptcheck.', argumentHint: 'error | happened | assumptions | planfirst | fresh | promptcheck | [part or words]', immediate: true })
    } catch {
      // the command is optional: a failure shows less, never breaks the session
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'vaken-explain' }, async ($, e, next) => {
    if (isFolded(e.command, e.args)) return next(e)
    try {
      return { text: await explainText(io($), e.args) }
    } catch {
      return { text: 'Vaken could not read what it wrote down. Try again in a moment.' }
    }
  })
}
