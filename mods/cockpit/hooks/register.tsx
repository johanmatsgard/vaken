// Vaken: one plugin, one module
import type { EngineInterface, Register } from 'claude-code'
import { withToastGate } from './core/io'
import type { Io } from './core/io'
import { homeFrom } from './core/platform'

import { registerAgentCap } from './features/agentcap'
import { registerAway } from './features/away'
import { registerAttention } from './features/attention'
import { registerTellMe } from './features/tellme'
import { registerCacheKeeper } from './features/cachekeeper'
import { registerCalm } from './features/calm'
import { registerCompaction } from './features/compaction'
import { registerCost } from './features/cost'
import { registerInsight } from './features/insight'
import { registerKeeper } from './features/keeper'
import { registerInbox } from './features/inbox'
import { registerContinuity } from './features/continuity'
import { registerCoach } from './features/coach'
import { registerRepeat } from './features/repeat'
import { registerCrew3 } from './features/crew3'
import { registerCrew } from './features/crew'
import { registerDiet } from './features/diet'
import { registerErrors } from './features/errors'
import { registerEyes } from './features/eyes'
import { registerGuard } from './features/guard'
import { registerGuardBack } from './features/guardback'
import { registerGuardWorld } from './features/guardworld'
import { registerHappened } from './features/happened'
import { registerHome } from './features/home'
import { registerLoopBreaker } from './features/loopbreaker'
import { registerAgentBoard } from './features/agentboard'
import { registerOrchestra } from './features/orchestra'
import { registerSimple } from './features/simple'
import { registerAssumptions } from './features/assumptions'
import { registerTaskList } from './features/tasklist'
import { registerNeighbors } from './features/neighbors'
import { registerExplain } from './features/explain'
import { registerFreshStart } from './features/freshstart'
import { registerCostHint } from './features/costhint'
import { registerPhone } from './features/phone'
import { registerPhoneDo } from './features/phonedo'
import { registerPlanFirst } from './features/planfirst'
import { registerStarters } from './features/starters'
import { registerSetup } from './features/setup'
import { registerPlain } from './features/plain'
import { registerPromptCheck } from './features/promptcheck'
import { registerShape } from './features/shape'
import { registerToday } from './features/today'
import { registerValue } from './features/value'
import { registerNotes } from './features/notes'
import { registerTeach } from './features/teach'
import { registerNight } from './features/night'
import { registerPresets } from './features/presets'
import { registerProof2 } from './features/proof2'
import { registerProof } from './features/proof'
import { registerResume } from './features/resume'
import { registerClaudeStatus } from './features/claudestatus'
import { registerRoute } from './features/route'
import { registerSteer } from './features/steer'
import { registerTrust } from './features/trust'
import { registerUndo } from './features/undo'
import { registerShip } from './features/ship'
import { flushSkills, isSkillsRun, keepListing, noteSkillUse, skillsAnswer, skillsFailed, skillsPending, skillsReady, wantsListing } from './features/skills'
import { registerStability } from './features/stability'
import { registerPressLog } from './features/presslog'
import { registerNextSteps } from './features/nextsteps'
import { registerLean } from './features/lean'
import { registerAllowRules } from './features/allowrules'
import { registerRelay } from './features/relay'

// IO-BLOCK-START
function io($: EngineInterface): Io {
  return withToastGate({
    now: () => $.clock.now(),
    home: () => homeFrom({ HOME: () => $.env.get('HOME'), USERPROFILE: () => $.env.get('USERPROFILE'), HOMEDRIVE: () => $.env.get('HOMEDRIVE'), HOMEPATH: () => $.env.get('HOMEPATH') }),
    sessionId: () => $.session.id(),
    get: key => $.store.get(key),
    set: (key, value) => $.store.set(key, value),
    del: key => $.store.delete(key),
    keys: () => $.store.keys(),
    read: path => $.fs.read(path),
    write: (path, text) => $.fs.write(path, text),
    run: (argv, init) => $.process.run(argv, init),
    ask: (question, options) => $.ui.ask(question, options),
    complete: req => $.model.complete(req),
    toast: text => $.ui.toast(text),
    invalidate: () => $.ui.invalidate('ui.render'),
  })
}
// IO-BLOCK-END

export const register: Register = on => {
  // Its word after /vaken-help run must reach it before the help page answers
  registerPressLog(on)
  // Its next steps are picked before Home's turn hook checks the band for a redraw
  registerNextSteps(on)
  registerLean(on)
  registerHome(on)
  registerCompaction(on)
  registerCacheKeeper(on)
  registerLoopBreaker(on)
  registerStability(on)
  registerAttention(on)
  registerTellMe(on)
  registerHappened(on)
  registerAgentCap(on)
  registerGuard(on)
  registerAllowRules(on)
  registerRelay(on)
  // RegisterAway wraps the away switch that registerGuardWorld registers, so it comes first
  registerAway(on)
  registerGuardWorld(on)
  registerInbox(on)
  // Hello on the phone: reads what the inbox reads
  registerPhone(on)
  // Run a command from the last answer: /vaken-help run do, for a phone and for the card
  registerPhoneDo(on)
  registerGuardBack(on)
  registerProof(on)
  registerProof2(on)
  registerCost(on)
  registerRoute(on)
  registerPlain(on)
  registerPromptCheck(on)
  registerAssumptions(on)
  registerTaskList(on)
  registerShape(on)
  registerValue(on)
  registerToday(on)
  // Focus and the open ends of yesterday
  registerCalm(on)
  registerFreshStart(on)
  registerCostHint(on)
  registerPlanFirst(on)
  registerStarters(on)
  registerSetup(on)
  registerNeighbors(on)
  registerAgentBoard(on)
  registerOrchestra(on)
  registerSimple(on)
  registerExplain(on)
  registerErrors(on)
  registerSteer(on)
  registerDiet(on)
  registerCrew(on)
  registerCrew3(on)
  registerEyes(on)
  registerTeach(on)
  registerNight(on)
  registerNotes(on)
  registerCoach(on)
  registerRepeat(on)
  registerInsight(on)
  registerPresets(on)
  registerResume(on)
  registerClaudeStatus(on)
  registerShip(on)
  registerUndo(on)
  registerTrust(on)
  registerContinuity(on)
  registerKeeper(on)

  // The Skills card: its hooks are written here, so the plugin directory reads each one where it is registered
  on('session.start', { cwd: /(?<skills>)/ }, async ($, e, next) => {
    const result = await next(e)
    // After next: the engine has finished starting, so its skill list is there. A failed read is tried again after a turn.
    try {
      const usage = await $.session.usage({ breakdown: 'summary' })
      await keepListing(io($), usage)
    } catch {
      await keepListing(io($), undefined)
    }
    return result
  }).catch(($, e, next) => next(e))

  on('skill.prompt', { skill: /(?<skills>)/ }, async ($, e, next) => {
    await noteSkillUse(io($), e.skill)
    return next(e)
  }).catch(($, e, next) => next(e))

  on('turn.complete', { turnId: /(?<skills>)/ }, async ($, e, next) => {
    try {
      if (skillsPending()) await flushSkills(io($))
      if (wantsListing(e.agentId)) {
        // A failed read counts as a try too, so a broken read stops after LISTING_TRIES turns
        try {
          const usage = await $.session.usage({ breakdown: 'summary' })
          await keepListing(io($), usage)
        } catch {
          await keepListing(io($), undefined)
        }
      }
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('session.end', { sessionId: /(?<skills>)/ }, async ($, e, next) => {
    // The last counts are lost on a failure, nothing else
    await flushSkills(io($))
    return next(e)
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'vaken-help' }, async ($, e, next) => {
    if (!isSkillsRun(e.args)) return next(e)
    const i = io($)
    // The language and the waiting counts first, then the skill list is read
    if (!(await skillsReady(i))) return skillsFailed()
    try {
      const usage = await $.session.usage({ breakdown: 'summary' })
      return skillsAnswer(i, usage)
    } catch {
      return skillsAnswer(i, undefined)
    }
  })
}
