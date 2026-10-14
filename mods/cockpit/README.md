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

## More

- Full README: https://github.com/johanmatsgard/vaken/blob/main/README.md
- Privacy: https://github.com/johanmatsgard/vaken/blob/main/PRIVACY.md
- Security: https://github.com/johanmatsgard/vaken/blob/main/SECURITY.md

License: MIT.
