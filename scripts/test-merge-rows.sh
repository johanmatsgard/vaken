#!/bin/sh
# Tests scripts/merge-rows.mjs in a scratch git repo: two branches add different rows near each other in one rows file and change different rows, the merge must be
# clean and sorted; then both branches change one row differently, which must be a conflict. Usage: scripts/test-merge-rows.sh
cd "$(dirname "$0")/.." || exit 1
ROOT=$(pwd)
S=$(mktemp -d "${TMPDIR:-/tmp}/merge-rows.XXXXXX") || exit 1
trap 'rm -rf "$S"' EXIT HUP INT TERM
fail() { echo "test-merge-rows: FAILED: $1"; exit 1; }
git init -q "$S/r" || exit 1
cd "$S/r" || exit 1
git config user.email scratch
git config user.name t
git config commit.gpgsign false
mkdir -p scripts mods/cockpit/hooks/i18n/rows
cp "$ROOT/scripts/merge-rows.mjs" scripts/
cp "$ROOT/.gitattributes" .
git config merge.rows.driver "node scripts/merge-rows.mjs %O %A %B"
git config merge.rows.name rows
R=mods/cockpit/hooks/i18n/rows/demo.ts
cat >"$R" <<'EOT'
// Area "demo": test rows
import type { Rows } from '../types'

export const ROWS: Rows = {
  "demo.b": {"en":"B","sv":"B"},
  "demo.d": {"en":"D","sv":"D"},
  "demo.f": {"en":"F","sv":"F"},
  "demo.h": {"en":"H","sv":"H"},
}
EOT
git add -A && git commit -qm base && git branch -M main
git checkout -qb one
sed -i.bak -e 's|^  "demo.d".*|  "demo.c": {"en":"C1","sv":"C1"},\n&|' -e 's|^  "demo.f".*|  "demo.f": {"en":"F1","sv":"F1"},|' "$R" && rm "$R.bak"
git commit -qam one
git checkout -q main && git checkout -qb two
sed -i.bak -e 's|^  "demo.d".*|&\n  "demo.e": {"en":"E2","sv":"E2"},\n  "demo.a": {"en":"A2","sv":"A2"},|' -e '/"demo.h"/d' "$R" && rm "$R.bak"
git commit -qam two
git checkout -q one
git merge -q --no-edit two >"$S/merge.txt" 2>&1 || { cat "$S/merge.txt"; fail "the merge was not clean"; }
cat >"$S/want.ts" <<'EOT'
// Area "demo": test rows
import type { Rows } from '../types'

export const ROWS: Rows = {
  "demo.a": {"en":"A2","sv":"A2"},
  "demo.b": {"en":"B","sv":"B"},
  "demo.c": {"en":"C1","sv":"C1"},
  "demo.d": {"en":"D","sv":"D"},
  "demo.e": {"en":"E2","sv":"E2"},
  "demo.f": {"en":"F1","sv":"F1"},
}
EOT
diff "$S/want.ts" "$R" || fail "the merged file is not what it should be"
# Both sides change one row differently: a conflict with markers.
git checkout -q main && git checkout -qb three && sed -i.bak 's|^  "demo.b".*|  "demo.b": {"en":"B3","sv":"B3"},|' "$R" && rm "$R.bak" && git commit -qam three
git checkout -q main && git checkout -qb four && sed -i.bak 's|^  "demo.b".*|  "demo.b": {"en":"B4","sv":"B4"},|' "$R" && rm "$R.bak" && git commit -qam four
git checkout -q three
if git merge -q --no-edit four >"$S/merge2.txt" 2>&1; then fail "a real clash merged without a conflict"; fi
grep -q '^<<<<<<<' "$R" || fail "the clash left no conflict markers"
echo "test-merge-rows: ok (clean sorted merge; a real clash conflicts)"
