import type { MotionTokens } from "./schema";

// Tides and weather, not fidgeting: transitions take seconds and every value follows a
// critically damped spring, so a new target interrupted mid-flight bends instead of restarting.
export const motion = {
  springs: { quick: 1.6, deliberate: 2.6, slow: 3.5, tidal: 5 },
  follow: {
    expand: "quick", spin: "quick", point: "slow", count: "slow", color: "slow",
    dolly: "tidal", pitch: "tidal", yaw: "tidal", camera: "tidal", light: "tidal",
    focus: "deliberate", depthOfField: "deliberate", keyLight: "deliberate", specular: "deliberate",
    exposure: "slow", vignette: "slow",
  },
  dockSnapMs: 250,
  // the surface (David Small's zoom): a dive or a step back takes zoom.ms; the target fills zoom.fill
  // of the view; near text is set at zoom.near of the far text's size, close text at zoom.close of near
  zoom: { ms: 1400, fill: 0.72, read: 0.3, fieldPx: 7, near: 0.16, close: 0.22, edge: 0.14, edgeSpeed: 1100 }, // read: a piece of writing, dived into, fills this share of the width; fieldPx: a phase dived into shows its text this size, a dense field; edge: dived in, the pointer within this share of the view from the left or right edge slides the content toward it, up to edgeSpeed px a second at the very edge
  beginDropMs: 900, // begin: the logo falls behind the button (Kevin, Oct 15)
  crossfadeMs: 2400,
  fieldFadeInMs: 2500,
  signals: { scrollFollowPerSec: 4, selectFollowPerSec: 1.5, openedDecaySec: 7, lingerSec: 14, pauseRampSec: [4, 16] },
  reduced: { expand: 0.15, spin: 0, swirl: 0, camera: 0, parallax: 0 },
  changingShareMax: 0.34,
  // The work page (Kevin, Oct 16): you dive through the timeline into time, the shatter's source
  // becomes a circle, and scrolling travels back a year at a time. First sketch, from the prototype.
  // shapeSec, gatherSec: how long the square becomes the circle, and the shards take to come back
  // together at the oldest year; each eases in and out. surge: the rush a year crossing adds, its
  // ceiling and how fast it drains; at full rush the shards travel surgeSpeed units a second toward
  // the camera and turn surgeSpin times faster. pushSpeed: their speed during a dive. gatherScale: how
  // much of the screen's height the gathered circle fills. diveMs: the trip into the work page.
  // settleMs: after the reader stops scrolling, the page settles on the nearest year.
  // yearScreens: a year is this many screens of scrolling. depthPx: how far apart the years sit in depth.
  flight: {
    shapeSec: 2.4, gatherSec: 4,
    surgePerYear: 0.35, surgeMax: 2.6, surgeDecaySec: 1.7, surgeSpeed: 1.1, surgeSpin: 0.8, pushSpeed: 3.2,
    gatherScale: 0.62,
    diveMs: 2600, settleMs: 260, yearScreens: 1, depthPx: 1100,
  },
} satisfies MotionTokens;
