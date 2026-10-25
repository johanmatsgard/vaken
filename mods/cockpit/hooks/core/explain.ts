// The explanation catalogue: every ledger title vaken writes has three plain sentences. Keys are imported from the blocks that write them, so a rename breaks the type check.
import { AWAKE_CAP_WHAT, AWAKE_WHAT, PORT_WHAT } from './crew3'

import { AWAY_DENY_WHAT, AWAY_OFF_WHAT, AWAY_ON_WHAT, HELD_WHAT as WORLD_HELD_WHAT, WARNED_WHAT as WORLD_WARNED_WHAT } from './guardworld'
import { ALLOW_SET_WHAT, ALLOW_USED_WHAT, DISMISS_WHAT, HALT_DENY_WHAT, HALT_WHAT, HELD_WHAT as GUARD_HELD_WHAT, RESUME_WHAT as HALT_LIFT_WHAT, WARNED_WHAT as GUARD_WARNED_WHAT } from './guard'
import { ANOMALY_WHAT, DRIFT_WHAT } from './proof2'
import { BLOCK_WHAT, LOOP_WHAT, THRASH_WHAT } from './loopbreaker'
import { BROKEN_WHAT, CHECKED_WHAT } from './stability'
import { CAP_DEPTH_WHAT, CAP_HOLD_WHAT, CAP_SPEND_WHAT, CAP_WHAT } from './agentcap'
import { COACH_WHAT } from './coach'
import { COLLIDE_WHAT } from './crew'
import { DIET_WHAT } from './diet'
import { DIGEST_WHAT } from './away'
import { ENV_WHAT, FENCE_WHAT, HELD_WHAT as MIGRATION_HELD_WHAT, WARNED_WHAT as MIGRATION_WARNED_WHAT } from './guardback'
import { EXTENDED_WHAT, HELD_WHAT as BUDGET_HELD_WHAT, WARNED_WHAT as BUDGET_WARNED_WHAT } from './budget'
import { FRESH_BRIEF_WHAT, FRESH_WHAT } from './freshstart'
import { KEEPER_STOP_WHAT, KEEPER_UNREAD_WHAT, KEPT_LOST_WHAT, KEPT_PAID_WHAT, KEPT_WHAT } from './cachekeeper'
import { NAMED_WHAT, RESTORED_WHAT } from './undo'
import { NEIGHBORS_WHAT } from './neighbors'
import { PACKET_WHAT } from './continuity'
import { PLAN_ASK_WHAT, PLAN_SUGGEST_WHAT } from './planfirst'
import { GUARD_UPGRADE_WHAT, PRESETS, presetWhat } from './presets'
import { QUEUE_OFFER_WHAT, STEER_SEND_WHAT, STEER_STOP_WHAT } from './inbox'
import { REMIND_WHAT, RESUME_WHAT as LIMIT_RESUME_WHAT } from './resume'
import { LIMIT_GO_WHAT, LIMIT_PAUSE_WHAT } from './overnight'
import { LEAN_WHAT, RUN_FINISHED_WHAT, RUN_STARTED_WHAT, RUN_STOPPED_WHAT } from './ledger'
import { ROUTED_WHAT, WARNED_WHAT as SWITCH_WARNED_WHAT } from './route'
import { RULE_WHAT } from './rules'
import { STARTERS_WHAT } from './starters'
import { SETUP_WHAT } from './setupwords'
import { DO_RAN_WHAT } from './dowords'
import { UNPROVEN_WHAT } from './proof'
import { UPDATE_WHAT } from './trust'
import { LOOK_WHAT } from './eyes'
import { WOULD_WHAT } from './compactrest'
import { shownTitle, startOfDay } from './ledger'
import type { HelpEntry } from './registry'
import { timesWord } from './words'
import { fillIn, same } from './fillin'
import { langNow, t as tHere, trFill } from '../i18n/t'
import type { Lang } from '../i18n/types'
import { fmt } from './fmt'
import { sysWord, wordSystemNow } from './syswords'

export const EXPLAIN_HELP: HelpEntry[] = [
  { title: 'Why vaken tells you things', text: 'Open a line of the Autopilot card, when it shows, to see what vaken saw, why it matters and what you can do. /vaken-explain says the same in the session. It never changes anything.' },
]

type Explain = { means: string; why: string; next: string }
export const EXPLAIN_MAX = 160
export const SHAPE_WHAT = 'Changed the answer shape'

const e = (title: string, means: string, why: string, next: string): [string, Explain] => [title, { means, why, next }]

const ENTRIES: [string, Explain][] = [
  e(LOOP_WHAT, 'Claude ran the same step 3 times in a row, and it failed the same way each time.', 'More tries only use up your plan. Claude was told to change its approach.', 'To stop the next try, set Settings > Safety > Loop breaker to Stop. /vaken-help run loops lists the repeated failures.'),
  e(BLOCK_WHAT, "A step had failed 3 times the same way. Vaken stopped Claude's next try of it.", 'Claude would only repeat the failure and use up your plan.', 'Send a new message to lift the stop. To avoid such stops, set Settings > Safety > Loop breaker to Warn.'),
  e(THRASH_WHAT, 'Claude edited one file 5 times in 10 minutes while steps kept failing in between. Claude was told; nothing was stopped.', 'Another edit of the same file may not fix it. Claude may be guessing.', 'Look at the file, or ask Claude what it thinks is wrong. Turn it off: Settings > Safety > Loop breaker.'),

  e(UNPROVEN_WHAT, 'Claude said the tests pass, the work is done or it is fixed, but no passing check backs this up. Nothing was stopped.', 'Claude can be wrong about its own work. A check that passed is the proof.', 'Ask Claude to run the checks and show the result. /vaken-ship proof shows what ran. Settings > Safety > Claims switches this off.'),
  e(DRIFT_WHAT, 'At least 5 edits went to new folders that do not match your goal. Nothing was stopped.', 'Claude may have wandered away from the task you gave it.', 'Check the files it changed; if it was on purpose, ignore this. /vaken-tasks goal sets the goal. Settings > Advanced > Goal drift warning turns this off.'),
  e(ANOMALY_WHAT, 'Claude looked stuck: one file edited 6 times in one answer, 15 calls with no file changed and a lot of text read, or 3 failures of one kind of command.', 'A stuck Claude uses up your plan and gets nowhere.', 'Read the details and ask Claude what is wrong. It was told to explain. Settings > Advanced > Odd-change warning turns this off.'),

  e(GUARD_HELD_WHAT.destructive, 'Claude tried a command that can destroy data, such as a delete, a force-push or a wipe. Vaken stopped it and told Claude.', 'Many of these cannot be undone.', 'If safe, press Allow once in Needs you (for 30 min) or type /vaken-guard allow once there, then ask Claude to retry. See Settings > Safety > Risky commands.'),
  e(GUARD_WARNED_WHAT.destructive, 'Claude ran a command that can destroy data, such as a delete, a force-push or a wipe. Claude was told to tell you; nothing was stopped.', 'Many of these cannot be undone.', 'Read the details and check the result. To stop such commands first, set Settings > Safety > Risky commands to Stop.'),
  e(GUARD_HELD_WHAT.scope, 'Claude tried to edit a file outside your folders, or a protected file. Vaken stopped the edit and told Claude.', 'An edit outside the project can break other work.', 'If it is right, press Allow once in Needs you (it shows for 30 minutes), or type /vaken-guard allow once in that session. Then tell Claude to try again.'),
  e(GUARD_WARNED_WHAT.scope, 'Claude edited a file outside your folders, or a protected file. Claude was told to tell you; nothing was stopped.', 'An edit outside the project can break other work.', 'Check the file. /vaken-guard scope <folders> sets the allowed folders. Settings > Safety > Only your folders can stop such edits.'),
  e(GUARD_HELD_WHAT.packages, 'Claude tried to install a package that looks odd: very new, a look-alike name or deprecated. Vaken stopped it.', 'A bad package can run harmful code on your computer.', 'If safe, press Allow once in Needs you (for 30 min) or type /vaken-guard allow once there, then ask Claude to retry. See Settings > Safety > New packages.'),
  e(GUARD_WARNED_WHAT.packages, 'Claude installed a package that looks odd: very new, a look-alike name or deprecated. Claude was told to tell you; nothing was stopped.', 'A bad package can run harmful code on your computer.', 'Check the package name. Settings > Safety > New packages can stop such installs.'),
  e(GUARD_HELD_WHAT.tests, 'Claude tried to change a test so that it skips or checks less. Vaken stopped the edit and told Claude.', 'A weakened test can hide a real bug.', 'If the change is right, press Allow once in Needs you (for 30 min) or type /vaken-guard allow once there. If not, ask Claude to fix the code.'),
  e(GUARD_WARNED_WHAT.tests, 'Claude changed a test so that it skips or checks less. Claude was told to tell you; nothing was stopped.', 'A weakened test can hide a real bug.', 'Look at the test change and ask Claude to fix the code instead. Settings > Safety > Test changes can stop such edits.'),

  e(HALT_WHAT, 'You pressed Pause this session or typed /vaken-pause. Commands, edits, tools, agents, web fetches and skills are paused until you resume.', 'It is the emergency stop for doing things. Reading and thinking still work.', 'Press Resume in Needs you or on the Safety card, or type /vaken-pause off, when you want Claude to work again.'),
  e(HALT_LIFT_WHAT, 'The pause of this session ended. Steps that change things work again.', 'Claude can edit files and run commands again.', 'Type /vaken-pause to pause this session again, or press Pause this session on the Safety card, when it shows.'),
  e(HALT_DENY_WHAT, 'This session was paused, and Claude tried a step that changes things. Vaken stopped it.', 'This is what Pause this session is for. Such steps stay stopped while it lasts.', 'Press Resume in Needs you or on the Safety card, or type /vaken-pause off, to let Claude work again.'),
  e(ALLOW_SET_WHAT, 'You pressed Allow once or typed /vaken-guard allow once. The stopped step may go through, one time.', 'It is your yes for one step that the safety check would stop. It fades after 30 minutes.', 'Tell Claude to try the step again. It does not run by itself. If Claude does not try it, the yes just ends.'),
  e(ALLOW_USED_WHAT, 'A step that the safety check would stop went through, because you had allowed one.', 'The allowance is used up. The next step is stopped again.', 'Check what the step did. The next stopped step waits for your Allow once again.'),
  e(DISMISS_WHAT, 'You pressed Dismiss on a stopped step. It left Needs you, and nothing was allowed.', 'The step never ran. If Claude tries it again, it is stopped again.', 'Nothing to do. If you want the step after all, tell Claude to try again and press Allow once then.'),

  e(WORLD_HELD_WHAT.world, 'Claude tried a step that reaches outside your computer, such as a message, a post, a payment or a cloud change. Vaken stopped it.', 'It affects other people or services, and often cannot be undone.', 'If it is right, press Allow once in Needs you (it shows for 30 minutes), or type /vaken-guard allow once in that session. Then tell Claude to try again.'),
  e(WORLD_WARNED_WHAT.world, 'Claude ran a step that reaches outside your computer, such as a message, a post, a payment or a cloud change. Claude was told; nothing was stopped.', 'It affects other people or services, and often cannot be undone.', '/vaken-guard outbox lists what left your computer. Settings > Safety > Outside actions can stop such steps first.'),
  e(WORLD_HELD_WHAT.secrets, 'Claude tried a step that touches a secret, such as a key or a password file. Vaken stopped it, or kept the result from Claude.', 'A secret that enters the session can leak.', 'If safe, press Allow once in Needs you (for 30 min) or type /vaken-guard allow once there, then ask Claude to retry. See Settings > Safety > Secrets.'),
  e(WORLD_WARNED_WHAT.secrets, 'A step touched a secret, such as a key or a password file. Claude was told not to repeat it; nothing was stopped.', 'A secret that enters the session can leak.', 'Check that no key or password was shown. Settings > Safety > Secrets can stop such steps first.'),

  e(MIGRATION_HELD_WHAT, 'Claude tried to run a database migration. Vaken stopped it and told Claude.', 'A migration changes your database and is hard to undo.', 'If safe, press Allow once in Needs you (for 30 min) or type /vaken-guard allow once there, then ask Claude to retry. See Settings > Safety > Migrations.'),
  e(MIGRATION_WARNED_WHAT, 'Claude ran a database migration. Claude was told to tell you; nothing was stopped.', 'A migration changes your database and is hard to undo.', 'Check the database. Settings > Safety > Migrations can stop migrations first.'),
  e(ENV_WHAT, 'Code that Claude wrote reads an env name (a named setting, such as a key) that no env file lists. Nothing was stopped.', 'The code may fail on another computer, where the name is missing.', 'Claude should add the name, never the value, to .env.example.'),
  e(FENCE_WHAT, 'Text from the web, another app or a downloads folder held a sentence that reads like an order to Claude. Claude was told to ignore it.', 'A hidden order can make Claude do things you did not ask for.', '/vaken-guard fence shows how often this happened. Ask Claude what the text said before you go on.'),

  e(AWAY_ON_WHAT, 'You typed /vaken-away on. Vaken knows you are gone.', 'While you are away, it can stop risky steps by itself, if While away is set to Careful.', 'Type /vaken-away off when you are back. It then shows what happened.'),
  e(AWAY_OFF_WHAT, 'Away mode ended, by you or at the end of the time you set.', 'Steps are checked as before.', '/vaken-away digest shows what happened while you were away.'),
  e(AWAY_DENY_WHAT, 'You were away. Claude tried a risky step, and vaken stopped it without asking.', 'Nobody was there to say yes. A stopped step does no harm.', 'Read the details when you are back. Settings > Safety > While away turns this off.'),
  e(DIGEST_WHAT, 'Away mode ended, and vaken wrote a summary: which sessions finished or needed you, what it stopped, and about what it cost.', 'You can catch up in one read.', '/vaken-away digest shows the summary again.'),

  e(QUEUE_OFFER_WHAT, 'A session was quiet, so vaken showed a sentence you had queued as a dim suggestion in the prompt box.', 'The next job starts with one key.', 'Press Tab to take the sentence. /vaken-pause steer lists the sentences you queued.'),
  e(STEER_STOP_WHAT, 'You typed /vaken-pause steer stop. Vaken paused this session and cancelled the running answer, if there was one.', 'Steps that change things stop while you look.', 'Press Resume in Needs you or on the Safety card, or type /vaken-pause off, when you want Claude to work again.'),
  e(STEER_SEND_WHAT, 'You sent a message from this session to another one, after you said yes.', 'You can tell another session what to do without switching to it.', '/vaken inbox shows what waits in each session.'),

  e(NAMED_WHAT, 'You saved a named checkpoint: a copy of every file that changed so far.', 'You can go back to this point if later work goes wrong.', '/vaken-undo name <name> shows what going back would do. Nothing is restored until you add yes.'),
  e(RESTORED_WHAT, 'You restored files from the copies that vaken kept before a change.', 'The old text is back in those files.', 'Check the files. /vaken-undo lists the last changed files.'),

  e(BUDGET_WARNED_WHAT, 'Your cost estimate for the session or the day reached 80% or 100% of its budget. You were told; nothing was stopped.', 'The figure is an estimate. It tells you to slow down before the plan runs short.', '/vaken-usage budget shows the figures. Settings > Money and plan > Budget sets the limits.'),
  e(BUDGET_HELD_WHAT, 'The budget was reached, and Claude tried a costly step such as an agent. Vaken stopped it.', 'Agents use the most plan usage.', 'Type /vaken-usage budget extend to lift the limit, or raise Settings > Money and plan > Session budget.'),
  e(EXTENDED_WHAT, 'You typed /vaken-usage budget extend. The budget was raised so costly steps can run again.', 'The old limit had been reached.', '/vaken-usage budget shows the new figures.'),
  e(ROUTED_WHAT, 'Claude started an agent that only looks things up, and vaken ran it on a cheaper model.', 'A lookup does not need the biggest model. This saves plan usage.', '/vaken-tasks route shows the details. Settings > Agents > Agent models sets Off, Suggest or Auto.'),
  e(SWITCH_WARNED_WHAT, 'You switched model in a long session while its saved copy (the cache) was warm. Vaken warned you first.', 'A switch throws the saved copy away, and writing it again costs usage.', 'Switch model only at the start of a new session. Settings > Agents > Agent models: Off also stops this warning.'),
  e(LIMIT_RESUME_WHAT, 'The plan limit had stopped an answer. After the reset, vaken sent "continue" for you.', 'The work goes on without you at the screen.', '/vaken-help run after-limit off cancels it. Settings > Money and plan > After a limit sets Off, Remind or Resume.'),
  e(LIMIT_PAUSE_WHAT, 'The plan limit stopped agents of your task run. Their tasks wait again, and the run paused until the limit resets.', 'An agent that runs into the limit only fails. Waiting keeps the work for later.', 'Press Go on, on the Agents card, after the reset. /vaken-tasks afterlimit go makes a run go on by itself.'),
  e(LIMIT_GO_WHAT, 'The plan limit had paused your task run. The limit reset, so the run went on by itself.', 'The run can finish while you are away.', '/vaken-tasks report shows the result when it ends.'),
  e(LEAN_WHAT, 'Vaken cut long output (logs, big reads, repeated reminders) before Claude read it. One row a day counts the cuts.', 'Less text to read means fewer tokens used. The saving is an estimate.', 'Nothing. Settings > Money and plan > Lean session changes it.'),
  e(RUN_STARTED_WHAT, 'You started a task run. Vaken began handing its tasks to agents.', 'The log shows when the work began and how many tasks it holds.', '/vaken-tasks shows the run. /vaken-tasks stop ends it.'),
  e(RUN_FINISHED_WHAT, 'Every task of your task run ended: done, failed or skipped.', 'You can read the result without watching the run.', '/vaken-tasks report shows the result.'),
  e(RUN_STOPPED_WHAT, 'You stopped your task run. Running agents were told to stop, and no new one starts.', 'Stopping keeps work from going on without you.', '/vaken-tasks again runs it once more.'),
  e(REMIND_WHAT, 'The plan limit stopped an answer. Vaken told you when the limit resets.', 'You know when you can go on.', 'Send "continue" after the reset. Settings > Money and plan > After a limit can do it for you.'),
  e(KEPT_WHAT, 'The session was quiet, so vaken sent Claude one tiny question to keep the saved copy of the session (the cache) warm.', 'A cold cache makes your next message cost more. This costs a little usage; the card shows the money saved once the cache is used.', 'Settings > Money and plan > Keep session cheap turns it off. /vaken-help run keeper shows when it last asked.'),
  e(KEPT_PAID_WHAT, 'Your next message used the warm cache. Vaken counted the money that saved, less what keeping it warm cost.', 'Writing the cache again costs far more than reading it.', 'Nothing. The Autopilot card shows the money on the Kept the session cheap row.'),
  e(KEPT_LOST_WHAT, 'You came back after the cache had gone stale, so keeping it warm cost a little and saved nothing.', 'Vaken counts the misses too, so the money it shows is honest.', 'Nothing. Settings > Money and plan > Keep session cheap turns the keeper off.'),
  e(KEEPER_STOP_WHAT, 'The cache had gone stale when the keeper read it, so that read paid for a rewrite. The keeper stopped for this break.', 'More reads of a stale cache would only cost.', 'Nothing. Settings > Money and plan > Keep session cheap turns the keeper off.'),
  e(KEEPER_UNREAD_WHAT, 'The keeper tried to read the cache and got no answer, so it could not keep it warm.', 'Without a read, the cache can go stale during your break.', '/vaken-help run keeper shows the state. Settings > Money and plan > Keep session cheap turns it off.'),
  e(CAP_WHAT, 'Claude started an agent while your limit was already reached. You were warned; nothing was stopped.', 'Many agents at once slow your laptop and use your plan fast.', 'Wait for one to finish. Settings > Agents > Agent cap and Most at once change the limit.'),
  e(CAP_DEPTH_WHAT, 'An agent tried to start an agent more than 2 levels deep. Vaken stopped it and told Claude.', 'Agents that start agents can spread far and spend fast.', 'Claude does the step itself. Settings > Agents > Agent cap set to Warn lifts the stop.'),
  e(CAP_SPEND_WHAT, 'Your request had cost as much as its agent limit, so vaken stopped the next agent and told Claude.', 'One request should not use a big part of your plan without you knowing.', 'Send a new message to start a new count. /vaken-settings cap.spend raises the limit.'),
  e(CAP_HOLD_WHAT, 'Claude tried to start an agent while your limit was reached. Vaken stopped it and told Claude.', 'Many agents at once slow your laptop and use your plan fast.', 'Wait for one agent to finish. Settings > Agents > Most at once raises the limit.'),

  e(DIET_WHAT, 'Your CLAUDE.md files, which Claude reads on every answer, are big or repeat lines. You were told once.', 'A big file costs plan usage all day.', '/vaken-help run diet lists the files and the lines that appear twice. Trim what you can.'),
  e(STARTERS_WHAT, 'You asked for the starter agents, and vaken saved them in your agents folder.', 'You get a cheap agent that looks things up and a reviewer for changes.', '/vaken-tasks agents lists them. Delete the files to remove them.'),
  e(SETUP_WHAT, 'You pressed a row of Agent setup, and vaken wrote one agent file or its block in your project CLAUDE.md.', 'The file follows your choices. A copy of what was there was saved first.', '/vaken-help run setup lists the files and what differs. The copy sits beside the file as .bak.'),
  e(DO_RAN_WHAT, 'You typed /vaken-help run do or pressed a command from Claude\'s last answer, and vaken ran it on this computer after the safety check looked at it.', 'You can finish a step from your phone without the desk.', '/vaken-help run do lists the commands in the last answer. Settings > Agents > Run commands turns it off.'),
  e(COACH_WHAT, 'You asked for the same kind of thing 3 times. Vaken offered to save it as a skill.', 'A skill is a saved instruction. Next time you type one word.', '/vaken-help run coach make <name> saves it as a skill. Settings > Prompts and memory > Skill coach turns the offers off.'),
  e(RULE_WHAT, 'Claude ran a shell command that your CLAUDE.md says never to use. Nothing was stopped.', 'Claude did not follow a rule you wrote.', '/vaken-memory rules lists the rules. Settings > Prompts and memory > Rules count sets Warn, Count only or Off.'),
  e(UPDATE_WHAT, 'A plugin has a new version since your last session.', 'A plugin can change what Claude does. You should know when it changes.', '/vaken-help run trust lists your plugins and what each one can do.'),
  e(CHECKED_WHAT, 'The app updated, and vaken tested its own parts. All of them passed.', 'An update can break a part without any sign.', 'Nothing. /vaken-help run health shows the results.'),
  e(BROKEN_WHAT, 'Vaken tested its own parts, and at least one failed. The rest keeps working.', 'The failed part may not work.', '/vaken-help run health shows which part failed. A new version of vaken may fix it.'),
  e(PACKET_WHAT, 'Vaken wrote a file (.claude/cockpit-packet.md) that tells a new session where this work stands.', 'A new session starts empty. The file saves you from explaining it again.', 'Open the file to check it. In the new session, ask Claude to read it. /vaken-help run packet shows it.'),
  e(SHAPE_WHAT, 'You changed how Claude shapes its answers: Short, Report or Default.', 'The new shape applies from your next message.', '/vaken-settings shape shows the shape and changes it.'),

  e(PLAN_SUGGEST_WHAT, 'Your message looked like a big task (long, or with two big verbs), and few files had changed. Vaken suggested a plan first.', 'A short plan costs less than a redo.', 'Ask Claude for a plan. /vaken-explain planfirst says why. Settings > Prompts and memory > Plan first sets Suggest, Ask or Off.'),
  e(PLAN_ASK_WHAT, 'Your message looked like a big task. Vaken told Claude to write a short plan and wait for your yes.', 'A short plan costs less than a redo.', 'Read the plan, then say yes or change it. Settings > Prompts and memory > Plan first turns this off.'),
  e(FRESH_WHAT, 'Your new message is on a new topic, and the session is big. Only you were told.', 'A fresh session costs less than carrying the whole old session along.', 'Start a new session for the new topic. /vaken-explain fresh says why. Settings > Prompts and memory > Fresh-start nudge turns it off.'),
  e(FRESH_BRIEF_WHAT, 'You pressed Start fresh. Vaken saved a short brief of this session and copied a line to paste.', 'A new session starts empty. The brief saves you from explaining the work again.', 'Open a new session and paste the line. /vaken-explain fresh says why.'),

  e(COLLIDE_WHAT, 'Claude was about to edit a file that another live session edited in the last 30 minutes. Nothing was stopped.', 'Two sessions can undo each other\'s work.', '/vaken-help run claims lists who edits what. Wait for the other session. Settings > Agents > File overlap turns this off.'),
  e(NEIGHBORS_WHAT, 'Another live session works in the same folder as this one. Only you were told.', 'Two sessions in one folder can change the same files.', '/vaken neighbors lists them. Give one session its own worktree. Settings > Agents > Two in one folder turns this off.'),
  e(PORT_WHAT, 'Claude was about to start a server on a port that another session holds. Nothing was stopped.', 'Two servers cannot share a port. One fails, or you see the wrong app.', '/vaken-help run ports lists the ports. Ask Claude to use another port. Settings > Advanced > Shared ports turns this off.'),
  e(AWAKE_WHAT, 'An agent was working, a phone was connected, or a question waited, so vaken kept your Mac awake.', 'A sleeping Mac stops the work.', '/vaken-help run awake shows the state. Settings > Agents > Keep Mac awake turns it off.'),
  e(AWAKE_CAP_WHAT, 'Vaken had kept your Mac awake for 8 hours in a row, which is the most it allows. It let the Mac sleep.', 'A Mac that never sleeps wears the battery and the screen.', '/vaken-help run awake shows the state. Settings > Agents > Awake when away sets what counts.'),

  e(LOOK_WHAT, 'You pressed a picture on the Preview card, and vaken took pictures of your page with Chrome in the background.', 'You can see how the page looks at phone, iPad and desktop size.', 'The pictures are in the project folder; nothing is sent to Claude. Ask Claude to look at one if you want it to see it.'),

  e(WOULD_WHAT, 'Compacting is set to Watch only. Claude had finished and nothing was running, so vaken would have compacted now. It did nothing.', 'This log shows whether the rule picks good moments before Auto may act on it.', '/vaken-compact shows each check and its value. Settings > Money and plan > Compact by itself sets Auto when the moments look right.'),

  ...PRESETS.map(p => e(presetWhat(p.title), `You applied ${p.title} (typed as ${p.name}): a named set of Settings choices.`, 'One step changes many choices at once.', '/vaken-settings preset lists the presets. Settings shows each choice, and you can change any of them.')),
  // Old ledger lines name the preset by its id.
  ...PRESETS.map(p => e(presetWhat(p.name), `You applied ${p.title} (typed as ${p.name}): a named set of Settings choices.`, 'One step changes many choices at once.', '/vaken-settings preset lists the presets. Settings shows each choice, and you can change any of them.')),
  e(GUARD_UPGRADE_WHAT, 'Once, after an update, vaken cleared a saved Warn for Risky commands or Secrets. They still warn, and stop again where Claude Code would not ask first.', 'An older version saved that Warn when you picked a mode, which turned off the stop for destroying data and exposing secrets.', 'See Settings > Safety > Risky commands and Settings > Safety > Secrets. Set them to Warn there if you want them never to stop.'),
]

export const EXPLAIN: Record<string, Explain> = Object.fromEntries(ENTRIES)
export const EXPLAIN_TITLES: readonly string[] = ENTRIES.map(x => x[0])


export function plainTitle(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s*\(?\s*(once|\d+ times?)( today| in \d+ days?)?\s*\)?\s*\.?$/, '')
    .replace(/\.$/, '')
    .trim()
}

const PLAIN = new Map([...EXPLAIN_TITLES.map(t => [plainTitle(sysWord(shownTitle(t), 'win32')), t] as const), ...EXPLAIN_TITLES.map(t => [plainTitle(shownTitle(t)), t] as const), ...EXPLAIN_TITLES.map(t => [plainTitle(t), t] as const)])

export function titleFor(what: string): string | undefined {
  if (Object.prototype.hasOwnProperty.call(EXPLAIN, what)) return what
  return PLAIN.get(plainTitle(what))
}

export function explainFor(what: string): Explain | undefined {
  const t = titleFor(what)
  if (t === undefined) return undefined
  const x = EXPLAIN[t]
  return wordSystemNow() === 'win32' ? { means: sysWord(x.means), why: sysWord(x.why), next: sysWord(x.next) } : x
}


const TIMES_MAX = 3
const DETAIL_MAX = 110
export const LINES_MAX = 14
const DAY = 24 * 3_600_000

export const agoWord = (ms: number, lang: Lang = 'en'): string => fmt.ago(Math.max(0, ms), 'days', lang)

const cut = (text: string, max: number): string => {
  const t = text.replace(/\s+/g, ' ').trim()
  return t.length > max ? `${t.slice(0, max - 1)}…` : t
}

type Row = { at: number; detail?: string }
type Kind = { what: string; n: number; last: number }

export function explainLines(what: string, rows: Row[], now: number, say: (s: string) => string = same): string[] {
  const title = titleFor(what) ?? what
  const week = rows.filter(r => r.at >= now - 7 * DAY && r.at <= now)
  const found = explainFor(what)
  // The count in the language of the answer (English for a caller that passes no `say`)
  const times = say === same ? timesWord(week.length) : tHere('words.times', { n: week.length })
  const lines = [fillIn(say('{title} ({times} in 7 days)'), { title: say(shownTitle(title)), times })]
  if (found === undefined) lines.push(say('There is no explanation for this line yet.'))
  else lines.push(`${say('What it means:')} ${say(found.means)}`, `${say('Why:')} ${say(found.why)}`, `${say('What you can do:')} ${say(found.next)}`)
  const last = [...rows].sort((a, b) => b.at - a.at).slice(0, TIMES_MAX)
  if (last.length > 0) {
    lines.push('', say('The last times:'))
    for (const r of last) lines.push(`  ${agoWord(now - r.at, say === same ? 'en' : langNow())}${r.detail === undefined || r.detail.trim() === '' ? '' : `: ${say === same ? cut(r.detail, DETAIL_MAX) : trFill(cut(r.detail, DETAIL_MAX))}`}`)
  }
  return lines.slice(0, LINES_MAX)
}

export function recentKinds(rows: { at: number; what: string }[], now: number, n: number): Kind[] {
  const from = startOfDay(now)
  const out: Kind[] = []
  for (const r of [...rows].sort((a, b) => b.at - a.at)) {
    if (r.at < from || r.at > now) continue
    const old = out.find(k => k.what === r.what)
    if (old === undefined) out.push({ what: r.what, n: 1, last: r.at })
    else old.n += 1
  }
  return out.slice(0, n)
}

const wordsOf = (text: string): string[] => text.toLowerCase().split(/[^a-z0-9]+/).filter(w => w !== '')

export function matchTitles(words: string, titles: readonly string[], lastAt: (title: string) => number): string[] {
  const asked = wordsOf(words)
  if (asked.length === 0) return []
  return titles.filter(t => asked.every(w => t.toLowerCase().includes(w))).sort((a, b) => lastAt(b) - lastAt(a) || a.localeCompare(b))
}

export function closestTitles(words: string, titles: readonly string[], n: number, lastAt: (title: string) => number): string[] {
  const asked = wordsOf(words)
  const score = (t: string): number => {
    const low = t.toLowerCase()
    return asked.filter(w => low.includes(w) || (w.length > 3 && wordsOf(low).some(x => x.startsWith(w.slice(0, 4))))).length
  }
  return [...titles].sort((a, b) => score(b) - score(a) || lastAt(b) - lastAt(a) || a.localeCompare(b)).slice(0, n)
}
