# Privacy

vaken runs on your computer, inside Claude Code (macOS first; Windows 11 is beta). It has no server and no telemetry. It sends nothing to its authors.

## What it stores

**Why some names say "cockpit".** "cockpit" is the older name of vaken. Some names keep it on purpose, so that your saved settings and notes survive an update. The app never shows these names. They are the store keys, the data folder and a few project files, as listed below.

**In the Claude Code plugin store.** Every key starts with `cockpit:`. The keys hold settings (your view, your presets), counts and times (cost per day, plan limit readings), your safety choices, the state of away mode, the list of agents, and notes you asked it to keep (decisions, rules, parked ideas).

**In folders under `~/.claude/cockpit/`.** Only vaken writes here.

| Folder | What is in it |
|---|---|
| `checkpoints/` | Copies of files a session changed, so Undo can restore them. Files that look like secrets are skipped. |
| `briefs/` | Short hand-over notes for a new session. Old ones are removed by themselves. |
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

The decision log and the skill coach are on in "Recommended" and in "Everything useful". They are off in "Only alerts". Turn one off with `/vaken-settings decisions.mode off` or `/vaken-settings coach.mode off`, or in Settings under "Prompts and memory" and "Notes for the next session".

For shell steps, vaken keeps only the program name and the kind of step, not the full command.

## What goes to Claude

By default vaken makes no extra model calls. It adds short notes to what Claude already reads:

- Safety notes: the warnings and holds of the risky-step checks, the note that web and app text is data and not orders, and the loop breaker. Every other check speaks only to you.
- A "what Claude keeps" note when a session is compacted: your goal, the branch and the next steps (setting `compact.card`, on by default).

More goes to Claude only when you choose it:

- You turn on a feature that talks to Claude (the mode "Everything useful" turns some on; "Recommended" and "Only alerts" do not): Plan first, Prompt review or Assumption review add a note to your prompt, and Notes to Claude set to All checks sends the other checks' notes too.
- You press a button that sends a message: a ship step, "Send the better one", continue after a plan limit, a task run, or a message to another of your sessions.
- You press "Say it simpler" (or type `/vaken-settings simple`). This sends Claude's last answer to the model, through Claude Code, to tell it again in plain words.
- You turn on the cache keeper ("Keep session cheap", `cache.keeper`). It is off by default. When a session is quiet, it resends the session's chat to the model, through Claude Code, with a one-word question, so that the prompt cache stays warm. It uses plan usage.

## Network use

Nothing leaves your computer except what is listed under "What goes to Claude" (it goes to Claude Code, not to the authors) and one request to the public npm registry: `npm view <package name>`, for the package check. Only the package name is sent.

vaken has no network code of its own. It runs these programs on your computer. Each one uses the network only as that program normally does. The list below is for macOS. On Windows 11 (beta), vaken uses `tasklist`, `netstat` and PowerShell where macOS uses `ps`, `lsof` and the other system tools.

| Program | Why |
|---|---|
| `git` | Branch, status, diff and worktree facts. Local only: vaken never fetches or pushes. |
| `gh` | Pull requests, checks and merge. Only if you installed `gh` and signed in. |
| `npm view` | The safety check checks that a package name is real before you install it. It asks the public npm registry (`https://registry.npmjs.org/`), named on the command line, so no `.npmrc` sends it elsewhere. Only the package name is sent. |
| `curl` | To `http://localhost:<port>`, to see if your dev server answers. To one other address only if you type it yourself. |
| Chrome (headless) | Takes a picture of a page. The tool that Claude can call takes only `localhost` addresses and html files inside your project. |
| `ps`, `lsof`, `top`, `sysctl`, `vm_stat`, `pmset` | Reads the load of your computer and the processes of your sessions. |
| `caffeinate` | Only when you turn on keep-awake. |

It asks a model (through Claude Code, with your account) only in the cases listed under "What goes to Claude".

## Delete everything

Open Settings and press "Delete everything vaken stored" at the bottom of the page. The first press shows what would go: the number of store keys and the folders with their size. The second press deletes. It removes every `cockpit:` key (except a pause that is on, which stays on for safety) and everything directly under `~/.claude/cockpit/`. On Windows 11 (beta) the folder `%USERPROFILE%\.claude\cockpit` itself stays, and you remove it by hand. It never touches your project files, any `CLAUDE.md`, `settings.json` or anything else in `~/.claude`.

These stay, because they are in your projects or your agents folders: the project files listed above, the agent files `vaken-*.md`, the `CLAUDE.md` block and `.claude/worktrees/`. Delete them by hand if you wish. [UNINSTALL.md](docs/UNINSTALL.md) lists them.
