// The Help page: plain words for a new user (compacting the chat first; the help of every block follows).
import { FEATURE_HELP, HELP_TOPICS } from '../../../core/registry'
import type { HelpTopicId } from '../../../core/registry'
import { BACK_LABEL } from '../../../core/cardsettings'
import { t, tr } from '../../../core/lang'
import { GUIDE_TITLE } from '../../../core/cardguide'
import { fromOf } from '../../../core/compactnudge'
import { fillIn } from '../../../core/fillin'
import { CARD_GAP, CARD_GAP_X, ViewHeader, Card, LinkButton, List, OpenLine, Row, vstep } from '../../../ui/kit'
import type { El } from '../../../ui/kit'
import { GROUP_GAP, LIST_COL_GAP, LIST_ROW_H, cols } from '../../../ui/tokens'
import type { Acts, Prefs } from '../prefs'

export const HELP_RETITLE: Record<string, string> = {
  'What the parking lot is': 'Saved ideas',
  'What steering does': 'Sending a message to another session',
}
const retitled = (e: { title: string; text: string }): { title: string; text: string } => (HELP_RETITLE[e.title] === undefined ? e : { ...e, title: HELP_RETITLE[e.title] as string })
export const PRIVACY_HELP = {
  title: 'What vaken keeps and sends',
  text: "Vaken keeps your settings, counts and notes in Claude Code's plugin store. Its own folder under ~/.claude holds copies of changed files for Undo, hand-over notes and page pictures. It keeps no text of your prompts or chats, except the decision log: on in Recommended, the default, it keeps short decisions you wrote, and Settings turns it off. By default Claude gets only its safety notes. More goes to Claude when you turn on a feature that talks to Claude (Plan first, Prompt review, Assumption review, or Notes to Claude set to All checks), or press a button that sends a message. There is no telemetry, and nothing goes to the makers of vaken. gh talks to GitHub if you signed in, npm asks the npm registry if a new package name is real, and page checks call only localhost unless you type another address. Delete everything, at the bottom of Settings, removes what it stored.",
}

export const REMOVE_HELP = {
  title: 'Removing vaken',
  text: "Do the steps in this order. 1. Press Delete everything vaken stored (Settings, Advanced, at the bottom). Do it first: once the plugin is gone, the button is gone too. The first press only shows what would go. The second deletes it, and it cannot be undone. It removes your saved choices and notes, and the folder ~/.claude/cockpit with the copies of changed files that Undo uses. It keeps a pause that is on. 2. Remove the plugin: run claude plugin uninstall vaken@vaken in a terminal, then start a new session. 3. Vaken may have written files inside your projects. They stay, and you can delete them yourself: .claude/cockpit-packet.md (the note for the next session), .claude/cockpit-tasks.md, .claude/cockpit-eyes/, .claude/cockpit-decisions*.md and .claude/cockpit-audit*.md (with their numbered copies, such as cockpit-audit-2.md). Your CLAUDE.md and settings.json were never changed.",
}

export const HELP: { title: string; text: string }[] = [
  { title: 'Why it costs usage', text: 'Claude re-reads the whole session on every answer. The longer the session, the more usage each answer takes.' },
  { title: 'What compacting does', text: 'Claude writes a short summary of the session and keeps that instead of the long session. Your files do not change. Only the session history gets shorter.' },
  { title: 'What it keeps', text: 'Your goal, the files changed, the decisions and why, and the next steps.' },
  { title: 'What may be lost', text: 'Small details from early in the session. If Claude needs one, ask it to read the file again.' },
  { title: 'When the card suggests it', text: 'At a quiet moment, once the session fills {from}% of its window (Settings, Compacting, Advise compacting from), when the saving is bigger than the cost of the summary. The cost is an estimate.' },
  { title: 'Your choice', text: 'Settings, Compacting: Off hides the advice, Suggest shows it with a button, Watch only notes the moments it would compact, Auto compacts the session by itself when the work is at rest.' },
  { title: 'What is the cache?', text: 'Claude keeps a saved copy of your session for about an hour on a subscription plan, and 5 minutes when you pay with usage credits. While the copy is fresh, each answer costs much less. After a long quiet break it goes stale, and the next answer costs full price.' },
  { title: 'Keeping the session cheap', text: 'Settings, Cache: On. The cache is the saved copy of your session (see What is the cache?). While you are away, it reads the saved copy just before it goes stale, up to 3 times. Your next answer then stays cheap. Each read costs a little usage. It shows under Autopilot.' },
  { title: 'What the loop breaker does', text: 'Sometimes Claude tries the same step again and again, and it fails the same way each time. After 3 failures in a row, vaken tells Claude to stop and ask you. Settings > Safety > Loop breaker: Warn only tells Claude. Stop also stops the next try until you write a message. It shows under Autopilot.' },
  PRIVACY_HELP,
  REMOVE_HELP,
  ...FEATURE_HELP.map(retitled),
]

const TOPIC_ORDER: HelpTopicId[] = ['usage', 'work', 'safety', 'memory', 'team', 'prompts', 'care']
export const HELP_BY_TOPIC: { topic: HelpTopicId; entries: { title: string; text: string }[] }[] = TOPIC_ORDER.map(topic => ({
  topic,
  entries: [...(topic === 'usage' ? HELP.slice(0, 8) : topic === 'safety' ? HELP.slice(8, 11) : []), ...HELP_TOPICS.filter(g => g.topic === topic).flatMap(g => g.entries.map(retitled))],
}))

export const helpFill = (text: string, values?: Record<string, string>): string => fillIn(text, { from: fromOf(values?.['compact.from']) })

export function HelpView(el: El, own: Prefs, act: Acts, innerPt: number) {
  const { Box, Text } = el
  let n = 0
  return (
    // As wide as the pane's body, so the title row's ends are the frame's at every width (W).
    <Box flexDirection="column" width="100%" alignItems="stretch" rowGap={vstep(CARD_GAP)}>
      {ViewHeader(el, 'help-head', { key: 'help-done', label: tr(BACK_LABEL), onPress: () => act.openHelp(false) }, t('common.help'), { right: LinkButton(el, 'help-settings', t('common.open_settings_jump'), () => act.openSettings(true), { on: 'ground' }) })}
      {Card(
        el,
        'help-card',
        t('common.in_plain_words'),
        '',
        <Box flexDirection="column" rowGap={vstep(GROUP_GAP)}>
          {HELP_BY_TOPIC.map(g => (
            <Box key={`help-topic-${g.topic}`} flexDirection="column">
              {List(
                el,
                g.entries.flatMap(item => {
                  const key = `help:${n++}`
                  const isOpen = own.open === key
                  const toggle = () => act.open(isOpen ? undefined : key)
                  return [
                    OpenLine(el, `help-${key}`, <Text bold wrap="truncate-end">{tr(item.title)}</Text>, isOpen, toggle, { widthPt: innerPt, tall: true }),
                    isOpen ? (
                      <Box key={`help-${key}-text`} flexDirection="column" paddingLeft={cols(LIST_COL_GAP)}>
                        <Text dimColor>{helpFill(tr(item.text), own.values)}</Text>
                      </Box>
                    ) : null,
                  ]
                }),
              )}
            </Box>
          ))}
          <Box>
            {Row(el, 'help-guide', <Text>{tr(GUIDE_TITLE)}</Text>, { chevron: { dir: 'right', onToggle: () => act.openGuide(true) }, press: { onPress: () => act.openGuide(true), widthPt: innerPt, heightPt: LIST_ROW_H }, minPt: LIST_ROW_H })}
          </Box>
        </Box>,
      )}
    </Box>
  )
}
