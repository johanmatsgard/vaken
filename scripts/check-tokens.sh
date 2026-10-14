#!/bin/sh
# The uniformity guard of the pixel pass: no raw hex colour and no raw layout number outside mods/cockpit/hooks/ui/tokens.ts, and every token there has a comment.
# A line may carry the marker "token-ok" with a reason when a number is not a design measure.
cd "$(dirname "$0")/.." || exit 1
FILES=$(find mods/cockpit/hooks -name '*.ts' -o -name '*.tsx' | grep -v 'ui/tokens.ts')
bad=0
# 1. hex colours and rgba() outside tokens.ts
hits=$(grep -nE "#[0-9a-fA-F]{8}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b|rgba?\(" $FILES | grep -v 'token-ok' | tr -d '\r')
if [ -n "$hits" ]; then echo "Raw colours outside tokens.ts:"; echo "$hits"; bad=1; fi
# 2. numeric layout props on elements: margin, padding, gap, width, height, min sizes
hits=$(grep -nE "\b(margin[A-Za-z]*|padding[A-Za-z]*|rowGap|columnGap|gap|width|height|minHeight|minWidth)=\{[0-9.]+\}" $FILES | grep -v 'token-ok' | tr -d '\r')
if [ -n "$hits" ]; then echo "Raw layout numbers outside tokens.ts:"; echo "$hits"; bad=1; fi
# 3. a raw number as the floor or ceiling of a size in a drawing file (`Math.max(18, …)`): 0, 1 and 100 (nothing, one, a whole percent) are clamps, not measures
DRAW=$(find mods/cockpit/hooks -name '*.tsx')
hits=$(grep -nE "Math\.(max|min)\( *-?[0-9]" $DRAW | grep -v 'token-ok' | awk '{ s = $0; bad = 0; while (match(s, /Math\.(max|min)\( *-?[0-9][0-9.]*/)) { n = substr(s, RSTART, RLENGTH); sub(/^[^(]*\( */, "", n); if (n != "0" && n != "1" && n != "100") bad = 1; s = substr(s, RSTART + RLENGTH) } if (bad) print }')
if [ -n "$hits" ]; then echo "Raw size floors or ceilings outside tokens.ts:"; echo "$hits"; bad=1; fi
# 4. every token in tokens.ts carries its own comment (on its line or directly above), so tokens.ts is the index of the design system
hits=$(awk '/^export const [A-Za-z0-9_]+/ { if ($0 !~ /\/\// && prev !~ /^[ \t]*\/\//) print FILENAME ":" NR ": " $0 } { prev = $0 }' mods/cockpit/hooks/ui/tokens.ts | tr -d '\r')
if [ -n "$hits" ]; then echo "Tokens without a comment (say what each one is):"; echo "$hits"; bad=1; fi
if [ "$bad" = 0 ]; then echo "check-tokens: clean"; fi
exit $bad
