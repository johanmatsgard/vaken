#!/bin/sh
# The local gate for vaken plugin: validator, tests of the plugin, and the uniformity guard. Stops on the first failure.
cd "$(dirname "$0")/.." || exit 1
T=${TMPDIR:-/tmp}; T=${T%/}
claude plugin validate mods/cockpit >"$T/cockpit-validate.txt" 2>&1 || { cat "$T/cockpit-validate.txt"; echo "check-cockpit: validate FAILED"; exit 1; }
sh scripts/test-cockpit.sh >"$T/cockpit-test.txt" 2>&1 || { grep -A8 "(fail)" "$T/cockpit-test.txt" | head -40; echo "check-cockpit: tests FAILED"; exit 1; }
sh scripts/typecheck.sh >"$T/cockpit-types.txt" 2>&1 || { cat "$T/cockpit-types.txt"; echo "check-cockpit: types FAILED"; exit 1; }
sh scripts/check-names.sh || { echo "check-cockpit: names FAILED"; exit 1; }
sh scripts/check-commands.sh || { echo "check-cockpit: duplicate commands FAILED"; exit 1; }
sh scripts/check-tokens.sh || { echo "check-cockpit: guard FAILED"; exit 1; }
bash scripts/check-public.sh || { echo "check-cockpit: public scan FAILED"; exit 1; }
node scripts/check-plain-capability.mjs || { echo "check-cockpit: plain capability use FAILED"; exit 1; }
sh scripts/check-comments.sh >"$T/cockpit-comments.txt" 2>&1 || { cat "$T/cockpit-comments.txt"; echo "check-cockpit: comments FAILED"; exit 1; }
sh scripts/check-strings.sh --strict >"$T/cockpit-strings.txt" 2>&1 || { cat "$T/cockpit-strings.txt"; echo "check-cockpit: strings FAILED"; exit 1; }
echo "check-cockpit: all clean ($(grep -c '^(pass)' "$T/cockpit-test.txt") tests)"
