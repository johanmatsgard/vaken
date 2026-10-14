#!/bin/sh
# Two blocks must not register the same slash command name: the second handler would never run. Lists any name used in more than one file.
cd "$(dirname "$0")/.." || exit 1
dups=$(grep -rHoE "command\.register\(\{ name: '[a-z0-9-]+'" mods/cockpit/hooks | sed -E "s/^([^:]+):.*name: '([^']+)'/\2 \1/" | tr -d '\r' | sort -u | awk '{n[$1]++; f[$1]=f[$1]" "$2} END {for (k in n) if (n[k] > 1) print k ":" f[k]}')
if [ -n "$dups" ]; then echo "Command names registered in more than one file:"; echo "$dups"; exit 1; fi
# Vaken registers exactly the commands in FRONT_DOOR (core/menu.ts), so /vaken-help lists every one. Any other function is a word after one of them
# (FOLDED) or a name after /vaken-help run (HIDDEN), filed with sub() in features/subcmds.ts.
registered=$(grep -rhoE "command\.register\(\{ name: '[a-z0-9-]+'" mods/cockpit/hooks | sed -E "s/.*name: '([^']+)'/\1/" | tr -d '\r' | sort -u)
door=$(sed -n "/^export const FRONT_DOOR/,/^\]/p" mods/cockpit/hooks/core/menu.ts | grep -oE "'[a-z0-9-]+'" | tr -d "'" | sort -u)
extra=$(printf '%s\n' "$registered" | grep -vxF "$door")
absent=$(printf '%s\n' "$door" | grep -vxF "$registered")
if [ -n "$extra" ]; then echo "Registered but not in FRONT_DOOR (core/menu.ts): $extra"; exit 1; fi
if [ -n "$absent" ]; then echo "In FRONT_DOOR but never registered: $absent"; exit 1; fi
echo "check-commands: clean ($(printf '%s\n' "$registered" | wc -l | tr -d ' ') commands)"
