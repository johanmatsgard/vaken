// The Context health card's facts (core/contextcard.ts).
import type { Io } from '../../core/io'
import { dietHeavy, dietParts, dietTokens } from '../../core/diet'
import type { ContextFacts, DietFacts } from '../../core/contextcard'
import { memorySpots, parseIndex } from '../../core/memory'
import { under } from '../../core/platform'
import { collectFiles } from '../diet'
import type { Prefs } from './prefs'
import type { View } from './logic'

export type ContextRead = { diet?: DietFacts; memory?: { notes: number } }

export const CONTEXT_FRESH_MS = 3 * 60_000
let kept: { key: string; at: number; read: Promise<ContextRead> } | undefined

async function readNow(i: Io, cwd: string, root: string): Promise<ContextRead> {
  const out: ContextRead = {}
  try {
    const { report, home } = await collectFiles(i, async () => true, cwd, root)
    const { lines, advice } = dietParts(report, home)
    out.diet = { files: report.files.length, size: dietTokens(report.totalTokens), heavy: dietHeavy(report), repeats: report.repeats.length, ...(report.repeats[0] === undefined ? {} : { first: report.repeats[0].line.slice(0, 70) }), lines, advice }
  } catch {
  }
  try {
    for (const s of memorySpots(await i.home(), cwd)) {
      try {
        out.memory = { notes: parseIndex(await i.read(under(s.dir, 'MEMORY.md'))).length }
        break
      } catch {
      }
    }
  } catch {
  }
  return out
}

// Never throws.
export async function loadContext(i: Io, hidden: boolean, cwd: string, root: string, now: number): Promise<ContextRead | undefined> {
  if (hidden || cwd === '') return undefined
  const key = `${cwd}|${root}`
  if (kept === undefined || kept.key !== key || now < kept.at || now - kept.at >= CONTEXT_FRESH_MS) kept = { key, at: now, read: readNow(i, cwd, root) }
  return kept.read
}
export const forgetContext = (): void => {
  kept = undefined
}

export function contextFactsOf(view: View, prefs: Prefs): ContextFacts {
  const p = prefs.proof
  const rec = view.here?.rec
  const work = p !== undefined && (p.edits > 0 || p.receipts.length > 0 || p.goal !== undefined)
  return {
    ...(prefs.context?.diet === undefined ? {} : { diet: prefs.context.diet }),
    ...(prefs.context?.memory === undefined ? {} : { memory: prefs.context.memory }),
    brief: { on: prefs.values['brief.mode'] !== 'off', work, unverified: work ? (p?.last?.unproven.length ?? 0) : 0, ...(prefs.briefMarks === undefined ? {} : { preview: prefs.briefMarks }) },
    keep: {
      ...(p?.goal?.text === undefined || p.goal.text === '' ? {} : { goal: p.goal.text }),
      ...(rec?.title === undefined || (p?.goal?.text !== undefined && p.goal.text !== '') ? {} : { session: rec.title }),
      ...(rec?.branch === undefined ? {} : { branch: rec.branch }),
      files: p?.files.length ?? 0,
      ...(prefs.rest === undefined ? {} : { rest: prefs.rest }),
    },
  }
}
