# Contributing to vaken

Thank you for helping. Keep each pull request small and about one change.

## Where the code is

The plugin is in `mods/cockpit`. The plugin itself is called `vaken`. [PRIVACY.md](PRIVACY.md) says why some names say "cockpit".

- `hooks/core/`: the logic, with no drawing code.
- `hooks/features/`: the engine hooks and the pane.
- `hooks/ui/`: the kit (`kit.tsx`) and the design tokens (`tokens.ts`).
- `hooks/i18n/`: the text table, one file per area in `rows/`.
- `tests/`: the tests, one file per part.

## Load a local build

You need Claude Code with the `claude` command, and Node 18 or newer.

1. `claude plugin marketplace add /path/to/your/clone`
2. `claude plugin install vaken@vaken`
3. Open a new session. A running session never loads a new version.

After a change: raise `version` in `mods/cockpit/.claude-plugin/plugin.json`, commit, run `claude plugin marketplace update` and `claude plugin update`, then open a new session. `/reload-plugins` is not enough.

## Run the checks

Run this before every commit:

```
sh scripts/check-cockpit.sh
```

It stops at the first failure. It runs, in this order: the plugin validator (`claude plugin validate`), the tests touched since `origin/main` (changed test files, and the test named after each changed plugin file; `--full` runs every test, as CI does) through `scripts/test-cockpit.sh`, which runs `claude plugin test` on a temporary copy of the plugin with the tests from `tests/cockpit`, the type check (`scripts/typecheck.sh`), the name check, the command check, the token check, the public scan (no secrets or personal data), the comment check and the text check (`scripts/check-strings.sh --strict`).

The type check needs the engine's type file, `claude-code.d.ts`. It belongs to Claude Code, so it is not in this repo. `scripts/typecheck.sh` looks for it in this order:

1. The copy that `CC_TYPES` points to.
2. The file Claude Code writes beside the mod when a session loads it.
3. The file the plugin-authoring skill writes.
4. The file inside your installed `claude` program (needs Node 22.15 or newer).

CI reads it from the CLI it installs. If CI finds no file, it skips the type check, so run the gate before a pull request.

While you work, run only the tests of the files you changed. CI runs the full set on macOS and Windows.

## Rules a change must keep

- **Tokens.** Every size and every colour is a token in `mods/cockpit/hooks/ui/tokens.ts`, with a comment that says what it is for. Never write a raw number or a hex colour in a card. `scripts/check-tokens.sh` fails on one. Use the parts in `ui/kit.tsx`. A card never holds another card.
- **Texts.** Every text a person can see is a row in `hooks/i18n/rows/`, with English and Swedish. In code, use `t('area.name', { n })`. After you change a row, run `sh scripts/strings-md.sh` to rebuild `docs/TEXTS.md`. The text check fails when that page is out of date.
- **Tests.** Put a test next to each change, in `tests/cockpit/`. Tests never touch the real `~/.claude` folder. Use the fake engine and invented data.
- **Speed.** `tests/perf-budget.test.ts` sets budgets for each surface. Never raise one to make a test pass. Make the change cheaper.
- **Privacy.** Never store prompt text, transcript text or tool output.
- **Comments.** A comment says why the code is the way it is. No dates or task codes.

## Open a pull request

1. Fork the repo and make a branch.
2. Run `sh scripts/check-cockpit.sh` and fix what it reports.
3. Say what changed and why. Add a picture if the change is visual.
4. Wait for CI to pass on macOS and Windows.

By sending a pull request, you agree that your work is released under the MIT license (see `LICENSE`).
