// What a row of the pane may do when it is pressed: a small typed action, never a free string.
import { kindWord } from '../../core/proof'
import type { ProofKind } from '../../core/proof'
import type { SetupDo } from '../../core/setupcard'
import type { DoDo } from '../../core/docard'

export type RowPrompt = { ask: 'fix'; check: ProofKind } | { ask: 'claims'; n: number }

export type RowAction =
  | { kind: 'skill'; name: string }
  | { kind: 'prompt'; prompt: RowPrompt }
  // It runs the command's own preview in place (features/undo.ts previewLast): a plugin cannot run its own slash command from its pane
  | { kind: 'undoLast' }
  | { kind: 'allowOnce' } // this session's stopped step goes through once (core/allowonce.ts, only the step held last)
  | { kind: 'dismissHold'; sid: string } // the stopped steps of that session leave Needs you; nothing is allowed
  | { kind: 'prFix' }
  | { kind: 'prShip'; open: string }
  | { kind: 'prLook' }
  | { kind: 'gotIt' }
  | { kind: 'halt' }
  | { kind: 'resume' }
  | { kind: 'undoNamed'; name: string }
  | { kind: 'brief' }
  | { kind: 'preview'; width: 390 | 768 | 1280 | 'all' }
  // The Agent setup card (core/setupcard.ts): show the diff under a row
  | { kind: 'setup'; act: SetupDo }
  | { kind: 'do'; act: DoDo }

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
export const lookPreview = (width: 390 | 768 | 1280 | 'all'): RowAction => ({ kind: 'preview', width })
export const undoNamed = (name: string): RowAction => ({ kind: 'undoNamed', name })
export const prShip = (open: string): RowAction => ({ kind: 'prShip', open })
export const ALLOW_ONCE: RowAction = { kind: 'allowOnce' }
export const dismissHold = (sid: string): RowAction => ({ kind: 'dismissHold', sid })
export const DISMISS_LABEL = 'Dismiss'
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
