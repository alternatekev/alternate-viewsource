// The token system: four families, each primitives → semantic roles → the rules that move them.
// Everything that colors, moves, shatters or sounds reads from here, so the field, the instrument,
// the docks and the text cannot drift apart. See docs/tokens.md.
import { toCss } from "@/lib/color";
import { color } from "./color";
import { dock } from "./dock";
import { motion } from "./motion";

export { color, fieldPalette, timeOfDay } from "./color";
export { dock } from "./dock";
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
  const L = dock.look, G = dock.grip, px = (n: number) => `${n}px`;
  Object.assign(vars, {
    "--dock-line": toCss(u.ink, L.lineAlpha),
    "--dock-grip": toCss(u.ink, L.gripAlpha),
    "--dock-ghost": toCss(u.ink, L.ghostAlpha),
    "--dock-focus": toCss(u.ink),
    "--dock-border": px(L.borderWidth),
    "--dock-lifted": String(L.liftedOpacity),
    "--dock-ghost-fade": `${L.ghostFadeMs}ms`,
    "--dock-grip-hit": px(G.hit),
    "--dock-grip-w": px(G.lines[0]),
    "--dock-grip-h": px(G.lines[1]),
    "--dock-grip-step": px(G.lineSpacing),
    "--dock-grip-line": px(G.lineWidth),
    "--dock-caret-blink": `${dock.typing.blinkMs}ms`,
    "--type-char": `${dock.typing.charMs}ms`,
    "--type-erase": `${dock.typing.eraseMs}ms`,
    "--type-steps": String(dock.typing.revealSteps),
    "--zoom-near": String(motion.zoom.near),
    "--zoom-close": String(motion.zoom.close),
  });
  return `:root{${Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(";")}}`;
}
