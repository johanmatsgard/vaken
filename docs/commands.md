# Commands

vaken has 15 commands. Type one in the chat box of a Claude Code session. Most answer with text in the chat. Text in angle brackets, such as `<words>`, is for you to fill in.

For the cards the commands belong to, see [guide.md](guide.md).

| Command | What it does | Example |
|---|---|---|
| `/vaken` | Opens the pane: what needs you, plan limits, your sessions. | `/vaken` |
| `/vaken-help` | Lists the help topics. Add a word to find a topic, or `all` to read every topic. | `/vaken-help cost` |
| `/vaken-settings` | Lists the settings, changes one, or resets them. | `/vaken-settings compact.from 50` |
| `/vaken-usage` | Reads your plan limits now: each limit, when it resets, and its pace. | `/vaken-usage` |
| `/vaken-compact` | Says what vaken thinks about compacting the session now. | `/vaken-compact why` |
| `/vaken-ship` | Says if the work looks ready. Then you check, fix and merge in typed steps. | `/vaken-ship check` |
| `/vaken-guard` | Shows the safety check. Lets one stopped step through. Sets the edit fence. | `/vaken-guard allow once` |
| `/vaken-pause` | Pauses every change step in this session now. | `/vaken-pause off` |
| `/vaken-undo` | Lists changed files, shows what a restore would do, restores on yes. | `/vaken-undo 1` |
| `/vaken-away` | Turns away mode on or off. Shows what happened while you were away. | `/vaken-away on 2h` |
| `/vaken-today` | Today in a few lines: what waits, what yesterday cost, what vaken did. | `/vaken-today` |
| `/vaken-resume` | Finds a session by words in its title or folder. | `/vaken-resume invoice` |
| `/vaken-explain` | Says what a line or a part of the pane means and why it shows. | `/vaken-explain limits` |
| `/vaken-tasks` | Runs a task list with agents. Shows and steers the run. | `/vaken-tasks start` |
| `/vaken-memory` | Shows what Claude remembers about this project. | `/vaken-memory` |

## Details

### `/vaken`

Opens the pane and prints the same facts as text. `/vaken inbox` lists what waits for you in every session. `/vaken neighbors` lists other sessions in the same folder.

For a phone, where you cannot open a file or run a command:

- `/vaken show <file>` asks Claude to send you a file from this project. It refuses a file outside the project, a file that looks like a secret, and a file that is not there.
- `/vaken run <command>` asks Claude to run the command and show the short output. Claude's own permission prompts and the safety checks still apply; vaken itself runs nothing.
- `/vaken pic [port]` takes a phone-wide picture of a page on this computer (the dev server vaken found, or a port or localhost address you type) and asks Claude to send it to you.
- `/vaken` alone, sent from the phone, shows a number menu: 1 What changed (short), 2 Run the tests, 3 Picture of my app, 4 Continue, 5 Status. A bare number sent from the phone within 10 minutes runs that line, once. After an answer with next step buttons, the menu leads with those steps and your quick actions (at most 7 lines, Status last).
- `/vaken quick` lists the quick actions: the built-in next steps (`tests`, `commit`, `diff`, `continue`, `fix`) and your own. `/vaken quick <name>` sends one to Claude (only while Claude is not working). `/vaken quick add <name> = <request>` adds your own (up to 12; a name of at most 24 characters, a request of at most 400, never a secret), and `/vaken quick remove <name>` removes it. The word is `quick` because `/vaken-help run do` already runs a command from the last answer.

These words also work when they arrive as plain text instead of a command.

### `/vaken-help`

- `/vaken-help` opens the Help page and lists the commands and topics. It starts with three to try first: `/vaken`, `/vaken-today` and `/vaken-undo`.
- `/vaken-help <word>` shows the topics whose title holds the word, else those whose text holds it. More than five show only their titles; type `/vaken-help <title words>` to read one. It answers in the chat and does not open the pane.
- `/vaken-help all` shows every topic.
- `/vaken-help glossary` explains the words vaken uses.
- `/vaken-help run` lists the parts that have no command of their own, one line each. `/vaken-help run <name>` runs one.

### `/vaken-settings`

- `/vaken-settings` lists the settings that you changed, and the groups.
- `/vaken-settings all` lists every setting with its choices.
- `/vaken-settings <key> <value>` changes one setting for all projects. Example: `/vaken-settings compact.from 50`.
- `/vaken-settings reset` asks first. Then `/vaken-settings reset yes` goes back to the defaults.
- `/vaken-settings layout save <name>`, `layout apply <name>` and `layout delete <name>` keep and use card layouts.
- `/vaken-settings here <key> <value>` changes a setting for this project only. `here reset` removes it.
- `/vaken-settings session <key> <value>` changes a setting for this session only. It takes only the model and routing settings. `session reset` goes back to the project.
- `/vaken-settings card <id>` shows the settings of one card.
- `/vaken-settings preset` lists the ready-made modes. The three main ones are Only alerts, Recommended (the default for a new install) and Everything useful. `preset <name>` shows what one would change, and `preset <name> yes` applies it. `recommended` works as a name.
- `/vaken-settings shape` shows or sets how Claude shapes its answers: default, short or report.
- `/vaken-settings simple` is Say it simpler: it retells the last answer in plain words; it turns nothing on. It asks the model, through Claude Code. To make Claude answer in plain words all the time, set `plain.mode` to `on`.

### `/vaken-usage`

Reads the plan limits now. A word after it shows more:

- `/vaken-usage cost` shows what this session and today cost, and what cost most.
- `/vaken-usage budget` shows the cost budget. `budget extend` lifts it for a stopped step.
- `/vaken-usage limits` shows every plan limit in full.
- `/vaken-usage fit 20` says whether a job that uses about 20% of your plan window fits, or when to start it.
- `/vaken-usage why` says why the figures are what they are.

### `/vaken-compact`

- `/vaken-compact` says if now is a good moment, and gives a line to paste after `/compact`. In Auto, vaken compacts by itself in a break (the cache is still warm) or when the session fills 60% of its window. It leaves small sessions alone.
- `/vaken-compact why` says what stops it now, one check at a time.
- `/vaken-compact now` compacts the session at once. It is the typed form of "Compact anyway": if the checks say now is not a good moment, it says so and compacts because you asked. The Compact button in the pane checks first and asks you. Every compaction by vaken asks Claude's summary to keep the goal, what is done, what is next, open files and branches, decisions and any waiting question.

### `/vaken-ship`

- `/vaken-ship` says if the work looks ready.
- `/vaken-ship check` runs the checks.
- `/vaken-ship fix yes` writes a request to fix the failing check and puts it in the prompt box. Nothing is sent until you press Enter. Without `yes` it only lists what failed.
- `/vaken-ship merge yes yes` merges. Nothing runs by itself. You type each step.

A word after it shows or does one part of shipping:

- `proof` lists the checks that ran after the last change. `done` sets the checks that must pass.
- `pr` shows your open pull request and its checks. `queue` and `heat` order the finished changes by risk. `merge-order` says which pull request to merge first.
- `worktrees` lists folder copies of the project that are safe to remove. `orphans` lists leftover programs.
- `review-story` tells what changed. `reviewed` marks the changes as looked at. `digest-branch` lists the changes on the branch, riskiest first.
- `ci-fix` writes a prompt from the failing check, for you to send.

### `/vaken-guard`

- `/vaken-guard` shows each rule and if it warns, stops or is off.
- `/vaken-guard allow once` lets the step that the safety check stopped last go through, one time.
- `/vaken-guard scope <folders...>` limits edits to the folders you name. `/vaken-guard scope` shows the fence. `/vaken-guard scope off` removes it.
- `/vaken-guard outbox` lists what left your computer in the last answer. `fence` shows how often web text was marked as data. `commands` lists the last shell commands, as program and kind only.

### `/vaken-pause`

- `/vaken-pause` pauses commands, edits, tools, agents and web fetches in this session.
- `/vaken-pause status` says if it is on.
- `/vaken-pause off` resumes.
- `/vaken-pause steer` lists a queue of sentences for your sessions, and `steer queue <sentence>` adds one.

### `/vaken-undo`

- `/vaken-undo` lists the last changed files.
- `/vaken-undo <number>` shows what a restore of that file would do. Run that preview first. Then add `yes` to restore it.
- `/vaken-undo last` and `/vaken-undo last yes` do the same for the changes since your last message.
- `/vaken-undo checkpoint <name>` saves the state of every file changed so far.
- `/vaken-undo name <checkpoint>` and `name <checkpoint> yes` go back to a checkpoint you named.

### `/vaken-away`

- `/vaken-away on` turns away mode on. `/vaken-away on 2h` turns it on for 2 hours. You can use `90m` or `1h30m`. The range is 1 minute to 24 hours.
- `/vaken-away off` turns it off and shows what happened.
- `/vaken-away` shows the state.
- `/vaken-away digest` shows what happened the last time you were away.

### `/vaken-today`

A word after it says more: `value` counts what vaken did for you in the last 7 days, `recap` says where you were, `glance` is one short line, `standup` writes a short report, and `waits` shows how long Claude waited for you.

### `/vaken-resume`

Give words from the title or the folder of the session. `/vaken-resume <words>`. `/vaken-resume find <words>` searches what was said in your other sessions, and `/vaken-resume timeline` tells what happened in this one.

### `/vaken-explain`

Name a part of the pane. Examples: `needs`, `limits`, `session`, `others`, `agents`, `tasks`, `computer`, `autopilot`, `proof` (the Checks card), `guard` (the Risky steps card). Or give words from a line that vaken showed.

A word after it explains one thing: `error` says in plain words what went wrong and the first thing to try, `happened` says what Claude read, changed and ran, `assumptions` lists what Claude assumed, `planfirst` and `fresh` say why vaken suggested a plan or a fresh session, and `promptcheck` says why it showed a tip about your request.

### `/vaken-tasks`

- `/vaken-tasks new` starts a task list.
- `/vaken-tasks start` runs it. Add `anyway` to start past the cost warning (the estimate is over the run's or a helper's cost limit, or the week is tight). It does not skip the computer's room or your agent limit: the run still waits for those.
- `/vaken-tasks pause`, `go` and `stop` steer the run. After a pause for cost, `go` allows one more run limit's worth.
- `/vaken-tasks retry <N>`, `keep <N>` and `throw <N>` act on task number N. `keep all` and `throw all yes` act on every folder copy left; Clear, Run again and a new run wait until none is left.

The run starts as many agents as your computer has room for, or your own limit.

More words build and steer the list:

- `/vaken-tasks load` reads the tasks from `.claude/cockpit-tasks.md`. `add <task>` adds one. `remove <N>` removes task N.
- `/vaken-tasks set <N> role|model|after|folder|text <value>` changes one task: its role (researcher, builder, reviewer, fixer), its model (auto, cheap, normal, strong), which task it waits for, if it works in its own folder copy, or its text.
- `/vaken-tasks again` runs the same tasks again as a new run, after a run has ended.
- `/vaken-tasks say <N> <words>` sends words to the agent of task N. `at <N>` or `at auto` picks how many agents run at once.
- `/vaken-tasks check <command>` sets the check that runs after each task.
- `/vaken-tasks limit min|helper|run|night <number>` sets when to stop. `min` is minutes for one agent. `helper` is dollars for one agent. `run` is dollars for the whole run, which pauses at that cost. `night` is dollars for a night run; 0 uses the run limit.
- `/vaken-tasks night` starts the run as a night run, when `night.mode` is On. It runs only while the plan has room (a full window waits for the reset), the computer is on mains power (on battery it pauses and goes on when the power is back; Windows reads the battery too) and the night cost limit is not reached. Away mode's strict checks are on until it ends, and the Mac is kept awake if keep-awake is on. Add `anyway` to start past the cost warning. Pause, stop or the night cost limit end the night: the checks go back to what they were.
- `/vaken-tasks name <words>` names the run. `template save|apply|delete <name>` keeps a task list to use again.
- `/vaken-tasks afterlimit go|wait` says what the run does when a plan limit stops it: go on at the reset, or wait for you.
- `/vaken-tasks agents` lists the agents in your sessions, and `agents-board` shows them as a board.
- `/vaken-tasks route` shows which model each kind of agent uses. `/vaken-tasks goal <sentence>` sets the goal of the run.

### `/vaken-memory`

- `/vaken-memory` lists the notes Claude keeps for this project and the instruction files.
- `/vaken-memory <note>` shows one note. Example: `/vaken-memory project-notes`.

A word after it works on what vaken keeps:

- `/vaken-memory decisions` lists the decisions it noted, and `decide <sentence>` adds one.
- `/vaken-memory rules` lists the rules in your CLAUDE.md that it watches.
- `/vaken-memory park <idea>` keeps a side idea for later. `park` alone lists them.
- `/vaken-memory reflect` looks at what vaken caught today and may suggest a rule.
