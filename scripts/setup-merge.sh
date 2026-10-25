#!/bin/sh
# Sets the local git merge drivers that .gitattributes names: `rows` (scripts/merge-rows.mjs, the i18n rows files) and `ours` (keep our side).
# Run it once per clone; the config is shared by all worktrees of the repo. Safe to run again.
cd "$(dirname "$0")/.." || exit 1
git config merge.rows.name "i18n rows: merge row by row, keep sorted"
git config merge.rows.driver "node scripts/merge-rows.mjs %O %A %B"
git config merge.ours.name "keep our side"
git config merge.ours.driver true
echo "setup-merge: merge drivers rows and ours set"
