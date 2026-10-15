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
  crossfadeMs: 2400,
  fieldFadeInMs: 2500,
  signals: { scrollFollowPerSec: 4, selectFollowPerSec: 1.5, openedDecaySec: 7, lingerSec: 14, pauseRampSec: [4, 16] },
  reduced: { expand: 0.15, spin: 0, swirl: 0, camera: 0, parallax: 0 },
  changingShareMax: 0.34,
} satisfies MotionTokens;
