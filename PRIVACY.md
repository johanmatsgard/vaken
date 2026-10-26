# Privacy

vaken runs on your computer, inside Claude Code (macOS and Windows 11). It has no server and no telemetry. It sends nothing to its authors.

## What it stores

**Why some names say "cockpit".** "cockpit" is the older name of vaken. Some names keep it on purpose, so that your saved settings and notes survive an update. The app never shows these names. They are the store keys, the data folder and a few project files, as listed below.

**In the Claude Code plugin store.** Every key starts with `cockpit:`. The keys hold settings (your view, your presets), counts and times (cost per day, plan limit readings, and the cost and 5-hour window points of up to 40 recent turns for the cost hint), your safety choices, the state of away mode, the list of agents, and notes you asked it to keep (decisions, rules, parked ideas).

**In folders under `~/.claude/cockpit/`.** Only vaken writes here.

| Folder | What is in it |
|---|---|
| `checkpoints/` | Copies of files a session changed, so Undo can restore them. Files that look like secrets are skipped. |
| `briefs/` | Short hand-over notes for a new session, written before Auto compacts or when you press Start fresh with a brief. Old ones are removed by themselves. |
| `eyes/` | Pictures and options for the page-picture feature, if you use it. |

**In your project, only when you ask or use the feature.**

- `.claude/cockpit-packet.md` (a hand-over note), `.claude/cockpit-tasks.md` (a task list), `.claude/cockpit-eyes/` (pictures), and, if you export them, `.claude/cockpit-decisions*.md` and `.claude/cockpit-audit*.md`.
- `.claude/worktrees/`: folder copies of the project that the task runner makes for its tasks.
- `.claude/agents/vaken-*.md` and one marked block in the project `CLAUDE.md` (between `<!-- cockpit:begin -->` and `<!-- cockpit:end -->`), only if you turn on "Set up agents for me".

**In your home folder, only when you ask.** `~/.claude/agents/vaken-*.md`: the starter agents from `/vaken-tasks agents make yes`, or the agent files of "Set up agents for me" when its place is "All projects". vaken never overwrites a file of yours there, and never writes the `CLAUDE.md` in your home folder. It never changes `settings.json`.

## What it keeps as words

vaken does not store your prompts or transcripts as text. It does keep the short parts below, as words. They stay only on this computer, in the plugin store or in `~/.claude/cockpit/`. vaken hides text that looks like a secret in the goal, in the hand-over notes and in error labels. A decision note is cut to 240 characters but is not scanned, so do not state a secret in a decision.

| What | Where it comes from | How to turn it off |
|---|---|---|
| A session title: a few key words of the first prompt of the session. | The first prompt. Not the whole sentence. | No setting turns it off. "Delete everything" removes it. |
| The goal for the proof check: a few key words of your first prompt, or the sentence you type after `/vaken-tasks goal`. | The first prompt, or what you type. | Set `proof.receipts` to Off. "Delete everything" also removes it. |
| Messages you queue for another of your sessions (the inbox and steering). | What you type. | Do not queue messages. They go when the other session reads them, and "Delete everything" removes them. |
| The decision log: your answers and decisions you state, one sentence each, at most 240 characters. | What you answer or state. | Set `decisions.mode` to Off. |
| The skill coach: a short code of each repeated request, not its words, and a count. | Your requests. | Set `coach.mode` to Off. |
| Learn from you: for a correction you repeat (such as "use pnpm, not npm"), a short code of it (a hash, not its words), the times you said it in the last 14 days, and when it was offered. Per task run, a pass and fail count per agent role and model. A rule you save is one plain line in the vaken block of the project's `CLAUDE.md`, never the one in your home folder and never settings. A line that looks like a secret is never saved. | Your messages and the task runner. | Set `teach.mode` to Off (`/vaken-settings teach.mode off`). `/vaken-memory rules remove <number>` removes a saved line. |
| Why a step stopped: the kind of a step Claude Code itself stopped, and a short hash of it, for 3 minutes. In memory only, never the full command. | Claude Code's own "permission denied" event. | `/vaken-settings allow.rules off`. It is gone when the session ends. |
| Claude's promises: when an answer says it will do something later ("I'll ... later", "next I will", "after this I will", "TODO later"), a few words of it, at most 10 per session, each cut to 80 characters, with text that looks like a secret masked. Code blocks are not read. | Claude's answers in this session. | Type `done` (or `done 2`) to clear one; the list goes when the session ends. Set `recap.mode` to Off to keep none. "Delete everything" removes it. |
| Night runs: the time a night run started, its cost limit, and which safety choices it turned on, so it can put them back. A run's report says whether you were away while it ran. | `/vaken-tasks night`. | Do not start a night run (`night.mode` is Off by default). |
| Your quick actions: up to 12, each a name and the request you typed (at most 400 characters). A request that looks like a secret is refused. | What you type after `/vaken quick add`. | `/vaken quick remove <name>`. "Delete everything" removes them. |

The decision log and the skill coach are on in "Recommended" and in "Everything useful". They are off in "Only alerts". Turn one off with `/vaken-settings decisions.mode off` or `/vaken-settings coach.mode off`, or in Settings under "Prompts and memory" and "Notes for the next session".

For shell steps, vaken keeps only the program name and the kind of step, not the full command.

A step the safety check stopped shows a short form in Needs you: the program and its main target, such as `git reset --hard`, at most 60 characters, with secrets masked. It is held in memory only while the stop is open, and goes when you allow, dismiss or keep it stopped. It is never written to the store.

## What goes to Claude

By default vaken makes no extra model calls. It adds short notes to what Claude already reads:

- Safety notes: the warnings and holds of the risky-step checks, the note that web and app text is data and not orders, and the loop breaker. Every other check speaks only to you.
- A "what Claude keeps" note with every compaction vaken starts, by Auto or by a button: keep the goal, what is done, what is next, open files and branches, decisions, and any question that waits for you (setting `compact.card`, on by default). When helpers still run, one more line asks Claude to list each helper or background command still running, its id and what it will do with the result. Auto is on by default. When Claude is mid-task, vaken may add one short note asking it to finish the step and end its turn, so it can compact. These notes hold no file text.
- A working habits note: for a message of 25 words or more, at most once an hour in a session, one short note asks Claude for the habits that are on: a visible task list, three closing lines (done, not done, what you do next), questions with clickable options, and chapters in a long chat (settings `tasks.visible`, `habit.summary`, `habit.ask`, `habit.chapters`, all on by default).
- Plain mode: asks Claude for short sentences and common words (setting `plain.mode`, on by default).
- Lean session (setting `lean.mode`, Logs only by default, Off in Only alerts): a long shell output from an install, test, build or lint (over 120 lines or 12,000 characters) reaches Claude cut to its first 15 lines, its error and warning lines (at most 60) and its last 40 lines, with one line that says how many lines were cut and how to see them. "All long output" also cuts other long commands and agents' commands. File reads, diffs and searches are never cut, and a failed command under 400 lines is never cut. The cut text is not stored anywhere; vaken keeps only a count in memory. The first message of a new chat also carries a block of at most four lines: the branch, the number of changed files not committed and, only when vaken already stored it, the open pull request for the branch and whether its checks fail. It comes from one local `git status` call and holds no file text.
- The phone note: only while you are on the phone (a phone is attached, or your last message came through Remote Control and you have not typed at the Mac since), a short fixed note tells Claude that you cannot run commands, open files or see the Mac, to send files and pictures with its file-sending tool, never a localhost link, to sum up long output, and to offer next steps as options (setting `phone.note`, on by default). It holds no file text.
- The vaken tool (`vaken_status`): Claude sees the name and description of one read-only tool it can call to ask vaken about this session: the proof check, the definition of done, the goal, what the last answer did, and the session's health. It can only read and changes nothing (setting `steer.mode`, on by default).

More goes to Claude only when you choose it:

- You turn on a feature that talks to Claude (the mode "Everything useful" turns some on; "Recommended" and "Only alerts" do not): Plan first, Prompt review or Assumption review add a note to your prompt, and Notes to Claude set to All checks sends the other checks' notes too.
- You pick an answer shape (`answer.shape`, Default by default): Short or Report adds one fixed rule to Claude's system prompt about how to shape its answers.
- You turn on Phone mode (`phone.mode`, Ask by default: it asks you once): while a phone is attached, one fixed section in Claude's system prompt asks for short, numbered answers. It holds no file text.
- You type `/vaken show <file>`, `/vaken run <command>` or `/vaken pic`, as a command or as plain text: a fixed prompt asks Claude to send that file, to run that command, or to send the picture vaken took of a localhost page. Only the path or the command changes.
- On the phone, after `/vaken` shows the number menu, you send one digit: a fixed prompt goes in its place (what changed, run the tests, the picture, or continue; Status sends nothing to Claude). When the menu leads with next steps or your own quick actions, a digit sends that request.
- You press a next step button (Run tests, Commit, What changed, Continue, Fix it) or type `/vaken quick <name>`: its fixed request goes to Claude, and only on that press (setting `next.mode`, Buttons by default). Choosing the buttons sends nothing: vaken picks them on this computer from counts of the steps (edits, test runs, a failed step), with no model call. With Buttons and hint (Everything useful), the first step also shows as a dim hint in the chat box; it goes to Claude only if you take it with Tab and send it. The hint never replaces Claude Code's own hint.
- You press a button that sends a message: a ship step, "Send the better one", continue after a plan limit, a task run, or a message to another of your sessions. On Where was I or the phone menu: Continue on a promise sends "Please do what you said you would:" and the promise's few words; Fix the failed night tasks sends the numbers and names of the night run's failed tasks; on the phone, the night run's line sends its result and task list.
- You press "Say it simpler" (or type `/vaken-settings simple`). This sends Claude's last answer to the model, through Claude Code, to tell it again in plain words.
- You turn on the cache keeper ("Keep session cheap", `cache.keeper`). It is off by default. When a session is quiet, it resends the session's chat to the model, through Claude Code, with a one-word question, so that the prompt cache stays warm. It uses plan usage.

## Network use

Nothing leaves your computer except what is listed under "What goes to Claude" (it goes to Claude Code, not to the authors) and two requests: `npm view <package name>` to the public npm registry, for the package check (only the package name is sent), and one plain read of the public Claude status page (`https://status.claude.com/api/v2/summary.json`), at most every 5 minutes and only while you use a session, to say when Claude is down (it sends nothing about you).

vaken's only network code of its own is that status page read. It also runs these programs on your computer. Each one uses the network only as that program normally does. The list below is for macOS. On Windows 11, vaken uses `tasklist`, `netstat` and PowerShell where macOS uses `ps`, `lsof` and the other system tools.

| Program | Why |
|---|---|
| `git` | Branch, status, diff and worktree facts. Local only: vaken never fetches or pushes. |
| `gh` | Pull requests, checks and merge. Only if you installed `gh` and signed in. |
| `npm view` | The safety check checks that a package name is real before you install it. It asks the public npm registry (`https://registry.npmjs.org/`), named on the command line, so no `.npmrc` sends it elsewhere. Only the package name is sent. |
| `curl` | To `http://localhost:<port>`, to see if your dev server answers. To one other address only if you type it yourself. |
| Chrome (headless) | Takes a picture of a page. The tool that Claude can call takes only `localhost` addresses and html files inside your project. |
| `ps`, `lsof`, `top`, `sysctl`, `vm_stat`, `pmset` | Reads the load of your computer and the processes of your sessions. During a night run, `pmset -g batt` at most once a minute, to see if the Mac is on mains power. |
| `osascript` | Only on a Mac, to show a notification while you are away from the app, when the app's own notice did not reach you. The text is short and fixed ("1 session needs you."), never a file, prompt or session name. It runs locally and sends nothing. With `notify.how` set to speak, the Mac's own voice says the same text. |
| `caffeinate` | Only when you turn on keep-awake. It also holds during a night run while keep-awake is on. |
| `find`, `rm` | Removes old files vaken made itself, by exact path: hand-over briefs older than 14 days in `briefs/`, and Undo copies in `checkpoints/` older than 7 days that no Undo list uses. "Delete everything" also uses `rm` for vaken's own folders. |
| `du` | Measures the size of vaken's folders for "Delete everything". |
| `mkdir`, `chmod` | Make the `checkpoints/` folder and its copies readable only by you. |

It asks a model (through Claude Code, with your account) only in the cases listed under "What goes to Claude".

## Delete everything

Open Settings and press "Delete everything vaken stored" at the bottom of the page. The first press shows what would go: the number of store keys and the folders with their size. The second press deletes. It removes every `cockpit:` key (except a pause that is on, which stays on for safety) and everything directly under `~/.claude/cockpit/`. On Windows 11 the folder `%USERPROFILE%\.claude\cockpit` itself stays, and you remove it by hand. It never touches your project files, any `CLAUDE.md`, `settings.json` or anything else in `~/.claude`.

These stay, because they are in your projects or your agents folders: the project files listed above, the agent files `vaken-*.md`, the `CLAUDE.md` block and `.claude/worktrees/`. Delete them by hand if you wish. [UNINSTALL.md](docs/UNINSTALL.md) lists them.
