// OKLCH, the space the tokens are authored in, and the conversions out of it.
// OKLCH is perceptually even: a blend halfway between two colors looks halfway, with no muddy
// or over-bright middle, which matters because the field is always blending moods and hours.
// Math: Björn Ottosson, "A perceptual color space for image processing" (2020).

export type Oklch = readonly [l: number, c: number, h: number];
export type Rgb = [number, number, number];

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

export function oklchToOklab([l, c, h]: Oklch): Rgb {
  const r = (h * Math.PI) / 180;
  return [l, c * Math.cos(r), c * Math.sin(r)];
}

export function oklabToLinear([L, a, b]: Rgb): Rgb {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    clamp01(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    clamp01(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    clamp01(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

/** Linear-light sRGB, what the shaders light in. */
export const toLinear = (c: Oklch): Rgb => oklabToLinear(oklchToOklab(c));

const encode = (x: number) => (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055);
/** Gamma-encoded sRGB, 0..1. */
export const toSrgb = (c: Oklch): Rgb => toLinear(c).map(encode) as Rgb;

export function toCss([l, c, h]: Oklch, alpha = 1): string {
  const f = (x: number, d: number) => +x.toFixed(d);
  return alpha < 1 ? `oklch(${f(l, 3)} ${f(c, 3)} ${f(h, 1)} / ${f(alpha, 3)})` : `oklch(${f(l, 3)} ${f(c, 3)} ${f(h, 1)})`;
}

/** Relative luminance (WCAG) of a color, from its linear-light value. */
export function luminance(c: Oklch): number {
  const [r, g, b] = toLinear(c);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export const contrast = (y1: number, y2: number) => (Math.max(y1, y2) + 0.05) / (Math.min(y1, y2) + 0.05);

/** Blend two OKLCH colors, hue along the shorter arc. An achromatic end takes the other's hue. */
export function mix(a: Oklch, b: Oklch, t: number): Oklch {
  let ha = a[2], hb = b[2];
  if (a[1] < 0.002) ha = hb;
  if (b[1] < 0.002) hb = ha;
  const dh = ((hb - ha + 540) % 360) - 180;
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, (ha + dh * t + 360) % 360];
}

/** Blend two OKLCH colors through OKLab: the middle desaturates instead of sweeping through other hues. */
export function mixLab(a: Oklch, b: Oklch, t: number): Oklch {
  const A = oklchToOklab(a), B = oklchToOklab(b);
  const L = A[0] + (B[0] - A[0]) * t, x = A[1] + (B[1] - A[1]) * t, y = A[2] + (B[2] - A[2]) * t;
  return [L, Math.hypot(x, y), ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360];
}
