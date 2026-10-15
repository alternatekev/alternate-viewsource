import type { ShatterTokens } from "./schema";

// The field's static shape and its dynamics. Each dynamic is base + Σ coefficient × signal,
// with the signals measured from how the page is being read (see lib/air/field.ts). The values
// are the doooomgaze prototype's, written as data so they can be tuned without touching code.
export const shatter = {
  patterns: ["impact", "glass", "splinter"],
  shardsPerUnit: 14,
  shardRange: [260, 820],
  camera: { distance: 5, fov: 0.72, overscan: 1.25 },
  preShatterDepth: [-4.5, 1.5],
  // placeholder source until Kevin chooses the shape: a grey gradient, [position, lightness]
  source: { shape: "rectangle", stops: [[0, 0.95], [0.42, 0.55], [0.5, 0.23], [0.58, 0.6], [1, 0.91]] },
  moodShift: { tension: 0.25, openedCapped: 0.15, pause: -0.25 },
  stillness: { linger: 0.35, select: 0.6, pause: 0.5 },
  dynamics: {
    expand: { base: 0.012, arousal: 0.07, energy: 0.0042, energyArousal: 0.0245, scroll: 0.16, opened: 0.05, tension: 0.03, slowed: true },
    spin: { base: 0.04, arousal2: 0.45, scroll: 0.9, opened: 0.2, slowed: true },
    depth: { base: 0.3, arousal: 1.3, scrollFrac: 0.4 },
    swirl: { base: 0.02, negative: 0.22, arousal: 0.05, slowed: true },
    sink: { negative: 0.04 },
    count: { base: 0.42, arousal: 0.58 },
    gap: { base: 0.01, arousal: 0.06 },
    rim: { base: 0.3, arousal: 0.5, select: 0.35 },
    opacity: { base: 0.4, arousal: 0.5 },
    opacityVariance: { base: 0.25, calm: 0.6 },
    dolly: { base: 5, linger: -0.9, select: -0.45, pause: 0.35, scrollFrac: -0.25 },
    pitch: { base: -0.04, scrollFrac: 0.08, tension: 0.02 },
    yaw: { valence: 0.03 },
    focusOffset: { linger: -1.4, select: -1.9, pause: 0.6 },
    depthOfField: { base: 0.06, calm: 0.16, linger: 0.2, select: 0.3 },
    keyLight: { base: 0.65, arousal: 0.35, openedCapped: 0.4 },
    specular: { base: 0.6, tension: 0.5, openedCapped: 0.6 },
    exposure: { base: 0.88, arousal: 0.22, pause: -0.18, openedCapped: 0.08 },
    vignette: { base: 0.45, linger: 0.35, pause: 0.25, select: 0.2 },
  },
  windowMask: true,
  tiers: ["read", "inhabit"],
} satisfies ShatterTokens;
