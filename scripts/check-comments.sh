#!/bin/sh
# Finds comment text that a stranger does not need: task codes, batch/wave/phase words,
# dates, the word for who owns the project, live-round words, and links to docs that do not ship.
# Looks at comments (// and /* */ in .ts .tsx .mjs .js, # in .sh .py) and at test titles (the first string of each test( call
# under tests/, which also must not hold a short task code or review words), never at other code or strings.
# Scans mods/cockpit/hooks, tests/cockpit and scripts. Skips the test-driver scripts, scripts/types/*.d.ts
# and every path in scripts/release/cut.txt or ask.txt (they do not ship).
# A docs/ link is fine when the doc matches scripts/release/keep.txt. When those lists are missing
# (the public copy), a docs/ link is fine when the linked file exists, and no path is skipped for the lists.
# Usage: scripts/check-comments.sh [--report] [--selftest] [--root DIR]
#   default    print file:line:rule: text for every hit; exit 1 if any
#   --report   print counts per folder and kind; exit 0
#   --selftest run inline good and bad samples; exit 1 on a wrong verdict
set -u
ROOT=""
MODE=check
while [ $# -gt 0 ]; do
  case "$1" in
    --report) MODE=report; shift ;;
    --selftest) MODE=selftest; shift ;;
    --root) ROOT="${2:-}"; shift 2 ;;
    -h|--help) sed -n '2,15p' "$0"; exit 0 ;;
    *) echo "check-comments: unknown argument $1" >&2; exit 2 ;;
  esac
done
[ -n "$ROOT" ] || ROOT="$(cd "$(dirname "$0")/.." && pwd)"
command -v node >/dev/null 2>&1 || { echo "check-comments: node is needed" >&2; exit 2; }
exec node "$(dirname "$0")/check-comments.mjs" "$MODE" "$ROOT"
