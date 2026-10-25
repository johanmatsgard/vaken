# Guide

vaken is a quiet pane next to your chat in Claude Code Desktop. It shows what needs you, how much of your plan is left, how full your session is, and what your agents do. This guide says what each card shows and what to do with it.

## Open the pane

1. Start a new session. A plugin loads only when a session starts.
2. Type `/vaken` in the chat box of the new session and press Return.

The pane opens to the right of the chat. Press Escape to close it. On Windows 11 it works the same way.

Send one message first. The plan limits and the session figures show only after the first answer.

The first time, the Start here card asks five short questions, one at a time: how much vaken tells you, what happens at a risky step, whether to warn or stop at a cost budget, how Claude works with you, and what to do in a long chat. The recommended answer of each is marked. Press Next to go on, Back to go back, and Finish on the last page, or press "Skip, use recommended". The first question uses the same names as Settings: Only alerts, Recommended, Everything useful. At a risky step, "Tell me, don't stop" warns, but the worst steps (deleting a lot, a secret) still wait for you; "Don't check" also turns the loop breaker off. In a long chat, "Tell me when" only shows when to compact and sends Claude nothing. The cost budget is off unless you pick it: the cost is always shown on the card. To answer the questions again, press "Run setup again" at the bottom of Settings.

To put the pane on a second screen, press "Open in new window" at the bottom of the pane. Then drag that window to the other screen. The new window and the pane show the same view: open Settings or answer a question in one, and the other shows it too.

## The cards that matter most

### Plan limits: how much usage you have used

Each limit has a bar: the 5-hour limit and the weekly limit. Each bar says how much you used and when it resets, for example "5-hour limit 45% used, resets 17:00". The limit that runs out first leads. When your pace now would use up a limit before it resets, a line says when, for example "At this pace: runs out at 16:10".

The figures come from the app. The card says where each figure comes from.

Type `/vaken-usage` for the same figures as text, with pace and cost.

### This session: how full the context is

The context is everything Claude reads again with each answer. A full context costs more usage.

The card shows:

- The state of the session (Working, Your turn, Idle, Needs you).
- How full the context is, for example "73k of 1M tokens".
- "Compacts at": the point where Claude Code compacts the session by itself, for example 97%.
- A row "When to compact" with a "Show advice" button: what vaken thinks about compacting now. See "When to compact" below.

### Agents and Other sessions: what is running

The Agents card lists the agents Claude started, in all your sessions. Each row shows the state (working, finished or stuck), how long it ran and what it cost. Older agents sit behind "Show N older".

If you run a task list with `/vaken-tasks`, a bar shows how many tasks are done. Open a task to try it again, keep its work or throw it away.

**Night run.** Turn it on with `/vaken-settings night.mode on` (it is Off in every mode). Then `/vaken-tasks night`, or Start as night run in the task runner, runs the list while you are away. It goes only while the plan has room, the Mac is on mains power and the night cost limit is not reached (Most cost for a night run, under How it runs; Run limit uses the run's own limit). On battery it pauses and goes on when the power is back. Away mode's strict checks are on for the run and go back to what they were at its end; the Mac is kept awake if Keep Mac awake is on. In the morning, Where was I leads with what is done.

The Other sessions card lists your other open sessions:

| State | Meaning |
|---|---|
| Working | Claude did something in the last 2 minutes, or a command or agent it started still runs (up to an hour). |
| Your turn | Claude finished. The session waits for your message. |
| Idle | Nothing happened for 2 minutes or more, and nothing it started still runs. |
| Needs you | A question or an OK waits. |

Pin a session to keep it first. Hide a session to take it off the list. A hidden session still shows when it needs you.

## Needs you

This card is always on top. It lists what waits for you:

- A question from Claude.
- A step that waits for your OK, also one that an agent of the session asks for.
- A step the safety check stopped, with a short form of the step, such as `git reset --hard`. Press "Allow once" to let it through, or "Keep stopped" to keep that exact step stopped for the session. A step stopped again and again is one row.
- An allow rule, after you allowed the same kind of step 3 times in a week where Claude Code asked first. Press "Copy the rule", then paste it into `.claude/settings.json` under "permissions" > "allow". This row is not counted.
- A call stopped by the cost budget.
- An agent that waits because the agent limit is reached.
- A session paused for safety.
- Finished answers that wait for your look (shown, not counted).

The line above the chat box counts the stopped steps the same way: one per row.

When nothing waits, it says "Nothing". Press a row to see what it is about.

**Notices while you are away.** When you have not typed or pressed in any session for 2 minutes, vaken sends one Mac notification when another session needs you or a plan limit is near. By default (Notices on This session too) it also tells you when a step here waits for your yes or an answer that took over a minute is done. At most one comes every 30 seconds; several become one ("2 sessions need you."). Hours without notices and Focus hold them. Set Notices to Needs you to leave this session out. The text is short and fixed: never a file, a prompt or a session name. `/vaken-settings notify.how sound` adds a sound, `speak` says it out loud instead (default: a banner). On Windows only the app's own notice is tried.

**Status line.** One line under the prompt box, only when something needs care: the context is 80% full or more, or 20% or less of the plan is left, for example `Context 82% full`. When all is calm, it shows nothing. Turn it off with `/vaken-settings status.line off`.

## On the phone

When you follow a session from your phone (Remote Control), you cannot run a command, open a file or look at the Mac screen. The vaken pane does not show on the phone; the help comes as text. vaken knows you are on the phone when a message comes from it, and until you type at the Mac again (or after a few hours). It helps in four ways:

- The phone note (setting `phone.note`, on by default). While you are on the phone, Claude gets a short note: run commands itself and show the short result, send files and pictures instead of asking you to open them, never give a localhost link, sum up long output, and offer next steps as options you can tap.
- Three words after `/vaken`:
  - `/vaken show <file>` asks Claude to send you a file from this project. Files outside the project and files that look like secrets (such as `.env` or a key) are refused.
  - `/vaken run <command>` asks Claude to run the command and show the short output. Claude still asks before a risky step, and the safety checks still apply. vaken itself runs nothing.
  - `/vaken pic [port]` takes a picture of a page on this computer (the dev server vaken found, or the port you type), then asks Claude to send it to you. Only localhost pages.
- The number menu. Send `/vaken` alone from the phone and you get a short list: 1 What changed (short), 2 Run the tests, 3 Picture of my app, 4 Continue, 5 Status. Reply with the number within 10 minutes. A number from the Mac, or after any other message, goes to Claude as it is.
- The phone hello: with your first message from the phone, one short notice says what waits and names these words.
- Next steps on the phone: when an answer just ended with next step buttons on the Mac, the number menu shows those steps first, then your own quick actions, at most 7 lines with Status last.
- After a break of 15 minutes or more since the last answer ended, the number menu leads with the Where was I presses that send a request (Fix it, What changed, Continue, Show the question), then the next steps and your own quick actions.

These words work whether they arrive as a command or as plain text (a phone, or a message typed while Claude works, can send them as text).

## Next step buttons and quick actions

When Claude ends an answer, the line above the chat box shows **Next:** and two or three buttons for the likely next step. vaken picks them on this computer, with no model call, from what the answer did:

- Files changed and no test ran since: Run tests, then What changed.
- A test or build passed after the changes: Commit (it never pushes), then What changed.
- The last step failed: Fix it.
- After other work: Continue. A plain question and answer gets no button.

One press sends a short fixed request to Claude. The buttons do not show when the answer ends with a question to you, while Claude works, while a step waits for your yes, while the session is paused or compacting, or during Focus. They go away when you send any message, and after 10 minutes. Settings > Next step buttons turns them off (Only alerts has them off). With Buttons and hint (Everything useful sets it), the chat box also shows the first step as a dim hint, such as "Run the tests and tell me the result": press Tab to take it, then send it. When Claude Code has its own hint after an answer, vaken keeps that one and shows none.

Quick actions are your own one-press requests:

- `/vaken quick` lists the built-in steps and yours.
- `/vaken quick <name>` sends one (a built-in name such as `tests`, `commit`, `diff`, `continue` or `fix`, or one of yours).
- `/vaken quick add <name> = <request>` adds one. Up to 12, a name of at most 24 characters, a request of at most 400. A request that looks like a secret is refused.
- `/vaken quick remove <name>` removes one.

The word is `quick`, not `do`: `/vaken-help run do` already runs a command from Claude's last answer on this computer, and a quick action only sends a request to Claude.

### Welcome back with taps

When you come back after a break (15 minutes or more with nothing happening in the session), the Where was I card starts with a short group of what happened since you left. Each row is one press, and the word on its right says what the press does:

- A stopped step waits for your yes: Show me opens it in Needs you, with Allow once and Dismiss.
- A task run is paused, stopped, or has failed tasks: Show me opens the task runner.
- Claude asked you a question: Show me asks Claude to say it again at the end of the chat.
- The last step failed (with the kind of failure in plain words when the error translator knows it): Fix it sends the fix request.
- Claude stopped before the end: Continue sends the continue request.
- Claude finished and changed files: Show me asks what changed.

- Claude said it would do something later ("I'll update the README later", "next I will run the tests"): one row per promise, "Claude said it would: ...", and Continue asks Claude to do it now. Type `done` (or `done 2`) when one is done; the list goes when the session ends.

A night run that ended while you were away leads the group, even without a break: its result (done, failed, cost) with Show me, which opens the task runner, and Fix the failed night tasks, which asks Claude to fix them. The phone's `/vaken` menu leads with the same two lines. They go when you send your next message.

The rows come from what vaken already keeps for this session; only the short promise list is stored. Settings > Recap set to Off leaves the group out and keeps no promises. The card shows in the All view and in a custom view that holds it.

### Fix it on a failure

When a shell step of the main conversation fails and the answer ends on it, one toast says in plain words what kind of failure it was (the error translator's words, never the error text) and points to the Fix it button above the chat box. At most one such toast every 2 minutes. None when the error translator is off, during the hours without notices or Focus, or when Fix it already shows and the pane is open. With the next step buttons off, the toast points to `/vaken-explain error` instead.
## Lean session

A long log costs usage every time Claude reads the session again. With Lean session on (Settings > Lean session, Logs only by default), a long output from an install, test, build or lint reaches Claude cut down:

- the first 15 lines, every line that looks like an error, a failure or a warning (at most 60), and the last 40 lines;
- one line that tells Claude how many lines were cut, and to run the command again with grep, tail or head if it needs them.

An output counts as long from 120 lines or 12,000 characters. File reads, diffs and searches are never cut. A failed command under 400 lines is never cut. All long output also cuts other long commands and the commands of agents. `/vaken-usage` says how many outputs were cut today.

A new chat also starts with a few facts for Claude: the branch, the number of changed files not committed and, when vaken already knows it, the open pull request and whether its checks fail. Only alerts turns both off.

Before a big job, one calm line says about how much of your 5-hour window it may use: "This may use about 6% of your 5-hour window." It shows when a task run starts (`/vaken-tasks start`) and on a long message (over 120 words) that starts big work, such as Build or Refactor. The figure comes from the past turns vaken saw on this computer (their cost and how far the 5-hour window moved), with no model call. It needs at least 5 past turns, and shows at most once in 10 minutes. With Lean session Off it never shows.

When the fresh-start nudge says a new topic would cost less in a new session, the line above the chat box offers **Start fresh with a brief**. One press saves a short hand-over brief of this session in `~/.claude/cockpit/briefs/` and copies one line to paste. Then open a new session yourself and paste it: Claude reads the brief first. vaken cannot open the new session for you, and it writes nothing without the press.

## Memory and notes

This card shows what a session starts from:

- Instruction files such as `CLAUDE.md`, and how big they are. Claude reads them again with every answer, so big files cost usage. The card also says when the same line is in more than one file.
- Notes Claude keeps for this project.
- "Note for the next session": a hand-over note for a new session. Each line is marked verified or unverified.
- "Kept when compacted": your goal, the branch, the files changed, decisions and next steps.

The closed card says "All small" when all is well. It says "CLAUDE.md is heavy" when your instruction files are big. Then move rarely needed parts into separate notes.

### Learn from you

When you tell Claude the same thing 3 times in 14 days in one project, such as "use pnpm, not npm", "don't add comments" or "answer in Swedish", vaken offers it once. Needs you shows "You told Claude 3 times: use pnpm, not npm" under Learned from you. Open the row to see the exact line it would add. Press "Save as a rule" to add that line to the vaken block of this project's `CLAUDE.md`, or "Not now". Either way it does not ask about that rule again for 30 days. It never writes the `CLAUDE.md` in your home folder or your settings, and a line that looks like a secret is never saved.

`/vaken-memory rules` lists the saved rules; `/vaken-memory rules remove 1` removes the first. `/vaken-memory rules save` saves an offer from the chat.

The task runner learns too. When an agent role fails 3 of its last 5 tasks on a cheaper model, the Agents view shows one line, for example "Builder on Haiku passed 2 of 5. Use Sonnet for builders?" The press sets the role's model, as the Roles choice does. It asks at most once a week per role.

The setting is `teach.mode` (Off / Offer, Offer by default, Off in Only alerts). It is not on the Settings pane: `/vaken-settings all` lists it and `/vaken-settings teach.mode off` turns it off.

## The three views

| View | What you see |
|---|---|
| Standard | Needs you plus seven cards: This session, Memory and notes, Agents, Computer, Plan limits, Other sessions, Safety (Pause and Undo, always in reach). After a break, Where was I joins under This session when something waits for you. The default. |
| All | Needs you plus 17 cards, in a fixed order. |
| Custom | Your cards, in your order. |

Standard and All always show the same cards. In Custom, a card you set to Auto shows only when it has something to show. If a card you cannot see has news, you get one line in Needs you. On a wide pane the cards sit side by side, in the same order.

Change the view in Settings, under "Cards and look".

## When to compact

Compacting makes a long session shorter. Claude writes a short summary and drops the long history. This matters because a big context costs usage on every step: Claude reads all of it again with each answer. Compacting while the prompt cache is warm is cheap. A small session costs little, so vaken leaves it alone.

In Auto, vaken compacts for you at two moments:

- **In a break.** You stop for a while after an answer. When the prompt cache has about 15 minutes left (of 60), vaken compacts while the cache is still warm. With the default this is after 45 minutes of idle time. On a 5-minute cache it is after 3 minutes.
- **When the session fills.** Shortly after an answer (30 seconds, and again after 2 minutes), when the session fills 60% of its window and compacting pays back within 5 answers. Not while you have text in the prompt box.
- The break moment needs vaken to know your plan, because the cache time depends on it.
- **With agents running.** When Claude has finished its answer and only helpers in the background still run (agents or background commands), vaken waits until the session is 75% full, and does not compact in a break. In a long session with helpers, this keeps vaken compacting before Claude Code does it by itself at about 97%.

If Claude is in the middle of a task, vaken asks it once to finish the current step and end its turn. It then compacts at the next turn end.

vaken never compacts when:

- The session holds fewer tokens than "Never compact under" (100k by default).
- Claude is still answering, or an agent runs in the foreground.
- A question or an OK waits for you, or a risky step was stopped.
- vaken compacted the session in the last 20 minutes.
- The cache is cold (for the break moment).

Every compaction asks Claude to keep, in short lines: the goal, what is done, what is next, open files and branches, decisions, and any question that waits for you. With helpers still running, it also asks Claude to list each one: what it does, its id and what Claude will do with its result.

Type `/vaken-compact why` to see which rule applies now. The This session card also lists the checks after each look.

Set the rules in Settings, under "Money and plan":

- "Compact by itself": Off, Suggest (hints Claude, which uses a little plan), Watch only (shows the moments) or Auto (compacts for you). Watch only is the default for a new install; an install from before version 1.166.0 that never chose keeps Auto. The first-start question "Long chats" offers Auto, and the This session card asks once. If you choose one, vaken keeps your choice.
- "Compact when it fills": 50%, 60% or 70% of the window. Default 60%.
- "Never compact under": 50k, 100k or 200k tokens. Default 100k. At most half the session's window counts, so a small window keeps Auto working.
- "Compact in a break": 10, 15 or 20 minutes before the cache runs out. Default 15.

When you press the Compact button and now is not a good moment, vaken does not compact at once. It lists what is wrong, in plain words, over two buttons: "Compact anyway" and "Not now". `/vaken-compact now` is the typed form of "Compact anyway": it compacts at once, even when the checks say wait. If nobody compacts, Claude Code does it by itself at about 97% full. That point comes from the app, so it can change.

## The other cards

You find these in the All view, or in Custom if you pick them:

| Card | What it shows |
|---|---|
| Ship | If the work is ready: checks, fixes, merge. |
| Pull requests | Open pull requests and their checks. Needs `gh`. |
| Where was I | What waits for you after a break. |
| Preview | Your dev server and pictures of the page. |
| Agent setup | Agent files and instructions in your project. |
| Skills | The skills Claude used. |
| Run commands | Shell steps from the last answer that you can run. |
| Risky steps | Risky steps today, and how strict each rule is. |
| Safety | Stop all changes, undo, and which risky steps were stopped. |
| Autopilot | What vaken did for you today. |
| Checks | If tests and builds really ran and passed after the last change. |

## Safety

- The safety check looks at risky steps before they run. Each rule can warn, stop or be off. Type `/vaken-guard` to see them.
- A destructive command or a secret stops and waits for you when Claude Code would not ask you first. [SECURITY.md](../SECURITY.md) lists those modes.
- When Claude Code asks you itself, vaken adds a warning. When it cannot tell, it warns.
- Your own choice in Settings always wins.
- Fewer may-I stops: after you allow the same kind of step 3 times in a week, vaken shows the allow rule once, never for a risky step. `/vaken-guard rules` lists the rules offered. Turn it off with `/vaken-settings allow.rules off`.
- `/vaken-pause` pauses every change step in this session. `/vaken-pause off` resumes.
- `/vaken-undo` lists changed files and restores them when you say yes.

vaken never changes your `settings.json`. It writes these files only when you ask or use the feature:

- Agent files and a `CLAUDE.md` block, only if you turn on "Set up agents for me" in the Agent setup card (setting `setup.apply`, off by default).
  - Place "This project" (the default): `.claude/agents/vaken-*.md` and one block in the project `CLAUDE.md`, between `<!-- cockpit:begin -->` and `<!-- cockpit:end -->`.
  - Place "All projects": `~/.claude/agents/vaken-*.md`.
- Starter agents in `~/.claude/agents/vaken-*.md`, from `/vaken-tasks agents make yes`. It never overwrites a file.
- Folder copies of the project under `.claude/worktrees/`, made by the task runner.

It never writes the `CLAUDE.md` in your home folder. [UNINSTALL.md](UNINSTALL.md) says how to remove all of these.

## Settings

Press "Settings" in the pane. At the top you pick how much vaken tells you. Each choice adds to the one before:

- **Only alerts.** Tells you when a session needs you, a limit is near, the context is nearly full, a model switch would cost a lot, or a step is risky. It keeps the risky-step warnings. It turns off the tips, recaps and other extra checks.
- **Recommended.** The default for a new install. Adds every free feature: tips, recaps, prompt tips, cost tips, a decision log and a look at whether Claude did what it says, and Auto compaction. It makes no extra model calls. It only adds short safety notes for Claude, and a "what Claude keeps" note when vaken compacts a session.
- **Everything useful.** Adds checks that send Claude more text, so they use a little more of your plan: prompt and assumption reviews, plan first, and every note to Claude. The assumption review asks at most once an hour in a session.

The cache keeper ("Keep session cheap") is off in all three modes, and no preset turns it on. It uses plan usage.

No preset changes "Compact by itself": it is Watch only (Auto for an install from before version 1.166.0) until you choose another, and then it stays as you chose. `/vaken-settings preset` lists every preset. You can type `recommended` as the name of the middle mode.

The sections below the top choice:

| Section | What it holds |
|---|---|
| Notices | When and how vaken tells you. |
| Money and plan | Limits, budget, compact, cache. |
| Agents | Agents, this computer, other sessions, pull requests. |
| Safety | Risky steps, loops and checks. |
| Prompts and memory | Prompt review, plan first, your rules. |
| Cards and look | The view, the detail level, the accent colour, which cards show. |
| Health | vaken checks itself. |
| Advanced | Expert settings. Most people never change them. |

When your settings differ from the mode, the mode card lists them under "Changed by you". Press Undo on a row to put that one setting back to what the mode sets. After you press a mode, apply a preset with `/vaken-settings preset <name> yes`, or press Finish in the start questions, the top press of the mode card is "Undo" for 10 minutes. It puts every setting back as it was.

"Run setup again", at the bottom of Settings, asks the five start questions again, with the answers you have now already chosen.

You can also type: `/vaken-settings` lists the settings, `/vaken-settings <key> <value>` changes one, and `/vaken-settings reset` goes back to the defaults after it asks. Reset also clears what you set for one project or one session only.

## Where your data is stored

vaken has no server and no telemetry. It stores data only on your computer:

- Settings, counts, times and notes in the Claude Code plugin store.
- Copies of changed files for Undo, and hand-over notes, in `~/.claude/cockpit/`.
- Files in your project, only when you ask or use the feature. For example `.claude/cockpit-tasks.md`. See "Safety" above for the agent files.

Some of these names say "cockpit", the older name of vaken. [PRIVACY.md](../PRIVACY.md) says why. On Windows 11, "Delete everything" leaves the folder `%USERPROFILE%\.claude\cockpit`. Remove it by hand.

vaken does not store your prompts or transcripts as text. It keeps a few short words, such as session titles and decision notes. See [PRIVACY.md](../PRIVACY.md) for the full list and how to turn each one off.

## Remove your data

1. In the pane, press Settings, then Advanced, then "Delete everything vaken stored". It shows what would go. Press it again to delete. This removes the plugin store keys and everything in `~/.claude/cockpit`. It leaves files in your projects, agent files and the `CLAUDE.md` block.
2. Remove the plugin.

[UNINSTALL.md](UNINSTALL.md) has every step, including files inside your projects. [commands.md](commands.md) lists every command.
