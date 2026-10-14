// Vaken: one plugin, one module
import type { Register } from 'claude-code'

import { registerAgentCap } from './features/agentcap'
import { registerAway } from './features/away'
import { registerAttention } from './features/attention'
import { registerCacheKeeper } from './features/cachekeeper'
import { registerCalm } from './features/calm'
import { registerCompaction } from './features/compaction'
import { registerCost } from './features/cost'
import { registerInsight } from './features/insight'
import { registerKeeper } from './features/keeper'
import { registerInbox } from './features/inbox'
import { registerContinuity } from './features/continuity'
import { registerCoach } from './features/coach'
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
import { registerNeighbors } from './features/neighbors'
import { registerExplain } from './features/explain'
import { registerFreshStart } from './features/freshstart'
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
import { registerPresets } from './features/presets'
import { registerProof2 } from './features/proof2'
import { registerProof } from './features/proof'
import { registerResume } from './features/resume'
import { registerRoute } from './features/route'
import { registerSteer } from './features/steer'
import { registerTrust } from './features/trust'
import { registerUndo } from './features/undo'
import { registerShip } from './features/ship'
import { registerSkills } from './features/skills'
import { registerStability } from './features/stability'
import { registerPressLog } from './features/presslog'

export const register: Register = on => {
  // Its word after /vaken-help run must reach it before the help page answers
  registerPressLog(on)
  registerHome(on)
  registerCompaction(on)
  registerCacheKeeper(on)
  registerLoopBreaker(on)
  registerStability(on)
  registerAttention(on)
  registerHappened(on)
  registerAgentCap(on)
  registerGuard(on)
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
  registerShape(on)
  registerValue(on)
  registerToday(on)
  // Focus and the open ends of yesterday
  registerCalm(on)
  registerFreshStart(on)
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
  registerNotes(on)
  registerCoach(on)
  registerInsight(on)
  registerPresets(on)
  registerResume(on)
  registerShip(on)
  registerUndo(on)
  registerTrust(on)
  registerContinuity(on)
  registerKeeper(on)
  registerSkills(on)
}
