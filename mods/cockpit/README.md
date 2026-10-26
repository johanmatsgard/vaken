# vaken

vaken is mission control for the Claude Code DESKTOP app. It needs the pane of the desktop app (macOS and Windows 11). It does not work in claude.ai chat, in Cowork or in the terminal program alone.

Not affiliated with Anthropic.

## What it shows

The pane sits to the right of your chat. It shows what needs you, your plan limits, how full the context is, your agents and sessions, pull requests and checks, and the cost per day. It also keeps short notes for your next session.

## The safety stop

vaken looks at each step Claude is about to take, before it runs. It warns, asks or stops risky steps: bulk deletes, forced pushes, secrets, outside actions such as posts and payments, and very young or look-alike packages. A destructive command or a secret stops the step when Claude Code would not ask you first. It is a seat belt, not a sandbox. `/vaken-pause` pauses every change step.

## What vaken does by itself

vaken never answers "yes" for you, and it never writes permission rules into your settings. It only says "no" to a step, or acts when you press, unless you turn a feature on.

### Steps it can say no to

- **Risky steps (the safety check).** Before each step it looks for destructive commands, edits outside your folders, odd packages, outside actions, secrets and migrations. New install: it warns. In auto or bypass mode, where Claude Code would not ask you, a destructive command or a secret stops and waits for you. To only warn there too, press the choice "Warn (stops in auto mode)" yourself, once, in Settings > Safety > Risky commands and Secrets; it then reads "Warn only".
- **Pause and Allow once.** `/vaken-pause` stops every step that changes things. `/vaken-guard allow once` lets one stopped step through. Both only when you type them.
- **While away.** Careful stops risky steps while you are away. Off by default. Settings > Safety > While away.
- **Budget.** On Stop it says no to costly calls once the session or day budget is used up. Off by default. Settings > Money and plan > Budget.
- **Agent cap.** On Stop it says no to a new agent over your limit. New install: Warn, which never says no. Settings > Agents > Agent cap.
- **Loop breaker.** On Stop it says no to a step that keeps failing, until your next message. New install: Warn. Settings > Safety > Loop breaker.
- **Agent models.** It tells you when a lookup agent could use a cheaper model. It never changes the agent. Settings > Agents > Agent models.

### Output it makes shorter

- **Lean session.** On by default. Long install and test logs are cut short, and an unchanged file read again becomes one line. Errors and the last 40 lines are always kept. Settings > Money and plan > Lean session.
- **Big file mention.** When you @-mention a huge file, it asks first, and reads only the end if you say yes. It follows Lean session.

### Files it writes only on your press

- **Set up agents** writes agent files under `.claude/agents/` or a block in CLAUDE.md. Off by default: Settings > Prompts and memory > Set up agents.
- **Learn from you** offers to save a correction you repeat as one rule in the project's CLAUDE.md. It writes only when you press. `/vaken-settings teach.mode off` stops the offers.

### Things it runs

- **Compacting.** New install: Watch only. The This session card shows a good moment, and Compact now does it. Auto compacts by itself at a break or at 60% full, never while you type or work runs. The first-start question "Long chats" offers Auto, or set it in Settings > Money and plan > Compact by itself.
- **Task runner.** Nothing runs until you press Start. The four agent types (Researcher, Builder, Reviewer, Fixer) are agent files in the plugin. When a run starts, vaken asks Claude in a message to start the agents for your task list, with each one's task, type, model and folder. To stop one, vaken asks Claude in a message. A stop is a request: the task shows as stopped at once, but the agent ends only when Claude stops it, so a time or cost limit is no longer a hard stop. After a plan limit it waits: press Go on on the Agents card. A run set to "After a plan limit: Go on" goes on by itself. Stop all on the Agents card, or `/vaken-tasks stop`, stops a run.
- **Night run.** Off by default. `/vaken-tasks night` runs the list unattended on mains power, keeps the Mac awake and turns on While away: Careful, then puts them back. It goes on after a limit by itself. Turn it on with `/vaken-settings night.mode on`.
- **After a limit.** New install: Remind, a note when the limit resets. Resume also sends "continue" for you, a few times a day at most. Settings > Money and plan > After a limit.
- **Keep session cheap.** Off by default. In a break it sends a short model call to keep the cache warm. Settings > Money and plan > Keep session cheap.
- **Keep Mac awake.** Off by default. Settings > Agents > Keep Mac awake.
- **Buttons.** Next steps, Ask, Compact now, Nudge, Remove copy and the others act only when you press them.

### Programs, web calls and automatic writes

Everything vaken does on its own, besides what is listed above. Programs run on your computer. vaken's only network code of its own is one read of the public Claude status page, to say when Claude is down, and nothing here sends your files or your words anywhere.

**Background programs** (they only read, on timers or after an event; nothing is pushed or changed):

- `git`: branch, status, diff and worktree facts. It never fetches or pushes.
- `gh` (GitHub CLI): pull requests and checks, only if you installed it and signed in. It merges only when you press Merge.
- `ps`, `lsof`, `top`, `sysctl`, `vm_stat`, `pmset`: the load of your computer, the battery and the processes and ports of your sessions. During a night run, `pmset -g batt` at most once a minute.
- On Windows: `netstat`, `tasklist` and fixed PowerShell lines read the same facts.
- `curl` to `http://localhost:<port>`: to see if your dev server answers.
- `osascript` (Mac): a short fixed notice while you are away, when the app's own notice did not reach you. No prompt, file or session name goes in it.
- `which` or `where`, `sleep` and `test`: to find a tool and wait a second.
- `caffeinate` (PowerShell on Windows): only while Keep Mac awake is on, or during a night run.
- `kill` or `taskkill`: stops a program by its exact number, only one vaken started itself (the keep-awake holder) or one you pressed Stop on.
- `find`, `rm`, `mkdir`, `chmod`, `du`: keep vaken's own folder tidy (see below).

**Web calls** (the only two):

- The Claude status page, `https://status.claude.com`, every 5 minutes while a session is active, to show "Is Claude down?". It reads one public page and sends nothing of yours. It follows your organization's web policy.
- `npm view <package name>` (or the same command of `pnpm`, `yarn` or `bun`), when the safety check looks at an install. It asks the public npm registry and sends only the package name.

**Automatic writes** (all on your computer):

- Undo copies: before a file changes, a copy goes under `~/.claude/cockpit/checkpoints/`. Copies older than 7 days that no Undo list uses are removed, and so are hand-over notes older than 14 days.
- A hand-over note: written under `~/.claude/cockpit/` just before Auto compacts the chat, so the next step can find what was open.
- Task run folders: when you press Start on a task run, a task that writes code gets its own git worktree under `.claude/worktrees/`. vaken removes one only when you press Remove this copy.

## What vaken does on your computer

A short list of everything vaken does by itself, per kind. Facts read from the code. The sections below give more detail.

- **Files it writes.** Only on your computer. Under `~/.claude/cockpit/`: Undo copies of a file just before it changes, hand-over notes, pictures and browser profiles. In your project, only when you press or type a command: `.claude/cockpit-*` files, `.claude/cockpit-eyes/` and `.claude/worktrees/`. Agent files under `.claude/agents/` or `~/.claude/agents/` and a CLAUDE.md block only when you accept them in Set up agents (a `.bak` copy first). It never writes `settings.json` or a hook file. The write in `agentcap.ts` is the shared file block every feature file holds; `agentcap.ts` itself writes no file.
- **Programs it starts, and why.** Each is a fixed program name with fixed arguments: `git` and `gh` (branch, checks and pull request facts; `gh` merges only when you press Merge), `ps`, `lsof`, `top`, `sysctl`, `vm_stat`, `pmset` (the load of the computer and the battery; on Windows `tasklist`, `netstat` and fixed PowerShell lines), `curl` to `http://localhost:<port>` (does your dev server answer), headless Google Chrome (a picture of a `localhost` page), `osascript` (a fixed notice while you are away), `caffeinate` (only with Keep Mac awake on), `npm view` (the package check), `kill` or `taskkill` (only a program vaken started, or one you pressed Stop on), `find`, `rm`, `mkdir`, `mv`, `chmod`, `du` (only inside `~/.claude/cockpit/`), `git worktree add` and `remove` and `git branch -D` (only for a task run's own copy, the remove only when you press Keep, which keeps its branch, or Throw away), `gh run view --log-failed` (why a check failed), and `sh -c` with the check command you set for a task run, or a fixed line that starts `caffeinate` or Chrome. The run call in `agentcap.ts` is the shared block; `agentcap.ts` itself starts no program.
- **Hosts it contacts, and what it sends.** Two only. `https://status.claude.com/api/v2/summary.json` (a fixed address), every 5 minutes while a session is active: a plain read that sends nothing of yours. `https://registry.npmjs.org/` through `npm view` before an install: only the package name. vaken has no server and no telemetry.
- **Slash commands it runs itself.** `/compact`, only when the app refuses a direct compaction (`compaction.ts`; see "`/compact`" below for when). And the skill or command you press Start on in the Skills card (`home/actions.ts`), only on that press.
- **Prompts it submits, and what is in them.** Fixed text, almost always after a press, or your own words: a quick action you saved yourself, sent when you type `/vaken quick <name>`. The fixed ones: Nudge (`continue`), Send the better one, a fix button, the task runner's plan and start requests, and Finish safely (`cost.ts`: "<check> failed 3 times in a row. Do not try the same fix again. Start one agent with model ... to find why and fix it ... Keep this session's model as it is."), sent when the turn ends if you pressed it while Claude worked. With Resume on (default Remind) it submits "The plan limit has reset. Continue where you stopped." after a limit, with a daily cap.
- **Messages to other sessions** (`$.session.send`). Only after a press or a yes: your typed answer or a Nudge (`continue`) to another session from the pane (`home/talk.ts`), a message you wrote to another session after you say yes (`inbox.ts`), and a line you type for one helper of your task run (`/vaken-tasks say`, `orchestra.ts`).
- **The prompt box and sound.** It puts text in your prompt box for you to send or edit, never sends it (`$.prompt.fill`: `ship.ts`, `phonedo.ts`, `crew3.ts`, `notes.ts`). It shows a dim hint you take with Tab (`$.prompt.suggest`: `nextsteps.ts`, `inbox.ts`). With Tell me set to Speak, it reads a short notice aloud on your computer (`$.audio.speak`, `tellme.ts`).
- **Agents it starts.** None by itself. For a task run you started (`home.tsx`, `orchestra.ts`), it asks Claude in a message to start them, and Claude starts them. Its four agents (`vaken:researcher`, `vaken:builder`, `vaken:reviewer`, `vaken:fixer`) set no `permissionMode` and no hooks, so they keep Claude Code's own permission mode.
- **Tools it calls itself.** None of Claude Code's own tools. It only reads two things: the list of tools each plugin adds, for the plugin card (`$.tool.list`, `trust.ts`), and what Claude Code would decide for a step, for the guard (`$.tool.check`, `guard.ts`, `guardworld.ts`); it changes neither. When you press Stop or a task passes your time or cost limit, it asks Claude in a message to stop that agent. The app's session and window tools listed below. Its own `vaken_status` tool is answered by vaken from its store (`steer.ts`); it does not answer any other tool. `tellme.ts` calls the app's own notice (`$.ui.notify`), not another plugin.
- **Permission decisions.** vaken never says "yes" for you and has no hook on Claude Code's permission check or its "Allow?" question. Two hooks only watch: `classic.Notification` (`home.tsx`, `attention.ts`) notes that Claude Code asked you, for the pane and the step timer, and `classic.PermissionDenied` (`allowrules.ts`) shows why Claude Code stopped a step. Both pass on with `next(e)` unchanged. The only answers vaken gives are a `deny` from the guard, `/vaken-pause` or a cap you set. The hooks on `agent.spawn` and `command.run` pass on unchanged except where "For reviewers" says why. vaken never changes Remote Control, your permission mode or your settings.

## Install

Run these lines in a terminal, then open a NEW session in Claude Code Desktop and type `/vaken`.

```
claude plugin marketplace add johanmatsgard/vaken
claude plugin install vaken@vaken
```

## What vaken runs, sends and stores

vaken has no server and no telemetry. It sends nothing to its authors. It never changes your `settings.json`.

**Programs it starts on your computer.** vaken's only network code of its own reads the public Claude status page (`https://status.claude.com`), at most every 5 minutes while you use a session, to say when Claude is down. It sends nothing about you. Each program below uses the network only as it normally does.

- `git`: branch, status, diff and worktree facts. It never fetches or pushes.
- `gh` (GitHub CLI): pull requests, checks and merge. Only if you installed it and signed in.
- `curl`: to `http://localhost:<port>`, to see if your dev server answers. To another address only if you type it.
- Google Chrome (headless): takes a picture of a page. The tool that Claude can call takes only `localhost` addresses and html files in your project.
- `ps`, `lsof`, `top`, `sysctl`, `vm_stat`, `pmset`: read the load of your computer and the processes of your sessions. On Windows: `tasklist`, `netstat` and PowerShell.
- `osascript` (Mac only): a short fixed notice while you are away.
- `caffeinate` (PowerShell on Windows): only when you turn on keep-awake.

**The two network requests vaken starts itself.** Before an install, the package check runs `npm view <package name>` (or the same command of `pnpm`, `yarn` or `bun`). This asks the public npm registry, `https://registry.npmjs.org/`. Only the package name is sent. Every 5 minutes while a session is active, vaken reads the public Claude status page, `https://status.claude.com`, and sends nothing of yours.

**What goes to Claude.** By default vaken makes no extra model calls. It adds short safety notes to what Claude already reads, and a note about what to keep (goal, next steps, open files and decisions) with every compaction vaken starts. Auto compaction starts on Watch only for a new install (a Compact now button); you can choose Auto. For a long message, at most once an hour, one short note asks Claude for working habits: a visible task list, a done and next close, clickable questions and chapters (`tasks.visible`, `habit.*`, on by default). Plain mode (`plain.mode`, on by default) asks Claude for short, simple words. While you are on the phone, the phone note (`phone.note`, on by default) tells Claude what a phone cannot do. More goes to Claude only when you choose it: features such as Plan first or Prompt review, buttons that send a message, "Say it simpler", and the cache keeper (off by default). All of it goes through Claude Code, with your account.

**Built-in app tools.** vaken calls the desktop app's own built-in tools on your computer: the session tools (to read your plan usage, list your sessions and, when you press a button, change a session's model or effort) and the window tool (to open the pane in a new window). These calls stay inside the app.

**Where it stores data.** On your computer only.

- The plugin store of Claude Code, with keys that start with `cockpit:`.
- Files under `~/.claude/cockpit/`: copies of changed files for Undo, hand-over notes, and pictures.
- In your project, only when you ask: `.claude/cockpit-*` files and `.claude/worktrees/`.

vaken does not store your prompts or transcripts as text. "Delete everything vaken stored" in Settings removes the store keys and the files under `~/.claude/cockpit/`.

## Privacy and data

- **What is stored:** counts, names, paths, states, exit codes and times. Never your prompt text, transcript text or tool output. A session title and a goal are a few key words of your first prompt.
- **Where:** in the plugin store of Claude Code (keys that start with `cockpit:`, under `~/.claude`) and in files under `~/.claude/cockpit/`. In your project only when you ask.
- **What leaves your computer:** only the status page read and `npm view`, both described above. A model call happens only when you press a button or turn a feature on. It goes through Claude Code, with your account. vaken has no server and no telemetry.
- **Remove it all:** open Settings and press "Delete everything vaken stored" at the bottom. The first press shows what would go, the second deletes. It never touches your project files or `settings.json`.
- **Full details:** [PRIVACY.md](https://github.com/johanmatsgard/vaken/blob/main/PRIVACY.md).
- **Security reports:** use GitHub private vulnerability reporting: open the Security tab of the repository and choose "Report a vulnerability" ([SECURITY.md](https://github.com/johanmatsgard/vaken/blob/main/SECURITY.md)). Do not post a security problem as a public issue.

## For reviewers: what the hooks do

Where vaken changes an event before it passes it on, it does so on purpose. This list gives the reason and the setting. Defaults are in `hooks/core/settings.ts` and the `hooks/core/` file of each feature; presets are in `hooks/core/presets.ts`.

**Notes added to what Claude reads.**

- Assumption review (`assumptions.ts`, `prompt.submit`): one line asks Claude to list its assumptions. Setting `assume.check`, default off.
- Working habits (`tasklist.ts`, `prompt.submit`): for a long prompt, one note with the habits you turned on (a visible task list, a done and next close), at most once an hour. Only habits set to On.
- Plan first (`planfirst.ts`, `prompt.submit`): one line asks for a short plan. Only when `plan.first` is Ask. Default Suggest shows a line to you only.
- Prompt review (`promptcheck.ts`, `prompt.submit`): one line asks Claude to ask one question about a short prompt. Only when `prompt.check` is Ask. Default Tip shows a line to you only.
- Checks (`proof.ts`, `prompt.submit`): a note that a claim has no passing check. Only when `claude.notes` is "All checks"; default "Safety only". With Claims on (default Warn), a "done" claim without a passing check also gets a one-line warning in the turn result.
- Compaction (`compaction.ts`, `session.compact`): the keep instruction (goal, what is done, what is next, open files and branches, decisions, any waiting question) is added to every compaction vaken starts. Setting `compact.card`, default on. Also, once per crossing of `compact.from`, a short note asks Claude to finish the step and end its turn (`compactnudge.ts`, `tool.call`), only when vaken would compact but Claude is mid-task.
- Guard (`guard.ts`, `tool.call`): a short safety note after a warned step. Always on.
- Phone note (`phone.ts`, `prompt.compose`): one fixed section, only while the person is on the phone, at most until Phone mode would end. On the phone means: a phone (surface `mobile`) is attached, or the last prompt or command came through the Remote Control bridge (origin `bridge`) and no prompt was typed at the Mac (origin `composer`) since. Setting `phone.note`, default on. The text (`hooks/core/phonenote.ts`, `PHONE_NOTE_TEXT`): the person is on a phone and cannot run commands, open files, see the Mac screen or open a localhost link; run commands yourself and show the short result, never ask them to open, run or look at something on the Mac; send a file or picture with your file-sending tool if you have one, else show the key lines, and for a localhost page send a picture, never the link; sum up diffs and long output in a few plain lines; say in one line when a sign-in or connector needs the Mac's browser; offer next steps with your question tool.

**Prompts the person's own command submits.** `/vaken show`, `/vaken run` and `/vaken pic` (`phone.ts`, `eyes.ts`, `command.run`) submit one fixed prompt as the person's words (`$.prompt.submit` with `asUser`), half a second after the command ends, only when the person typed the command. Only the path or the command changes (`hooks/core/phonenote.ts`):

- show: "Please send me the file `<path>` with your tool that sends files to the person. If you have no such tool, show its first 40 lines as text; for a picture, describe it in a few lines." The path must be inside the project (also where a link lands), not a secret-looking file (the guard's `secretPathKind`), and a file that is there.
- run: "Please run exactly this command in the project folder and show me the short output (the last lines, or a few plain lines if it is long):" then the command. vaken runs nothing itself; Claude's permission prompts and the guard apply.
- pic: vaken takes one 390-wide picture with the Preview card's headless Chrome (localhost only, outside addresses go to a dead proxy) into `.claude/cockpit-eyes/`, then: "Please send me the picture `<path>` with your tool that sends files to the person. If you have no such tool, describe what the picture shows in a few lines."

**Prompts vaken rewrites from the person's own prompt** (`phone.ts`, `eyes.ts`, `prompt.submit`). A phone, or a message typed while Claude works, can send the words above as plain text. When a prompt from the person (origin `composer` or `bridge`) is exactly `/vaken show ...`, `/vaken run ...` or `/vaken pic ...`, vaken puts the same fixed prompt in its place (same checks); a refusal is shown to the person as a notice and nothing goes to Claude. The number menu, only for a prompt or command from the phone (origin `bridge`): `/vaken` alone answers with the menu as a notice and sends nothing to Claude. For 10 minutes after it, and only until the next prompt from the phone, a prompt from the phone that is exactly one digit becomes a fixed prompt (`hooks/core/phonenote.ts`); a digit from the Mac is never changed:

- 1: "Sum up what changed since my last message in a few plain lines."
- 2: "Run the project's tests and show the short result."
- 3: the pic word above (the dev server vaken found).
- 4: "continue"
- 5: no prompt; the person gets the short status the phone hello gives, as a notice.

The first prompt from the phone in a stint also adds the phone hello (a `system` row Claude never reads). vaken keeps which origin kinds it has seen, with the time, under `cockpit:phone:origins` (no text).

**Big files** (`bigfile.ts`, `prompt.mention`). When a prompt names a file with `@` and it is very long, vaken asks you once whether to read the whole file or only its last lines. If you pick the last lines, the mention is passed on with a line range, so Claude reads that tail. Without an answer the whole file is read. Nothing is asked when `lean.mode` is Off.

**Effort for quick asks** (`home.tsx`, `turn.step`). Only after you press the low-effort button the model-fit card offers for quick asks (setting `hints.model`), the main session's steps are sent with low effort while your asks stay quick; it ends when you stop pressing or an ask is not quick. Nothing else about the step changes, and helper agents are never touched.

**Model routing** (`route.ts`, `agent.spawn`). A tip only: when a helper that only reads or searches could use a cheaper model, vaken says so. It passes the event on unchanged, so the agent starts as Claude asked.

**Task runner** (`orchestra.ts`, `agent.spawn`). It only watches. It passes the event on unchanged, then notes which task of your run a new agent belongs to, by the task code on the first line of its brief.

**Away mode** (`away.ts`, `command.run`). It handles its own `/vaken-away` command and removes a time such as "for 2h" from the arguments before the base switch reads them. `away.policy` (default Off) makes the guard stricter while you are away.

**Permission.**

- A `classic.Notification` hook (`home.tsx`, `attention.ts`) notes when Claude Code asks you for permission, so the pane can show "needs you" and the step timer does not time a step that waits for you. It only records that and passes the event on; it never answers.
- A `classic.PermissionDenied` hook (`allowrules.ts`) shows in the band why Claude Code stopped a step. It passes the event on unchanged and never retries the step.
- The guard (`guard.ts`, `tool.call`) answers only `deny`, or passes the step on. With a block set to Stop it denies a risky step with a reason. With Warn (default) it adds a note. It asks Claude Code what it would decide (`$.tool.check`) and reads settings (`$.settings.read`), and changes neither.
- "Allow once" approves nothing itself. Pressing it, or typing `/vaken-guard allow once`, stores a one-time permit for that exact step (tool name and a hash of its input). The guard does not hold that step when Claude tries it again, and the permit is used up.
- `/vaken-pause` denies every step that changes things in this session until you lift it.

**Hooks that see network, MCP and process calls.** The guard reads the name and input of each call to classify it (push, post, payment, install). The agent board, agent cap and away hooks read agent calls to count them. None of them runs, changes or sends the call. They keep counts and short words, not contents. Their only changes are a guard `deny` and an added note.

**`agentcap.ts`.** It limits how many agents run at once. It writes no file and starts no program. It keeps only a count in the plugin store (`cockpit:agents:<session>`). Write and run functions in its file come from a block all feature files share.

**`/compact`** (`compaction.ts`). Vaken runs it for two reasons. First, `compact.mode` is Auto (a choice: a new install starts at Watch only, which only shows the moment) and one of two triggers holds (`compactauto.ts`): a break, when the prompt cache has `compact.lead` minutes of its 60 left, or a full session, when the window is `compact.from` percent full and compacting pays back within 5 answers (looked at 30 seconds after the answer, and again at 2 minutes, only while the prompt box is empty). The break trigger needs a known plan, because it needs the cache time. Second, you press "Compact now". Why: a big context costs on every step; compacting while the cache is warm is cheap; a session under `compact.min` tokens (at most half its window) is left alone. It never runs mid-turn, with an agent in the foreground, a risky step waiting, or a compaction in the last 20 minutes. With only background helpers open (agents or background commands; a background command counts until its end is seen) and the main turn ended, the full-session trigger waits for 75 percent (`BUSY_FROM_PCT`, never under `compact.from`) and the break trigger does not fire; the keep instruction then adds one line asking Claude's summary to list each helper still running, its id and what it will do with the result. Without this, a long orchestration session always has a helper open and the engine compacts by itself at about 97 percent, late and without the keep note. It first asks the app to compact directly, and uses `/compact` only if the app refuses.

**The app's built-in tools** (`continuity.ts`, pane). Nothing leaves your computer.

- `ccd_session_mgmt`: `get_usage`, `get_session`, `list_sessions` and `search_session_transcripts` only read. `set_session_model` and `set_session_effort` change another session, only when you press a model-fit button; the pane offers Undo.
- `ccd_window`: `open_session_in` opens this session in its own window when you press Pop out.

**Agents and prompts** (`home.tsx`, `orchestra.ts`).

- vaken starts no agent itself and calls no tool to stop one. For a run you started, it asks Claude in a message to start each helper, and to stop one when you press Stop or a task passes the time or cost limit you set.
- A prompt is submitted (`$.prompt.submit`) only when you press a button, with fixed text: "Send the better one", "Nudge" (`continue`), a fix button, and the task runner's plan request. The task runner's start and stop requests are the exception: a running run asks Claude to start each helper, and asks again every 2 minutes while it has not started, at most 3 times a task; then the task waits until you press Go on (`/vaken-tasks go`). One more case: with `resume.mode` set to Resume (default Remind), it submits "The plan limit has reset. Continue where you stopped." after a limit resets, with a daily cap.

**Added to Claude Code.** Agents `vaken:researcher`, `vaken:builder`, `vaken:reviewer` and `vaken:fixer` for the task runner as plain agent files in the plugin's `agents/` folder (the model each run picks, `runner.*`, goes in the start message). One tool, `vaken_status`, which returns the session goal, checks and last turn from the store (`steer.mode`, default on). Slash commands: `/vaken`, `/vaken-away`, `/vaken-compact`, `/vaken-explain`, `/vaken-guard`, `/vaken-help`, `/vaken-memory`, `/vaken-pause`, `/vaken-resume`, `/vaken-settings`, `/vaken-ship`, `/vaken-tasks`, `/vaken-today`, `/vaken-undo`, `/vaken-usage`.

**Files it writes**, on your computer only. Under `~/.claude/cockpit/`: Undo copies (automatic), briefs, pictures and browser profiles. In your project, on request: `.claude/cockpit-tasks.md`, `-packet.md`, `-audit.md`, `-decisions.md`, `.claude/cockpit-eyes/`, and `.claude/worktrees/`. Agent and skill files you accept go in `~/.claude/agents/` and your skills folder; Agent setup keeps a `.bak` copy.

**"Uses a credential from the user's machine."** vaken reads no credential, token or key file. It reads only the environment names HOME, USERPROFILE, HOMEDRIVE, HOMEPATH, LOCALAPPDATA, ProgramFiles and ProgramFiles(x86) (where Chrome is on Windows), OS, LANG, LANGUAGE and LC_ALL. Words such as "secret" and "token" in the code are patterns the guard uses to detect a secret in a step of Claude. `gh` uses its own sign-in.

**`lines.tsx`.** A lazy getter builds a card view only when the pane reads it.

## More

- Full README: https://github.com/johanmatsgard/vaken/blob/main/README.md
- Privacy: https://github.com/johanmatsgard/vaken/blob/main/PRIVACY.md
- Security: https://github.com/johanmatsgard/vaken/blob/main/SECURITY.md

License: MIT.
