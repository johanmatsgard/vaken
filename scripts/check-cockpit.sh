#!/bin/sh
# The local gate for vaken plugin: validator, type check, the tests, and the uniformity guard. Stops on the first failure.
# Usage: scripts/check-cockpit.sh [--full]
#   default  the tests touched since the base (origin/main, else main): test files changed in commits or in the working tree, and the test named
#            after each changed plugin file (hooks/core/guard.ts -> tests/cockpit/guard.test.ts), plus always the side-effect guards (the language, registry,
#            settings view, perf budget, hot path, help and text table tests, every sv-*.test.ts and statesweep*.test.ts): a change in one place breaks them
#            elsewhere. A changed plugin file with no test of its own prints a warning. The Mac rule: only touched tests locally.
#   --full   every test (CI runs this; CI calls scripts/test-cockpit.sh itself).
cd "$(dirname "$0")/.." || exit 1
T=${TMPDIR:-/tmp}; T=${T%/}
FULL=0
for a in "$@"; do
  case "$a" in
    --full) FULL=1 ;;
    *) echo "check-cockpit: unknown option $a (use --full)"; exit 2 ;;
  esac
done
claude plugin validate mods/cockpit >"$T/cockpit-validate.txt" 2>&1 || { cat "$T/cockpit-validate.txt"; echo "check-cockpit: validate FAILED"; exit 1; }
# Line ends: every file is stored with LF (.gitattributes keeps them as stored). The same check as CI, so a Windows editor that saves CRLF fails here first.
BADEOL=$(git ls-files --eol | awk '$1 == "i/crlf" || $1 == "i/mixed" {print $NF}')
[ -z "$BADEOL" ] || { echo "$BADEOL"; echo "check-cockpit: CRLF line ends in the index FAILED (save each file with LF line ends, then git add)"; exit 1; }
if [ "$FULL" = 1 ]; then
  sh scripts/test-cockpit.sh >"$T/cockpit-test.txt" 2>&1 || { grep -A8 "(fail)" "$T/cockpit-test.txt" | head -40; echo "check-cockpit: tests FAILED"; exit 1; }
  RAN="every test"
else
  BASE=origin/main
  git rev-parse --verify -q "$BASE" >/dev/null || BASE=main
  CHANGED=$( { git diff --name-only "$BASE"...HEAD; git diff --name-only HEAD; git ls-files --others --exclude-standard; } 2>/dev/null | sort -u)
  TESTS=""
  UNTESTED=""
  for f in $CHANGED; do
    case "$f" in
      tests/cockpit/*.test.ts|tests/cockpit/*.test.tsx) n=$(basename "$f") ;;
      mods/cockpit/hooks/i18n/rows/*) continue ;; # the text rows are guarded by i18n-table, lang and the strings check
      mods/cockpit/hooks/*.ts|mods/cockpit/hooks/*.tsx)
        n=$(basename "$f"); n="${n%.*}.test.ts"
        [ -f "tests/cockpit/$n" ] || UNTESTED="$UNTESTED $f" ;;
      *) continue ;;
    esac
    [ -f "tests/cockpit/$n" ] || continue
    case " $TESTS " in *" $n "*) ;; *) TESTS="$TESTS $n" ;; esac
  done
  # Always run the tests that catch side effects of a change somewhere else.
  for n in lang.test.ts registry.test.ts settingsview.test.ts perf-budget.test.ts hotpath.test.ts help.test.ts i18n-table.test.ts \
    $(cd tests/cockpit && ls sv-*.test.ts statesweep*.test.ts 2>/dev/null); do
    [ -f "tests/cockpit/$n" ] || continue
    case " $TESTS " in *" $n "*) ;; *) TESTS="$TESTS $n" ;; esac
  done
  [ -n "$UNTESTED" ] && echo "check-cockpit: warning: changed plugin file(s) with no test of their own (tests/cockpit/<name>.test.ts):$UNTESTED"
  if [ -n "$TESTS" ]; then
    # shellcheck disable=SC2086 # one word per test file name
    sh scripts/test-cockpit.sh $TESTS >"$T/cockpit-test.txt" 2>&1 || { grep -A8 "(fail)" "$T/cockpit-test.txt" | head -40; echo "check-cockpit: tests FAILED"; exit 1; }
  else
    : >"$T/cockpit-test.txt"
  fi
  RAN="the touched tests since $BASE:${TESTS:- none}; --full runs every test"
fi
sh scripts/typecheck.sh >"$T/cockpit-types.txt" 2>&1 || { cat "$T/cockpit-types.txt"; echo "check-cockpit: types FAILED"; exit 1; }
sh scripts/check-names.sh || { echo "check-cockpit: names FAILED"; exit 1; }
sh scripts/check-commands.sh || { echo "check-cockpit: duplicate commands FAILED"; exit 1; }
sh scripts/check-model-gate.sh || { echo "check-cockpit: model gate FAILED"; exit 1; }
sh scripts/check-tokens.sh || { echo "check-cockpit: guard FAILED"; exit 1; }
bash scripts/check-public.sh || { echo "check-cockpit: public scan FAILED"; exit 1; }
node scripts/check-plain-capability.mjs || { echo "check-cockpit: plain capability use FAILED"; exit 1; }
# The directory's pre-submission rules: a blocking finding fails; policy holds are printed and allowed (the README explains them).
bash scripts/check-directory.sh || { echo "check-cockpit: directory rules FAILED"; exit 1; }
sh scripts/check-comments.sh >"$T/cockpit-comments.txt" 2>&1 || { cat "$T/cockpit-comments.txt"; echo "check-cockpit: comments FAILED"; exit 1; }
sh scripts/check-strings.sh --strict >"$T/cockpit-strings.txt" 2>&1 || { cat "$T/cockpit-strings.txt"; echo "check-cockpit: strings FAILED"; exit 1; }
sh scripts/test-merge-rows.sh || { echo "check-cockpit: merge driver test FAILED"; exit 1; }
echo "check-cockpit: all clean ($(grep -c '^(pass)' "$T/cockpit-test.txt") tests; $RAN)"
