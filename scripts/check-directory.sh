#!/bin/bash
# Local mirror of the plugin directory's pre-submission rules, so a finding shows up here before the portal says it.
# Blocking rules (exit 1): `$` used other than as a plain call (scripts/check-plain-capability.mjs), agent.register not written as an object in the call,
#   a hook event not in the directory's event list (scripts/directory-events.txt), an invisible character, a Client with a computed module path, system files, a README under 40 words, no licence, a bad plugin.json,
#   file names that fail on Windows or macOS or differ only by case, .gitattributes that rewrite or leave out files.
# Policy holds (listed and counted; exit 0 unless --strict): hooks that may change their event before next, a credential read from the environment,
#   files over 256 KiB, over 512 files, binary files, accessors, Proxy and then.
# Output is one line per finding, "RULE file:line why", then a count per rule.
# Usage: scripts/check-directory.sh [--report] [--strict] [--selftest] [--out FILE] [--root DIR]
#   default    print the findings; exit 1 on any blocking finding
#   --report   print the findings; always exit 0
#   --strict   a policy hold also fails
#   --selftest run small fixtures through every rule; exit 1 on a wrong verdict
#   --out FILE also write the output to FILE
# Finds the TypeScript JS API the way check-plain-capability.mjs does (TYPESCRIPT_JS, TSC, tsc on PATH).
cd "$(dirname "$0")/.." || exit 2
command -v node >/dev/null 2>&1 || { echo "check-directory: needs node" >&2; exit 2; }
case "${1:-}" in -h|--help) sed -n '2,15p' "$0"; exit 0 ;; esac
exec node scripts/check-directory.mjs "$@"
