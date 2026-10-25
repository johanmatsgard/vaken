// Keep drops the question and changes nothing.
import { langNow, t as tx, tr } from '../../core/lang'
import { fmt } from '../../core/fmt'
import type { ThrowLoss } from '../orchestra'
import type { Task } from '../../core/orchestra'
import type { Acts } from './prefs'
import { flags } from './state'

export const THROW_ASK = 'Throw away the work of task {n}? Its folder copy and its branch are deleted.'
export const THROW_SURE = 'This task holds work that is not merged or not committed. Throw it away anyway? It is lost for good.'
export const THROW_NO = 'Keep'
export const KEEP_WORK = 'Keep work'

// The line under the question: what the press loses, in whole counts ("3 commits and 2 changed files").
export function lossLine(loss: ThrowLoss): string {
  if (loss === 'unknown') return tx('common.throw_loss_unknown')
  const count = (row: string, n: number): string => tx(row, { n: fmt.figure(n, langNow()) })
  const parts = [loss.commits > 0 ? count('words.commit', loss.commits) : '', loss.files > 0 ? count('words.changed_file', loss.files) : ''].filter(x => x !== '')
  if (parts.length === 0) return tx('common.throw_loss_none')
  return parts.length === 2 ? tx('common.throw_loss_both', { a: parts[0], b: parts[1] }) : tx('common.throw_loss_one', { a: parts[0] })
}

type Action = { key: string; label: string; onPress: () => void }

export function keepThrow(t: Task, act: Acts, prefix: string): { ask: string[]; actions: Action[] } {
  const asking = flags.throwAsk === t.n
  return {
    ask: asking
      ? [flags.throwSure === t.n ? tr(THROW_SURE) : tr(THROW_ASK).replace('{n}', String(t.n)), ...(flags.throwLoss?.n === t.n ? [lossLine(flags.throwLoss.loss)] : [])]
      : [],
    actions: asking
      ? [
          { key: `${prefix}-throw-${t.n}`, label: 'Throw away', onPress: () => { const sure = flags.throwSure === t.n; act.askThrow?.(undefined); act.runSteer(`throw ${t.n}${sure ? ' yes' : ''}`) } },
          { key: `${prefix}-throw-no-${t.n}`, label: THROW_NO, onPress: () => act.askThrow?.(undefined) },
        ]
      : [
          { key: `${prefix}-keep-${t.n}`, label: KEEP_WORK, onPress: () => act.runSteer(`keep ${t.n}`) },
          { key: `${prefix}-throw-${t.n}`, label: 'Throw away', onPress: () => act.askThrow?.(t.n) },
        ],
  }
}
