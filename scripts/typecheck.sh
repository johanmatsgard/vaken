#!/bin/sh
# Type-checks the plugin against the engine's own type file. Needs a `tsc` (set TSC, or one on PATH or under ~/*/node_modules/.bin is used, or npx fetches one).
# The type file, in this order: CC_TYPES; the copy kept in the repo, scripts/types/claude-code.d.ts (a private checkout may hold one, the public repo does not);
# the file the engine writes beside the mod when a session loads it (mods/cockpit/.claude-plugin/types/claude-code/index.d.ts); the newest one the
# plugin-authoring skill wrote on this machine (/private/tmp/claude-*/bundled-skills; on Windows a bundled-skills folder under $TEMP, $TMP or
# $LOCALAPPDATA/Temp); else the one inside the installed `claude` program, read out by scripts/types-from-claude.mjs (needs Node 22.15 or newer).
# With none found it fails, except under CI=true, where it prints "typecheck: skipped: no host type file" and passes. Prints "typecheck: clean" or the errors.
cd "$(dirname "$0")/.." || exit 1
ROOT=$(pwd)
TSC=${TSC:-$(ls "$HOME"/*/node_modules/.bin/tsc "$HOME"/*/*/node_modules/.bin/tsc 2>/dev/null | head -1)}
[ -n "$TSC" ] || TSC=$(command -v tsc 2>/dev/null)
WIN=""
case "$(uname -s 2>/dev/null)" in MINGW*|MSYS*) WIN=1 ;; esac
[ "${OS:-}" = "Windows_NT" ] && WIN=1
DIR=$(mktemp -d)
TYPES=${CC_TYPES:-}
# CC_TYPES=repo forces the copy kept in the repo.
[ "$TYPES" = repo ] && TYPES="$ROOT/scripts/types/claude-code.d.ts"
if [ -z "$TYPES" ] && [ -f "$ROOT/scripts/types/claude-code.d.ts" ]; then TYPES="$ROOT/scripts/types/claude-code.d.ts"; fi
if [ -z "$TYPES" ] && [ -f "$ROOT/mods/cockpit/.claude-plugin/types/claude-code/index.d.ts" ]; then TYPES="$ROOT/mods/cockpit/.claude-plugin/types/claude-code/index.d.ts"; fi
[ -n "$TYPES" ] || TYPES=$(ls -t /private/tmp/claude-*/bundled-skills/*/*/plugin-authoring/types/claude-code.d.ts 2>/dev/null | head -1)
if [ -z "$TYPES" ] && [ -n "$WIN" ]; then
  # Windows: the skill writes the type file under the user's temp folder, in a bundled-skills/<x>/plugin-authoring/types/ folder (up to two levels down).
  for T in "${TEMP:-}" "${TMP:-}" "${LOCALAPPDATA:+$LOCALAPPDATA/Temp}"; do
    [ -n "$T" ] || continue
    if command -v cygpath >/dev/null 2>&1; then T=$(cygpath -u "$T"); fi
    [ -d "$T" ] || continue
    TYPES=$(ls -t "$T"/bundled-skills/*/plugin-authoring/types/claude-code.d.ts "$T"/*/bundled-skills/*/plugin-authoring/types/claude-code.d.ts "$T"/*/bundled-skills/*/*/plugin-authoring/types/claude-code.d.ts 2>/dev/null | head -1)
    [ -n "$TYPES" ] && break
  done
fi
if [ -z "$TYPES" ] && command -v node >/dev/null 2>&1; then
  # The installed `claude` program: the one on PATH (a link is followed), then the npm package's own copy.
  set --
  C=$(command -v claude 2>/dev/null) && set -- "$C"
  NPMROOT=$(npm root -g 2>/dev/null)
  [ -n "$NPMROOT" ] && set -- "$@" "$NPMROOT/@anthropic-ai/claude-code/bin/claude.exe" "$NPMROOT/@anthropic-ai/claude-code/bin/claude"
  OUTF="$DIR/claude-code.d.ts"; SCRIPT="$ROOT/scripts/types-from-claude.mjs"
  if [ -n "$WIN" ] && command -v cygpath >/dev/null 2>&1; then
    OUTF=$(cygpath -m "$OUTF"); SCRIPT=$(cygpath -m "$SCRIPT")
    for A do shift; set -- "$@" "$(cygpath -m "$A")"; done
  fi
  if [ $# -gt 0 ] && FROM=$(node "$SCRIPT" "$OUTF" "$@" 2>/dev/null); then
    TYPES="$DIR/claude-code.d.ts"
    echo "typecheck: type file read from the installed program $FROM"
  fi
fi
if [ -z "$TYPES" ] && [ "${CI:-}" = true ]; then rm -rf "$DIR"; echo "typecheck: skipped: no host type file"; exit 0; fi
[ -n "$TYPES" ] || { rm -rf "$DIR"; echo "typecheck: no type file claude-code.d.ts found (install Claude Code, or set CC_TYPES to a copy)"; exit 2; }
[ -f "$TYPES" ] || { rm -rf "$DIR"; echo "typecheck: no type file at $TYPES"; exit 2; }
echo "typecheck: types from $TYPES"
# No tsc found: let npx fetch a pinned one (needs the network; not used when a tsc exists).
if [ -z "$TSC" ] && command -v npx >/dev/null 2>&1; then
  npx --yes -p typescript@5.9.3 tsc --version >/dev/null 2>&1 && TSC="npx --yes -p typescript@5.9.3 tsc"
fi
[ -n "$TSC" ] || { rm -rf "$DIR"; echo "typecheck: no tsc found (set TSC)"; exit 2; }
# tsc on Windows is a Windows program: it needs C:/ style paths, not the /tmp style of Git Bash.
WDIR=$DIR
if [ -n "$WIN" ] && command -v cygpath >/dev/null 2>&1; then
  TYPES=$(cygpath -m "$TYPES"); ROOT=$(cygpath -m "$ROOT"); WDIR=$(cygpath -m "$DIR")
fi
cat > "$DIR/tsconfig.json" <<JSON
{ "compilerOptions": { "noEmit": true, "strict": true, "target": "ES2022", "lib": ["ES2022"], "module": "ESNext", "moduleResolution": "Bundler", "jsx": "react", "jsxFactory": "h", "jsxFragmentFactory": "Fragment", "skipLibCheck": true, "types": [], "allowImportingTsExtensions": true },
  "files": ["$TYPES", "$WDIR/globals.d.ts"], "include": ["$ROOT/mods/cockpit/hooks", "$ROOT/mods/cockpit/tests"] }
JSON
echo 'declare const h: any; declare namespace JSX { interface IntrinsicElements { [k: string]: any } interface ElementChildrenAttribute { children: {} } }' > "$DIR/globals.d.ts"
# tr strips the carriage returns a Windows tsc prints. The output goes to a file so tsc's own exit code is kept (a pipe would hide it).
case "$TSC" in
  "npx "*) $TSC -p "$WDIR/tsconfig.json" > "$DIR/out.txt" 2>&1; RC=$? ;;
  *) "$TSC" -p "$WDIR/tsconfig.json" > "$DIR/out.txt" 2>&1; RC=$? ;;
esac
OUT=$(tr -d '\r' < "$DIR/out.txt")
rm -rf "$DIR"
# Every file of the plugin is held to the types, the drawing files (.tsx, typed by ui/kit.tsx's El and Drawn) as the logic files (.ts): every error in
# hooks/**/*.ts and hooks/**/*.tsx. The test files give many errors about the test engine's fakes that are not bugs, so there only a "cannot find name" counts
# (a variable used and never declared).
BAD=$(echo "$OUT" | grep -E "^mods/cockpit/hooks/[^(]*\.tsx?\(|TS2304|TS2552")
# Any "error TS" line that is not in a test file also fails (for example a bad config or a file outside hooks and tests).
OTHER=$(echo "$OUT" | grep "error TS" | grep -vE "^mods/cockpit/tests/")
if [ -n "$TYPECHECK_SHOW" ]; then echo "$OUT" | head -${TYPECHECK_LINES:-40}; fi
if [ -n "$BAD" ] || [ -n "$OTHER" ]; then printf '%s\n%s\n' "$BAD" "$OTHER" | grep -v '^$' | sort -u | head -${TYPECHECK_LINES:-40}; echo "typecheck: FAILED"; exit 1; fi
# tsc failed (exit not 0) with no error line at all: it did not run or it crashed. With error lines only in test files, exit 1 is the tolerated noise.
if [ "$RC" -ne 0 ] && [ "$RC" -ne 1 ] && [ "$RC" -ne 2 ]; then echo "$OUT" | head -20; echo "typecheck: FAILED (tsc did not run, exit code $RC)"; exit 1; fi
if [ "$RC" -ne 0 ] && ! echo "$OUT" | grep -q "error TS"; then echo "$OUT" | head -20; echo "typecheck: FAILED (tsc exit code $RC and no recognisable error output)"; exit 1; fi
echo "typecheck: clean (hooks .ts and .tsx)"
