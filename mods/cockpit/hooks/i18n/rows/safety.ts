// Area "safety": the words of core/safetywords.ts
import type { Rows } from '../types'

export const ROWS: Rows = {
  "safety.1_step": {"en":"1 step","sv":"1 steg"},
  "safety.all_clear": {"en":"All clear","sv":"Allt väl"},
  "safety.could_not_halt_from_here_type": {"en":"Could not pause from here. Type /vaken-pause in the session.","sv":"Kunde inte pausa härifrån. Skriv /vaken-pause i sessionen."},
  "safety.could_not_show_the_checkpoint_from": {"en":"Could not show the checkpoint from here. Type /vaken-undo name <checkpoint> in the session.","sv":"Kunde inte visa kontrollpunkten härifrån. Skriv /vaken-undo name <checkpoint> i sessionen."},
  "safety.guard_today": {"en":"Risky steps today","sv":"Riskabla steg i dag"},
  "safety.halt": {"en":"Pause","sv":"Pausa"},
  "safety.halt_all": {"en":"Pause all","sv":"Pausa allt"},
  "safety.halt_all_undo_checkpoints_and_what": {"en":"Pause all, undo, saved points and which risky steps were stopped.","sv":"Pausa allt, ångra, sparade punkter och vilka riskabla steg som stoppades."},
  "safety.halt_is_on_nothing_ran_lift": {"en":"Pause is on. Nothing ran. Resume with /vaken-pause off first.","sv":"Pausen är på. Inget kördes. Återuppta med /vaken-pause off först."},
  "safety.halt_lifted_steps_that_change_things": {"en":"Resumed. Steps that change things work again.","sv":"Återupptaget. Steg som ändrar något fungerar igen."},
  "safety.halted_every_step_that_changes_things": {"en":"Paused for safety. Commands, edits, tools, agents and web fetches are stopped. Press Resume to continue.","sv":"Pausad för säkerhets skull. Kommandon, ändringar, verktyg, agenter och webbhämtningar stoppas. Tryck Återuppta för att fortsätta."},
  "safety.it_runs_code_or_changes_files": {"en":"It runs code or changes files.","sv":"Det kör kod eller ändrar filer.","note":"Why a command block needs two yeses: it is not only commands that look (ls, cat, git status and the like)."},
  "safety.n_steps": {"en":"{n} steps","sv":"{n} steg"},
  "safety.none": {"en":"none","sv":"inga"},
  "safety.nothing_changes_before_you_type_it": {"en":"Nothing changes before you type it.","sv":"Inget ändras förrän du skriver det."},
  "safety.nothing_was_written_path_or_a": {"en":"Nothing was written: {path} or a folder above it is a link, or it leads somewhere it should not.","sv":"Inget skrevs: {path} eller en mapp ovanför är en länk, eller så leder den dit den inte ska."},
  "safety.preview": {"en":"Preview","sv":"Förhandsvisning"},
  "safety.preview_undo_1_file": {"en":"Preview undo (1 file)","sv":"Förhandsvisa ångra (1 fil)"},
  "safety.preview_undo_n_files": {"en":"Preview undo ({n} files)","sv":"Förhandsvisa ångra ({n} filer)"},
  "safety.stop_undo_and_what_the_guard": {"en":"Pause, undo, and which risky steps were stopped","sv":"Pausa, ångra och vilka riskabla steg som stoppades"},
  "safety.this_step_needs_you_to_type": {"en":"This step needs you to type it in this session.","sv":"Det här steget kräver att du skriver det själv i den här sessionen.","note":"A command that unlocks or runs something came from another session, a channel, a schedule or a plugin, so it was refused."},
  "safety.type_this_in_the_chat_box": {"en":"Type this in the chat box:","sv":"Skriv det här i chattrutan:"},
  "safety.warned": {"en":"Warned","sv":"Varnat"},
}
