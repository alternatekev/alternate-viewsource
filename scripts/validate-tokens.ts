// Parses every token family against tokens/schema.ts and runs the cross-checks a schema can't:
// text contrast over the worst the field can do, the time-of-day loop, level ceilings, board ratios.
import { contrast, luminance, type Oklch } from "../lib/color";
import { color, dock, fieldPalette, motion, shatter, sound } from "../tokens";
import { schemes } from "../tokens/color";
import { ColorTokens, DockTokens, MotionTokens, Oklch as OklchSchema, ShatterTokens, SoundTokens } from "../tokens/schema";

let problems = 0;
const fail = (msg: string) => { problems++; console.error(`✗ tokens: ${msg}`); };

for (const [name, schema, value] of [
  ["color", ColorTokens, color], ["motion", MotionTokens, motion], ["shatter", ShatterTokens, shatter], ["sound", SoundTokens, sound], ["dock", DockTokens, dock],
] as const) {
  const r = (schema as { safeParse: (v: unknown) => { success: boolean; error?: { message: string } } }).safeParse(value);
  if (!r.success) fail(`${name}: ${r.error?.message}`);
}

// Every scheme stop is a valid OKLCH color, and every scheme has at least two stops.
for (const [name, stops] of Object.entries(schemes)) {
  if (stops.length < 2) fail(`scheme ${name} needs at least two stops`);
  for (const st of stops) for (const c of [st.bg, st.tint]) if (!OklchSchema.safeParse(c).success) fail(`scheme ${name}: ${JSON.stringify(c)} is not OKLCH`);
}

// The time of day is a loop.
const stops = color.field.timeOfDay;
if (stops[0].hour !== 0 || stops.at(-1)!.hour !== 24) fail("timeOfDay must start at 0 and end at 24");
if (JSON.stringify(stops[0].bg) !== JSON.stringify(stops.at(-1)!.bg)) fail("timeOfDay 0 and 24 must match");
for (let i = 1; i < stops.length; i++) if (stops[i].hour <= stops[i - 1].hour) fail("timeOfDay hours must increase");

// Text contrast. Worst case behind the reading column is the field clipped to white (a specular
// highlight can do that) seen through the scrim. Ink and quiet must hold AA against it, and against
// the scrim over the field's darkest background.
const u = color.ui;
const paperY = luminance(u.paper as Oklch);
const throughScrim = (fieldY: number) => u.scrimAlpha * paperY + (1 - u.scrimAlpha) * fieldY;
const worstBright = throughScrim(1);
let darkest = 1, brightestBg = 0;
for (const edge of ["top", "right", "bottom", "left"] as const) for (let year = 0; year <= 1; year += 0.1)
for (let h = 0; h < 24; h += 1) for (let v = -1; v <= 1; v += 0.5) for (let a = 0; a <= 1; a += 0.5) {
  const y = luminance(fieldPalette(h, v, a, { edge, year }).bg); darkest = Math.min(darkest, y); brightestBg = Math.max(brightestBg, y);
}
for (const [name, c, min] of [["ink", u.ink, 4.5], ["quiet", u.quiet, 4.5], ["accent", u.accent, 4.5]] as const) {
  const y = luminance(c as Oklch);
  const lo = Math.min(contrast(y, worstBright), contrast(y, throughScrim(darkest)), contrast(y, paperY));
  if (lo < min) fail(`${name} falls to ${lo.toFixed(2)}:1 over the field (needs ${min}:1)`);
  else console.log(`  ${name}: at least ${lo.toFixed(2)}:1 over anything the field shows`);
}
// The docks' words sit on the glass: paper at the tint over the blurred field, whose worst is its
// brightest background (the blur spreads a highlight out). Ink and quiet must hold AA there.
const glassY = dock.glass.tintAlpha * paperY + (1 - dock.glass.tintAlpha) * brightestBg;
for (const [name, c] of [["ink", u.ink], ["quiet", u.quiet]] as const) {
  const r = contrast(luminance(c as Oklch), glassY);
  if (r < 4.5) fail(`${name} falls to ${r.toFixed(2)}:1 on the dock glass (needs 4.5:1)`);
  else console.log(`  ${name}: at least ${r.toFixed(2)}:1 on the dock glass`);
}
// Phase accents mark things; they need 3:1 against paper as non-text color.
for (const [k, c] of Object.entries(color.phases)) {
  const r = contrast(luminance(c as Oklch), paperY);
  if (r < 3) fail(`phase ${k} is ${r.toFixed(2)}:1 against paper (needs 3:1)`);
}


// Motion: every follow names a spring that exists; reduced-motion only ever reduces.
for (const [k, v] of Object.entries(motion.follow)) if (!(v in motion.springs)) fail(`motion.follow.${k} names no spring`);

// Shatter: the count range is ordered and the camera can see the pre-shatter volume.
if (shatter.shardRange[0] >= shatter.shardRange[1]) fail("shatter.shardRange must be [low, high]");
if (shatter.preShatterDepth[1] >= shatter.camera.distance) fail("pre-shatter depth reaches past the camera");

// Sound: boards stay in tune with each other (ratios are octave-friendly multiples of 0.5),
// the delay never exceeds the modeled pedal's 600 ms on the longest board, levels stay under ceilings.
const longest = Math.max(...sound.boards.map((b) => b.cc));
for (const [k, ph] of Object.entries(sound.phases)) {
  if (ph.pedals.ccTime * longest > 0.6 + 1e-9) fail(`sound.phases.${k}: Carbon Copy time × ${longest} exceeds 600 ms`);
}
for (const b of sound.boards) for (const r of [b.fl, b.cc, b.jt]) if (Math.abs(r * 2 - Math.round(r * 2)) > 1e-9) fail(`sound board ${b.name}: ratio ${r} is not a multiple of 0.5`);
const w = Object.values(sound.modeWeights).reduce((s, x) => s + x, 0);
if (Math.abs(w - 1) > 1e-6) fail(`sound.modeWeights sum to ${w}, not 1`);
for (const m of Object.keys(sound.modeWeights)) if (!(m in sound.modes)) fail(`sound.modeWeights names unknown mode ${m}`);

console.log(`tokens: color, motion, shatter, sound and dock checked`);
if (problems) { console.error(`${problems} token problem(s)`); process.exit(1); }
