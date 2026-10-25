// The Start here card: the first-start setup, one question at a time, then a summary with Finish (features/home/firstsetup.ts). Shown on the first run, and again after Settings > Run setup again.
import { START_VIEW_ABOUT, WELCOME_ABOUT, WELCOME_FIRST, WELCOME_TITLE } from '../../../core/cardrules'
import { VIEW_MODES, viewModeOf } from '../viewset'
import { t, tr } from '../../../core/lang'
import { ActionButton, Card, Pick, RadioList, SwitchRow, framePt, pickLines, vstep } from '../../../ui/kit'
import type { El } from '../../../ui/kit'
import { cardGapX, GROUP_GAP, cols } from '../../../ui/tokens'
import type { Acts, Prefs } from '../prefs'
import { SETUP_QUESTIONS, SUMMARY_STEP, parseSetupState, setupQuestions, summaryLines } from '../firstsetup'
import type { SetupQuestion, SetupState } from '../firstsetup'

export const VIEW_LABEL: Record<(typeof VIEW_MODES)[number], string> = { standard: 'Standard', all: 'All', custom: 'Custom' }

// The radio keys of each question; the first question keeps the old mode keys (start-mode-quiet|balanced|full)
const RADIO_KEY: Record<string, string> = { tell: 'start-mode', risky: 'start-risky', spend: 'start-spend', long: 'start-long' }

// The answers of one question: radio rows with a line of meaning each, or the on/off rows of the habits question
function QuestionBody(el: El, q: SetupQuestion, s: SetupState, act: Acts, widthPt: number) {
  const { Box } = el
  if (q.kind === 'radio') {
    // The recommended answer wears the chip, said once: an answer already named Recommended (the mode of question 1) needs no chip
    const word = t('firstsetup.recommended')
    const options = q.answers.map(a => ({ value: a.value, label: a.label, note: a.note, ...(a.value === q.recommended && a.label !== word ? { chip: word } : {}) }))
    return RadioList(el, RADIO_KEY[q.field] ?? q.field, options, s.answers[q.field], v => act.setup({ kind: 'pick', field: q.field, value: v }), widthPt)
  }
  return (
    <Box key="start-switches" flexDirection="column" rowGap={vstep(GROUP_GAP)}>
      {q.rows.map(r => {
        const isOn = s.answers[r.field]
        return SwitchRow(el, `start-${r.field}`, r.label, r.note, isOn, isOn ? 'off' : 'on', () => act.setup({ kind: 'pick', field: r.field, value: isOn ? 'off' : 'on' }), widthPt)
      })}
    </Box>
  )
}

// Back, Next (Finish on the summary) and Skip: one line when all three fit, else Skip on a line of its own
function SetupButtons(el: El, s: SetupState, act: Acts, widthPt: number) {
  const { Box } = el
  const summary = s.step === SUMMARY_STEP
  const back = s.step > 1 ? ActionButton(el, 'start-back', t('firstsetup.back'), () => act.setup({ kind: 'back' }), { gap: cardGapX() }) : null
  const go = summary
    ? ActionButton(el, 'start-finish', t('firstsetup.finish'), () => act.setup({ kind: 'finish' }), { primary: true, gap: cardGapX() })
    : ActionButton(el, 'start-next', t('firstsetup.next'), () => act.setup({ kind: 'next' }), { primary: true, gap: cardGapX() })
  const skip = summary ? null : ActionButton(el, 'start-skip', t('firstsetup.skip'), () => act.setup({ kind: 'skip' }), { gap: cardGapX() })
  const words = [skip === null ? '' : t('firstsetup.skip'), back === null ? '' : t('firstsetup.back'), t(summary ? 'firstsetup.finish' : 'firstsetup.next')].filter(w => w !== '')
  const oneLine = words.reduce((sum, w) => sum + framePt(w), 0) + (words.length - 1) * cardGapX() <= widthPt
  const moves = (
    <Box key="start-moves" flexDirection="row" flexShrink={0} columnGap={cols(cardGapX())}>
      {back}
      {go}
    </Box>
  )
  if (skip === null || oneLine) {
    return (
      <Box key="start-skip-row" flexDirection="row" justifyContent={skip === null ? 'flex-end' : 'space-between'} columnGap={cols(cardGapX())}>
        {skip}
        {moves}
      </Box>
    )
  }
  return (
    <Box key="start-buttons" flexDirection="column" alignItems="flex-end" rowGap={vstep(GROUP_GAP)}>
      {moves}
      <Box key="start-skip-row" flexDirection="row" justifyContent="flex-end">
        {skip}
      </Box>
    </Box>
  )
}

export function StartCard(el: El, prefs: Prefs, act: Acts, widthPt: number, firstRun = true) {
  const { Box, Text } = el
  // The answers start from the values of the scope a Finish writes (Settings' scope)
  const s = parseSetupState(prefs.setupRaw, prefs.settingsScope === 'project' ? prefs.values : prefs.globalValues)
  const budget = { session: prefs.values['cost.session'] ?? '', day: prefs.values['cost.day'] ?? '' }
  const q = setupQuestions(budget).find(x => x.step === s.step)
  // The view: a short choice of three (kind A), framed segments on one line when they fit
  const viewOptions = VIEW_MODES.map(m => ({ value: m, label: tr(VIEW_LABEL[m]) }))
  const view = viewModeOf(prefs.values)
  const setView = (v: string): void => act.setSetting('look.view', v)
  const viewPicks = pickLines(viewOptions, widthPt).length > 1 ? RadioList(el, 'start-view', viewOptions, view, setView, widthPt) : Pick(el, 'start-view', viewOptions, view, setView, true)
  const body =
    q === undefined ? (
      [
        // No heading inside the card: the answers are the summary
        <Box key="start-summary" flexDirection="column">
          {summaryLines(s.answers, budget).map((line, n) => (
            <Text key={`start-summary-${n}`}>{line}</Text>
          ))}
        </Box>,
        <Box key="start-view-block" flexDirection="column" rowGap={vstep(GROUP_GAP)}>
          <Text>{tr(START_VIEW_ABOUT)}</Text>
          {viewPicks}
        </Box>,
        firstRun ? <Text key="start-first">{tr(WELCOME_FIRST)}</Text> : null,
      ]
    ) : (
      [
        firstRun && s.step === 1 ? <Text key="start-about">{tr(WELCOME_ABOUT)}</Text> : null,
        <Box key={`start-ask-${s.step}`} flexDirection="column">
          <Text dimColor>{t('firstsetup.step_n_of_m', { n: s.step, m: SETUP_QUESTIONS })}</Text>
          <Text bold>{q.ask}</Text>
          <Text dimColor>{q.hint}</Text>
        </Box>,
        QuestionBody(el, q, s, act, widthPt),
      ]
    )
  return Card(
    el,
    'start',
    WELCOME_TITLE,
    '',
    <Box flexDirection="column" rowGap={vstep(GROUP_GAP)}>
      {body}
      {SetupButtons(el, s, act, widthPt)}
    </Box>,
  )
}
