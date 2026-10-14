#!/bin/sh
# The product is called vaken. Fails when the plugin name or the marketplace entry is not vaken, or when a line of code outside a comment (hooks and tests) still
# names the old product, except what keeps it on purpose: store keys ("cockpit:..."), the data folder and generated files under .claude, paths, environment names,
# identifiers that contain the name, the pane id and the named regex group. The rows and the commands are checked by tests/rename.test.ts.
cd "$(dirname "$0")/.." || exit 2
command -v node >/dev/null 2>&1 || { echo "check-names: needs node" >&2; exit 2; }
exec node scripts/check-names.mjs
