import { z } from "zod";

// One schema per token family. `npm run validate` parses every family against these and runs
// the cross-checks in scripts/validate-tokens.ts (contrast, level ceilings, board ratios).

export const Oklch = z.tuple([z.number().min(0).max(1), z.number().min(0).max(0.4), z.number().min(0).max(360)]);

const Hour = z.number().min(0).max(24);

// ---------- color ----------
export const ColorTokens = z.object({
  ui: z.object({
    paper: Oklch,
    ink: Oklch,
    quiet: Oklch,
    rule: Oklch,
    accent: Oklch,
    // the calm behind the reading column, so text holds its contrast over anything the field does
    scrimAlpha: z.number().min(0).max(1),
  }),
  // what shows outside the window mask's shards
  maskOutside: Oklch,
  phases: z.object({ dialup: Oklch, broadband: Oklch, apps: Oklch, components: Oklch, agents: Oklch }),
  field: z.object({
    // the hour sets the light: background and a tint, blended between stops; 0 and 24 must match
    timeOfDay: z.array(z.object({ hour: Hour, bg: Oklch, tint: Oklch })).min(2),
    mood: z.object({
      warmHue: z.number().min(0).max(360),
      coolHue: z.number().min(0).max(360),
      chroma: z.object({ base: z.number(), valence: z.number(), arousal: z.number() }),
      shardLight: z.number().min(0).max(1),
      shardDark: z.number().min(0).max(1),
      crackLight: z.number().min(0).max(1),
      crackChroma: z.number().min(0).max(0.4),
      tintIntoLight: z.number().min(0).max(1),
      tintIntoDark: z.number().min(0).max(1),
      moodIntoBg: z.number().min(0).max(1),
    }),
  }),
});
// authored shape (defaults optional); the build parses it against the schema
export type ColorTokens = z.input<typeof ColorTokens>;

// ---------- motion ----------
export const MotionTokens = z.object({
  // named spring times, seconds to settle; everything that moves uses one of these
  springs: z.object({ quick: z.number(), deliberate: z.number(), slow: z.number(), tidal: z.number() }),
  // which spring each field value follows
  follow: z.record(z.string(), z.enum(["quick", "deliberate", "slow", "tidal"])),
  dockSnapMs: z.number().int().positive(),
  zoom: z.object({ ms: z.number().int().positive(), fill: z.number().min(0.2).max(1), read: z.number().min(0.1).max(1), fieldPx: z.number().min(2).max(24), near: z.number().positive().max(0.5), close: z.number().positive().max(0.5), edge: z.number().min(0).max(0.4), edgeSpeed: z.number().min(0).max(5000) }),
  beginDropMs: z.number().int().positive(),
  crossfadeMs: z.number().int().positive(),
  fieldFadeInMs: z.number().int().positive(),
  signals: z.object({
    scrollFollowPerSec: z.number(),
    selectFollowPerSec: z.number(),
    openedDecaySec: z.number(),
    lingerSec: z.number(),
    pauseRampSec: z.tuple([z.number(), z.number()]),
  }),
  // prefers-reduced-motion keeps mood changes and drops drift
  reduced: z.object({ expand: z.number().min(0).max(1), spin: z.number().min(0).max(1), swirl: z.number().min(0).max(1), camera: z.number().min(0).max(1), parallax: z.number().min(0).max(1) }),
  // at most this share of the field visibly changing at once
  changingShareMax: z.number().min(0).max(1),
});
// authored shape (defaults optional); the build parses it against the schema
export type MotionTokens = z.input<typeof MotionTokens>;

// ---------- shatter ----------
// Every moving quantity in the field is base + Σ coefficient × signal. The signals are listed
// here; `slowed` means stillness (linger, select, pause) also slows it.
export const SIGNALS = [
  "arousal", "arousal2", "calm", "valence", "negative", "scroll", "scrollFrac",
  "opened", "openedCapped", "linger", "select", "pause", "tension", "energy", "energyArousal",
] as const;
export type Signal = (typeof SIGNALS)[number];
export const Linear = z
  .object({ base: z.number().default(0), slowed: z.boolean().default(false) })
  .extend(Object.fromEntries(SIGNALS.map((s) => [s, z.number().optional()])) as Record<Signal, z.ZodOptional<z.ZodNumber>>);
// authored shape (defaults optional); the build parses it against the schema
export type Linear = z.input<typeof Linear>;

export const ShatterTokens = z.object({
  patterns: z.array(z.enum(["impact", "glass", "splinter"])).min(1),
  shardsPerUnit: z.number().positive(),
  shardRange: z.tuple([z.number().int(), z.number().int()]),
  camera: z.object({ distance: z.number(), fov: z.number(), overscan: z.number() }),
  preShatterDepth: z.tuple([z.number(), z.number()]),
  source: z.object({ shape: z.literal("rectangle"), stops: z.array(z.tuple([z.number().min(0).max(1), z.number().min(0).max(1)])).min(2) }),
  moodShift: z.object({ tension: z.number(), openedCapped: z.number(), pause: z.number() }),
  stillness: z.object({ linger: z.number(), select: z.number(), pause: z.number() }),
  dynamics: z.object({
    expand: Linear, spin: Linear, depth: Linear, swirl: Linear, sink: Linear, count: Linear,
    gap: Linear, rim: Linear, opacity: Linear, opacityVariance: Linear,
    dolly: Linear, pitch: Linear, yaw: Linear, focusOffset: Linear, depthOfField: Linear,
    keyLight: Linear, specular: Linear, exposure: Linear, vignette: Linear,
  }),
  // exploration: a second shatter whose shards are windows onto the main field
  windowMask: z.boolean().default(false),
  glow: z.object({ amount: z.number().min(0).max(1), blur: z.number().min(0).max(8) }).default({ amount: 0, blur: 4 }),
  portrait: z.object({ src: z.string().startsWith("/"), amount: z.number().min(0).max(1), height: z.number().min(0.1).max(1), right: z.number().min(0).max(0.5), easeSec: z.number().positive(), soft: z.number().min(0).max(40), keep: z.number().min(0).max(1), fracture: z.number().min(0).max(3), catch: z.number().min(0).max(1) }).default({ src: "/hello/portrait.webp", amount: 0, height: 0.8, right: 0.05, easeSec: 1, soft: 6, keep: 0.1, fracture: 1, catch: 0.5 }),
  // which tiers run the field; glance (phones, no GPU) is open
  tiers: z.array(z.enum(["glance", "read", "inhabit"])),
});
// authored shape (defaults optional); the build parses it against the schema
export type ShatterTokens = z.input<typeof ShatterTokens>;

// ---------- dock ----------
export const DockTokens = z.object({
  thickness: z.number().positive(),
  // touch targets need 44 px at least
  thicknessCoarse: z.number().min(44),
  inset: z.number().min(0),
  gap: z.number().min(0),
  reach: z.number().positive(),
  stub: z.number().positive(),
  navStart: z.object({ edge: z.enum(["top", "right", "bottom", "left"]), t: z.number().min(0).max(1) }),
  navMaxLength: z.number().positive(),
  navEdges: z.array(z.enum(["top", "right", "bottom", "left"])).min(1),
  visualizerReach: z.number().min(0).max(0.5),
  helloSpan: z.number().positive(),
  timelineScrollMs: z.number().min(200),
  stops: z.array(z.number().min(0).max(1)).min(1),
  keyStep: z.number().positive().max(0.5),
  dragStartPx: z.number().min(1),
  followSec: z.number().positive().max(0.5),
  grip: z.object({ hit: z.number().min(24), lines: z.tuple([z.number().positive(), z.number().positive()]), lineSpacing: z.number().min(2), lineWidth: z.number().positive() }),
  refraction: z.object({ on: z.boolean(), cell: z.number().min(4), shift: z.tuple([z.number().min(0), z.number().min(0)]), hoverGain: z.number().min(0), hoverFloor: z.number().min(0).max(0.5), hoverSec: z.number().positive() }),
  typing: z.object({ charMs: z.number().positive(), eraseMs: z.number().positive(), holdMs: z.number().min(0), gapMs: z.number().min(0), pauseMs: z.number().min(0), blinkMs: z.number().positive(), revealSteps: z.number().int().min(1), popoverPace: z.number().positive().max(1), longChars: z.number().int().min(4) }),
  look: z.object({
    lineAlpha: z.number().min(0).max(1), gripAlpha: z.number().min(0).max(1), ghostAlpha: z.number().min(0).max(1),
    liftedOpacity: z.number().min(0).max(1), ghostFadeMs: z.number().min(0), borderWidth: z.number().positive(),
  }),
});
export type DockTokens = z.input<typeof DockTokens>;

// ---------- sound ----------
const Voice = z.object({ wave: z.enum(["square", "triangle", "sawtooth", "sine"]), loud: z.number().min(0).max(1), drive: z.number().min(0).max(1) });
const Pedals = z.object({
  flMix: z.number(), flRate: z.number(), flDepth: z.number(), flFb: z.number(),
  ccMix: z.number(), ccTime: z.number().max(0.4), ccFb: z.number().max(0.9), ccMod: z.number(),
  jtMix: z.number(), jtRate: z.number(), jtDepth: z.number(),
  faMix: z.number(), faTone: z.number(), faSize: z.number(), cut: z.number(),
});
export const SoundTokens = z.object({
  bpm: z.number().positive(),
  modes: z.record(z.string(), z.array(z.number().int().min(0).max(11)).length(7)),
  modeWeights: z.record(z.string(), z.number().min(0)),
  voicings: z.array(z.object({ name: z.string(), steps: z.array(z.number().int()) })).min(1),
  register: z.object({ lowestRoot: z.number().int(), highestRoot: z.number().int() }),
  boards: z.array(z.object({
    name: z.string(), fl: z.number(), cc: z.number(), jt: z.number(), size: z.number(), tone: z.number(),
    ccMix: z.number().min(0).max(1), jtMix: z.number().min(0).max(1), sonar: z.number().min(0).max(1), pre: z.number().min(0).max(1), dim: z.number().min(0).max(1),
    jets: z.object({ voice: z.enum(["blur", "swell"]), oct: z.number().int(), shape: z.enum(["sine", "rampUp", "triangle", "square"]), envMode: z.literal("repeat"), trigger: z.literal("poly"), capture: z.number().positive() }),
  })).length(3),
  phases: z.object({
    dialup: z.object({ fathom: z.enum(["lofi", "plate", "hall", "sonar"]), voice: Voice, pedals: Pedals }),
    broadband: z.object({ fathom: z.enum(["lofi", "plate", "hall", "sonar"]), voice: Voice, pedals: Pedals }),
    apps: z.object({ fathom: z.enum(["lofi", "plate", "hall", "sonar"]), voice: Voice, pedals: Pedals }),
    components: z.object({ fathom: z.enum(["lofi", "plate", "hall", "sonar"]), voice: Voice, pedals: Pedals }),
    agents: z.object({ fathom: z.enum(["lofi", "plate", "hall", "sonar"]), voice: Voice, pedals: Pedals }),
  }),
  drone: z.object({ breathBeats: z.number(), level: z.number().max(0.1), surgeLevel: z.number().max(0.1) }),
  swells: z.object({ everySec: z.tuple([z.number(), z.number()]), bloomSec: z.number(), level: z.number().max(0.05) }),
  drift: z.object({ everyChords: z.tuple([z.number().int(), z.number().int()]), dissonance: z.number().min(0).max(1) }),
  surge: z.object({ decadeIsFull: z.number(), decaySec: z.number(), keyChangeYears: z.number(), feedback: z.number().min(0).max(0.5), reverb: z.number().min(0).max(1), brightness: z.number().min(0), freezeAt: z.number().min(0).max(1.01), duck: z.number().min(0).max(0.9), attackFloor: z.number().min(0.05).max(3.9), quicken: z.number().min(0).max(0.9) }),
  leveler: z.object({ thresholdDb: z.number().max(0), kneeDb: z.number().min(0), ratio: z.number().min(1), attackSec: z.number().min(0), releaseSec: z.number().min(0) }),
  calmAtRest: z.number().min(0).max(1),
  masterLevel: z.number().max(1),
});
// authored shape (defaults optional); the build parses it against the schema
export type SoundTokens = z.input<typeof SoundTokens>;
