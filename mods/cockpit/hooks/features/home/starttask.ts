// The Run one task row and the cost check before a run (core/runcost.ts): what a draw shows, and what the row's presses do.
import type { Io } from '../../core/io'
import { readNote } from '../../core/flush'
import { t, tr } from '../../core/lang'
import { newRun } from '../../core/orchestra'
import type { Run } from '../../core/orchestra'
import { HISTORY_KEY, parseHistory } from '../../core/pace'
import type { History } from '../../core/pace'
import { APP_USAGE_KEY, parseStoredUsage } from '../../core/appusage'
import type { AppUsage } from '../../core/appusage'
import { PROOF_KINDS, readState, stateKey } from '../../core/proof'
import type { ProofKind, ProofState } from '../../core/proof'
import { STATS_KEY, normalizeStats } from '../../core/route'
import type { Stats } from '../../core/route'
import { checkRun, estimateLine, reasonLines, roleModelsFrom, taskTextOf } from '../../core/runcost'
import type { DoneKind, RunCheck } from '../../core/runcost'
import { RC_ADD_FIRST, RC_PRESS_AGAIN, RC_START, RC_START_ANYWAY, RC_TYPE_AGAIN } from '../../core/runcostwords'
import { readSetting, writeSetting } from '../../core/settings'
import type { Values } from '../../core/settings'
import { setDoneKinds } from '../proof'
import { checkShown, costCheck, loadRun, tasksCommand } from '../orchestra'
import type { HomeEngine } from './engine'
import type { Prefs } from './prefs'

// What the pane holds for the row: the check of the run that would start (`forGoal`: the one-task run the goal would make
export type StartCheck = { check: RunCheck; forGoal: boolean }
export type StartActs = {
  toggleDone: (kind: DoneKind) => void
  setPlan: (value: string) => void
  start: () => void
}

export const START_FRESH_MS = 30_000
let kept: { at: number; stats: Stats; usage: AppUsage | undefined; hist: History } | undefined
export const forgetStartCheck = (): void => {
  kept = undefined
}

export const doneKindsOf = (proof: ProofState | undefined, values: Values): DoneKind[] =>
  values['proof.done'] === 'off' || proof === undefined ? [] : (proof.done.filter(k => k === 'tests' || k === 'build' || k === 'lint') as DoneKind[])
export const planFirstOn = (values: Values): boolean => (values['plan.first'] ?? 'off') !== 'off'
export const planFirstOf = (values: Values): string => values['plan.first'] ?? 'off'

export const goalRun = (proof: ProofState | undefined, values: Values, now: number): Run | undefined =>
  proof?.goal === undefined ? undefined : newRun([taskTextOf(proof.goal.text, doneKindsOf(proof, values), planFirstOn(values))], now)

// The check for a draw: of the run in setup, or else of the run the goal would make.
export async function loadStartCheck(i: Io, run: Run | undefined, proof: ProofState, values: Values, now: number): Promise<StartCheck | undefined> {
  if (run !== undefined && run.status !== 'setup') return undefined
  const candidate = run ?? goalRun(proof, values, now)
  if (candidate === undefined) return undefined
  try {
    if (kept === undefined || now < kept.at || now - kept.at >= START_FRESH_MS) {
      kept = { at: now, stats: normalizeStats(await i.get(STATS_KEY)), usage: parseStoredUsage(await i.get(APP_USAGE_KEY)), hist: parseHistory(await i.get(HISTORY_KEY)) }
    }
    return { check: checkRun(candidate, { roleModels: roleModelsFrom(values), stats: kept.stats, usage: kept.usage, hist: kept.hist, now }), forGoal: run === undefined }
  } catch {
    return undefined
  }
}

export function startPress(sc: StartCheck | undefined, start: { label: string; args: string }): { label: string; args: string } {
  return sc?.check.over === true && checkShown.sig === sc.check.sig ? { label: RC_START_ANYWAY, args: 'start anyway' } : start
}
export const goalStartLabel = (sc: StartCheck | undefined): string => (sc?.check.over === true && checkShown.sig === sc.check.sig ? RC_START_ANYWAY : RC_START)

export const checkLines = (sc: StartCheck | undefined, t?: (s: string) => string): string[] => (sc === undefined ? [] : [estimateLine(sc.check, t), ...reasonLines(sc.check, t)])

export const forPane = (text: string): string => text.replace(tr(RC_TYPE_AGAIN), tr(RC_PRESS_AGAIN))

// The /vaken reply's line for a goal the person typed and has not run yet: where to start it (a chat reader cannot press a button), and a cost warning if any
export function startTaskText(prefs: Prefs): string[] {
  if (prefs.run !== undefined && prefs.run.status !== 'setup') return []
  const goal = prefs.proof?.goal
  if (goal === undefined || goal.how === 'first') return []
  const done = doneKindsOf(prefs.proof, prefs.values)
  const head = done.length === 0 ? t('chat.run_goal', { goal: goal.text }) : t('chat.run_goal_done', { goal: goal.text, checks: done.map(k => tr(k)).join(', ') })
  return [head, ...(prefs.startCheck === undefined ? [] : reasonLines(prefs.startCheck.check, tr))]
}

export function startActsOf(eng: HomeEngine): StartActs {
  return {
    toggleDone: kind => {
      void (async () => {
        const i = eng.io()
        try {
          const proof = readState(await readNote(i, stateKey(await i.sessionId())))
          const next = proof.done.includes(kind) ? proof.done.filter(k => k !== kind) : [...proof.done, kind]
          await setDoneKinds(i, PROOF_KINDS.filter(k => next.includes(k)) as ProofKind[])
        } catch {
        }
        i.invalidate()
      })()
    },
    setPlan: (value: string) => {
      void (async () => {
        const i = eng.io()
        try {
          await writeSetting(i, 'plan.first', value)
        } catch {
        }
        i.invalidate()
      })()
    },
    start: () => {
      void (async () => {
        const i = eng.io()
        try {
          let run = await loadRun(i)
          if (run === undefined) {
            const proof = readState(await readNote(i, stateKey(await i.sessionId())))
            const task = proof.goal === undefined ? undefined : taskTextOf(proof.goal.text, doneKindsOf(proof, { 'proof.done': await readSetting(i, 'proof.done') }), (await readSetting(i, 'plan.first')) !== 'off')
            if (task === undefined) {
              eng.toast(tr(RC_ADD_FIRST))
              return
            }
            await tasksCommand(i, eng.runnerOps(), `add ${task}`)
            run = await loadRun(i)
          }
          if (run === undefined || run.status !== 'setup') return
          const check = await costCheck(i, run)
          const said = (await tasksCommand(i, eng.runnerOps(), check.over && checkShown.sig === check.sig ? 'start anyway' : 'start')).split('\n')[0]
          if (said !== '') eng.toast(forPane(said))
        } catch {
        }
        i.invalidate()
      })()
    },
  }
}
