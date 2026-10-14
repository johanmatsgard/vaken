# Uninstall

Do the steps in this order.

1. **Delete what vaken stored.** In Claude Code Desktop, open the pane, then Settings, then Advanced. At the bottom, press "Delete everything vaken stored". The first press shows what would go. Press again to delete. Do this first: after you remove the plugin, the button is gone.

   A pause you turned on with `/vaken-pause` stays on after this step. It is a safety stop. Type `/vaken-pause off` before step 2 if you want it off. After step 2 the command is gone.

2. **Remove the plugin.**

   ```
   claude plugin uninstall vaken@vaken
   claude plugin marketplace remove vaken
   ```

3. **Check what is left.** Some names still say "cockpit": the plugin store keys start with `cockpit:` and the data folder is `~/.claude/cockpit`. [PRIVACY.md](../PRIVACY.md) says why.

   "Delete everything" removes the keys and the contents of the folder. It keeps a pause that is on. It leaves the empty folder and the files in steps 4 and 5. Check the folder, then remove it:

   ```
   ls -la ~/.claude/cockpit
   rm -r ~/.claude/cockpit
   ```

   On Windows 11 (beta), "Delete everything" does not remove the folder. Look at it in PowerShell, then remove it in File Explorer:

   ```
   Get-ChildItem $env:USERPROFILE\.claude\cockpit
   ```

4. **Remove files inside your projects, if you want.** vaken may have written these in a project. "Delete everything" does not touch them.

   - `.claude/cockpit-packet.md`
   - `.claude/cockpit-tasks.md`
   - `.claude/cockpit-eyes/`
   - `.claude/cockpit-decisions*.md` and `.claude/cockpit-audit*.md`, with their numbered copies such as `cockpit-audit-2.md`
   - `.claude/worktrees/`, if you ran a task list. Each folder there is a copy of the project made for a task. Look inside before you remove one: a copy can hold work you did not keep.
   - `.claude/agents/vaken-*.md`, if you turned on "Set up agents for me" or ran `/vaken-tasks agents make yes`.
   - The block in the project `CLAUDE.md` that starts with `<!-- cockpit:begin -->` and ends with `<!-- cockpit:end -->`, if you turned on "Set up agents for me". Delete those lines and what is between them.

5. **Remove files in your home folder, if you want.** `~/.claude/agents/vaken-*.md` holds the starter agents, or the agent files of "Set up agents for me" with the place "All projects". "Delete everything" does not touch them.

vaken never changes your `settings.json`. It never writes the `CLAUDE.md` in your home folder.
