#!/bin/sh
# Runs the plugin's tests. The tests live in tests/cockpit (outside the plugin folder, so the plugin directory does not scan them); the plugin test kit
# wants them inside the plugin, so this copies the plugin files and the tests into a throwaway folder (tests go to its tests/) and runs `claude plugin test` there.
# Usage: scripts/test-cockpit.sh [test-file-name...]   (for example: guardback.test.ts; no names runs every test). Prints the test kit's output; exit code is the kit's.
# Set TEST_COCKPIT_OUT to a file to also keep the output there. It works in sh/bash on macOS, Linux and Windows Git Bash (cp -R only).
cd "$(dirname "$0")/.." || exit 1
WORK=$(mktemp -d "${TMPDIR:-/tmp}/test-cockpit.XXXXXX") || exit 1
trap 'rm -rf "$WORK"' EXIT HUP INT TERM
mkdir -p "$WORK/tests" || exit 1
for d in mods/cockpit/* mods/cockpit/.claude-plugin; do
  [ -e "$d" ] || continue
  cp -R "$d" "$WORK/" || exit 1
done
if [ $# -eq 0 ]; then
  cp -R tests/cockpit/. "$WORK/tests/" || exit 1
else
  # The named tests, and every file that is not a test itself (helpers the tests import).
  for f in tests/cockpit/*; do
    case "$f" in *.test.ts|*.test.tsx) ;; *) cp "$f" "$WORK/tests/" ;; esac
  done
  for n in "$@"; do
    n=$(basename "$n")
    [ -f "tests/cockpit/$n" ] || n="$n.ts"
    [ -f "tests/cockpit/$n" ] || { echo "test-cockpit: no test file $n in tests/cockpit"; exit 2; }
    cp "tests/cockpit/$n" "$WORK/tests/"
  done
fi
claude plugin test "$WORK" >"$WORK/log.txt" 2>&1
RC=$?
[ -n "$TEST_COCKPIT_OUT" ] && cp "$WORK/log.txt" "$TEST_COCKPIT_OUT"
cat "$WORK/log.txt"
exit $RC
