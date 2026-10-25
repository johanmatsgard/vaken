// The Help page: plain words for a new user (compacting the chat first; the help of every block follows).
import { FEATURE_HELP, HELP_TOPICS } from '../../../core/registry'
import type { HelpTopicId } from '../../../core/registry'
import { BACK_LABEL } from '../../../core/cardsettings'
import { PANE_KEYS } from '../../../core/panekeys'
import { t, tr } from '../../../core/lang'
import { GUIDE_TITLE } from '../../../core/cardguide'
import { fromOf } from '../../../core/compactnudge'
import { fillIn } from '../../../core/fillin'
import { CARD_GAP, ViewHeader, Card, LinkButton, List, MoreRow, OpenLine, Row, vstep, wrappedLines } from '../../../ui/kit'
import type { Drawn, El } from '../../../ui/kit'
import { HELP_TOPIC_SHOW, LIST_COL_GAP, LIST_RIGHT_COL, LIST_ROW_GAP, LIST_ROW_H, ROW_PT, TRY_ROW_PT } from '../../../ui/tokens'
import { TRY_THESE, commandsIn, findHelp, findRows, findWordsOf, showsOldName } from '../../../core/findit'
import { flags } from '../state'
import type { Acts, Prefs } from '../prefs'

export const HELP_RETITLE: Record<string, string> = {
  'What the parking lot is': 'Saved ideas',
  'What steering does': 'Sending a message to another session',
}
const retitled = (e: { title: string; text: string }): { title: string; text: string } => (HELP_RETITLE[e.title] === undefined ? e : { ...e, title: HELP_RETITLE[e.title] as string })
export const PRIVACY_HELP = {
  title: 'What vaken keeps and sends',
  text: "Vaken keeps your settings, counts and notes in Claude Code's plugin store. Its own folder under ~/.claude holds copies of changed files for Undo, hand-over notes and page pictures. It keeps no text of your prompts or chats, except the decision log: on in Recommended, the default, it keeps short decisions you wrote, and Settings turns it off. By default Claude gets only its safety notes, and for a bigger job a short note at most once an hour with the working habits that are on (task list, done and next, clickable questions, chapters; each has a switch under Prompts), and plain mode asks it for short, simple words. More goes to Claude when you turn on a feature that talks to Claude (Plan first, Prompt review, Assumption review, or Notes to Claude set to All checks), or press a button that sends a message. There is no telemetry, and nothing goes to the makers of vaken. gh talks to GitHub if you signed in, npm asks the npm registry if a new package name is real, and page checks call only localhost unless you type another address. Delete everything, at the bottom of Settings, removes what it stored.",
}

export const REMOVE_HELP = {
  title: 'Removing vaken',
  text: "Do the steps in this order. 1. Press Delete everything vaken stored (Settings, the Your data card at the bottom). Do it first: the button goes with the plugin. 2. The first press only shows what would go. The second press deletes it, and it cannot be undone. It removes your saved choices and notes, and the folder ~/.claude/cockpit with the copies of changed files that Undo uses. A paused session stays paused. 3. Remove the plugin: run claude plugin uninstall vaken@vaken in a terminal, then start a new session. 4. Files vaken wrote inside your projects stay, and you can delete them yourself: .claude/cockpit-packet.md (the note for the next session), .claude/cockpit-tasks.md, .claude/cockpit-eyes/, .claude/cockpit-decisions*.md and .claude/cockpit-audit*.md (with their numbered copies, such as cockpit-audit-2.md). Your CLAUDE.md and settings.json were never changed.",
}

export const HELP: { title: string; text: string }[] = [
  { title: 'Why it costs usage', text: 'Claude re-reads the whole session on every answer. The longer the session, the more usage each answer takes.' },
  { title: 'What compacting does', text: 'Claude writes a short summary of the session and keeps that instead of the long session. Your files do not change. Only the session history gets shorter.' },
  { title: 'What it keeps', text: 'Your goal, the files changed, the decisions and why, and the next steps.' },
  { title: 'What may be lost', text: 'Small details from early in the session. If Claude needs one, ask it to read the file again.' },
  { title: 'When the card suggests it', text: 'At a quiet moment, once the session fills {from}% of its window (Settings, Compacting, Compact when it fills), when the saving is bigger than the cost of the summary. The cost is an estimate.' },
  { title: 'Your choice', text: 'Settings, Compacting: Off hides the advice, Suggest shows it with a button, Watch only notes the moments it would compact, Auto compacts the session by itself when the work is at rest.' },
  { title: 'What is the cache?', text: 'Claude keeps a saved copy of your session for about an hour on a subscription plan, and 5 minutes when you pay with usage credits. While the copy is fresh, each answer costs much less. After a long quiet break it goes stale, and the next answer costs full price.' },
  { title: 'Keeping the session cheap', text: 'Settings, Cache: On. The cache is the saved copy of your session (see What is the cache?). While you are away, it reads the saved copy just before it goes stale, up to 3 times. Your next answer then stays cheap. Each read costs a little usage. It shows under Autopilot.' },
  { title: 'What the loop breaker does', text: 'Sometimes Claude tries the same step again and again, and it fails the same way each time. After 3 failures in a row, vaken tells Claude to stop and ask you, and a check that fails 3 times with the same error offers a way out in Needs you. Settings > Safety > Loop breaker: Warn only tells Claude, Stop also blocks the next try until you write, and Off turns all of this off.' },
  PRIVACY_HELP,
  REMOVE_HELP,
  ...FEATURE_HELP.map(retitled),
]

const TOPIC_ORDER: HelpTopicId[] = ['usage', 'work', 'safety', 'memory', 'team', 'prompts', 'care', 'pane']
export const HELP_BY_TOPIC: { topic: HelpTopicId; entries: { title: string; text: string }[] }[] = TOPIC_ORDER.map(topic => ({
  topic,
  entries: [...(topic === 'usage' ? HELP.slice(0, 8) : topic === 'safety' ? HELP.slice(8, 11) : []), ...HELP_TOPICS.filter(g => g.topic === topic).flatMap(g => g.entries.map(retitled))],
}))

export const helpFill = (text: string, values?: Record<string, string>): string => fillIn(text, { from: fromOf(values?.['compact.from']) })

// A text with numbered steps ("1. ... 2. ...") reads as one line per step; a text written in lines (the keys) as one line per line
export const helpSteps = (text: string): string[] => (text.includes('\n') ? text.split('\n') : / 1\. /.test(text) && / 2\. /.test(text) ? text.split(/ (?=[1-9]\. )/) : [text])

type Placed = { topic: HelpTopicId; item: { title: string; text: string }; key: string }
// Every entry with its key, numbered in page order, so an entry keeps its key while the search filters the page
const PLACED: Placed[] = (() => {
  let n = 0
  return HELP_BY_TOPIC.flatMap(g => g.entries.map(item => ({ topic: g.topic, item, key: `help:${n++}` })))
})()
export const TRY_KEY = 'help:try'
const capital = (s: string): string => (s === '' ? s : `${s.charAt(0).toUpperCase()}${s.slice(1)}`)
// A topic card's title: the topic's own short name
const topicTitle = (topic: HelpTopicId): string => t(`common.help_topic_${topic}`)

// `flow`: a wide pane lays the topic cards in its columns (as the main page and Settings do), the title and the find line stay one column wide
export function HelpView(el: El, own: Prefs, act: Acts, innerPt: number, flow?: { n: number; cells: number; gapCells: number }) {
  const { Box, Text, Input } = el
  const query = flags.helpFind
  const finding = Input !== undefined && findWordsOf(query).length > 0
  // A command the person should type is a whole row: a press copies it
  const copyRow = (key: string, label: Drawn, line: string, heightPt: number) =>
    Row(el, key, label, { value: t('find.copy'), minPt: heightPt, name: line, press: { onPress: () => act.copy?.(line), widthPt: innerPt, heightPt } })
  const entry = ({ item, key }: Placed) => {
    const isOpen = own.open === key
    const toggle = () => {
      act.open(isOpen ? undefined : key)
      if (!isOpen && showsOldName(item.text)) act.oldName?.(key)
    }
    // The question is never cut: it wraps on words
    return [
      OpenLine(el, `help-${key}`, <Text bold>{tr(item.title)}</Text>, isOpen, toggle, { widthPt: innerPt, tall: true, lines: wrappedLines(tr(item.title), innerPt) }),
      isOpen ? (
        <Box key={`help-${key}-text`} flexDirection="column">
          {helpSteps(helpFill(tr(item.text), own.values)).map((line, i) => (
            <Text key={`help-${key}-line-${i}`} dimColor>
              {line}
            </Text>
          ))}
          {flags.oldNameAt === key ? <Text key={`help-${key}-oldname`}>{t('find.old_name')}</Text> : null}
          {act.copy === undefined || commandsIn(item.text).length === 0 ? null : (
            <Box key={`help-${key}-copies`} flexDirection="column" marginTop={vstep(LIST_ROW_GAP)} rowGap={vstep(LIST_ROW_GAP)}>
              {commandsIn(item.text).map((line, i) => copyRow(`help-${key}-copy-${i}`, <Text wrap="truncate-end">{line}</Text>, line, LIST_ROW_H))}
            </Box>
          )}
        </Box>
      ) : null,
    ]
  }
  // The plain line under a command wraps on words, never cut: the row grows a text row for each extra line
  const tryRow = (x: (typeof TRY_THESE)[number]) => {
    const about = capital(tr(x.about))
    const extra = wrappedLines(about, innerPt - LIST_RIGHT_COL - LIST_COL_GAP) - 1
    return copyRow(
      `help-try-${x.name}`,
      <Box flexDirection="column">
        <Text wrap="truncate-end">{x.command}</Text>
        <Text dimColor>{about}</Text>
      </Box>,
      x.command,
      TRY_ROW_PT + extra * ROW_PT,
    )
  }
  // The first HELP_TOPIC_SHOW rows, then "Show N more" (the fold of every list)
  const folded = <T,>(id: string, list: readonly T[], rowOf: (x: T) => Drawn | Drawn[]) => {
    const foldKey = `fold:help-${id}`
    const isOpen = own.openSections.includes(foldKey)
    const shown = isOpen ? list : list.slice(0, HELP_TOPIC_SHOW)
    return [
      List(el, shown.flatMap(rowOf)),
      list.length <= HELP_TOPIC_SHOW ? null : MoreRow(el, `help-more-${id}`, isOpen ? 'Show fewer' : `Show ${list.length - HELP_TOPIC_SHOW} more`, isOpen, () => act.toggleSection(foldKey)),
    ]
  }
  const guideRow = Row(el, 'help-guide', <Text>{tr(GUIDE_TITLE)}</Text>, { chevron: { dir: 'right', onToggle: () => act.openGuide(true) }, press: { onPress: () => act.openGuide(true), widthPt: innerPt, heightPt: LIST_ROW_H }, minPt: LIST_ROW_H })
  // One card per topic, its name as the title; the pane's card ends with the card guide
  const topicCard = (topic: HelpTopicId, placed: Placed[], fold: boolean) =>
    Card(el, `help-topic-${topic}`, topicTitle(topic), '', fold ? folded(topic, placed, entry) : List(el, placed.flatMap(entry)), { bodyRowGap: LIST_ROW_GAP })
  const tryCard = (rows: readonly (typeof TRY_THESE)[number][], fold: boolean) =>
    Card(el, 'help-try', t('find.try_these'), '', [<Text key="help-try-note" dimColor>{t('find.try_these_note')}</Text>, ...(fold ? folded('try', rows, tryRow) : [List(el, rows.map(tryRow))])], { bodyRowGap: LIST_ROW_GAP })
  const found = finding ? findHelp(PLACED.map(p => ({ ...p, title: p.item.title, text: p.item.text })), query, tr) : []
  const foundTry = finding ? findRows(TRY_THESE.map(x => ({ ...x, label: x.command, note: x.about })), query, tr) : []
  const cards = !finding
    ? [
        ...HELP_BY_TOPIC.map(g => {
          const placed = PLACED.filter(p => p.topic === g.topic)
          return g.topic === 'pane'
            ? Card(el, 'help-topic-pane', topicTitle('pane'), '', [...folded('pane', placed, entry), guideRow], { bodyRowGap: LIST_ROW_GAP })
            : topicCard(g.topic, placed, true)
        }),
        tryCard(TRY_THESE, true),
      ]
    : found.length === 0 && foundTry.length === 0
      ? [
          <Text key="help-found-none" dimColor>
            {t('find.no_help_matches', { words: query.trim() })}
          </Text>,
        ]
      : [
          // The hits keep their topic's card, in page order
          ...HELP_BY_TOPIC.map(g => found.filter(p => p.topic === g.topic)).filter(hits => hits.length > 0).map(hits => topicCard((hits[0] as Placed).topic, hits, false)),
          foundTry.length === 0 ? null : tryCard(foundTry, false),
        ]
  // The title and the find line: the pane's width, or one column of a wide pane
  const head = (headCells?: number) => (
    <Box key="help-top" flexDirection="column" rowGap={vstep(CARD_GAP)} {...(headCells === undefined ? {} : { width: headCells, flexShrink: 0 })}>
      {ViewHeader(el, 'help-head', { key: 'help-done', label: tr(BACK_LABEL), onPress: () => act.openHelp(false) }, t('common.help'), { right: LinkButton(el, 'help-settings', t('common.open_settings_jump'), () => act.openSettings(true), { on: 'ground', hotkey: PANE_KEYS.settings }) })}
      {Input === undefined ? null : <Input key="help-find" placeholder={t('find.find_in_help')} value={query} submitLabel={t('find.find')} onInput={v => act.find?.('help', v)} onSubmit={v => act.find?.('help', v, true)} />}
    </Box>
  )
  const page = (body: Drawn[], headCells?: number) => (
    // As wide as the pane's body, so the title row's ends are the frame's at every width (W).
    <Box flexDirection="column" width="100%" alignItems="stretch" rowGap={vstep(CARD_GAP)}>
      {head(headCells)}
      {body}
    </Box>
  )
  if (flow === undefined || flow.n <= 1) return page(cards)
  // The cards in page order, left to right, a row of columns at a time
  const shown = cards.filter(c => c !== null)
  const colsOf = Array.from({ length: flow.n }, (_, i) => shown.filter((_c, n) => n % flow.n === i))
  return page(
    [
      <Box key="help-columns" flexDirection="row" columnGap={flow.gapCells} alignItems="flex-start">
        {colsOf.map((group, n) => (
          <Box key={`help-col-${n}`} width={flow.cells} flexGrow={0} flexShrink={0} flexDirection="column" rowGap={vstep(CARD_GAP)}>
            {group}
          </Box>
        ))}
      </Box>,
    ],
    flow.cells,
  )
}
