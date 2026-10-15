import type { DockTokens } from "./schema";

// The docks: geometry, the drag, and the wireframe look. Values are the menu plan's proposals and
// Kevin's tuning in the browser (Oct 14); line colors are ink at these alphas.
export const dock = {
  thickness: 48, // px
  thicknessCoarse: 56, // touch screens
  inset: 8, // distance from the viewport edge, inside the safe area
  gap: 16, // minimum gap between two bars on one edge
  reach: 120, // distance from an edge at which the ghost appears
  stub: 150, // length of the lifted bar
  navMaxLength: 560, // placeholder until the nav and effects controls have content
  keyStep: 0.05, // arrow keys move 5% of the edge
  dragStartPx: 4, // a press becomes a drag only after this much movement; a click leaves the bar alone
  followSec: 0.06, // how closely the lifted stub trails the pointer
  grip: { hit: 40, lines: [9, 12], lineSpacing: 4, lineWidth: 1 },
  look: { lineAlpha: 0.45, gripAlpha: 0.5, ghostAlpha: 0.35, liftedOpacity: 0.5, ghostFadeMs: 120, borderWidth: 1 },
} satisfies DockTokens;
