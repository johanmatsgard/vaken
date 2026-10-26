# All 187 vaken features

vaken is mission control for Claude Code Desktop. Every feature below ships in the plugin. Back to the [README](../README.md).

## 🛡️ Safety stop and guards

Seat belt, not a sandbox.

1. Stops a destructive command (bulk delete, forced push, `git reset --hard`) before it runs, when Claude Code would not ask you first.
2. Stops a step that would expose a secret. It names the kind of secret, never its value.
3. Warns about edits outside your project folders.
4. Checks a new package before install: is the name real, very young or a look-alike?
5. Warns when Claude edits a test to make it pass.
6. Holds a database migration for your OK.
7. Warns about real-world actions: sending, posting, paying, cloud changes.
8. Checks the environment name, so a step does not hit production by mistake.
9. Fences web text that tries to give Claude orders.
10. Outbox: lists what left your computer this turn.
11. Command ledger: the last 50 commands, with secrets masked.
12. A judge for each command: safe, risky or blocked.
13. `/vaken-pause` pauses every step that changes things, in one session.
14. "Allow once" lets one stopped step through.
15. Halt all: pauses the changes of every session.
16. Loop breaker: catches a step that fails the same way 3 times.
17. Stuck ladder: start fresh with only the error, or one try with a stronger model.
18. "Going round in circles" note when the same file is edited again and again.
19. Goal-drift watch: many edits far from your goal.
20. Agent cap: warns or stops when too many agents run.
21. Explains a step that was denied, for 3 minutes.
22. Plugin trust card: what each plugin you installed can do.
23. Merge guard: a merge needs every check green, and vaken reads the exact command first.
24. Keep going until green: at most 3 fix rounds, then it stops and tells you.

## 👀 Needs you, in one line

Never miss a question.

1. Needs you: the top card lists every question, stopped step and failed check, from all sessions.
2. Approvals inbox across sessions.
3. Answer another session's question from the pane. vaken never says yes for you.
4. Reply box on "Your turn" rows.
5. Names the session that asks, when several run.
6. Heartbeat: "quiet" after 10 minutes, "may be stuck" after 20.
7. Nudge a session that may be stuck.
8. A shell step that runs for 10 minutes gets Stop or Keep waiting.
9. Two sessions in one folder: a warning when they touch the same file or port.
10. Is Claude down? A calm line when the Claude status page reports an incident.
11. Where was I: what waits for you after a break.
12. Daily recap on your first prompt of the day.
13. Open ends each morning, one line per project.
14. Weekly value line: what vaken saved you.
15. Waits: how long Claude waited for you.
16. Focus for 50 minutes: only what needs you gets through.
17. `/vaken-today glance`: your day in one line.
18. Notices are calm: each event once, at most 6 an hour.
19. Tell me when a watched session finishes or its tests pass.

## 📊 Plan limits, cost and saving usage

Know before you hit the wall.

1. Your 5-hour and weekly limits, each with a bar and its reset time.
2. "At this pace": says if you will run out before the reset.
3. Finish safely: lets Claude stop at a safe point before a limit cuts it off.
4. Your daily share of the week.
5. Where it went: which kinds of work cost the most.
6. Live cost and burn per hour.
7. Session and day budget, with Warn or Stop. Off by default.
8. Budget extend: let one stopped step through.
9. Quota planner: does a job of this size fit in what is left?
10. Cost estimate before a task run.
11. Auto-resume after a limit resets: remind you, or continue.
12. Lean session: long test, build and install logs reach Claude cut to the errors and last lines.
13. No double reads: an unchanged file is not read again.
14. Skips repeated reminders.
15. Model and effort hint: a cheaper model or lower effort when the ask is small.
16. A tip when a lookup agent could use a cheaper model.
17. Warns that a model switch drops the prompt cache.
18. Instruction-file diet: size and repeated lines of your CLAUDE.md files.
19. Cost hint before a big job.
20. Savings line: minutes saved and risky steps stopped.
21. Picture cost check.
22. Cache keeper: keeps the cache warm while you think. Off by default.

## 🧠 Context and auto-compacting

Compact at the cheap moment.

1. Context gauge with a mark where Claude Code would compact.
2. Auto-compaction at a break or at 60% full, while the cache is warm, so it is cheap.
3. Never compacts mid-answer, while an agent runs in front, or while a risky step waits.
4. Never compacts while you have text in the prompt box.
5. Waits for a task boundary when helpers still run in the background.
6. Safe save first: a handoff note and a checkpoint before Auto compacts.
7. Every summary keeps your goal, branch, open files, decisions and open questions.
8. Checks after compaction that the summary kept them.
9. Compact now, with the same checks.
10. "Why not now?" says what holds compaction back.
11. Good-moment score for compacting.
12. Fresh-start nudge when a new topic starts in a big chat.
13. Context health: instruction files, memory and handoff, with their size.

## ✍️ Better prompts and answers

Better asks, better answers.

1. Prompt check: spots a vague prompt, as a tip or a question to Claude.
2. "Send the better one": a sharper prompt, with no model call.
3. Assumption review: Claude lists what it assumed before it starts.
4. Plan first: suggests a plan for work of several steps.
5. Answer shape: short, or a report.
6. Plain mode: short sentences and simple words.
7. Say it simpler: the last answer again, in plain words.
8. Error translator: a failed step, in plain words, with the first thing to try.
9. What just happened: a short story of the last turn.
10. Next-step buttons (Run tests, Commit, What changed) send the likely next ask in one press.
11. Quick actions: your own one-word asks.
12. Working habits: a visible task list, a done and next close, questions you can press.
13. Skill coach: offers a skill for a request you repeat.
14. Learns you: a correction you repeat 3 times becomes a project rule, on your yes.
15. Selected text: explain it, make it a task, or copy it.
16. Steer queue: line up sentences for a busy session.
17. Skills card: which skills you use, what they cost, and a search.
18. Decision log.
19. Parking lot for side ideas, per project.
20. A read-only status tool that Claude itself can call.

## ✅ Proof, not promises

Done means done.

1. "Done" check: when Claude says done or "tests pass", vaken checks that a real check ran.
2. Receipts: every check that ran, with its result.
3. Definition of done per task.
4. Confidence score, from evidence only.
5. Review queue, riskiest change first.
6. Evidence pack for a review.
7. Ship check: ready, or what blocks it.
8. Pull requests card: checks, conflicts, and Fix or Ship in one press.
9. Fix CI until green: at most 3 tries a day per branch.
10. Typed merge: check, fix, merge, each on your yes.
11. Merge order and digest of branch changes.
12. Review by story.
13. Cost per outcome: what the last finished piece cost.

## 🤖 Agents, sessions and the task runner

Every agent, one list.

1. Every agent in all your sessions: state, time and cost.
2. Drill into a helper: its last 5 steps.
3. Flags an agent with no progress for 10 minutes.
4. Agent done notices, with time and cost.
5. Other sessions: your turn first, then working, then quiet. Pin the ones you care about.
6. Clear session names from the first message.
7. Task runner: a list of tasks, helpers run them, a check after each.
8. Each code task in its own folder copy (git worktree).
9. Helpers sized to your computer's free room.
10. A reviewer note per task: good or not, and the main risk.
11. Night run on mains power, inside plan and cost limits.
12. Start a task from a goal, in one row.
13. Task templates and starter agent files.
14. Computer card: memory, processor and room for more helpers.
15. Laptop gauge: memory, swap, battery and heat.
16. Keeps the Mac awake while work runs.
17. Shared ports: a note before a port that is in use.
18. Worktree janitor: removes merged copies, never forced.
19. Same-file overlap warning between sessions.
20. Orphan finder: leftover programs, with a stop command for you to run.
21. Resume a session by name.
22. Search across sessions.
23. Session timeline.

## ↩️ Undo, memory and handoff

Undo anything. Forget nothing.

1. A copy of each file before Claude changes it.
2. Undo the last turn: preview, then yes.
3. Copies before `git checkout`, `restore`, `stash` and `reset` too.
4. Named checkpoints, with a preview before restore.
5. Handoff note for the next session: goal, branch, changed files, checks and open questions, each marked checked or not.
6. Session packet: the same facts as a file.
7. Memory and notes: what Claude keeps for this project, in plain words.
8. Rules in force: your instruction files and allow and deny counts.
9. Standup and story of the day.
10. Reflection: what was caught, and a rule to write down.
11. Store keeper: clears old notes by itself.
12. Self-test after each start, and health counts of vaken's own failures.
13. Audit export of the last 500 vaken actions.

## 📱 Away, notifications and phone

Walk away. vaken keeps watch.

1. Away mode: strict safety and a cost stop for a set time.
2. Away digest: what finished, what waited, what it cost.
3. Mac notifications: a banner, a sound or a spoken line.
4. Status line under the prompt box.
5. Quiet hours.
6. Phone hello: a three-line summary when a phone joins.
7. Phone mode: short, numbered answers.
8. One-word phone commands: `/ok`, `/no`, `/go`, `/st`.
9. A number menu on `/vaken` for the phone.
10. `/vaken show`, `/vaken run` and `/vaken pic` send files and pictures to the phone.
11. Tells Claude what a phone cannot do, so it sends files instead of asking you to open them.
12. Preview card: your dev server and pictures at phone, iPad and desktop widths.
13. Dev-server finder: which port answers.
14. Takes a new picture only when a screen file changed.

## 🎨 Native look, views and settings

Looks like it came with the app.

1. Same spacing, type and colours as Claude Code Desktop.
2. Light and dark mode, automatic.
3. Eight accent colours: Native, Violet, Teal, Rose, Green, Ocean, Slate and Plum.
4. Three views: Standard, All and Custom.
5. Detail level: Glance, Short or All.
6. More or Less on each card.
7. A card with a problem moves to the top.
8. Drag cards to arrange them, and save named layouts.
9. Columns on a wide screen: Auto, or 1 to 6.
10. Pop the pane out to its own window.
11. Reduced motion.
12. English and Swedish, like your Mac by default.
13. Five setup questions the first time. Skip takes the recommended answers.
14. Seven ready modes, from "Only alerts" to "Everything".
15. A setting per project or per session.
16. "Changed by you": every setting you changed, each with Undo.
17. Help pages with search, and "What is this?" on every line.
18. `/vaken-explain` says what any card or line means.
19. Keyboard keys for the pane.
20. New installs start small: five cards, the rest appear when they have something to say.

## 🔒 Privacy

Your data stays yours.

1. No server and no telemetry. Nothing goes to the authors.
2. Data stays on your computer.
3. Secrets are masked, never stored.
4. Counts and short codes, not your words, for loops, relays and denied steps.
5. Never writes your settings.json or permission rules.
