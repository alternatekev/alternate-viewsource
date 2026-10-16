#!/usr/bin/env bash
# The mechanical half of the component, token and typography audit: what can be counted, counted.
# Read-only. Run from the repo root:  bash .claude/skills/component-token-audit/scripts/scan.sh
# It prints findings to check by hand; it never fails a build and never edits a file.
set -u
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
SRC="app lib"
hr() { printf '\n== %s\n' "$1"; }

hr "inventory: DOM components (lib/**, one factory per file)"
grep -rnE "^export (async )?function [a-zA-Z]+" lib --include=*.ts | grep -vE "lib/(content|color)/?" | sed 's/(.*//' | sed 's/export //'

hr "inventory: React shells (app/*.tsx)"
ls app/*.tsx

hr "inventory: CSS custom properties emitted by tokens/index.ts"
grep -oE '"--[a-z0-9-]+"' tokens/index.ts | tr -d '"' | sort -u | tr '\n' ' '; echo
echo "(+ one per phase key: --dialup --broadband --apps --components --agents)"

hr "emitted custom properties no stylesheet or script reads"
for v in $(grep -oE '"--[a-z0-9-]+"' tokens/index.ts | tr -d '"' | sort -u) --dialup --broadband --apps --components --agents; do
  n=$(grep -rn -- "var($v\b\|\"$v\"" app lib 2>/dev/null | grep -v "tokens/index.ts" | wc -l)
  [ "$n" = 0 ] && echo "  $v"
done

hr "token keys read nowhere but their own definition (the validator is not a reader)"
for f in tokens/color.ts tokens/motion.ts tokens/dock.ts tokens/shatter.ts tokens/sound.ts; do
  for k in $(grep -oE "^\s+[a-zA-Z]+:" "$f" | tr -d ' :' | sort -u); do
    n=$(grep -rnwE "$k" $SRC tokens --include=*.ts --include=*.tsx 2>/dev/null | grep -v "tokens/schema.ts" | wc -l)
    [ "$n" -le 1 ] && echo "  $f: $k"
  done
done

hr "stylesheet classes no markup or script names (comments ignored)"
for c in $(sed -E 's#/\*([^*]|\*+[^*/])*\*+/##g' app/globals.css | tr '\n' ' ' | sed -E 's#/\*[^*]*\*+([^/*][^*]*\*+)*/##g' | grep -oE "\.[a-z][a-z0-9-]+" | sort -u | tr -d .); do
  n=$(grep -rnE "(className|classList|[cC]lass[:=])" $SRC content --include=*.ts --include=*.tsx --include=*.mdx 2>/dev/null | grep -E "[\"'\` .]$c([\"'\` ]|$)" | wc -l)
  [ "$n" = 0 ] && echo "  .$c"
done

hr "colors written outside tokens (hex, rgb, hsl, oklch literals)"
grep -rnE "#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|oklch\(" $SRC --include=*.ts --include=*.tsx --include=*.css | grep -vE "lib/color.ts|^\S+:\s*//" || echo "  none"

hr "easings and durations written inline"
grep -rnE "cubic-bezier|steps\(|[^a-zA-Z](duration|ms):\s*[0-9]" $SRC --include=*.ts --include=*.tsx | cut -c1-180 || echo "  none"

hr "px values in the stylesheet, by frequency (a repeated one is a candidate token)"
grep -oE "\b[0-9]+px\b" app/globals.css | sort | uniq -c | sort -rn | awk '$1>1'

hr "typography: faces"
grep -nE "^\s*--face-[a-z]+:" app/globals.css | sed 's/^/  /'
grep -nE "typekit|fonts\.(googleapis|adobe)" app/layout.tsx | sed 's/^/  load: /'

hr "typography: font declarations that name a family instead of a --face-* variable"
grep -nE "font(-family)?:" app/globals.css | grep -vE "var\(--face-|font: inherit" | cut -c1-140

hr "typography: distinct font sizes (each one is a role, or a candidate to merge)"
grep -oE "font(-size)?:[^;]*" app/globals.css | grep -oE "clamp\([^)]*\)|[0-9.]+(px|rem|em)\b" | sort | uniq -c | sort -rn

hr "typography: leading and tracking in use"
grep -oE "/[0-9.]+ |line-height: *[0-9.]+" app/globals.css | tr -d '/ ' | sed 's/line-height://' | sort | uniq -c | sort -rn | sed 's/^/  leading /'
grep -oE "letter-spacing: *[-0-9.]+em" app/globals.css | sed 's/letter-spacing: *//' | sort | uniq -c | sort -rn | sed 's/^/  tracking /'

hr "typography: the label shorthand, repeated"
grep -nE "13px/1 var\(--face-pixel\)" app/globals.css | cut -c1-90

hr "typography: house rules"
printf '  text-wrap balance rules: %s   pretty rules: %s\n' "$(grep -c 'text-wrap: balance' app/globals.css)" "$(grep -c 'text-wrap: pretty' app/globals.css)"
printf '  tabular-nums rules:      %s\n' "$(grep -c 'tabular-nums' app/globals.css)"
printf '  font-feature-settings:   %s (prefer font-variant-*)\n' "$(grep -c 'font-feature-settings' app/globals.css)"
echo "  code reading a computed font size:"; grep -rnE "fontSize|getComputedStyle\([^)]*\)\.font" $SRC --include=*.ts --include=*.tsx | cut -c1-140 | sed 's/^/    /'
echo "  italic or bold asked for (check the kit serves it):"; grep -rnE "font-style: *italic|font-weight: *(6|7|8|9)00|italic: *true" app lib --include=*.ts --include=*.tsx --include=*.css | cut -c1-140 | sed 's/^/    /'

hr "repeated patterns (a count above 1 is a candidate to share)"
printf '  prefers-reduced-motion checks in scripts: %s\n' "$(grep -rn "prefers-reduced-motion" $SRC --include=*.ts --include=*.tsx | wc -l)"
printf '  createElement(\"button\") sites:           %s\n' "$(grep -rn 'createElement("button")' $SRC | wc -l)"
printf '  :focus-visible rules:                      %s\n' "$(grep -c ":focus-visible" app/globals.css)"
printf '  caret ::after declarations:                %s\n' "$(grep -c "animation: dock-caret" app/globals.css)"
printf '  "which beat is mid-view" calculations:     %s\n' "$(grep -rn "innerHeight / 2" $SRC | wc -l)"
printf '  window.* globals used as a bus:            %s\n' "$(grep -rnE "window as unknown as \{ *(doooomgaze|dooombient)" $SRC | wc -l)"

hr "the validator"
echo "  run: npm run validate   (contrast, loops, ceilings, ratios; must pass)"
