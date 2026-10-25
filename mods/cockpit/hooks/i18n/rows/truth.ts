// Area "truth": the words of check counts, the day share, the cache clock
import type { Rows } from '../types'

export const ROWS: Rows = {
  "truth.a_b_stopped_warned_today": {"en":"{a} stopped, {b} warned today.","sv":"{a} stoppade, {b} varnade i dag."},
  "truth.a_passed": {"en":"{a} passed","sv":"{a} godkända"},
  "truth.cache_hit_hit_warm_under_1_min": {"en":"Cache {hit}% hit · warm under 1 min","sv":"Cache {hit}\u00a0% träff · varm under 1 min"},
  "truth.cache_warm_under_1_min": {"en":"Cache warm under 1 min","sv":"Cache varm under 1 min"},
  "truth.left_of_the_week_left_about_days_to_go": {"en":"{left}% of the week left, about {days} days to go, today included. To make it last, use about {per}% a day.","sv":"{left}\u00a0% av veckan kvar, ungefär {days} dagar till, i dag inräknad. För att det ska räcka, använd ungefär {per}\u00a0% om dagen."},
  "truth.left_of_the_week_left_resets_within_a_day": {"en":"{left}% of your weekly limit is left, and it resets within a day.","sv":"{left}\u00a0% av din veckogräns är kvar, och den återställs inom en dag."},
  "truth.left_of_the_week_left_until_it_resets": {"en":"{left}% of your weekly limit is left. To make it last until it resets, use about {per}% a day.","sv":"{left}\u00a0% av din veckogräns är kvar. För att den ska räcka tills den återställs, använd ungefär {per}\u00a0% om dagen."},
  "truth.n_cancelled": {"en":"{n} cancelled","sv":"{n} avbrutna"},
  "truth.n_checking": {"en":"{n} checking","sv":"{n} kontrolleras"},
  "truth.n_skipped": {"en":"{n} skipped","sv":"{n} hoppades över"},
  "truth.n_stopped_today": {"en":"{n} stopped today.","sv":"{n} stoppade i dag."},
  "truth.n_warned_today": {"en":"{n} warned today.","sv":"{n} varnade i dag."},
  "truth.run_n_done": {"en":{"one":"1 done","other":"{n} done"},"sv":{"one":"1 klar","other":"{n} klara"}},
  "truth.run_n_not_run": {"en":{"one":"1 not run","other":"{n} not run"},"sv":{"one":"1 inte körd","other":"{n} inte körda"}},
  "truth.run_n_stopped": {"en":{"one":"1 stopped","other":"{n} stopped"},"sv":{"one":"1 stoppad","other":"{n} stoppade"}},
  "truth.to_let_a_stopped_step_through_use": {"en":"To let a stopped step through, use Allow once in Needs you.","sv":"För att släppa igenom ett stoppat steg: använd Tillåt en gång i Behöver dig."},
  "truth.today_about_n_used": {"en":"Today: about {n}% used.","sv":"I dag: ungefär {n}\u00a0% använt."},
  "truth.today_since_time_about_n_used": {"en":"Today since {time}: about {n}% used.","sv":"I dag sedan {time}: ungefär {n}\u00a0% använt."},
  "truth.weekly_limit_used_up_resets_when": {"en":"Your weekly limit is used up. It resets {when}.","sv":"Din veckogräns är förbrukad. Den återställs {when}."},
}
