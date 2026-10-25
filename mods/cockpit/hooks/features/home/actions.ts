// What a press on the pane starts beyond a redraw: compact the chat now, start a skill, read the commands for the Skills card's search
import { notePress } from '../../core/offerlearn'
import type { Io } from '../../core/io'
import { COUNTS_KEY, addCount } from '../../core/counts'
import { actedTitle } from '../../core/whatis'
import { COMMANDS_FRESH_MS, commandEntries, startSkillCommand } from '../../core/skills'
import { t, tr } from '../../core/lang'
import { compacting, notGoodNow, runCompaction } from '../compaction'
import type { CompactOps } from '../compaction'
import { dismissOpenEnds } from '../calm'
import { allowHeldOnce, dismissHeld, keepHeldStopped, setHalt } from '../guard'
import { KEPT_SAID, RULE_COPIED, RULE_DISMISSED, RULE_NOT_COPIED, dropDenied, dropOffer } from '../../core/allowrules'
import { forgetPaneInbox } from '../inbox'
import type { HomeEngine } from './engine'
import { previewLast, previewNamed } from '../undo'
import { SAFETY_CP_FAILED, SAFETY_HALT_FAILED, SAFETY_HALT_SAID, SAFETY_RESUME_SAID } from '../../core/safetywords'
import { CONTEXT_BRIEF_FAILED } from '../../core/contextwords'
import { briefMarks, writeFreshBrief } from '../continuity'
import { FRESH_BAND_ID, FRESH_BRIEF_COPIED, FRESH_BRIEF_FAILED, FRESH_BRIEF_SAID, FRESH_BRIEF_WHAT, freshBriefLine } from '../../core/freshstart'
import { clearBand } from '../../core/band'
import { LEDGER_KEY, pushLog } from '../compaction'
import { PROMPT_FAILED, UNDO_FAILED, UNDO_SAID, promptOf } from './rowact'
import type { RowAction } from './rowact'
import { briefShown, compactAsk, flags, skillFind, undoShown } from './state'
import { isPrAction, runPrRow } from './cards/prs'
import { picturePrompt, runPreview } from './preview'
import { runSetup } from './setup'
import { runDoRow } from './dorow'
import { fillOnce } from './fillonce'
import { QUICK_BUSY, clearPicks, nextMem } from '../../core/actions'
import { askPrompt } from '../../core/welcome'
import { nightFixPrompt, nightLead, nightMem, promisePrompt } from '../../core/night'
import { HISTORY_KEY, parseReports } from '../../core/overnight'
import { BACK_AWAY_MS } from '../../core/backcard'
import { glanceShutKey } from '../../core/headline'
import { safeFsOf } from '../../core/safewrite'
import { answerOffer } from '../teach'
import { teachMem } from '../../core/teach'
import { answerRepeat } from '../repeat'
import { REPEAT_ASKED, REPEAT_QUIETED, draftPrompt, repeatMem } from '../../core/repeat'
import { STUCK_QUEUED, STUCK_STRONG_SAID, freshStuckLine, strongPrompt, stuckMem } from '../../core/loopbreaker'
import { FINISH_FAILED, FINISH_QUEUED, FINISH_SAID, finishMem, finishPrompt } from '../../core/continuity'
import { FEWER_AGENTS_PROMPT, WHERE_AGENTS_SAID, WHERE_LEAN_FAILED, WHERE_LEAN_SAID } from '../../core/cost'
import type { WhereFix } from '../../core/cost'
import { writeSetting } from '../../core/settings'
import { leanMem } from '../../core/lean'
import { PUT_BACK_SAID, keepMem, putBackNote } from '../../core/compactcheck'
import { dropKeepGoing, setKeepGoing } from '../proof'

export const UNDO_OPEN = 'safety:undo-last'
export const CHECKPOINT_OPEN = 'safety:cp-'
const UNDO_LINES_MAX = 12
export const BRIEF_OPEN = 'context:brief'

export const ALLOWED_SAID = 'Allowed once. Tell Claude to try the step again.'
export const DISMISSED_SAID = 'Dismissed. The step did not run, and nothing was allowed.'
export const ALLOW_NONE = 'No stopped step to allow: it is older than 30 minutes. If Claude tries it again, allow it then.'

// The night lead is read again on the press, so the request names the failed tasks of the report shown.
async function pressPrompt(i: Io, a: { kind: 'nightFix' } | { kind: 'promise'; n: number }): Promise<string | undefined> {
  if (a.kind === 'promise') {
    const p = nightMem.promises[a.n]
    return p === undefined ? undefined : promisePrompt(p)
  }
  const lead = nightLead(parseReports(await i.get(HISTORY_KEY))[0], await i.now(), undefined, BACK_AWAY_MS)
  return lead === undefined || lead.failedTasks.length === 0 ? undefined : nightFixPrompt(lead)
}

// Put it back (core/compactcheck.ts): one short note to Claude with the kept items the last summary left out, sent only when Claude is not working.
export async function runPutBack(eng: HomeEngine): Promise<void> {
  const i = eng.io()
  const c = keepMem.last
  if (c === undefined || c.missing.length === 0) return
  if (nextMem.busy) {
    i.toast(tr(QUICK_BUSY), true)
    return
  }
  keepMem.last = undefined
  clearPicks()
  const r = (await eng.submit(putBackNote(c.missing)).catch(() => ({ drop: 'failed' }))) as { drop?: string } | undefined
  i.toast(tr(r !== undefined && r.drop !== undefined ? PROMPT_FAILED : PUT_BACK_SAID), true)
  i.invalidate()
}

// The stuck ladder's two presses (core/loopbreaker.ts). A stronger agent: one fixed request to Claude; while Claude works it waits for Claude's next step
// (finishMem, the way Finish safely does), else it is a message. It is offered only when a stronger model than the session's exists (offer.up).
// A fresh start: the fresh-start brief (features/continuity.ts), and one line to paste in a new session that runs the check there.
export async function runStuck(eng: HomeEngine, way: 'strong' | 'fresh'): Promise<void> {
  const i = eng.io()
  const o = stuckMem.offer
  if (o === undefined) return
  if (way === 'strong') {
    if (o.up === undefined) return
    const prompt = strongPrompt(o.kind, o.up)
    if (nextMem.busy) {
      // One waiting request at a time: a Finish safely already waiting keeps its place, and the offer stays.
      if (finishMem.note !== undefined) {
        i.toast(tr(QUICK_BUSY), true)
        return
      }
      stuckMem.offer = undefined
      await notePress(i, 'stuck')
      finishMem.note = prompt
      i.toast(tr(STUCK_QUEUED), true)
      i.invalidate()
      return
    }
    stuckMem.offer = undefined
    clearPicks()
    await notePress(i, 'stuck')
    const r = (await eng.submit(prompt).catch(() => ({ drop: 'failed' }))) as { drop?: string } | undefined
    i.toast(tr(r !== undefined && r.drop !== undefined ? PROMPT_FAILED : STUCK_STRONG_SAID), true)
  } else {
    try {
      const line = freshStuckLine(freshBriefLine(await writeFreshBrief(i, await eng.cwd())), o.kind)
      const copied = eng.copy === undefined ? false : await eng.copy(line).catch(() => false)
      stuckMem.offer = undefined
      await notePress(i, 'stuck', 'pressed', false)
      await pushLog(i, LEDGER_KEY, { at: await i.now(), session: await i.sessionId(), what: FRESH_BRIEF_WHAT, how: 'button', did: true })
      i.toast(tr(copied ? FRESH_BRIEF_COPIED : FRESH_BRIEF_SAID).replace('{line}', line), true)
    } catch {
      i.toast(tr(FRESH_BRIEF_FAILED), true)
    }
  }
  i.invalidate()
}

// Finish safely (Plan limits): the handover note first (continuity's fresh-start brief), then one fixed request. While Claude works the request goes with its
// next step's result (features/cost.ts), so it stops mid-turn at a safe point; when idle it is a message. No note, no request.
export async function runFinish(eng: HomeEngine): Promise<void> {
  const i = eng.io()
  let path: string
  try {
    path = await writeFreshBrief(i, await eng.cwd())
  } catch {
    i.toast(tr(FINISH_FAILED), true)
    return
  }
  await pushLog(i, LEDGER_KEY, { at: await i.now(), session: await i.sessionId(), what: FRESH_BRIEF_WHAT, how: 'button', did: true })
  const prompt = finishPrompt(path)
  if (nextMem.busy) {
    finishMem.note = prompt
    i.toast(tr(FINISH_QUEUED).replace('{path}', path), true)
  } else {
    clearPicks()
    const r = (await eng.submit(prompt).catch(() => ({ drop: 'failed' }))) as { drop?: string } | undefined
    i.toast(r !== undefined && r.drop !== undefined ? tr(PROMPT_FAILED) : tr(FINISH_SAID).replace('{path}', path), true)
  }
  i.invalidate()
}

// Where it went's one fix (core/cost.ts whereFixOf): Lean to All long output, compact now, or one request for fewer agents.
export async function runWhereFix(eng: HomeEngine, fix: WhereFix): Promise<void> {
  const i = eng.io()
  if (fix === 'compact') return compactNow(eng)
  if (fix === 'lean') {
    // Said only when the setting really changed
    const saved = await writeSetting(i, 'lean.mode', 'all').catch(() => false)
    if (saved) {
      leanMem.mode = 'all'
      i.toast(tr(WHERE_LEAN_SAID), true)
    } else i.toast(tr(WHERE_LEAN_FAILED), true)
  } else {
    if (nextMem.busy) {
      i.toast(tr(QUICK_BUSY), true)
      return
    }
    clearPicks()
    const r = (await eng.submit(FEWER_AGENTS_PROMPT).catch(() => ({ drop: 'failed' }))) as { drop?: string } | undefined
    i.toast(tr(r !== undefined && r.drop !== undefined ? PROMPT_FAILED : WHERE_AGENTS_SAID), true)
  }
  i.invalidate()
}

// Repeat to skill's two presses (core/repeat.ts). Draft the skill: one fixed request, sent only when Claude is not working (else the offer stays);
// Claude writes the file and the person reads it. Not now: the shape is quiet for 14 days. Vaken itself writes no file and reads no transcript.
export async function runRepeat(eng: HomeEngine, draft: boolean): Promise<void> {
  const i = eng.io()
  const o = repeatMem.offer
  if (o === undefined) return
  if (draft && nextMem.busy) {
    i.toast(tr(QUICK_BUSY), true)
    return
  }
  if (!draft) {
    await answerRepeat(i, false)
    i.toast(tr(REPEAT_QUIETED), true)
  } else {
    clearPicks()
    const r = (await eng.submit(draftPrompt(o.steps)).catch(() => ({ drop: 'failed' }))) as { drop?: string } | undefined
    const sent = r === undefined || r.drop === undefined
    // A request that did not go keeps the offer, so the press can be tried again
    if (sent) await answerRepeat(i, true)
    i.toast(tr(sent ? REPEAT_ASKED : PROMPT_FAILED), true)
  }
  i.invalidate()
}

// Only on a press, never by itself.
const sending = new Set<string>()
export async function runRow(eng: HomeEngine, a: RowAction): Promise<void> {
  if (a.kind === 'skill') return startSkill(eng, a.name)
  const i = eng.io()
  const id = JSON.stringify(a)
  if (sending.has(id)) return
  sending.add(id)
  try {
    if (isPrAction(a)) await runPrRow(eng, a)
    else if (a.kind === 'gotIt') await dismissOpenEnds(i)
    else if (a.kind === 'preview') await runPreview(eng, a.width)
    else if (a.kind === 'setup') await runSetup(eng, a.act)
    else if (a.kind === 'do') await runDoRow(eng, a.act)
    else if (a.kind === 'teach') {
      if (teachMem.offer !== undefined) await notePress(i, 'teach', a.save ? 'pressed' : 'dismissed', false)
      await answerOffer(i, safeFsOf(i), a.save)
      i.invalidate()
    } else if (a.kind === 'teachModel') {
      const m = teachMem.model
      teachMem.model = undefined
      if (m !== undefined && a.use) await runSetup(eng, { do: 'model', role: m.role, family: m.to })
      i.invalidate()
    }
    else if (a.kind === 'repeat') await runRepeat(eng, a.draft)
    else if (a.kind === 'stuck') await runStuck(eng, a.way)
    else if (a.kind === 'finishSafely') await runFinish(eng)
    else if (a.kind === 'whereFix') await runWhereFix(eng, a.fix)
    else if (a.kind === 'putBack') await runPutBack(eng)
    else if (a.kind === 'keepGoing') {
      if (a.act === 'dismiss') await dropKeepGoing(i)
      else await setKeepGoing(i, a.act === 'start' ? a.check : undefined)
    }
    else if (a.kind === 'ask' || a.kind === 'nightFix' || a.kind === 'promise' || a.kind === 'seePicture') {
      if (nextMem.busy) {
        i.toast(tr(QUICK_BUSY), true)
        return
      }
      const prompt = a.kind === 'ask' ? askPrompt(a.id) : a.kind === 'seePicture' ? picturePrompt(a.path, a.width) : await pressPrompt(i, a)
      if (prompt === undefined) return
      clearPicks()
      const r = (await eng.submit(prompt).catch(() => ({ drop: 'failed' }))) as { drop?: string } | undefined
      if (r !== undefined && r.drop !== undefined) i.toast(tr(PROMPT_FAILED), true)
      i.invalidate()
    } else if (a.kind === 'openHold') {
      // The stopped step's row in Needs you opens, with Allow once and Dismiss; a shut Needs you opens first.
      flags.paneView = 'cards'
      flags.openSections = flags.openSections.filter(k => !k.startsWith(`${glanceShutKey('needs')}:`))
      flags.openWhat = a.key
      i.invalidate()
    } else if (a.kind === 'openRun') {
      flags.paneView = 'runner'
      i.invalidate()
    }
    else if (a.kind === 'prompt') {
      const p = promptOf(a.prompt)
      if (a.prompt.ask === 'fix') {
        await notePress(i, 'fixit')
        i.toast(tr((await fillOnce(eng, p.text)) ? p.said : PROMPT_FAILED), true)
      } else {
        i.toast(tr(p.said), true)
        await eng.submit(p.text).catch(() => i.toast(tr(PROMPT_FAILED), true))
      }
    } else if (a.kind === 'undoLast') {
      if (flags.openWhat === UNDO_OPEN) {
        flags.openWhat = undefined
      } else {
        try {
          undoShown.lines = (await previewLast(i, await eng.cwd())).split('\n').filter(l => l.trim() !== '').slice(0, UNDO_LINES_MAX)
          undoShown.of = 'last'
          flags.openWhat = UNDO_OPEN
          i.toast(tr(UNDO_SAID), true)
        } catch {
          i.toast(tr(UNDO_FAILED), true)
        }
      }
      i.invalidate()
    } else if (a.kind === 'undoNamed') {
      const open = `${CHECKPOINT_OPEN}${a.name}`
      if (flags.openWhat === open) {
        flags.openWhat = undefined
      } else {
        try {
          undoShown.lines = (await previewNamed(i, await eng.cwd(), a.name)).split('\n').filter(l => l.trim() !== '').slice(0, UNDO_LINES_MAX)
          undoShown.of = a.name
          flags.openWhat = open
          i.toast(tr(UNDO_SAID), true)
        } catch {
          i.toast(tr(SAFETY_CP_FAILED), true)
        }
      }
      i.invalidate()
    } else if (a.kind === 'brief') {
      if (flags.openWhat === BRIEF_OPEN) {
        flags.openWhat = undefined
        briefShown.marks = undefined
      } else {
        try {
          // Git read now; the shut row then counts these same marks (features/home/load.ts), so both say one number; the opened note is the answer, no toast
          briefShown.marks = (await briefMarks(i, await eng.cwd())).marks
          flags.openWhat = BRIEF_OPEN
        } catch {
          i.toast(tr(CONTEXT_BRIEF_FAILED), true)
        }
      }
      i.invalidate()
    } else if (a.kind === 'freshBrief') {
      try {
        const line = freshBriefLine(await writeFreshBrief(i, await eng.cwd()))
        const copied = eng.copy === undefined ? false : await eng.copy(line).catch(() => false)
        await clearBand(i, FRESH_BAND_ID)
        await pushLog(i, LEDGER_KEY, { at: await i.now(), session: await i.sessionId(), what: FRESH_BRIEF_WHAT, how: 'button', did: true })
        i.toast(tr(copied ? FRESH_BRIEF_COPIED : FRESH_BRIEF_SAID).replace('{line}', line), true)
      } catch {
        i.toast(tr(FRESH_BRIEF_FAILED), true)
      }
      i.invalidate()
    } else if (a.kind === 'halt' || a.kind === 'resume') {
      try {
        await setHalt(i, await i.sessionId(), a.kind === 'halt', 'button')
        forgetPaneInbox()
        i.toast(tr(a.kind === 'halt' ? SAFETY_HALT_SAID : SAFETY_RESUME_SAID), true)
      } catch {
        i.toast(tr(SAFETY_HALT_FAILED), true)
      }
      i.invalidate()
    } else if (a.kind === 'keepStopped') {
      await keepHeldStopped(i, await i.sessionId(), 'button')
      forgetPaneInbox()
      i.toast(tr(KEPT_SAID), true)
      i.invalidate()
    } else if (a.kind === 'copyRule') {
      const copied = eng.copy === undefined ? false : await eng.copy(a.rule).catch(() => false)
      if (copied) {
        dropOffer(a.rule)
        dropDenied(a.rule)
      }
      i.toast(copied ? tr(RULE_COPIED) : tr(RULE_NOT_COPIED).replace('{rule}', a.rule), true)
      i.invalidate()
    } else if (a.kind === 'dismissRule') {
      dropOffer(a.rule)
      i.toast(tr(RULE_DISMISSED), true)
      i.invalidate()
    } else if (a.kind === 'dismissHold') {
      await dismissHeld(i, a.sid, 'button')
      forgetPaneInbox()
      i.toast(tr(DISMISSED_SAID), true)
      i.invalidate()
    } else {
      const g = await allowHeldOnce(i, await i.sessionId(), 'button', true)
      forgetPaneInbox()
      i.toast(tr(g.set ? ALLOWED_SAID : ALLOW_NONE), true)
      i.invalidate()
    }
  } catch {
  } finally {
    sending.delete(id)
  }
}

// A compaction's engine calls from the pane's (features/compaction.ts runs it): `/compact` as a command
const compactOpsOf = (eng: HomeEngine): CompactOps => ({
  io: eng.io(),
  cwd: () => eng.cwd(),
  probe: eng.probe ?? (async () => undefined),
  agents: eng.agentsRunning ?? (async () => 0),
  command: args => eng.command({ command: 'compact', args }),
})

export async function compactCheckLines(eng: HomeEngine, say: (name: string, vars?: Record<string, string | number>) => string): Promise<string[]> {
  const ops = compactOpsOf(eng)
  return notGoodNow(ops, await ops.io.sessionId(), say)
}

// Otherwise every check Auto waits for is asked: all pass, it compacts at once, any fails, the card shows why
export async function compactNow(eng: HomeEngine): Promise<void> {
  if (compacting.pending) return
  try {
    await notePress(eng.io(), 'compact', 'pressed', false)
    const lines = await compactCheckLines(eng, t)
    if (lines.length > 0) {
      compactAsk.lines = lines
      compactAsk.at = await eng.io().now()
      eng.io().invalidate()
      return
    }
    await compactAnyway(eng)
  } catch {
  }
}

// Never throws.
export async function compactAnyway(eng: HomeEngine): Promise<void> {
  compactAsk.lines = undefined
  try {
    const ops = compactOpsOf(eng)
    const end = await runCompaction({ how: 'button', sessionId: await ops.io.sessionId(), ops })
    if (end === 'sent') await notePress(ops.io, 'compact', 'worked', false)
  } catch {
    // runCompaction never throws; the session id read is the only other step
  }
}

export function compactNotNow(eng: HomeEngine): void {
  compactAsk.lines = undefined
  eng.io().invalidate()
}

// A skill is another plugin's or the person's own command, never this plugin's, so the engine runs it.
let skillStarting = false
export async function startSkill(eng: HomeEngine, name: string): Promise<void> {
  const i = eng.io()
  const command = startSkillCommand(name)
  if (command === undefined || skillStarting) return
  skillStarting = true
  try {
    await eng.command({ command })
    i.toast(tr('Started /{name}').replace('{name}', command), true)
  } catch {
    i.toast(tr('Could not start /{name} from here. Type /{name} in the session.').split('{name}').join(command), true)
  } finally {
    skillStarting = false
  }
}

// Reads the engine's list of commands and skills for the search box
export async function loadCommands(eng: HomeEngine, again = false): Promise<void> {
  try {
    const now = await eng.now()
    if (!again && skillFind.commands !== undefined && now >= skillFind.at && now - skillFind.at < COMMANDS_FRESH_MS) return
    skillFind.commands = commandEntries(await eng.commandList(), eng.pluginName())
    skillFind.at = now
    skillFind.failed = false
  } catch {
    skillFind.failed = skillFind.commands === undefined
  }
}

// The person acted on a line (opened its "What is this?" or went to its setting): counted beside the line
export async function noteActed(i: Io, what: string): Promise<void> {
  try {
    await i.set(COUNTS_KEY, addCount(await i.get(COUNTS_KEY), await i.now(), actedTitle(what)))
  } catch {
  }
}
