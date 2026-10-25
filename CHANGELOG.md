# Changelog

## 1.168.6: first public version

The first public version, for Claude Code Desktop on macOS and Windows 11. Tested on Claude Code 2.1.295.

What you get:

- A pane next to your chat that shows usage, context and agents, at a glance.
- Your 5-hour and weekly plan limits, how much you used, and when each one resets.
- How full this session's context is, with advice on when to compact and save usage.
- The agents that run in all your sessions, and what your other sessions do or wait for.
- A Needs you card on top: a question, a step that waits for your OK, a check that failed.
- A safety stop for destructive commands and secrets, a pause for all changes, and Undo for changed files.
- Three views (Standard, All, Custom) and 15 commands that start with `/vaken`.
- No server and no telemetry. "Delete everything vaken stored" in Settings removes what it kept in the plugin store and in `~/.claude/cockpit`. Files in your projects and agent files stay. UNINSTALL.md lists them.

Three modes, sorted by what they cost: "Only alerts", "Recommended" and "Everything useful". A new install starts on "Recommended". Change the mode in Settings, or type `/vaken-settings preset`.

What a new install does:

- It compacts on Watch only: the This session card shows a good moment, and Compact now does it. Auto is offered in the start questions.
- The task runner waits after a plan limit until you press Go on.
- The task runner's agent types are offered to Claude only when a run starts (Settings > Agents > Offer agent types).
- It makes no model call by itself. A model call happens only when you press a button or turn a feature on.
- The README has "What vaken does by itself" and "Privacy and data": every program it runs, its two web calls and every automatic write.

New in this version:

- The big-file question shows in the desktop app as well as in a terminal session. A file named after @ with more than 2000 lines or 200 KB asks once: send the last 200 lines, or the whole file.

## 1.168.5

- Windows: the pane lays its cards in the Windows text cell, 7.9 pt wide (the same app draws 8.8 pt on a Mac), so the cards fill the pane again instead of ending about 10% short. A Mac draws as before.

## 1.168.4

- The pane fits the app's text again. The app now draws its text cells 8.8 pt wide and 20 pt tall (they were 7.9 and 19), so vaken's sizes are measured anew: columns, rows, letter widths, blanks and a button's own inset.
- Every card sets its own side padding, so its text starts 13.5 pt in, as the app's own cards do. "Show more" never drops under a title.
- Choices such as Standard, All, Custom fit their pills: no word runs past its box, and no thin strip shows beside the chosen one.
- On a wide pane the buttons at the bottom end under the last column of cards, not at the far edge.
- Help uses the pane's columns on a wide screen, like the main page and Settings. A Try these line wraps instead of being cut.
- Arranging: every column is the same width, the titles of a row of tiles line up, and "Show or hide cards" ends at the board's edge.
- Back with its b key shows the app's key badge without a chevron on top of it.
- In Settings, the line under Agents and Safety keeps the same gap as the other sections.
- A card column is never so narrow that its rows stack (one more column for each 348 pt of pane).
- At the narrowest pane, with the wider letters, a status word goes on the line under the title, the plan chip beside a done line gives way, and a row of choices wraps instead of running past the card. The Swedish Warn label is "Varna (stopp i autoläge)".
- An old Plan limits reading shows its age ("40 min") again in the header.
- The band clears a stale stopped-step line when a newer prompt clears the hold.

## 1.168.3

- This session shows only this project's old note, as "Earlier session". A new answer clears the old mid-answer mark, and Got it deletes the notes.
- A working session has a full grey pulsing dot and says "now".
- A row's press label stops short of the chevron, so it is never cut with "…".

## 1.168.2

- An open card no longer repeats its summary: when the rows below say it (This session, Plan limits), the header shows the title, the dot and Fold only. A closed card keeps its summary.
- Plan limits: a used-up limit says "Used up. Sessions wait." with the reset on the row under it, and its dot says "Used up", not "Needs you". With no figures it says "Not known yet" once, or "Not shared" when the app does not share them.
- The week row says what its share a day means: what you can use each day to make the week last (an estimate). Today's use is its own row.
- The Swedish band keeps the Week chip when it fits. The compact advice opens with "Why compact?".

## 1.168.1

- At the narrowest pane, an open card whose header has no room for its status word shows the word on a line under the title (Pull requests, Other sessions, This session), instead of leaving it out.

## 1.168.0

- vaken never asks a model by itself when you send a message: the effort check uses a free word rule only, and keeps your own effort when unsure.
- Every model call goes through one door and leaves a line in the log. A check fails the build on any call that skips it.
- The task runner's four agent types are offered to Claude only when a run starts. New switch "Offer agent types" in Settings > Agents (off) brings back the old way.
- Autopilot lists more of what vaken did by itself: lean cuts as one row a day with the tokens saved (an estimate), and task runs started, finished and stopped.
- Swedish is complete in command answers: /vaken-usage, /vaken-compact, Fix CI, the skills list, Ship, Away, the guard and more. /vaken-settings stays English.
- At the narrowest pane, done lines, Agents and Pull requests keep their word with short forms.
- A failing pull request in Needs you no longer has a Fix button (the app's own Auto-fix does it); the row opens the pull request.
- Risky steps: an unchosen Warn reads "Warn (stops in auto mode)", so the label says what it does.
- The Allow line says "Deletes the folder ... and everything in it" for a PowerShell Remove-Item -Recurse too.
- The README names every program vaken runs, both web calls and every automatic write, and has a Privacy and data section.
- Fewer places where the plugin directory holds a version for a reviewer, and a local check of the directory's rules.

## 1.167.0

- Needs you, a second look: newest first within each kind, and the header count matches the rows. Every row has one form: the session name in bold, the event under it, the age dim.
- A stopped step that timed out is a calm row and is not counted.
- A failed check names what failed and has its button. When nothing waits, Needs you is one calm row in every look. The answer box lines up.
- A finished answer that waits for a look moved from Needs you to a calm line on This session.

## 1.152.0 to 1.166.2

- Safer start: a new install compacts on Watch only (one press on Compact now). Auto is offered in the start questions. An install from before that never chose keeps Auto.
- The task runner waits after a plan limit until you press Go on. A run set to go on, and a night run, still go on by themselves.
- The README says what vaken does by itself, feature by feature, and how to turn each one off.
- The pane opens beside the chat in every new session (Settings > View > Open at start, desktop only).
- Plan limits says where your usage went. Finish safely lets the turn end cleanly before a limit. While a permission waits, the band says so in plain words, and a line says when Claude itself is down.
- Lean session reads a big file only once and asks before a huge @-mention. A step that keeps failing gets a Fix it offer.
- Every card was reviewed again: estimates say "estimate", amber only when something really waits for you, Failed is red, long lists fold ("Show N older"), and the project name shows once.
- Autopilot shows what keeping the session cheap saved (an estimate). The band says when a used-up limit resets.
- Windows: the guard reads more PowerShell and .NET cases (web calls, mail, profile writes, WMI deletes), notice sounds, the night run reads the battery, and plain words when gh or git is missing.
- Swedish: command answers in Swedish, one word for a worktree and one for idle.
- Four more themes.
- The bottom row of the pane says plain words and is never cut. Plan limits keeps a word next to its dot, and says the right minutes before a reset.

## 1.151.0

- A broken or old value in vaken's store no longer blanks the pane. A card that cannot draw says so in one plain line, and the other cards still draw.
- Errors in plain words: no raw program text. Pull requests says what to do when GitHub cannot be asked ("Sign in to GitHub: type gh auth login", "Install gh"), and says when a folder has no git.
- Plan limits tells "not known yet" from "the app does not share plan limits here". A check whose program is missing reads "could not run", with no Fix.
- A new person sees only Start here and Needs you until setup is done.
- Empty cards say "None" with one short fact. No card is blank, and none repeats its header word.
- Wide screens: columns end at about the same height. One column stops at a readable width.
- The back of a card fits the front, keeps related settings together, and says what each setting does and what it costs.
- Swedish: shorter state words, "60 %" never breaks, one word for each thing. Ages under a minute read "just now".

## 1.150.0

- Second look at every card. One word, one number style and one name for each fact, in English and Swedish ("60 %" in Swedish everywhere; context and plan say "used").
- The band shows the hottest limit, also a model's own week. A line that does not fit says a short form whole. "Needs you" is the only amber mark.
- This session says "Needs you" while a step waits for you. Plan limits turn amber at 80%, always with a word.
- Agents: newest first, whole ages, names wrap, cost stays, Failed is red. Memory counts its marks once.
- Safety counts only real risky steps. Other sessions put "Your turn" above pinned idle ones. Long lists fold.
- Ship, Checks and Pull requests use the same words; amber only for a failed check or your own failing pull request.
- Setup cards, Skills, Report and Help: whole titles, real counts, "Past runs", "Quiet".

## 1.149.0

- The pane's footer is one row of presses: the view switch, Arrange cards, New window, Help and Settings. The card guide is in Help.
- Arrange shows the real layout: cards keep their size, both lines show, and counts have words. One line says that cards with a problem move up. A new "Show or hide cards" link opens Settings > Cards.
- `/vaken` answers in your language and shows only what matters now. When all is calm, it says so in one line. `/vaken-help` is shorter.
- Fewer pop-ups: none when Quiet ends with nothing new, none for a plan warning the band already shows. After an update it says only "Updated to" and the version.
- The status line says how much of the plan is used, and which limit, like the band. Numbers use one style, Swedish included.

## 1.148.0

- The small cards (Start a task, Talk, Tidy, Model fit, the calm card, top and line cards) wrap whole sentences and never cut a value.
- Needs you stays calm while nothing waits. Estimates say "estimate". Each mode says what it sends Claude.
- Clearer first-run texts.
- Safety: the guard now catches a here-string fed to a shell, a heredoc with Windows line ends and arithmetic `<<`. A Checks pass only counts output read in full.

## 1.147.0

- Help is one card per topic, with "Show N more". Titles wrap, nothing is indented, and the keys list has one key per line.
- Settings hides the budget rows while the budget is off, and shows a "Changed" chip with a count of what you changed.
- Start here no longer says Recommended twice. Report names wrap, a stopped run is grey and the state shows once.

## 1.146.0

- Arrange keeps its own list of cards for each column and each pane width. A dim "Drop a card here" outline shows only while you arrange.

## 1.140.0 to 1.145.0

A careful look at every card. What you will see:

- **Plan limits:** old readings stay, dim, with their age. The order is always 5 h, Week, model week. A calm limit shows only its reset. New: your session's share of the 5-hour window.
- **This session and Memory and notes:** labels are never cut. One number style. Hot context shows advice, Compact now and one Why.
- **Agents:** run state in the header, "Stopped" instead of "failed", past runs fold, ended rows show their age. New: Clear past runs.
- **Other sessions:** the right event age, session names kept as you wrote them, "4 more sessions" in the fold. A session that needs you shows only in Needs you.
- **Safety and Checks:** Needs you shows the newest first. `2>&1` and pipes no longer give "result not clear". Every check result has an age.
- **Where was I, Ship, Pull requests, Preview:** after a break the waiting step is loud. Ship reads as plain rows, and Pull requests say "#12 merged, 2 h ago".
- **Agent setup, Skills, Autopilot, Computer, Run commands:** battery and heat show only when they matter. One percent style.
- **Standard, All, Custom** switch with one press in the footer. Your first Custom copies the view you have.
- **Keys in the pane:** s, h, a, w, 1, 2, 3 and b while the pane has focus. Help lists them.
- Before Throw away, vaken shows how many commits you would lose.

## 1.135.0 to 1.138.0

- **1.137.0, 1.138.0:** the band and This session lost every text that ran together. The band shows 5 h and Week, and the status line drops the plan while the band shows it.
- **1.136.0:** fewer false stops. Plain text in a heredoc no longer stops the guard.
- **1.135.0:** the status line shows only a fact that is hot. No branch name.

## Safety fixes (1.142.0 to 1.144.0)

A safety check of 1.127 to 1.142 found five things. All are fixed and tested.

- Allow-rule offers no longer cover a whole program. `find`, `sed`, `awk`, `tar` and a few more are never offered as a broad rule.
- A heredoc word with a quote or a dot inside no longer hides the commands after it from the guard.
- A heredoc given to `sudo -s`, `su`, `fish`, `source` or `eval` is read as commands. So is a command given to `su -c`, `fish -c` or an ssh option.
- Saving or removing a rule with `/vaken-memory` works only when you type it.
- The night run lets your Mac sleep if its session ends or crashes. A claim older than 12 hours does not count.

The guard is still a speed bump, not a sandbox.

## 1.133.0 and 1.134.0

- **Tell me:** Mac notifications and an optional status line. Notices for this session are on by default.
- **Next prompt hint:** a grey hint under the band with what you could ask next.
- **Start fresh with a brief:** a new session starts with a short summary of the old one.
- **Cost hint:** vaken shows what a big job may cost before it starts.

## 1.132.0

- **Find it:** search in Help and Settings, a Most used card and a Try these topic. Cards stay where they are. Every press that copies says so.

## 1.131.0

- **Night shift:** `/vaken-tasks night` works through your list while the plan has room and your Mac is on power. You get a list of what it promised and a morning summary. It is off by default.

## 1.130.0

- **Learns you:** vaken offers to save a correction you repeat as a rule for Claude. It also suggests a stronger model for a step that often fails.

## 1.127.0 to 1.129.0

- **Next step buttons** in the band, and your own quick actions with `/vaken quick`.
- **Welcome back:** after a break, a card with buttons for what to do first. In Standard, Where was I shows after a break.
- **Fix it:** a failed step shows a toast with a Fix it button.
- **Lean session:** long tool output is cut short before Claude reads it, and a session starts informed.
- **Allow rules:** vaken offers to allow a command you approve again and again. It never writes your settings file.
- A stopped step has a short form and a Keep stopped button.

## 1.125.0 and 1.126.0

- **Phone:** vaken sees when you work from your phone and shows a short note. A number menu replaces long choices there.
- **New commands:** `/vaken show`, `/vaken run` and `/vaken pic`.
- A full check of the code, with fixes in six areas.
- Auto compaction waits until 75% while background agents run.
