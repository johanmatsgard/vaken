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

Each kind starts on "warn". One thing stays on from the start: a destructive command or a secret stops the step when Claude Code itself would not ask you first. Picking a mode in Settings never turns this off. If the check cannot tell whether Claude Code would ask you first, it warns and does not stop the step. If the check itself breaks, it refuses steps that change things, so that a broken check never says "safe". Steps that only read still run.

You can allow one stopped step with `/vaken-guard allow once`, or press "Allow once" in Needs you. The yes ends after 30 minutes.

`/vaken-pause` pauses every change step in the session: file edits, shell steps, agents, web and skill tools, and the task runner. A pause that is on stays on until you turn it off with `/vaken-pause off`. "Delete everything vaken stored" does not turn it off.

## What the safety check does not promise

- It is not a sandbox. It cannot stop a program once the program runs.
- It matches patterns. A new or hidden way to do a bad thing can pass.
- It does not read what a script does inside a file you ask Claude to run.
- It does not replace your own review, your backups and your permission settings.
- Undo restores only the files it copied. It cannot restore a file it skipped (for example a secret file), or changes made outside your project.
- It is tested most on macOS. Windows 11 is beta: the check also reads PowerShell steps, but it has had less testing there. Report what it misses.

Treat it as a seat belt, not as a wall.
