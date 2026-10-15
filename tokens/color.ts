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
  // outside the window mask's shards: black, as first seen and liked (Oct 14)
  maskOutside: [0, 0, 0],
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
// The color matrix (Kevin, Oct 14, 23:16): the dock edge picks the scheme; the position on the timeline
// picks the color inside it. Each scheme is a strip of four bg + tint stops, 1998 at stop 1, now at stop 4.
// First sketch from the color chat; "we will likely tone it down after seeing in action."
type Stop = { bg: Oklch; tint: Oklch };
export const schemes: Record<"compass" | "archive" | "hueWheel" | "warmCool", Stop[]> = {
  compass: [
    { bg: [0.14, 0.012, 258], tint: [0.68, 0.08, 240] },
    { bg: [0.155, 0.018, 40], tint: [0.7, 0.1, 55] },
    { bg: [0.115, 0.016, 290], tint: [0.6, 0.13, 300] },
    { bg: [0.145, 0.018, 335], tint: [0.64, 0.13, 345] },
  ],
  archive: [
    { bg: [0.135, 0.016, 252], tint: [0.66, 0.09, 252] },
    { bg: [0.14, 0.02, 29], tint: [0.63, 0.18, 29] },
    { bg: [0.14, 0.016, 75], tint: [0.74, 0.13, 75] },
    { bg: [0.13, 0.016, 235], tint: [0.63, 0.13, 235] },
  ],
  hueWheel: [
    { bg: [0.135, 0.02, 0], tint: [0.66, 0.1, 0] },
    { bg: [0.135, 0.02, 90], tint: [0.66, 0.1, 90] },
    { bg: [0.135, 0.02, 180], tint: [0.66, 0.1, 180] },
    { bg: [0.135, 0.02, 270], tint: [0.66, 0.1, 270] },
  ],
  warmCool: [
    { bg: [0.135, 0.014, 250], tint: [0.66, 0.09, 250] },
    { bg: [0.138, 0.014, 156], tint: [0.68, 0.07, 156] },
    { bg: [0.14, 0.016, 62], tint: [0.72, 0.1, 62] },
    { bg: [0.138, 0.014, 156], tint: [0.68, 0.07, 156] },
  ],
};
export const schemeByEdge = { top: "compass", right: "archive", bottom: "hueWheel", left: "warmCool" } as const;
export type DockEdge = keyof typeof schemeByEdge;
// the knobs for toning it down: how much the scheme outweighs the hour's light
export const matrix = { schemeIntoHour: 0.75 };

/** A scheme's bg and tint at a point on the timeline, 0 = 1998, 1 = now. */
export function schemeAt(edge: DockEdge, year: number): Stop {
  const stops = schemes[schemeByEdge[edge]];
  const f = Math.min(1, Math.max(0, year)) * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(f)), t = f - i;
  return { bg: mix(stops[i].bg, stops[i + 1].bg, t), tint: mix(stops[i].tint, stops[i + 1].tint, t) };
}

/**
 * The field's palette. The hour sets the light, the dock edge and the timeline pick the scheme's color
 * on top of it, and the chapter's mood sets how much color and light the shards carry.
 */
export function fieldPalette(hour: number, valence: number, arousal: number, place: { edge: DockEdge; year: number } = { edge: "top", year: 0 }) {
  const m = color.field.mood;
  const tod = timeOfDay(hour), sch = schemeAt(place.edge, place.year), w = matrix.schemeIntoHour;
  const bgBase = mix(tod.bg, sch.bg, w), tint = mix(tod.tint, sch.tint, w);
  const hue = tint[2];
  const c = (m.chroma.base + m.chroma.valence * Math.abs(valence) + m.chroma.arousal * arousal) * (tint[1] / 0.1);
  const light: Oklch = mix([m.shardLight, c, hue], tint, m.tintIntoLight);
  const darkTint: Oklch = [tint[0] * 0.3, tint[1] * 0.3, tint[2]];
  const dark: Oklch = mix([m.shardDark + 0.05 * arousal, c * 0.8, hue + 16], darkTint, m.tintIntoDark);
  const crack: Oklch = [m.crackLight + 0.08 * arousal, Math.min(0.37, c + m.crackChroma), hue - 6];
  const bg: Oklch = mix(bgBase, dark, m.moodIntoBg);
  return { bg, light, dark, crack };
}
