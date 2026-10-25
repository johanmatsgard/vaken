// The three Selected text presses (core/selected.ts has the words and the rules). Each press reads the selection at that moment, acts, and keeps nothing.
import { tr } from '../../core/lang'
import { ADDED_PREFIX, SEL_COPIED, SEL_EXPLAIN_SAID, SEL_NONE, SEL_NOT_COPIED, SEL_TASK_SAID, copyTextOf, explainRequest, taskLineOf } from '../../core/selected'
import { tasksCommand } from '../orchestra'
import type { HomeEngine } from './engine'
import { PROMPT_FAILED } from './rowact'
import { forPane } from './starttask'

export type SelectedActs = { explain: () => void; task: () => void; copy: () => void }

// What is selected in the chat right now; undefined with nothing selected, and where the app answers no selection.
async function selectedNow(eng: HomeEngine): Promise<string | undefined> {
  if (eng.selection === undefined) return undefined
  try {
    return await eng.selection()
  } catch {
    return undefined
  }
}

// One press at a time: a second press while the first is working does nothing.
const busy = { now: false }
async function once(run: () => Promise<void>): Promise<void> {
  if (busy.now) return
  busy.now = true
  try {
    await run()
  } catch {
  } finally {
    busy.now = false
  }
}

export function selectedActsOf(eng: HomeEngine): SelectedActs {
  const toast = (text: string): void => eng.io().toast(text, true)
  return {
    explain: () => {
      void once(async () => {
        const request = explainRequest(await selectedNow(eng))
        if (request === undefined) return toast(tr(SEL_NONE))
        const r = (await eng.submit(request).catch(() => ({ drop: 'failed' }))) as { drop?: string } | undefined
        toast(r !== undefined && r.drop !== undefined ? tr(PROMPT_FAILED) : tr(SEL_EXPLAIN_SAID))
      })
    },
    task: () => {
      void once(async () => {
        const line = taskLineOf(await selectedNow(eng))
        if (line === undefined) return toast(tr(SEL_NONE))
        const said = (await tasksCommand(eng.io(), eng.runnerOps(), `add ${line}`)).split('\n')[0] ?? ''
        toast(said.startsWith(ADDED_PREFIX) ? tr(SEL_TASK_SAID) : forPane(said))
        eng.io().invalidate()
      })
    },
    copy: () => {
      void once(async () => {
        const text = copyTextOf(await selectedNow(eng))
        if (text === undefined) return toast(tr(SEL_NONE))
        const copied = eng.copy === undefined ? false : await eng.copy(text).catch(() => false)
        toast(tr(copied ? SEL_COPIED : SEL_NOT_COPIED))
      })
    },
  }
}
