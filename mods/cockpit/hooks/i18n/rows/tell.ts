// Area "tell": the words of core/tellme.ts, the Mac notification and the status line
import type { Rows } from '../types'

export const ROWS: Rows = {
  "tell.answer_done": {"en":"Claude is done with a long answer.","sv":"Claude är klar med ett långt svar."},
  "tell.banner": {"en":"Banner","sv":"Banderoll"},
  "tell.banner_and_sound": {"en":"Banner and sound","sv":"Banderoll och ljud"},
  "tell.help_text": {"en":"After 2 minutes with no press or prompt, vaken sends one Mac notification when another session needs you or a plan limit is near; with This session too, also when a step here waits for your yes or a long answer is done. At most one comes every 30 seconds and several become one, while Hours without notices and Quiet hold them. /vaken-settings notify.how sound adds a sound, speak says it.","sv":"Efter 2 minuter utan tryck eller prompt skickar vaken en Mac-notis när en annan session behöver dig eller en plangräns är nära; med Även den här sessionen också när ett steg här väntar på ditt ja eller ett långt svar är klart. Högst en kommer var 30:e sekund och flera blir en, medan Timmar utan notiser och Tyst håller dem. /vaken-settings notify.how sound lägger till ett ljud, speak säger det."},
  "tell.help_title": {"en":"Notices while you are away","sv":"Notiser medan du är borta"},
  "tell.how_label": {"en":"How notices reach you","sv":"Hur notiser når dig"},
  "tell.how_note": {"en":"While you are away: a banner, a banner and sound, or a spoken line.","sv":"Medan du är borta: en banderoll, en banderoll och ljud, eller en uppläst rad."},
  "tell.limit_near": {"en":"A plan limit is near.","sv":"En plangräns är nära."},
  "tell.plan_name_pct_used": {"en":"Plan {name} {pct} used","sv":"Plan {name} {pct} använt"},
  "tell.plan_pct_used": {"en":"Plan {pct} used","sv":"Plan {pct} använt"},
  "tell.sessions_need_you": {"en":{"one":"1 session needs you.","other":"{n} sessions need you."},"sv":{"one":"1 session behöver dig.","other":"{n} sessioner behöver dig."}},
  "tell.speak": {"en":"Speak","sv":"Läs upp"},
  "tell.status_label": {"en":"Status line","sv":"Statusrad"},
  "tell.status_note": {"en":"A line under the prompt box, only when context or plan is nearly used up.","sv":"En rad under promptrutan, bara när kontext eller plan nästan är slut."},
  "tell.step_waits": {"en":"A step waits for your yes.","sv":"Ett steg väntar på ditt ja."},
  "tell.this_session_too": {"en":"This session too","sv":"Även den här sessionen"},
}
