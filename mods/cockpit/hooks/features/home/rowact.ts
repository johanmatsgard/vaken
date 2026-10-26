// What a row of the pane may do when it is pressed: a small typed action, never a free string.
import { kindWord } from '../../core/proof'
import type { ProofKind } from '../../core/proof'
import type { SetupDo } from '../../core/setupcard'
import type { DoDo } from '../../core/docard'
import type { AskId } from '../../core/welcome'
import type { WhereFix } from '../../core/cost'
import type { Copy } from '../../core/crew3git'

export type RowPrompt = { ask: 'fix'; check: ProofKind } | { ask: 'claims'; n: number }

export type RowAction =
  | { kind: 'skill'; name: string }
  | { kind: 'prompt'; prompt: RowPrompt }
  // It runs the command's own preview in place (features/undo.ts previewLast): a plugin cannot run its own slash command from its pane
  | { kind: 'undoLast' }
  | { kind: 'allowOnce' } // this session's stopped step goes through once (core/allowonce.ts, only the step held last)
  | { kind: 'dismissHold'; sid: string } // the stopped steps of that session leave Needs you; nothing is allowed
  | { kind: 'keepStopped' } // this session's stopped step leaves Needs you and that exact step stays stopped for the session
  | { kind: 'prFix' }
  | { kind: 'prShip'; open: string }
  | { kind: 'prLook' }
  // The worktree janitor's Remove this copy (core/prcard.ts removeCopy): every check is made again at the press
  | { kind: 'copyRemove'; copy: Copy }
  | { kind: 'gotIt' }
  | { kind: 'halt' }
  | { kind: 'resume' }
  | { kind: 'undoNamed'; name: string }
  | { kind: 'brief' }
  // The fresh-start nudge's press: write the brief and say the next step (features/continuity.ts writeFreshBrief)
  | { kind: 'freshBrief' }
  | { kind: 'preview'; width: 390 | 768 | 1280 | 'all' }
  // The Preview card's last picture: a fixed request that asks Claude to look at that saved file
  | { kind: 'seePicture'; path: string; width: 390 | 768 | 1280 }
  // The Agent setup card (core/setupcard.ts): show the diff under a row
  | { kind: 'setup'; act: SetupDo }
  | { kind: 'do'; act: DoDo }
  // The Where was I card's rows after a break: a fixed request to Claude, or what waits opened in the pane
  | { kind: 'ask'; id: AskId }
  | { kind: 'openHold'; key: string }
  | { kind: 'openRun' }
  // A night run's failed tasks, and a promise Claude made, sent as a fixed request
  | { kind: 'nightFix' }
  | { kind: 'promise'; n: number }
  // Learn from you: save the repeated rule in the project's CLAUDE.md, or let the offer go
  | { kind: 'teach'; save: boolean }
  // Repeat to skill (core/repeat.ts): one fixed request that asks Claude to draft the skill, or quiet the offer for 14 days
  | { kind: 'repeat'; draft: boolean }
  // Learn from outcomes: the stronger model for the role that failed often, set as the Roles choice is
  | { kind: 'teachModel'; use: boolean }
  // The stuck ladder (core/loopbreaker.ts): a stronger agent once, or a fresh start with only the error
  | { kind: 'stuck'; way: 'strong' | 'fresh' }
  // Plan limits: Finish safely (core/continuity.ts), and Where it went's one fix for the biggest cause (core/cost.ts whereOf)
  | { kind: 'finishSafely' }
  | { kind: 'whereFix'; fix: WhereFix }
  // Compact check (core/compactcheck.ts): send Claude the kept items the last summary left out
  | { kind: 'putBack' }
  // Keep going until green (core/keepgoing.ts): start it for one check, stop it, or take away the row of the last round
  | { kind: 'keepGoing'; act: 'start'; check: ProofKind }
  | { kind: 'keepGoing'; act: 'stop' | 'dismiss' }

// `more`: further presses beside the first one in the open detail.
export type Inside = { label: string; action: RowAction; more?: { label: string; action: RowAction }[] }
export const doRow = (act: DoDo): RowAction => ({ kind: 'do', act })
export const setupRow = (act: SetupDo): RowAction => ({ kind: 'setup', act })
export const UNDO_LAST: RowAction = { kind: 'undoLast' }
export const PR_FIX: RowAction = { kind: 'prFix' }
export const PR_LOOK: RowAction = { kind: 'prLook' }
export const GOT_IT: RowAction = { kind: 'gotIt' }
export const HALT_ALL: RowAction = { kind: 'halt' }
export const RESUME_ALL: RowAction = { kind: 'resume' }
export const BRIEF_LOOK: RowAction = { kind: 'brief' }
export const FRESH_BRIEF: RowAction = { kind: 'freshBrief' }
export const lookPreview = (width: 390 | 768 | 1280 | 'all'): RowAction => ({ kind: 'preview', width })
export const undoNamed = (name: string): RowAction => ({ kind: 'undoNamed', name })
export const prShip = (open: string): RowAction => ({ kind: 'prShip', open })
export const ALLOW_ONCE: RowAction = { kind: 'allowOnce' }
export const dismissHold = (sid: string): RowAction => ({ kind: 'dismissHold', sid })
export const DISMISS_LABEL = 'Dismiss'
export const TEACH_YES: RowAction = { kind: 'teach', save: true }
export const TEACH_NO: RowAction = { kind: 'teach', save: false }
export const REPEAT_YES: RowAction = { kind: 'repeat', draft: true }
export const REPEAT_NO: RowAction = { kind: 'repeat', draft: false }
export const MODEL_YES: RowAction = { kind: 'teachModel', use: true }
export const MODEL_NO: RowAction = { kind: 'teachModel', use: false }
export const KEEP_STOPPED_ROW: RowAction = { kind: 'keepStopped' }
export const STUCK_STRONG_ROW: RowAction = { kind: 'stuck', way: 'strong' }
export const STUCK_FRESH_ROW: RowAction = { kind: 'stuck', way: 'fresh' }
export const FINISH_ROW: RowAction = { kind: 'finishSafely' }
export const whereFix = (fix: WhereFix): RowAction => ({ kind: 'whereFix', fix })
export const PUT_BACK_ROW: RowAction = { kind: 'putBack' }
export const keepStart = (check: ProofKind): RowAction => ({ kind: 'keepGoing', act: 'start', check })
export const KEEP_STOP_ROW: RowAction = { kind: 'keepGoing', act: 'stop' }
export const KEEP_DISMISS_ROW: RowAction = { kind: 'keepGoing', act: 'dismiss' }
export const removeCopyRow = (copy: Copy): RowAction => ({ kind: 'copyRemove', copy })
export const fixCheck = (check: ProofKind): RowAction => ({ kind: 'prompt', prompt: { ask: 'fix', check } })
export const checkClaims = (n: number): RowAction => ({ kind: 'prompt', prompt: { ask: 'claims', n: Math.max(1, Math.floor(n)) } })

const checkName = (k: ProofKind): string => (k === 'tests' ? 'the tests' : kindWord(k))
const cap = (s: string): string => `${s.charAt(0).toUpperCase()}${s.slice(1)}`
// The toast of a fix: the request is put in the prompt box (home/fillonce.ts), never sent
export const FIX_FILLED = 'The fix prompt is in the prompt box. Press Enter to send it.'
export const CLAIMS_SAID = 'Asked Claude to check its claims'
export const PROMPT_FAILED = 'Could not ask Claude from here. Type it in the session.'
export const UNDO_SAID = 'Here is what undo would put back. Nothing changed yet.'
export const UNDO_FAILED = 'Could not show the undo from here. Type /vaken-undo last in the session.'

// The claims prompt goes to Claude as the person's own message, so it is English by rule and lives here
const CLAIMS_ONE = 'Your last answer says one thing is done with no check behind it. Run the checks that prove it, and show me the results.' // en-only: a prompt sent to Claude as the person
const claimsMany = (n: number): string => `Your last answer says ${n} things are done with no check behind them. Run the checks that prove them, and show me the results.` // en-only: a prompt sent to Claude as the person

export function promptOf(p: RowPrompt): { text: string; said: string } {
  if (p.ask === 'fix') {
    const name = checkName(p.check)
    return { text: `${cap(name)} failed after the last change. Run ${name} again, find why, fix it, and show me the result.`, said: FIX_FILLED }
  }
  return { text: p.n === 1 ? CLAIMS_ONE : claimsMany(p.n), said: CLAIMS_SAID }
}

export const ROW_ACT_WORDS: string[] = [FIX_FILLED, CLAIMS_SAID, PROMPT_FAILED, UNDO_SAID, UNDO_FAILED]
