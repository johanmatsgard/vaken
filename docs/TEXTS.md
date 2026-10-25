# Every text of vaken

<!-- GENERATED from hooks/i18n/rows/*.ts by scripts/strings-md.sh. Do not edit by hand. -->

**Generated, never edit by hand.** This page is the one text table (`mods/cockpit/hooks/i18n/rows`) written out to read: 5131 texts in 66 areas, languages en, sv. To change a text, edit the table (or export the sheet with `sh scripts/strings-export.sh sheet.csv`, change it, and import it with `sh scripts/strings-import.sh sheet.csv`), then regenerate this page with `sh scripts/strings-md.sh`. `sh scripts/check-strings.sh` fails when this page is out of date.

A text with a count has two lines, `one` and `other`. `{n}` and the like are filled in when the text is shown.

## Areas

- [toast](#toast) (123): Toasts and short notices.
- [explain](#explain) (281): What is this? and the plain-words explanations.
- [band](#band) (193): The band above the prompt, and the lines it posts.
- [guard](#guard) (46): The guard: what it stops and why.
- [needs](#needs) (73): Needs you: what waits for an answer, and the inbox.
- [winwords](#winwords) (39): The guard on Windows (PowerShell).
- [pane](#pane) (320): The pane: the live lines of the cards.
- [glance](#glance) (98): Glance rows: one headline per card.
- [cardsettings](#cardsettings) (15): The flip side of a card (its own settings).
- [sys](#sys) (29): Words of the system (Mac or PC).
- [compact](#compact) (50): Shortening the chat: the card, advice and commands.
- [skills](#skills) (24): The Skills card.
- [find](#find) (48): Finding a skill.
- [talk](#talk) (43): The Talk to other sessions card.
- [calm](#calm) (34): Calm: focus and quiet times.
- [phone](#phone) (43): The phone face.
- [phonecmds](#phonecmds) (9): Phone commands (/ok, /no, /go, /st).
- [awake](#awake) (22): Keeping the computer awake.
- [popout](#popout) (6): Pop out.
- [prs](#prs) (70): The pull requests card.
- [ship](#ship) (16): The Ship card.
- [back](#back) (12): Where was I.
- [safety](#safety) (28): The Safety card.
- [context](#context) (32): The Context health card.
- [preview](#preview) (29): The Preview card.
- [setup](#setup) (63): The Agent setup card.
- [do](#do) (75): Do: run commands from the last answer.
- [next](#next) (36): Shown from the code.
- [welcome](#welcome) (39): Shown from the code.
- [night](#night) (25): Shown from the code.
- [tell](#tell) (16): Shown from the code.
- [lean](#lean) (9): Shown from the code.
- [big](#big) (7): Shown from the code.
- [selected](#selected) (13): Shown from the code.
- [teach](#teach) (47): Shown from the code.
- [allow](#allow) (51): Shown from the code.
- [shipstep](#shipstep) (38): Ship steps (merge and check).
- [settings](#settings) (205): Settings: sections, rows, modes and layout names.
- [cards](#cards) (15): Cards: rules and titles.
- [firstsetup](#firstsetup) (49): Shown from the code.
- [guide](#guide) (52): The card guide.
- [runcost](#runcost) (26): Cost check before a task run.
- [fit](#fit) (27): Model fit (the card and its advice).
- [fitsettings](#fitsettings) (3): Model fit settings.
- [selfcost](#selfcost) (1): What vaken itself costs.
- [cardwhat](#cardwhat) (16): Shown from the code.
- [cardhome](#cardhome) (73): Shown from the code.
- [cardback](#cardback) (11): Shown from the code.
- [cardcompact](#cardcompact) (73): Shown from the code.
- [cardcomputer](#cardcomputer) (40): Shown from the code.
- [cardship](#cardship) (144): Shown from the code.
- [cardcontext](#cardcontext) (34): Shown from the code.
- [engines](#engines) (203): Shown from the code.
- [access](#access) (12): Shown from the code.
- [truth](#truth) (19): Shown from the code.
- [fmt](#fmt) (43): Numbers and times: a time gone, a length of time, an estimated price, day and month names.
- [words](#words) (72): Shown from the code.
- [common](#common) (559): Words shared by many places: buttons, levels, states, menus, help.
- [chat](#chat) (43): Shown from the code.
- [cmd](#cmd) (78): Shown from the code.
- [cmda](#cmda) (163): Shown from the code.
- [cmdb](#cmdb) (265): Shown from the code.
- [cmdc](#cmdc) (193): Shown from the code.
- [cmdd](#cmdd) (227): Shown from the code.
- [cmde](#cmde) (57): Shown from the code.
- [cmdf](#cmdf) (326): Shown from the code.

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
| `toast.battery_p_not_plugged_in` | Battery {p}%, not plugged in | Batteri {p} %, inte inkopplat |  |
| `toast.blocked_a_tool_call_the_which` | Stopped a call to {tool}: the {which} cost budget is used up. Type /vaken-usage budget extend to go on. | Stoppade ett anrop till {tool}: budgeten för {which} är slut. Skriv /vaken-usage budget extend för att fortsätta. |  |
| `toast.blocked_a_tool_step_that_keeps` | Stopped a {tool} step that keeps failing. Your next message lifts it. | Stoppade ett {tool}-steg som fortsätter att misslyckas. Ditt nästa meddelande häver det. |  |
| `toast.check_failed` | Check failed | Underkänd |  |
| `toast.checked` | Checked | Godkänd |  |
| `toast.checking` | Checking | Prövas |  |
| `toast.claude_took_pictures_of_name` | Claude took pictures of {name}. | Claude tog bilder av {name}. |  |
| `toast.claude_was_told_about_what` | Claude was told about {what}. | Claude fick veta om {what}. |  |
| `toast.claude_was_told_to_stop_and` | Claude was told to stop and ask you. | Claude fick besked att sluta och fråga dig. |  |
| `toast.close_a_session_or_wait_for_one` | Close a session or wait for one to finish. | Stäng en session eller vänta tills en är klar. |  |
| `toast.code_reads_an_env_name_nobody` | Code reads an env name nobody declared: {names}. | Koden läser ett env-namn som ingen har deklarerat: {names}. |  |
| `toast.compact_no_brief` | Not compacted: could not save the handoff note. Type /compact yourself. | Inte komprimerad: det gick inte att spara överlämningen. Skriv /compact själv. |  |
| `toast.cost_pct_of_the_which_budget` | Cost: {pct}% of the {which} budget (about {usd} of {limit}, estimate). | Kostnad: {pct} % av budgeten för {which} (ungefär {usd} av {limit}, uppskattning). |  |
| `toast.could_not_fill_the_prompt_box` | Could not fill the prompt box. Run /vaken-ship ci-fix to see the prompt. | Det gick inte att fylla i promptrutan. Kör /vaken-ship ci-fix för att se prompten. |  |
| `toast.could_not_fill_the_prompt_box_2` | Could not fill the prompt box. The idea: | Det gick inte att fylla i promptrutan. Idén: |  |
| `toast.could_not_fill_the_prompt_box_the_idea` | Could not fill the prompt box. The idea: {idea} | Det gick inte att fylla i promptrutan. Idén: {idea} |  |
| `toast.could_not_shorten_the_chat_from` | Could not compact the session from here. Type /compact yourself. | Det går inte att komprimera sessionen härifrån. Skriv /compact själv. |  |
| `toast.day` | day | dagen |  |
| `toast.dismissed_the_step_did_not_run` | Dismissed. The step did not run, and nothing was allowed. | Avfärdat. Steget kördes inte, och inget tilläts. |  |
| `toast.done_every_check_you_chose_passed` | Done: every check you chose passed after the last edit. | Klart: alla kontroller du valde gick igenom efter den sista ändringen. |  |
| `toast.edits_are_wandering_from_your_goal` | Edits are wandering from your goal: {folders}. | Ändringarna glider bort från ditt mål: {folders}. |  |
| `toast.failed` | Failed | Gick fel |  |
| `toast.finished_names` | Finished: {sessions}. | Klara: {sessions}. |  |
| `toast.focus_ended_nothing_happened_while` | Quiet ended. Nothing happened while it was quiet. | Tyst är slut. Inget hände medan det var tyst. |  |
| `toast.halt_lifted` | Resumed. | Återupptaget. |  |
| `toast.halted_lift_it_with_cockpit_halt` | This session is paused for safety. Resume with /vaken-pause off. | Den här sessionen är pausad för säkerhets skull. Återuppta med /vaken-pause off. |  |
| `toast.has_a_new_neighbour_from` | has a new neighbour from | har en ny granne från |  |
| `toast.it_already_resumed_n_times_today` | It already resumed {n} times today. | Sessionen har redan återupptagits {n} gånger i dag. |  |
| `toast.it_continues` | It continues | Den fortsätter |  |
| `toast.kept_the_cache_warm_k_k_tokens` | Kept the cache warm: {k}k tokens read from it | Höll cachen varm: {k}k tokens lästes från den |  |
| `toast.kept_the_cache_warm_k_k_tokens_stale` | Kept the cache warm: {k}k tokens read from it (it had gone stale) | Höll cachen varm: {k}k tokens lästes från den (den hade blivit gammal) |  |
| `toast.label_off_settings_can_turn_it` | {label}: Off. Settings can turn it on again. | {label}: Av. Inställningar kan slå på det igen. |  |
| `toast.n_claude_session_uses_mem` | {n} Claude session uses {mem} | {n} Claude-session använder {mem} |  |
| `toast.n_claude_sessions_use_mem` | {n} Claude sessions use {mem} | {n} Claude-sessioner använder {mem} |  |
| `toast.n_finished_turns_changed_files_and` | {n} finished answers changed files and wait for your look. | {n} avslutade svar ändrade filer och väntar på att du tittar. |  |
| `toast.n_folder_copies_of_the_project` | {n} folder copies of the project (worktrees) are safe to remove. Type /vaken-ship worktrees to see the commands. | {n} arbetsträd av projektet kan tas bort på ett säkert sätt. Skriv /vaken-ship worktrees för att se kommandona. |  |
| `toast.n_need_you` | {n} need you | {n} behöver dig |  |
| `toast.n_plugins_were_updated_see_cockpit` | {n} plugins were updated. See /vaken-help run trust. | {n} tillägg uppdaterades. Se /vaken-help run trust. |  |
| `toast.n_sessions_finished` | one: {n} session finished<br>other: {n} sessions finished | one: {n} session blev klar<br>other: {n} sessioner blev klara | Quiet ended: how many sessions finished while it was quiet. |
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
| `toast.port_port_is_held_by_session` | Port {port} is held by session "{name}". | Port {port} används av sessionen "{name}". |  |
| `toast.pr_n_all_checks_passed` | Pull request {n}: all checks passed. | Pull request {n}: alla kontroller gick igenom. |  |
| `toast.pr_n_m_check_failed` | Pull request {n}: {m} check failed. Type /vaken-ship ci-fix to see the fix. | Pull request {n}: {m} kontroll misslyckades. Skriv /vaken-ship ci-fix för att se lagningen. |  |
| `toast.pr_n_m_check_failed_open_it` | Pull request {n}: {m} check failed. Open it in the pane. | Pull request {n}: {m} kontroll misslyckades. Öppna den i panelen. |  |
| `toast.pr_n_m_checks_failed` | Pull request {n}: {m} checks failed. Type /vaken-ship ci-fix to see the fix. | Pull request {n}: {m} kontroller misslyckades. Skriv /vaken-ship ci-fix för att se lagningen. |  |
| `toast.pr_n_m_checks_failed_open_it` | Pull request {n}: {m} checks failed. Open it in the pane. | Pull request {n}: {m} kontroller misslyckades. Öppna den i panelen. |  |
| `toast.restored_n_file` | Restored {n} file. | Återställde {n} fil. |  |
| `toast.restored_n_files` | Restored {n} files. | Återställde {n} filer. |  |
| `toast.reviewing` | Reviewing | Granskas |  |
| `toast.screen_changed_name_view_pct` | Screen changed: {name}, {view} {pct} | Skärmen ändrades: {name}, {view} {pct} |  |
| `toast.screen_name_looks_the_same` | Screen {name} looks the same | Skärmen {name} ser likadan ut |  |
| `toast.session` | session | sessionen |  |
| `toast.session_packet_written` | Session packet written. | Sessionspaketet skrevs. |  |
| `toast.settings_routing` | Settings &gt; Agents. | Inställningar &gt; Agenter. |  |
| `toast.skipped` | Skipped | Hoppad |  |
| `toast.stopped` | Stopped: | Stoppad: |  |
| `toast.stopped_lift_it_with_cockpit_halt` | This session is paused for safety. Resume with /vaken-pause off. | Den här sessionen är pausad för säkerhets skull. Återuppta med /vaken-pause off. |  |
| `toast.stopped_what_press_allow_once_in` | Stopped {what}. Press Allow once in Needs you to let it through. | Stoppade {what}. Tryck på Tillåt en gång i Behöver dig för att släppa igenom det. |  |
| `toast.task_run` | Task run | Uppgiftskörning |  |
| `toast.task_run_ended_summary` | Task run ended: {summary} | Körningen avslutades: {summary} |  |
| `toast.task_run_goes_on_the_plan` | Task run goes on: the plan limit has reset | Körningen fortsätter: planens gräns har återställts |  |
| `toast.task_stopped` | Stopped | Stoppad |  |
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
| `toast.todays_share_of_the_week_is` | Today's share of the week is used up: {today} used today. | Dagens andel av veckan är slut: {today} använt i dag. |  |
| `toast.tool_failed_n_times_in_a` | {tool} failed {n} times in a row, the same way. | {tool} misslyckades {n} gånger i rad, på samma sätt. |  |
| `toast.type_cockpit_health_to_see_why` | Type /vaken-help run health to see why. | Skriv /vaken-help run health för att se varför. |  |
| `toast.unknown` | Unknown | Okänd |  |
| `toast.updated_from_prev_to_ver_all` | Updated from {prev} to {ver}. All {all} self-tests passed. | Uppdaterad från {prev} till {ver}. Alla {all} självtester gick igenom. |  |
| `toast.updated_to_ver` | Updated to {ver}. | Uppdaterad till {ver}. |  |
| `toast.verified` | verified | verifierat |  |
| `toast.waiting` | Waiting | Väntar |  |
| `toast.waiting_for_you_names` | Waiting for you: {sessions}. | Väntar på dig: {sessions}. |  |
| `toast.waits_for_the_plan_limit` | Waits for the plan limit: | Väntar på planens gräns: |  |
| `toast.waits_for_the_plan_limit_goes_on_at` | Waits for the plan limit, goes on at {time}: | Väntar på planens gräns, fortsätter {time}: |  |
| `toast.was_edited_by` | was edited by | ändrades av |  |
| `toast.when_the_window_resets` | (when the window resets) | (när fönstret återställs) |  |
| `toast.while_you_focused` | While it was quiet: | Medan det var tyst: |  |
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
| `explain.a_cold_cache_makes_your_next` | A cold cache makes your next message cost more. This costs a little usage; the card shows the money saved once the cache is used. | En kall cache gör ditt nästa meddelande dyrare. Det kostar lite användning; kortet visar pengarna som sparades när cachen används. |  |
| `explain.a_fresh_session_costs_less_than` | A fresh session costs less than carrying the whole old session along. | En ny session kostar mindre än att släpa med hela den gamla sessionen. |  |
| `explain.a_helper_that_runs_into_the` | An agent that runs into the limit only fails. Waiting keeps the work for later. | En agent som når gränsen misslyckas bara. Att vänta sparar arbetet till senare. |  |
| `explain.a_hidden_order_can_make_claude` | A hidden order can make Claude do things you did not ask for. | En dold order kan få Claude att göra saker du inte bad om. |  |
| `explain.a_lookup_does_not_need_the` | A lookup does not need the biggest model. This saves plan usage. | Ett uppslag behöver inte den största modellen. Det sparar användning. |  |
| `explain.a_mac_that_never_sleeps_wears` | A Mac that never sleeps wears the battery and the screen. | En Mac som aldrig sover sliter på batteriet och skärmen. |  |
| `explain.a_migration_changes_your` | A migration changes your database and is hard to undo. | En migrering ändrar din databas och är svår att ångra. |  |
| `explain.a_new_session_starts_empty_brief` | A new session starts empty. The brief saves you from explaining the work again. | En ny session börjar tom. Sammanfattningen gör att du slipper förklara arbetet igen. |  |
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
| `explain.agents_that_start_agents_can` | Agents that start agents can spread far and spend fast. | Agenter som startar agenter kan sprida sig långt och kosta snabbt. |  |
| `explain.an_agent_tried_to_start_an_agent` | An agent tried to start an agent more than 2 levels deep. Vaken stopped it and told Claude. | En agent försökte starta en agent mer än 2 nivåer djupt. Vaken stoppade den och berättade det för Claude. |  |
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
| `explain.check_the_files_it_changed_if` | Check the files it changed; if it was on purpose, ignore this. /vaken-tasks goal sets the goal. Settings &gt; Advanced &gt; Goal drift warning turns this off. | Kontrollera filerna som ändrades; om det var med flit, strunta i detta. /vaken-tasks goal sätter målet. Inställningar &gt; Avancerat &gt; Varning för målavvikelse slår av detta. |  |
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
| `explain.claude_did_something_in_this` | Claude did something in the session in the last 2 minutes. | Claude gjorde något i sessionen de senaste 2 minuterna. |  |
| `explain.claude_does_the_step_itself_agent` | Claude does the step itself. Settings &gt; Agents &gt; Agent cap set to Warn lifts the stop. | Claude gör steget själv. Inställningar &gt; Agenter &gt; Agenttak satt till Varna lyfter stoppet. |  |
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
| `explain.cockpit_neighbors_lists_them` | /vaken neighbors lists them. Give one session its own worktree. Settings &gt; Agents &gt; Two in one folder turns this off. | /vaken neighbors listar dem. Ge en session sitt eget arbetsträd. Inställningar &gt; Agenter &gt; Två i samma mapp slår av detta. |  |
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
| `explain.lean_cut` | Vaken cut long output (logs, big reads, repeated reminders) before Claude read it. One row a day counts the cuts. | Vaken kortade lång utdata (loggar, stora läsningar, upprepade påminnelser) innan Claude läste den. En rad per dag räknar kortningarna. |  |
| `explain.less_text_to_read_means_fewer` | Less text to read means fewer tokens used. The saving is an estimate. | Mindre text att läsa ger färre tokens. Besparingen är en uppskattning. |  |
| `explain.log_when_work_began` | The log shows when the work began and how many tasks it holds. | Loggen visar när arbetet började och hur många uppgifter det rymmer. |  |
| `explain.look_at_the_file_or_ask` | Look at the file, or ask Claude what it thinks is wrong. See /vaken-help run loops. Turn it off: Settings &gt; Safety &gt; Loop breaker. | Titta på filen, eller fråga Claude vad som är fel. Se /vaken-help run loops. Slå av: Inställningar &gt; Säkerhet &gt; Loopbrytare. |  |
| `explain.look_at_the_file_or_ask_2` | Look at the file, or ask Claude what it thinks is wrong. Turn it off: Settings &gt; Safety &gt; Loop breaker. | Titta på filen, eller fråga Claude vad som är fel. Slå av: Inställningar &gt; Säkerhet &gt; Loopbrytare. |  |
| `explain.look_at_the_test_change_and` | Look at the test change and ask Claude to fix the code instead. Settings &gt; Safety &gt; Test changes can stop such edits. | Titta på teständringen och be Claude laga koden i stället. Inställningar &gt; Säkerhet &gt; Teständringar kan stoppa sådana ändringar. |  |
| `explain.many_agents_at_once_slow_your` | Many agents at once slow your laptop and use your plan fast. | Många agenter samtidigt gör datorn långsam och förbrukar din plan snabbt. |  |
| `explain.many_of_these_cannot_be_undone` | Many of these cannot be undone. | Många av dessa går inte att ångra. |  |
| `explain.more_reads_of_a_stale_cache_would` | More reads of a stale cache would only cost. | Fler läsningar av en gammal cache skulle bara kosta. |  |
| `explain.more_tries_only_use_up_your` | More tries only use up your plan. Claude was told to change its approach. | Fler försök förbrukar bara din plan. Claude fick veta att ändra sitt sätt. |  |
| `explain.nobody_was_there_to_say_yes` | Nobody was there to say yes. A stopped step does no harm. | Ingen fanns där för att säga ja. Ett stoppat steg gör ingen skada. |  |
| `explain.nothing_can_change_while_you` | Steps that change things stop while you look. | Steg som ändrar något stoppas medan du tittar. |  |
| `explain.nothing_cockpit_health_shows_the` | Nothing. /vaken-help run health shows the results. | Inget. /vaken-help run health visar resultaten. |  |
| `explain.nothing_happened_in_this_session` | Nothing happened in the session for 2 minutes or more. | Inget hände i sessionen på 2 minuter eller mer. |  |
| `explain.nothing_if_claude_does_not_try` | Nothing. If Claude does not try that step again, the yes just ends. | Inget. Om Claude inte försöker det steget igen tar ja:et bara slut. |  |
| `explain.nothing_settings_money_and_plan_keep` | Nothing. Settings &gt; Money and plan &gt; Keep session cheap turns the keeper off. | Inget. Inställningar &gt; Pengar och plan &gt; Håll sessionen billig stänger av cachevakten. |  |
| `explain.nothing_settings_money_lean` | Nothing. Settings &gt; Money and plan &gt; Lean session changes it. | Inget. Inställningar &gt; Pengar och plan &gt; Smal session ändrar den. |  |
| `explain.nothing_the_autopilot_card_shows_the` | Nothing. The Autopilot card shows the money on the Kept the session cheap row. | Inget. Autopilot-kortet visar pengarna på raden Höll sessionen billig. |  |
| `explain.nothing_to_do_if_you_want_the` | Nothing to do. If you want the step after all, tell Claude to try again and press Allow once then. | Inget att göra. Om du vill ha steget ändå, be Claude försöka igen och tryck på Tillåt en gång då. |  |
| `explain.once_after_an_update_vaken` | Once, after an update, vaken cleared a saved Warn for Risky commands or Secrets. They still warn, and stop again where Claude Code would not ask first. | En gång, efter en uppdatering, rensade vaken en sparad Varna för Riskabla kommandon eller Hemligheter. De varnar fortfarande och stoppar igen där Claude Code inte skulle fråga först. |  |
| `explain.one_request_should_not_use_a` | One request should not use a big part of your plan without you knowing. | En förfrågan ska inte använda en stor del av din plan utan att du vet om det. |  |
| `explain.one_step_changes_many_choices_at` | One step changes many choices at once. | Ett steg ändrar många val på en gång. |  |
| `explain.open_a_line_of_the_autopilot` | Open a line of the Autopilot card, when it shows, to see what vaken saw, why it matters and what you can do. /vaken-explain says the same in the session. It never changes anything. | Öppna en rad i kortet Autopilot, när det visas, för att se vad vaken såg, varför det spelar roll och vad du kan göra. /vaken-explain säger samma sak i sessionen. Den ändrar aldrig något. |  |
| `explain.open_a_new_session_and_paste` | Open a new session and paste the line. /vaken-explain fresh says why. | Öppna en ny session och klistra in raden. /vaken-explain fresh säger varför. |  |
| `explain.open_the_file_to_check_it` | Open the file to check it. In the new session, ask Claude to read it. /vaken-help run packet shows it. | Öppna filen och titta på den. I den nya sessionen, be Claude läsa den. /vaken-help run packet visar den. |  |
| `explain.press_go_on_on_the_agents` | Press Go on, on the Agents card, after the reset. /vaken-tasks afterlimit go makes a run go on by itself. | Tryck på Fortsätt på kortet Agenter efter återställningen. /vaken-tasks afterlimit go låter en körning fortsätta av sig själv. |  |
| `explain.press_pause_all_to_pause_again` | Type /vaken-pause to pause this session again, or press Pause this session on the Safety card, when it shows. | Skriv /vaken-pause för att pausa den här sessionen igen, eller tryck på Pausa den här sessionen på kortet Säkerhet, när det visas. |  |
| `explain.press_resume_to_let_claude` | Press Resume in Needs you or on the Safety card, or type /vaken-pause off, to let Claude work again. | Tryck på Återuppta i Behöver dig eller på kortet Säkerhet, eller skriv /vaken-pause off, så att Claude kan arbeta igen. |  |
| `explain.press_resume_when_you_want` | Press Resume in Needs you or on the Safety card, or type /vaken-pause off, when you want Claude to work again. | Tryck på Återuppta i Behöver dig eller på kortet Säkerhet, eller skriv /vaken-pause off, när du vill att Claude ska arbeta igen. |  |
| `explain.press_tab_to_take_the_sentence` | Press Tab to take the sentence. /vaken-pause steer shows the queue. | Tryck på Tab för att ta meningen. /vaken-pause steer visar kön. |  |
| `explain.press_tab_to_take_the_sentence_2` | Press Tab to take the sentence. /vaken-pause steer lists the sentences you queued. | Tryck på Tab för att ta meningen. /vaken-pause steer listar meningarna du köade. |  |
| `explain.read_result_without_watching` | You can read the result without watching the run. | Du kan läsa resultatet utan att följa körningen. |  |
| `explain.read_the_details_and_ask_claude` | Read the details and ask Claude what is wrong. It was told to explain. Settings &gt; Advanced &gt; Odd-change warning turns this off. | Läs detaljerna och fråga Claude vad som är fel. Den fick veta att förklara. Inställningar &gt; Avancerat &gt; Varning för udda ändringar slår av detta. |  |
| `explain.read_the_details_and_check_the` | Read the details and check the result. To stop such commands first, set Settings &gt; Safety &gt; Risky commands to Stop. | Läs detaljerna och kontrollera resultatet. För att stoppa sådana kommandon i förväg, sätt Inställningar &gt; Säkerhet &gt; Riskabla kommandon till Stoppa. |  |
| `explain.read_the_details_when_you_are` | Read the details when you are back. Settings &gt; Safety &gt; While away turns this off. | Läs detaljerna när du är tillbaka. Inställningar &gt; Säkerhet &gt; När du är borta slår av detta. |  |
| `explain.read_the_plan_then_say_yes` | Read the plan, then say yes or change it. Settings &gt; Prompts and memory &gt; Plan first turns this off. | Läs planen och säg sedan ja eller ändra den. Inställningar &gt; Prompter och minne &gt; Plan först slår av detta. |  |
| `explain.risky_steps_today_what_the` | Risky steps today: what vaken warned you about or stopped, and how strict each rule is. | Riskabla steg i dag: vad vaken varnade dig för eller stoppade, och hur sträng varje regel är. |  |
| `explain.run_again` | /vaken-tasks again runs it once more. | /vaken-tasks again kör den en gång till. |  |
| `explain.run_finished` | Every task of your task run ended: done, failed or skipped. | Varje uppgift i din uppgiftskörning tog slut: klar, misslyckad eller hoppad över. |  |
| `explain.run_report` | /vaken-tasks report shows the result. | /vaken-tasks report visar resultatet. |  |
| `explain.run_show_stop` | /vaken-tasks shows the run. /vaken-tasks stop ends it. | /vaken-tasks visar körningen. /vaken-tasks stop avslutar den. |  |
| `explain.run_started` | You started a task run. Vaken began handing its tasks to agents. | Du startade en uppgiftskörning. Vaken började ge dess uppgifter till agenter. |  |
| `explain.run_stopped` | You stopped your task run. Running agents were told to stop, and no new one starts. | Du stoppade din uppgiftskörning. Agenter som körde fick beskedet att sluta, och ingen ny startar. |  |
| `explain.see_cockpit_loops_to_refuse_the` | See /vaken-help run loops. To stop the next try, set Settings &gt; Safety &gt; Loop breaker to Stop. | Se /vaken-help run loops. För att stoppa nästa försök, sätt Inställningar &gt; Säkerhet &gt; Loopbrytare till Stoppa. |  |
| `explain.see_settings_safety_risky_commands_and` | See Settings &gt; Safety &gt; Risky commands and Settings &gt; Safety &gt; Secrets. Set them to Warn there if you want them never to stop. | Se Inställningar &gt; Säkerhet &gt; Riskabla kommandon och Inställningar &gt; Säkerhet &gt; Hemligheter. Sätt dem till Varna där om du vill att de aldrig ska stoppa. |  |
| `explain.send_a_new_message_to_lift` | Send a new message to lift the stop. To avoid such stops, set Settings &gt; Safety &gt; Loop breaker to Warn. | Skicka ett nytt meddelande för att häva stoppet. För att slippa sådana stopp, sätt Inställningar &gt; Säkerhet &gt; Loopbrytare till Varna. |  |
| `explain.send_a_new_message_to_start_a` | Send a new message to start a new count. /vaken-settings cap.spend raises the limit. | Skicka ett nytt meddelande för att börja räkna om. /vaken-settings cap.spend höjer gränsen. |  |
| `explain.send_continue_after_the_reset` | Send "continue" after the reset. Settings &gt; Money and plan &gt; After a limit can do it for you. | Skicka "continue" efter återställningen. Inställningar &gt; Pengar och plan &gt; Efter en gräns kan göra det åt dig. |  |
| `explain.shorten_the_chat_is_set_to` | Compacting is set to Watch only. Claude had finished and nothing was running, so vaken would have compacted now. It did nothing. | Komprimering är satt till Bara titta. Claude var klar och inget kördes, så vaken skulle ha komprimerat nu. Den gjorde inget. |  |
| `explain.shorten_the_session_watch_only` | Compacting is set to Watch only. Claude had finished and nothing was running, so vaken would have compacted now. It did nothing. | Komprimering är satt till Bara titta. Claude var klar och inget kördes, så vaken skulle ha komprimerat nu. Den gjorde inget. |  |
| `explain.some_people_cannot_use_a_page` | Some people cannot use a page with this problem. | Vissa människor kan inte använda en sida med det här problemet. |  |
| `explain.start_a_new_session_for_the` | Start a new session for the new topic. /vaken-explain fresh says why. Settings &gt; Prompts and memory &gt; Fresh-start nudge turns it off. | Starta en ny session för det nya ämnet. /vaken-explain fresh säger varför. Inställningar &gt; Prompter och minne &gt; Påminnelse om ny session slår av detta. |  |
| `explain.steps_are_checked_as_before` | Steps are checked as before. | Steg kontrolleras som förut. |  |
| `explain.stopping_keeps_work_from` | Stopping keeps work from going on without you. | Att stoppa hindrar att arbetet fortsätter utan dig. |  |
| `explain.switch_model_only_at_the_start` | Switch model only at the start of a new session. Settings &gt; Agents &gt; Agent models: Off also stops this warning. | Byt modell bara i början av en ny session. Inställningar &gt; Agenter &gt; Agentmodeller: Av stoppar också den här varningen. |  |
| `explain.tell_claude_to_try_the_step` | Tell Claude to try the step again. It does not run by itself. If Claude does not try it, the yes just ends. | Be Claude försöka steget igen. Det körs inte av sig självt. Om Claude inte försöker tar ja:et bara slut. |  |
| `explain.text_from_the_web_another_app` | Text from the web, another app or a downloads folder held a sentence that reads like an order to Claude. Claude was told to ignore it. | Text från webben, en annan app eller en nedladdningsmapp innehöll en mening som liknar en order till Claude. Claude fick veta att strunta i den. |  |
| `explain.the_allowance_is_used_up_the` | The allowance is used up. The next step is stopped again. | Tillåtelsen är förbrukad. Nästa steg stoppas igen. |  |
| `explain.the_app_updated_and_the_cockpit` | The app updated, and vaken tested its own parts. All of them passed. | Appen uppdaterades, och vaken testade sina egna delar. Alla gick igenom. |  |
| `explain.the_budget_was_reached_and` | The budget was reached, and Claude tried a costly step such as an agent. Vaken stopped it. | Budgeten var nådd, och Claude försökte ett dyrt steg, till exempel en agent. Vaken stoppade det. |  |
| `explain.the_cache_had_gone_stale_when_the` | The cache had gone stale when the keeper read it, so that read paid for a rewrite. The keeper stopped for this break. | Cachen hade blivit gammal när cachevakten läste den, så den läsningen betalade för en omskrivning. Cachevakten stannade för den här pausen. |  |
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
| `explain.the_halt_ended_steps_that_change` | The pause of this session ended. Steps that change things work again. | Pausen av den här sessionen är slut. Steg som ändrar något fungerar igen. |  |
| `explain.the_helper_agents_claude_started` | The agents Claude started, and whether they still run. | Agenterna som Claude startade, och om de fortfarande kör. |  |
| `explain.the_keeper_tried_to_read_the_cache` | The keeper tried to read the cache and got no answer, so it could not keep it warm. | Cachevakten försökte läsa cachen men fick inget svar, så den kunde inte hålla den varm. |  |
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
| `explain.this_is_what_a_halt_is` | This is what Pause this session is for. Such steps stay stopped while it lasts. | Det är vad Pausa den här sessionen är till för. Sådana steg förblir stoppade så länge det varar. |  |
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
| `explain.type_cockpit_halt_to_stop` | Type /vaken-pause to pause this session again. | Skriv /vaken-pause för att pausa den här sessionen igen. |  |
| `explain.vaken_counts_the_misses_too_so` | Vaken counts the misses too, so the money it shows is honest. | Vaken räknar missarna också, så pengarna den visar är ärliga. |  |
| `explain.wait_for_one_agent_to_finish` | Wait for one agent to finish. Settings &gt; Agents &gt; Most at once raises the limit. | Vänta tills en agent är klar. Inställningar &gt; Agenter &gt; Flest samtidigt höjer gränsen. |  |
| `explain.wait_for_one_to_finish_settings` | Wait for one to finish. Settings &gt; Agents &gt; Agent cap and Most at once change the limit. | Vänta tills en är klar. Inställningar &gt; Agenter &gt; Agenttak och Flest samtidigt ändrar gränsen. |  |
| `explain.what_the_cockpit_did_for_you` | What vaken did for you today, such as compacting a long session. | Vad vaken gjorde åt dig i dag, till exempel att komprimera en lång session. |  |
| `explain.whether_the_tests_the_build_and` | Whether the tests, the build and the other checks really ran and passed after the last change. | Om testerna, bygget och de andra kontrollerna verkligen kördes och gick igenom efter den senaste ändringen. |  |
| `explain.while_you_are_away_it_can` | While you are away, it can stop risky steps by itself, if While away is set to Careful. | Medan du är borta kan vaken stoppa riskabla steg av sig själv, om När du är borta är satt till Försiktig. |  |
| `explain.without_a_read_the_cache_can_go` | Without a read, the cache can go stale during your break. | Utan en läsning kan cachen bli gammal under din paus. |  |
| `explain.writing_the_cache_again_costs_far` | Writing the cache again costs far more than reading it. | Att skriva cachen igen kostar mycket mer än att läsa den. |  |
| `explain.you_applied_the_name_preset_a` | You applied the {name} preset: a named set of Settings choices. | Du tog i bruk läget {name}: en namngiven uppsättning val i Inställningar. |  |
| `explain.you_applied_title_typed_as_name` | You applied {title} (typed as {name}): a named set of Settings choices. | Du tog i bruk {title} (skrivet som {name}): en namngiven uppsättning val i Inställningar. |  |
| `explain.you_asked_for_the_same_kind` | You asked for the same kind of thing 3 times. Vaken offered to save it as a skill. | Du bad om samma sorts sak 3 gånger. Vaken erbjöd sig att spara det som en färdighet. |  |
| `explain.you_asked_for_the_starter_agents` | You asked for the starter agents, and vaken saved them in your agents folder. | Du bad om startagenterna, och vaken sparade dem i din agentmapp. |  |
| `explain.you_came_back_after_the_cache` | You came back after the cache had gone stale, so keeping it warm cost a little and saved nothing. | Du kom tillbaka efter att cachen hade blivit gammal, så att hålla den varm kostade lite och sparade inget. |  |
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
| `explain.you_pressed_pause_all` | You pressed Pause this session or typed /vaken-pause. Commands, edits, tools, agents, web fetches and skills are paused until you resume. | Du tryckte på Pausa den här sessionen eller skrev /vaken-pause. Kommandon, ändringar, verktyg, agenter, webbhämtningar och färdigheter är pausade tills du återupptar. |  |
| `explain.you_pressed_start_fresh` | You pressed Start fresh. Vaken saved a short brief of this session and copied a line to paste. | Du tryckte på Ny session. Vaken sparade en kort sammanfattning av den här sessionen och kopierade en rad att klistra in. |  |
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
| `explain.your_cost_estimate_for_the` | Your cost estimate for the session or the day reached 80% or 100% of its budget. You were told; nothing was stopped. | Din kostnadsuppskattning för sessionen eller dagen nådde 80 % eller 100 % av budgeten. Du fick veta; inget stoppades. |  |
| `explain.your_message_looked_like_a_big` | Your message looked like a big task (long, or with two big verbs), and few files had changed. Vaken suggested a plan first. | Ditt meddelande såg ut som en stor uppgift (långt, eller med två stora verb), och få filer hade ändrats. Vaken föreslog en plan först. |  |
| `explain.your_message_looked_like_a_big_2` | Your message looked like a big task. Vaken told Claude to write a short plan and wait for your yes. | Ditt meddelande såg ut som en stor uppgift. Vaken sa åt Claude att skriva en kort plan och vänta på ditt ja. |  |
| `explain.your_new_message_is_on_a` | Your new message is on a new topic, and the session is big. Only you were told. | Ditt nya meddelande handlar om något nytt, och sessionen är stor. Bara du fick veta. |  |
| `explain.your_next_message_used_the_warm` | Your next message used the warm cache. Vaken counted the money that saved, less what keeping it warm cost. | Ditt nästa meddelande använde den varma cachen. Vaken räknade pengarna det sparade, minus vad det kostade att hålla den varm. |  |
| `explain.your_other_open_sessions_and` | Your other open sessions and what each one does now. You can pin or hide a session. Working means Claude did something in the last 2 minutes. | Dina andra öppna sessioner och vad var och en gör nu. Du kan fästa eller dölja en session. Arbetar betyder att Claude gjorde något de senaste 2 minuterna. |  |
| `explain.your_request_had_cost_as_much` | Your request had cost as much as its agent limit, so vaken stopped the next agent and told Claude. | Din förfrågan hade kostat lika mycket som agentgränsen, så vaken stoppade nästa agent och berättade det för Claude. |  |
| `explain.your_task_list_the_cockpit` | Your task list. Vaken starts an agent for each task, as many at a time as this computer has room for, each in its own folder copy when it writes code, checks each task when it ends, and stops an agent that runs too long or costs too much. /vaken-tasks shows it and steers it. | Din uppgiftslista. Vaken startar en agent för varje uppgift, så många åt gången som den här datorn har plats för, var och en i sitt eget arbetsträd när den skriver kod, kontrollerar varje uppgift när den är klar och stoppar en agent som kör för länge eller kostar för mycket. /vaken-tasks visar den och styr den. |  |

## band

The band above the prompt, and the lines it posts. (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `band.1_change_wait_for_your_look` | 1 change waits for your look. | 1 ändring väntar på att du tittar. |  |
| `band.1_held_step_waits_for_you` | 1 stopped step waits for you. Open Needs you. | 1 stoppat steg väntar på dig. Öppna Behöver dig. |  |
| `band.1_session_waits` | 1 session waits | 1 session väntar |  |
| `band.1_step_stopped` | 1 step stopped | 1 steg stoppat |  |
| `band.a_note_from_the_cockpit` | A note from vaken. | En notering från vaken. |  |
| `band.a_plugin_has_a_new_version` | A plugin has a new version since your last session. A plugin can change what Claude does. | Ett tillägg har en ny version sedan din senaste session. Ett tillägg kan ändra vad Claude gör. |  |
| `band.a_step_has_run_n_min` | A step has run {n} min | Ett steg har kört i {n} min |  |
| `band.a_step_has_run_n_min_esc` | A step has run {n} min. Esc in the chat stops it. | Ett steg har kört i {n} min. Esc i chatten stoppar det. |  |
| `band.about_h_h` | about {h} h | ungefär {h} h |  |
| `band.about_h_h_m_min` | about {h} h {m} min | ungefär {h} h {m} min |  |
| `band.about_m_min` | about {m} min | ungefär {m} min |  |
| `band.allow_it_in_that_session` | Allow it in that session. | Tillåt det i den sessionen. |  |
| `band.area_failed_n_times_today` | {area} failed {n} times today | {area} misslyckades {n} gånger i dag |  |
| `band.back_after_when` | Back after {when}. | Tillbaka efter {when}. |  |
| `band.branch_name` | Branch {name}. | Gren {name}. |  |
| `band.caught_a_repeating_step_n_times` | caught a repeating step {n} times | fångade ett upprepat steg {n} gånger |  |
| `band.caught_a_repeating_step_once` | caught a repeating step once | fångade ett upprepat steg en gång |  |
| `band.claude_assumed_1_thing_cockpit` | Claude assumed 1 thing. /vaken-explain assumptions | Claude antog 1 sak. /vaken-explain assumptions |  |
| `band.claude_assumed_n_things_cockpit` | Claude assumed {n} things. /vaken-explain assumptions | Claude antog {n} saker. /vaken-explain assumptions |  |
| `band.claude_code` | Claude Code | Claude Code |  |
| `band.claude_has_trouble_title` | Claude has trouble: {title} | Claude har problem: {title} |  |
| `band.claude_is_down_title` | Claude is down: {title} | Claude ligger nere: {title} |  |
| `band.cockpit_did_1_thing` | Vaken did 1 thing | Vaken gjorde 1 sak |  |
| `band.cockpit_did_n_things` | Vaken did {n} things | Vaken gjorde {n} saker |  |
| `band.compacted_the_session_n_times` | compacted the session {n} times | komprimerade sessionen {n} gånger |  |
| `band.compacted_the_session_once` | compacted the session once | komprimerade sessionen en gång |  |
| `band.could_not_stop_it_from_here` | Could not stop it from here. Press Esc in the chat. | Kunde inte stoppa det härifrån. Tryck Esc i chatten. |  |
| `band.drift_n_edits_far_from_the` | Drift: {n} edits far from the goal | Kursavvikelse: {n} ändringar långt från målet |  |
| `band.five_h` | 5 h | 5 h |  |
| `band.goal_goal` | Goal: {goal} | Mål: {goal} |  |
| `band.it_waits_age` | It waits {age}. | Den har väntat {age}. |  |
| `band.it_waits_at_least_age` | It waits at least {age}. | Den har väntat minst {age}. |  |
| `band.just_now` | just now | nyss |  |
| `band.keep_waiting` | Keep waiting | Vänta vidare |  |
| `band.left_open_in_project_words` | Left open in {project}: {words} | Lämnat öppet i {project}: {words} |  |
| `band.limit_used_up_reset` | {limit} used up · {reset} | {limit} förbrukad · {reset} | The band while a used-up limit is waited out: {limit} is the plan chip's short name (5 h, Week), {reset} its reset (resets 15:40). |
| `band.n_changes_wait_for_your_look` | {n} changes wait for your look. | {n} ändringar väntar på att du tittar. |  |
| `band.n_done` | {n} done | {n} klara |  |
| `band.n_held_steps_wait_for_you` | {n} stopped steps wait for you. Open Needs you. | {n} stoppade steg väntar på dig. Öppna Behöver dig. |  |
| `band.n_plugins_updated` | {n} plugins updated | {n} tillägg uppdaterade |  |
| `band.n_sessions_wait` | {n} sessions wait | {n} sessioner väntar |  |
| `band.n_steps_stopped` | {n} steps stopped | {n} steg stoppade |  |
| `band.needs_you_n` | Needs you: {n}. | Behöver dig: {n}. |  |
| `band.offers_this_week` | Your presses on vaken's offers this week: {pressed}, {worked} of them worked; {left} left or put off. | Dina tryck på vakens förslag den här veckan: {pressed}, varav {worked} fungerade; {left} lämnade eller uppskjutna. |  |
| `band.offers_used_most` | Used most: {name}. | Mest använd: {name}. |  |
| `band.plugin_updated_name_to` | Plugin updated: {name} {to} | Tillägg uppdaterat: {name} {to} |  |
| `band.pr_number_1_check_failed` | PR {number}: 1 check failed | PR {number}: 1 kontroll misslyckades |  |
| `band.pr_number_n_checks_failed` | PR {number}: {n} checks failed | PR {number}: {n} kontroller misslyckades |  |
| `band.preset_name` | Preset: {preset} | Läge: {preset} |  |
| `band.relay_open_failed` | Open {name} from the sidebar. | Öppna {name} från sidofältet. |  |
| `band.relay_open_session` | Open session | Öppna sessionen |  |
| `band.relay_question_in` | Question in {name} | Fråga i {name} |  |
| `band.relay_tool_asks` | A tool in {name} asks you a question | Ett verktyg i {name} ställer en fråga till dig |  |
| `band.reported_ago_on_the_status_page` | Reported {ago} on the status page | Rapporterat {ago} på statussidan |  |
| `band.risky_step_stopped` | Risky step stopped | Riskabelt steg stoppat | The band's short form of a stopped risky step, when the whole line does not fit. |
| `band.risky_step_this_answer` | Risky step this answer | Riskabelt steg i svaret | The band's short form of a risky step in the last answer, when the whole line does not fit. |
| `band.rule_broken_command` | Rule broken: {command} | Regel bruten: {command} |  |
| `band.saved_p_of_your_plan` | saved {p}% of your plan | sparade {p} % av din plan |  |
| `band.session_session` | Session: {session} | Session: {session} |  |
| `band.session_this_session` | Session: this session. | Session: den här sessionen. |  |
| `band.short_agent_held_back` | Agent held back | Agent avvisad |  |
| `band.short_allowed_one_step` | Allowed one step | Ett steg släppt |  |
| `band.short_asked_for_a_fix` | Asked for a fix | Bad om en fix |  |
| `band.short_asked_for_a_plan` | Asked for a plan | Bad om en plan |  |
| `band.short_auto_compacted` | Auto-compacted | Autokomprimerat |  |
| `band.short_away_ended_digest` | Away ended: digest | Frånvaro slut |  |
| `band.short_away_mode_off` | Away mode off | Frånvaro av |  |
| `band.short_away_mode_on` | Away mode on | Frånvaro på |  |
| `band.short_big_files_noticed` | Big files noticed | Stora filer sedda |  |
| `band.short_budget_raised` | Budget raised | Budget höjd |  |
| `band.short_budget_warning` | Budget warning | Budgetvarning |  |
| `band.short_cache_unread` | Cache unread | Cache oläst |  |
| `band.short_caught_a_repeat` | Caught a repeat | Upprepning sedd |  |
| `band.short_caught_a_rule_break` | Caught a rule break | Regelbrott |  |
| `band.short_changed_the_shape` | Changed the shape | Ändrade formen |  |
| `band.short_cheaper_model` | Cheaper model | Billigare modell |  |
| `band.short_checked_the_pr` | Checked the PR | Kollade PR |  |
| `band.short_checkpoint_named` | Checkpoint named | Kontrollpunkt |  |
| `band.short_command_stopped` | Command stopped | Stopp: kommando |  |
| `band.short_compact_at_breaks` | Compact at breaks? | Komprimera? |  |
| `band.short_compacted` | Compacted | Komprimerat |  |
| `band.short_did_not_merge` | Did not merge | Slog inte ihop |  |
| `band.short_dismissed_a_step` | Dismissed a step | Avfärdade ett steg |  |
| `band.short_done_unchecked` | Done, unchecked | Ej kontrollerat |  |
| `band.short_folder_clash` | Folder clash | Varnade: mapp |  |
| `band.short_found_a_fault` | Found a fault | Hittade ett fel |  |
| `band.short_found_hidden_order` | Found hidden order | Hittade dold order |  |
| `band.short_fresh_start_tip` | Fresh start tip | Tips: ny start |  |
| `band.short_going_in_circles` | Going in circles | Går i cirklar |  |
| `band.short_keeper_did_not_pay` | Keeper did not pay | Lönade sig inte |  |
| `band.short_keeper_off` | Keeper off | Vakten av |  |
| `band.short_kept_awake` | Kept awake | Hölls vaken |  |
| `band.short_kept_cheap_it_paid` | Kept cheap: it paid | Det lönade sig |  |
| `band.short_kept_it_cheap` | Kept it cheap | Höll det billigt |  |
| `band.short_let_a_step_through` | Let a step through | Ett steg släppt |  |
| `band.short_logs_shortened` | Logs shortened | Loggar kortade |  |
| `band.short_mac_awake_ended` | Mac awake ended | Vaken slut |  |
| `band.short_merged_a_pr` | Merged a PR | Slog ihop PR |  |
| `band.short_mode_kept` | Mode kept | Läge kvar |  |
| `band.short_night_run_ended` | Night run ended | Nattkörning slut |  |
| `band.short_night_run_started` | Night run started | Nattkörning igång |  |
| `band.short_odd_behaviour` | Odd behaviour | Konstigt beteende |  |
| `band.short_offered_a_skill` | Offered a skill | Färdighetstips |  |
| `band.short_pause_lifted` | Pause lifted | Paus avslutad |  |
| `band.short_paused_changes` | Paused changes | Allt pausat |  |
| `band.short_plugin_update_seen` | Plugin update seen | Plugin-uppdatering |  |
| `band.short_preset_applied` | Preset applied | Läge infört |  |
| `band.short_preset_name` | Preset: {name} | Läge: {name} |  |
| `band.short_prompt_ready` | Prompt ready | Köad prompt klar |  |
| `band.short_ran_a_block` | Ran a block | Körde ett block |  |
| `band.short_removed_a_rule` | Removed a rule | Tog bort regel |  |
| `band.short_reset_reminder` | Reset reminder | Påminnelse: gräns |  |
| `band.short_restored_files` | Restored files | Återställde filer |  |
| `band.short_resumed_limit` | Resumed (limit) | Återupptog (gräns) |  |
| `band.short_run_finished` | Run finished | Körning klar |  |
| `band.short_run_paused_limit` | Run paused: limit | Körning pausad |  |
| `band.short_run_started` | Run started | Körning startad |  |
| `band.short_run_stopped` | Run stopped | Körning stoppad |  |
| `band.short_run_went_on` | Run went on | Körning igång |  |
| `band.short_saved_a_rule` | Saved a rule | Sparade en regel |  |
| `band.short_self_checked` | Self-checked | Självkontrollerade |  |
| `band.short_sent_a_message` | Sent a message | Skickade besked |  |
| `band.short_setup_updated` | Setup updated | Setup uppdaterad |  |
| `band.short_starter_agents` | Starter agents | Startagenter |  |
| `band.short_stopped_a_repeat` | Stopped a repeat | Stopp: upprepning |  |
| `band.short_stopped_an_agent` | Stopped an agent | Stoppade en agent |  |
| `band.short_stopped_an_edit` | Stopped an edit | Stoppade ändring |  |
| `band.short_stopped_an_install` | Stopped an install | Install stoppad |  |
| `band.short_stopped_budget` | Stopped: budget | Stoppat: budget |  |
| `band.short_stopped_deep_agent` | Stopped deep agent | Agent stoppad |  |
| `band.short_stopped_migration` | Stopped migration | Migrering stoppad |  |
| `band.short_stopped_outside` | Stopped: outside | Stoppat: utåt |  |
| `band.short_stopped_paused` | Stopped: paused | Stoppat: pausat |  |
| `band.short_stopped_secret` | Stopped: secret | Stoppat: hemlighet |  |
| `band.short_stopped_session` | Stopped session | Session stoppad |  |
| `band.short_stopped_weak_test` | Stopped weak test | Test stoppat |  |
| `band.short_stopped_while_away` | Stopped while away | Stoppat när borta |  |
| `band.short_stops_again_in_auto` | Stops again in auto | Stoppar igen |  |
| `band.short_suggested_a_plan` | Suggested a plan | Föreslog en plan |  |
| `band.short_tips_kept` | Tips kept | Tips kvar |  |
| `band.short_too_many_agents` | Too many agents | Många agenter |  |
| `band.short_took_page_pictures` | Took page pictures | Tog bilder av sida |  |
| `band.short_unknown_env_name` | Unknown env name | Okänt env-namn |  |
| `band.short_warned_command` | Warned: command | Varnat kommando |  |
| `band.short_warned_edit` | Warned: edit | Varnade: ändring |  |
| `band.short_warned_install` | Warned: install | Varnat: install |  |
| `band.short_warned_migration` | Warned: migration | Varnade: migrering |  |
| `band.short_warned_new_model` | Warned: new model | Modellbyte |  |
| `band.short_warned_outside` | Warned: outside | Varnade: utåt |  |
| `band.short_warned_secret` | Warned: secret | Hemlighet sedd |  |
| `band.short_warned_shared_file` | Warned: shared file | Varnade: delad fil |  |
| `band.short_warned_shared_port` | Warned: shared port | Varnat: port |  |
| `band.short_warned_weak_test` | Warned: weak test | Test varnat |  |
| `band.short_work_off_the_goal` | Work off the goal | Vid sidan av |  |
| `band.short_would_compact_now` | Would compact now | Skulle komprimera |  |
| `band.short_wrote_a_brief` | Wrote a brief | Skrev en brief |  |
| `band.short_wrote_a_packet` | Wrote a packet | Skrev ett paket |  |
| `band.shortened_the_chat_a_to_b` | Compacted the session, {a} to {b} | Komprimerade sessionen, {a} till {b} |  |
| `band.shown_ago` | Shown {ago} | Visades {ago} |  |
| `band.shown_ago_words` | Shown {ago}: {words} | Visades {ago}: {words} |  |
| `band.status_means` | The Claude status page reports trouble with Claude Code or the API. Slow or failed answers may come from there, not from your work. | Claudes statussida rapporterar problem med Claude Code eller API:et. Långsamma eller misslyckade svar kan komma därifrån, inte från ditt arbete. |  |
| `band.status_page` | Status page | Statussida |  |
| `band.stop_the_answer` | Stop the answer | Stoppa svaret |  |
| `band.stopped_1_risky_step` | stopped 1 risky step | stoppade 1 riskabelt steg |  |
| `band.stopped_n_risky_steps` | stopped {n} risky steps | stoppade {n} riskabla steg |  |
| `band.stopped_the_step_claude_stopped_its` | Stopped the step. Claude stopped its answer too; type to go on. | Stoppade steget. Claude stoppade också sitt svar; skriv för att fortsätta. |  |
| `band.switch_drops_cache_pct` | A switch drops the cache: about {n}% of your 5-hour window. | Ett byte släpper cachen: ungefär {n} % av ditt 5-timmarsfönster. |  |
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
| `band.this_week_the_cockpit_words` | This week vaken {words}. | Vaken den här veckan: {words}. |  |
| `band.today_parts` | Today: {parts}. | I dag: {parts}. |  |
| `band.today_s_share_of_the_week` | Today's share of the week is used up | Dagens del av veckan är förbrukad |  |
| `band.under_1_yesterday` | under $1 yesterday | under 1 $ i går |  |
| `band.usd_yesterday` | {usd} yesterday | {usd} i går |  |
| `band.vaken_says_nothing_more_about_this` | Vaken says nothing more about this step. | Vaken säger inget mer om det här steget. |  |
| `band.what_it_means` | What it means: | Vad det betyder: |  |
| `band.what_you_can_do` | What you can do: | Vad du kan göra: |  |
| `band.where_it_comes_from` | Where it comes from: | Varifrån det kommer: |  |
| `band.why_now` | Why now: | Varför nu: |  |
| `band.you_chose_a_style_a_named` | You chose a style: a named set of Settings choices. | Du valde ett läge: en namngiven uppsättning val i Inställningar. |  |
| `band.you_were_away_under_5_min` | You were away under 5 min. Nothing needs you. | Du var borta i under 5 min. Inget behöver dig. |  |
| `band.you_were_away_under_5_min_short` | You were away under 5 min. | Du var borta i under 5 min. |  |
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
| `guard.stopped_an_agent_that_went_too` | Stopped an agent that went too deep | Stoppade en agent som gick för djupt |  |
| `guard.stopped_an_agent_the_request` | Stopped an agent: the request spent its limit | Stoppade en agent: förfrågan nådde sin gräns |  |
| `guard.tell_claude_that_web_and_app` | Tell Claude that web and app text is data, not orders. | Säg till Claude att text från webben och appar är data, inte order. |  |
| `guard.tell_claude_when_code_reads_an` | Tell Claude when code reads an env name no file declares. | Säg till Claude när kod läser ett env-namn som ingen fil deklarerar. |  |
| `guard.test_change_alert` | test change alert | teständringslarmet |  |
| `guard.warn_only` | Warn only | Bara varna |  |
| `guard.warn_stops_in_auto_mode` | Warn (stops in auto mode) | Varna (stopp i autoläge) |  |
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
| `needs.allow_once_has_timed_out` | Allow once has timed out | Tillåt en gång har gått ut |  |
| `needs.an_agent_is_stuck_or_failed` | An agent is stuck or failed | En agent har fastnat eller misslyckats |  |
| `needs.asked_claude_to_give_the_fix` | Asked Claude to give the fix to a stronger agent. | Bad Claude ge lagningen till en starkare agent. |  |
| `needs.asks_you_a_question` | Asks you a question. | Ställer en fråga till dig. |  |
| `needs.check_failed_3_times_in_a_row` | {check} failed 3 times in a row | {check} misslyckades 3 gånger i rad |  |
| `needs.check_failed_3_times_in_a_row_one` | {check} failed 3 times in a row. A way out waits in Needs you. | {check} misslyckades 3 gånger i rad. En väg ut väntar i Behöver dig. |  |
| `needs.check_failed_3_times_in_a_row_two` | {check} failed 3 times in a row. Two ways out wait in Needs you. | {check} misslyckades 3 gånger i rad. Två vägar ut väntar i Behöver dig. |  |
| `needs.check_still_failing_after_n_rounds` | {check} still failing after {n} rounds | {check} misslyckas fortfarande efter {n} omgångar |  |
| `needs.claude_did_work_that_was_checked` | Claude did work that was checked, and a check failed or no check backs a claim. | Claude gjorde arbete som kontrollerades, och en kontroll misslyckades eller ingen kontroll styrker ett påstående. |  |
| `needs.claude_gets_the_request_for_a` | Claude gets the request for a stronger agent at its next step. | Claude får begäran om en starkare agent vid sitt nästa steg. |  |
| `needs.claude_tried_a_risky_step` | Claude tried a risky step. | Claude försökte ett riskabelt steg. |  |
| `needs.failed_and_claims` | {failed}, and {claims} | {failed}, och {claims} | The failed check row of Needs you when a check failed and claims have no check: Tests failed, and 2 claims have no check |
| `needs.from_the_card` | from the card | från kortet |  |
| `needs.halted_every_step_that_changes` | Paused for safety. Commands, edits, tools, agents and web fetches are stopped. | Pausad för säkerhets skull. Kommandon, ändringar, verktyg, agenter och webbhämtningar stoppas. |  |
| `needs.keep_going` | Keep going | Kör vidare |  |
| `needs.look_at_the_changes_then_type` | Look at the changes, then type /vaken-ship reviewed in that session. | Titta på ändringarna och skriv sedan /vaken-ship reviewed i den sessionen. |  |
| `needs.n_claims_have_no_check` | one: {n} claim has no check<br>other: {n} claims have no check | one: {n} påstående saknar kontroll<br>other: {n} påståenden saknar kontroll |  |
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
| `needs.open_the_pull_request` | Open the pull request | Öppna pull requesten |  |
| `needs.open_the_pull_request_to_see_which` | Open the pull request to see which check failed. /vaken-ship ci-fix puts a fix request in the prompt box. | Öppna pull requesten för att se vilken kontroll som misslyckades. /vaken-ship ci-fix lägger en begäran om att laga i promptrutan. |  |
| `needs.press_allow_once_then_tell` | Press Allow once, then tell Claude to try again. Allow once lets this one step run if Claude tries it again within 30 minutes. | Tryck på Tillåt en gång och be sedan Claude försöka igen. Tillåt en gång låter just det här steget köras om Claude försöker igen inom 30 minuter. |  |
| `needs.press_check_to_ask_claude` | Press Check to ask Claude to run the checks that prove them, and show the results. | Tryck på Kontrollera för att be Claude köra kontrollerna som styrker dem, och visa resultaten. |  |
| `needs.press_fix_to_put_a_fix_proof` | Press Fix to put a fix request in the prompt box, then press Enter to send it. /vaken-ship proof shows what ran. | Tryck på Laga för att lägga en begäran om att laga i promptrutan, och tryck sedan på Enter för att skicka den. /vaken-ship proof visar vad som kördes. |  |
| `needs.press_fix_to_put_a_fix_request_or` | Press Fix to put a fix request in the prompt box, or write to Claude. Dismiss only takes this row away. | Tryck Laga för att lägga en begäran om att laga i promptrutan, eller skriv till Claude. Avfärda tar bara bort raden. |  |
| `needs.press_resume_to_let_claude` | Press Resume to let Claude work again. /vaken-pause off does the same. | Tryck på Återuppta så att Claude kan arbeta igen. /vaken-pause off gör samma sak. |  |
| `needs.pull_request_n_a_check_failed` | Pull request {n}: a check failed | Pull request {n}: en kontroll misslyckades |  |
| `needs.says_when_a_working_session_has` | Says when a working session has gone quiet. | Säger till när en arbetande session har blivit tyst. |  |
| `needs.session_name_this_one` | Session: {name} (this one). | Session: {name} (den här). |  |
| `needs.start_fresh_saves_a_short_brief` | Start fresh saves a short brief and copies one line for a new session, which runs the check and fixes the error there. There is no stronger model to hand it to. | Börja om sparar en kort sammanfattning och kopierar en rad till en ny session, som kör kontrollen och lagar felet där. Det finns ingen starkare modell att lämna det till. |  |
| `needs.start_fresh_with_only_the_error` | Start fresh with only the error | Börja om med bara felet |  |
| `needs.stopped_age_ago_allow_once_timed_out` | Stopped {age} ago. Allow once has timed out. | Stoppades för {age} sedan. Tillåt en gång har gått ut. |  |
| `needs.stopped_age_ago_it_will_not_run` | Stopped {age} ago. It will not run unless you allow it. | Stoppades för {age} sedan. Det körs inte om du inte tillåter det. |  |
| `needs.stopped_just_now_it_will_not_run` | Stopped just now. It will not run unless you allow it. | Stoppades nyss. Det körs inte om du inte tillåter det. |  |
| `needs.stuck_on_a_check` | Stuck on a check | Fast på en kontroll |  |
| `needs.tells_you_in_plain_words_what` | Tells you in plain words what the last answer did. | Berättar med enkla ord vad det senaste svaret gjorde. |  |
| `needs.the_chat_was_not_shortened_today` | The session was not compacted today. | Sessionen komprimerades inte i dag. |  |
| `needs.the_same_check_failed_3_times` | The same check failed 3 times in a row, with the same error. Claude keeps trying until you pick a way out. Nothing happens before you press. | Samma kontroll misslyckades 3 gånger i rad, med samma fel. Claude fortsätter försöka tills du väljer en väg ut. Inget händer innan du trycker. |  |
| `needs.try_a_stronger_agent_once` | Try a stronger agent once | Prova en starkare agent en gång |  |
| `needs.try_a_stronger_agent_once_asks` | Try a stronger agent once asks Claude to give this fix to one agent on a stronger model. This session keeps its own model. Start fresh saves a short brief and copies one line for a new session, which runs the check and fixes the error there. | Prova en starkare agent en gång ber Claude ge den här lagningen till en agent på en starkare modell. Den här sessionen behåller sin egen modell. Börja om sparar en kort sammanfattning och kopierar en rad till en ny session, som kör kontrollen och lagar felet där. |  |
| `needs.try_the_step_again_in_claude_when` | Try the step again in Claude. When it is stopped again, allow it then. | Försök steget igen i Claude. När det stoppas igen, tillåt det då. |  |
| `needs.type_cockpit_budget_extend_in` | Type /vaken-usage budget extend in that session, or leave it stopped. | Skriv /vaken-usage budget extend i den sessionen, eller låt det vara stoppat. |  |
| `needs.type_cockpit_guard_allow_once_in` | Type /vaken-guard allow once in that session, or leave it stopped. | Skriv /vaken-guard allow once i den sessionen, eller låt det vara stoppat. |  |
| `needs.type_cockpit_halt_off_in_that` | Type /vaken-pause off in that session when you are ready. | Skriv /vaken-pause off i den sessionen när du är redo. |  |
| `needs.typed_by_you` | typed by you | skrivet av dig |  |
| `needs.vaken_asked_claude_to_go_on` | Vaken asked Claude to go on 3 times and the check still fails. Claude has stopped, and nothing more runs by itself. | Vaken bad Claude fortsätta 3 gånger och kontrollen misslyckas fortfarande. Claude har stannat, och inget mer körs av sig självt. |  |
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
| `pane.1_claim_not_checked` | 1 claim not checked | 1 påstående inte kontrollerat |  |
| `pane.1_finished_turn_changed_files_and` | 1 finished answer changed files and waits for your look. | 1 avslutat svar ändrade filer och väntar på att du tittar. |  |
| `pane.1_idle` | 1 idle | 1 vilar | One other session that is idle; the plural is "{n} idle". |
| `pane.1_session_needs_you` | 1 session needs you | 1 session behöver dig |  |
| `pane.1_turn` | 1 answer | 1 svar |  |
| `pane.1_waits_in_needs_you` | 1 waits in Needs you | 1 väntar i Behöver dig | Other sessions' headline when the only other session waits in the Needs you card. |
| `pane.a_file_changed_after_this_check` | A file changed after this check last passed, so the pass may not hold now. Nothing is stopped. | En fil ändrades efter att kontrollen senast gick igenom, så resultatet kanske inte gäller nu. Inget stoppas. |  |
| `pane.a_file_changed_by_two_agents_a_and_b` | A file changed by two agents: {a} and {b} | En fil ändrades av två agenter: {a} och {b} |  |
| `pane.a_file_changed_here_and_in_name` | A file changed here and in {name} | En fil ändrades här och i {name} |  |
| `pane.a_of_b_tokens` | {a} of {b} tokens | {a} av {b} tokens |  |
| `pane.a_repeated_request_can_be_a` | A repeated request can be a skill | En upprepad begäran kan bli en färdighet |  |
| `pane.a_stopped_step_waits_for_your_yes` | a stopped step waits for your yes | ett stoppat steg väntar på ditt ja |  |
| `pane.about_k_freed` | about {k} tokens freed | ungefär {k} tokens frigjorda |  |
| `pane.about_k_tokens_saved_estimate` | about {k} tokens saved (estimate) | cirka {k} tokens sparade (uppskattning) |  |
| `pane.about_per_a_day` | To last until it resets: about {per}% a day (estimate) | För att räcka tills det återställs: ungefär {per} % om dagen (uppskattning) |  |
| `pane.age_a_short_ago` | {age} ago | {age} sen | Named to sort before pane.age\_ago, so the lookup by English keeps the full form. A time gone, shortest form, for a narrow column: the bare age ({age} is like 30 min or 6 h) and the word after it. |
| `pane.age_ago` | {age} ago | för {age} sedan |  |
| `pane.agent_done_name` | Agent done: {name} | Agent klar: {name} |  |
| `pane.agent_limit_reached` | Agent cap reached | Agenttaket nådd |  |
| `pane.agent_stopped_agents_went_too_deep` | Agent stopped: agents went too deep. Agent cap in Settings lifts it. | Agent stoppad: agenterna gick för djupt. Agenttak i Inställningar lyfter det. |  |
| `pane.agent_stopped_name` | Agent stopped: {name} | Agent stoppad: {name} |  |
| `pane.agent_stopped_this_request_reached` | Agent stopped: this request reached its spend limit. Your next message lifts it. | Agent stoppad: den här förfrågan nådde sin kostnadsgräns. Ditt nästa meddelande lyfter den. |  |
| `pane.agents_go_n_levels_deep` | Agents go {n} levels deep; the cap is {m}. | Agenter går {n} nivåer djupt; taket är {m}. |  |
| `pane.agents_lower` | agents | agenter |  |
| `pane.all_n` | all {n} | alla {n} |  |
| `pane.allowed_the_next_stopped_step` | Allowed the next stopped step | Släppte igenom nästa stoppade steg |  |
| `pane.an_agent` | an agent | en agent |  |
| `pane.an_agent_finished_a_task` | An agent finished a task. | En agent blev klar med en uppgift. |  |
| `pane.another_command_ran_after_it` | Another command ran after it. | Ett annat kommando kördes efter det. |  |
| `pane.another_session` | Another session | En annan session |  |
| `pane.another_session_is_in_this_folder` | Another session is in this folder. | En annan session är i den här mappen. |  |
| `pane.ask_claude_to_run_it_again_before` | Ask Claude to run it again before you call the work done. | Be Claude köra den igen innan du kallar arbetet klart. |  |
| `pane.ask_claude_to_use_fewer_agents` | Ask Claude to use fewer agents | Be Claude använda färre agenter |  |
| `pane.ask_claude_to_use_fewer_agents_sends` | Ask Claude to use fewer agents sends one request: at most one agent at a time for the rest of this task. | Be Claude använda färre agenter skickar en begäran: högst en agent åt gången under resten av uppgiften. |  |
| `pane.asked_a_model_keep_the_cache_warm` | Asked a model: Keep the cache warm | Frågade en modell: Håll cachen varm |  |
| `pane.asked_a_model_say_simpler` | Asked a model: Say simpler | Frågade en modell: Säg enklare |  |
| `pane.asked_about_shortening_at_good_moments` | Asked about compacting at good moments | Frågade om att komprimera vid bra stunder |  |
| `pane.asked_claude_for_a_plan_first` | Asked Claude for a plan first | Bad Claude om en plan först |  |
| `pane.asked_claude_to_plan_first` | Asked Claude to plan first. | Bad Claude planera först. |  |
| `pane.asked_claude_to_use_fewer_agents` | Asked Claude to use fewer agents. | Bad Claude använda färre agenter. |  |
| `pane.at_this_pace_lasts_until_the_reset` | At this pace: lasts until the reset. | I den här takten: räcker till återställningen. |  |
| `pane.at_this_pace_runs_out_when` | At this pace: runs out {when}. | I den här takten: tar slut {when}. |  |
| `pane.at_this_pace_the_plan_limit_runs` | At this pace the plan limit runs out before the work ends. Finish safely lets Claude stop at a safe point instead of being cut off mid-step. Nothing happens before you press. | I den här takten tar plangränsen slut innan arbetet är klart. Avsluta säkert låter Claude stanna vid en säker punkt i stället för att avbrytas mitt i ett steg. Inget händer innan du trycker. |  |
| `pane.at_time` | at {time} | kl. {time} |  |
| `pane.away_risky_steps_are_refused` | Away: risky steps are stopped | Borta: riskabla steg stoppas |  |
| `pane.big_file_reads_n` | Big file reads: {n}. | Stora filläsningar: {n}. |  |
| `pane.big_task_a_plan_first_is` | Big task. A plan first is cheaper than a redo. | Stor uppgift. En plan först är billigare än att göra om. |  |
| `pane.blocked_the_same_step_again` | Blocked the same step again | Stoppade samma steg igen |  |
| `pane.both_changed_this_file_in_the` | Both changed this file in the last 10 minutes. Nothing is stopped. Read the file again before you go on, so one change does not undo the other. | Båda ändrade filen de senaste 10 minuterna. Inget stoppas. Läs filen igen innan du fortsätter, så att den ena ändringen inte gör den andra ogjord. |  |
| `pane.brief_saved_and_copied_open_a` | Brief saved and copied. Open a new session and paste: {line} | Sammanfattningen är sparad och kopierad. Öppna en ny session och klistra in: {line} |  |
| `pane.brief_saved_open_a_new_session` | Brief saved. Open a new session and paste: {line} | Sammanfattningen är sparad. Öppna en ny session och klistra in: {line} |  |
| `pane.build` | Build | Bygget |  |
| `pane.cache_hit_hit_lapsed` | Cache {hit}% hit · lapsed | Cache {hit} % träff · kall |  |
| `pane.cache_hit_hit_warm_n_min` | Cache {hit}% hit · warm {n} min | Cache {hit} % träff · varm {n} min |  |
| `pane.cache_lapsed` | Cache lapsed | Cachen kall |  |
| `pane.cache_warm_n_min` | Cache warm {n} min | Cache varm {n} min |  |
| `pane.caught_a_repeating_step` | Caught a repeating step | Fångade ett upprepat steg |  |
| `pane.caught_a_step_that_breaks_a` | Caught a step that breaks a rule | Fångade ett steg som bryter mot en regel |  |
| `pane.changed_permissions` | changed permissions | ändrade behörigheter |  |
| `pane.changed_since_the_last_build` | Changed since the last build | Ändrat sedan senaste bygget |  |
| `pane.changed_since_the_last_lint_run` | Changed since the last lint run | Ändrat sedan senaste lint-körningen |  |
| `pane.changed_since_the_last_test_run` | Changed since the last test run | Ändrat sedan senaste testkörningen |  |
| `pane.changed_since_the_last_type_check` | Changed since the last type check | Ändrat sedan senaste typkontrollen |  |
| `pane.changed_the_answer_shape` | Changed the answer shape | Ändrade svarsformen |  |
| `pane.check_passed_keep_going_is_off` | {check} passed. Keep going is off again. | {check} gick igenom. Kör vidare är av igen. |  |
| `pane.checked_itself_after_an_update` | Checked itself after an update | Kontrollerade sig själv efter en uppdatering |  |
| `pane.checks_notrun_build` | not run | inte kört |  |
| `pane.checks_notrun_tests` | not run | inte körda |  |
| `pane.checks_stale_build` | not run since the last edit | inte kört sedan senaste ändringen |  |
| `pane.checks_stale_tests` | not run since the last edit | inte körda sedan senaste ändringen |  |
| `pane.claude_said_done_but_no_check` | Claude said done, but no check backs it | Claude sa klart, men ingen kontroll styrker det |  |
| `pane.clock_time` | {time} | kl. {time} |  |
| `pane.cockpit_self_check_failed` | Vaken self-test failed | Vakens självtest misslyckades |  |
| `pane.commands` | Commands | Kommandon |  |
| `pane.compact_now_shortens_this_session` | Compact now shortens this session after the usual checks, so each later answer re-reads less. | Komprimera nu kortar den här sessionen efter de vanliga kontrollerna, så att varje senare svar läser om mindre. |  |
| `pane.compacting_follows_auto_after_an_update` | Compacting follows Auto after an update | Komprimeringen följer Auto efter en uppdatering |  |
| `pane.context_n_used` | Context {n}% used | Kontext {n} % använt |  |
| `pane.cost_usd_estimate` | cost {usd} (estimate) | kostade {usd} (uppskattning) | Money the cache keeper cost today, when it did not pay: cost about $0.05 (estimate). |
| `pane.could_not_change_lean_session_change_it` | Could not change Lean session. Change it in Settings. | Kunde inte ändra Smal session. Ändra den i Inställningar. |  |
| `pane.could_not_run` | could not run | kunde inte köras |  |
| `pane.could_not_save_the_handover_note` | Could not save the handover note. Nothing was sent to Claude. | Kunde inte spara överlämningsanteckningen. Inget skickades till Claude. |  |
| `pane.could_not_write_the_brief_from` | Could not write the brief from here. Type /vaken-help run packet in the session. | Kunde inte skriva sammanfattningen härifrån. Skriv /vaken-help run packet i sessionen. |  |
| `pane.credit_limit_v` | Credit limit: {v} | Kreditgräns: {v} |  |
| `pane.deleted_files` | deleted files | raderade filer |  |
| `pane.edits` | Edits | Ändringar |  |
| `pane.ended_away_mode_with_a_digest` | Ended away mode with a digest | Avslutade frånvaroläget med en sammanfattning |  |
| `pane.extended_the_budget` | Extended the budget | Utökade budgeten |  |
| `pane.extra` | Extra | Extra |  |
| `pane.extra_usage` | Extra usage | Extra användning |  |
| `pane.extra_usage_v` | Extra usage: {v} | Extra användning: {v} |  |
| `pane.failed` | failed | misslyckades |  |
| `pane.file_changed_by_two_agents_a_and_b` | {file} changed by two agents: {a} and {b} | {file} ändrades av två agenter: {a} och {b} |  |
| `pane.file_changed_here_and_in_name` | {file} changed here and in {name} | {file} ändrades här och i {name} |  |
| `pane.file_path` | File: {path} | Fil: {path} |  |
| `pane.file_reads` | file reads | filläsningar |  |
| `pane.files_changed_and_not_committed_yet` | Files changed and not committed yet, as git counted them when the last answer ended. Below is what /vaken-ship proof shows. | Filer som ändrats och inte checkats in än, som git räknade dem när det senaste svaret slutade. Nedan står det som /vaken-ship proof visar. |  |
| `pane.finish_safely` | Finish safely | Avsluta säkert |  |
| `pane.fixed` | Fixed | Fast | The tag of the Needs you tile on the Arrange board: it stays first and cannot be moved |
| `pane.found_an_instruction_hidden_in_outside` | Found an instruction hidden in outside text | Hittade en instruktion gömd i text utifrån |  |
| `pane.found_something_broken` | Found something broken | Hittade något trasigt |  |
| `pane.full_why` | Full: {why} | Fullt: {why} |  |
| `pane.going_round_in_circles` | Going round in circles | Går runt i cirklar |  |
| `pane.gone_quiet` | Gone idle | Vilar nu |  |
| `pane.halted_all_changes` | Paused all changes | Pausade alla ändringar |  |
| `pane.handover_note_saved_at_path_asked` | Handover note saved at {path}. Asked Claude to stop at a safe point. | Överlämningsanteckningen sparades i {path}. Bad Claude stanna vid en säker punkt. |  |
| `pane.handover_note_saved_at_path_claude` | Handover note saved at {path}. Claude gets the request at its next step. | Överlämningsanteckningen sparades i {path}. Claude får begäran vid sitt nästa steg. |  |
| `pane.helper_held_the_computer_is_full` | Agent stopped: the computer is full | Agenten stoppad: datorn är full |  |
| `pane.here_waits_halt` | Paused. It waits for you to resume it. | Pausad. Den väntar på att du återupptar den. |  |
| `pane.here_waits_hold` | A stopped step waits for you in Needs you. | Ett stoppat steg väntar på dig i Behöver dig. |  |
| `pane.how_strict` | How strict | Hur strikt |  |
| `pane.in_n_days` | in {n} d | om {n} d |  |
| `pane.installed_a_package` | installed a package | installerade ett paket |  |
| `pane.instruction_files_are_heavy` | Instruction files are heavy | Instruktionsfilerna är tunga |  |
| `pane.it_could_not_read_the_cache` | It could not read the cache. | Den kunde inte läsa cachen. |  |
| `pane.it_resets_when` | It resets {when} | Återställs {when} |  |
| `pane.it_shows_after_the_first_answer` | It shows after the first answer in the chat. | Det visas efter det första svaret i chatten. |  |
| `pane.its_program_was_not_found_so` | Its program was not found, so no test ran. | Programmet hittades inte, så inget test kördes. |  |
| `pane.keep_going_is_off` | Keep going is off. | Kör vidare är av. |  |
| `pane.keep_going_is_on_at_most_3` | Keep going is on, at most 3 rounds. Your next message ends it. | Kör vidare är på, högst 3 omgångar. Ditt nästa meddelande avslutar det. |  |
| `pane.keep_going_until_lint_passes` | Keep going until lint passes | Kör vidare tills lint går igenom |  |
| `pane.keep_going_until_tests_pass` | Keep going until tests pass | Kör vidare tills testerna går igenom |  |
| `pane.keep_going_until_the_build_passes` | Keep going until the build passes | Kör vidare tills bygget går igenom |  |
| `pane.keep_going_until_the_type_check` | Keep going until the type check passes | Kör vidare tills typkontrollen går igenom |  |
| `pane.keeper_did_not_pay_this_time` | Keeper did not pay this time | Cachevakten lönade sig inte den här gången |  |
| `pane.kept_cheap` | kept cheap | hålls billigt |  |
| `pane.kept_the_cache_warm` | Kept the cache warm | Höll cachen varm |  |
| `pane.kept_the_cache_warm_it_paid` | Kept the cache warm: it paid | Höll cachen varm: det lönade sig |  |
| `pane.kept_the_mac_awake` | Kept the Mac awake | Höll Macen vaken |  |
| `pane.kept_the_session_cheap` | Kept the session cheap | Höll sessionen billig |  |
| `pane.kept_the_session_cheap_it_paid` | Kept the session cheap: it paid | Höll sessionen billig: det lönade sig |  |
| `pane.kept_your_tips_after_an_update` | Kept your tips after an update | Behöll dina tips efter en uppdatering |  |
| `pane.keyboard_shortcuts_where_they_work` | Keyboard shortcuts: click the vaken pane, or press ctrl+x tab, so it has the keyboard. Then one key presses a button.<br>In Settings, Help and Arranging:<br>b Back<br>In Help:<br>s Open settings<br>The main page has no keys: its buttons say their plain words. A card turned to its settings has no key for its Back: press it.<br>Keys typed in the chat box never press anything in the pane, and the keys are the same in every language. | Kortkommandon: klicka i vaken-panelen, eller tryck ctrl+x tab, så att den har tangentbordet. Sedan trycker en tangent på en knapp.<br>I Inställningar, Hjälp och när du ordnar korten:<br>b Tillbaka<br>I Hjälp:<br>s Öppna inställningar<br>Huvudsidan har inga tangenter: dess knappar säger bara sina ord. Ett kort som är vänt till sina inställningar har ingen tangent för sitt Tillbaka: tryck på det.<br>Tangenter du skriver i chattrutan trycker aldrig på något i panelen, och tangenterna är desamma på alla språk. |  |
| `pane.keys_in_the_pane` | Keys in the pane | Tangenter i panelen |  |
| `pane.last_read_age_ago` | Last read {age} ago. | Senast läst för {age} sedan. |  |
| `pane.last_read_just_now` | Last read just now. | Senast läst nyss. |  |
| `pane.last_reported_age_ago` | Last reported {age} ago | Senast rapporterad för {age} sedan |  |
| `pane.lean_session_is_now_all_long_output` | Lean session is now All long output. | Smal session är nu All lång utdata. |  |
| `pane.left_before_the_reset` | {left} before the reset | {left} före återställningen |  |
| `pane.let_a_stopped_step_through` | Let a stopped step through | Släppte igenom ett stoppat steg |  |
| `pane.lifted_the_halt` | Resumed after a pause | Återupptog efter en paus |  |
| `pane.limit_reset_type_continue` | Limit reset: type continue | Gränsen återställd: skriv continue |  |
| `pane.lint` | Lint | Lint |  |
| `pane.main_is_red` | Main is red | Main är röd |  |
| `pane.may_be_stuck` | May be stuck | Kan ha fastnat |  |
| `pane.memory_is_tight` | memory is tight | minnet är trångt |  |
| `pane.mixed` | mixed | blandat |  |
| `pane.n_at_reset` | ~{n}% at reset | ~{n} % vid återställning |  |
| `pane.n_claims` | {n} claims | {n} påståenden |  |
| `pane.n_claims_not_checked` | {n} claims not checked | {n} påståenden inte kontrollerade |  |
| `pane.n_hidden` | one: {n} hidden<br>other: {n} hidden | one: {n} dold<br>other: {n} dolda |  |
| `pane.n_hidden_in_settings` | {n} hidden in Settings. | {n} dolda i Inställningar. |  |
| `pane.n_idle` | {n} idle | {n} vilar |  |
| `pane.n_no_end_seen` | {n} no end seen | {n} utan sett slut |  |
| `pane.n_of_max_rounds_used` | {n} of {max} rounds used | {n} av {max} omgångar använda |  |
| `pane.n_of_the_credit_limit_used` | {pct} of the credit limit used | {pct} av kreditgränsen använt |  |
| `pane.n_sessions_need_you` | {n} sessions need you | {n} sessioner behöver dig |  |
| `pane.n_tokens` | {n} tokens | = |  |
| `pane.n_tokens_used` | {n} tokens used | {n} tokens använda |  |
| `pane.n_turns` | {n} answers | {n} svar |  |
| `pane.n_wait_in_needs_you` | {n} wait in Needs you | {n} väntar i Behöver dig | Other sessions' headline when the other sessions all wait in the Needs you card. |
| `pane.name_done_of_tasks_done` | {name}: {done} of {tasks} done | {name}: {done} av {tasks} klara |  |
| `pane.name_finished_a_task` | {name} finished a task. | {name} blev klar med en uppgift. |  |
| `pane.name_tasks` | {name}: {tasks} | {name}: {tasks} |  |
| `pane.named_a_checkpoint` | Named a checkpoint | Namngav en kontrollpunkt |  |
| `pane.near_the_limit` | Near the limit | Nära gränsen |  |
| `pane.new_topic_a_fresh_session_costs` | New topic? A fresh session costs less. | Nytt ämne? En ny session kostar mindre. |  |
| `pane.none_running` | None running | Ingen kör |  |
| `pane.none_seen` | None seen | Inga sedda |  |
| `pane.not_committed` | Not committed | Inte incheckat |  |
| `pane.not_known_yet_it_shows_after` | Not known yet. It shows after the first answer in the chat. | Inte känt än. Det visas efter det första svaret i chatten. |  |
| `pane.not_reported_yet` | Not reported yet | Inte rapporterad än |  |
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
| `pane.output_was_cut_by_a_pipe` | Output was cut by a pipe. | Utdata kapades av en pipe. |  |
| `pane.packages` | Packages | Paket |  |
| `pane.passed` | passed | gick igenom |  |
| `pane.paused_a_task_run_for_the` | Paused a task run for the plan limit | Pausade en uppgiftskörning för planens gräns |  |
| `pane.paused_it_waits_for_you_to_resume_it` | paused, it waits for you to resume it | pausad, den väntar på att du återupptar den |  |
| `pane.plain_turns` | plain turns | vanliga svar |  |
| `pane.pushed_to_a_remote` | pushed to a remote | pushade till en fjärrserver |  |
| `pane.ran_a_block_from_the_answer` | Ran a block from the answer | Körde ett block från svaret |  |
| `pane.ran_a_migration` | ran a migration | körde en migrering |  |
| `pane.ran_a_script_from_the_web` | ran a script from the web | körde ett skript från webben |  |
| `pane.ran_ago_before_the_last_edit` | ran {ago}, before the last edit | kördes {ago}, före senaste ändringen |  |
| `pane.ran_result_not_clear` | ran, result not clear | kördes, oklart resultat |  |
| `pane.reading` | Reading | Läser av |  |
| `pane.reading_again` | Reading again… | Läser av igen… |  |
| `pane.reading_the_computer` | Reading the computer… | Läser av datorn… |  |
| `pane.recent_pace_n_an_hour` | Recent pace: {n}% an hour. | Senaste takt: {n} % i timmen. |  |
| `pane.refused_a_risky_step_while_away` | Refused a risky step while away | Stoppade ett riskabelt steg medan du var borta |  |
| `pane.refused_a_step_while_halted` | Refused a step while paused | Stoppade ett steg medan allt var pausat |  |
| `pane.reminded_about_a_limit_reset` | Reminded about a limit reset | Påminde om att gränsen återställts |  |
| `pane.resets_when` | resets {when} | återställs {when} |  |
| `pane.resets_when_in_left` | Resets {when} (in {left}) | Återställs {when} (om {left}) |  |
| `pane.restored_files_from_a_copy` | Restored files from a copy | Återställde filer från en kopia |  |
| `pane.resumed_after_a_limit` | Resumed after a limit | Fortsatte efter en gräns |  |
| `pane.risky_list` | Risky: {list} | Riskabelt: {list} |  |
| `pane.room_for_1_more_helper` | Room for 1 more agent | Plats för 1 agent till |  |
| `pane.room_for_n_more_helpers` | Room for {n} more agents | Plats för {n} agenter till |  |
| `pane.runs_out_when` | Runs out {when} | Tar slut {when} |  |
| `pane.saved_usd_estimate` | saved {usd} (estimate) | sparade {usd} (uppskattning) | Money the cache keeper saved today: saved about $0.42 (estimate). |
| `pane.sent_a_lookup_agent_to_a` | Sent a lookup agent to a cheaper model | Skickade en uppslagsagent till en billigare modell |  |
| `pane.sent_a_lookup_helper_to_a` | Sent a lookup agent to a cheaper model | Skickade en uppslagsagent till en billigare modell |  |
| `pane.sent_a_message_to_another_session` | Sent a message to another session | Skickade ett meddelande till en annan session |  |
| `pane.session_limit_5_h` | 5-hour limit | 5-timmarsgräns |  |
| `pane.several_checks_ran_in_one_command` | Several checks ran in one command. | Flera kontroller kördes i ett kommando. |  |
| `pane.shortened_a_session` | Compacted a session | Komprimerade en session |  |
| `pane.shortened_long_output` | Shortened long output | Kortade långa utdata |  |
| `pane.shortened_the_chat_by_itself` | Compacted the session by itself | Komprimerade sessionen av sig själv |  |
| `pane.shortened_the_chat_times_about_k` | compacted the session {times}, about {k} tokens freed | komprimerade sessionen {times}, ungefär {k} tokens frigjorda |  |
| `pane.shortened_the_chat_times_k_freed` | compacted the session {times}, {k} freed | komprimerade sessionen {times}, {k} frigjorda |  |
| `pane.shortened_the_session_by_itself` | Compacted the session by itself | Komprimerade sessionen av sig själv |  |
| `pane.spend` | Spend | Utgift |  |
| `pane.spending_limit` | Spending limit | Utgiftsgräns |  |
| `pane.spotted_odd_behaviour` | Spotted odd behaviour | Såg ett konstigt beteende |  |
| `pane.start_fresh` | Start fresh | Ny session |  |
| `pane.stop` | stop | stoppar |  |
| `pane.stop_keeping_going` | Stop keeping going | Sluta köra vidare |  |
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
| `pane.subscription` | Subscription | Abonnemang |  |
| `pane.subscription_plan` | Subscription: {plan} | Abonnemang: {plan} |  |
| `pane.suggested_a_fresh_session` | Suggested a fresh session | Föreslog en ny session |  |
| `pane.suggested_a_plan_first` | Suggested a plan first | Föreslog en plan först |  |
| `pane.task_run_finished` | Task run finished | Uppgiftskörning klar |  |
| `pane.task_run_paused_by_the_plan` | Task run paused by the plan limit. Go on after the reset. | Uppgiftskörningen pausad av planens gräns. Fortsätt efter återställningen. |  |
| `pane.task_run_started` | Task run started | Uppgiftskörning startad |  |
| `pane.task_run_stopped_by_you` | Task run stopped by you | Uppgiftskörning stoppad av dig |  |
| `pane.tests` | Tests | Tester |  |
| `pane.the_agent_limit_is_reached` | the agent cap is reached | agenttaket är nådd |  |
| `pane.the_agent_name_has_waited_n_min` | The agent {name} has waited {n} min for a message | Agenten {name} har väntat {n} min på ett meddelande |  |
| `pane.the_app_does_not_share_plan` | The app does not share plan limits here. | Appen delar inte plangränser här. |  |
| `pane.the_battery_is_low` | the battery is low | batteriet är lågt |  |
| `pane.the_build` | The build | Bygget |  |
| `pane.the_cache_had_gone_stale_during_the` | The cache had gone stale during the break. | Cachen hade blivit gammal under pausen. |  |
| `pane.the_laptop_gauge_is_off` | The computer reading is off | Datoravläsningen är av |  |
| `pane.the_last_reading_held_no_plan` | The last reading held no plan limits. | Den senaste avläsningen hade inga plangränser. |  |
| `pane.the_mac_reports_memory_pressure` | the Mac reports memory pressure | Macen rapporterar minnestryck |  |
| `pane.the_pc_reports_memory_pressure` | the PC reports memory pressure | datorn rapporterar minnestryck |  |
| `pane.the_press_saves_a_handover_note` | The press saves a handover note for the next session, then asks Claude to stop at the next safe point, commit nothing you did not ask for, and say where it stopped. | Trycket sparar en överlämningsanteckning till nästa session och ber sedan Claude stanna vid nästa säkra punkt, inte committa något du inte bett om och säga var det stannade. |  |
| `pane.the_processor_is_busy` | the processor is busy | processorn är upptagen |  |
| `pane.the_processor_is_hot` | the processor is hot | processorn är varm |  |
| `pane.the_type_check` | The type check | Typkontrollen |  |
| `pane.this_may_use_about_n_of` | This may use about {n}% of your 5-hour window. | Det här kan använda ungefär {n} % av ditt 5-timmarsfönster. |  |
| `pane.this_request_has_cost_usd` | This request has cost {usd}; the agent spend limit is {max}. | Den här förfrågan har kostat {usd}; agenternas kostnadsgräns är {max}. |  |
| `pane.this_session_share` | This session: about {share} of it (estimate) | Den här sessionen: ungefär {share} av det (uppskattning) | A part of the used figure on the line above it, e.g. 45%. |
| `pane.this_session_share_agents` | This session: about {share} of it · agents: about {m} (estimate) | Den här sessionen: ungefär {share} av det · agenter: ungefär {m} (uppskattning) | Parts of the used figure on the line above it, e.g. 45%. |
| `pane.took_pictures_of_a_page` | Took pictures of a page | Tog bilder av en sida |  |
| `pane.tool_output` | tool output | verktygsutdata |  |
| `pane.turn_on_lean_all_long_output` | Turn on Lean: All long output | Slå på Smal: All lång utdata |  |
| `pane.turn_on_lean_all_long_output_sets` | Turn on Lean: All long output sets Lean session to All long output, so huge reads and tool answers are cut to their first and last lines from now on. Change it back in Settings. | Slå på Smal: All lång utdata ställer Smal session på All lång utdata, så att enorma läsningar och verktygssvar kortas till sina första och sista rader från och med nu. Ändra tillbaka i Inställningar. |  |
| `pane.turned_off_away_mode` | Turned off away mode | Stängde av frånvaroläget |  |
| `pane.turned_on_away_mode` | Turned on away mode | Slog på frånvaroläget |  |
| `pane.types` | Types | Typkontrollen |  |
| `pane.updated_agent_setup` | Updated agent setup | Uppdaterade agentuppsättningen |  |
| `pane.used_sudo` | used sudo | använde sudo |  |
| `pane.used_today` | Used today | Använt i dag |  |
| `pane.used_up` | Used up | Förbrukad |  |
| `pane.used_up_extra_usage_is_in_use` | Used up. Extra usage is in use. | Förbrukad. Extra användning används. |  |
| `pane.used_up_sessions_wait` | Used up. Sessions wait. | Förbrukad. Sessionerna väntar. |  |
| `pane.used_v` | Used: {v} | Använt: {v} |  |
| `pane.vague_prompt_add_the_file_or` | Vague prompt. Add the file or the goal. | Otydlig prompt. Lägg till filen eller målet. |  |
| `pane.vaken_asks_claude_to_go_on` | Vaken asks Claude to go on while the check fails, at most 3 rounds. Press to stop now. | Vaken ber Claude fortsätta medan kontrollen misslyckas, högst 3 omgångar. Tryck för att stoppa nu. |  |
| `pane.vaken_could_not_draw_this_type` | Vaken could not draw this. Type /vaken-help. | Vaken kunde inte rita det här. Skriv /vaken-help. |  |
| `pane.waiting_for_the_limit_to_reset` | Waiting for the limit to reset | Väntar på att gränsen återställs |  |
| `pane.warn` | warn | varnar |  |
| `pane.warn_worst_may_stop` | warn, worst may stop | varnar, det värsta kan stoppas |  |
| `pane.warned_about_a_file_another_session` | Warned about a file another session is editing | Varnade för en fil som en annan session ändrar |  |
| `pane.warned_about_a_migration` | Warned about a migration | Varnade för en migrering |  |
| `pane.warned_about_a_package_install` | Warned about a package install | Varnade för en paketinstallation |  |
| `pane.warned_about_a_port_another_session` | Warned about a port another session holds | Varnade för en port som en annan session håller |  |
| `pane.warned_about_a_risky_command` | Warned about a risky command | Varnade för ett riskabelt kommando |  |
| `pane.warned_about_a_secret` | Warned about a secret | Varnade för en hemlighet |  |
| `pane.warned_about_a_session_in_the` | Warned about a session in the same folder | Varnade för en session i samma mapp |  |
| `pane.warned_about_a_step_outside_folders` | Warned about a step outside your folders | Varnade för ett steg utanför dina mappar |  |
| `pane.warned_about_a_step_outside_your` | Warned about a step outside your computer | Varnade för ett steg utanför din dator |  |
| `pane.warned_about_a_weakened_test` | Warned about a weakened test | Varnade för ett försvagat test |  |
| `pane.warned_about_an_edit_outside_your` | Warned about an edit outside your folders | Varnade för en ändring utanför dina mappar |  |
| `pane.warned_about_the_budget` | Warned about the budget | Varnade för budgeten |  |
| `pane.warned_about_too_many_agents` | Warned about too many agents | Varnade för för många agenter |  |
| `pane.warned_before_a_model_switch` | Warned before a model switch | Varnade före ett modellbyte |  |
| `pane.warned_that_a_screen_changed` | Warned that a screen changed | Varnade för att en skärm ändrats |  |
| `pane.warned_times` | Warned {times} | Varnade {times} | A warning row of the Autopilot card: Warned once, Warned 14 times. |
| `pane.week` | Week | Vecka |  |
| `pane.weekly_limit` | Weekly limit | Veckogräns |  |
| `pane.weekly_limit_all_models` | Weekly limit · all models | Veckogräns · alla modeller |  |
| `pane.went_on_with_a_task_run` | Went on with a task run after a limit reset | Fortsatte en uppgiftskörning efter att gränsen återställts |  |
| `pane.when_claude_ends_a_turn_while` | When Claude ends a turn while this check fails, vaken asks Claude to go on: at most 3 rounds, for this session only. Your next message, a pass or Stop keeping going ends it. | När Claude avslutar en tur medan kontrollen misslyckas ber vaken Claude fortsätta: högst 3 omgångar, bara i den här sessionen. Ditt nästa meddelande, en godkänd körning eller Sluta köra vidare avslutar det. |  |
| `pane.where_it_comes_from_claude_code` | Where it comes from: Claude Code | Varifrån det kommer: Claude Code |  |
| `pane.where_it_went_estimate` | Where it went (estimate) | Vart det gick (uppskattning) |  |
| `pane.where_this_sessions_spend_went` | Where this session's spend went, an estimate from sizes and token counts only: file reads {reads}, tool output {output}, agents {agents}, plain turns {turns}. | Vart den här sessionens förbrukning gick, en uppskattning enbart från storlekar och antal token: filläsningar {reads}, verktygsutdata {output}, agenter {agents}, vanliga svar {turns}. |  |
| `pane.worst_stop` | worst stop | värsta stoppas |  |
| `pane.wrote_a_brief_for_a_fresh` | Wrote a brief for a fresh session | Skrev en sammanfattning för en ny session |  |
| `pane.wrote_a_session_packet` | Wrote a session packet | Skrev ett sessionspaket |  |
| `pane.wrote_starter_agents` | Wrote starter agents | Skrev startagenter |  |
| `pane.your_mode_follows_the_new_modes` | Your mode follows the new modes after an update | Ditt läge följer de nya lägena efter en uppdatering |  |
| `pane.your_turn` | Your turn | Din tur |  |

## glance

Glance rows: one headline per card. (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `glance.1_merged` | 1 merged | 1 ihopslaget |  |
| `glance.1_used` | 1 used | 1 använd |  |
| `glance.1_worktree_idle` | 1 worktree idle | 1 arbetsträd orört |  |
| `glance.1_worktree_to_remove` | 1 worktree to remove | 1 arbetsträd att ta bort |  |
| `glance.all_clear` | All clear | Allt väl |  |
| `glance.all_done` | All done | Alla klara |  |
| `glance.all_n` | All {n} | Alla {n} |  |
| `glance.busy` | busy | upptagen |  |
| `glance.changed` | Changed | Ändrad |  |
| `glance.conflict` | Conflict | Konflikt |  |
| `glance.context` | Context | Kontext |  |
| `glance.context_nearly_full` | Context nearly full | Kontext nästan full |  |
| `glance.context_pct_full` | Context {pct} full | Kontext {pct} full |  |
| `glance.cores` | cores | kärnor |  |
| `glance.empty_no_agent_here` | No agent in this session yet | Ingen agent i den här sessionen än |  |
| `glance.empty_no_agent_runs` | No agent runs now | Ingen agent kör nu |  |
| `glance.empty_no_agents` | No agents yet | Inga agenter än |  |
| `glance.empty_no_checks` | No checks yet | Inga kontroller än |  |
| `glance.empty_no_commands` | No commands in the last answer | Inga kommandon i senaste svaret |  |
| `glance.empty_no_other_session` | No other session now | Ingen annan session nu |  |
| `glance.empty_nothing_needs_you` | Nothing needs you | Inget behöver dig |  |
| `glance.error` | Error | Fel |  |
| `glance.glance` | Glance | Överblick |  |
| `glance.halted` | Paused for safety | Pausad för säkerhets skull |  |
| `glance.heat` | heat | värme |  |
| `glance.heavy_files` | Heavy files | Tunga filer |  |
| `glance.helpers` | Agents | Agenter |  |
| `glance.in_sync` | Up to date | Aktuell |  |
| `glance.is_there_room_computer` | Is there room? (Computer) | Finns det plats? (Dator) |  |
| `glance.lean` | Lean | Smal |  |
| `glance.limited_by` | limited by | begränsas av |  |
| `glance.memory` | memory | minnet |  |
| `glance.memory_pressure` | memory pressure | minnestryck |  |
| `glance.mixed` | Mixed | Blandat |  |
| `glance.more` | more | till |  |
| `glance.n_failed` | {n} failed | {n} gick fel |  |
| `glance.n_failing` | {n} failing | {n} misslyckas |  |
| `glance.n_held` | {n} stopped | {n} stoppade |  |
| `glance.n_in_needs_you` | {n} in Needs you | {n} i Behöver dig |  |
| `glance.n_merged` | {n} merged | {n} ihopslagna |  |
| `glance.n_more_in_needs_you` | {n} more in Needs you | {n} till i Behöver dig |  |
| `glance.n_open` | {n} open | {n} öppna |  |
| `glance.n_running` | {n} running | {n} körs |  |
| `glance.n_running_w_waiting` | {n} running, {w} waiting | {n} körs, {w} väntar |  |
| `glance.n_stuck` | {n} with no progress | {n} utan framsteg |  |
| `glance.n_to_fix` | {n} to fix | {n} att laga |  |
| `glance.n_to_review` | {n} to review | {n} att granska |  |
| `glance.n_to_run` | {n} to run | {n} att köra |  |
| `glance.n_today` | {n} today | {n} i dag |  |
| `glance.n_unproven` | {n} unproven | {n} obevisade |  |
| `glance.n_used` | {n} used | {n} använda |  |
| `glance.n_waiting` | {n} waiting | {n} väntar |  |
| `glance.n_waiting_for_you` | {n} waiting for you | {n} väntar på dig |  |
| `glance.n_working` | {n} working | {n} arbetar |  |
| `glance.n_worktrees_idle` | {n} worktrees idle | {n} arbetsträd orörda |  |
| `glance.n_worktrees_to_remove` | {n} worktrees to remove | {n} arbetsträd att ta bort |  |
| `glance.n_your_turn` | {n} your turn | {n} din tur |  |
| `glance.name_colon_pct_used` | {name}: {pct} used | {name}: {pct} använt |  |
| `glance.name_pct_used` | {name} {pct} used | {name} {pct} använt |  |
| `glance.no_progress` | No progress | Inga framsteg |  |
| `glance.no_room` | No room for another agent | Inget utrymme för en agent till |  |
| `glance.none` | None | Inga |  |
| `glance.none_open` | None open | Ingen öppen |  |
| `glance.not_begun` | Not begun | Ej startad |  |
| `glance.not_checked` | Not checked | Inte kontrollerad |  |
| `glance.not_known_yet` | Not known yet | Inte känt än |  |
| `glance.not_read` | not read | inte läst |  |
| `glance.not_reported` | Not reported | Inte rapporterad |  |
| `glance.not_shared` | Not shared | Delas inte |  |
| `glance.not_started` | Not started | Inte startad |  |
| `glance.nothing_yet` | Nothing yet | Inget än |  |
| `glance.out_of_date` | Out of date | Inaktuell |  |
| `glance.paused` | Paused | Pausad |  |
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
| `glance.warns_only` | Warns only | Bara varningar |  |
| `glance.warns_stops_the_worst` | Warns, stops the worst | Varnar, stoppar det värsta |  |
| `glance.warns_worst_may_stop` | Warns, worst may stop | Varnar, det värsta kan stoppas |  |

## cardsettings

The flip side of a card (its own settings). (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `cardsettings.arranging` | Arranging | Ordnar |  |
| `cardsettings.back` | ‹ Back | ‹ Tillbaka |  |
| `cardsettings.cards_with_a_problem_move_to` | Cards with a problem move to the top of their column. | Kort med ett problem flyttas överst i sin kolumn. |  |
| `cardsettings.detail_of_this_card` | Detail of this card | Detalj för det här kortet |  |
| `cardsettings.drag_a_card_to_move_it` | Drag a card to move it. This width only. | Dra ett kort för att flytta det. Bara den här bredden. |  |
| `cardsettings.drag_a_card_to_move_it_auto` | Drag a card to move it. This width only. Cards Auto hides are not here. | Dra ett kort för att flytta det. Bara den här bredden. Kort som Auto döljer syns inte här. |  |
| `cardsettings.drop_a_card_here` | Drop a card here | Släpp ett kort här |  |
| `cardsettings.habits_link` | Working habits in Prompts and memory › | Arbetsvanor i Prompter och minne › |  |
| `cardsettings.more_in_settings` | More in Settings › | Mer i Inställningar › |  |
| `cardsettings.n_more_in_settings` | {n} more in Settings › | {n} till i Inställningar › |  |
| `cardsettings.show_or_hide_cards` | Show or hide cards › | Visa eller dölj kort › |  |
| `cardsettings.show_this_card` | Show this card | Visa det här kortet |  |
| `cardsettings.spending_limits_estimates` | Spending limits (estimates) | Utgiftsgränser (uppskattningar) |  |
| `cardsettings.switched_to_custom_so_you_can` | Switched to Custom so you can arrange. Your cards stay the same. | Bytte till Egen så att du kan ordna. Dina kort är desamma. |  |
| `cardsettings.switched_to_your_custom_cards_so` | Switched to your Custom cards so you can arrange them. | Bytte till dina egna kort så att du kan ordna dem. |  |

## sys

Words of the system (Mac or PC). (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `sys.after_2_minutes_with_no_press` | After 2 minutes with no press or prompt, vaken sends one Windows notification when another session needs you or a plan limit is near; with This session too, also when a step here waits for your yes or a long answer is done. At most one comes every 30 seconds and several become one, while Hours without notices and Quiet hold them. /vaken-settings notify.how sound adds a sound, speak says it. | Efter 2 minuter utan tryck eller prompt skickar vaken en Windows-notis när en annan session behöver dig eller en plangräns är nära; med Även den här sessionen också när ett steg här väntar på ditt ja eller ett långt svar är klart. Högst en kommer var 30:e sekund och flera blir en, medan Timmar utan notiser och Tyst håller dem. /vaken-settings notify.how sound lägger till ett ljud, speak säger det. |  |
| `sys.block_n_this_needs_a_shell` | Block {n}: This needs a shell I could not find. | Block {n}: Det här behöver ett skal som jag inte hittade. |  |
| `sys.keep_pc_awake` | Keep PC awake | Håll datorn vaken |  |
| `sys.keep_the_pc_awake_for_a` | Keep the PC awake for a phone or a waiting question. | Håll datorn vaken för en telefon eller en fråga som väntar. |  |
| `sys.keep_the_pc_awake_while_agents` | Keep the PC awake while agents work. | Håll datorn vaken medan agenter arbetar. |  |
| `sys.keep_the_pc_awake_while_you` | Keep the PC awake while you are away? Reply /vaken-help run awake on | Hålla datorn vaken medan du är borta? Svara /vaken-help run awake on |  |
| `sys.kept_the_pc_awake` | Kept the PC awake | Höll datorn vaken |  |
| `sys.leftover_programs_the_process_list` | Leftover programs: the process list did not answer, so nothing could be checked. | Kvarglömda program: processlistan svarade inte, så inget kunde kontrolleras. |  |
| `sys.like_the_pc` | Like the PC | Som datorn |  |
| `sys.look_at_each_line_before_you` | Look at each line before you run it: a program you started by hand in that folder looks the same. The folder is read from the program, or from its command when Windows does not tell it. Vaken never stops a program. | Titta på varje rad innan du kör den: ett program du startade för hand i den mappen ser likadant ut. Mappen läses från programmet, eller från dess kommando när Windows inte berättar den. Vaken stoppar aldrig ett program. |  |
| `sys.night_run_goes_on_the_pc` | Night run goes on: the PC is on power again | Nattkörningen fortsätter: datorn har ström igen |  |
| `sys.night_run_paused_the_pc_is` | Night run paused: the PC is on battery | Nattkörningen pausad: datorn går på batteri |  |
| `sys.no_programs_folder_could_be_read` | No program's folder could be read, and none names a session folder in its command. | Inget programs mapp kunde läsas, och inget nämner en sessionsmapp i sitt kommando. |  |
| `sys.pc_awake` | PC awake | Datorn vaken |  |
| `sys.runs_this_command_in_the_session` | Runs this command in the session folder after you press. The result shows under the row. It runs in PowerShell. | Kör kommandot i sessionens mapp när du trycker. Resultatet visas under raden. Det körs i PowerShell. |  |
| `sys.starts_as_many_as_this_pc` | Starts as many as this PC has room for. | Startar så många som datorn har plats för. |  |
| `sys.starts_n_at_a_time_until` | Starts {n} at a time until this PC is read: turn on the computer reading in Settings &gt; Agents | Startar {n} åt gången tills datorn är avläst: slå på datoravläsningen i Inställningar &gt; Agenter |  |
| `sys.starts_up_to_n_at_once` | Starts up to {n} at once: room for {n} on this PC | Startar upp till {n} samtidigt: plats för {n} på datorn |  |
| `sys.stopped_keeping_the_pc_awake_limit` | Stopped keeping the PC awake: limit reached | Slutade hålla datorn vaken: gränsen nådd |  |
| `sys.the_pc_was_kept_awake_for` | The PC was kept awake for 8 hours, which is the most vaken allows. It lets the PC sleep now. | Datorn hölls vaken i 8 timmar, vilket är det mesta vaken tillåter. Den får sova nu. |  |
| `sys.the_ports_could_not_be_read` | The ports could not be read: the netstat program did not answer. | Portarna kunde inte läsas: programmet netstat svarade inte. |  |
| `sys.this_needs_a_shell_i_could` | This needs a shell I could not find. | Det här behöver ett skal som jag inte hittade. |  |
| `sys.this_one_looks_risky_press_once` | This one looks risky. Press once to see it, then Yes, run it. It runs in PowerShell. | Det här ser riskabelt ut. Tryck en gång för att se det, sedan Ja, kör det. Det körs i PowerShell. |  |
| `sys.this_pc_is_short_of_memory` | This PC is short of memory. | Datorn har ont om minne. |  |
| `sys.turn_it_on_with_vaken_settings` | Turn it on with /vaken-settings night.mode on, then type /vaken-tasks night. The run goes only on mains power, inside the plan limit and its cost limit, with away mode's strict checks on and the PC kept awake if keep-awake is on. In the morning, Where was I shows what is done. | Slå på det med /vaken-settings night.mode on och skriv sedan /vaken-tasks night. Körningen går bara på nätström, inom plangränsen och sin kostnadsgräns, med bortalägets strikta kontroller på och datorn vaken om håll vaken är på. På morgonen visar Var var jag vad som är klart. |  |
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
| `compact.compacted_at_size` | Compacting because the session reached {pct}% of its window | Komprimerar eftersom sessionen nådde {pct} % av sitt fönster |  |
| `compact.compacted_during_a_break` | Compacting during a break, while the cache is still warm | Komprimerar under en paus, medan cachen fortfarande är varm |  |
| `compact.compacting_now_because_why` | Compacting now because: {why} | Komprimerar nu eftersom: {why} |  |
| `compact.context_n` | context {n}% | kontext {n} % |  |
| `compact.could_not_save_the_handoff_brief` | could not save the handoff note | kunde inte spara överlämningen |  |
| `compact.detail_at_size` | at {pct}% of the window | vid {pct} % av fönstret |  |
| `compact.detail_during_a_break` | during a break | under en paus |  |
| `compact.gap_20_min` | the session was compacted in the last 20 minutes | sessionen komprimerades de senaste 20 minuterna |  |
| `compact.good_moment_because_why` | Good moment because: {why} | Bra stund eftersom: {why} |  |
| `compact.last_shortening` | Last compaction | Senaste komprimeringen |  |
| `compact.let_the_cockpit_shorten_the_chat` | Vaken can compact the session at good moments. Let it? | Vaken kan komprimera sessionen vid lämpliga stunder. Låta den göra det? |  |
| `compact.no_file_changed` | no file changed | ingen fil ändrades |  |
| `compact.not_time_yet` | it is not time yet: the session is not full and no break is near its end | det är inte dags än: sessionen är inte full och ingen paus är nära sitt slut |  |
| `compact.not_time_yet_busy` | it is not time yet: agents still run and the session is not full enough | det är inte dags än: agenter körs och sessionen är inte tillräckligt full |  |
| `compact.pays_back_soon` | pays back soon | lönar sig snart |  |
| `compact.quiet_for_2_minutes` | idle for 2 minutes | inaktiv i 2 minuter |  |
| `compact.see` | See | Se |  |
| `compact.shortened_the_chat_kept_goal_branch` | Compacted the session. Kept: goal, branch, files, decisions, next steps. Brief saved: {name}. | Komprimerade sessionen. Behöll: mål, gren, filer, beslut, nästa steg. Överlämning sparad: {name}. |  |
| `compact.show_advice` | Show advice | Visa råd |  |
| `compact.skipped_why` | Skipped: {why} | Hoppade över: {why} |  |
| `compact.task_finished` | task finished | uppgiften klar |  |
| `compact.the_chat_is_still_small` | the session is still small | sessionen är ännu liten |  |
| `compact.the_chat_was_shortened_in_the` | the session was compacted in the last 10 minutes | sessionen komprimerades de senaste 10 minuterna |  |
| `compact.the_guard_holds_a_step_for` | a risky step was stopped and waits for your yes | ett riskabelt steg har stoppats och väntar på ditt ja |  |
| `compact.the_work_is_still_open` | the work is still open | arbetet är fortfarande öppet |  |
| `compact.waiting_answering` | Waiting: Claude is still answering. | Väntar: Claude svarar fortfarande. |  |
| `compact.waiting_asks` | Waiting: a question or a permission waits for you. | Väntar: en fråga eller en tillåtelse väntar på dig. |  |
| `compact.waiting_gap` | Waiting: the session was compacted {n} min ago. Auto leaves 20 min between two. | Väntar: sessionen komprimerades för {n} min sedan. Auto väntar 20 min mellan två. |  |
| `compact.waiting_guard` | Waiting: a risky step was stopped and waits for your yes. | Väntar: ett riskabelt steg har stoppats och väntar på ditt ja. |  |
| `compact.waiting_helpers` | Waiting: an agent is running in the foreground. | Väntar: en agent körs i förgrunden. |  |
| `compact.waiting_payback` | Waiting: the session is full, but compacting would not pay back soon. | Väntar: sessionen är full, men det lönar sig inte snart att komprimera. |  |
| `compact.when_to_compact` | When to compact | Dags att komprimera? |  |
| `compact.why_gave_up` | Waiting: Auto could not compact this session. It tries again in {n} min. | Väntar: Auto kunde inte komprimera sessionen. Försöker igen om {n} min. |  |
| `compact.why_ready_break` | Now is a good moment: Auto compacts during this break. | Nu är en bra stund: Auto komprimerar under den här pausen. |  |
| `compact.why_ready_size` | Now is a good moment: Auto compacts at {from}% (now {pct}%). | Nu är en bra stund: Auto komprimerar vid {from} % (nu {pct} %). |  |
| `compact.why_ready_size_app` | Now is a good moment: Auto compacts at {from}%, Claude Code at {app}% (now {pct}%). | Nu är en bra stund: Auto komprimerar vid {from} %, Claude Code vid {app} % (nu {pct} %). |  |
| `compact.why_rule_busy` | With agents running, Auto waits until {busy}% (now {pct}%), and not during a break. Not under {min} tokens (now {tok}). | När agenter körs väntar Auto till {busy} % (nu {pct} %), och inte under en paus. Aldrig under {min} tokens (nu {tok}). |  |
| `compact.why_rule_cold` | Auto compacts at {from}% (now {pct}%). The cache has lapsed, so not during a break. With agents running, Auto waits until {busy}%. Not under {min} tokens (now {tok}). | Auto komprimerar vid {from} % (nu {pct} %). Cachen har tagit slut, så inte under en paus. När agenter körs väntar Auto till {busy} %. Aldrig under {min} tokens (nu {tok}). |  |
| `compact.why_rule_noplan` | Auto compacts at {from}% (now {pct}%). Your plan is not known yet, so not during a break. With agents running, Auto waits until {busy}%. Not under {min} tokens (now {tok}). | Auto komprimerar vid {from} % (nu {pct} %). Din plan är inte känd än, så inte under en paus. När agenter körs väntar Auto till {busy} %. Aldrig under {min} tokens (nu {tok}). |  |
| `compact.why_rule_warm` | Auto compacts at {from}% (now {pct}%), or during a break: after {m} min away while the cache is warm. With agents running, Auto waits until {busy}%. Not under {min} tokens (now {tok}). | Auto komprimerar vid {from} % (nu {pct} %), eller under en paus: efter {m} min borta medan cachen är varm. När agenter körs väntar Auto till {busy} %. Aldrig under {min} tokens (nu {tok}). |  |
| `compact.work_saved` | work saved | arbetet sparat |  |
| `compact.yes` | Yes | Ja |  |
| `compact.you_are_typing` | you are typing a prompt | du skriver ett meddelande |  |

## skills

The Skills card. (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `skills.1_skill_listed_k_tokens` | 1 skill listed, {k} tokens | 1 färdighet listad, {k} tokens |  |
| `skills.1_time` | 1 time | 1 gång |  |
| `skills.a_skill_is_a_ready_made` | A skill is a ready-made way of working that Claude can load, such as grilling or a code review. The count is how often one was used in the last 7 days. | En färdighet är ett färdigt arbetssätt som Claude kan ladda, till exempel grilling eller en kodgranskning. Antalet är hur ofta en användes de senaste 7 dagarna. |  |
| `skills.all_used_this_week` | ; all used this week | ; alla använda den här veckan |  |
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
| `skills.no_skill_used_this_week` | No skill used this week | Ingen färdighet använd den här veckan |  |
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
| `find.claude_gets` | Claude gets: {list}. | Claude får: {list}. | Settings, the mode card: what Claude is told with the settings now; {list} is the parts joined with commas |
| `find.copied` | Copied | Kopierat |  |
| `find.copy` | Copy | Kopiera | The press word at the end of a row that copies a command |
| `find.find` | Find | Hitta |  |
| `find.find_a_setting` | Find a setting | Hitta en inställning |  |
| `find.find_a_skill_or_command` | Find a skill or command | Sök färdighet eller kommando |  |
| `find.find_in_help` | Find in Help | Sök i hjälpen |  |
| `find.gets_assume` | assumption review | granskning av antaganden |  |
| `find.gets_habits` | the habits note | noteringen om arbetsvanor |  |
| `find.gets_notes` | notes from every check | noteringar från varje kontroll |  |
| `find.gets_plain` | plain words | enkla ord |  |
| `find.gets_plan` | plan first | plan först |  |
| `find.gets_prompt` | prompt review | promptgranskning |  |
| `find.gets_safety` | safety notes | säkerhetsnoteringar |  |
| `find.most_used` | Most used | Mest använda | Settings: the card of the rows a new person needs most |
| `find.no_help_matches` | No help topic holds "{words}". | Inget hjälpavsnitt innehåller "{words}". |  |
| `find.no_setting_matches` | No setting holds "{words}". | Ingen inställning innehåller "{words}". |  |
| `find.no_skill_or_command_matches` | No skill or command matches. | Ingen färdighet eller inget kommando matchar. |  |
| `find.not_copied` | Could not copy. Type: {text} | Kunde inte kopiera. Skriv: {text} |  |
| `find.old_name` | The folder .claude/cockpit/ keeps vaken's older name, so your data stays. | Mappen .claude/cockpit/ har kvar vakens äldre namn, så att dina data finns kvar. |  |
| `find.the_commands_could_not_be_read` | The commands could not be read. | Kommandona gick inte att läsa. |  |
| `find.try_after_limit` | the wait after a plan limit; off cancels it | väntan efter en plangräns; off avbryter den |  |
| `find.try_audit` | every step vaken took | varje steg som vaken tog |  |
| `find.try_awake` | keep the computer awake while a session works | håll datorn vaken medan en session arbetar |  |
| `find.try_brief` | the note for the next session, to paste | noteringen till nästa session, att klistra in |  |
| `find.try_claims` | who edits what | vem som ändrar vad |  |
| `find.try_coach` | save a request you repeat as a skill | spara en begäran du upprepar som en färdighet |  |
| `find.try_confidence` | one number made only of evidence | ett tal som bara bygger på belägg |  |
| `find.try_diet` | are my instruction files too big? | är mina instruktionsfiler för stora? |  |
| `find.try_do` | the commands in the last answer | kommandona i det senaste svaret |  |
| `find.try_focus` | quiet for 50 minutes: only what needs you gets through | tyst i 50 minuter: bara det som behöver dig kommer fram |  |
| `find.try_health` | does vaken still work after an update? | fungerar vaken fortfarande efter en uppdatering? |  |
| `find.try_intent` | what you asked, what was delivered, what is missing | vad du bad om, vad som levererades, vad som saknas |  |
| `find.try_keeper` | when the cache was last kept warm | när cachen senast hölls varm |  |
| `find.try_laptop` | your computer's memory, swap, battery and heat | datorns minne, växlingsfil, batteri och värme |  |
| `find.try_loops` | the steps that failed the same way again and again | stegen som misslyckades på samma sätt om och om igen |  |
| `find.try_modhealth` | the counts of the self-check of vaken | siffrorna från vakens självkontroll |  |
| `find.try_outcomes` | finished work and about what it cost | klart arbete och ungefär vad det kostade |  |
| `find.try_packet` | save the note for the next session as a file | spara noteringen till nästa session som en fil |  |
| `find.try_popout` | open this session in a new window | öppna den här sessionen i ett nytt fönster |  |
| `find.try_ports` | which session holds which port | vilken session som håller vilken port |  |
| `find.try_setup` | the agent files and what differs | agentfilerna och vad som skiljer |  |
| `find.try_skills` | what the Skills card shows | vad kortet Färdigheter visar |  |
| `find.try_story` | what happened, from counts only | vad som hände, bara från siffror |  |
| `find.try_these` | Try these | Prova dessa | Help: the topic that lists the tools with no button of their own |
| `find.try_these_note` | Tools with no button of their own. A press copies the command. Paste it in the chat. | Verktyg utan egen knapp. Ett tryck kopierar kommandot. Klistra in det i chatten. |  |
| `find.try_tidy` | leftover notes from closed sessions | kvarlämnade noteringar från stängda sessioner |  |
| `find.try_trust` | what your plugins can do | vad dina tillägg kan göra |  |

## talk

The Talk to other sessions card. (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `talk.a_short_command_with_no_file` | A short command with no file name, path, number or quoted text, and no goal. | Ett kort kommando utan filnamn, sökväg, siffra eller citat, och inget mål. |  |
| `talk.answer` | Answer | Svar |  |
| `talk.answer_it_in_that_session_the` | Answer it in that session. Vaken never says yes for you. | Svara i den sessionen. Vaken säger aldrig ja åt dig. |  |
| `talk.answer_name` | Answer {name} | Svara {name} |  |
| `talk.asked_claude_to_give_the_agent` | Asked Claude to give the agent its next step. | Bad Claude ge agenten nästa steg. |  |
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
| `talk.no_sign_for_n_min` | No sign for {n} min | Inget tecken på {n} min |  |
| `talk.not_now` | Not now | Inte nu |  |
| `talk.not_sent_no_session_has_that_name` | Not sent: no session has that name. | Inte skickat: ingen session har det namnet. |  |
| `talk.not_sent_several_sessions_have` | Not sent: several sessions have that name. | Inte skickat: flera sessioner har det namnet. |  |
| `talk.not_sent_the_session_is_closed` | Not sent: the session is closed. | Inte skickat: sessionen är stängd. |  |
| `talk.not_sent_the_session_said_no` | Not sent: the session said no. | Inte skickat: sessionen sa nej. |  |
| `talk.not_sent_type_it_in_that_session` | Not sent. Type it in that session. | Inte skickat. Skriv det i den sessionen. |  |
| `talk.nudge_asks_claude` | Nudge · asks Claude | Knuffa · ber Claude |  |
| `talk.nudge_sends_continue` | Nudge · sends continue | Knuffa · skickar continue |  |
| `talk.nudged` | nudged | knuffad |  |
| `talk.nudged_continue_goes_in_when_the` | Nudged: continue goes in when the answer ends. If it is stuck, press Stop in the app first. | Knuffad: continue går in när svaret slutar. Om den har fastnat: tryck på Stopp i appen först. |  |
| `talk.nudged_less_than_10_minutes_ago` | Nudged less than 10 minutes ago. Give it a moment. | Knuffad för mindre än 10 minuter sedan. Ge den en stund. |  |
| `talk.nudged_sent_continue` | Nudged: sent continue. | Knuffad: skickade continue. |  |
| `talk.reply` | Reply | Svara |  |
| `talk.reply_to_name` | Reply to {name} | Svara {name} |  |
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
| `talk.your_reply_is_sent_to_name_as` | Your reply is sent to {name} as a message from you and starts its next answer. | Ditt svar skickas till {name} som ett meddelande från dig och startar dess nästa svar. |  |

## calm

Calm: focus and quiet times. (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `calm.1_compaction` | 1 compaction | 1 komprimering |  |
| `calm.1_loop_caught` | 1 loop caught | 1 loop fångad |  |
| `calm.1_risky_step_stopped` | 1 risky step stopped | 1 riskabelt steg stoppat |  |
| `calm.1_task_not_done` | 1 task not done | 1 uppgift inte klar |  |
| `calm.and` | and | och |  |
| `calm.and_n_more_projects` | and {n} more projects | och {n} projekt till |  |
| `calm.caught_a_repeating_step_n_times_count` | Caught a repeating step {n} times. | Fångade ett upprepat steg {n} gånger. |  |
| `calm.caught_a_repeating_step_once` | Caught a repeating step once. | Fångade ett upprepat steg en gång. |  |
| `calm.compacted_the_session_n_times` | Compacted the session {n} times. | Komprimerade sessionen {n} gånger. |  |
| `calm.compacted_the_session_once` | Compacted the session once. | Komprimerade sessionen en gång. |  |
| `calm.counted_from_what_vaken_wrote` | Counted from what vaken wrote down. Time and usage saved are not guessed. | Räknat från det vaken skrev ner. Sparad tid och användning gissas inte. |  |
| `calm.earlier_session` | Earlier session | Tidigare session |  |
| `calm.end_focus` | End quiet | Avsluta tyst |  |
| `calm.ended_mid_turn` | ended mid‑answer | slutade mitt i ett svar |  |
| `calm.estimate` | estimate | uppskattning |  |
| `calm.focus_n_min_left` | Quiet · {n} min left | Tyst · {n} min kvar |  |
| `calm.full` | full | fullt |  |
| `calm.got_it` | Got it | Förstått |  |
| `calm.kinds_failed` | {kinds} failed | {kinds} misslyckades |  |
| `calm.left_open_yesterday` | Left open yesterday | Lämnat öppet i går |  |
| `calm.lint` | lint | lint-kontrollen |  |
| `calm.n_compactions` | {n} compactions | {n} komprimeringar |  |
| `calm.n_loops_caught` | {n} loops caught | {n} loopar fångade |  |
| `calm.n_risky_steps_stopped` | {n} risky steps stopped | {n} riskabla steg stoppade |  |
| `calm.n_sessions_ended_mid_turn` | {n} sessions ended mid‑answer | {n} sessioner slutade mitt i ett svar |  |
| `calm.n_tasks_not_done` | {n} tasks not done | {n} uppgifter inte klara |  |
| `calm.pause_notices_for_50_min` | Quiet for 50 min › | Tyst i 50 min › |  |
| `calm.room_for_n_more` | room for {n} more | plats för {n} till |  |
| `calm.stopped_a_risky_step_once` | Stopped a risky step once. | Stoppade ett riskabelt steg en gång. |  |
| `calm.stopped_n_risky_steps` | Stopped {n} risky steps. | Stoppade {n} riskabla steg. |  |
| `calm.tests` | tests | testerna |  |
| `calm.the_build` | the build | bygget |  |
| `calm.the_type_check` | the type check | typkontrollen |  |
| `calm.this_week` | This week | Den här veckan |  |

## phone

The phone face. (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `phone.1_step_held` | 1 step stopped | 1 steg stoppat |  |
| `phone.5_hour` | 5-hour | 5-timmars |  |
| `phone.and_n_more` | and {n} more | och {n} till |  |
| `phone.ask_failed` | Claude could not be asked now. Try again in a moment. | Claude kunde inte tillfrågas nu. Försök igen om en stund. |  |
| `phone.asks_a_question` | asks a question | ställer en fråga |  |
| `phone.fri` | Fri | fre |  |
| `phone.menu_changed` | What changed (short) | Vad som ändrats (kort) |  |
| `phone.menu_continue` | Continue | Fortsätt |  |
| `phone.menu_pic` | Picture of my app | Bild av min app |  |
| `phone.menu_reply` | Reply with a number. | Svara med en siffra. |  |
| `phone.menu_status` | Status | = |  |
| `phone.menu_tests` | Run the tests | Kör testerna |  |
| `phone.mon` | Mon | mån |  |
| `phone.n_steps_held` | {n} steps stopped | {n} steg stoppade |  |
| `phone.needs_you_list` | Needs you: {list} | Behöver dig: {list} |  |
| `phone.on_the_phone_tip` | On the phone: /vaken for a menu, or /vaken show, /vaken run, /vaken pic. | På telefonen: /vaken för en meny, eller /vaken show, /vaken run, /vaken pic. |  |
| `phone.pct_of_the_weekly_limit` | {pct} of the weekly limit | {pct} av veckogränsen |  |
| `phone.pct_of_the_weekly_limit_model` | {pct} of the weekly limit ({model}) | {pct} av veckogränsen ({model}) |  |
| `phone.pct_of_your_extra_usage` | {pct} of your extra usage | {pct} av din extra användning |  |
| `phone.pct_of_your_spending_limit` | {pct} of your spending limit | {pct} av din utgiftsgräns |  |
| `phone.phone_hello` | Phone hello | Hälsning i telefonen |  |
| `phone.phone_note` | Phone note | Not till Claude (telefon) |  |
| `phone.pic_asked` | Took a picture of {url}. Asked Claude to send it. | Tog en bild av {url}. Bad Claude skicka den. |  |
| `phone.pic_down` | Nothing answers at {url}, so no picture was taken. Start the dev server, then try again. | Inget svarar på {url}, så ingen bild togs. Starta utvecklingsservern och försök igen. |  |
| `phone.pic_failed` | No picture was taken of {url}. Try again in a moment. | Ingen bild togs av {url}. Försök igen om en stund. |  |
| `phone.pic_local_only` | Only a page on this computer: type a port or a localhost address. | Bara en sida på den här datorn: skriv en port eller en localhost-adress. |  |
| `phone.pic_no_chrome` | No picture was taken: Google Chrome was not found. Install it, then try again. | Ingen bild togs: Google Chrome hittades inte. Installera det och försök igen. |  |
| `phone.pic_no_server` | No dev server found. Type its port, for example /vaken pic 3000. | Ingen utvecklingsserver hittades. Skriv dess port, till exempel /vaken pic 3000. |  |
| `phone.run_asked` | Asked Claude to run it and show the short output. Claude still asks before a risky step. | Bad Claude köra det och visa den korta utskriften. Claude frågar ändå före ett riskabelt steg. |  |
| `phone.run_empty` | Type a command after /vaken run, for example /vaken run npm test. | Skriv ett kommando efter /vaken run, till exempel /vaken run npm test. |  |
| `phone.sat` | Sat | lör |  |
| `phone.show_asked` | Asked Claude to send {path}. | Bad Claude skicka {path}. |  |
| `phone.show_empty` | Type a file after /vaken show, for example /vaken show README.md. | Skriv en fil efter /vaken show, till exempel /vaken show README.md. |  |
| `phone.show_missing` | There is no file at {path}. | Det finns ingen fil på {path}. |  |
| `phone.show_outside` | That file is outside this project, so vaken does not send it. | Filen ligger utanför projektet, så vaken skickar den inte. |  |
| `phone.show_secret` | That looks like a file with secrets, so vaken does not send it. | Det ser ut som en fil med hemligheter, så vaken skickar den inte. |  |
| `phone.sun` | Sun | sön |  |
| `phone.thu` | Thu | tors |  |
| `phone.tue` | Tue | tis |  |
| `phone.waits_for_an_ok` | waits for an OK | väntar på ett OK |  |
| `phone.wed` | Wed | ons |  |
| `phone.week` | week | vecka |  |
| `phone.while_your_phone_is_attached` | While your phone is attached, Claude is told what a phone cannot do. | Medan din telefon är ansluten får Claude veta vad en telefon inte kan. |  |

## phonecmds

Phone commands (/ok, /no, /go, /st). (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `phonecmds.held` | Stopped | Stoppat |  |
| `phonecmds.nothing_needs_you` | Nothing needs you. | Inget behöver dig. |  |
| `phonecmds.phone_mode` | Phone mode | Telefonläge |  |
| `phonecmds.phone_mode_asks_once` | Phone mode: asks once · Settings &gt; Attention | Telefonläge: frågar en gång · Inställningar &gt; Uppmärksamhet |  |
| `phonecmds.phone_mode_off` | Phone mode: off · Settings &gt; Attention | Telefonläge: av · Inställningar &gt; Uppmärksamhet |  |
| `phonecmds.phone_mode_on` | Phone mode: on · Settings &gt; Attention | Telefonläge: på · Inställningar &gt; Uppmärksamhet |  |
| `phonecmds.short_numbered_answers_while_you` | Short, numbered answers while you are on the phone? Turn on Phone mode: Settings &gt; Attention. | Korta, numrerade svar medan du är på telefonen? Slå på Telefonläge: Inställningar &gt; Uppmärksamhet. |  |
| `phonecmds.this_session` | this session | den här sessionen |  |
| `phonecmds.working` | Working | Arbetar |  |

## awake

Keeping the computer awake. (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `awake.a_helper_agent_is_running_in` | an agent is running in the background | en agent körs i bakgrunden |  |
| `awake.a_night_run_is_going` | a night run is going | en nattkörning pågår |  |
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
| `awake.waiting_2h` | Waiting 2h | Väntar 2 h |  |
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
| `prs.1_copy_idle_over_a_day` | 1 copy idle over a day | 1 arbetsträd orört i över ett dygn |  |
| `prs.a_copy_of_the_project_a` | A copy of the project (a worktree) whose branch {branch} is merged. Remove this copy deletes the folder and the merged branch, after it checks again that nothing is uncommitted or unpushed and that no session works there. | Ett arbetsträd (en kopia av projektet) vars gren {branch} är ihopslagen. Ta bort arbetsträdet raderar mappen och den ihopslagna grenen, efter att den har kontrollerat igen att inget är oincheckat eller opushat och att ingen session arbetar där. |  |
| `prs.a_session_works_in_that_copy` | A session works in that copy now, so it stays. | En session arbetar i det arbetsträdet nu, så det blir kvar. |  |
| `prs.asked_github_the_card_shows_what` | Asked GitHub. The card shows what it said. | Frågade GitHub. Kortet visar svaret. |  |
| `prs.asking_github` | Asking GitHub | Frågar GitHub |  |
| `prs.behind` | behind | ligger efter |  |
| `prs.checking_the_copy` | Checking the copy | Kontrollerar arbetsträdet |  |
| `prs.conflicts` | conflicts | konflikter |  |
| `prs.copies_of_the_project_worktrees_with` | Copies of the project (worktrees) with nothing uncommitted, no open pull request vaken knows of, and no commit for over a day. | Arbetsträd (kopior av projektet) utan något oincheckat, utan någon öppen pull request som vaken känner till och utan incheckning på över ett dygn. |  |
| `prs.could_not_ask_github_type_cockpit` | Could not ask GitHub. Type /vaken-ship pr to see why. | Kunde inte fråga GitHub. Skriv /vaken-ship pr för att se varför. |  |
| `prs.could_not_make_the_ship_check` | Could not make the ship check here. Type /vaken-ship in the session. | Kunde inte göra leveranskontrollen här. Skriv /vaken-ship i sessionen. |  |
| `prs.could_not_reach_github_vaken_asks` | Could not reach GitHub. Vaken asks again in a few minutes. | Nådde inte GitHub. Vaken frågar igen om några minuter. |  |
| `prs.could_not_read_that_copy_nothing` | Could not read that copy. Nothing was removed. | Kunde inte läsa det arbetsträdet. Inget togs bort. |  |
| `prs.could_not_read_the_checks_type` | Could not read the checks. Type /vaken-ship ci-fix in the session. | Kunde inte läsa kontrollerna. Skriv /vaken-ship ci-fix i sessionen. |  |
| `prs.draft` | draft | utkast |  |
| `prs.failing` | failing | misslyckas |  |
| `prs.gh_is_not_signed_in_to` | gh is not signed in to GitHub. Type gh auth login in a terminal. | gh är inte inloggat på GitHub. Skriv gh auth login i en terminal. |  |
| `prs.git_could_not_remove_it_nothing` | git could not remove it. Nothing was removed. | git kunde inte ta bort den. Inget togs bort. |  |
| `prs.git_is_not_installed_or_not` | git is not installed or not on the path. | git är inte installerat eller finns inte i sökvägen. |  |
| `prs.github_could_not_be_reached` | GitHub could not be reached | Nådde inte GitHub |  |
| `prs.github_did_not_answer_in_time` | GitHub did not answer in time | GitHub svarade inte i tid |  |
| `prs.github_did_not_answer_in_time_vaken` | GitHub did not answer in time. Vaken asks again in a few minutes. | GitHub svarade inte i tid. Vaken frågar igen om några minuter. |  |
| `prs.githubs_answer_could_not_be_read` | GitHub's answer could not be read | GitHubs svar gick inte att läsa |  |
| `prs.githubs_answer_could_not_be_read_vaken` | GitHub's answer could not be read. Vaken asks again in a few minutes. | GitHubs svar gick inte att läsa. Vaken frågar igen om några minuter. |  |
| `prs.here_is_the_ship_check_nothing` | Here is the ship check. Nothing was merged. | Här är leveranskontrollen. Inget slogs ihop. |  |
| `prs.install_gh_githubs_program` | Install gh, GitHub's program | Installera gh, GitHubs program |  |
| `prs.it_has_1_change_not_committed` | It has 1 change not committed. Nothing was removed. | Den har 1 ändring som inte är incheckad. Inget togs bort. |  |
| `prs.it_has_1_commit_that_is` | It has 1 commit that is not pushed and not in {base}. Nothing was removed. | Den har 1 incheckning som inte är pushad och inte finns i {base}. Inget togs bort. |  |
| `prs.it_has_1_ignored_file_that_would` | It has 1 ignored file that would be deleted: {name}. Nothing was removed. | Den har 1 ignorerad fil som skulle raderas: {name}. Inget togs bort. |  |
| `prs.it_has_n_changes_not_committed` | It has {n} changes not committed. Nothing was removed. | Den har {n} ändringar som inte är incheckade. Inget togs bort. |  |
| `prs.it_has_n_commits_that_are` | It has {n} commits that are not pushed and not in {base}. Nothing was removed. | Den har {n} incheckningar som inte är pushade och inte finns i {base}. Inget togs bort. |  |
| `prs.it_has_n_ignored_files_that_would` | It has {n} ignored files that would be deleted, such as {name}. Nothing was removed. | Den har {n} ignorerade filer som skulle raderas, till exempel {name}. Inget togs bort. |  |
| `prs.look_now` | Look now | Titta nu |  |
| `prs.made_a_fix_request_3_times` | Made a fix request 3 times in 24 hours, and a check still fails. Look at the failure yourself. | Gjorde en begäran om att laga 3 gånger på 24 timmar, och en kontroll misslyckas fortfarande. Titta på felet själv. |  |
| `prs.merge_or_remove_each_one_yourself` | Merge or remove each one yourself. Vaken offers Remove this copy only once a copy is merged. | Slå ihop eller ta bort vart och ett själv. Vaken erbjuder Ta bort arbetsträdet först när ett arbetsträd är ihopslaget. |  |
| `prs.merged` | Merged | Ihopslagna |  |
| `prs.n_copies_idle_over_a_day` | {n} copies idle over a day | {n} arbetsträd orörda i över ett dygn |  |
| `prs.n_merged` | #{n} merged | #{n} ihopslagen |  |
| `prs.n_open` | {n} open | {n} öppna |  |
| `prs.n_running` | {n} running | {n} körs |  |
| `prs.name_is_merged` | {name} is merged | {name} är ihopslaget |  |
| `prs.name_on_branch_last_commit_ago` | {name} on {branch}, last commit {ago} | {name} på {branch}, senaste incheckning {ago} |  |
| `prs.needs_review` | needs review | behöver granskning |  |
| `prs.no_check_fails_now_nothing_to` | No check fails now. Nothing to fix. | Ingen kontroll misslyckas nu. Inget att laga. |  |
| `prs.no_open_pull_request` | No open pull request | Ingen öppen pull request |  |
| `prs.not_checked_on_github_yet` | Not checked on GitHub yet | Inte kontrollerad på GitHub än |  |
| `prs.open` | open | öppen |  |
| `prs.open_a_session_in_a_git` | Open a session in a git repository to see its pull requests. | Öppna en session i ett git-repository för att se dess pull requests. |  |
| `prs.open_now` | Open now | Öppna nu |  |
| `prs.passing` | passing | godkänd |  |
| `prs.pr_checks_are_off` | PR checks are off. | PR-kontrollen är av. |  |
| `prs.pull_request_n_branch_was_merged` | Pull request {n} ({branch}) was merged. The line goes after a day. | Pull request {n} ({branch}) slogs ihop. Raden försvinner efter en dag. |  |
| `prs.pull_requests` | Pull requests | Pull requests |  |
| `prs.pull_requests_belong_to_a_git` | Pull requests belong to a git repository. This session's folder is not in one, so there is nothing to ask GitHub. | Pull requests hör till ett git-repository. Den här sessionens mapp ligger inte i något, så det finns inget att fråga GitHub om. |  |
| `prs.reading_the_failing_check` | Reading the failing check | Läser kontrollen som misslyckades |  |
| `prs.ready` | ready | redo |  |
| `prs.remove_this_copy` | Remove this copy | Ta bort arbetsträdet |  |
| `prs.removed_the_copy_name_and_its` | Removed the copy {name} and its branch {branch}. | Tog bort arbetsträdet {name} och dess gren {branch}. |  |
| `prs.removed_the_copy_name_its_branch` | Removed the copy {name}. Its branch stays: git would not delete it. | Tog bort arbetsträdet {name}. Grenen blir kvar: git ville inte radera den. |  |
| `prs.running` | running | körs |  |
| `prs.sign_in_to_github_type_gh` | Sign in to GitHub: type gh auth login | Logga in på GitHub: skriv gh auth login |  |
| `prs.that_copy_changed_since_the_last` | That copy changed since the last look. Nothing was removed. | Det arbetsträdet har ändrats sedan senaste titten. Inget togs bort. |  |
| `prs.that_copy_is_gone_already` | That copy is gone already. | Det arbetsträdet är redan borta. |  |
| `prs.the_gh_program_is_not_installed` | The gh program is not installed. Install it from cli.github.com, then sign in. | Programmet gh är inte installerat. Installera det från cli.github.com och logga sedan in. |  |
| `prs.this_branch` | This branch | Den här grenen |  |
| `prs.this_branch_has_no_pull_request` | This branch has no pull request. | Grenen har ingen pull request. |  |
| `prs.this_folder_is_not_in_a` | This folder is not in a git repository. | Mappen ligger inte i ett git-repository. |  |
| `prs.this_session_works_in_that_copy` | This session works in that copy, so it stays. | Den här sessionen arbetar i det arbetsträdet, så det blir kvar. |  |
| `prs.worktrees` | Worktrees | Arbetsträd |  |
| `prs.your_open_pull_requests_checks_merging` | Your open pull requests: checks, merging and the next step. | Dina öppna pull requests: kontroller, ihopslagning och nästa steg. |  |

## ship

The Ship card. (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `ship.claims_with_no_check_behind_them` | Claims with no check behind them | Påståenden utan kontroll bakom |  |
| `ship.n_step_held_today` | {n} step stopped today | {n} steg stoppades i dag |  |
| `ship.n_steps_held_today` | {n} steps stopped today | {n} steg stoppades i dag |  |
| `ship.n_thing_blocks_it` | {n} thing blocks it | {n} sak hindrar |  |
| `ship.n_things_block_it` | {n} things block it | {n} saker hindrar |  |
| `ship.no_git_here` | No git here | Inget git här |  |
| `ship.nothing_to_ship_yet` | Nothing to ship yet | Inget att leverera än |  |
| `ship.pr_not_checked` | PR not checked | PR inte kontrollerad |  |
| `ship.ready` | Ready | Redo |  |
| `ship.ready_here` | Ready here | Redo här |  |
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
| `back.clear_the_open_ends_in_all` | Clear the open ends in all sessions | Rensa öppna trådar i alla sessioner |  |
| `back.n_projects_have_open_ends` | {n} projects have open ends | {n} projekt har öppna trådar |  |
| `back.nothing_waits` | Nothing waits | Inget väntar |  |
| `back.open_ends` | Left open | Lämnat öppet |  |
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
| `safety.1_warning_today` | 1 warning today | 1 varning i dag |  |
| `safety.all_clear` | All clear | Allt väl |  |
| `safety.claude_codes_checkpoints_undo_its_file_edits` | Claude Code's checkpoints undo its file edits. Vaken's Undo also puts back files that shell and git steps changed. | Claude Codes kontrollpunkter ångrar dess filändringar. Vakens Ångra lägger också tillbaka filer som skal- och git-steg ändrade. |  |
| `safety.could_not_halt_from_here_type` | Could not pause from here. Type /vaken-pause in the session. | Kunde inte pausa härifrån. Skriv /vaken-pause i sessionen. |  |
| `safety.could_not_show_the_checkpoint_from` | Could not show the checkpoint from here. Type /vaken-undo name &lt;checkpoint&gt; in the session. | Kunde inte visa kontrollpunkten härifrån. Skriv /vaken-undo name &lt;kontrollpunkt&gt; i sessionen. |  |
| `safety.guard_today` | Risky steps today | Riskabla steg i dag |  |
| `safety.halt` | Pause | Pausa |  |
| `safety.halt_all` | Pause this session | Pausa den här sessionen |  |
| `safety.halt_all_undo_checkpoints_and_what` | Pause this session, undo, saved points and which risky steps were stopped. | Pausa den här sessionen, ångra, sparade punkter och vilka riskabla steg som stoppades. |  |
| `safety.halt_is_on_nothing_ran_lift` | This session is paused. Nothing ran. Resume with /vaken-pause off first. | Den här sessionen är pausad. Inget kördes. Återuppta med /vaken-pause off först. |  |
| `safety.halt_lifted_steps_that_change_things` | Resumed. Steps that change things work again. | Återupptaget. Steg som ändrar något fungerar igen. |  |
| `safety.halted_every_step_that_changes_things` | Paused for safety. Commands, edits, tools, agents and web fetches are stopped. Press Resume to continue. | Pausad för säkerhets skull. Kommandon, ändringar, verktyg, agenter och webbhämtningar stoppas. Tryck Återuppta för att fortsätta. |  |
| `safety.it_runs_code_or_changes_files` | It runs code or changes files. | Det kör kod eller ändrar filer. | Why a command block needs two yeses: it is not only commands that look (ls, cat, git status and the like). |
| `safety.n_steps` | {n} steps | {n} steg |  |
| `safety.n_warnings_today` | {n} warnings today | {n} varningar i dag |  |
| `safety.none` | none | inga |  |
| `safety.nothing_changes_before_you_type_it` | Nothing changes before you type it. | Inget ändras förrän du skriver det. |  |
| `safety.nothing_was_written_path_or_a` | Nothing was written: {path} or a folder above it is a link, or it leads somewhere it should not. | Inget skrevs: {path} eller en mapp ovanför är en länk, eller så leder den dit den inte ska. |  |
| `safety.preview` | Preview | Förhandsvisning |  |
| `safety.preview_undo_1_file` | Preview undo (1 file) | Förhandsvisa ångra (1 fil) |  |
| `safety.preview_undo_n_files` | Preview undo ({n} files) | Förhandsvisa ångra ({n} filer) |  |
| `safety.stop_undo_and_what_the_guard` | Pause this session, undo, and which risky steps were stopped | Pausa den här sessionen, ångra och vilka riskabla steg som stoppades |  |
| `safety.this_step_needs_you_to_type` | This step needs you to type it in this session. | Det här steget kräver att du skriver det själv i den här sessionen. | A command that unlocks or runs something came from another session, a channel, a schedule or a plugin, so it was refused. |
| `safety.type_this_in_the_chat_box` | Type this in the chat box: | Skriv det här i chattrutan: |  |
| `safety.undo_and_claude_code_checkpoints` | Undo and Claude Code checkpoints | Ångra och Claude Codes kontrollpunkter |  |
| `safety.undo_nothing_can_be_put_back` | Undo: nothing can be put back | Ångra: inget kan läggas tillbaka |  |
| `safety.warned` | Warned | Varnat |  |

## context

The Context health card. (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `context.1_line` | 1 line | 1 rad |  |
| `context.1_line_in_more_than_one_file` | 1 line in more than one file | 1 rad i fler än en fil |  |
| `context.1_note` | 1 note | 1 anteckning |  |
| `context.about_n_tokens` | about {n} tokens | ungefär {n} tokens |  |
| `context.about_n_tokens_heavy` | about {n} tokens · heavy | ungefär {n} tokens · tung |  |
| `context.context_health` | Memory and notes | Minne |  |
| `context.could_not_make_the_brief_from` | Could not make the brief from here. Type /vaken-help run brief in the session. | Kunde inte göra briefen härifrån. Skriv /vaken-help run brief i sessionen. |  |
| `context.good_moment_to_shorten` | Good moment to compact | Bra stund att komprimera |  |
| `context.handoff` | Handoff | Överlämning |  |
| `context.handoff_brief` | Note for the next session | Anteckning till nästa session |  |
| `context.heavy_files` | Heavy files | Tunga filer |  |
| `context.instruction_files` | Instruction files | Instruktionsfiler |  |
| `context.instruction_files_memory_notes_handoff` | Instruction files, memory notes, handoff and what compacting keeps. | Instruktionsfiler, minnesanteckningar, överlämning och vad komprimering behåller. |  |
| `context.instructions` | Instructions | Instruktioner |  |
| `context.instructions_memory_and_handoff` | Instructions, memory and handoff | Instruktioner, minne och överlämning |  |
| `context.kept_when_shortened` | Kept when compacted | Behålls vid komprimering |  |
| `context.lines_in_more_than_one_file` | Lines in more than one file | Rader i fler än en fil |  |
| `context.n_lines` | {n} lines | {n} rader |  |
| `context.n_lines_in_more_than_one_file` | {n} lines in more than one file | {n} rader i fler än en fil |  |
| `context.n_not_checked` | one: 1 not checked<br>other: {n} not checked | one: 1 okontrollerad<br>other: {n} okontrollerade |  |
| `context.n_not_checked_yet` | {n} not checked yet | {n} okontrollerade än |  |
| `context.n_notes` | {n} notes | {n} anteckningar |  |
| `context.no_instruction_file` | No instruction file | Ingen instruktionsfil |  |
| `context.none_yet` | none yet | inga än |  |
| `context.not_checked` | not checked | okontrollerad |  |
| `context.notes` | Notes | Anteckningar |  |
| `context.notes_claude_keeps` | Notes Claude keeps | Anteckningar Claude sparar |  |
| `context.nothing_yet` | nothing yet | inget än |  |
| `context.off` | off | av |  |
| `context.one_not_checked_yet` | 1 not checked yet | 1 okontrollerad än |  |
| `context.small` | Small | Liten |  |
| `context.small_size` | small | liten |  |

## preview

The Preview card. (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `preview.after_a_screen_file_edit_the` | After a screen file edit, the Preview card says look now. | Efter en ändring av en skärmfil säger kortet: titta nu. |  |
| `preview.changed_look_now` | Changed – look now | Ändrad – titta nu |  |
| `preview.claude_code_desktop_shows_the_running_page` | Claude Code Desktop shows the running page live in its own browser pane, from the project's .claude/launch.json. This card adds whether the dev server answers and pictures at three sizes. | Claude Code Desktop visar den körande sidan direkt i sin egen webbläsarpanel, från projektets .claude/launch.json. Det här kortet lägger till om utvecklingsservern svarar och bilder i tre storlekar. |  |
| `preview.could_not_take_the_picture_from` | Could not take the picture from here. | Kunde inte ta bilden härifrån. |  |
| `preview.desktop` | Desktop | Dator |  |
| `preview.dev_server` | Dev server | Utvecklingsserver |  |
| `preview.dev_server_and_pictures` | Dev server and pictures | Utvecklingsserver och bilder |  |
| `preview.dev_server_and_pictures_at_phone` | Dev server, and pictures at phone, iPad and desktop size. | Utvecklingsserver, och bilder i telefon-, iPad- och datorstorlek. |  |
| `preview.error` | error | fel |  |
| `preview.ipad` | iPad | iPad |  |
| `preview.live_view_the_apps_browser_pane` | Live view: the app's browser pane | Direktvy: appens webbläsarpanel |  |
| `preview.no_answer` | no answer | inget svar |  |
| `preview.no_dev_server` | No dev server | Ingen utvecklingsserver |  |
| `preview.no_dev_server_is_up_so` | No dev server is up, so no picture was taken. Start it, then press again. | Ingen utvecklingsserver är uppe, så ingen bild togs. Starta den och tryck igen. |  |
| `preview.picture_size_size_age` | Picture · {size} size · {age} | Bild · storlek: {size} · {age} |  |
| `preview.port_n` | Port {n} | Port {n} |  |
| `preview.port_n_does_not_answer` | Port {n} does not answer | Port {n} svarar inte |  |
| `preview.port_n_is_up` | Port {n} is up | Port {n} är uppe |  |
| `preview.press_to_ask_claude_to_look` | Press to ask Claude to look at it. The line goes after a day. | Tryck för att be Claude titta på den. Raden försvinner efter en dag. |  |
| `preview.preview` | Preview | Förhandsvisning |  |
| `preview.preview_after_edits` | Preview after edits | Förhandsvisning efter ändringar |  |
| `preview.said_it_is_in_the_project` | {said} It is in the project folder. Ask Claude to look at it. | {said} Den finns i projektmappen. Be Claude titta på den. |  |
| `preview.size_size` | {size} size | Storlek: {size} |  |
| `preview.take_a_picture` | Take a picture | Ta en bild |  |
| `preview.take_all_three` | Take all three | Ta alla tre |  |
| `preview.taking_the_picture_in_the_background` | Taking the picture in the background | Tar bilden i bakgrunden |  |
| `preview.the_page_shows_an_error` | The page shows an error | Sidan visar ett fel |  |
| `preview.the_picture_taken_last_path` | The picture taken last: {path}. | Bilden som togs senast: {path}. |  |
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
| `setup.agent_setup_c_to_decide_n` | {c} to decide · {n} of {m} in sync | {c} att avgöra · {n} av {m} i synk |  |
| `setup.agent_setup_is_off_turn_on` | Agent setup is off. Turn on Set up agents for me first. | Agentuppsättningen är av. Slå först på Sätt upp agenter åt mig. |  |
| `setup.agent_setup_n_of_m_in` | {n} of {m} in sync | {n} av {m} i synk |  |
| `setup.agent_setup_no_project_folder` | No project folder | Ingen projektmapp |  |
| `setup.agent_setup_this_session_only_nothing` | This session only, nothing is written | Bara den här sessionen, inget skrivs |  |
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
| `setup.not_read_yet` | Not read yet | Inte läst än |  |
| `setup.project` | Project | Projekt |  |
| `setup.project_instructions` | Project instructions | Projektinstruktioner |  |
| `setup.replace` | Replace… | Ersätt… |  |
| `setup.replaced_name_your_copy_is_saved` | Replaced {name}. Your copy is saved as {bak} | Ersatte {name}. Din kopia är sparad som {bak} |  |
| `setup.roles_in_this_session` | Roles in this session | Roller i den här sessionen |  |
| `setup.session` | Session | Session |  |
| `setup.set_up_agents_for_me` | Set up agents for me | Sätt upp agenter åt mig |  |
| `setup.the_cockpit_can_write_agent_files` | Vaken can write agent files that follow your choices. It asks before it replaces a file. | Vaken kan skriva agentfiler som följer dina val. Den frågar innan den ersätter en fil. |  |
| `setup.this_session` | this session | den här sessionen |  |
| `setup.this_session_writes_no_files_choose_all_or_project` | This session writes no files. Choose All projects or This project. | Den här sessionen skriver inga filer. Välj Alla projekt eller Det här projektet. |  |
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
| `do.no_commands_in_the_last_answer` | No commands in the last answer. | Inga kommandon i senaste svaret. |  |
| `do.press_a_row_to_run_its_block` | Press a row to run its block; a risky one asks again. | Tryck på en rad för att köra dess block; ett riskabelt frågar igen. |  |
| `do.press_the_row_then_yes_run_it` | Press the row, then Yes, run it. Or type /vaken-help run do {n} yes yes. | Tryck på raden, sedan Ja, kör det. Eller skriv /vaken-help run do {n} yes yes. |  |
| `do.press_the_row_to_run_it_or` | Press the row to run it, or type /vaken-help run do {n} yes. | Tryck på raden för att köra det, eller skriv /vaken-help run do {n} yes. |  |
| `do.press_yes_run_it_or_cancel` | Press Yes, run it, or Cancel. Or type /vaken-help run do {n} yes yes. | Tryck Ja, kör det, eller Avbryt. Eller skriv /vaken-help run do {n} yes yes. |  |
| `do.ran_block_n_exit_c_2` | Ran block {n}: exit {c}. | Körde block {n}: exit {c}. |  |
| `do.result` | Result: | Resultat: |  |
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
| `do.this_one_looks_risky_read_it` | This one looks risky. Read it, then press Yes, run it. | Det här ser riskabelt ut. Läs det, tryck sedan Ja, kör det. |  |
| `do.type_cockpit_do_n_to_see` | To see one, type: /vaken-help run do {n} | För att se ett, skriv: /vaken-help run do {n} |  |
| `do.type_cockpit_do_n_yes_to` | To run block {n}, type: /vaken-help run do {n} yes | För att köra block {n}, skriv: /vaken-help run do {n} yes |  |
| `do.type_cockpit_do_n_yes_yes` | It looks risky. To run block {n} anyway, type: /vaken-help run do {n} yes yes | Det ser riskabelt ut. För att köra block {n} ändå, skriv: /vaken-help run do {n} yes yes |  |
| `do.type_cockpit_do_to_list_cockpit` | To list, type: /vaken-help run do. To look at block 2, type: /vaken-help run do 2. To run it, type: /vaken-help run do 2 yes | För att lista, skriv: /vaken-help run do. För att se block 2, skriv: /vaken-help run do 2. För att köra det, skriv: /vaken-help run do 2 yes |  |
| `do.when_claude_writes_a_command_cockpit` | When Claude writes a command, /vaken-help run do runs it after your yes. | När Claude skriver ett kommando kör /vaken-help run do det efter ditt ja. |  |
| `do.yes_run_it` | Yes, run it | Ja, kör det |  |

## next

Shown from the code. (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `next.buttons` | Buttons | Knappar |  |
| `next.buttons_and_hint` | Buttons and hint | Knappar och tips |  |
| `next.commit` | Commit | Spara commit |  |
| `next.fix_it` | Fix it | Laga det |  |
| `next.help_text` | After Claude ends an answer, the line above the chat box shows Next: with two or three likely steps, such as Run tests or Commit. One press sends a fixed request to Claude; with Buttons and hint, the chat box also shows the first step as a dim hint, and Tab takes it. /vaken quick lists them and your own quick actions, and /vaken quick add &lt;name&gt; = &lt;request&gt; adds one. | När Claude har svarat visar raden ovanför chattrutan Nästa: med två eller tre troliga steg, till exempel Kör testerna eller Committa. Ett tryck skickar en fast begäran till Claude; med Knappar och tips visar chattrutan också det första steget som ett svagt tips, och Tab tar det. /vaken quick listar dem och dina egna snabbval, och /vaken quick add &lt;namn&gt; = &lt;begäran&gt; lägger till ett. |  |
| `next.help_title` | What the next step buttons are | Vad knapparna för nästa steg är |  |
| `next.next` | Next: | Nästa: |  |
| `next.next_note` | After an answer, the band offers two or three likely next steps to press. | Efter ett svar visar raden två eller tre troliga nästa steg att trycka på. |  |
| `next.next_step_buttons` | Next step buttons | Knappar för nästa steg |  |
| `next.quick_added` | Added {name}. Type /vaken quick {name} to send it. | La till {name}. Skriv /vaken quick {name} för att skicka det. |  |
| `next.quick_asked` | Asked Claude: {name}. | Bad Claude: {name}. |  |
| `next.quick_built_in` | Built in: {list} | Inbyggda: {list} |  |
| `next.quick_busy` | Claude is working. Try again when it ends. | Claude arbetar. Försök igen när det är klart. |  |
| `next.quick_form` | Type it as: \`/vaken quick add &lt;name&gt; = &lt;request&gt;\`. | Skriv så här: \`/vaken quick add &lt;namn&gt; = &lt;begäran&gt;\`. |  |
| `next.quick_full` | You have 12 already. Remove one first. | Du har redan 12. Ta bort ett först. |  |
| `next.quick_head` | Quick actions. Type \`/vaken quick\` and a name to send one to Claude. | Snabbval. Skriv \`/vaken quick\` och ett namn för att skicka ett till Claude. |  |
| `next.quick_how` | Add your own: \`/vaken quick add &lt;name&gt; = &lt;request&gt;\`. Remove one: \`/vaken quick remove &lt;name&gt;\`. | Lägg till ett eget: \`/vaken quick add &lt;namn&gt; = &lt;begäran&gt;\`. Ta bort ett: \`/vaken quick remove &lt;namn&gt;\`. |  |
| `next.quick_name` | A name uses letters, digits, spaces and dashes, and does not start with add, remove or list. | Ett namn har bokstäver, siffror, mellanslag och bindestreck, och börjar inte med add, remove eller list. |  |
| `next.quick_name_long` | A name is at most 24 characters. | Ett namn är högst 24 tecken. |  |
| `next.quick_no_such` | No quick action named {name}. Type /vaken quick for the list. | Inget snabbval heter {name}. Skriv /vaken quick för listan. |  |
| `next.quick_none` | Yours: none yet. | Dina: inga än. |  |
| `next.quick_not_yours` | There is no action of yours named {name}. | Du har inget eget snabbval som heter {name}. |  |
| `next.quick_now` | Next steps now: {list} | Nästa steg nu: {list} |  |
| `next.quick_prompt_long` | A request is at most 400 characters. | En begäran är högst 400 tecken. |  |
| `next.quick_removed` | Removed {name}. | Tog bort {name}. |  |
| `next.quick_secret` | That looks like a secret, so vaken does not keep it. | Det ser ut som en hemlighet, så vaken sparar det inte. |  |
| `next.quick_taken` | That name is taken. Pick another one. | Namnet är upptaget. Välj ett annat. |  |
| `next.quick_yours` | Yours: {list} | Dina: {list} |  |
| `next.run_tests` | Run tests | Kör testerna |  |
| `next.type_changed` | Changed, not committed | Ändrad, inte committad |  |
| `next.type_help_text` | With Next step buttons set to Buttons and hint, typing in the chat box offers rows under the app's own: a quick action after / or its name, a saved task set after /, an open pull request after #, and a file changed and not committed after @. Tab takes one, and vaken stores nothing new. | Med Knappar för nästa steg på Knappar och tips visar chattrutan rader under appens egna när du skriver: ett snabbval efter / eller dess namn, en sparad uppgiftsuppsättning efter /, en öppen pull request efter # och en ändrad fil som inte är committad efter @. Tab tar en, och vaken sparar inget nytt. |  |
| `next.type_help_title` | What the rows under the chat box are | Vad raderna under chattrutan är |  |
| `next.type_own` | Your quick action: {text} | Ditt snabbval: {text} |  |
| `next.type_pr` | Open pull request | Öppen pull request |  |
| `next.type_template` | Loads your saved task set | Laddar din sparade uppgiftsuppsättning |  |
| `next.what_changed` | What changed | Vad har ändrats |  |

## welcome

Shown from the code. (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `welcome.a_step_failed` | A step failed. | Ett steg misslyckades. |  |
| `welcome.a_stopped_step_waits_for_your` | A stopped step waits for your yes | Ett stoppat steg väntar på ditt ja |  |
| `welcome.claude_asked_you_a_question` | Claude asked you a question | Claude ställde en fråga till dig |  |
| `welcome.claude_finished_1_change` | Claude finished: 1 change | Claude blev klar: 1 ändring |  |
| `welcome.claude_finished_n_changes` | Claude finished: {n} changes | Claude blev klar: {n} ändringar |  |
| `welcome.claude_stopped_before_the_end` | Claude stopped before the end | Claude stannade innan slutet |  |
| `welcome.kind_auth` | The service did not accept your login or key. | Tjänsten godtog inte din inloggning eller nyckel. |  |
| `welcome.kind_command_missing` | A program it tried to run is not installed, or not on the path. | Ett program som det försökte köra är inte installerat, eller finns inte i sökvägen. |  |
| `welcome.kind_disk_full` | The disk is full. | Disken är full. |  |
| `welcome.kind_git_conflict` | Two sets of changes touch the same lines, and git cannot choose. | Två uppsättningar ändringar rör samma rader, och git kan inte välja. |  |
| `welcome.kind_git_push` | The remote has changes you do not have yet. | Fjärrförrådet har ändringar som du inte har än. |  |
| `welcome.kind_missing_file` | A file or folder it needs is not there. | En fil eller mapp som behövs finns inte. |  |
| `welcome.kind_module_missing` | A code package it needs is not installed. | Ett kodpaket som behövs är inte installerat. |  |
| `welcome.kind_network` | It could not reach the other computer or website. | Det nådde inte den andra datorn eller webbplatsen. |  |
| `welcome.kind_not_found` | The address it asked for does not exist. | Adressen som efterfrågades finns inte. |  |
| `welcome.kind_out_of_memory` | The computer ran out of memory. | Datorn fick slut på minne. |  |
| `welcome.kind_permission` | The computer would not let it touch that file or folder. | Datorn lät det inte röra den filen eller mappen. |  |
| `welcome.kind_port_busy` | Another program is already using that network port. | Ett annat program använder redan den nätverksporten. |  |
| `welcome.kind_rate_limit` | The service says there were too many requests. | Tjänsten säger att det var för många förfrågningar. |  |
| `welcome.kind_server` | The other service had a problem. It is not your code. | Den andra tjänsten hade ett problem. Det är inte din kod. |  |
| `welcome.kind_syntax` | There is a typing mistake in the code, so the computer cannot read it. | Det finns ett skrivfel i koden, så datorn kan inte läsa den. |  |
| `welcome.kind_test_failed` | A test did not pass. | Ett test gick inte igenom. |  |
| `welcome.kind_type_error` | The code used something that was empty or the wrong kind. | Koden använde något som var tomt eller av fel sort. |  |
| `welcome.means_asked` | The last answer ended with a question to you. Show me asks Claude to say it again at the end of the chat. | Det sista svaret slutade med en fråga till dig. Visa mig ber Claude säga den igen längst ner i chatten. |  |
| `welcome.means_done` | Claude ended its answer after changing files. Show me asks Claude what changed, in short lines. | Claude avslutade sitt svar efter att ha ändrat filer. Visa mig ber Claude berätta vad som ändrats, i korta rader. |  |
| `welcome.means_failed` | The last step of the last answer failed. Fix it asks Claude to find why and fix it. | Det sista steget i det sista svaret misslyckades. Laga det ber Claude hitta varför och laga det. |  |
| `welcome.means_hold` | Vaken stopped a step of this session, and it waits for your yes. Show me opens it in Needs you, where you can allow it once or dismiss it. | vaken stoppade ett steg i den här sessionen, och det väntar på ditt ja. Visa mig öppnar det i Behöver dig, där du kan tillåta det en gång eller avfärda det. |  |
| `welcome.means_run` | The task run of this session needs you. Show me opens the task runner. | Uppgiftskörningen i den här sessionen behöver dig. Visa mig öppnar uppgiftsköraren. |  |
| `welcome.means_stopped` | The last answer stopped before it ended. Continue asks Claude to go on with the next step. | Det sista svaret stannade innan det var klart. Fortsätt ber Claude gå vidare med nästa steg. |  |
| `welcome.press_fix_it_above_the_chat` | Press Fix it above the chat box to ask Claude to fix it. | Tryck på Laga det ovanför chattrutan för att be Claude laga det. |  |
| `welcome.show_me` | Show me | Visa mig |  |
| `welcome.show_the_question` | Show the question | Visa frågan |  |
| `welcome.since_you_left` | Since you left | Sedan du gick |  |
| `welcome.task_run_name_has_failed` | Task run {name} has failed tasks | Uppgiftskörningen {name} har uppgifter som misslyckades |  |
| `welcome.task_run_name_is_paused` | Task run {name} is paused | Uppgiftskörningen {name} är pausad |  |
| `welcome.task_run_name_stopped` | Task run {name} stopped | Uppgiftskörningen {name} stoppades |  |
| `welcome.the_last_step_failed` | The last step failed | Det sista steget misslyckades |  |
| `welcome.type_vaken_explain_error_for_more` | Type /vaken-explain error for more. | Skriv /vaken-explain error för mer. |  |
| `welcome.welcome_next` | A press sends a fixed request to Claude, or opens what waits. Nothing else changes. | Ett tryck skickar en fast begäran till Claude, eller öppnar det som väntar. Inget annat ändras. |  |

## night

Shown from the code. (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `night.claude_said_it_would` | Claude said it would: {what} | Claude sa att den skulle: {what} |  |
| `night.ended_a_night_run` | Ended a night run | Avslutade en nattkörning |  |
| `night.fix_the_failed_night_tasks` | Fix the failed night tasks | Laga nattens misslyckade uppgifter |  |
| `night.goes_on_power_back` | Night run goes on: the Mac is on power again | Nattkörningen fortsätter: Macen har ström igen |  |
| `night.head_done_failed` | Night run: {done} done, {failed} failed | Nattkörning: {done} klara, {failed} misslyckades |  |
| `night.help_text` | Turn it on with /vaken-settings night.mode on, then type /vaken-tasks night. The run goes only on mains power, inside the plan limit and its cost limit, with away mode's strict checks on and the Mac kept awake if keep-awake is on. In the morning, Where was I shows what is done. | Slå på det med /vaken-settings night.mode on och skriv sedan /vaken-tasks night. Körningen går bara på nätström, inom plangränsen och sin kostnadsgräns, med bortalägets strikta kontroller på och Macen vaken om håll vaken är på. På morgonen visar Var var jag vad som är klart. |  |
| `night.lets_vaken_tasks_night_run` | /vaken-tasks night runs your list on mains power, inside the plan and a cost limit. | /vaken-tasks night kör din lista på nätström, inom planen och en kostnadsgräns. |  |
| `night.means_night` | Your night run ended while you were away. Show me opens the task runner with each task and what it cost. | Din nattkörning blev klar medan du var borta. Visa mig öppnar uppgiftsköraren med varje uppgift och vad den kostade. |  |
| `night.means_night_fix` | Some tasks of the night run failed. Fix it asks Claude to fix them, naming each one. | Några uppgifter i nattkörningen misslyckades. Laga det ber Claude laga dem och nämner var och en. |  |
| `night.means_promise` | Claude said in an answer that it would do this later. Continue asks Claude to do it now. Type done (or done 2) when it is done. | Claude sa i ett svar att den skulle göra detta senare. Fortsätt ber Claude göra det nu. Skriv done (eller done 2) när det är klart. |  |
| `night.most_cost_for_a_night_run` | Most cost for a night run | Högsta kostnad för en nattkörning |  |
| `night.night_run` | Night run | Nattkörning |  |
| `night.night_run_lead` | Night run: | Nattkörning: |  |
| `night.night_run_started_n_tasks` | Night run started: {n} tasks. It runs only on mains power, inside the plan limit and up to {usd}. Away mode's strict checks are on until it ends. | Nattkörningen startade: {n} uppgifter. Den kör bara på nätström, inom plangränsen och upp till {usd}. Bortalägets strikta kontroller är på tills den är slut. |  |
| `night.night_runs_are_off` | Night runs are off. Turn them on with /vaken-settings night.mode on. | Nattkörningar är av. Slå på dem med /vaken-settings night.mode on. |  |
| `night.past_that_night_pauses` | Past that, a night run pauses until you are back. | Över det pausar en nattkörning tills du är tillbaka. |  |
| `night.paused_cost_limit` | Night run paused: it reached its cost limit of {usd} | Nattkörningen pausad: den nådde sin kostnadsgräns på {usd} |  |
| `night.paused_on_battery` | Night run paused: the Mac is on battery | Nattkörningen pausad: Macen går på batteri |  |
| `night.pauses_at_run_limit` | A night run pauses at the run limit. | En nattkörning pausar vid körningens gräns. |  |
| `night.pauses_past_usd` | A night run pauses past {usd}. | En nattkörning pausar över {usd}. |  |
| `night.run_limit` | Run limit | Körningens gräns |  |
| `night.start_as_night_run` | Start as night run | Starta som nattkörning |  |
| `night.started_a_night_run` | Started a night run | Startade en nattkörning |  |
| `night.waits_for_mains_power` | Night run waits for mains power: | Nattkörningen väntar på nätström: |  |
| `night.what_a_night_run_does` | What a night run does | Vad en nattkörning gör |  |

## tell

Shown from the code. (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `tell.answer_done` | Claude is done with a long answer. | Claude är klar med ett långt svar. |  |
| `tell.banner` | Banner | Banderoll |  |
| `tell.banner_and_sound` | Banner and sound | Banderoll och ljud |  |
| `tell.help_text` | After 2 minutes with no press or prompt, vaken sends one Mac notification when another session needs you or a plan limit is near; with This session too, also when a step here waits for your yes or a long answer is done. At most one comes every 30 seconds and several become one, while Hours without notices and Quiet hold them. /vaken-settings notify.how sound adds a sound, speak says it. | Efter 2 minuter utan tryck eller prompt skickar vaken en Mac-notis när en annan session behöver dig eller en plangräns är nära; med Även den här sessionen också när ett steg här väntar på ditt ja eller ett långt svar är klart. Högst en kommer var 30:e sekund och flera blir en, medan Timmar utan notiser och Tyst håller dem. /vaken-settings notify.how sound lägger till ett ljud, speak säger det. |  |
| `tell.help_title` | Notices while you are away | Notiser medan du är borta |  |
| `tell.how_label` | How notices reach you | Hur notiser når dig |  |
| `tell.how_note` | While you are away: a banner, a banner and sound, or a spoken line. | Medan du är borta: en banderoll, en banderoll och ljud, eller en uppläst rad. |  |
| `tell.limit_near` | A plan limit is near. | En plangräns är nära. |  |
| `tell.plan_name_pct_used` | Plan {name} {pct} used | Plan {name} {pct} använt |  |
| `tell.plan_pct_used` | Plan {pct} used | Plan {pct} använt |  |
| `tell.sessions_need_you` | one: 1 session needs you.<br>other: {n} sessions need you. | one: 1 session behöver dig.<br>other: {n} sessioner behöver dig. |  |
| `tell.speak` | Speak | Läs upp |  |
| `tell.status_label` | Status line | Statusrad |  |
| `tell.status_note` | A line under the prompt box, only when context or plan is nearly used up. | En rad under promptrutan, bara när kontext eller plan nästan är slut. |  |
| `tell.step_waits` | A step waits for your yes. | Ett steg väntar på ditt ja. |  |
| `tell.this_session_too` | This session too | Även den här sessionen |  |

## lean

Shown from the code. (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `lean.all_long_output` | All long output | All lång utdata |  |
| `lean.all_skip_repeats` | All, skip repeats | All, hoppa över upprepningar |  |
| `lean.cut_line` | one: Cut 1 long output today (about {m} lines Claude did not read).<br>other: Cut {n} long outputs today (about {m} lines Claude did not read). | one: Kortade 1 lång utdata i dag (ungefär {m} rader som Claude inte läste).<br>other: Kortade {n} långa utdata i dag (ungefär {m} rader som Claude inte läste). |  |
| `lean.help_text` | Before Claude reads it, a long install, test, build or lint log is cut to its first lines, its error lines and its last 40 lines; a file read again with no change gets one line instead of its text, once; with All long output, a huge read, search, page or tool answer is also cut to its first and last lines, with one line on how to ask for the rest; with All, skip repeats, a todo list or auto mode reminder that comes again unchanged also becomes one short note, never the first one or a changed one. A new chat starts with the branch and the count of changed files, and before a big job one line says about how much of the 5-hour window it may use. /vaken-usage says how many lines were cut today. | Innan Claude läser den kortas en lång installations-, test-, bygg- eller lintlogg till sina första rader, sina felrader och sina sista 40 rader; en fil som läses igen utan ändring ger en rad i stället för sin text, en gång; med All lång utdata kortas också en stor läsning, sökning, sida eller verktygssvar till sina första och sista rader, med en rad om hur resten hämtas; med All, hoppa över upprepningar blir en påminnelse om att-göra-listan eller auto-läget som kommer igen oförändrad också en kort rad, aldrig den första eller en ändrad. En ny chatt börjar med grenen och antalet ändrade filer, och före ett stort jobb säger en rad ungefär hur mycket av 5-timmarsfönstret det kan använda. /vaken-usage säger hur många rader som kortades i dag. |  |
| `lean.help_title` | What a lean session is | Vad en smal session är |  |
| `lean.lean_session` | Lean session | Smal session |  |
| `lean.logs_only` | Logs only | Bara loggar |  |
| `lean.note` | Cuts long logs to the errors and last lines. A new chat starts with git facts. | Kortar långa loggar till felen och sista raderna. En ny chatt börjar med fakta från git. |  |
| `lean.repeat_line` | one: Left out 1 unchanged reminder today (about {m} characters Claude did not read).<br>other: Left out {n} unchanged reminders today (about {m} characters Claude did not read). | one: Utelämnade 1 oförändrad påminnelse i dag (ungefär {m} tecken som Claude inte läste).<br>other: Utelämnade {n} oförändrade påminnelser i dag (ungefär {m} tecken som Claude inte läste). |  |

## big

Shown from the code. (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `big.ask` | {name} is big: {lines} lines, {size}. Send Claude only the last {tail} lines? | {name} är stor: {lines} rader, {size}. Skicka bara de sista {tail} raderna till Claude? |  |
| `big.big_file` | Big file | Stor fil |  |
| `big.failed` | Could not send part of {name}. Type @{mention}#L{from}-{to} to send its last {tail} lines. | Kunde inte skicka en del av {name}. Skriv @{mention}#L{from}-{to} för att skicka de sista {tail} raderna. |  |
| `big.help_text` | When you name a file after @ that has more than 2000 lines or 200 KB, such as a lock file or a log, vaken asks once: Send the last 200 lines instead, or Send the whole file. Only your press changes what Claude reads; with no answer the file goes whole, and you can type the lines yourself (@app.log#L800-1000). Lean session Off turns the question off. | När du nämner en fil efter @ som har fler än 2000 rader eller 200 KB, till exempel en låsfil eller en logg, frågar vaken en gång: Skicka de sista 200 raderna i stället, eller Skicka hela filen. Bara ditt tryck ändrar vad Claude läser; utan svar går hela filen, och du kan skriva raderna själv (@app.log#L800-1000). Smal session Av stänger av frågan. |  |
| `big.help_title` | Why vaken asks about a big file | Varför vaken frågar om en stor fil |  |
| `big.send_the_last_lines_instead` | Send the last {tail} lines instead | Skicka de sista {tail} raderna i stället |  |
| `big.send_the_whole_file` | Send the whole file | Skicka hela filen |  |

## selected

Shown from the code. (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `selected.copied` | Copied the selected text. | Kopierade den markerade texten. |  |
| `selected.copy` | Copy | Kopiera |  |
| `selected.explain` | Explain this | Förklara detta |  |
| `selected.explain_said` | Asked Claude to explain it. | Bad Claude förklara det. |  |
| `selected.help_text` | Select text in the chat, then open Selected text on This session. Explain this asks Claude to explain it in plain words, Make it a task adds it to the task list, and Copy puts it on the clipboard. Vaken reads the selection only when you press and keeps none of it, except as the task you make. | Markera text i chatten och öppna sedan Markerad text på Den här sessionen. Förklara detta ber Claude förklara den med enkla ord, Gör det till en uppgift lägger den i uppgiftslistan och Kopiera lägger den i urklipp. Vaken läser markeringen först när du trycker och sparar ingenting av den, utom som den uppgift du skapar. |  |
| `selected.help_title` | What Selected text does | Vad Markerad text gör |  |
| `selected.hint` | Select text in the chat, then press one. Nothing is kept. | Markera text i chatten och tryck på ett val. Inget sparas. |  |
| `selected.none` | Nothing is selected in the chat. Select some text first. | Ingen text är markerad i chatten. Markera text först. |  |
| `selected.not_copied` | Could not copy the selected text. | Kunde inte kopiera den markerade texten. |  |
| `selected.right` | Show actions | Visa val |  |
| `selected.task` | Make it a task | Gör det till en uppgift |  |
| `selected.task_said` | Added it to the task list. | Lade till den i uppgiftslistan. |  |
| `selected.title` | Selected text | Markerad text |  |

## teach

Shown from the code. (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `teach.help_text` | When you tell Claude the same thing 3 times in 14 days in one project, such as "use pnpm, not npm", vaken offers once to save it as a rule in the project's CLAUDE.md. When an agent role fails 3 of its last 5 tasks on a cheaper model, it offers a stronger model. /vaken-memory rules lists the saved rules. | När du säger samma sak till Claude 3 gånger på 14 dagar i ett projekt, till exempel "use pnpm, not npm", erbjuder vaken en gång att spara det som en regel i projektets CLAUDE.md. När en agentroll misslyckas med 3 av sina 5 senaste uppgifter på en billigare modell, erbjuder den en starkare modell. /vaken-memory rules visar de sparade reglerna. |  |
| `teach.help_title` | What Learn from you does | Vad Lär av dig gör |  |
| `teach.label` | Learn from you | Lär av dig |  |
| `teach.later` | Not now | Inte nu |  |
| `teach.learned_head` | Learned from you | Lärt av dig |  |
| `teach.line` | This line goes into CLAUDE.md in this project: {line} | Den här raden läggs i CLAUDE.md i det här projektet: {line} |  |
| `teach.model_line` | {role} on {from} passed {passed} of {of}. Use {to} for {roles}? | {role} på {from} klarade {passed} av {of}. Använd {to} för {roles}? |  |
| `teach.model_use` | Use {to} for {roles} | Använd {to} för {roles} |  |
| `teach.not_saved` | Not saved. /vaken-memory rules save tries again. | Inte sparad. /vaken-memory rules save försöker igen. |  |
| `teach.note` | Offers to save a correction you repeat as a project rule. | Erbjuder att spara en rättelse du upprepar som en regel för projektet. |  |
| `teach.offer` | Offer | Erbjud |  |
| `teach.removed_what` | Removed a saved rule from CLAUDE.md | Tog bort en sparad regel från CLAUDE.md |  |
| `teach.repeat_a_slash_command` | a slash command | ett /-kommando |  |
| `teach.repeat_ask` | Save it as a skill? | Spara det som en färdighet? |  |
| `teach.repeat_asked` | Asked Claude to draft the skill. Read the file before you keep it. | Bad Claude skissa färdigheten. Läs filen innan du behåller den. |  |
| `teach.repeat_commit` | commit | spara en commit |  |
| `teach.repeat_draft` | Draft the skill | Skissa färdigheten |  |
| `teach.repeat_edit_code` | edit code | ändra kod |  |
| `teach.repeat_edit_docs` | edit docs | ändra dokument |  |
| `teach.repeat_edit_files` | edit files | ändra filer |  |
| `teach.repeat_edit_settings_files` | edit settings files | ändra inställningsfiler |  |
| `teach.repeat_edit_styles` | edit styles | ändra stilar |  |
| `teach.repeat_edit_tests` | edit tests | ändra tester |  |
| `teach.repeat_fix` | fix | rätta |  |
| `teach.repeat_head` | Repeated routine | Upprepad rutin |  |
| `teach.repeat_help_text` | When you do the same routine 3 times in 14 days in one project, such as run tests, fix, commit, the Skills card offers once to save it as a skill. Draft the skill asks Claude to write it in .claude/skills, and you read it first; Not now waits 14 days. Only the kinds of steps are counted, never what was said, and Skill coach turns it off. | När du gör samma rutin 3 gånger på 14 dagar i ett projekt, till exempel kör tester, rätta, spara en commit, erbjuder kortet Färdigheter en gång att spara den som en färdighet. Skissa färdigheten ber Claude skriva den i .claude/skills, och du läser den först; Inte nu väntar 14 dagar. Bara stegens slag räknas, aldrig vad som sades, och Färdighetscoach stänger av det. |  |
| `teach.repeat_help_title` | What the repeat offer does | Vad erbjudandet om upprepning gör |  |
| `teach.repeat_install_packages` | install packages | installera paket |  |
| `teach.repeat_line` | Draft the skill asks Claude to write .claude/skills/{name}/SKILL.md in this project from what it did in this session. Vaken writes nothing itself; you read the file before you keep it. | Skissa färdigheten ber Claude skriva .claude/skills/{name}/SKILL.md i det här projektet utifrån vad den gjorde i den här sessionen. Vaken skriver inget själv; du läser filen innan du behåller den. |  |
| `teach.repeat_open_a_pull_request` | open a pull request | öppna en pull request |  |
| `teach.repeat_push` | push | pusha |  |
| `teach.repeat_quieted` | Not now. Vaken will not offer this routine again for 14 days. | Inte nu. Vaken erbjuder inte den här rutinen igen på 14 dagar. |  |
| `teach.repeat_run_a_command` | run a command | kör ett kommando |  |
| `teach.repeat_run_lint` | run lint | kör lint |  |
| `teach.repeat_run_tests` | run tests | kör tester |  |
| `teach.repeat_run_the_build` | run the build | kör bygget |  |
| `teach.repeat_start_agents` | start agents | starta agenter |  |
| `teach.repeat_title` | You did this 3 times: {shape} | Du har gjort det här 3 gånger: {shape} |  |
| `teach.repeat_to_skill` | Repeat to skill | Upprepa som färdighet |  |
| `teach.repeat_use_a_connected_tool` | use a connected tool | använd ett anslutet verktyg |  |
| `teach.repeat_use_a_skill` | use a skill | använd en färdighet |  |
| `teach.save` | Save as a rule | Spara som regel |  |
| `teach.save_ask` | Save it as a rule for this project? | Spara det som en regel för det här projektet? |  |
| `teach.saved` | Saved in CLAUDE.md: {line} | Sparad i CLAUDE.md: {line} |  |
| `teach.saved_what` | Saved a rule you repeated in CLAUDE.md | Sparade en regel du upprepat i CLAUDE.md |  |
| `teach.title` | You told Claude 3 times: {rule} | Du har sagt till Claude 3 gånger: {rule} |  |
| `teach.toast` | You told Claude 3 times: {rule}. Save it as a rule for this project? Needs you has the button. | Du har sagt till Claude 3 gånger: {rule}. Spara det som en regel för det här projektet? Knappen finns under Behöver dig. |  |

## allow

Shown from the code. (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `allow.allowed_n` | You allowed {what} {n} times. | Du tillät {what} {n} gånger. |  |
| `allow.always_kind` | Copy the rule to always allow this kind | Kopiera regeln som alltid tillåter sådana |  |
| `allow.ask_build` | Builds or checks the code. | Bygger eller kontrollerar koden. |  |
| `allow.ask_changes` | Changes files in {dir}. | Ändrar filer i {dir}. |  |
| `allow.ask_database` | Works on a database: {label}. | Arbetar mot en databas: {label}. |  |
| `allow.ask_delete` | one: Deletes 1 file in {dir}.<br>other: Deletes {n} files in {dir}. | one: Tar bort 1 fil i {dir}.<br>other: Tar bort {n} filer i {dir}. |  |
| `allow.ask_delete_folder` | Deletes the folder {dir} and everything in it. | Tar bort mappen {dir} och allt i den. |  |
| `allow.ask_delete_some` | Deletes files. | Tar bort filer. |  |
| `allow.ask_deploy` | Publishes or deploys: {label}. | Publicerar eller driftsätter: {label}. |  |
| `allow.ask_edit` | Edits {file}. | Ändrar {file}. |  |
| `allow.ask_fetch` | Reads a web page from {host}. | Läser en webbsida från {host}. |  |
| `allow.ask_install` | Installs packages: {label}. | Installerar paket: {label}. |  |
| `allow.ask_migration` | Changes the database structure. | Ändrar databasens struktur. |  |
| `allow.ask_network` | Reaches the internet: {label}. | Når internet: {label}. |  |
| `allow.ask_out_cluster` | Changes a Kubernetes cluster. | Ändrar ett Kubernetes-kluster. |  |
| `allow.ask_out_infra` | Changes your infrastructure. | Ändrar din infrastruktur. |  |
| `allow.ask_out_machine` | Copies to another machine. | Kopierar till en annan dator. |  |
| `allow.ask_out_push` | Pushes to a git remote. | Skickar till ett git-fjärrarkiv. |  |
| `allow.ask_out_registry` | Pushes to a container registry. | Skickar till ett containerregister. |  |
| `allow.ask_outside` | Changes {to}. | Ändrar {to}. |  |
| `allow.ask_outside_with` | Reaches outside with {label}. | Når utanför med {label}. |  |
| `allow.ask_read` | Only reads. Nothing changes. | Läser bara. Inget ändras. |  |
| `allow.ask_runs` | Runs {label}. | Kör {label}. |  |
| `allow.ask_test` | Runs the tests. | Kör testerna. |  |
| `allow.ask_tool` | Uses {tool}. | Använder {tool}. |  |
| `allow.copied` | Copied. Paste it into .claude/settings.json under "permissions" &gt; "allow". | Kopierad. Klistra in den i .claude/settings.json under "permissions" &gt; "allow". |  |
| `allow.copy` | Copy the rule | Kopiera regeln |  |
| `allow.denied_auto` | Auto mode stopped this step. | Autoläget stoppade steget. |  |
| `allow.denied_copy` | Copy the allow rule | Kopiera tillåtelseregeln |  |
| `allow.denied_dontask` | Don't ask mode stopped this step. | Läget Fråga inte stoppade steget. |  |
| `allow.denied_other` | Claude Code stopped this step. | Claude Code stoppade steget. |  |
| `allow.denied_rule` | A deny rule stopped this step. | En regel som nekar stoppade steget. |  |
| `allow.dismissed` | Dismissed. Vaken does not offer this rule again for 30 days. | Stängd. Vaken erbjuder inte den här regeln igen på 30 dagar. |  |
| `allow.file` | File: .claude/settings.json in the project, "permissions" &gt; "allow". | Fil: .claude/settings.json i projektet, "permissions" &gt; "allow". |  |
| `allow.head` | Fewer questions | Färre frågor |  |
| `allow.help_text` | When you say yes to the same kind of step 3 times in a week where Claude Code asks first, vaken shows the rule that stops that question once, such as Bash(npm test:\*). You add it yourself to .claude/settings.json under "permissions" &gt; "allow"; vaken never changes that file and never offers a rule for a risky step. /vaken-guard rules lists the rules offered so far; while Claude Code asks, the band says what the step does and whether Undo has a copy, and when it stops a step itself, why; vaken never answers for you. | När du säger ja till samma slags steg 3 gånger på en vecka där Claude Code frågar först visar vaken en gång regeln som stoppar frågan, till exempel Bash(npm test:\*). Du lägger själv till den i .claude/settings.json under "permissions" &gt; "allow"; vaken ändrar aldrig den filen och erbjuder aldrig en regel för ett riskabelt steg. /vaken-guard rules listar reglerna som erbjudits hittills; medan Claude Code frågar säger raden vad steget gör och om Ångra har en kopia, och när det självt stoppar ett steg, varför; vaken svarar aldrig åt dig. |  |
| `allow.help_title` | What allow rules are | Vad tillåtelseregler är |  |
| `allow.keep_stopped` | Keep stopped | Håll stoppat |  |
| `allow.kept_said` | Kept stopped. If Claude tries this exact step again in this session, it stays stopped. | Hålls stoppat. Om Claude försöker exakt samma steg igen i den här sessionen förblir det stoppat. |  |
| `allow.label` | Allow rules | Tillåtelseregler |  |
| `allow.next` | Press Copy the rule, then paste it into that file. Vaken never changes the file. | Tryck på Kopiera regeln och klistra sedan in den i filen. Vaken ändrar aldrig filen. |  |
| `allow.not_copied` | Could not copy. The rule is {rule}. Add it to .claude/settings.json under "permissions" &gt; "allow". | Kunde inte kopiera. Regeln är {rule}. Lägg till den i .claude/settings.json under "permissions" &gt; "allow". |  |
| `allow.note` | Explains each Allow question in the band, and shows its rule after 3 yeses. | Förklarar varje Tillåt-fråga i raden och visar regeln efter 3 ja. |  |
| `allow.offer` | Offer | Erbjud |  |
| `allow.offer_text` | You allowed {what} {n} times. To stop this question, add this rule to your settings: {rule} | Du tillät {what} {n} gånger. Lägg till den här regeln i dina inställningar för att slippa frågan: {rule} |  |
| `allow.step_fact` | Step: {short} | Steg: {short} |  |
| `allow.title` | Allow rule: {what} | Tillåtelseregel: {what} |  |
| `allow.undo_copy` | Undo has a copy. | Ångra har en kopia. |  |
| `allow.undo_none` | Undo has no copy. | Ångra har ingen kopia. |  |
| `allow.what_edits` | edits in {dir} | ändringar i {dir} |  |
| `allow.what_fetch` | fetches from {host} | hämtningar från {host} |  |

## shipstep

Ship steps (merge and check). (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `shipstep.a_check_failed_open_the_pull_request` | A check failed. Open the pull request in Needs you, or type /vaken-ship fix yes. | En kontroll misslyckades. Öppna pull requesten i Behöver dig, eller skriv /vaken-ship fix yes. |  |
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
| `settings.after_a_bigger_job_claude_ends` | After a bigger job, Claude says what is done, what is not, and what is next. | Efter ett större jobb säger Claude vad som är klart, vad som inte är det och vad som är nästa steg. |  |
| `settings.after_an_update_the_cockpit_checks` | After an update, vaken checks itself. | Efter en uppdatering kontrollerar vaken sig själv. |  |
| `settings.after_each_turn_it_tells_you` | After each answer, it tells you in plain words what happened. | Efter varje svar berättar vaken med enkla ord vad som hände. |  |
| `settings.agents_stop_starting_once_one` | Agents stop starting once one request has cost this much. | Inga nya agenter startar när en förfrågan har kostat så mycket. |  |
| `settings.all_checks` | All checks | Alla kontroller |  |
| `settings.all_your_sessions_are_counted_together` | Auto lets the computer decide; pick a number to set your own limit. | Auto låter datorn avgöra; välj ett tal för din egen gräns. |  |
| `settings.also_the_model_for_lookup_helpers` | Also the model for lookup agents Claude starts (Model choice). | Också modellen för uppslagsagenter som Claude startar (Modellval). | Agents view, the Researcher role's note; Modellval is the Model choice group |
| `settings.always` | Always | Alltid |  |
| `settings.always_shows_it_first_even_when` | Always shows it first, even when nothing waits. Or only when something waits, or never. | Visas alltid först, även när inget väntar. Eller bara när något väntar, eller aldrig. |  |
| `settings.arrange_cards` | Arrange cards › | Ordna korten › |  |
| `settings.at_80_of_the_budget_it` | At 80% of the budget it warns. Stop also pauses new paid steps at 100%. | Vid 80 % av budgeten varnar vaken. Stoppa pausar också nya betalda steg vid 100 %. |  |
| `settings.back_changes` | Going back to Recommended changes these: | Tillbaka till Rekommenderat ändrar dessa: | Over the list of rows the press would change |
| `settings.back_keep` | Keep my mix | Behåll min mix | The no of Back to Recommended |
| `settings.back_to_recommended` | Back to Recommended | Tillbaka till Rekommenderat | The one press on the mode card while the settings are Custom; it first lists what changes |
| `settings.back_to_the_board` | Open the Safety card › | Öppna kortet Säkerhet › |  |
| `settings.back_yes` | Change them | Ändra dem | The yes of Back to Recommended |
| `settings.balanced_plus_the_checks_and_the` | Recommended, plus features that send Claude extra text and so use a little more of your plan: prompt and assumption reviews, plan first, every note to Claude, and the next step hint. | Rekommenderat, plus funktioner som skickar extra text till Claude och därför använder lite mer av din plan: promptgranskning, granskning av antaganden, plan först, alla noteringar till Claude och tipset om nästa steg. |  |
| `settings.before_a_big_task_it_suggests` | Before a big task, it suggests or asks for a short plan. | Före en stor uppgift föreslår eller ber vaken om en kort plan. |  |
| `settings.before_a_step_changes_a_file` | Before a step changes a file, it keeps a copy. | Innan ett steg ändrar en fil sparas en kopia. |  |
| `settings.before_big_changes_claude_lists_its` | Before big changes, Claude lists its assumptions and you see how many. | Före stora ändringar listar Claude sina antaganden och du ser hur många. |  |
| `settings.card_reset` | Reset | Återställ |  |
| `settings.card_your_data` | Your data | Dina data |  |
| `settings.cards_and_look` | Cards and look | Kort och utseende |  |
| `settings.changed_by_you` | Changed by you. A press puts a setting back to what the mode sets. | Ändrat av dig. Ett tryck sätter tillbaka en inställning till det som läget anger. | Settings, the mode card: the dim line over the list of rows that differ from the mode |
| `settings.changed_chip` | Changed | Ändrad | Settings, the chip of a row moved off the mode in use (a switch row: On · Changed) |
| `settings.changed_line` | {name}: {value} | {name}: {value} | Settings, the mode card's Changed by you list: a setting's name and its value now |
| `settings.changed_undo` | Undo | Ångra | Settings, the mode card's Changed by you list: the press word at a row's end |
| `settings.changed_undone` | {name} is back to {value}. | {name} är tillbaka till {value}. | A toast after a Changed by you row was put back |
| `settings.claude_can_read_the_budget_and` | Claude can read the budget and receipts itself. | Claude kan själv läsa budgeten och kvittona. |  |
| `settings.claude_is_asked_to_answer_in` | Claude is asked to answer in short, simple words. | Claude ombeds svara med korta, enkla ord. |  |
| `settings.clear` | Clear | Rensa |  |
| `settings.clear_every_setting_the_card_order` | Clear every setting, the card order and your pins? | Rensa alla inställningar, kortens ordning och dina fästa sessioner? |  |
| `settings.compact_lead_10` | 10 min before | 10 min före |  |
| `settings.compact_lead_15` | 15 min before | 15 min före |  |
| `settings.compact_lead_20` | 20 min before | 20 min före |  |
| `settings.compact_lead_label` | Compact in a break | Komprimera i en paus |  |
| `settings.compact_lead_note` | Auto compacts a break this long before the one-hour cache runs out. | Under en paus komprimerar Auto så här lång tid innan timmescachen tar slut. |  |
| `settings.compact_min_100k` | 100k tokens | = |  |
| `settings.compact_min_200k` | 200k tokens | = |  |
| `settings.compact_min_50k` | 50k tokens | = |  |
| `settings.compact_min_label` | Never compact under | Komprimera aldrig under |  |
| `settings.compact_min_note` | Auto leaves a smaller session alone. A small window uses half its size instead. | Auto låter en mindre session vara. Ett litet fönster använder halva sin storlek i stället. |  |
| `settings.detail_explained` | Explained | Utförligt |  |
| `settings.done_counts_only_when_your_chosen` | Done counts only when your chosen checks have passed. | Klart räknas först när dina valda kontroller gått igenom. |  |
| `settings.during_these_hours_no_notices_come` | No pop-up alerts about other sessions then, except ones you set to Tell me when done. | Inga popup-notiser om andra sessioner då, utom de du ställt in på Säg till när den är klar. |  |
| `settings.each_turn_it_lists_what_leaves` | After each answer, it lists what leaves this computer. | Efter varje svar listas vad som lämnar den här datorn. |  |
| `settings.english` | English | English |  |
| `settings.erase_ask` | This would delete everything vaken stored. It cannot be undone. Nothing has been deleted yet. | Det här tar bort allt som vaken har sparat. Det går inte att ångra. Inget har tagits bort än. |  |
| `settings.erase_confirm` | Delete everything | Ta bort allt |  |
| `settings.erase_done` | Everything vaken stored is deleted. It starts fresh from here. | Allt som vaken har sparat är borttaget. Den börjar om från noll. |  |
| `settings.erase_folders` | Stored data: {n} folders, {size} | Sparad data: {n} mappar, {size} |  |
| `settings.erase_halt` | A paused session stays paused. | En pausad session förblir pausad. |  |
| `settings.erase_keys` | Saved notes and choices: {n} | Sparade anteckningar och val: {n} |  |
| `settings.erase_left` | {n} could not be removed. | {n} gick inte att ta bort. |  |
| `settings.erase_no_folders` | No stored folders. | Inga sparade mappar. |  |
| `settings.erase_note` | Removes everything vaken stored on this computer, except a paused session. Project files stay. It cannot be undone. | Tar bort allt som vaken har sparat på den här datorn, utom en pausad session. Projektfilerna finns kvar. Det går inte att ångra. |  |
| `settings.erase_open` | Delete everything vaken stored | Ta bort allt som vaken har sparat |  |
| `settings.erase_safe` | Your project files, CLAUDE.md and settings.json are never touched. | Dina projektfiler, CLAUDE.md och settings.json rörs aldrig. |  |
| `settings.erase_unread` | The saved notes and choices are deleted, but the stored folders could not be listed, so they were not removed. | De sparade anteckningarna och valen är borttagna, men de sparade mapparna gick inte att lista, så de togs inte bort. |  |
| `settings.everything_is_back_to_the_usual` | Everything is back to the usual choice. | Allt är tillbaka till det vanliga valet. |  |
| `settings.expert_settings_they_work_as_they` | Expert settings. They work as they are; most people never change them. | Expertinställningar. De fungerar som de är; de flesta ändrar dem aldrig. |  |
| `settings.follow_the_project` | Follow the project | Följ projektet | Agents view, a button under the roles |
| `settings.for_bigger_jobs_claude_keeps_a_task` | For bigger jobs, Claude keeps a task list you can follow in the chat. | Vid större jobb håller Claude en uppgiftslista som du kan följa i chatten. |  |
| `settings.helpers` | Agents | Agenter |  |
| `settings.how_much_should_the_cockpit_do` | How much should it tell you? | Hur mycket ska vaken berätta? |  |
| `settings.in_a_long_chat_claude_marks` | In a long chat, Claude marks a new chapter when the work changes. | I en lång chatt markerar Claude ett nytt kapitel när arbetet byter fas. |  |
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
| `settings.mode_balanced_short` | Tips, recaps, cost tips, decision log. This mode sends Claude only short safety notes. | Tips, sammanfattningar, kostnadstips, beslutslogg. Det här läget skickar bara korta säkerhetsnoteringar till Claude. | Settings, the one line under Recommended while it is the chosen mode |
| `settings.mode_changes_n` | one: Picking it sets 1 setting. Your own change to it is replaced. You can change it again in Settings.<br>other: Picking it sets {n} settings. Your own changes to them are replaced. You can change each one again in Settings. | one: Väljer du det ställs 1 inställning in. Din egen ändring av den ersätts. Du kan ändra den igen i Inställningar.<br>other: Väljer du det ställs {n} inställningar in. Dina egna ändringar av dem ersätts. Du kan ändra var och en igen i Inställningar. |  |
| `settings.mode_chip_project` | This project: {mode} | Det här projektet: {mode} | Settings, the mode card's chip at This project; {mode} is the mode's name |
| `settings.mode_custom` | Custom | Egen | The mode name when the rows are your own mix |
| `settings.mode_full` | Everything useful | Allt användbart | The mode name (id full): Recommended plus what sends Claude extra text; each mode adds to the one before |
| `settings.mode_full_short` | Adds prompt reviews, assumption reviews and plan first. This mode sends Claude short safety notes plus those reviews, plan-first questions and notes on every check. | Lägger till promptgranskning, granskning av antaganden och plan först. Det här läget skickar korta säkerhetsnoteringar till Claude plus de granskningarna, plan först-frågor och noteringar om varje kontroll. | Settings, the one line under Everything useful while it is the chosen mode |
| `settings.mode_on_now` | On now. | På nu. |  |
| `settings.mode_pick_note` | Picking a mode sets its settings. Your own changes to them are replaced. | Väljer du ett läge ställs dess inställningar in. Dina egna ändringar av dem ersätts. | Settings, one dim line under the three modes |
| `settings.mode_quiet` | Only alerts | Bara larm | The mode name (id quiet); each mode adds to the one before |
| `settings.mode_quiet_about` | Tells you when a session needs you, a limit is near, the context is nearly full, a model switch would cost a lot, or a step is risky. No tips and no checks. | Säger till när en session behöver dig, en gräns är nära, kontexten är nästan full, ett modellbyte skulle kosta mycket eller ett steg är riskabelt. Inga tips och inga kontroller. |  |
| `settings.mode_quiet_short` | Alerts when a session needs you, a limit is near or a step is risky. This mode sends Claude only short safety notes. | Larm när en session behöver dig, en gräns är nära eller ett steg är riskabelt. Det här läget skickar bara korta säkerhetsnoteringar till Claude. | Settings, the one line under Only alerts while it is the chosen mode |
| `settings.mode_tag_free` | free | gratis | Settings, a dim tag at the right of a mode that sends Claude nothing extra |
| `settings.mode_tag_plan` | uses a little plan | använder lite av planen | Settings, a dim tag at the right of Everything useful: it sends Claude extra text |
| `settings.mode_this_project` | This project ({name}) only: a mode press changes this project's own settings. All projects keep theirs. | Bara det här projektet ({name}): ett tryck på ett läge ändrar projektets egna inställningar. Alla projekt behåller sina. | Settings, the mode card at This project; {name} is the project folder's name |
| `settings.money_and_plan` | Money and plan | Pengar och plan |  |
| `settings.motion` | Motion | Rörelse |  |
| `settings.n_changed` | one: 1 changed<br>other: {n} changed | one: 1 ändrad<br>other: {n} ändrade | Settings, a section chip's count of rows moved off the mode in use: 3 of 4 on · 1 changed |
| `settings.needs_you_card` | Needs you card | Kortet Behöver dig |  |
| `settings.notes_and_handoff` | Notes for the next session | Anteckningar till nästa session |  |
| `settings.notes_to_claude` | Notes to Claude | Noteringar till Claude |  |
| `settings.off` | Off | Av |  |
| `settings.offer_helper_types_label` | Offer agent types | Erbjud agenttyper |  |
| `settings.offer_helper_types_note` | Off: Claude is offered the four agent types only when a task run starts. | Av: Claude erbjuds de fyra agenttyperna först när en uppgiftskörning startar. |  |
| `settings.on` | On | På |  |
| `settings.on_of_total_on` | {on} of {total} on | {on} av {total} på | Settings, a section chip's short form when the long one does not fit beside the title |
| `settings.on_of_total_settings_on` | {on} of {total} settings on | {on} av {total} inställningar på |  |
| `settings.on_of_total_settings_on_some_suggest` | {on} of {total} on, {off} off. {suggest} only suggest. | {on} av {total} på, {off} avstängda. {suggest} ger bara förslag. |  |
| `settings.on_repeated_edits_idle_calls_or` | On repeated edits, idle calls or a failing step, it warns you. | Vid upprepade ändringar, tomma anrop eller ett misslyckat steg varnar vaken dig. |  |
| `settings.on_your_first_prompt_of_a` | On your first prompt of a day, it adds one line above the chat box. | Vid ditt första meddelande för dagen visas en rad ovanför chattrutan. |  |
| `settings.once_a_day_it_tells_you` | Once a day, it tells you if CLAUDE.md files are big. | En gång om dagen säger vaken till om CLAUDE.md-filer är stora. |  |
| `settings.once_a_week_it_adds_one` | Once a week, it adds one line above the chat box on what vaken did. | En gång i veckan visas en rad ovanför chattrutan om vad vaken gjort. |  |
| `settings.open_at_start` | Open at start | Öppna vid start |  |
| `settings.pin_puts_a_session_first_in` | Pin puts a session first in Other sessions. Hide takes it off the list, except while it needs you. | Fäst lägger en session först i Andra sessioner. Dölj tar bort den från listan, utom medan den behöver dig. |  |
| `settings.preset_backoffice` | No coding | Ingen kod | The plain name of the backoffice preset |
| `settings.preset_backoffice_about` | For people who do not code: plain words, and outside actions stop until you say yes. | För dig som inte kodar: enkla ord, och handlingar utanför stoppas tills du säger ja. | What the backoffice preset does |
| `settings.preset_careful` | Ask before risky steps | Fråga före riskabla steg | The plain name of the careful preset |
| `settings.preset_careful_about` | Stops risky steps, loops and overspending until you say yes. | Stoppar riskabla steg, loopar och överförbrukning tills du säger ja. |  |
| `settings.preset_everything` | Every check on | Alla kontroller på | The plain name of the everything preset |
| `settings.preset_everything_about` | Every helpful check is on, and it saves usage by itself. | Varje hjälpsam kontroll är på, och den sparar användning själv. |  |
| `settings.preset_thrifty` | Save usage | Spara användning | The plain name of the thrifty preset |
| `settings.preset_thrifty_about` | Saves usage by itself: gives agents cheaper models and warns at a budget. | Sparar användning själv: ger agenter billigare modeller och varnar vid en budget. |  |
| `settings.privacy_note` | What vaken keeps stays on this computer. It has no server and sends nothing to its authors. | Det som vaken sparar stannar på den här datorn. Den har ingen server och skickar inget till sina upphovspersoner. |  |
| `settings.quiet_plus_suggestions_band_lines` | Only alerts, plus every free feature: tips, recaps, prompt tips, cost tips, a decision log and a look at whether Claude did what it says. No extra model calls, only short safety notes. | Bara larm, plus varje gratis funktion: tips, sammanfattningar, prompttips, kostnadstips, en beslutslogg och en blick på om Claude gjorde det den säger. Inga extra modellanrop, bara korta säkerhetsnoteringar. |  |
| `settings.reads_only` | Reads only. | Läser bara. | Agents view, a role row's note; joined to the role's own line |
| `settings.reduced` | Reduced | Minskad |  |
| `settings.reduced_holds_the_pulsing_dot_and_the_moving_bar_still` | Reduced holds the pulsing dot and the moving bar still. | Minskad håller den pulserande pricken och den rörliga stapeln stilla. |  |
| `settings.reset_note` | Your choices go back to the defaults. Notes and history stay. There is no undo. | Dina val går tillbaka till standard. Anteckningar och historik finns kvar. Det går inte att ångra. |  |
| `settings.safety_notes_always_go_to_claude` | Safety notes always go to Claude; All checks adds the check results and team notes. | Säkerhetsnoteringar går alltid till Claude; Alla kontroller lägger till kontrollresultat och teamnoteringar. |  |
| `settings.safety_only` | Safety only | Bara säkerhet |  |
| `settings.section_failed` | This part could not be shown: {error} | Den här delen kunde inte visas: {error} |  |
| `settings.shorten_by_itself` | Compact by itself | Komprimera automatiskt |  |
| `settings.show_always_shows_a_card_hide` | Show always shows a card, Hide never does. Auto shows it when it has something to show. Plan limits, This session, Other sessions, Autopilot and Safety have no Auto: they always show unless you hide them. | Visa visar alltid ett kort, Dölj visar det aldrig. Auto visar det när det har något att visa. Plangränser, Den här sessionen, Andra sessioner, Autopilot och Säkerhet har ingen Auto: de visas alltid om du inte döljer dem. |  |
| `settings.standard` | Standard | Vanlig |  |
| `settings.standard_shows_six_cards_all_shows` | Standard: Needs you plus seven cards. All: every card. Custom: your own choice and order. | Vanlig: Behöver dig plus sju kort. Alla: alla kort. Egen: ditt eget val och din egen ordning. |  |
| `settings.suggest` | Suggest | Föreslå |  |
| `settings.svenska` | Svenska | Svenska |  |
| `settings.the_cockpit_considers_shortening_once_the` | Auto compacts after an answer once the session fills this much of its window. | Auto komprimerar efter ett svar när sessionen fyller så mycket av sitt fönster. |  |
| `settings.this_project_follows_all_projects_again` | This project follows all projects again. | Det här projektet följer alla projekt igen. |  |
| `settings.this_project_only` | This project only. | Bara det här projektet. | Agents view, a role row's note: where its model comes from |
| `settings.this_session_only` | This session only. | Bara den här sessionen. | Agents view, a role row's note: where its model comes from |
| `settings.undo_done` | one: 1 setting is back as it was.<br>other: {n} settings are back as they were. | one: 1 inställning är tillbaka som den var.<br>other: {n} inställningar är tillbaka som de var. | A toast after Undo on the mode card |
| `settings.undo_mode` | Undo {mode} | Ångra {mode} | Settings, the mode card's top press for 10 minutes after a mode press; {mode} is the mode's name |
| `settings.undo_mode_toast` | one: {preset}: 1 setting changed. Undo is at the top of Settings.<br>other: {preset}: {n} settings changed. Undo is at the top of Settings. | one: {preset}: 1 inställning ändrades. Ångra finns överst i Inställningar.<br>other: {preset}: {n} inställningar ändrades. Ångra finns överst i Inställningar. | A toast after a mode press in Settings; {preset} is the mode's name |
| `settings.undo_nothing` | Nothing to undo. The settings are already as they were. | Inget att ångra. Inställningarna är redan som de var. | A toast after Undo when nothing changed back |
| `settings.undo_setup` | Undo the start questions | Ångra startfrågorna | Settings, the mode card's top press for 10 minutes after the start questions' Finish |
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
| `settings.when_another_session_needs_you_or` | Needs you: another session waits. And done: when it finishes. This session too: also this one. | Behöver dig: en annan session väntar. Och klart: när den blir klar. Även den här sessionen: också denna. |  |
| `settings.when_another_session_works_in_this` | When another session works in this folder, it warns you. | När en annan session arbetar i den här mappen varnar vaken dig. |  |
| `settings.when_asked_it_writes_a_paragraph` | When asked, it writes a paragraph on what cost most. | På begäran skriver vaken ett stycke om vad som kostade mest. |  |
| `settings.when_claude_retries_a_failing_step` | Warns or stops when Claude repeats a failing step. Off also hides Stuck on a check. | Varnar eller stoppar när Claude upprepar ett misslyckat steg. Av döljer också Fast på en kontroll. |  |
| `settings.when_claude_says_done_or_tests` | When Claude says "done" or "tests pass" with no check behind it, it flags that. | När Claude säger "klart" eller "testerna går igenom" utan kontroll flaggas det. |  |
| `settings.when_claude_sends_posts_pays_or` | When Claude sends, posts, pays or changes the cloud, it warns or stops. | När Claude skickar, postar, betalar eller ändrar molnet varnar eller stoppar vaken. |  |
| `settings.when_claude_writes_a_command_cockpit` | When Claude writes a command, /vaken-help run do runs it after your yes. | När Claude skriver ett kommando kör /vaken-help run do det efter ditt ja. |  |
| `settings.when_code_reads_an_env_name` | When code reads an env name no file declares, it warns you. | När kod läser ett env-namn som ingen fil anger varnar vaken dig. |  |
| `settings.when_edits_wander_far_from_the` | When edits wander far from the goal, it warns you. | När ändringar vandrar långt från målet varnar vaken dig. |  |
| `settings.when_helpers_run_it_lists_them` | When agents run, it lists them with model and time. | När agenter körs listas de med modell och tid. |  |
| `settings.when_it_waits` | When it waits | När något väntar |  |
| `settings.when_on_vaken_opens_beside_the_chat_in_every` | When on, vaken opens beside the chat in every new session. | När den är på öppnas vaken bredvid chatten i varje ny session. |  |
| `settings.when_parts_of_the_cockpit_fail` | When parts of vaken fail or run slow, or Claude is down, it warns. | När delar av vaken misslyckas eller går långsamt, eller Claude ligger nere, varnar den. |  |
| `settings.when_tests_build_or_lint_run` | Notes when tests, build or lint pass. Off also turns off Claims and Definition of done. | Noterar när tester, bygge eller lint går igenom. Av stänger också av Påståenden och Definition av klart. |  |
| `settings.when_the_chat_grows_it_suggests` | Suggest hints Claude (uses a little plan). Watch only shows it. Auto compacts for you. | Föreslå ber Claude om ett råd (använder lite av planen). Bara visa visar rådet. Auto komprimerar åt dig. |  |
| `settings.when_the_chat_is_shortened_goal` | When the session is compacted, goal, branch and next steps are kept. | När sessionen komprimeras behålls mål, gren och nästa steg. |  |
| `settings.when_too_many_helpers_run_at` | When agents are too many, too deep or too costly, it warns or stops them. | När för många agenter körs, går för djupt eller kostar för mycket varnar eller stoppar vaken. |  |
| `settings.when_worktrees_are_safe_to_remove` | When worktrees are safe to remove, it says so. | När arbetsträd är säkra att ta bort säger vaken det. |  |
| `settings.when_you_are_away_it_keeps` | When you are away, it keeps the Mac awake for a phone or a waiting question. | När du är borta hålls Macen vaken för en telefon eller en fråga som väntar. |  |
| `settings.when_you_come_back_after_a` | When you come back after a break, you get a short recap. | När du kommer tillbaka efter en paus får du en kort sammanfattning. |  |
| `settings.when_you_end_away_mode_it` | When you end away mode, it sums up what happened. | När du avslutar frånvaroläget sammanfattas vad som hände. |  |
| `settings.when_you_must_choose_claude_asks` | When you must choose, Claude asks with options you can press. | När du måste välja frågar Claude med alternativ som du kan trycka på. |  |
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
| `cards.and_n_more` | and {n} more | och {n} till |  |
| `cards.auto` | Auto | Auto |  |
| `cards.cards_appear_when_they_have_something` | Cards appear when they have something to show. | Kort visas när de har något att visa. |  |
| `cards.mode_is_on_change_it_any` | {mode} is on. Change it any time in Settings. | {mode} är på. Du kan ändra det när som helst i Inställningar. |  |
| `cards.n_need_you` | {n} need you | {n} behöver dig |  |
| `cards.n_needs_you` | {n} needs you | {n} behöver dig |  |
| `cards.new` | new | ny |  |
| `cards.new_card_title` | New card: {title} | Nytt kort: {title} |  |
| `cards.new_cards_title` | New cards: {title} | Nya kort: {title} |  |
| `cards.send_your_first_message_the_plan` | Send your first message. The plan, this session and your other sessions show here after the first answer. | Skicka ditt första meddelande. Planen, den här sessionen och dina andra sessioner visas här efter första svaret. |  |
| `cards.standard_shows_needs_you_and` | Standard: Needs you plus seven cards. All: every card. Custom: your own choice and order. | Vanlig: Behöver dig plus sju kort. Alla: alla kort. Egen: ditt eget val och din egen ordning. |  |
| `cards.start_mode_label` | How much it tells you | Hur mycket den säger |  |
| `cards.start_view_label` | Which cards show | Vilka kort som visas |  |
| `cards.the_cockpit_watches_your_sessions` | Vaken watches your sessions and warns you before a limit or a risky step. | Vaken följer dina sessioner och varnar dig före en gräns eller ett riskabelt steg. |  |
| `cards.the_usual_choice` | the usual choice | det vanliga valet |  |

## firstsetup

Shown from the code. (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `firstsetup.back` | Back | Tillbaka |  |
| `firstsetup.card_title` | Start questions | Startfrågor |  |
| `firstsetup.done_toast` | Your setup is on. Change any answer in Settings. | Dina val gäller nu. Ändra vilket svar som helst i Inställningar. |  |
| `firstsetup.finish` | Finish | Klar |  |
| `firstsetup.long_ask` | Long chats | Långa chattar |  |
| `firstsetup.long_auto` | Compact by itself | Komprimera automatiskt |  |
| `firstsetup.long_auto_note` | At a break or when full, while it is cheap. | Vid en paus eller när den är full, medan det är billigt. |  |
| `firstsetup.long_hint` | A long chat costs more with every answer. | En lång chatt kostar mer för varje svar. |  |
| `firstsetup.long_off` | Never | Aldrig |  |
| `firstsetup.long_off_note` | Claude Code compacts only when it must. | Claude Code komprimerar bara när det måste. |  |
| `firstsetup.long_suggest` | Tell me when | Säg till när |  |
| `firstsetup.long_suggest_note` | The card shows when. You press Compact yourself. | Kortet visar när. Du trycker själv på Komprimera nu. |  |
| `firstsetup.next` | Next | Nästa |  |
| `firstsetup.recommended` | Recommended | Rekommenderat |  |
| `firstsetup.risky_ask` | Risky steps | Riskabla steg |  |
| `firstsetup.risky_ask_first` | Ask me first | Fråga mig först |  |
| `firstsetup.risky_ask_first_note` | Claude waits for your yes. Good for teams and new users. | Claude väntar på ditt ja. Bra för team och nya användare. |  |
| `firstsetup.risky_hint` | Deleting files, secrets, new packages, pushing code. | Radera filer, hemligheter, nya paket, pusha kod. |  |
| `firstsetup.risky_off` | Don't check | Kontrollera inte |  |
| `firstsetup.risky_off_note` | No warnings, nothing waits, no loop breaker. You trust Claude and your permission settings. | Inga varningar, inget väntar, ingen loopbrytare. Du litar på Claude och dina behörighetsinställningar. |  |
| `firstsetup.risky_tell` | Tell me, don't stop | Säg till, stoppa inte |  |
| `firstsetup.risky_tell_note` | Warns. The worst steps (deleting a lot, a secret) still wait for you. | Varnar. De värsta stegen (radera mycket, en hemlighet) väntar ändå på dig. |  |
| `firstsetup.run_again` | Run setup again | Gör om startfrågorna |  |
| `firstsetup.run_again_note` | The five start questions, with your answers now chosen. | De fem startfrågorna, med dina svar nu valda. |  |
| `firstsetup.skip` | Skip, use recommended | Hoppa över, använd det rekommenderade |  |
| `firstsetup.spend_ask` | Spending | Kostnader |  |
| `firstsetup.spend_hint` | The cost is always shown on the card. | Kostnaden visas alltid på kortet. |  |
| `firstsetup.spend_off` | Only show the cost | Visa bara kostnaden |  |
| `firstsetup.spend_off_note` | No warnings, nothing stops. | Inga varningar, inget stoppar. |  |
| `firstsetup.spend_stop` | Stop at a budget | Stoppa vid en budget |  |
| `firstsetup.spend_stop_note` | Claude stops at the budget until you allow more. | Claude stoppar vid budgeten tills du tillåter mer. |  |
| `firstsetup.spend_warn` | Warn me at a budget | Varna mig vid en budget |  |
| `firstsetup.spend_warn_note` | A note at 80% and 100% of the budget: {session} a session, {day} a day. | En notis vid 80 % och 100 % av budgeten: {session} per session, {day} per dag. |  |
| `firstsetup.step_n_of_m` | Step {n} of {m} | Steg {n} av {m} |  |
| `firstsetup.sum_habits` | Working habits | Arbetsvanor |  |
| `firstsetup.sum_tell` | How much vaken tells you | Hur mycket vaken berättar |  |
| `firstsetup.summary` | Your setup | Dina val |  |
| `firstsetup.summary_line` | {name}: {value} | {name}: {value} |  |
| `firstsetup.tell_ask` | How much should vaken tell you? | Hur mycket ska vaken berätta för dig? |  |
| `firstsetup.tell_balanced_note` | Plus recaps, cost tips and a check that Claude did what it said. Free. On from the start: vaken compacts the session by itself when it fills, and plain mode asks Claude for short, simple words. | Dessutom sammanfattningar, kostnadstips och en koll att Claude gjorde det den sa. Gratis. På från start: vaken komprimerar sessionen själv när den blir full, och klarspråksläget ber Claude om korta, enkla ord. |  |
| `firstsetup.tell_full_note` | Plus checks that send Claude more text. Uses a little more of your plan. | Dessutom kontroller som skickar mer text till Claude. Använder lite mer av din plan. |  |
| `firstsetup.tell_hint` | You can change every answer later in Settings. | Du kan ändra varje svar senare i Inställningar. |  |
| `firstsetup.tell_quiet_note` | A session waits for you, a limit is near, a risky step. | En session väntar på dig, en gräns är nära, ett riskabelt steg. |  |
| `firstsetup.work_ask` | How Claude works with you | Hur Claude arbetar med dig |  |
| `firstsetup.work_habits` | Task list, done and next, clickable questions, chapters | Uppgiftslista, klart och nästa, klickbara frågor, kapitel |  |
| `firstsetup.work_habits_note` | For a bigger job, Claude gets one note asking for the habits that are on. | Vid ett större jobb får Claude en notis som ber om de vanor som är på. |  |
| `firstsetup.work_hint` | One small note, at most once an hour. | En liten notis, högst en gång i timmen. |  |
| `firstsetup.work_plain` | Plain words | Enkla ord |  |
| `firstsetup.work_plain_note` | Short sentences and common words. | Korta meningar och vanliga ord. |  |

## guide

The card guide. (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `guide.042_memory_62` | $0.42, context 62% full | 0,42 USD, kontexten 62 % full |  |
| `guide.1_open_checks_passing` | 1 open, checks passing | 1 öppen, kontrollerna går igenom |  |
| `guide.2_commands_ready` | 2 commands ready | 2 kommandon redo |  |
| `guide.2_open_ends_from_yesterday` | 2 open ends from yesterday | 2 öppna trådar från i går |  |
| `guide.2_running_1_done` | 2 running, 1 done | 2 körs, 1 klar |  |
| `guide.3_sessions_1_working` | 3 sessions, 1 working | 3 sessioner, 1 arbetar |  |
| `guide.4_skills_used_today` | 4 skills used today | 4 färdigheter använda i dag |  |
| `guide.5_hours_41_week_12` | 5-hour 41%, week 12% | 5-timmars 41 %, vecka 12 % |  |
| `guide.5_things_done_today` | 5 things done today | 5 saker gjorda i dag |  |
| `guide.always_shown` | Always shown. | Visas alltid. |  |
| `guide.checks_your_instruction_files_and` | Checks your instruction files and notes, and what compacting keeps. | Kontrollerar dina instruktionsfiler och anteckningar, och vad komprimeringen behåller. |  |
| `guide.example` | Example | Exempel |  |
| `guide.follows_your_open_pull_requests_checks` | Follows your open pull requests: checks, merging and the next step. It acts only when you press. | Följer dina öppna pull requests: kontroller, ihopslagning och nästa steg. Den gör något bara när du trycker. |  |
| `guide.halt_all_undo_a_change_and` | Pause this session, undo a change, and see which risky steps were stopped. | Pausa den här sessionen, ångra en ändring och se vilka riskabla steg som stoppades. |  |
| `guide.halt_all_undo_the_last_change` | Pause this session, undo the last change | Pausa den här sessionen, ångra senaste ändringen |  |
| `guide.hidden` | Hidden | Dolt |  |
| `guide.in_line_with_your_choices` | In line with your choices | I linje med dina val |  |
| `guide.keeps_the_helper_files_and_instructions` | Shows whether the agent files and instructions match your choices. It writes files only when you press. | Visar om agenternas filer och instruktioner stämmer med dina val. Den skriver filer bara när du trycker. |  |
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
| `runcost.the_weekly_window_is_n_used` | The weekly window is {n}% used. | Veckofönstret är {n} % använt. |  |
| `runcost.the_weekly_window_is_n_used_2` | The weekly window is {n}% used now. | Veckofönstret är {n} % använt nu. |  |
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
| `fit.checks_failed_n_times_in_a_row` | Checks failed {n} times in a row | Kontroller misslyckades {n} gånger i rad |  |
| `fit.checks_failed_n_times_in_a_row_2` | Checks failed {n} times in a row. You can raise the effort in the model menu. | Kontroller misslyckades {n} gånger i rad. Du kan höja ansträngningen i modellmenyn. |  |
| `fit.checks_failed_n_times_in_a_row_3` | Checks failed {n} times in a row. You can pick {model} in the model menu. | Kontroller misslyckades {n} gånger i rad. Du kan välja {model} i modellmenyn. |  |
| `fit.checks_failed_twice_in_a_row` | Checks failed twice in a row | Kontroller misslyckades två gånger i rad |  |
| `fit.checks_failed_twice_in_a_row_2` | Checks failed twice in a row. You can raise the effort in the model menu. | Kontroller misslyckades två gånger i rad. Du kan höja ansträngningen i modellmenyn. |  |
| `fit.checks_failed_twice_in_a_row_3` | Checks failed twice in a row. You can pick {model} in the model menu. | Kontroller misslyckades två gånger i rad. Du kan välja {model} i modellmenyn. |  |
| `fit.could_not_change_it_from_here` | Could not change it from here. Use the model menu in that session. | Kunde inte ändra det härifrån. Använd modellmenyn i den sessionen. |  |
| `fit.light_work_tight_week` | Light work, tight week | Lätt arbete, trång vecka |  |
| `fit.low_effort_fits_this` | Low effort fits this | Låg ansträngning räcker här |  |
| `fit.low_effort_for_quick_asks` | Low effort for quick asks | Låg ansträngning för snabba frågor |  |
| `fit.low_effort_for_these_quick_asks` | Low effort for these quick asks. A bigger ask goes back to {old}. | Låg ansträngning för de här snabba frågorna. En större fråga går tillbaka till {old}. |  |
| `fit.lower_the_effort_saves_usage` | Lower the effort (saves usage) | Sänk ansträngningen (sparar användning) |  |
| `fit.lowered_the_effort` | Lowered the effort | Sänkte ansträngningen |  |
| `fit.moved_to_model` | Moved to {model} | Flyttad till {model} |  |
| `fit.not_now` | Not now | Inte nu |  |
| `fit.only_reads_files_now` | Only reads files now | Läser bara filer nu |  |
| `fit.raise_the_effort` | Raise the effort | Höj ansträngningen |  |
| `fit.raised_the_effort` | Raised the effort | Höjde ansträngningen |  |
| `fit.the_week_is_tight_and_this` | The week is tight and this session only reads files. You can pick {model} in the model menu. | Veckan är trång och sessionen läser bara filer. Du kan välja {model} i modellmenyn. |  |
| `fit.this_chat_only_reads_files_you` | This session only reads files. You can lower the effort in the model menu. | Den här sessionen läser bara filer. Du kan sänka ansträngningen i modellmenyn. |  |
| `fit.use_low_effort_for_quick_asks` | Use low effort for quick asks | Använd låg ansträngning för snabba frågor |  |
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
| `cardwhat.step_answered` | Answered | Svarade |  |
| `cardwhat.step_edited` | Edited | Ändrade |  |
| `cardwhat.step_ran_a_command` | Ran a command | Körde ett kommando |  |
| `cardwhat.step_read` | Read | Läste |  |
| `cardwhat.step_read_a_web_page` | Read a web page | Läste en webbsida |  |
| `cardwhat.step_searched` | Searched | Sökte |  |
| `cardwhat.step_searched_the_web` | Searched the web | Sökte på webben |  |
| `cardwhat.step_started_an_agent` | Started an agent | Startade en agent |  |
| `cardwhat.step_used_name` | Used {name} | Använde {name} |  |
| `cardwhat.step_wrote` | Wrote | Skrev |  |
| `cardwhat.steps_could_not_be_read` | Its steps could not be read. | Agentens steg gick inte att läsa. |  |
| `cardwhat.steps_elsewhere` | Its steps show only in the session that started it. | Agentens steg syns bara i sessionen som startade den. |  |
| `cardwhat.steps_lead_all` | Steps: {n}, oldest first | Steg: {n}, äldst först |  |
| `cardwhat.steps_lead_last` | Steps: the last {n} of {all}, oldest first | Steg: de senaste {n} av {all}, äldst först |  |
| `cardwhat.steps_none_yet` | No steps yet. | Inga steg än. |  |
| `cardwhat.steps_reading` | Reading its last steps… | Läser agentens senaste steg… |  |

## cardhome

Shown from the code. (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `cardhome.1_claim_in_the_last_answer` | 1 statement in the last answer has no check behind it. | 1 uttalande i det senaste svaret saknar kontroll. |  |
| `cardhome.1_risky_step_today` | 1 risky step today. | 1 riskabelt steg i dag. |  |
| `cardhome.a_closed_session` | a closed session | en stängd session |  |
| `cardhome.about_cost_estimate` | about {cost} (estimate) | ungefär {cost} (uppskattning) |  |
| `cardhome.and_n_more` | And {n} more. | Och {n} till. |  |
| `cardhome.ask_claude_to_run_it_and` | Ask Claude to run the tests or the build and show the result. /vaken-ship proof shows what ran. | Be Claude köra testerna eller bygget och visa resultatet. /vaken-ship proof visar vad som kördes. |  |
| `cardhome.asked_what` | Asked: {what} | Fick i uppdrag: {what} |  |
| `cardhome.asks_you_a_question` | asks you a question | ställer en fråga till dig |  |
| `cardhome.compacts_app` | Claude Code compacts at {b} | Claude Code komprimerar vid {b} |  |
| `cardhome.compacts_both` | Vaken compacts at {a} · Claude Code at {b} | Vaken komprimerar vid {a} · Claude Code vid {b} |  |
| `cardhome.compacts_short` | Compacts: vaken {a} · Claude Code {b} | Komprimerar: vaken {a} · Claude Code {b} |  |
| `cardhome.compacts_vaken` | Vaken compacts at {a} | Vaken komprimerar vid {a} |  |
| `cardhome.cost_cost` | Cost: {cost} | Kostnad: {cost} |  |
| `cardhome.d_no_progress_for_n_min` | {d}, no progress for {n} min | {d}, inga framsteg på {n} min |  |
| `cardhome.done` | done | klar |  |
| `cardhome.ended` | ended | avslutades |  |
| `cardhome.fewer_sessions` | Fewer | Färre |  |
| `cardhome.files_changed_in_this_session_300_or` | Files changed in this session: 300 or more. | Ändrade filer i den här sessionen: 300 eller fler. |  |
| `cardhome.files_changed_in_this_session_n` | Files changed in this session: {n}. | Ändrade filer i den här sessionen: {n}. |  |
| `cardhome.finished_its_turn_waits_for_you` | finished, waits for you | är klar med svaret, väntar på dig |  |
| `cardhome.how_strict_each_guard_rule_is` | How strict each safety rule is. Warn tells you and Claude. Stop stops the step until you say yes. Off does nothing. | Hur strikt varje säkerhetsregel är. Varna talar om det för dig och Claude. Stoppa stoppar steget tills du säger ja. Av gör ingenting. |  |
| `cardhome.idle` | Idle | Vilar |  |
| `cardhome.if_paid_per_use` | if paid per use (your plan may differ) | om du betalar per användning (din plan kan skilja sig) |  |
| `cardhome.model_unknown` | model unknown | modell okänd |  |
| `cardhome.n_claims_in_the_last_answer` | {n} statements in the last answer have no check behind them. | {n} uttalanden i det senaste svaret saknar kontroll. |  |
| `cardhome.n_in_other_sessions` | {n} in other sessions | {n} i andra sessioner |  |
| `cardhome.n_more_sessions` | {n} more sessions | {n} sessioner till |  |
| `cardhome.n_risky_steps_today` | {n} risky steps today. | {n} riskabla steg i dag. |  |
| `cardhome.no_end_seen` | no end seen | inget slut sett |  |
| `cardhome.no_helper_agent_ran_in_this` | No agent ran in this session yet. | Ingen agent har körts i den här sessionen än. |  |
| `cardhome.no_helper_agents_seen_yet_in` | No agents seen yet in the last 24 hours. | Inga agenter sedda de senaste 24 timmarna. |  |
| `cardhome.no_progress_for_n_min` | no progress for {n} min | inga framsteg på {n} min |  |
| `cardhome.none_here` | None here | Inga här |  |
| `cardhome.none_running` | none running | inga körs |  |
| `cardhome.none_seen` | none seen | inga sedda |  |
| `cardhome.not_known_yet` | not known yet | inte känd än |  |
| `cardhome.not_yet_it_still_runs` | not yet, it still runs | inte än, den körs fortfarande |  |
| `cardhome.nothing_risky_happened_today` | Nothing risky happened today. | Inget riskabelt hände i dag. |  |
| `cardhome.nothing_yet_after_first_answer` | Nothing to show yet. This appears after the first answer. | Inget att visa än. Det visas efter det första svaret. |  |
| `cardhome.ok_needed` | OK needed | OK behövs |  |
| `cardhome.one_more_session` | 1 more session | 1 session till |  |
| `cardhome.probably_done` | probably done | troligen klar |  |
| `cardhome.processor` | Processor | Processor |  |
| `cardhome.question` | Question | Fråga |  |
| `cardhome.read_ago` | read {ago} | läst {ago} |  |
| `cardhome.result_result` | Result: {result} | Resultat: {result} |  |
| `cardhome.running_for_d_so_far` | running for {d} so far | har kört i {d} hittills |  |
| `cardhome.show_all` | Show all | Visa alla |  |
| `cardhome.show_the_helper_agents_that_run` | Show the agents that run, with model and time. | Visa agenterna som körs, med modell och tid. |  |
| `cardhome.started_by_from` | Started by: {from} | Startad av: {from} |  |
| `cardhome.started_by_from_as_type_on` | Started by: {from}, as {type} on {model} | Startad av: {from}, som {type} på {model} |  |
| `cardhome.started_d_ago` | started {d} ago | startade för {d} sedan |  |
| `cardhome.the_cost_is_what_claude_code` | The cost is what Claude Code reports for this session. | Kostnaden är det Claude Code rapporterar för den här sessionen. |  |
| `cardhome.the_cost_is_what_claude_code_2` | The cost is what Claude Code reports for this session, at list price. A plan does not charge it this way. | Kostnaden är det Claude Code rapporterar för den här sessionen, till listpris. En plan debiteras inte så. |  |
| `cardhome.the_goal_claude_works_toward_taken` | The goal Claude works toward, taken from the key words of your first message. Vaken warns when edits wander away from it. | Målet Claude arbetar mot, taget från nyckelorden i ditt första meddelande. Vaken varnar när ändringar glider bort från det. |  |
| `cardhome.the_laptop_gauge_is_off_so` | Computer load is off, so vaken cannot see memory or the processor. | Datorbelastning är av, så vaken kan inte se minnet eller processorn. |  |
| `cardhome.the_laptop_gauge_reads_every_3` | Computer load is read every 3 minutes. Nothing is read yet. | Datorbelastningen läses var tredje minut. Inget är läst än. |  |
| `cardhome.the_last_event_was_age_ago` | The last event was {age} ago | Senaste händelsen var för {age} sedan |  |
| `cardhome.this_session_has_not_reported_yet` | Nothing to show yet. This appears after the first answer. Send a message in the chat. | Inget att visa än. Det visas efter det första svaret. Skicka ett meddelande i chatten. |  |
| `cardhome.time_time` | Time: {time} | Tid: {time} |  |
| `cardhome.took_d` | took {d} | tog {d} |  |
| `cardhome.turns_that_changed_files_and_that` | Answers that changed files and that you have not looked at yet. Your next message counts as your look. | Rundor som ändrade filer och som du inte har tittat på än. Ditt nästa meddelande räknas som att du har tittat. |  |
| `cardhome.type_the_new_name_first` | Type the new name first. | Skriv det nya namnet först. |  |
| `cardhome.under_1_min` | under 1 min | under 1 min |  |
| `cardhome.unknown_probably_done_no_end_in` | unknown, probably done: no end in 45 minutes | okänd, troligen klar: inget slut på 45 minuter |  |
| `cardhome.unknown_vaken_saw_it_start` | unknown: vaken saw it start but not stop | okänd: vaken såg den starta men inte sluta |  |
| `cardhome.waits_for_ok_command` | waits for your OK to run a command | väntar på ditt OK för ett kommando |  |
| `cardhome.waits_for_ok_edit` | waits for your OK to edit a file | väntar på ditt OK för att ändra en fil |  |
| `cardhome.waits_for_ok_read` | waits for your OK to read files | väntar på ditt OK för att läsa filer |  |
| `cardhome.waits_for_ok_tool` | waits for your OK to use {tool} | väntar på ditt OK för att använda {tool} |  |
| `cardhome.waits_for_ok_web` | waits for your OK to use the web | väntar på ditt OK för att använda webben |  |
| `cardhome.what_vaken_did_for_you_in_the` | What vaken did for you in the last 7 days, counted from what it wrote down: compactions, repeating steps caught and risky steps stopped. | Vad vaken gjorde åt dig de senaste 7 dagarna, räknat från det den skrev ner: komprimeringar, upprepade steg som fångades och riskabla steg som stoppades. |  |
| `cardhome.why_compact` | Why compact? › | Varför komprimera? › |  |

## cardback

Shown from the code. (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `cardback.back_after_t` | Back after {t}. | Tillbaka efter {t}. |  |
| `cardback.branch_branch` | Branch {branch}. | Gren {branch}. |  |
| `cardback.clears_the_open_ends_from_this` | Clears the open ends from this card, from the line above the chat box and in every session. The work itself is not touched. | Tar bort de öppna trådarna från det här kortet, från raden ovanför chattrutan och i alla sessioner. Själva arbetet rörs inte. |  |
| `cardback.n_more_projects_had_something_open` | {n} more projects had something open. The card lists the first few. | {n} projekt till hade något öppet. Kortet listar de första. |  |
| `cardback.press_got_it_when_you_have` | Press Got it when you have seen them. Nothing is sent and nothing changes in the project. | Tryck på Förstått när du har sett dem. Inget skickas och inget ändras i projektet. |  |
| `cardback.press_got_it_when_you_have_2` | Press Got it when you have seen them. | Tryck på Förstått när du har sett dem. |  |
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
| `cardcompact.a_break_the_cache_is_warm` | a break, the cache is still warm | en paus, cachen är fortfarande varm |  |
| `cardcompact.a_of_b` | {a} of {b} | {a} av {b} |  |
| `cardcompact.a_of_the_window_at_least_b` | {a}% of the window, at least {b}% | {a} % av fönstret, minst {b} % |  |
| `cardcompact.a_of_the_window_needs_b_busy` | {a}% of the window (needs {b}% while agents run) | {a} % av fönstret (behöver {b} % medan agenter körs) |  |
| `cardcompact.a_of_the_window_no_payback` | {a}% of the window, but compacting would not pay back soon | {a} % av fönstret, men det lönar sig inte snart att komprimera |  |
| `cardcompact.a_of_the_window_or_a_break` | {a}% of the window (needs {b}%), or a break after {m} | {a} % av fönstret (behöver {b} %), eller en paus efter {m} |  |
| `cardcompact.a_quiet_moment_is_better_than` | A quiet moment is better than mid-task. | En lugn stund är bättre än mitt i en uppgift. |  |
| `cardcompact.a_step_waits_for_your_yes` | a step waits for your yes | ett steg väntar på ditt ja |  |
| `cardcompact.a_tokens_needs_b` | {a} tokens (needs {b}) | {a} tokens (behöver {b}) |  |
| `cardcompact.after_about_n_more_turn` | after about {n} more answer | efter ungefär {n} svar till |  |
| `cardcompact.after_about_n_more_turns` | after about {n} more answers | efter ungefär {n} svar till |  |
| `cardcompact.an_agent_runs_in_the_foreground` | an agent runs in the foreground | en agent körs i förgrunden |  |
| `cardcompact.anyway` | Compact anyway | Komprimera ändå |  |
| `cardcompact.ask_title` | Not a good moment to compact: | Inte ett bra tillfälle att komprimera: |  |
| `cardcompact.at_once` | at once | direkt |  |
| `cardcompact.biggest_list` | Biggest: {list} | Störst: {list} |  |
| `cardcompact.claude_compacts_the_session_by_itself_now` | Claude compacts the session by itself now. | Claude komprimerar sessionen själv nu. |  |
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
| `cardcompact.it_is_time` | It is time: the session is full, or a break is near its end | Dags: sessionen är full, eller en paus närmar sig sitt slut |  |
| `cardcompact.it_keeps_your_goal_the_files` | It keeps your goal, the files changed and the next steps. | Den behåller ditt mål, de ändrade filerna och nästa steg. |  |
| `cardcompact.keep_helpers` | List every agent or background command still running: what it does, its id if you know it, and what you will do with its result. | Räkna upp varje agent eller bakgrundskommando som fortfarande körs: vad den gör, dess id om du vet det, och vad du ska göra med resultatet. | \[to-claude\] Asks Claude's summary to list the helpers still running. The English is what is sent; the Swedish is for reading only. |
| `cardcompact.keep_summary` | In the summary, keep these in short lines: the goal, what is done, what is next, open files and branches, decisions made, and any question waiting for the person. | Behåll detta i sammanfattningen, i korta rader: målet, vad som är gjort, vad som är nästa steg, öppna filer och grenar, beslut som fattats och eventuell fråga som väntar på personen. | \[to-claude\] Asks Claude's summary to keep these lines. The English is what is sent; the Swedish is for reading only. |
| `cardcompact.m_left` | {m} left | {m} kvar |  |
| `cardcompact.n_background_commands` | {n} background commands | {n} bakgrundskommandon |  |
| `cardcompact.n_helper_agents` | {n} agents | {n} agenter |  |
| `cardcompact.no_helper_agent_no_background` | no agent, no background command | ingen agent, inget bakgrundskommando |  |
| `cardcompact.not_answering` | Claude is still answering | Claude svarar fortfarande |  |
| `cardcompact.not_foreground` | An agent is running in the foreground | En agent körs i förgrunden |  |
| `cardcompact.not_guard` | A risky step was stopped and waits for your yes | Ett riskabelt steg stoppades och väntar på ditt ja |  |
| `cardcompact.not_helpers` | An agent or a background command is still running | En agent eller ett bakgrundskommando körs fortfarande |  |
| `cardcompact.not_known` | not known | okänt |  |
| `cardcompact.not_recent` | Compacted {n} min ago | Komprimerades för {n} min sedan |  |
| `cardcompact.not_shortened_in_the_last_20` | Not compacted in the last 20 minutes | Inte komprimerad de senaste 20 minuterna |  |
| `cardcompact.not_small` | The session is still small | Sessionen är fortfarande liten |  |
| `cardcompact.not_time` | Not time yet: the session is not full and no break is near its end | Inte dags än: sessionen är inte full och ingen paus är nära sitt slut |  |
| `cardcompact.not_time_busy` | Not time yet: with agents running, Auto waits until {n}% | Inte dags än: när agenter körs väntar Auto till {n} % |  |
| `cardcompact.not_waits` | A question or a permission waits for you | En fråga eller en tillåtelse väntar på dig |  |
| `cardcompact.nothing_still_runs` | Nothing still runs | Inget körs fortfarande |  |
| `cardcompact.only_background_helpers_still_run` | Only background agents or commands still run | Bara agenter eller kommandon i bakgrunden körs |  |
| `cardcompact.pays_back_when` | pays back {when}. | betalar sig {when}. |  |
| `cardcompact.shorten_it_at_the_next_quiet` | Compact it at the next quiet moment. | Komprimera den vid nästa lugna stund. |  |
| `cardcompact.shortens_at_n` | Compacts at {n}% | Komprimeras vid {n} % |  |
| `cardcompact.shortens_by_itself_now` | Compacts by itself now | Komprimeras av sig själv nu |  |
| `cardcompact.shortens_by_itself_soon_at_n` | Compacts by itself soon, at {n}% | Komprimeras av sig själv snart, vid {n} % |  |
| `cardcompact.size_not_known` | size not known | storleken är okänd |  |
| `cardcompact.task_list_a_of_b_done` | task list {a} of {b} done | uppgiftslistan {a} av {b} klar |  |
| `cardcompact.tell_claude_again` | Tell Claude again | Säg till Claude igen |  |
| `cardcompact.the_cache_runs_out_in_about` | The cache runs out in about {m} min. Then re-reading {n} tokens costs full price. | Cachen tar slut om ungefär {m} min. Sedan kostar det fullt pris att läsa om {n} tokens. |  |
| `cardcompact.the_chat_is_big_enough` | The session is big enough | Sessionen är tillräckligt stor |  |
| `cardcompact.the_compaction_left_out_names` | The compaction left out {names} | Komprimeringen tappade {names} |  |
| `cardcompact.the_goal` | the goal | målet |  |
| `cardcompact.the_guard_holds_nothing` | No risky step was stopped | Inget riskabelt steg har stoppats |  |
| `cardcompact.the_last_one_m_ago` | the last one {m} ago | den senaste var för {m} sedan |  |
| `cardcompact.the_next_turn_re_reads_n` | The next answer re-reads {n} tokens at full price. A summary: about {a}. | Nästa svar läser om {n} tokens till fullt pris. En sammanfattning: ungefär {a}. |  |
| `cardcompact.the_next_turn_re_reads_n_usually` | The next answer re-reads {n} tokens at full price. A summary: usually about {a}. | Nästa svar läser om {n} tokens till fullt pris. En sammanfattning: vanligtvis ungefär {a}. |  |
| `cardcompact.the_turn_ended` | The answer ended | Rundan är slut |  |
| `cardcompact.this_chat_is_getting_long` | This session is getting long. Compacting it saves usage. | Den här sessionen börjar bli lång. Att komprimera den sparar användning. |  |
| `cardcompact.this_chat_is_long_shortening_it` | This session is long. Compacting it saves usage. | Den här sessionen är lång. Att komprimera den sparar användning. |  |
| `cardcompact.told_claude_again_what_the` | Told Claude again what the compaction left out. | Sa till Claude igen vad komprimeringen tappade. |  |
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
| `cardcomputer.battery_n_not_plugged_in` | Battery {pct}, not plugged in | Batteri {pct}, inte inkopplat |  |
| `cardcomputer.claude_procs` | Claude: {procs} | Claude: {procs} |  |
| `cardcomputer.claude_procs_running` | Claude: {procs} · {running} | Claude: {procs} · {running} |  |
| `cardcomputer.last_reading_ago` | Last reading {ago}. | Senaste avläsningen {ago}. |  |
| `cardcomputer.load` | Load | Belastning |  |
| `cardcomputer.load_x_of_c` | load {x} of {c} | belastning {x} av {c} |  |
| `cardcomputer.load_x_of_c_cores` | Load {x} of {c} cores | Belastning {x} av {c} kärnor |  |
| `cardcomputer.macos_itself_reports_memory` | macOS itself reports memory pressure ({p}), even if the share used looks fine, so no new agent should start. | macOS själv rapporterar minnestryck ({p}), även om den använda andelen ser bra ut, så ingen ny agent bör starta. |  |
| `cardcomputer.memory` | Memory | Minne |  |
| `cardcomputer.memory_free_free_of_all_at` | Memory: {free} free of {all}. At about 1.5 GB per agent: room for {n}. | Minne: {free} ledigt av {all}. Med ungefär 1,5 GB per agent: plats för {n}. |  |
| `cardcomputer.memory_n` | Memory {pct} | Minne {pct} |  |
| `cardcomputer.memory_n_used` | Memory {pct} used | Minne {pct} använt |  |
| `cardcomputer.memory_not_read` | Memory not read | Minne inte avläst |  |
| `cardcomputer.memory_the_free_share_could_not` | Memory: the free share could not be read. | Minne: den lediga andelen kunde inte läsas. |  |
| `cardcomputer.memory_the_free_share_could_not_2` | Memory: the free share could not be read, so the room is counted from the rest and holds at 2 at most. | Minne: den lediga andelen kunde inte läsas, så platsen räknas från resten och blir högst 2. |  |
| `cardcomputer.n_free` | {n} free | {n} ledigt |  |
| `cardcomputer.n_helpers_running` | {n} agents running | {n} agenter körs |  |
| `cardcomputer.n_sessions_use_gb` | {n} sessions use {gb} | {n} sessioner använder {gb} |  |
| `cardcomputer.processor_idle_of_all_cores_idle` | Processor: {idle} of {all} cores idle. At about 2 per agent: room for {n}. | Processor: {idle} av {all} kärnor lediga. Med ungefär 2 per agent: plats för {n}. |  |
| `cardcomputer.processor_n` | processor {pct} | processor {pct} |  |
| `cardcomputer.processor_n_busy_c_cores` | Processor {pct} busy · {c} cores | Processor {pct} upptagen · {c} kärnor |  |
| `cardcomputer.processor_not_read` | processor not read | processor inte avläst |  |
| `cardcomputer.processor_not_read_2` | Processor not read | Processor inte avläst |  |
| `cardcomputer.processor_the_load_could_not_be` | Processor: the load could not be read. | Processor: belastningen kunde inte läsas. |  |
| `cardcomputer.room_for_about_1_more_helper` | Room for about 1 more agent | Plats för ungefär 1 agent till |  |
| `cardcomputer.room_for_about_1_more_helper_2` | Room for about 1 more agent, memory not read | Plats för ungefär 1 agent till, minnet är inte avläst |  |
| `cardcomputer.room_for_about_n_more_helpers` | Room for about {n} more agents | Plats för ungefär {n} agenter till |  |
| `cardcomputer.room_for_about_n_more_helpers_2` | Room for about {n} more agents, memory not read | Plats för ungefär {n} agenter till, minnet är inte avläst |  |
| `cardcomputer.sessions_not_counted` | sessions not counted | sessioner inte räknade |  |
| `cardcomputer.slowed_by_heat_to_n` | slowed by heat to {pct} | nedbromsad av värme till {pct} |  |
| `cardcomputer.the_battery_is_at_n_and` | The battery is at {pct} and not plugged in, so no new agent should start. | Batteriet är på {pct} och inte inkopplat, så ingen ny agent bör starta. |  |
| `cardcomputer.the_processor_is_slowed_to_n` | The processor is slowed to {pct} by heat, so no new agent should start. | Processorn är nedbromsad till {pct} av värme, så ingen ny agent bör starta. |  |
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
| `cardship.a_pull_request_pr_vaken_knows_in_any` | A pull request (PR) vaken knows of, in any repository and session: which session owns it, and whether GitHub can merge it or it needs a review. The app's own PR panel shows its checks. | En pull request (PR) som vaken känner till, i alla förråd och sessioner: vilken session som äger den, och om GitHub kan slå ihop den eller om den behöver granskas. Appens egen PR-panel visar dess kontroller. |  |
| `cardship.a_screen_file_was_edited_since` | A screen file was edited since you last looked, and the dev server answers. Press to take the pictures at all three sizes. | En skärmfil har ändrats sedan du senast tittade, och utvecklingsservern svarar. Tryck för att ta bilderna i alla tre storlekarna. |  |
| `cardship.a_write_saves_a_copy_first` | A write saves a copy first and asks twice. | Att skriva sparar först en kopia och frågar två gånger. |  |
| `cardship.about_n_min` | about {n} min | ungefär {n} min |  |
| `cardship.about_the_runs_started_from_this` | {about} The runs started from this session use this model. No file is written. | {about} Körningarna som startas från den här sessionen använder den här modellen. Ingen fil skrivs. |  |
| `cardship.all_n_checks_passed` | All {n} checks passed. | Alla {n} kontroller gick igenom. |  |
| `cardship.all_projects_this_project_or_this` | All projects, this project or this session. | Alla projekt, det här projektet eller den här sessionen. |  |
| `cardship.and_no_cockpit_block` |  and no vaken block |  och inget vaken-block |  |
| `cardship.as_number_n` | as number {n} | som nummer {n} |  |
| `cardship.asked_github_ago` | Asked GitHub {ago}. | Frågade GitHub {ago}. |  |
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
| `cardship.halt_all_refuses_every_step_that` | Pause this session stops shell commands, file edits, tools from other apps, agents, web fetches and skills in this session. Reading still works. A step that is already running keeps running. | Pausa den här sessionen stoppar skalkommandon, filändringar, verktyg från andra appar, agenter, webbhämtningar och färdigheter i den här sessionen. Att läsa fungerar fortfarande. Ett steg som redan körs fortsätter. |  |
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
| `cardship.press_to_halt_press_resume_to` | Press to pause this session. Press Resume to continue. /vaken-pause does the same in the session. | Tryck för att pausa den här sessionen. Tryck på Återuppta för att fortsätta. /vaken-pause gör detsamma i sessionen. |  |
| `cardship.press_to_put_a_fix_request` | Press to put a fix request in the prompt box, then press Enter to send it. /vaken-ship proof shows what ran. | Tryck för att lägga en begäran om att laga i promptrutan, och tryck sedan på Enter för att skicka den. /vaken-ship proof visar vad som kördes. |  |
| `cardship.press_to_see_if_the_work` | Press to see if the work looks ready, as /vaken-ship says. Merging stays your press. | Tryck för att se om arbetet ser klart ut, som /vaken-ship säger. Du trycker själv för att slå ihop. |  |
| `cardship.press_to_see_the_full_verdict` | Press to see the full verdict of /vaken-ship under the row. Merging and pushing stay your press. | Tryck för att se hela bedömningen från /vaken-ship under raden. Du trycker själv för att slå ihop och pusha. |  |
| `cardship.press_to_take_it_the_picture` | Press to take it. The picture is kept in the project folder and the toast names it; nothing is sent to Claude. Ask Claude to look at the file if you want it to see it. | Tryck för att ta den. Bilden sparas i projektmappen och notisen nämner den; inget skickas till Claude. Be Claude titta på filen om du vill att den ska se den. |  |
| `cardship.reads_memory_and_battery_it_runs` | Reads memory and battery. It runs short programs. | Läser minne och batteri. Den kör korta program. |  |
| `cardship.researcher` | researcher | utforskare |  |
| `cardship.reviewer` | reviewer | granskare |  |
| `cardship.saves_a_copy_of_path_then` | Saves a copy of {path}, then writes it as shown above. | Sparar en kopia av {path} och skriver den sedan som visas ovan. |  |
| `cardship.say_when_worktrees_are_safe_to` | Say when worktrees are safe to remove. | Säg till när arbetsträd är säkra att ta bort. |  |
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
| `cardship.the_apps_pr_panel_shows_the_checks` | The app's PR panel shows the checks and offers Auto-fix. Ship says ready once they pass. | Appens PR-panel visar kontrollerna och erbjuder Auto-fix. Leverans säger klart när de går igenom. |  |
| `cardship.the_checkpoint_name_you_named_a` | The checkpoint "{name}" you named: a copy of one file as it was then. | Kontrollpunkten "{name}" som du namngav: en kopia av en fil som den var då. |  |
| `cardship.the_checkpoint_name_you_named_a_2` | The checkpoint "{name}" you named: a copy of {n} files as they were then. | Kontrollpunkten "{name}" som du namngav: en kopia av {n} filer som de var då. |  |
| `cardship.the_checks_card_shows_each_check` | The Checks card shows each check, its age and the Fix press. | Kortet Kontroller visar varje kontroll, dess ålder och knappen Laga. |  |
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
| `cardship.warn_at_80_or_also_stop` | Warn at 80%, or also stop costly calls at 100%. | Varna vid 80 %, eller stoppa också dyra anrop vid 100 %. |  |
| `cardship.warn_when_another_session_edits` | Warn when another session edits the same file. | Varna när en annan session ändrar samma fil. |  |
| `cardship.warn_when_another_session_holds_a` | Warn when another session holds a port. | Varna när en annan session håller en port. |  |
| `cardship.warns_on_repeated_edits_idle_calls` | Warns on repeated edits, idle calls or a failing step. | Varnar vid upprepade ändringar, tomma anrop eller ett misslyckat steg. |  |
| `cardship.warns_when_edits_wander_far_from` | Warns when edits wander far from the goal. | Varnar när ändringar glider långt från målet. |  |
| `cardship.was_made_by_the_cockpit_and` | was made by vaken and no longer follows your choices. | gjordes av vaken och följer inte längre dina val. |  |
| `cardship.what_blocks_it` | What blocks it: | Vad som hindrar: |  |
| `cardship.what_the_chat_starts_from_and` | What the session starts from and what would be carried on: the CLAUDE.md files Claude re-reads every answer, the notes it keeps about this project, the note for the next session and what a compaction keeps. A token is a small piece of text, about three quarters of a word. It only shows what vaken already knows. | Vad sessionen utgår från och vad som skulle tas med: CLAUDE.md-filerna Claude läser om varje svar, anteckningarna den sparar om projektet, anteckningen till nästa session och vad en komprimering behåller. En token är en liten bit text, ungefär tre fjärdedels ord. Den visar bara det vaken redan vet. |  |
| `cardship.what_the_next_session_needs_goal` | What the next session needs: goal, branch, changed files, checks and open questions. Each line says whether git or a check backs it (checked) or nothing does yet (not checked). | Vad nästa session behöver: mål, gren, ändrade filer, kontroller och öppna frågor. Varje rad säger om git eller en kontroll styrker den (kontrollerad) eller om inget gör det än (okontrollerad). |  |
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
| `cardcontext.1_allow_rule` | 1 allow rule | 1 tillåtelseregel |  |
| `cardcontext.1_file` | 1 file | 1 fil |  |
| `cardcontext.1_line_appear_in_more_than` | 1 line appears in more than one file. Keep each rule in one place. First: "{line}" | 1 rad finns i mer än en fil. Ha varje regel på ett ställe. Först: "{line}" |  |
| `cardcontext.1_very_long_line_short_lines` | 1 very long line. Short lines are easier to keep right. | 1 mycket lång rad. Korta rader är lättare att underhålla. |  |
| `cardcontext.a_settings_file_or_an_instruction` | A settings file or an instruction file changed after this session started. Settings apply at once. Claude may follow the old text of an instruction file until the session is compacted or a new one starts. | En inställningsfil eller en instruktionsfil ändrades efter att sessionen startade. Inställningar gäller direkt. Claude kan följa den gamla texten i en instruktionsfil tills sessionen komprimeras eller en ny startar. |  |
| `cardcontext.allow_names` | Allow: {names} | Tillåt: {names} |  |
| `cardcontext.allowed_and_denied_at_once` | Allowed and denied at once | Tillåten och nekad samtidigt |  |
| `cardcontext.big` | (big) | (stor) |  |
| `cardcontext.changed_this_session` | Changed this session | Ändrad under sessionen |  |
| `cardcontext.cockpit_brief_prints_it_for` | /vaken-help run brief prints it for pasting into a new session. /vaken-help run packet saves it as a file in the project. | /vaken-help run brief skriver ut den så att du kan klistra in den i en ny session. /vaken-help run packet sparar den som en fil i projektet. |  |
| `cardcontext.cockpit_compact_says_whether_now` | /vaken-compact says whether now is a good moment, and a line to paste after /compact. | /vaken-compact säger om det är en bra stund nu, och en rad att klistra in efter /compact. |  |
| `cardcontext.cockpit_devserver_says_the_same_in` | Vaken looks at the usual dev ports and never starts a server. A press takes a picture; nothing is sent to Claude. | Vaken tittar på de vanliga utvecklingsportarna och startar aldrig en server. Ett tryck tar en bild; inget skickas till Claude. |  |
| `cardcontext.cockpit_diet_cockpit_memory` | /vaken-help run diet, /vaken-memory, /vaken-help run brief and /vaken-compact say more in the session. The size of the session itself is on the This session card. | /vaken-help run diet, /vaken-memory, /vaken-help run brief och /vaken-compact säger mer i sessionen. Själva sessionens storlek finns på kortet Den här sessionen. |  |
| `cardcontext.cockpit_diet_has_the_details` | /vaken-help run diet has the details. | /vaken-help run diet har detaljerna. |  |
| `cardcontext.cockpit_digest_shows_it_in_the` | /vaken-away digest shows it in the session. | /vaken-away digest visar den i sessionen. |  |
| `cardcontext.cockpit_halt_cockpit_undo_cockpit` | /vaken-pause, /vaken-undo, /vaken-undo checkpoint &lt;name&gt; and /vaken-guard do the same in the session. Name the present state with /vaken-undo checkpoint &lt;name&gt;. | /vaken-pause, /vaken-undo, /vaken-undo checkpoint &lt;namn&gt; och /vaken-guard gör samma sak i sessionen. Namnge nuläget med /vaken-undo checkpoint &lt;namn&gt;. |  |
| `cardcontext.cockpit_recap_cockpit_today_and` | /vaken-today recap, /vaken-today and /vaken-today standup say more in the session. | /vaken-today recap, /vaken-today och /vaken-today standup säger mer i sessionen. |  |
| `cardcontext.cockpit_setup_says_the_same_in` | /vaken-help run setup says the same in the session, and /vaken-help run setup on, scope, make and replace do what the card does. | /vaken-help run setup säger samma sak i sessionen, och /vaken-help run setup on, scope, make och replace gör det kortet gör. |  |
| `cardcontext.days` | days | dagar |  |
| `cardcontext.deny_names` | Deny: {names} | Neka: {names} |  |
| `cardcontext.if_claude_should_follow_the_new` | If Claude should follow the new text now, start a new session. | Om Claude ska följa den nya texten nu, starta en ny session. |  |
| `cardcontext.instruction_files_names` | Instruction files: {names} | Instruktionsfiler: {names} |  |
| `cardcontext.keep_the_rule_in_one_list_only` | Keep the rule in one list only. | Ha regeln i bara en lista. |  |
| `cardcontext.n_allow_rules` | {n} allow rules | {n} tillåtelseregler |  |
| `cardcontext.n_files` | {n} files | {n} filer |  |
| `cardcontext.n_lines_appear_in_more_than` | {n} lines appear in more than one file. Keep each rule in one place. First: "{line}" | {n} rader finns i mer än en fil. Ha varje regel på ett ställe. Först: "{line}" |  |
| `cardcontext.n_very_long_lines_short_lines` | {n} very long lines. Short lines are easier to keep right. | {n} mycket långa rader. Korta rader är lättare att underhålla. |  |
| `cardcontext.path_about_tokens_tokens_lines` | {path}: about {tokens} tokens, {lines} lines | {path}: ungefär {tokens} tokens, {lines} rader |  |
| `cardcontext.path_is_big_move_rarely_needed` | {path} is big. Move rarely needed parts into separate notes that Claude reads only when asked. | {path} är stor. Flytta delar som sällan behövs till separata anteckningar som Claude bara läser när du ber om det. |  |
| `cardcontext.rules_in_force` | Rules in force | Regler som gäller |  |
| `cardcontext.the_rules_are_under_permissions` | The rules are under "permissions" in .claude/settings.json, .claude/settings.local.json and ~/.claude/settings.json. Vaken never changes them. | Reglerna finns under "permissions" i .claude/settings.json, .claude/settings.local.json och ~/.claude/settings.json. Vaken ändrar dem aldrig. |  |
| `cardcontext.the_same_rule_is_in_an_allow` | The same rule is in an allow list and in a deny list. Claude Code follows the deny, so the allow does nothing. | Samma regel finns i en tillåtelselista och i en nekandelista. Claude Code följer nekandet, så tillåtelsen gör ingenting. |  |
| `cardcontext.together_they_are_heavy_claude_re` | Together they are heavy: Claude re-reads about {tokens} tokens on every answer. Trim what you do not need in most sessions. | Tillsammans är de tunga: Claude läser om ungefär {tokens} tokens varje svar. Trimma det du inte behöver i de flesta sessioner. |  |
| `cardcontext.what_claude_follows_now_the` | What Claude follows now: the instruction files Claude Code loaded in this session, and the allow and deny rules of every settings file. Vaken only reads them, and keeps names and counts only. | Det Claude följer nu: instruktionsfilerna som Claude Code läste in i den här sessionen, och tillåtelse- och nekanderegler i varje inställningsfil. Vaken läser dem bara, och sparar bara namn och antal. |  |

## engines

Shown from the code. (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `engines.5_h_runs_out_about_words_estimate` | 5 h runs out about {words} (estimate) | 5 h tar slut ungefär {words} (uppskattning) | The band's limit warning; "5 h" is the 5-hour limit's short name, as on the plan chip beside it. |
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
| `engines.extra_usage_runs_out_about_words_estimate` | Extra usage runs out about {words} (estimate) | Extra användning tar slut ungefär {words} (uppskattning) |  |
| `engines.feb` | Feb | feb |  |
| `engines.files` | files | filer |  |
| `engines.files_changed` | Files changed | Ändrade filer |  |
| `engines.fix_ci_could_not_reach_github` | Fix CI: could not reach GitHub. | Laga CI: nådde inte GitHub. |  |
| `engines.fix_ci_gh_did_not_answer` | Fix CI: gh did not answer in time. | Laga CI: gh svarade inte i tid. |  |
| `engines.fix_ci_gh_is_not_installed` | Fix CI: gh is not installed. Install it from cli.github.com, then sign in. | Laga CI: gh är inte installerat. Installera det från cli.github.com och logga sedan in. |  |
| `engines.fix_ci_gh_is_not_signed_in` | Fix CI: gh is not signed in to GitHub. Type gh auth login in a terminal. | Laga CI: gh är inte inloggat på GitHub. Skriv gh auth login i en terminal. |  |
| `engines.fix_ci_no_check_failed_n` | one: Fix CI: no check failed. {n} still runs.<br>other: Fix CI: no check failed. {n} still run. | one: Laga CI: ingen kontroll misslyckades. {n} körs fortfarande.<br>other: Laga CI: ingen kontroll misslyckades. {n} körs fortfarande. |  |
| `engines.fix_ci_no_check_failed_nothing` | Fix CI: no check failed. Nothing to fix. | Laga CI: ingen kontroll misslyckades. Inget att laga. |  |
| `engines.fix_ci_no_checks_were_found` | Fix CI: no checks were found. | Laga CI: inga kontroller hittades. |  |
| `engines.fix_ci_no_checks_were_found_2` | Fix CI: no checks were found ({reason}). | Laga CI: inga kontroller hittades ({reason}). |  |
| `engines.fix_ci_there_is_no_pull` | Fix CI: there is no pull request for this branch. | Laga CI: det finns ingen pull request för den här grenen. |  |
| `engines.fix_ci_try_n_of_m` | Fix CI: try {n} of {m} in 24 hours for {name}. | Laga CI: försök {n} av {m} på 24 timmar för {name}. |  |
| `engines.folder_copy_path_branch_branch` | Folder copy: {path} (branch {branch}) | Arbetsträd: {path} (gren {branch}) |  |
| `engines.friday_time` | Friday {time} | fredag kl. {time} |  |
| `engines.git_not_read` | git not read | git lästes inte |  |
| `engines.if_an_edit_went_wrong_cockpit` | If an edit went wrong: /vaken-undo last. | Om en ändring blev fel: /vaken-undo last. |  |
| `engines.it_resets_at_words` | It resets at {words}. | Den återställs {words}. |  |
| `engines.it_waits_for_you_to_go` | It waits for you to go on. | Den väntar på att du går vidare. |  |
| `engines.its_branch_is_kept_for_your` | Its branch is kept for your review. | Dess gren sparas för din granskning. |  |
| `engines.its_copy_file_cannot_be_read` | its copy file cannot be read | dess kopia går inte att läsa |  |
| `engines.its_copy_file_does_not_match` | its copy file does not match what was kept | dess kopia stämmer inte med det som sparades |  |
| `engines.its_copy_was_dropped_to_stay` | its copy was dropped to stay inside the limits | dess kopia togs bort för att hålla sig inom gränserna |  |
| `engines.its_folder_copy_was_thrown_away` | Its folder copy was thrown away. | Dess arbetsträd slängdes. |  |
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
| `engines.none_is_named_yet_cockpit_checkpoint` | None is named yet: /vaken-undo checkpoint &lt;name&gt;. | Ingen är namngiven än: /vaken-undo checkpoint &lt;namn&gt;. |  |
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
| `engines.the_agent_did_not_start` | the agent did not start | agenten startade inte |  |
| `engines.the_agent_did_not_start_in` | the agent did not start in time | agenten startade inte i tid |  |
| `engines.the_agent_did_not_start_its` | the agent did not start: its program was not found | agenten startade inte: dess program hittades inte |  |
| `engines.the_cache_had_gone_stale_so` | The cache had gone stale, so the read paid for a rewrite. | Cachen hade blivit gammal, så läsningen kostade en omskrivning. |  |
| `engines.the_check_could_not_run` | the check could not run | kontrollen kunde inte köras |  |
| `engines.the_check_could_not_start_its` | the check could not start: its program was not found | kontrollen kunde inte starta: dess program hittades inte |  |
| `engines.the_check_did_not_finish_in` | the check did not finish in time | kontrollen blev inte klar i tid |  |
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
| `engines.the_stopped_step_stays_stopped` | The stopped step stays stopped for this session. It did not run. | Det stoppade steget hålls stoppat i den här sessionen. Det kördes inte. |  |
| `engines.the_stopped_step_was_dismissed` | The stopped step was dismissed. It did not run. | Det stoppade steget avfärdades. Det kördes inte. |  |
| `engines.the_time_you_set_ran_out` | The time you set ran out. | Tiden du satte gick ut. |  |
| `engines.the_weekly_limit` | the weekly limit | veckogränsen |  |
| `engines.this_session_has_no_reply_yet` | This session has no reply yet. Send one message, wait for the answer, then try again. | Den här sessionen har inget svar än. Skicka ett meddelande, vänta på svaret och försök igen. |  |
| `engines.thrown_away` | thrown away | slängd |  |
| `engines.thursday_time` | Thursday {time} | torsdag kl. {time} |  |
| `engines.title_n_times_today_nothing_was` | {title}: {n} times today, nothing was stopped. Turn this warning off for all projects? | {title}: {n} gånger i dag, inget stoppades. Vill du stänga av den här varningen för alla projekt? |  |
| `engines.try_n` | try {n} | försök {n} |  |
| `engines.tuesday_time` | Tuesday {time} | tisdag kl. {time} |  |
| `engines.undo_last_skipped` | one: Since your last message, {n} file or folder was changed that vaken could not keep a copy of (a folder, too big, secret-looking or not plain text), so there is nothing it can put back. Check it by hand. /vaken-undo lists older changes.<br>other: Since your last message, {n} files or folders were changed that vaken could not keep a copy of (a folder, too big, secret-looking or not plain text), so there is nothing it can put back. Check them by hand. /vaken-undo lists older changes. | one: Sedan ditt senaste meddelande ändrades {n} fil eller mapp som vaken inte kunde spara en kopia av (en mapp, för stor, ser hemlig ut eller inte vanlig text), så det finns inget att sätta tillbaka. Kontrollera den för hand. /vaken-undo listar äldre ändringar.<br>other: Sedan ditt senaste meddelande ändrades {n} filer eller mappar som vaken inte kunde spara en kopia av (en mapp, för stor, ser hemlig ut eller inte vanlig text), så det finns inget att sätta tillbaka. Kontrollera dem för hand. /vaken-undo listar äldre ändringar. |  |
| `engines.undo_preview_for_name` | Undo preview for {name}. | Förhandsvisning av att ångra {name}. |  |
| `engines.up_from_model` | up from {model} | upp från {model} |  |
| `engines.waiting_for_you` | Waiting for you: | Väntar på dig: |  |
| `engines.waiting_for_your_look` | Waiting for your look | Väntar på att du tittar |  |
| `engines.waits_a_hook_took_too_long` | waits: a hook took too long to answer | väntar: en hook tog för lång tid att svara |  |
| `engines.waits_the_plan_limit_stopped_it` | waits: the plan limit stopped it | väntar: planens gräns stoppade den |  |
| `engines.wednesday_time` | Wednesday {time} | onsdag kl. {time} |  |
| `engines.week_name_runs_out_about_words_estimate` | Week · {name} runs out about {words} (estimate) | Vecka · {name} tar slut ungefär {words} (uppskattning) |  |
| `engines.week_runs_out_about_words_estimate` | Week runs out about {words} (estimate) | Vecka tar slut ungefär {words} (uppskattning) |  |
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
| `engines.you_stopped_the_run_before_the` | You stopped the run before the review ended. | Du stoppade körningen innan granskningen var klar. |  |
| `engines.your_first_message_not_checked` | key words of your first message, not checked | nyckelord ur ditt första meddelande, inte kontrollerat |  |
| `engines.your_words_not_checked` | your words, not checked | dina ord, inte kontrollerade |  |

## access

Shown from the code. (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `access.divider` | Divider | Avdelare |  |
| `access.dot_active` | Active | Aktiv |  |
| `access.dot_calm` | OK | OK |  |
| `access.dot_unknown` | Not known yet | Inte känt än |  |
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
| `truth.cache_hit_hit_warm_under_1_min` | Cache {hit}% hit · warm under 1 min | Cache {hit} % träff · varm under 1 min |  |
| `truth.cache_warm_under_1_min` | Cache warm under 1 min | Cache varm under 1 min |  |
| `truth.left_of_the_week_left_about_days_to_go` | {left}% of the week left, about {days} days to go, today included. To make it last, use about {per}% a day. | {left} % av veckan kvar, ungefär {days} dagar till, i dag inräknad. För att det ska räcka, använd ungefär {per} % om dagen. |  |
| `truth.left_of_the_week_left_resets_within_a_day` | {left}% of your weekly limit is left, and it resets within a day. | {left} % av din veckogräns är kvar, och den återställs inom en dag. |  |
| `truth.left_of_the_week_left_until_it_resets` | {left}% of your weekly limit is left. To make it last until it resets, use about {per}% a day. | {left} % av din veckogräns är kvar. För att den ska räcka tills den återställs, använd ungefär {per} % om dagen. |  |
| `truth.n_cancelled` | {n} cancelled | {n} avbrutna |  |
| `truth.n_checking` | {n} checking | {n} kontrolleras |  |
| `truth.n_skipped` | {n} skipped | {n} hoppades över |  |
| `truth.n_stopped_today` | {n} stopped today. | {n} stoppade i dag. |  |
| `truth.n_warned_today` | {n} warned today. | {n} varnade i dag. |  |
| `truth.run_n_done` | one: 1 done<br>other: {n} done | one: 1 klar<br>other: {n} klara |  |
| `truth.run_n_not_run` | one: 1 not run<br>other: {n} not run | one: 1 inte körd<br>other: {n} inte körda |  |
| `truth.run_n_stopped` | one: 1 stopped<br>other: {n} stopped | one: 1 stoppad<br>other: {n} stoppade |  |
| `truth.to_let_a_stopped_step_through_use` | To let a stopped step through, use Allow once in Needs you. | För att släppa igenom ett stoppat steg: använd Tillåt en gång i Behöver dig. |  |
| `truth.today_about_n_used` | Today: about {n}% used. | I dag: ungefär {n} % använt. |  |
| `truth.today_since_time_about_n_used` | Today since {time}: about {n}% used. | I dag sedan {time}: ungefär {n} % använt. |  |
| `truth.weekly_limit_used_up_resets_when` | Your weekly limit is used up. It resets {when}. | Din veckogräns är förbrukad. Den återställs {when}. |  |

## fmt

Numbers and times: a time gone, a length of time, an estimated price, day and month names. (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `fmt.a_of_b` | {a} of {b} | {a} av {b} | A part of a whole: 68k of 1M. |
| `fmt.about_usd` | about {usd} | ungefär {usd} | An estimated price: about $0.84. A no-break space, so a narrow line never splits it. |
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
| `fmt.n_d` | {n} d | {n} d | A number of days, short. |
| `fmt.n_d_ago` | {n} d ago | för {n} d sedan | A time gone in days, short. |
| `fmt.n_h` | {n} h | {n} h | A number of hours, short. |
| `fmt.n_h_ago` | {n} h ago | för {n} h sedan | A time gone in hours, short. |
| `fmt.n_min` | {n} min | {n} min | A number of minutes, short. |
| `fmt.n_min_ago` | {n} min ago | för {n} min sedan | A time gone in minutes, short. |
| `fmt.n_need_you` | one: {n} needs you<br>other: {n} need you | one: {n} behöver dig<br>other: {n} behöver dig | A count of what waits for the person, on an Arrange tile. |
| `fmt.n_s` | {n} s | {n} s | A number of seconds, short. |
| `fmt.n_sessions` | one: {n} session<br>other: {n} sessions | one: {n} session<br>other: {n} sessioner | A count of sessions, on an Arrange tile. |
| `fmt.n_today` | {n} today | {n} i dag | A count of what happened today. |
| `fmt.none` | None | Inga | A count of nothing, in place of a bare 0. |
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
| `fmt.under_usd` | under {usd} | under {usd} | A price too small to say: under $0.01. A no-break space, so a narrow line never splits it. |
| `fmt.usd_estimate` | {usd} (estimate) | {usd} (uppskattning) | A row's estimated price says it is one: about $0.12 (estimate). |
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
| `words.read_only_command` | one: {n} read-only command<br>other: {n} read-only commands | one: {n} kommando som bara läser<br>other: {n} kommandon som bara läser | A count of commands that only read. |
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
| `common.20_usd` | $20 | $20 |  |
| `common.22_00_to_07_00` | 22:00 to 07:00 | 22:00 till 07:00 |  |
| `common.25` | $25 | $25 |  |
| `common.2_usd` | $2 | $2 |  |
| `common.3` | 3 | 3 |  |
| `common.4` | 4 | 4 |  |
| `common.5` | 5 | 5 |  |
| `common.50` | $50 | $50 |  |
| `common.50_2` | 50% | = |  |
| `common.5_2` | $5 | $5 |  |
| `common.6` | 6 | 6 |  |
| `common.60` | 60% | = |  |
| `common.70_2` | 70% | = |  |
| `common.8` | 8 | 8 |  |
| `common.a_good_moment` | a good moment | ett bra läge |  |
| `common.a_helper_made_no_progress_for` | An agent made no progress for 10 min | En agent gjorde inga framsteg på 10 min |  |
| `common.a_helper_that_only_searches_or` | An agent that only searches or reads does not need the biggest model. Auto sends such an agent to a cheaper one. Suggest only tells you. Plan and review agents are never changed, nor an agent that an agent file of yours defines (it keeps the model its file chose), nor a model Claude chose. | En agent som bara söker eller läser behöver inte den största modellen. Auto skickar en sådan agenter till en billigare. Föreslå berättar bara för dig. Agenter för planering och granskning ändras aldrig, inte heller en agent som en agentfil av dig definierar (den behåller modellen som filen valde), inte heller en modell som Claude valde. |  |
| `common.a_helper_that_runs_longer_is` | An agent that runs longer is stopped. | En agent som kör längre stoppas. |  |
| `common.a_layout_remembers_the_look_detail` | A layout remembers the look: detail levels, which cards show and the card order of each width. | En layout kommer ihåg utseendet: detaljnivåer, vilka kort som visas och kortens ordning för varje bredd. |  |
| `common.a_run_that_ends_shows_here` | A run that ends shows here: what is done, what failed and what it cost. | En körning som slutar visas här: vad som är klart, vad som misslyckades och vad det kostade. |  |
| `common.a_template_keeps_a_runs_tasks` | A template keeps a run’s tasks and choices, to start it again later. | En mall sparar en körnings uppgifter och val, så att du kan starta den igen senare. |  |
| `common.a_working_session_sends_small_signs` | A working session sends small signs of life; if none comes for a few minutes, the line above the chat box says it has gone quiet. A long command can be quiet too, so look before you stop it. When one command has run for 10 minutes, the line says so instead, with Stop the answer, which ends Claude's whole answer and not only that command, and Keep waiting. | En session som arbetar skickar små livstecken; kommer inget på några minuter säger raden ovanför chattrutan att den har blivit tyst. Ett långt kommando kan också vara tyst, så titta efter innan du stoppar det. När ett kommando har kört i 10 minuter säger raden det i stället, med Stoppa svaret, som avslutar hela Claudes svar och inte bara kommandot, och Vänta vidare. |  |
| `common.about_this` | About this › | Om detta › |  |
| `common.accent_colour` | Accent colour | Accentfärg |  |
| `common.add` | Add | Lägg till |  |
| `common.add_a_task_for_example_fix` | Add a task | Lägg till en uppgift |  |
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
| `common.at_a_quiet_moment_from_about` | At a quiet moment, once the session fills {from}% of its window (Settings, Compacting, Compact when it fills), when the saving is bigger than the cost of the summary. The cost is an estimate. | Vid en lugn stund, när sessionen fyller {from} % av sitt fönster (Inställningar, Komprimering, Komprimera när den fylls), när vinsten är större än kostnaden för sammanfattningen. Kostnaden är en uppskattning. |  |
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
| `common.chapters` | Chapters | Kapitel |  |
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
| `common.clear_past_runs` | Clear past runs | Rensa tidigare körningar |  |
| `common.clear_past_runs_ask` | Clear the list of past runs? The run on this page stays. Cannot be undone. | Rensa listan med tidigare körningar? Körningen på den här sidan finns kvar. Kan inte ångras. |  |
| `common.clickable_questions` | Clickable questions | Klickbara frågor |  |
| `common.cockpit_audit_lists_what_the_cockpit` | /vaken-help run audit lists what vaken did and which steps you allowed, for the last 500 actions. /vaken-help run audit export writes it to a file you can keep or share. | /vaken-help run audit listar vad vaken gjorde och vilka steg du tillät, för de 500 senaste åtgärderna. /vaken-help run audit export skriver det till en fil som du kan spara eller dela. |  |
| `common.cockpit_away_on_2h_tells_the` | /vaken-away on 2h tells vaken you are gone for two hours. It sets the away policy to Careful and the cost budget to Stop, and puts both back when it ends. /vaken-away off ends it early. | /vaken-away on 2h säger till vaken att du är borta i två timmar. Den sätter regeln för frånvaro till Försiktig och kostnadsbudgeten till Stoppa, och sätter tillbaka båda när det tar slut. /vaken-away off avslutar det i förtid. |  |
| `common.cockpit_brief_prints_what_the_next` | A handoff note is a note for the next session: /vaken-help run brief prints it, with goal, branch, changed files, checks and open questions, and each line says if git or a check backs it. /vaken-help run packet saves the same facts as a file in the project. | En överlämning är en anteckning till nästa session: /vaken-help run brief skriver ut den, med mål, gren, ändrade filer, kontroller och öppna frågor, och varje rad säger om git eller en kontroll stöder den. /vaken-help run packet sparar samma fakta som en fil i projektet. |  |
| `common.cockpit_checkpoint_name_saves_the` | /vaken-undo checkpoint name saves the state of every file changed so far. /vaken-undo name &lt;name&gt; shows what going back would do. Vaken never deletes a file for you. | /vaken-undo checkpoint name sparar läget för varje fil som ändrats hittills. /vaken-undo name &lt;namn&gt; visar vad en återgång skulle göra. Vaken tar aldrig bort en fil åt dig. |  |
| `common.cockpit_confidence_gives_one_number` | /vaken-help run confidence gives one number made only of evidence, with its list. /vaken-help run intent says what you asked, what was delivered, what is extra and what is missing. /vaken-ship queue puts finished changes in order of risk. /vaken-ship heat says where to look first. | /vaken-help run confidence ger ett tal som bara bygger på belägg, med listan bakom. /vaken-help run intent säger vad du bad om, vad som levererades, vad som är extra och vad som saknas. /vaken-ship queue ordnar färdiga ändringar efter risk. /vaken-ship heat säger var du ska titta först. |  |
| `common.cockpit_fit_20_says_whether_a` | /vaken-usage fit 20 says whether a job that uses about 20% of your plan window fits, or when to start it. | /vaken-usage fit 20 säger om ett jobb som använder ungefär 20 % av ditt planfönster ryms, eller när du ska starta det. |  |
| `common.cockpit_halt_stops_every_step_that` | /vaken-pause pauses shell commands, file edits, tools from other apps, agents, web fetches and skills in this session, until you run /vaken-pause off. /vaken-guard allow once lets the next stopped step through. | /vaken-pause pausar skalkommandon, filändringar, verktyg från andra appar, agenter, webbhämtningar och färdigheter i den här sessionen, tills du kör /vaken-pause off. /vaken-guard allow once släpper igenom nästa stoppade steg. |  |
| `common.cockpit_health` | Vaken health | Vaken-hälsa |  |
| `common.cockpit_inbox_lists_what_waits_for` | /vaken inbox lists what waits for you in every session: stopped steps, questions, finished changes you have not looked at. Each line says which session, how long, and what you can do. It cannot press OK for you. | /vaken inbox listar vad som väntar på dig i varje session: stoppade steg, frågor, färdiga ändringar du inte har tittat på. Varje rad säger vilken session, hur länge och vad du kan göra. Den kan inte trycka OK åt dig. |  |
| `common.cockpit_outbox_lists_what_left_this` | /vaken-guard outbox lists what left this computer this answer. /vaken-away on makes vaken stop risky steps by itself while you are gone. It needs While away set to Careful. | /vaken-guard outbox listar vad som lämnade datorn det här svaret. /vaken-away on gör att vaken själv stoppar riskabla steg medan du är borta. Det kräver att När du är borta är satt till Försiktig. |  |
| `common.cockpit_park_idea_keeps_a_side` | /vaken-memory park &lt;idea&gt; keeps a side idea for later without interrupting Claude. /vaken-memory park lists them. /vaken-memory park send 2 puts idea 2 into the prompt box. The ideas are text you write; they stay on your computer, one shelf per project. | /vaken-memory park &lt;idé&gt; sparar en sidoidé till senare utan att avbryta Claude. /vaken-memory park listar dem. /vaken-memory park send 2 lägger idé 2 i promptrutan. Idéerna är text du skriver; de stannar på din dator, en hylla per projekt. |  |
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
| `common.context_n` | context {n}% | kontext {n} % |  |
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
| `common.do_the_steps_in_this_order` | Do the steps in this order. 1. Press Delete everything vaken stored (Settings, the Your data card at the bottom). Do it first: the button goes with the plugin. 2. The first press only shows what would go. The second press deletes it, and it cannot be undone. It removes your saved choices and notes, and the folder ~/.claude/cockpit with the copies of changed files that Undo uses. A paused session stays paused. 3. Remove the plugin: run claude plugin uninstall vaken@vaken in a terminal, then start a new session. 4. Files vaken wrote inside your projects stay, and you can delete them yourself: .claude/cockpit-packet.md (the note for the next session), .claude/cockpit-tasks.md, .claude/cockpit-eyes/, .claude/cockpit-decisions\*.md and .claude/cockpit-audit\*.md (with their numbered copies, such as cockpit-audit-2.md). Your CLAUDE.md and settings.json were never changed. | Gör stegen i den här ordningen. 1. Tryck på Ta bort allt som vaken har sparat (Inställningar, kortet Dina data längst ned). Gör det först: knappen försvinner med tillägget. 2. Första trycket visar bara vad som skulle tas bort. Andra trycket tar bort det, och det går inte att ångra. Det tar bort dina sparade val och anteckningar, och mappen ~/.claude/cockpit med kopiorna av ändrade filer som Ångra använder. En pausad session förblir pausad. 3. Ta bort tillägget: kör claude plugin uninstall vaken@vaken i en terminal och starta sedan en ny session. 4. Filer som vaken skrev i dina projekt finns kvar, och du kan ta bort dem själv: .claude/cockpit-packet.md (anteckningen till nästa session), .claude/cockpit-tasks.md, .claude/cockpit-eyes/, .claude/cockpit-decisions\*.md och .claude/cockpit-audit\*.md (med sina numrerade kopior, till exempel cockpit-audit-2.md). Din CLAUDE.md och settings.json har aldrig ändrats. |  |
| `common.does_it_count_the_rules_i` | Does it count the rules I wrote? | Räknar den reglerna jag skrivit? |  |
| `common.does_the_cockpit_still_work_after` | Does vaken still work after an update? | Fungerar vaken efter en uppdatering? |  |
| `common.dollars_per_day_over_all_sessions` | Dollars per day over the sessions vaken saw, as an estimate. | Dollar per dag för de sessioner vaken har sett, som en uppskattning. |  |
| `common.dollars_per_session_as_an_estimate` | Dollars per session, as an estimate. | Dollar per session, som en uppskattning. |  |
| `common.done` | Done | Klar |  |
| `common.done_and_next` | Done and next | Klart och nästa |  |
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
| `common.for_a_message_of_25_words` | For a message of 25 words or more, at most once an hour in a session, this asks Claude to list its assumptions in at most 4 short lines that start with "Assumed:" before it changes files. After the answer the line above the chat box shows how many. /vaken-explain assumptions lists them. | För ett meddelande på 25 ord eller mer, högst en gång i timmen i en session, ber detta Claude lista sina antaganden i högst 4 korta rader som börjar med "Assumed:" innan filer ändras. Efter svaret visar raden ovanför chattrutan hur många. /vaken-explain assumptions listar dem. |  |
| `common.for_a_message_of_25_words_habits` | For a message of 25 words or more, one short note asks Claude for the habits that are on: a task list you can follow, three closing lines (done, not done, what you do now), questions with options you can press, and chapters in a long chat. The note is sent at most once an hour in a session. Each habit has its own switch under Prompts. | För ett meddelande på 25 ord eller fler ber en kort notering Claude om de vanor som är på: en uppgiftslista som du kan följa, tre avslutande rader (klart, inte klart, vad du gör nu), frågor med alternativ som du kan trycka på, och kapitel i en lång chatt. Noteringen skickas högst en gång i timmen i en session. Varje vana har sin egen brytare under Prompter. |  |
| `common.freed` | freed | frigjorda |  |
| `common.fresh_start_nudge` | Fresh-start nudge | Påminnelse om ny session |  |
| `common.from_cheaper_to_stronger_haiku_sonnet` | From cheaper to stronger: Haiku, Sonnet, Opus, Fable. | Från billigare till starkare: Haiku, Sonnet, Opus, Fable. |  |
| `common.go_on` | Go on | Fortsätt |  |
| `common.go_on_by_itself_after_the` | Go on by itself after the reset, or wait for you. | Fortsätt själv efter återställningen, eller vänta på dig. |  |
| `common.green` | Green | Grön |  |
| `common.guard` | Risky steps | Riskabla steg |  |
| `common.haiku` | Haiku | Haiku |  |
| `common.halt_all_and_allow_once` | Pause this session and allow once | Pausa den här sessionen och tillåt en gång |  |
| `common.halted` | Paused for safety | Pausad för säkerhets skull |  |
| `common.health` | Health | Hälsa |  |
| `common.help` | Help | Hjälp |  |
| `common.help_intro` | Press a title to read it. One is open at a time. | Tryck på en rubrik för att läsa den. En är öppen åt gången. |  |
| `common.help_topic_care` | Keeping it healthy | Hålla det i form |  |
| `common.help_topic_memory` | Sessions and memory | Sessioner och minne |  |
| `common.help_topic_pane` | The pane | Panelen | Help, the title of the card of entries about the pane itself (its keys, its own window) |
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
| `common.how_strict_the_safety_rules_are` | How strict the safety rules are. | Hur stränga säkerhetsreglerna är. |  |
| `common.how_sure_is_claude_and_what` | How sure is Claude, and what comes first? | Hur säker är Claude, och vad kommer först? |  |
| `common.if_the_plan_limit_stops_claude` | If the plan limit stops Claude in the middle of work, Remind tells you when the window resets. Resume also sends "continue" for you then. It stops after 3 resumes a day, and never if you wrote something meanwhile or the limit still reads full. /vaken-help run after-limit off cancels the wait; off all cancels every wait. | Om planens gräns stoppar Claude mitt i arbetet berättar Påminn när fönstret återställs. Återuppta skickar också "continue" åt dig då. Det slutar efter 3 återupptaganden per dag, och aldrig om du har skrivit något under tiden eller gränsen fortfarande är full. /vaken-help run after-limit off avbryter väntan; off all avbryter all väntan. |  |
| `common.if_you_ask_for_the_same` | If you ask for the same kind of thing three times, vaken offers to save it as a skill, so you type one word next time. It keeps only a short code of each request, not the words. /vaken-help run coach shows the offer. | Om du ber om samma sorts sak tre gånger erbjuder vaken att spara den som en skill, så att du skriver ett enda ord nästa gång. Den sparar bara en kort kod för varje begäran, inte orden. /vaken-help run coach visar erbjudandet. |  |
| `common.if_your_claude_md_says_never` | If your CLAUDE.md says "Never \`pkill\`", vaken counts each shell command that starts with pkill. In Warn mode it shows it above the chat box, and Claude hears it only when Notes to Claude is set to All checks. /vaken-memory rules lists the rules it watches. | Om din CLAUDE.md säger "Never \`pkill\`" räknar vaken varje skalkommando som börjar med pkill. Med Varna visar den det ovanför chattrutan, och Claude hör det bara när Noteringar till Claude står på Alla kontroller. /vaken-memory rules listar reglerna den bevakar. |  |
| `common.in_plain_words` | In plain words | Med enkla ord |  |
| `common.in_use` | In use | Används |  |
| `common.it_counts_the_skills_you_and` | It counts the skills you and Claude used in the last 7 days (names and counts only, never what was said). It also says how many skills are listed in Claude's memory, what that list costs, and which ones you did not use this week. A skill you never use only costs memory. | Det räknar färdigheterna du och Claude använde de senaste 7 dagarna (bara namn och antal, aldrig vad som sades). Det säger också hur många färdigheter som är listade i Claudes minne, vad listan kostar och vilka du inte använde den här veckan. En färdighet du aldrig använder tar bara minne. |  |
| `common.it_is_starting_this_page_updates_by` | It is starting. This page updates by itself. | Den startar. Sidan uppdateras av sig själv. |  |
| `common.it_keeps_counts_kinds_exit_codes` | It keeps counts, kinds, exit codes and times. It never keeps a command, its output, or Claude's words. The only texts it keeps are the names of up to 3 failing tests (secrets hidden), the goal (the key words of your first message, or the sentence you type after /vaken-tasks goal, with secrets hidden) and the name of the last file that was edited. | Det sparar antal, slag, felkoder och tider. Det sparar aldrig ett kommando, dess utdata eller Claudes ord. De enda texter det sparar är namnen på upp till 3 tester som misslyckades (med hemligheter dolda), målet (nyckelorden i ditt första meddelande, eller meningen du skriver efter /vaken-tasks goal, med hemligheter dolda) och namnet på den senast ändrade filen. |  |
| `common.it_never_fires_for_a_command` | It never fires for a command that starts with /, or for a message that continues the work (also, and then, continue, next). It shows at most once in 2 hours. /vaken-explain fresh explains the last decision. | Den visas aldrig för ett kommando som börjar med /, eller för ett meddelande som fortsätter arbetet (också, och sen, fortsätt, nästa). Den visas högst en gång på 2 timmar. /vaken-explain fresh förklarar det senaste beslutet. |  |
| `common.it_runs_small_programs_every_few` | It runs small programs every few minutes to read memory and the processor. | Den kör små program med några minuters mellanrum för att läsa minne och processor. |  |
| `common.it_says_how_many_more_helper` | It says how many more agents this computer can run now. It takes the smallest of: free memory (about 1.5 GB per agent), idle processor (about 2 cores per agent) and the limit you set, if you set one. It says Full when memory is tight, heat slows the processor, or the battery is low. The task runner waits while it is full. | Det säger hur många fler agenter den här datorn kan köra nu. Det tar det minsta av: ledigt minne (ungefär 1,5 GB per agent), ledig processor (ungefär 2 kärnor per agent) och den gräns du satt, om du satt någon. Det säger Full när minnet är trångt, värme gör processorn långsam eller batteriet är lågt. Uppgiftskörningen väntar medan det är fullt. |  |
| `common.it_watches_steps_that_reach_outside` | It watches steps that reach outside this computer, such as messages, payments, pull requests and cloud changes, and secrets read or sent. In Warn it tells Claude after the step, and in Stop it stops the step until you allow it. Left unchosen, Warn reads "Warn (stops in auto mode)": it stops a secret step where Claude Code would not ask you first, and warns where it asks or vaken cannot tell; a Warn you pick yourself only warns. | Den bevakar steg som når utanför den här datorn, som meddelanden, betalningar, pull requests och molnändringar, och hemligheter som läses eller skickas. I Varna säger den till Claude efter steget, och i Stoppa stoppar den steget tills du tillåter det. Obestämd läser Varna "Varna (stopp i autoläge)": det stoppar ett hemligt steg där Claude Code inte skulle fråga dig först, och varnar där den frågar eller vaken inte kan avgöra det; ett Varna du väljer själv varnar bara. |  |
| `common.its_own_copy_of_the_project` | Its own copy of the project, on its own branch. | En egen kopia av projektet, på en egen gren. |  |
| `common.keep_chat_cheap` | Keep session cheap | Håll sessionen billig |  |
| `common.keep_mac_awake` | Keep Mac awake | Håll Macen vaken |  |
| `common.keep_work` | Keep work | Behåll arbetet |  |
| `common.keeping_the_session_cheap` | Keeping the session cheap | Hålla sessionen billig | Help title, was What the keeper does |
| `common.laptop_gauge` | Computer load | Datorbelastning |  |
| `common.layouts` | Layouts | Layouter |  |
| `common.left_of_the_week_left_for` | {left}% of the week left for {days} days: about {per}% a day. | {left} % av veckan kvar för {days} dagar: ungefär {per} % om dagen. |  |
| `common.left_of_the_week_left_for_2` | {left}% of the week left for the last day. | {left} % av veckan kvar för sista dagen. |  |
| `common.limit_warning` | Limit warning | Varning för gräns |  |
| `common.limits_budget_and_this_chat_shortening_2` | Limits, budget and this session: compacting, cache, plain mode and answer shape. | Gränser, budget och den här sessionen: komprimering, cache, enkelt läge och svarsform. |  |
| `common.line_above_the_chat_box` | Line above the chat box | Raden ovanför chattrutan |  |
| `common.load_the_task_file` | Load the task file | Läs in uppgiftsfilen |  |
| `common.look` | Look | Utseende |  |
| `common.look_and_cards` | Look and cards | Utseende och kort |  |
| `common.loop_breaker` | Loop breaker | Loopbrytare |  |
| `common.making_it_simpler` | Making it simpler… | Gör det enklare… |  |
| `common.many_helper_agents_at_once_slow` | Many agents at once slow your laptop and use your plan fast. By default vaken follows the computer: when the computer reading says it is full, Warn tells you and Stop stops the next one. You can set your own limit under Most at once, counted across all your sessions. | Många agenter samtidigt gör datorn långsam och förbrukar din plan snabbt. Som standard följer vaken datorn: när datoravläsningen säger att den är full berättar Varna det för dig och Stoppa hindrar nästa agent. Du kan sätta din egen gräns under Flest samtidigt, räknat över alla dina sessioner. |  |
| `common.memory_processor_and_room_for_helpers` | Memory, processor and room for agents. | Minne, processor och plats för agenter. |  |
| `common.merge_order_says_which_pull_request` | Merge order says which pull request to merge first. CI fix writes a prompt from the failing check, for you to send, and stops after 3 tries a day. The branch digest lists your changes, riskiest first. The orphan finder lists leftover programs and the command to stop each one; you run it. | Ordning för ihopslagning säger vilken pull request som ska slås ihop först. CI-fix skriver en prompt från den misslyckade kontrollen, som du skickar själv, och slutar efter 3 försök per dag. Grensammanfattningen listar dina ändringar, de mest riskabla först. Sökaren efter föräldralösa program listar kvarglömda program och kommandot för att stoppa vart och ett; du kör det. |  |
| `common.migrations` | Migrations | Migreringar |  |
| `common.model` | Model | Modell |  |
| `common.model_choice` | Model choice | Modellval |  |
| `common.most_at_once` | Most at once | Flest samtidigt |  |
| `common.most_cost_for_the_run` | Most cost for the run | Högsta kostnad för körningen |  |
| `common.most_cost_per_helper` | Most cost per agent | Högsta kostnad per agent |  |
| `common.most_spend_per_request` | Most spend per request | Mest kostnad per förfrågan |  |
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
| `common.no_other_session_active_1_needs` | No other session is active now; 1 waits in Needs you. | Ingen annan session är aktiv nu; 1 väntar i Behöver dig. |  |
| `common.no_other_session_active_n_needs` | No other session is active now; {n} wait in Needs you. | Ingen annan session är aktiv nu; {n} väntar i Behöver dig. |  |
| `common.no_other_session_is_active_now` | No other session is active now. | Ingen annan session är aktiv nu. |  |
| `common.no_other_session_is_running` | No other session is active now. | Ingen annan session är aktiv nu. |  |
| `common.no_progress_for_n_min` | No progress for {n} min | Inga framsteg på {n} min |  |
| `common.no_stopped_step_to_allow_it` | No stopped step to allow: it is older than 30 minutes. If Claude tries it again, allow it then. | Inget stoppat steg att tillåta: det är äldre än 30 minuter. Om Claude försöker igen, tillåt det då. |  |
| `common.no_task_run_yet_add_a` | No task run yet. Add a task, load the task file, or start from a template. | Ingen uppgiftskörning än. Lägg till en uppgift, läs in uppgiftsfilen eller börja från en mall. |  |
| `common.none_a_command_such_as_npm` | None. A command such as npm test runs in the task’s folder. | Ingen. Ett kommando som npm test körs i uppgiftens mapp. |  |
| `common.normal` | Normal | Normal |  |
| `common.not_reported_yet_it_shows_after` | Nothing to show yet. This appears after the first answer. Send a message in the chat. | Inget att visa än. Det visas efter det första svaret. Skicka ett meddelande i chatten. |  |
| `common.not_yet` | not yet | inte än |  |
| `common.nothing_changes_you_have_this_already` | Nothing changes: you have this already. | Inget ändras: du har redan detta. |  |
| `common.nothing_to_show_right_now` | Nothing to show right now. | Inget att visa just nu. |  |
| `common.nothing_yet_what_the_cockpit_does` | Nothing yet. Things vaken does for you, like compacting a long session, show up here. | Inget än. Sådant vaken gör åt dig, som att komprimera en lång session, visas här. |  |
| `common.notices` | Notices | Notiser |  |
| `common.now` | now | nu |  |
| `common.now_2` | Now | Nu |  |
| `common.ocean` | Ocean | Hav |  |
| `common.of_context_used` | of context used | av kontexten använd |  |
| `common.on_your_first_prompt_of_a` | On your first prompt of a day, one line shows above the chat box: how many other sessions wait for you, what yesterday cost, and what vaken did. /vaken-today says the same any time. | Vid ditt första meddelande för dagen visas en rad ovanför chattrutan: hur många andra sessioner som väntar på dig, vad i går kostade och vad vaken gjorde. /vaken-today säger samma sak när som helst. |  |
| `common.only_this_project` | Only this project. | Bara det här projektet. |  |
| `common.only_your_folders` | Only your folders | Bara dina mappar |  |
| `common.open_settings` | Open settings | Öppna inställningar |  |
| `common.open_settings_jump` | Open Settings › | Öppna Inställningar › |  |
| `common.open_the_runner` | Past runs › | Tidigare körningar › |  |
| `common.opus` | Opus | Opus |  |
| `common.other_sessions` | Other sessions | Andra sessioner |  |
| `common.outbox` | Held messages | Stoppade meddelanden |  |
| `common.outbox_and_away` | Held messages and away | Stoppade meddelanden och när du är borta |  |
| `common.outside_actions` | Outside actions | Åtgärder utåt |  |
| `common.outside_text` | Text from the web | Text från webben |  |
| `common.own_folder_copy` | Own folder copy | Eget arbetsträd |  |
| `common.past_it_the_run_pauses` | Past that, the run pauses. | Över detta belopp pausas körningen. |  |
| `common.past_runs` | Past runs | Tidigare körningar |  |
| `common.pause` | Pause | Pausa |  |
| `common.phone` | Phone | Telefon |  |
| `common.pictures` | Pictures | Bilder |  |
| `common.pin` | Pin | Fäst |  |
| `common.plain_mode` | Plain mode | Enkelt läge |  |
| `common.plain_mode_asks_claude_to_use` | Plain mode asks Claude to use short sentences and common words, to explain hard words, and to give you at most two options with its pick. It takes effect from the next message; /vaken-help glossary explains the words vaken uses. Say it simpler (/vaken-settings simple): retells the last answer in plain words; it turns nothing on. | Enkelt läge ber Claude använda korta meningar och enkla ord, förklara svåra ord och ge dig högst två val med sitt förslag. Det gäller från nästa meddelande; /vaken-help glossary förklarar orden som vaken använder. Säg det enklare (/vaken-settings simple): berättar det senaste svaret igen med enkla ord; det slår inte på något. |  |
| `common.plan` | Plan | Plan |  |
| `common.plan_and_cost` | Plan and cost | Plan och kostnad |  |
| `common.plan_first` | Plan first | Plan först |  |
| `common.plan_limits` | Plan limits | Plangränser |  |
| `common.plan_to_tasks` | Plan to tasks | Plan till uppgifter |  |
| `common.plum` | Plum | Plommon |  |
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
| `common.see_all` | See all | Se alla |  |
| `common.see_all_n` | See all {n} | Se alla {n} |  |
| `common.see_changes` | See changes | Se ändringar |  |
| `common.self_check` | Self-test | Självtest |  |
| `common.sending_a_message_to_another` | Sending a message to another session | Skicka ett meddelande till en annan session | Help title, was What steering does |
| `common.session_briefs` | Handoff notes | Överlämningar |  |
| `common.session_budget` | Session budget | Sessionsbudget |  |
| `common.sessions` | Sessions | Sessioner |  |
| `common.set` | Set | Sätt |  |
| `common.set_a_budget_per_session_and` | The budget is off until you turn it on in Settings, Money and plan, with an amount per session and per day. At 80% vaken warns you. At 100% in Stop mode it stops costly calls such as agents until you type /vaken-usage budget extend. | Budgeten är av tills du sätter på den i Inställningar, Pengar och plan, med ett belopp per session och per dag. Vid 80 % varnar vaken dig. Vid 100 % i läget Stoppa stoppar den dyra anrop, som agenter, tills du skriver /vaken-usage budget extend. |  |
| `common.set_up_a_task_run` | Run several tasks › | Kör flera uppgifter › |  |
| `common.settings` | Settings | Inställningar |  |
| `common.settings_cache_on_while_you_are` | Settings, Cache: On. The cache is the saved copy of your session (see What is the cache?). While you are away, it reads the saved copy just before it goes stale, up to 3 times. Your next answer then stays cheap. Each read costs a little usage. It shows under Autopilot. | Inställningar, Cache: På. Cachen är den sparade kopian av din session (se Vad är cachen?). När du är borta läser den den sparade kopian precis innan den blir gammal, upp till 3 gånger. Din nästa svar förblir då billig. Varje läsning kostar lite användning. Det visas under Autopilot. |  |
| `common.settings_shorten_the_chat_off_hides` | Settings, Compacting: Off hides the advice, Suggest shows it with a button, Watch only notes the moments it would compact, Auto compacts the session by itself when the work is at rest. | Inställningar, Komprimering: Av döljer rådet, Föreslå visar det med en knapp, Bara titta skriver ner stunderna den skulle komprimera, Auto komprimerar sessionen av sig själv när arbetet vilar. |  |
| `common.shared_ports` | Shared ports | Delade portar |  |
| `common.short` | Short | Kort |  |
| `common.short_asks_claude_to_lead_with` | Short asks Claude to lead with the result in one sentence, then at most 8 lines. Report asks for three parts: Done, Evidence, Next. Default adds nothing. It works with Plain mode. It takes effect from the next message. /vaken-settings shape shows it and changes it. | Kort ber Claude börja med resultatet i en mening och sedan högst 8 rader. Rapport ber om tre delar: Klart, Bevis, Nästa. Standard lägger inte till något. Den fungerar med Enkelt läge. Den gäller från nästa meddelande. /vaken-settings shape visar den och ändrar den. |  |
| `common.shorten_at_rest_last_look` | Compact when idle, last look: | Komprimera när det är lugnt, senaste titt: |  |
| `common.shorten_from` | Compact when it fills | Komprimera när den fylls |  |
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
| `common.slate` | Slate | Skiffer |  |
| `common.small_details_from_early_in_the` | Small details from early in the session. If Claude needs one, ask it to read the file again. | Små detaljer från tidigt i sessionen. Om Claude behöver en, be den läsa filen igen. |  |
| `common.smaller_tasks_first_the_plan_window` | Smaller tasks first: the plan window is short | Mindre uppgifter först: planfönstret är kort |  |
| `common.sometimes_claude_tries_the_same_step_2` | Sometimes Claude tries the same step again and again, and it fails the same way each time. After 3 failures in a row, vaken tells Claude to stop and ask you, and a check that fails 3 times with the same error offers a way out in Needs you. Settings &gt; Safety &gt; Loop breaker: Warn only tells Claude, Stop also blocks the next try until you write, and Off turns all of this off. | Ibland försöker Claude samma steg om och om igen, och det misslyckas på samma sätt varje gång. Efter 3 misslyckanden i rad säger vaken åt Claude att stanna och fråga dig, och en kontroll som misslyckas 3 gånger med samma fel erbjuder en väg ut i Behöver dig. Inställningar &gt; Säkerhet &gt; Loopbrytare: Varna säger bara till Claude, Stoppa blockerar också nästa försök tills du skriver, och Av stänger av allt det här. |  |
| `common.sonnet` | Sonnet | Sonnet |  |
| `common.start_here` | Start here | Börja här |  |
| `common.start_run` | Start run | Starta körningen |  |
| `common.started_name` | Started /{name} | Startade /{name} |  |
| `common.starts_after` | Starts after | Startar efter |  |
| `common.starts_the_same_tasks_again` | Starts the same tasks again. This run stays in Past runs. | Startar samma uppgifter igen. Den här körningen finns kvar i Tidigare körningar. |  |
| `common.starts_up_to_n_at_once_no` | Starts {n} at a time until this Mac is read: turn on the computer reading in Settings &gt; Agents | Startar {n} åt gången tills den här datorn är avläst: slå på datoravläsningen i Inställningar &gt; Agenter |  |
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
| `common.task_list` | Task list | Uppgiftslista |  |
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
| `common.the_cockpit_counts_its_own_parts` | Vaken counts its own parts that fail or run slow, per day, and warns above the prompt when one fails 3 times in a day. To say when Claude is down, it reads the public status.claude.com page. /vaken-help run modhealth shows the counts. | Vaken räknar sina egna delar som fallerar eller går långsamt, per dag, och varnar ovanför prompten när en del fallerar 3 gånger på en dag. För att säga när Claude ligger nere läser den den offentliga sidan status.claude.com. /vaken-help run modhealth visar antalen. |  |
| `common.the_cockpit_looks_at_which_program` | Vaken looks at which program holds a port, and in which session folder it started. When Claude is about to start a server on a port another session holds, Claude gets a note, so two sessions do not fight over one port. It also says which worktrees (extra copies of your project folder, one for each session that works on its own) are clean and merged, so they are safe to remove. It removes one only when you press Remove this copy on the Pull requests card, and only a merged one with nothing uncommitted or unpushed; for the rest it prints the exact command for you. | Vaken tittar på vilket program som håller en port, och i vilken sessionsmapp det startade. När Claude ska starta en server på en port som en annan session håller får Claude en notering, så att två sessioner inte slåss om en port. Den säger också vilka arbetsträd (extra kopior av din projektmapp, en för varje session som arbetar för sig) som är rena och ihopslagna, så att de är säkra att ta bort. Den tar bara bort ett när du trycker på Ta bort kopian på kortet Pull requests, och bara ett ihopslaget utan något som inte är incheckat eller pushat; för resten skriver den ut exakt kommando åt dig. |  |
| `common.the_cockpit_notes_when_a_test` | Vaken notes when a test, build, lint or type check ran, and if it passed. When Claude says "tests pass" or "done" and no passing check backs it, vaken flags it. /vaken-ship proof shows the last answer; /vaken-ship done sets the checks that must pass. | Vaken noterar när ett test, bygge, lint eller typkontroll har körts, och om det gick igenom. När Claude säger "tests pass" eller "done" och ingen godkänd kontroll stöder det, flaggar vaken det. /vaken-ship proof visar senaste svaret; /vaken-ship done sätter vilka kontroller som måste gå igenom. |  |
| `common.the_command_list_keeps_the_last` | The command list keeps the last 50 shell commands of the session, as the program and the kind only, never the arguments. Text from the web, other apps, node\_modules and downloads is marked as data, not orders. /vaken-guard commands and /vaken-guard fence show them. | Kommandolistan sparar sessionens 50 senaste skalkommandon, bara som program och slag, aldrig argumenten. Text från webben, andra appar, node\_modules och nedladdningar markeras som data, inte order. /vaken-guard commands och /vaken-guard fence visar dem. |  |
| `common.the_first_reading_comes_within_a` | The first reading comes within a minute. | Första mätningen kommer inom en minut. |  |
| `common.the_guard_watches_risky_steps_deletes` | The safety check watches risky steps: deletes and force-pushes, edits outside your folders, odd new packages, and weakened tests. In Warn it tells Claude after the step, and in Stop it stops the step until you allow it. Left unchosen, Warn reads "Warn (stops in auto mode)": it stops a risky command where Claude Code would not ask you first, and warns where it asks or vaken cannot tell; a Warn you pick yourself only warns. | Säkerhetskontrollen bevakar riskabla steg: borttagningar och tvingade push, ändringar utanför dina mappar, udda nya paket och försvagade tester. I Varna säger den till Claude efter steget, och i Stoppa stoppar den steget tills du tillåter det. Obestämd läser Varna "Varna (stopp i autoläge)": det stoppar ett riskabelt kommando där Claude Code inte skulle fråga dig först, och varnar där den frågar eller vaken inte kan avgöra det; ett Varna du väljer själv varnar bara. |  |
| `common.the_migration_check_can_stop_a` | The migration check can stop a database migration before it runs. The env check tells Claude when new code reads an env name that no env file declares. It looks at names only, never at values. | Migreringskontrollen kan stoppa en databasmigrering innan den körs. Env-kontrollen säger till Claude när ny kod läser ett env-namn som ingen env-fil anger. Den tittar bara på namn, aldrig på värden. |  |
| `common.the_prompt_check_finds_a_vague` | The prompt review finds a vague message: fewer than 6 words, or a command such as "fix it" with no file name, path, number or quoted text. Tip shows one line above the prompt. Ask also tells Claude to ask one short question if the goal is unclear. Your words are never changed or stored; only the last vague one stays in memory, for the pane's better prompt. | Promptgranskningen hittar ett vagt meddelande: färre än 6 ord, eller en order som "fixa det" utan filnamn, sökväg, tal eller citerad text. Tips visar en rad ovanför prompten. Fråga ber också Claude ställa en kort fråga om målet är oklart. Dina ord ändras eller sparas aldrig; bara den senaste vaga hålls i minnet, för panelens bättre prompt. |  |
| `common.the_session_total_is_the_engines` | The session total is the engine's own. An answer's dollars are an estimate from its tokens and a list price. On a subscription they show what the same use would cost, not what you pay. | Sessionens total kommer från motorn själv. Dollarna för ett svar är en uppskattning från dess tokens och ett listpris. På en prenumeration visar de vad samma användning skulle kosta, inte vad du betalar. |  |
| `common.the_start_here_card_asks_five` | The first time, the Start here card asks five questions, one at a time: how much vaken tells you, risky steps, spending, how Claude works with you, and long chats. The recommended answers are marked, and Skip, use recommended takes them all. Settings, Run setup again asks them again with your answers now chosen. | Första gången ställer kortet Börja här fem frågor, en i taget: hur mycket vaken berättar, riskabla steg, kostnader, hur Claude arbetar med dig och långa chattar. De rekommenderade svaren är märkta, och Hoppa över, använd det rekommenderade tar dem alla. Inställningar, Gör om startfrågorna ställer dem igen med dina svar nu valda. |  |
| `common.the_start_questions` | The start questions | Startfrågorna |  |
| `common.the_stopped_step_goes_through_once` | The stopped step goes through once. | Det stoppade steget släpps igenom en gång. |  |
| `common.this_project` | This project | Det här projektet |  |
| `common.this_project_uses` | This project uses | Det här projektet använder |  |
| `common.this_session` | This session | Den här sessionen |  |
| `common.this_session_state_context_and_cost` | This session: state, context and cost. | Den här sessionen: läge, kontext och kostnad. |  |
| `common.this_task_holds_work_that_is` | This task holds work that is not merged or not committed. Throw it away anyway? It is lost for good. | Den här uppgiften har arbete som inte är ihopslaget eller sparat. Kasta bort det ändå? Det går inte att få tillbaka. |  |
| `common.thrifty` | Thrifty | Sparsam |  |
| `common.throw_away` | Throw away | Släng |  |
| `common.throw_away_the_work_of_task` | Throw away the work of task {n}? Its folder copy and its branch are deleted. | Kasta bort arbetet i uppgift {n}? Dess arbetsträd och gren tas bort. |  |
| `common.throw_loss_both` | This throws away {a} and {b}. | Det här slänger {a} och {b}. | {a} is a count of commits, {b} a count of changed files. |
| `common.throw_loss_none` | Nothing to lose. | Inget går förlorat. |  |
| `common.throw_loss_one` | This throws away {a}. | Det här slänger {a}. | {a} is a count of commits or of changed files. |
| `common.throw_loss_unknown` | Git could not count its commits and changed files. | Git kunde inte räkna dess commits och ändrade filer. |  |
| `common.tip` | Tip | Tips |  |
| `common.today` | Today | I dag |  |
| `common.today_2` | today | i dag |  |
| `common.today_n` | Today: {n}%. | I dag: {n} %. |  |
| `common.today_since_time_n` | Today since {time}: {n}%. | I dag sedan {time}: {n} %. |  |
| `common.todays_share_is_used_up` | Today's share is used up. | Dagens andel är slut. |  |
| `common.try_again` | Try again | Försök igen |  |
| `common.turn_on` | Turn on | Slå på |  |
| `common.two_ready_helper_agents_a_cheap` | Two ready agents: a cheap one that looks things up, and a stronger one that reviews a change. /vaken-tasks agents shows them. /vaken-tasks agents make yes saves them in your agents folder and never overwrites a file. | Två färdiga agenter: en billig som slår upp saker och en starkare som granskar en ändring. /vaken-tasks agents visar dem. /vaken-tasks agents make yes sparar dem i din agentmapp och skriver aldrig över en fil. |  |
| `common.two_sessions_in_one_repository_can` | Two sessions in one repository can change the same file and undo each other. Before an edit, vaken checks what the other live sessions edited in the last 30 minutes. If it finds the same file, a lockfile, a migration or a config file, you get one toast, and Claude a note only when Notes to Claude is set to All checks. | Två sessioner i samma repository kan ändra samma fil och ångra varandras ändringar. Före en ändring kontrollerar vaken vad de andra levande sessionerna ändrade de senaste 30 minuterna. Hittar den samma fil, en lockfile, en migrering eller en konfigfil får du en notis, och Claude en notering bara när Noteringar till Claude står på Alla kontroller. |  |
| `common.type_a_word_after_cockpit_help` | Type a word after /vaken-help to filter | Skriv ett ord efter /vaken-help för att filtrera |  |
| `common.under_half_used_list` | Under half used: {list} | Under hälften använt: {list} |  |
| `common.undo` | Undo | Ångra |  |
| `common.undo_last_turn` | Undo last answer | Ångra senaste svaret |  |
| `common.vaken_keeps_your_settings` | Vaken keeps your settings, counts and notes in Claude Code's plugin store. Its own folder under ~/.claude holds copies of changed files for Undo, hand-over notes and page pictures. It keeps no text of your prompts or chats, except the decision log: on in Recommended, the default, it keeps short decisions you wrote, and Settings turns it off. By default Claude gets only its safety notes, and for a bigger job a short note at most once an hour with the working habits that are on (task list, done and next, clickable questions, chapters; each has a switch under Prompts), and plain mode asks it for short, simple words. More goes to Claude when you turn on a feature that talks to Claude (Plan first, Prompt review, Assumption review, or Notes to Claude set to All checks), or press a button that sends a message. There is no telemetry, and nothing goes to the makers of vaken. gh talks to GitHub if you signed in, npm asks the npm registry if a new package name is real, and page checks call only localhost unless you type another address. Delete everything, at the bottom of Settings, removes what it stored. | Vaken sparar dina inställningar, räkningar och anteckningar i Claude Codes pluginlager. Dess egen mapp under ~/.claude har kopior av ändrade filer för Ångra, överlämningsanteckningar och sidbilder. Det sparar ingen text från dina meddelanden eller chattar, utom beslutsloggen: på i Rekommenderat, standardläget, sparar den korta beslut som du skrev, och Inställningar stänger av den. Som standard får Claude bara dess säkerhetsnoteringar, och vid ett större jobb en kort notering högst en gång i timmen med de arbetsvanor som är på (uppgiftslista, klart och nästa, klickbara frågor, kapitel; var och en har en brytare under Prompter), och klarspråksläget ber den om korta, enkla ord. Mer går till Claude när du slår på en funktion som pratar med Claude (Plan först, Promptgranskning, Antagandegranskning, eller Noteringar till Claude satt till Alla kontroller), eller trycker på en knapp som skickar ett meddelande. Det finns ingen telemetri, och inget går till dem som gör vaken. gh pratar med GitHub om du är inloggad, npm frågar npm-registret om ett nytt paketnamn är äkta, och sidkontroller anropar bara localhost om du inte skriver en annan adress. Ta bort allt, längst ned i Inställningar, tar bort det som vaken sparat. | Help text; every claim checked against core/erase.ts, core/tellclaude.ts, features/planfirst.ts, features/promptcheck.ts, features/assumptions.ts, features/tasklist.ts, core/guardjudge.ts, core/coach.ts |
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
| `common.what_the_working_habits_do` | What the working habits do | Vad arbetsvanorna gör |  |
| `common.what_undo_does` | What undo does | Vad ångra gör |  |
| `common.what_vaken_keeps_and_sends` | What vaken keeps and sends | Vad vaken sparar och skickar | Help title |
| `common.what_what_happened_is` | What "what happened" is | Vad "vad hände" är |  |
| `common.when_a_new_message_is_on` | When a new message is on a new topic and the session is big, vaken says a fresh session costs less. It compares key words on your computer and keeps only short codes, never your words. It only shows a line above the chat box and never writes to Claude; a press on Start fresh saves a short brief of this session and copies the line to paste into a new session. | När ett nytt meddelande handlar om något nytt och sessionen är stor, säger vaken att en ny session kostar mindre. Den jämför nyckelord på din dator och sparar bara korta koder, aldrig dina ord. Den visar bara en rad ovanför chattrutan och skriver aldrig till Claude; ett tryck på Ny session sparar en kort sammanfattning av den här sessionen och kopierar raden att klistra in i en ny session. |  |
| `common.when_a_step_fails_cockpit_error` | When a step fails, /vaken-explain error says in plain words what went wrong and the first thing to try. It keeps only the kind of error, never the error text. | När ett steg misslyckas säger /vaken-explain error med enkla ord vad som gick fel och det första du kan prova. Den sparar bara slaget av fel, aldrig feltexten. |  |
| `common.when_and_how_the_cockpit_tells` | When and how vaken tells you. | När och hur vaken säger till. |  |
| `common.when_another_live_session_works_in` | When another live session works in the same folder as this one, a line shows above the prompt. Vaken looks when a session starts and when you send a message, and says it at most every 10 minutes. Claude is not told, and nothing is stopped. | När en annan levande session arbetar i samma mapp som denna visas en rad ovanför prompten. Vaken tittar när en session startar och när du skickar ett meddelande, och säger det högst var 10:e minut. Claude får inget veta och inget stoppas. |  |
| `common.when_another_session_needs_you_or` | When another session waits for you, a toast tells you once; with Needs you and done, also when it finishes a long job. Hours without notices hold those toasts back at night; they come when the hours end. | När en annan session väntar på dig berättar en notis det en gång; med Behöver dig och klart också när den blir klar med ett långt jobb. Timmar utan notiser håller tillbaka de notiserna på natten; de kommer när timmarna är slut. |  |
| `common.when_away_mode_ends_the_cockpit` | When away mode ends, vaken tells you which sessions finished or needed you, how many risky steps it stopped, about what it cost, and what waits for you. /vaken-away digest shows it again. | När frånvaroläget tar slut berättar vaken vilka sessioner som blev klara eller behövde dig, hur många riskabla steg den stoppade, ungefär vad det kostade och vad som väntar på dig. /vaken-away digest visar den igen. |  |
| `common.when_does_it_suggest_a_fresh` | When does it suggest a fresh session? | När föreslår den en ny session? |  |
| `common.when_on_your_answers_to_claudes` | When on, your answers to Claude's questions and decisions you state ("let's go with X") are written down with the date, and /vaken-memory decide &lt;sentence&gt; adds one by hand. It is on in Recommended, the default; Only alerts turns it off, and so does Settings. /vaken-memory decisions lists them. | När den är på skrivs dina svar på Claudes frågor och beslut du uttalar ("vi kör på X") ner med datum, och /vaken-memory decide &lt;mening&gt; lägger till ett för hand. Den är på i Rekommenderat, standardläget; Bara larm stänger av den, och det gör Inställningar också. /vaken-memory decisions listar dem. |  |
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
| `common.worktree_cleanup` | Worktree cleanup | Städa arbetsträd |  |
| `common.writes_the_code_for_one_task` | Writes the code for one task. | Skriver koden för en uppgift. |  |
| `common.your_choice` | Your choice | Ditt val |  |
| `common.your_goal_the_files_changed_the` | Your goal, the files changed, the decisions and why, and the next steps. | Ditt mål, de ändrade filerna, besluten och varför, och nästa steg. |  |
| `common.your_other_sessions_live` | Your other sessions, live. | Dina andra sessioner, live. |  |

## chat

Shown from the code. (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `chat.agents_quiet` | one: {n} shows no progress<br>other: {n} show no progress | one: {n} visar inga framsteg<br>other: {n} visar inga framsteg | Agents still running that have sent nothing for a while. |
| `chat.calm` | Nothing needs you. | Inget behöver dig. | The whole /vaken chat answer when nothing is hot; the pane opens with the rest. |
| `chat.cmd_away` | rules for when you are away | regler för när du är borta |  |
| `chat.cmd_compact` | compact the session | komprimera sessionen |  |
| `chat.cmd_explain` | what a line, error or decision means | vad en rad, ett fel eller ett beslut betyder |  |
| `chat.cmd_guard` | risky steps that were stopped, and allow one | riskabla steg som stoppades, och tillåt ett |  |
| `chat.cmd_help` | this list; add a word to find a topic | den här listan; lägg till ett ord för att hitta ett ämne |  |
| `chat.cmd_memory` | what Claude remembers | vad Claude minns |  |
| `chat.cmd_pause` | stop every change now | stoppa alla ändringar nu |  |
| `chat.cmd_resume` | find a session by words | hitta en session med ord |  |
| `chat.cmd_settings` | see or change a setting | se eller ändra en inställning |  |
| `chat.cmd_ship` | is the work ready to ship | är arbetet klart att leverera |  |
| `chat.cmd_tasks` | run a list of tasks with agents | kör en lista med uppgifter med agenter |  |
| `chat.cmd_today` | today in a few lines | i dag på några rader |  |
| `chat.cmd_undo` | put files back as they were | lägg tillbaka filer som de var |  |
| `chat.cmd_usage` | your plan limits, cost and budget | gränserna i din plan, kostnad och budget |  |
| `chat.cmd_vaken` | what needs you now | vad som behöver dig nu |  |
| `chat.computer_full` | no room for another agent now | inget utrymme för en agent till nu |  |
| `chat.group_help` | Help and settings | Hjälp och inställningar | A group of commands in /vaken-help. |
| `chat.help_found` | Help topics with "{word}" | Hjälpämnen med "{word}" |  |
| `chat.help_head` | A word after a command runs one part of it, for example {example}. | Ett ord efter ett kommando kör en del av det, till exempel {example}. |  |
| `chat.help_is` | For help, type \`/vaken-help\`. | Skriv \`/vaken-help\` för hjälp. |  |
| `chat.help_more` | More: \`/vaken-help all\` reads every topic, \`/vaken-help &lt;word&gt;\` finds one, \`/vaken-help run\` lists the parts in the pane. | Mer: \`/vaken-help all\` läser alla ämnen, \`/vaken-help &lt;ord&gt;\` hittar ett, \`/vaken-help run\` listar delarna i panelen. |  |
| `chat.help_none` | No help topic holds "{word}". All topics: {all} | Inget hjälpämne innehåller "{word}". Alla ämnen: {all} |  |
| `chat.help_read_one` | Type \`/vaken-help &lt;title words&gt;\` to read one. | Skriv \`/vaken-help &lt;ord i titeln&gt;\` för att läsa ett. |  |
| `chat.help_run_head` | Also in the pane, or with \`/vaken-help run &lt;name&gt;\`: | Finns också i panelen, eller med \`/vaken-help run &lt;namn&gt;\`: |  |
| `chat.here_paused` | Needs you: this session is paused until you resume it | Behöver dig: den här sessionen är pausad tills du återupptar den |  |
| `chat.here_stopped` | Needs you: a stopped step in this session waits for your yes | Behöver dig: ett stoppat steg i den här sessionen väntar på ditt ja |  |
| `chat.inbox_head` | Waiting for you: {things}. | Väntar på dig: {things}. |  |
| `chat.inbox_limits` | Vaken can only tell you where to go. It cannot press OK or answer a permission box for you, and it cannot send a push to your phone. | Vaken kan bara säga vart du ska gå. Den kan inte trycka OK eller svara i en behörighetsruta åt dig, och den kan inte skicka en push till din telefon. |  |
| `chat.inbox_off` | The inbox is off. Turn it on: Settings &gt; Notices. | Inkorgen är av. Slå på den: Inställningar &gt; Notiser. |  |
| `chat.needs_row` | Needs you: {name} ({why}, waited {age}) | Behöver dig: {name} ({why}, har väntat {age}) |  |
| `chat.neighbors_about` | It warns when another live session works in the same folder as this one, or in the same git worktree. File overlap (\`/vaken-help run claims\`) warns about one file; this warns about the folder. | Den varnar när en annan levande session arbetar i samma mapp som den här, eller i samma git-arbetsträd. Filöverlapp (\`/vaken-help run claims\`) varnar om en fil; den här varnar om mappen. |  |
| `chat.neighbors_head` | one: Another session works in this folder:<br>other: {n} other sessions work in this folder: | one: En annan session arbetar i den här mappen:<br>other: {n} andra sessioner arbetar i den här mappen: |  |
| `chat.neighbors_no_folder` | Vaken does not know the folder of this session, so it cannot look. | Vaken vet inte vilken mapp den här sessionen har, så den kan inte titta. |  |
| `chat.neighbors_none` | No other live session works in this folder. | Ingen annan levande session arbetar i den här mappen. |  |
| `chat.neighbors_off` | Same-folder awareness: off. | Koll på samma mapp: av. |  |
| `chat.neighbors_on` | Same-folder awareness: on. | Koll på samma mapp: på. |  |
| `chat.neighbors_turn_on` | Turn it on: Settings &gt; Agents. | Slå på den: Inställningar &gt; Agenter. |  |
| `chat.run_goal` | Run one task: {goal}. Start it in the Agents card in the pane. | Kör en uppgift: {goal}. Starta den i kortet Agenter i panelen. |  |
| `chat.run_goal_done` | Run one task: {goal}, done when {checks} pass. Start it in the Agents card in the pane. | Kör en uppgift: {goal}, klar när {checks} går igenom. Starta den i kortet Agenter i panelen. |  |
| `chat.waiting` | Waiting {age}. | Har väntat {age}. |  |
| `chat.waiting_at_least` | Waiting at least {age}. | Har väntat minst {age}. |  |

## cmd

Shown from the code. (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `cmd.a_reviewer_reads_each_finished_task_and` | A reviewer reads each finished task and writes 3 lines. | En granskare läser varje klar uppgift och skriver 3 rader. |  |
| `cmd.a_run_holds_at_most_n_tasks` | A run holds at most {n} tasks. | En körning rymmer högst {n} uppgifter. |  |
| `cmd.added_task_1_add_more_then_start` | Added task 1. Add more, then start. | Lade till uppgift 1. Lägg till fler och starta sedan. |  |
| `cmd.added_task_n` | Added task {n}. | Lade till uppgift {n}. |  |
| `cmd.after_a_plan_limit_the_run_goes` | After a plan limit the run goes on by itself when the limit resets. | Efter en plangräns går körningen vidare av sig själv när gränsen nollställs. |  |
| `cmd.after_a_plan_limit_the_run_waits` | After a plan limit the run waits for you. | Efter en plangräns väntar körningen på dig. |  |
| `cmd.after_each_task_command` | After each task: {command} | Efter varje uppgift: {command} |  |
| `cmd.agents_still_run_stop_the_run_first` | Agents still run. Stop the run first. | Agenter körs fortfarande. Stoppa körningen först. |  |
| `cmd.an_agent_stops_after_n_min` | An agent stops after {n} min. | En agent stoppar efter {n} min. |  |
| `cmd.an_agent_stops_past_usd` | An agent stops past {usd}. | En agent stoppar över {usd}. |  |
| `cmd.as_many_at_a_time_as_this` | As many at a time as this Mac has room for. | Så många åt gången som den här Macen har plats för. |  |
| `cmd.as_many_at_a_time_as_this_2` | as many at a time as this Mac has room for | så många åt gången som den här Macen har plats för |  |
| `cmd.asked_claude_to_write_the_plan_as` | Asked Claude to write the plan as {file}. Then load it. | Bad Claude skriva planen som {file}. Ladda den sedan. |  |
| `cmd.at_most_n_at_a_time` | at most {n} at a time | högst {n} åt gången |  |
| `cmd.at_most_n_at_a_time_2` | At most {n} at a time. | Högst {n} åt gången. |  |
| `cmd.changed_task_n` | Changed task {n}. | Ändrade uppgift {n}. |  |
| `cmd.could_not_remove_the_folder_copy_why` | Could not remove the folder copy: {why} | Kunde inte ta bort arbetsträdet: {why} |  |
| `cmd.deleted_the_template_name` | Deleted the template "{name}". | Tog bort mallen "{name}". |  |
| `cmd.file_is_there_already_edit_it_then` | {file} is there already. Edit it, then /vaken-tasks start. | {file} finns redan. Redigera den och kör sedan /vaken-tasks start. |  |
| `cmd.going_on` | Going on. | Går vidare. |  |
| `cmd.going_on_the_run_now_pauses_past` | Going on. The run now pauses past {usd}. | Går vidare. Körningen pausar nu över {usd}. |  |
| `cmd.kept_task_n_its_work_is_on` | Kept task {n}: its work is on branch {branch}. The folder copy is removed. | Behöll uppgift {n}: arbetet ligger på grenen {branch}. Arbetsträdet är borttaget. |  |
| `cmd.loaded_tasks_from_file_change_them_in` | Loaded {tasks} from {file}. Change them in the Agents view, then start. | Laddade {tasks} från {file}. Ändra dem i Agentvyn och starta sedan. |  |
| `cmd.loaded_the_template_name_tasks_start_when` | Loaded the template "{name}": {tasks}. Start when ready. | Laddade mallen "{name}": {tasks}. Starta när du är redo. |  |
| `cmd.name_a_task_number_vaken_tasks_remove` | Name a task number: /vaken-tasks remove 2 | Ange ett uppgiftsnummer: /vaken-tasks remove 2 |  |
| `cmd.name_the_template_vaken_tasks_template_save` | Name the template: /vaken-tasks template save &lt;name&gt; | Ge mallen ett namn: /vaken-tasks template save &lt;namn&gt; |  |
| `cmd.no_check_after_each_task` | No check after each task. | Ingen kontroll efter varje uppgift. |  |
| `cmd.no_folder_copy_is_left` | No folder copy is left. | Inget arbetsträd finns kvar. |  |
| `cmd.no_reviewer` | No reviewer. | Ingen granskare. |  |
| `cmd.no_run_to_save` | No run to save. | Ingen körning att spara. |  |
| `cmd.no_task_run_vaken_tasks_start_begins` | No task run. /vaken-tasks start begins one. | Ingen uppgiftskörning. /vaken-tasks start startar en. |  |
| `cmd.no_template_named_name` | No template named "{name}". | Ingen mall heter "{name}". |  |
| `cmd.only_a_run_that_has_ended_can` | Only a run that has ended can run again. | Bara en körning som har tagit slut kan köras igen. |  |
| `cmd.paused_running_agents_finish_no_new_one` | Paused. Running agents finish; no new one starts. | Pausad. Agenter som körs blir klara; ingen ny startar. |  |
| `cmd.pc_an_estimate_from_the_share_of_memory` | (An estimate from the share of memory that is free: Windows has no pressure level.) | (En uppskattning från andelen ledigt minne: Windows har ingen tryck-nivå.) |  |
| `cmd.pc_as_many_at_a_time_as_this` | As many at a time as this PC has room for. | Så många åt gången som den här datorn har plats för. |  |
| `cmd.pc_as_many_at_a_time_as_this_2` | as many at a time as this PC has room for | så många åt gången som den här datorn har plats för |  |
| `cmd.pc_computer_load_on_but_the_powershell_program` | Computer load: on, but the PowerShell program gave no answer. Check that PowerShell can start on this PC. | Datorbelastning: på, men programmet PowerShell gav inget svar. Kontrollera att PowerShell kan starta på den här datorn. |  |
| `cmd.pc_held_the_pc_awake_for_list_because` | Held the PC awake for {list}, because {what}. It is renewed while they work. | Höll datorn vaken i {list}, eftersom {what}. Det förnyas medan de arbetar. |  |
| `cmd.pc_held_the_pc_awake_for_list_reason` | Held the PC awake for {list}: {reason}. It is renewed while that lasts. | Höll datorn vaken i {list}: {reason}. Det förnyas så länge det gäller. |  |
| `cmd.pc_keep_pc_awake_is_off_the_hold` | Keep PC awake is off. The hold ends within a minute. | Håll datorn vaken är av. Hållningen slutar inom en minut. |  |
| `cmd.pc_keep_pc_awake_is_on_the_pc` | Keep PC awake is on. The PC stays awake while a session works and while a phone is connected, up to 8 hours in a row. Closing the lid may still sleep the PC (that follows your Windows power settings). Type /vaken-help run awake off to turn it off. | Håll datorn vaken är på. Datorn förblir vaken medan en session arbetar och medan en telefon är ansluten, i upp till 8 timmar i följd. Att stänga locket kan ändå försätta datorn i vila (det följer dina energiinställningar i Windows). Skriv /vaken-help run awake off för att slå av det. |  |
| `cmd.removed_task_n` | Removed task {n}. | Tog bort uppgift {n}. |  |
| `cmd.saved_the_template_name` | Saved the template "{name}". | Sparade mallen "{name}". |  |
| `cmd.say_the_name_vaken_tasks_name_nightly` | Say the name: /vaken-tasks name Nightly cleanup | Säg namnet: /vaken-tasks name Nattstädning |  |
| `cmd.say_the_task_vaken_tasks_add_fix` | Say the task: /vaken-tasks add Fix the header | Säg uppgiften: /vaken-tasks add Fixa sidhuvudet |  |
| `cmd.say_what_vaken_tasks_say_2_use` | Say what: /vaken-tasks say 2 use the other file | Säg vad: /vaken-tasks say 2 använd den andra filen |  |
| `cmd.sent_to_task_n` | Sent to task {n}. | Skickat till uppgift {n}. |  |
| `cmd.some_folder_copies_are_still_there_task` | Some folder copies are still there: task {tasks}. First keep all (/vaken-tasks keep all: the work stays on its branches) or throw all (/vaken-tasks throw all yes: the work is deleted). | Några arbetsträd finns kvar: uppgift {tasks}. Behåll först alla (/vaken-tasks keep all: arbetet ligger kvar på sina grenar) eller kasta alla (/vaken-tasks throw all yes: arbetet raderas). |  |
| `cmd.started` | Started: | Startad: |  |
| `cmd.stopped_every_agent_of_the_run` | Stopped every agent of the run. | Stoppade varje agent i körningen. |  |
| `cmd.stopped_task_n` | Stopped task {n}. | Stoppade uppgift {n}. |  |
| `cmd.task_n_has_no_folder_copy` | Task {n} has no folder copy. | Uppgift {n} har inget arbetsträd. |  |
| `cmd.task_n_has_not_ended` | Task {n} has not ended. | Uppgift {n} har inte tagit slut. |  |
| `cmd.task_n_has_started_it_cannot_be` | Task {n} has started; it cannot be removed. Stop it instead. | Uppgift {n} har startat och kan inte tas bort. Stoppa den i stället. |  |
| `cmd.task_n_has_started_it_cannot_be_2` | Task {n} has started; it cannot be changed now. | Uppgift {n} har startat och kan inte ändras nu. |  |
| `cmd.task_n_is_not_running` | Task {n} is not running. | Uppgift {n} körs inte. |  |
| `cmd.task_n_still_runs` | Task {n} still runs. | Uppgift {n} körs fortfarande. |  |
| `cmd.task_n_waits_for_its_turn_again` | Task {n} waits for its turn again. | Uppgift {n} väntar på sin tur igen. |  |
| `cmd.the_folder_copy_has_changes_that_are` | The folder copy has changes that are not committed: {why}. Ask the agent to commit it, then press Keep again. | Arbetsträdet har ändringar som inte är committade: {why}. Be agenten committa dem och tryck sedan på Behåll igen. |  |
| `cmd.the_night_run_is_on_already` | The night run is on already. | Nattkörningen pågår redan. |  |
| `cmd.the_run_is_called_name` | The run is called "{name}". | Körningen heter "{name}". |  |
| `cmd.the_run_is_cleared_kept_branches_stay` | The run is cleared. Kept branches stay; the file stays as it is. | Körningen är rensad. Sparade grenar blir kvar; filen lämnas som den är. |  |
| `cmd.the_run_is_on_already` | The run is on already. | Körningen pågår redan. |  |
| `cmd.the_run_pauses_past_usd` | The run pauses past {usd}. | Körningen pausar över {usd}. |  |
| `cmd.the_task_runner_could_not_do_that` | The task runner could not do that. Try again in a moment. | Uppgiftskörningen kunde inte göra det. Försök igen om en stund. |  |
| `cmd.there_is_no_task_n` | There is no task {n}. | Det finns ingen uppgift {n}. |  |
| `cmd.threw_away_task_n_its_folder_copy` | Threw away task {n}: its folder copy and branch are gone. | Kastade uppgift {n}: dess arbetsträd och gren är borta. |  |
| `cmd.throw_all_deletes_every_folder_copy_and` | Throw all deletes every folder copy and branch left (task {tasks}), with any work in them. Type /vaken-tasks throw all yes to do it. | Throw all raderar varje arbetsträd och gren som finns kvar (uppgift {tasks}), med allt arbete i dem. Skriv /vaken-tasks throw all yes för att göra det. |  |
| `cmd.use_vaken_tasks_afterlimit_go_wait` | Use: /vaken-tasks afterlimit go\|wait | Använd: /vaken-tasks afterlimit go\|wait |  |
| `cmd.use_vaken_tasks_limit_min_30_limit` | Use: /vaken-tasks limit min 30 \| limit helper 2 \| limit run 10 \| limit night 5 (0: the run limit) | Använd: /vaken-tasks limit min 30 \| limit helper 2 \| limit run 10 \| limit night 5 (0: körningens gräns) |  |
| `cmd.use_vaken_tasks_new_load_add_task` | Use: /vaken-tasks new \| load \| add &lt;task&gt; \| set N ... \| remove N \| start \[anyway\] \| night \[anyway\] \| again \| pause \| go \| stop \| retry N \| stop N \| keep N\|all \| throw N\|all \[yes\] \| say N &lt;words&gt; \| at auto\|N \| check &lt;command&gt; \| limit ... \| name &lt;words&gt; \| template save\|apply\|delete &lt;name&gt; \| afterlimit go\|wait \| report \| history \| plan \| clear | Använd: /vaken-tasks new \| load \| add &lt;uppgift&gt; \| set N ... \| remove N \| start \[anyway\] \| night \[anyway\] \| again \| pause \| go \| stop \| retry N \| stop N \| keep N\|all \| throw N\|all \[yes\] \| say N &lt;ord&gt; \| at auto\|N \| check &lt;kommando&gt; \| limit ... \| name &lt;ord&gt; \| template save\|apply\|delete &lt;namn&gt; \| afterlimit go\|wait \| report \| history \| plan \| clear |  |
| `cmd.use_vaken_tasks_reviewer_on_off` | Use: /vaken-tasks reviewer on\|off | Använd: /vaken-tasks reviewer on\|off |  |
| `cmd.use_vaken_tasks_set_2_role_model` | Use: /vaken-tasks set 2 role\|model\|after\|folder\|text &lt;value&gt; | Använd: /vaken-tasks set 2 role\|model\|after\|folder\|text &lt;värde&gt; |  |
| `cmd.use_vaken_tasks_set_2_role_researcher` | Use: /vaken-tasks set 2 role researcher\|builder\|reviewer\|fixer, model auto\|cheap\|normal\|strong, after N\|none, folder on\|off, text &lt;words&gt; | Använd: /vaken-tasks set 2 role researcher\|builder\|reviewer\|fixer, model auto\|cheap\|normal\|strong, after N\|none, folder on\|off, text &lt;ord&gt; |  |
| `cmd.use_vaken_tasks_set_3_after_2` | Use: /vaken-tasks set 3 after 2 (or after none) | Använd: /vaken-tasks set 3 after 2 (eller after none) |  |
| `cmd.use_vaken_tasks_template_save_apply_delete` | Use: /vaken-tasks template save\|apply\|delete &lt;name&gt; | Använd: /vaken-tasks template save\|apply\|delete &lt;namn&gt; |  |
| `cmd.wrote_file_with_an_example_write_one` | Wrote {file} with an example. Write one task per line, then /vaken-tasks start. | Skrev {file} med ett exempel. Skriv en uppgift per rad och kör sedan /vaken-tasks start. |  |

## cmda

Shown from the code. (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `cmda.a_bare_folder_it_stays` | a bare folder; it stays | en bare-mapp (utan arbetsfiler); den blir kvar |  |
| `cmda.a_bun_program` | a Bun program | ett Bun-program |  |
| `cmda.a_check_is_running_ask_again_in` | A check is running. Ask again in a moment. | En kontroll pågår. Fråga igen om en stund. |  |
| `cmda.a_deno_program` | a Deno program | ett Deno-program |  |
| `cmda.a_java_program` | a Java program | ett Java-program |  |
| `cmda.a_lockfile` | a lockfile | en låsfil |  |
| `cmda.a_migration` | a migration | en migrering |  |
| `cmda.a_mysql_database` | a MySQL database | en MySQL-databas |  |
| `cmda.a_node_program` | a Node program | ett Node-program |  |
| `cmda.a_postgres_database` | a Postgres database | en Postgres-databas |  |
| `cmda.a_program_called_name` | a program called {name} | ett program som heter {name} |  |
| `cmda.a_program_of_this_session` | a program of this session | ett program från den här sessionen |  |
| `cmda.a_python_program` | a Python program | ett Python-program |  |
| `cmda.a_redis_store` | a Redis store | ett Redis-lager |  |
| `cmda.a_ruby_program` | a Ruby program | ett Ruby-program |  |
| `cmda.a_session_works_here_now` | a session works here now | en session arbetar här nu |  |
| `cmda.a_shared_config_file` | a shared config file | en delad konfigurationsfil |  |
| `cmda.a_web_dev_server` | a web dev server | en webbutvecklingsserver |  |
| `cmda.about_time_left` | about {time} left | ungefär {time} kvar |  |
| `cmda.agents_running_running_n_finished_in_the` | Agents: {running} running, {n} finished in the last hour. | Agenter: {running} körs, {n} klara den senaste timmen. |  |
| `cmda.an_estimate_from_vm_stat_the_system` | (An estimate from vm\_stat: the system level could not be read.) | (En uppskattning från vm\_stat: systemnivån kunde inte läsas.) |  |
| `cmda.and_n_more` | ... and {n} more. | ... och {n} till. |  |
| `cmda.another_session_name` | another session ({name}) | en annan session ({name}) |  |
| `cmda.away_away_it_also_holds_while_a` | Away: {away}. It also holds while a phone is connected. It never holds more than 8 hours in a row. | Borta: {away}. Den håller också medan en telefon är ansluten. Den håller aldrig mer än 8 timmar i följd. |  |
| `cmda.away_away_it_also_holds_while_a_2` | Away: {away}. It also holds while a phone is connected, or a question waits for you (up to 2 hours). It never holds more than 8 hours in a row. | Borta: {away}. Den håller också medan en telefon är ansluten, eller en fråga väntar på dig (upp till 2 timmar). Den håller aldrig mer än 8 timmar i följd. |  |
| `cmda.battery_p_plugged_in` | Battery {p}%, plugged in. | Batteri {p} %, inkopplat. |  |
| `cmda.binary` | binary | binär |  |
| `cmda.branch_digest_commits_and_files_changed_against` | Branch digest: {commits} and {files} changed against {base}{branch}, +{add} -{del} lines. Riskiest first. | Grensammanfattning: {commits} och {files} ändrade mot {base}{branch}, +{add} -{del} rader. Mest riskabla först. |  |
| `cmda.branch_digest_git_could_not_compare_with` | Branch digest: git could not compare with {base}. | Grensammanfattning: git kunde inte jämföra med {base}. |  |
| `cmda.branch_digest_git_is_not_installed` | Branch digest: git is not installed or not on the path. | Grensammanfattning: git är inte installerat eller finns inte i sökvägen. |  |
| `cmda.branch_digest_no_changes_against_base` | Branch digest: no changes against {base}. | Grensammanfattning: inga ändringar mot {base}. |  |
| `cmda.branch_digest_no_changes_against_base_on` | Branch digest: no changes against {base} on {branch}. | Grensammanfattning: inga ändringar mot {base} på {branch}. |  |
| `cmda.branch_digest_the_main_branch_could_not` | Branch digest: the main branch could not be found (no origin/HEAD, no main, no master), so there is nothing to compare with. | Grensammanfattning: huvudgrenen hittades inte (ingen origin/HEAD, ingen main, ingen master), så det finns inget att jämföra med. |  |
| `cmda.ci_and_build_files` | CI and build files | CI- och byggfiler |  |
| `cmda.clean_but_no_commit_of_its_own` | clean, but no commit of its own yet (it may be new) | ren, men ännu ingen egen commit (den kan vara ny) |  |
| `cmda.clean_not_merged_into_b_a_squash` | clean, not merged into {b} (a squash merge looks the same) | ren, inte ihopslagen med {b} (en squash-sammanslagning ser likadan ut) |  |
| `cmda.close_a_session_or_wait_for_one` | Close a session or wait for one to finish. Nothing is closed for you. | Stäng en session eller vänta tills en är klar. Inget stängs åt dig. |  |
| `cmda.code` | Code | Kod |  |
| `cmda.code_changed_in_files_and_no_test` | Code changed in {files} and no test file changed. | Kod ändrades i {files} och ingen testfil ändrades. |  |
| `cmda.command_command` | Command: {command} | Kommando: {command} |  |
| `cmda.commits` | Commits: | Commits: |  |
| `cmda.computer_load_off_it_runs_short_programs` | Computer load: off. It runs short programs to read memory, battery and heat, so it waits until you turn it on: Settings &gt; Agents. | Datorbelastning: av. Den kör korta program för att läsa minne, batteri och värme, så den väntar tills du slår på den: Inställningar &gt; Agenter. |  |
| `cmda.computer_load_on` | Computer load: on. | Datorbelastning: på. |  |
| `cmda.computer_load_on_but_none_of_the` | Computer load: on, but none of the programs gave an answer. It works on a Mac only. | Datorbelastning: på, men inget av programmen gav något svar. Det fungerar bara på en Mac. |  |
| `cmda.computer_load_on_nothing_read_yet_the` | Computer load: on. Nothing read yet; the first reading comes within a minute. | Datorbelastning: på. Inget är läst än; den första avläsningen kommer inom en minut. |  |
| `cmda.config_files` | Config files | Konfigurationsfiler |  |
| `cmda.detached` | (detached) | (frånkopplad) |  |
| `cmda.each_session_lists_the_files_it_edits` | Each session lists the files it edits. A list lasts 30 minutes. When you are about to edit a file that another live session of this repository edited, Claude gets a note. | Varje session listar filerna den ändrar. En lista gäller i 30 minuter. När en fil ska ändras som en annan levande session i det här förrådet har ändrat får Claude en notering. |  |
| `cmda.file_overlap_mode` | File overlap: {mode}. | Filkrock: {mode}. |  |
| `cmda.fix_ci_has_built_n_prompts_for` | Fix-CI has built {n} prompts for {branch} in the last 24 hours, and a check still fails. It builds no new one. Look at the failure yourself, or ask Claude what it tried. It can build another in {age}. | Fix-CI har byggt {n} prompter för {branch} de senaste 24 timmarna, och en kontroll misslyckas fortfarande. Den bygger ingen ny. Titta själv på felet, eller fråga Claude vad den provade. Den kan bygga en ny om {age}. |  |
| `cmda.fix_ci_text` | Fix CI: {text} | Laga CI: {text} |  |
| `cmda.gh_could_not_read_the_pull_requests` | gh could not read the pull requests. | gh kunde inte läsa pull requests. |  |
| `cmda.gh_did_not_answer_in_time` | gh did not answer in time. | gh svarade inte i tid. |  |
| `cmda.git_did_not_answer_in_time` | git did not answer in time. | git svarade inte i tid. |  |
| `cmda.github_has_not_said_yet_if_it` | GitHub has not said yet if it can merge | GitHub har inte sagt än om den kan slås ihop |  |
| `cmda.heat_is_fine` | Heat is fine. | Värmen är bra. |  |
| `cmda.held_started_min_min_ago` | {held} (started {min} min ago). | {held} (startades för {min} min sedan). |  |
| `cmda.it_can_merge` | it can merge | den kan slås ihop |  |
| `cmda.it_has_a_conflict_with_its_base` | It has a conflict with its base: it needs a rebase. | Den har en konflikt med sin bas: den behöver en rebase. |  |
| `cmda.it_has_a_conflict_with_its_base_2` | it has a conflict with its base now: it needs a rebase | den har en konflikt med sin bas nu: den behöver en rebase |  |
| `cmda.it_has_b_itself_checked_out` | it has {b} itself checked out | den har själva {b} utcheckad |  |
| `cmda.it_is_low_plug_in` | It is low: plug in. | Det är lågt: koppla in laddaren. |  |
| `cmda.it_looks_for_node_python_vite_next` | It looks for node, python, vite, next, webpack, esbuild and tsc programs, older than a minute, that run in the folder of a session that has ended, or in a worktree where no session works. | Den letar efter programmen node, python, vite, next, webpack, esbuild och tsc, äldre än en minut, som körs i mappen för en session som har avslutats, eller i ett arbetsträd där ingen session arbetar. |  |
| `cmda.its_folder_is_gone_git_can_forget` | its folder is gone; git can forget it | mappen finns inte kvar; git kan glömma den |  |
| `cmda.its_state_could_not_be_read` | its state could not be read | dess tillstånd kunde inte läsas |  |
| `cmda.keep_mac_awake_is_off_the_hold` | Keep Mac awake is off. The hold ends within a minute. | Håll Macen vaken är av. Hållningen slutar inom en minut. |  |
| `cmda.keep_mac_awake_is_on_the_mac` | Keep Mac awake is on. The Mac stays awake while a session works and while a phone is connected, up to 8 hours in a row. Closing the lid still sleeps the Mac. Type /vaken-help run awake off to turn it off. | Håll Macen vaken är på. Datorn förblir vaken medan en session arbetar och medan en telefon är ansluten, i upp till 8 timmar i följd. Att stänga locket försätter ändå datorn i vila. Skriv /vaken-help run awake off för att slå av det. |  |
| `cmda.last_commit_age_ago` | , last commit {age} ago | , senaste commit för {age} sedan |  |
| `cmda.leftover_programs_n_found_each_runs_in` | Leftover programs: {n} found. Each runs in a folder where no session works now. | Kvarglömda program: {n} hittades. Vart och ett körs i en mapp där ingen session arbetar nu. |  |
| `cmda.leftover_programs_none_found` | Leftover programs: none found. | Kvarglömda program: inga hittades. |  |
| `cmda.leftover_programs_the_ps_program_did_not` | Leftover programs: the ps program did not answer, so nothing could be checked. | Kvarglömda program: programmet ps svarade inte, så inget kunde kontrolleras. |  |
| `cmda.less_than_a_minute` | less than a minute | mindre än en minut |  |
| `cmda.less_than_a_minute_ago` | less than a minute ago | för mindre än en minut sedan |  |
| `cmda.list_will_need_a_rebase_after_this` | #{list} will need a rebase after this one | #{list} behöver en rebase efter den här |  |
| `cmda.locked` | locked | låst |  |
| `cmda.look_at_each_line_before_you_run` | Look at each line before you run it: a program you started by hand in that folder looks the same. Vaken never stops a program. | Titta på varje rad innan du kör den: ett program du startade för hand i den mappen ser likadant ut. Vaken stoppar aldrig ett program. |  |
| `cmda.memory_could_not_be_read` | Memory could not be read. | Minnet kunde inte läsas. |  |
| `cmda.memory_is_fine_procs` | Memory is fine: {procs}. | Minnet är bra: {procs}. |  |
| `cmda.merge_order_error` | Merge order: {error} | Ordning för ihopslagning: {error} |  |
| `cmda.merge_order_for_prs_asked_min_min` | Merge order for {prs} (asked {min} min ago; gh is asked at most every 5 minutes). | Ordning för ihopslagning av {prs} (frågade för {min} min sedan; gh frågas högst var 5:e minut). |  |
| `cmda.merge_order_no_open_pull_requests` | Merge order: no open pull requests. | Ordning för ihopslagning: inga öppna pull requests. |  |
| `cmda.migrations_and_database_files` | Migrations and database files | Migreringar och databasfiler |  |
| `cmda.n_branch_at_path_wordsage` | {n}. {branch} at {path}: {words}{age}. | {n}. {branch} i {path}: {words}{age}. |  |
| `cmda.n_changes_not_committed` | one: {n} change not committed<br>other: {n} changes not committed | one: {n} ändring är inte committad<br>other: {n} ändringar är inte committade |  |
| `cmda.n_program_pid_pid_running_time_folder` | {n}. {program}, PID {pid}, running {time}. Folder {folder} ({who}). | {n}. {program}, PID {pid}, körs sedan {time}. Mapp {folder} ({who}). |  |
| `cmda.n_seconds` | one: {n} second<br>other: {n} seconds | one: {n} sekund<br>other: {n} sekunder |  |
| `cmda.n_title_the_only_one_nothing_to` | #{n} {title}: the only one, nothing to order. | #{n} {title}: den enda, inget att ordna. |  |
| `cmda.name_files` | {name}: {files}. | {name}: {files}. |  |
| `cmda.name_no_edits_in_the_last_30` | {name}: no edits in the last 30 minutes. | {name}: inga ändringar de senaste 30 minuterna. |  |
| `cmda.no_battery_this_machine_runs_on_power` | No battery: this machine runs on power. | Inget batteri: den här datorn går på nätström. |  |
| `cmda.no_branch` | (no branch) | (ingen gren) |  |
| `cmda.no_branch_detached_not_checked` | no branch (detached); not checked | ingen gren (frånkopplad); inte kontrollerad |  |
| `cmda.no_dev_port_is_held_and_no` | No dev port is held and no session folder holds a port. | Ingen utvecklingsport är upptagen och ingen sessionsmapp håller en port. |  |
| `cmda.no_end_seen_vaken_saw_the_agent` | No end seen: vaken saw the agent start but not stop. | Inget slut sett: vaken såg agenten starta men inte sluta. |  |
| `cmda.no_hold_is_on_now` | No hold is on now. | Ingen vakenhållning pågår nu. |  |
| `cmda.no_open_pull_requests` | no open pull requests. | inga öppna pull requests. |  |
| `cmda.no_other_live_session_of_this_repository` | No other live session of this repository has edited a file lately. | Ingen annan levande session i det här förrådet har ändrat en fil på sistone. |  |
| `cmda.no_other_pull_request_changes_the_same` | no other pull request changes the same files | ingen annan pull request ändrar samma filer |  |
| `cmda.no_session_works_in_worktree_name` | no session works in worktree {name} | ingen session arbetar i arbetsträdet {name} |  |
| `cmda.not_keeping_the_mac_awake_now_nothing` | Not keeping the Mac awake now: nothing needs it | Håller inte datorn vaken nu: inget behöver det |  |
| `cmda.not_read_yet` | Not read yet. | Inte läst än. |  |
| `cmda.off_vaken_does_not_touch_your_mac` | Off: vaken does not touch your Mac's sleep. Turn it on: Settings &gt; Agents, or type /vaken-help run awake on. It keeps the Mac awake while a session works, and while you are away (a phone is connected, or a question waits), with the macOS caffeinate program. It uses more battery. | Av: vaken rör inte datorns vilolägen. Slå på det: Inställningar &gt; Agenter, eller skriv /vaken-help run awake on. Det håller datorn vaken medan en session arbetar, och medan du är borta (en telefon är ansluten, eller en fråga väntar), med macOS-programmet caffeinate. Det drar mer batteri. |  |
| `cmda.off_vaken_does_not_touch_your_pc` | Off: vaken does not touch your PC's sleep. Turn it on: Settings &gt; Agents, or type /vaken-help run awake on. It keeps the PC awake while a session works, and while you are away (a phone is connected, or a question waits), with a small hidden PowerShell program. It uses more battery. | Av: vaken rör inte datorns vilolägen. Slå på det: Inställningar &gt; Agenter, eller skriv /vaken-help run awake on. Det håller datorn vaken medan en session arbetar, och medan du är borta (en telefon är ansluten, eller en fråga väntar), med ett litet dolt PowerShell-program. Det drar mer batteri. |  |
| `cmda.on` | on | på |  |
| `cmda.only_the_first_n_were_checked` | Only the first {n} were checked. | Bara de första {n} kontrollerades. |  |
| `cmda.other_files` | Other files | Övriga filer |  |
| `cmda.port_port_is_what` | Port {port} is {what}. | Port {port} är {what}. |  |
| `cmda.port_port_what_folder_folder_no_session` | Port {port}: {what} (folder {folder}). No session of vaken works in that folder. | Port {port}: {what} (mapp {folder}). Ingen session i vaken arbetar i den mappen. |  |
| `cmda.port_port_what_its_folder_could_not` | Port {port}: {what}. Its folder could not be read. | Port {port}: {what}. Dess mapp kunde inte läsas. |  |
| `cmda.port_port_what_started_in_the_folder` | Port {port}: {what} started in the folder of this session. | Port {port}: {what} startades i mappen för den här sessionen. |  |
| `cmda.port_port_what_started_in_the_folder_2` | Port {port}: {what} started in the folder of session '{name}'. | Port {port}: {what} startades i mappen för sessionen '{name}'. |  |
| `cmda.port_port_what_started_in_the_folder_3` | Port {port}: {what} started in the folder of session '{name}' (that session has ended). | Port {port}: {what} startades i mappen för sessionen '{name}' (den sessionen har avslutats). |  |
| `cmda.ports_not_from_a_session_folder` | {ports} not from a session folder. | {ports} inte från en sessionsmapp. |  |
| `cmda.putting_the_prompt_in_the_prompt_box` | Putting the prompt in the prompt box in a moment. Press Enter to send it; nothing is sent for you. After {n} tries in 24 hours it builds no new prompt. | Lägger prompten i promptrutan om en stund. Tryck Enter för att skicka den; inget skickas åt dig. Efter {n} försök på 24 timmar bygger den ingen ny prompt. |  |
| `cmda.read_age_ago_it_reads_every_3` | Read {age} ago. It reads every 3 minutes, and every minute while agents run. | Lästes för {age} sedan. Den läser var tredje minut, och varje minut medan agenter körs. |  |
| `cmda.safe_to_remove_clean_and_merged_into` | safe to remove: clean and merged into {b} | säker att ta bort: ren och ihopslagen med {b} |  |
| `cmda.say_vaken_ship_worktrees_all_for_the` | Say /vaken-ship worktrees all for the full list and the remove commands. A merged one has Remove this copy on the Pull requests card. | Skriv /vaken-ship worktrees all för hela listan och kommandona för att ta bort. Ett ihopslaget har Ta bort arbetsträdet på kortet Pull requests. |  |
| `cmda.say_vaken_ship_worktrees_all_for_the_2` | Say /vaken-ship worktrees all for the full list. | Skriv /vaken-ship worktrees all för hela listan. |  |
| `cmda.security_related_files` | Security-related files | Säkerhetsrelaterade filer |  |
| `cmda.session_name_has_ended` | session '{name}' has ended | sessionen '{name}' har avslutats |  |
| `cmda.sessions_working_now_n` | Sessions working now: {n}. | Sessioner som arbetar nu: {n}. |  |
| `cmda.shared_ports_off_turn_it_on_settings` | Shared ports: off. Turn it on: Settings &gt; Agents. (This list still works.) | Delade portar: av. Slå på det: Inställningar &gt; Agenter. (Den här listan fungerar ändå.) |  |
| `cmda.shared_ports_on_before_claude_starts_a` | Shared ports: on. Before Claude starts a server on a port another session holds, Claude gets a note. | Delade portar: på. Innan Claude startar en server på en port som en annan session håller får Claude en notering. |  |
| `cmda.swap_used_used_of_total` | Swap: {used} used of {total}. | Växlingsminne: {used} används av {total}. |  |
| `cmda.the_agent_board_could_not_read_its` | The agent board could not read its list. Try again in a moment. | Agenttavlan kunde inte läsa sin lista. Försök igen om en stund. |  |
| `cmda.the_agent_board_is_off_turn_it` | The agent board is off. Turn it on in Settings &gt; Agents. | Agenttavlan är av. Slå på den i Inställningar &gt; Agenter. |  |
| `cmda.the_caffeinate_program_was_not_found_so` | The caffeinate program was not found, so the Mac cannot be held awake. | Programmet caffeinate hittades inte, så datorn kan inte hållas vaken. |  |
| `cmda.the_gh_program_was_not_found_so` | The gh program was not found, so vaken cannot ask GitHub. Install it from cli.github.com and sign in. | Programmet gh hittades inte, så vaken kan inte fråga GitHub. Installera det från cli.github.com och logga in. |  |
| `cmda.the_gh_program_was_not_found_so_2` | The gh program was not found, so vaken cannot ask about your pull request. Install it from cli.github.com and sign in. | Programmet gh hittades inte, så vaken kan inte fråga om din pull request. Installera det från cli.github.com och logga in. |  |
| `cmda.the_hold_could_not_be_started` | The hold could not be started. | Det gick inte att starta vakenhållningen. |  |
| `cmda.the_lsof_program_did_not_answer_so` | The lsof program did not answer, so no program's folder could be read. | Programmet lsof svarade inte, så ingen programmapp kunde läsas. |  |
| `cmda.the_mac_is_held_awake` | The Mac is held awake | Datorn hålls vaken |  |
| `cmda.the_main_branch_could_not_be_found` | The main branch could not be found; {base} was used. | Huvudgrenen hittades inte; {base} användes. |  |
| `cmda.the_main_folder_it_stays` | the main folder; it stays | huvudmappen; den blir kvar |  |
| `cmda.the_order_comes_from_the_files_each` | The order comes from the files each pull request changes and from the state GitHub reports. It does not read the code. Nothing is merged for you. | Ordningen kommer från filerna som varje pull request ändrar och från det tillstånd GitHub rapporterar. Den läser inte koden. Inget slås ihop åt dig. |  |
| `cmda.the_order_comes_from_the_kind_of` | The order comes from the kind of file, then the size. It does not read the code. | Ordningen kommer från typen av fil, sedan storleken. Den läser inte koden. |  |
| `cmda.the_pc_is_held_awake` | The PC is held awake | Datorn hålls vaken |  |
| `cmda.the_ports_could_not_be_read_the` | The ports could not be read: the lsof program did not answer. | Portarna kunde inte läsas: programmet lsof svarade inte. |  |
| `cmda.the_processor_is_slowed_to_n_by` | The processor is slowed to {n}% by heat. | Processorn är nedsatt till {n} % av värmen. |  |
| `cmda.the_usual_port_of_a_postgres_database` | the usual port of a Postgres database | den vanliga porten för en Postgres-databas |  |
| `cmda.the_usual_port_of_a_python_or` | the usual port of a Python or API dev server | den vanliga porten för en utvecklingsserver i Python eller för ett API |  |
| `cmda.the_usual_port_of_a_redis_store` | the usual port of a Redis store | den vanliga porten för ett Redis-lager |  |
| `cmda.the_usual_port_of_a_web_dev` | the usual port of a web dev server | den vanliga porten för en webbutvecklingsserver |  |
| `cmda.the_usual_port_of_a_web_or` | the usual port of a web or proxy server | den vanliga porten för en webb- eller proxyserver |  |
| `cmda.the_usual_port_of_an_app_server` | the usual port of an app server | den vanliga porten för en appserver |  |
| `cmda.the_usual_port_of_the_vite_dev` | the usual port of the Vite dev server | den vanliga porten för Vites utvecklingsserver |  |
| `cmda.the_usual_second_port_of_a_web` | the usual second port of a web dev server | den vanliga andra porten för en webbutvecklingsserver |  |
| `cmda.the_worktrees_could_not_be_read` | The worktrees could not be read. | Arbetsträden kunde inte läsas. |  |
| `cmda.this_does_not_work_here_powershell_was` | This does not work here: PowerShell was not found (it is part of Windows). | Det här fungerar inte här: PowerShell hittades inte (det ingår i Windows). |  |
| `cmda.this_does_not_work_here_the_caffeinate` | This does not work here: the caffeinate program was not found (it is part of macOS). | Det här fungerar inte här: programmet caffeinate hittades inte (det ingår i macOS). |  |
| `cmda.this_folder_is_not_a_git_folder` | This folder is not a git folder. | Den här mappen är inte en git-mapp. |  |
| `cmda.this_folder_is_not_in_a_git` | This folder is not in a git repository, so no session can be matched to it. | Den här mappen finns inte i ett git-förråd, så ingen session kan kopplas till den. |  |
| `cmda.this_folder_is_not_in_a_git_2` | This folder is not in a git repository, so there is no pull request to show. | Den här mappen finns inte i ett git-förråd, så det finns ingen pull request att visa. |  |
| `cmda.this_is_the_prompt_nothing_was_sent` | This is the prompt. Nothing was sent. To put it in the prompt box, run /vaken-ship ci-fix send. | Här är prompten. Inget skickades. För att lägga den i promptrutan, kör /vaken-ship ci-fix send. |  |
| `cmda.to_let_git_forget_it_run_git` | To let git forget it, run: git worktree prune | Låt git glömma den med: git worktree prune |  |
| `cmda.to_remove_it_run_git_worktree_remove` | To remove it, run: git worktree remove {path} | Ta bort den med: git worktree remove {path} |  |
| `cmda.to_stop_it_run_command` | To stop it, run: {command} | Stoppa det med: {command} |  |
| `cmda.vaken_removes_a_worktree_only_when_you` | Vaken removes a worktree only when you press Remove this copy on the Pull requests card, and only a merged one with nothing uncommitted or unpushed. Or run a command yourself, and look first: removing deletes the folder. The branch stays. | Vaken tar bara bort ett arbetsträd när du trycker på Ta bort arbetsträdet på kortet Pull requests, och bara ett ihopslaget utan något som inte är incheckat eller pushat. Eller kör ett kommando själv, och titta först: att ta bort raderar mappen. Grenen blir kvar. |  |
| `cmda.while_at_least_one_session_works_vaken` | While at least one session works, vaken keeps the Mac awake: it starts the caffeinate program for 10 minutes and renews it every 8. When nothing works, it stops the one it started. | Så länge minst en session arbetar håller vaken datorn vaken: den startar programmet caffeinate i 10 minuter och förnyar det var 8:e. När inget arbetar stoppar den det den startade. |  |
| `cmda.while_at_least_one_session_works_vaken_2` | While at least one session works, vaken keeps the PC awake: it starts a hidden PowerShell program that asks Windows not to sleep for 10 minutes, and renews it every 8. When nothing works, it stops the one it started. | Så länge minst en session arbetar håller vaken datorn vaken: den startar ett dolt PowerShell-program som ber Windows att inte vila i 10 minuter, och förnyar det var 8:e. När inget arbetar stoppar den det den startade. |  |
| `cmda.will_need_a_rebase_after_n_both` | will need a rebase after #{n} (both change {files}) | behöver en rebase efter #{n} (båda ändrar {files}) |  |
| `cmda.worktree_cleanup_is_off_turn_it_on` | Worktree cleanup is off. Turn it on: Settings &gt; Agents. (This list still works.) | Städning av arbetsträd är av. Slå på den: Inställningar &gt; Agenter. (Den här listan fungerar ändå.) |  |
| `cmda.worktrees_n_safe_to_remove` | {worktrees}, {n} safe to remove. | {worktrees}, {n} säkra att ta bort. |  |

## cmdb

Shown from the code. (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `cmdb.1_day` | 1 day | 1 dag |  |
| `cmdb.1_finish_the_most_important_session_first` | 1. Finish the most important session first. | 1. Avsluta den viktigaste sessionen först. |  |
| `cmdb.2_pause_the_others_all_sessions_draw` | 2. Pause the others. All sessions draw on the same limit. | 2. Pausa de andra. Alla sessioner drar från samma gräns. |  |
| `cmdb.3_use_a_cheaper_model_for_simple` | 3. Use a cheaper model for simple work. | 3. Använd en billigare modell för enkla uppgifter. |  |
| `cmdb.4_avoid_agents_each_one_draws_on` | 4. Avoid agents. Each one draws on the limit too. | 4. Undvik agenter. Varje agent drar också från gränsen. |  |
| `cmdb.7_days` | 7 days | 7 dagar |  |
| `cmdb.a_check_failed` | a check failed | en kontroll misslyckades |  |
| `cmdb.a_check_ran_but_its_result_is` | a check ran but its result is not clear | en kontroll kördes men resultatet är oklart |  |
| `cmdb.a_migration_or_database_file` | a migration or database file | en migrering eller databasfil |  |
| `cmdb.a_run_was_seen_but_its_result` | a run was seen but its result is not clear | en körning sågs men resultatet är oklart |  |
| `cmdb.a_session_started_now_would_wait` | A session started now would wait. | En session som startas nu skulle få vänta. |  |
| `cmdb.agents_n_answers_about_usd_estimate` | Agents: {n} answers, about {usd} (estimate). | Agenter: {n} svar, ungefär {usd} (uppskattning). |  |
| `cmdb.agents_ran_answers_and_made_pct_of` | Agents ran {answers} and made {pct} of the cost. | Agenterna körde {answers} och stod för {pct} av kostnaden. |  |
| `cmdb.all_sessions_that_run_are_stalled` | All {sessions} that run are stalled. | Alla {sessions} som körs har stannat. |  |
| `cmdb.asked_words` | Asked: {words}. | Du bad om: {words}. |  |
| `cmdb.at_100_in_stop_mode_vaken_usage` | At 100% in Stop mode, /vaken-usage budget extend lifts the block. It adds one more budget to the one that is at 80% or more. | Vid 100 % i läget Stoppa häver /vaken-usage budget extend stoppet. Det lägger till ytterligare en budget till den som är på 80 % eller mer. |  |
| `cmdb.at_this_pace_the_label_limit_lasts` | At this pace the {label} limit lasts until the reset. {run} They share the {left} that is left. {reset} | I den här takten räcker gränsen ({label}) till återställningen. {run} De delar de {left} som är kvar. {reset} |  |
| `cmdb.average_answer_about_usd_over_n_answers` | Average answer: about {usd} over {n} answers (estimate). | Genomsnittligt svar: ungefär {usd} över {n} svar (uppskattning). |  |
| `cmdb.backed_by_a_check_list` | Backed by a check: {list}. | Styrkt av en kontroll: {list}. |  |
| `cmdb.base_plus_extra_extended` | ({base} plus {extra} extended) | ({base} plus {extra} utökat) |  |
| `cmdb.budget_off_turn_it_on_settings_money` | Budget: off. Turn it on: Settings &gt; Money and plan. | Budget: av. Slå på den: Inställningar &gt; Pengar och plan. |  |
| `cmdb.budget_stop_at_80_you_are_warned` | Budget: stop. At 80% you are warned; at 100% costly calls such as agents are stopped. | Budget: stoppa. Vid 80 % varnas du; vid 100 % stoppas kostsamma anrop som agenter. |  |
| `cmdb.budget_warn_at_80_and_at_100` | Budget: warn. At 80% and at 100% you are warned. | Budget: varna. Vid 80 % och vid 100 % varnas du. |  |
| `cmdb.burn_about_usd_an_hour_over_the` | Burn: about {usd} an hour over the last {min} min of use (estimate). | Förbrukning: ungefär {usd} i timmen under de senaste {min} min av användning (uppskattning). |  |
| `cmdb.burn_not_enough_readings_yet_it_needs` | Burn: not enough readings yet (it needs about 3 minutes of use). | Förbrukning: inte tillräckligt med mätningar än (den behöver ungefär 3 minuters användning). |  |
| `cmdb.cache_reads_read_tokens_rp_cache_writes` | Cache reads: {read} tokens, {rp}. Cache writes: {write} tokens, {wp}. Output: {out} tokens, {op}. | Cacheläsningar: {read} tokens, {rp}. Cacheskrivningar: {write} tokens, {wp}. Utdata: {out} tokens, {op}. |  |
| `cmdb.changed_paths_name_words` | changed paths name {words} | ändrade sökvägar nämner {words} |  |
| `cmdb.checks_passed_after_the_last_edit` | Checks passed after the last edit | Kontroller som gick igenom efter den senaste ändringen |  |
| `cmdb.checks_passing_now_list` | Checks passing now: {list}. | Kontroller som går igenom nu: {list}. |  |
| `cmdb.checks_run` | Checks run: | Körda kontroller: |  |
| `cmdb.checks_run_none` | Checks run: none. | Körda kontroller: inga. |  |
| `cmdb.checks_that_have_not_passed_since_the` | Checks that have not passed since the last edit: {list}. | Kontroller som inte har gått igenom sedan den senaste ändringen: {list}. |  |
| `cmdb.checks_that_passed_list` | checks that passed: {list} | kontroller som gick igenom: {list} |  |
| `cmdb.checks_vaken_itself_after_an_update` | Checks vaken itself after an update. | Kontrollerar vaken själv efter en uppdatering. |  |
| `cmdb.ci_or_build_files` | CI or build files | CI- eller byggfiler |  |
| `cmdb.claims_in_the_answer_list` | Claims in the answer: {list}. | Påståenden i svaret: {list}. |  |
| `cmdb.claims_in_the_answer_none_found` | Claims in the answer: none found. | Påståenden i svaret: inga hittades. |  |
| `cmdb.claims_in_the_last_answer_without_a` | {claims} in the last answer without a check | {claims} i det senaste svaret utan kontroll |  |
| `cmdb.claude_keeps_a_saved_copy_of_this` | Claude keeps a saved copy of this session (the cache), so each answer costs less. It goes stale after about an hour of quiet (5 minutes when you pay with usage credits). The keeper reads it just before, so a break does not make your next answer cost more. | Claude håller en sparad kopia av den här sessionen (cachen), så varje svar kostar mindre. Den blir gammal efter ungefär en timmes uppehåll (5 minuter när du betalar med användningskrediter). Cachevakten läser den strax innan, så en paus gör inte ditt nästa svar dyrare. |  |
| `cmdb.claude_s_task_list_done_of_total` | Claude's task list: {done} of {total} done. | Claudes uppgiftslista: {done} av {total} klara. |  |
| `cmdb.cleared_answers_marked_as_looked_at` | Cleared. {answers} marked as looked at. | Rensat. {answers} markerades som granskade. |  |
| `cmdb.confidence_not_enough_evidence_yet` | Confidence: not enough evidence yet. | Säkerhet: inte tillräckligt med bevis än. |  |
| `cmdb.confidence_score_out_of_100_it_is` | Confidence: {score} out of 100. It is made only of the evidence below. | Säkerhet: {score} av 100. Den bygger bara på bevisen nedan. |  |
| `cmdb.config_files` | config files | konfigurationsfiler |  |
| `cmdb.cost_all_dollar_figures_are_estimates` | Cost (all dollar figures are estimates) | Kostnad (alla dollarbelopp är uppskattningar) |  |
| `cmdb.costly_calls_are_allowed_again` | Costly calls are allowed again. | Kostsamma anrop är tillåtna igen. |  |
| `cmdb.day` | Day | Dag |  |
| `cmdb.day_budget_add_now_now` | day budget +{add}, now {now} | dagsbudget +{add}, nu {now} |  |
| `cmdb.definition_of_done_cleared` | Definition of done cleared. | Definition av klart är rensad. |  |
| `cmdb.definition_of_done_list_met` | Definition of done ({list}): met. | Definition av klart ({list}): uppfylld. |  |
| `cmdb.definition_of_done_list_not_met` | Definition of done ({list}): not met. | Definition av klart ({list}): inte uppfylld. |  |
| `cmdb.definition_of_done_listoff` | Definition of done: {list}{off}. | Definition av klart: {list}{off}. |  |
| `cmdb.definition_of_done_met` | Definition of done met | Definition av klart uppfylld |  |
| `cmdb.definition_of_done_not_set_set_it` | Definition of done: not set. Set it with /vaken-ship done tests build lint. | Definition av klart: inte satt. Sätt den med /vaken-ship done tests build lint. |  |
| `cmdb.definition_of_done_set_list` | Definition of done set: {list}. | Definition av klart satt: {list}. |  |
| `cmdb.delivered_files_changed_edits_named_checks` | Delivered: {files} changed ({edits}); {named}; {checks}. | Levererat: {files} ändrade ({edits}); {named}; {checks}. |  |
| `cmdb.delivered_no_file_has_changed_yetchecks` | Delivered: no file has changed yet{checks}. | Levererat: ingen fil har ändrats än{checks}. |  |
| `cmdb.dollars_from_tokens_use_the_list_price` | Dollars from tokens use the list price of {name}, table of {date}. On a subscription you are not billed per token: the dollars show what the same use would cost at list price. | Dollar utifrån tokens använder listpriset för {name}, tabell från {date}. Med en prenumeration debiteras du inte per token: dollarna visar vad samma användning skulle kosta till listpris. |  |
| `cmdb.done_counts_only_when_each_one_has` | Done counts only when each one has a passing run after the last file edit. | Klart räknas bara när var och en har en godkänd körning efter den senaste filändringen. |  |
| `cmdb.edited_after_the_last_build` | edited after the last build | ändrad efter det senaste bygget |  |
| `cmdb.edited_after_the_last_lint_run` | edited after the last lint run | ändrad efter den senaste lint-körningen |  |
| `cmdb.edited_after_the_last_test_run` | edited after the last test run | ändrad efter den senaste testkörningen |  |
| `cmdb.edited_after_the_last_type_check` | edited after the last type check | ändrad efter den senaste typkontrollen |  |
| `cmdb.edits_in_folders_far_from_the_goal` | {edits} in folders far from the goal | {edits} i mappar långt från målet |  |
| `cmdb.engine_version_versionwas` | Engine version: {version}{was}. | Motorversion: {version}{was}. |  |
| `cmdb.every_changed_code_file_had_a_test` | Every changed code file had a test file touched in the same turn. | Varje ändrad kodfil hade en testfil som ändrades i samma tur. |  |
| `cmdb.every_chosen_check_passed_list` | every chosen check passed ({list}) | alla valda kontroller gick igenom ({list}) |  |
| `cmdb.every_claim_in_the_last_answer_has` | every claim in the last answer has a check behind it, or none was made | varje påstående i det senaste svaret har en kontroll bakom sig, eller så gjordes inga |  |
| `cmdb.every_edit_is_near_the_goal` | every edit is near the goal | varje ändring ligger nära målet |  |
| `cmdb.extended_list_then` | Extended: {list}. {then} | Utökat: {list}. {then} |  |
| `cmdb.extra_edits_in_folders_the_goal_does` | Extra: {edits} in folders the goal does not name: {folders}. | Extra: {edits} i mappar som målet inte nämner: {folders}. |  |
| `cmdb.extra_nothing_found_every_edited_folder_is` | Extra: nothing found; every edited folder is near the first ones or named in the goal. | Extra: inget hittades; varje ändrad mapp ligger nära de första eller nämns i målet. |  |
| `cmdb.failed_exit_n` | failed (exit {n}) | misslyckades (felkod {n}) |  |
| `cmdb.failing_list` | Failing: {list}. | Misslyckas: {list}. |  |
| `cmdb.files_changed_after_the_last_run` | files changed after the last run | filer ändrades efter den senaste körningen |  |
| `cmdb.files_changed_in_this_answer_files_edits` | Files changed in this answer: {files} ({edits}){diff}. | Ändrade filer i det här svaret: {files} ({edits}){diff}. |  |
| `cmdb.files_changed_none` | Files changed: none. | Ändrade filer: inga. |  |
| `cmdb.files_had_no_test_file_touched_in` | {files} had no test file touched in the same turn. | {files} hade ingen testfil som ändrades i samma tur. |  |
| `cmdb.files_lines_lines` | {files}, {lines} lines | {files}, {lines} rader |  |
| `cmdb.for_a_hard_stop_set_it_to` | For a hard stop, set it to Stop: Settings &gt; Safety. | För ett hårt stopp, sätt den till Stoppa: Inställningar &gt; Säkerhet. |  |
| `cmdb.from_tokens_about_usd` | From tokens, about {usd}. | Utifrån tokens, ungefär {usd}. |  |
| `cmdb.git_diff_all_changes_not_committed_yet` | Git diff, all changes not committed yet: {lines} lines in {files} | Git diff, alla ändringar som ännu inte är committade: {lines} rader i {files} |  |
| `cmdb.git_shows_no_change_that_is_not` | Git shows no change that is not committed | Git visar ingen ändring som inte är committad |  |
| `cmdb.goal_cleared_vaken_will_not_take_a` | Goal cleared. Vaken will not take a new one from your messages. | Målet är rensat. Vaken tar inget nytt mål från dina meddelanden. |  |
| `cmdb.goal_not_set_set_it_with_vaken` | Goal: not set. Set it with /vaken-tasks goal &lt;one sentence&gt;. | Mål: inte satt. Sätt det med /vaken-tasks goal &lt;en mening&gt;. |  |
| `cmdb.goal_set_text` | Goal set: {text} | Mål satt: {text} |  |
| `cmdb.h_h_m_min` | {h} h {m} min | {h} h {m} min |  |
| `cmdb.heat_is_counted_from_edits_size_and` | Heat is counted from edits, size and the kind of file. It does not read the code. | Värmen räknas från ändringar, storlek och filens slag. Den läser inte koden. |  |
| `cmdb.high` | HIGH | HÖG |  |
| `cmdb.i_cannot_compare_yet_no_goal_is` | I cannot compare yet: no goal is set, or it has only common words. Set one with /vaken-tasks goal &lt;one sentence&gt;. Then this shows what you asked, what was delivered, what is extra and what is missing. | Jag kan inte jämföra än: inget mål är satt, eller så har det bara vanliga ord. Sätt ett med /vaken-tasks goal &lt;en mening&gt;. Då visar det här vad du bad om, vad som levererades, vad som är extra och vad som saknas. |  |
| `cmdb.if_the_pace_holds_the_label_limit` | If the pace holds, the {label} limit is reached about {time}. Then every session waits until the reset. {run} {reset} | Om takten håller nås gränsen ({label}) omkring {time}. Då väntar varje session till återställningen. {run} {reset} |  |
| `cmdb.if_the_pace_holds_the_label_limit_2` | If the pace holds, the {label} limit is reached about {time}. Then the {sessions} that run stop until the reset. {run} {reset} | Om takten håller nås gränsen ({label}) omkring {time}. Då stoppar de {sessions} som körs till återställningen. {run} {reset} |  |
| `cmdb.in_in_read_from_the_cache_out` | {in} in ({read} from the cache), {out} out | {in} in ({read} från cachen), {out} ut |  |
| `cmdb.in_turns_answers_this_session_cost_about` | In {turns} answers this session cost about {usd} (estimate{unpriced}). | På {turns} svar kostade den här sessionen ungefär {usd} (uppskattning{unpriced}). |  |
| `cmdb.it_already_read_the_cache_n_times` | It already read the cache {n} times since your last answer. | Den har redan läst cachen {n} gånger sedan ditt senaste svar. |  |
| `cmdb.it_also_blocks_the_next_try_until` | It also blocks the next try until you write a message. | Den stoppar också nästa försök tills du skriver ett meddelande. |  |
| `cmdb.it_also_notes_a_file_that_claude` | It also notes a file that Claude edits 5 times in 10 minutes while steps keep failing. That is only a note, never a block. | Den noterar också en fil som Claude ändrar 5 gånger på 10 minuter medan steg fortsätter misslyckas. Det är bara en notering, aldrig ett stopp. |  |
| `cmdb.it_is_big_lines_lines_changed` | it is big ({lines} lines changed) | den är stor ({lines} rader ändrade) |  |
| `cmdb.it_is_fixed` | it is fixed | det är fixat |  |
| `cmdb.it_is_resetting_now` | It is resetting now. | Den återställs nu. |  |
| `cmdb.it_is_verified` | it is verified | det är verifierat |  |
| `cmdb.it_needs_at_least_one_changed_file` | It needs at least one changed file and one check that ran. Then it counts passing checks, the definition of done, claims, diff size and drift. | Den behöver minst en ändrad fil och en kontroll som kördes. Sedan räknar den godkända kontroller, definitionen av klart, påståenden, ändringens storlek och kursavvikelse. |  |
| `cmdb.it_resets_daytime_in_span` | It resets {day}{time} (in {span}). | Den återställs {day}{time} (om {span}). |  |
| `cmdb.it_touches_what` | it touches {what} | den rör {what} |  |
| `cmdb.it_watches_for_a_step_that_fails` | It watches for a step that fails {n} times in a row, the same way. Then it tells Claude to stop and ask you. | Den bevakar ett steg som misslyckas {n} gånger i rad, på samma sätt. Då säger den åt Claude att stanna och fråga dig. |  |
| `cmdb.keep_going_on_until_check_pass_n` | Keep going: on until {check} pass, {n} of {max} rounds used. Your next message ends it. | Kör vidare: på tills {check} går igenom, {n} av {max} omgångar använda. Ditt nästa meddelande avslutar det. |  |
| `cmdb.keep_going_on_until_check_passes_n` | Keep going: on until {check} passes, {n} of {max} rounds used. Your next message ends it. | Kör vidare: på tills {check} går igenom, {n} av {max} omgångar använda. Ditt nästa meddelande avslutar det. |  |
| `cmdb.keep_going_stopped_after_max_rounds_check` | Keep going: stopped after {max} rounds, {check} still failing. Press Keep going in the pane to try again. | Kör vidare: stoppad efter {max} omgångar, {check} misslyckas fortfarande. Tryck på Kör vidare i panelen för att försöka igen. |  |
| `cmdb.keep_what_helps_switch_off_the_rest` | Keep what helps. Switch off the rest in Settings. /vaken-today value shows 7 days. | Behåll det som hjälper. Stäng av resten i Inställningar. /vaken-today value visar 7 dagar. |  |
| `cmdb.keep_what_helps_switch_off_the_rest_2` | Keep what helps. Switch off the rest in Settings. /vaken-today value day shows 1 day. | Behåll det som hjälper. Stäng av resten i Inställningar. /vaken-today value day visar 1 dag. |  |
| `cmdb.keeper_off` | Keeper: off. | Cachevakten: av. |  |
| `cmdb.keeper_on` | Keeper: on. | Cachevakten: på. |  |
| `cmdb.kept_you_informed` | Kept you informed | Höll dig informerad |  |
| `cmdb.kept_you_safe` | Kept you safe | Höll dig säker |  |
| `cmdb.key_words_of_your_first_message_set` | (key words of your first message; set it in your own words with /vaken-tasks goal) | (nyckelord ur ditt första meddelande; sätt det med egna ord med /vaken-tasks goal) |  |
| `cmdb.kind_failed_n_times` | {kind} failed {n} times | {kind} misslyckades {n} gånger |  |
| `cmdb.kind_failed_n_times_with_different_commands` | {kind} failed {n} times with different commands. | {kind} misslyckades {n} gånger med olika kommandon. |  |
| `cmdb.label_used_used_left_left_reset` | {label}: {used} used, {left} left. {reset} | {label}: {used} använt, {left} kvar. {reset} |  |
| `cmdb.last_answer_none_counted_yet` | Last answer: none counted yet. | Senaste svaret: inget räknat än. |  |
| `cmdb.last_answer_price_tokens_ago` | Last answer: {price}, {tokens} ({ago}). | Senaste svaret: {price}, {tokens} ({ago}). |  |
| `cmdb.lines_lines_changed_in_edits_edits_up` | {lines} lines changed in {edits} edits (up to 100 lines is the most points) | {lines} rader ändrade i {edits} ändringar (upp till 100 rader ger flest poäng) |  |
| `cmdb.lint_is_clean` | lint is clean | lint-kontrollen är ren |  |
| `cmdb.list_no_test_file_was_touched_in` | {list}. No test file was touched in the same turn. | {list}. Ingen testfil ändrades i samma tur. |  |
| `cmdb.long_of_n_tool_results_were_long` | {long} of {n} tool results were long (over {chars} characters); every later answer re-reads them. | {long} av {n} verktygsresultat var långa (över {chars} tecken); varje senare svar läser om dem. |  |
| `cmdb.loop_breaker_off` | Loop breaker: off. | Loopbrytare: av. |  |
| `cmdb.loop_breaker_stop` | Loop breaker: stop. | Loopbrytare: stoppa. |  |
| `cmdb.loop_breaker_warn` | Loop breaker: warn. | Loopbrytare: varna. |  |
| `cmdb.low` | LOW | LÅG |  |
| `cmdb.medium` | MEDIUM | MEDEL |  |
| `cmdb.met_every_check_passed_after_the_last` | Met: every check passed after the last edit. | Uppfylld: alla kontroller gick igenom efter den senaste ändringen. |  |
| `cmdb.missing_list_from_your_definition_of_done` | Missing: {list} from your definition of done. | Saknas: {list} ur din definition av klart. |  |
| `cmdb.missing_no_definition_of_done_is_set` | Missing: no definition of done is set, so this cannot say.{more} | Saknas: ingen definition av klart är satt, så det här kan inte säga.{more} |  |
| `cmdb.missing_nothing_every_check_in_your_definition` | Missing: nothing; every check in your definition of done passed after the last edit. | Saknas: inget; varje kontroll i din definition av klart gick igenom efter den senaste ändringen. |  |
| `cmdb.most_of_it_pct_was_what` | Most of it, {pct}, was {what}. | Det mesta av det, {pct}, var {what}. |  |
| `cmdb.n_or_more` | {n} or more | {n} eller fler |  |
| `cmdb.n_or_more_files` | {n} or more files | {n} eller fler filer |  |
| `cmdb.n_tool_calls_changed_no_file_and` | {n} tool calls changed no file and the session keeps growing. | {n} verktygsanrop ändrade ingen fil och sessionen fortsätter växa. |  |
| `cmdb.name_edited_n_times` | {name} edited {n} times | {name} ändrad {n} gånger |  |
| `cmdb.never_fired_in_span_did_nothing_fine` | Never fired in {span}. Did nothing (fine if you had no need): {list}{more}. | Utlöstes aldrig på {span}. Gjorde ingenting (bra om du inte behövde det): {list}{more}. |  |
| `cmdb.new_input` | new input | ny indata |  |
| `cmdb.new_since_your_last_message` | new since your last message | ny sedan ditt senaste meddelande |  |
| `cmdb.next_read_due_now` | Next read: due now. | Nästa läsning: dags nu. |  |
| `cmdb.next_read_in_about_n_min` | Next read: in about {n} min. | Nästa läsning: om ungefär {n} min. |  |
| `cmdb.no_changed_path_names_a_goal_word` | no changed path names a goal word | ingen ändrad sökväg nämner ett ord ur målet |  |
| `cmdb.no_check_has_passed_since_the_last` | no check has passed since the last edit | ingen kontroll har gått igenom sedan den senaste ändringen |  |
| `cmdb.no_check_ran` | no check ran | ingen kontroll kördes |  |
| `cmdb.no_check_tests_build_lint_or_type` | No check (tests, build, lint or type check) has run yet. | Ingen kontroll (tester, bygge, lint eller typkontroll) har körts än. |  |
| `cmdb.no_drift` | No drift | Ingen kursavvikelse |  |
| `cmdb.no_failing_step_now` | No failing step now. | Inget misslyckat steg just nu. |  |
| `cmdb.no_file_has_changed_yet_so_there` | No file has changed yet, so there is nothing to be sure of. | Ingen fil har ändrats än, så det finns inget att vara säker på. |  |
| `cmdb.no_finished_answer_yet` | no finished answer yet | inget avslutat svar än |  |
| `cmdb.no_goal_set_vaken_tasks_goal` | no goal set (/vaken-tasks goal) | inget mål satt (/vaken-tasks goal) |  |
| `cmdb.no_passing_check_after_the_last_edit` | no passing check after the last edit | ingen godkänd kontroll efter den senaste ändringen |  |
| `cmdb.no_price_known_for_this_model` | no price known for this model | inget pris känt för den här modellen |  |
| `cmdb.no_read_now_why` | No read now: {why} | Ingen läsning nu: {why} |  |
| `cmdb.no_session_is_running_now` | No session is running now. | Ingen session körs just nu. |  |
| `cmdb.no_test_file_was_touched` | no test file was touched | ingen testfil ändrades |  |
| `cmdb.no_turn_yet_so_no_cache_to` | No turn yet, so no cache to keep. | Ingen tur än, så ingen cache att hålla. |  |
| `cmdb.no_unproven_claims` | No unproven claims | Inga obevisade påståenden |  |
| `cmdb.not_a_check_list_use_tests_build` | Not a check: {list}. Use: tests, build, lint, types. Example: /vaken-ship done tests build lint | Inte en kontroll: {list}. Använd: tests, build, lint, types. Exempel: /vaken-ship done tests build lint |  |
| `cmdb.not_checked_after_the_last_edit_list` | Not checked after the last edit: {list}. | Inte kontrollerat efter den senaste ändringen: {list}. |  |
| `cmdb.not_checked_nothing_every_check_that_matters` | Not checked: nothing. Every check that matters passed after the last edit. | Inte kontrollerat: inget. Alla kontroller som spelar roll gick igenom efter den senaste ändringen. |  |
| `cmdb.not_met_list_still_open` | not met: {list} still open | inte uppfylld: {list} återstår |  |
| `cmdb.not_met_yet` | Not met yet. | Inte uppfylld än. |  |
| `cmdb.not_set_vaken_ship_done` | not set (/vaken-ship done) | inte satt (/vaken-ship done) |  |
| `cmdb.not_yet_list` | not yet: {list} | inte än: {list} |  |
| `cmdb.nothing_counted_yet_ask_again_after_the` | Nothing counted yet. Ask again after the first reply. | Inget räknat än. Fråga igen efter det första svaret. |  |
| `cmdb.nothing_to_check_no_file_changed` | Nothing to check: no file changed. | Inget att kontrollera: ingen fil ändrades. |  |
| `cmdb.nothing_to_extend_no_budget_is_at` | Nothing to extend: no budget is at 80% yet. To raise one anyway: /vaken-usage budget extend session, or /vaken-usage budget extend day. | Inget att utöka: ingen budget är på 80 % än. För att höja en ändå: /vaken-usage budget extend session, eller /vaken-usage budget extend day. |  |
| `cmdb.of` | of | av |  |
| `cmdb.once_a_week_one_line_above_the` | Once a week, one line above the chat box on what vaken did. | En gång i veckan, en rad ovanför chattrutan om vad vaken gjorde. |  |
| `cmdb.other` | Other | Annat |  |
| `cmdb.over_turns_answers_the_session_used_read` | Over {turns} answers the session used {read} tokens read from the cache, {write} written to it, {input} other input and {output} output. No price is known for this model, so there is no dollar figure. | Under {turns} svar använde sessionen {read} tokens lästa från cachen, {write} skrivna till den, {input} annan indata och {output} utdata. Inget pris är känt för den här modellen, så det finns inget dollarbelopp. |  |
| `cmdb.passed_list` | passed: {list} | gick igenom: {list} |  |
| `cmdb.plan_limits_source_the_app_usage_card` | Plan limits. Source: the app usage card, read {ago}. | Plangränser. Källa: appens användningskort, läst {ago}. |  |
| `cmdb.plenty_is_left_nothing_to_share_yet` | Plenty is left. Nothing to share yet. | Det finns gott om kvar. Inget att dela än. |  |
| `cmdb.points_come_only_from_checks_that_ran` | Points come only from checks that ran, not from words. A proof that is missing earns no points. This is not a promise that the work is right. | Poäng kommer bara från kontroller som kördes, inte från ord. Ett bevis som saknas ger inga poäng. Det är inget löfte om att arbetet är rätt. |  |
| `cmdb.proof_for_the_last_answer_time_span` | Proof for the last answer ({time}, {span}). | Bevis för det senaste svaret ({time}, {span}). |  |
| `cmdb.proof_no_finished_answer_yet_the_pack` | Proof: no finished answer yet. The pack appears when an answer ends. | Bevis: inget avslutat svar än. Paketet visas när ett svar tar slut. |  |
| `cmdb.reading_the_saved_session_from_the_cache` | reading the saved session from the cache | att läsa den sparade sessionen från cachen |  |
| `cmdb.reading_this_session_s_cache_once_in` | Reading this session's cache once, in a moment. Run /vaken-help run keeper to see the result. | Läser den här sessionens cache en gång, om en stund. Kör /vaken-help run keeper för att se resultatet. |  |
| `cmdb.reads_since_your_last_answer_n_of` | Reads since your last answer: {n} of {max}. | Läsningar sedan ditt senaste svar: {n} av {max}. |  |
| `cmdb.receipts_are_off_settings_safety_so_nothing` | Receipts are off (Settings &gt; Safety), so nothing new is recorded. | Kvitton är av (Inställningar &gt; Säkerhet), så inget nytt sparas. |  |
| `cmdb.review_queue_changes_riskiest_first` | Review queue: {changes}, riskiest first. | Granskningskö: {changes}, de mest riskfyllda först. |  |
| `cmdb.review_queue_empty_no_finished_answer_has` | Review queue: empty. No finished answer has changed a file yet. | Granskningskö: tom. Inget avslutat svar har ändrat en fil än. |  |
| `cmdb.reviewer_heat_no_changed_file_yet` | Reviewer heat: no changed file yet. | Granskningsvärme: ingen ändrad fil än. |  |
| `cmdb.risk_comes_from_the_kind_of_file` | Risk comes from the kind of file, the size, a missing test and a missing or failing check. It does not say the change is wrong. | Risken kommer av filens slag, storleken, ett saknat test och en saknad eller misslyckad kontroll. Den säger inte att ändringen är fel. |  |
| `cmdb.said_claim_why` | Said {claim}: {why}. | Sa att {claim}: {why}. |  |
| `cmdb.saved_usage` | Saved usage | Sparad användning |  |
| `cmdb.security_related_files` | security-related files | säkerhetsrelaterade filer |  |
| `cmdb.session_budget_add_now_now` | session budget +{add}, now {now} | sessionsbudget +{add}, nu {now} |  |
| `cmdb.sessions_running_nowlist` | {sessions} running now{list}. | {sessions} körs just nu{list}. |  |
| `cmdb.short_test` | (short test) | (kort test) |  |
| `cmdb.short_test_for_10_minutes_the_keeper` | Short test for 10 minutes: the keeper treats the cache as stale after {secs} seconds and ignores the size limit. It needs Keep session cheap set to On, in Settings &gt; Money and plan. Within about a minute it should read the cache, up to {max} times. Run /vaken-help run keeper to see. | Kort test i 10 minuter: cachevakten ser cachen som gammal efter {secs} sekunder och struntar i storleksgränsen. Den kräver att Håll sessionen billig är satt till På, i Inställningar &gt; Pengar och plan. Inom ungefär en minut ska den läsa cachen, upp till {max} gånger. Kör /vaken-help run keeper för att se. |  |
| `cmdb.small_diff` | Small diff | Liten ändring |  |
| `cmdb.source_the_token_counts_the_engine_reported` | Source: the token counts the engine reported for each answer, priced with the list prices of {date}. Estimate. | Källa: de tokenantal motorn rapporterade för varje svar, prissatta med listpriserna från {date}. Uppskattning. |  |
| `cmdb.spending_most_by_the_engine_s_totals` | Spending most, by the engine's totals: {list}. | Störst förbrukning, enligt motorns summor: {list}. |  |
| `cmdb.steps_so_far_files_changed_edits` | Steps so far: {files} changed ({edits}). | Steg hittills: {files} ändrade ({edits}). |  |
| `cmdb.steps_that_failed_and_have_not_worked` | Steps that failed and have not worked since: {n}. | Steg som misslyckades och inte har fungerat sedan dess: {n}. |  |
| `cmdb.stuck_n_calls_no_file_changed` | Stuck? {n} calls, no file changed | Fast? {n} anrop, ingen fil ändrad |  |
| `cmdb.switched_off_in_settings_safety` | (switched off in Settings &gt; Safety) | (avstängd i Inställningar &gt; Säkerhet) |  |
| `cmdb.tests_pass` | tests pass | testerna går igenom |  |
| `cmdb.the_app_s_list` | (the app's list) | (appens lista) |  |
| `cmdb.the_audit_is_full_500_actions_so` | The audit is full (500 actions), so the oldest ones in this time may be missing. | Granskningsloggen är full (500 åtgärder), så de äldsta under den här tiden kan saknas. |  |
| `cmdb.the_budget_is_off_so_there_is` | The budget is off, so there is nothing to extend. Turn it on: Settings &gt; Money and plan. | Budgeten är av, så det finns inget att utöka. Slå på den: Inställningar &gt; Pengar och plan. |  |
| `cmdb.the_build_works` | the build works | bygget fungerar |  |
| `cmdb.the_cache_has_already_gone_stale` | The cache has already gone stale. | Cachen har redan blivit gammal. |  |
| `cmdb.the_confidence_score_is_off_turn_it` | The confidence score is off. Turn it on: Settings &gt; Safety. | Säkerhetspoängen är av. Slå på den: Inställningar &gt; Säkerhet. |  |
| `cmdb.the_definition_of_done_is_not_met` | the definition of done is not met | definitionen av klart är inte uppfylld |  |
| `cmdb.the_engine_s_own_total_for_the` | The engine's own total for the session is {usd}. | Motorns egen summa för sessionen är {usd}. |  |
| `cmdb.the_engine_s_session_total` | the engine's session total | motorns summa för sessionen |  |
| `cmdb.the_keeper_is_off` | The keeper is off. | Cachevakten är av. |  |
| `cmdb.the_label_limit_is_reached_then_reset` | The {label} limit is reached. {then} {reset} | Gränsen ({label}) är nådd. {then} {reset} |  |
| `cmdb.the_last_run_failed` | the last run failed | den senaste körningen misslyckades |  |
| `cmdb.the_model_no_price_known_for_this` | the model (no price known for this one) | modellen (inget pris känt för den här) |  |
| `cmdb.the_n_biggest_answers_made_pct_of` | The {n} biggest answers made {pct} of it. The biggest read {read} tokens from the cache and wrote {write}. | De {n} största svaren stod för {pct} av det. Det största läste {read} tokens från cachen och skrev {write}. |  |
| `cmdb.the_plan_limits_are_not_known_yet` | The plan limits are not known yet. Vaken reads the app usage card, and that has not answered. Type /vaken-usage to read it now. | Plangränserna är inte kända än. Vaken läser appens användningskort, och det har inte svarat. Skriv /vaken-usage för att läsa det nu. |  |
| `cmdb.the_reset_time_is_not_known` | The reset time is not known. | Återställningstiden är inte känd. |  |
| `cmdb.the_same_file_was_edited_n_times` | The same file was edited {n} times in one turn: {name}. | Samma fil ändrades {n} gånger i en tur: {name}. |  |
| `cmdb.the_session_is_busy_the_cache_is` | The session is busy: the cache is in use. | Sessionen är upptagen: cachen används. |  |
| `cmdb.the_session_is_short_a_rewrite_is` | The session is short: a rewrite is cheap. | Sessionen är kort: en omskrivning är billig. |  |
| `cmdb.the_tests` | the tests | testerna |  |
| `cmdb.the_type_check_passes` | the type check passes | typkontrollen går igenom |  |
| `cmdb.the_value_meter_could_not_read_what` | The value meter could not read what vaken wrote down. Try again in a moment. | Värdemätaren kunde inte läsa det vaken skrev ner. Försök igen om en stund. |  |
| `cmdb.the_which_budget_is_still_used_up` | The {which} budget is still used up. Extend again to go on. | Budgeten för {which} är fortfarande slut. Utöka igen för att fortsätta. |  |
| `cmdb.the_why_it_cost_paragraph_is_off` | The "why it cost" paragraph is off. Turn it on: Settings &gt; Money and plan. | Stycket "varför det kostade" är av. Slå på det: Inställningar &gt; Pengar och plan. |  |
| `cmdb.the_window_size_is_not_known_yet` | The window size is not known yet. | Fönstrets storlek är inte känd än. |  |
| `cmdb.the_work_is_done` | the work is done | arbetet är klart |  |
| `cmdb.this_counts_what_vaken_wrote_down_it` | This counts what vaken wrote down. It is not a measure of money saved. | Detta räknar det vaken skrev ner. Det är inget mått på sparade pengar. |  |
| `cmdb.this_is_counted_from_edits_and_checks` | This is counted from edits and checks. It does not prove the goal is reached. | Detta räknas från ändringar och kontroller. Det bevisar inte att målet är nått. |  |
| `cmdb.this_sentence_is_the_one_text_vaken` | This sentence is the one text vaken keeps. Clear it with /vaken-tasks goal clear. | Den här meningen är den enda text vaken sparar. Rensa den med /vaken-tasks goal clear. |  |
| `cmdb.this_session_the_engine_has_not_given` | This session: the engine has not given a total yet. | Den här sessionen: motorn har inte gett någon summa än. |  |
| `cmdb.this_session_usd_so_far_source_the` | This session: {usd} so far. Source: the engine's own total, read {ago}. | Den här sessionen: {usd} hittills. Källa: motorns egen summa, läst {ago}. |  |
| `cmdb.to_share_what_is_left_vaken_cannot` | To share what is left (vaken cannot split a limit for you): | Så här delar du det som är kvar (vaken kan inte dela upp en gräns åt dig): |  |
| `cmdb.today_usd_over_sessions_the_engine_totals` | Today: {usd} over {sessions} (the engine totals vaken saw; a session started earlier counts only from today). | I dag: {usd} över {sessions} (de motorsummor vaken såg; en session som startade tidigare räknas bara från i dag). |  |
| `cmdb.tokens_and_list_prices` | tokens and list prices | tokens och listpriser |  |
| `cmdb.tokens_freed_by_compacting_the_session_times` | Tokens freed by compacting the session {times}: about {k} (estimate). | Tokens som frigjordes genom att komprimera sessionen {times}: ungefär {k} (uppskattning). |  |
| `cmdb.touches_what` | touches {what} | rör {what} |  |
| `cmdb.try_vaken_help_run_keeper_now_one` | Try: /vaken-help run keeper now (one read now) or /vaken-help run keeper test (a one-minute test). | Prova: /vaken-help run keeper now (en läsning nu) eller /vaken-help run keeper test (ett test på en minut). |  |
| `cmdb.turn_it_on_settings_money_and_plan` | Turn it on: Settings &gt; Money and plan. | Slå på den: Inställningar &gt; Pengar och plan. |  |
| `cmdb.turn_it_on_settings_safety` | Turn it on: Settings &gt; Safety. | Slå på den: Inställningar &gt; Säkerhet. |  |
| `cmdb.unexpected_answer` | unexpected answer | oväntat svar |  |
| `cmdb.use_vaken_usage_budget_extend_session_day` | Use: /vaken-usage budget extend \[session\|day\] | Använd: /vaken-usage budget extend \[session\|day\] |  |
| `cmdb.use_vaken_usage_budget_or_vaken_usage` | Use: /vaken-usage budget, or /vaken-usage budget extend \[session\|day\] | Använd: /vaken-usage budget, eller /vaken-usage budget extend \[session\|day\] |  |
| `cmdb.vaken_did_things_for_you_in_span` | Vaken did {things} for you in {span}. | Vaken gjorde {things} åt dig på {span}. |  |
| `cmdb.vaken_has_not_checked_itself_yet_it` | Vaken has not checked itself yet. It does this when a session starts. | Vaken har inte kontrollerat sig själv än. Det görs när en session startar. |  |
| `cmdb.vaken_help_run_confidence_could_not_run` | /vaken-help run confidence could not run just now. | /vaken-help run confidence kunde inte köras just nu. |  |
| `cmdb.vaken_help_run_intent_could_not_run` | /vaken-help run intent could not run just now. | /vaken-help run intent kunde inte köras just nu. |  |
| `cmdb.vaken_ship_done_could_not_run_just` | /vaken-ship done could not run just now. | /vaken-ship done kunde inte köras just nu. |  |
| `cmdb.vaken_ship_heat_could_not_run_just` | /vaken-ship heat could not run just now. | /vaken-ship heat kunde inte köras just nu. |  |
| `cmdb.vaken_ship_proof_could_not_run_just` | /vaken-ship proof could not run just now. | /vaken-ship proof kunde inte köras just nu. |  |
| `cmdb.vaken_ship_queue_could_not_run_just` | /vaken-ship queue could not run just now. | /vaken-ship queue kunde inte köras just nu. |  |
| `cmdb.vaken_ship_reviewed_could_not_run_just` | /vaken-ship reviewed could not run just now. | /vaken-ship reviewed kunde inte köras just nu. |  |
| `cmdb.vaken_tasks_goal_could_not_run_just` | /vaken-tasks goal could not run just now. | /vaken-tasks goal kunde inte köras just nu. |  |
| `cmdb.vaken_wrote_nothing_down_in_span` | Vaken wrote nothing down in {span}. | Vaken skrev inte ner något på {span}. |  |
| `cmdb.waiting_for_your_look_answers_that_changed` | Waiting for your look: {answers} that changed files. Your next message, or /vaken-ship reviewed, clears it. | Väntar på att du tittar: {answers} som ändrade filer. Ditt nästa meddelande, eller /vaken-ship reviewed, rensar det. |  |
| `cmdb.waiting_for_your_look_nothing` | Waiting for your look: nothing. | Väntar på att du tittar: inget. |  |
| `cmdb.was_prev` | (was {prev}) | (var {prev}) |  |
| `cmdb.what_claude_wrote` | what Claude wrote | det Claude skrev |  |
| `cmdb.when_the_same_check_tests_build_lint` | When the same check (tests, build, lint, types) fails {n} times in a row with the same error, Needs you offers a way out: a stronger agent once (only when a stronger model exists), or a fresh start. Nothing runs before you press. Off turns this off too. | När samma kontroll (tester, bygge, lint, typer) misslyckas {n} gånger i rad med samma fel erbjuder Behöver dig en väg ut: en starkare agent en gång (bara när det finns en starkare modell), eller en nystart. Inget körs innan du trycker. Av stänger av detta också. |  |
| `cmdb.where_to_look_first_files_hottest_first` | Where to look first ({files}, hottest first): | Var du ska titta först ({files}, hetast först): |  |
| `cmdb.which_about_usd_of_limitadded_pctover_estimate` | {which}: about {usd} of {limit}{added}, {pct}{over} (estimate; source: {source}). | {which}: ungefär {usd} av {limit}{added}, {pct}{over} (uppskattning; källa: {source}). |  |
| `cmdb.why_list` | Why: {list}. | Varför: {list}. |  |
| `cmdb.why_nothing_stands_out` | Why: nothing stands out. | Varför: inget sticker ut. |  |
| `cmdb.writing_the_session_to_the_cache` | writing the session to the cache | att skriva sessionen till cachen |  |

## cmdc

Shown from the code. (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `cmdc.a_mod_cannot_switch_sessions_for_you` | A mod cannot switch sessions for you. Click the link, or find the session in the sidebar by its title. | En mod kan inte byta session åt dig. Klicka på länken, eller hitta sessionen i sidofältet på dess titel. |  |
| `cmdc.add_one_to_claude_settings_json_in` | Add one to .claude/settings.json in the project, under "permissions" &gt; "allow". Vaken never changes that file. | Lägg till en i .claude/settings.json i projektet, under "permissions" &gt; "allow". vaken ändrar aldrig den filen. |  |
| `cmdc.after_a_limit_mode` | After a limit: {mode}. | Efter en gräns: {mode}. |  |
| `cmdc.allow_once_not_set_after_a_step` | Allow once: not set. After a step is stopped, /vaken-guard allow once lets the next one through. | Tillåt en gång: inte satt. När ett steg har stoppats släpper /vaken-guard allow once igenom nästa. |  |
| `cmdc.allow_once_ready_the_next_stopped_step` | Allow once: ready. The next stopped step will go through. | Tillåt en gång: klart. Nästa stoppade steg släpps igenom. |  |
| `cmdc.allow_rules_are_off_vaken_settings_allow` | Allow rules are off. /vaken-settings allow.rules offer turns them on. | Tillåtelseregler är av. /vaken-settings allow.rules offer slår på dem. |  |
| `cmdc.allow_rules_when_you_allow_the_same` | Allow rules: when you allow the same kind of step 3 times in a week, vaken shows the rule once. | Tillåtelseregler: när du tillåter samma sorts steg 3 gånger på en vecka visar vaken regeln en gång. |  |
| `cmdc.already_paused_resume_with_vaken_pause_off` | Already paused. Resume with /vaken-pause off. | Redan pausad. Återuppta med /vaken-pause off. |  |
| `cmdc.and_n_more_names` | - and {n} more: {names} | - och {n} till: {names} |  |
| `cmdc.answer_the_question_claude_asked` | answer the question Claude asked | svara på frågan som Claude ställde |  |
| `cmdc.archived` | archived | arkiverad |  |
| `cmdc.at_least` | at least | minst |  |
| `cmdc.away_mode_is_on_since_time_it` | Away mode is on since {time}. It stays on until you type /vaken-away off. | Frånvaroläget har varit på sedan {time}. Det är på tills du skriver /vaken-away off. |  |
| `cmdc.away_mode_is_on_since_time_it_2` | Away mode is on since {time}. It ends at {end} (in {wait}), or when you type /vaken-away off. | Frånvaroläget har varit på sedan {time}. Det slutar kl. {end} (om {wait}), eller när du skriver /vaken-away off. |  |
| `cmdc.away_mode_is_still_on_vaken_away` | Away mode is still on. /vaken-away off ends it and keeps the digest. | Frånvaroläget är fortfarande på. /vaken-away off avslutar det och sparar sammanfattningen. |  |
| `cmdc.both_go_back_when_away_mode_ends` | Both go back when away mode ends. | Båda sätts tillbaka när frånvaroläget tar slut. |  |
| `cmdc.branch_branch` | , branch: {branch} | , gren: {branch} |  |
| `cmdc.cancelled_nothing_waits_for_a_reset_in` | Cancelled. Nothing waits for a reset in this session now. | Avbrutet. Inget väntar på en återställning i den här sessionen nu. |  |
| `cmdc.cancelled_waits_a_paused_task_run_stays` | Cancelled {waits}. A paused task run stays paused: /vaken-tasks go starts it again. | Avbröt {waits}. En pausad uppgiftskörning förblir pausad: /vaken-tasks go startar den igen. |  |
| `cmdc.change_a_check_settings_safety_these_checks` | Change a check: Settings &gt; Safety. These checks read the text of a step. They are reminders and speed bumps, not a lock. | Ändra en kontroll: Inställningar &gt; Säkerhet. Kontrollerna läser texten i ett steg. De är påminnelser och farthinder, inte ett lås. |  |
| `cmdc.check_kind_result` | Check: {kind} {result} | Kontroll: {kind} {result} |  |
| `cmdc.check_these_by_hand_files` | Check these by hand: {files}. | Kontrollera dessa själv: {files}. |  |
| `cmdc.checkpoint_name_saved_bits_go_back_to` | Checkpoint "{name}" saved: {bits}. Go back to it with /vaken-undo name {name} (a preview comes first). | Kontrollpunkten "{name}" är sparad: {bits}. Gå tillbaka till den med /vaken-undo name {name} (en förhandsvisning kommer först). |  |
| `cmdc.claude_changed_files_in_edits_over_answers` | Claude changed {files} in {edits} over {answers}, and ran {checks}{kinds}. | Claude ändrade {files} i {edits} under {answers} och körde {checks}{kinds}. |  |
| `cmdc.command_kind_endexit_label` | Command ({kind}), {end}{exit}: {label} | Kommando ({kind}), {end}{exit}: {label} |  |
| `cmdc.cost_about_usd_in_sessions_as_vaken` | Cost: about {usd} in {sessions}, as vaken counted it. | Kostnad: ungefär {usd} i {sessions}, som vaken räknade det. |  |
| `cmdc.cost_not_counted_today` | Cost: not counted today. | Kostnad: inte räknad i dag. |  |
| `cmdc.database_migrations_that_change_the_structure` | Database migrations that change the structure | Databasmigreringar som ändrar strukturen |  |
| `cmdc.day_sessions_had_work_files_changedacted` | {day}: {sessions} had work, {files} changed{acted}. | {day}: {sessions} hade arbete, ändringar i {files}{acted}. |  |
| `cmdc.deletes_force_pushes_wipes_sql_that_drops` | Deletes, force-pushes, wipes, SQL that drops or empties data, cloud and database deletes, and package publishes | Raderingar, force-push, rensningar, SQL som tar bort eller tömmer data, borttagningar i molnet och i databaser, och publicering av paket |  |
| `cmdc.destroying_data_and_exposing_secrets_stop_by` | Destroying data and exposing secrets stop by default when Claude Code would not ask first (auto mode, bypass permissions or an allow rule). Where it asks, they only warn. If vaken cannot tell, they warn. A choice you make here always wins. | Att förstöra data och avslöja hemligheter stoppas som standard när Claude Code inte skulle fråga först (auto-läge, kringgå behörigheter eller en tillåtelseregel). Där Claude Code frågar varnar vaken bara. Om vaken inte kan avgöra det varnar den. Ett val du gör här gäller alltid. |  |
| `cmdc.done_the_next_stopped_step_goes_through` | Done. The next stopped step goes through, once. | Klart. Nästa stoppade steg släpps igenom, en gång. |  |
| `cmdc.done_the_step_held_last_goes_through` | Done. The step held last goes through, once, and no other stopped step. | Klart. Steget som stoppades senast släpps igenom, en gång, och inget annat stoppat steg. |  |
| `cmdc.due_now` |  (due now) |  (dags nu) |  |
| `cmdc.edited_files_lines_in_one_answer` | Edited {files} ({lines}) in one answer | Ändrade {files} ({lines}) i ett svar |  |
| `cmdc.edits_outside_the_folders_you_set_and` | Edits outside the folders you set, and edits to protected files | Ändringar utanför mapparna du har valt, och ändringar i skyddade filer |  |
| `cmdc.edits_to_test_files_that_skip_tests` | Edits to test files that skip tests or remove checks | Ändringar i testfiler som hoppar över tester eller tar bort kontroller |  |
| `cmdc.exit_n` | (exit {n}) | (felkod {n}) |  |
| `cmdc.finished_work_to_look_at_in_names` | finished work to look at in {names} | färdigt arbete att titta på i {names} |  |
| `cmdc.folder_folder` | Folder: {folder} | Mapp: {folder} |  |
| `cmdc.git_will_show_it_as_a_new` | Git will show it as a new file. Add {packet} to .gitignore if you do not want to commit it. | Git visar den som en ny fil. Lägg till {packet} i .gitignore om du inte vill committa den. |  |
| `cmdc.go_back_to_one_vaken_undo_name` | Go back to one: /vaken-undo name &lt;checkpoint&gt; (a preview comes first). Name the present state: /vaken-undo checkpoint &lt;name&gt;. | Gå tillbaka till en: /vaken-undo name &lt;kontrollpunkt&gt; (en förhandsvisning kommer först). Namnge nuvarande tillstånd: /vaken-undo checkpoint &lt;namn&gt;. |  |
| `cmdc.goal_set_by_you` | Goal set by you | Målet satt av dig |  |
| `cmdc.goal_taken_from_your_first_message` | Goal taken from your first message | Målet hämtades från ditt första meddelande |  |
| `cmdc.group_group` | , group: {group} | , grupp: {group} |  |
| `cmdc.if_an_edit_went_wrong_vaken_undo` |  If an edit went wrong: /vaken-undo last. |  Om en ändring blev fel: /vaken-undo last. |  |
| `cmdc.in_this_mode_claude_code_does_not` |  In this mode Claude Code does not ask first, so risky commands and secrets stop even on Warn. |  I det här läget frågar Claude Code inte först, så riskabla kommandon och hemligheter stoppas även på Varna. |  |
| `cmdc.it_answered_in_a_form_vaken_does` | It answered in a form vaken does not know. | Det svarade i en form som vaken inte känner igen. |  |
| `cmdc.it_is_running_now` | , it is running now | , den körs nu |  |
| `cmdc.it_stands_at_the_start_no_work` | It stands at the start: no work is counted yet. | Allt står vid starten: inget arbete är räknat än. |  |
| `cmdc.it_was_not_halted` | It was not halted. | Den var inte pausad. |  |
| `cmdc.kind_failed_times` | {kind} failed {times} | {kind} misslyckades {times} |  |
| `cmdc.last` | Last: | Senast: |  |
| `cmdc.last_activity_when` | Last activity: {when} | Senaste aktivitet: {when} |  |
| `cmdc.last_changed_files_copies_kept_used_of` | Last changed files ({copies} kept, {used} of {max}): | Senast ändrade filer ({copies} sparade, {used} av {max}): |  |
| `cmdc.left_for_you_because_vaken_never_deletes` | Left for you, because vaken never deletes a file: | Kvar åt dig, eftersom vaken aldrig raderar en fil: |  |
| `cmdc.limits_200_copies_and_20_mb_per` | Limits: 200 copies and 20 MB per session, files up to 1 MB, never .git, node\_modules, or secret-looking names or contents. The copy folder is private to you. A shell command is read by its text, so a command that writes through a script, a glob or git is not seen. Restoring never deletes a file. | Gränser: 200 kopior och 20 MB per session, filer upp till 1 MB, aldrig .git, node\_modules eller namn och innehåll som ser hemliga ut. Kopiemappen är privat för dig. Ett skalkommando läses efter sin text, så ett kommando som skriver via ett skript, ett mönster eller git syns inte. Att återställa raderar aldrig en fil. |  |
| `cmdc.look_at_the_finished_work` | look at the finished work | titta på det färdiga arbetet |  |
| `cmdc.made_from_what_vaken_kept_the_last` | Made from what vaken kept: the last 50 commands, 60 checks and 20 edit turns, and its ledger. Older items are gone. /vaken-resume timeline &lt;number&gt; shows that many. | Gjord av det vaken sparade: de senaste 50 kommandona, 60 kontrollerna och 20 ändringsomgångarna, och dess logg. Äldre saker är borta. /vaken-resume timeline &lt;nummer&gt; visar så många. |  |
| `cmdc.make_kinds_pass_as_the_definition_of` | make {kinds} pass, as the definition of done asks | få {kinds} att gå igenom, som definitionen av klart kräver |  |
| `cmdc.messages_posts_payments_pull_requests_and_cloud` | Messages, posts, payments, pull requests and cloud changes | Meddelanden, inlägg, betalningar, pull requests och ändringar i molnet |  |
| `cmdc.n_copies_dropped_to_stay_inside_the` | one: , {n} copy dropped to stay inside the limits<br>other: , {n} copies dropped to stay inside the limits | one: , {n} kopia släpptes för att hålla sig inom gränserna<br>other: , {n} kopior släpptes för att hålla sig inom gränserna |  |
| `cmdc.n_files_could_not_be_kept_too` | one: {n} file could not be kept (too big, secret-looking or not plain text)<br>other: {n} files could not be kept (too big, secret-looking or not plain text) | one: {n} fil kunde inte sparas (för stor, ser hemlig ut eller inte ren text)<br>other: {n} filer kunde inte sparas (för stora, ser hemliga ut eller inte ren text) |  |
| `cmdc.n_files_held` | one: {n} file held<br>other: {n} files held | one: {n} fil sparad<br>other: {n} filer sparade |  |
| `cmdc.n_files_not_there_now` | one: {n} file not there now<br>other: {n} files not there now | one: {n} fil finns inte kvar nu<br>other: {n} filer finns inte kvar nu |  |
| `cmdc.name_cannot_be_restored_why` | {name}: cannot be restored, {why}. | {name}: kan inte återställas, {why}. |  |
| `cmdc.name_did_not_exist_then_vaken_does` | {name}: did not exist then. Vaken does not delete files. To remove it yourself: {cmd} | {name}: fanns inte då. Vaken raderar inga filer. Så här tar du bort den själv: {cmd} |  |
| `cmdc.name_goal_n_files_changed` | one: - {name}: {goal} ({n} file changed)<br>other: - {name}: {goal} ({n} files changed) | one: - {name}: {goal} ({n} fil ändrad)<br>other: - {name}: {goal} ({n} filer ändrade) |  |
| `cmdc.name_made_by_tool_and_it_is` | {name}: made by {tool}, and it is gone now. Nothing to do. | {name}: skapad av {tool}, och den är borta nu. Inget att göra. |  |
| `cmdc.name_made_by_tool_there_was_no` | {name}: made by {tool}. There was no earlier version, and vaken does not delete files. To remove it yourself: {cmd} | {name}: skapad av {tool}. Det fanns ingen tidigare version, och vaken raderar inga filer. Så här tar du bort den själv: {cmd} |  |
| `cmdc.name_the_present_state_vaken_undo_checkpoint` | Name the present state: /vaken-undo checkpoint &lt;name&gt;. | Namnge nuvarande tillstånd: /vaken-undo checkpoint &lt;namn&gt;. |  |
| `cmdc.name_was_back_to_how_it_was` | {name}: {was} (back to how it was before {tool} at {time}) | {name}: {was} (tillbaka till hur den var före {tool} kl. {time}) |  |
| `cmdc.named_names` | Named: {names}. | Namngivna: {names}. |  |
| `cmdc.new_packages_that_look_odd_very_young` | New packages that look odd (very young, look-alike names, deprecated) | Nya paket som ser konstiga ut (mycket nya, namn som liknar andra, utfasade) |  |
| `cmdc.next_list` | Next: {list}. | Härnäst: {list}. |  |
| `cmdc.next_nothing_waits_that_vaken_can_see` | Next: nothing waits that vaken can see. | Härnäst: inget väntar som vaken kan se. |  |
| `cmdc.no_copy_kept_in_this_session` | No copy kept in this session. | Ingen kopia sparad i den här sessionen. |  |
| `cmdc.no_file_has_been_changed_in_this` | No file has been changed in this session yet, so there is nothing to undo. | Ingen fil har ändrats i den här sessionen ännu, så det finns inget att ångra. |  |
| `cmdc.no_file_has_been_changed_in_this_2` | No file has been changed in this session yet, so there is nothing to name. | Ingen fil har ändrats i den här sessionen ännu, så det finns inget att namnge. |  |
| `cmdc.no_folders_set_vaken_guard_scope_folders` | No folders set. /vaken-guard scope &lt;folders...&gt; sets them for this session. | Inga mappar valda. /vaken-guard scope &lt;mappar...&gt; väljer dem för den här sessionen. |  |
| `cmdc.no_goal_set` | no goal set | inget mål satt |  |
| `cmdc.no_named_checkpoint_yet_name_the_present` | No named checkpoint yet. Name the present state: /vaken-undo checkpoint &lt;name&gt;. | Ingen namngiven kontrollpunkt ännu. Namnge nuvarande tillstånd: /vaken-undo checkpoint &lt;namn&gt;. |  |
| `cmdc.no_rule_offered_yet` | No rule offered yet. | Ingen regel har föreslagits ännu. |  |
| `cmdc.no_session_found_for_words_in_source` | No session found for "{words}" in {source}. Try fewer words, or a word from its folder or branch. The session you are in now is not listed. | Ingen session hittades för "{words}" i {source}. Försök med färre ord, eller ett ord från dess mapp eller gren. Sessionen du är i nu finns inte med i listan. |  |
| `cmdc.no_session_mentions_query_the_search_looks` | No session mentions "{query}". The search looks at the other sessions, not this one. | Ingen session nämner "{query}". Sökningen tittar i de andra sessionerna, inte i den här. |  |
| `cmdc.no_shell_command_kept_yet` | No shell command kept yet. | Inget skalkommando sparat ännu. |  |
| `cmdc.not_paused` | Not paused. | Inte pausad. |  |
| `cmdc.not_paused_vaken_pause_pauses_scope` | Not paused. /vaken-pause pauses {scope}. | Inte pausad. /vaken-pause pausar {scope}. |  |
| `cmdc.not_restored_files_they_are_a_link` | one: Not restored: {files}. It is a link, below a linked folder, or outside the project, and vaken does not write through a link. Nothing was changed in that file.<br>other: Not restored: {files}. They are a link, below a linked folder, or outside the project, and vaken does not write through a link. Nothing was changed in those files. | one: Inte återställd: {files}. Den är en länk, ligger under en länkad mapp eller utanför projektet, och vaken skriver inte genom en länk. Inget ändrades i den filen.<br>other: Inte återställda: {files}. De är länkar, ligger under en länkad mapp eller utanför projektet, och vaken skriver inte genom en länk. Inget ändrades i de filerna. |  |
| `cmdc.not_restored_files_vaken_could_not_keep` | one: Not restored: {files}. Vaken could not keep a copy of it as it is now (too big, secret-looking, not plain text, or the copy could not be written), so a restore could not be undone. Nothing was changed in that file.<br>other: Not restored: {files}. Vaken could not keep a copy of them as they are now (too big, secret-looking, not plain text, or the copy could not be written), so a restore could not be undone. Nothing was changed in those files. | one: Inte återställd: {files}. Vaken kunde inte spara en kopia av den som den är nu (för stor, ser hemlig ut, inte ren text, eller så gick kopian inte att skriva), så en återställning kunde inte ångras. Inget ändrades i den filen.<br>other: Inte återställda: {files}. Vaken kunde inte spara en kopia av dem som de är nu (för stora, ser hemliga ut, inte ren text, eller så gick kopian inte att skriva), så en återställning kunde inte ångras. Inget ändrades i de filerna. |  |
| `cmdc.nothing` | nothing | inget |  |
| `cmdc.nothing_is_on_hold_now_set_a` |  Nothing is on Hold now: set a check to Hold in Settings &gt; Safety. |  Inget är satt till Stoppa nu: sätt en kontroll till Stoppa i Inställningar &gt; Säkerhet. |  |
| `cmdc.nothing_is_waiting` | Nothing is waiting. | Inget väntar. |  |
| `cmdc.nothing_to_report_yet_today_no_session` | Nothing to report yet today: no session has changed a file or run a check. Vaken acted {times}. | Inget att rapportera ännu i dag: ingen session har ändrat en fil eller kört en kontroll. Vaken agerade {times}. |  |
| `cmdc.nothing_to_show_yet_vaken_has_kept` | Nothing to show yet: vaken has kept no event for this session. | Inget att visa ännu: vaken har inte sparat någon händelse för den här sessionen. |  |
| `cmdc.nothing_was_changed_yet_before_a_restore` | Nothing was changed yet. Before a restore vaken keeps a copy of the files as they are now, so a restore can be undone too. To go ahead: {confirm} | Inget har ändrats ännu. Före en återställning sparar vaken en kopia av filerna som de är nu, så även en återställning kan ångras. För att köra: {confirm} |  |
| `cmdc.nothing_was_restored` | Nothing was restored. | Inget återställdes. |  |
| `cmdc.nothing_was_waiting_for_a_reset` | Nothing was waiting for a reset. | Inget väntade på en återställning. |  |
| `cmdc.nothing_was_written` | Nothing was written. | Inget skrevs. |  |
| `cmdc.nothing_was_written_the_question_was_not` | Nothing was written: the question was not answered. | Inget skrevs: frågan besvarades inte. |  |
| `cmdc.offered_so_far` | Offered so far: | Föreslagna hittills: |  |
| `cmdc.ok` | ok | ok |  |
| `cmdc.open_find_it_in_the_sidebar_by` | Open: find it in the sidebar by its title. | Öppna: hitta den i sidofältet på dess titel. |  |
| `cmdc.open_link` | Open: {link} | Öppna: {link} |  |
| `cmdc.open_no_link_is_available_find_it` | Open: no link is available. Find it in the sidebar by its title. | Öppna: ingen länk finns. Hitta den i sidofältet på dess titel. |  |
| `cmdc.open_the_sidebar_and_look_for_the` | Open the sidebar and look for the session by hand. | Öppna sidofältet och leta efter sessionen själv. |  |
| `cmdc.paused_for_safety_scope_are_stopped_in` | Paused for safety. {scope} are stopped in this session. Resume with /vaken-pause off. | Pausad för säkerhets skull. {scope} är stoppade i den här sessionen. Återuppta med /vaken-pause off. |  |
| `cmdc.paused_for_safety_scope_are_stopped_in_2` | Paused for safety. {scope} are stopped in this session. Reading still works. A step that is already running keeps running. Resume with /vaken-pause off. | Pausad för säkerhets skull. {scope} är stoppade i den här sessionen. Att läsa fungerar fortfarande. Ett steg som redan körs fortsätter. Återuppta med /vaken-pause off. |  |
| `cmdc.paused_scope_are_stopped_in_this_session` | PAUSED: {scope} are stopped in this session. Resume with /vaken-pause off. | PAUSAD: {scope} är stoppade i den här sessionen. Återuppta med /vaken-pause off. |  |
| `cmdc.pick_a_name_with_letters_or_numbers` | Pick a name with letters or numbers, for example /vaken-undo checkpoint before-refactor. "list", "yes", "name", "on" and "off" are taken. | Välj ett namn med bokstäver eller siffror, till exempel /vaken-undo checkpoint before-refactor. "list", "yes", "name", "on" och "off" är upptagna. |  |
| `cmdc.pick_a_number_from_1_to_max` | Pick a number from 1 to {max} (see /vaken-undo). | Välj ett nummer från 1 till {max} (se /vaken-undo). |  |
| `cmdc.removed_removed_added_added` | {removed} removed, {added} added | {removed} borttagna, {added} tillagda |  |
| `cmdc.restored_files_check` | Restored {files}; {check} | Återställde {files}; {check} |  |
| `cmdc.resumed_steps_that_change_things_work_again` | Resumed. Steps that change things work again in this session. | Återupptagen. Steg som ändrar saker fungerar igen i den här sessionen. |  |
| `cmdc.run_kinds` | run {kinds} | kör {kinds} |  |
| `cmdc.run_the_preview_first_command_the_list` | Run the preview first: {command}. The list may have changed since you last looked, and a restore only happens after you have seen what it does. | Kör förhandsvisningen först: {command}. Listan kan ha ändrats sedan du tittade senast, och en återställning sker först när du har sett vad den gör. |  |
| `cmdc.said_it_fades_if_not_used_within` | {said} It fades if not used within 30 minutes.{tail} | {said} Den försvinner om den inte används inom 30 minuter.{tail} |  |
| `cmdc.saved_points` | Saved points: | Sparade punkter: |  |
| `cmdc.saved_points_names_go_back_vaken_undo` | Saved points: {names}. Go back: /vaken-undo name &lt;checkpoint&gt;. | Sparade punkter: {names}. Gå tillbaka: /vaken-undo name &lt;kontrollpunkt&gt;. |  |
| `cmdc.say_how_long_like_this_vaken_away` | Say how long like this: /vaken-away on 2h, /vaken-away on 90m, /vaken-away on 1h30m. It can be from 1 minute to 24 hours. | Säg hur länge så här: /vaken-away on 2h, /vaken-away on 90m, /vaken-away on 1h30m. Det kan vara från 1 minut till 24 timmar. |  |
| `cmdc.say_which_checkpoint_vaken_undo_name_checkpoint` | Say which checkpoint: /vaken-undo name &lt;checkpoint&gt;. | Säg vilken kontrollpunkt: /vaken-undo name &lt;kontrollpunkt&gt;. |  |
| `cmdc.search_tool` | search tool | sökverktyget |  |
| `cmdc.secret_files_read_keys_printed_and_secrets` | Secret files read, keys printed, and secrets sent off this computer | Hemliga filer som läses, nycklar som skrivs ut och hemligheter som skickas från den här datorn |  |
| `cmdc.see_what_a_restore_would_do_vaken` | See what a restore would do: /vaken-undo &lt;number&gt;. Put back everything changed since your last message: /vaken-undo last. Nothing changes until you add yes. | Se vad en återställning skulle göra: /vaken-undo &lt;nummer&gt;. Sätt tillbaka allt som ändrats sedan ditt senaste meddelande: /vaken-undo last. Inget ändras förrän du lägger till yes. |  |
| `cmdc.session_list` | session list | sessionslistan |  |
| `cmdc.session_names_may_be_old_the_app` | (Session names may be old: the app did not answer.) | (Sessionsnamnen kan vara gamla: appen svarade inte.) |  |
| `cmdc.session_started` | Session started | Sessionen startade |  |
| `cmdc.shell_commands_file_edits_tools_from_other` | shell commands, file edits, tools from other apps, agents, web fetches and skills | skalkommandon, filändringar, verktyg från andra appar, agenter, webbhämtningar och färdigheter |  |
| `cmdc.shell_commands_in_this_session_in_order` | Shell commands in this session, in order (the last {n} at most; kind, time, how it ended, a label of the program and the kind, never the arguments). | Skalkommandon i den här sessionen, i ordning (högst de senaste {n}; sort, tid, hur det slutade, en etikett med programmet och sorten, aldrig argumenten). |  |
| `cmdc.so_far_claude_has_not_changed_a` | So far Claude has not changed a file or run a check. | Hittills har Claude inte ändrat någon fil eller kört någon kontroll. |  |
| `cmdc.so_far_while_you_are_away` | So far while you are away | Hittills medan du är borta |  |
| `cmdc.stop_the_step_is_stopped_until_you` | stop (the step is stopped until you allow it) | stoppa (steget stoppas tills du tillåter det) |  |
| `cmdc.stopped_by_the_guard` | stopped by the guard | stoppad av säkerhetskontrollen |  |
| `cmdc.stopped_by_the_safety_check` | stopped by the safety check | stoppad av säkerhetskontrollen |  |
| `cmdc.that_did_not_work_why` | That did not work: {why} | Det gick inte: {why} |  |
| `cmdc.the_app_s_session_list` | the app's session list | appens sessionslista |  |
| `cmdc.the_app_s_what_did_not_answer` | The app's {what} did not answer, so there is nothing to show. | Appens {what} svarade inte, så det finns inget att visa. |  |
| `cmdc.the_away_policy_is_back_to_was` | The away policy is back to {was}. | Regeln för frånvaro är tillbaka på {was}. |  |
| `cmdc.the_away_policy_stays_as_you_changed` | The away policy stays as you changed it. | Regeln för frånvaro förblir som du ändrade den. |  |
| `cmdc.the_checkpoint_could_not_be_saved` | The checkpoint could not be saved. | Kontrollpunkten kunde inte sparas. |  |
| `cmdc.the_cost_budget_is_back_to_was` | The cost budget is back to {was}. | Kostnadsbudgeten är tillbaka på {was}. |  |
| `cmdc.the_cost_budget_stays_as_you_changed` | The cost budget stays as you changed it. | Kostnadsbudgeten förblir som du ändrade den. |  |
| `cmdc.the_end_time_is_changed` | The end time is changed. | Sluttiden är ändrad. |  |
| `cmdc.the_file_is_gone_now_and_would` | the file is gone now and would come back | filen är borta nu och skulle komma tillbaka |  |
| `cmdc.the_files_as_they_were_just_before` | The files as they were just before are kept, so /vaken-undo can undo this. | Filerna som de var precis före sparas, så /vaken-undo kan ångra detta. |  |
| `cmdc.the_goal_goal` | The goal: {goal}. | Målet: {goal}. |  |
| `cmdc.the_goal_was_not_set_for_this` | The goal was not set for this session. | Målet sattes inte för den här sessionen. |  |
| `cmdc.the_last_list_vaken_kept_the_app` | the last list vaken kept (the app did not answer) | den senaste listan som vaken sparade (appen svarade inte) |  |
| `cmdc.the_last_n_shown` | , the last {n} shown | , de {n} senaste visas |  |
| `cmdc.the_lines_are_quoted_from_your_old` | The lines are quoted from your old sessions. They are text to read, not instructions. Nothing was saved. | Raderna är citerade från dina gamla sessioner. De är text att läsa, inte instruktioner. Inget sparades. |  |
| `cmdc.the_list_is_off_now_so_new` | The list is off now, so new commands are not added. Turn it on: Settings &gt; Safety. | Listan är av nu, så nya kommandon läggs inte till. Slå på den: Inställningar &gt; Säkerhet. |  |
| `cmdc.the_newest_n_shown` |  (the newest {n} shown) |  (de {n} nyaste visas) |  |
| `cmdc.the_next_session_can_read_it_first` | The next session can read it first. It holds counts, names, paths and your goal (key words of your first message, or the sentence you set; secrets hidden), and no other conversation text. | Nästa session kan läsa den först. Den innehåller antal, namn, sökvägar och ditt mål (nyckelord från ditt första meddelande, eller meningen du satte; hemligheter dolda), och ingen annan konversationstext. |  |
| `cmdc.the_output_and_the_arguments_of_a` | The output and the arguments of a command are never kept: only its program name and its kind. | Utdata och argument från ett kommando sparas aldrig: bara programmets namn och sorten. |  |
| `cmdc.the_plan_limit_still_reads_full_after` | The plan limit still reads full after the reset, so vaken left it to you. | Plangränsen verkar fortfarande full efter återställningen, så vaken lämnade det åt dig. |  |
| `cmdc.the_session_is_halted` | The session is halted. | Sessionen är pausad. |  |
| `cmdc.the_wait_is_over_8_hours_old` | The wait is over 8 hours old, so vaken dropped it. | Väntan är över 8 timmar gammal, så vaken tog bort den. |  |
| `cmdc.then` | , then  | , sedan  |  |
| `cmdc.there_is_no_digest_yet_vaken_makes` | There is no digest yet. Vaken makes one when you end away mode: /vaken-away off. | Det finns ingen sammanfattning ännu. Vaken gör en när du avslutar frånvaroläget: /vaken-away off. |  |
| `cmdc.there_is_no_number_n_in_the` | There is no number {n} in the list. Run /vaken-undo to see it. | Det finns inget nummer {n} i listan. Kör /vaken-undo för att se den. |  |
| `cmdc.timeline_of_this_session_eventsshown_oldest_first` | Timeline of this session: {events}{shown}. Oldest first. | Tidslinje för den här sessionen: {events}{shown}. Äldst först. |  |
| `cmdc.turn_it_on_settings_money_and_plan` |  Turn it on: Settings &gt; Money and plan. |  Slå på det: Inställningar &gt; Pengar och plan. |  |
| `cmdc.type_a_number_vaken_resume_timeline_20` | Type a number: /vaken-resume timeline 20 shows the last 20 events. | Skriv ett tal: /vaken-resume timeline 20 visar de senaste 20 händelserna. |  |
| `cmdc.type_at_least_n_characters_vaken_resume` | Type at least {n} characters: /vaken-resume find &lt;words&gt;. It searches what was said in your other sessions. | Skriv minst {n} tecken: /vaken-resume find &lt;ord&gt;. Den söker i det som sagts i dina andra sessioner. |  |
| `cmdc.undo_is_off_so_no_new_copies` | Undo is off, so no new copies are kept. Turn it on in Settings &gt; Safety. Copies kept earlier can still be restored. | Ångra är av, så inga nya kopior sparas. Slå på det i Inställningar &gt; Säkerhet. Kopior som sparades tidigare kan fortfarande återställas. |  |
| `cmdc.undo_preview_for_path` | Undo preview for {path}. | Förhandsvisning av att ångra {path}. |  |
| `cmdc.use_vaken_guard_allow_once` | Use: /vaken-guard allow once | Använd: /vaken-guard allow once |  |
| `cmdc.use_vaken_guard_vaken_guard_allow_once` | Use: /vaken-guard, /vaken-guard allow once, /vaken-guard rules, /vaken-guard scope &lt;folders...&gt; or /vaken-guard scope off | Använd: /vaken-guard, /vaken-guard allow once, /vaken-guard rules, /vaken-guard scope &lt;mappar...&gt; eller /vaken-guard scope off |  |
| `cmdc.use_vaken_pause_to_stop_vaken_pause` | Use /vaken-pause to stop, /vaken-pause off to lift it, /vaken-pause status to look. | Använd /vaken-pause för att stoppa, /vaken-pause off för att häva det och /vaken-pause status för att titta. |  |
| `cmdc.use_vaken_undo_vaken_undo_number_vaken` | Use: /vaken-undo, /vaken-undo &lt;number&gt;, /vaken-undo last, /vaken-undo name &lt;checkpoint&gt;. Add yes to restore. | Använd: /vaken-undo, /vaken-undo &lt;nummer&gt;, /vaken-undo last, /vaken-undo name &lt;kontrollpunkt&gt;. Lägg till yes för att återställa. |  |
| `cmdc.vaken_acted_times` | , vaken acted {times} | , vaken agerade {times} |  |
| `cmdc.vaken_also_did_this_list` | Vaken also did this: {list} | Vaken gjorde också detta: {list} |  |
| `cmdc.vaken_saw_nothing_fail` | Vaken saw nothing fail. | Vaken såg inget misslyckas. |  |
| `cmdc.vaken_set_the_away_policy_to_to` | Vaken set the away policy to {to} (it was {was}): risky steps are stopped by themselves. | Vaken satte regeln för frånvaro till {to} (den var {was}): riskabla steg stoppas av sig själva. |  |
| `cmdc.vaken_set_the_cost_budget_to_to` | Vaken set the cost budget to {to} (it was {was}): costly calls stop at 100%. | Vaken satte kostnadsbudgeten till {to} (den var {was}): dyra anrop stoppas vid 100 %. |  |
| `cmdc.vaken_set_the_cost_budget_to_to_2` | Vaken set the cost budget to {to} at {limit} a session (it was {was}): costly calls stop at 100%. | Vaken satte kostnadsbudgeten till {to} med {limit} per session (den var {was}): dyra anrop stoppas vid 100 %. |  |
| `cmdc.waiting_since_since_it_reminds_you_at` | Waiting since {since}. It reminds you at {at}{due}. Resumes today: {done} of {max}. Cancel: /vaken-help run after-limit off (this session) or off all (every session and the task runner). | Väntar sedan {since}. Den påminner dig kl. {at}{due}. Återupptagningar i dag: {done} av {max}. Avbryt: /vaken-help run after-limit off (den här sessionen) eller off all (alla sessioner och uppgiftskörningen). |  |
| `cmdc.waiting_since_since_it_sends_continue_at` | Waiting since {since}. It sends "continue" at {at}{due}. Resumes today: {done} of {max}. Cancel: /vaken-help run after-limit off (this session) or off all (every session and the task runner). | Väntar sedan {since}. Den skickar "continue" kl. {at}{due}. Återupptagningar i dag: {done} av {max}. Avbryt: /vaken-help run after-limit off (den här sessionen) eller off all (alla sessioner och uppgiftskörningen). |  |
| `cmdc.waiting_wait_cost` | Waiting: {wait}. {cost} | Väntar: {wait}. {cost} |  |
| `cmdc.warn_the_step_runs_and_claude_is` | warn (the step runs and Claude is told) | varna (steget körs och Claude får veta) |  |
| `cmdc.was_made_by_tool_there_was_no` | was made by {tool}; there was no earlier version, so nothing to restore | skapades av {tool}; det fanns ingen tidigare version, så det finns inget att återställa |  |
| `cmdc.what_left_out` | {what} left out. | {what} utelämnade. |  |
| `cmdc.what_query_newest_first` | {what} "{query}" (newest first). | {what} "{query}" (nyaste först). |  |
| `cmdc.what_went_wrong_list` | What went wrong: {list}. | Det som gick fel: {list}. |  |
| `cmdc.where_it_stands_list` | Where it stands: {list}. | Så här ligger det till: {list}. |  |
| `cmdc.would_go_back_to_how_it_was` | would go back to how it was before {tool} ({lines}) | skulle gå tillbaka till hur den var före {tool} ({lines}) |  |
| `cmdc.wrote_path_count` | Wrote {path} ({count}). | Skrev {path} ({count}). |  |
| `cmdc.you_wrote_something_meanwhile_so_vaken_left` | You wrote something meanwhile, so vaken left it to you. | Du skrev något under tiden, så vaken lämnade det åt dig. |  |
| `cmdc.your_folders_cleared_only_protected_files_count` | Your folders cleared: only protected files count now. | Dina mappar är rensade: nu räknas bara skyddade filer. |  |
| `cmdc.your_folders_folders_vaken_guard_scope_off` | Your folders: {folders}. /vaken-guard scope off clears them. | Dina mappar: {folders}. /vaken-guard scope off rensar dem. |  |
| `cmdc.your_folders_none_set_so_only_protected` | Your folders: none set, so only protected files count. /vaken-guard scope &lt;folders...&gt; sets them. | Dina mappar: inga valda, så bara skyddade filer räknas. /vaken-guard scope &lt;mappar...&gt; väljer dem. |  |
| `cmdc.your_folders_set_for_this_session_folders` | Your folders set for this session: {folders}. An edit outside them is flagged (see Settings &gt; Safety). /vaken-guard scope off clears it. | Dina mappar för den här sessionen: {folders}. En ändring utanför dem flaggas (se Inställningar &gt; Säkerhet). /vaken-guard scope off rensar dem. |  |
| `cmdc.your_latest_sessions` | Your latest sessions | Dina senaste sessioner |  |

## cmdd

Shown from the code. (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `cmdd.0` | 0% | 0 % |  |
| `cmdd.a_job_on_model_took_about_time` | A {job} on {model} took about {time} and {tokens} tokens on average over {n} runs. | En {job} på {model} tog i snitt ungefär {time} och {tokens} tokens över {n} körningar. |  |
| `cmdd.a_need_job_does_not_fit` | A {need} job does not fit. | Ett jobb på {need} ryms inte. |  |
| `cmdd.a_need_job_fits` | A {need} job fits. | Ett jobb på {need} ryms. |  |
| `cmdd.a_need_job_fits_now_but_at` | A {need} job fits now, but at your pace the window would run out before it resets. | Ett jobb på {need} ryms nu, men i din takt skulle fönstret ta slut före återställningen. |  |
| `cmdd.a_picture_shows_the_top_of_the` | A picture shows the top of the page, as high as the window, not the whole page. | En bild visar överdelen av sidan, lika hög som fönstret, inte hela sidan. |  |
| `cmdd.a_request_you_repeated` | A request you repeated: | En begäran du upprepade: |  |
| `cmdd.after_it_finished` | after it finished | efter att det var klart |  |
| `cmdd.agent_cap_set_to_n` | Agent cap set to {n}. | Agentgränsen är satt till {n}. |  |
| `cmdd.agent_models_mode` | Agent models: {mode} | Agentmodeller: {mode} |  |
| `cmdd.agent_setup_applies_to_all_projects` | Agent setup applies to all projects. | Agentuppsättningen gäller alla projekt. |  |
| `cmdd.agent_setup_applies_to_this_project` | Agent setup applies to this project. | Agentuppsättningen gäller det här projektet. |  |
| `cmdd.agent_setup_applies_to_this_session_only` | Agent setup applies to this session only. No file is written. | Agentuppsättningen gäller bara den här sessionen. Ingen fil skrivs. |  |
| `cmdd.agent_setup_short_set_up_agents_for` | Agent setup: {short}. Set up agents for me: {on}. Where: {where}. | Agentuppsättning: {short}. Sätt upp agenter åt mig: {on}. Var: {where}. |  |
| `cmdd.all_kept_n_about_money_each` | All kept: {n}, about {money} each. | Alla sparade: {n}, ungefär {money} per styck. |  |
| `cmdd.already_there` | Already there. | Finns redan. |  |
| `cmdd.approvals` | approvals | godkännanden |  |
| `cmdd.audit_n_actions_kept_newest_first_showing` | Audit: {n} actions kept (newest first). Showing {m}. | Granskningslista: {n} åtgärder sparade (nyaste först). Visar {m}. |  |
| `cmdd.auto_a_lookup_agent_with_no_model` | auto. A lookup agent with no model of its own runs on the cheaper model. | auto. En uppslagsagent utan egen modell körs på den billigare modellen. |  |
| `cmdd.both_files_are_already_there_nothing_to` | Both files are already there. Nothing to write. | Båda filerna finns redan. Inget att skriva. |  |
| `cmdd.change_environment_variables` | change environment variables | ändra miljövariabler |  |
| `cmdd.chrome_wrote_no_picture` | Chrome wrote no picture | Chrome skrev ingen bild |  |
| `cmdd.claude_finds_them_in_a_new_session` | Claude finds them in a new session. | Claude hittar dem i en ny session. |  |
| `cmdd.claude_has_not_waited_for_you_today` | Claude has not waited for you today, as far as vaken saw. | Claude har inte väntat på dig i dag, så långt vaken kunde se. |  |
| `cmdd.conflict_path_uses_file_the_model_map` | Conflict: {path} uses {file}; the model map says {map} for the {role}. Settings &gt; Agents changes the map; vaken never changes your file. | Konflikt: {path} använder {file}; modellkartan säger {map} för {role}. Inställningar &gt; Agenter ändrar kartan; vaken ändrar aldrig din fil. |  |
| `cmdd.conflict_your_from_says_at_most_n` | Conflict: your {from} says at most {n} agents; your vaken limit is {now}. /vaken-help run setup cap use yes sets {use}{note}; /vaken-help run setup cap keep yes keeps {now}. | Konflikt: din {from} säger högst {n} agenter; din vaken-gräns är {now}. /vaken-help run setup cap use yes sätter {use}{note}; /vaken-help run setup cap keep yes behåller {now}. |  |
| `cmdd.could_not_write_name` | Could not write {name}. | Kunde inte skriva {name}. |  |
| `cmdd.could_not_write_name_why` | Could not write {name}: {why} | Kunde inte skriva {name}: {why} |  |
| `cmdd.create_a_missing_item_vaken_help_run` | Create a missing item: /vaken-help run setup make &lt;name&gt; yes. Change one that exists: /vaken-help run setup replace &lt;name&gt; yes yes (a copy is saved first). | Skapa något som saknas: /vaken-help run setup make &lt;name&gt; yes. Ändra något som finns: /vaken-help run setup replace &lt;name&gt; yes yes (en kopia sparas först). |  |
| `cmdd.decisions_n_newest_first` | Decisions ({n}), newest first: | Beslut ({n}), nyaste först: |  |
| `cmdd.deep_agent` | deep agent | djupagent |  |
| `cmdd.draw_on_screen` | draw on screen | rita på skärmen |  |
| `cmdd.earlier_days` | Earlier days: | Tidigare dagar: |  |
| `cmdd.eyes_could_not_find_your_home_folder` | Eyes could not find your home folder, so it has nowhere to keep its Chrome profile. | Ögonen hittar inte din hemmapp, så de har ingenstans att spara sin Chrome-profil. |  |
| `cmdd.failed_times` | failed {times} | misslyckades {times} |  |
| `cmdd.finds_files_and_facts_answers_in_10` | finds files and facts, answers in 10 lines, reads only | hittar filer och fakta, svarar på 10 rader, läser bara |  |
| `cmdd.finished_work_the_definition_of_done_was` | finished work (the definition of done was met) | klart arbete (definitionen av klart uppfylldes) |  |
| `cmdd.from_a_button` | from a button | från en knapp |  |
| `cmdd.from_past_runs` | From past runs: | Från tidigare körningar: |  |
| `cmdd.handle_slash_commands` | handle slash commands | hantera snedstreckskommandon |  |
| `cmdd.hooks_events` | hooks {events} | hooks {events} |  |
| `cmdd.how_it_works_inside` | How it works inside | Hur det fungerar inuti |  |
| `cmdd.in_span` | in {span} | på {span} |  |
| `cmdd.instruction_files_claude_reads_in_every_session` | Instruction files Claude reads in every session: {n}, about {tokens} tokens together. | Instruktionsfiler som Claude läser i varje session: {n}, ungefär {tokens} tokens tillsammans. |  |
| `cmdd.it_holds_a_secret` | it holds a secret | den innehåller en hemlighet |  |
| `cmdd.it_is_a_link_that_leads_nowhere` | it is a link that leads nowhere or into this project, and vaken does not write through it. | det är en länk som leder ingenstans eller in i det här projektet, och vaken skriver inte genom den. |  |
| `cmdd.it_is_already_saved` | it is already saved | den är redan sparad |  |
| `cmdd.it_resets_at_time` | It resets at {time}. | Den återställs {time}. |  |
| `cmdd.it_resets_at_time_on_date` | It resets at {time} on {date}. | Den återställs {time} den {date}. |  |
| `cmdd.its_hooks_list_events` | its hooks {list} ({events}) | dess hooks: {list} ({events}) |  |
| `cmdd.its_scan_says_it_can_list` | its scan says it can {list} | dess skanning säger att det kan {list} |  |
| `cmdd.its_scan_shows_no_calls_that_change` | its scan shows no calls that change things | dess skanning visar inga anrop som ändrar något |  |
| `cmdd.judge_other_plugins_or_change_the_engine` | judge other plugins or change the engine | döma andra tillägg eller ändra motorn |  |
| `cmdd.kept_the_vaken_limit_of_n` | Kept the vaken limit of {n}. | Behöll vaken-gränsen på {n}. |  |
| `cmdd.kind_about_money` | {kind}: about {money} | {kind}: ungefär {money} |  |
| `cmdd.label_times_time_in_all` | {label}: {times}, {time} in all | {label}: {times}, {time} sammanlagt |  |
| `cmdd.label_used_used_left_left` | {label}: {used} used, {left} left. | {label}: {used} använt, {left} kvar. |  |
| `cmdd.label_w_wide` | {label}, {w} wide | {label}, {w} bred |  |
| `cmdd.list_stays_as_it_is_vaken_never` | {list} stays as it is: vaken never overwrites a file. | {list} lämnas som det är: vaken skriver aldrig över en fil. |  |
| `cmdd.look_at_them_by_reading_the_path` | Look at them by reading the path. | Titta på dem genom att läsa sökvägen. |  |
| `cmdd.lookup_agent` | lookup agent | uppslagsagent |  |
| `cmdd.lookup_model_modelmine_the_researcher_s_model` | Lookup model: {model}{mine}, the Researcher’s model in Settings &gt; Agents. A lookup agent is one that searches, finds, explores, reads, lists or summarizes. Routing only sends an agent down, never above the main model or the model its own agent file names: plan, review and design agents are never changed, and neither is a model Claude chose or an agent your own agent files define. A built-in agent’s own model is not visible to vaken, so for those only the main model sets the limit. | Uppslagsmodell: {model}{mine}, Utforskarens modell i Inställningar &gt; Agenter. En uppslagsagent är en som söker, hittar, utforskar, läser, listar eller sammanfattar. Routningen skickar bara en agent nedåt, aldrig över huvudmodellen eller modellen som agentens egen fil anger: plan-, gransknings- och designagenter ändras aldrig, inte heller en modell som Claude valde eller en agent som dina egna agentfiler definierar. En inbyggd agents egen modell syns inte för vaken, så för dem sätter bara huvudmodellen gränsen. |  |
| `cmdd.matches` | matches | stämmer |  |
| `cmdd.merged_a_pull_request` | merged a pull request | slog ihop en pull request |  |
| `cmdd.name_could_not_be_read_so_nothing` | {name} could not be read, so nothing was written over it. | {name} gick inte att läsa, så inget skrevs över det. |  |
| `cmdd.name_exists_nothing_was_written_to_change` | {name} exists. Nothing was written. To change it: /vaken-help run setup replace {typed} yes yes (a copy is saved first). | {name} finns. Inget skrevs. Ändra det med: /vaken-help run setup replace {typed} yes yes (en kopia sparas först). |  |
| `cmdd.name_from_to_to_changes` | {name}: {from} to {to}, {changes} | {name}: {from} till {to}, {changes} |  |
| `cmdd.name_is_already_in_sync` | {name} is already in sync. | {name} stämmer redan. |  |
| `cmdd.name_model_model_blurb` | {name} (model {model}): {blurb}. | {name} (modell {model}): {blurb}. |  |
| `cmdd.no_claude_md_or_agents_md_file` | No CLAUDE.md or AGENTS.md file found for this folder. | Ingen CLAUDE.md- eller AGENTS.md-fil hittades för den här mappen. |  |
| `cmdd.no_conflict_about_the_agent_cap` | No conflict about the agent cap. | Ingen konflikt om agentgränsen. |  |
| `cmdd.no_decisions_written_down_yet` | No decisions written down yet. | Inga beslut är nedskrivna än. |  |
| `cmdd.no_finished_work_noted_yet_vaken_notes` | No finished work noted yet. Vaken notes an outcome when your definition of done is met (/vaken-ship done) or a pull request is merged. | Inget klart arbete är noterat än. Vaken noterar ett utfall när din definition av klart uppfylls (/vaken-ship done) eller en pull request slås ihop. |  |
| `cmdd.no_item_named_typed_vaken_help_run` | No item named {typed}. /vaken-help run setup lists them. | Inget objekt heter {typed}. /vaken-help run setup listar dem. |  |
| `cmdd.no_past_runs_yet` | No past runs yet. | Inga tidigare körningar än. |  |
| `cmdd.no_picture` | no picture | ingen bild |  |
| `cmdd.no_picture_taken` | No picture taken. | Ingen bild togs. |  |
| `cmdd.no_picture_taken_n_pictures_were_taken` | No picture taken: {n} pictures were taken in this answer already. | Ingen bild togs: {n} bilder har redan tagits i det här svaret. |  |
| `cmdd.no_plan_window_with_a_known_length` | No plan window with a known length was found. | Inget plan-fönster med känd längd hittades. |  |
| `cmdd.no_plugin_seen_yet` | No plugin seen yet. | Inget tillägg har setts än. |  |
| `cmdd.no_repeated_request_yet_after_you_ask` | No repeated request yet. After you ask for the same kind of thing 3 times, vaken offers to save it as a skill. | Ingen upprepad begäran än. När du har bett om samma sorts sak 3 gånger erbjuder vaken sig att spara den som en färdighet. |  |
| `cmdd.no_rule_waits_to_be_saved` | No rule waits to be saved. | Ingen regel väntar på att sparas. |  |
| `cmdd.no_rules_saved_from_vaken_yet_in` | No rules saved from vaken yet in this project. | Inga regler är sparade från vaken i det här projektet än. |  |
| `cmdd.no_task_run_has_ended_yet` | No task run has ended yet. | Ingen körning har tagit slut än. |  |
| `cmdd.no_uncommitted_change_to_tell_a_story` | No uncommitted change to tell a story about. The story is built from \`git diff\` against the last commit. | Ingen ocommittad ändring att berätta om. Berättelsen byggs av \`git diff\` mot den senaste committen. |  |
| `cmdd.normal_agent` | normal agent | vanlig agent |  |
| `cmdd.not_enough_data_for_a_quote_yet` | Not enough data for a quote yet. It needs 3 finished agents of one kind on one model. | Inte tillräckligt med underlag för ett besked än. Det behöver 3 färdiga agenter av en sort på en modell. |  |
| `cmdd.not_knowable_from_here` | Not knowable from here: | Går inte att veta härifrån: |  |
| `cmdd.not_knowable_from_here_why_a_hook` | Not knowable from here: why a hook of another plugin fails or runs slow, and whether a plugin failed to load before vaken did. The engine keeps those in its own debug log. Vaken counts only its own parts, and a plugin that the engine refused after vaken loaded. | Går inte att veta härifrån: varför en hook i ett annat tillägg misslyckas eller går långsamt, och om ett tillägg misslyckades med att laddas före vaken. Motorn sparar det i sin egen felsökningslogg. Vaken räknar bara sina egna delar, och ett tillägg som motorn nekade efter att vaken hade laddats. |  |
| `cmdd.not_saved_why` | Not saved ({why}). | Inte sparad ({why}). |  |
| `cmdd.not_scanned_by_vaken_it_loaded_before` | not scanned by vaken (it loaded before vaken, or this session has not loaded it yet), so what its hooks can do is not known | inte skannat av vaken (det laddades före vaken, eller så har den här sessionen inte laddat det än), så vad dess hooks kan göra är okänt |  |
| `cmdd.noted_by_you` | noted by you | antecknat av dig |  |
| `cmdd.notes_and_docs` | Notes and docs | Anteckningar och dokument |  |
| `cmdd.notes_from_sessions` | {notes} from {sessions} | {notes} från {sessions} |  |
| `cmdd.nothing_answers_at_url_no_picture_was` | Nothing answers at {url}. No picture was taken. Start the dev server, then try again. | Inget svarar på {url}. Ingen bild togs. Starta utvecklingsservern och försök igen. |  |
| `cmdd.nothing_changed_on_url_name_name_the` | Nothing changed on {url} (name: {name}). The pictures are the same as the last ones. | Inget har ändrats på {url} (namn: {name}). Bilderna är desamma som de senaste. |  |
| `cmdd.nothing_is_written_vaken_help_run_setup` | Nothing is written. /vaken-help run setup on turns it on. | Inget skrivs. /vaken-help run setup on slår på det. |  |
| `cmdd.nothing_removed_why` | Nothing removed ({why}). | Inget togs bort ({why}). |  |
| `cmdd.nothing_to_export_yet` | Nothing to export yet. | Inget att exportera än. |  |
| `cmdd.nothing_to_tidy_no_leftover_notes` | Nothing to tidy. No leftover notes. | Inget att städa. Inga kvarlämnade anteckningar. |  |
| `cmdd.off_agents_run_as_claude_chose_them` | off. Agents run as Claude chose them. | av. Agenter körs som Claude valde dem. |  |
| `cmdd.past_runs_newest_first` | Past runs, newest first: | Tidigare körningar, nyaste först: |  |
| `cmdd.path_already_exists_pick_another_name` | {path} already exists. Pick another name. | {path} finns redan. Välj ett annat namn. |  |
| `cmdd.plugin_trust_card_what_each_plugin_can` | Plugin trust card. What each plugin can do, as far as vaken can see. Counts and names only. | Tilläggens förtroendekort. Vad varje tillägg kan göra, så långt vaken kan se. Bara antal och namn. |  |
| `cmdd.plugins_refused_at_load_none_seen` | Plugins refused at load: none seen. | Tillägg som nekades vid laddning: inga. |  |
| `cmdd.plugins_refused_at_load_this_session` | Plugins refused at load (this session): | Tillägg som nekades vid laddning (den här sessionen): |  |
| `cmdd.plugins_that_loaded_before_vaken_they_show` | Plugins that loaded before vaken (they show no scan). | Tillägg som laddades före vaken (de visar ingen skanning). |  |
| `cmdd.port_port_nothing_listens` | Port {port}: nothing listens. | Port {port}: inget lyssnar. |  |
| `cmdd.port_port_something_listens_and_answers_status` | Port {port}: something listens and answers {status} in {time} s, but the start of the page holds: {words}. The page may show an error. | Port {port}: något lyssnar och svarar {status} på {time} s, men början av sidan innehåller: {words}. Sidan kan visa ett fel. |  |
| `cmdd.port_port_something_listens_but_it_answers` | Port {port}: something listens, but it answers {status}: the page shows an error. | Port {port}: något lyssnar, men det svarar {status}: sidan visar ett fel. |  |
| `cmdd.port_port_something_listens_but_it_answers_2` | Port {port}: something listens, but it answers {status}: the page was not found. | Port {port}: något lyssnar, men det svarar {status}: sidan hittades inte. |  |
| `cmdd.port_port_something_listens_but_it_answers_3` | Port {port}: something listens, but it answers {status}: the page was refused. | Port {port}: något lyssnar, men det svarar {status}: sidan nekades. |  |
| `cmdd.port_port_something_listens_command_but_it` | Port {port}: something listens ({command}), but it did not answer in {s} s. | Port {port}: något lyssnar ({command}), men det svarade inte inom {s} s. |  |
| `cmdd.port_port_up_answers_status_in_time` | Port {port}: up, answers {status} in {time} s. | Port {port}: uppe, svarar {status} på {time} s. |  |
| `cmdd.put_messages_in_the_session` | put messages in the session | lägga meddelanden i sessionen |  |
| `cmdd.questions` | questions | frågor |  |
| `cmdd.reach_the_network_or_other_tools` | reach the network or other tools | nå nätverket eller andra verktyg |  |
| `cmdd.remove_one_vaken_memory_rules_remove_number` | Remove one: /vaken-memory rules remove &lt;number&gt; | Ta bort en: /vaken-memory rules remove &lt;number&gt; |  |
| `cmdd.removed_rule_n_from_path` | Removed rule {n} from {path}. | Tog bort regel {n} från {path}. |  |
| `cmdd.removed_what` | Removed {what}. | Tog bort {what}. |  |
| `cmdd.reviews_a_change_for_bugs_and_risks` | reviews a change for bugs and risks, ranked, no edits | granskar en ändring efter fel och risker, rangordnat, ändrar inget |  |
| `cmdd.rules_you_saved_in_vaken_n_in` | Rules you saved in vaken ({n}), in this project's CLAUDE.md: | Regler du sparade i vaken ({n}), i det här projektets CLAUDE.md: |  |
| `cmdd.run_programs` | run programs | köra program |  |
| `cmdd.save_it_as_a_skill_vaken_help` | Save it as a skill: /vaken-help run coach make {name} | Spara den som en färdighet: /vaken-help run coach make {name} |  |
| `cmdd.save_it_vaken_memory_rules_save` | Save it: /vaken-memory rules save | Spara den: /vaken-memory rules save |  |
| `cmdd.saved_in_path_line` | Saved in {path}: {line} | Sparad i {path}: {line} |  |
| `cmdd.say_how_much_of_the_plan_window` | Say how much of the plan window the job needs, from 1 to 100: /vaken-usage fit 20 | Säg hur mycket av plan-fönstret jobbet behöver, från 1 till 100: /vaken-usage fit 20 |  |
| `cmdd.say_the_decision_vaken_memory_decide_we` | Say the decision: /vaken-memory decide We use the blue theme. | Säg beslutet: /vaken-memory decide Vi använder det blå temat. |  |
| `cmdd.say_where_vaken_help_run_setup_scope` | Say where: /vaken-help run setup scope all, project or session. | Säg var: /vaken-help run setup scope all, project eller session. |  |
| `cmdd.say_which_one_vaken_memory_rules_remove` | Say which one: /vaken-memory rules remove 1 | Säg vilken: /vaken-memory rules remove 1 |  |
| `cmdd.scanned_ago` | scanned {ago} | skannat {ago} |  |
| `cmdd.see_file_program_or_network_calls` | see file, program or network calls | se anrop till filer, program eller nätverk |  |
| `cmdd.see_model_calls` | see model calls | se modellanrop |  |
| `cmdd.see_or_change_claude_s_tool_steps` | see or change Claude's tool steps | se eller ändra Claudes verktygssteg |  |
| `cmdd.see_or_change_your_messages` | see or change your messages | se eller ändra dina meddelanden |  |
| `cmdd.set_up_agents_for_me_is_off` | Set up agents for me is off. /vaken-help run setup on turns it on. | Sätt upp agenter åt mig är av. /vaken-help run setup on slår på det. |  |
| `cmdd.set_up_agents_for_me_is_state` | Set up agents for me is {state}. | Sätt upp agenter åt mig är {state}. |  |
| `cmdd.settings_and_setup` | Settings and setup | Inställningar och uppsättning |  |
| `cmdd.skipped_list_the_file_already_exists_and` | Skipped {list}: the file already exists, and vaken never overwrites a file. | Hoppade över {list}: filen finns redan, och vaken skriver aldrig över en fil. |  |
| `cmdd.slowest_area_time_for_one_step` | Slowest: {area}, {time} for one step. | Långsammast: {area}, {time} för ett steg. |  |
| `cmdd.some_sizes_were_left_out_at_most` | Some sizes were left out: at most {n} pictures per answer. | Några storlekar utelämnades: högst {n} bilder per svar. |  |
| `cmdd.spend_model_usage` | spend model usage | använda av din modellanvändning |  |
| `cmdd.start_it_after_the_reset` | Start it after the reset. | Starta det efter återställningen. |  |
| `cmdd.start_tools_commands_or_agents_by_itself` | start tools, commands or agents by itself | starta verktyg, kommandon eller agenter på egen hand |  |
| `cmdd.started_agents_in_this_session` | started {agents} in this session | startade {agents} i den här sessionen |  |
| `cmdd.steps_slowest_time` | {steps}, slowest {time} | {steps}, långsammast {time} |  |
| `cmdd.suggest_a_lookup_agent_that_could_run` | suggest. A lookup agent that could run cheaper is flagged, nothing is changed. | föreslå. En uppslagsagent som kunde köra billigare flaggas, inget ändras. |  |
| `cmdd.tablet` | Tablet | Surfplatta |  |
| `cmdd.the_app_gave_no_context` | the app gave no context | appen gav ingen kontext |  |
| `cmdd.the_app_gave_no_plan_limits` | the app gave no plan limits | appen gav inga plangränser |  |
| `cmdd.the_app_gave_no_session_list` | the app gave no session list | appen gav ingen sessionslista |  |
| `cmdd.the_app_s_context_reading_did_not` | the app's context reading did not answer (it is not offered in this kind of session) | appens kontextavläsning svarade inte (den finns inte i den här sortens session) |  |
| `cmdd.the_app_s_session_list_did_not` | the app's session list did not answer (it is not offered in this kind of session) | appens sessionslista svarade inte (den finns inte i den här sortens session) |  |
| `cmdd.the_app_s_usage_card_did_not` | the app's usage card did not answer (it is not offered in this kind of session) | appens användningskort svarade inte (det finns inte i den här sortens session) |  |
| `cmdd.the_audit_is_empty_vaken_writes_a` | The audit is empty. Vaken writes a line here for each thing it does for you. | Granskningslistan är tom. Vaken skriver en rad här för varje sak det gör åt dig. |  |
| `cmdd.the_biggest_share_is_where_you_can` | The biggest share is where you can save the most time. | Den största delen är där du kan spara mest tid. |  |
| `cmdd.the_chrome_profile_folder_could_not_be` | the Chrome profile folder could not be made | Chrome-profilmappen kunde inte skapas |  |
| `cmdd.the_cost_is_the_estimate_for_the` | The cost is the estimate for the session since the last outcome. On a subscription it is the list price of the same use, not what you pay. | Kostnaden är uppskattningen för sessionen sedan det senaste utfallet. Med en prenumeration är det listpriset för samma användning, inte vad du betalar. |  |
| `cmdd.the_engine_does_not_scan_the_plugin` | the engine does not scan the plugin that reads the scan, so see its source for what it can do | motorn skannar inte tillägget som läser skanningen, så se dess källkod för vad det kan göra |  |
| `cmdd.the_file_could_not_be_read` | the file could not be read | filen gick inte att läsa |  |
| `cmdd.the_file_is_a_link` | the file is a link | filen är en länk |  |
| `cmdd.the_leader_session_reads_it` | the leader session reads it | ledarsessionen läser det |  |
| `cmdd.the_log_is_off_turn_it_on` | The log is off: turn it on in Settings &gt; Prompts and memory to keep your answers. /vaken-memory decide &lt;sentence&gt; works either way. | Loggen är av: slå på den i Inställningar &gt; Prompter och minne för att spara dina svar. /vaken-memory decide &lt;sentence&gt; fungerar oavsett. |  |
| `cmdd.the_lowest_choice_above_your_n` | (the lowest choice, above your {n}) | (det lägsta valet över dina {n}) |  |
| `cmdd.the_nearest_choice_below_n` | (the nearest choice below {n}) | (det närmaste valet under {n}) |  |
| `cmdd.the_page_text_holds_words` | The page text holds: {words}. | Sidans text innehåller: {words}. |  |
| `cmdd.the_picture_could_not_be_saved` | the picture could not be saved | bilden kunde inte sparas |  |
| `cmdd.the_pictures_folder_is_a_link_or` | the pictures folder is a link or leads outside the project | bildmappen är en länk eller leder utanför projektet |  |
| `cmdd.the_plan_limits_are_not_known_yet` | The plan limits are not known yet. Type /vaken-usage to read them now, then /vaken-usage fit again. | Plangränserna är inte kända än. Skriv /vaken-usage för att läsa dem nu, och sedan /vaken-usage fit igen. |  |
| `cmdd.the_preview_card_needs_chrome_or_edge` | The Preview card needs Chrome or Edge. Neither was found in its usual folder. Install Chrome from google.com/chrome, then try again. Nothing else is needed. | Förhandsvisning-kortet behöver Chrome eller Edge. Ingen av dem hittades i sin vanliga mapp. Installera Chrome från google.com/chrome och försök igen. Inget mer behövs. |  |
| `cmdd.the_preview_card_needs_google_chrome_it` | The Preview card needs Google Chrome. It was not found at /Applications/Google Chrome.app. Install it from google.com/chrome, then try again. Nothing else is needed. | Förhandsvisning-kortet behöver Google Chrome. Det hittades inte i /Applications/Google Chrome.app. Installera det från google.com/chrome och försök igen. Inget mer behövs. |  |
| `cmdd.the_write_failed` | the write failed | skrivningen misslyckades |  |
| `cmdd.there_is_no_repeated_request_to_save` | There is no repeated request to save yet. | Det finns ingen upprepad begäran att spara än. |  |
| `cmdd.there_is_no_such_rule` | there is no such rule | det finns ingen sådan regel |  |
| `cmdd.they_look_light_nothing_to_trim` | They look light. Nothing to trim. | De ser lätta ut. Inget att trimma. |  |
| `cmdd.this_folder_has_no_project_file_for` | this folder has no project file for it | den här mappen har ingen projektfil för den |  |
| `cmdd.this_session_only` | (this session only) | (bara den här sessionen) |  |
| `cmdd.this_session_writes_no_files_vaken_help` | This session writes no files. /vaken-help run setup scope all or project first. | Den här sessionen skriver inga filer. Kör först /vaken-help run setup scope all eller project. |  |
| `cmdd.this_suite` | this suite | den här sviten |  |
| `cmdd.this_would_write_path` | This would write {path}: | Det här skulle skriva {path}: |  |
| `cmdd.to_write_it_vaken_help_run_coach` | To write it: /vaken-help run coach make {name} yes | Skriv den med: /vaken-help run coach make {name} yes |  |
| `cmdd.to_write_list_vaken_tasks_agents_make` | To write {list}: /vaken-tasks agents make yes | Skriv {list} med: /vaken-tasks agents make yes |  |
| `cmdd.today` | Today: | I dag: |  |
| `cmdd.today_claude_waited_for_you_times_time` | Today Claude waited for you {times}, {time} in all. The longest wait was {longest}. | I dag väntade Claude på dig {times}, {time} sammanlagt. Den längsta väntan var {longest}. |  |
| `cmdd.today_no_failure_and_no_slow_step` | Today: no failure and no slow step counted. | I dag: inget misslyckande och inget långsamt steg har räknats. |  |
| `cmdd.today_outcomes` | Today: {outcomes}. | I dag: {outcomes}. |  |
| `cmdd.today_outcomes_about_money_each_on_average` | Today: {outcomes}, about {money} each on average (estimate). | I dag: {outcomes}, i snitt ungefär {money} per styck (uppskattning). |  |
| `cmdd.too_many_exports_are_in_the_claude` | Too many exports are in the .claude folder already. Remove an old .claude/cockpit-decisions\*.md file and try again. | Det ligger redan för många exporter i mappen .claude. Ta bort en gammal .claude/cockpit-decisions\*.md-fil och försök igen. |  |
| `cmdd.too_many_exports_are_in_the_claude_2` | Too many exports are in the .claude folder already. Remove an old .claude/cockpit-audit\*.md file and try again. | Det ligger redan för många exporter i mappen .claude. Ta bort en gammal .claude/cockpit-audit\*.md-fil och försök igen. |  |
| `cmdd.took_pictures_of_url_name_name` | Took {pictures} of {url} (name: {name}). | Tog {pictures} av {url} (namn: {name}). |  |
| `cmdd.tool_servers_mcp_in_this_session` | Tool servers (MCP) in this session: | Verktygsservrar (MCP) i den här sessionen: |  |
| `cmdd.two_starter_agents_for_dir` | Two starter agents for {dir}: | Två startagenter för {dir}: |  |
| `cmdd.type_vaken_help_run_setup_cap_use` | Type /vaken-help run setup cap use yes or /vaken-help run setup cap keep yes. | Skriv /vaken-help run setup cap use yes eller /vaken-help run setup cap keep yes. |  |
| `cmdd.type_vaken_help_run_setup_make_name` | Type /vaken-help run setup make &lt;name&gt; yes. | Skriv /vaken-help run setup make &lt;name&gt; yes. |  |
| `cmdd.type_vaken_help_run_setup_replace_name` | Type /vaken-help run setup replace &lt;name&gt; yes yes. The second yes is the double check. | Skriv /vaken-help run setup replace &lt;name&gt; yes yes. Det andra yes är dubbelkontrollen. |  |
| `cmdd.unchanged_since_the_last_picture` | unchanged since the last picture | oförändrad sedan den senaste bilden |  |
| `cmdd.under_0_1` | under 0.1% | under 0,1 % |  |
| `cmdd.unknown_program` | unknown program | okänt program |  |
| `cmdd.unreadable` | unreadable | går inte att läsa |  |
| `cmdd.updated_plugins_newest_first` | Updated plugins, newest first: | Uppdaterade tillägg, nyaste först: |  |
| `cmdd.vaken_cannot_find_your_home_folder_so` | Vaken cannot find your home folder, so it cannot say where the agents go. | Vaken hittar inte din hemmapp, så det kan inte säga var agenterna hamnar. |  |
| `cmdd.vaken_could_not_read_the_change_with` | Vaken could not read the change with git. | Vaken kunde inte läsa ändringen med git. |  |
| `cmdd.vaken_health_off_nothing_is_counted_turn` | Vaken health: off. Nothing is counted. Turn it on in Settings &gt; Health. | Vaken-hälsa: av. Inget räknas. Slå på den i Inställningar &gt; Hälsa. |  |
| `cmdd.vaken_health_on_vaken_counts_its_own` | Vaken health: on. Vaken counts its own parts that fail or run slow (a step over 1.5 seconds is slow). | Vaken-hälsa: på. Vaken räknar sina egna delar som misslyckas eller går långsamt (ett steg över 1,5 sekunder är långsamt). |  |
| `cmdd.vaken_help_run_audit_export_writes_all` | /vaken-help run audit export writes all of them to a file. | /vaken-help run audit export skriver alla till en fil. |  |
| `cmdd.waiting_for_your_yes_line` | Waiting for your yes: {line} | Väntar på ditt ja: {line} |  |
| `cmdd.waiting_to_retry` | waiting to retry | väntar på nytt försök |  |
| `cmdd.warning_in_the_band` | &lt;- warning in the band | &lt;- varning i bandet |  |
| `cmdd.watch_the_session` | watch the session | bevaka sessionen |  |
| `cmdd.what_a_plugin_really_does_inside_its` | What a plugin really does inside its hooks, and which files, commands or addresses it touched. | Vad ett tillägg verkligen gör i sina hooks, och vilka filer, kommandon eller adresser det rörde. |  |
| `cmdd.what_files_added_lines_added_removed_removed` | What: {files}, {added} lines added, {removed} removed. | Vad: {files}, {added} rader tillagda, {removed} borttagna. |  |
| `cmdd.what_safe_to_remove_say_vaken_help` | {what}. Safe to remove. Say /vaken-help run tidy yes to remove them. | {what}. Säkert att ta bort. Säg /vaken-help run tidy yes för att ta bort dem. |  |
| `cmdd.what_you_would_see_on_screen` | What you would see on screen | Det du ser på skärmen |  |
| `cmdd.where_vaken_help_run_setup_scope_all` | Where: /vaken-help run setup scope all\|project\|session. | Var: /vaken-help run setup scope all\|project\|session. |  |
| `cmdd.whether_its_tools_are_safe_can_do` | Whether its tools are safe. "Can do" is what its code asks the engine for, not what it did. | Om dess verktyg är säkra. "Kan göra" är vad dess kod ber motorn om, inte vad det gjorde. |  |
| `cmdd.why_goal` | Why: {goal} | Varför: {goal} |  |
| `cmdd.why_no_goal_was_set_set_one` | Why: no goal was set. Set one with /vaken-tasks goal so the story starts with why. | Varför: inget mål är satt. Sätt ett med /vaken-tasks goal så att berättelsen börjar med varför. |  |
| `cmdd.write_files` | write files | skriva filer |  |
| `cmdd.written_down_text` | Written down: {text} | Nedskrivet: {text} |  |
| `cmdd.wrote_list_in_dir` | Wrote {list} in {dir}. | Skrev {list} i {dir}. |  |
| `cmdd.wrote_name` | Wrote {name}. | Skrev {name}. |  |
| `cmdd.wrote_name_your_copy_is_saved_as` | Wrote {name}. Your copy is saved as {bak}. | Skrev {name}. Din kopia är sparad som {bak}. |  |
| `cmdd.wrote_nothing` | Wrote nothing. | Skrev ingenting. |  |
| `cmdd.wrote_path_claude_can_use_it_by` | Wrote {path}. Claude can use it by the name "{name}" in a new session. | Skrev {path}. Claude kan använda den under namnet "{name}" i en ny session. |  |
| `cmdd.wrote_path_n_actions` | one: Wrote {path} ({n} action).<br>other: Wrote {path} ({n} actions). | one: Skrev {path} ({n} åtgärd).<br>other: Skrev {path} ({n} åtgärder). |  |
| `cmdd.wrote_path_n_decisions` | one: Wrote {path} ({n} decision).<br>other: Wrote {path} ({n} decisions). | one: Skrev {path} ({n} beslut).<br>other: Skrev {path} ({n} beslut). |  |
| `cmdd.your_from_says_at_most_n_agents` | Your {from} says at most {n} agents; vaken follows the computer (information only, nothing is changed). | Din {from} säger högst {n} agenter; vaken följer datorn (bara information, inget ändras). |  |

## cmde

Shown from the code. (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `cmde.10_minutes` | 10 minutes | 10 minuter |  |
| `cmde.a_layout_named_name_exists_already` | A layout named "{name}" exists already. | Det finns redan en layout som heter "{name}". |  |
| `cmde.a_queued_prompt_shows_in_the_prompt` | A queued prompt shows in the prompt box (offer {n} of {m}). | En köad prompt visas i promptrutan (erbjudande {n} av {m}). |  |
| `cmde.answer_shape_what` | Answer shape: {what}. | Svarsform: {what}. |  |
| `cmde.asked_n_times` | Asked {n} times. | Du bad om det {n} gånger. |  |
| `cmde.back_to_old_effort` | Back to {old} effort | Tillbaka till ansträngning {old} |  |
| `cmde.block_n_could_not_start` | Block {n}: could not start | Block {n}: kunde inte starta |  |
| `cmde.block_n_exit_k` | Block {n}: exit {k} | Block {n}: avslutades med kod {k} |  |
| `cmde.block_n_stopped_after_the_time_limit` | Block {n}: stopped after the time limit | Block {n}: stoppades efter tidsgränsen |  |
| `cmde.checkpoint_name_n_files` | one: checkpoint {name}: {n} file<br>other: checkpoint {name}: {n} files | one: kontrollpunkt {name}: {n} fil<br>other: kontrollpunkt {name}: {n} filer |  |
| `cmde.day_budget_a_now_b_estimates` | day budget +{a}, now {b} (estimates). | Budgeten för dagen +{a}, nu {b} (uppskattningar). |  |
| `cmde.edits_since_your_last_message_n_files` | one: edits since your last message: {n} file<br>other: edits since your last message: {n} files | one: ändringar sedan ditt senaste meddelande: {n} fil<br>other: ändringar sedan ditt senaste meddelande: {n} filer |  |
| `cmde.from_to_to_about_usd` | {from} to {to}, about {usd}. | {from} till {to}, ungefär {usd}. |  |
| `cmde.going_round_in_circles_on_file_n` | Going round in circles on {file}: {n} edits in {m} min while steps kept failing. | Går i cirklar med {file}: {n} ändringar på {m} min medan steg fortsatte misslyckas. |  |
| `cmde.held_the_mac_awake_for_list_because` | Held the Mac awake for {list}, because {what}. It is renewed while they work. | Höll Macen vaken i {list}, eftersom {what}. Det förnyas medan de arbetar. |  |
| `cmde.held_the_mac_awake_for_list_reason` | Held the Mac awake for {list}: {reason}. It is renewed while that lasts. | Höll Macen vaken i {list}: {reason}. Det förnyas så länge det gäller. |  |
| `cmde.it_runs_on_model_instead` | It runs on {model} instead. | Den körs på {model} i stället. |  |
| `cmde.lowered_the_effort_of_name` | Lowered the effort of {name} | Sänkte ansträngningen för {name} |  |
| `cmde.moved_name_to_model` | Moved {name} to {model} | Flyttade {name} till {model} |  |
| `cmde.n_agents_are_already_running_the_limit` | {n} agents are already running (the limit is {m}). | {n} agenter körs redan (gränsen är {m}). |  |
| `cmde.n_choices_changed` | one: {n} choice changed.<br>other: {n} choices changed. | one: {n} val ändrades.<br>other: {n} val ändrades. |  |
| `cmde.n_edits_in_1_new_folder_list` | {n} edits in 1 new folder: {list} | {n} ändringar i 1 ny mapp: {list} |  |
| `cmde.n_edits_in_m_new_folders_list` | {n} edits in {m} new folders: {list} | {n} ändringar i {m} nya mappar: {list} |  |
| `cmde.n_minutes_ago` | one: {n} minute ago<br>other: {n} minutes ago | one: för {n} minut sedan<br>other: för {n} minuter sedan |  |
| `cmde.n_tool_calls_with_no_file_changed` | {n} tool calls with no file changed, about {k} thousand characters added | {n} verktygsanrop utan att någon fil ändrades, ungefär {k} tusen tecken tillagda |  |
| `cmde.name_edited_n_times_in_one_turn` | {name} edited {n} times in one turn | {name} ändrades {n} gånger i en tur |  |
| `cmde.name_n_files` | one: {name}: {n} file<br>other: {name}: {n} files | one: {name}: {n} fil<br>other: {name}: {n} filer |  |
| `cmde.name_n_new_pictures` | one: {name}: {n} new picture.<br>other: {name}: {n} new pictures. | one: {name}: {n} ny bild.<br>other: {name}: {n} nya bilder. |  |
| `cmde.name_went_from_version_from_to_to` | {name} went from version {from} to {to}. | {name} gick från version {from} till {to}. |  |
| `cmde.no_layout_named_name` | No layout named "{name}". | Ingen layout heter "{name}". |  |
| `cmde.only_n_layouts_fit_delete_one_first` | Only {n} layouts fit. Delete one first. | Bara {n} layouter ryms. Ta bort en först. |  |
| `cmde.path_edited_by_another_session_1_named` | {path}: edited by another session ({name}) {age}. The edit ran. | {path}: ändrad av en annan session ({name}) {age}. Ändringen gjordes. |  |
| `cmde.path_edited_by_another_session_age_the` | {path}: edited by another session {age}. The edit ran. | {path}: ändrad av en annan session {age}. Ändringen gjordes. |  |
| `cmde.path_n_lines` | {path}, {n} lines | {path}, {n} rader |  |
| `cmde.path_neighbour_added_by_another_session_1_named` | {path}: neighbour added by another session ({name}) {age}. The edit ran. | {path}: ny fil i samma mapp från en annan session ({name}) {age}. Ändringen gjordes. |  |
| `cmde.path_neighbour_added_by_another_session_age` | {path}: neighbour added by another session {age}. The edit ran. | {path}: ny fil i samma mapp från en annan session {age}. Ändringen gjordes. |  |
| `cmde.paused_all_changes_and_cancelled_the_running` | Paused all changes and cancelled the running answer. | Pausade alla ändringar och avbröt det pågående svaret. |  |
| `cmde.pct_of_the_what_budget_about_usd` | {pct}% of the {what} budget: about {usd} of {limit} (estimate). | {pct} % av budgeten för {what}: ungefär {usd} av {limit} (uppskattning). |  |
| `cmde.port_port_is_held_by_session_name` | Port {port} is held by session '{name}'. The command ran. | Port {port} används av sessionen '{name}'. Kommandot kördes. |  |
| `cmde.pr_n_github_did_not_merge_it` | PR {n}: GitHub did not merge it | PR {n}: GitHub slog inte ihop den |  |
| `cmde.pr_n_the_guard_stopped_it` | PR {n}: the guard stopped it | PR {n}: säkerhetskontrollen stoppade den |  |
| `cmde.put_name_back_to_old` | Put {name} back to {old} | Satte tillbaka {name} till {old} |  |
| `cmde.raised_the_effort_of_name` | Raised the effort of {name} | Höjde ansträngningen för {name} |  |
| `cmde.read_a_tokens_from_the_cache_n` | Read {a} tokens from the cache ({n} of {m}). | Läste {a} tokens från cachen ({n} av {m}). |  |
| `cmde.resume_n_of_today` | Resume {n} of today. | Återupptagning {n} i dag. |  |
| `cmde.sent_a_message_to_name` | Sent a message to "{name}". | Skickade ett meddelande till "{name}". |  |
| `cmde.session_budget_a_now_b_day_budget` | session budget +{a}, now {b}; day budget +{p}, now {k} (estimates). | Budgeten för sessionen +{a}, nu {b}; budgeten för dagen +{p}, nu {k} (uppskattningar). |  |
| `cmde.session_budget_a_now_b_estimates` | session budget +{a}, now {b} (estimates). | Budgeten för sessionen +{a}, nu {b} (uppskattningar). |  |
| `cmde.set_agent_models_to_auto_and_it` | Set Agent models to Auto and it runs on {model}. | Sätt Agentmodeller till Auto så körs den på {model}. |  |
| `cmde.stopped_a_tool_call_the_what_budget` | Stopped a {tool} call: the {what} budget of {limit} is used up (estimate). | Stoppade ett {tool}-anrop: budgeten för {what} på {limit} är slut (uppskattning). |  |
| `cmde.stopped_another_tool_try_it_waits_for` | Stopped another {tool} try. It waits for your next message. | Stoppade ytterligare ett försök med {tool}. Det väntar på ditt nästa meddelande. |  |
| `cmde.stopped_tool` | Stopped {tool}. | Stoppade {tool}. |  |
| `cmde.the_computer_is_full_reason` | The computer is full ({reason}). | Datorn är full ({reason}). |  |
| `cmde.this_agent_is_n_levels_deep_agents` | This agent is {n} levels deep (agents start agents). The cap is {m} levels. | Den här agenten ligger {n} nivåer ner (agenter startar agenter). Taket är {m} nivåer. |  |
| `cmde.this_request_has_cost_usd_the_agent` | This request has cost {usd}; the agent spend limit is {k} a request. | Den här begäran har kostat {usd}; gränsen för vad agenter får kosta är {k} per begäran. |  |
| `cmde.what_failed_n_times_with_m_different` | {what} failed {n} times with {m} different commands | {what} misslyckades {n} gånger med {m} olika kommandon |  |
| `cmde.yes` | yes | ja |  |

## cmdf

Shown from the code. (Code: n/a.)

| name | en | sv | note |
| --- | --- | --- | --- |
| `cmdf.a_note` | a note | en anteckning |  |
| `cmdf.a_plan_was_suggested_above_the_chat` | A plan was suggested above the chat box. | En plan föreslogs ovanför chattrutan. |  |
| `cmdf.a_request_to_merge_a_branch_into` | A request to merge a branch into the main code, so someone can look first. | En begäran om att slå ihop en gren med huvudkoden, så att någon kan titta först. |  |
| `cmdf.a_rule_you_could_add_to_your` | A rule you could add to your CLAUDE.md: | En regel du kan lägga till i din CLAUDE.md (den är på engelska, så att regelräknaren kan läsa den): |  |
| `cmdf.a_saved_copy_of_your_session_while` | A saved copy of your session. While it is fresh, each answer costs much less. It goes stale after an hour of quiet. | En sparad kopia av din session. Så länge den är färsk kostar varje svar mycket mindre. Den blir gammal efter en timmes stillhet. |  |
| `cmdf.a_second_claude_that_claude_starts_to` | A second Claude that Claude starts to do one part of the job. | En andra Claude som Claude startar för att göra en del av jobbet. |  |
| `cmdf.a_second_copy_of_a_project_folder` | A second copy of a project folder on its own branch, so two jobs do not trip over each other. | En andra kopia av en projektmapp på en egen gren, så att två jobb inte kommer i vägen för varandra. |  |
| `cmdf.a_secret_was_touched` | a secret was touched | en hemlighet rördes |  |
| `cmdf.a_separate_line_of_changes_to_your` | A separate line of changes to your code. Your main code stays safe until you merge it. | En separat rad av ändringar i din kod. Din huvudkod är orörd tills du slår ihop den. |  |
| `cmdf.a_short_command_with_no_file_name` | a short command with no file name, path, number or quoted text | ett kort kommando utan filnamn, sökväg, siffra eller citerad text |  |
| `cmdf.a_short_reply_which_is_fine` | a short reply, which is fine | ett kort svar, vilket är bra |  |
| `cmdf.a_small_piece_of_text_about_three` | A small piece of text, about three quarters of a word. Usage is counted in tokens. | En liten bit text, ungefär tre fjärdedelar av ett ord. Användning räknas i tokens. |  |
| `cmdf.a_small_rule_that_runs_when_something` | A small rule that runs when something happens, such as before a command runs. Vaken uses hooks to guard and to count. | En liten regel som körs när något händer, till exempel innan ett kommando körs. Vaken använder hooks för att skydda och räkna. |  |
| `cmdf.a_step_kept_failing_the_same_way` | a step kept failing the same way | ett steg fortsatte misslyckas på samma sätt |  |
| `cmdf.a_tip_showed_above_the_chat_box` | A tip showed above the chat box, and Claude was told to ask one short question if the goal is unclear. | Ett tips visades ovanför chattrutan, och Claude fick veta att ställa en kort fråga om målet är oklart. |  |
| `cmdf.a_tip_showed_above_the_chat_box_2` | A tip showed above the chat box. Claude was told nothing. | Ett tips visades ovanför chattrutan. Claude fick inget veta. |  |
| `cmdf.a_way_to_connect_claude_to_another` | A way to connect Claude to another app, such as mail or a calendar. | Ett sätt att koppla Claude till en annan app, till exempel e-post eller en kalender. |  |
| `cmdf.about_k_k_tokens` | about {k}k tokens | ungefär {k}k tokens |  |
| `cmdf.about_the_project` | about the project | om projektet |  |
| `cmdf.about_you` | about you | om dig |  |
| `cmdf.agent` | Agent | Agent |  |
| `cmdf.also_matches_list` | Also matches: {list}. | Matchar också: {list}. |  |
| `cmdf.also_matches_list_and_n_more` | Also matches: {list} and {n} more. | Matchar också: {list} och {n} till. |  |
| `cmdf.ask_claude_to_find_which_value_is` | Ask Claude to find which value is empty, and why. | Be Claude hitta vilket värde som är tomt, och varför. |  |
| `cmdf.ask_claude_to_fix_the_line_that` | Ask Claude to fix the line that is named in the error. | Be Claude rätta raden som nämns i felet. |  |
| `cmdf.ask_claude_to_show_the_conflict_and` | Ask Claude to show the conflict and help you pick. Do not discard work. | Be Claude visa konflikten och hjälpa dig välja. Kasta inte bort arbete. |  |
| `cmdf.ask_claude_which_test_failed_and_why` | Ask Claude which test failed and why. Do not let it skip the test. | Fråga Claude vilket test som föll och varför. Låt det inte hoppa över testet. |  |
| `cmdf.asks_claude_to_answer_in_short_simple` | Asks Claude to answer in short, simple words. | Ber Claude svara med korta, enkla ord. |  |
| `cmdf.auto` | auto | auto |  |
| `cmdf.auto_model` | auto ({model}) | auto ({model}) |  |
| `cmdf.autopilot_did_nothing_today` | Autopilot did nothing today. | Autopilot gjorde ingenting i dag. |  |
| `cmdf.autopilot_did_things_today` | Autopilot did {things} today. | Autopilot gjorde {things} i dag. |  |
| `cmdf.away_is_off_vaken_away_on_tells` | Away is off. /vaken-away on tells vaken you are gone. | Frånvaroläget är av. /vaken-away on talar om för vaken att du är borta. |  |
| `cmdf.away_is_on_lift_it_with_vaken` | Away is ON. Lift it with /vaken-away off when you are back. | Frånvaroläget är PÅ. Stäng av det med /vaken-away off när du är tillbaka. |  |
| `cmdf.change_it_path_or_vaken_settings_key` | Change it: {path}, or /vaken-settings {key} &lt;value&gt;. | Ändra det: {path}, eller /vaken-settings {key} &lt;värde&gt;. |  |
| `cmdf.change_it_settings_cards_and_look_the` | Change it: Settings &gt; Cards and look. The Sessions list there pins or hides a session. | Ändra det: Inställningar &gt; Kort och utseende. Sessionslistan där fäster eller döljer en session. |  |
| `cmdf.change_it_settings_safety_this_is_a` | Change it: Settings &gt; Safety. This is a reminder to Claude, not a lock. | Ändra det: Inställningar &gt; Säkerhet. Det här är en påminnelse till Claude, inget lås. |  |
| `cmdf.changed_x` | changed {x} | ändrade {x} |  |
| `cmdf.check_hint_hint_vaken_does_not_know` | Check hint: {hint} (vaken does not know which files a task changed, so the check is run exactly as you wrote it.) | Kontrolltips: {hint} (vaken vet inte vilka filer en uppgift ändrade, så kontrollen körs precis som du skrev den.) |  |
| `cmdf.check_the_address_for_a_typo` | Check the address for a typo. | Kontrollera adressen för skrivfel. |  |
| `cmdf.check_the_name_and_the_folder_ask` | Check the name and the folder. Ask Claude to look for the right path. | Kontrollera namnet och mappen. Be Claude leta upp rätt sökväg. |  |
| `cmdf.check_who_owns_the_file_do_not` | Check who owns the file. Do not use sudo unless you are sure. | Kontrollera vem som äger filen. Använd inte sudo om du inte är säker. |  |
| `cmdf.check_your_internet_and_the_address_if` | Check your internet and the address. If it is a local server, check that it is running. | Kontrollera din uppkoppling och adressen. Om det är en lokal server, kontrollera att den körs. |  |
| `cmdf.choices_atonce_at_once_never_more_than` | Choices: {atOnce} at once (never more than your own limit, if you set one); check {check}; stop an agent after {min} min or {helperUsd}; stop the run after {runUsd}; a night run pauses past {nightUsd}. | Val: {atOnce} åt gången (aldrig fler än din egen gräns, om du har satt en); kontroll {check}; stoppa en agent efter {min} min eller {helperUsd}; stoppa körningen efter {runUsd}; en nattkörning pausar efter {nightUsd}. |  |
| `cmdf.claude_assumed_what_vaken_explain_assumptions` | Claude assumed {what}. /vaken-explain assumptions | Claude antog {what}. /vaken-explain assumptions |  |
| `cmdf.claude_listed_what_ago` | Claude listed {what} {ago}: | Claude listade {what} {ago}: |  |
| `cmdf.claude_lists_its_assumptions_before_big_changes` | Claude lists its assumptions before big changes. You see how many. | Claude listar sina antaganden före stora ändringar. Du ser hur många. |  |
| `cmdf.claude_said_it_was_done_without_proof` | Claude said it was done without proof | Claude sa att det var klart utan bevis |  |
| `cmdf.claude_was_asked_to_write_a_plan` | Claude was asked to write a plan first. | Claude blev ombedd att skriva en plan först. |  |
| `cmdf.claude_writes_a_short_summary_of_the` | Claude writes a short summary of the session and keeps that instead of the long session. Your files do not change. | Claude skriver en kort sammanfattning av sessionen och behåller den i stället för den långa sessionen. Dina filer ändras inte. |  |
| `cmdf.clear_enough` | clear enough | tillräckligt tydlig |  |
| `cmdf.close_other_programs_or_run_fewer_agents` | Close other programs, or run fewer agents at once. | Stäng andra program, eller kör färre agenter samtidigt. |  |
| `cmdf.command_times_this_session_source` | {command}: {times} this session ({source}) | {command}: {times} i den här sessionen ({source}) |  |
| `cmdf.commits_that_could_not_be_counted` | commits that could not be counted | commits som inte gick att räkna |  |
| `cmdf.compact` | Compact | Komprimera |  |
| `cmdf.compact_when_idle_auto_it_compacts_the` | Compact when idle, Auto: it compacts the session when every check below is true, when the session is full or a break is near the end of the cache time. With agents running in the background, Auto waits until {pct}%, and not during a break. | Komprimera när det är lugnt, Auto: den komprimerar sessionen när varje kontroll nedan stämmer, när sessionen är full eller en paus närmar sig slutet på cachetiden. Med agenter som kör i bakgrunden väntar Auto till {pct}%, och inte under en paus. |  |
| `cmdf.compact_when_idle_is_off_settings_money` | Compact when idle is off. Settings &gt; Money and plan &gt; Compact by itself: Watch only notes the moments it would compact, Auto compacts at them. | Komprimera när det är lugnt är av. Inställningar &gt; Pengar och plan &gt; Komprimera automatiskt: Bara visa noterar de lägen där den skulle komprimera, Auto komprimerar vid dem. |  |
| `cmdf.compact_when_idle_watch_only_it_notes` | Compact when idle, watch only: it notes each moment it would compact the session, and does nothing. | Komprimera när det är lugnt, bara visa: den noterar varje läge där den skulle komprimera sessionen och gör ingenting. |  |
| `cmdf.compacting_the_session_in_a_moment_with` | Compacting the session in a moment, with what Claude keeps. Watch for the compact marker. | Komprimerar sessionen om en stund, med det Claude behåller. Titta efter komprimeringsmarkören. |  |
| `cmdf.compacting_would_replace_messages_size_with` | Compacting would replace {messages}{size} with one summary{after}. | Komprimeringen skulle ersätta {messages}{size} med en sammanfattning{after}. |  |
| `cmdf.context_pct_used` | context {pct} used | kontext {pct} använt |  |
| `cmdf.cost_so_far` | {cost} so far | {cost} hittills |  |
| `cmdf.counts_steps_that_break_a_never_rule` | Counts steps that break a Never rule in your CLAUDE.md. | Räknar steg som bryter mot en Never-regel i din CLAUDE.md. |  |
| `cmdf.each_thing_happened_once_so_there_is` | Each thing happened once, so there is no rule to suggest yet. | Varje sak hände en gång, så det finns ingen regel att föreslå ännu. |  |
| `cmdf.edits_wandered_away_from_the_task` | edits wandered away from the task | ändringar drev bort från uppgiften |  |
| `cmdf.everything_claude_holds_in_mind_for_this` | Everything Claude holds in mind for this session. The longer the session, the more it holds, and the more each answer costs. | Allt Claude håller i minnet för den här sessionen. Ju längre sessionen är, desto mer håller den, och desto mer kostar varje svar. |  |
| `cmdf.explains_a_failed_step_in_plain_words` | Explains a failed step in plain words. | Förklarar ett misslyckat steg med enkla ord. |  |
| `cmdf.few_files_changed_so_far_n` | Few files changed so far ({n}). | Få filer har ändrats hittills ({n}). |  |
| `cmdf.fewer_than_n_words_and_no_file` | fewer than {n} words and no file name, path, number or quoted text | färre än {n} ord och inget filnamn, ingen sökväg, siffra eller citerad text |  |
| `cmdf.file_has_no_open_tasks_write_one` | {file} has no open tasks. Write one task per line ("- Fix the header"), then /vaken-tasks start. | {file} har inga öppna uppgifter. Skriv en uppgift per rad ("- Fixa rubriken") och sedan /vaken-tasks start. |  |
| `cmdf.file_has_what` | {file} has {what}: | {file} har {what}: |  |
| `cmdf.files_changed_in_this_session_n_names` | Files changed in this session ({n}): {names}. The summary may drop some of them. | Filer som ändrades i den här sessionen ({n}): {names}. Sammanfattningen kan utelämna några av dem. |  |
| `cmdf.finds_vague_prompts_tip_shows_a_line` | Finds vague prompts. Tip shows a line. Ask also tells Claude. | Hittar vaga prompter. Tips visar en rad. Fråga säger också till Claude. |  |
| `cmdf.free_some_space_then_try_again` | Free some space, then try again. | Frigör lite utrymme och försök igen. |  |
| `cmdf.fresh_start_nudge_off_turn_it_on` | Fresh-start nudge: off. Turn it on: Settings &gt; Prompts and memory. | Påminnelse om ny session: av. Slå på den: Inställningar &gt; Prompter och minne. |  |
| `cmdf.fresh_start_nudge_on` | Fresh-start nudge: on. | Påminnelse om ny session: på. |  |
| `cmdf.happened_agent` | one: {n} agent<br>other: {n} agents | one: {n} agent<br>other: {n} agenter |  |
| `cmdf.happened_command` | one: {n} command<br>other: {n} commands | one: {n} kommando<br>other: {n} kommandon |  |
| `cmdf.happened_file` | one: {n} file<br>other: {n} files | one: {n} fil<br>other: {n} filer |  |
| `cmdf.happened_file_or_page` | one: {n} file or page<br>other: {n} files or pages | one: {n} fil eller sida<br>other: {n} filer eller sidor |  |
| `cmdf.happened_kind_build` | one: {n} build<br>other: {n} builds | one: {n} bygge<br>other: {n} byggen |  |
| `cmdf.happened_kind_git` | one: {n} git<br>other: {n} gits | one: {n} git<br>other: {n} git |  |
| `cmdf.happened_kind_install` | one: {n} install<br>other: {n} installs | one: {n} installation<br>other: {n} installationer |  |
| `cmdf.happened_kind_lint` | one: {n} lint<br>other: {n} lints | one: {n} lint<br>other: {n} lint |  |
| `cmdf.happened_kind_other` | one: {n} other<br>other: {n} others | one: {n} annat<br>other: {n} andra |  |
| `cmdf.happened_kind_test` | one: {n} test<br>other: {n} tests | one: {n} test<br>other: {n} test |  |
| `cmdf.happened_outside_tool` | one: {n} outside tool<br>other: {n} outside tools | one: {n} verktyg utifrån<br>other: {n} verktyg utifrån |  |
| `cmdf.hook` | Hook | Hook |  |
| `cmdf.how_you_like_to_work` | how you like to work | hur du vill arbeta |  |
| `cmdf.idle` | idle | vilar |  |
| `cmdf.install_the_program_or_ask_claude_which` | Install the program, or ask Claude which program it needs. | Installera programmet, eller fråga Claude vilket program som behövs. |  |
| `cmdf.instruction_files_list` | Instruction files: {list}. | Instruktionsfiler: {list}. |  |
| `cmdf.it_checks_the_start_of_each_shell` | It checks the start of each shell command. A rule it cannot read as a command is left out. | Den kontrollerar början av varje terminalkommando. En regel som inte går att läsa som ett kommando utelämnas. |  |
| `cmdf.it_does_not_name_the_branch` | It does not name the branch. | Den nämner inte grenen. |  |
| `cmdf.it_has_not_found_a_good_moment_yet` | It has not found a good moment yet. | Den har inte hittat något bra läge än. |  |
| `cmdf.it_is_not_offered_in_this_kind` | It is not offered in this kind of session. | Den finns inte i den här sortens session. |  |
| `cmdf.it_is_paused` | It is paused. | Den är pausad. |  |
| `cmdf.it_keeps_all_total_items_of_the` | It keeps all {total} items of the keep-list. | Den behåller alla {total} punkter i listan över vad som ska behållas. |  |
| `cmdf.it_left_out_lost_of_total_items` | It left out {lost} of {total} items of the keep-list; This session offers Tell Claude again. | Den lämnade ut {lost} av {total} punkter i listan över vad som ska behållas; Den här sessionen erbjuder Säg till Claude igen. |  |
| `cmdf.it_names_the_branch` | It names the branch. | Den nämner grenen. |  |
| `cmdf.last_answer` | Last answer | Förra svaret |  |
| `cmdf.last_answer_nothing_left_this_computer_that` | Last answer: nothing left this computer that vaken saw. | Förra svaret: inget lämnade den här datorn som vaken såg. |  |
| `cmdf.last_look_age_ago_state` | Last look {age} ago: {state}. | Senaste titt för {age} sedan: {state}. |  |
| `cmdf.last_prompt_words_judged_why_nothing_was` | Last prompt: {words}. Judged {why}. Nothing was done. | Senaste prompten: {words}. Bedömd som {why}. Inget gjordes. |  |
| `cmdf.last_prompt_words_reason_judged_vague_did` | Last prompt: {words}, {reason}. Judged vague. {did} | Senaste prompten: {words}, {reason}. Bedömd som vag. {did} |  |
| `cmdf.last_stopped` | Last stopped: | Senast stoppat: |  |
| `cmdf.last_times_the_session_was_compacted` | Last times the session was compacted: | Senaste gångerna sessionen komprimerades: |  |
| `cmdf.ledger` | Ledger | Logg |  |
| `cmdf.list_and_n_more` | {list}, and {n} more | {list} och {n} till |  |
| `cmdf.log_in_again_or_check_the_key` | Log in again, or check the key. Never paste a key into the chat. | Logga in igen, eller kontrollera nyckeln. Klistra aldrig in en nyckel i chatten. |  |
| `cmdf.looked_at_x` | looked at {x} | tittade på {x} |  |
| `cmdf.looked_for_names` | Looked for: {names}. | Letade efter: {names}. |  |
| `cmdf.mcp` | MCP | MCP |  |
| `cmdf.memory_notes_for_this_project_n` | Memory notes for this project ({n}): | Minnesanteckningar för det här projektet ({n}): |  |
| `cmdf.n_more_not_kept` | ({n} more not kept.) | ({n} till sparades inte.) |  |
| `cmdf.n_other_sessions_work_in_this_folder` | one: {n} other session works in this folder. Claude was not told.<br>other: {n} other sessions work in this folder. Claude was not told. | one: {n} annan session arbetar i den här mappen. Claude fick inget veta.<br>other: {n} andra sessioner arbetar i den här mappen. Claude fick inget veta. |  |
| `cmdf.n_queued` | {n} queued | {n} i kö |  |
| `cmdf.name_a_task_number_vaken_tasks_a` | Name a task number: /vaken-tasks {a} 2 | Ange ett uppgiftsnummer: /vaken-tasks {a} 2 |  |
| `cmdf.needs_you` | needs you | behöver dig |  |
| `cmdf.new_packages_were_installed` | new packages were installed | nya paket installerades |  |
| `cmdf.new_topic_pct_match_but_the_nudge` | New topic ({pct}% match), but the nudge showed less than 2 hours ago. | Nytt ämne ({pct} % träff), men påminnelsen visades för mindre än 2 timmar sedan. |  |
| `cmdf.new_topic_pct_of_the_key_words` | New topic: {pct}% of the key words match. | Nytt ämne: {pct} % av nyckelorden stämmer. |  |
| `cmdf.no_answer_finished_yet_in_this_session` | No answer finished yet in this session. | Inget svar har avslutats än i den här sessionen. |  |
| `cmdf.no_assumptions_listed_the_assumption_review_is` | No assumptions listed. The assumption review is off. Turn it on: Settings &gt; Prompts and memory. | Inga antaganden listade. Antagandegranskningen är av. Slå på den: Inställningar &gt; Prompter och minne. |  |
| `cmdf.no_assumptions_listed_yet_in_this_session` | No assumptions listed yet in this session. | Inga antaganden har listats ännu i den här sessionen. |  |
| `cmdf.no_claude_md_file_found_for_this` | No CLAUDE.md file found for this folder. | Ingen CLAUDE.md-fil hittades för den här mappen. |  |
| `cmdf.no_failed_step_in_this_session_or` | No failed step in this session, or the error was of a kind vaken does not know. | Inget misslyckat steg i den här sessionen, eller så var felet av en sort som vaken inte känner till. |  |
| `cmdf.no_file_was_changed_in_this_session` | No file was changed in this session, so there are no file names to lose. | Ingen fil ändrades i den här sessionen, så inga filnamn kan gå förlorade. |  |
| `cmdf.no_files_were_changed_in_this_session` | No files were changed in this session. | Inga filer ändrades i den här sessionen. |  |
| `cmdf.no_look_yet_it_looks_right_after` | No look yet. It looks right after each answer ends, and again when a break is near the end of the cache time. | Ingen titt än. Den tittar direkt efter varje avslutat svar, och igen när en paus närmar sig slutet på cachetiden. |  |
| `cmdf.no_memory_notes_for_this_project_yet` | No memory notes for this project yet. | Det finns inga minnesanteckningar för det här projektet ännu. |  |
| `cmdf.no_message_checked_yet` | No message checked yet. | Inget meddelande har kontrollerats ännu. |  |
| `cmdf.no_need_to_compact_the_session_yet` | No need to compact the session yet. | Du behöver inte komprimera sessionen än. |  |
| `cmdf.no_note_called_file_looked_for_names` | No note called {file}. Looked for: {names}. | Ingen anteckning heter {file}. Letade efter: {names}. |  |
| `cmdf.no_order_hidden_in_outside_text_was` | No order hidden in outside text was found in this session. | Ingen order gömd i text utifrån hittades i den här sessionen. |  |
| `cmdf.no_other_session_is_open` | No other session is open. | Ingen annan session är öppen. |  |
| `cmdf.no_other_session_waits_for_you` | No other session waits for you. | Ingen annan session väntar på dig. |  |
| `cmdf.no_prompt_queued` | no prompt queued. | ingen prompt i kö. |  |
| `cmdf.no_rule_with_a_command_in_backticks` | No rule with a command in backticks was found in your CLAUDE.md files. Write one like: Never run \`pkill\`. | Ingen regel med ett kommando inom backticks hittades i dina CLAUDE.md-filer. Skriv en så här (på engelska, det är den vaken läser): Never run \`pkill\`. |  |
| `cmdf.no_skill_was_used_in_the_last_7_days` | No skill was used in the last 7 days. | Ingen färdighet användes de senaste 7 dagarna. |  |
| `cmdf.no_task_list_yet_vaken_tasks_new` | No task list yet. /vaken-tasks new writes {file} with an example. Write one task per line, then /vaken-tasks start. | Ingen uppgiftslista ännu. /vaken-tasks new skriver {file} med ett exempel. Skriv en uppgift per rad och sedan /vaken-tasks start. |  |
| `cmdf.not_a_good_moment_by_the_checks` | Not a good moment by the checks; compacting anyway because you asked: | Inte ett bra tillfälle enligt kontrollerna; komprimerar ändå eftersom du bad om det: |  |
| `cmdf.not_everything_could_be_read_just_now_list` | Not everything could be read just now: {list}. | Allt gick inte att läsa just nu: {list}. |  |
| `cmdf.not_sent` | Not sent. | Inte skickat. |  |
| `cmdf.not_thrown_away` | Not thrown away: | Inte kastat: |  |
| `cmdf.not_used_this_week_colon` | Not used this week: | Inte använda den här veckan: |  |
| `cmdf.note_files_n` | Note files: {n}. | Anteckningsfiler: {n}. |  |
| `cmdf.nothing_matches_words` | Nothing matches "{words}". | Inget matchar "{words}". |  |
| `cmdf.nothing_to_recap_yet` | Nothing to recap yet. | Inget att sammanfatta än. |  |
| `cmdf.nothing_went_wrong_that_vaken_saw_today` | Nothing went wrong that vaken saw today. Nothing to suggest. | Inget gick fel som vaken såg i dag. Inget att föreslå. |  |
| `cmdf.of_about_k_k_tokens` | of about {k}k tokens | på ungefär {k}k tokens |  |
| `cmdf.offered_times` | offered {times} | erbjuden {times} |  |
| `cmdf.on_your_first_prompt_of_a_day` | On your first prompt of a day, one line above the chat box. | Vid din första prompt för dagen, en rad ovanför chattrutan. |  |
| `cmdf.one_go_you_write_claude_works_claude` | One go: you write, Claude works, Claude answers. | Ett varv: du skriver, Claude arbetar, Claude svarar. |  |
| `cmdf.only_answered_it_did_not_touch_anything` | Only answered; it did not touch anything. | Svarade bara; den rörde ingenting. |  |
| `cmdf.orders_hidden_in_outside_text_found_in` | Orders hidden in outside text found in this session: {n}. | Ordrar gömda i text utifrån som hittats i den här sessionen: {n}. |  |
| `cmdf.other_sessions` | Other sessions: | Andra sessioner: |  |
| `cmdf.outside_text_fence_state` | Outside-text fence: {state}. | Staket mot text utifrån: {state}. |  |
| `cmdf.parked_idea_n_in_the_lot_claude` | Parked: {idea}<br>{n} in the lot. Claude keeps working; nothing was sent. | Parkerad: {idea}<br>{n} i parkeringen. Claude arbetar vidare; inget skickades. |  |
| `cmdf.parked_ideas_n` | Parked ideas ({n}): | Parkerade idéer ({n}): |  |
| `cmdf.parts_of_the_pane_list` | Parts of the pane: {list}. | Delar av panelen: {list}. |  |
| `cmdf.paused_for_safety_commands_edits_tools_agents` | Paused for safety. Commands, edits, tools, agents and web fetches are stopped in this session until /vaken-pause off. This stops doing, not thinking: Claude may still write. | Pausad för säkerhets skull. Kommandon, ändringar, verktyg, agenter och webbhämtningar är stoppade i den här sessionen tills /vaken-pause off. Det stoppar görandet, inte tänkandet: Claude kan fortfarande skriva. |  |
| `cmdf.plan_first_ask` | Plan first: ask. | Plan först: fråga. |  |
| `cmdf.plan_first_is_off_turn_it_on` | Plan first is off. Turn it on: Settings &gt; Prompts and memory. | Plan först är av. Slå på det: Inställningar &gt; Prompter och minne. |  |
| `cmdf.plan_first_off_turn_it_on_settings` | Plan first: off. Turn it on: Settings &gt; Prompts and memory. | Plan först: av. Slå på det: Inställningar &gt; Prompter och minne. |  |
| `cmdf.plan_first_suggest` | Plan first: suggest. | Plan först: föreslå. |  |
| `cmdf.plan_limit_not_reported_yet` | Plan limit not reported yet. | Plangränsen är inte rapporterad än. |  |
| `cmdf.prompt_review_is_mode_no_prompt_reviewed` | Prompt review is {mode}. No prompt reviewed yet in this session. | Promptgranskning är {mode}. Ingen prompt har granskats ännu i den här sessionen. |  |
| `cmdf.prompt_review_is_off_now` | Prompt review is off now. | Promptgranskning är av nu. |  |
| `cmdf.prompt_review_is_off_turn_it_on` | Prompt review is off. Turn it on: Settings &gt; Prompts and memory. | Promptgranskning är av. Slå på den: Inställningar &gt; Prompter och minne. |  |
| `cmdf.prompts_queued` | {prompts} queued. | {prompts} i kö. |  |
| `cmdf.pull_first_do_not_force_the_push` | Pull first. Do not force the push. | Hämta först (pull). Tvinga inte pushen. |  |
| `cmdf.putting_idea_n_into_the_prompt_box` | Putting idea {n} into the prompt box in a moment. It stays in the lot until you drop it.<br>Idea {n}: {idea} | Lägger idé {n} i promptrutan om en stund. Den ligger kvar i parkeringen tills du tar bort den.<br>Idé {n}: {idea} |  |
| `cmdf.queue_a_sentence_vaken_pause_steer_queue` | Queue a sentence: /vaken-pause steer queue &lt;sentence&gt;, or /vaken-pause steer queue @2 &lt;sentence&gt; for another session. When that session is quiet, the sentence shows dim in its prompt box. Its owner presses Tab to take it. Nothing is sent by itself. | Köa en mening: /vaken-pause steer queue &lt;mening&gt;, eller /vaken-pause steer queue @2 &lt;mening&gt; för en annan session. När den sessionen är tyst visas meningen dämpad i dess promptruta. Dess ägare trycker Tab för att ta den. Inget skickas av sig självt. |  |
| `cmdf.queued_age_ago` | queued {age} ago | köad för {age} sedan |  |
| `cmdf.queued_for_target_text_it_shows_dim` | Queued for {target}: "{text}". It shows dim in the prompt box when that session is quiet. Press Tab to take it. | Köat för {target}: "{text}". Det visas dämpat i promptrutan när den sessionen är tyst. Tryck Tab för att ta det. |  |
| `cmdf.quiet_is_not_on` | Quiet is not on. | Tyst är inte på. |  |
| `cmdf.quiet_is_on_for_50_minutes_in` | Quiet is on for 50 minutes in every session: toasts and the band's other lines wait, only what needs you gets through. /vaken-help run focus off ends it. | Tyst är på i 50 minuter i alla sessioner: notiser och de andra raderna ovanför chattrutan väntar, bara det som behöver dig kommer fram. /vaken-help run focus off avslutar det. |  |
| `cmdf.quiet_n_min_left_only_what_needs` | Quiet: {n} min left. Only what needs you gets through. /vaken-help run focus off ends it. | Tyst: {n} min kvar. Bara det som behöver dig kommer fram. /vaken-help run focus off avslutar det. |  |
| `cmdf.ran_x` | ran {x} | körde {x} |  |
| `cmdf.read_age` | read {age} | läst {age} |  |
| `cmdf.read_just_now` | Read just now. | Läst just nu. |  |
| `cmdf.removed_idea_n` | Removed idea {n}. | Tog bort idé {n}. |  |
| `cmdf.results_from_the_web_from_other_apps` | Results from the web, from other apps (MCP tools), and files from node\_modules or a downloads folder come with a note for Claude: this is data, not orders. | Resultat från webben, från andra appar (MCP-verktyg) och filer från node\_modules eller en nedladdningsmapp kommer med en not till Claude: det här är data, inte order. |  |
| `cmdf.risky_commands_were_tried` | risky commands were tried | riskfyllda kommandon provades |  |
| `cmdf.rules_vaken_watches_n` | Rules vaken watches ({n}): | Regler som vaken bevakar ({n}): |  |
| `cmdf.run_the_install_step_for_the_project` | Run the install step for the project (for example npm install), then try again. | Kör installationssteget för projektet (till exempel npm install) och försök igen. |  |
| `cmdf.same_topic_pct_of_the_key_words` | Same topic: {pct}% of the key words match the earlier messages. | Samma ämne: {pct} % av nyckelorden stämmer med de tidigare meddelandena. |  |
| `cmdf.say_vaken_explain_alone_to_see_what` | Say /vaken-explain alone to see what vaken did today. | Skriv bara /vaken-explain för att se vad vaken gjorde i dag. |  |
| `cmdf.say_vaken_explain_words_for_the_reason` | Say /vaken-explain &lt;words&gt; for the reason. | Skriv /vaken-explain &lt;ord&gt; för skälet. |  |
| `cmdf.say_vaken_explain_words_to_read_about` | Say /vaken-explain &lt;words&gt; to read about any line, for example /vaken-explain without proof. | Skriv /vaken-explain &lt;ord&gt; för att läsa om en rad, till exempel /vaken-explain without proof. |  |
| `cmdf.say_which_idea_vaken_memory_park_send` | Say which idea: /vaken-memory park send 2 | Säg vilken idé: /vaken-memory park send 2 |  |
| `cmdf.say_which_session_vaken_pause_steer_send` | Say which session: /vaken-pause steer send @2 &lt;sentence&gt;. /vaken-pause steer shows the numbers. | Säg vilken session: /vaken-pause steer send @2 &lt;mening&gt;. /vaken-pause steer visar numren. |  |
| `cmdf.says_when_a_new_topic_would_cost` | Says when a new topic would cost less in a new session. | Säger till när ett nytt ämne skulle kosta mindre i en ny session. |  |
| `cmdf.send_one_to_the_prompt_box_vaken` | Send one to the prompt box: /vaken-memory park send &lt;n&gt;. Remove one: /vaken-memory park drop &lt;n&gt;. | Skicka en till promptrutan: /vaken-memory park send &lt;n&gt;. Ta bort en: /vaken-memory park drop &lt;n&gt;. |  |
| `cmdf.sent_to_name_it_reads_it_as` | Sent to "{name}". It reads it as a message from this session. | Skickat till "{name}". Den läser det som ett meddelande från den här sessionen. |  |
| `cmdf.skills_used_in_the_last_7_days` | Skills used in the last 7 days: | Färdigheter som användes de senaste 7 dagarna: |  |
| `cmdf.small_details_from_early_in_the_session_can` | Small details from early in the session can be lost. After it runs, /vaken-compact shows which files the summary still names. | Små detaljer från tidigt i sessionen kan gå förlorade. När den har körts visar /vaken-compact vilka filer sammanfattningen fortfarande nämner. |  |
| `cmdf.started_x` | started {x} | startade {x} |  |
| `cmdf.steer_n_is_a_task_number` | Steer (N is a task number): | Styr (N är ett uppgiftsnummer): |  |
| `cmdf.stop_the_other_program_or_pick_another` | Stop the other program, or pick another port. | Stoppa det andra programmet, eller välj en annan port. |  |
| `cmdf.suggests_or_asks_for_a_short_plan` | Suggests or asks for a short plan before a big task. | Föreslår eller ber om en kort plan före en stor uppgift. |  |
| `cmdf.task_n_holds_lost_loses_type_vaken` | task {n} holds {lost}. {loses} Type /vaken-tasks throw {n} yes to do it anyway, or keep the work with /vaken-tasks keep {n}. | uppgift {n} innehåller {lost}. {loses} Skriv /vaken-tasks throw {n} yes för att göra det ändå, eller behåll arbetet med /vaken-tasks keep {n}. |  |
| `cmdf.tests_were_weakened` | tests were weakened | tester försvagades |  |
| `cmdf.that_sentence_is_already_in_the_queue` | That sentence is already in the queue. | Den meningen finns redan i kön. |  |
| `cmdf.that_session_already_has_n_queued_vaken` | That session already has {n} queued. /vaken-pause steer clear empties this session's queue. | Den sessionen har redan {n} i kö. /vaken-pause steer clear tömmer den här sessionens kö. |  |
| `cmdf.that_was_a_command_not_a_message` | That was a command, not a message, so nothing was checked. | Det var ett kommando, inte ett meddelande, så inget kontrollerades. |  |
| `cmdf.the_brief_above_the_chat_box_is` | The brief above the chat box is off. Turn it on: Settings &gt; Prompts and memory. | Sammanfattningen ovanför chattrutan är av. Slå på den: Inställningar &gt; Prompter och minne. |  |
| `cmdf.the_brief_could_not_read_your_sessions` | The brief could not read your sessions. Try again in a moment. | Sammanfattningen kunde inte läsa dina sessioner. Försök igen om en stund. |  |
| `cmdf.the_budget_ran_short` | the budget ran short | budgeten räckte inte |  |
| `cmdf.the_closest_lines` | The closest lines: | De närmaste raderna: |  |
| `cmdf.the_last_failed_step_was_of_a` | The last failed step was of a kind vaken does not know. Ask Claude to explain it in plain words. | Det senaste misslyckade steget var av en sort som vaken inte känner till. Be Claude förklara det med enkla ord. |  |
| `cmdf.the_last_message_continued_the_work_so` | The last message continued the work, so there is no nudge. | Det senaste meddelandet fortsatte arbetet, så ingen påminnelse visas. |  |
| `cmdf.the_last_message_was_too_short_to` | The last message was too short to compare (under {n} key words). | Det senaste meddelandet var för kort att jämföra (under {n} nyckelord). |  |
| `cmdf.the_last_moments_it_would_have_compacted` | The last moments it would have compacted the session ({n} kept): | De senaste lägena där den skulle ha komprimerat sessionen ({n} sparade): |  |
| `cmdf.the_line_above_the_chat_box_shows` | The line above the chat box shows this on your first prompt of a day. | Raden ovanför chattrutan visar det här vid din första prompt för dagen. |  |
| `cmdf.the_list_of_skills_in_memory_could_not` | The list of skills in memory could not be read, so the cost is not shown. | Listan över färdigheter i minnet gick inte att läsa, så kostnaden visas inte. |  |
| `cmdf.the_list_of_things_vaken_did_for` | The list of things vaken did for you, such as a compact. | Listan över vad vaken gjorde åt dig, till exempel en komprimering. |  |
| `cmdf.the_list_shows_the_kind_and_the` | The list shows the kind and the place, never what was in it. It reads commands and outside tools by name, so it can miss a step hidden in a script file. | Listan visar sort och plats, aldrig vad som fanns i det. Den läser kommandon och verktyg utifrån efter namn, så den kan missa ett steg som är gömt i en skriptfil. |  |
| `cmdf.the_message_already_asks_for_a_plan` | The message already asks for a plan. | Meddelandet ber redan om en plan. |  |
| `cmdf.the_message_does_not_look_like_a` | The message does not look like a big task. | Meddelandet ser inte ut som en stor uppgift. |  |
| `cmdf.the_message_is_long_n_words` | The message is long ({n} words). | Meddelandet är långt ({n} ord). |  |
| `cmdf.the_message_names_n_big_steps` | The message names {n} big steps. | Meddelandet nämner {n} stora steg. |  |
| `cmdf.the_nudge_is_off_turn_it_on` | The nudge is off. Turn it on: Settings &gt; Prompts and memory. | Påminnelsen är av. Slå på den: Inställningar &gt; Prompter och minne. |  |
| `cmdf.the_nudge_showed` | The nudge showed. | Påminnelsen visades. |  |
| `cmdf.the_outbox_is_off_turn_it_on` | The outbox is off. Turn it on: Settings &gt; Safety. | Utkorgen är av. Slå på den: Inställningar &gt; Säkerhet. |  |
| `cmdf.the_parking_lot_is_empty` | The parking lot is empty. | Idéparkeringen är tom. |  |
| `cmdf.the_parking_lot_is_empty_add_an` | The parking lot is empty. Add an idea: /vaken-memory park &lt;idea&gt; | Idéparkeringen är tom. Lägg till en idé: /vaken-memory park &lt;idé&gt; |  |
| `cmdf.the_phrases_themselves_are_not_kept_only` | The phrases themselves are not kept, only the count and the tool name. | Själva fraserna sparas inte, bara antalet och verktygets namn. |  |
| `cmdf.the_question_was_dismissed` | The question was dismissed. | Frågan avfärdades. |  |
| `cmdf.the_queue_of_this_session_is_empty` | The queue of this session is empty. | Den här sessionens kö är tom. |  |
| `cmdf.the_running_answer_could_not_be_cancelled` | The running answer could not be cancelled; press Escape to stop it. | Det pågående svaret gick inte att avbryta; tryck Escape för att stoppa det. |  |
| `cmdf.the_running_answer_was_also_cancelled` | The running answer was also cancelled. | Det pågående svaret avbröts också. |  |
| `cmdf.the_send_failed` | The send failed. | Skickandet misslyckades. |  |
| `cmdf.the_session_holds_a_tokens_under_b` | The session holds {a} tokens, under {b}. A fresh start would save little. | Sessionen rymmer {a} tokens, under {b}. En ny session skulle spara lite. |  |
| `cmdf.the_session_holds_k_tokens` | The session holds {k} tokens. | Sessionen rymmer {k} tokens. |  |
| `cmdf.the_size_of_the_session_is_not` | The size of the session is not known yet. | Sessionens storlek är inte känd ännu. |  |
| `cmdf.the_skills_could_not_be_read_try` | The skills could not be read. Try again in a moment. | Färdigheterna gick inte att läsa. Försök igen om en stund. |  |
| `cmdf.the_small_model_did_not_answer_try` | The small model did not answer. Try again in a moment. | Den lilla modellen svarade inte. Försök igen om en stund. |  |
| `cmdf.the_summary_names_all_files` | The summary names all {files}. | Sammanfattningen nämner alla {files}. |  |
| `cmdf.the_summary_names_kept_of_files` | The summary names {kept} of {files} changed files (dropped: {dropped}). | Sammanfattningen nämner {kept} av {files} ändrade filer (utelämnade: {dropped}). |  |
| `cmdf.the_tool_reported_an_error` | the tool reported an error | verktyget rapporterade ett fel |  |
| `cmdf.there_are_not_enough_earlier_messages_to` | There are not enough earlier messages to compare with yet. | Det finns inte tillräckligt många tidigare meddelanden att jämföra med ännu. |  |
| `cmdf.there_is_no_answer_from_claude_in` | There is no answer from Claude in this session yet. | Det finns inget svar från Claude i den här sessionen ännu. |  |
| `cmdf.there_is_no_idea_n_list` | There is no idea {n}. {list} | Det finns ingen idé {n}. {list} |  |
| `cmdf.there_is_no_sentence_to_queue` | There is no sentence to queue. | Det finns ingen mening att köa. |  |
| `cmdf.there_is_no_session_n_vaken_pause` | There is no session @{n}. /vaken-pause steer shows the numbers. | Det finns ingen session @{n}. /vaken-pause steer visar numren. |  |
| `cmdf.these_change_something_outside` | These change something outside | De här ändrar något utanför |  |
| `cmdf.this_answer` | This answer | Det här svaret |  |
| `cmdf.this_answer_nothing_has_left_this_computer` | This answer: nothing has left this computer that vaken saw. | Det här svaret: inget har lämnat den här datorn som vaken såg. |  |
| `cmdf.this_looks_like_a_big_task_but` | This looks like a big task, but the session already made {n} edits. A plan would come late. | Det här ser ut som en stor uppgift, men sessionen har redan gjort {n} ändringar. En plan skulle komma sent. |  |
| `cmdf.this_looks_like_a_big_task_but_2` | This looks like a big task, but a plan was suggested less than 30 minutes ago. | Det här ser ut som en stor uppgift, men en plan föreslogs för mindre än 30 minuter sedan. |  |
| `cmdf.this_session_name` | This session ({name}): | Den här sessionen ({name}): |  |
| `cmdf.this_session_state` | This session: {state}. | Den här sessionen: {state}. |  |
| `cmdf.throwing_away_loses_it_for_good` | Throwing away loses it for good. | Om du kastar det går det förlorat för alltid. |  |
| `cmdf.throwing_away_loses_them_for_good` | Throwing away loses them for good. | Om du kastar dem går de förlorade för alltid. |  |
| `cmdf.title_times_in_7_days` | {title} ({times} in 7 days) | {title} ({times} på 7 dagar) |  |
| `cmdf.title_times_today` | {title} ({times} today) | {title} ({times} i dag) |  |
| `cmdf.to_change_a_note_tell_claude_forget` | To change a note, tell Claude: "forget the note about ..." or "change the note about ...". /vaken-memory &lt;file name&gt; shows one note in full. | Vill du ändra en anteckning, säg till Claude: "glöm anteckningen om ..." eller "ändra anteckningen om ...". /vaken-memory &lt;filnamn&gt; visar en anteckning i sin helhet. |  |
| `cmdf.to_compact_with_a_note_of_what` | To compact with a note of what to keep, paste: | För att komprimera med en notering om vad som ska behållas, klistra in: |  |
| `cmdf.to_send_a_message_into_another_session` | To send a message into another session: /vaken-pause steer send @2 &lt;sentence&gt;. Vaken asks you first. | Skicka ett meddelande till en annan session: /vaken-pause steer send @2 &lt;mening&gt;. Vaken frågar dig först. |  |
| `cmdf.today_vaken_did_things` | Today vaken did {things}: | I dag gjorde vaken {things}: |  |
| `cmdf.token` | Token | Token |  |
| `cmdf.tool_failed_ago_what_it_means_says` | {tool} failed {ago}.<br>What it means: {says}<br>First thing to try: {tryThis} | {tool} misslyckades {ago}.<br>Vad det betyder: {says}<br>Första sak att prova: {tryThis} |  |
| `cmdf.turn` | Turn | Varv |  |
| `cmdf.two_sessions_edited_the_same_file` | two sessions edited the same file | två sessioner ändrade samma fil |  |
| `cmdf.type_cockpit_compact_now_to_compact` | Type /vaken-compact now to compact. | Skriv /vaken-compact now för att komprimera. |  |
| `cmdf.use_vaken_away_on_vaken_away_off` | Use: /vaken-away on, /vaken-away off, or /vaken-away to look. | Använd: /vaken-away on, /vaken-away off, eller /vaken-away för att titta. |  |
| `cmdf.use_vaken_pause_steer_the_list_vaken` | Use: /vaken-pause steer (the list), /vaken-pause steer queue &lt;sentence&gt;, /vaken-pause steer queue @2 &lt;sentence&gt;, /vaken-pause steer send @2 &lt;sentence&gt;, /vaken-pause steer clear, /vaken-pause steer stop | Använd: /vaken-pause steer (listan), /vaken-pause steer queue &lt;mening&gt;, /vaken-pause steer queue @2 &lt;mening&gt;, /vaken-pause steer send @2 &lt;mening&gt;, /vaken-pause steer clear, /vaken-pause steer stop |  |
| `cmdf.used_x` | used {x} | använde {x} |  |
| `cmdf.vaken_could_not_look_for_other_sessions` | Vaken could not look for other sessions now. Try again in a moment. | Vaken kunde inte titta efter andra sessioner just nu. Försök igen om en stund. |  |
| `cmdf.vaken_could_not_read_the_memory_notes` | Vaken could not read the memory notes for this project. | Vaken kunde inte läsa minnesanteckningarna för det här projektet. |  |
| `cmdf.vaken_could_not_read_what_it_wrote` | Vaken could not read what it wrote down. Try again in a moment. | Vaken kunde inte läsa det som skrivits ned. Försök igen om en stund. |  |
| `cmdf.vaken_did_nothing_today_that_it_wrote` | Vaken did nothing today that it wrote down. | Vaken gjorde ingenting i dag som det skrev ned. |  |
| `cmdf.vaken_did_what` | vaken did {what} | vaken gjorde {what} | The tail of the band brief, after a comma: not the start of a sentence. |
| `cmdf.vaken_did_what_yesterday_vaken_today_value` | Vaken did {what} yesterday. /vaken-today value shows what. | Vaken gjorde {what} i går. /vaken-today value visar vad. |  |
| `cmdf.vaken_pause_steer_stop_halts_changes_in` | /vaken-pause steer stop halts changes in this session. It stops steps that change things, not thinking. | /vaken-pause steer stop stoppar ändringar i den här sessionen. Det stoppar steg som ändrar något, inte tänkandet. |  |
| `cmdf.vaken_tasks_add_task_adds_a_task` | /vaken-tasks add &lt;task&gt;: adds a task to the run. | /vaken-tasks add &lt;uppgift&gt;: lägger till en uppgift i körningen. |  |
| `cmdf.vaken_tasks_afterlimit_go_wait_after_a` | /vaken-tasks afterlimit go\|wait: after a plan limit, go on by itself or wait for you. | /vaken-tasks afterlimit go\|wait: efter en plangräns, fortsätt av sig själv eller vänta på dig. |  |
| `cmdf.vaken_tasks_again_runs_the_same_tasks` | /vaken-tasks again: runs the same tasks again as a new run, when the run has ended. | /vaken-tasks again: kör samma uppgifter igen som en ny körning, när körningen är slut. |  |
| `cmdf.vaken_tasks_at_auto_n_sets_how` | /vaken-tasks at auto\|N: sets how many agents run at the same time. | /vaken-tasks at auto\|N: bestämmer hur många agenter som körs samtidigt. |  |
| `cmdf.vaken_tasks_check_command_sets_the_command` | /vaken-tasks check &lt;command&gt;: sets the command that runs after each task. | /vaken-tasks check &lt;kommando&gt;: bestämmer kommandot som körs efter varje uppgift. |  |
| `cmdf.vaken_tasks_clear_forgets_a_finished_run` | /vaken-tasks clear: forgets a finished run. | /vaken-tasks clear: glömmer en avslutad körning. |  |
| `cmdf.vaken_tasks_go_goes_on_after_a` | /vaken-tasks go: goes on after a pause. | /vaken-tasks go: fortsätter efter en paus. |  |
| `cmdf.vaken_tasks_keep_all_throw_all_yes` | /vaken-tasks keep all \| throw all yes: keeps or deletes every folder copy left. Clear and Run again wait for it. | /vaken-tasks keep all \| throw all yes: behåller eller raderar varje arbetsträd som finns kvar. Töm och Kör igen väntar på det. |  |
| `cmdf.vaken_tasks_keep_n_keeps_the_work` | /vaken-tasks keep N: keeps the work of task N on its branch and removes its folder copy. | /vaken-tasks keep N: behåller arbetet i uppgift N på dess gren och tar bort dess arbetsträd. |  |
| `cmdf.vaken_tasks_limit_min_helper_run_night` | /vaken-tasks limit min\|helper\|run\|night &lt;number&gt;: sets when an agent or the run is stopped (night 0: a night run uses the run limit). | /vaken-tasks limit min\|helper\|run\|night &lt;tal&gt;: bestämmer när en agent eller körningen stoppas (night 0: en nattkörning använder körningens gräns). |  |
| `cmdf.vaken_tasks_name_words_names_the_run` | /vaken-tasks name &lt;words&gt;: names the run. | /vaken-tasks name &lt;ord&gt;: ger körningen ett namn. |  |
| `cmdf.vaken_tasks_new_load_plan_writes_an` | /vaken-tasks new \| load \| plan: writes an example task file, reads it, or asks Claude to write the plan. | /vaken-tasks new \| load \| plan: skriver en exempelfil med uppgifter, läser den, eller ber Claude skriva planen. |  |
| `cmdf.vaken_tasks_night_starts_the_run_as` | /vaken-tasks night: starts the run as a night run (setting night.mode): only on mains power, inside the plan limit and the night cost limit, with strict safety. | /vaken-tasks night: startar körningen som en nattkörning (inställningen night.mode): bara på nätström, inom plangränsen och nattens kostnadsgräns, med sträng säkerhet. |  |
| `cmdf.vaken_tasks_pause_no_new_agent_starts` | /vaken-tasks pause: no new agent starts; the running ones finish. | /vaken-tasks pause: ingen ny agent startar; de som körs blir klara. |  |
| `cmdf.vaken_tasks_remove_n_removes_a_task` | /vaken-tasks remove N: removes a task that has not started. | /vaken-tasks remove N: tar bort en uppgift som inte har startat. |  |
| `cmdf.vaken_tasks_report_history_the_last_finished` | /vaken-tasks report \| history: the last finished run, or all. | /vaken-tasks report \| history: den senaste avslutade körningen, eller alla. |  |
| `cmdf.vaken_tasks_retry_n_runs_a_failed` | /vaken-tasks retry N: runs a failed or stopped task again. | /vaken-tasks retry N: kör en misslyckad eller stoppad uppgift igen. |  |
| `cmdf.vaken_tasks_reviewer_on_off_a_reviewer` | /vaken-tasks reviewer on\|off: a reviewer reads each finished task. | /vaken-tasks reviewer on\|off: en granskare läser varje klar uppgift. |  |
| `cmdf.vaken_tasks_say_n_words_sends_words` | /vaken-tasks say N &lt;words&gt;: sends words to a running agent. | /vaken-tasks say N &lt;ord&gt;: skickar ord till en agent som körs. |  |
| `cmdf.vaken_tasks_set_n_role_model_after` | /vaken-tasks set N role\|model\|after\|folder\|text &lt;value&gt;: changes a task that has not started. | /vaken-tasks set N role\|model\|after\|folder\|text &lt;värde&gt;: ändrar en uppgift som inte har startat. |  |
| `cmdf.vaken_tasks_start_anyway_starts_the_run` | /vaken-tasks start \[anyway\]: starts the run (anyway skips the cost warning). | /vaken-tasks start \[anyway\]: startar körningen (anyway hoppar över kostnadsvarningen). |  |
| `cmdf.vaken_tasks_start_runs_them_with_agents` | /vaken-tasks start runs them with agents. | /vaken-tasks start kör dem med agenter. |  |
| `cmdf.vaken_tasks_stop_n_stops_one_agent` | /vaken-tasks stop N: stops one agent. | /vaken-tasks stop N: stoppar en agent. |  |
| `cmdf.vaken_tasks_stop_stops_every_agent_of` | /vaken-tasks stop: stops every agent of the run. | /vaken-tasks stop: stoppar varje agent i körningen. |  |
| `cmdf.vaken_tasks_template_save_apply_delete_name` | /vaken-tasks template save\|apply\|delete &lt;name&gt;: keeps, loads or deletes a set of tasks. | /vaken-tasks template save\|apply\|delete &lt;namn&gt;: sparar, läser in eller raderar en uppsättning uppgifter. |  |
| `cmdf.vaken_tasks_throw_n_deletes_the_work` | /vaken-tasks throw N: deletes the work and the branch of task N. It cannot be undone. | /vaken-tasks throw N: raderar arbetet och grenen i uppgift N. Det går inte att ångra. |  |
| `cmdf.vaken_wrote_nothing_down_yesterday` | Vaken wrote nothing down yesterday. | Vaken skrev inte ner något i går. |  |
| `cmdf.wait_a_few_minutes_then_try_again` | Wait a few minutes, then try again. | Vänta några minuter och försök igen. |  |
| `cmdf.wait_and_try_again_if_it_keeps` | Wait and try again. If it keeps failing, check the service status page. | Vänta och försök igen. Om det fortsätter att misslyckas, titta på tjänstens statussida. |  |
| `cmdf.waiting` | waiting | väntar |  |
| `cmdf.waits_claude_was_asked_n_times_and` | waits: Claude was asked {n} times and did not start it. Go on asks again. | väntar: Claude blev ombedd {n} gånger och startade den inte. Fortsätt frågar igen. |  |
| `cmdf.warn_when_another_session_works_in_this` | Warn when another session works in this folder. | Varna när en annan session arbetar i den här mappen. |  |
| `cmdf.what_claude_keeps_is_off_turn_it` | What Claude keeps is off: turn it on in Settings &gt; Money and plan to ask the summary to keep the goal, branch, files and next steps. | Vad Claude behåller är av: slå på det i Inställningar &gt; Pengar och plan för att be sammanfattningen behålla målet, grenen, filerna och nästa steg. |  |
| `cmdf.what_claude_keeps_is_on_the_goal` | What Claude keeps is on: the goal, the branch, the files and the next steps are added to the summary request. | Vad Claude behåller är på: målet, grenen, filerna och nästa steg läggs till i begäran om sammanfattning. |  |
| `cmdf.what_for_you` | {what} for you. | {what} på dig. |  |
| `cmdf.what_that_the_branch_you_are_on` | {what} that the branch you are on does not have | {what} som grenen du står på inte har |  |
| `cmdf.what_vaken_saw_today` | What vaken saw today: | Det här såg vaken i dag: |  |
| `cmdf.where` | Where | Var |  |
| `cmdf.where_to_look` | where to look | var du hittar mer |  |
| `cmdf.while_away_careful_while_away_a_step` | While away: Careful. While away, a step that the safety check would flag (risky commands, edits to protected files or outside your folders, odd new packages, weakened tests, outside actions, secrets) is stopped by itself, with no popup. Safe steps keep running. Allow once does not work while away. | När du är borta: Försiktig. När du är borta stoppas ett steg som säkerhetskontrollen skulle flagga (riskabla kommandon, ändringar av skyddade filer eller utanför dina mappar, udda nya paket, försvagade tester, åtgärder utåt, hemligheter) av sig självt, utan popup. Säkra steg fortsätter köra. Tillåt en gång fungerar inte när du är borta. |  |
| `cmdf.while_away_off_set_it_to_careful` | While away: Off. Set it to Careful in Settings &gt; Safety to stop risky steps while you are gone. | När du är borta: Av. Sätt det till Försiktig i Inställningar &gt; Säkerhet för att stoppa riskabla steg medan du är borta. |  |
| `cmdf.while_away_off_so_nothing_is_stopped` | While away: Off, so nothing is stopped. Set it to Careful in Settings &gt; Safety to stop risky steps while you are gone. | När du är borta: Av, så inget stoppas. Sätt det till Försiktig i Inställningar &gt; Säkerhet för att stoppa riskabla steg medan du är borta. |  |
| `cmdf.why` | Why: | Varför: |  |
| `cmdf.work_went_in_circles` | work went in circles | arbetet gick i cirklar |  |
| `cmdf.working` | working | arbetar |  |
| `cmdf.worktree` | Worktree | Arbetsträd |  |
| `cmdf.yesterday_cost_about_usd_as_vaken_counted` | Yesterday cost about {usd}, as vaken counted it. | I går kostade det ungefär {usd}, som vaken räknade. |  |
| `cmdf.yesterday_cost_not_counted` | Yesterday cost: not counted. | I går: kostnad inte räknad. |  |
| `cmdf.you_said_no` | You said no. | Du sa nej. |  |
