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
  navStart: { edge: "bottom", t: 1 }, // where the nav sits on page load: the bottom left corner (on the bottom, t runs right to left), with the timeline across the top; the visitor can move it
  navMaxLength: 560, // placeholder until the nav and effects controls have content
  navEdges: ["top", "bottom"], // the nav docks only here, so its words stay upright (Kevin, Oct 15)
  visualizerReach: 0.12, // how far the waveform swings from its center line, as a share of the bar's thickness: subtle (Kevin, Oct 15)
  helloSpan: 2, // Hello's block on the timeline is as wide as this many years
  timelineScrollMs: 1600, // a timeline press scrolls the page there over this long, eased; never a jump
  stops: [0, 0.5, 1], // the nav locks to these spots along an edge: its corners and its center
  keyStep: 0.05, // arrow keys move 5% of the edge (unused while the nav locks to stops)
  dragStartPx: 4, // a press becomes a drag only after this much movement; a click leaves the bar alone
  followSec: 0.06, // how closely the lifted stub trails the pointer
  grip: { hit: 40, lines: [9, 12], lineSpacing: 4, lineWidth: 1 },
  // Exploration, Oct 14: each bar is a fractured pane. The field under it is seen through its own
  // small Voronoi shatter, every piece shifting what is behind it by a different amount. First sketch.
  refraction: { on: true, cell: 24, shift: [3, 10], hoverGain: 1.2, hoverFloor: 0.03, hoverSec: 0.35 }, // hovered, a pane brightens what it refracts (gain × and floor +), easing over hoverSec
  // px: piece size, and the range of each piece's shift
  // Type in, type out: the one transition (lib/type.ts). Words type at charMs and erase at eraseMs;
  // boxes set in and withdraw in revealSteps steps at the same speeds. The logotype also holds each
  // name for holdMs, waits gapMs between, and pauses pauseMs after the last before starting over.
  typing: { charMs: 60, eraseMs: 25, holdMs: 3200, gapMs: 900, pauseMs: 8000, blinkMs: 1060, revealSteps: 16, popoverPace: 0.35, longChars: 24 }, // longChars: text longer than this types several letters a step, finishing in about the time this many take // the popover answers a press, so it runs at about a third of the time
  // Each bar and the popover are a pane of frosted glass (Kevin, Oct 16): words that pass beneath are
  // blurred past reading and the field still glows through. blur in px; saturate lifts the field's
  // color through the frost; the tint is paper at tintAlpha. Without backdrop-filter, or when the
  // reader asks for less transparency, the pane is the reading column's scrim instead.
  glass: { blur: 20, saturate: 1.4, tintAlpha: 0.6 },
  look: { lineAlpha: 0.45, gripAlpha: 0.5, ghostAlpha: 0.35, liftedOpacity: 0.5, ghostFadeMs: 120, borderWidth: 1 },
} satisfies DockTokens;
