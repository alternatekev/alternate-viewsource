import { mix, type Oklch } from "@/lib/color";
import type { ColorTokens } from "./schema";

// One dark world, as every prototype assumes. Whether there is a light tier is Kevin's call.
// The field's stops are the doooomgaze prototype's values converted to OKLCH, so the port starts
// where the prototype left off.
export const color = {
  ui: {
    paper: [0.135, 0.012, 265],
    ink: [0.93, 0.008, 85],
    quiet: [0.8, 0.012, 260],
    rule: [0.3, 0.012, 260],
    accent: [0.86, 0.09, 205],
    scrimAlpha: 0.94,
  },
  // placeholders: dial-up and broadband are sampled from the 2001 and 2005 sites (#6699CC, #FE1300);
  // the other three are invented and wait for Kevin
  phases: {
    dialup: [0.66, 0.09, 252],
    broadband: [0.63, 0.25, 29],
    apps: [0.78, 0.15, 75],
    components: [0.66, 0.11, 180],
    agents: [0.6, 0.2, 290],
  },
  field: {
    timeOfDay: [
      { hour: 0, bg: [0.118, 0.017, 274], tint: [0.609, 0.114, 272] },
      { hour: 5.5, bg: [0.131, 0.018, 293], tint: [0.606, 0.14, 302] },
      { hour: 7.5, bg: [0.159, 0.017, 339], tint: [0.646, 0.128, 350] },
      { hour: 12, bg: [0.18, 0.009, 258], tint: [0.685, 0.08, 240] },
      { hour: 17.5, bg: [0.161, 0.016, 49], tint: [0.71, 0.083, 62] },
      { hour: 20, bg: [0.134, 0.016, 313], tint: [0.638, 0.151, 317] },
      { hour: 24, bg: [0.118, 0.017, 274], tint: [0.609, 0.114, 272] },
    ],
    mood: {
      warmHue: 62,
      coolHue: 250,
      chroma: { base: 0.012, valence: 0.085, arousal: 0.03 },
      shardLight: 0.76,
      shardDark: 0.3,
      crackLight: 0.8,
      crackChroma: 0.13,
      tintIntoLight: 0.18,
      tintIntoDark: 0.25,
      moodIntoBg: 0.12,
    },
  },
} satisfies ColorTokens;

const smooth = (t: number) => t * t * (3 - 2 * t);

/** The hour's light: background and tint, blended between the stops. */
export function timeOfDay(hour: number) {
  const stops = color.field.timeOfDay as { hour: number; bg: Oklch; tint: Oklch }[];
  const h = ((hour % 24) + 24) % 24;
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i], b = stops[i + 1];
    if (h >= a.hour && h <= b.hour) {
      const t = smooth((h - a.hour) / Math.max(1e-6, b.hour - a.hour));
      return { bg: mix(a.bg, b.bg, t), tint: mix(a.tint, b.tint, t) };
    }
  }
  return { bg: stops[0].bg, tint: stops[0].tint };
}

/**
 * The field's palette for an hour and a mood. The field has no color of its own: everything
 * here comes from the clock and from the chapter in view.
 *   valence -1..1: warm when bright, cool when dark · arousal 0..1: more chroma, more light
 */
export function fieldPalette(hour: number, valence: number, arousal: number) {
  const m = color.field.mood;
  const tod = timeOfDay(hour);
  const hue = valence >= 0 ? m.warmHue : m.coolHue;
  const c = m.chroma.base + m.chroma.valence * Math.abs(valence) + m.chroma.arousal * arousal;
  const light: Oklch = mix([m.shardLight, c, hue], tod.tint, m.tintIntoLight);
  const darkTint: Oklch = [tod.tint[0] * 0.3, tod.tint[1] * 0.3, tod.tint[2]];
  const dark: Oklch = mix([m.shardDark + 0.05 * arousal, c * 0.8, hue + 16], darkTint, m.tintIntoDark);
  const crack: Oklch = [m.crackLight + 0.08 * arousal, Math.min(0.37, c + m.crackChroma), hue - 6];
  const bg: Oklch = mix(tod.bg, dark, m.moodIntoBg);
  return { bg, light, dark, crack };
}
