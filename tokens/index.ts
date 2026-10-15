// The token system: four families, each primitives → semantic roles → the rules that move them.
// Everything that colors, moves, shatters or sounds reads from here, so the field, the instrument,
// the docks and the text cannot drift apart. See docs/tokens.md.
import { toCss } from "@/lib/color";
import { color } from "./color";

export { color, fieldPalette, timeOfDay } from "./color";
export { motion } from "./motion";
export { shatter } from "./shatter";
export { sound } from "./sound";

/** The static UI tokens as CSS custom properties, inlined into every page's <head>. */
export function cssVariables(): string {
  const u = color.ui;
  const vars: Record<string, string> = {
    "--paper": toCss(u.paper),
    "--ink": toCss(u.ink),
    "--quiet": toCss(u.quiet),
    "--rule": toCss(u.rule),
    "--accent": toCss(u.accent),
    "--scrim": toCss(u.paper, u.scrimAlpha),
  };
  for (const [k, v] of Object.entries(color.phases)) vars[`--${k}`] = toCss(v);
  return `:root{${Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(";")}}`;
}
