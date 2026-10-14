# Guide

vaken is a quiet pane next to your chat in Claude Code Desktop. It shows what needs you, how much of your plan is left, how full your session is, and what your agents do. This guide says what each card shows and what to do with it.

## Open the pane

1. Start a new session. A plugin loads only when a session starts.
2. Type `/vaken` in the chat box of the new session and press Return.

The pane opens to the right of the chat. Press Escape to close it. On Windows 11 (beta) it works the same way.

Send one message first. The plan limits and the session figures show only after the first answer.

To put the pane on a second screen, press "Open in new window" at the bottom of the pane. Then drag that window to the other screen. The new window and the pane show the same view: open Settings or answer a question in one, and the other shows it too.

## The cards that matter most

### Plan limits: how much usage you have used

Each limit has a bar: the 5-hour limit and the weekly limit. Each bar says how much you used and when it resets, for example "5-hour limit 45% used, resets 17:00". The limit that runs out first leads.

The figures come from the app. The card says where each figure comes from.

Type `/vaken-usage` for the same figures as text, with pace and cost.

### This session: how full the context is

The context is everything Claude reads again with each answer. A full context costs more usage.

The card shows:

- The state of the session (Working, Your turn, Idle, Needs you).
- How full the context is, for example "73k of 1M tokens".
- "Compacts at": the point where Claude Code compacts the session by itself, for example 97%.
- A row "When to compact" with a "Show advice" button: advice to compact, when now is a good moment. See "When to compact" below.

### Agents and Other sessions: what is running

The Agents card lists the agents Claude started, in all your sessions. Each row shows the state (working, finished or stuck), how long it ran and what it cost. Older agents sit behind "Show N older".

If you run a task list with `/vaken-tasks`, a bar shows how many tasks are done. Open a task to try it again, keep its work or throw it away.

The Other sessions card lists your other open sessions:

| State | Meaning |
|---|---|
| Working | Claude did something in the last 2 minutes. |
| Your turn | Claude finished. The session waits for your message. |
| Idle | Nothing happened for 2 minutes or more. |
| Needs you | A question or an OK waits. |

Pin a session to keep it first. Hide a session to take it off the list. A hidden session still shows when it needs you.

## Needs you

This card is always on top. It lists what waits for you:

- A question from Claude.
- A step that waits for your OK.
- A step the safety check stopped. Press "Allow once" to let it through.

When nothing waits, it says "Nothing". Press a row to see what it is about.

## Memory and notes

This card shows what a session starts from:

- Instruction files such as `CLAUDE.md`, and how big they are. Claude reads them again with every answer, so big files cost usage. The card also says when the same line is in more than one file.
- Notes Claude keeps for this project.
- "Note for the next session": a hand-over note for a new session. Each line is marked verified or unverified.
- "Kept when compacted": your goal, the branch, the files changed, decisions and next steps.

The closed card says "All small" when all is well. It says "CLAUDE.md is heavy" when your instruction files are big. Then move rarely needed parts into separate notes.

## The three views

| View | What you see |
|---|---|
| Standard | Needs you plus six cards: This session, Memory and notes, Agents, Computer, Plan limits, Other sessions. The default. |
| All | Needs you plus 17 cards, in a fixed order. |
| Custom | Your cards, in your order. |

Standard and All always show the same cards. In Custom, a card you set to Auto shows only when it has something to show. If a card you cannot see has news, you get one line in Needs you. On a wide pane the cards sit side by side, in the same order.

Change the view in Settings, under "Cards and look".

## When to compact

Compacting makes a long session shorter. Claude writes a short summary and drops the long history. A shorter session costs less, because Claude reads all of it again with every answer.

1. Look at the context bar on This session. vaken starts to advise at 30% full. You can change this to 50% or 70% in Settings, under "Money and plan", at "Advise compacting from".
2. Read the advice line. "A good moment" means the session is big enough and the work is at a good place.
3. Read the cache line. A warm cache makes compacting cheap now. A cold cache means compact at the next break.
4. Press the button on the card, or type `/vaken-compact now`.

vaken says "not yet" when:

- Claude is working.
- A question or an OK waits for you.
- An agent or a background command still runs.
- A check failed, or files changed and no check ran.
- Open to-do items are left.
- The session was compacted in the last 10 minutes.
- The session is still small.

Type `/vaken-compact why` to see which one applies now.

The default for "Compact by itself" is "Watch only". vaken notes the good moments and sends nothing. To let it compact by itself, set it to Auto in Settings, under "Money and plan". Auto is your choice: no mode turns it on.

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
- **Recommended.** The default for a new install. Adds every free feature: tips, recaps, prompt tips, budget warnings, a decision log and a look at whether Claude did what it says. It makes no extra model calls. It only adds short safety notes for Claude, and a "what Claude keeps" note when a session is compacted.
- **Everything useful.** Adds checks that send Claude more text, so they use a little more of your plan: prompt and assumption reviews, plan first, and every note to Claude.

The cache keeper ("Keep session cheap") is off in all three modes. It uses plan usage.

None of these three turns on compact by itself. Two other presets, "Save usage" and "Every check on", do turn on compact by itself. `/vaken-settings preset` lists every preset. You can type `recommended` as the name of the middle mode.

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

You can also type: `/vaken-settings` lists the settings, `/vaken-settings <key> <value>` changes one, and `/vaken-settings reset` goes back to the defaults after it asks.

## Where your data is stored

vaken has no server and no telemetry. It stores data only on your computer:

- Settings, counts, times and notes in the Claude Code plugin store.
- Copies of changed files for Undo, and hand-over notes, in `~/.claude/cockpit/`.
- Files in your project, only when you ask or use the feature. For example `.claude/cockpit-tasks.md`. See "Safety" above for the agent files.

Some of these names say "cockpit", the older name of vaken. [PRIVACY.md](../PRIVACY.md) says why. On Windows 11 (beta), "Delete everything" leaves the folder `%USERPROFILE%\.claude\cockpit`. Remove it by hand.

vaken does not store your prompts or transcripts as text. It keeps a few short words, such as session titles and decision notes. See [PRIVACY.md](../PRIVACY.md) for the full list and how to turn each one off.

## Remove your data

1. In the pane, press Settings, then Advanced, then "Delete everything vaken stored". It shows what would go. Press it again to delete. This removes the plugin store keys and everything in `~/.claude/cockpit`. It leaves files in your projects, agent files and the `CLAUDE.md` block.
2. Remove the plugin.

[UNINSTALL.md](UNINSTALL.md) has every step, including files inside your projects. [commands.md](commands.md) lists every command.
