# Every text of vaken

<!-- GENERATED from hooks/i18n/rows/*.ts by scripts/strings-md.sh. Do not edit by hand. -->

**Generated, never edit by hand.** This page is the one text table (`mods/cockpit/hooks/i18n/rows`) written out to read: 2878 texts in 48 areas, languages en, sv. To change a text, edit the table (or export the sheet with `sh scripts/strings-export.sh sheet.csv`, change it, and import it with `sh scripts/strings-import.sh sheet.csv`), then regenerate this page with `sh scripts/strings-md.sh`. `sh scripts/check-strings.sh` fails when this page is out of date.

A text with a count has two lines, `one` and `other`. `{n}` and the like are filled in when the text is shown.

## Areas

- [toast](#toast) (120): Toasts and short notices.
- [explain](#explain) (250): What is this? and the plain-words explanations.
- [band](#band) (67): The band above the prompt, and the lines it posts.
- [guard](#guard) (42): The guard: what it stops and why.
- [needs](#needs) (52): Needs you: what waits for an answer, and the inbox.
- [winwords](#winwords) (39): The guard on Windows (PowerShell).
- [pane](#pane) (194): The pane: the live lines of the cards.
- [glance](#glance) (80): Glance rows: one headline per card.
- [cardsettings](#cardsettings) (11): The flip side of a card (its own settings).
- [sys](#sys) (22): Words of the system (Mac or PC).
- [compact](#compact) (32): Shortening the chat: the card, advice and commands.
- [skills](#skills) (25): The Skills card.
- [find](#find) (4): Finding a skill.
- [talk](#talk) (34): The Talk to other sessions card.
- [calm](#calm) (30): Calm: focus and quiet times.
- [phone](#phone) (24): The phone face.
- [phonecmds](#phonecmds) (6): Phone commands (/ok, /no, /go, /st).
- [awake](#awake) (21): Keeping the computer awake.
- [popout](#popout) (6): Pop out.
- [prs](#prs) (34): The pull requests card.
- [ship](#ship) (14): The Ship card.
- [back](#back) (15): Where was I.
- [safety](#safety) (23): The Safety card.
- [context](#context) (29): The Context health card.
- [preview](#preview) (24): The Preview card.
- [setup](#setup) (63): The Agent setup card.
- [do](#do) (71): Do: run commands from the last answer.
- [shipstep](#shipstep) (38): Ship steps (merge and check).
- [settings](#settings) (173): Settings: sections, rows, modes and layout names.
- [cards](#cards) (18): Cards: rules and titles.
- [guide](#guide) (54): The card guide.
- [runcost](#runcost) (26): Cost check before a task run.
- [fit](#fit) (20): Model fit (the card and its advice).
- [fitsettings](#fitsettings) (3): Model fit settings.
- [selfcost](#selfcost) (1): What vaken itself costs.
- [cardwhat](#cardwhat) (0): Shown from the code.
- [cardhome](#cardhome) (60): Shown from the code.
- [cardback](#cardback) (11): Shown from the code.
- [cardcompact](#cardcompact) (74): Shown from the code.
- [cardcomputer](#cardcomputer) (42): Shown from the code.
- [cardship](#cardship) (142): Shown from the code.
- [cardcontext](#cardcontext) (18): Shown from the code.
- [engines](#engines) (190): Shown from the code.
- [access](#access) (12): Shown from the code.
- [truth](#truth) (18): Shown from the code.
- [fmt](#fmt) (38): Numbers and times: a time gone, a length of time, an estimated price, day and month names.
- [words](#words) (73): Shown from the code.
- [common](#common) (535): Words shared by many places: buttons, levels, states, menus, help.

## toast

Toasts and short notices. (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `toast.a_lookup_agent_could_run_on` | A lookup agent could run on a cheaper model | En uppslagsagent kunde köras på en billigare modell |  |
| `toast.a_lookup_helper_could_run_on` | A lookup agent could run on a cheaper model | En uppslagsagent kunde köras på en billigare modell |  |
| `toast.a_model_switch_writes_the_saved` | A model switch writes the saved session again ({tokens} tokens) and costs {usd}. | Ett modellbyte skriver den sparade sessionen på nytt ({tokens} tokens) och kostar {usd}. |  |
| `toast.a_queued_prompt_is_ready_in` | A queued prompt is ready in the prompt box. Press Tab to take it. | En köad prompt finns i promptrutan. Tryck på Tab för att ta den. |  |
| `toast.all_all_self_checks_passed` | All {all} self-tests passed. | Alla {all} självtester gick igenom. |  |
| `toast.all_n_done` | All {n} done | Alla {n} klara |  |
| `toast.allowed_once_tell_claude_to_try` | Allowed once. Tell Claude to try the step again. | Tillåtet en gång. Be Claude försöka steget igen. |  |
| `toast.an_unproven_claim` | An unproven claim: | Ett obevisat påstående: |  |
| `toast.another_session` | another session | en annan session |  |
| `toast.away_is_off_welcome_back` | Away is off. Welcome back. | Frånvaroläget är av. Välkommen tillbaka. |  |
| `toast.away_is_on_cockpit_away_off` | Away is on. /vaken-away off when you are back. | Frånvaroläget är på. /vaken-away off när du är tillbaka. |  |
| `toast.away_mode_ended_cockpit_digest_shows` | Away mode ended. /vaken-away digest shows what happened. | Frånvaroläget slutade. /vaken-away digest visar vad som hände. |  |
| `toast.away_mode_ended_the_time_ran` | Away mode ended: the time ran out. /vaken-away digest shows what happened. | Frånvaroläget tog slut: tiden gick ut. /vaken-away digest visar vad som hände. |  |
| `toast.away_refused_a_risky_step_it` | Away: stopped a risky step. It waits for you. | Frånvaroläget: ett riskabelt steg stoppades. Det väntar på dig. |  |
| `toast.bad_of_all_self_checks_failed` | {bad} of {all} self-tests failed: {names}. | {bad} av {all} självtester misslyckades: {names}. |  |
| `toast.battery_p_not_plugged_in` | Battery {p}%, not plugged in | Batteri {p} %, inte inkopplat |  |
| `toast.blocked_a_tool_call_the_which` | Stopped a {tool} call: the {which} cost budget is used up. Type /vaken-usage budget extend to go on. | Stoppade ett anrop till {tool}: budgeten för {which} är slut. Skriv /vaken-usage budget extend för att fortsätta. |  |
| `toast.blocked_a_tool_step_that_keeps` | Stopped a {tool} step that keeps failing. Your next message lifts it. | Stoppade ett {tool}-steg som fortsätter att misslyckas. Ditt nästa meddelande häver det. |  |
| `toast.check_failed` | Check failed | Kontrollen misslyckades |  |
| `toast.checked` | Checked | Kontrollerad |  |
| `toast.checking` | Checking | Kontrolleras |  |
| `toast.claude_took_pictures_of_name` | Claude took pictures of {name}. | Claude tog bilder av {name}. |  |
| `toast.claude_was_told_about_what` | Claude was told about {what}. | Claude fick veta om {what}. |  |
| `toast.claude_was_told_to_stop_and` | Claude was told to stop and ask you. | Claude fick besked att sluta och fråga dig. |  |
| `toast.close_a_session_or_wait_for_one` | Close a session or wait for one to finish. | Stäng en session eller vänta tills en är klar. |  |
| `toast.code_reads_an_env_name_nobody` | Code reads an env name nobody declared: {names}. | Koden läser ett env-namn som ingen har deklarerat: {names}. |  |
| `toast.compact_no_brief` | Not compacted: could not save the handoff note. Type /compact yourself. | Inte komprimerad: det gick inte att spara överlämningen. Skriv /compact själv. |  |
| `toast.cost_pct_of_the_which_budget` | Cost: {pct}% of the {which} budget (about {usd} of {limit}, estimate). | Kostnad: {pct} % av budgeten för {which} (ungefär {usd} av {limit}, uppskattning). |  |
| `toast.could_not_fill_the_prompt_box` | Could not fill the prompt box. Run /vaken-ship ci-fix to see the prompt. | Det gick inte att fylla i promptrutan. Kör /vaken-ship ci-fix för att se prompten. |  |
| `toast.could_not_fill_the_prompt_box_2` | Could not fill the prompt box. The idea: | Det gick inte att fylla i promptrutan. Idén: |  |
| `toast.could_not_fill_the_prompt_box_the_idea` | Could not fill the prompt box. The idea: {idea} | Det gick inte att fylla i promptrutan. Idén: {idea} |  |
| `toast.could_not_shorten_the_chat_from` | Could not compact the session from here. Type /compact yourself. | Det går inte att komprimera sessionen härifrån. Skriv /compact själv. |  |
| `toast.day` | day | dagen |  |
| `toast.dismissed_the_step_did_not_run` | Dismissed. The step did not run, and nothing was allowed. | Avfärdat. Steget kördes inte, och inget tilläts. |  |
| `toast.done_every_check_you_chose_passed` | Done: every check you chose passed after the last edit. | Klart: alla kontroller du valde gick igenom efter den sista ändringen. |  |
| `toast.edits_are_wandering_from_your_goal` | Edits are wandering from your goal: {folders}. | Ändringarna glider bort från ditt mål: {folders}. |  |
| `toast.failed` | Failed | Misslyckades |  |
| `toast.finished_names` | Finished: {sessions}. | Klara: {sessions}. |  |
| `toast.focus_ended_nothing_happened_while` | Focus ended. Nothing happened while you focused. | Fokus slutade. Inget hände medan du fokuserade. |  |
| `toast.halt_lifted` | Resumed. | Återupptaget. |  |
| `toast.halted_lift_it_with_cockpit_halt` | Paused for safety. Resume with /vaken-pause off. | Pausad för säkerhets skull. Återuppta med /vaken-pause off. |  |
| `toast.has_a_new_neighbour_from` | has a new neighbour from | har en ny granne från |  |
| `toast.it_already_resumed_n_times_today` | It already resumed {n} times today. | Sessionen har redan återupptagits {n} gånger i dag. |  |
| `toast.it_continues` | It continues | Den fortsätter |  |
| `toast.kept_the_cache_warm_k_k_tokens` | Kept the cache warm: {k}k tokens read from it | Höll cachen varm: {k}k tokens lästes från den |  |
| `toast.kept_the_cache_warm_k_k_tokens_stale` | Kept the cache warm: {k}k tokens read from it (it had gone stale) | Höll cachen varm: {k}k tokens lästes från den (den hade blivit gammal) |  |
| `toast.label_off_settings_can_turn_it` | {label}: Off. Settings can turn it on again. | {label}: Av. Inställningar kan slå på det igen. |  |
| `toast.n_claude_session_uses_mem` | {n} Claude session uses {mem} | {n} Claude-session använder {mem} |  |
| `toast.n_claude_sessions_use_mem` | {n} Claude sessions use {mem} | {n} Claude-sessioner använder {mem} |  |
| `toast.n_finished_turns_changed_files_and` | {n} finished answers changed files and wait for your look. | {n} avslutade svar ändrade filer och väntar på att du tittar. |  |
| `toast.n_folder_copies_of_the_project` | {n} folder copies of the project (worktrees) are safe to remove. Type /vaken-ship worktrees to see the commands. | {n} mappkopior av projektet (worktrees) kan tas bort på ett säkert sätt. Skriv /vaken-ship worktrees för att se kommandona. |  |
| `toast.n_need_you` | {n} need you | {n} behöver dig |  |
| `toast.n_plugins_were_updated_see_cockpit` | {n} plugins were updated. See /vaken-help run trust. | {n} tillägg uppdaterades. Se /vaken-help run trust. |  |
| `toast.n_task_not_started` | {n} task, not started | {n} uppgift, inte startad |  |
| `toast.n_tasks_not_started` | {n} tasks, not started | {n} uppgifter, inte startade |  |
| `toast.n_unproven_claims` | {n} unproven claims: | {n} obevisade påståenden: |  |
| `toast.n_waiting` | {n} waiting | {n} väntar |  |
| `toast.no_claude_session_was_found` | no Claude session was found | ingen Claude-session hittades |  |
| `toast.no_claude_session_was_found_sentence` | No Claude session was found. | Ingen Claude-session hittades. |  |
| `toast.note` | note | anteckning |  |
| `toast.notes` | notes | anteckningar |  |
| `toast.ok_of_n_done` | {ok} of {n} done | {ok} av {n} klara |  |
| `toast.ok_of_n_done_bad_need` | {ok} of {n} done, {bad} need you | {ok} av {n} klara, {bad} behöver dig |  |
| `toast.once` | once | en gång |  |
| `toast.only_sessions_the_cockpit_saw_today_are_counted` | Only sessions vaken saw today are counted. | Bara sessioner som vaken har sett i dag räknas. |  |
| `toast.outside_text_from_tool_held_an` | Outside text from {tool} held an order aimed at Claude. Claude was told to ignore it. | Text utifrån från {tool} innehöll en order riktad till Claude. Claude fick besked att ignorera den. |  |
| `toast.paused` | Paused: | Pausad: |  |
| `toast.paused_it_cost_more_than_usd` | Paused: it cost more than {usd}. | Pausad: den kostade mer än {usd}. |  |
| `toast.plug_in` | Plug in. | Anslut laddaren. |  |
| `toast.plugin_updated_name_from_to_to` | Plugin updated: {name} {from} to {to}. See /vaken-help run trust. | Tillägget uppdaterades: {name} {from} till {to}. Se /vaken-help run trust. |  |
| `toast.port_port_is_held_by_session` | Port {port} is held by session '{name}'. | Port {port} används av sessionen '{name}'. |  |
| `toast.pr_n_all_checks_passed` | Pull request {n}: all checks passed. | Pull request {n}: alla kontroller gick igenom. |  |
| `toast.pr_n_m_check_failed` | Pull request {n}: {m} check failed. Type /vaken-ship ci-fix to see the fix. | Pull request {n}: {m} kontroll misslyckades. Skriv /vaken-ship ci-fix för att se lagningen. |  |
| `toast.pr_n_m_check_failed_press_fix` | Pull request {n}: {m} check failed. Press Fix in Needs you or on the Pull requests card. | Pull request {n}: {m} kontroll misslyckades. Tryck på Laga i Behöver dig eller på kortet Pull requests. |  |
| `toast.pr_n_m_checks_failed` | Pull request {n}: {m} checks failed. Type /vaken-ship ci-fix to see the fix. | Pull request {n}: {m} kontroller misslyckades. Skriv /vaken-ship ci-fix för att se lagningen. |  |
| `toast.pr_n_m_checks_failed_press_fix` | Pull request {n}: {m} checks failed. Press Fix in Needs you or on the Pull requests card. | Pull request {n}: {m} kontroller misslyckades. Tryck på Laga i Behöver dig eller på kortet Pull requests. |  |
| `toast.preset_n_settings_changed_cockpit` | {preset}: {n} settings changed. /vaken-settings lists them. | {preset}: {n} inställningar ändrades. /vaken-settings visar dem. |  |
| `toast.restored_n_file` | Restored {n} file. | Återställde {n} fil. |  |
| `toast.restored_n_files` | Restored {n} files. | Återställde {n} filer. |  |
| `toast.reviewing` | Reviewing | Granskas |  |
| `toast.screen_changed_name_view_pct` | Screen changed: {name}, {view} {pct} | Skärmen ändrades: {name}, {view} {pct} |  |
| `toast.screen_name_looks_the_same` | Screen {name} looks the same | Skärmen {name} ser likadan ut |  |
| `toast.session` | session | sessionen |  |
| `toast.session_packet_written` | Session packet written. | Sessionspaketet skrevs. |  |
| `toast.settings_routing` | Settings &gt; Agents. | Inställningar &gt; Agenter. |  |
| `toast.skipped` | Skipped | Hoppades över |  |
| `toast.stopped` | Stopped: | Stoppad: |  |
| `toast.stopped_lift_it_with_cockpit_halt` | Paused for safety. Resume with /vaken-pause off. | Pausad för säkerhets skull. Återuppta med /vaken-pause off. |  |
| `toast.stopped_what_press_allow_once_in` | Stopped {what}. Press Allow once in Needs you to let it through. | Stoppade {what}. Tryck på Tillåt en gång i Behöver dig för att släppa igenom det. |  |
| `toast.task_run` | Task run | Uppgiftskörning |  |
| `toast.task_run_ended_summary` | Task run ended: {summary} | Körningen avslutades: {summary} |  |
| `toast.task_run_goes_on_the_plan` | Task run goes on: the plan limit has reset | Körningen fortsätter: planens gräns har återställts |  |
| `toast.the_cache_read_failed_why` | The cache read failed. {why} | Det gick inte att läsa cachen. {why} |  |
| `toast.the_claude_sessions_could_not_be` | the Claude sessions could not be counted | det gick inte att räkna Claude-sessionerna |  |
| `toast.the_claude_sessions_could_not_be_counted_sentence` | The Claude sessions could not be counted. | Det gick inte att räkna Claude-sessionerna. |  |
| `toast.the_cockpits_saved_data_was_full` | Vaken's saved data was full. It removed {n} old {notes} to make room. | Vakens sparade data var full. Den tog bort {n} gamla {notes} för att göra plats. |  |
| `toast.the_fix_prompt_is_in_the` | The fix prompt is in the prompt box. Press Enter to send it. | Prompten för att laga felet finns i promptrutan. Tryck på Enter för att skicka den. |  |
| `toast.the_idea_is_in_the_prompt` | The idea is in the prompt box. Press Enter to send it. | Idén finns i promptrutan. Tryck på Enter för att skicka den. |  |
| `toast.the_next_try_is_blocked` | The next try is stopped. | Nästa försök stoppas. |  |
| `toast.the_plan_limit_has_reset_type` | The plan limit has reset. Type "continue" to go on. | Planens gräns har återställts. Skriv "continue" för att fortsätta. |  |
| `toast.the_plan_limit_stopped_this_chat` | The plan limit stopped this session. {what} at {time} {note}. | Planens gräns stoppade den här sessionen. {what} kl. {time} {note}. |  |
| `toast.the_reset_time_is_not_known` | (the reset time is not known, so this is a guess) | (återställningstiden är okänd, så det här är en gissning) |  |
| `toast.this_mac_is_short_of_memory` | This Mac is short of memory. | Den här Macen har ont om minne. |  |
| `toast.todays_share_of_the_week_is` | Today's share of the week is used up: {today}% used today, and today's share was about {share}%. {left}% of the week is left. | Dagens andel av veckan är slut: {today} % använt i dag, och dagens andel var ungefär {share} %. {left} % av veckan är kvar. |  |
| `toast.tool_failed_n_times_in_a` | {tool} failed {n} times in a row, the same way. | {tool} misslyckades {n} gånger i rad, på samma sätt. |  |
| `toast.type_cockpit_health_to_see_why` | Type /vaken-help run health to see why. | Skriv /vaken-help run health för att se varför. |  |
| `toast.unknown` | Unknown | Okänd |  |
| `toast.updated_from_prev_to_ver_all` | Updated from {prev} to {ver}. All {all} self-tests passed. | Uppdaterad från {prev} till {ver}. Alla {all} självtester gick igenom. |  |
| `toast.verified` | verified | verifierat |  |
| `toast.waiting` | Waiting | Väntar |  |
| `toast.waiting_for_you_names` | Waiting for you: {sessions}. | Väntar på dig: {sessions}. |  |
| `toast.waits_for_the_plan_limit` | Waits for the plan limit: | Väntar på planens gräns: |  |
| `toast.was_edited_by` | was edited by | ändrades av |  |
| `toast.when_the_window_resets` | (when the window resets) | (när fönstret återställs) |  |
| `toast.while_you_focused` | While you focused: | Medan du fokuserade: |  |
| `toast.you_get_a_reminder` | You get a reminder | Du får en påminnelse |  |
| `toast.you_have_asked_for_this_kind` | You have asked for this kind of thing {n} times. /vaken-help run coach can save it as a skill. | Du har bett om den här sortens sak {n} gånger. /vaken-help run coach kan spara den som en färdighet. |  |
| `toast.your_instruction_files_are_about` | Your instruction files are about {k} tokens. Claude re-reads them every answer. /vaken-help run diet has the details. | Dina instruktionsfiler är ungefär {k} tokens. Claude läser om dem varje svar. /vaken-help run diet visar detaljerna. |  |
| `toast.your_n_claude_session_uses_mem_of_it` | Your {n} Claude session uses {mem} of it. | Din {n} Claude-session använder {mem} av det. |  |
| `toast.your_n_claude_sessions_use_mem_of_it` | Your {n} Claude sessions use {mem} of it. | Dina {n} Claude-sessioner använder {mem} av det. |  |

## explain

What is this? and the plain-words explanations. (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `explain.a_bad_package_can_run_harmful` | A bad package can run harmful code on your computer. | Ett dåligt paket kan köra skadlig kod på din dator. |  |
| `explain.a_big_file_costs_plan_usage` | A big file costs plan usage all day. | En stor fil kostar användning hela dagen. |  |
| `explain.a_cold_cache_makes_your_next` | A cold cache makes your next message cost more. This costs a little usage. | En kall cache gör ditt nästa meddelande dyrare. Det här kostar lite användning. |  |
| `explain.a_fresh_session_costs_less_than` | A fresh session costs less than carrying the whole old session along. | En ny session kostar mindre än att släpa med hela den gamla sessionen. |  |
| `explain.a_helper_that_runs_into_the` | An agent that runs into the limit only fails. Waiting keeps the work for later. | En agent som når gränsen misslyckas bara. Att vänta sparar arbetet till senare. |  |
| `explain.a_hidden_order_can_make_claude` | A hidden order can make Claude do things you did not ask for. | En dold order kan få Claude att göra saker du inte bad om. |  |
| `explain.a_lookup_does_not_need_the` | A lookup does not need the biggest model. This saves plan usage. | Ett uppslag behöver inte den största modellen. Det sparar användning. |  |
| `explain.a_mac_that_never_sleeps_wears` | A Mac that never sleeps wears the battery and the screen. | En Mac som aldrig sover sliter på batteriet och skärmen. |  |
| `explain.a_migration_changes_your` | A migration changes your database and is hard to undo. | En migrering ändrar din databas och är svår att ångra. |  |
| `explain.a_new_session_starts_empty_the` | A new session starts empty. The file saves you from explaining it again. | En ny session börjar tom. Filen sparar dig från att förklara det igen. |  |
| `explain.a_plugin_can_change_what_claude` | A plugin can change what Claude does. You should know when it changes. | Ett tillägg kan ändra vad Claude gör. Du bör få veta när det ändras. |  |
| `explain.a_plugin_has_a_new_version` | A plugin has a new version since your last session. | Ett tillägg har en ny version sedan din senaste session. |  |
| `explain.a_secret_that_enters_the_chat` | A secret that enters the session can leak. | En hemlighet som hamnar i sessionen kan läcka. |  |
| `explain.a_session_waits_for_you_claude` | A session waits for you. Claude asked a question, or a step waits for your OK. | En session väntar på dig. Claude ställde en fråga, eller ett steg väntar på ditt OK. |  |
| `explain.a_session_was_quiet_so_the` | A session was quiet, so vaken showed a sentence you had queued as a dim suggestion in the prompt box. | En session var tyst, så vaken visade en mening du hade köat som ett svagt förslag i promptrutan. |  |
| `explain.a_short_plan_costs_less_than` | A short plan costs less than a redo. | En kort plan kostar mindre än att göra om. |  |
| `explain.a_skill_is_a_saved_instruction` | A skill is a saved instruction. Next time you type one word. | En färdighet är en sparad instruktion. Nästa gång skriver du ett ord. |  |
| `explain.a_sleeping_mac_stops_the_work` | A sleeping Mac stops the work. | En Mac som sover stoppar arbetet. |  |
| `explain.a_step_had_failed_3_times` | A step had failed 3 times the same way. Vaken stopped Claude's next try of it. | Ett steg hade misslyckats 3 gånger på samma sätt. Vaken stoppade Claudes nästa försök. |  |
| `explain.a_step_that_the_guard_would` | A step that the safety check would stop went through, because you had allowed one. | Ett steg som säkerhetskontrollen annars skulle stoppa gick igenom, eftersom du hade tillåtit ett. |  |
| `explain.a_step_touched_a_secret_such` | A step touched a secret, such as a key or a password file. Claude was told not to repeat it; nothing was stopped. | Ett steg rörde en hemlighet, till exempel en nyckel eller en lösenordsfil. Claude fick veta att inte upprepa det; inget stoppades. |  |
| `explain.a_stuck_claude_uses_up_your` | A stuck Claude uses up your plan and gets nowhere. | En Claude som fastnat förbrukar din plan och kommer ingenstans. |  |
| `explain.a_switch_throws_the_saved_copy` | A switch throws the saved copy away, and writing it again costs usage. | Ett byte slänger den sparade kopian, och att skriva den igen kostar användning. |  |
| `explain.a_weakened_test_can_hide_a` | A weakened test can hide a real bug. | Ett försvagat test kan dölja ett verkligt fel. |  |
| `explain.an_agent_was_working_a_phone` | An agent was working, a phone was connected, or a question waited, so vaken kept your Mac awake. | En agent arbetade, en telefon var ansluten eller en fråga väntade, så vaken höll din Mac vaken. |  |
| `explain.an_edit_outside_the_project_can` | An edit outside the project can break other work. | En ändring utanför projektet kan förstöra annat arbete. |  |
| `explain.an_older_version_saved_that_warn` | An older version saved that Warn when you picked a mode, which turned off the stop for destroying data and exposing secrets. | En äldre version sparade den Varna när du valde ett läge, vilket stängde av stoppet för att förstöra data och avslöja hemligheter. |  |
| `explain.an_update_can_break_a_part` | An update can break a part without any sign. | En uppdatering kan förstöra en del utan att det syns. |  |
| `explain.another_edit_of_the_same_file` | Another edit of the same file may not fix it. Claude may be guessing. | Ännu en ändring i samma fil räcker kanske inte. Claude kanske gissar. |  |
| `explain.another_live_session_works_in` | Another live session works in the same folder as this one. Only you were told. | En annan pågående session arbetar i samma mapp som den här. Bara du fick veta. |  |
| `explain.applied_the_name_preset` | Applied the {preset} preset | Tog i bruk läget {preset} |  |
| `explain.ask_claude_for_a_plan_cockpit` | Ask Claude for a plan. /vaken-explain planfirst says why. Settings &gt; Prompts and memory &gt; Plan first sets Suggest, Ask or Off. | Be Claude om en plan. /vaken-explain planfirst säger varför. Inställningar &gt; Prompter och minne &gt; Plan först väljer Föreslå, Fråga eller Av. |  |
| `explain.ask_claude_to_run_the_checks` | Ask Claude to run the checks and show the result. /vaken-ship proof shows what ran. Settings &gt; Safety &gt; Claims switches this off. | Be Claude köra kontrollerna och visa resultatet. /vaken-ship proof visar vad som kördes. Inställningar &gt; Säkerhet &gt; Påståenden slår av detta. |  |
| `explain.at_least_5_edits_went_to` | At least 5 edits went to new folders that do not match your goal. Nothing was stopped. | Minst 5 ändringar gick till nya mappar som inte passar ditt mål. Inget stoppades. |  |
| `explain.away_mode_ended_and_the_cockpit` | Away mode ended, and vaken wrote a summary: which sessions finished or needed you, what it stopped, and about what it cost. | Frånvaroläget tog slut, och vaken skrev en sammanfattning: vilka sessioner som blev klara eller behövde dig, vad den stoppade och ungefär vad det kostade. |  |
| `explain.away_mode_ended_by_you_or` | Away mode ended, by you or at the end of the time you set. | Frånvaroläget tog slut, av dig eller när tiden du satte gick ut. |  |
| `explain.check_that_no_key_or_password` | Check that no key or password was shown. Settings &gt; Safety &gt; Secrets can stop such steps first. | Kontrollera att ingen nyckel eller något lösenord visades. Inställningar &gt; Säkerhet &gt; Hemligheter kan stoppa sådana steg i förväg. |  |
| `explain.check_the_database_settings` | Check the database. Settings &gt; Safety &gt; Migrations can stop migrations first. | Kontrollera databasen. Inställningar &gt; Säkerhet &gt; Migreringar kan stoppa migreringar i förväg. |  |
| `explain.check_the_file_cockpit_guard` | Check the file. /vaken-guard scope &lt;folders&gt; sets the allowed folders. Settings &gt; Safety &gt; Only your folders can stop such edits. | Kontrollera filen. /vaken-guard scope &lt;mappar&gt; sätter de tillåtna mapparna. Inställningar &gt; Säkerhet &gt; Bara dina mappar kan stoppa sådana ändringar. |  |
| `explain.check_the_files_cockpit_undo` | Check the files. /vaken-undo lists the last changed files. | Kontrollera filerna. /vaken-undo listar de senast ändrade filerna. |  |
| `explain.check_the_files_it_changed_if` | Check the files it changed. If it was on purpose, ignore this. /vaken-tasks goal sets the goal vaken compares with. | Kontrollera filerna som ändrades. Om det var med flit, strunta i detta. /vaken-tasks goal sätter målet som vaken jämför med. |  |
| `explain.check_the_package_name_if_it` | Check the package name. If it is right, type /vaken-guard allow once. Settings &gt; Safety &gt; New packages sets Warn or Stop. | Kontrollera paketnamnet. Om det stämmer, skriv /vaken-guard allow once. Inställningar &gt; Säkerhet &gt; Nya paket väljer Varna eller Stoppa. |  |
| `explain.check_the_package_name_press` | If safe, press Allow once in Needs you (for 30 min) or type /vaken-guard allow once there, then ask Claude to retry. See Settings &gt; Safety &gt; New packages. | Om det är säkert, tryck på Tillåt en gång i Behöver dig (i 30 min) eller skriv /vaken-guard allow once där, och be sedan Claude försöka igen. Se Inställningar &gt; Säkerhet &gt; Nya paket. |  |
| `explain.check_the_package_name_settings` | Check the package name. Settings &gt; Safety &gt; New packages can stop such installs. | Kontrollera paketnamnet. Inställningar &gt; Säkerhet &gt; Nya paket kan stoppa sådana installationer. |  |
| `explain.check_what_the_step_did_next` | Check what the step did. The next stopped step waits for your Allow once again. | Kontrollera vad steget gjorde. Nästa stoppade steg väntar på ditt Tillåt en gång igen. |  |
| `explain.check_what_the_step_did_type` | Check what the step did. Type /vaken-guard allow once to allow another. | Kontrollera vad steget gjorde. Skriv /vaken-guard allow once för att tillåta ett till. |  |
| `explain.claude_can_be_wrong_about_its` | Claude can be wrong about its own work. A check that passed is the proof. | Claude kan ha fel om sitt eget arbete. En kontroll som gick igenom är beviset. |  |
| `explain.claude_can_edit_files_and_run` | Claude can edit files and run commands again. | Claude kan ändra filer och köra kommandon igen. |  |
| `explain.claude_can_see_how_the_page` | Claude can see how the page looks, not only its code. | Claude kan se hur sidan ser ut, inte bara dess kod. |  |
| `explain.claude_changed_a_test_so_that` | Claude changed a test so that it skips or checks less. Claude was told to tell you; nothing was stopped. | Claude ändrade ett test så att det hoppar över eller kontrollerar mindre. Claude fick veta att säga det till dig; inget stoppades. |  |
| `explain.claude_did_not_follow_a_rule` | Claude did not follow a rule you wrote. | Claude följde inte en regel du skrev. |  |
| `explain.claude_did_something_in_this` | Claude did something in this session in the last 2 minutes. | Claude gjorde något i den här sessionen de senaste 2 minuterna. |  |
| `explain.claude_edited_a_file_outside` | Claude edited a file outside your folders, or a protected file. Claude was told to tell you; nothing was stopped. | Claude ändrade en fil utanför dina mappar, eller en skyddad fil. Claude fick veta att säga det till dig; inget stoppades. |  |
| `explain.claude_edited_one_file_5_times` | Claude edited one file 5 times in 10 minutes while steps kept failing in between. Claude was told; nothing was stopped. | Claude ändrade en fil 5 gånger på 10 minuter medan steg fortsatte misslyckas. Claude fick veta; inget stoppades. |  |
| `explain.claude_finished_the_session` | Claude finished. The session waits for your next message. | Claude blev klar. Sessionen väntar på ditt nästa meddelande. |  |
| `explain.claude_installed_a_package_that` | Claude installed a package that looks odd: very new, a look-alike name or deprecated. Claude was told to tell you; nothing was stopped. | Claude installerade ett paket som ser konstigt ut: mycket nytt, ett namn som liknar ett annat eller utfasat. Claude fick veta att säga det till dig; inget stoppades. |  |
| `explain.claude_looked_stuck_one_file` | Claude looked stuck: one file edited 6 times in one answer, 15 calls with no file changed and a lot of text read, or 3 failures of one kind of command. | Claude verkade fastna: en fil ändrad 6 gånger i ett svar, 15 anrop utan att någon fil ändrades och mycket läst text, eller 3 misslyckanden av samma sorts kommando. |  |
| `explain.claude_may_have_wandered_away` | Claude may have wandered away from the task you gave it. | Claude kan ha kommit bort från uppgiften du gav. |  |
| `explain.claude_ran_a_command_that_can` | Claude ran a command that can destroy data, such as a delete, a force-push or a wipe. Claude was told to tell you; nothing was stopped. | Claude körde ett kommando som kan förstöra data, till exempel en radering, en force-push eller en rensning. Claude fick veta att säga det till dig; inget stoppades. |  |
| `explain.claude_ran_a_database_migration` | Claude ran a database migration. Claude was told to tell you; nothing was stopped. | Claude körde en databasmigrering. Claude fick veta att säga det till dig; inget stoppades. |  |
| `explain.claude_ran_a_shell_command_that` | Claude ran a shell command that your CLAUDE.md says never to use. Nothing was stopped. | Claude körde ett skalkommando som din CLAUDE.md säger att aldrig använda. Inget stoppades. |  |
| `explain.claude_ran_a_step_that_reaches` | Claude ran a step that reaches outside your computer, such as a message, a post, a payment or a cloud change. Claude was told; nothing was stopped. | Claude körde ett steg som når utanför din dator, till exempel ett meddelande, ett inlägg, en betalning eller en molnändring. Claude fick veta; inget stoppades. |  |
| `explain.claude_ran_the_same_step_3` | Claude ran the same step 3 times in a row, and it failed the same way each time. | Claude körde samma steg 3 gånger i rad, och det misslyckades på samma sätt varje gång. |  |
| `explain.claude_said_the_tests_pass_the` | Claude said the tests pass, the work is done or it is fixed, but no passing check backs this up. Nothing was stopped. | Claude sa att testerna går igenom, att arbetet är klart eller att det är fixat, men ingen godkänd kontroll visar det. Inget stoppades. |  |
| `explain.claude_started_a_helper_agent` | Claude started an agent while your limit was already reached. You were warned; nothing was stopped. | Claude startade en agent när din gräns redan var nådd. Du blev varnad; inget stoppades. |  |
| `explain.claude_started_a_helper_that` | Claude started an agent that only looks things up, and vaken ran it on a cheaper model. | Claude startade en agent som bara slår upp saker, och vaken körde den på en billigare modell. |  |
| `explain.claude_tried_a_command_that_can` | Claude tried a command that can destroy data, such as a delete, a force-push or a wipe. Vaken stopped it and told Claude. | Claude försökte köra ett kommando som kan förstöra data, till exempel en radering, en force-push eller en rensning. Vaken stoppade det och sa det till Claude. |  |
| `explain.claude_tried_a_step_that_reaches` | Claude tried a step that reaches outside your computer, such as a message, a post, a payment or a cloud change. Vaken stopped it. | Claude försökte ett steg som når utanför din dator, till exempel ett meddelande, ett inlägg, en betalning eller en molnändring. Vaken stoppade det. |  |
| `explain.claude_tried_a_step_that_touches` | Claude tried a step that touches a secret, such as a key or a password file. Vaken stopped it, or kept the result from Claude. | Claude försökte ett steg som rör en hemlighet, till exempel en nyckel eller en lösenordsfil. Vaken stoppade det, eller höll resultatet borta från Claude. |  |
| `explain.claude_tried_to_change_a_test` | Claude tried to change a test so that it skips or checks less. Vaken stopped the edit and told Claude. | Claude försökte ändra ett test så att det hoppar över eller kontrollerar mindre. Vaken stoppade ändringen och sa det till Claude. |  |
| `explain.claude_tried_to_edit_a_file` | Claude tried to edit a file outside your folders, or a protected file. Vaken stopped the edit and told Claude. | Claude försökte ändra en fil utanför dina mappar, eller en skyddad fil. Vaken stoppade ändringen och sa det till Claude. |  |
| `explain.claude_tried_to_install_a` | Claude tried to install a package that looks odd: very new, a look-alike name or deprecated. Vaken stopped it. | Claude försökte installera ett paket som ser konstigt ut: mycket nytt, ett namn som liknar ett annat eller utfasat. Vaken stoppade det. |  |
| `explain.claude_tried_to_run_a_database` | Claude tried to run a database migration. Vaken stopped it and told Claude. | Claude försökte köra en databasmigrering. Vaken stoppade den och sa det till Claude. |  |
| `explain.claude_tried_to_start_a_helper` | Claude tried to start an agent while your limit was reached. Vaken stopped it and told Claude. | Claude försökte starta en agent när din gräns var nådd. Vaken stoppade den och sa det till Claude. |  |
| `explain.claude_was_about_to_edit_a` | Claude was about to edit a file that another live session edited in the last 30 minutes. Nothing was stopped. | Claude skulle ändra en fil som en annan pågående session ändrade de senaste 30 minuterna. Inget stoppades. |  |
| `explain.claude_was_about_to_start_a` | Claude was about to start a server on a port that another session holds. Nothing was stopped. | Claude skulle starta en server på en port som en annan session håller. Inget stoppades. |  |
| `explain.claude_would_only_repeat_the` | Claude would only repeat the failure and use up your plan. | Claude skulle bara upprepa misstaget och förbruka din plan. |  |
| `explain.cockpit_after_limit_off_cancels` | /vaken-help run after-limit off cancels it. Settings &gt; Money and plan &gt; After a limit sets Off, Remind or Resume. | /vaken-help run after-limit off avbryter det. Inställningar &gt; Pengar och plan &gt; Efter en gräns väljer Av, Påminn eller Återuppta. |  |
| `explain.cockpit_agents_lists_them_delete` | /vaken-tasks agents lists them. Delete the files to remove them. | /vaken-tasks agents listar dem. Radera filerna för att ta bort dem. |  |
| `explain.cockpit_awake_shows_the_state` | /vaken-help run awake shows the state. Settings &gt; Agents &gt; Keep Mac awake turns it off. | /vaken-help run awake visar läget. Inställningar &gt; Agenter &gt; Håll Macen vaken slår av det. |  |
| `explain.cockpit_awake_shows_the_state_2` | /vaken-help run awake shows the state. Settings &gt; Agents &gt; Awake when away sets what counts. | /vaken-help run awake visar läget. Inställningar &gt; Agenter &gt; Vaken när jag är borta väljer vad som räknas. |  |
| `explain.cockpit_budget_shows_the_figures` | /vaken-usage budget shows the figures. Settings &gt; Money and plan &gt; Budget sets the limits. | /vaken-usage budget visar siffrorna. Inställningar &gt; Pengar och plan &gt; Budget sätter gränserna. |  |
| `explain.cockpit_budget_shows_the_new` | /vaken-usage budget shows the new figures. | /vaken-usage budget visar de nya siffrorna. |  |
| `explain.cockpit_claims_lists_who_edits` | /vaken-help run claims lists who edits what. Wait for the other session. Settings &gt; Agents &gt; File overlap turns this off. | /vaken-help run claims listar vem som ändrar vad. Vänta på den andra sessionen. Inställningar &gt; Agenter &gt; Filkrock slår av detta. |  |
| `explain.cockpit_coach_make_name_saves_it` | /vaken-help run coach make &lt;name&gt; saves it as a skill. Settings &gt; Prompts and memory &gt; Skill coach turns the offers off. | /vaken-help run coach make &lt;namn&gt; sparar det som en färdighet. Inställningar &gt; Prompter och minne &gt; Färdighetscoach slår av förslagen. |  |
| `explain.cockpit_compact_shows_each_check` | /vaken-compact shows each check and its value. Settings &gt; Money and plan &gt; Compact by itself sets Auto when the moments look right. | /vaken-compact visar varje kontroll och dess värde. Inställningar &gt; Pengar och plan &gt; Komprimera automatiskt väljer Auto när stunderna ser rätt ut. |  |
| `explain.cockpit_diet_lists_the_files_and` | /vaken-help run diet lists the files and the lines that appear twice. Trim what you can. | /vaken-help run diet listar filerna och raderna som förekommer två gånger. Korta ner det du kan. |  |
| `explain.cockpit_digest_shows_the_summary` | /vaken-away digest shows the summary again. | /vaken-away digest visar sammanfattningen igen. |  |
| `explain.cockpit_digest_shows_what` | /vaken-away digest shows what happened while you were away. | /vaken-away digest visar vad som hände medan du var borta. |  |
| `explain.cockpit_do_lists_the_commands_in` | /vaken-help run do lists the commands in the last answer. Settings &gt; Agents &gt; Run commands turns it off. | /vaken-help run do listar kommandona i det senaste svaret. Inställningar &gt; Agenter &gt; Kör kommandon slår av det. |  |
| `explain.cockpit_env_lists_the_names` | Claude should add the name, never the value, to .env.example. | Claude bör lägga till namnet, aldrig värdet, i .env.example. |  |
| `explain.cockpit_fence_shows_how_often` | /vaken-guard fence shows how often this happened. Ask Claude what the text said before you go on. | /vaken-guard fence visar hur ofta detta hände. Fråga Claude vad texten sa innan du går vidare. |  |
| `explain.cockpit_health_shows_which_part` | /vaken-help run health shows which part failed. A new version of vaken may fix it. | /vaken-help run health visar vilken del som misslyckades. En ny version av vaken kan laga det. |  |
| `explain.cockpit_inbox_shows_what_waits` | /vaken inbox shows what waits in each session. | /vaken inbox visar vad som väntar i varje session. |  |
| `explain.cockpit_keeper_shows_the_state` | /vaken-help run keeper shows the state. Settings &gt; Money and plan &gt; Keep session cheap turns it off. | /vaken-help run keeper visar läget. Inställningar &gt; Pengar och plan &gt; Håll sessionen billig slår av det. |  |
| `explain.cockpit_neighbors_lists_them` | /vaken neighbors lists them. Give one session its own worktree. Settings &gt; Agents &gt; Two in one folder turns this off. | /vaken neighbors listar dem. Ge en session sin egen worktree. Inställningar &gt; Agenter &gt; Två i samma mapp slår av detta. |  |
| `explain.cockpit_outbox_lists_what_left` | /vaken-guard outbox lists what left your computer. Settings &gt; Safety &gt; Outside actions can stop such steps first. | /vaken-guard outbox listar vad som lämnade din dator. Inställningar &gt; Säkerhet &gt; Åtgärder utåt kan stoppa sådana steg i förväg. |  |
| `explain.cockpit_ports_lists_the_ports` | /vaken-help run ports lists the ports. Ask Claude to use another port. Settings &gt; Advanced &gt; Shared ports turns this off. | /vaken-help run ports listar portarna. Be Claude använda en annan port. Inställningar &gt; Avancerat &gt; Delade portar slår av detta. |  |
| `explain.cockpit_preset_lists_the_presets` | /vaken-settings preset lists the presets. Settings shows each choice, and you can change any of them. | /vaken-settings preset listar lägena. Inställningar visar varje val, och du kan ändra vilket som helst. |  |
| `explain.cockpit_route_shows_the_details` | /vaken-tasks route shows the details. Settings &gt; Agents &gt; Agent models sets Off, Suggest or Auto. | /vaken-tasks route visar detaljerna. Inställningar &gt; Agenter &gt; Agentmodeller väljer Av, Föreslå eller Auto. |  |
| `explain.cockpit_rules_lists_the_rules` | /vaken-memory rules lists the rules. Settings &gt; Prompts and memory &gt; Rules count sets Warn, Count only or Off. | /vaken-memory rules listar reglerna. Inställningar &gt; Prompter och minne &gt; Regelräknare väljer Varna, Bara räkna eller Av. |  |
| `explain.cockpit_setup_lists_the_files` | /vaken-help run setup lists the files and what differs. The copy sits beside the file as .bak. | /vaken-help run setup listar filerna och vad som skiljer. Kopian ligger bredvid filen som .bak. |  |
| `explain.cockpit_shape_shows_the_shape` | /vaken-settings shape shows the shape and changes it. | /vaken-settings shape visar formen och ändrar den. |  |
| `explain.cockpit_tasks_report_shows_the` | /vaken-tasks report shows the result when it ends. | /vaken-tasks report visar resultatet när körningen tar slut. |  |
| `explain.cockpit_trust_lists_your_plugins` | /vaken-help run trust lists your plugins and what each one can do. | /vaken-help run trust listar dina tillägg och vad vart och ett kan göra. |  |
| `explain.cockpit_undo_name_name_shows` | /vaken-undo name &lt;name&gt; shows what going back would do. Nothing is restored until you add yes. | /vaken-undo name &lt;namn&gt; visar vad en återgång skulle göra. Inget återställs förrän du lägger till yes. |  |
| `explain.code_that_claude_wrote_reads_an` | Code that Claude wrote reads an env name (a named setting, such as a key) that no env file lists. Nothing was stopped. | Kod som Claude skrev läser ett env-namn (en namngiven inställning, till exempel en nyckel) som ingen env-fil listar. Inget stoppades. |  |
| `explain.helper_agents_use_the_most_plan` | Agents use the most plan usage. | Agenter förbrukar mest av planen. |  |
| `explain.how_many_more_helper_agents_this` | How many more agents this computer can run now: the smallest of free memory, idle processor and the limit you set, if any. Full when memory is tight, heat slows it, or the battery is low. | Hur många fler agenter den här datorn kan köra nu: det minsta av ledigt minne, ledig processor och den gräns du satt, om någon. Full när minnet är trångt, värme gör den långsam eller batteriet är lågt. |  |
| `explain.how_much_of_your_plan_you` | How much of your plan you used in each time window, and when it starts again. The figures come from the app. | Hur mycket av din plan du har använt i varje tidsfönster, och när det börjar om. Siffrorna kommer från appen. |  |
| `explain.if_it_is_fine_type_cockpit` | If it is fine, type /vaken-guard allow once. /vaken-guard scope &lt;folders&gt; sets the folders that are allowed. | Om det är okej, skriv /vaken-guard allow once. /vaken-guard scope &lt;mappar&gt; sätter vilka mappar som är tillåtna. |  |
| `explain.if_it_is_right_press_allow` | If it is right, press Allow once in Needs you (it shows for 30 minutes), or type /vaken-guard allow once in that session. Then tell Claude to try again. | Om det är rätt, tryck på Tillåt en gång i Behöver dig (den visas i 30 minuter), eller skriv /vaken-guard allow once i den sessionen. Be sedan Claude försöka igen. |  |
| `explain.if_it_is_right_type_cockpit` | If it is right, type /vaken-guard allow once. /vaken-guard outbox lists what left your computer. | Om det är rätt, skriv /vaken-guard allow once. /vaken-guard outbox listar vad som lämnade din dator. |  |
| `explain.if_it_is_safe_press_risky_commands` | If safe, press Allow once in Needs you (for 30 min) or type /vaken-guard allow once there, then ask Claude to retry. See Settings &gt; Safety &gt; Risky commands. | Om det är säkert, tryck på Tillåt en gång i Behöver dig (i 30 min) eller skriv /vaken-guard allow once där, och be sedan Claude försöka igen. Se Inställningar &gt; Säkerhet &gt; Riskabla kommandon. |  |
| `explain.if_it_is_safe_press_secrets` | If safe, press Allow once in Needs you (for 30 min) or type /vaken-guard allow once there, then ask Claude to retry. See Settings &gt; Safety &gt; Secrets. | Om det är säkert, tryck på Tillåt en gång i Behöver dig (i 30 min) eller skriv /vaken-guard allow once där, och be sedan Claude försöka igen. Se Inställningar &gt; Säkerhet &gt; Hemligheter. |  |
| `explain.if_it_is_safe_type_cockpit` | If it is safe, type /vaken-guard allow once. Settings &gt; Safety &gt; Secrets sets Warn or Stop. | Om det är säkert, skriv /vaken-guard allow once. Inställningar &gt; Säkerhet &gt; Hemligheter väljer Varna eller Stoppa. |  |
| `explain.if_it_is_the_right_time` | If it is the right time, type /vaken-guard allow once. Settings &gt; Safety &gt; Migrations sets Warn or Stop. | Om det är rätt tidpunkt, skriv /vaken-guard allow once. Inställningar &gt; Säkerhet &gt; Migreringar väljer Varna eller Stoppa. |  |
| `explain.if_it_is_the_right_time_press` | If safe, press Allow once in Needs you (for 30 min) or type /vaken-guard allow once there, then ask Claude to retry. See Settings &gt; Safety &gt; Migrations. | Om det är säkert, tryck på Tillåt en gång i Behöver dig (i 30 min) eller skriv /vaken-guard allow once där, och be sedan Claude försöka igen. Se Inställningar &gt; Säkerhet &gt; Migreringar. |  |
| `explain.if_the_change_is_right_press` | If the change is right, press Allow once in Needs you (for 30 min) or type /vaken-guard allow once there. If not, ask Claude to fix the code. | Om ändringen är rätt, tryck på Tillåt en gång i Behöver dig (i 30 min) eller skriv /vaken-guard allow once där. Annars, be Claude laga koden. |  |
| `explain.if_the_change_is_right_type` | If the change is right, type /vaken-guard allow once. If not, ask Claude to fix the code, not the test. | Om ändringen är rätt, skriv /vaken-guard allow once. Annars, be Claude laga koden, inte testet. |  |
| `explain.if_the_step_is_safe_type` | If the step is safe, type /vaken-guard allow once. Settings &gt; Safety &gt; Risky commands sets Warn or Stop. | Om steget är säkert, skriv /vaken-guard allow once. Inställningar &gt; Säkerhet &gt; Riskabla kommandon väljer Varna eller Stoppa. |  |
| `explain.it_affects_other_people_or` | It affects other people or services, and often cannot be undone. | Det påverkar andra människor eller tjänster och går ofta inte att ångra. |  |
| `explain.it_is_the_emergency_stop_nothing` | It is the emergency stop for doing things. Reading and thinking still work. | Det är nödstoppet för att göra saker. Att läsa och tänka fungerar fortfarande. |  |
| `explain.it_is_your_yes_for_one` | It is your yes for one step that the safety check would stop. It fades after 30 minutes. | Det är ditt ja för ett steg som säkerhetskontrollen annars skulle stoppa. Det går ut efter 30 minuter. |  |
| `explain.keep_session_cheap_turns_it_off` | Settings &gt; Money and plan &gt; Keep session cheap turns it off. /vaken-help run keeper shows when it last asked. | Inställningar &gt; Pengar och plan &gt; Håll sessionen billig slår av det. /vaken-help run keeper visar när den senast frågade. |  |
| `explain.look_at_the_file_or_ask` | Look at the file, or ask Claude what it thinks is wrong. See /vaken-help run loops. Turn it off: Settings &gt; Safety &gt; Loop breaker. | Titta på filen, eller fråga Claude vad som är fel. Se /vaken-help run loops. Slå av: Inställningar &gt; Säkerhet &gt; Loopbrytare. |  |
| `explain.look_at_the_file_or_ask_2` | Look at the file, or ask Claude what it thinks is wrong. Turn it off: Settings &gt; Safety &gt; Loop breaker. | Titta på filen, eller fråga Claude vad som är fel. Slå av: Inställningar &gt; Säkerhet &gt; Loopbrytare. |  |
| `explain.look_at_the_test_change_and` | Look at the test change and ask Claude to fix the code instead. Settings &gt; Safety &gt; Test changes can stop such edits. | Titta på teständringen och be Claude laga koden i stället. Inställningar &gt; Säkerhet &gt; Teständringar kan stoppa sådana ändringar. |  |
| `explain.many_agents_at_once_slow_your` | Many agents at once slow your laptop and use your plan fast. | Många agenter samtidigt gör datorn långsam och förbrukar din plan snabbt. |  |
| `explain.many_of_these_cannot_be_undone` | Many of these cannot be undone. | Många av dessa går inte att ångra. |  |
| `explain.more_tries_only_use_up_your` | More tries only use up your plan. Claude was told to change its approach. | Fler försök förbrukar bara din plan. Claude fick veta att ändra sitt sätt. |  |
| `explain.nobody_was_there_to_say_yes` | Nobody was there to say yes. A stopped step does no harm. | Ingen fanns där för att säga ja. Ett stoppat steg gör ingen skada. |  |
| `explain.nothing_can_change_while_you` | Steps that change things stop while you look. | Steg som ändrar något stoppas medan du tittar. |  |
| `explain.nothing_cockpit_health_shows_the` | Nothing. /vaken-help run health shows the results. | Inget. /vaken-help run health visar resultaten. |  |
| `explain.nothing_happened_in_this_session` | Nothing happened in this session for 2 minutes or more. | Inget hände i den här sessionen på 2 minuter eller mer. |  |
| `explain.nothing_if_claude_does_not_try` | Nothing. If Claude does not try that step again, the yes just ends. | Inget. Om Claude inte försöker det steget igen tar ja:et bara slut. |  |
| `explain.nothing_it_goes_on_after_the` | Nothing. It goes on after the reset. /vaken-tasks afterlimit wait makes it wait for you. /vaken-help run after-limit off all cancels the wait. | Inget. Det fortsätter efter återställningen. /vaken-tasks afterlimit wait gör att det väntar på dig. /vaken-help run after-limit off all avbryter väntan. |  |
| `explain.nothing_to_do_if_you_want_the` | Nothing to do. If you want the step after all, tell Claude to try again and press Allow once then. | Inget att göra. Om du vill ha steget ändå, be Claude försöka igen och tryck på Tillåt en gång då. |  |
| `explain.once_after_an_update_vaken` | Once, after an update, vaken cleared a saved Warn for Risky commands or Secrets. They still warn, and stop again where Claude Code would not ask first. | En gång, efter en uppdatering, rensade vaken en sparad Varna för Riskabla kommandon eller Hemligheter. De varnar fortfarande och stoppar igen där Claude Code inte skulle fråga först. |  |
| `explain.one_step_changes_many_choices_at` | One step changes many choices at once. | Ett steg ändrar många val på en gång. |  |
| `explain.open_a_line_of_the_autopilot` | Open a line of the Autopilot card, when it shows, to see what vaken saw, why it matters and what you can do. /vaken-explain says the same in the session. It never changes anything. | Öppna en rad i kortet Autopilot, när det visas, för att se vad vaken såg, varför det spelar roll och vad du kan göra. /vaken-explain säger samma sak i sessionen. Den ändrar aldrig något. |  |
| `explain.open_the_file_to_check_it` | Open the file to check it. In the new session, ask Claude to read it. /vaken-help run packet shows it. | Öppna filen och titta på den. I den nya sessionen, be Claude läsa den. /vaken-help run packet visar den. |  |
| `explain.press_pause_all_to_pause_again` | Type /vaken-pause to pause again, or press Pause all on the Safety card, when it shows. | Skriv /vaken-pause för att pausa igen, eller tryck på Pausa allt på kortet Säkerhet, när det visas. |  |
| `explain.press_resume_to_let_claude` | Press Resume in Needs you or on the Safety card, or type /vaken-pause off, to let Claude work again. | Tryck på Återuppta i Behöver dig eller på kortet Säkerhet, eller skriv /vaken-pause off, så att Claude kan arbeta igen. |  |
| `explain.press_resume_when_you_want` | Press Resume in Needs you or on the Safety card, or type /vaken-pause off, when you want Claude to work again. | Tryck på Återuppta i Behöver dig eller på kortet Säkerhet, eller skriv /vaken-pause off, när du vill att Claude ska arbeta igen. |  |
| `explain.press_tab_to_take_the_sentence` | Press Tab to take the sentence. /vaken-pause steer shows the queue. | Tryck på Tab för att ta meningen. /vaken-pause steer visar kön. |  |
| `explain.press_tab_to_take_the_sentence_2` | Press Tab to take the sentence. /vaken-pause steer lists the sentences you queued. | Tryck på Tab för att ta meningen. /vaken-pause steer listar meningarna du köade. |  |
| `explain.read_the_details_and_ask_claude` | Read the details and ask Claude what is wrong. It was told to explain. Settings &gt; Advanced &gt; Odd-change warning turns this off. | Läs detaljerna och fråga Claude vad som är fel. Den fick veta att förklara. Inställningar &gt; Avancerat &gt; Varning för udda ändringar slår av detta. |  |
| `explain.read_the_details_and_check_the` | Read the details and check the result. To stop such commands first, set Settings &gt; Safety &gt; Risky commands to Stop. | Läs detaljerna och kontrollera resultatet. För att stoppa sådana kommandon i förväg, sätt Inställningar &gt; Säkerhet &gt; Riskabla kommandon till Stoppa. |  |
| `explain.read_the_details_when_you_are` | Read the details when you are back. Settings &gt; Safety &gt; While away turns this off. | Läs detaljerna när du är tillbaka. Inställningar &gt; Säkerhet &gt; När du är borta slår av detta. |  |
| `explain.read_the_plan_then_say_yes` | Read the plan, then say yes or change it. Settings &gt; Prompts and memory &gt; Plan first turns this off. | Läs planen och säg sedan ja eller ändra den. Inställningar &gt; Prompter och minne &gt; Plan först slår av detta. |  |
| `explain.risky_steps_today_what_the` | Risky steps today: what vaken warned you about or stopped, and how strict each rule is. | Riskabla steg i dag: vad vaken varnade dig för eller stoppade, och hur sträng varje regel är. |  |
| `explain.see_cockpit_loops_to_refuse_the` | See /vaken-help run loops. To stop the next try, set Settings &gt; Safety &gt; Loop breaker to Stop. | Se /vaken-help run loops. För att stoppa nästa försök, sätt Inställningar &gt; Säkerhet &gt; Loopbrytare till Stoppa. |  |
| `explain.see_settings_safety_risky_commands_and` | See Settings &gt; Safety &gt; Risky commands and Settings &gt; Safety &gt; Secrets. Set them to Warn there if you want them never to stop. | Se Inställningar &gt; Säkerhet &gt; Riskabla kommandon och Inställningar &gt; Säkerhet &gt; Hemligheter. Sätt dem till Varna där om du vill att de aldrig ska stoppa. |  |
| `explain.send_a_new_message_to_lift` | Send a new message to lift the stop. To avoid such stops, set Settings &gt; Safety &gt; Loop breaker to Warn. | Skicka ett nytt meddelande för att häva stoppet. För att slippa sådana stopp, sätt Inställningar &gt; Säkerhet &gt; Loopbrytare till Varna. |  |
| `explain.send_continue_after_the_reset` | Send "continue" after the reset. Settings &gt; Money and plan &gt; After a limit can do it for you. | Skicka "continue" efter återställningen. Inställningar &gt; Pengar och plan &gt; Efter en gräns kan göra det åt dig. |  |
| `explain.shorten_the_chat_is_set_to` | Compacting is set to Watch only. Claude had finished and nothing was running, so vaken would have compacted now. It did nothing. | Komprimering är satt till Bara titta. Claude var klar och inget kördes, så vaken skulle ha komprimerat nu. Den gjorde inget. |  |
| `explain.shorten_the_session_watch_only` | Compacting is set to Watch only. Claude had finished and nothing was running, so vaken would have compacted now. It did nothing. | Komprimering är satt till Bara titta. Claude var klar och inget kördes, så vaken skulle ha komprimerat nu. Den gjorde inget. |  |
| `explain.some_people_cannot_use_a_page` | Some people cannot use a page with this problem. | Vissa människor kan inte använda en sida med det här problemet. |  |
| `explain.start_a_new_session_for_the` | Start a new session for the new topic. /vaken-explain fresh says why. Settings &gt; Prompts and memory &gt; Fresh-start nudge turns it off. | Starta en ny session för det nya ämnet. /vaken-explain fresh säger varför. Inställningar &gt; Prompter och minne &gt; Påminnelse om ny session slår av detta. |  |
| `explain.steps_are_checked_as_before` | Steps are checked as before. | Steg kontrolleras som förut. |  |
| `explain.switch_model_only_at_the_start` | Switch model only at the start of a new session. Settings &gt; Agents &gt; Agent models: Off also stops this warning. | Byt modell bara i början av en ny session. Inställningar &gt; Agenter &gt; Agentmodeller: Av stoppar också den här varningen. |  |
| `explain.tell_claude_to_try_the_step` | Tell Claude to try the step again. It does not run by itself. If Claude does not try it, the yes just ends. | Be Claude försöka steget igen. Det körs inte av sig självt. Om Claude inte försöker tar ja:et bara slut. |  |
| `explain.text_from_the_web_another_app` | Text from the web, another app or a downloads folder held a sentence that reads like an order to Claude. Claude was told to ignore it. | Text från webben, en annan app eller en nedladdningsmapp innehöll en mening som liknar en order till Claude. Claude fick veta att strunta i den. |  |
| `explain.the_allowance_is_used_up_the` | The allowance is used up. The next step is stopped again. | Tillåtelsen är förbrukad. Nästa steg stoppas igen. |  |
| `explain.the_app_updated_and_the_cockpit` | The app updated, and vaken tested its own parts. All of them passed. | Appen uppdaterades, och vaken testade sina egna delar. Alla gick igenom. |  |
| `explain.the_budget_was_reached_and` | The budget was reached, and Claude tried a costly step such as an agent. Vaken stopped it. | Budgeten var nådd, och Claude försökte ett dyrt steg, till exempel en agent. Vaken stoppade det. |  |
| `explain.the_chat_was_quiet_so_the` | The session was quiet, so vaken sent Claude one tiny question to keep the saved copy of the session (the cache) warm. | Sessionen var tyst, så vaken skickade Claude en liten fråga för att hålla den sparade kopian av sessionen (cachen) varm. |  |
| `explain.the_cockpit_had_kept_your_mac` | Vaken had kept your Mac awake for 8 hours in a row, which is the most it allows. It let the Mac sleep. | Vaken hade hållit din Mac vaken i 8 timmar i rad, vilket är det mesta den tillåter. Den lät Macen sova. |  |
| `explain.the_cockpit_tested_its_own_parts` | Vaken tested its own parts, and at least one failed. The rest keeps working. | Vaken testade sina egna delar, och minst en misslyckades. Resten fortsätter fungera. |  |
| `explain.the_cockpit_took_pictures_of_a` | Vaken took pictures of a page with Chrome in the background, at the widths you chose. | Vaken tog bilder av en sida med Chrome i bakgrunden, i de bredder du valde. |  |
| `explain.the_cockpit_wrote_a_file_claude` | Vaken wrote a file (.claude/cockpit-packet.md) that tells a new session where this work stands. | Vaken skrev en fil (.claude/cockpit-packet.md) som berättar för en ny session hur det här arbetet står. |  |
| `explain.the_code_may_fail_on_another` | The code may fail on another computer, where the name is missing. | Koden kan misslyckas på en annan dator, där namnet saknas. |  |
| `explain.the_edit_may_have_changed_how` | The edit may have changed how the page looks. | Ändringen kan ha ändrat hur sidan ser ut. |  |
| `explain.the_failed_part_may_not_work` | The failed part may not work. | Delen som misslyckades fungerar kanske inte. |  |
| `explain.the_figure_is_an_estimate_it` | The figure is an estimate. It tells you to slow down before the plan runs short. | Siffran är en uppskattning. Den säger åt dig att ta det lugnare innan planen tar slut. |  |
| `explain.the_file_follows_your_choices_a` | The file follows your choices. A copy of what was there was saved first. | Filen följer dina val. En kopia av det som fanns sparades först. |  |
| `explain.the_halt_ended_steps_that_change` | The pause ended. Steps that change things work again. | Pausen är slut. Steg som ändrar något fungerar igen. |  |
| `explain.the_helper_agents_claude_started` | The agents Claude started, and whether they still run. | Agenterna som Claude startade, och om de fortfarande kör. |  |
| `explain.the_last_times` | The last times: | De senaste gångerna: |  |
| `explain.the_line_above_the_chat_box` | The line above the chat box. It shows the one thing that matters most now; See all lists the rest. | Raden ovanför chattrutan. Den visar det som är viktigast just nu; Se alla listar resten. |  |
| `explain.the_new_shape_applies_from_your` | The new shape applies from your next message. | Den nya formen gäller från ditt nästa meddelande. |  |
| `explain.the_next_job_starts_with_one` | The next job starts with one key. | Nästa jobb startar med en tangent. |  |
| `explain.the_old_limit_had_been_reached` | The old limit had been reached. | Den gamla gränsen var nådd. |  |
| `explain.the_old_text_is_back_in` | The old text is back in those files. | Den gamla texten är tillbaka i de filerna. |  |
| `explain.the_pictures_are_in_the_project` | The pictures are in the project folder; nothing is sent to Claude. Ask Claude to look at one if you want it to see it. | Bilderna ligger i projektmappen; inget skickas till Claude. Be Claude titta på en om du vill att den ska se den. |  |
| `explain.the_plan_limit_had_paused_your` | The plan limit had paused your task run. The limit reset, so the run went on by itself. | Planens gräns hade pausat din uppgiftskörning. Gränsen återställdes, så körningen fortsatte av sig själv. |  |
| `explain.the_plan_limit_had_stopped_a` | The plan limit had stopped an answer. After the reset, vaken sent "continue" for you. | Planens gräns hade stoppat ett svar. Efter återställningen skickade vaken "continue" åt dig. |  |
| `explain.the_plan_limit_stopped_a_turn` | The plan limit stopped an answer. Vaken told you when the limit resets. | Planens gräns stoppade ett svar. Vaken sa när gränsen återställs. |  |
| `explain.the_plan_limit_stopped_helpers` | The plan limit stopped agents of your task run. Their tasks wait again, and the run paused until the limit resets. | Planens gräns stoppade agenter i din uppgiftskörning. Deras uppgifter väntar igen, och körningen pausades tills gränsen återställs. |  |
| `explain.the_run_can_finish_while_you` | The run can finish while you are away. | Körningen kan bli klar medan du är borta. |  |
| `explain.the_step_never_ran_if_claude` | The step never ran. If Claude tries it again, it is stopped again. | Steget kördes aldrig. Om Claude försöker igen stoppas det igen. |  |
| `explain.the_work_goes_on_without_you` | The work goes on without you at the screen. | Arbetet går vidare utan att du sitter vid skärmen. |  |
| `explain.there_is_no_explanation_for_this` | There is no explanation for this line yet. | Det finns ingen förklaring för den här raden än. |  |
| `explain.this_chat_what_claude_does_now` | This session: what Claude does now, what it cost so far, and how full its memory of the session (the context) is. | Den här sessionen: vad Claude gör nu, vad den har kostat hittills och hur fullt dess minne av sessionen (kontexten) är. |  |
| `explain.this_is_what_a_halt_is` | This is what Pause all is for. Such steps stay stopped while it lasts. | Det är vad Pausa allt är till för. Sådana steg förblir stoppade så länge det varar. |  |
| `explain.this_log_shows_whether_the_rule` | This log shows whether the rule picks good moments before Auto may act on it. | Den här loggen visar om regeln väljer bra stunder innan Auto får agera. |  |
| `explain.this_session_was_halted_and` | This session was paused, and Claude tried a step that changes things. Vaken stopped it. | Den här sessionen var pausad, och Claude försökte ett steg som ändrar något. Vaken stoppade det. |  |
| `explain.this_session_was_halted_with` | You typed /vaken-pause. Commands, edits, tools, agents, web fetches and skills are paused until you resume. | Du skrev /vaken-pause. Kommandon, ändringar, verktyg, agenter, webbhämtningar och färdigheter är pausade tills du återupptar. |  |
| `explain.to_stop_the_next_try_set` | To stop the next try, set Settings &gt; Safety &gt; Loop breaker to Stop. /vaken-help run loops lists the repeated failures. | För att stoppa nästa försök, sätt Inställningar &gt; Säkerhet &gt; Loopbrytare till Stoppa. /vaken-help run loops listar de upprepade felen. |  |
| `explain.two_servers_cannot_share_a_port` | Two servers cannot share a port. One fails, or you see the wrong app. | Två servrar kan inte dela en port. En misslyckas, eller så ser du fel app. |  |
| `explain.two_sessions_can_undo_each_other` | Two sessions can undo each other's work. | Två sessioner kan ångra varandras arbete. |  |
| `explain.two_sessions_in_one_folder_can` | Two sessions in one folder can change the same files. | Två sessioner i en mapp kan ändra samma filer. |  |
| `explain.type_cockpit_away_off_when_you` | Type /vaken-away off when you are back. It then shows what happened. | Skriv /vaken-away off när du är tillbaka. Då visas vad som hände. |  |
| `explain.type_cockpit_budget_extend_to` | Type /vaken-usage budget extend to lift the limit, or raise Settings &gt; Money and plan &gt; Session budget. | Skriv /vaken-usage budget extend för att häva gränsen, eller höj Inställningar &gt; Pengar och plan &gt; Sessionsbudget. |  |
| `explain.type_cockpit_halt_off_to_let` | Type /vaken-pause off to let Claude work again. | Skriv /vaken-pause off så att Claude kan arbeta igen. |  |
| `explain.type_cockpit_halt_off_when_you` | Type /vaken-pause off when you want Claude to work again. | Skriv /vaken-pause off när du vill att Claude ska arbeta igen. |  |
| `explain.type_cockpit_halt_to_stop` | Type /vaken-pause to pause everything again. | Skriv /vaken-pause för att pausa allt igen. |  |
| `explain.wait_for_one_agent_to_finish` | Wait for one agent to finish. Settings &gt; Agents &gt; Most at once raises the limit. | Vänta tills en agent är klar. Inställningar &gt; Agenter &gt; Flest samtidigt höjer gränsen. |  |
| `explain.wait_for_one_to_finish_settings` | Wait for one to finish. Settings &gt; Agents &gt; Agent cap and Most at once change the limit. | Vänta tills en är klar. Inställningar &gt; Agenter &gt; Agenttak och Flest samtidigt ändrar gränsen. |  |
| `explain.what_the_cockpit_did_for_you` | What vaken did for you today, such as compacting a long session. | Vad vaken gjorde åt dig i dag, till exempel att komprimera en lång session. |  |
| `explain.whether_the_tests_the_build_and` | Whether the tests, the build and the other checks really ran and passed after the last change. | Om testerna, bygget och de andra kontrollerna verkligen kördes och gick igenom efter den senaste ändringen. |  |
| `explain.while_you_are_away_it_can` | While you are away, it can stop risky steps by itself, if While away is set to Careful. | Medan du är borta kan vaken stoppa riskabla steg av sig själv, om När du är borta är satt till Försiktig. |  |
| `explain.you_applied_the_name_preset_a` | You applied the {name} preset: a named set of Settings choices. | Du tog i bruk läget {name}: en namngiven uppsättning val i Inställningar. |  |
| `explain.you_applied_title_typed_as_name` | You applied {title} (typed as {name}): a named set of Settings choices. | Du tog i bruk {title} (skrivet som {name}): en namngiven uppsättning val i Inställningar. |  |
| `explain.you_asked_for_the_same_kind` | You asked for the same kind of thing 3 times. Vaken offered to save it as a skill. | Du bad om samma sorts sak 3 gånger. Vaken erbjöd sig att spara det som en färdighet. |  |
| `explain.you_asked_for_the_starter_agents` | You asked for the starter agents, and vaken saved them in your agents folder. | Du bad om startagenterna, och vaken sparade dem i din agentmapp. |  |
| `explain.you_can_catch_up_in_one` | You can catch up in one read. | Du hinner ikapp med en enda läsning. |  |
| `explain.you_can_finish_a_step_from` | You can finish a step from your phone without the desk. | Du kan avsluta ett steg från telefonen utan skrivbordet. |  |
| `explain.you_can_go_back_to_this` | You can go back to this point if later work goes wrong. | Du kan gå tillbaka till den här punkten om senare arbete går fel. |  |
| `explain.you_can_see_how_the_page` | You can see how the page looks at phone, iPad and desktop size. | Du kan se hur sidan ser ut i telefon-, iPad- och datorstorlek. |  |
| `explain.you_can_steer_another_session` | You can steer another session without switching to it. | Du kan styra en annan session utan att byta till den. |  |
| `explain.you_can_tell_another_session` | You can tell another session what to do without switching to it. | Du kan säga åt en annan session vad den ska göra utan att byta till den. |  |
| `explain.you_changed_how_claude_shapes` | You changed how Claude shapes its answers: Short, Report or Default. | Du ändrade hur Claude formar sina svar: Kort, Rapport eller Standard. |  |
| `explain.you_compare_the_looks_at_a` | You compare the looks at a glance and do not read about them. | Du jämför utseendena med en blick och behöver inte läsa om dem. |  |
| `explain.you_get_a_cheap_helper_that` | You get a cheap agent that looks things up and a reviewer for changes. | Du får en billig agent som slår upp saker och en granskare för ändringar. |  |
| `explain.you_know_when_you_can_go` | You know when you can go on. | Du vet när du kan fortsätta. |  |
| `explain.you_pressed_a_picture_on_the` | You pressed a picture on the Preview card, and vaken took pictures of your page with Chrome in the background. | Du tryckte på en bild på Förhandsvisning-kortet, och vaken tog bilder av din sida med Chrome i bakgrunden. |  |
| `explain.you_pressed_a_row_of_agent` | You pressed a row of Agent setup, and vaken wrote one agent file or its block in your project CLAUDE.md. | Du tryckte på en rad i Agentuppsättning, och vaken skrev en agentfil eller dess block i projektets CLAUDE.md. |  |
| `explain.you_pressed_allow_once` | You pressed Allow once or typed /vaken-guard allow once. The stopped step may go through, one time. | Du tryckte på Tillåt en gång eller skrev /vaken-guard allow once. Det stoppade steget får gå igenom, en gång. |  |
| `explain.you_pressed_dismiss_on_a_stopped` | You pressed Dismiss on a stopped step. It left Needs you, and nothing was allowed. | Du tryckte på Avfärda på ett stoppat steg. Det lämnade Behöver dig, och inget tilläts. |  |
| `explain.you_pressed_pause_all` | You pressed Pause all or typed /vaken-pause. Commands, edits, tools, agents, web fetches and skills are paused until you resume. | Du tryckte på Pausa allt eller skrev /vaken-pause. Kommandon, ändringar, verktyg, agenter, webbhämtningar och färdigheter är pausade tills du återupptar. |  |
| `explain.you_restored_files_from_the` | You restored files from the copies that vaken kept before a change. | Du återställde filer från kopiorna som vaken sparade före en ändring. |  |
| `explain.you_saved_a_named_checkpoint_a` | You saved a named checkpoint: a copy of every file that changed so far. | Du sparade en namngiven kontrollpunkt: en kopia av varje fil som hittills har ändrats. |  |
| `explain.you_sent_a_message_from_this` | You sent a message from this session to another one, after you said yes. | Du skickade ett meddelande från den här sessionen till en annan, efter att du sagt ja. |  |
| `explain.you_sent_a_message_to_another` | You sent a message to another session with /vaken-pause steer, after you said yes. | Du skickade ett meddelande till en annan session med /vaken-pause steer, efter att du sagt ja. |  |
| `explain.you_switched_model_in_a_long` | You switched model in a long session while its saved copy (the cache) was warm. Vaken warned you first. | Du bytte modell i en lång session medan dess sparade kopia (cachen) var varm. Vaken varnade dig först. |  |
| `explain.you_typed_cockpit_away_on_the` | You typed /vaken-away on. Vaken knows you are gone. | Du skrev /vaken-away on. Vaken vet att du är borta. |  |
| `explain.you_typed_cockpit_budget_extend` | You typed /vaken-usage budget extend. The budget was raised so costly steps can run again. | Du skrev /vaken-usage budget extend. Budgeten höjdes så att dyra steg kan köras igen. |  |
| `explain.you_typed_cockpit_do_or_pressed` | You typed /vaken-help run do or pressed a command from Claude's last answer, and vaken ran it on this computer after the safety check looked at it. | Du skrev /vaken-help run do eller tryckte på ett kommando från Claudes senaste svar, och vaken körde det på den här datorn efter att säkerhetskontrollen tittat på det. |  |
| `explain.you_typed_cockpit_guard_allow` | You typed /vaken-guard allow once. The next stopped step may go through, one time. | Du skrev /vaken-guard allow once. Nästa stoppade steg får gå igenom, en gång. |  |
| `explain.you_typed_cockpit_steer_stop_the` | You typed /vaken-pause steer stop. Vaken paused this session and cancelled the running answer, if there was one. | Du skrev /vaken-pause steer stop. Vaken pausade den här sessionen och avbröt det pågående svaret, om det fanns ett. |  |
| `explain.you_were_away_claude_tried_a` | You were away. Claude tried a risky step, and vaken stopped it without asking. | Du var borta. Claude försökte ett riskabelt steg, och vaken stoppade det utan att fråga. |  |
| `explain.your_claude_md_files_which` | Your CLAUDE.md files, which Claude reads on every answer, are big or repeat lines. You were told once. | Dina CLAUDE.md-filer, som Claude läser varje svar, är stora eller upprepar rader. Du fick veta en gång. |  |
| `explain.your_cost_estimate_for_the` | Your cost estimate for the session or the day reached 80% or 100% of its budget. You were told; nothing was stopped. | Din kostnadsuppskattning för sessionen eller dagen nådde 80 % eller 100 % av budgeten. Du fick veta; inget stoppades. |  |
| `explain.your_message_looked_like_a_big` | Your message looked like a big task (long, or with two big verbs), and few files had changed. Vaken suggested a plan first. | Ditt meddelande såg ut som en stor uppgift (långt, eller med två stora verb), och få filer hade ändrats. Vaken föreslog en plan först. |  |
| `explain.your_message_looked_like_a_big_2` | Your message looked like a big task. Vaken told Claude to write a short plan and wait for your yes. | Ditt meddelande såg ut som en stor uppgift. Vaken sa åt Claude att skriva en kort plan och vänta på ditt ja. |  |
| `explain.your_new_message_is_on_a` | Your new message is on a new topic, and the session is big. Only you were told. | Ditt nya meddelande handlar om något nytt, och sessionen är stor. Bara du fick veta. |  |
| `explain.your_other_open_sessions_and` | Your other open sessions and what each one does now. You can pin or hide a session. Working means Claude did something in the last 2 minutes. | Dina andra öppna sessioner och vad var och en gör nu. Du kan fästa eller dölja en session. Arbetar betyder att Claude gjorde något de senaste 2 minuterna. |  |
| `explain.your_task_list_the_cockpit` | Your task list. Vaken starts an agent for each task, as many at a time as this computer has room for, each in its own folder copy when it writes code, checks each task when it ends, and stops an agent that runs too long or costs too much. /vaken-tasks shows it and steers it. | Din uppgiftslista. Vaken startar en agent för varje uppgift, så många åt gången som den här datorn har plats för, var och en i sin egen mappkopia när den skriver kod, kontrollerar varje uppgift när den är klar och stoppar en agent som kör för länge eller kostar för mycket. /vaken-tasks visar den och styr den. |  |

## band

The band above the prompt, and the lines it posts. (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `band.1_change_wait_for_your_look` | 1 change waits for your look. | 1 ändring väntar på att du tittar. |  |
| `band.1_held_step_waits_for_you` | 1 stopped step waits for you. Open Needs you. | 1 stoppat steg väntar på dig. Öppna Behöver dig. |  |
| `band.1_session_waits` | 1 session waits | 1 session väntar |  |
| `band.a_note_from_the_cockpit` | A note from vaken. | En notering från vaken. |  |
| `band.a_plugin_has_a_new_version` | A plugin has a new version since your last session. A plugin can change what Claude does. | Ett tillägg har en ny version sedan din senaste session. Ett tillägg kan ändra vad Claude gör. |  |
| `band.about_h_h` | about {h} h | ungefär {h} h |  |
| `band.about_h_h_m_min` | about {h} h {m} min | ungefär {h} h {m} min |  |
| `band.about_m_min` | about {m} min | ungefär {m} min |  |
| `band.about_saved` | {about} saved | {about} sparade |  |
| `band.allow_it_in_that_session` | Allow it in that session. | Tillåt det i den sessionen. |  |
| `band.area_failed_n_times_today` | {area} failed {n} times today | {area} misslyckades {n} gånger i dag |  |
| `band.back_after_when` | Back after {when}. | Tillbaka efter {when}. |  |
| `band.branch_name` | Branch {name}. | Gren {name}. |  |
| `band.claude_assumed_1_thing_cockpit` | Claude assumed 1 thing. /vaken-explain assumptions | Claude antog 1 sak. /vaken-explain assumptions |  |
| `band.claude_assumed_n_things_cockpit` | Claude assumed {n} things. /vaken-explain assumptions | Claude antog {n} saker. /vaken-explain assumptions |  |
| `band.claude_code` | Claude Code | Claude Code |  |
| `band.cockpit_did_1_thing` | Vaken did 1 thing | Vaken gjorde 1 sak |  |
| `band.cockpit_did_n_things` | Vaken did {n} things | Vaken gjorde {n} saker |  |
| `band.context_n_full` | Context {n}% full. | Kontexten är {n} % full. |  |
| `band.drift_n_edits_far_from_the` | Drift: {n} edits far from the goal | Kursavvikelse: {n} ändringar långt från målet |  |
| `band.goal_goal` | Goal: {goal} | Mål: {goal} |  |
| `band.it_waits_age` | It waits {age}. | Den har väntat {age}. |  |
| `band.it_waits_at_least_age` | It waits at least {age}. | Den har väntat minst {age}. |  |
| `band.just_now` | just now | nyss |  |
| `band.left_open_in_project_words` | Left open in {project}: {words} | Lämnat öppet i {project}: {words} |  |
| `band.n_changes_wait_for_your_look` | {n} changes wait for your look. | {n} ändringar väntar på att du tittar. |  |
| `band.n_done` | {n} done | {n} klara |  |
| `band.n_held_steps_wait_for_you` | {n} stopped steps wait for you. Open Needs you. | {n} stoppade steg väntar på dig. Öppna Behöver dig. |  |
| `band.n_plugins_updated` | {n} plugins updated | {n} tillägg uppdaterade |  |
| `band.n_sessions_wait` | {n} sessions wait | {n} sessioner väntar |  |
| `band.plugin_updated_name_to` | Plugin updated: {name} {to} | Tillägg uppdaterat: {name} {to} |  |
| `band.pr_number_1_check_failed` | PR {number}: 1 check failed | PR {number}: 1 kontroll misslyckades |  |
| `band.pr_number_n_checks_failed` | PR {number}: {n} checks failed | PR {number}: {n} kontroller misslyckades |  |
| `band.preset_name` | Preset: {preset} | Läge: {preset} |  |
| `band.rule_broken_command` | Rule broken: {command} | Regel bruten: {command} |  |
| `band.saved_p_of_your_plan` | saved {p}% of your plan | sparade {p} % av din plan |  |
| `band.saved_you_about` | saved you {about} | sparade vaken åt dig {about} |  |
| `band.session_session` | Session: {session} | Session: {session} |  |
| `band.session_this_session` | Session: this session. | Session: den här sessionen. |  |
| `band.shortened_the_chat_a_to_b` | Compacted the session, {a} to {b} | Komprimerade sessionen, {a} till {b} |  |
| `band.shown_ago_words` | Shown {ago}: {words} | Visades {ago}: {words} |  |
| `band.stopped_1_risky_step` | stopped 1 risky step | stoppade 1 riskabelt steg |  |
| `band.stopped_n_risky_steps` | stopped {n} risky steps | stoppade {n} riskabla steg |  |
| `band.task_run_paused_it_cost_more` | Task run paused: it cost more than {n} dollars | Uppgiftskörningen pausades: den kostade mer än {n} dollar |  |
| `band.task_run_stays_paused_the_plan` | Task run stays paused: the plan limit did not reset. Go on by hand. | Uppgiftskörningen förblir pausad: planens gräns återställdes inte. Fortsätt för hand. |  |
| `band.task_run_waits_for_the_plan` | Task run waits for the plan limit: it goes on at {time} | Uppgiftskörningen väntar på planens gräns: den fortsätter {time} |  |
| `band.the_cache_keeper` | The cache keeper | Cachevakten |  |
| `band.the_cockpit_did_1_thing` | Vaken did 1 thing | Vaken gjorde 1 sak |  |
| `band.the_cockpit_did_n_things` | Vaken did {n} things | Vaken gjorde {n} saker |  |
| `band.the_guard` | The safety check | Säkerhetskontrollen |  |
| `band.the_id_part` | The "{id}" part | Delen "{id}" |  |
| `band.the_loop_breaker` | The loop breaker | Loopbrytaren |  |
| `band.the_plugin_trust_card` | The plugin trust card | Tilläggens förtroendekort |  |
| `band.this_week_parts` | This week: {parts} | Den här veckan: {parts} |  |
| `band.this_week_the_cockpit_did_n` | one: This week: 1 thing done for you. /vaken-today value<br>other: This week: {n} things done for you. /vaken-today value | one: Den här veckan: 1 sak gjord åt dig. /vaken-today value<br>other: Den här veckan: {n} saker gjorda åt dig. /vaken-today value |  |
| `band.this_week_the_cockpit_words` | This week vaken {words}. | Den här veckan {words}. |  |
| `band.today_parts` | Today: {parts}. | I dag: {parts}. |  |
| `band.today_s_share_of_the_week` | Today's share of the week is used up | Dagens del av veckan är förbrukad |  |
| `band.under_1_yesterday` | under $1 yesterday | under 1 $ i går |  |
| `band.usd_yesterday` | {usd} yesterday | {usd} i går |  |
| `band.what_it_means` | What it means: | Vad det betyder: |  |
| `band.what_you_can_do` | What you can do: | Vad du kan göra: |  |
| `band.where_it_comes_from` | Where it comes from: | Varifrån det kommer: |  |
| `band.why_now` | Why now: | Varför nu: |  |
| `band.you_chose_a_style_a_named` | You chose a style: a named set of Settings choices. | Du valde ett läge: en namngiven uppsättning val i Inställningar. |  |
| `band.you_were_away_under_5_min` | You were away under 5 min. Nothing needs you. | Du var borta i under 5 min. Inget behöver dig. |  |
| `band.your_task_run_ended_or_paused` | Your task run ended or paused. The Agents card shows each task: open one to try it again, keep its work or throw it away. | Din uppgiftskörning tog slut eller pausades. Agentkortet visar varje uppgift: öppna en för att försöka igen, behålla arbetet eller kasta det. |  |

## guard

The guard: what it stops and why. (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `guard.a_database_migration` | a database migration | en databasmigrering |  |
| `guard.a_database_migration_warn_or` | A database migration. Warn, or stop it until you say yes. | En databasmigrering. Varna, eller stoppa tills du säger ja. |  |
| `guard.a_package_that_looks_odd` | a package that looks odd | ett paket som ser konstigt ut |  |
| `guard.a_risky_command` | a risky command | ett riskabelt kommando |  |
| `guard.a_step_that_reaches_outside_your` | a step that reaches outside your computer | ett steg som når utanför din dator |  |
| `guard.a_step_that_touches_a_secret` | a step that touches a secret | ett steg som rör en hemlighet |  |
| `guard.a_weakened_test` | a weakened test | ett försvagat test |  |
| `guard.allowed_the_next_held_step` | Allowed the next stopped step | Släppte igenom nästa stoppade steg |  |
| `guard.an_edit_outside_your_folders` | an edit outside your folders | en ändring utanför dina mappar |  |
| `guard.deleting_force_pushing_wiping` | Deleting, force-pushing, wiping. Stops if Claude Code would not ask first, else warns. | Radering, force-push, rensning. Stoppar om Claude Code inte skulle fråga först, annars varnar det. |  |
| `guard.dismissed_a_stopped_step` | Dismissed a stopped step | Avfärdade ett stoppat steg |  |
| `guard.edit_fence` | edit fence | mappgränsen |  |
| `guard.edits_outside_your_folders_and` | Edits outside your folders, and edits to protected files. | Ändringar utanför dina mappar, och ändringar i skyddade filer. |  |
| `guard.edits_that_skip_tests_or_remove` | Edits that skip tests or remove checks from them. | Ändringar som hoppar över tester eller tar bort kontroller från dem. |  |
| `guard.held_a_call_over_budget` | Held a call over budget | Stoppade ett anrop över budgeten |  |
| `guard.held_a_migration` | Held a migration | Stoppade en migrering |  |
| `guard.held_a_package_install` | Held a package install | Stoppade en paketinstallation |  |
| `guard.held_a_risky_command` | Held a risky command | Stoppade ett riskabelt kommando |  |
| `guard.held_a_step_that_touches_a` | Held a step that touches a secret | Stoppade ett steg som rör en hemlighet |  |
| `guard.held_a_weakened_test` | Held a weakened test | Stoppade ett försvagat test |  |
| `guard.held_an_action_outside_your` | Held an action outside your computer | Stoppade en åtgärd utanför din dator |  |
| `guard.held_an_edit_outside_the_fence` | Held an edit outside the fence | Stoppade en ändring utanför dina mappar |  |
| `guard.held_an_extra_agent` | Held an extra agent | Stoppade en extra agent |  |
| `guard.keep_the_last_50_shell_commands` | Keep the last 50 shell commands, as program and kind only. | Spara de senaste 50 skalkommandona, bara som program och slag. |  |
| `guard.let_a_held_step_through` | Let a stopped step through | Släppte igenom ett stoppat steg |  |
| `guard.list_what_leaves_this_computer` | List what leaves this computer each answer. | Lista vad som lämnar den här datorn varje svar. |  |
| `guard.messages_posts_payments_cloud` | Messages, posts, payments, cloud changes. Warn, or stop until you say yes. | Meddelanden, inlägg, betalningar, molnändringar. Varna, eller stoppa tills du säger ja. |  |
| `guard.migration_hold` | migration hold | spärren för migreringar |  |
| `guard.odd_new_packages_very_young_look` | Odd new packages: very young, look-alike names, deprecated. | Konstiga nya paket: mycket nya, namn som liknar andra, utfasade. |  |
| `guard.package_guard` | package check | paketkontrollen |  |
| `guard.real_world_guard` | outside-actions check | kontrollen av åtgärder utåt |  |
| `guard.risky_command_hold` | risky command hold | spärren för riskabla kommandon |  |
| `guard.risky_commands_and_secrets_stop_again` | Risky commands and secrets stop again where Claude Code would not ask | Riskabla kommandon och hemligheter stoppas igen där Claude Code inte skulle fråga |  |
| `guard.secret_files_read_keys_printed` | Secret files read, keys printed or sent. Stops if Claude Code would not ask, else warns. | Hemliga filer som läses, nycklar som skrivs ut eller skickas. Stoppar om Claude Code inte skulle fråga, annars varnar det. |  |
| `guard.secret_tripwire` | secret tripwire | hemlighetslarmet |  |
| `guard.tell_claude_that_web_and_app` | Tell Claude that web and app text is data, not orders. | Säg till Claude att text från webben och appar är data, inte order. |  |
| `guard.tell_claude_when_code_reads_an` | Tell Claude when code reads an env name no file declares. | Säg till Claude när kod läser ett env-namn som ingen fil deklarerar. |  |
| `guard.test_change_alert` | test change alert | teständringslarmet |  |
| `guard.warned_about_an_edit_outside_the` | Warned about an edit outside the fence | Varnade för en ändring utanför dina mappar |  |
| `guard.warned_before_an_action_outside` | Warned before an action outside your computer | Varnade för ett steg utanför din dator |  |
| `guard.what_n_times` | {what} ({n} times). | {what} ({n} gånger). |  |
| `guard.while_away_refuse_risky_steps_by` | While away, stop risky steps by themselves. | När du är borta: stoppa riskabla steg av sig själv. |  |

## needs

Needs you: what waits for an answer, and the inbox. (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `needs.a_check_failed_or_a_claim` | A check failed or a claim has no check | En kontroll misslyckades eller ett påstående saknar kontroll |  |
| `needs.a_helper_agent_has_gone_quiet` | An agent has gone quiet or a task of the run failed. | En agent har blivit tyst eller en uppgift i körningen misslyckades. |  |
| `needs.a_list_of_what_needs_you` | A list of what needs you, and a count above the chat box. | En lista över vad som behöver dig, och ett antal ovanför chattrutan. |  |
| `needs.a_list_of_what_waits_for` | A list of what waits for you, and a count above the chat box. | En lista över vad som väntar på dig, och ett antal ovanför chattrutan. |  |
| `needs.a_short_recap_when_you_come` | A short recap when you come back after a break. | En kort sammanfattning när du kommer tillbaka efter en paus. |  |
| `needs.a_toast_when_another_session` | A notice when another session needs you or finishes. | En notis när en annan session behöver dig eller blir klar. |  |
| `needs.alive` | Alive. | Vid liv. |  |
| `needs.an_agent_is_stuck_or_failed` | An agent is stuck or failed | En agent har fastnat eller misslyckats |  |
| `needs.asks_you_a_question` | Asks you a question. | Ställer en fråga till dig. |  |
| `needs.claude_did_work_that_was_checked` | Claude did work that was checked, and a check failed or no check backs a claim. | Claude gjorde arbete som kontrollerades, och en kontroll misslyckades eller ingen kontroll styrker ett påstående. |  |
| `needs.claude_tried_a_risky_step` | Claude tried a risky step. | Claude försökte ett riskabelt steg. |  |
| `needs.from_the_card` | from the card | från kortet |  |
| `needs.halted_every_step_that_changes` | Paused for safety. Commands, edits, tools, agents and web fetches are stopped. | Pausad för säkerhets skull. Kommandon, ändringar, verktyg, agenter och webbhämtningar stoppas. |  |
| `needs.look_at_the_changes_then_type` | Look at the changes, then type /vaken-ship reviewed in that session. | Titta på ändringarna och skriv sedan /vaken-ship reviewed i den sessionen. |  |
| `needs.name_ended` | "{name}" ended. | "{name}" tog slut. |  |
| `needs.name_finished` | "{name}" finished. | "{name}" blev klar. |  |
| `needs.name_finished_facts` | "{name}" finished: {facts}. | "{name}" blev klar: {facts}. | A watched session ended its turn; {facts} is what it got done |
| `needs.name_is_done_facts` | "{name}" is done: {facts}. | "{name}" är klar: {facts}. |  |
| `needs.name_needs_you` | "{name}" needs you. | "{name}" behöver dig. |  |
| `needs.name_needs_you_reason` | "{name}" needs you: {reason}. | "{name}" behöver dig: {reason}. |  |
| `needs.name_tests_passed` | "{name}": tests passed. | "{name}": testerna gick igenom. |  |
| `needs.news_from_other_cards` | News from other cards | Nytt från andra kort |  |
| `needs.no_notices_at_these_hours` | No notices at these hours. | Inga notiser de här timmarna. |  |
| `needs.nothing` | Nothing | Inget | The calm value of the Needs you card: one glance row, as tall as the other cards |
| `needs.nothing_changed_and_the_session_waits` | Nothing changed, and the session waits for you. | Inget ändrades, och sessionen väntar på dig. |  |
| `needs.open_that_session_and_answer_it` | Open that session and answer it. | Öppna den sessionen och svara. |  |
| `needs.open_that_session_and_answer_the` | Open that session and answer its question. | Öppna den sessionen och svara på dess fråga. |  |
| `needs.open_that_session_and_press_resume` | Open that session and press Resume. | Öppna den sessionen och tryck på Återuppta. |  |
| `needs.open_that_session_its_pane_has` | Open that session; its pane has Allow once. | Öppna den sessionen; dess panel har Tillåt en gång. |  |
| `needs.open_the_agents_card_view_all` | Open the Agents card (View: All) or ask Claude what it needs. | Öppna kortet Agenter (Vy: Alla) eller fråga Claude vad som behövs. |  |
| `needs.press_allow_once_then_tell` | Press Allow once, then tell Claude to try again. Allow once lets this one step run if Claude tries it again within 30 minutes. | Tryck på Tillåt en gång och be sedan Claude försöka igen. Tillåt en gång låter just det här steget köras om Claude försöker igen inom 30 minuter. |  |
| `needs.press_fix_to_put_a_fix` | Press Fix to put a fix request in the prompt box, then press Enter to send it. /vaken-ship ci-fix send does the same. | Tryck på Laga för att lägga en begäran om att laga i promptrutan, och tryck sedan på Enter för att skicka den. /vaken-ship ci-fix send gör samma sak. |  |
| `needs.press_resume_to_let_claude` | Press Resume to let Claude work again. /vaken-pause off does the same. | Tryck på Återuppta så att Claude kan arbeta igen. /vaken-pause off gör samma sak. |  |
| `needs.pull_request_n_a_check_failed` | Pull request {n}: a check failed | Pull request {n}: en kontroll misslyckades |  |
| `needs.says_when_a_working_session_has` | Says when a working session has gone quiet. | Säger till när en arbetande session har blivit tyst. |  |
| `needs.session_name_this_one` | Session: {name} (this one). | Session: {name} (den här). |  |
| `needs.stopped_age_ago_it_will_not_run` | Stopped {age} ago. It will not run unless you allow it. | Stoppades för {age} sedan. Det körs inte om du inte tillåter det. |  |
| `needs.stopped_just_now_it_will_not_run` | Stopped just now. It will not run unless you allow it. | Stoppades nyss. Det körs inte om du inte tillåter det. |  |
| `needs.stopped_try_again_in_claude_then_allow` | Stopped (try again in Claude, then allow) | Stoppad (försök igen i Claude, tillåt sedan) |  |
| `needs.tells_you_in_plain_words_what` | Tells you in plain words what the last answer did. | Berättar med enkla ord vad det senaste svaret gjorde. |  |
| `needs.the_chat_was_not_shortened_today` | The session was not compacted today. | Sessionen komprimerades inte i dag. |  |
| `needs.try_the_step_again_in_claude_when` | Try the step again in Claude. When it is stopped again, allow it then. | Försök steget igen i Claude. När det stoppas igen, tillåt det då. |  |
| `needs.type_cockpit_budget_extend_in` | Type /vaken-usage budget extend in that session, or leave it stopped. | Skriv /vaken-usage budget extend i den sessionen, eller låt det vara stoppat. |  |
| `needs.type_cockpit_guard_allow_once_in` | Type /vaken-guard allow once in that session, or leave it stopped. | Skriv /vaken-guard allow once i den sessionen, eller låt det vara stoppat. |  |
| `needs.type_cockpit_halt_off_in_that` | Type /vaken-pause off in that session when you are ready. | Skriv /vaken-pause off i den sessionen när du är redo. |  |
| `needs.typed_by_you` | typed by you | skrivet av dig |  |
| `needs.vaken_blocked_it_before_it_ran` | Vaken stopped it before it ran. | Vaken stoppade det innan det kördes. |  |
| `needs.wait_for_an_agent_to_finish` | Wait for an agent to finish, or raise the limit in Settings &gt; Agents. | Vänta tills en agent är klar, eller höj gränsen i Inställningar &gt; Agenter. |  |
| `needs.waits_to_run_tool_it_may` | Waits to run {tool}. It may need your OK. | Väntar på att köra {tool}. Den kan behöva ditt OK. |  |
| `needs.what_n_times` | {what}: {n} times. | {what}: {n} gånger. |  |
| `needs.what_once` | {what}: once. | {what}: en gång. |  |
| `needs.you_already_allowed_one_step` | You already allowed one step there. It goes through at the next stopped step. | Du har redan tillåtit ett steg där. Det går igenom vid nästa stoppade steg. |  |

## winwords

The guard on Windows (PowerShell). (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `winwords.curl_sh_risk` | You cannot read what it does before it runs. | Du kan inte läsa vad det gör innan det körs. |  |
| `winwords.curl_sh_what` | Downloads a script and runs it at once | Hämtar ett skript och kör det direkt |  |
| `winwords.decoded_sh_risk` | You cannot read what it does before it runs. | Du kan inte läsa vad det gör innan det körs. |  |
| `winwords.decoded_sh_what` | Decodes hidden text and runs it as a script at once | Avkodar dold text och kör den som ett skript direkt |  |
| `winwords.rg_pre_risk` | That program can do anything, and it runs once for each file. | Det programmet kan göra vad som helst, och det körs en gång för varje fil. |  |
| `winwords.rg_pre_what` | Searches with rg --pre, which runs a program on every file it searches | Söker med rg --pre, som kör ett program på varje fil som söks igenom |  |
| `winwords.win_backup_risk` | You can no longer go back to an earlier state of the computer. | Du kan inte längre gå tillbaka till ett tidigare läge för datorn. |  |
| `winwords.win_backup_what` | Deletes Windows backups or restore points | Raderar säkerhetskopior eller återställningspunkter i Windows |  |
| `winwords.win_delete_risk` | Deleting from the command line skips the Recycle Bin, so there is no undo. | Radering från kommandoraden går förbi Papperskorgen, så det går inte att ångra. |  |
| `winwords.win_delete_riskroot` | That is a whole drive, your user folder or a Windows system folder. Deleting skips the Recycle Bin, so there is no undo. | Det är en hel enhet, din användarmapp eller en systemmapp i Windows. Raderingen går förbi Papperskorgen, så det går inte att ångra. |  |
| `winwords.win_delete_what` | Permanently deletes | Raderar för gott |  |
| `winwords.win_download_risk` | You cannot read what it is before it runs. | Du kan inte läsa vad det är innan det körs. |  |
| `winwords.win_download_what` | Downloads or runs something with a system tool | Hämtar eller kör något med ett systemverktyg |  |
| `winwords.win_dynamic_risk` | Vaken cannot tell what it will do. | Vaken kan inte avgöra vad det kommer att göra. |  |
| `winwords.win_dynamic_what` | Runs a program whose name is only known when it runs | Kör ett program vars namn bara är känt när det körs |  |
| `winwords.win_elevate_risk` | It can change anything on the computer. | Det kan ändra vad som helst på datorn. |  |
| `winwords.win_elevate_what` | Runs with administrator rights | Körs med administratörsrättigheter |  |
| `winwords.win_encoded_risk` | You cannot read what it does before it runs. | Du kan inte läsa vad det gör innan det körs. |  |
| `winwords.win_encoded_what` | Runs a hidden, encoded PowerShell command | Kör ett dolt, kodat PowerShell-kommando |  |
| `winwords.win_format_risk` | Everything on it is erased. | Allt på den raderas. |  |
| `winwords.win_format_what` | Formats or wipes a disk or partition | Formaterar eller rensar en disk eller partition |  |
| `winwords.win_iex_risk` | What it runs is not visible before it runs. | Det som körs syns inte innan det körs. |  |
| `winwords.win_iex_what` | Runs text as a command (Invoke-Expression) | Kör text som ett kommando (Invoke-Expression) |  |
| `winwords.win_kill_risk` | Unsaved work in them is lost, and a broad name can end more than you meant. | Osparat arbete i dem går förlorat, och ett brett namn kan avsluta mer än du menade. |  |
| `winwords.win_kill_what` | Force-ends programs | Tvingar program att avslutas |  |
| `winwords.win_permissions_risk` | A wrong setting can lock you out of your own files or open them to everyone. | En felaktig inställning kan låsa ute dig från dina egna filer eller öppna dem för alla. |  |
| `winwords.win_permissions_what` | Changes who may use files or folders | Ändrar vem som får använda filer eller mappar |  |
| `winwords.win_registry_risk` | A wrong change can stop Windows or programs from starting. There is no undo. | En felaktig ändring kan hindra Windows eller program från att starta. Det går inte att ångra. |  |
| `winwords.win_registry_what` | Changes the Windows registry | Ändrar Windows-registret |  |
| `winwords.win_sync_risk` | Files that only exist in the target folder are deleted (robocopy /mir). | Filer som bara finns i målmappen raderas (robocopy /mir). |  |
| `winwords.win_sync_what` | Mirrors one folder over another and deletes the extra files in it | Speglar en mapp över en annan och raderar de extra filerna i den |  |
| `winwords.win_system_risk` | It can change how the whole computer starts, runs or is protected. | Det kan ändra hur hela datorn startar, körs eller skyddas. |  |
| `winwords.win_system_what` | Changes a Windows system setting | Ändrar en systeminställning i Windows |  |
| `winwords.win_unparsed_risk` | It may delete or change things. Check it before it runs. | Det kan radera eller ändra saker. Kontrollera det innan det körs. |  |
| `winwords.win_unparsed_what` | Runs a Windows command vaken could not read | Kör ett Windows-kommando som vaken inte kunde läsa |  |
| `winwords.win_wipe_risk` | It takes a long time and removes the traces of deleted files for good. | Det tar lång tid och tar bort spåren av raderade filer för gott. |  |
| `winwords.win_wipe_what` | Overwrites the free space on a drive | Skriver över det lediga utrymmet på en enhet |  |
| `winwords.win_write_protected_risk` | It can break Windows or programs, and the change may be hard to find. | Det kan förstöra Windows eller program, och ändringen kan vara svår att hitta. |  |
| `winwords.win_write_protected_what` | Writes to or moves things in a protected Windows folder | Skriver till eller flyttar saker i en skyddad Windows-mapp |  |

## pane

The pane: the live lines of the cards. (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `pane.1_claim` | 1 claim | 1 påstående |  |
| `pane.1_finished_turn_changed_files_and` | 1 finished answer changed files and waits for your look. | 1 avslutat svar ändrade filer och väntar på att du tittar. |  |
| `pane.1_idle` | 1 idle | 1 inaktiv | One other session that is idle; the plural is "{n} idle". |
| `pane.1_session_needs_you` | 1 session needs you | 1 session behöver dig |  |
| `pane.1_turn` | 1 answer | 1 svar |  |
| `pane.a_of_b_tokens` | {a} of {b} tokens | {a} av {b} tokens |  |
| `pane.a_repeated_request_can_be_a` | A repeated request can be a skill | En upprepad begäran kan bli en färdighet |  |
| `pane.about_k_freed` | about {k} freed | ungefär {k} frigjorda |  |
| `pane.age_ago` | {age} ago | för {age} sedan |  |
| `pane.agent_limit_reached` | Agent cap reached | Agenttaket nådd |  |
| `pane.all_n` | all {n} | alla {n} |  |
| `pane.allowed_the_next_stopped_step` | Allowed the next stopped step | Släppte igenom nästa stoppade steg |  |
| `pane.another_session_is_in_this_folder` | Another session is in this folder. | En annan session är i den här mappen. |  |
| `pane.asked_about_shortening_at_good_moments` | Asked about compacting at good moments | Frågade om att komprimera vid bra stunder |  |
| `pane.asked_claude_for_a_plan_first` | Asked Claude for a plan first | Bad Claude om en plan först |  |
| `pane.asked_claude_to_plan_first` | Asked Claude to plan first. | Bad Claude planera först. |  |
| `pane.at_time` | at {time} | kl. {time} |  |
| `pane.away_risky_steps_are_refused` | Away: risky steps are stopped | Borta: riskabla steg stoppas |  |
| `pane.big_task_a_plan_first_is` | Big task. A plan first is cheaper than a redo. | Stor uppgift. En plan först är billigare än att göra om. |  |
| `pane.blocked_the_same_step_again` | Blocked the same step again | Stoppade samma steg igen |  |
| `pane.cache_hit_hit_lapsed` | Cache {hit}% hit · lapsed | Cache {hit} % träff · kall |  |
| `pane.cache_hit_hit_warm_n_min` | Cache {hit}% hit · warm {n} min | Cache {hit} % träff · varm {n} min |  |
| `pane.cache_lapsed` | Cache lapsed | Cache kall |  |
| `pane.cache_warm_n_min` | Cache warm {n} min | Cache varm {n} min |  |
| `pane.caught_a_repeating_step` | Caught a repeating step | Fångade ett upprepat steg |  |
| `pane.caught_a_step_that_breaks_a` | Caught a step that breaks a rule | Fångade ett steg som bryter mot en regel |  |
| `pane.changed_permissions` | changed permissions | ändrade behörigheter |  |
| `pane.changed_the_answer_shape` | Changed the answer shape | Ändrade svarsformen |  |
| `pane.checked_itself_after_an_update` | Checked itself after an update | Kontrollerade sig själv efter en uppdatering |  |
| `pane.claude_said_done_but_no_check` | Claude said done, but no check backs it | Claude sa klart, men ingen kontroll styrker det |  |
| `pane.cockpit_self_check_failed` | Vaken self-test failed | Vakens självtest misslyckades |  |
| `pane.commands` | Commands | Kommandon |  |
| `pane.context_is_n_full` | Context is {n}% full | Kontexten är {n} % full |  |
| `pane.credit_limit_v` | Credit limit: {v} | Kreditgräns: {v} |  |
| `pane.deleted_files` | deleted files | raderade filer |  |
| `pane.edits` | Edits | Ändringar |  |
| `pane.ended_away_mode_with_a_digest` | Ended away mode with a digest | Avslutade frånvaroläget med en sammanfattning |  |
| `pane.estimate_about_n_at_the_reset` | Estimate: about {n}% at the reset, at this pace. | Uppskattning: runt {n} % vid återställningen i den här takten. |  |
| `pane.estimate_it_runs_out_when_before` | Estimate: it runs out {when}, before the reset. | Uppskattning: tar slut {when}, före återställningen. |  |
| `pane.extended_the_budget` | Extended the budget | Utökade budgeten |  |
| `pane.extra` | Extra | Extra |  |
| `pane.extra_usage_v` | Extra usage: {v} | Extra användning: {v} |  |
| `pane.failed` | failed | misslyckades |  |
| `pane.fixed` | Fixed | Fast | The tag of the Needs you tile on the Arrange board: it stays first and cannot be moved |
| `pane.found_an_instruction_hidden_in_outside` | Found an instruction hidden in outside text | Hittade en instruktion gömd i text utifrån |  |
| `pane.found_something_broken` | Found something broken | Hittade något trasigt |  |
| `pane.full_why` | Full: {why} | Fullt: {why} |  |
| `pane.going_round_in_circles` | Going round in circles | Går runt i cirklar |  |
| `pane.gone_quiet` | Gone idle | Har blivit inaktiv |  |
| `pane.halted_all_changes` | Paused all changes | Pausade alla ändringar |  |
| `pane.helper_held_the_computer_is_full` | Agent stopped: the computer is full | Agenten stoppad: datorn är full |  |
| `pane.here_waits_halt` | Paused. It waits for you to resume it. | Pausad. Den väntar på att du återupptar den. |  |
| `pane.here_waits_hold` | A stopped step waits for you in Needs you. | Ett stoppat steg väntar på dig i Behöver dig. |  |
| `pane.how_strict` | How strict | Hur strikt |  |
| `pane.in_n_days` | in {n} d | om {n} d |  |
| `pane.installed_a_package` | installed a package | installerade ett paket |  |
| `pane.instruction_files_are_heavy` | Instruction files are heavy | Instruktionsfilerna är tunga |  |
| `pane.it_resets_when` | It resets {when} | Återställs {when} |  |
| `pane.kept_cheap` | kept cheap | hålls billigt |  |
| `pane.kept_the_cache_warm` | Kept the cache warm | Höll cachen varm |  |
| `pane.kept_the_mac_awake` | Kept the Mac awake | Höll Macen vaken |  |
| `pane.kept_your_tips_after_an_update` | Kept your tips after an update | Behöll dina tips efter en uppdatering |  |
| `pane.last_read_age_ago` | Last read {age} ago. | Senast läst för {age} sedan. |  |
| `pane.last_reported_age_ago` | Last reported {age} ago | Senast rapporterad för {age} sedan |  |
| `pane.let_a_stopped_step_through` | Let a stopped step through | Släppte igenom ett stoppat steg |  |
| `pane.lifted_the_halt` | Resumed after a pause | Återupptog efter en paus |  |
| `pane.limit_reset_type_continue` | Limit reset: type continue | Gränsen återställd: skriv continue |  |
| `pane.lint` | Lint | Lint |  |
| `pane.main_is_red` | Main is red | Main är röd |  |
| `pane.may_be_stuck` | May be stuck | Kan ha fastnat |  |
| `pane.memory_is_tight` | memory is tight | minnet är trångt |  |
| `pane.mixed` | mixed | blandat |  |
| `pane.n_at_reset` | ~{n}% at reset | ~{n} % vid återställning |  |
| `pane.n_claims` | {n} claims | {n} påståenden |  |
| `pane.n_hidden` | {n} hidden | {n} dolda |  |
| `pane.n_hidden_in_settings` | {n} hidden in Settings. | {n} dolda i Inställningar. |  |
| `pane.n_idle` | {n} idle | {n} inaktiva |  |
| `pane.n_no_end_seen` | {n} no end seen | {n} utan sett slut |  |
| `pane.n_of_the_credit_limit_used` | {n}% of the credit limit used | {n} % av kreditgränsen använt |  |
| `pane.n_sessions_need_you` | {n} sessions need you | {n} sessioner behöver dig |  |
| `pane.n_tokens_used` | {n} tokens used | {n} tokens använda |  |
| `pane.n_turns` | {n} answers | {n} svar |  |
| `pane.named_a_checkpoint` | Named a checkpoint | Namngav en kontrollpunkt |  |
| `pane.new_topic_a_fresh_session_costs` | New topic? A fresh session costs less. | Nytt ämne? En ny session kostar mindre. |  |
| `pane.none_running` | None running | Ingen kör |  |
| `pane.none_seen` | None seen | Inga sedda |  |
| `pane.not_reported_yet` | not reported yet | inte rapporterad än |  |
| `pane.not_run` | not run | inte körd |  |
| `pane.not_run_since_the_last_edit` | not run since the last edit | inte körd sedan senaste ändringen |  |
| `pane.noted_an_env_name_nobody_declared` | Noted an env name nobody declared | Noterade ett env-namn som ingen fil anger |  |
| `pane.nothing_today` | Nothing today | Inget i dag |  |
| `pane.nothing_waits_for_your_look` | Nothing waits for your look | Inget väntar på att du tittar |  |
| `pane.nothing_waits_for_your_look_2` | Nothing waits for your look. | Inget väntar på att du tittar. |  |
| `pane.noticed_a_plugin_update` | Noticed a plugin update | Såg en uppdatering av ett tillägg |  |
| `pane.noticed_big_instruction_files` | Noticed big instruction files | Såg stora instruktionsfiler |  |
| `pane.noticed_work_far_from_the_goal` | Noticed work far from the goal | Såg arbete långt från målet |  |
| `pane.offered_a_queued_prompt` | Offered a queued prompt | Erbjöd en köad prompt |  |
| `pane.offered_a_skill_for_a_repeated` | Offered a skill for a repeated request | Föreslog en färdighet för en upprepad begäran |  |
| `pane.out_when` | out {when} | slut {when} |  |
| `pane.packages` | Packages | Paket |  |
| `pane.passed` | passed | gick igenom |  |
| `pane.paused_a_task_run_for_the` | Paused a task run for the plan limit | Pausade en uppgiftskörning för planens gräns |  |
| `pane.pushed_to_a_remote` | pushed to a remote | pushade till en fjärrserver |  |
| `pane.ran_a_block_from_the_answer` | Ran a block from the answer | Körde ett block från svaret |  |
| `pane.ran_a_migration` | ran a migration | körde en migrering |  |
| `pane.ran_a_script_from_the_web` | ran a script from the web | körde ett skript från webben |  |
| `pane.ran_result_not_clear` | ran, result not clear | kördes, oklart resultat |  |
| `pane.reading_the_computer` | Reading the computer… | Läser av datorn… |  |
| `pane.recent_pace_n_an_hour` | Recent pace: {n}% an hour. | Senaste takt: {n} % i timmen. |  |
| `pane.recent_pace_n_an_hour_so` | Recent pace: {n}% an hour, so it runs out {when}. | Senaste takt: {n} % i timmen, så den tar slut {when}. |  |
| `pane.refused_a_risky_step_while_away` | Refused a risky step while away | Stoppade ett riskabelt steg medan du var borta |  |
| `pane.refused_a_step_while_halted` | Refused a step while paused | Stoppade ett steg medan allt var pausat |  |
| `pane.reminded_about_a_limit_reset` | Reminded about a limit reset | Påminde om att gränsen återställts |  |
| `pane.resets_when` | resets {when} | återställs {when} |  |
| `pane.restored_files_from_a_copy` | Restored files from a copy | Återställde filer från en kopia |  |
| `pane.resumed_after_a_limit` | Resumed after a limit | Fortsatte efter en gräns |  |
| `pane.risky_list` | Risky: {list} | Riskabelt: {list} |  |
| `pane.room_for_1_more_helper` | Room for 1 more agent | Plats för 1 agent till |  |
| `pane.room_for_n_more_helpers` | Room for {n} more agents | Plats för {n} agenter till |  |
| `pane.sent_a_lookup_agent_to_a` | Sent a lookup agent to a cheaper model | Skickade en uppslagsagent till en billigare modell |  |
| `pane.sent_a_lookup_helper_to_a` | Sent a lookup agent to a cheaper model | Skickade en uppslagsagent till en billigare modell |  |
| `pane.sent_a_message_to_another_session` | Sent a message to another session | Skickade ett meddelande till en annan session |  |
| `pane.session_limit_5_h` | 5-hour limit | 5-timmarsgräns |  |
| `pane.shortened_a_session` | Compacted a session | Komprimerade en session |  |
| `pane.shortened_the_chat_by_itself` | Compacted the session by itself | Komprimerade sessionen av sig själv |  |
| `pane.shortened_the_chat_times_about_k` | compacted the session {times}, about {k} freed | komprimerade sessionen {times}, ungefär {k} frigjorda |  |
| `pane.shortened_the_chat_times_k_freed` | compacted the session {times}, {k} freed | komprimerade sessionen {times}, {k} frigjorda |  |
| `pane.shortened_the_session_by_itself` | Compacted the session by itself | Komprimerade sessionen av sig själv |  |
| `pane.spend` | Spend | Utgift |  |
| `pane.spending_limit` | Spending limit | Utgiftsgräns |  |
| `pane.spotted_odd_behaviour` | Spotted odd behaviour | Såg ett konstigt beteende |  |
| `pane.stop` | stop | stoppar |  |
| `pane.stopped_a_call_over_budget` | Stopped a call over budget | Stoppade ett anrop över budgeten |  |
| `pane.stopped_a_migration` | Stopped a migration | Stoppade en migrering |  |
| `pane.stopped_a_package_install` | Stopped a package install | Stoppade en paketinstallation |  |
| `pane.stopped_a_risky_command` | Stopped a risky command | Stoppade ett riskabelt kommando |  |
| `pane.stopped_a_risky_step_while_away` | Stopped a risky step while away | Stoppade ett riskabelt steg medan du var borta |  |
| `pane.stopped_a_step_that_touches_a` | Stopped a step that touches a secret | Stoppade ett steg som rör en hemlighet |  |
| `pane.stopped_a_step_while_halted` | Stopped a step while paused | Stoppade ett steg medan allt var pausat |  |
| `pane.stopped_a_weakened_test` | Stopped a weakened test | Stoppade ett försvagat test |  |
| `pane.stopped_an_action_outside_your_computer` | Stopped an action outside your computer | Stoppade en åtgärd utanför din dator |  |
| `pane.stopped_an_edit_outside_your_folders` | Stopped an edit outside your folders | Stoppade en ändring utanför dina mappar |  |
| `pane.stopped_an_extra_agent` | Stopped an extra agent | Stoppade en extra agent |  |
| `pane.stopped_keeping_the_mac_awake_limit` | Stopped keeping the Mac awake: limit reached | Slutade hålla Macen vaken: gränsen nådd |  |
| `pane.stopped_the_same_step_again` | Stopped the same step again | Stoppade samma steg igen |  |
| `pane.stopped_this_session` | Stopped this session | Stoppade den här sessionen |  |
| `pane.subscription_plan` | Subscription: {plan} | Abonnemang: {plan} |  |
| `pane.suggested_a_fresh_session` | Suggested a fresh session | Föreslog en ny session |  |
| `pane.suggested_a_plan_first` | Suggested a plan first | Föreslog en plan först |  |
| `pane.task_run_paused_by_the_plan` | Task run paused by the plan limit. Go on after the reset. | Uppgiftskörningen pausad av planens gräns. Fortsätt efter återställningen. |  |
| `pane.tests` | Tests | Tester |  |
| `pane.the_agent_limit_is_reached` | the agent cap is reached | agenttaket är nådd |  |
| `pane.the_battery_is_low` | the battery is low | batteriet är lågt |  |
| `pane.the_build` | The build | Bygget |  |
| `pane.the_laptop_gauge_is_off` | The computer reading is off | Datorbelastningn är av |  |
| `pane.the_mac_reports_memory_pressure` | the Mac reports memory pressure | Macen rapporterar minnestryck |  |
| `pane.the_pc_reports_memory_pressure` | the PC reports memory pressure | datorn rapporterar minnestryck |  |
| `pane.the_processor_is_busy` | the processor is busy | processorn är upptagen |  |
| `pane.the_processor_is_hot` | the processor is hot | processorn är varm |  |
| `pane.the_type_check` | The type check | Typkontrollen |  |
| `pane.took_pictures_of_a_page` | Took pictures of a page | Tog bilder av en sida |  |
| `pane.turned_off_away_mode` | Turned off away mode | Stängde av frånvaroläget |  |
| `pane.turned_on_away_mode` | Turned on away mode | Slog på frånvaroläget |  |
| `pane.updated_agent_setup` | Updated agent setup | Uppdaterade agentuppsättningen |  |
| `pane.used_sudo` | used sudo | använde sudo |  |
| `pane.used_v` | Used: {v} | Använt: {v} |  |
| `pane.vague_prompt_add_the_file_or` | Vague prompt. Add the file or the goal. | Otydlig prompt. Lägg till filen eller målet. |  |
| `pane.waiting_for_the_limit_to_reset` | Waiting for the limit to reset | Väntar på att gränsen återställs |  |
| `pane.warn` | warn | varnar |  |
| `pane.warn_worst_may_stop` | warn, worst may stop | varnar, värsta kan stoppa |  |
| `pane.warned_about_a_file_another_session` | Warned about a file another session is editing | Varnade för en fil som en annan session ändrar |  |
| `pane.warned_about_a_migration` | Warned about a migration | Varnade för en migrering |  |
| `pane.warned_about_a_package_install` | Warned about a package install | Varnade för en paketinstallation |  |
| `pane.warned_about_a_port_another_session` | Warned about a port another session holds | Varnade för en port som en annan session håller |  |
| `pane.warned_about_a_risky_command` | Warned about a risky command | Varnade för ett riskabelt kommando |  |
| `pane.warned_about_a_secret` | Warned about a secret | Varnade för en hemlighet |  |
| `pane.warned_about_a_session_in_the` | Warned about a session in the same folder | Varnade för en session i samma mapp |  |
| `pane.warned_about_a_step_outside_your` | Warned about a step outside your computer | Varnade för ett steg utanför din dator |  |
| `pane.warned_about_a_weakened_test` | Warned about a weakened test | Varnade för ett försvagat test |  |
| `pane.warned_about_an_edit_outside_your` | Warned about an edit outside your folders | Varnade för en ändring utanför dina mappar |  |
| `pane.warned_about_the_budget` | Warned about the budget | Varnade för budgeten |  |
| `pane.warned_about_too_many_agents` | Warned about too many agents | Varnade för för många agenter |  |
| `pane.warned_before_a_model_switch` | Warned before a model switch | Varnade före ett modellbyte |  |
| `pane.warned_that_a_screen_changed` | Warned that a screen changed | Varnade för att en skärm ändrats |  |
| `pane.week` | Week | Vecka |  |
| `pane.weekly_limit` | Weekly limit | Veckogräns |  |
| `pane.weekly_limit_all_models` | Weekly limit · all models | Veckogräns · alla modeller |  |
| `pane.went_on_with_a_task_run` | Went on with a task run after a limit reset | Fortsatte en uppgiftskörning efter att gränsen återställts |  |
| `pane.where_it_comes_from_claude_code` | Where it comes from: Claude Code | Varifrån det kommer: Claude Code |  |
| `pane.worst_stop` | worst stop | värsta stoppas |  |
| `pane.wrote_a_session_packet` | Wrote a session packet | Skrev ett sessionspaket |  |
| `pane.wrote_starter_agents` | Wrote starter agents | Skrev startagenter |  |
| `pane.your_mode_follows_the_new_modes` | Your mode follows the new modes after an update | Ditt läge följer de nya lägena efter en uppdatering |  |
| `pane.your_turn` | Your turn | Din tur |  |

## glance

Glance rows: one headline per card. (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `glance.1_used` | 1 used | 1 använd |  |
| `glance.all_clear` | All clear | Allt väl |  |
| `glance.all_done` | All done | Alla klara |  |
| `glance.all_n` | All {n} | Alla {n} |  |
| `glance.all_small` | All small | Allt litet |  |
| `glance.busy` | busy | upptagen |  |
| `glance.changed` | Changed | Ändrad |  |
| `glance.conflict` | Conflict | Konflikt |  |
| `glance.context` | Context | Kontext |  |
| `glance.context_pct_full` | Context {pct} full | Kontext {pct} full |  |
| `glance.cores` | cores | kärnor |  |
| `glance.error` | Error | Fel |  |
| `glance.glance` | Glance | Överblick |  |
| `glance.halted` | Paused for safety | Pausad för säkerhets skull |  |
| `glance.heat` | heat | värme |  |
| `glance.heavy` | Heavy | Tung |  |
| `glance.helpers` | Agents | Agenter |  |
| `glance.in_sync` | Up to date | Aktuell |  |
| `glance.is_there_room_computer` | Is there room? (Computer) | Finns det plats? (Dator) |  |
| `glance.lean` | Lean | Lätt |  |
| `glance.limited_by` | limited by | begränsas av |  |
| `glance.memory` | memory | minnet |  |
| `glance.memory_pressure` | memory pressure | minnestryck |  |
| `glance.mixed` | Mixed | Blandat |  |
| `glance.more` | more | till |  |
| `glance.n_failed` | {n} failed | {n} misslyckades |  |
| `glance.n_failing` | {n} failing | {n} misslyckas |  |
| `glance.n_held` | {n} stopped | {n} stoppade |  |
| `glance.n_in_needs_you` | {n} in Needs you | {n} i Behöver dig |  |
| `glance.n_open` | {n} open | {n} öppna |  |
| `glance.n_running` | {n} running | {n} körs |  |
| `glance.n_stuck` | {n} with no progress | {n} utan framsteg |  |
| `glance.n_to_fix` | {n} to fix | {n} att laga |  |
| `glance.n_to_review` | {n} to review | {n} att granska |  |
| `glance.n_to_run` | {n} to run | {n} att köra |  |
| `glance.n_today` | {n} today | {n} i dag |  |
| `glance.n_unproven` | {n} unproven | {n} obevisade |  |
| `glance.n_used` | {n} used | {n} använda |  |
| `glance.n_waiting_for_you` | {n} waiting for you | {n} väntar på dig |  |
| `glance.n_working` | {n} working | {n} arbetar |  |
| `glance.n_your_turn` | {n} your turn | {n} väntar på dig |  |
| `glance.name_colon_pct_used` | {name}: {pct} used | {name}: {pct} använt |  |
| `glance.name_pct_used` | {name} {pct} used | {name} {pct} använt |  |
| `glance.no_room` | No room for another agent | Inget utrymme för en agent till |  |
| `glance.no_server` | No dev server running | Ingen utvecklingsserver igång |  |
| `glance.none` | None | Inga |  |
| `glance.none_open` | None open | Ingen öppen |  |
| `glance.none_used` | None used | Inga använda |  |
| `glance.not_known_yet` | Not known yet | Inte känt än |  |
| `glance.not_read` | not read | inte läst |  |
| `glance.not_reported` | Not reported | Inte rapporterad |  |
| `glance.not_started` | Not started | Inte startad |  |
| `glance.nothing_open` | Nothing open | Inget öppet |  |
| `glance.nothing_yet` | Nothing yet | Inget än |  |
| `glance.out_of_date` | Out of date | Inaktuell |  |
| `glance.pct_of_the_5_hour_limit` | {pct} of the 5-hour limit | {pct} av 5-timmarsgränsen |  |
| `glance.pct_used` | {pct} used | {pct} använt |  |
| `glance.reading` | Measuring load | Mäter belastning |  |
| `glance.ready` | Ready | Redo |  |
| `glance.room_for_about_n` | Room for about {n} | Plats för ungefär {n} |  |
| `glance.room_for_helpers` | Room for agents | Plats för agenter |  |
| `glance.room_for_n` | Room for {n} | Plats för {n} |  |
| `glance.running` | Running | Körs |  |
| `glance.setup` | Setup | Uppsättning |  |
| `glance.ship` | Ship | Leverans |  |
| `glance.shorten_now` | Compact now | Komprimera nu |  |
| `glance.shortens_at` | Compacts at | Komprimerar vid |  |
| `glance.silent` | Silent | Tyst |  |
| `glance.state` | State | Status |  |
| `glance.the_agent_limit` | the agent cap | agenttaket |  |
| `glance.the_battery` | the battery | batteriet |  |
| `glance.the_processor` | the processor | processorn |  |
| `glance.trust` | Safety | Säkerhet |  |
| `glance.unchecked` | Unchecked | Okontrollerad |  |
| `glance.up` | Up | Uppe |  |
| `glance.used` | used | använt |  |
| `glance.warns` | Warns | Varnar |  |
| `glance.warns_may_stop_the_worst` | Watching risky steps | Bevakar riskfyllda steg |  |
| `glance.warns_only` | Warns only | Bara varningar |  |
| `glance.warns_stops_the_worst` | Warns, stops the worst | Varnar, stoppar det värsta |  |

## cardsettings

The flip side of a card (its own settings). (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `cardsettings.arranging_drag_a_card_to_a` | Arranging: drag a card to a new place. | Ordnar: dra ett kort till en ny plats. |  |
| `cardsettings.arranging_for_this_width_1_column` | Arranging for this width (1 column). Other widths keep their own order. | Ordnar för den här bredden (1 kolumn). Andra bredder behåller sin egen ordning. |  |
| `cardsettings.arranging_for_this_width_n_columns` | Arranging for this width ({n} columns). Other widths keep their own order. | Ordnar för den här bredden ({n} kolumner). Andra bredder behåller sin egen ordning. |  |
| `cardsettings.back` | ‹ Back | ‹ Tillbaka |  |
| `cardsettings.cards_that_auto_hides_are_not` | Cards that Auto hides are not shown here. They appear at their place in the order. | Kort som Auto döljer visas inte här. De dyker upp på sin plats i ordningen. |  |
| `cardsettings.detail_of_this_card` | Detail of this card | Detalj för det här kortet |  |
| `cardsettings.more_in_settings` | All Settings › | Alla Inställningar › |  |
| `cardsettings.n_more_in_settings` | {n} more in Settings › | {n} till i Inställningar › |  |
| `cardsettings.show_this_card` | Show this card | Visa det här kortet |  |
| `cardsettings.spending_limits_estimates` | Spending limits (estimates) | Utgiftsgränser (uppskattningar) |  |
| `cardsettings.switched_to_custom_so_you_can` | Switched to Custom so you can arrange. Your cards stay the same. | Bytte till Egen så att du kan ordna. Dina kort är desamma. |  |

## sys

Words of the system (Mac or PC). (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `sys.block_n_this_needs_a_shell` | Block {n}: This needs a shell I could not find. | Block {n}: Det här behöver ett skal som jag inte hittade. |  |
| `sys.it_looks_for_node_python_vite` | It looks for node, python, vite, next, webpack, esbuild and tsc programs, older than a minute, whose command names the folder of a session that has ended, or a worktree where no session works. | Den letar efter node-, python-, vite-, next-, webpack-, esbuild- och tsc-program, äldre än en minut, vars kommando nämner mappen för en session som har avslutats, eller en worktree där ingen session arbetar. |  |
| `sys.keep_pc_awake` | Keep PC awake | Håll datorn vaken |  |
| `sys.keep_the_pc_awake_for_a` | Keep the PC awake for a phone or a waiting question. | Håll datorn vaken för en telefon eller en fråga som väntar. |  |
| `sys.keep_the_pc_awake_while_agents` | Keep the PC awake while agents work. | Håll datorn vaken medan agenter arbetar. |  |
| `sys.keep_the_pc_awake_while_you` | Keep the PC awake while you are away? Reply /vaken-help run awake on | Hålla datorn vaken medan du är borta? Svara /vaken-help run awake on |  |
| `sys.kept_the_pc_awake` | Kept the PC awake | Höll datorn vaken |  |
| `sys.leftover_programs_the_process_list` | Leftover programs: the process list did not answer, so nothing could be checked. | Kvarglömda program: processlistan svarade inte, så inget kunde kontrolleras. |  |
| `sys.like_the_pc` | Like the PC | Som datorn |  |
| `sys.look_at_each_line_before_you` | Look at each line before you run it: a program you started by hand in that folder looks the same. Windows does not tell the working folder of a program, so the folder is read from the program's command; a program started without its folder in the command is not listed. Vaken never stops a program. | Titta på varje rad innan du kör den: ett program du startade för hand i den mappen ser likadant ut. Windows berättar inte ett programs arbetsmapp, så mappen läses från programmets kommando; ett program som startats utan sin mapp i kommandot listas inte. Vaken stoppar aldrig ett program. |  |
| `sys.no_program_names_a_known_session` | No program names a known session folder in its command, so no program could be matched to a folder. | Inget program nämner en känd sessionsmapp i sitt kommando, så inget program kunde kopplas till en mapp. |  |
| `sys.pc_awake` | PC awake | Datorn vaken |  |
| `sys.runs_this_command_in_the_session` | Runs this command in the session folder after you press. The result shows under the row. It runs in PowerShell. | Kör kommandot i sessionens mapp när du trycker. Resultatet visas under raden. Det körs i PowerShell. |  |
| `sys.stopped_keeping_the_pc_awake_limit` | Stopped keeping the PC awake: limit reached | Slutade hålla datorn vaken: gränsen nådd |  |
| `sys.the_pc_was_kept_awake_for` | The PC was kept awake for 8 hours, which is the most vaken allows. It lets the PC sleep now. | Datorn hölls vaken i 8 timmar, vilket är det mesta vaken tillåter. Den får sova nu. |  |
| `sys.the_ports_could_not_be_read` | The ports could not be read: the netstat program did not answer. | Portarna kunde inte läsas: programmet netstat svarade inte. |  |
| `sys.this_needs_a_shell_i_could` | This needs a shell I could not find. | Det här behöver ett skal som jag inte hittade. |  |
| `sys.this_one_looks_risky_press_once` | This one looks risky. Press once to see it, then Yes, run it. It runs in PowerShell. | Det här ser riskabelt ut. Tryck en gång för att se det, sedan Ja, kör det. Det körs i PowerShell. |  |
| `sys.type_cockpit_do_n_yes_to` | To run block {n}, type: /vaken-help run do {n} yes. It runs in PowerShell. | För att köra block {n}, skriv: /vaken-help run do {n} yes. Det körs i PowerShell. |  |
| `sys.type_cockpit_do_n_yes_yes` | It looks risky. To run block {n} anyway, type: /vaken-help run do {n} yes yes. It runs in PowerShell. | Det ser riskabelt ut. För att köra block {n} ändå, skriv: /vaken-help run do {n} yes yes. Det körs i PowerShell. |  |
| `sys.when_you_are_away_it_keeps` | When you are away, it keeps the PC awake for a phone or a waiting question. | När du är borta hålls datorn vaken för en telefon eller en fråga som väntar. |  |
| `sys.while_agents_work_it_keeps_the` | While agents work, it keeps the PC awake. | Medan agenter arbetar hålls datorn vaken. |  |

## compact

Shortening the chat: the card, advice and commands. (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `compact.a_handoff_brief_of_this_session` | A handoff note of this session is saved as {where}. | En överlämning för den här sessionen är sparad som {where}. |  |
| `compact.a_helper_or_a_background_command` | an agent or a background command still runs | en agent eller ett bakgrundskommando körs fortfarande |  |
| `compact.a_new_turn_started` | a new answer started | ett nytt svar började |  |
| `compact.a_question_or_a_permission_waits` | a question or a permission waits for you | en fråga eller en tillåtelse väntar på dig |  |
| `compact.cache_warm` | cache warm | cachen är varm |  |
| `compact.checks_passed` | checks passed | kontrollerna gick igenom |  |
| `compact.claude_is_working` | Claude is working | Claude arbetar |  |
| `compact.compacting_now_because_why` | Compacting now because: {why} | Komprimera nu eftersom: {why} |  |
| `compact.context_n` | context {n}% | kontext {n} % |  |
| `compact.could_not_save_the_handoff_brief` | could not save the handoff note | kunde inte spara överlämningen |  |
| `compact.good_moment_because_why` | Good moment because: {why} | Bra stund eftersom: {why} |  |
| `compact.last_shortening` | Last compaction | Senaste komprimeringen |  |
| `compact.let_the_cockpit_shorten_the_chat` | Vaken can compact the session at good moments. Let it? | Vaken kan komprimera sessionen vid lämpliga stunder. Låta den göra det? |  |
| `compact.no_file_changed` | no file changed | ingen fil ändrades |  |
| `compact.not_enough_reasons_yet` | not enough reasons yet | för få skäl än |  |
| `compact.not_yet_why_score_n_of` | Not yet: {why}. Score {n} of {of}. | Inte än: {why}. Poäng {n} av {of}. |  |
| `compact.now_is_a_good_moment_why` | Now is a good moment: {why}. Score {n} of {of}. | Nu är en bra stund: {why}. Poäng {n} av {of}. |  |
| `compact.pays_back_soon` | pays back soon | lönar sig snart |  |
| `compact.quiet_for_2_minutes` | idle for 2 minutes | inaktiv i 2 minuter |  |
| `compact.see` | See | Se |  |
| `compact.shortened_the_chat_kept_goal_branch` | Compacted the session. Kept: goal, branch, files, decisions, next steps. Brief saved: {name}. | Komprimerade sessionen. Behöll: mål, gren, filer, beslut, nästa steg. Överlämning sparad: {name}. |  |
| `compact.show_advice` | Show advice | Visa råd |  |
| `compact.skipped_why` | Skipped: {why} | Hoppade över: {why} |  |
| `compact.task_finished` | task finished | uppgiften klar |  |
| `compact.the_chat_fills_less_than_pct` | the session fills less than {pct}% of its window | sessionen fyller mindre än {pct} % av sitt fönster |  |
| `compact.the_chat_is_still_small` | the session is still small | sessionen är ännu liten |  |
| `compact.the_chat_was_shortened_in_the` | the session was compacted in the last 10 minutes | sessionen komprimerades de senaste 10 minuterna |  |
| `compact.the_guard_holds_a_step_for` | a risky step was stopped and waits for your yes | ett riskabelt steg har stoppats och väntar på ditt ja |  |
| `compact.the_work_is_still_open` | the work is still open | arbetet är fortfarande öppet |  |
| `compact.when_to_compact` | When to compact | Dags att komprimera? |  |
| `compact.work_saved` | work saved | arbetet sparat |  |
| `compact.yes` | Yes | Ja |  |

## skills

The Skills card. (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `skills.1_skill_listed_k_tokens` | 1 skill listed, {k} tokens | 1 färdighet listad, {k} tokens |  |
| `skills.1_time` | 1 time | 1 gång |  |
| `skills.a_skill_is_a_ready_made` | A skill is a ready-made way of working that Claude can load, such as grilling or a code review. The count is how often one was used in the last 7 days. | En färdighet är ett färdigt arbetssätt som Claude kan ladda, till exempel grilling eller en kodgranskning. Antalet är hur ofta en användes de senaste 7 dagarna. |  |
| `skills.all_used_this_week` | ; all used this week | ; alla använda den här veckan |  |
| `skills.and_n_more` | and {n} more | och {n} till |  |
| `skills.counted_for_1_day` | ; counted for 1 day | ; räknat i 1 dag |  |
| `skills.counted_for_n_days` | ; counted for {n} days | ; räknat i {n} dagar |  |
| `skills.every_skill_the_session_lists_takes` | Every skill the session lists takes a little room in every session, used or not. To make room, delete the folder of a skill you do not use, in .claude/skills. | Varje färdighet som sessionen listar tar lite plats i varje session, använd eller inte. För att få plats, ta bort mappen för en färdighet du inte använder, i .claude/skills. |  |
| `skills.listed_for_claude_but_not_used` | Listed for Claude, but not used in the last 7 days. | Listad för Claude men inte använd de senaste 7 dagarna. |  |
| `skills.n_not_used_this_week` | ; {n} not used this week | ; {n} inte använda den här veckan |  |
| `skills.n_of_m_not_used_this_week` | ; {n} of {m} not used this week | ; {n} av {m} inte använda den här veckan |  |
| `skills.n_of_the_first_m_not_used` | ; {n} of the first {m} not used this week | ; {n} av de första {m} inte använda den här veckan |  |
| `skills.n_skills_listed_k_tokens` | {n} skills listed, {k} tokens | {n} färdigheter listade, {k} tokens |  |
| `skills.n_skills_m_fit_the_list` | {n} skills, {m} fit the list, {k} tokens | {n} färdigheter, {m} ryms i listan, {k} tokens |  |
| `skills.n_times` | {n} times | {n} gånger |  |
| `skills.no_skill_used_yet_this_week` | No skill used yet this week. | Ingen färdighet använd än den här veckan. |  |
| `skills.not_used_this_week` | Not used this week | Inte använda den här veckan |  |
| `skills.only_part_of_the_list_fits` | Only part of the list fits; Claude does not see the rest. | Bara en del av listan ryms; Claude ser inte resten. |  |
| `skills.press_to_start_it` | Press to start it. | Tryck för att starta den. |  |
| `skills.skill_list` | Skill list | Färdighetslistan |  |
| `skills.skills` | Skills | Färdigheter |  |
| `skills.top` | Top: | Mest: |  |
| `skills.used_1_time_in_the_last` | Used 1 time in the last 7 days. | Använd 1 gång de senaste 7 dagarna. |  |
| `skills.used_n_times_in_the_last` | Used {n} times in the last 7 days. | Använd {n} gånger de senaste 7 dagarna. |  |
| `skills.used_this_week` | Used this week | Använda den här veckan |  |

## find

Finding a skill. (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `find.find` | Find | Hitta |  |
| `find.find_a_skill_or_command` | Find a skill or command | Hitta en färdighet eller ett kommando |  |
| `find.no_skill_or_command_matches` | No skill or command matches. | Ingen färdighet eller inget kommando matchar. |  |
| `find.the_commands_could_not_be_read` | The commands could not be read. | Kommandona gick inte att läsa. |  |

## talk

The Talk to other sessions card. (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `talk.a_short_command_with_no_file` | A short command with no file name, path, number or quoted text, and no goal. | Ett kort kommando utan filnamn, sökväg, siffra eller citat, och inget mål. |  |
| `talk.answer` | Answer | Svar |  |
| `talk.answer_it_in_that_session_the` | Answer it in that session. Vaken never says yes for you. | Svara i den sessionen. Vaken säger aldrig ja åt dig. |  |
| `talk.change_notices` | Change notices | Ändra notiser |  |
| `talk.claude_asked_you_a_question` | Claude asked you a question. | Claude ställde en fråga till dig. |  |
| `talk.could_not_send_from_here_type` | Could not send from here. Type it in that session. | Kunde inte skicka härifrån. Skriv det i den sessionen. |  |
| `talk.fewer_than_6_words_with_no` | Fewer than 6 words, with no file name, path, number or quoted text, and no goal. | Färre än 6 ord, utan filnamn, sökväg, siffra eller citat, och inget mål. |  |
| `talk.it_asks_you_a_question_tool` | It asks you a question ({tool}). | Den ställer en fråga till dig ({tool}). |  |
| `talk.it_goes_there_as_a_message_2` | It goes there as a message from this session and starts its next answer. | Det kommer fram som ett meddelande från den här sessionen och startar dess nästa svar. |  |
| `talk.it_has_waited_age` | It has waited {age}. | Den har väntat {age}. |  |
| `talk.it_is_in_your_session_list_under` | It is in your session list under {name}. Open that session to read it. | Den finns i din sessionslista under {name}. Öppna sessionen för att läsa den. |  |
| `talk.it_waits_to_run_tool_and` | It waits to run {tool} and may need your OK. | Den väntar på att köra {tool} och kan behöva ditt OK. |  |
| `talk.may_be_stuck_no_sign_for` | May be stuck: no sign for {n} min | Kan ha fastnat: inget tecken på {n} min |  |
| `talk.not_now` | Not now | Inte nu |  |
| `talk.not_sent_why` | Not sent: {why} | Inte skickat: {why} |  |
| `talk.nudge_sends_continue` | Nudge · sends continue | Knuffa · skickar continue |  |
| `talk.nudged` | nudged | knuffad |  |
| `talk.nudged_continue_goes_in_when_the` | Nudged: continue goes in when the answer ends. If it is stuck, press Stop in the app first. | Knuffad: continue går in när svaret slutar. Om den har fastnat: tryck på Stopp i appen först. |  |
| `talk.nudged_less_than_10_minutes_ago` | Nudged less than 10 minutes ago. Give it a moment. | Knuffad för mindre än 10 minuter sedan. Ge den en stund. |  |
| `talk.nudged_sent_continue` | Nudged: sent continue. | Knuffad: skickade continue. |  |
| `talk.reply` | Reply | Svara |  |
| `talk.see_a_better_one` | See a better one | Se en bättre |  |
| `talk.send` | Send | Skicka |  |
| `talk.send_the_better_one` | Send the better one | Skicka den bättre |  |
| `talk.send_this_message_into_name` | Send this message into "{name}"? It reads it as a message from a peer session, and may act on it. | Skicka det här meddelandet till "{name}"? Den läser det som ett meddelande från en annan session och kan agera på det. | The yes or no question before /vaken-pause steer send puts a sentence into another session |
| `talk.sent_the_better_prompt` | Sent the better prompt. | Skickade den bättre prompten. |  |
| `talk.sent_to_name` | Sent to {name}. | Skickat till {name}. |  |
| `talk.the_better_prompt_in_full` | The better prompt, in full: | Den bättre prompten i sin helhet: |  |
| `talk.type_it` | Type it | Skriv det |  |
| `talk.type_name_in_the_chat_the` | Type /{name} in the session. Vaken cannot run its own commands from its pane. | Skriv /{name} i sessionen. Vaken kan inte köra sina egna kommandon från sin panel. |  |
| `talk.what_it_misses` | What it misses | Vad den saknar |  |
| `talk.your_answer_is_sent_to_name_as` | Your answer is sent to {name} as a message from you. If the question box stays open, answer it there. | Ditt svar skickas till {name} som ett meddelande från dig. Om frågerutan förblir öppen, svara där. |  |
| `talk.your_last_prompt_may_be_too` | Your last prompt may be too short | Din senaste prompt kan vara för kort |  |
| `talk.your_reply_is_sent_to_name_as` | Your reply is sent to {name} as a message from you and starts its next answer. | Ditt svar skickas till {name} som ett meddelande från dig och startar dess nästa tur. |  |

## calm

Calm: focus and quiet times. (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `calm.1_risky_step_stopped` | 1 risky step stopped | 1 riskabelt steg stoppat |  |
| `calm.1_task_not_done` | 1 task not done | 1 uppgift inte klar |  |
| `calm.and` | and | och |  |
| `calm.and_n_more_projects` | and {n} more projects | och {n} projekt till |  |
| `calm.caught_a_repeating_step_n_times` | Caught a repeating step {n} times: about {m} min. | Fångade ett upprepat steg {n} gånger: ungefär {m} min. |  |
| `calm.caught_a_repeating_step_once_about` | Caught a repeating step once: about {m} min. | Fångade ett upprepat steg en gång: ungefär {m} min. |  |
| `calm.end_focus` | End pause | Avsluta paus |  |
| `calm.ended_mid_turn` | ended mid-answer | slutade mitt i ett svar |  |
| `calm.estimate` | estimate | uppskattning |  |
| `calm.focus_n_min_left` | Notices paused · {n} min left | Notiser pausade · {n} min kvar |  |
| `calm.full` | full | fullt |  |
| `calm.got_it` | Got it | Förstått |  |
| `calm.kinds_failed` | {kinds} failed | {kinds} misslyckades |  |
| `calm.left_open_yesterday` | Left open yesterday | Lämnat öppet i går |  |
| `calm.lint` | lint | lint-kontrollen |  |
| `calm.n_risky_steps_stopped` | {n} risky steps stopped | {n} riskabla steg stoppade |  |
| `calm.n_sessions_ended_mid_turn` | {n} sessions ended mid-answer | {n} sessioner slutade mitt i ett svar |  |
| `calm.n_tasks_not_done` | {n} tasks not done | {n} uppgifter inte klara |  |
| `calm.pause_notices_for_50_min` | Pause notices for 50 min › | Pausa notiser i 50 min › |  |
| `calm.room_for_n_more` | room for {n} more | plats för {n} till |  |
| `calm.saved_you_about_m_min_estimate` | Saved you about {m} min (estimate) | Sparade dig ungefär {m} min (uppskattning) |  |
| `calm.shortened_the_chat_n_times_about` | Compacted the session {n} times: about {m} min. | Komprimerade sessionen {n} gånger: ungefär {m} min. |  |
| `calm.shortened_the_chat_once_about_m` | Compacted the session once: about {m} min. | Komprimerade sessionen en gång: ungefär {m} min. |  |
| `calm.stopped_a_risky_step_once_about` | Stopped a risky step once: about {m} min. | Stoppade ett riskabelt steg en gång: ungefär {m} min. |  |
| `calm.stopped_n_risky_steps_about_m` | Stopped {n} risky steps: about {m} min. | Stoppade {n} riskabla steg: ungefär {m} min. |  |
| `calm.tests` | tests | testerna |  |
| `calm.the_build` | the build | bygget |  |
| `calm.the_minutes_are_a_careful_guess` | Minutes are estimates: 5 for a caught repeating step, 3 for a compaction, 10 for a stopped risky step. Usage saved is not counted. | Minuterna är uppskattningar: 5 för ett fångat upprepat steg, 3 för en komprimering, 10 för ett stoppat riskabelt steg. Sparad användning räknas inte. |  |
| `calm.the_type_check` | the type check | typkontrollen |  |
| `calm.this_week` | This week | Den här veckan |  |

## phone

The phone face. (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `phone.1_finished` | 1 finished | 1 klar |  |
| `phone.1_step_held` | 1 step stopped | 1 steg stoppat |  |
| `phone.5_hour` | 5-hour | 5-timmars |  |
| `phone.and_n_more` | and {n} more | och {n} till |  |
| `phone.asks_a_question` | asks a question | ställer en fråga |  |
| `phone.extra_usage` | extra usage | extra användning |  |
| `phone.fri` | Fri | fre |  |
| `phone.mon` | Mon | mån |  |
| `phone.n_finished` | {n} finished | {n} klara |  |
| `phone.n_session_needs_you` | {n} session needs you | {n} session behöver dig |  |
| `phone.n_sessions_need_you` | {n} sessions need you | {n} sessioner behöver dig |  |
| `phone.n_steps_held` | {n} steps stopped | {n} steg stoppade |  |
| `phone.needs_you_list` | Needs you: {list} | Behöver dig: {list} |  |
| `phone.phone_hello` | Phone hello | Hälsning i telefonen |  |
| `phone.plan_name_pct` | Plan: {name} {pct}% | Plan: {name} {pct} % |  |
| `phone.plan_name_pct_resets_when` | Plan: {name} {pct}%, resets {when} | Plan: {name} {pct} %, återställs {when} |  |
| `phone.sat` | Sat | lör |  |
| `phone.spending` | spending | utgifter |  |
| `phone.sun` | Sun | sön |  |
| `phone.thu` | Thu | tors |  |
| `phone.tue` | Tue | tis |  |
| `phone.waits_for_an_ok` | waits for an OK | väntar på ett OK |  |
| `phone.wed` | Wed | ons |  |
| `phone.week` | week | vecka |  |

## phonecmds

Phone commands (/ok, /no, /go, /st). (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `phonecmds.held` | Stopped | Stoppat |  |
| `phonecmds.nothing_needs_you` | Nothing needs you. | Inget behöver dig. |  |
| `phonecmds.phone_mode` | Phone mode | Telefonläge |  |
| `phonecmds.short_numbered_answers_while_you` | Short, numbered answers while you are on the phone? Turn on Phone mode: Settings &gt; Attention. | Korta, numrerade svar medan du är på telefonen? Slå på Telefonläge: Inställningar &gt; Uppmärksamhet. |  |
| `phonecmds.this_session` | this session | den här sessionen |  |
| `phonecmds.working` | Working | Arbetar |  |

## awake

Keeping the computer awake. (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `awake.a_helper_agent_is_running_in` | an agent is running in the background | en agent körs i bakgrunden |  |
| `awake.a_phone_is_connected` | a phone is connected | en telefon är ansluten |  |
| `awake.a_phone_is_connected_until_time` | a phone is connected, until {time} | en telefon är ansluten, till {time} |  |
| `awake.a_session_is_working` | a session is working | en session arbetar |  |
| `awake.awake_when_away` | Awake when away | Vaken när jag är borta |  |
| `awake.closing_the_lid_may_still_sleep` | Closing the lid may still sleep the PC (that follows your Windows power settings). | Att stänga locket kan ändå låta datorn sova (det följer dina energiinställningar i Windows). |  |
| `awake.closing_the_lid_still_sleeps_the` | Closing the lid still sleeps the Mac (unless it is on power with a display). | Att stänga locket låter Macen sova ändå (utom när den är på nätström med en skärm). |  |
| `awake.keep_the_mac_awake_while_you` | Keep the Mac awake while you are away? Reply /vaken-help run awake on | Hålla Macen vaken medan du är borta? Svara /vaken-help run awake on |  |
| `awake.keeping_the_mac_awake` | Keeping the Mac awake | Håller Macen vaken |  |
| `awake.keeping_the_pc_awake` | Keeping the PC awake | Håller datorn vaken |  |
| `awake.not_holding_battery_low` | Not holding: battery low | Håller inte: batteriet är lågt |  |
| `awake.not_holding_the_8_hour_limit` | Not holding: the 8 hour limit is reached | Håller inte: gränsen på 8 timmar är nådd |  |
| `awake.not_keeping_the_pc_awake_now` | Not keeping the PC awake now: nothing needs it | Håller inte datorn vaken nu: inget behöver det |  |
| `awake.phone_only` | Phone only | Bara telefon |  |
| `awake.powershell_was_not_found_so_the` | PowerShell was not found, so the PC cannot be held awake. | PowerShell hittades inte, så datorn kan inte hållas vaken. |  |
| `awake.stopped_keeping_the_mac_awake_limit` | Stopped keeping the Mac awake: limit reached | Slutade hålla Macen vaken: gränsen nådd |  |
| `awake.the_cockpit_could_not_keep_this` | Vaken could not keep this computer awake. | Vaken kunde inte hålla den här datorn vaken. |  |
| `awake.the_mac_was_kept_awake_for` | The Mac was kept awake for 8 hours, which is the most vaken allows. It lets the Mac sleep now. | Macen hölls vaken i 8 timmar. Det är det mesta vaken tillåter. Nu får den sova. |  |
| `awake.waiting_2h` | Waiting 2h | Väntar 2 tim |  |
| `awake.waiting_for_your_answer` | waiting for your answer | väntar på ditt svar |  |
| `awake.waiting_for_your_answer_until_time` | waiting for your answer, until {time} | väntar på ditt svar, till {time} |  |

## popout

Pop out. (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `popout.cockpit_on_a_second_screen` | Vaken on a second screen | Vaken på en andra skärm |  |
| `popout.could_not_open_a_new_window` | Could not open a new window from here. In the Mac or PC app, right-click the session in the sidebar, then Open in → New window. A phone or a terminal cannot do this. | Kunde inte öppna ett nytt fönster härifrån. I Mac- eller PC-appen: högerklicka på sessionen i sidofältet och välj Öppna i → Nytt fönster. En telefon eller en terminal kan inte göra det. |  |
| `popout.new_window` | New window | Nytt fönster | The footer's short form of Open in new window, on a narrow pane |
| `popout.open_in_new_window` | Open in new window | Öppna i nytt fönster |  |
| `popout.opened_this_session_in_a_new` | Opened this session in a new window. Drag it to your other screen. | Öppnade den här sessionen i ett nytt fönster. Dra den till din andra skärm. |  |
| `popout.press_open_in_new_window_at` | Press Open in new window at the bottom of the vaken pane, or type /vaken-help run popout, and this session opens in a new window. Drag that window to your other screen. If it does not work, right-click the session in the sidebar, then Open in → New window. | Tryck på Öppna i nytt fönster längst ned i Vaken-panelen, eller skriv /vaken-help run popout, så öppnas den här sessionen i ett nytt fönster. Dra fönstret till din andra skärm. Om det inte fungerar: högerklicka på sessionen i sidofältet och välj Öppna i → Nytt fönster. |  |

## prs

The pull requests card. (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `prs.asked_github_the_card_shows_what` | Asked GitHub. The card shows what it said. | Frågade GitHub. Kortet visar svaret. |  |
| `prs.asking_github` | Asking GitHub | Frågar GitHub |  |
| `prs.behind` | behind | efter |  |
| `prs.check_if_ready` | Check if ready | Kolla om den är klar |  |
| `prs.conflicts` | conflicts | konflikter |  |
| `prs.could_not_ask_github_type_cockpit` | Could not ask GitHub. Type /vaken-ship pr to see why. | Kunde inte fråga GitHub. Skriv /vaken-ship pr för att se varför. |  |
| `prs.could_not_make_the_ship_check` | Could not make the ship check here. Type /vaken-ship in the session. | Kunde inte göra leveranskontrollen här. Skriv /vaken-ship i sessionen. |  |
| `prs.could_not_read_the_checks_type` | Could not read the checks. Type /vaken-ship ci-fix in the session. | Kunde inte läsa kontrollerna. Skriv /vaken-ship ci-fix i sessionen. |  |
| `prs.draft` | draft | utkast |  |
| `prs.failing` | failing | misslyckas |  |
| `prs.here_is_the_ship_check_nothing` | Here is the ship check. Nothing was merged. | Här är leveranskontrollen. Inget slogs ihop. |  |
| `prs.look_now` | Look now | Titta nu |  |
| `prs.made_a_fix_request_3_times` | Made a fix request 3 times in 24 hours, and a check still fails. Look at the failure yourself. | Gjorde en begäran om att laga 3 gånger på 24 timmar, och en kontroll misslyckas fortfarande. Titta på felet själv. |  |
| `prs.n_failing` | {n} failing | {n} misslyckas |  |
| `prs.n_open` | {n} open | {n} öppna |  |
| `prs.n_running` | {n} running | {n} körs |  |
| `prs.needs_review` | needs review | behöver granskning |  |
| `prs.no_check_fails_now_nothing_to` | No check fails now. Nothing to fix. | Ingen kontroll misslyckas nu. Inget att laga. |  |
| `prs.no_open_pull_request_seen` | No open pull request seen. | Ingen öppen pull request syns. |  |
| `prs.none_open` | None open | Ingen öppen |  |
| `prs.not_checked_on_github_yet` | Not checked on GitHub yet | Inte kontrollerad på GitHub än |  |
| `prs.open` | open | öppen |  |
| `prs.open_now` | Open now | Öppna nu |  |
| `prs.passing` | passing | godkänd |  |
| `prs.pr_checks_are_off` | PR checks are off. | PR-kontrollen är av. |  |
| `prs.press_to_put_a_fix_request` | Press to put a fix request, with the failing check's log, in the prompt box. Press Enter to send it. At most 3 tries a day. /vaken-ship ci-fix send does the same. | Tryck för att lägga en begäran om att laga, med loggen från kontrollen som misslyckades, i promptrutan. Tryck på Enter för att skicka den. Högst 3 försök om dagen. /vaken-ship ci-fix send gör samma sak. |  |
| `prs.pull_requests` | Pull requests | Pull requests |  |
| `prs.reading_the_failing_check` | Reading the failing check | Läser kontrollen som misslyckades |  |
| `prs.ready` | ready | redo |  |
| `prs.running` | running | körs |  |
| `prs.this_branch` | This branch | Den här grenen |  |
| `prs.this_branch_has_no_pull_request` | This branch has no pull request. | Grenen har ingen pull request. |  |
| `prs.this_folder_is_not_in_a` | This folder is not in a git repository. | Mappen ligger inte i ett git-repository. |  |
| `prs.your_open_pull_requests_checks_merging` | Your open pull requests: checks, merging and the next step. | Dina öppna pull requests: kontroller, ihopslagning och nästa steg. |  |

## ship

The Ship card. (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `ship.changes_not_looked_at` | Changes not looked at | Ändringar ingen har tittat på |  |
| `ship.claims_with_no_check_behind_them` | Claims with no check behind them | Påståenden utan kontroll bakom |  |
| `ship.n_step_held_today` | {n} step stopped today | {n} steg stoppades i dag |  |
| `ship.n_steps_held_today` | {n} steps stopped today | {n} steg stoppades i dag |  |
| `ship.n_thing_blocks_it` | {n} thing blocks it | {n} sak hindrar |  |
| `ship.n_things_block_it` | {n} things block it | {n} saker hindrar |  |
| `ship.nothing_to_ship_yet` | Nothing to ship yet | Inget att leverera än |  |
| `ship.ready` | Ready | Redo |  |
| `ship.ready_to_ship` | Ready to ship? | Redo att leverera? |  |
| `ship.ready_to_ship_what_blocks_it` | Ready to ship: what blocks it, and the next step. | Redo att leverera: vad som hindrar, och nästa steg. |  |
| `ship.see` | See | Se |  |
| `ship.ship` | Ship | Leverans |  |
| `ship.verdict` | Verdict | Bedömning |  |
| `ship.what_blocks_it` | What blocks it | Vad som hindrar |  |

## back

Where was I. (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `back.1_project_has_open_ends` | 1 project has open ends | 1 projekt har öppna trådar |  |
| `back.a_digest_from_while_you_were` | a digest from while you were away | en sammanfattning från medan du var borta |  |
| `back.back_after_t` | Back after {t} | Tillbaka efter {t} |  |
| `back.clear_the_open_ends_in_all` | Clear the open ends in all sessions | Rensa de öppna ändarna i alla sessioner |  |
| `back.ended_time` | ended {time} | slutade {time} |  |
| `back.n_projects_have_open_ends` | {n} projects have open ends | {n} projekt har öppna trådar |  |
| `back.no_goal_set` | No goal set | Inget mål satt |  |
| `back.nothing_waits` | Nothing waits | Inget väntar |  |
| `back.open_ends` | Left open | Lämnat öppet |  |
| `back.t_ago` | {t} ago | för {t} sedan |  |
| `back.what_waits_for_you` | What waits for you | Vad som väntar på dig |  |
| `back.where_was_i` | Where was I | Var var jag |  |
| `back.where_you_were` | Where you were | Där du var |  |
| `back.where_you_were_what_is_still` | Where you were, what is still open, what happened while away. | Var du var, vad som är öppet, vad som hände medan du var borta. |  |
| `back.while_you_were_away` | While you were away | Medan du var borta |  |

## safety

The Safety card. (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `safety.1_step` | 1 step | 1 steg |  |
| `safety.all_clear` | All clear | Allt väl |  |
| `safety.could_not_halt_from_here_type` | Could not pause from here. Type /vaken-pause in the session. | Kunde inte pausa härifrån. Skriv /vaken-pause i sessionen. |  |
| `safety.could_not_show_the_checkpoint_from` | Could not show the checkpoint from here. Type /vaken-undo name &lt;checkpoint&gt; in the session. | Kunde inte visa kontrollpunkten härifrån. Skriv /vaken-undo name &lt;checkpoint&gt; i sessionen. |  |
| `safety.guard_today` | Risky steps today | Riskabla steg i dag |  |
| `safety.halt` | Pause | Pausa |  |
| `safety.halt_all` | Pause all | Pausa allt |  |
| `safety.halt_all_undo_checkpoints_and_what` | Pause all, undo, saved points and which risky steps were stopped. | Pausa allt, ångra, sparade punkter och vilka riskabla steg som stoppades. |  |
| `safety.halt_is_on_nothing_ran_lift` | Pause is on. Nothing ran. Resume with /vaken-pause off first. | Pausen är på. Inget kördes. Återuppta med /vaken-pause off först. |  |
| `safety.halt_lifted_steps_that_change_things` | Resumed. Steps that change things work again. | Återupptaget. Steg som ändrar något fungerar igen. |  |
| `safety.halted_every_step_that_changes_things` | Paused for safety. Commands, edits, tools, agents and web fetches are stopped. Press Resume to continue. | Pausad för säkerhets skull. Kommandon, ändringar, verktyg, agenter och webbhämtningar stoppas. Tryck Återuppta för att fortsätta. |  |
| `safety.it_runs_code_or_changes_files` | It runs code or changes files. | Det kör kod eller ändrar filer. | Why a command block needs two yeses: it is not only commands that look (ls, cat, git status and the like). |
| `safety.n_steps` | {n} steps | {n} steg |  |
| `safety.none` | none | inga |  |
| `safety.nothing_changes_before_you_type_it` | Nothing changes before you type it. | Inget ändras förrän du skriver det. |  |
| `safety.nothing_was_written_path_or_a` | Nothing was written: {path} or a folder above it is a link, or it leads somewhere it should not. | Inget skrevs: {path} eller en mapp ovanför är en länk, eller så leder den dit den inte ska. |  |
| `safety.preview` | Preview | Förhandsvisning |  |
| `safety.preview_undo_1_file` | Preview undo (1 file) | Förhandsvisa ångra (1 fil) |  |
| `safety.preview_undo_n_files` | Preview undo ({n} files) | Förhandsvisa ångra ({n} filer) |  |
| `safety.stop_undo_and_what_the_guard` | Pause, undo, and which risky steps were stopped | Pausa, ångra och vilka riskabla steg som stoppades |  |
| `safety.this_step_needs_you_to_type` | This step needs you to type it in this session. | Det här steget kräver att du skriver det själv i den här sessionen. | A command that unlocks or runs something came from another session, a channel, a schedule or a plugin, so it was refused. |
| `safety.type_this_in_the_chat_box` | Type this in the chat box: | Skriv det här i chattrutan: |  |
| `safety.warned` | Warned | Varnat |  |

## context

The Context health card. (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `context.1_line` | 1 line | 1 rad |  |
| `context.1_note` | 1 note | 1 anteckning |  |
| `context.1_repeated_line` | 1 repeated line | 1 upprepad rad |  |
| `context.about_n_tokens` | about {n} tokens | ungefär {n} tokens |  |
| `context.about_n_tokens_heavy` | about {n} tokens · heavy | ungefär {n} tokens · tung |  |
| `context.claude_md_is_heavy` | CLAUDE.md is heavy | CLAUDE.md är tung |  |
| `context.context_health` | Memory and notes | Minne och anteckningar |  |
| `context.context_is_lean` | Context is lean | Kontexten är lätt |  |
| `context.could_not_make_the_brief_from` | Could not make the brief from here. Type /vaken-help run brief in the session. | Kunde inte göra briefen härifrån. Skriv /vaken-help run brief i sessionen. |  |
| `context.good_moment_to_shorten` | Good moment to compact | Bra stund att komprimera |  |
| `context.handoff` | Handoff | Överlämning |  |
| `context.handoff_brief` | Note for the next session | Anteckning till nästa session |  |
| `context.here_are_the_marks_of_the` | Here are the marks of the brief. Nothing was written. Type /vaken-help run brief to get the note. | Här är brieferns markeringar. Inget skrevs. Skriv /vaken-help run brief för att få anteckningen. |  |
| `context.instruction_files` | Instruction files | Instruktionsfiler |  |
| `context.instruction_files_memory_notes_handoff` | Instruction files, memory notes, handoff and what compacting keeps. | Instruktionsfiler, minnesanteckningar, överlämning och vad komprimering behåller. |  |
| `context.instructions` | Instructions | Instruktioner |  |
| `context.instructions_memory_and_handoff` | Instructions, memory and handoff | Instruktioner, minne och överlämning |  |
| `context.kept_when_shortened` | Kept when compacted | Behålls vid komprimering |  |
| `context.lines_in_more_than_one_file` | Lines in more than one file | Rader i fler än en fil |  |
| `context.n_lines` | {n} lines | {n} rader |  |
| `context.n_notes` | {n} notes | {n} anteckningar |  |
| `context.n_repeated_lines` | {n} repeated lines | {n} upprepade rader |  |
| `context.n_unverified_preview` | {n} not checked yet · See first | {n} inte kontrollerade än · Visa först |  |
| `context.none_yet` | none yet | inga än |  |
| `context.notes` | Notes | Anteckningar |  |
| `context.notes_claude_keeps` | Notes Claude keeps | Anteckningar Claude sparar |  |
| `context.nothing_yet` | nothing yet | inget än |  |
| `context.off` | off | av |  |
| `context.ready_preview` | Ready · See first | Klar · Visa först |  |

## preview

The Preview card. (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `preview.after_a_screen_file_edit_the` | After a screen file edit, the Preview card says look now. | Efter en ändring av en skärmfil säger kortet: titta nu. |  |
| `preview.changed_look_now` | Changed - look now | Ändrad - titta nu |  |
| `preview.could_not_take_the_picture_from` | Could not take the picture from here. | Kunde inte ta bilden härifrån. |  |
| `preview.desktop` | Desktop | Dator |  |
| `preview.dev_server` | Dev server | Utvecklingsserver |  |
| `preview.dev_server_and_pictures` | Dev server and pictures | Utvecklingsserver och bilder |  |
| `preview.dev_server_and_pictures_at_phone` | Dev server, and pictures at phone, iPad and desktop size. | Utvecklingsserver, och bilder i telefon-, iPad- och datorstorlek. |  |
| `preview.dev_server_on_n_does_not` | Dev server on {n} does not answer | Utvecklingsservern på {n} svarar inte |  |
| `preview.dev_server_up_on_n` | Dev server up on {n} | Utvecklingsservern kör på {n} |  |
| `preview.error` | error | fel |  |
| `preview.ipad` | iPad | iPad |  |
| `preview.no_answer` | no answer | inget svar |  |
| `preview.no_dev_server` | No dev server | Ingen utvecklingsserver |  |
| `preview.no_dev_server_is_up_so` | No dev server is up, so no picture was taken. Start it, then press again. | Ingen utvecklingsserver är uppe, så ingen bild togs. Starta den och tryck igen. |  |
| `preview.port_n` | Port {n} | Port {n} |  |
| `preview.preview` | Preview | Förhandsvisning |  |
| `preview.preview_after_edits` | Preview after edits | Förhandsvisning efter ändringar |  |
| `preview.said_it_is_in_the_project` | {said} It is in the project folder. Ask Claude to look at it. | {said} Den finns i projektmappen. Be Claude titta på den. |  |
| `preview.take` | Take | Ta bild |  |
| `preview.take_a_picture_size_size` | Take a picture ({size} size) | Ta en bild (storlek: {size}) |  |
| `preview.take_all_three` | Take all three | Ta alla tre |  |
| `preview.taking_the_picture_in_the_background` | Taking the picture in the background | Tar bilden i bakgrunden |  |
| `preview.the_page_shows_an_error` | The page shows an error | Sidan visar ett fel |  |
| `preview.up` | up | uppe |  |

## setup

The Agent setup card. (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `setup.1_conflict` | 1 conflict | 1 konflikt |  |
| `setup.1_helper_file_differs` | 1 agent file differs | 1 agentfil skiljer sig |  |
| `setup.1_helper_file_missing` | 1 agent file missing | 1 agentfil saknas |  |
| `setup.add` | Add… | Lägg till… |  |
| `setup.agent_files` | Agent files | Agentfiler |  |
| `setup.agent_files_and_instructions` | Agent files and instructions | Agentfiler och instruktioner |  |
| `setup.agent_limit_set_to_n` | Agent cap set to {n} | Agenttaket satt till {n} |  |
| `setup.agent_setup` | Agent setup | Agentuppsättning |  |
| `setup.agent_setup_c_to_decide_n` | Agent setup: {c} to decide · {n} of {m} in sync | Agentuppsättning: {c} att avgöra · {n} av {m} i synk |  |
| `setup.agent_setup_is_off_turn_on` | Agent setup is off. Turn on Set up agents for me first. | Agentuppsättningen är av. Slå först på Sätt upp agenter åt mig. |  |
| `setup.agent_setup_n_of_m_in` | Agent setup: {n} of {m} in sync | Agentuppsättning: {n} av {m} i synk |  |
| `setup.agent_setup_no_project_folder` | Agent setup: no project folder | Agentuppsättning: ingen projektmapp |  |
| `setup.agent_setup_not_read_yet` | Agent setup: not read yet | Agentuppsättning: inte läst än |  |
| `setup.agent_setup_this_session_only_nothing` | Agent setup: this session only, nothing is written | Agentuppsättning: bara den här sessionen, inget skrivs |  |
| `setup.all` | All | Alla |  |
| `setup.already_in_sync` | Already in sync | Redan i synk |  |
| `setup.cannot_read` | cannot read | kan inte läsas |  |
| `setup.claude_md_block` | CLAUDE.md block | CLAUDE.md-block |  |
| `setup.close` | Close | Stäng |  |
| `setup.could_not_write_name_type_cockpit` | Could not write {name}. Type /vaken-help run setup in the session. | Kunde inte skriva {name}. Skriv /vaken-help run setup i sessionen. |  |
| `setup.create` | Create | Skapa |  |
| `setup.differs` | differs | skiljer sig |  |
| `setup.do_it` | Do it | Gör det |  |
| `setup.everything_is_in_sync` | Everything is in sync | Allt är i synk |  |
| `setup.for_your_information` | For your information | Till din information |  |
| `setup.helper_files_and_instructions_that` | Agent files and instructions that follow your choices. | Agentfiler och instruktioner som följer dina val. |  |
| `setup.in_sync` | in sync | i synk |  |
| `setup.instructions_differ` | instructions differ | instruktioner skiljer sig |  |
| `setup.instructions_missing` | instructions missing | instruktioner saknas |  |
| `setup.instructions_not_added` | instructions not added | instruktioner inte tillagda |  |
| `setup.keep` | Keep | Behåll |  |
| `setup.keep_mine` | Keep mine | Behåll min |  |
| `setup.keep_the_cockpit_limit_of_n` | Keep the vaken limit of {n} | Behåll vakens gräns på {n} |  |
| `setup.kept_the_cockpit_limit` | Kept the vaken limit | Behöll vakens gräns |  |
| `setup.missing` | missing | saknas |  |
| `setup.n_conflicts` | {n} conflicts | {n} konflikter |  |
| `setup.n_helper_files_differ` | {n} agent files differ | {n} agentfiler skiljer sig |  |
| `setup.n_helper_files_missing` | {n} agent files missing | {n} agentfiler saknas |  |
| `setup.n_of_your_own` | {n} of your own | {n} är dina egna |  |
| `setup.name_model_set_to_a` | {name} model set to {a} | Modellen för {name} satt till {a} |  |
| `setup.name_uses_a_the_map_says` | {name} uses {a}, the map says {b} | {name} använder {a}, kartan säger {b} |  |
| `setup.not_now` | Not now | Inte nu |  |
| `setup.project` | Project | Projekt |  |
| `setup.project_instructions` | Project instructions | Projektinstruktioner |  |
| `setup.replace` | Replace… | Ersätt… |  |
| `setup.replaced_name_your_copy_is_saved` | Replaced {name}. Your copy is saved as {bak} | Ersatte {name}. Din kopia är sparad som {bak} |  |
| `setup.roles_in_this_session` | Roles in this session | Roller i den här sessionen |  |
| `setup.session` | Session | Session |  |
| `setup.set_up_agents_for_me` | Set up agents for me | Sätt upp agenter åt mig |  |
| `setup.the_cockpit_can_write_agent_files` | Vaken can write agent files that follow your choices. It asks before it replaces a file. Where: All is every project (your home folder), Project is this project, Session is this session. | Vaken kan skriva agentfiler som följer dina val. Den frågar innan den ersätter en fil. Var: Alla är alla projekt (din hemmapp), Projekt är det här projektet, Session är den här sessionen. |  |
| `setup.this_session` | this session | den här sessionen |  |
| `setup.this_session_writes_no_files_choose_all_or_project` | This session writes no files. Choose All or Project. | Den här sessionen skriver inga filer. Välj Alla eller Projekt. |  |
| `setup.to_decide` | To decide | Att avgöra |  |
| `setup.update` | Update… | Uppdatera… |  |
| `setup.use_a` | Use {a} | Använd {a} |  |
| `setup.use_n` | Use {n} | Använd {n} |  |
| `setup.wrote_name` | Wrote {name} | Skrev {name} |  |
| `setup.yes_add_the_block_a_copy` | Yes, add the block (a copy is saved) | Ja, lägg till blocket (en kopia sparas) |  |
| `setup.yes_replace_a_copy_is_saved` | Yes, replace (a copy is saved) | Ja, ersätt (en kopia sparas) |  |
| `setup.yes_update_a_copy_is_saved` | Yes, update (a copy is saved) | Ja, uppdatera (en kopia sparas) |  |
| `setup.your_instructions_say_at_most_n` | Your instructions say at most {n} agents | Dina instruktioner säger högst {n} agenter |  |
| `setup.your_instructions_say_at_most_n_info` | Your instructions say at most {n} agents; vaken follows the computer | Dina instruktioner säger högst {n} agenter; vaken följer datorn |  |
| `setup.yours` | yours | din egen |  |

## do

Do: run commands from the last answer. (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `do.1_command_in_the_last_answer` | 1 block of commands in the last answer | 1 kommandoblock i senaste svaret |  |
| `do.a_short_note_with_the_result` | A short note with the result is in the prompt box. Press Enter to send it to Claude. | En kort notering med resultatet ligger i promptrutan. Tryck Enter för att skicka den till Claude. |  |
| `do.block_n_a` | Block {n} ({a}): | Block {n} ({a}): |  |
| `do.block_n_changed_since_you_looked` | Block {n} changed since you looked at it. Nothing ran. This is block {n} now: | Block {n} har ändrats sedan du tittade på det. Inget kördes. Så här ser block {n} ut nu: |  |
| `do.block_n_could_not_be_started` | Block {n} could not be started. | Block {n} kunde inte startas. |  |
| `do.block_n_failed_exit_c` | Block {n} failed (exit {c}) | Block {n} misslyckades (exit {c}) |  |
| `do.block_n_is_blocked_and_was` | Block {n} is stopped and was not run | Block {n} är stoppat och kördes inte |  |
| `do.block_n_is_blocked_so_it` | Block {n} is stopped, so it did not run. | Block {n} är stoppat, så det kördes inte. |  |
| `do.block_n_is_risky_nothing_ran` | Block {n} is risky. Nothing ran. To run it anyway, type: /vaken-help run do {n} yes yes | Block {n} är riskabelt. Inget kördes. För att köra det ändå, skriv: /vaken-help run do {n} yes yes |  |
| `do.block_n_ran_longer_than_c` | Block {n} ran longer than {c} seconds and was stopped. | Block {n} körde längre än {c} sekunder och stoppades. |  |
| `do.block_n_ran_too_long_and` | Block {n} ran too long and was stopped | Block {n} körde för länge och stoppades |  |
| `do.block_n_worked_exit_c` | Block {n} worked (exit {c}) | Block {n} lyckades (exit {c}) |  |
| `do.blocked` | Stopped | Stoppat |  |
| `do.blocked_2` | stopped | stoppad |  |
| `do.cancel` | Cancel | Avbryt |  |
| `do.commands_in_the_last_answer` | Commands in the last answer: | Kommandon i senaste svaret: |  |
| `do.commands_in_the_last_answer_that` | Commands in the last answer that you can run from here. | Kommandon i senaste svaret som du kan köra härifrån. |  |
| `do.could_not_run_block_n_type` | Could not run block {n}. Try again in the session: /vaken-help run do {n} yes | Kunde inte köra block {n}. Försök igen i sessionen: /vaken-help run do {n} yes |  |
| `do.could_not_run_it` | Could not run it | Kunde inte köra det |  |
| `do.earlier_lines_cut` | (earlier lines cut) | (tidigare rader bortklippta) |  |
| `do.failed_with_exit_c` | Failed with exit {c} | Misslyckades med exit {c} |  |
| `do.finished_with_exit_c` | Finished with exit {c} | Klart med exit {c} |  |
| `do.first_a_of_b` | first {a} of {b} | första {a} av {b} |  |
| `do.in_the_last_answer` | In the last answer | I senaste svaret |  |
| `do.it_changes_git_history_or_sends` | It changes git history or sends work out. | Det ändrar git-historiken eller skickar iväg arbete. |  |
| `do.it_changes_who_may_use_a` | It changes who may use a file or stops a process. | Det ändrar vem som får använda en fil eller stoppar en process. |  |
| `do.it_deletes_or_moves_files` | It deletes or moves files. | Det raderar eller flyttar filer. |  |
| `do.it_fetches_from_the_internet` | It fetches from the internet. | Det hämtar från internet. |  |
| `do.it_holds_characters_you_cannot_see` | It holds characters you cannot see, so what shows may not be what runs. | Det innehåller tecken som inte syns, så det som visas kanske inte är det som körs. |  |
| `do.it_installs_software` | It installs software. | Det installerar program. |  |
| `do.it_pipes_text_into_a_shell` | It pipes text into a shell. | Det skickar text in i ett skal. |  |
| `do.it_publishes_deploys_or_changes_a` | It publishes, deploys or changes a remote machine. | Det publicerar, driftsätter eller ändrar en annan dator. |  |
| `do.it_runs_text_it_builds_itself` | It runs text it builds itself. | Det kör text som det bygger själv. |  |
| `do.it_sits_in_text_that_came` | It sits in text that came from outside (a page or a file), so check it first. | Det står i text som kom utifrån (en sida eller en fil), så kontrollera det först. |  |
| `do.it_touches_a_secret` | It touches a secret. | Det rör en hemlighet. |  |
| `do.it_uses_sudo_or_su_the` | It uses sudo or su. Vaken never runs those. | Det använder sudo eller su. Vaken kör aldrig sådant. |  |
| `do.it_would_delete_your_home_folder` | It would delete your home folder or the whole disk. Vaken never runs that. | Det skulle radera hemmappen eller hela disken. Vaken kör aldrig det. |  |
| `do.it_writes_to_a_disk_or` | It writes to a disk or changes the machine itself. Vaken never runs that. | Det skriver till en disk eller ändrar själva datorn. Vaken kör aldrig det. |  |
| `do.it_writes_to_a_file` | It writes to a file. | Det skriver till en fil. |  |
| `do.last_lines_of_the_output` | Last lines of the output: | Sista raderna av utdata: |  |
| `do.n_commands_in_the_last_answer` | {n} blocks of commands in the last answer | {n} kommandoblock i senaste svaret |  |
| `do.n_more_type_cockpit_do` | {n} more: /vaken-help run do | {n} till: /vaken-help run do |  |
| `do.no_commands_in_the_last_answer` | No commands in the last answer. | Inga kommandon i senaste svaret. |  |
| `do.press_a_row_to_run_its_block` | Press a row to run its block; a risky one asks again. Or type /vaken-help run do 2 yes. | Tryck på en rad för att köra dess block; ett riskabelt frågar igen. Eller skriv /vaken-help run do 2 yes. |  |
| `do.ran_block_n_exit_c_2` | Ran block {n}: exit {c}. | Körde block {n}: exit {c}. |  |
| `do.review` | Review | Granska |  |
| `do.risky` | risky | riskabelt |  |
| `do.run` | Run | Kör |  |
| `do.run_commands` | Run commands | Kör kommandon |  |
| `do.run_commands_is_off_cockpit` | Run commands is off. /vaken-settings do.mode ask turns it on. | Kör kommandon är av. /vaken-settings do.mode ask slår på det. |  |
| `do.run_commands_is_off_turn` | Run commands is off. Turn it on in Settings. | Kör kommandon är av. Slå på det i Inställningar. |  |
| `do.run_what_claude_wrote` | Run what Claude wrote | Kör det Claude skrev |  |
| `do.runs_this_command_in_the_session` | Runs this command in the session folder after you press. The result shows under the row. | Kör kommandot i sessionens mapp när du trycker. Resultatet visas under raden. |  |
| `do.safe` | safe | säkert |  |
| `do.stopped_after_c_seconds` | Stopped after {c} seconds | Stoppades efter {c} sekunder |  |
| `do.that_command_is_not_in_the` | That command is not in the last answer any more | Kommandot finns inte kvar i senaste svaret |  |
| `do.the_cockpit_never_runs_this_one` | Vaken never runs this one from here. | Vaken kör aldrig det här härifrån. |  |
| `do.the_commands_in_a_code_block` | The commands in a code block of the last thing Claude wrote. Vaken checks each one first. A safe one runs when you press it; a risky one asks again; a stopped one never runs from here. | Kommandona i ett kodblock i det senaste som Claude skrev. Vaken granskar varje först. Ett säkert kör när du trycker; ett riskabelt frågar igen; ett stoppat kör aldrig härifrån. |  |
| `do.the_guard_could_not_look_at_it` | Vaken could not check it. | Vaken kunde inte granska det. |  |
| `do.the_guard_flags_it_x` | Flagged as risky: {x} | Flaggat som riskabelt: {x} |  |
| `do.the_guard_found_nothing_risky_in` | Nothing risky found in it. | Inget riskabelt hittades i det. |  |
| `do.the_note_to_claude_could_not` | The note to Claude could not be sent. Tell Claude yourself. | Noteringen till Claude gick inte att skicka. Berätta för Claude själv. |  |
| `do.the_output_was_empty` | The output was empty. | Utdata var tom. |  |
| `do.there_is_no_block_n_in` | There is no block {n} in the last answer. To list them, type: /vaken-help run do | Det finns inget block {n} i senaste svaret. För att lista dem, skriv: /vaken-help run do |  |
| `do.this_one_looks_risky_press_once` | This one looks risky. Press once to see it, then Yes, run it. | Det här ser riskabelt ut. Tryck en gång för att se det, sedan Ja, kör det. |  |
| `do.type_cockpit_do_n_to_see` | To see one, type: /vaken-help run do {n} | För att se ett, skriv: /vaken-help run do {n} |  |
| `do.type_cockpit_do_n_yes_to` | To run block {n}, type: /vaken-help run do {n} yes | För att köra block {n}, skriv: /vaken-help run do {n} yes |  |
| `do.type_cockpit_do_n_yes_yes` | It looks risky. To run block {n} anyway, type: /vaken-help run do {n} yes yes | Det ser riskabelt ut. För att köra block {n} ändå, skriv: /vaken-help run do {n} yes yes |  |
| `do.type_cockpit_do_to_list_cockpit` | To list, type: /vaken-help run do. To look at block 2, type: /vaken-help run do 2. To run it, type: /vaken-help run do 2 yes | För att lista, skriv: /vaken-help run do. För att se block 2, skriv: /vaken-help run do 2. För att köra det, skriv: /vaken-help run do 2 yes |  |
| `do.when_claude_writes_a_command_cockpit` | When Claude writes a command, /vaken-help run do runs it after your yes. | När Claude skriver ett kommando kör /vaken-help run do det efter ditt ja. |  |
| `do.yes_run_it` | Yes, run it | Ja, kör det |  |

## shipstep

Ship steps (merge and check). (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `shipstep.a_check_failed_press_fix` | A check failed. Press Fix in Needs you or on the Pull requests card, or type /vaken-ship fix yes. | En kontroll misslyckades. Tryck på Laga i Behöver dig eller på kortet Pull requests, eller skriv /vaken-ship fix yes. |  |
| `shipstep.a_review_blocks_it` | A review blocks it. | En granskning stoppar den. |  |
| `shipstep.checked_the_pull_request_from_a` | Checked the pull request from a typed command | Kontrollerade pull requesten med ett skrivet kommando |  |
| `shipstep.checks_still_run_type_cockpit_ship` | Checks still run. Type /vaken-ship check again in a few minutes. | Kontroller pågår fortfarande. Skriv /vaken-ship check igen om några minuter. |  |
| `shipstep.could_not_ask_github_nothing_was` | Could not ask GitHub. Nothing was changed. Try again in a moment. | Kunde inte fråga GitHub. Inget ändrades. Försök igen om en stund. |  |
| `shipstep.could_not_tell_claude_tell_claude` | Could not tell Claude. Tell Claude yourself. | Kunde inte säga det till Claude. Säg det själv. |  |
| `shipstep.did_not_merge_a_pull_request` | Did not merge a pull request | Slog inte ihop en pull request |  |
| `shipstep.failing_list_type_cockpit_ship_fix` | Failing: {list}. Type /vaken-ship fix yes to ask Claude to fix it. Nothing is sent before that. | Misslyckas: {list}. Skriv /vaken-ship fix yes så ber du Claude laga det. Inget skickas före det. |  |
| `shipstep.github_did_not_merge_pull_request` | GitHub did not merge pull request {n}: {x} | GitHub slog inte ihop pull request {n}: {x} |  |
| `shipstep.github_did_not_name_the_commit` | GitHub did not name the commit to merge. | GitHub angav inte vilken commit som ska slås ihop. |  |
| `shipstep.github_has_not_said_yet_that` | GitHub has not said yet that it can be merged. | GitHub har inte sagt än att den kan slås ihop. |  |
| `shipstep.github_says_something_blocks_it` | GitHub says something blocks it. | GitHub säger att något stoppar den. |  |
| `shipstep.green_and_nothing_blocks_it_to` | Green and nothing blocks it. To merge, type /vaken-ship merge yes yes. | Grönt och inget stoppar. För att slå ihop, skriv /vaken-ship merge yes yes. |  |
| `shipstep.it_has_a_conflict_with_the` | It has a conflict with the base branch. | Den har en konflikt med basgrenen. |  |
| `shipstep.it_is_a_draft` | It is a draft. | Den är ett utkast. |  |
| `shipstep.it_is_behind_the_base_branch` | It is behind the base branch. | Den ligger efter basgrenen. |  |
| `shipstep.last_commit_sha` | Last commit: {sha}. | Senaste commit: {sha}. |  |
| `shipstep.made_a_fix_request_for_a` | Made a fix request for a failing check | Gjorde en begäran om att laga en misslyckad kontroll |  |
| `shipstep.made_a_fix_request_for_the` | Made a fix request for the failing check. {x} | Gjorde en begäran om att laga den misslyckade kontrollen. {x} |  |
| `shipstep.merge_not_yet` | Merge: not yet. | Ihopslagning: inte än. |  |
| `shipstep.merge_ready` | Merge: ready. | Ihopslagning: redo. |  |
| `shipstep.merged_a_pull_request_from_a` | Merged a pull request from a typed command | Slog ihop en pull request med ett skrivet kommando |  |
| `shipstep.merged_pull_request_n` | Merged pull request {n}. | Slog ihop pull request {n}. |  |
| `shipstep.n_checks_failed` | {n} checks failed. | {n} kontroller misslyckades. |  |
| `shipstep.n_checks_have_not_finished` | {n} checks have not finished. | {n} kontroller är inte klara. |  |
| `shipstep.no_check_has_failed_nothing_to` | No check has failed. Nothing to fix. | Ingen kontroll har misslyckats. Inget att laga. |  |
| `shipstep.no_checks_have_run_yet` | No checks have run yet. | Inga kontroller har körts än. |  |
| `shipstep.not_merged_it_is_not_ready` | Not merged. It is not ready: | Inte ihopslagen. Den är inte redo: |  |
| `shipstep.not_ready_to_merge_yet` | Not ready to merge yet. | Inte redo att slås ihop än. |  |
| `shipstep.one_more_yes_needed_nothing_ran` | One more yes needed. Nothing ran. Type /vaken-ship merge yes yes to merge pull request {n} at commit {sha}. | Ett ja till behövs. Inget kördes. Skriv /vaken-ship merge yes yes för att slå ihop pull request {n} vid commit {sha}. |  |
| `shipstep.pull_request_n_commit_sha_is` | Pull request {n} (commit {sha}) is green and nothing blocks it. Nothing ran. To merge it, type /vaken-ship merge yes yes. | Pull request {n} (commit {sha}) är grön och inget stoppar den. Inget kördes. För att slå ihop den, skriv /vaken-ship merge yes yes. |  |
| `shipstep.the_guard_would_not_let_this` | The safety check would not let this through: {x}. Nothing ran. | Säkerhetskontrollen släppte inte igenom det: {x}. Inget kördes. |  |
| `shipstep.the_pull_request_is_already_merged` | The pull request is already merged. | Pull requesten är redan ihopslagen. |  |
| `shipstep.the_pull_request_is_closed` | The pull request is closed. | Pull requesten är stängd. |  |
| `shipstep.the_pull_request_of_this_branch` | The pull request of this branch is {n}, not the number you typed. Nothing ran. | Den här grenens pull request är {n}, inte numret du skrev. Inget kördes. |  |
| `shipstep.the_request_is_in_the_prompt` | The request is in the prompt box. Press Enter to send it. | Begäran ligger i promptrutan. Tryck Enter för att skicka den. |  |
| `shipstep.this_branch_has_no_pull_request` | This branch has no pull request, so there is nothing to check, fix or merge. | Den här grenen har ingen pull request, så det finns inget att kontrollera, laga eller slå ihop. |  |
| `shipstep.type_cockpit_ship_check_cockpit_ship` | Type /vaken-ship check, /vaken-ship fix yes or /vaken-ship merge. | Skriv /vaken-ship check, /vaken-ship fix yes eller /vaken-ship merge. |  |

## settings

Settings: sections, rows, modes and layout names. (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `settings.advanced` | Advanced | Avancerat |  |
| `settings.after_an_update_the_cockpit_checks` | After an update, vaken checks itself. | Efter en uppdatering kontrollerar vaken sig själv. |  |
| `settings.after_each_turn_it_tells_you` | After each answer, it tells you in plain words what happened. | Efter varje svar berättar vaken med enkla ord vad som hände. |  |
| `settings.all_checks` | All checks | Alla kontroller |  |
| `settings.all_your_sessions_are_counted_together` | Auto lets the computer decide; pick a number to set your own limit. | Auto låter datorn avgöra; välj ett tal för din egen gräns. |  |
| `settings.also_the_model_for_lookup_helpers` | Also the model for lookup agents Claude starts (Model choice). | Också modellen för uppslagsagenter som Claude startar (Modellval). | Agents view, the Researcher role's note; Modellval is the Model choice group |
| `settings.always` | Always | Alltid |  |
| `settings.always_shows_it_first_even_when` | Always shows it first, even when nothing waits. Or only when something waits, or never. | Visas alltid först, även när inget väntar. Eller bara när något väntar, eller aldrig. |  |
| `settings.arrange_cards` | Arrange cards › | Ordna korten › |  |
| `settings.at_80_of_the_budget_it` | At 80% of the budget it warns. Stop also pauses new paid steps at 100%. | Vid 80 % av budgeten varnar vaken. Stoppa pausar också nya betalda steg vid 100 %. |  |
| `settings.back_changes` | Going back to Recommended changes these: | Tillbaka till Rekommenderat ändrar dessa: | Over the list of rows the press would change |
| `settings.back_keep` | Keep my mix | Behåll min mix | The no of Back to Recommended |
| `settings.back_to_recommended` | Back to Recommended | Tillbaka till Rekommenderat | The one press on the mode card while the settings are Custom; it first lists what changes |
| `settings.back_to_the_board` | Open the Safety card › | Öppna kortet Säkerhet › |  |
| `settings.back_yes` | Change them | Ändra dem | The yes of Back to Recommended |
| `settings.balanced_plus_the_checks_and_the` | Recommended, plus features that send Claude extra text and so use a little more of your plan: prompt and assumption reviews, plan first, and every note to Claude. | Rekommenderat, plus funktioner som skickar extra text till Claude och därför använder lite mer av din plan: granskning av uppmaningar och antaganden, plan först och alla noteringar till Claude. |  |
| `settings.before_a_big_task_it_suggests` | Before a big task, it suggests or asks for a short plan. | Före en stor uppgift föreslår eller ber vaken om en kort plan. |  |
| `settings.before_a_step_changes_a_file` | Before a step changes a file, it keeps a copy. | Innan ett steg ändrar en fil sparas en kopia. |  |
| `settings.before_big_changes_claude_lists_its` | Before big changes, Claude lists its assumptions and you see how many. | Före stora ändringar listar Claude sina antaganden och du ser hur många. |  |
| `settings.cards_and_look` | Cards and look | Kort och utseende |  |
| `settings.claude_can_read_the_budget_and` | Claude can read the budget and receipts itself. | Claude kan själv läsa budgeten och kvittona. |  |
| `settings.claude_is_asked_to_answer_in` | Claude is asked to answer in short, simple words. | Claude ombeds svara med korta, enkla ord. |  |
| `settings.clear` | Clear | Rensa |  |
| `settings.clear_every_setting_the_card_order` | Clear every setting, the card order and your pins? | Rensa alla inställningar, kortens ordning och dina fästa sessioner? |  |
| `settings.done_counts_only_when_your_chosen` | Done counts only when your chosen checks have passed. | Klart räknas först när dina valda kontroller gått igenom. |  |
| `settings.during_these_hours_no_notices_come` | No pop-up alerts about other sessions then, except ones you set to Tell me when done. | Inga popup-notiser om andra sessioner då, utom de du ställt in på Säg till när den är klar. |  |
| `settings.each_turn_it_lists_what_leaves` | After each answer, it lists what leaves this computer. | Efter varje svar listas vad som lämnar den här datorn. |  |
| `settings.english` | English | English |  |
| `settings.erase_ask` | This would delete everything vaken stored. It cannot be undone. Nothing has been deleted yet. | Det här tar bort allt som vaken har sparat. Det går inte att ångra. Inget har tagits bort än. |  |
| `settings.erase_confirm` | Delete everything | Ta bort allt |  |
| `settings.erase_done` | Everything vaken stored is deleted. It starts fresh from here. | Allt som vaken har sparat är borttaget. Den börjar om från noll. |  |
| `settings.erase_folders` | Stored data: {n} folders, {size} | Sparad data: {n} mappar, {size} |  |
| `settings.erase_halt` | A Pause that is on stays on. | En paus som är på förblir på. |  |
| `settings.erase_keys` | Saved notes and choices: {n} | Sparade anteckningar och val: {n} |  |
| `settings.erase_left` | {n} could not be removed. | {n} gick inte att ta bort. |  |
| `settings.erase_no_folders` | No stored folders. | Inga sparade mappar. |  |
| `settings.erase_note` | Removes everything vaken stored on this computer, except a pause that is on. Project files stay. It cannot be undone. | Tar bort allt som vaken har sparat på den här datorn, utom en paus som är på. Projektfilerna finns kvar. Det går inte att ångra. |  |
| `settings.erase_open` | Delete everything vaken stored | Ta bort allt som vaken har sparat |  |
| `settings.erase_safe` | Your project files, CLAUDE.md and settings.json are never touched. | Dina projektfiler, CLAUDE.md och settings.json rörs aldrig. |  |
| `settings.erase_unread` | The saved notes and choices are deleted, but the stored folders could not be listed, so they were not removed. | De sparade anteckningarna och valen är borttagna, men de sparade mapparna gick inte att lista, så de togs inte bort. |  |
| `settings.everything_is_back_to_the_usual` | Everything is back to the usual choice. | Allt är tillbaka till det vanliga valet. |  |
| `settings.expert_settings_they_work_as_they` | Expert settings. They work as they are; most people never change them. | Expertinställningar. De fungerar som de är; de flesta ändrar dem aldrig. |  |
| `settings.follow_the_project` | Follow the project | Följ projektet | Agents view, a button under the roles |
| `settings.helpers` | Agents | Agenter |  |
| `settings.how_much_should_the_cockpit_do` | How much should it tell you? | Hur mycket ska den säga till om? |  |
| `settings.it_adds_the_brief_packet_timeline` | It adds the brief, packet, timeline, standup, story and search commands. | Lägger till kommandona brief, packet, timeline, standup, story och search. |  |
| `settings.it_keeps_the_last_50_shell` | It keeps the last 50 shell commands, as program and kind only. | De senaste 50 skalkommandona sparas, bara som program och slag. |  |
| `settings.it_lists_what_needs_you` | It lists what needs you and shows a count above the chat box. | Listar vad som behöver dig och visar en siffra ovanför chattrutan. |  |
| `settings.it_reads_memory_and_battery_by` | It reads memory and battery by running short programs. | Läser minne och batteri genom att köra korta program. |  |
| `settings.it_shows_one_score_from_evidence` | It shows one score from evidence only, with the list behind it. | Ett enda poängtal, bara från belägg, med listan bakom. |  |
| `settings.it_shows_your_pull_request_and` | It shows your pull request and its checks in plain words. | Din pull request och dess kontroller visas med enkla ord. |  |
| `settings.it_tells_claude_that_web_and` | It tells Claude that web and app text is data, not orders. | Claude får veta att text från webben och appar är data, inte order. |  |
| `settings.it_writes_down_your_answers_and` | It writes down your answers and the decisions you state. | Dina svar och beslut du uttalar skrivs ner. |  |
| `settings.keep` | Keep | Behåll |  |
| `settings.language` | Language | Språk |  |
| `settings.layout_all` | All | Alla |  |
| `settings.layout_calm` | Calm | Lugn |  |
| `settings.layout_everything` | Every card | Varje kort | Name of a built-in layout; shown translated only when the stored name is exactly Everything |
| `settings.layout_focus` | Focus | Fokus | Name of a built-in layout; shown translated only when the stored name is exactly Focus |
| `settings.layout_money` | Money | Pengar | Name of a built-in layout; shown translated only when the stored name is exactly Money |
| `settings.layout_quiet` | Quiet | Tyst | Name of a built-in layout; shown translated only when the stored name is exactly Quiet |
| `settings.like_all_cards` | Default | Standard | A card's own detail choice, on the flipped card's Detail row |
| `settings.like_the_mac` | Like the Mac | Som Macen |  |
| `settings.like_the_pc` | Like the PC | Som datorn |  |
| `settings.make_this_project_follow_all_projects` | Make this project follow all projects again? | Ska det här projektet följa alla projekt igen? |  |
| `settings.manage_helpers` | Manage agents › | Hantera agenter › |  |
| `settings.menus_and_help_pages_chat_answers` | Menus and help pages. Answers in the session stay English. | Menyer och hjälpsidor. Svaren i sessionen förblir på engelska. |  |
| `settings.mode` | Mode | Läge |  |
| `settings.mode_balanced` | Recommended | Rekommenderat | The mode name (id balanced) in Settings and the first-run choice; what a fresh install starts on; each mode adds to the one before |
| `settings.mode_balanced_short` | Tips, recaps, budget warnings, decision log. No extra model calls, only short safety notes. | Tips, sammanfattningar, budgetvarningar, beslutslogg. Inga extra modellanrop, bara korta säkerhetsnoteringar. | Settings, the one line under Recommended while it is the chosen mode |
| `settings.mode_changes_n` | one: Picking it sets 1 setting. Your own change to it is replaced. You can change it again in Settings.<br>other: Picking it sets {n} settings. Your own changes to them are replaced. You can change each one again in Settings. | one: Väljer du det ställs 1 inställning in. Din egen ändring av den ersätts. Du kan ändra den igen i Inställningar.<br>other: Väljer du det ställs {n} inställningar in. Dina egna ändringar av dem ersätts. Du kan ändra var och en igen i Inställningar. |  |
| `settings.mode_chip_project` | This project: {mode} | Det här projektet: {mode} | Settings, the mode card's chip at This project; {mode} is the mode's name |
| `settings.mode_custom` | Custom | Egen | The mode name when the rows are your own mix |
| `settings.mode_full` | Everything useful | Allt användbart | The mode name (id full): Recommended plus what sends Claude extra text; each mode adds to the one before |
| `settings.mode_full_short` | Adds prompt reviews, plan first and notes to Claude. | Lägger till granskning av uppmaningar, plan först och noteringar till Claude. | Settings, the one line under Everything useful while it is the chosen mode |
| `settings.mode_on_now` | On now. | På nu. |  |
| `settings.mode_pick_note` | Picking a mode sets its settings. Your own changes to them are replaced. | Väljer du ett läge ställs dess inställningar in. Dina egna ändringar av dem ersätts. | Settings, one dim line under the three modes |
| `settings.mode_quiet` | Only alerts | Bara larm | The mode name (id quiet); each mode adds to the one before |
| `settings.mode_quiet_about` | Tells you when a session needs you, a limit is near, the context is nearly full, a model switch would cost a lot, or a step is risky. No tips and no checks. | Säger till när en session behöver dig, en gräns är nära, kontexten är nästan full, ett modellbyte skulle kosta mycket eller ett steg är riskabelt. Inga tips och inga kontroller. |  |
| `settings.mode_quiet_short` | Alerts when a session needs you, a limit is near or a step is risky. | Larm när en session behöver dig, en gräns är nära eller ett steg är riskabelt. | Settings, the one line under Only alerts while it is the chosen mode |
| `settings.mode_tag_free` | free | gratis | Settings, a dim tag at the right of a mode that sends Claude nothing extra |
| `settings.mode_tag_plan` | uses a little plan | använder lite av planen | Settings, a dim tag at the right of Everything useful: it sends Claude extra text |
| `settings.mode_this_project` | This project ({name}) only: a mode press changes this project's own settings. All projects keep theirs. | Bara det här projektet ({name}): ett tryck på ett läge ändrar projektets egna inställningar. Alla projekt behåller sina. | Settings, the mode card at This project; {name} is the project folder's name |
| `settings.money_and_plan` | Money and plan | Pengar och plan |  |
| `settings.motion` | Motion | Rörelse |  |
| `settings.n_changed` | {n} changed | {n} ändrade |  |
| `settings.needs_you_card` | Needs you card | Kortet Behöver dig |  |
| `settings.notes_and_handoff` | Notes for the next session | Anteckningar till nästa session |  |
| `settings.notes_to_claude` | Notes to Claude | Noteringar till Claude |  |
| `settings.off` | Off | Av |  |
| `settings.on` | On | På |  |
| `settings.on_of_total_on` | {on} of {total} on | {on} av {total} på | Settings, a section chip's short form when the long one does not fit beside the title |
| `settings.on_of_total_settings_on` | {on} of {total} settings on | {on} av {total} inställningar på |  |
| `settings.on_of_total_settings_on_some_suggest` | {on} of {total} on, {off} off. {suggest} only suggest. | {on} av {total} på, {off} avstängda. {suggest} ger bara förslag. |  |
| `settings.on_repeated_edits_idle_calls_or` | On repeated edits, idle calls or a failing step, it warns you. | Vid upprepade ändringar, tomma anrop eller ett misslyckat steg varnar vaken dig. |  |
| `settings.on_your_first_prompt_of_a` | On your first prompt of a day, it adds one line above the chat box. | Vid ditt första meddelande för dagen visas en rad ovanför chattrutan. |  |
| `settings.once_a_day_it_tells_you` | Once a day, it tells you if CLAUDE.md files are big. | En gång om dagen säger vaken till om CLAUDE.md-filer är stora. |  |
| `settings.once_a_week_it_adds_one` | Once a week, it adds one line above the chat box on what vaken did. | En gång i veckan visas en rad ovanför chattrutan om vad vaken gjort. |  |
| `settings.pin_puts_a_session_first_in` | Pin puts a session first in Other sessions. Hide takes it off the list, except while it needs you. | Fäst lägger en session först i Andra sessioner. Dölj tar bort den från listan, utom medan den behöver dig. |  |
| `settings.preset_backoffice` | No coding | Ingen kod | The plain name of the backoffice preset |
| `settings.preset_backoffice_about` | For people who do not code: plain words, and outside actions stop until you say yes. | För dig som inte kodar: enkla ord, och handlingar utanför stoppas tills du säger ja. | What the backoffice preset does |
| `settings.preset_careful` | Ask before risky steps | Fråga före riskabla steg | The plain name of the careful preset |
| `settings.preset_careful_about` | Stops risky steps, loops and overspending until you say yes. | Stoppar riskabla steg, loopar och överförbrukning tills du säger ja. |  |
| `settings.preset_everything` | Every check on | Alla kontroller på | The plain name of the everything preset |
| `settings.preset_everything_about` | Every helpful check is on, and it saves usage by itself. | Varje hjälpsam kontroll är på, och den sparar användning själv. |  |
| `settings.preset_thrifty` | Save usage | Spara användning | The plain name of the thrifty preset |
| `settings.preset_thrifty_about` | Saves usage by itself: compacts sessions, keeps the cache warm, and gives agents cheaper models. | Sparar användning själv: komprimerar sessioner, håller cachen varm och ger agenter billigare modeller. |  |
| `settings.privacy_note` | What vaken keeps stays on this computer. It has no server and sends nothing to its authors. | Det som vaken sparar stannar på den här datorn. Den har ingen server och skickar inget till sina upphovspersoner. |  |
| `settings.quiet_plus_suggestions_band_lines` | Only alerts, plus every free feature: tips, recaps, prompt tips, budget warnings, a decision log and a look at whether Claude did what it says. No extra model calls, only short safety notes. | Bara larm, plus varje gratis funktion: tips, sammanfattningar, råd om uppmaningar, budgetvarningar, en beslutslogg och en blick på om Claude gjorde det den säger. Inga extra modellanrop, bara korta säkerhetsnoteringar. |  |
| `settings.reads_only` | Reads only. | Läser bara. | Agents view, a role row's note; joined to the role's own line |
| `settings.reduced` | Reduced | Minskad |  |
| `settings.reduced_holds_the_pulsing_dot_and_the_moving_bar_still` | Reduced holds the pulsing dot and the moving bar still. | Minskad håller den pulserande pricken och den rörliga stapeln stilla. |  |
| `settings.reset_note` | Your choices go back to the defaults. Notes and history stay. There is no undo. | Dina val går tillbaka till standard. Anteckningar och historik finns kvar. Det går inte att ångra. |  |
| `settings.safety_notes_always_go_to_claude` | Safety notes always go to Claude; All checks adds the check results and team notes. | Säkerhetsnoteringar går alltid till Claude; Alla kontroller lägger till kontrollresultat och teamnoteringar. |  |
| `settings.safety_only` | Safety only | Bara säkerhet |  |
| `settings.section_failed` | This part could not be shown: {error} | Den här delen kunde inte visas: {error} |  |
| `settings.shorten_by_itself` | Compact by itself | Komprimera automatiskt |  |
| `settings.show_always_shows_a_card_hide` | Show always shows a card, Hide never does. Auto shows it when it has something to show. Plan limits, This session, Other sessions, Autopilot and Safety have no Auto: they always show unless you hide them. | Visa visar alltid ett kort, Dölj visar det aldrig. Auto visar det när det har något att visa. Planens gränser, Den här sessionen, Andra sessioner, Autopilot och Säkerhet har ingen Auto: de visas alltid om du inte döljer dem. |  |
| `settings.standard` | Standard | Vanlig |  |
| `settings.standard_shows_six_cards_all_shows` | Standard: Needs you plus six cards. All: every card. Custom: your own choice and order. | Vanlig: Behöver dig plus sex kort. Alla: alla kort. Egen: ditt eget val och din egen ordning. |  |
| `settings.suggest` | Suggest | Föreslå |  |
| `settings.svenska` | Svenska | Svenska |  |
| `settings.the_cockpit_considers_shortening_once_the` | Vaken considers compacting once the session fills this much of its window. | Vaken överväger att komprimera sessionen när den fyller så mycket av sitt fönster. |  |
| `settings.this_project_follows_all_projects_again` | This project follows all projects again. | Det här projektet följer alla projekt igen. |  |
| `settings.this_project_only` | This project only. | Bara det här projektet. | Agents view, a role row's note: where its model comes from |
| `settings.this_session_only` | This session only. | Bara den här sessionen. | Agents view, a role row's note: where its model comes from |
| `settings.watch` | Watch | Bevaka |  |
| `settings.when_a_card_has_a_problem` | When a card has a problem, it moves up; calm cards shrink to one line. | När ett kort har ett problem flyttas det upp; lugna kort krymper till en rad. |  |
| `settings.when_a_command_deletes_force_pushes` | When a command deletes, it stops if Claude Code would not ask first, else warns. | När ett kommando raderar stoppar vaken det om Claude Code inte skulle fråga först, annars varnar den. |  |
| `settings.when_a_database_migration_runs_it` | When a database migration runs, it warns or stops until you say yes. | När en databasmigrering körs varnar eller stoppar vaken tills du säger ja. |  |
| `settings.when_a_lookup_helper_starts_it` | When a lookup agent starts, it tells you or uses the Researcher's model. | När en uppslagsagent startar berättar vaken det eller använder Utforskarens modell. |  |
| `settings.when_a_new_package_looks_odd` | When a new package looks odd (very young, look-alike), it warns or stops. | När ett nytt paket ser konstigt ut (väldigt ungt, liknande namn) varnar eller stoppar vaken. |  |
| `settings.when_a_new_topic_would_cost` | When a new topic would cost less in a new session, it tells you. | När ett nytt ämne blir billigare i en ny session säger vaken till. |  |
| `settings.when_a_phone_joins_the_cockpit` | When a phone joins, vaken makes answers short and numbered. | När en telefon ansluter gör vaken svaren korta och numrerade. |  |
| `settings.when_a_plan_limit_stops_a` | When a plan limit stops a turn, it reminds you or goes on after the reset. | När planens gräns stoppar ett svar påminner vaken eller fortsätter efter återställningen. |  |
| `settings.when_a_plan_window_or_todays` | When your 5-hour or weekly limit is nearly used up, it warns early. | När din 5-timmarsgräns eller veckogräns nästan är slut varnar vaken tidigt. |  |
| `settings.when_a_prompt_is_vague_tip` | When a prompt is vague, Tip shows a line; Ask also tells Claude. | När en prompt är vag visar Tips en rad; Fråga säger det också till Claude. |  |
| `settings.when_a_secret_file_is_read` | When a secret file is read, it stops if Claude Code would not ask, else warns. | När en hemlig fil läses stoppar vaken det om Claude Code inte skulle fråga, annars varnar den. |  |
| `settings.when_a_sessions_model_or_effort` | Hints when model or effort looks wrong. Model switch cost warnings always stay on. | Tips när modell eller ansträngning verkar fel. Kostnadsvarningar för modellbyte är alltid på. |  |
| `settings.when_a_step_breaks_a_never` | When a step breaks a Never rule in your CLAUDE.md, it counts or warns. | När ett steg bryter en Aldrig-regel i din CLAUDE.md räknar eller varnar vaken. |  |
| `settings.when_a_step_fails_it_notes_the_kind` | When a step fails, it notes the kind. /vaken-explain error says it in plain words. | När ett steg misslyckas noterar vaken vilken sorts fel det var. /vaken-explain error säger det med enkla ord. |  |
| `settings.when_a_working_session_goes_quiet` | When a working session goes quiet, it says so. | När en pågående session blir tyst säger vaken till. |  |
| `settings.when_an_edit_leaves_your_folders` | When an edit leaves your folders or hits a protected file, it warns or stops. | När en ändring lämnar dina mappar eller rör en skyddad fil varnar eller stoppar vaken. |  |
| `settings.when_an_edit_skips_tests_or` | When an edit skips tests or removes their checks, it warns or stops. | När en ändring hoppar över tester eller tar bort deras kontroller varnar eller stoppar vaken. |  |
| `settings.when_another_session_edits_the_same` | When another session edits the same file, it warns you. | När en annan session ändrar samma fil varnar vaken dig. |  |
| `settings.when_another_session_holds_a_port` | When another session holds a port, it warns you. | När en annan session håller en port varnar vaken dig. |  |
| `settings.when_another_session_needs_you_or` | Needs you: when another session waits for you. Needs you and done: also when it finishes. | Behöver dig: när en annan session väntar på dig. Behöver dig och klart: också när den blir klar. |  |
| `settings.when_another_session_works_in_this` | When another session works in this folder, it warns you. | När en annan session arbetar i den här mappen varnar vaken dig. |  |
| `settings.when_asked_it_writes_a_paragraph` | When asked, it writes a paragraph on what cost most. | På begäran skriver vaken ett stycke om vad som kostade mest. |  |
| `settings.when_claude_retries_a_failing_step` | When Claude retries a failing step again and again, it warns or stops. | När Claude försöker ett misslyckat steg om och om igen varnar eller stoppar vaken. |  |
| `settings.when_claude_says_done_or_tests` | When Claude says "done" or "tests pass" with no check behind it, it flags that. | När Claude säger "klart" eller "testerna går igenom" utan kontroll flaggas det. |  |
| `settings.when_claude_sends_posts_pays_or` | When Claude sends, posts, pays or changes the cloud, it warns or stops. | När Claude skickar, postar, betalar eller ändrar molnet varnar eller stoppar vaken. |  |
| `settings.when_claude_writes_a_command_cockpit` | When Claude writes a command, /vaken-help run do runs it after your yes. | När Claude skriver ett kommando kör /vaken-help run do det efter ditt ja. |  |
| `settings.when_code_reads_an_env_name` | When code reads an env name no file declares, it warns you. | När kod läser ett env-namn som ingen fil anger varnar vaken dig. |  |
| `settings.when_edits_wander_far_from_the` | When edits wander far from the goal, it warns you. | När ändringar vandrar långt från målet varnar vaken dig. |  |
| `settings.when_helpers_run_it_lists_them` | When agents run, it lists them with model and time. | När agenter körs listas de med modell och tid. |  |
| `settings.when_it_waits` | When it waits | När något väntar |  |
| `settings.when_parts_of_the_cockpit_fail` | When parts of vaken fail or run slow, it counts and warns. | När delar av vaken misslyckas eller går långsamt räknar och varnar den. |  |
| `settings.when_tests_build_or_lint_run` | Notes when tests, build or lint pass. Off also turns off Claims and Definition of done. | Noterar när tester, bygge eller lint går igenom. Av stänger också av Påståenden och Definition av klart. |  |
| `settings.when_the_chat_grows_it_suggests` | Suggest hints Claude (uses a little plan). Watch only shows it. Auto compacts when idle. | Föreslå ber Claude om ett råd (använder lite av planen). Bara visa visar rådet. Auto komprimerar när det är lugnt. |  |
| `settings.when_the_chat_is_shortened_goal` | When the session is compacted, goal, branch and next steps are kept. | När sessionen komprimeras behålls mål, gren och nästa steg. |  |
| `settings.when_too_many_helpers_run_at` | When too many agents run at once, it warns or stops more. | När för många agenter körs samtidigt varnar eller stoppar vaken. |  |
| `settings.when_worktrees_are_safe_to_remove` | When worktrees are safe to remove, it says so. | När worktrees är säkra att ta bort säger vaken det. |  |
| `settings.when_you_are_away_it_keeps` | When you are away, it keeps the Mac awake for a phone or a waiting question. | När du är borta hålls Macen vaken för en telefon eller en fråga som väntar. |  |
| `settings.when_you_come_back_after_a` | When you come back after a break, you get a short recap. | När du kommer tillbaka efter en paus får du en kort sammanfattning. |  |
| `settings.when_you_end_away_mode_it` | When you end away mode, it sums up what happened. | När du avslutar frånvaroläget sammanfattas vad som hände. |  |
| `settings.when_you_repeat_a_request_it` | When you repeat a request, it offers to make it a skill. | När du upprepar en begäran erbjuder vaken att göra en färdighet av den. |  |
| `settings.when_your_phone_joins_it_shows` | When your phone joins, it shows a short notice in the session. | När din telefon ansluter visas en kort notis i sessionen. |  |
| `settings.while_agents_work_it_keeps_the` | While agents work, it keeps the Mac awake. | Medan agenter arbetar hålls Macen vaken. |  |
| `settings.while_you_are_away_it_messages_claude` | Sends Claude a message while you are away to keep the next answer cheap. Uses plan. | Skickar Claude ett meddelande medan du är borta så att nästa svar blir billigt. Använder plan. |  |
| `settings.while_you_are_away_risky_steps` | While you are away, risky steps are stopped by themselves. | Medan du är borta stoppas riskabla steg av sig själva. |  |
| `settings.your_own_mix_pick_a_mode` | Your own mix. Pick a mode to set them all at once. | Din egen mix. Välj ett läge för att ställa in alla på en gång. |  |
| `settings.your_view_decides_which_cards_show` | Your view decides which cards show. Pick Custom to choose. | Din vy avgör vilka kort som visas. Välj Egen för att välja själv. |  |

## cards

Cards: rules and titles. (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `cards.1_more_card_when_it_has` | 1 more card when it has something to show | 1 kort till visas när det har något att visa |  |
| `cards.and_n_more` | and {n} more | och {n} till |  |
| `cards.auto` | Auto | Auto |  |
| `cards.cards_appear_when_they_have_something` | Cards appear when they have something to show. | Kort visas när de har något att visa. |  |
| `cards.mode_is_on_change_it_any` | {mode} is on. Change it any time in Settings. | {mode} är på. Du kan ändra det när som helst i Inställningar. |  |
| `cards.n_more_cards_when_they_have` | {n} more cards when they have something to show | {n} kort till visas när de har något att visa |  |
| `cards.n_need_you` | {n} need you | {n} behöver dig |  |
| `cards.n_needs_you` | {n} needs you | {n} behöver dig |  |
| `cards.new` | new | ny |  |
| `cards.new_card_title` | New card: {title} | Nytt kort: {title} |  |
| `cards.new_cards_title` | New cards: {title} | Nya kort: {title} |  |
| `cards.see_all_n_cards` | About the {n} cards › | Om de {n} korten › |  |
| `cards.send_your_first_message_the_plan` | Send your first message. The plan, this session and your other sessions show here after the first answer. | Skicka ditt första meddelande. Planen, den här sessionen och dina andra sessioner visas här efter första svaret. |  |
| `cards.standard_shows_needs_you_and` | Standard shows Needs you and six cards. All shows every card. Custom: you pick the cards. | Vanlig visar Behöver dig och sex kort. Alla visar alla kort. Egen: du väljer korten. |  |
| `cards.start_mode_label` | How much it tells you | Hur mycket den säger |  |
| `cards.start_view_label` | Which cards show | Vilka kort som visas |  |
| `cards.the_cockpit_watches_your_sessions` | Vaken watches your sessions and warns you before a limit or a risky step. | Vaken följer dina sessioner och varnar dig före en gräns eller ett riskabelt steg. |  |
| `cards.the_usual_choice` | the usual choice | det vanliga valet |  |

## guide

The card guide. (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `guide.042_memory_62` | $0.42, context 62% full | 0,42 USD, kontexten 62 % full |  |
| `guide.1_open_checks_passing` | 1 open, checks passing | 1 öppen, kontrollerna går igenom |  |
| `guide.1_step_stopped_today` | 1 step stopped today | 1 steg stoppat i dag |  |
| `guide.2_commands_ready` | 2 commands ready | 2 kommandon redo |  |
| `guide.2_open_ends_from_yesterday` | 2 open ends from yesterday | 2 öppna trådar från i går |  |
| `guide.2_running_1_done` | 2 running, 1 done | 2 körs, 1 klar |  |
| `guide.3_sessions_1_working` | 3 sessions, 1 working | 3 sessioner, 1 arbetar |  |
| `guide.4_skills_used_today` | 4 skills used today | 4 färdigheter använda i dag |  |
| `guide.5_hours_41_week_12` | 5-hour 41%, week 12% | 5-timmars 41 %, vecka 12 % |  |
| `guide.5_things_done_today` | 5 things done today | 5 saker gjorda i dag |  |
| `guide.always_shown` | Always shown. | Visas alltid. |  |
| `guide.checks_your_instruction_files_and` | Checks your instruction files and notes, and what compacting keeps. | Kontrollerar dina instruktionsfiler och anteckningar, och vad komprimeringen behåller. |  |
| `guide.example` | Example | Exempel |  |
| `guide.follows_your_open_pull_requests_checks` | Follows your open pull requests: checks, merging and the next step. It acts only when you press. | Följer dina öppna pull requests: kontroller, ihopslagning och nästa steg. Den gör något bara när du trycker. |  |
| `guide.halt_all_undo_a_change_and` | Pause all, undo a change, and see which risky steps were stopped. | Pausa allt, ångra en ändring och se vilka riskabla steg som stoppades. |  |
| `guide.halt_all_undo_the_last_change` | Pause all, undo the last change | Pausa allt, ångra senaste ändringen |  |
| `guide.hidden` | Hidden | Dolt |  |
| `guide.in_line_with_your_choices` | In line with your choices | I linje med dina val |  |
| `guide.keeps_the_helper_files_and_instructions` | Shows whether the agent files and instructions match your choices. It writes files only when you press. | Visar om agenternas filer och instruktioner stämmer med dina val. Den skriver filer bara när du trycker. |  |
| `guide.lists_the_risky_steps_the_cockpit` | Lists the risky steps vaken warned you about or stopped. | Listar de riskabla steg som vaken varnade för eller stoppade. |  |
| `guide.lists_the_shell_commands_in_the_last` | Lists the shell commands in the last answer. One runs only when you press Run. | Listar skalkommandona i det senaste svaret. Ett körs bara när du trycker på Kör. |  |
| `guide.lists_what_the_cockpit_did_for` | Lists what vaken did for you today. It only lists; it does not act. | Listar vad vaken gjorde åt dig i dag. Den listar bara och gör inget själv. |  |
| `guide.needs_you_sits_on_top` | Needs you sits on top of every view. | Behöver dig ligger överst i varje vy. |  |
| `guide.notes_checked_nothing_heavy` | Notes checked, nothing heavy | Anteckningar kontrollerade, inget tungt |  |
| `guide.phone_ipad_desktop` | Phone, iPad, desktop | Telefon, iPad, dator |  |
| `guide.ready_to_ship` | Ready to ship | Redo att leverera |  |
| `guide.room_for_3_more_agents` | Room for 3 more agents | Plats för 3 agenter till |  |
| `guide.says_how_many_more_helpers_this` | Says how many more agents this computer can run. | Säger hur många fler agenter den här datorn kan köra. |  |
| `guide.says_if_you_are_ready_to` | Says if you are ready to ship, what blocks it, and the next step. | Säger om du är redo att leverera, vad som hindrar och nästa steg. |  |
| `guide.shown` | Shown | Visas |  |
| `guide.shows_after_a_break_or_when` | Shows after a break, or when something is still open. | Visas efter en paus, eller när något fortfarande är öppet. |  |
| `guide.shows_the_helper_agents_claude_started` | Shows the agents Claude started and whether they still run. | Visar agenterna som Claude startade och om de fortfarande kör. |  |
| `guide.shows_what_this_chat_costs_and` | Shows what this session costs and how full its context is. | Visar vad den här sessionen kostar och hur full dess kontext är. |  |
| `guide.shows_when_a_dev_server_runs` | Shows when a dev server runs or a screen file was edited. | Visas när en utvecklingsserver kör eller en skärmfil har ändrats. |  |
| `guide.shows_when_a_helper_agent_has` | Shows when an agent has started. | Visas när en agent har startat. |  |
| `guide.shows_when_a_pull_request_is` | Shows when a pull request is open. | Visas när en pull request är öppen. |  |
| `guide.shows_when_a_pull_request_or` | Shows when a pull request or a check waits. | Visas när en pull request eller en kontroll väntar. |  |
| `guide.shows_when_claude_has_done_work` | Shows when Claude has done work that can be checked. | Visas när Claude har gjort något som kan kontrolleras. |  |
| `guide.shows_when_it_warned_or_stopped` | Shows when it warned or stopped something today. | Visas när den har varnat eller stoppat något i dag. |  |
| `guide.shows_when_the_chat_gets_heavy` | Shows when the session gets heavy or its notes need a check. | Visas när sessionen blir tung eller anteckningarna behöver kontrolleras. |  |
| `guide.shows_when_the_helper_gauge_is` | Shows when the agent gauge is on or the computer is full. | Visas när agentmätaren är på eller datorn är full. |  |
| `guide.shows_when_the_last_answer_has` | Shows when the last answer has commands to run. | Visas när det senaste svaret har kommandon att köra. |  |
| `guide.shows_when_they_differ_from_your` | Shows when they differ from your choices or conflict. | Visas när de avviker från dina val eller krockar. |  |
| `guide.shows_when_you_have_used_a` | Shows when you have used a skill. | Visas när du har använt en färdighet. |  |
| `guide.shows_which_skills_you_use_most` | Shows which skills you use most and what the list costs. | Visar vilka färdigheter du använder mest och vad listan kostar. |  |
| `guide.shows_your_app_at_phone_ipad` | Shows your app at phone, iPad and desktop size. | Visar din app i telefon-, iPad- och datorstorlek. |  |
| `guide.shows_your_other_open_sessions_and` | Shows your other open sessions and what each one does. | Visar dina andra öppna sessioner och vad var och en gör. |  |
| `guide.tells_you_where_you_were_what` | Tells you where you were, what is still open and what happened while you were away. | Säger var du var, vad som fortfarande är öppet och vad som hände medan du var borta. |  |
| `guide.tells_you_whether_the_tests_and` | Tells you whether the tests and checks really passed. | Säger om testerna och kontrollerna verkligen gick igenom. |  |
| `guide.tests_passed_build_passed` | Tests passed, build passed | Testerna gick igenom, bygget gick igenom |  |
| `guide.turn_cards_on_or_off` | Turn cards on or off | Slå på eller av kort |  |
| `guide.warns_you_before_you_reach_a` | Warns you before you reach a plan limit. | Varnar dig innan du når planens gräns. |  |
| `guide.what_each_card_does` | What each card does | Vad varje kort gör |  |
| `guide.your_own_view_switch_each_card` | Your own view: switch each card on or off. The sample is made up. | Din egen vy: slå på eller av varje kort. Exemplet är påhittat. |  |

## runcost

Cost check before a task run. (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `runcost.1_helper` | 1 agent | 1 agent |  |
| `runcost.a_short_plan_before_the_work` | A short plan before the work. | En kort plan före arbetet. |  |
| `runcost.add_a_task` | Add a task | Lägg till en uppgift |  |
| `runcost.add_a_task_first_then_press_start` | Add a task first, then press Start run. | Lägg först till en uppgift och tryck sedan Starta körningen. |  |
| `runcost.done_when` | Done when | Klart när |  |
| `runcost.estimate_about_usd_at_list_price` | Estimate: about {usd} at list price ({what}). A guess, not what your plan charges. | Uppskattning: ungefär {usd} till listpris ({what}). En gissning, inte vad din plan tar betalt. |  |
| `runcost.estimate_no_price_known_for_what` | Estimate: no price known for {what}. | Uppskattning: inget pris känt för {what}. |  |
| `runcost.from_past_runs` | from past runs | från tidigare körningar |  |
| `runcost.goal` | Goal | Mål |  |
| `runcost.lint_is_clean` | Lint is clean | Lint är rent |  |
| `runcost.n_helpers` | {n} agents | {n} agenter |  |
| `runcost.n_without_a_price` | {n} without a price | {n} utan pris |  |
| `runcost.no_goal_yet_add_a_task_to` | No goal yet. Add a task to start a run. | Inget mål än. Lägg till en uppgift för att starta en körning. |  |
| `runcost.nothing_started_press_start_anyway` | Nothing started. Press Start anyway to go on. | Inget startade. Tryck Starta ändå för att fortsätta. |  |
| `runcost.nothing_started_type_cockpit_tasks` | Nothing started. Type /vaken-tasks start anyway to go on. | Inget startade. Skriv /vaken-tasks start anyway för att fortsätta. |  |
| `runcost.one_helper_may_cost_more_than` | One agent may cost more than the agent cap of {usd}. | En agent kan kosta mer än agenttaket på {usd}. |  |
| `runcost.set_a_goal_first_cockpit_goal` | Set a goal first: /vaken-tasks goal &lt;one sentence&gt;. | Sätt ett mål först: /vaken-tasks goal &lt;en mening&gt;. |  |
| `runcost.start` | Start | Starta |  |
| `runcost.start_a_task` | Run one task | Kör en uppgift |  |
| `runcost.start_anyway` | Start anyway | Starta ändå |  |
| `runcost.tests_pass` | Tests pass | Testerna går igenom |  |
| `runcost.the_build_works` | The build works | Bygget fungerar |  |
| `runcost.the_plan_window_has_about_n` | The plan window has about {n} min left at this pace. | Planfönstret har ungefär {n} min kvar i den här takten. |  |
| `runcost.the_weekly_window_is_n_used` | The weekly window is {n}% used. | Veckofönstret är {n} % använt. |  |
| `runcost.the_weekly_window_is_n_used_2` | The weekly window is {n}% used now. | Veckofönstret är {n} % använt nu. |  |
| `runcost.this_may_cost_more_than_the` | This may cost more than the run limit of {usd}. | Det kan kosta mer än körningens gräns på {usd}. |  |

## fit

Model fit (the card and its advice). (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `fit.asked_the_app_to_lower_the` | Asked the app to lower the effort of {name}. It may ask you to confirm. | Bad appen sänka ansträngningen för {name}. Den kan be dig bekräfta. |  |
| `fit.asked_the_app_to_move_name` | Asked the app to move {name} to {model}. It may ask you to confirm. | Bad appen flytta {name} till {model}. Den kan be dig bekräfta. |  |
| `fit.asked_the_app_to_put_name` | Asked the app to put {name} back to {old}. It may ask you to confirm. | Bad appen ställa tillbaka {name} till {old}. Den kan be dig bekräfta. |  |
| `fit.asked_the_app_to_raise_the` | Asked the app to raise the effort of {name}. It may ask you to confirm. | Bad appen höja ansträngningen för {name}. Den kan be dig bekräfta. |  |
| `fit.back_to_old` | Back to {old} | Tillbaka till {old} |  |
| `fit.checks_failed_twice_in_a_row` | Checks failed twice in a row | Kontroller misslyckades två gånger i rad |  |
| `fit.checks_failed_twice_in_a_row_2` | Checks failed twice in a row. You can raise the effort in the model menu. | Kontroller misslyckades två gånger i rad. Du kan höja ansträngningen i modellmenyn. |  |
| `fit.checks_failed_twice_in_a_row_3` | Checks failed twice in a row. You can pick {model} in the model menu. | Kontroller misslyckades två gånger i rad. Du kan välja {model} i modellmenyn. |  |
| `fit.could_not_change_it_from_here` | Could not change it from here. Use the model menu in that session. | Kunde inte ändra det härifrån. Använd modellmenyn i den sessionen. |  |
| `fit.light_work_tight_week` | Light work, tight week | Lätt arbete, trång vecka |  |
| `fit.lower_the_effort_saves_usage` | Lower the effort (saves usage) | Sänk ansträngningen (sparar användning) |  |
| `fit.lowered_the_effort` | Lowered the effort | Sänkte ansträngningen |  |
| `fit.moved_to_model` | Moved to {model} | Flyttad till {model} |  |
| `fit.not_now` | Not now | Inte nu |  |
| `fit.only_reads_files_now` | Only reads files now | Läser bara filer nu |  |
| `fit.raise_the_effort` | Raise the effort | Höj ansträngningen |  |
| `fit.raised_the_effort` | Raised the effort | Höjde ansträngningen |  |
| `fit.the_week_is_tight_and_this` | The week is tight and this session only reads files. You can pick {model} in the model menu. | Veckan är trång och sessionen läser bara filer. Du kan välja {model} i modellmenyn. |  |
| `fit.this_chat_only_reads_files_you` | This session only reads files. You can lower the effort in the model menu. | Den här sessionen läser bara filer. Du kan sänka ansträngningen i modellmenyn. |  |
| `fit.use_model` | Use {model} | Använd {model} |  |

## fitsettings

Model fit settings. (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `fitsettings.light_work_needs_less_effort_or` | Light work needs less effort (how hard Claude thinks) or a cheaper model, and failed checks may need a stronger one. Another session can be changed from its row; the app may ask you first. This session only gets a hint: change it in the model menu. | Lätt arbete behöver mindre ansträngning (hur hårt Claude tänker) eller en billigare modell, och misslyckade kontroller kan behöva en starkare. En annan session kan ändras från sin rad; appen kan fråga dig först. Den här sessionen får bara ett tips: ändra i modellmenyn. |  |
| `fitsettings.model_and_effort` | Model and effort | Modell och ansträngning |  |
| `fitsettings.model_and_effort_hints` | Model and effort hints | Tips om modell och ansträngning |  |

## selfcost

What vaken itself costs. (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `selfcost.cockpit_in_this_session_per_minute` | Vaken in this session, per minute: store writes {w} · programs {r} · app calls {c} | Vaken i den här sessionen, per minut: skrivningar {w} · program {r} · appanrop {c} |  |

## cardwhat

Shown from the code. (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |

## cardhome

Shown from the code. (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `cardhome.1_claim_in_the_last_answer` | 1 statement in the last answer has no check behind it. | 1 uttalande i det senaste svaret saknar kontroll. |  |
| `cardhome.1_risky_step_today` | 1 risky step today. | 1 riskabelt steg i dag. |  |
| `cardhome.a_closed_session` | a closed session | en stängd session |  |
| `cardhome.about_cost_estimate` | about {cost} (estimate) | ungefär {cost} (uppskattning) |  |
| `cardhome.about_how_much_time_the_cockpit` | About how much time vaken saved you in the last 7 days, and how many risky steps it stopped. The minutes are an estimate. | Ungefär hur mycket tid vaken sparade åt dig de senaste 7 dagarna, och hur många riskabla steg den stoppade. Minuterna är en uppskattning. |  |
| `cardhome.and_n_more` | And {n} more. | Och {n} till. |  |
| `cardhome.ask_claude_to_run_it_and` | Ask Claude to run the tests or the build and show the result. /vaken-ship proof shows what ran. | Be Claude köra testerna eller bygget och visa resultatet. /vaken-ship proof visar vad som kördes. |  |
| `cardhome.asked_what` | Asked: {what} | Fick i uppdrag: {what} |  |
| `cardhome.asks_you_a_question` | asks you a question | ställer en fråga till dig |  |
| `cardhome.cost_cost` | Cost: {cost} | Kostnad: {cost} |  |
| `cardhome.d_no_progress_for_n_min` | {d}, no progress for {n} min | {d}, inga framsteg på {n} min |  |
| `cardhome.done` | done | klar |  |
| `cardhome.failed_or_stopped` | failed or stopped | misslyckades eller stoppades |  |
| `cardhome.files_changed_in_this_session_300_or` | Files changed in this session: 300 or more. | Ändrade filer i den här sessionen: 300 eller fler. |  |
| `cardhome.files_changed_in_this_session_n` | Files changed in this session: {n}. | Ändrade filer i den här sessionen: {n}. |  |
| `cardhome.finished_its_turn_waits_for_you` | finished, waits for you | är klar med svaret, väntar på dig |  |
| `cardhome.how_strict_each_guard_rule_is` | How strict each safety rule is. Warn tells you and Claude. Stop stops the step until you say yes. Off does nothing. | Hur strikt varje säkerhetsregel är. Varna talar om det för dig och Claude. Stoppa stoppar steget tills du säger ja. Av gör ingenting. |  |
| `cardhome.idle` | Idle | Inaktiv |  |
| `cardhome.if_paid_per_use` | if paid per use (your plan may differ) | om du betalar per användning (din plan kan skilja sig) |  |
| `cardhome.model_unknown` | model unknown | modell okänd |  |
| `cardhome.n_claims_in_the_last_answer` | {n} statements in the last answer have no check behind them. | {n} uttalanden i det senaste svaret saknar kontroll. |  |
| `cardhome.n_in_other_sessions` | {n} in other sessions | {n} i andra sessioner |  |
| `cardhome.n_risky_steps_today` | {n} risky steps today. | {n} riskabla steg i dag. |  |
| `cardhome.no_end_seen` | no end seen | inget slut sett |  |
| `cardhome.no_end_seen_the_cockpit_saw` | no end seen: vaken saw it start but not stop | inget slut sett: vaken såg den starta men inte sluta |  |
| `cardhome.no_helper_agent_ran_in_this` | No agent ran in this session yet. | Ingen agent har körts i den här sessionen än. |  |
| `cardhome.no_helper_agents_seen_yet_in` | No agents seen yet in the last 24 hours. | Inga agenter sedda de senaste 24 timmarna. |  |
| `cardhome.no_progress_for_n_min` | no progress for {n} min | inga framsteg på {n} min |  |
| `cardhome.none_here` | None here | Inga här |  |
| `cardhome.none_running` | none running | inga körs |  |
| `cardhome.none_seen` | none seen | inga sedda |  |
| `cardhome.not_known_yet` | not known yet | inte känd än |  |
| `cardhome.not_yet_it_still_runs` | not yet, it still runs | inte än, den körs fortfarande |  |
| `cardhome.nothing_risky_happened_today` | Nothing risky happened today. | Inget riskabelt hände i dag. |  |
| `cardhome.nothing_yet_the_checks_that_ran` | Nothing yet. Checks that ran and this session's goal show up here. | Inget än. Kontroller som körts och sessionens mål visas här. |  |
| `cardhome.ok_needed` | OK needed | OK behövs |  |
| `cardhome.probably_done` | probably done | troligen klar |  |
| `cardhome.probably_done_no_end_seen_in` | probably done: no end seen in 45 minutes | troligen klar: inget slut sett på 45 minuter |  |
| `cardhome.processor` | Processor | Processor |  |
| `cardhome.question` | Question | Fråga |  |
| `cardhome.read_age_ago` | read {age} ago | läst för {age} sedan |  |
| `cardhome.result_result` | Result: {result} | Resultat: {result} |  |
| `cardhome.running_for_d_so_far` | running for {d} so far | har kört i {d} hittills |  |
| `cardhome.show_all` | Show all | Visa alla |  |
| `cardhome.show_the_helper_agents_that_run` | Show the agents that run, with model and time. | Visa agenterna som körs, med modell och tid. |  |
| `cardhome.started_by_from_as_type_on` | Started by: {from}, as {type} on {model} | Startad av: {from}, som {type} på {model} |  |
| `cardhome.started_d_ago` | started {d} ago | startade för {d} sedan |  |
| `cardhome.the_cost_is_what_claude_code` | The cost is what Claude Code reports for this session. | Kostnaden är det Claude Code rapporterar för den här sessionen. |  |
| `cardhome.the_cost_is_what_claude_code_2` | The cost is what Claude Code reports for this session, at list price. A plan does not charge it this way. | Kostnaden är det Claude Code rapporterar för den här sessionen, till listpris. En plan debiteras inte så. |  |
| `cardhome.the_goal_claude_works_toward_taken` | The goal Claude works toward, taken from the key words of your first message. Vaken warns when edits wander away from it. | Målet Claude arbetar mot, taget från nyckelorden i ditt första meddelande. Vaken varnar när ändringar glider bort från det. |  |
| `cardhome.the_laptop_gauge_is_off_so` | Computer load is off, so vaken cannot see memory or the processor. | Datorbelastning är av, så vaken kan inte se minnet eller processorn. |  |
| `cardhome.the_laptop_gauge_reads_every_3` | Computer load is read every 3 minutes. Nothing is read yet. | Datorbelastningen läses var tredje minut. Inget är läst än. |  |
| `cardhome.the_last_event_was_age_ago` | The last event was {age} ago | Senaste händelsen var för {age} sedan |  |
| `cardhome.this_session_has_not_reported_yet` | Nothing to show yet. This appears after the first answer. | Inget att visa än. Det visas efter det första svaret. |  |
| `cardhome.time_time` | Time: {time} | Tid: {time} |  |
| `cardhome.took_d` | took {d} | tog {d} |  |
| `cardhome.turns_that_changed_files_and_that` | Answers that changed files and that you have not looked at yet. Your next message counts as your look. | Rundor som ändrade filer och som du inte har tittat på än. Ditt nästa meddelande räknas som att du har tittat. |  |
| `cardhome.type_the_new_name_first` | Type the new name first. | Skriv det nya namnet först. |  |
| `cardhome.under_1_min` | under 1 min | under 1 min |  |
| `cardhome.waits_to_run_tool_may_need` | waits to run {tool}, may need OK | väntar på att köra {tool}, kan behöva OK |  |

## cardback

Shown from the code. (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `cardback.back_after_t` | Back after {t}. | Tillbaka efter {t}. |  |
| `cardback.branch_branch` | Branch {branch}. | Gren {branch}. |  |
| `cardback.clears_the_open_ends_from_this` | Clears the open ends from this card, from the line above the chat box and in every session. The work itself is not touched. | Tar bort de öppna trådarna från det här kortet, från raden ovanför chattrutan och i alla sessioner. Själva arbetet rörs inte. |  |
| `cardback.n_more_projects_had_something_open` | {n} more projects had something open. The card lists the first few. | {n} projekt till hade något öppet. Kortet listar de första. |  |
| `cardback.press_got_it_when_you_have` | Press Got it when you have seen them. Nothing is sent and nothing changes in the project. | Tryck på Uppfattat när du har sett dem. Inget skickas och inget ändras i projektet. |  |
| `cardback.press_got_it_when_you_have_2` | Press Got it when you have seen them. | Tryck på Uppfattat när du har sett dem. |  |
| `cardback.project_had_this_open_when_you` | {project} had this open when you last stopped there: {words}. Seen from the notes vaken keeps at the end of each session. | {project} hade detta öppet när du senast slutade där: {words}. Sett i de anteckningar vaken sparar i slutet av varje session. |  |
| `cardback.the_goal_of_this_session_and` | The goal of this session and how long ago it last did something. The goal is the key words of your first message or the sentence you set with /vaken-tasks goal. | Målet för den här sessionen och hur länge sedan den senast gjorde något. Målet är nyckelorden i ditt första meddelande eller meningen du satte med /vaken-tasks goal. |  |
| `cardback.they_come_back_tomorrow_morning` | They come back tomorrow morning only if something is still open. | De kommer tillbaka i morgon bitti bara om något fortfarande är öppet. |  |
| `cardback.what_happened_while_away_mode_ran` | What happened while away mode ran: which sessions finished or needed you, what vaken stopped and what waits for you. | Vad som hände medan frånvaroläget var på: vilka sessioner som blev klara eller behövde dig, vad vaken stoppade och vad som väntar på dig. |  |
| `cardback.where_you_left_off_and_what` | Where you left off and what waits: the goal and the break since the last real event in this session, what was left open yesterday in each project (a failed check, a stopped step, tasks not done), and the digest of the last time you were away. It only shows what vaken already keeps. | Var du slutade och vad som väntar: målet och pausen sedan den senaste riktiga händelsen i den här sessionen, vad som lämnades öppet i går i varje projekt (en misslyckad kontroll, ett stoppat steg, uppgifter som inte är klara) och sammanfattningen från senaste gången du var borta. Den visar bara det vaken redan sparar. |  |

## cardcompact

Shown from the code. (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `cardcompact.1_background_command` | 1 background command | 1 bakgrundskommando |  |
| `cardcompact.1_helper_agent` | 1 agent | 1 agent |  |
| `cardcompact.a_check_failed_or_did_not` | a check failed or did not run after the last edit | en kontroll misslyckades eller kördes inte efter den senaste ändringen |  |
| `cardcompact.a_of_b` | {a} of {b} | {a} av {b} |  |
| `cardcompact.a_quiet_moment_is_better_than` | A quiet moment is better than mid-task. | En lugn stund är bättre än mitt i en uppgift. |  |
| `cardcompact.a_step_waits_for_your_yes` | a step waits for your yes | ett steg väntar på ditt ja |  |
| `cardcompact.a_tokens_b_of_the_window` | {a} tokens, {b}% of the window (needs {c}%) | {a} tokens, {b} % av fönstret (behöver {c} %) |  |
| `cardcompact.after_about_n_more_turn` | after about {n} more answer | efter ungefär {n} svar till |  |
| `cardcompact.after_about_n_more_turns` | after about {n} more answers | efter ungefär {n} svar till |  |
| `cardcompact.anyway` | Compact anyway | Komprimera ändå |  |
| `cardcompact.ask_title` | Not a good moment to compact: | Inte ett bra tillfälle att komprimera: |  |
| `cardcompact.at_once` | at once | direkt |  |
| `cardcompact.biggest_list` | Biggest: {list} | Störst: {list} |  |
| `cardcompact.checks_passed_after_the_last_edit` | checks passed after the last edit | kontrollerna gick igenom efter den senaste ändringen |  |
| `cardcompact.claude_did_not_end_with_a` | Claude did not end with a question | Claude avslutade inte med en fråga |  |
| `cardcompact.claude_re_reads_n_tokens_every` | Claude re-reads {n} tokens every answer. A summary cuts that to about {a}. | Claude läser om {n} tokens varje svar. En sammanfattning sänker det till ungefär {a}. |  |
| `cardcompact.claude_re_reads_n_tokens_every_usually` | Claude re-reads {n} tokens every answer. A summary usually cuts that to about {a}. | Claude läser om {n} tokens varje svar. En sammanfattning sänker det vanligtvis till ungefär {a}. |  |
| `cardcompact.claude_re_reads_the_whole_chat` | Claude re-reads the whole session every answer. | Claude läser om hela sessionen varje svar. |  |
| `cardcompact.claude_shortens_the_chat_by_itself` | Claude compacts the session by itself now. Compact now. | Claude komprimerar sessionen själv nu. Komprimera nu. |  |
| `cardcompact.claude_shortens_the_chat_by_itself_2` | Claude compacts the session by itself soon. Compact now. | Claude komprimerar sessionen själv snart. Komprimera nu. |  |
| `cardcompact.claude_shortens_the_chat_by_itself_3` | Claude compacts the session by itself soon. | Claude komprimerar sessionen själv snart. |  |
| `cardcompact.estimate_paysthe_cache_has_lapsed` | Estimate: {pays}The cache has lapsed, so compacting writes a short summary instead of {size}. | Uppskattning: {pays}Cachen har blivit kall, så att komprimera skriver en kort sammanfattning i stället för {size}. |  |
| `cardcompact.estimate_paysthe_cache_is_warm_so` | Estimate: {pays}The cache is warm, so compacting reads {size} cheaply. | Uppskattning: {pays}Cachen är varm, så att komprimera läser {size} billigt. |  |
| `cardcompact.estimate_shortening_now_reads_size` | Estimate: compacting now reads {size} cheaply. Waiting means rewriting all of it at full price when you return. | Uppskattning: att komprimera nu läser {size} billigt. Att vänta betyder att allt skrivs om till fullt pris när du kommer tillbaka. |  |
| `cardcompact.estimate_the_cache_has_lapsed_so` | Estimate: the cache has lapsed, so compacting makes every answer after the next one lighter. | Uppskattning: cachen har blivit kall, så att komprimera gör varje svar efter nästa lättare. |  |
| `cardcompact.estimate_the_cache_is_warm_so` | Estimate: the cache is warm, so compacting reads the whole window cheaply. | Uppskattning: cachen är varm, så att komprimera läser hela fönstret billigt. |  |
| `cardcompact.files_changed_and_no_check_ran` | files changed and no check ran | filer ändrade och ingen kontroll kördes |  |
| `cardcompact.gone_cold_wait_for_the_next` | gone cold: wait for the next break | kall: vänta till nästa paus |  |
| `cardcompact.it_keeps_your_goal_the_files` | It keeps your goal, the files changed and the next steps. | Den behåller ditt mål, de ändrade filerna och nästa steg. |  |
| `cardcompact.m_left` | {m} left | {m} kvar |  |
| `cardcompact.n_background_commands` | {n} background commands | {n} bakgrundskommandon |  |
| `cardcompact.n_helper_agents` | {n} agents | {n} agenter |  |
| `cardcompact.no_automatic_shortening_in_the` | No automatic compaction in the last 30 minutes | Ingen automatisk komprimering de senaste 30 minuterna |  |
| `cardcompact.no_helper_agent_no_background` | no agent, no background command | ingen agent, inget bakgrundskommando |  |
| `cardcompact.no_work_is_open` | No work is open | Inget arbete är öppet |  |
| `cardcompact.not_answering` | Claude is still answering | Claude svarar fortfarande |  |
| `cardcompact.not_autogap` | Compacted by vaken {n} min ago | Komprimerades av vaken för {n} min sedan |  |
| `cardcompact.not_cache` | The cache is not warm | Cachen är inte varm |  |
| `cardcompact.not_context` | The session fills less than {pct}% of its window | Sessionen fyller mindre än {pct} % av sitt fönster |  |
| `cardcompact.not_guard` | A risky step was stopped and waits for your yes | Ett riskabelt steg stoppades och väntar på ditt ja |  |
| `cardcompact.not_helpers` | An agent or a background command is still running | En agent eller ett bakgrundskommando körs fortfarande |  |
| `cardcompact.not_known` | not known | okänt |  |
| `cardcompact.not_question` | Claude's last answer asks you something | Claudes senaste svar frågar dig något |  |
| `cardcompact.not_quiet` | Not idle for 2 minutes yet | Inte stilla i 2 minuter än |  |
| `cardcompact.not_recent` | Compacted {n} min ago | Komprimerades för {n} min sedan |  |
| `cardcompact.not_score` | The moment scores {n} of {of} | Tillfället får {n} av {of} |  |
| `cardcompact.not_shortened_in_the_last_10` | Not compacted in the last 10 minutes | Inte komprimerad de senaste 10 minuterna |  |
| `cardcompact.not_small` | The session is still small | Sessionen är fortfarande liten |  |
| `cardcompact.not_waits` | A question or a permission waits for you | En fråga eller en tillåtelse väntar på dig |  |
| `cardcompact.not_work` | The work is still open: a check failed or did not run after the last edit | Arbetet är fortfarande öppet: en kontroll misslyckades eller kördes inte efter den senaste ändringen |  |
| `cardcompact.nothing_still_runs` | Nothing still runs | Inget körs fortfarande |  |
| `cardcompact.pays_back_when` | pays back {when}. | betalar sig {when}. |  |
| `cardcompact.quiet_for_2_minutes` | Idle for 2 minutes | Inaktiv i 2 minuter |  |
| `cardcompact.shorten_it_at_the_next_quiet` | Compact it at the next quiet moment. | Komprimera den vid nästa lugna stund. |  |
| `cardcompact.shortens_at_n` | Compacts at {n}% | Komprimeras vid {n} % |  |
| `cardcompact.shortens_by_itself_now` | Compacts by itself now | Komprimeras av sig själv nu |  |
| `cardcompact.shortens_by_itself_soon_at_n` | Compacts by itself soon, at {n}% | Komprimeras av sig själv snart, vid {n} % |  |
| `cardcompact.size_not_known` | size not known | storleken är okänd |  |
| `cardcompact.task_list_a_of_b_done` | task list {a} of {b} done | uppgiftslistan {a} av {b} klar |  |
| `cardcompact.the_cache_is_still_warm` | The cache is still warm | Cachen är fortfarande varm |  |
| `cardcompact.the_cache_runs_out_in_about` | The cache runs out in about {m} min. Then re-reading {n} tokens costs full price. | Cachen tar slut om ungefär {m} min. Sedan kostar det fullt pris att läsa om {n} tokens. |  |
| `cardcompact.the_chat_fills_n_of_its` | The session fills {n}% of its window | Sessionen fyller {n} % av sitt fönster |  |
| `cardcompact.the_chat_is_big_enough` | The session is big enough | Sessionen är tillräckligt stor |  |
| `cardcompact.the_guard_holds_nothing` | No risky step was stopped | Inget riskabelt steg har stoppats |  |
| `cardcompact.the_last_answer_asks_you_something` | the last answer asks you something | det senaste svaret frågar dig något |  |
| `cardcompact.the_last_one_m_ago` | the last one {m} ago | den senaste var för {m} sedan |  |
| `cardcompact.the_moment_scores_high_enough` | The moment scores high enough | Stunden får tillräckligt hög poäng |  |
| `cardcompact.the_next_turn_re_reads_n` | The next answer re-reads {n} tokens at full price. A summary: about {a}. | Nästa svar läser om {n} tokens till fullt pris. En sammanfattning: ungefär {a}. |  |
| `cardcompact.the_next_turn_re_reads_n_usually` | The next answer re-reads {n} tokens at full price. A summary: usually about {a}. | Nästa svar läser om {n} tokens till fullt pris. En sammanfattning: vanligtvis ungefär {a}. |  |
| `cardcompact.the_turn_ended` | The answer ended | Rundan är slut |  |
| `cardcompact.this_chat_is_getting_long` | This session is getting long. Compacting it saves usage. | Den här sessionen börjar bli lång. Att komprimera den sparar användning. |  |
| `cardcompact.this_chat_is_long_shortening_it` | This session is long. Compacting it saves usage. | Den här sessionen är lång. Att komprimera den sparar användning. |  |
| `cardcompact.would_have_compacted_now` | Would have compacted now | Skulle ha komprimerat nu |  |
| `cardcompact.you_are_away_shorten_now_while` | You are away. Compact now, while it is cheap. | Du är borta. Komprimera nu, medan det är billigt. |  |

## cardcomputer

Shown from the code. (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `cardcomputer.1_helper_running` | 1 agent running | 1 agent körs |  |
| `cardcomputer.1_session_uses_gb` | 1 session uses {gb} | 1 session använder {gb} |  |
| `cardcomputer.agent_limit_auto_so_the_computer` | Agent cap: Auto, so the computer decides. | Agenttak: Auto, så datorn avgör. |  |
| `cardcomputer.agent_limit_off_so_it_does` | Agent cap: off, so it does not count. | Agenttak: av, så den räknas inte. |  |
| `cardcomputer.agent_limit_running_of_max_running` | Agent cap: {running} of {max} running: room for {n}. | Agenttak: {running} av {max} körs: plats för {n}. |  |
| `cardcomputer.another_session_runs_an_older` | Another session runs an older version of vaken, so some figures are not read. Restart it to read them all. | En annan session kör en äldre version av vaken, så en del siffror kan inte läsas. Starta om den för att läsa alla. |  |
| `cardcomputer.battery_n_not_plugged_in` | Battery {n}%, not plugged in | Batteri {n} %, inte inkopplat |  |
| `cardcomputer.battery_n_plugged_in` | Battery {n}%, plugged in | Batteri {n} %, inkopplat |  |
| `cardcomputer.claude_procs` | Claude: {procs} | Claude: {procs} |  |
| `cardcomputer.claude_procs_running` | Claude: {procs} · {running} | Claude: {procs} · {running} |  |
| `cardcomputer.heat_is_fine` | heat is fine | värmen är bra |  |
| `cardcomputer.load` | Load | Belastning |  |
| `cardcomputer.load_x_of_c` | load {x} of {c} | belastning {x} av {c} |  |
| `cardcomputer.load_x_of_c_cores` | Load {x} of {c} cores | Belastning {x} av {c} kärnor |  |
| `cardcomputer.macos_itself_reports_memory` | macOS itself reports memory pressure ({p}), even if the share used looks fine, so no new agent should start. | macOS själv rapporterar minnestryck ({p}), även om den använda andelen ser bra ut, så ingen ny agent bör starta. |  |
| `cardcomputer.memory` | Memory | Minne |  |
| `cardcomputer.memory_free_free_of_all_at` | Memory: {free} free of {all}. At about 1.5 GB per agent: room for {n}. | Minne: {free} ledigt av {all}. Med ungefär 1,5 GB per agent: plats för {n}. |  |
| `cardcomputer.memory_n` | Memory {n}% | Minne {n} % |  |
| `cardcomputer.memory_n_used` | Memory {n}% used | Minne {n} % använt |  |
| `cardcomputer.memory_not_read` | Memory not read | Minne inte avläst |  |
| `cardcomputer.memory_the_free_share_could_not` | Memory: the free share could not be read. | Minne: den lediga andelen kunde inte läsas. |  |
| `cardcomputer.memory_the_free_share_could_not_2` | Memory: the free share could not be read, so the room is counted from the rest and holds at 2 at most. | Minne: den lediga andelen kunde inte läsas, så platsen räknas från resten och blir högst 2. |  |
| `cardcomputer.n_free` | {n} free | {n} ledigt |  |
| `cardcomputer.n_helpers_running` | {n} agents running | {n} agenter körs |  |
| `cardcomputer.n_sessions_use_gb` | {n} sessions use {gb} | {n} sessioner använder {gb} |  |
| `cardcomputer.on_power_no_battery` | On power, no battery | På nätström, inget batteri |  |
| `cardcomputer.processor_idle_of_all_cores_idle` | Processor: {idle} of {all} cores idle. At about 2 per agent: room for {n}. | Processor: {idle} av {all} kärnor lediga. Med ungefär 2 per agent: plats för {n}. |  |
| `cardcomputer.processor_n` | processor {n}% | processor {n} % |  |
| `cardcomputer.processor_n_busy_c_cores` | Processor {n}% busy · {c} cores | Processor {n} % upptagen · {c} kärnor |  |
| `cardcomputer.processor_not_read` | processor not read | processor inte avläst |  |
| `cardcomputer.processor_not_read_2` | Processor not read | Processor inte avläst |  |
| `cardcomputer.processor_the_load_could_not_be` | Processor: the load could not be read. | Processor: belastningen kunde inte läsas. |  |
| `cardcomputer.room_for_about_1_more_helper` | Room for about 1 more agent | Plats för ungefär 1 agent till |  |
| `cardcomputer.room_for_about_1_more_helper_2` | Room for about 1 more agent, memory not read | Plats för ungefär 1 agent till, minnet är inte avläst |  |
| `cardcomputer.room_for_about_n_more_helpers` | Room for about {n} more agents | Plats för ungefär {n} agenter till |  |
| `cardcomputer.room_for_about_n_more_helpers_2` | Room for about {n} more agents, memory not read | Plats för ungefär {n} agenter till, minnet är inte avläst |  |
| `cardcomputer.sessions_not_counted` | sessions not counted | sessioner inte räknade |  |
| `cardcomputer.slowed_by_heat_to_n` | slowed by heat to {n}% | nedbromsad av värme till {n} % |  |
| `cardcomputer.the_battery_is_at_n_and` | The battery is at {n}% and not plugged in, so no new agent should start. | Batteriet är på {n} % och inte inkopplat, så ingen ny agent bör starta. |  |
| `cardcomputer.the_processor_is_slowed_to_n` | The processor is slowed to {n}% by heat, so no new agent should start. | Processorn är nedbromsad till {n} % av värme, så ingen ny agent bör starta. |  |
| `cardcomputer.the_smallest_of_these_counts_the` | The smallest of these counts. The sizes per agent are guesses. | Det minsta av dessa gäller. Storlekarna per agent är gissningar. |  |
| `cardcomputer.x_of_c_cores` | {x} of {c} cores | {x} av {c} kärnor |  |

## cardship

Shown from the code. (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `cardship.1_claim_in_the_last_answer` | 1 statement in the last answer has no check behind it. | 1 uttalande i det senaste svaret saknar kontroll. |  |
| `cardship.1_file_changed` | 1 file changed | 1 fil ändrad |  |
| `cardship.1_finished_turn_changed_files_and` | 1 finished answer changed files and waits for your look. Your next message, or /vaken-ship reviewed, clears it. | 1 avslutat svar ändrade filer och väntar på att du tittar. Ditt nästa meddelande, eller /vaken-ship reviewed, rensar det. |  |
| `cardship.1_finished_turn_changed_files_and_2` | 1 finished answer changed files and waits for your look: /vaken-ship review-story, /vaken-ship heat. | 1 avslutat svar ändrade filer och väntar på att du tittar: /vaken-ship review-story, /vaken-ship heat. |  |
| `cardship.a_failed_step_and_a_step` | A failed step and a step the safety check stopped are added when there is one. | Ett misslyckat steg och ett steg som säkerhetskontrollen stoppade läggs till när det finns ett. |  |
| `cardship.a_of_b_checks_passed` | {a} of {b} checks passed | {a} av {b} kontroller gick igenom |  |
| `cardship.a_picture_of_where_width_points` | A picture of {where} {width} points wide, {taken} | En bild av {where}, {width} punkter bred, {taken} |  |
| `cardship.a_pull_request_the_cockpit_knows` | A pull request (PR) vaken knows of: its checks, and whether GitHub can merge it. The PR check asks GitHub after a push and while checks run. | En pull request (PR) som vaken känner till: dess kontroller och om GitHub kan slå ihop den. PR-kontrollen frågar GitHub efter en push och medan kontroller körs. |  |
| `cardship.a_screen_file_was_edited_since` | A screen file was edited since you last looked, and the dev server answers. Press to take the pictures at all three sizes. | En skärmfil har ändrats sedan du senast tittade, och utvecklingsservern svarar. Tryck för att ta bilderna i alla tre storlekarna. |  |
| `cardship.a_write_saves_a_copy_first` | A write saves a copy first and asks twice. | Att skriva sparar först en kopia och frågar två gånger. |  |
| `cardship.about_n_min` | about {n} min | ungefär {n} min |  |
| `cardship.about_the_runs_started_from_this` | {about} The runs started from this session use this model. No file is written. | {about} Körningarna som startas från den här sessionen använder den här modellen. Ingen fil skrivs. |  |
| `cardship.all_n_checks_passed` | All {n} checks passed. | Alla {n} kontroller gick igenom. |  |
| `cardship.all_projects_this_project_or_this` | All projects, this project or this session. | Alla projekt, det här projektet eller den här sessionen. |  |
| `cardship.and_no_cockpit_block` |  and no vaken block |  och inget vaken-block |  |
| `cardship.as_number_n` | as number {n} | som nummer {n} |  |
| `cardship.asked_github_at_time` | Asked GitHub at {time}. | Frågade GitHub kl. {time}. |  |
| `cardship.before_a_step_changes_a_file` | Before a step changes a file, vaken keeps a copy. Undo puts back every file changed since your last message. | Innan ett steg ändrar en fil sparar vaken en kopia. Ångra lägger tillbaka varje fil som ändrats sedan ditt senaste meddelande. |  |
| `cardship.branch_branch` | Branch: {branch} | Gren: {branch} |  |
| `cardship.builder` | builder | byggare |  |
| `cardship.change_something_then_the_card` | Change something, then the card says if it is ready. | Ändra något, så säger kortet om det är klart. |  |
| `cardship.check_state_run_it_again_after` | {check} {state}. Run it again after the last edit. | {check}: {state}. Kör om efter den senaste ändringen. |  |
| `cardship.check_that_nothing_was_left_undone` | Check that nothing was left undone. | Kontrollera att inget lämnats ogjort. |  |
| `cardship.check_the_pull_request_and_its` | Check the pull request and its checks: /vaken-ship pr. | Kontrollera pull requesten och dess kontroller: /vaken-ship pr. |  |
| `cardship.claude_md` | CLAUDE.md | CLAUDE.md |  |
| `cardship.claude_reads_these_files_at_the` | Claude reads these files at the start of every session and keeps them in mind on every answer, so a big one costs usage all day. The size counts the instruction files of the session folder, its parents and your home folder, as characters divided by 4; rules files and files they pull in are not counted. | Claude läser de här filerna i början av varje session och har dem i åtanke varje svar, så en stor fil kostar användning hela dagen. Storleken räknar instruktionsfilerna i sessionens mapp, dess överordnade mappar och din hemmapp, som tecken delat med 4; regelfiler och filer de hämtar in räknas inte. |  |
| `cardship.claude_said_done_without_proof` | Claude said done without proof | Claude sa klart utan bevis |  |
| `cardship.confidence_n_of_100_made_only` | Confidence {n} of 100 (made only of evidence) | Säkerhet {n} av 100 (bygger bara på belägg) |  |
| `cardship.confidence_not_enough_evidence_yet` | Confidence: not enough evidence yet | Säkerhet: inte nog belägg än |  |
| `cardship.could_not_be_read_so_nothing` | could not be read, so nothing is written over it. | kunde inte läsas, så inget skrivs över den. |  |
| `cardship.decisions_made_and_why` | Decisions made and why | Beslut som fattats och varför |  |
| `cardship.done_counts_only_when_your_chosen` | Done counts only when your chosen checks passed. | Klart räknas bara när dina valda kontroller gick igenom. |  |
| `cardship.failed_names` | Failed: {names} | Misslyckades: {names} |  |
| `cardship.first` | first | först |  |
| `cardship.first_line` | First: "{line}" | Först: "{line}" |  |
| `cardship.fix_it_in_that_sessionwho` | Fix it in that session{who}. | Laga det i den sessionen{who}. |  |
| `cardship.fixer` | fixer | fixare |  |
| `cardship.flags_tests_pass_or_done_when` | Flags "tests pass" or "done" when no check backs it. | Flaggar "testerna går igenom" eller "klart" när ingen kontroll styrker det. |  |
| `cardship.from_a_session_that_is_not` | From a session that is not open now. | Från en session som inte är öppen nu. |  |
| `cardship.from_the_session_name` | From the session {name}. | Från sessionen {name}. |  |
| `cardship.from_this_session` | From this session. | Från den här sessionen. |  |
| `cardship.global_claude_md` | global CLAUDE.md | global CLAUDE.md |  |
| `cardship.halt_all_refuses_every_step_that` | Pause all stops shell commands, file edits, tools from other apps, agents, web fetches and skills in this session. Reading still works. A step that is already running keeps running. | Pausa allt stoppar skalkommandon, filändringar, verktyg från andra appar, agenter, webbhämtningar och färdigheter i den här sessionen. Att läsa fungerar fortfarande. Ett steg som redan körs fortsätter. |  |
| `cardship.hints_to_lower_or_raise_a` | Hints to lower or raise a session’s model or effort. | Tips om att sänka eller höja en sessions modell eller ansträngning. |  |
| `cardship.is_as_your_choices_say` | is as your choices say. | är som dina val säger. |  |
| `cardship.is_not_there_yet` | is not there yet. | finns inte än. |  |
| `cardship.it_has_a_conflict_with_the` | It has a conflict with the base branch: it needs a rebase. | Den har en konflikt med basgrenen: den behöver en rebase. |  |
| `cardship.it_is_behind_its_base_branch` | It is behind its base branch: it needs an update first. | Den ligger efter sin basgren: den behöver uppdateras först. |  |
| `cardship.it_still_needs_a_review` | It still needs a review. | Den behöver fortfarande en granskning. |  |
| `cardship.keep_each_rule_in_one_place` | Keep each rule in one place. /vaken-help run diet has the details. | Ha varje regel på ett ställe. /vaken-help run diet har detaljerna. |  |
| `cardship.keep_the_mac_awake_for_a` | Keep the Mac awake for a phone or a waiting question. | Håll Macen vaken för en telefon eller en väntande fråga. |  |
| `cardship.keep_the_mac_awake_while_agents` | Keep the Mac awake while agents work. | Håll Macen vaken medan agenter arbetar. |  |
| `cardship.keeps_the_cockpit_limit_and_stops` | Keeps the vaken limit and stops asking about this number. | Behåller vakens gräns och slutar fråga om det här talet. |  |
| `cardship.kept_limit` | Files kept | Filer kvar |  |
| `cardship.lets_the_cockpit_write_the` | Lets vaken write the paragraph on what cost most. | Låter vaken skriva stycket om vad som kostade mest. |  |
| `cardship.look_at_yourself` | Look at yourself: | Titta själv: |  |
| `cardship.merge_it_where_of_of_by` | Merge it {where} of {of}, by what GitHub says can merge. /vaken-ship merge-order also weighs the files. | Slå ihop den {where} av {of}, efter vad GitHub säger kan slås ihop. /vaken-ship merge-order väger också in filerna. |  |
| `cardship.mergeable` | Mergeable. | Kan slås ihop. |  |
| `cardship.n_claims_in_the_last_answer` | {n} statements in the last answer have no check behind them. | {n} uttalanden i det senaste svaret saknar kontroll. |  |
| `cardship.n_finished_turns_changed_files_and` | {n} finished answers changed files and wait for your look. Your next message, or /vaken-ship reviewed, clears it. | {n} avslutade svar ändrade filer och väntar på att du tittar. Ditt nästa meddelande, eller /vaken-ship reviewed, rensar det. |  |
| `cardship.n_finished_turns_changed_files_and_2` | {n} finished answers changed files and wait for your look: /vaken-ship review-story, /vaken-ship heat. | {n} avslutade svar ändrade filer och väntar på att du tittar: /vaken-ship review-story, /vaken-ship heat. |  |
| `cardship.n_is_not_one_of_the` | {n} is not one of the choices; the nearest below it is {use}. | {n} finns inte bland valen; närmast under är {use}. |  |
| `cardship.no_file_has_changed_in_this` | No file has changed in this session, so there is nothing to ship. | Ingen fil har ändrats i den här sessionen, så det finns inget att leverera. |  |
| `cardship.notes_when_tests_build_and_lint` | Notes when tests, build and lint ran and passed. | Noterar när tester, bygge och lint kördes och gick igenom. |  |
| `cardship.nothing_has_changed_or_been` | Nothing has changed or been checked in this session yet. | Inget har ändrats eller kontrollerats i den här sessionen än. |  |
| `cardship.nothing_is_known_yet_about_a` | No pull request (PR) found for this branch yet. Vaken asks GitHub after a push and while checks run. | Ingen pull request (PR) hittad för den här grenen än. Vaken frågar GitHub efter en push och medan kontroller körs. |  |
| `cardship.nothing_is_written` | Nothing is written. | Inget skrivs. |  |
| `cardship.nothing_is_written_while_set_up` | Nothing is written while Set up agents for me is off. | Inget skrivs medan Sätt upp agenter åt mig är av. |  |
| `cardship.now_state` | Now: {state}. | Nu: {state}. |  |
| `cardship.one_number_from_evidence_only_with` | One number from evidence only, with the list behind it. | Ett tal bara från belägg, med listan bakom. |  |
| `cardship.open_a_pull_request_then_push` | Open a pull request, then push: the card shows it. | Öppna en pull request och pusha sedan: kortet visar den. |  |
| `cardship.path_is_your_own_file_it` | {path} is your own file: it has no "{mark}" line{block}. {write} | {path} är din egen fil: den har ingen "{mark}"-rad{block}. {write} |  |
| `cardship.path_names_the_model_file_the` | {path} names the model {file}; the model map says {map} for the {role}. Vaken never changes your file. Use sets the map to {file}. | {path} anger modellen {file}; modellkartan säger {map} för {role}. Vaken ändrar aldrig din fil. Använd sätter kartan till {file}. |  |
| `cardship.path_state` | {path} {state} | {path} {state} |  |
| `cardship.pr_n_is_closed` | PR {n} is closed. | PR {n} är stängd. |  |
| `cardship.pr_n_is_merged` | PR {n} is merged. | PR {n} är ihopslagen. |  |
| `cardship.pr_n_is_open` | PR {n} is open. | PR {n} är öppen. |  |
| `cardship.pr_n_is_open_a_draft` | PR {n} is open (a draft). | PR {n} är öppen (ett utkast). |  |
| `cardship.press_resume_to_lift_it` | Press Resume to continue. | Tryck på Återuppta för att fortsätta. |  |
| `cardship.press_to_ask_claude_to_run_2` | Press to ask Claude to run the checks that prove them, and show the results. | Tryck för att be Claude köra kontrollerna som styrker dem, och visa resultaten. |  |
| `cardship.press_to_ask_github_once_now` | Press to ask GitHub once now. | Tryck för att fråga GitHub en gång nu. |  |
| `cardship.press_to_halt_press_resume_to` | Press to pause. Press Resume to continue. /vaken-pause does the same in the session. | Tryck för att pausa. Tryck på Återuppta för att fortsätta. /vaken-pause gör detsamma i sessionen. |  |
| `cardship.press_to_put_a_fix_request` | Press to put a fix request in the prompt box, then press Enter to send it. /vaken-ship proof shows what ran. | Tryck för att lägga en begäran om att laga i promptrutan, och tryck sedan på Enter för att skicka den. /vaken-ship proof visar vad som kördes. |  |
| `cardship.press_to_see_if_the_work` | Press to see if the work looks ready, as /vaken-ship says. Merging stays your press. | Tryck för att se om arbetet ser klart ut, som /vaken-ship säger. Du trycker själv för att slå ihop. |  |
| `cardship.press_to_see_the_full_verdict` | Press to see the full verdict of /vaken-ship under the row. Merging and pushing stay your press. | Tryck för att se hela bedömningen från /vaken-ship under raden. Du trycker själv för att slå ihop och pusha. |  |
| `cardship.press_to_take_it_the_picture` | Press to take it. The picture is kept in the project folder and the toast names it; nothing is sent to Claude. Ask Claude to look at the file if you want it to see it. | Tryck för att ta den. Bilden sparas i projektmappen och notisen nämner den; inget skickas till Claude. Be Claude titta på filen om du vill att den ska se den. |  |
| `cardship.reads_memory_and_battery_it_runs` | Reads memory and battery. It runs short programs. | Läser minne och batteri. Den kör korta program. |  |
| `cardship.researcher` | researcher | utforskare |  |
| `cardship.reviewer` | reviewer | granskare |  |
| `cardship.saves_a_copy_of_path_then` | Saves a copy of {path}, then writes it as shown above. | Sparar en kopia av {path} och skriver den sedan som visas ovan. |  |
| `cardship.say_when_worktrees_are_safe_to` | Say when worktrees are safe to remove. | Säg till när worktrees är säkra att ta bort. |  |
| `cardship.session_briefs_are_off_turn_them` | Handoff notes are off. Turn them on: Settings &gt; Prompts and memory. | Överlämningar är av. Slå på dem: Inställningar &gt; Prompter och minne. |  |
| `cardship.set_up_agents` | Set up agents | Sätt upp agenter |  |
| `cardship.setup_place` | Setup place | Uppsättningsplats |  |
| `cardship.ship_it_not_yet` | Ship it: not yet. | Leverera: inte än. |  |
| `cardship.ship_it_the_evidence_looks_good` | Ship it: the evidence looks good. | Leverera: beläggen ser bra ut. |  |
| `cardship.short_notes_claude_keeps_about_you` | Short notes Claude keeps about you and this project in files, so it remembers between sessions. Vaken only reads them. | Korta anteckningar Claude sparar om dig och projektet i filer, så den kommer ihåg mellan sessioner. Vaken läser dem bara. |  |
| `cardship.show_your_pull_request_and_its` | Show your pull request and its checks in plain words. | Visa din pull request och dess kontroller med enkla ord. |  |
| `cardship.start_your_dev_server_the_card` | Start your dev server. The card looks at the usual ports again within a minute. | Starta din utvecklingsserver. Kortet tittar på de vanliga portarna igen inom en minut. |  |
| `cardship.taken_by_chrome_or_edge_on` | taken by Chrome (or Edge) on this PC in the background. | tagen av Chrome (eller Edge) på den här datorn i bakgrunden. |  |
| `cardship.taken_by_the_chrome_on_this` | taken by the Chrome on this Mac in the background. | tagen av Chrome på den här Macen i bakgrunden. |  |
| `cardship.the_checkpoint_name_you_named_a` | The checkpoint "{name}" you named: a copy of one file as it was then. | Kontrollpunkten "{name}" som du namngav: en kopia av en fil som den var då. |  |
| `cardship.the_checkpoint_name_you_named_a_2` | The checkpoint "{name}" you named: a copy of {n} files as they were then. | Kontrollpunkten "{name}" som du namngav: en kopia av {n} filer som de var då. |  |
| `cardship.the_cockpit_does_not_act_in` | Vaken does not act in another session. | Vaken agerar inte i en annan session. |  |
| `cardship.the_cockpit_does_not_merge_or` | Vaken does not merge or push. Shipping is your press. | Vaken slår inte ihop eller pushar. Du trycker själv för att leverera. |  |
| `cardship.the_cockpit_offers_no_limit_as` | Vaken offers no limit as low as {n}; the lowest is {use}. | Vaken erbjuder ingen gräns så låg som {n}; den lägsta är {use}. |  |
| `cardship.the_evidence` | The evidence: | Beläggen: |  |
| `cardship.the_files_changed` | The files changed | De ändrade filerna |  |
| `cardship.the_guard_held_or_refused_1` | The safety check stopped 1 step today. Check that nothing was left undone. | Säkerhetskontrollen stoppade 1 steg i dag. Kontrollera att inget lämnats ogjort. |  |
| `cardship.the_guard_held_or_refused_n` | The safety check stopped {n} steps today. Check that nothing was left undone. | Säkerhetskontrollen stoppade {n} steg i dag. Kontrollera att inget lämnats ogjort. |  |
| `cardship.the_helper_files_and_the_project` | The agent files and the project instructions that follow from your choices (the model map, the agent cap, compacting, plan first, routing), compared with what is on disk. Until you turn on Set up agents for me, it only shows what it would do. It never writes your global CLAUDE.md or settings, and it never deletes a file. | Agentfilerna och projektinstruktionerna som följer av dina val (modellkartan, agenttaket, komprimering, plan först, routning), jämförda med det som finns på disk. Tills du slår på Sätt upp agenter åt mig visar den bara vad den skulle göra. Den skriver aldrig din globala CLAUDE.md eller dina inställningar och raderar aldrig en fil. |  |
| `cardship.the_limit_in_your_files_you` | The limit in your files you left alone. | Gränsen i dina filer som du lät vara. |  |
| `cardship.the_next_steps` | The next steps | Nästa steg |  |
| `cardship.the_one_check_passed` | The one check passed. | Den enda kontrollen gick igenom. |  |
| `cardship.the_page` | the page | sidan |  |
| `cardship.the_pr_check_is_off_so` | The pull request (PR) check is off, so vaken does not ask GitHub about them. | Kontrollen av pull requests (PR) är av, så vaken frågar inte GitHub om dem. |  |
| `cardship.the_safety_controls_in_one_place` | The safety controls in one place: pause commands, edits, tools and agents, put back the edits since your last message, go back to a saved point you named, and which risky steps were stopped or warned about today. It only shows what vaken already keeps. | Säkerhetsreglagen på ett ställe: pausa kommandon, ändringar, verktyg och agenter, lägg tillbaka ändringarna sedan ditt senaste meddelande, gå tillbaka till en sparad punkt du namngav, och vilka riskabla steg som stoppades eller varnades för i dag. Den visar bara det vaken redan sparar. |  |
| `cardship.the_same_rule_written_in_more` | The same rule written in more than one file is read twice on every answer. | Samma regel skriven i mer än en fil läses två gånger varje svar. |  |
| `cardship.the_setting_is_settings_eyes` | The setting is Settings &gt; Agents &gt; Preview after edits. Nothing is sent to Claude. | Inställningen är Inställningar &gt; Agenter &gt; Förhandsvisning efter ändringar. Inget skickas till Claude. |  |
| `cardship.they_look_light_nothing_to_trim` | They look light. Nothing to trim. /vaken-help run diet has the details. | De ser lätta ut. Inget att trimma. /vaken-help run diet har detaljerna. |  |
| `cardship.to_change_one_tell_claude_forget` | To change one, tell Claude "forget the note about ..." or "change the note about ...". /vaken-memory lists them. | För att ändra en, säg till Claude "glöm anteckningen om ..." eller "ändra anteckningen om ...". /vaken-memory listar dem. |  |
| `cardship.to_go_back_to_it_type` | To go back to it, type /vaken-undo name {name} yes in the session. Nothing changes before that. | För att gå tillbaka till den, skriv /vaken-undo name {name} yes i sessionen. Inget ändras innan dess. |  |
| `cardship.to_put_them_back_type_cockpit` | To put them back, type /vaken-undo last yes in the session. Nothing changes before that. | För att lägga tillbaka dem, skriv /vaken-undo last yes i sessionen. Inget ändras innan dess. |  |
| `cardship.turn_on_pr_and_checks_in` | Turn on PR and checks in Settings. | Slå på PR och kontroller i Inställningar. |  |
| `cardship.type_cockpit_pr_for_the_checks` | Type /vaken-ship pr for the checks, or /vaken-ship merge-order for the order. | Skriv /vaken-ship pr för kontrollerna, eller /vaken-ship merge-order för ordningen. |  |
| `cardship.warn_at_80_or_also_stop` | Warn at 80%, or also stop costly calls at 100%. | Varna vid 80 %, eller stoppa också dyra anrop vid 100 %. |  |
| `cardship.warn_when_another_session_edits` | Warn when another session edits the same file. | Varna när en annan session ändrar samma fil. |  |
| `cardship.warn_when_another_session_holds_a` | Warn when another session holds a port. | Varna när en annan session håller en port. |  |
| `cardship.warns_on_repeated_edits_idle_calls` | Warns on repeated edits, idle calls or a failing step. | Varnar vid upprepade ändringar, tomma anrop eller ett misslyckat steg. |  |
| `cardship.warns_when_edits_wander_far_from` | Warns when edits wander far from the goal. | Varnar när ändringar glider långt från målet. |  |
| `cardship.was_made_by_the_cockpit_and` | was made by vaken and no longer follows your choices. | gjordes av vaken och följer inte längre dina val. |  |
| `cardship.what_blocks_it` | What blocks it: | Vad som hindrar: |  |
| `cardship.what_the_chat_starts_from_and` | What the session starts from and what would be carried on: the CLAUDE.md files Claude re-reads every answer, the notes it keeps about this project, the note for the next session and what a compaction keeps. A token is a small piece of text, about three quarters of a word. A token is a small piece of text, about three quarters of a word. It only shows what vaken already knows. | Vad sessionen utgår från och vad som skulle tas med: CLAUDE.md-filerna Claude läser om varje svar, anteckningarna den sparar om projektet, anteckningen till nästa session och vad en komprimering behåller. En token är en liten bit text, ungefär tre fjärdedels ord. En token är en liten bit text, ungefär tre fjärdedels ord. Den visar bara det vaken redan vet. |  |
| `cardship.what_the_next_session_needs_goal` | What the next session needs: goal, branch, changed files, checks and open questions. Each line says whether git or a check backs it (verified) or nothing does yet (unverified). | Vad nästa session behöver: mål, gren, ändrade filer, kontroller och öppna frågor. Varje rad säger om git eller en kontroll styrker den (verifierad) eller om inget gör det än (overifierad). |  |
| `cardship.what_the_summary_keeps_when_the` | What the summary keeps when the session is compacted, added to every compaction by vaken. | Vad sammanfattningen behåller när sessionen komprimeras, tillagt av vaken vid varje komprimering. |  |
| `cardship.whether_the_dev_server_of_your` | Whether the dev server of your front-end work is up and answers, and pictures of the page at phone, iPad and desktop size, taken by the Chrome on this Mac in the background. Vaken looks at the usual dev ports and never starts a server. | Om utvecklingsservern för ditt front-end-arbete är igång och svarar, och bilder av sidan i telefon-, iPad- och datorstorlek, tagna av Chrome på den här Macen i bakgrunden. Vaken tittar på de vanliga utvecklingsportarna och startar aldrig en server. |  |
| `cardship.whether_this_work_looks_ready_to` | Whether this work looks ready to ship, from the evidence vaken keeps: the checks that ran after the last change, the claims, the definition of done, which risky steps were stopped and your open pull request. Vaken never merges or pushes. | Om det här arbetet ser klart ut att levereras, utifrån de belägg vaken sparar: kontrollerna som kördes efter den senaste ändringen, påståendena, definitionen av klart, vilka riskabla steg som stoppades och din öppna pull request. Vaken slår aldrig ihop eller pushar. |  |
| `cardship.whether_what_ran_after_the_last` | Whether {what} ran after the last change, and passed. Passed means the command ended with no error. | Om {what} körts efter den senaste ändringen och gick igenom. Gick igenom betyder att kommandot slutade utan fel. |  |
| `cardship.write_helper_files_that_follow` | Write agent files that follow your choices. | Skriv agentfiler som följer dina val. |  |
| `cardship.your_definition_of_done_is_not` | Your definition of done is not met. | Din definition av klart är inte uppfylld. |  |
| `cardship.your_from_says_at_most_n` | Your {from} says at most {n} agents; your vaken limit is {now}. Use sets the limit (Settings &gt; Agents &gt; Most at once). | Din {from} säger högst {n} agenter; din vaken-gräns är {now}. Använd sätter gränsen (Inställningar &gt; Agenter &gt; Flest samtidigt). |  |
| `cardship.your_from_says_at_most_n_info` | Your {from} says at most {n} agents; vaken follows the computer. This is only for your information: nothing is changed. To set your own limit, use Settings &gt; Agents &gt; Most at once. | Din {from} säger högst {n} agenter; vaken följer datorn. Det är bara till information: inget ändras. För att sätta din egen gräns, använd Inställningar &gt; Agenter &gt; Flest samtidigt. |  |

## cardcontext

Shown from the code. (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `cardcontext.1_line_appear_in_more_than` | 1 line appears in more than one file. Keep each rule in one place. First: "{line}" | 1 rad finns i mer än en fil. Ha varje regel på ett ställe. Först: "{line}" |  |
| `cardcontext.1_very_long_line_short_lines` | 1 very long line. Short lines are easier to keep right. | 1 mycket lång rad. Korta rader är lättare att underhålla. |  |
| `cardcontext.big` | (big) | (stor) |  |
| `cardcontext.cockpit_brief_prints_it_for` | /vaken-help run brief prints it for pasting into a new session. /vaken-help run packet saves it as a file in the project. | /vaken-help run brief skriver ut den så att du kan klistra in den i en ny session. /vaken-help run packet sparar den som en fil i projektet. |  |
| `cardcontext.cockpit_compact_says_whether_now` | /vaken-compact says whether now is a good moment, and a line to paste after /compact. | /vaken-compact säger om det är en bra stund nu, och en rad att klistra in efter /compact. |  |
| `cardcontext.cockpit_devserver_says_the_same_in` | Vaken looks at the usual dev ports and never starts a server. A press takes a picture; nothing is sent to Claude. | Vaken tittar på de vanliga utvecklingsportarna och startar aldrig en server. Ett tryck tar en bild; inget skickas till Claude. |  |
| `cardcontext.cockpit_diet_cockpit_memory` | /vaken-help run diet, /vaken-memory, /vaken-help run brief and /vaken-compact say more in the session. The size of the session itself is on the This session card. | /vaken-help run diet, /vaken-memory, /vaken-help run brief och /vaken-compact säger mer i sessionen. Själva sessionens storlek finns på kortet Den här sessionen. |  |
| `cardcontext.cockpit_diet_has_the_details` | /vaken-help run diet has the details. | /vaken-help run diet har detaljerna. |  |
| `cardcontext.cockpit_digest_shows_it_in_the` | /vaken-away digest shows it in the session. | /vaken-away digest visar den i sessionen. |  |
| `cardcontext.cockpit_halt_cockpit_undo_cockpit` | /vaken-pause, /vaken-undo, /vaken-undo checkpoint &lt;name&gt; and /vaken-guard do the same in the session. Name the present state with /vaken-undo checkpoint &lt;name&gt;. | /vaken-pause, /vaken-undo, /vaken-undo checkpoint &lt;name&gt; och /vaken-guard gör samma sak i sessionen. Namnge nuläget med /vaken-undo checkpoint &lt;name&gt;. |  |
| `cardcontext.cockpit_recap_cockpit_today_and` | /vaken-today recap, /vaken-today and /vaken-today standup say more in the session. | /vaken-today recap, /vaken-today och /vaken-today standup säger mer i sessionen. |  |
| `cardcontext.cockpit_setup_says_the_same_in` | /vaken-help run setup says the same in the session, and /vaken-help run setup on, scope, make and replace do what the card does. | /vaken-help run setup säger samma sak i sessionen, och /vaken-help run setup on, scope, make och replace gör det kortet gör. |  |
| `cardcontext.days` | days | dagar |  |
| `cardcontext.n_lines_appear_in_more_than` | {n} lines appear in more than one file. Keep each rule in one place. First: "{line}" | {n} rader finns i mer än en fil. Ha varje regel på ett ställe. Först: "{line}" |  |
| `cardcontext.n_very_long_lines_short_lines` | {n} very long lines. Short lines are easier to keep right. | {n} mycket långa rader. Korta rader är lättare att underhålla. |  |
| `cardcontext.path_about_tokens_tokens_lines` | {path}: about {tokens} tokens, {lines} lines | {path}: ungefär {tokens} tokens, {lines} rader |  |
| `cardcontext.path_is_big_move_rarely_needed` | {path} is big. Move rarely needed parts into separate notes that Claude reads only when asked. | {path} är stor. Flytta delar som sällan behövs till separata anteckningar som Claude bara läser när du ber om det. |  |
| `cardcontext.together_they_are_heavy_claude_re` | Together they are heavy: Claude re-reads about {tokens} tokens on every answer. Trim what you do not need in most sessions. | Tillsammans är de tunga: Claude läser om ungefär {tokens} tokens varje svar. Trimma det du inte behöver i de flesta sessioner. |  |

## engines

Shown from the code. (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `engines.5_hour_limit_runs_out_about` | 5-hour limit runs out about {words} | 5-timmarsgränsen tar slut ungefär {words} |  |
| `engines.a_checkpoint` | a checkpoint | en kontrollpunkt |  |
| `engines.a_notebook_edit` | a notebook edit | en anteckningsboksändring |  |
| `engines.a_pc_that_never_sleeps_wears` | A PC that never sleeps wears the battery and the screen. | En dator som aldrig sover sliter på batteriet och skärmen. | The Windows twin of the Mac line |
| `engines.a_restore` | a restore | en återställning |  |
| `engines.a_shell_command` | a shell command | ett skalkommando |  |
| `engines.a_sleeping_pc_stops_the_work` | A sleeping PC stops the work. | En dator som sover stoppar arbetet. | The Windows twin of the Mac line |
| `engines.a_step` | a step | ett steg |  |
| `engines.a_write` | a Write | en Write |  |
| `engines.about_usd` | about {usd} | ungefär {usd} |  |
| `engines.about_usd_spent_estimate` | about {usd} spent (estimate) | ungefär {usd} spenderat (uppskattning) |  |
| `engines.after_n` | after {n} | efter {n} |  |
| `engines.an_agent_was_working_a_phone` | An agent was working, a phone was connected, or a question waited, so vaken kept your PC awake. | En agent arbetade, en telefon var ansluten eller en fråga väntade, så vaken höll din dator vaken. | The Windows twin of explain.an\_agent\_was\_working\_a\_phone |
| `engines.an_edit` | an Edit | en Edit |  |
| `engines.and_n_more_cockpit_inbox_lists` | - and {n} more. /vaken inbox lists them all. | - och {n} till. /vaken inbox listar alla. |  |
| `engines.apr` | Apr | apr |  |
| `engines.at_this_pace_what_runs_out` | At this pace {what} runs out at {words}. | I den här takten tar {what} slut {words}. |  |
| `engines.aug` | Aug | aug |  |
| `engines.auto_compact_could_not_run` | auto-compact could not run | auto-komprimering kunde inte köras |  |
| `engines.auto_compact_sent_as_compact` | auto-compact sent as /compact | auto-komprimering skickad som /compact |  |
| `engines.auto_compact_skipped` | auto-compact skipped | auto-komprimering hoppades över |  |
| `engines.auto_compact_starts` | auto-compact starts | auto-komprimering startar |  |
| `engines.branch` | Branch | Gren |  |
| `engines.check_failed` | check failed | kontrollen misslyckades |  |
| `engines.check_failed_2` | Check: failed | Kontroll: misslyckades |  |
| `engines.check_not_run_yet` | Check: not run yet | Kontroll: inte körd än |  |
| `engines.check_passed` | Check: passed | Kontroll: gick igenom |  |
| `engines.checked` | checked | kontrollerad |  |
| `engines.checks` | Checks | Kontroller |  |
| `engines.claims_in_the_last_answer` | Claims in the last answer | Påståenden i det senaste svaret |  |
| `engines.claude_s_own_list` | Claude's own list | Claudes egen lista |  |
| `engines.claude_s_task_list` | Claude's task list | Claudes uppgiftslista |  |
| `engines.claude_said_it_no_check_backs` | Claude said it, no check backs it | Claude sa det, ingen kontroll styrker det |  |
| `engines.clock` | clock | klocka |  |
| `engines.cockpit_awake_shows_the_state` | /vaken-help run awake shows the state. Settings &gt; Agents &gt; Keep PC awake turns it off. | /vaken-help run awake visar läget. Inställningar &gt; Agenter &gt; Håll datorn vaken slår av det. | The Windows twin of explain.cockpit\_awake\_shows\_the\_state |
| `engines.commands` | commands | kommandon |  |
| `engines.cost_about_usd` | Cost: about {usd}. | Kostnad: ungefär {usd}. |  |
| `engines.cost_about_usd_estimate` | Cost: about {usd} (estimate) | Kostnad: ungefär {usd} (uppskattning) |  |
| `engines.cost_past_usd` | cost past {usd} | kostade mer än {usd} |  |
| `engines.cost_since_the_last_outcome_about` | Cost since the last outcome: about {usd} (estimate). | Kostnad sedan senaste resultatet: ungefär {usd} (uppskattning). |  |
| `engines.could_not_be_sent` | could not be sent | kunde inte skickas |  |
| `engines.dec` | Dec | dec |  |
| `engines.ended` | Ended | Slutade |  |
| `engines.every_step_that_changes_things_is` | Commands, edits, tools, agents and web fetches are stopped in this session. | Kommandon, ändringar, verktyg, agenter och webbhämtningar stoppas i den här sessionen. |  |
| `engines.extra_usage_runs_out_about_words` | Extra usage runs out about {words} | Extra användning tar slut ungefär {words} |  |
| `engines.feb` | Feb | feb |  |
| `engines.files` | files | filer |  |
| `engines.files_changed` | Files changed | Ändrade filer |  |
| `engines.fix_ci_gh_did_not_answer` | Fix CI: gh did not answer in time. | Fix CI: gh svarade inte i tid. |  |
| `engines.fix_ci_no_check_failed_n` | one: Fix CI: no check failed. {n} still runs.<br>other: Fix CI: no check failed. {n} still run. | one: Fix CI: ingen kontroll misslyckades. {n} körs fortfarande.<br>other: Fix CI: ingen kontroll misslyckades. {n} körs fortfarande. |  |
| `engines.fix_ci_no_check_failed_nothing` | Fix CI: no check failed. Nothing to fix. | Fix CI: ingen kontroll misslyckades. Inget att laga. |  |
| `engines.fix_ci_no_checks_were_found` | Fix CI: no checks were found. | Fix CI: inga kontroller hittades. |  |
| `engines.fix_ci_no_checks_were_found_2` | Fix CI: no checks were found ({reason}). | Fix CI: inga kontroller hittades ({reason}). |  |
| `engines.fix_ci_there_is_no_pull` | Fix CI: there is no pull request for this branch. | Fix CI: det finns ingen pull request för den här grenen. |  |
| `engines.fix_ci_try_n_of_m` | Fix CI: try {n} of {m} in 24 hours for {name}. | Fix CI: försök {n} av {m} på 24 timmar för {name}. |  |
| `engines.folder_copy_path_branch_branch` | Folder copy: {path} (branch {branch}) | Mappkopia: {path} (gren {branch}) |  |
| `engines.friday_time` | Friday {time} | fredag kl. {time} |  |
| `engines.git_not_read` | git not read | git lästes inte |  |
| `engines.if_an_edit_went_wrong_cockpit` | If an edit went wrong: /vaken-undo last. | Om en ändring blev fel: /vaken-undo last. |  |
| `engines.it_resets_at_words` | It resets at {words}. | Den återställs {words}. |  |
| `engines.it_waits_for_you_to_go` | It waits for you to go on. | Den väntar på att du går vidare. |  |
| `engines.its_branch_is_kept_for_your` | Its branch is kept for your review. | Dess gren sparas för din granskning. |  |
| `engines.its_copy_file_cannot_be_read` | its copy file cannot be read | dess kopia går inte att läsa |  |
| `engines.its_copy_file_does_not_match` | its copy file does not match what was kept | dess kopia stämmer inte med det som sparades |  |
| `engines.its_copy_was_dropped_to_stay` | its copy was dropped to stay inside the limits | dess kopia togs bort för att hålla sig inom gränserna |  |
| `engines.its_folder_copy_was_thrown_away` | Its folder copy was thrown away. | Dess mappkopia slängdes. |  |
| `engines.jan` | Jan | jan |  |
| `engines.jul` | Jul | juli |  |
| `engines.jun` | Jun | juni |  |
| `engines.keeper_could_not_read_the_cache` | Keeper could not read the cache | Cachevakten kunde inte läsa cachen |  |
| `engines.keeper_stopped` | Keeper stopped | Cachevakten stoppades |  |
| `engines.kept` | kept | sparad |  |
| `engines.little_happened_while_you_were_away` | Little happened while you were away. | Lite hände medan du var borta. |  |
| `engines.mar` | Mar | mars |  |
| `engines.may` | May | maj |  |
| `engines.monday_time` | Monday {time} | måndag kl. {time} |  |
| `engines.n_costly_calls_were_stopped_by` | one: {n} costly call was stopped by the budget<br>other: {n} costly calls were stopped by the budget | one: {n} dyrt anrop stoppades av budgeten<br>other: {n} dyra anrop stoppades av budgeten |  |
| `engines.n_files_would_change` | one: {n} file would change:<br>other: {n} files would change: | one: {n} fil skulle ändras:<br>other: {n} filer skulle ändras: |  |
| `engines.n_lines` | one: {n} line<br>other: {n} lines | one: {n} rad<br>other: {n} rader |  |
| `engines.n_more` | {n} more | {n} till |  |
| `engines.n_not_run` | {n} not run | {n} inte körda |  |
| `engines.n_risky_steps_were_refused` | one: {n} risky step was stopped<br>other: {n} risky steps were stopped | one: {n} riskabelt steg stoppades<br>other: {n} riskabla steg stoppades |  |
| `engines.n_sessions_finished` | one: {n} session finished<br>other: {n} sessions finished | one: {n} session blev klar<br>other: {n} sessioner blev klara |  |
| `engines.n_sessions_needed_you` | one: {n} session needed you<br>other: {n} sessions needed you | one: {n} session behövde dig<br>other: {n} sessioner behövde dig |  |
| `engines.n_stopped_or_not_run` | {n} stopped or not run | {n} stoppade eller inte körda |  |
| `engines.name_already_the_same_as_the` | {name}: already the same as the copy. Nothing to do. | {name}: redan likadan som kopian. Inget att göra. |  |
| `engines.name_cannot_be_restored_reason` | {name}: cannot be restored, {reason}. | {name}: kan inte återställas, {reason}. |  |
| `engines.name_did_not_exist_then_left` | {name}: did not exist then. Left as it is. | {name}: fanns inte då. Lämnas som den är. |  |
| `engines.name_did_not_exist_then_the` | {name}: did not exist then. Vaken does not delete files. To remove it yourself: {command} | {name}: fanns inte då. Vaken raderar inte filer. Ta bort den själv: {command} |  |
| `engines.name_made_by_what_and_it` | {name}: made by {what}, and it is gone now. Nothing to do. | {name}: gjord av {what}, och den är borta nu. Inget att göra. |  |
| `engines.name_made_by_what_there_was` | {name}: made by {what}. There was no earlier version, and vaken does not delete files. To remove it yourself: {command} | {name}: gjord av {what}. Det fanns ingen tidigare version, och vaken raderar inte filer. Ta bort den själv: {command} |  |
| `engines.name_the_file_is_gone_now` | {name}: the file is gone now and would come back (back to how it was before {what} at {at}) | {name}: filen är borta nu och skulle komma tillbaka (tillbaka till hur den var före {what} kl. {at}) |  |
| `engines.name_words_removed_parts_added_back` | {name}: {words} removed, {parts} added (back to how it was before {what} at {at}) | {name}: {words} borttagna, {parts} tillagda (tillbaka till hur den var före {what} kl. {at}) |  |
| `engines.named_list` | Named: {list}. | Namngivna: {list}. |  |
| `engines.no_answer_in_time` | no answer in time | inget svar i tid |  |
| `engines.no_checkpoint_named_name` | No checkpoint named "{name}". | Ingen kontrollpunkt heter "{name}". |  |
| `engines.no_copy_could_be_kept_of` | no copy could be kept of it (too big, secret-looking or not plain text) | ingen kopia kunde sparas av den (för stor, ser hemlig ut eller inte vanlig text) |  |
| `engines.none_is_named_yet_cockpit_checkpoint` | None is named yet: /vaken-undo checkpoint &lt;name&gt;. | Ingen är namngiven än: /vaken-undo checkpoint &lt;name&gt;. |  |
| `engines.not_set` | not set | inte satt |  |
| `engines.noted_a_merged_pull_request` | Noted a merged pull request | Noterade en ihopslagen pull request |  |
| `engines.noted_finished_work` | Noted finished work | Noterade klart arbete |  |
| `engines.nothing_happened_while_you_were_away` | Nothing happened while you were away. | Inget hände medan du var borta. |  |
| `engines.nothing_happened_yet_while_you_are` | Nothing happened yet while you are away. | Inget har hänt än medan du är borta. |  |
| `engines.nothing_has_been_changed_since_your` | Nothing has been changed since your last message, so there is nothing to put back. /vaken-undo lists older changes. | Inget har ändrats sedan ditt senaste meddelande, så det finns inget att sätta tillbaka. /vaken-undo listar äldre ändringar. |  |
| `engines.nothing_waits_for_you` | Nothing waits for you. | Inget väntar på dig. |  |
| `engines.nothing_was_changed` | Nothing was changed. | Inget ändrades. |  |
| `engines.nothing_was_changed_yet_before_a` | Nothing was changed yet. Before a restore vaken keeps a copy of the files as they are now, so a restore can be undone too. To go ahead: {command} | Inget har ändrats än. Före en återställning sparar vaken en kopia av filerna som de är nu, så att även en återställning kan ångras. För att köra: {command} |  |
| `engines.nothing_would_change` | Nothing would change. | Inget skulle ändras. |  |
| `engines.nov` | Nov | nov |  |
| `engines.oct` | Oct | okt |  |
| `engines.one_model_up_from_model_after` | one model up from {model} after a failure | en modell upp från {model} efter ett fel |  |
| `engines.open_questions` | Open questions | Öppna frågor |  |
| `engines.other_checks_that_failed_list` | Other checks that failed: {list}. | Andra kontroller som misslyckades: {list}. |  |
| `engines.own_folder` | own folder | egen mapp |  |
| `engines.packet_do_not_write` | Do not write | Skriv inte |  |
| `engines.packet_write_it` | Write it | Skriv den |  |
| `engines.packet_write_question` | Write the session packet to {path}? | Skriva sessionspaketet till {path}? |  |
| `engines.packet_write_question_replace` | Write the session packet to {path}? It replaces the file that is there. | Skriva sessionspaketet till {path}? Det ersätter filen som finns där. |  |
| `engines.port_n_nothing_listens` | Port {n}: nothing listens. | Port {n}: inget lyssnar. |  |
| `engines.port_n_something_listens_and_answers` | Port {n}: something listens and answers {k} in {m} s, but the start of the page holds: {list}. The page may show an error. | Port {n}: något lyssnar och svarar {k} på {m} s, men början av sidan innehåller: {list}. Sidan kan visa ett fel. |  |
| `engines.port_n_something_listens_but_it` | Port {n}: something listens, but it answers {k}: the page shows an error. | Port {n}: något lyssnar, men det svarar {k}: sidan visar ett fel. |  |
| `engines.port_n_something_listens_but_it_2` | Port {n}: something listens, but it answers {k}: the page was not found. | Port {n}: något lyssnar, men det svarar {k}: sidan hittades inte. |  |
| `engines.port_n_something_listens_but_it_3` | Port {n}: something listens, but it answers {k}: the page was refused. | Port {n}: något lyssnar, men det svarar {k}: sidan nekades. |  |
| `engines.port_n_something_listens_name_but` | Port {n}: something listens ({name}), but it did not answer in {m} s. | Port {n}: något lyssnar ({name}), men det svarade inte inom {m} s. |  |
| `engines.port_n_up_answers_k_in` | Port {n}: up, answers {k} in {m} s. | Port {n}: igång, svarar {k} på {m} s. |  |
| `engines.preview_of_going_back_to_checkpoint` | Preview of going back to checkpoint "{name}". | Förhandsvisning av att gå tillbaka till kontrollpunkten "{name}". |  |
| `engines.preview_of_undoing_the_edits_since` | Preview of undoing the edits since your last message. | Förhandsvisning av att ångra ändringarna sedan ditt senaste meddelande. |  |
| `engines.pull_request` | Pull request | Pull request |  |
| `engines.ran_on_model` | ran on {model} | körde på {model} |  |
| `engines.ran_past_n_min` | ran past {n} min | körde över {n} min |  |
| `engines.receipts` | receipts | kvitton |  |
| `engines.result_word` | Result: {word}. | Resultat: {word}. |  |
| `engines.review_on_its_way` | Review: on its way | Granskning: på väg |  |
| `engines.review_text` | Review: {text} | Granskning: {text} |  |
| `engines.risky_steps_are_refused_by_themselves` | Risky steps are stopped by themselves while you are away (if While away is set to Careful). | Riskabla steg stoppas av sig själva medan du är borta (om När du är borta är satt till Försiktig). |  |
| `engines.role_role_model_model` | Role: {role}, model {model} | Roll: {role}, modell {model} |  |
| `engines.saturday_time` | Saturday {time} | lördag kl. {time} |  |
| `engines.sep` | Sep | sep |  |
| `engines.session_id` | session id | sessions-ID |  |
| `engines.session_record` | session record | sessionens anteckningar |  |
| `engines.shared_store` | shared store | delat lager |  |
| `engines.skipped` | skipped | hoppades över |  |
| `engines.so_far_while_you_are_away` | So far while you are away ({age}): {list}. | Hittills medan du är borta ({age}): {list}. |  |
| `engines.steps_that_change_things_work_again` | Steps that change things work again. | Steg som ändrar något fungerar igen. |  |
| `engines.still_running` | still running | pågår fortfarande |  |
| `engines.stopped` | stopped | stoppad |  |
| `engines.sunday_time` | Sunday {time} | söndag kl. {time} |  |
| `engines.task_n_did_not_pass` | task {n} did not pass | uppgift {n} klarade inte kontrollen |  |
| `engines.task_text` | Task: {text} | Uppgift: {text} |  |
| `engines.the_5_hour_limit` | the 5-hour limit | 5-timmarsgränsen |  |
| `engines.the_cache_had_gone_stale_so` | The cache had gone stale, so the read paid for a rewrite. | Cachen hade blivit gammal, så läsningen kostade en omskrivning. |  |
| `engines.the_cockpit_also_did_this_words` | Vaken also did this: {words} | Vaken gjorde också detta: {words} |  |
| `engines.the_cockpit_had_kept_your_pc` | Vaken had kept your PC awake for 8 hours in a row, which is the most it allows. It let the PC sleep. | Vaken hade hållit din dator vaken i 8 timmar i rad, vilket är det mesta den tillåter. Den lät datorn sova. | The Windows twin of the Mac line |
| `engines.the_held_step_goes_through_once` | The stopped step goes through once: {text} | Det stoppade steget går igenom en gång: {text} |  |
| `engines.the_held_step_goes_through_once_2` | The stopped step goes through once | Det stoppade steget går igenom en gång |  |
| `engines.the_ledger_keeps_only_the_last` | The ledger keeps only the last {n} entries, so the oldest ones from this time may be missing. | Loggen sparar bara de senaste {n} posterna, så de äldsta från den här tiden kan saknas. |  |
| `engines.the_next_held_step_goes_through` | The next stopped step goes through once. | Nästa stoppade steg går igenom en gång. |  |
| `engines.the_page_text_holds_list` | The page text holds: {list}. | Sidans text innehåller: {list}. |  |
| `engines.the_reviewer_did_not_finish` | The reviewer did not finish. | Granskaren blev inte klar. |  |
| `engines.the_reviewer_did_not_start` | The reviewer did not start. | Granskaren startade inte. |  |
| `engines.the_reviewer_gave_no_words` | The reviewer gave no words. | Granskaren gav inga ord. |  |
| `engines.the_stopped_step_was_dismissed` | The stopped step was dismissed. It did not run. | Det stoppade steget avfärdades. Det kördes inte. |  |
| `engines.the_time_you_set_ran_out` | The time you set ran out. | Tiden du satte gick ut. |  |
| `engines.the_weekly_limit` | the weekly limit | veckogränsen |  |
| `engines.this_session_has_no_reply_yet` | This session has no reply yet. Send one message, wait for the answer, then try again. | Den här sessionen har inget svar än. Skicka ett meddelande, vänta på svaret och försök igen. |  |
| `engines.thrown_away` | thrown away | slängd |  |
| `engines.thursday_time` | Thursday {time} | torsdag kl. {time} |  |
| `engines.title_n_times_today_nothing_was` | {title}: {n} times today, nothing was stopped. Turn this warning off for all projects? | {title}: {n} gånger i dag, inget stoppades. Stänga av den här varningen för alla projekt? |  |
| `engines.try_n` | try {n} | försök {n} |  |
| `engines.tuesday_time` | Tuesday {time} | tisdag kl. {time} |  |
| `engines.undo_preview_for_name` | Undo preview for {name}. | Förhandsvisning av att ångra {name}. |  |
| `engines.up_from_model` | up from {model} | upp från {model} |  |
| `engines.waiting_for_you` | Waiting for you: | Väntar på dig: |  |
| `engines.waiting_for_your_look` | Waiting for your look | Väntar på att du tittar |  |
| `engines.waits_the_plan_limit_stopped_it` | waits: the plan limit stopped it | väntar: planens gräns stoppade den |  |
| `engines.wednesday_time` | Wednesday {time} | onsdag kl. {time} |  |
| `engines.weekly_limit_name_runs_out_about_words` | Weekly limit ({name}) runs out about {words} | Veckogränsen ({name}) tar slut ungefär {words} |  |
| `engines.weekly_limit_runs_out_about_words` | Weekly limit runs out about {words} | Veckogränsen tar slut ungefär {words} |  |
| `engines.whether_the_dev_server_of_your` | Whether the dev server of your front-end work is up and answers, and pictures of the page at phone, iPad and desktop size, taken by Chrome (or Edge) on this PC in the background. Vaken looks at the usual dev ports and never starts a server. | Om utvecklingsservern för ditt front-end-arbete är igång och svarar, och bilder av sidan i telefon-, iPad- och datorstorlek, tagna av Chrome (eller Edge) på den här datorn i bakgrunden. Vaken tittar på de vanliga utvecklingsportarna och startar aldrig en server. | The Windows twin of cardship.whether\_the\_dev\_server\_of\_your |
| `engines.while_you_were_away_age_list` | While you were away ({age}): {list}. | Medan du var borta ({age}): {list}. |  |
| `engines.why_text` | Why: {text} | Varför: {text} |  |
| `engines.windows_itself_reports_memory` | Windows itself reports memory pressure ({p}), even if the share used looks fine, so no new agent should start. | Windows själv rapporterar minnestryck ({p}), även om den använda andelen ser bra ut, så ingen ny agent bör starta. | The Windows twin of cardcomputer.macos\_itself\_reports\_memory |
| `engines.words_n_times` | {words} {n} times. | {words} {n} gånger. |  |
| `engines.words_once` | {words} once. | {words} en gång. |  |
| `engines.words_unverified_reason` | {words}: unverified: {reason} | {words}: overifierat: {reason} | A line of the handoff note marks (Context health card) |
| `engines.words_verified_reason` | {words}: verified: {reason} | {words}: verifierat: {reason} | A line of the handoff note marks (Context health card) |
| `engines.you_stopped_it` | you stopped it | du stoppade den |  |
| `engines.you_stopped_the_run` | you stopped the run | du stoppade körningen |  |
| `engines.your_first_message_not_checked` | key words of your first message, not checked | nyckelord ur ditt första meddelande, inte kontrollerat |  |
| `engines.your_words_not_checked` | your words, not checked | dina ord, inte kontrollerade |  |

## access

Shown from the code. (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `access.divider` | Divider | Avdelare |  |
| `access.dot_active` | Active | Aktiv |  |
| `access.dot_calm` | OK | OK |  |
| `access.dot_unknown` | Not read yet | Inte läst än |  |
| `access.fold` | Fold | Dölj |  |
| `access.fold_name` | Fold {name} | Dölj {name} |  |
| `access.name_selected` | {name}, selected | {name}, vald |  |
| `access.name_settings` | {name} settings | Inställningar för {name} |  |
| `access.name_state` | {name}: {state} | {name}: {state} |  |
| `access.open` | Open | Öppna |  |
| `access.open_name` | Open {name} | Öppna {name} |  |
| `access.pinned` | Pinned | Fäst |  |

## truth

Shown from the code. (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `truth.a_b_stopped_warned_today` | {a} stopped, {b} warned today. | {a} stoppade, {b} varnade i dag. |  |
| `truth.a_passed` | {a} passed | {a} godkända |  |
| `truth.cache_hit_hit_warm_under_1_min` | Cache {hit}% hit · warm under 1 min | Cache {hit} % träff · varm under 1 min |  |
| `truth.cache_warm_under_1_min` | Cache warm under 1 min | Cache varm under 1 min |  |
| `truth.left_of_the_week_left_about_days_to_go` | {left}% of the week left, about {days} days to go, today included. To make it last, use about {per}% a day. | {left} % av veckan kvar, ungefär {days} dagar till, i dag inräknad. För att det ska räcka, använd ungefär {per} % om dagen. |  |
| `truth.left_of_the_week_left_resets_within_a_day` | {left}% of your weekly limit is left, and it resets within a day. | {left} % av din veckogräns är kvar, och den återställs inom en dag. |  |
| `truth.left_of_the_week_left_until_it_resets` | {left}% of your weekly limit is left. To make it last until it resets, use about {per}% a day. | {left} % av din veckogräns är kvar. För att den ska räcka tills den återställs, använd ungefär {per} % om dagen. |  |
| `truth.n_cancelled` | {n} cancelled | {n} avbrutna |  |
| `truth.n_checking` | {n} checking | {n} kontrolleras |  |
| `truth.n_skipped` | {n} skipped | {n} hoppades över |  |
| `truth.n_stopped_today` | {n} stopped today. | {n} stoppade i dag. |  |
| `truth.n_warned_today` | {n} warned today. | {n} varnade i dag. |  |
| `truth.ok_done` | {ok} done | {ok} klara |  |
| `truth.ok_of_n_finished` | {ok} of {n} finished | {ok} av {n} avslutade |  |
| `truth.to_let_a_stopped_step_through_use` | To let a stopped step through, use Allow once in Needs you. | För att släppa igenom ett stoppat steg: använd Tillåt en gång i Behöver dig. |  |
| `truth.today_about_n_used` | Today: about {n}% used. | I dag: ungefär {n} % använt. |  |
| `truth.today_since_time_about_n_used` | Today since {time}: about {n}% used. | I dag sedan {time}: ungefär {n} % använt. |  |
| `truth.weekly_limit_used_up_resets_when` | Your weekly limit is used up. It resets {when}. | Din veckogräns är förbrukad. Den återställs {when}. |  |

## fmt

Numbers and times: a time gone, a length of time, an estimated price, day and month names. (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `fmt.a_of_b` | {a} of {b} | {a} av {b} | A part of a whole: 68k of 1M. |
| `fmt.about_usd` | about {usd} | ungefär {usd} | An estimated price: about $0.84. |
| `fmt.apr` | Apr | apr | Short month name. |
| `fmt.aug` | Aug | aug | Short month name. |
| `fmt.dec` | Dec | dec | Short month name. |
| `fmt.feb` | Feb | feb | Short month name. |
| `fmt.fri` | Fri | fre | Short day name. |
| `fmt.friday` | Friday | fredag | Whole day name. |
| `fmt.jan` | Jan | jan | Short month name. |
| `fmt.jul` | Jul | juli | Short month name. |
| `fmt.jun` | Jun | juni | Short month name. |
| `fmt.just_now` | just now | nyss | A time gone of under a minute. |
| `fmt.mar` | Mar | mars | Short month name. |
| `fmt.may` | May | maj | Short month name. |
| `fmt.mon` | Mon | mån | Short day name. |
| `fmt.monday` | Monday | måndag | Whole day name. |
| `fmt.n_d_ago` | {n} d ago | för {n} d sedan | A time gone in days, short. |
| `fmt.n_h` | {n} h | {n} h | A number of hours, short. |
| `fmt.n_h_ago` | {n} h ago | för {n} h sedan | A time gone in hours, short. |
| `fmt.n_min` | {n} min | {n} min | A number of minutes, short. |
| `fmt.n_min_ago` | {n} min ago | för {n} min sedan | A time gone in minutes, short. |
| `fmt.n_s` | {n} s | {n} s | A number of seconds, short. |
| `fmt.n_today` | {n} today | {n} i dag | A count of what happened today. |
| `fmt.nov` | Nov | nov | Short month name. |
| `fmt.oct` | Oct | okt | Short month name. |
| `fmt.sat` | Sat | lör | Short day name. |
| `fmt.saturday` | Saturday | lördag | Whole day name. |
| `fmt.sep` | Sep | sep | Short month name. |
| `fmt.sun` | Sun | sön | Short day name. |
| `fmt.sunday` | Sunday | söndag | Whole day name. |
| `fmt.thu` | Thu | tors | Short day name. |
| `fmt.thursday` | Thursday | torsdag | Whole day name. |
| `fmt.tue` | Tue | tis | Short day name. |
| `fmt.tuesday` | Tuesday | tisdag | Whole day name. |
| `fmt.under_1_min` | under 1 min | under 1 min | A coarse time of under a minute. |
| `fmt.under_usd` | under {usd} | under {usd} | A price too small to say: under $0.01. |
| `fmt.wed` | Wed | ons | Short day name. |
| `fmt.wednesday` | Wednesday | onsdag | Whole day name. |

## words

Shown from the code. (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `words.agent` | one: {n} agent<br>other: {n} agents | one: {n} agent<br>other: {n} agenter | A count of agents. |
| `words.answer` | one: {n} answer<br>other: {n} answers | one: {n} svar<br>other: {n} svar | A count of answers. |
| `words.assumption` | one: {n} assumption<br>other: {n} assumptions | one: {n} antagande<br>other: {n} antaganden | A count of things Claude assumed. |
| `words.background_command` | one: {n} background command<br>other: {n} background commands | one: {n} bakgrundskommando<br>other: {n} bakgrundskommandon | A count of commands that run in the background. |
| `words.change` | one: {n} change<br>other: {n} changes | one: {n} ändring<br>other: {n} ändringar | A count of changes. |
| `words.changed_code_file` | one: {n} changed code file<br>other: {n} changed code files | one: {n} ändrad kodfil<br>other: {n} ändrade kodfiler | A count of code files that changed. |
| `words.changed_file` | one: {n} changed file<br>other: {n} changed files | one: {n} ändrad fil<br>other: {n} ändrade filer | A count of files that changed. |
| `words.changed_files_uncommitted` | one: {n} changed file that is not committed<br>other: {n} changed files that are not committed | one: {n} ändrad fil som inte är committad<br>other: {n} ändrade filer som inte är committade | A count of changed files that git has not saved yet. |
| `words.check` | one: {n} check<br>other: {n} checks | one: {n} kontroll<br>other: {n} kontroller | A count of checks. Its English is sent to Claude \[to-claude\]. |
| `words.check_run` | one: {n} check run<br>other: {n} check runs | one: {n} körd kontroll<br>other: {n} körda kontroller | A count of checks that ran. It is also written into the note file that a later session's Claude reads \[to-claude\]. |
| `words.choice` | one: {n} choice<br>other: {n} choices | one: {n} val<br>other: {n} val | A count of Settings choices. |
| `words.claim` | one: {n} claim<br>other: {n} claims | one: {n} påstående<br>other: {n} påståenden | A count of claims Claude made. It is also written into the note file that a later session's Claude reads \[to-claude\]. |
| `words.claim_with_no_proof` | one: {n} claim with no proof<br>other: {n} claims with no proof | one: {n} påstående utan bevis<br>other: {n} påståenden utan bevis | A count of claims that no check backs. It is also written into the note file that a later session's Claude reads \[to-claude\]. |
| `words.closed_session` | one: {n} closed session<br>other: {n} closed sessions | one: {n} avslutad session<br>other: {n} avslutade sessioner | A count of sessions that were closed. |
| `words.commit` | one: {n} commit<br>other: {n} commits | one: {n} commit<br>other: {n} commits | A count of git commits. |
| `words.copy` | one: {n} copy<br>other: {n} copies | one: {n} kopia<br>other: {n} kopior | A count of saved copies of files. |
| `words.costly_call_stopped` | one: {n} costly call was stopped by the budget<br>other: {n} costly calls were stopped by the budget | one: {n} dyrt anrop stoppades av budgeten<br>other: {n} dyra anrop stoppades av budgeten | A count of expensive calls that the budget stopped. |
| `words.day` | one: {n} day<br>other: {n} days | one: {n} dag<br>other: {n} dagar | A number of days. |
| `words.different_thing` | one: {n} different thing<br>other: {n} different things | one: {n} olika sak<br>other: {n} olika saker | A count of kinds of things the app did. |
| `words.edit` | one: {n} edit<br>other: {n} edits | one: {n} ändring<br>other: {n} ändringar | A count of file edits. Its English is sent to Claude \[to-claude\]. |
| `words.env_names_note` | one: Vaken's env names check saw that the file you just wrote reads an env name that no env file declares: {list}. Tell the person, and add the name to .env.example (the name only, never a value).<br>other: Vaken's env names check saw that the file you just wrote reads env names that no env file declares: {list}. Tell the person, and add the names to .env.example (the name only, never a value). | one: Vakens kontroll av env-namn såg att filen du nyss skrev läser ett env-namn som ingen env-fil deklarerar: {list}. Säg det till personen och lägg till namnet i .env.example (bara namnet, aldrig ett värde).<br>other: Vakens kontroll av env-namn såg att filen du nyss skrev läser env-namn som ingen env-fil deklarerar: {list}. Säg det till personen och lägg till namnen i .env.example (bara namnen, aldrig ett värde). | A note that goes to Claude (kept in English by the app). Its English is sent to Claude \[to-claude\]. |
| `words.event` | one: {n} event<br>other: {n} events | one: {n} händelse<br>other: {n} händelser | A count of events. |
| `words.failure` | one: {n} failure<br>other: {n} failures | one: {n} misslyckande<br>other: {n} misslyckanden | A count of failures. |
| `words.file` | one: {n} file<br>other: {n} files | one: {n} fil<br>other: {n} filer | A count of files. Its English is sent to Claude \[to-claude\]. |
| `words.finished_answer` | one: {n} finished answer<br>other: {n} finished answers | one: {n} avslutat svar<br>other: {n} avslutade svar | A count of answers that finished. Its English is sent to Claude \[to-claude\]. |
| `words.finished_answers_wait` | one: {n} finished answer changed files and waits for your look.<br>other: {n} finished answers changed files and wait for your look. | one: {n} avslutat svar ändrade filer och väntar på att du tittar.<br>other: {n} avslutade svar ändrade filer och väntar på att du tittar. | A count of answers that changed files and wait for the person to look. |
| `words.finished_change` | one: {n} finished change<br>other: {n} finished changes | one: {n} färdig ändring<br>other: {n} färdiga ändringar | A count of finished changes. |
| `words.folders_gone_prune` | one: {n} folder is gone. Run git worktree prune to let git forget it.<br>other: {n} folders are gone. Run git worktree prune to let git forget them. | one: {n} mapp är borta. Kör git worktree prune så glömmer git den.<br>other: {n} mappar är borta. Kör git worktree prune så glömmer git dem. | The git command stays as it is. |
| `words.hit` | one: {n} hit<br>other: {n} hits | one: {n} träff<br>other: {n} träffar | A count of hits. |
| `words.hour` | one: {n} hour<br>other: {n} hours | one: {n} timme<br>other: {n} timmar | A number of hours. |
| `words.installs_odd` | one: This installs a package that looks off: {lines}<br>other: This installs packages that look off: {lines} | one: Det här installerar ett paket som ser konstigt ut: {lines}<br>other: Det här installerar paket som ser konstiga ut: {lines} | A finding of the safety check; it goes to Claude (kept in English by the app). Its English is sent to Claude \[to-claude\]. |
| `words.kind` | one: {n} kind<br>other: {n} kinds | one: {n} sort<br>other: {n} sorter | A count of kinds. It is also written into the note file that a later session's Claude reads \[to-claude\]. |
| `words.leftover_note` | one: {n} leftover note<br>other: {n} leftover notes | one: {n} kvarlämnad anteckning<br>other: {n} kvarlämnade anteckningar | A count of notes that stayed behind. |
| `words.line` | one: {n} line<br>other: {n} lines | one: {n} rad<br>other: {n} rader | A count of lines. |
| `words.message` | one: {n} message<br>other: {n} messages | one: {n} meddelande<br>other: {n} meddelanden | A count of messages. |
| `words.minute` | one: {n} minute<br>other: {n} minutes | one: {n} minut<br>other: {n} minuter | A number of minutes. Its English is sent to Claude \[to-claude\]. |
| `words.name_distance` | one: Its name is one letter away from the very popular {target}: check it is not a misspelling.<br>other: Its name is two letters away from the very popular {target}: check it is not a misspelling. | one: Namnet skiljer sig med en bokstav från det mycket populära {target}: kontrollera att det inte är en felstavning.<br>other: Namnet skiljer sig med två bokstäver från det mycket populära {target}: kontrollera att det inte är en felstavning. | A finding of the safety check; it goes to Claude (kept in English by the app). Its English is sent to Claude \[to-claude\]. |
| `words.needs_you` | one: {n} needs you<br>other: {n} need you | one: {n} behöver dig<br>other: {n} behöver dig | A count of sessions that need the person; "{n}" is a number. |
| `words.new_picture` | one: {n} new picture<br>other: {n} new pictures | one: {n} ny bild<br>other: {n} nya bilder | A count of new pictures. |
| `words.open_pull_request` | one: {n} open pull request<br>other: {n} open pull requests | one: {n} öppen pull request<br>other: {n} öppna pull requests | A count of open pull requests. |
| `words.open_question` | one: {n} open question<br>other: {n} open questions | one: {n} öppen fråga<br>other: {n} öppna frågor | A count of open questions. |
| `words.other_listening_port` | one: {n} other listening port<br>other: {n} other listening ports | one: {n} annan lyssnande port<br>other: {n} andra lyssnande portar | A count of network ports that something listens on. |
| `words.other_session_waits` | one: {n} other session waits<br>other: {n} other sessions wait | one: {n} annan session väntar<br>other: {n} andra sessioner väntar | A count of other sessions that wait for the person. |
| `words.outcome` | one: {n} outcome<br>other: {n} outcomes | one: {n} utfall<br>other: {n} utfall | A count of outcomes. |
| `words.prompt` | one: {n} prompt<br>other: {n} prompts | one: {n} prompt<br>other: {n} prompter | A count of prompts. |
| `words.read_back_match` | one: {n} read back and matches the copy.<br>other: {n} read back and match the copy. | one: {n} lästes tillbaka och stämmer med kopian.<br>other: {n} lästes tillbaka och stämmer med kopian. | After a restore: how many files were read back and match the saved copy. |
| `words.read_only_command` | one: {n} read-only command<br>other: {n} read-only commands | one: {n} skrivskyddat kommando<br>other: {n} skrivskyddade kommandon | A count of commands that only read. |
| `words.risky_step` | one: {n} risky step<br>other: {n} risky steps | one: {n} riskabelt steg<br>other: {n} riskabla steg | A count of risky steps. |
| `words.risky_step_stopped` | one: {n} risky step was stopped<br>other: {n} risky steps were stopped | one: {n} riskabelt steg stoppades<br>other: {n} riskabla steg stoppades | A count of risky steps that were stopped. |
| `words.session` | one: {n} session<br>other: {n} sessions | one: {n} session<br>other: {n} sessioner | A count of sessions. |
| `words.session_matches` | one: {n} session matches<br>other: {n} sessions match | one: {n} session matchar<br>other: {n} sessioner matchar | A count of sessions that match a search. |
| `words.session_mentions` | one: {n} session mentions<br>other: {n} sessions mention | one: {n} session nämner<br>other: {n} sessioner nämner | A count of sessions that mention a search word. |
| `words.session_needs` | one: {n} session needs<br>other: {n} sessions need | one: {n} session behöver<br>other: {n} sessioner behöver | Followed by "you": a count of sessions that need the person. |
| `words.session_works` | one: {n} session works<br>other: {n} sessions work | one: {n} session arbetar<br>other: {n} sessioner arbetar | A count of sessions that are working. |
| `words.setting` | one: {n} setting<br>other: {n} settings | one: {n} inställning<br>other: {n} inställningar | A count of settings. |
| `words.slash_command` | one: {n} slash command<br>other: {n} slash commands | one: {n} snedstreckskommando<br>other: {n} snedstreckskommandon | A count of slash commands. |
| `words.slow_step` | one: {n} slow step<br>other: {n} slow steps | one: {n} långsamt steg<br>other: {n} långsamma steg | A count of steps that took long. |
| `words.still_running` | one: {n} still runs<br>other: {n} still run | one: {n} körs fortfarande<br>other: {n} körs fortfarande | A count of checks that still run. |
| `words.stopped_steps_wait` | one: {n} stopped step waits for you. Open Needs you.<br>other: {n} stopped steps wait for you. Open Needs you. | one: {n} stoppat steg väntar på dig. Öppna Behöver dig.<br>other: {n} stoppade steg väntar på dig. Öppna Behöver dig. | "Needs you" is the name of a view. |
| `words.task` | one: {n} task<br>other: {n} tasks | one: {n} uppgift<br>other: {n} uppgifter | A count of tasks. |
| `words.test` | one: {n} test<br>other: {n} tests | one: {n} test<br>other: {n} test | A count of tests. Its English is sent to Claude \[to-claude\]. |
| `words.thing` | one: {n} thing<br>other: {n} things | one: {n} sak<br>other: {n} saker | A count of things. |
| `words.time` | one: {n} time<br>other: {n} times | one: {n} gång<br>other: {n} gånger | A count of times something happened. |
| `words.times` | one: once<br>other: {n} times | one: en gång<br>other: {n} gånger | How many times: "once" for one. It is also written into the note file that a later session's Claude reads \[to-claude\]. |
| `words.tool` | one: {n} tool<br>other: {n} tools | one: {n} verktyg<br>other: {n} verktyg | A count of tools. |
| `words.unknown_word` | Unknown word: {word}. Words: {words} | Okänt ord: {word}. Ord: {words} | A slash command's answer to a word it does not take; {words} is the list the menu shows, e.g. inbox \| neighbors |
| `words.unpriced_left_out` | one: {n} answer has no known price and is left out<br>other: {n} answers have no known price and are left out | one: {n} svar har inget känt pris och är utelämnat<br>other: {n} svar har inget känt pris och är utelämnade | A count of answers with no known price. |
| `words.very_long_line` | one: {n} very long line<br>other: {n} very long lines | one: {n} mycket lång rad<br>other: {n} mycket långa rader | A count of very long lines. |
| `words.wait` | one: {n} wait<br>other: {n} waits | one: {n} väntan<br>other: {n} väntningar | A count of waits. |
| `words.warning` | one: {n} warning<br>other: {n} warnings | one: {n} varning<br>other: {n} varningar | A count of warnings. |
| `words.warning_about_odd_behaviour` | one: {n} warning about odd behaviour<br>other: {n} warnings about odd behaviour | one: {n} varning om udda beteende<br>other: {n} varningar om udda beteende | A count of warnings about odd behaviour. It is also written into the note file that a later session's Claude reads \[to-claude\]. |
| `words.word` | one: {n} word<br>other: {n} words | one: {n} ord<br>other: {n} ord | A count of words. |
| `words.worktree` | one: {n} worktree<br>other: {n} worktrees | one: {n} arbetsträd<br>other: {n} arbetsträd | A count of git worktrees. |

## common

Words shared by many places: buttons, levels, states, menus, help. (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `common.1` | 1 | 1 |  |
| `common.10` | $10 | $10 |  |
| `common.100` | $100 | $100 |  |
| `common.12` | 12 | 12 |  |
| `common.1_file_preview` | 1 file · Preview | 1 fil · Visa först |  |
| `common.2` | 2 | 2 |  |
| `common.200` | $200 | $200 |  |
| `common.20_00_to_08_00` | 20:00 to 08:00 | 20:00 till 08:00 |  |
| `common.22_00_to_07_00` | 22:00 to 07:00 | 22:00 till 07:00 |  |
| `common.25` | $25 | $25 |  |
| `common.3` | 3 | 3 |  |
| `common.30_2` | 30% | 30 % |  |
| `common.4` | 4 | 4 |  |
| `common.5` | 5 | 5 |  |
| `common.50` | $50 | $50 |  |
| `common.50_2` | 50% | 50 % |  |
| `common.5_2` | $5 | $5 |  |
| `common.6` | 6 | 6 |  |
| `common.70_2` | 70% | 70 % |  |
| `common.8` | 8 | 8 |  |
| `common.a_good_moment` | a good moment | en bra stund |  |
| `common.a_helper_made_no_progress_for` | An agent made no progress for 10 min | En agent gjorde inga framsteg på 10 min |  |
| `common.a_helper_that_only_searches_or` | An agent that only searches or reads does not need the biggest model. Auto sends such an agent to a cheaper one. Suggest only tells you. Plan and review agents are never changed, nor an agent that an agent file of yours defines (it keeps the model its file chose), nor a model Claude chose. | En agent som bara söker eller läser behöver inte den största modellen. Auto skickar en sådan agenter till en billigare. Föreslå berättar bara för dig. Agenter för planering och granskning ändras aldrig, inte heller en agent som en agentfil av dig definierar (den behåller modellen som filen valde), inte heller en modell som Claude valde. |  |
| `common.a_helper_that_runs_longer_is` | An agent that runs longer is stopped. | En agent som kör längre stoppas. |  |
| `common.a_layout_remembers_the_look_detail` | A layout remembers the look: detail levels, which cards show and the card order of each width. | En layout kommer ihåg utseendet: detaljnivåer, vilka kort som visas och kortens ordning för varje bredd. |  |
| `common.a_run_that_ends_shows_here` | A run that ends shows here: what is done, what failed and what it cost. | En körning som slutar visas här: vad som är klart, vad som misslyckades och vad det kostade. |  |
| `common.a_template_keeps_a_runs_tasks` | A template keeps a run’s tasks and choices, to start it again later. | En mall sparar en körnings uppgifter och val, så att du kan starta den igen senare. |  |
| `common.a_working_session_sends_small_signs` | A working session sends small signs of life. If none comes for a few minutes, the line above the chat box says it has gone quiet. A long command can be quiet too, so look before you stop it. | En session som arbetar skickar små livstecken. Kommer inget på några minuter säger raden ovanför chattrutan att den har blivit tyst. Ett långt kommando kan också vara tyst, så titta efter innan du stoppar det. |  |
| `common.about_this` | About this › | Om detta › |  |
| `common.accent_colour` | Accent colour | Accentfärg |  |
| `common.add` | Add | Lägg till |  |
| `common.add_a_task_for_example_fix` | Add a task, for example: Fix the header (builder, strong) | Lägg till en uppgift, till exempel: Laga sidhuvudet (builder, strong) |  |
| `common.after_a_limit` | After a limit | Efter en gräns |  |
| `common.after_a_plan_limit` | After a plan limit | Efter en plangräns |  |
| `common.after_each_turn_cockpit_happened` | After each answer, /vaken-explain happened says in plain words what Claude read, changed and ran. Anything risky, such as a new package or a push, is marked. | Efter varje svar berättar /vaken-explain happened med enkla ord vad Claude läste, ändrade och körde. Allt riskabelt, som ett nytt paket eller en push, markeras. |  |
| `common.after_the_app_updates_the_cockpit` | After the app updates, vaken tests its own parts. If one part broke, it tells you which, and the rest keeps working. Run /vaken-help run health any time. | När appen har uppdaterats testar vaken sina egna delar. Om en del har gått sönder säger den vilken, och resten fortsätter fungera. Kör /vaken-help run health när du vill. |  |
| `common.agent_board` | Agent board | Agenttavla |  |
| `common.agent_cap` | Agent cap | Agenttak |  |
| `common.agents` | Agents | Agenter |  |
| `common.agents_and_tasks` | Agents and tasks | Agenter och uppgifter |  |
| `common.agents_this_computer_other_sessions` | Agents, this computer, other sessions, pull requests and pictures. | Agenter, den här datorn, andra sessioner, pull requests och bilder. |  |
| `common.all_projects` | All projects | Alla projekt |  |
| `common.all_sessions` | All sessions | Alla sessioner |  |
| `common.all_settings` | All settings | Alla inställningar |  |
| `common.allow_once` | Allow once | Tillåt en gång |  |
| `common.allowed` | allowed | tillåtet |  |
| `common.an_estimate_from_its_token_counts` | An estimate from its token counts, read after each step the agent takes. | En uppskattning från dess tokenantal, läst efter varje steg som agenten tar. |  |
| `common.anomaly_sentinel` | Odd-change warning | Varning för udda ändringar |  |
| `common.answer_shape` | Answer shape | Svarsform |  |
| `common.any_time` | Any time | När som helst |  |
| `common.apply` | Apply | Använd |  |
| `common.are_my_instruction_files_too_big` | Are my instruction files too big? | Är mina instruktionsfiler för stora? |  |
| `common.arrange_cards` | Arrange cards | Ordna korten |  |
| `common.ask` | Ask | Fråga |  |
| `common.asked_claude_to_check_its_claims` | Asked Claude to check its claims | Bad Claude kontrollera sina påståenden |  |
| `common.asks_claude_to_write_the_plan_as` | Asks Claude to write the plan as tasks in {file}. | Ber Claude skriva planen som uppgifter i {file}. |  |
| `common.asks_you` | Asks you | Frågar dig |  |
| `common.assumption_check` | Assumption review | Antagandegranskning |  |
| `common.at_a_quiet_moment_from_about` | At a quiet moment, once the session fills {from}% of its window (Settings, Compacting, Advise compacting from), when the saving is bigger than the cost of the summary. The cost is an estimate. | Vid en lugn stund, när sessionen fyller {from} % av sitt fönster (Inställningar, Komprimering, Råd om komprimering från), när vinsten är större än kostnaden för sammanfattningen. Kostnaden är en uppskattning. |  |
| `common.at_once` | At once | Samtidigt |  |
| `common.at_once_auto_as_many_as_this` | Starts as many as this Mac has room for. | Startar så många som den här datorn har plats för. |  |
| `common.attention` | Attention | Uppmärksamhet |  |
| `common.auto_fits_the_screen_fewer_columns` | Auto fits the screen. Fewer columns give wider cards with more rows. | Auto passar skärmen. Färre kolumner ger bredare kort med fler rader. |  |
| `common.auto_uses_the_roles_model` | Auto uses the role’s model. | Auto använder rollens modell. |  |
| `common.autopilot` | Autopilot | Autopilot |  |
| `common.away_digest` | Away recap | Frånvarorapport |  |
| `common.back` | Back | Tillbaka |  |
| `common.balanced_recommended` | Balanced (recommended) | Balanserad (rekommenderas) |  |
| `common.before_a_big_task_the_cockpit` | Before a big task, vaken can suggest a short plan (Suggest), or tell Claude to write one and wait for your yes (Ask). A plan is cheaper than a redo. It acts only while few files have changed. | Före en stor uppgift kan vaken föreslå en kort plan (Föreslå), eller be Claude skriva en och vänta på ditt ja (Fråga). En plan är billigare än att göra om. Den verkar bara medan få filer har ändrats. |  |
| `common.before_a_step_changes_a_file` | Before a step changes a file, vaken keeps a copy of it. /vaken-undo lists the last changed files, and /vaken-undo last previews putting back everything changed since your last message. Nothing is restored until you add yes. | Innan ett steg ändrar en fil sparar vaken en kopia av den. /vaken-undo listar de senast ändrade filerna, och /vaken-undo last visar vad som skulle läggas tillbaka av allt som ändrats sedan ditt senaste meddelande. Inget återställs förrän du lägger till yes. |  |
| `common.budget` | Budget | Budget |  |
| `common.builder` | Builder | Byggare |  |
| `common.builder_model` | Builder model | Modell för byggare |  |
| `common.by_itself` | by itself | av sig själv |  |
| `common.cache` | Cache | Cache |  |
| `common.can_claude_ask_the_cockpit_things` | Can Claude ask vaken things? | Kan Claude fråga vaken? |  |
| `common.cards` | Cards | Kort |  |
| `common.care` | Care | Skötsel |  |
| `common.careful` | Careful | Försiktig |  |
| `common.change_in_settings` | Change in Settings | Ändra i inställningar |  |
| `common.changes_to_look_at` | Changes to look at | Ändringar att titta på |  |
| `common.cheap` | Cheap | Billig |  |
| `common.check` | Check | Kontrollera |  |
| `common.check_after_each_task` | Check after each task | Kontroll efter varje uppgift |  |
| `common.check_runs` | Check runs | Körda kontroller |  |
| `common.checks_after_the_last_change` | Checks after the last change | Kontroller efter senaste ändringen |  |
| `common.claims` | Claims | Påståenden |  |
| `common.claude_can_ask_the_cockpit_a` | Claude can ask vaken a question: what it has cost, what the budget is, whether the tests passed after the last edit, what the goal is. It can only read; it cannot change anything. | Claude kan ställa en fråga till vaken: vad det har kostat, vad budgeten är, om testerna gick igenom efter den senaste ändringen, vad målet är. Den kan bara läsa; den kan inte ändra något. |  |
| `common.claude_keeps_a_saved_copy_of` | Claude keeps a saved copy of your session for about an hour on a subscription plan, and 5 minutes when you pay with usage credits. While the copy is fresh, each answer costs much less. After a long quiet break it goes stale, and the next answer costs full price. | Claude sparar en kopia av din session i ungefär en timme på ett abonnemang, och 5 minuter när du betalar med användningskrediter. Det är cachen. Medan kopian är färsk kostar varje svar mycket mindre. Efter en lång paus blir den gammal, och nästa svar kostar fullt pris. |  |
| `common.claude_keeps_short_notes_about_you` | Claude keeps short notes about you and your project in files, so it remembers between sessions. /vaken-memory shows them in plain words. To correct one, tell Claude "forget this" or "change that note", or edit the file yourself. | Claude sparar korta anteckningar om dig och ditt projekt i filer, så att den minns mellan sessioner. /vaken-memory visar dem med enkla ord. För att rätta en, säg till Claude "glöm det här" eller "ändra den anteckningen", eller ändra filen själv. |  |
| `common.claude_re_reads_the_whole_chat` | Claude re-reads the whole session on every answer. The longer the session, the more usage each answer takes. | Claude läser om hela sessionen varje svar. Ju längre sessionen är, desto mer användning drar varje svar. |  |
| `common.claude_reads_your_claude_md_files` | Claude reads your CLAUDE.md files at the start of every session and keeps them in mind on every answer. A big file costs usage all day. /vaken-help run diet lists the files, their size, and lines that appear twice. | Claude läser dina CLAUDE.md-filer i början av varje session och håller dem i minnet varje svar. En stor fil kostar användning hela dagen. /vaken-help run diet listar filerna, deras storlek och rader som står två gånger. |  |
| `common.claude_writes_a_short_summary_of` | Claude writes a short summary of the session and keeps that instead of the long session. Your files do not change. Only the session history gets shorter. | Claude skriver en kort sammanfattning av sessionen och behåller den i stället för hela sessionen. Dina filer ändras inte. Bara sessionshistoriken blir kortare. |  |
| `common.clear_finished` | Clear finished | Rensa klara |  |
| `common.cockpit_audit_lists_what_the_cockpit` | /vaken-help run audit lists what vaken did and which steps you allowed, for the last 500 actions. /vaken-help run audit export writes it to a file you can keep or share. | /vaken-help run audit listar vad vaken gjorde och vilka steg du tillät, för de 500 senaste åtgärderna. /vaken-help run audit export skriver det till en fil som du kan spara eller dela. |  |
| `common.cockpit_away_on_2h_tells_the` | /vaken-away on 2h tells vaken you are gone for two hours. It sets the away policy to Careful and the cost budget to Stop, and puts both back when it ends. /vaken-away off ends it early. | /vaken-away on 2h säger till vaken att du är borta i två timmar. Den sätter regeln för frånvaro till Försiktig och kostnadsbudgeten till Stoppa, och sätter tillbaka båda när det tar slut. /vaken-away off avslutar det i förtid. |  |
| `common.cockpit_brief_prints_what_the_next` | A handoff note is a note for the next session: /vaken-help run brief prints it, with goal, branch, changed files, checks and open questions, and each line says if git or a check backs it. /vaken-help run packet saves the same facts as a file in the project. | En överlämning är en anteckning till nästa session: /vaken-help run brief skriver ut den, med mål, gren, ändrade filer, kontroller och öppna frågor, och varje rad säger om git eller en kontroll stöder den. /vaken-help run packet sparar samma fakta som en fil i projektet. |  |
| `common.cockpit_checkpoint_name_saves_the` | /vaken-undo checkpoint name saves the state of every file changed so far. /vaken-undo name &lt;name&gt; shows what going back would do. Vaken never deletes a file for you. | /vaken-undo checkpoint name sparar läget för varje fil som ändrats hittills. /vaken-undo name &lt;name&gt; visar vad en återgång skulle göra. Vaken tar aldrig bort en fil åt dig. |  |
| `common.cockpit_confidence_gives_one_number` | /vaken-help run confidence gives one number made only of evidence, with its list. /vaken-help run intent says what you asked, what was delivered, what is extra and what is missing. /vaken-ship queue puts finished changes in order of risk. /vaken-ship heat says where to look first. | /vaken-help run confidence ger ett tal som bara bygger på belägg, med listan bakom. /vaken-help run intent säger vad du bad om, vad som levererades, vad som är extra och vad som saknas. /vaken-ship queue ordnar färdiga ändringar efter risk. /vaken-ship heat säger var du ska titta först. |  |
| `common.cockpit_fit_20_says_whether_a` | /vaken-usage fit 20 says whether a job that uses about 20% of your plan window fits, or when to start it. | /vaken-usage fit 20 säger om ett jobb som använder ungefär 20 % av ditt planfönster ryms, eller när du ska starta det. |  |
| `common.cockpit_halt_stops_every_step_that` | /vaken-pause pauses shell commands, file edits, tools from other apps, agents, web fetches and skills in this session, until you run /vaken-pause off. /vaken-guard allow once lets the next stopped step through. | /vaken-pause pausar skalkommandon, filändringar, verktyg från andra appar, agenter, webbhämtningar och färdigheter i den här sessionen, tills du kör /vaken-pause off. /vaken-guard allow once släpper igenom nästa stoppade steg. |  |
| `common.cockpit_health` | Vaken health | Vaken-hälsa |  |
| `common.cockpit_inbox_lists_what_waits_for` | /vaken inbox lists what waits for you in every session: stopped steps, questions, finished changes you have not looked at. Each line says which session, how long, and what you can do. It cannot press OK for you. | /vaken inbox listar vad som väntar på dig i varje session: stoppade steg, frågor, färdiga ändringar du inte har tittat på. Varje rad säger vilken session, hur länge och vad du kan göra. Den kan inte trycka OK åt dig. |  |
| `common.cockpit_outbox_lists_what_left_this` | /vaken-guard outbox lists what left this computer this answer. /vaken-away on makes vaken stop risky steps by itself while you are gone. It needs While away set to Careful. | /vaken-guard outbox listar vad som lämnade datorn det här svaret. /vaken-away on gör att vaken själv stoppar riskabla steg medan du är borta. Det kräver att När du är borta är satt till Försiktig. |  |
| `common.cockpit_park_idea_keeps_a_side` | /vaken-memory park &lt;idea&gt; keeps a side idea for later without interrupting Claude. /vaken-memory park lists them. /vaken-memory park send 2 puts idea 2 into the prompt box. The ideas are text you write; they stay on your computer, one shelf per project. | /vaken-memory park &lt;idea&gt; sparar en sidoidé till senare utan att avbryta Claude. /vaken-memory park listar dem. /vaken-memory park send 2 lägger idé 2 i promptrutan. Idéerna är text du skriver; de stannar på din dator, en hylla per projekt. |  |
| `common.cockpit_preset_lists_five_styles` | /vaken-settings preset lists seven styles: Only alerts (quiet), Recommended (balanced, or type recommended), Everything useful (full), Ask before risky steps (careful), Save usage (thrifty), Every check on (everything) and No coding (backoffice). Pick one to see what changes, then add "yes". | /vaken-settings preset listar sju lägen: Bara larm (quiet), Rekommenderat (balanced, eller skriv recommended), Allt användbart (full), Fråga före riskabla steg (careful), Spara användning (thrifty), Alla kontroller på (everything) och Ingen kod (backoffice). Välj ett för att se vad som ändras, och lägg sedan till "yes". |  |
| `common.cockpit_reflect_looks_at_what_the` | /vaken-memory reflect looks at what vaken caught today (loops, stopped steps, unproven claims, drift) and, when the same thing happened twice or more, suggests a rule to write in your CLAUDE.md. | /vaken-memory reflect tittar på vad vaken fångade i dag (loopar, stoppade steg, obevisade påståenden, kursavvikelse) och, när samma sak hänt två gånger eller mer, föreslår en regel att skriva i din CLAUDE.md. |  |
| `common.cockpit_resume_finds_a_session_by` | /vaken-resume finds a session by words in its title. /vaken-resume find searches what was said in your other sessions. /vaken-resume timeline, /vaken-today standup and /vaken-help run story tell what happened, from counts only. | /vaken-resume hittar en session på ord i dess titel. /vaken-resume find söker i vad som har sagts i dina andra sessioner. /vaken-resume timeline, /vaken-today standup och /vaken-help run story berättar vad som hände, bara utifrån antal. |  |
| `common.cockpit_steer_queue_puts_a_sentence` | /vaken-pause steer queue puts a sentence in a session's queue. When that session is quiet, the sentence shows dim in its prompt box, and you press Tab to take it. /vaken-pause steer stop pauses changes in this session. | /vaken-pause steer queue lägger en mening i en sessions kö. När sessionen är tyst visas meningen dämpad i dess promptruta, och du trycker Tab för att ta den. /vaken-pause steer stop pausar ändringar i den här sessionen. |  |
| `common.cockpit_tool` | Vaken tool | Vaken-verktyg |  |
| `common.cockpit_trust_lists_your_plugins` | /vaken-help run trust lists your plugins in plain words: what each one can do, from the engine's own scan of it. It also tells you when a plugin's version changed since the last session. | /vaken-help run trust listar dina tillägg med enkla ord: vad vart och ett kan göra, enligt motorns egen genomgång av det. Det säger också till när ett tilläggs version har ändrats sedan förra sessionen. |  |
| `common.cockpit_value_counts_what_the_cockpit` | /vaken-today value counts what vaken did for you in the last 7 days, in groups, and lists the blocks that did nothing. It counts what vaken wrote down. It does not measure money saved. | /vaken-today value räknar vad vaken gjort åt dig de senaste 7 dagarna, i grupper, och listar delarna som inte gjorde något. Den räknar det vaken skrev ner. Den mäter inte sparade pengar. |  |
| `common.cockpit_waits_shows_how_long_claude` | /vaken-today waits shows how long Claude waited for you today: for answers, for approvals, and after it finished. It shows where you are the bottleneck. | /vaken-today waits visar hur länge Claude väntade på dig i dag: på svar, på godkännanden och efter att den blev klar. Det visar var du är flaskhalsen. |  |
| `common.columns` | Columns | Kolumner |  |
| `common.command_list` | Command list | Kommandolista |  |
| `common.command_list_and_outside_text` | Safety: the command list and text from outside | Säkerhet: kommandolistan och text utifrån |  |
| `common.commands_edits_packages_tests` | Commands, edits, packages, tests. | Kommandon, ändringar, paket, tester. |  |
| `common.computer` | Computer | Dator |  |
| `common.confidence_score` | Confidence score | Säkerhetspoäng |  |
| `common.context_n` | context {n}% | kontext {n} % |  |
| `common.cost` | Cost | Kostnad |  |
| `common.could_not_ask_claude_from_here` | Could not ask Claude from here. Type it in the session. | Kunde inte fråga Claude härifrån. Skriv det i sessionen. |  |
| `common.could_not_show_the_undo_from` | Could not show the undo from here. Type /vaken-undo last in the session. | Kunde inte visa ångra härifrån. Skriv /vaken-undo last i sessionen. |  |
| `common.could_not_start_name_from_here` | Could not start /{name} from here. Type /{name} in the session. | Kunde inte starta /{name} härifrån. Skriv /{name} i sessionen. |  |
| `common.count_only` | Count only | Bara räkna |  |
| `common.crew` | Crew | Team |  |
| `common.daily_brief` | Daily recap | Dagssammanfattning |  |
| `common.dark_or_light_follows_the_app` | Dark or light follows the app. Warnings and words stay the same. | Mörkt eller ljust följer appen. Varningar och ord ändras inte. |  |
| `common.day_budget` | Day budget | Dagsbudget |  |
| `common.decision_log` | Decision log | Beslutslogg |  |
| `common.default` | Default | Standard |  |
| `common.definition_of_done` | Definition of done | Definition av klart |  |
| `common.delete` | Delete | Ta bort |  |
| `common.detail_level` | Detail level | Detaljnivå |  |
| `common.detail_level_accent_colour_and_which` | Detail level, accent colour and which cards show. | Detaljnivå, accentfärg och vilka kort som visas. |  |
| `common.details` | Details | Detaljer |  |
| `common.did_for_you` | Did for you | Gjort åt dig |  |
| `common.did_it_really_work` | Did it really work? | Fungerade det på riktigt? |  |
| `common.did_it_really_work_checks_claims` | Did it really work: checks, claims, goal. | Fungerade det på riktigt: kontroller, påståenden, mål. |  |
| `common.dismiss` | Dismiss | Avfärda |  |
| `common.do_the_steps_in_this_order` | Do the steps in this order. 1. Press Delete everything vaken stored (Settings, Advanced, at the bottom). Do it first: once the plugin is gone, the button is gone too. The first press only shows what would go. The second deletes it, and it cannot be undone. It removes your saved choices and notes, and the folder ~/.claude/cockpit with the copies of changed files that Undo uses. It keeps a pause that is on. 2. Remove the plugin: run claude plugin uninstall vaken@vaken in a terminal, then start a new session. 3. Vaken may have written files inside your projects. They stay, and you can delete them yourself: .claude/cockpit-packet.md (the note for the next session), .claude/cockpit-tasks.md, .claude/cockpit-eyes/, .claude/cockpit-decisions\*.md and .claude/cockpit-audit\*.md (with their numbered copies, such as cockpit-audit-2.md). Your CLAUDE.md and settings.json were never changed. | Gör stegen i den här ordningen. 1. Tryck på Ta bort allt som vaken har sparat (Inställningar, Avancerat, längst ned). Gör det först: när tillägget är borta är knappen borta. Första trycket visar bara vad som skulle tas bort. Andra trycket tar bort det, och det går inte att ångra. Det tar bort dina sparade val och anteckningar, och mappen ~/.claude/cockpit med kopiorna av ändrade filer som Ångra använder. En paus som är på finns kvar. 2. Ta bort tillägget: kör claude plugin uninstall vaken@vaken i en terminal och starta sedan en ny session. 3. Vaken kan ha skrivit filer i dina projekt. De finns kvar, och du kan ta bort dem själv: .claude/cockpit-packet.md (anteckningen till nästa session), .claude/cockpit-tasks.md, .claude/cockpit-eyes/, .claude/cockpit-decisions\*.md och .claude/cockpit-audit\*.md (med sina numrerade kopior, till exempel cockpit-audit-2.md). Din CLAUDE.md och settings.json har aldrig ändrats. |  |
| `common.does_it_count_the_rules_i` | Does it count the rules I wrote? | Räknar den reglerna jag skrivit? |  |
| `common.does_the_cockpit_still_work_after` | Does vaken still work after an update? | Fungerar vaken efter en uppdatering? |  |
| `common.dollars_per_day_over_all_sessions` | Dollars per day over the sessions vaken saw, as an estimate. | Dollar per dag för de sessioner vaken har sett, som en uppskattning. |  |
| `common.dollars_per_session_as_an_estimate` | Dollars per session, as an estimate. | Dollar per session, som en uppskattning. |  |
| `common.done` | Done | Klar |  |
| `common.done_closes_it_it_stays_in` | Done closes it. It stays in Past runs. | Klar stänger den. Den finns kvar i Tidigare körningar. |  |
| `common.done_so_far` | Done so far | Klart hittills |  |
| `common.drift_watch` | Goal drift warning | Varning för målavvikelse |  |
| `common.drift_watch_tells_you_when_many` | Goal drift warning tells you when many edits land in folders far from your goal. Odd-change warning tells you when one file is edited again and again, when many calls change no file, or when one kind of command keeps failing. Both warn once and tell Claude. | Varning för målavvikelse säger till när många ändringar hamnar i mappar långt från ditt mål. Varning för udda ändringar säger till när en fil ändras om och om igen, när många anrop inte ändrar någon fil, eller när ett slags kommando ständigt misslyckas. Båda varnar en gång och säger till Claude. |  |
| `common.env_names` | Variable names | Variabelnamn |  |
| `common.error_translator` | Error translator | Felförklaring |  |
| `common.every_helpful_check_is_on` | Every helpful check is on. | Varje hjälpsam kontroll är på. |  |
| `common.everything` | Everything | Allt |  |
| `common.explain_simply` | Explain simply | Förklara enkelt |  |
| `common.eyes` | Page pictures | Sidbilder |  |
| `common.fable` | Fable | Fable |  |
| `common.file_overlap` | File overlap | Filkrock |  |
| `common.file_overlap_warns_about_one_file` | File overlap warns about one file that another session edited. This warns about the whole folder, also before anyone edits. | Filkrock varnar för en fil som en annan session ändrat. Det här varnar för hela mappen, även innan någon ändrar något. |  |
| `common.find_and_replay_your_sessions` | Find and replay your sessions | Hitta och spela upp dina sessioner |  |
| `common.fix` | Fix | Laga |  |
| `common.fixer` | Fixer | Fixare |  |
| `common.fixer_model` | Fixer model | Modell för fixare |  |
| `common.fixes_what_failed_with_the_strongest` | Fixes what failed, with the strongest model. | Lagar det som misslyckades, med den starkaste modellen. |  |
| `common.fold_card` | Fold card | Dölj kortet |  |
| `common.follow_all_projects` | Follow All projects | Följ Alla projekt |  |
| `common.for_a_message_of_25_words` | For a message of 25 words or more, this asks Claude to list its assumptions in at most 4 short lines that start with "Assumed:" before it changes files. After the answer the line above the chat box shows how many. /vaken-explain assumptions lists them. | För ett meddelande på 25 ord eller mer ber detta Claude lista sina antaganden i högst 4 korta rader som börjar med "Assumed:" innan filer ändras. Efter svaret visar raden ovanför chattrutan hur många. /vaken-explain assumptions listar dem. |  |
| `common.freed` | freed | frigjorda |  |
| `common.fresh_start_nudge` | Fresh-start nudge | Påminnelse om ny session |  |
| `common.from_cheaper_to_stronger_haiku_sonnet` | From cheaper to stronger: Haiku, Sonnet, Opus, Fable. | Från billigare till starkare: Haiku, Sonnet, Opus, Fable. |  |
| `common.go_on` | Go on | Fortsätt |  |
| `common.go_on_by_itself_after_the` | Go on by itself after the reset, or wait for you. | Fortsätt själv efter återställningen, eller vänta på dig. |  |
| `common.guard` | Risky steps | Riskabla steg |  |
| `common.haiku` | Haiku | Haiku |  |
| `common.halt_all_and_allow_once` | Pause all and allow once | Pausa allt och tillåt en gång |  |
| `common.halted` | Paused for safety | Pausad för säkerhets skull |  |
| `common.health` | Health | Hälsa |  |
| `common.help` | Help | Hjälp |  |
| `common.help_intro` | Press a title to read it. One is open at a time. | Tryck på en rubrik för att läsa den. En är öppen åt gången. |  |
| `common.help_topic_care` | Keeping it healthy | Hålla det i form |  |
| `common.help_topic_memory` | Sessions and memory | Sessioner och minne |  |
| `common.help_topic_prompts` | Prompts and answers | Frågor och svar |  |
| `common.help_topic_safety` | Safety | Säkerhet |  |
| `common.help_topic_team` | Team and machine | Team och dator |  |
| `common.help_topic_usage` | Usage and cost | Användning och kostnad |  |
| `common.help_topic_work` | Is the work good? | Är arbetet bra? |  |
| `common.helper_agents_running_and_done` | Agents: running and done. | Agenter: pågår och klara. |  |
| `common.helper_models` | Agent models | Agentmodeller |  |
| `common.here_is_what_undo_would_put` | Here is what undo would put back. Nothing changed yet. | Här är vad ångra skulle lägga tillbaka. Inget har ändrats än. |  |
| `common.hide` | Hide | Dölj |  |
| `common.how_claude_shapes_its_answers_short` | How Claude shapes its answers: Short, or a Report (Done, Evidence, Next). | Hur Claude formar svaren: Kort, eller en Rapport (Klart, Belägg, Nästa). |  |
| `common.how_do_i_keep_spending_down` | How do I keep spending down? | Hur håller jag nere kostnaden? |  |
| `common.how_do_i_save_usage_with` | How do I save usage with cheaper models? | Hur sparar jag användning med billigare modeller? |  |
| `common.how_does_it_help_me_merge` | How does it help me merge and ship? | Hur hjälper den mig att slå ihop och leverera? |  |
| `common.how_does_it_notice_when_claude` | How does it notice when Claude drifts? | Hur märker den när Claude driver iväg? |  |
| `common.how_it_differs_from_file_overlap` | Same folder or same file: how the warnings differ | Samma mapp eller samma fil: så skiljer sig varningarna |  |
| `common.how_it_runs_usual_choices` | How it runs (usual choices) | Så körs det (vanliga val) |  |
| `common.how_long_did_claude_wait_for` | How long did Claude wait for me? | Hur länge väntade Claude på mig? |  |
| `common.how_many_helpers_can_run_at` | How many agents can run at once? | Hur många agenter kan köra samtidigt? |  |
| `common.how_many_helpers_run_at_the` | How many agents run at the same time. | Hur många agenter som körs samtidigt. |  |
| `common.how_much_cards_show_a_cards` | How much each card shows. A card's own Show more button changes only that card. | Hur mycket varje kort visar. Ett korts egen knapp Visa mer ändrar bara det kortet. |  |
| `common.how_much_of_your_plan_is` | How much of your plan is used. | Hur mycket av din plan som är använd. |  |
| `common.how_sure_is_claude_and_what` | How sure is Claude, and what comes first? | Hur säker är Claude, och vad kommer först? |  |
| `common.if_the_plan_limit_stops_claude` | If the plan limit stops Claude in the middle of work, Remind tells you when the window resets. Resume also sends "continue" for you then. It stops after 3 resumes a day, and never if you wrote something meanwhile or the limit still reads full. /vaken-help run after-limit off cancels the wait; off all cancels every wait. | Om planens gräns stoppar Claude mitt i arbetet berättar Påminn när fönstret återställs. Återuppta skickar också "continue" åt dig då. Det slutar efter 3 återupptaganden per dag, och aldrig om du har skrivit något under tiden eller gränsen fortfarande är full. /vaken-help run after-limit off avbryter väntan; off all avbryter all väntan. |  |
| `common.if_you_ask_for_the_same` | If you ask for the same kind of thing three times, vaken offers to save it as a skill, so you type one word next time. It keeps only a short code of each request, not the words. /vaken-help run coach shows the offer. | Om du ber om samma sorts sak tre gånger erbjuder vaken att spara den som en skill, så att du skriver ett enda ord nästa gång. Den sparar bara en kort kod för varje begäran, inte orden. /vaken-help run coach visar erbjudandet. |  |
| `common.if_your_claude_md_says_never` | If your CLAUDE.md says "Never \`pkill\`", vaken counts each shell command that starts with pkill. In Warn mode it shows it above the chat box, and Claude hears it only when Notes to Claude is set to All checks. /vaken-memory rules lists the rules it watches. | Om din CLAUDE.md säger "Never \`pkill\`" räknar vaken varje skalkommando som börjar med pkill. Med Varna visar den det ovanför chattrutan, och Claude hör det bara när Noteringar till Claude står på Alla kontroller. /vaken-memory rules listar reglerna den bevakar. |  |
| `common.in_plain_words` | In plain words | Med enkla ord |  |
| `common.in_use` | In use | Används |  |
| `common.instruction_check` | Instruction review | Instruktionsgranskning |  |
| `common.it_counts_the_skills_you_and` | It counts the skills you and Claude used in the last 7 days (names and counts only, never what was said). It also says how many skills are listed in Claude's memory, what that list costs, and which ones you did not use this week. A skill you never use only costs memory. | Det räknar färdigheterna du och Claude använde de senaste 7 dagarna (bara namn och antal, aldrig vad som sades). Det säger också hur många färdigheter som är listade i Claudes minne, vad listan kostar och vilka du inte använde den här veckan. En färdighet du aldrig använder tar bara minne. |  |
| `common.it_is_starting_this_page_updates_by` | It is starting. This page updates by itself. | Den startar. Sidan uppdateras av sig själv. |  |
| `common.it_keeps_counts_kinds_exit_codes` | It keeps counts, kinds, exit codes and times. It never keeps a command, its output, or Claude's words. The only texts it keeps are the goal (the key words of your first message, or the sentence you type after /vaken-tasks goal, with secrets hidden) and the name of the last file that was edited. | Det sparar antal, slag, felkoder och tider. Det sparar aldrig ett kommando, dess utdata eller Claudes ord. De enda texter det sparar är målet (nyckelorden i ditt första meddelande, eller meningen du skriver efter /vaken-tasks goal, med hemligheter dolda) och namnet på den senast ändrade filen. |  |
| `common.it_never_fires_for_a_command` | It never fires for a command that starts with /, or for a message that continues the work (also, and then, continue, next). It shows at most once in 2 hours. /vaken-explain fresh explains the last decision. | Den visas aldrig för ett kommando som börjar med /, eller för ett meddelande som fortsätter arbetet (också, och sen, fortsätt, nästa). Den visas högst en gång på 2 timmar. /vaken-explain fresh förklarar det senaste beslutet. |  |
| `common.it_runs_small_programs_every_few` | It runs small programs every few minutes to read memory and the processor. | Den kör små program med några minuters mellanrum för att läsa minne och processor. |  |
| `common.it_says_how_many_more_helper` | It says how many more agents this computer can run now. It takes the smallest of: free memory (about 1.5 GB per agent), idle processor (about 2 cores per agent) and the limit you set, if you set one. It says Full when memory is tight, heat slows the processor, or the battery is low. The task runner waits while it is full. | Det säger hur många fler agenter den här datorn kan köra nu. Det tar det minsta av: ledigt minne (ungefär 1,5 GB per agent), ledig processor (ungefär 2 kärnor per agent) och den gräns du satt, om du satt någon. Det säger Full när minnet är trångt, värme gör processorn långsam eller batteriet är lågt. Uppgiftskörningen väntar medan det är fullt. |  |
| `common.it_watches_steps_that_reach_outside` | It watches steps that reach outside this computer, such as messages, payments, pull requests and cloud changes, and secrets read or sent. In Warn it tells Claude after the step, and in Stop it stops the step until you allow it. Left on its own setting, a secret step stops only when Claude Code would not ask you first (if vaken cannot tell, it warns). | Den bevakar steg som når utanför den här datorn, som meddelanden, betalningar, pull requests och molnändringar, och hemligheter som läses eller skickas. I Varna säger den till Claude efter steget, och i Stoppa stoppar den steget tills du tillåter det. På sin egen inställning stoppas ett hemligt steg bara när Claude Code inte skulle fråga dig först (om vaken inte kan avgöra det varnar den). |  |
| `common.its_own_copy_of_the_project` | Its own copy of the project, on its own branch. | En egen kopia av projektet, på en egen gren. |  |
| `common.keep_chat_cheap` | Keep session cheap | Håll sessionen billig |  |
| `common.keep_mac_awake` | Keep Mac awake | Håll Macen vaken |  |
| `common.keep_work` | Keep work | Behåll arbetet |  |
| `common.keeping_the_session_cheap` | Keeping the session cheap | Hålla sessionen billig | Help title, was What the keeper does |
| `common.laptop_gauge` | Computer load | Datorbelastning |  |
| `common.layouts` | Layouts | Layouter |  |
| `common.left_of_the_week_left_for` | {left}% of the week left for {days} days: about {per}% a day. | {left} % av veckan kvar för {days} dagar: ungefär {per} % om dagen. |  |
| `common.left_of_the_week_left_for_2` | {left}% of the week left for the last day. | {left} % av veckan kvar för sista dagen. |  |
| `common.limit_warning` | Limit warning | Varning för gräns |  |
| `common.limits_budget_and_this_chat_shortening_2` | Limits, budget and this session: compacting, cache, plain mode and answer shape. | Gränser, budget och den här sessionen: komprimering, cache, enkelt läge och svarsform. |  |
| `common.line_above_the_chat_box` | Line above the chat box | Raden ovanför chattrutan |  |
| `common.load_the_task_file` | Load the task file | Läs in uppgiftsfilen |  |
| `common.look` | Look | Utseende |  |
| `common.look_and_cards` | Look and cards | Utseende och kort |  |
| `common.loop_breaker` | Loop breaker | Loopbrytare |  |
| `common.making_it_simpler` | Making it simpler… | Gör det enklare… |  |
| `common.many_helper_agents_at_once_slow` | Many agents at once slow your laptop and use your plan fast. By default vaken follows the computer: when the computer reading says it is full, Warn tells you and Stop stops the next one. You can set your own limit under Most at once, counted across all your sessions. | Många agenter samtidigt gör datorn långsam och förbrukar din plan snabbt. Som standard följer vaken datorn: när datoravläsningn säger att den är full berättar Varna det för dig och Stoppa hindrar nästa agent. Du kan sätta din egen gräns under Flest samtidigt, räknat över alla dina sessioner. |  |
| `common.memory_processor_and_room_for_helpers` | Memory, processor and room for agents. | Minne, processor och plats för agenter. |  |
| `common.merge_order_says_which_pull_request` | Merge order says which pull request to merge first. CI fix writes a prompt from the failing check, for you to send, and stops after 3 tries a day. The branch digest lists your changes, riskiest first. The orphan finder lists leftover programs and the command to stop each one; you run it. | Ordning för ihopslagning säger vilken pull request som ska slås ihop först. CI-fix skriver en prompt från den misslyckade kontrollen, som du skickar själv, och slutar efter 3 försök per dag. Grensammanfattningen listar dina ändringar, de mest riskabla först. Sökaren efter föräldralösa program listar kvarglömda program och kommandot för att stoppa vart och ett; du kör det. |  |
| `common.migrations` | Migrations | Migreringar |  |
| `common.model` | Model | Modell |  |
| `common.model_choice` | Model choice | Modellval |  |
| `common.most_at_once` | Most at once | Flest samtidigt |  |
| `common.most_cost_for_the_run` | Most cost for the run | Högsta kostnad för körningen |  |
| `common.most_cost_per_helper` | Most cost per agent | Högsta kostnad per agent |  |
| `common.n_file_changed` | {n} file changed | {n} fil ändrad |  |
| `common.n_files_changed` | {n} files changed | {n} filer ändrade |  |
| `common.n_files_preview` | {n} files · Preview | {n} filer · Visa först |  |
| `common.n_working` | {n} working | {n} arbetar |  |
| `common.name_it_optional` | Name it (optional) | Ge den ett namn (valfritt) |  |
| `common.named_checkpoints` | Going back to a point you saved | Gå tillbaka till en punkt du sparat |  |
| `common.native` | Native | Som appen |  |
| `common.needs_and_done` | Needs you and done | Behöver dig och klart |  |
| `common.needs_you` | Needs you | Behöver dig |  |
| `common.needs_you_list` | Needs you list | Behöver dig-lista |  |
| `common.new_packages` | New packages | Nya paket |  |
| `common.no_folder` | No folder | Ingen mapp |  |
| `common.no_helper_agents_seen_yet` | No agents seen yet. | Inga agenter än. |  |
| `common.no_helper_runs_now` | No agent runs now. | Ingen agent kör nu. |  |
| `common.no_other_session_is_active_now` | No other session is active now. | Ingen annan session är aktiv nu. |  |
| `common.no_other_session_is_running` | No other session is active now. | Ingen annan session är aktiv nu. |  |
| `common.no_progress_for_n_min` | No progress for {n} min | Inga framsteg på {n} min |  |
| `common.no_stopped_step_to_allow_it` | No stopped step to allow: it is older than 30 minutes. If Claude tries it again, allow it then. | Inget stoppat steg att tillåta: det är äldre än 30 minuter. Om Claude försöker igen, tillåt det då. |  |
| `common.no_task_run_yet_add_a` | No task run yet. Add a task, load the task file, or start from a template. | Ingen uppgiftskörning än. Lägg till en uppgift, läs in uppgiftsfilen eller börja från en mall. |  |
| `common.none_a_command_such_as_npm` | None. A command such as npm test runs in the task’s folder. | Ingen. Ett kommando som npm test körs i uppgiftens mapp. |  |
| `common.normal` | Normal | Normal |  |
| `common.not_reported_yet_it_shows_after` | Nothing to show yet. This appears after the first answer. | Inget att visa än. Det visas efter det första svaret. |  |
| `common.not_yet` | not yet | inte än |  |
| `common.nothing_changes_you_have_this_already` | Nothing changes: you have this already. | Inget ändras: du har redan detta. |  |
| `common.nothing_to_show_right_now` | Nothing to show right now. | Inget att visa just nu. |  |
| `common.nothing_yet_what_the_cockpit_does` | Nothing yet. Things vaken does for you, like compacting a long session, show up here. | Inget än. Sådant vaken gör åt dig, som att komprimera en lång session, visas här. |  |
| `common.notices` | Notices | Notiser |  |
| `common.now` | now | nu |  |
| `common.now_2` | Now | Nu |  |
| `common.of_context_used` | of context used | av kontexten använd |  |
| `common.on_your_first_prompt_of_a` | On your first prompt of a day, one line shows above the chat box: how many other sessions wait for you, what yesterday cost, and what vaken did. /vaken-today says the same any time. | Vid ditt första meddelande för dagen visas en rad ovanför chattrutan: hur många andra sessioner som väntar på dig, vad i går kostade och vad vaken gjorde. /vaken-today säger samma sak när som helst. |  |
| `common.only_this_project` | Only this project. | Bara det här projektet. |  |
| `common.only_your_folders` | Only your folders | Bara dina mappar |  |
| `common.open_settings` | Open settings | Öppna inställningar |  |
| `common.open_settings_jump` | Open Settings › | Öppna Inställningar › |  |
| `common.open_the_runner` | Task runs › | Körningar › |  |
| `common.opus` | Opus | Opus |  |
| `common.other_sessions` | Other sessions | Andra sessioner |  |
| `common.outbox` | Held messages | Stoppade meddelanden |  |
| `common.outbox_and_away` | Held messages and away | Stoppade meddelanden och när du är borta |  |
| `common.outside_actions` | Outside actions | Åtgärder utåt |  |
| `common.outside_text` | Text from the web | Text från webben |  |
| `common.own_folder_copy` | Own folder copy | Egen mappkopia |  |
| `common.past_it_the_run_pauses` | Past that, the run pauses. | Över detta belopp pausas körningen. |  |
| `common.past_runs` | Past runs | Tidigare körningar |  |
| `common.pause` | Pause | Pausa |  |
| `common.phone` | Phone | Telefon |  |
| `common.pictures` | Pictures | Bilder |  |
| `common.pin` | Pin | Fäst |  |
| `common.plain_mode` | Plain mode | Enkelt läge |  |
| `common.plain_mode_asks_claude_to_use` | Plain mode asks Claude to use short sentences and common words, to explain hard words, and to give you at most two options with its pick. It takes effect from the next message. /vaken-help glossary explains the words vaken uses. | Enkelt läge ber Claude använda korta meningar och enkla ord, förklara svåra ord och ge dig högst två val med sitt förslag. Det gäller från nästa meddelande. /vaken-help glossary förklarar orden som vaken använder. |  |
| `common.plan` | Plan | Plan |  |
| `common.plan_and_cost` | Plan and cost | Plan och kostnad |  |
| `common.plan_first` | Plan first | Plan först |  |
| `common.plan_limits` | Plan limits | Gränser i din plan |  |
| `common.plan_to_tasks` | Plan to tasks | Plan till uppgifter |  |
| `common.pr_and_checks` | PR and checks | PR och kontroller |  |
| `common.pr_and_checks_asks_gh_about` | It reads these two things so it can warn you early, and for no other reason. PR and checks asks gh about your branch at most every 2 minutes and says it in plain words, with the time left and whether main is red. The computer reading is on by default (Settings turns it off): it reads memory, swap, battery and heat every 3 minutes (every minute while agents run) and says when your laptop is short of memory. | Den läser de här två sakerna för att kunna varna dig i tid, och av ingen annan anledning. PR och kontroller frågar gh om din gren högst var 2:a minut och berättar det med enkla ord, med tid kvar och om main är röd. Datorbelastningen är på som standard (Inställningar stänger av den): den läser minne, swap, batteri och värme var 3:e minut (varje minut medan agenter kör) och säger till när datorn har ont om minne. |  |
| `common.pr_merged` | PR merged | PR ihopslagen |  |
| `common.pr_opened` | PR opened | PR öppnad |  |
| `common.press_a_style_to_see_what` | Press a style to see what it changes. Nothing changes until you press Apply. | Tryck på ett läge för att se vad det ändrar. Inget ändras förrän du trycker Använd. |  |
| `common.problems_first` | Problems first | Problem först |  |
| `common.prompt_check` | Prompt review | Promptgranskning |  |
| `common.prompt_check_plan_first_and_your` | Prompt review, plan first and your rules. | Promptgranskning, plan först och dina regler. |  |
| `common.prompts` | Prompts | Prompter |  |
| `common.prompts_and_memory` | Prompts and memory | Prompter och minne |  |
| `common.proof` | Checks | Kontroller |  |
| `common.quiet` | Turn off | Stäng av |  |
| `common.quiet_alert` | Idle alert | Inaktivvarning |  |
| `common.quiet_hours` | Hours without notices | Timmar utan notiser |  |
| `common.reads_a_change_and_says_if` | Reads a change and says if it is good. | Läser en ändring och säger om den är bra. |  |
| `common.reads_and_reports_changes_no_file` | Reads and reports. Changes no file. | Läser och rapporterar. Ändrar inga filer. |  |
| `common.reads_and_reports_it_changes_no` | Reads and reports. It changes no file. | Läser och rapporterar. Ändrar inga filer. |  |
| `common.reads_each_finished_task_and_writes` | Reads each finished task and writes 3 lines. | Läser varje färdig uppgift och skriver 3 rader. |  |
| `common.reads_file_in_your_project_and_adds` | Reads {file} in your project and adds its tasks. | Läser {file} i ditt projekt och lägger till dess uppgifter. |  |
| `common.recap` | Recap | Sammanfattning |  |
| `common.remind` | Remind | Påminn |  |
| `common.remove_task` | Remove task | Ta bort uppgiften |  |
| `common.removing_vaken` | Removing vaken | Ta bort vaken |  |
| `common.rename` | Rename | Byt namn |  |
| `common.repeated_failures` | Repeated failures | Upprepade fel |  |
| `common.replace` | Replace | Ersätt |  |
| `common.replace_the_n_tasks_on_this` | Replace the {n} tasks on this page with the template {name}? | Ersätta de {n} uppgifterna på sidan med mallen {name}? |  |
| `common.report` | Report | Rapport |  |
| `common.researcher` | Researcher | Utforskare |  |
| `common.researcher_model` | Researcher model | Modell för utforskare |  |
| `common.reset_to_defaults` | Reset to defaults | Återställ till standard |  |
| `common.resume` | Resume | Återuppta |  |
| `common.review_each_task` | Review each task | Granska varje uppgift |  |
| `common.reviewer` | Reviewer | Granskare |  |
| `common.reviewer_model` | Reviewer model | Modell för granskare |  |
| `common.risky_commands` | Risky commands | Riskabla kommandon |  |
| `common.risky_steps_loops_and_proof_more` | Risky steps, loops and checks. More in Advanced. | Riskabla steg, loopar och kontroller. Mer under Avancerat. |  |
| `common.role` | Role | Roll |  |
| `common.roles` | Roles | Roller |  |
| `common.rose` | Rose | Rosa |  |
| `common.rule_meter` | Rules count | Regelräknare |  |
| `common.rules` | Rules | Regler |  |
| `common.run_again` | Run again | Kör igen |  |
| `common.run_choices` | Run choices | Val för körningen |  |
| `common.run_only_the_tests_of_files` | Run only the tests of files touched. | Kör bara testerna för de filer som ändrats. |  |
| `common.safety` | Safety | Säkerhet |  |
| `common.same_folder` | Two in one folder | Två i samma mapp |  |
| `common.same_folder_as_you` | same folder as you | samma mapp som du |  |
| `common.save` | Save | Spara |  |
| `common.save_this_run_as_a_template` | Save this run as a template | Spara körningen som en mall |  |
| `common.saved_ideas` | Saved ideas | Sparade idéer | Help title, was What the parking lot is |
| `common.saves_usage_by_itself` | Saves usage by itself. | Sparar användning själv. |  |
| `common.say_something_to_this_helper` | Say something to this agent | Säg något till den här agenten |  |
| `common.say_the_last_answer_simpler` | Say the last answer simpler › | Säg det senaste svaret enklare › |  |
| `common.secrets` | Secrets | Hemligheter |  |
| `common.see_all_n` | See all {n} | Se alla {n} |  |
| `common.see_changes` | See changes | Se ändringar |  |
| `common.self_check` | Self-test | Självtest |  |
| `common.sending_a_message_to_another` | Sending a message to another session | Skicka ett meddelande till en annan session | Help title, was What steering does |
| `common.session_briefs` | Handoff notes | Överlämningar |  |
| `common.session_budget` | Session budget | Sessionsbudget |  |
| `common.sessions` | Sessions | Sessioner |  |
| `common.set` | Set | Sätt |  |
| `common.set_a_budget_per_session_and` | Set a budget per session and per day. At 80% vaken warns you. At 100% in Stop mode it stops costly calls such as agents until you type /vaken-usage budget extend. | Sätt en budget per session och per dag. Vid 80 % varnar vaken dig. Vid 100 % i läget Stoppa stoppar den dyra anrop, som agenter, tills du skriver /vaken-usage budget extend. |  |
| `common.set_up_a_task_run` | Run several tasks › | Kör flera uppgifter › |  |
| `common.settings` | Settings | Inställningar |  |
| `common.settings_cache_on_while_you_are` | Settings, Cache: On. The cache is the saved copy of your session (see What is the cache?). While you are away, it reads the saved copy just before it goes stale, up to 3 times. Your next answer then stays cheap. Each read costs a little usage. It shows under Autopilot. | Inställningar, Cache: På. Cachen är den sparade kopian av din session (se Vad är cachen?). När du är borta läser den den sparade kopian precis innan den blir gammal, upp till 3 gånger. Din nästa svar förblir då billig. Varje läsning kostar lite användning. Det visas under Autopilot. |  |
| `common.settings_shorten_the_chat_off_hides` | Settings, Compacting: Off hides the advice, Suggest shows it with a button, Watch only notes the moments it would compact, Auto compacts the session by itself when the work is at rest. | Inställningar, Komprimering: Av döljer rådet, Föreslå visar det med en knapp, Bara titta skriver ner stunderna den skulle komprimera, Auto komprimerar sessionen av sig själv när arbetet vilar. |  |
| `common.shared_ports` | Shared ports | Delade portar |  |
| `common.short` | Short | Kort |  |
| `common.short_asks_claude_to_lead_with` | Short asks Claude to lead with the result in one sentence, then at most 8 lines. Report asks for three parts: Done, Evidence, Next. Default adds nothing. It works with Plain mode. It takes effect from the next message. /vaken-settings shape shows it and changes it. | Kort ber Claude börja med resultatet i en mening och sedan högst 8 rader. Rapport ber om tre delar: Klart, Bevis, Nästa. Standard lägger inte till något. Den fungerar med Enkelt läge. Den gäller från nästa meddelande. /vaken-settings shape visar den och ändrar den. |  |
| `common.shorten_at_rest_last_look` | Compact when idle, last look: | Komprimera när det är lugnt, senaste titt: |  |
| `common.shorten_from` | Advise compacting from | Råd om komprimering från |  |
| `common.shorten_the_chat` | Compacting | Komprimering |  |
| `common.shortened_the_chat` | Compacted the session | Komprimerade sessionen |  |
| `common.shortening` | Compacting… | Komprimerar… |  |
| `common.shortening_the_chat` | Compacting the session | Komprimerar sessionen |  |
| `common.show` | Show | Visa |  |
| `common.show_fewer` | Show fewer | Visa färre |  |
| `common.show_less` | Show less | Visa mindre |  |
| `common.show_more` | Show more | Visa mer |  |
| `common.show_n_more` | Show {n} more | Visa {n} till |  |
| `common.show_n_older` | Show {n} older | Visa {n} äldre |  |
| `common.skill_coach` | Skill coach | Färdighetscoach |  |
| `common.small_details_from_early_in_the` | Small details from early in the session. If Claude needs one, ask it to read the file again. | Små detaljer från tidigt i sessionen. Om Claude behöver en, be den läsa filen igen. |  |
| `common.smaller_tasks_first_the_plan_window` | Smaller tasks first: the plan window is short | Mindre uppgifter först: planfönstret är kort |  |
| `common.sometimes_claude_tries_the_same_step_2` | Sometimes Claude tries the same step again and again, and it fails the same way each time. After 3 failures in a row, vaken tells Claude to stop and ask you. Settings &gt; Safety &gt; Loop breaker: Warn only tells Claude. Stop also stops the next try until you write a message. It shows under Autopilot. | Ibland försöker Claude samma steg om och om igen, och det misslyckas på samma sätt varje gång. Efter 3 misslyckanden i rad säger vaken åt Claude att stanna och fråga dig. Inställningar &gt; Säkerhet &gt; Loopbrytare: Varna säger bara till Claude. Stoppa stoppar också nästa försök tills du skriver ett meddelande. Det visas under Autopilot. |  |
| `common.sonnet` | Sonnet | Sonnet |  |
| `common.start_here` | Start here | Börja här |  |
| `common.start_run` | Start run | Starta körningen |  |
| `common.started_name` | Started /{name} | Startade /{name} |  |
| `common.starts_after` | Starts after | Startar efter |  |
| `common.starts_the_same_tasks_again` | Starts the same tasks again. This run stays in Past runs. | Startar samma uppgifter igen. Den här körningen finns kvar i Tidigare körningar. |  |
| `common.starts_up_to_n_at_once_no` | Starts {n} at a time until this Mac is read: turn on the computer reading in Settings &gt; Agents | Startar {n} åt gången tills den här datorn är avläst: slå på datoravläsningn i Inställningar &gt; Agenter |  |
| `common.starts_up_to_n_at_once_room` | Starts up to {n} at once: room for {n} on this Mac | Startar upp till {n} samtidigt: plats för {n} på den här datorn |  |
| `common.stop` | Stop | Stoppa |  |
| `common.stop_a_helper_after` | Stop an agent after | Stoppa en agent efter |  |
| `common.stop_all` | Stop all | Stoppa alla |  |
| `common.stop_watching` | Stop watching | Sluta bevaka |  |
| `common.stopped` | Stopped | Stoppat |  |
| `common.stopped_by_the_budget` | Stopped by the budget | Stoppat av budgeten |  |
| `common.stopped_steps` | Stopped steps | Stoppade steg |  |
| `common.stops_risky_steps_until_you_say` | Stops risky steps until you say yes. | Stoppar riskabla steg tills du säger ja. |  |
| `common.strong` | Strong | Stark |  |
| `common.task_run_report` | Task run report | Rapport från körningen |  |
| `common.task_runner` | Task runner | Uppgiftskörare |  |
| `common.tasks` | Tasks | Uppgifter |  |
| `common.teal` | Teal | Blågrön |  |
| `common.tell_me_when_done` | Tell me when done | Säg till när den är klar |  |
| `common.templates` | Templates | Mallar |  |
| `common.test_changes` | Test changes | Teständringar |  |
| `common.tests_failed` | tests failed | testerna misslyckades |  |
| `common.tests_passed` | tests passed | testerna gick igenom |  |
| `common.the_board_lists_the_helper_agents` | The board lists the agents in your sessions: which model, how long, and whether each one runs or is done. Vaken notes an end only when the engine reports it. If it saw no end, the row says "no end seen", and after 45 minutes "probably done". | Tavlan listar agenterna i dina sessioner: vilken modell, hur länge och om var och en pågår eller är klar. Vaken noterar ett slut bara när motorn rapporterar det. Om inget slut sågs står det "no end seen" på raden, och efter 45 minuter "probably done". |  |
| `common.the_cockpit_can_tell_you_when` | Vaken can tell you when Claude needs you, keep usage low and stop risky steps. Choose how careful it is. | Vaken kan säga till när Claude behöver dig, hålla nere användningen och stoppa riskabla steg. Välj hur försiktig den ska vara. |  |
| `common.the_cockpit_checks_itself` | Vaken checks itself. | Vaken kontrollerar sig själv. |  |
| `common.the_cockpit_counts_its_own_parts` | Vaken counts its own parts that fail or run slow, per day. If one part fails 3 times in a day, a warning shows above the prompt. /vaken-help run modhealth shows the counts. | Vaken räknar sina egna delar som fallerar eller går långsamt, per dag. Om en del fallerar 3 gånger på en dag visas en varning ovanför prompten. /vaken-help run modhealth visar antalen. |  |
| `common.the_cockpit_looks_at_which_program` | Vaken looks at which program holds a port, and in which session folder it started. When Claude is about to start a server on a port another session holds, Claude gets a note, so two sessions do not fight over one port. It also says which worktrees (extra copies of your project folder, one for each session that works on its own) are clean and merged, so they are safe to remove. It never removes anything: it prints the exact command for you. | Vaken tittar på vilket program som håller en port, och i vilken sessionsmapp det startade. När Claude ska starta en server på en port som en annan session håller får Claude en notering, så att två sessioner inte slåss om en port. Den säger också vilka worktrees (extra kopior av din projektmapp, en för varje session som arbetar för sig) som är rena och ihopslagna, så att de är säkra att ta bort. Den tar aldrig bort något: den skriver ut exakt kommando åt dig. |  |
| `common.the_cockpit_notes_when_a_test` | Vaken notes when a test, build, lint or type check ran, and if it passed. When Claude says "tests pass" or "done" and no passing check backs it, vaken flags it. /vaken-ship proof shows the last answer; /vaken-ship done sets the checks that must pass. | Vaken noterar när ett test, bygge, lint eller typkontroll har körts, och om det gick igenom. När Claude säger "tests pass" eller "done" och ingen godkänd kontroll stöder det, flaggar vaken det. /vaken-ship proof visar senaste svaret; /vaken-ship done sätter vilka kontroller som måste gå igenom. |  |
| `common.the_command_list_keeps_the_last` | The command list keeps the last 50 shell commands of the session, as the program and the kind only, never the arguments. Text from the web, other apps, node\_modules and downloads is marked as data, not orders. /vaken-guard commands and /vaken-guard fence show them. | Kommandolistan sparar sessionens 50 senaste skalkommandon, bara som program och slag, aldrig argumenten. Text från webben, andra appar, node\_modules och nedladdningar markeras som data, inte order. /vaken-guard commands och /vaken-guard fence visar dem. |  |
| `common.the_first_reading_comes_within_a` | The first reading comes within a minute. | Första mätningen kommer inom en minut. |  |
| `common.the_guard_watches_risky_steps_deletes` | The safety check watches risky steps: deletes and force-pushes, edits outside your folders, odd new packages, and weakened tests. In Warn it tells Claude after the step, and in Stop it stops the step until you allow it. Left on its own setting, a risky command stops only when Claude Code would not ask you first (if vaken cannot tell, it warns). | Säkerhetskontrollen bevakar riskabla steg: borttagningar och tvingade push, ändringar utanför dina mappar, udda nya paket och försvagade tester. I Varna säger den till Claude efter steget, och i Stoppa stoppar den steget tills du tillåter det. På sin egen inställning stoppas ett riskabelt kommando bara när Claude Code inte skulle fråga dig först (om vaken inte kan avgöra det varnar den). |  |
| `common.the_migration_check_can_stop_a` | The migration check can stop a database migration before it runs. The env check tells Claude when new code reads an env name that no env file declares. It looks at names only, never at values. | Migreringskontrollen kan stoppa en databasmigrering innan den körs. Env-kontrollen säger till Claude när ny kod läser ett env-namn som ingen env-fil anger. Den tittar bara på namn, aldrig på värden. |  |
| `common.the_prompt_check_finds_a_vague` | The prompt review finds a vague message: fewer than 6 words, or a command such as "fix it" with no file name, path, number or quoted text. Tip shows one line above the prompt. Ask also tells Claude to ask one short question if the goal is unclear. Your words are never changed or stored; only the last vague one stays in memory, for the pane's better prompt. | Promptgranskningen hittar ett vagt meddelande: färre än 6 ord, eller en order som "fixa det" utan filnamn, sökväg, tal eller citerad text. Tips visar en rad ovanför prompten. Fråga ber också Claude ställa en kort fråga om målet är oklart. Dina ord ändras eller sparas aldrig; bara den senaste vaga hålls i minnet, för panelens bättre prompt. |  |
| `common.the_session_total_is_the_engines` | The session total is the engine's own. An answer's dollars are an estimate from its tokens and a list price. On a subscription they show what the same use would cost, not what you pay. | Sessionens total kommer från motorn själv. Dollarna för ett svar är en uppskattning från dess tokens och ett listpris. På en prenumeration visar de vad samma användning skulle kosta, inte vad du betalar. |  |
| `common.the_stopped_step_goes_through_once` | The stopped step goes through once. | Det stoppade steget släpps igenom en gång. |  |
| `common.this_project` | This project | Det här projektet |  |
| `common.this_project_uses` | This project uses | Det här projektet använder |  |
| `common.this_session` | This session | Den här sessionen |  |
| `common.this_session_state_context_and_cost` | This session: state, context and cost. | Den här sessionen: läge, kontext och kostnad. |  |
| `common.this_task_holds_work_that_is` | This task holds work that is not merged or not committed. Throw it away anyway? It is lost for good. | Den här uppgiften har arbete som inte är ihopslaget eller sparat. Kasta bort det ändå? Det går inte att få tillbaka. |  |
| `common.thrifty` | Thrifty | Sparsam |  |
| `common.throw_away` | Throw away | Släng |  |
| `common.throw_away_the_work_of_task` | Throw away the work of task {n}? Its folder copy and its branch are deleted. | Kasta bort arbetet i uppgift {n}? Dess mappkopia och gren tas bort. |  |
| `common.tip` | Tip | Tips |  |
| `common.today` | Today | I dag |  |
| `common.today_2` | today | i dag |  |
| `common.today_n` | Today: {n}%. | I dag: {n} %. |  |
| `common.today_since_time_n` | Today since {time}: {n}%. | I dag sedan {time}: {n} %. |  |
| `common.todays_share_is_used_up` | Today's share is used up. | Dagens andel är slut. |  |
| `common.try_again` | Try again | Försök igen |  |
| `common.turn_on` | Turn on | Slå på |  |
| `common.two_ready_helper_agents_a_cheap` | Two ready agents: a cheap one that looks things up, and a stronger one that reviews a change. /vaken-tasks agents shows them. /vaken-tasks agents make yes saves them in your agents folder and never overwrites a file. | Två färdiga agenter: en billig som slår upp saker och en starkare som granskar en ändring. /vaken-tasks agents visar dem. /vaken-tasks agents make yes sparar dem i din agentmapp och skriver aldrig över en fil. |  |
| `common.two_sessions_in_one_repository_can` | Two sessions in one repository can change the same file and undo each other. Before an edit, vaken checks what the other live sessions edited in the last 30 minutes. If it finds the same file, a lockfile, a migration or a config file, you get one toast, and Claude a note only when Notes to Claude is set to All checks. | Två sessioner i samma repository kan ändra samma fil och ångra varandras ändringar. Före en ändring kontrollerar vaken vad de andra levande sessionerna ändrade de senaste 30 minuterna. Hittar den samma fil, en lockfile, en migrering eller en konfigfil får du en notis, och Claude en notering bara när Noteringar till Claude står på Alla kontroller. |  |
| `common.type_a_word_after_cockpit_help` | Type a word after /vaken-help to filter | Skriv ett ord efter /vaken-help för att filtrera |  |
| `common.under_half_used_list` | Under half used: {list} | Under hälften använt: {list} |  |
| `common.undo` | Undo | Ångra |  |
| `common.undo_last_turn` | Undo last answer | Ångra senaste svaret |  |
| `common.vaken_keeps_your_settings` | Vaken keeps your settings, counts and notes in Claude Code's plugin store. Its own folder under ~/.claude holds copies of changed files for Undo, hand-over notes and page pictures. It keeps no text of your prompts or chats, except the decision log: on in Recommended, the default, it keeps short decisions you wrote, and Settings turns it off. By default Claude gets only its safety notes. More goes to Claude when you turn on a feature that talks to Claude (Plan first, Prompt review, Assumption review, or Notes to Claude set to All checks), or press a button that sends a message. There is no telemetry, and nothing goes to the makers of vaken. gh talks to GitHub if you signed in, npm asks the npm registry if a new package name is real, and page checks call only localhost unless you type another address. Delete everything, at the bottom of Settings, removes what it stored. | Vaken sparar dina inställningar, räkningar och anteckningar i Claude Codes pluginlager. Dess egen mapp under ~/.claude har kopior av ändrade filer för Ångra, överlämningsanteckningar och sidbilder. Det sparar ingen text från dina meddelanden eller chattar, utom beslutsloggen: på i Rekommenderat, standardläget, sparar den korta beslut som du skrev, och Inställningar stänger av den. Som standard får Claude bara dess säkerhetsnoteringar. Mer går till Claude när du slår på en funktion som pratar med Claude (Plan först, Promptgranskning, Antagandegranskning, eller Noteringar till Claude satt till Alla kontroller), eller trycker på en knapp som skickar ett meddelande. Det finns ingen telemetri, och inget går till dem som gör vaken. gh pratar med GitHub om du är inloggad, npm frågar npm-registret om ett nytt paketnamn är äkta, och sidkontroller anropar bara localhost om du inte skriver en annan adress. Ta bort allt, längst ned i Inställningar, tar bort det som vaken sparat. | Help text; every claim checked against core/erase.ts, core/tellclaude.ts, features/planfirst.ts, features/promptcheck.ts, features/assumptions.ts, core/guardjudge.ts, core/coach.ts |
| `common.view` | View | Vy |  |
| `common.violet` | Violet | Violett |  |
| `common.wait` | Wait | Vänta |  |
| `common.waiting_for_you` | Waiting for you | Väntar på dig |  |
| `common.waits_until_that_task_is_done` | Waits until that task is done. | Väntar tills den uppgiften är klar. |  |
| `common.warn` | Warn | Varna |  |
| `common.warned_you` | Warned you | Varnat dig |  |
| `common.watch_only` | Watch only | Bara visa |  |
| `common.watching` | watching | bevakas |  |
| `common.weekly_value_line` | Weekly value line | Veckorad om nytta |  |
| `common.what_a_handoff_brief_is` | What a handoff note is | Vad en överlämning är |  |
| `common.what_claude_keeps` | What Claude keeps | Vad Claude behåller |  |
| `common.what_did_i_miss_while_i` | Away mode: the summary when I am back | Borta-läge: sammanfattningen när jag är tillbaka |  |
| `common.what_did_the_cockpit_do_for` | Audit list: every step vaken took | Granskningslista: varje steg vaken tog |  |
| `common.what_do_the_cost_figures_mean` | What do the cost figures mean? | Vad betyder kostnadssiffrorna? |  |
| `common.what_does_this_error_mean` | What does this error mean? | Vad betyder det här felet? |  |
| `common.what_happened` | What happened | Vad hände |  |
| `common.what_happens_when_i_hit_my` | What happens when I hit my plan limit? | Vad händer när jag når min plangräns? |  |
| `common.what_happens_while_i_am_away` | Away mode: what vaken does while I am gone | Borta-läge: vad vaken gör medan jag är borta |  |
| `common.what_has_the_cockpit_done_for` | This week in numbers: what vaken did | Veckan i siffror: vad vaken gjorde |  |
| `common.what_if_another_session_works_in` | Two sessions, one folder: the warning line | Två sessioner, en mapp: varningsraden |  |
| `common.what_if_two_sessions_change_one` | Two sessions, one file: the warning before an edit | Två sessioner, en fil: varningen före en ändring |  |
| `common.what_is_the_cache` | What is the cache? | Vad är cachen? |  |
| `common.what_it_keeps` | What it keeps | Vad den behåller |  |
| `common.what_may_be_lost` | What may be lost | Vad som kan gå förlorat |  |
| `common.what_memory_is` | What memory is | Vad minne är |  |
| `common.what_mod_health_does` | What the self-check of vaken does | Vad vakens självkontroll gör |  |
| `common.what_plain_mode_does` | What plain mode does | Vad enkelt läge gör |  |
| `common.what_plan_first_does` | What plan first does | Vad plan först gör |  |
| `common.what_proof_does` | What checks do | Vad kontroller gör |  |
| `common.what_proof_keeps` | What checks keep | Vad kontroller sparar |  |
| `common.what_reflection_does` | What reflection does | Vad reflektionen gör |  |
| `common.what_shortening_does` | What compacting does | Vad det gör att komprimera sessionen |  |
| `common.what_steering_does` | What steering does | Vad styrning gör |  |
| `common.what_the_answer_shape_does` | What the answer shape does | Vad svarsformen gör |  |
| `common.what_the_assumption_check_does` | What the assumption review does | Vad antagandegranskningen gör |  |
| `common.what_the_cockpit_did_for_you` | What vaken did for you. | Vad vaken gjorde åt dig. |  |
| `common.what_the_cockpit_stopped_or_flagged` | What vaken stopped or flagged. | Vad vaken stoppade eller flaggade. |  |
| `common.what_the_computer_card_does` | What the Computer card does | Vad Datorkortet gör |  |
| `common.what_the_daily_brief_says` | What the daily recap says | Vad dagssammanfattningen säger |  |
| `common.what_the_decision_log_does` | What the decision log does | Vad beslutsloggen gör |  |
| `common.what_the_inbox_does` | What Needs you does | Vad kortet Behöver dig gör |  |
| `common.what_the_loop_breaker_does` | What the loop breaker does | Vad loopbrytaren gör |  |
| `common.what_the_notices_do` | What the notices do | Vad notiserna gör |  |
| `common.what_the_parking_lot_is` | What the parking lot is | Vad idéparkeringen är |  |
| `common.what_the_presets_are` | What the presets are | Vad lägena är |  |
| `common.what_the_prompt_check_does` | What the prompt review does | Vad promptgranskningen gör |  |
| `common.what_the_skill_coach_does` | What the skill coach does | Vad färdighetscoachen gör |  |
| `common.what_the_skills_card_shows` | What the Skills card shows | Vad Färdighetskortet visar |  |
| `common.what_the_starter_agents_are` | What the two ready-made agents are | Vad de två färdiga agenterna är |  |
| `common.what_the_trust_card_does` | What your plugins can do | Vad dina tillägg kan göra |  |
| `common.what_undo_does` | What undo does | Vad ångra gör |  |
| `common.what_vaken_keeps_and_sends` | What vaken keeps and sends | Vad vaken sparar och skickar | Help title |
| `common.what_what_happened_is` | What "what happened" is | Vad "vad hände" är |  |
| `common.when_a_new_message_is_on` | When a new message is on a new topic and the session is big, vaken says a fresh session costs less. It compares key words on your computer and keeps only short codes, never your words. It only shows a line above the chat box and never writes to Claude. | När ett nytt meddelande handlar om något nytt och sessionen är stor, säger vaken att en ny session kostar mindre. Den jämför nyckelord på din dator och sparar bara korta koder, aldrig dina ord. Den visar bara en rad ovanför chattrutan och skriver aldrig till Claude. |  |
| `common.when_a_step_fails_cockpit_error` | When a step fails, /vaken-explain error says in plain words what went wrong and the first thing to try. It keeps only the kind of error, never the error text. | När ett steg misslyckas säger /vaken-explain error med enkla ord vad som gick fel och det första du kan prova. Den sparar bara slaget av fel, aldrig feltexten. |  |
| `common.when_and_how_the_cockpit_tells` | When and how vaken tells you. | När och hur vaken säger till. |  |
| `common.when_another_live_session_works_in` | When another live session works in the same folder as this one, a line shows above the prompt. Vaken looks when a session starts and when you send a message, and says it at most every 10 minutes. Claude is not told, and nothing is stopped. | När en annan levande session arbetar i samma mapp som denna visas en rad ovanför prompten. Vaken tittar när en session startar och när du skickar ett meddelande, och säger det högst var 10:e minut. Claude får inget veta och inget stoppas. |  |
| `common.when_another_session_needs_you_or` | When another session waits for you, a toast tells you once; with Needs you and done, also when it finishes a long job. Hours without notices turn those toasts off at night. | När en annan session väntar på dig berättar en notis det en gång; med Behöver dig och klart också när den blir klar med ett långt jobb. Timmar utan notiser stänger av de notiserna på natten. |  |
| `common.when_away_mode_ends_the_cockpit` | When away mode ends, vaken tells you which sessions finished or needed you, how many risky steps it stopped, about what it cost, and what waits for you. /vaken-away digest shows it again. | När frånvaroläget tar slut berättar vaken vilka sessioner som blev klara eller behövde dig, hur många riskabla steg den stoppade, ungefär vad det kostade och vad som väntar på dig. /vaken-away digest visar den igen. |  |
| `common.when_does_it_suggest_a_fresh` | When does it suggest a fresh session? | När föreslår den en ny session? |  |
| `common.when_on_your_answers_to_claudes` | When on, your answers to Claude's questions and decisions you state ("let's go with X") are written down with the date, and /vaken-memory decide &lt;sentence&gt; adds one by hand. It is on in Recommended, the default; Only alerts turns it off, and so does Settings. /vaken-memory decisions lists them. | När den är på skrivs dina svar på Claudes frågor och beslut du uttalar ("vi kör på X") ner med datum, och /vaken-memory decide &lt;sentence&gt; lägger till ett för hand. Den är på i Rekommenderat, standardläget; Bara larm stänger av den, och det gör Inställningar också. /vaken-memory decisions listar dem. |  |
| `common.when_the_card_suggests_it` | When the card suggests it | När kortet föreslår det |  |
| `common.when_the_fresh_start_nudge_stays` | When the fresh-start nudge stays quiet | När påminnelsen om ny session tiger |  |
| `common.when_you_switch_model_in_a` | When you switch model in a long session, the saved copy of the session is thrown away and written again. Vaken tells you what that costs before it happens. | När du byter modell i en lång session kastas den sparade kopian av sessionen och skrivs om. Vaken berättar vad det kostar innan det händer. |  |
| `common.where_do_i_see_my_helpers` | Where do I see my agents? | Var ser jag mina agenter? |  |
| `common.which_skills_you_use_most_and` | Which skills you use most, and what the list costs. | Vilka färdigheter du använder mest, och vad listan kostar. |  |
| `common.while_away` | While away | När du är borta |  |
| `common.why_did_it_stop_a_database` | Why did it stop a database or env step? | Varför stoppade den ett databas- eller env-steg? |  |
| `common.why_did_it_stop_a_step` | Why did it stop a step that reaches outside? | Varför stoppade den ett steg som når utåt? |  |
| `common.why_did_it_stop_me` | Why did it stop me? | Varför stoppade den mig? |  |
| `common.why_does_it_check_ports_and` | Busy ports and extra project folders: what it checks | Upptagna portar och extra projektmappar: vad den kollar |  |
| `common.why_does_it_say_a_session` | Why does it say a session went quiet? | Varför säger den att en session blev tyst? |  |
| `common.why_does_it_warn_when_i` | Why does it warn when I switch model? | Varför varnar den när jag byter modell? |  |
| `common.why_does_it_watch_my_pull` | Pull requests and computer load: what it reads and why | Pull requests och datorns belastning: vad den läser och varför |  |
| `common.why_it_cost` | Why it cost | Varför det kostade |  |
| `common.why_it_costs_usage` | Why it costs usage | Varför det drar användning |  |
| `common.why_the_cockpit_tells_you_things` | Why vaken tells you things | Varför vaken berättar saker |  |
| `common.will_this_job_fit_in_my` | Will this job fit in my plan? | Ryms det här jobbet i min plan? |  |
| `common.will_work_in_a_copy_of_your` | will work in a copy of your files | kommer att arbeta i en kopia av dina filer |  |
| `common.worked_in_a_copy_of_your_files` | worked in a copy of your files | arbetade i en kopia av dina filer |  |
| `common.working_means_claude_did_something` | Working means Claude did something in the last 2 minutes. | Arbetar betyder att Claude gjorde något de senaste 2 minuterna. |  |
| `common.works_in_a_copy_of_your_files` | works in a copy of your files | arbetar i en kopia av dina filer |  |
| `common.worktree_cleanup` | Worktree cleanup | Städa worktrees |  |
| `common.writes_the_code_for_one_task` | Writes the code for one task. | Skriver koden för en uppgift. |  |
| `common.your_choice` | Your choice | Ditt val |  |
| `common.your_goal_the_files_changed_the` | Your goal, the files changed, the decisions and why, and the next steps. | Ditt mål, de ändrade filerna, besluten och varför, och nästa steg. |  |
| `common.your_other_sessions_live` | Your other sessions, live. | Dina andra sessioner, live. |  |
