# Security

## Report a problem

Open the Security tab of the repository (https://github.com/johanmatsgard/vaken/security) and choose "Report a vulnerability". This is GitHub private vulnerability reporting. Say what you did, what you expected and what happened. Do not put secrets in the message. We will answer you.

## What the safety check does

The safety check looks at steps Claude is about to take, before they run. It can warn, ask, or stop a step. It checks for:

- Risky commands (for example, deleting many files or forcing a push).
- Secrets: secret files read, or keys printed or sent.
- Outside actions: messages, posts, payments and cloud changes.
- Edits outside your folders, and edits to protected files (the fence you set).
- New packages that are very young, have look-alike names or are deprecated.
- Test changes: edits that skip tests or remove checks from them.
- Held messages: a list of what leaves this computer in each answer. This check only lists. It never stops a step.

Claude Code has modes in which it does not ask you first: bypass permissions, auto mode and accept edits. An allow rule does the same for one kind of step.

Each kind starts on "warn". One thing stays on from the start: a destructive command or a secret stops the step when Claude Code itself would not ask you first. Picking a mode in Settings never turns this off. If the check cannot tell whether Claude Code would ask you first, it warns and does not stop the step. If the check of a step breaks, it refuses that step only when the step can change things and a row of that check is on "stop" (or you are away with While away set to Careful). With every row on "warn" the step runs, so a broken check never stops your work. If the vaken hook itself fails before the step runs, it refuses steps that change things. Steps that only read still run.

You can allow one stopped step with `/vaken-guard allow once`, or press "Allow once" in Needs you. The yes ends after 30 minutes. "Keep stopped" beside it dismisses the row, and that exact step stays stopped for the rest of the session.

When you allow the same kind of step 3 times in a week where Claude Code asks first, vaken shows the allow rule that stops the question, once. You add it yourself; vaken never changes `settings.json`. It never offers a rule for a step its safety check rates risky (destructive, outside actions, secrets, protected files) or for a step with more than one command in it.

A night run (`/vaken-tasks night`, setting `night.mode`, Off by default) turns on away mode with While away set to Careful for the whole run, so a risky step of any session is stopped by itself, and Allow once does not work. It turns on only what was off, and at the end (the run is done, you stop or pause it, or it reaches its night cost limit) it puts back only what is still as it set it: a choice you changed during the night stays. Ending away mode this way also puts back the cost budget away mode set. If the session ends during a night run, away mode stays on until you type `/vaken-away off`. Only you can start a night run: Claude cannot, and the runner's other limits (your agent limit, the computer's room, the cost per agent) still hold.

`/vaken-pause` pauses every change step in the session: file edits, shell steps, agents, workflows, web and skill tools, tools from other apps, publishing and sending files, remote triggers, worktree changes, and the task runner. A pause that is on stays on until you turn it off with `/vaken-pause off`. "Delete everything vaken stored" does not turn it off.

## What the safety check does not promise

- It is not a sandbox. It cannot stop a program once the program runs.
- It matches patterns. A new or hidden way to do a bad thing can pass.
- It does not read what a script does inside a file you ask Claude to run.
- It does not replace your own review, your backups and your permission settings.
- Undo restores only the files it copied. It cannot restore a file it skipped (for example a secret file), or changes made outside your project.
- It is tested most on macOS. On Windows 11 the check also reads PowerShell steps. Report what it misses.

Treat it as a seat belt, not as a wall.
