#!/bin/sh
# Reads a filled sheet (from strings-export.sh) back into the one text table, hooks/i18n/rows/*.ts. An empty cell leaves the table as it is; a new language
# column adds that language to hooks/i18n/langs.ts as "partial" (with the @name, @decimal and @plural lines of a translator's sheet); a new name in an existing
# area adds a row only with --allow-english. A translator's sheet (export --lang) never changes the English and holds one language column after "en". The English
# of any row changes only with --allow-english; the English and note of a row tagged [to-claude] (sent to Claude) also need --allow-to-claude. Run
# scripts/check-strings.sh after it.
# The separator (comma or semicolon) is read from the header line; a BOM, CRLF line ends and Excel's ";;;;" padding are accepted.
# Usage: scripts/strings-import.sh SHEET.csv [--dry-run] [--allow-english] [--allow-to-claude]. A relative SHEET is relative to where you stand. Needs Node 18 or newer.
STRINGS_CALLER_DIR="$(pwd)"
export STRINGS_CALLER_DIR
cd "$(dirname "$0")/.." || exit 2
command -v node >/dev/null 2>&1 || { echo "strings-import: needs node (Node 18 or newer)" >&2; exit 2; }
exec node scripts/strings.mjs import "$@"
