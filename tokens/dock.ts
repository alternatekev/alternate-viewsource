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
  navStart: { edge: "top", t: 0.5 }, // where the nav sits on page load: centered on the top (the timeline then spans the bottom); the visitor can move it
  navMaxLength: 560, // placeholder until the nav and effects controls have content
  navEdges: ["top", "bottom"], // the nav docks only here, so its words stay upright (Kevin, Oct 15)
  timelineScrollMs: 1600, // a timeline press scrolls the page there over this long, eased; never a jump
  stops: [0, 0.5, 1], // the nav locks to these spots along an edge: its corners and its center
  keyStep: 0.05, // arrow keys move 5% of the edge (unused while the nav locks to stops)
  dragStartPx: 4, // a press becomes a drag only after this much movement; a click leaves the bar alone
  followSec: 0.06, // how closely the lifted stub trails the pointer
  grip: { hit: 40, lines: [9, 12], lineSpacing: 4, lineWidth: 1 },
  // Exploration, Oct 14: each bar is a fractured pane. The field under it is seen through its own
  // small Voronoi shatter, every piece shifting what is behind it by a different amount. First sketch.
  refraction: { on: true, cell: 24, shift: [3, 10] }, // px: piece size, and the range of each piece's shift
  // The typing cursor at the head of the nav. Types each name, holds, erases, and after the last one
  // pauses before starting over. Stops at the visitor's first interaction; moving the nav steps it on.
  typing: { charMs: 60, eraseMs: 25, holdMs: 3200, gapMs: 900, pauseMs: 8000, blinkMs: 1060 },
  look: { lineAlpha: 0.45, gripAlpha: 0.5, ghostAlpha: 0.35, liftedOpacity: 0.5, ghostFadeMs: 120, borderWidth: 1 },
} satisfies DockTokens;
