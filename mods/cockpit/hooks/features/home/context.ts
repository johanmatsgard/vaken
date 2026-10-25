// The Context health card's facts (core/contextcard.ts).
import type { Io } from '../../core/io'
import { FIRST_MAX, dietHeavy, dietParts } from '../../core/diet'
import { shortText } from '../../core/band'
import { CLAIMS_TOPIC, uncheckedOf } from '../../core/contextcard'
import type { BriefMark, ContextFacts, DietFacts } from '../../core/contextcard'
import { claimsUnchecked } from '../../core/proof'
import { memorySpots, parseIndex } from '../../core/memory'
import { under } from '../../core/platform'
import { collectFiles } from '../diet'
import { briefMarkLines } from '../../core/continuity'
import type { ProofState } from '../../core/proof'
import { clashesOf, forgetSizes, noteChanged, rulesMem, sizesChanged } from '../../core/allowrules'
import type { RulesFacts } from '../../core/rulesrows'
import type { Prefs } from './prefs'
import type { View } from './logic'

export type ContextRead = { diet?: DietFacts; memory?: { notes: number } }

export const CONTEXT_FRESH_MS = 3 * 60_000
let kept: { key: string; at: number; read: Promise<ContextRead> } | undefined

async function readNow(i: Io, cwd: string, root: string): Promise<ContextRead> {
  const out: ContextRead = {}
  try {
    const { report, home } = await collectFiles(i, async () => true, cwd, root)
    // An instruction file whose size changed since this session first read it (names only)
    const changed = sizesChanged(report.files)
    if (changed.length > 0) {
      const now = await i.now()
      for (const name of changed) noteChanged(rulesMem, name, now)
    }
    const { lines, advice } = dietParts(report, home)
    out.diet = { files: report.files.length, tokens: report.totalTokens, heavy: dietHeavy(report), repeats: report.repeats.length, ...(report.repeats[0] === undefined ? {} : { first: shortText(report.repeats[0].line, FIRST_MAX) }), lines, advice }
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
  forgetSizes()
}

// Rules in force from this process's memory (core/allowrules.ts); nothing before the settings or an instruction file was seen
export function rulesFactsOf(fileCount: number): RulesFacts | undefined {
  const m = rulesMem
  if (!m.read && m.files.length === 0 && m.changed.length === 0) return undefined
  return { files: m.files.map(f => f.name), fileCount, allow: m.allow, deny: m.deny, read: m.read, changed: m.changed.map(c => c.name), clash: clashesOf(m.allow, m.deny) }
}

// The handoff note's marks at load, from facts already read (no program runs): the marks' checked or not checked hang on the session's checks and on git answering,
// and git is taken to answer where a branch is known. The press runs git (features/home/actions.ts) and both the shut row and the opened note then count its marks.
export const briefWork = (p: ProofState | undefined): boolean => p !== undefined && (p.edits > 0 || p.receipts.length > 0 || p.goal !== undefined)
export function loadBriefMarks(skip: boolean, cwd: string, proof: ProofState | undefined, branch: string | undefined, now: number): BriefMark[] | undefined {
  if (skip || cwd === '' || proof === undefined || !briefWork(proof)) return undefined
  return briefMarkLines({ now, cwd, proof, edited: [], ...(branch === undefined || branch === '' ? {} : { gitBranch: branch, gitFiles: [] }) }).marks
}

const hereHidden = (prefs: Prefs): boolean => (prefs.hidden ?? []).includes('here') || prefs.autoHidden?.includes('here') === true

// The unchecked lines of the handoff note; its claims line counts each claim, the one count the Checks card shows
const briefUnchecked = (marks: readonly BriefMark[], claims: number): number =>
  uncheckedOf(marks.filter(m => m.topic !== CLAIMS_TOPIC)) + (uncheckedOf(marks.filter(m => m.topic === CLAIMS_TOPIC)) > 0 ? Math.max(1, claims) : 0)

export function contextFactsOf(view: View, prefs: Prefs): ContextFacts {
  const p = prefs.proof
  const rec = view.here?.rec
  const work = briefWork(p)
  const rules = rulesFactsOf(prefs.context?.diet?.files ?? 0)
  return {
    ...(rules === undefined ? {} : { rules }),
    ...(view.now === undefined ? {} : { now: view.now }),
    ...(prefs.context?.diet === undefined ? {} : { diet: prefs.context.diet }),
    ...(prefs.context?.memory === undefined ? {} : { memory: prefs.context.memory }),
    // The row's count is the opened marks' count, the claims line counted as its claims (claimsUnchecked), so it says the same number as the Checks card
    brief: { on: prefs.values['brief.mode'] !== 'off', work, unverified: work ? briefUnchecked(prefs.briefMarks ?? [{ topic: CLAIMS_TOPIC, ok: claimsUnchecked(p) === 0 }], claimsUnchecked(p)) : 0, ...(prefs.briefMarks === undefined ? {} : { marks: prefs.briefMarks }) },
    keep: {
      ...(p?.goal?.text === undefined || p.goal.text === '' ? {} : { goal: p.goal.text }),
      ...(rec?.title === undefined || (p?.goal?.text !== undefined && p.goal.text !== '') ? {} : { session: rec.title }),
      ...(rec?.branch === undefined ? {} : { branch: rec.branch }),
      files: p?.files.length ?? 0,
      // One fact, one place: the compact verdict is the This session card's; this card says it only while that card is hidden (cards/here.tsx does the reverse)
      ...(prefs.rest === undefined || !hereHidden(prefs) ? {} : { rest: prefs.rest }),
    },
  }
}
