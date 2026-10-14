// What a press on the pane starts beyond a redraw: compact the chat now, start a skill, read the commands for the Skills card's search
import type { Io } from '../../core/io'
import { COUNTS_KEY, addCount } from '../../core/counts'
import { actedTitle } from '../../core/whatis'
import { COMMANDS_FRESH_MS, commandEntries, startSkillCommand } from '../../core/skills'
import { t, tr } from '../../core/lang'
import { compacting, notGoodNow, runCompaction } from '../compaction'
import type { CompactOps } from '../compaction'
import { dismissOpenEnds } from '../calm'
import { allowHeldOnce, dismissHeld, setHalt } from '../guard'
import { forgetPaneInbox } from '../inbox'
import type { HomeEngine } from './engine'
import { previewLast, previewNamed } from '../undo'
import { SAFETY_CP_FAILED, SAFETY_HALT_FAILED, SAFETY_HALT_SAID, SAFETY_RESUME_SAID } from '../../core/safetywords'
import { CONTEXT_BRIEF_FAILED, CONTEXT_BRIEF_SAID } from '../../core/contextwords'
import { briefMarks } from '../continuity'
import { PROMPT_FAILED, UNDO_FAILED, UNDO_SAID, promptOf } from './rowact'
import type { RowAction } from './rowact'
import { briefShown, compactAsk, flags, skillFind, undoShown } from './state'
import { isPrAction, runPrRow } from './cards/prs'
import { runPreview } from './preview'
import { runSetup } from './setup'
import { runDoRow } from './dorow'
import { fillOnce } from './fillonce'

export const UNDO_OPEN = 'safety:undo-last'
export const CHECKPOINT_OPEN = 'safety:cp-'
const UNDO_LINES_MAX = 12
export const BRIEF_OPEN = 'context:brief'

export const ALLOWED_SAID = 'Allowed once. Tell Claude to try the step again.'
export const DISMISSED_SAID = 'Dismissed. The step did not run, and nothing was allowed.'
export const ALLOW_NONE = 'No stopped step to allow: it is older than 30 minutes. If Claude tries it again, allow it then.'

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
    else if (a.kind === 'prompt') {
      const p = promptOf(a.prompt)
      if (a.prompt.ask === 'fix') {
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
      } else {
        try {
          const m = await briefMarks(i, await eng.cwd())
          briefShown.lines = [`${m.verified} of ${m.total} lines verified`, ...m.lines]
          flags.openWhat = BRIEF_OPEN
          i.toast(tr(CONTEXT_BRIEF_SAID), true)
        } catch {
          i.toast(tr(CONTEXT_BRIEF_FAILED), true)
        }
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
    await runCompaction({ how: 'button', sessionId: await ops.io.sessionId(), ops })
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
