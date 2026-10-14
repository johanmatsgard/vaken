// Keep drops the question and changes nothing.
import { tr } from '../../core/lang'
import type { Task } from '../../core/orchestra'
import type { Acts } from './prefs'
import { flags } from './state'

export const THROW_ASK = 'Throw away the work of task {n}? Its folder copy and its branch are deleted.'
export const THROW_SURE = 'This task holds work that is not merged or not committed. Throw it away anyway? It is lost for good.'
export const THROW_NO = 'Keep'
export const KEEP_WORK = 'Keep work'

type Action = { key: string; label: string; onPress: () => void }

export function keepThrow(t: Task, act: Acts, prefix: string): { ask: string[]; actions: Action[] } {
  const asking = flags.throwAsk === t.n
  return {
    ask: asking ? [flags.throwSure === t.n ? tr(THROW_SURE) : tr(THROW_ASK).replace('{n}', String(t.n))] : [],
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
