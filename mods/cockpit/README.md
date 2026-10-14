# vaken

vaken is a quiet side pane for the Claude Code DESKTOP app. It needs the pane of the desktop app (macOS, and Windows 11 in beta). It does not work in claude.ai chat, in Cowork or in the terminal program alone.

Not affiliated with Anthropic.

## What it shows

The pane sits to the right of your chat. It shows what needs you, your plan limits, how full the context is, your agents and sessions, pull requests and checks, and the cost per day. It also keeps short notes for your next session.

## The safety stop

vaken looks at each step Claude is about to take, before it runs. It warns, asks or stops risky steps: bulk deletes, forced pushes, secrets, outside actions such as posts and payments, and very young or look-alike packages. A destructive command or a secret stops the step when Claude Code would not ask you first. It is a seat belt, not a sandbox. `/vaken-pause` pauses every change step.

## Install

Run these lines in a terminal, then open a NEW session in Claude Code Desktop and type `/vaken`.

```
claude plugin marketplace add johanmatsgard/vaken
claude plugin install vaken@vaken
```

## What vaken runs, sends and stores

vaken has no server and no telemetry. It sends nothing to its authors. It never changes your `settings.json`.

**Programs it starts on your computer.** vaken has no network code of its own. Each program uses the network only as it normally does.

- `git`: branch, status, diff and worktree facts. It never fetches or pushes.
- `gh` (GitHub CLI): pull requests, checks and merge. Only if you installed it and signed in.
- `curl`: to `http://localhost:<port>`, to see if your dev server answers. To another address only if you type it.
- Google Chrome (headless): takes a picture of a page. The tool that Claude can call takes only `localhost` addresses and html files in your project.
- `ps`, `lsof`, `top`, `sysctl`, `vm_stat`, `pmset`: read the load of your computer and the processes of your sessions. On Windows: `tasklist`, `netstat` and PowerShell.
- `caffeinate` (PowerShell on Windows): only when you turn on keep-awake.

**The one network request vaken starts itself.** Before an install, the package check runs `npm view <package name>` (or the same command of `pnpm`, `yarn` or `bun`). This asks the public npm registry, `https://registry.npmjs.org/`. Only the package name is sent.

**What goes to Claude.** By default vaken makes no extra model calls. It adds short safety notes to what Claude already reads, and a note about your goal and next steps when a session is compacted. More goes to Claude only when you choose it: features such as Plan first or Prompt review, buttons that send a message, "Say it simpler", and the cache keeper (off by default). All of it goes through Claude Code, with your account.

**Built-in app tools.** vaken calls the desktop app's own built-in tools on your computer: the session tools (to read your plan usage, list your sessions and, when you press a button, change a session's model or effort) and the window tool (to open the pane in a new window). These calls stay inside the app.

**Where it stores data.** On your computer only.

- The plugin store of Claude Code, with keys that start with `cockpit:`.
- Files under `~/.claude/cockpit/`: copies of changed files for Undo, hand-over notes, and pictures.
- In your project, only when you ask: `.claude/cockpit-*` files and `.claude/worktrees/`.

vaken does not store your prompts or transcripts as text. "Delete everything vaken stored" in Settings removes the store keys and the files under `~/.claude/cockpit/`.

## For reviewers: what the hooks do

Where vaken changes an event before it passes it on, it does so on purpose. This list gives the reason and the setting. Defaults are in `hooks/core/settings.ts` and the `hooks/core/` file of each feature; presets are in `hooks/core/presets.ts`.

**Notes added to what Claude reads.**

- Assumption review (`assumptions.ts`, `prompt.submit`): one line asks Claude to list its assumptions. Setting `assume.check`, default off.
- Plan first (`planfirst.ts`, `prompt.submit`): one line asks for a short plan. Only when `plan.first` is Ask. Default Suggest shows a line to you only.
- Prompt review (`promptcheck.ts`, `prompt.submit`): one line asks Claude to ask one question about a short prompt. Only when `prompt.check` is Ask. Default Tip shows a line to you only.
- Checks (`proof.ts`, `prompt.submit`): a note that a claim has no passing check. Only when `claude.notes` is "All checks"; default "Safety only". With Claims on (default Warn), a "done" claim without a passing check also gets a one-line warning in the turn result.
- Compaction (`compaction.ts`, `session.compact`): your goal, branch, changed files and next steps are added to the compaction instructions. Setting `compact.card`, default on.
- Guard (`guard.ts`, `tool.call`): a short safety note after a warned step. Always on.

**Model routing** (`route.ts`, `agent.spawn`). With `route.mode` Auto, a helper that only reads or searches gets a cheaper model. Plan and review helpers, helpers from your own agent files, and a model Claude chose are not changed. Default Suggest changes nothing.

**Task runner** (`orchestra.ts`, `agent.spawn`). When a run started with `/vaken-tasks` asks Claude to start agents, this hook swaps the placeholder prompt for the full task text and sets the agent type, model and folder. It acts only on agents of your run.

**Away mode** (`away.ts`, `command.run`). It handles its own `/vaken-away` command and removes a time such as "for 2h" from the arguments before the base switch reads them. `away.policy` (default Off) makes the guard stricter while you are away.

**Permission.**

- The `tool.check` hook (`home.tsx`) returns Claude Code's own answer unchanged. If it is "ask", vaken only records "needs you" for the pane. It never answers allow.
- The guard (`guard.ts`, `tool.call`) answers only `deny`, or passes the step on. With a block set to Stop it denies a risky step with a reason. With Warn (default) it adds a note. It asks Claude Code what it would decide (`$.tool.check`) and reads settings (`$.settings.read`), and changes neither.
- "Allow once" approves nothing itself. Pressing it, or typing `/vaken-guard allow once`, stores a one-time permit for that exact step (tool name and a hash of its input). The guard does not hold that step when Claude tries it again, and the permit is used up.
- `/vaken-pause` denies every step that changes things in this session until you lift it.

**Hooks that see network, MCP and process calls.** The guard reads the name and input of each call to classify it (push, post, payment, install). The agent board, agent cap and away hooks read agent calls to count them. None of them runs, changes or sends the call. They keep counts and short words, not contents. Their only changes are a guard `deny` and an added note.

**`agentcap.ts`.** It limits how many agents run at once. It writes no file and starts no program. It keeps only a count in the plugin store (`cockpit:agents:<session>`). Write and run functions in its file come from a block all feature files share.

**`/compact`** (`compaction.ts`). Vaken runs it when `compact.mode` is Auto and the session is idle, or when you press "Compact now". It first asks the app to compact directly, and uses `/compact` only if the app refuses.

**The app's built-in tools** (`continuity.ts`, pane). Nothing leaves your computer.

- `ccd_session_mgmt`: `get_usage`, `list_sessions` and `search_session_transcripts` only read. `set_session_model` and `set_session_effort` change another session, only when you press a model-fit button; the pane offers Undo.
- `ccd_window`: `open_session_in` opens this session in its own window when you press Pop out.

**Agents and prompts** (`home.tsx`, `orchestra.ts`).

- Helper agents start (`$.agent.spawn`) only for a run you started. The next task of that run starts by itself, one at a time.
- `TaskStop` is called when you press Stop, or when a task passes the time or cost limit you set.
- A prompt is submitted (`$.prompt.submit`) only when you press a button, with fixed text: "Send the better one", "Nudge" (`continue`), a fix button, and the task runner's plan and start requests. One more case: with `resume.mode` set to Resume (default Remind), it submits "The plan limit has reset. Continue where you stopped." after a limit resets, with a daily cap.

**Added to Claude Code.** Agents `vaken:researcher`, `vaken:builder`, `vaken:reviewer` and `vaken:fixer` for the task runner (models set by `runner.*`). One tool, `vaken_status`, which returns the session goal, checks and last turn from the store (`steer.mode`, default on). Slash commands: `/vaken`, `/vaken-away`, `/vaken-compact`, `/vaken-explain`, `/vaken-guard`, `/vaken-help`, `/vaken-memory`, `/vaken-pause`, `/vaken-resume`, `/vaken-settings`, `/vaken-ship`, `/vaken-tasks`, `/vaken-today`, `/vaken-undo`, `/vaken-usage`.

**Files it writes**, on your computer only. Under `~/.claude/cockpit/`: Undo copies (automatic), briefs, pictures and browser profiles. In your project, on request: `.claude/cockpit-tasks.md`, `-packet.md`, `-audit.md`, `-decisions.md`, `.claude/cockpit-eyes/`, and `.claude/worktrees/`. Agent and skill files you accept go in `~/.claude/agents/` and your skills folder; Agent setup keeps a `.bak` copy.

**"Uses a credential from the user's machine."** vaken reads no credential, token or key file. It reads only the environment names HOME, USERPROFILE, HOMEDRIVE, HOMEPATH, OS, LANG, LANGUAGE and LC_ALL. Words such as "secret" and "token" in the code are patterns the guard uses to detect a secret in a step of Claude. `gh` uses its own sign-in.

**`lines.tsx`.** A lazy getter builds a card view only when the pane reads it.

**`ui.fault`.** A Claude Code host event, added in version 2.1.295 (type `UiFaultInput`). vaken uses it to show a calm message when the client code of a pane button fails.

## More

- Full README: https://github.com/johanmatsgard/vaken/blob/main/README.md
- Privacy: https://github.com/johanmatsgard/vaken/blob/main/PRIVACY.md
- Security: https://github.com/johanmatsgard/vaken/blob/main/SECURITY.md

License: MIT.
