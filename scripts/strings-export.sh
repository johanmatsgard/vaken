#!/bin/sh
# Writes the one text table as a sheet (CSV, UTF-8; columns name, area, where, en, sv, ..., notes), to FILE or to stdout.
# --lang CODE writes a translator's sheet instead: name, where, note, en and one column for that language.
# --bom adds the mark Excel needs; --sep ";" (or --sep semicolon) writes semicolons, for Excel with a list separator of ";" (Swedish); --excel-sv is --bom --sep ";".
# Usage: scripts/strings-export.sh [FILE] [--lang CODE] [--bom] [--sep ";"] [--excel-sv]. A relative FILE is relative to where you stand. Needs Node 18 or newer.
STRINGS_CALLER_DIR="$(pwd)"
export STRINGS_CALLER_DIR
cd "$(dirname "$0")/.." || exit 2
command -v node >/dev/null 2>&1 || { echo "strings-export: needs node (Node 18 or newer)" >&2; exit 2; }
exec node scripts/strings.mjs export "$@"
