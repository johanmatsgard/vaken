#!/bin/sh
# The one text table's check. Fails when a row misses a full language (hooks/i18n/langs.ts), has other fill-ins or plural forms than its English needs, is not
# one row on one line, or is out of order, and when code uses a name the table does not have. A partial language passes; its coverage and first missing rows per
# area are printed. "=" in a cell means the same as English, on purpose. Warns (for now) about rows nothing uses, and lists the text literals that look visible but do not
# go through the table, counted per step 2a-2c. scripts/check-strings.allow lists what is never translated (model names, glyphs, the English-only text twin).
# Usage: scripts/check-strings.sh [--verbose] [--strict] | --selftest. Needs Node 18 or newer. Exit: 0 clean, 1 findings, 2 could not run.
cd "$(dirname "$0")/.." || exit 2
command -v node >/dev/null 2>&1 || { echo "check-strings: needs node (Node 18 or newer)" >&2; exit 2; }
exec node scripts/strings.mjs check "$@"
