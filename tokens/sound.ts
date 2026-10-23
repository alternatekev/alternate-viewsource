import type { SoundTokens } from "./schema";

// dooombient as data. Values are the prototype's (Kevin's decisions of Oct 14); the five phase
// anchors re-map its four eras onto the spine and are a proposal until he tunes them by ear; so are
// the voices, which carry each era's oscillator, loudness and drive over to the phases.
const p = (flMix: number, flRate: number, flDepth: number, flFb: number, ccMix: number, ccTime: number, ccFb: number, ccMod: number,
  jtMix: number, jtRate: number, jtDepth: number, faMix: number, faTone: number, faSize: number, cut: number) =>
  ({ flMix, flRate, flDepth, flFb, ccMix, ccTime, ccFb, ccMod, jtMix, jtRate, jtDepth, faMix, faTone, faSize, cut });

export const sound = {
  bpm: 48,
  modes: { lydian: [0, 2, 4, 6, 7, 9, 11], ionian: [0, 2, 4, 5, 7, 9, 11], mixolydian: [0, 2, 4, 5, 7, 9, 10] },
  modeWeights: { lydian: 0.45, ionian: 0.3, mixolydian: 0.25 },
  voicings: [
    { name: "add9", steps: [4, 8, 9] },
    { name: "6/9", steps: [5, 8, 11] },
    { name: "maj7", steps: [4, 6, 9] },
    { name: "sus2", steps: [1, 4, 8] },
  ],
  register: { lowestRoot: 29, highestRoot: 40 },
  // three boards run at once, locked in ratios to the shared settings; each runs its own Jets voice
  boards: [
    { name: "low", fl: 1, cc: 0.5, jt: 0.5, size: 0.75, tone: 0.6, ccMix: 0.6, jtMix: 0.8, sonar: 0.55, pre: 0.6, dim: 0.35,
      jets: { voice: "blur", oct: 0, shape: "sine", envMode: "repeat", trigger: "poly", capture: 0.22 } },
    { name: "mid", fl: 1.5, cc: 1, jt: 1, size: 0.9, tone: 1, ccMix: 1, jtMix: 1, sonar: 0.75, pre: 0.8, dim: 0.5,
      jets: { voice: "swell", oct: 0, shape: "rampUp", envMode: "repeat", trigger: "poly", capture: 0.18 } },
    { name: "air", fl: 2, cc: 1.5, jt: 2, size: 1, tone: 1.6, ccMix: 1, jtMix: 1, sonar: 1, pre: 1, dim: 0.45,
      jets: { voice: "blur", oct: 1, shape: "triangle", envMode: "repeat", trigger: "poly", capture: 0.25 } },
  ],
  phases: {
    dialup: { fathom: "lofi", voice: { wave: "square", loud: 0.2, drive: 0.25 }, pedals: p(0.8, 0.5, 0.004, 0.6, 0.5, 0.12, 0.35, 0.0005, 0, 4, 0.6, 0.72, 2025, 0.35, 1015) },
    broadband: { fathom: "plate", voice: { wave: "square", loud: 0.2, drive: 0.25 }, pedals: p(0.55, 0.35, 0.003, 0.48, 0.55, 0.21, 0.42, 0.001, 0, 3, 0.55, 0.8, 2565, 0.5, 1450) },
    apps: { fathom: "plate", voice: { wave: "triangle", loud: 1, drive: 0 }, pedals: p(0.3, 0.2, 0.0025, 0.35, 0.6, 0.3, 0.5, 0.0015, 0, 2, 0.5, 0.88, 3105, 0.65, 1885) },
    components: { fathom: "hall", voice: { wave: "sawtooth", loud: 0.26, drive: 0 }, pedals: p(0.15, 0.1, 0.002, 0.25, 0.5, 0.35, 0.55, 0.002, 0.6, 4, 0.75, 0.88, 2700, 0.7, 1450) },
    agents: { fathom: "sonar", voice: { wave: "sine", loud: 1, drive: 0 }, pedals: p(0.2, 0.07, 0.003, 0.4, 0.55, 0.4, 0.62, 0.0025, 0.3, 0.5, 0.5, 1, 4590, 1, 2610) },
  },
  drone: { breathBeats: 32, level: 0.03, surgeLevel: 0.01 }, // surge was 0.035; tamed Oct 15
  swells: { everySec: [16, 36], bloomSec: 4, level: 0.022 },
  drift: { everyChords: [5, 8], dissonance: 0.15 },
  // a jump through time surges the boards. Kevin, Oct 15: surges must not be much louder than rest,
  // so the swell in feedback, reverb, brightness and drone is held down and the master ducks under it.
  // The prototype's values, for reference: feedback 0.35, reverb 0.3, brightness 3500, freezeAt 0.55, duck 0.
  surge: { decadeIsFull: 8, decaySec: 3, keyChangeYears: 6, feedback: 0.15, reverb: 0.1, brightness: 1500, freezeAt: 0.85, duck: 0.5, attackFloor: 1.5, quicken: 0.4 }, // prototype: duck 0, attackFloor 0.35, quicken 0.75
  // a compressor on the whole mix, before the volume: holds surges near the level at rest
  leveler: { thresholdDb: -30, kneeDb: 12, ratio: 8, attackSec: 0.05, releaseSec: 0.6 },
  calmAtRest: 0.5,
  masterLevel: 0.04, // very low: most visitors keep their volume at 100% (Kevin, Oct 15); the prototype ran at 0.9. The leveler adds its own makeup gain, so this sits lower than it sounds
} satisfies SoundTokens;
