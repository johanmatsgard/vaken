// The heartbeat (keeps this session's line fresh, reads the app's usage, keeps a task run going) and the slow redraw check.
import { redrawIfChanged } from '../../core/redraw'
import { quietly } from '../../core/quiet'
import type { Timer } from 'claude-code'
import { beat, loadRun } from '../orchestra'
import type { HomeEngine } from './engine'
import { busyBeat, write } from './load'
import { refreshContext, refreshSessions, refreshUsage } from './refresh'

const BEAT_MS = 30_000
const CHECK_MS = 10_000
let beatTimer: Timer | undefined
let checkTimer: Timer | undefined

export function startTimers(eng: HomeEngine): void {
  if (beatTimer === undefined) {
    beatTimer = eng.every(BEAT_MS, quietly('home:beat', eng.now, () => {
      void write(eng.io(), busyBeat(), false, true).catch(() => undefined)
      void refreshUsage(eng)
      void refreshSessions(eng)
      void refreshContext(eng)
      void (async () => {
        try {
          const run = await loadRun(eng.io())
          if (run?.status !== 'running' && run?.status !== 'paused') return
          const ops = eng.runnerOps()
          await beat(eng.io(), ops, await ops.statuses())
        } catch {
        }
      })()
    }))
  }
  if (checkTimer === undefined) {
    checkTimer = eng.every(CHECK_MS, quietly('home:check', eng.now, () => redrawIfChanged(eng.io(), CHECK_MS / 2)))
  }
}

export function stopTimers(): void {
  beatTimer?.cancel()
  beatTimer = undefined
  checkTimer?.cancel()
  checkTimer = undefined
}
