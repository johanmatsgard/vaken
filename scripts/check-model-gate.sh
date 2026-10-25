#!/bin/sh
# Every model call goes through the one gate (hooks/core/modelGate.ts), which writes the Autopilot line. Fails on any `$.model.` use, or a `.complete(`, `.classify(`
# or `.fork(` call, under mods/cockpit/hooks outside the gate. The one line of each copied IO-BLOCK that hands the engine's call to the Io is allowed.
# Usage: scripts/check-model-gate.sh [--root DIR] | --selftest. Exit: 0 clean, 1 findings, 2 could not run.
set -u
ROOT=""
SELFTEST=0
while [ $# -gt 0 ]; do
  case "$1" in
    --selftest) SELFTEST=1; shift ;;
    --root) ROOT="${2:-}"; shift 2 ;;
    -h|--help) sed -n '2,5p' "$0"; exit 0 ;;
    *) echo "check-model-gate: unknown argument $1" >&2; exit 2 ;;
  esac
done

# Prints file:line:text for each use outside the gate and the IO-BLOCK hand-over lines.
scan() {
  grep -rnE '\$\.model\.|\.(complete|classify|fork)\(' "$1/mods/cockpit/hooks" --include='*.ts' --include='*.tsx' 2>/dev/null \
    | grep -v '/core/modelGate\.ts:' \
    | grep -vE '^[^:]+:[0-9]+:[[:space:]]*//' \
    | grep -vE '^[^:]+:[0-9]+:[[:space:]]*(complete|fork): req => \$\.model\.(complete|fork)\(req\),?[[:space:]]*$'
}

if [ "$SELFTEST" = 1 ]; then
  T="$(mktemp -d)" || exit 2
  trap 'rm -rf "$T"' EXIT
  H="$T/mods/cockpit/hooks"
  mkdir -p "$H/core" "$H/features"
  printf '%s\n' "export const x = i.complete(req)" >"$H/core/modelGate.ts"
  printf '%s\n' "    complete: req => \$.model.complete(req)," "    fork: req => \$.model.fork(req)," "// \$.model.classify is only a comment" >"$H/features/good.ts"
  [ -z "$(scan "$T")" ] || { echo "check-model-gate: selftest FAILED (a clean tree was flagged)"; exit 1; }
  for bad in 'await $.model.complete(r)' 'const k = await $.model.classify(t, l)' 'await i.complete({ prompt: p })' 'x = await io.fork({ prompt })'; do
    printf '%s\n' "$bad" >"$H/features/bad.ts"
    [ -n "$(scan "$T")" ] || { echo "check-model-gate: selftest FAILED (missed: $bad)"; exit 1; }
  done
  echo "check-model-gate: selftest ok"
  exit 0
fi

[ -n "$ROOT" ] || ROOT="$(cd "$(dirname "$0")/.." && pwd)"
[ -d "$ROOT/mods/cockpit/hooks" ] || { echo "check-model-gate: no mods/cockpit/hooks under $ROOT" >&2; exit 2; }
found="$(scan "$ROOT")"
if [ -n "$found" ]; then
  echo "A model call outside the gate (use askModel or askFork from hooks/core/modelGate.ts):"
  echo "$found"
  exit 1
fi
echo "check-model-gate: clean"
