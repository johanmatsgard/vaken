#!/bin/sh
# Decides whether a change touches only documents. Reads changed paths on stdin, one per line.
# Exit 0: every path is a document (a file in the docs folder except program files, or a .md or .txt file outside mods/, scripts/, tests/ and .github/).
# Exit 1: some path is code, or the list is empty (an unknown change counts as code, so the full checks run).
# Usage: git diff --name-only BASE HEAD | scripts/ci-docs-only.sh      or      scripts/ci-docs-only.sh --selftest
is_doc() {
  case "$1" in
    mods/* | scripts/* | tests/* | .github/*) return 1 ;;
    docs/*.js | docs/*.mjs | docs/*.ts | docs/*.tsx | docs/*.sh | docs/*.py | docs/*.yml | docs/*.yaml | docs/*/*.js | docs/*/*.mjs | docs/*/*.ts | docs/*/*.tsx | docs/*/*.sh | docs/*/*.py | docs/*/*.yml | docs/*/*.yaml) return 1 ;;
    docs/*) return 0 ;;
    */*.md | */*.txt) return 0 ;;
    *.md | *.txt) return 0 ;;
    *) return 1 ;;
  esac
}
decide() {
  seen=0
  while IFS= read -r p; do
    p=$(printf '%s' "$p" | tr -d '\r')
    [ -n "$p" ] || continue
    seen=1
    is_doc "$p" || return 1
  done
  [ "$seen" -eq 1 ]
}
if [ "$1" = "--selftest" ]; then
  bad=0
  check() { # expected exit, label, paths (newline separated)
    printf '%s\n' "$3" | decide
    got=$?
    if [ "$got" -ne "$1" ]; then echo "selftest FAILED: $2 (wanted $1, got $got)"; bad=1; fi
  }
  check 0 "docs only" "docs/notes.md
docs/design/page.md
README.md
SECURITY.md"
  check 1 "mixed" "docs/notes.md
mods/cockpit/hooks/core/settings.ts"
  check 1 "plugin readme counts as code" "mods/cockpit/README.md"
  check 1 "workflow" ".github/workflows/ci.yml"
  check 1 "script note" "scripts/notes.md"
  check 1 "package file" "package.json"
  check 1 "test file" "tests/cockpit/a.test.ts"
  check 1 "empty list" ""
  check 1 "docs code file" "docs/site/app.js"
  [ "$bad" -eq 0 ] && echo "ci-docs-only: selftest ok"
  exit "$bad"
fi
decide
