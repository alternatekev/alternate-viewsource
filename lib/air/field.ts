// doooomgaze: the ambient field, ported from prototypes/doooomgaze onto the token system.
//
// The source art is Voronoi-fractured on every load and is never seen whole. It never sits
// waiting, never answers the pointer, and moves only by data: the mood of the content nearest the
// middle of the screen, how the page is being read, the hour, and the music. Every value it shows
// chases its target on a critically damped spring, so nothing jumps.
//
// Colors, dynamics and timings come from tokens/; nothing here is a magic number that should be
// tuned. What is left in code is mechanism: geometry, the simulation, the GL plumbing.

import { toLinear, type Rgb } from "@/lib/color";
import { fieldPalette, motion, shatter } from "@/tokens";
import type { Linear, Signal } from "@/tokens/schema";

type Vec3 = [number, number, number];
type Shard = {
  start: number; n: number; x: number; y: number; z: number; angle: number; scale: number; alpha: number;
  alive: boolean; k: number; zf: number; spin: number; depth: number;
};
type Spring = { x: number; v: number };

export type FieldHandle = {
  setTimeOfDay(hour: number | null): void;
  setMusic(x: number, y: number, energy: number): void;
  subscribe(fn: (snapshot: Record<string, unknown>) => void): () => void;
  readonly numbers: Record<string, unknown>;
  readonly seed: number;
  readonly pattern: string;
  destroy(): void;
};

const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const sstep = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const mixv = (a: number[], b: number[], t: number) => a.map((v, i) => lerp(v, b[i], t));
function mulberry32(a: number) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function evaluate(lin: Linear, s: Record<Signal, number>, slow: number) {
  let v = lin.base ?? 0;
  for (const key in lin) {
    if (key === "base" || key === "slowed") continue;
    const coef = lin[key as Signal];
    if (coef) v += coef * s[key as Signal];
  }
  return lin.slowed ? v * slow : v;
}

const VS = `
precision highp float;
attribute vec2 aLocal; attribute vec2 aUV; attribute vec4 aRand; attribute vec4 aAxis;
attribute vec3 aPos; attribute vec3 aDyn;
uniform mat4 uPV; uniform float uGap;
varying vec2 vUV; varying vec3 vN; varying vec3 vPos; varying float vEdge; varying vec4 vRand; varying float vAlpha;
vec3 rot(vec3 v, vec3 k, float a){ float c = cos(a), s = sin(a); return v*c + cross(k, v)*s + k*dot(k, v)*(1.0 - c); }
void main(){
  vec3 k = normalize(aAxis.xyz);
  vec3 p = rot(vec3(aLocal*(1.0 - uGap)*aDyn.y, 0.0), k, aDyn.x);
  vN = rot(vec3(0.0, 0.0, 1.0), k, aDyn.x);
  vPos = aPos + p; vUV = aUV; vEdge = aAxis.w; vRand = aRand; vAlpha = aDyn.z;
  gl_Position = uPV * vec4(vPos, 1.0);
}`;
// Colors arrive in linear light and are lit there; the last step encodes to sRGB.
const ENCODE = `vec3 encode(vec3 c){ c = max(c, 0.0); return mix(12.92*c, 1.055*pow(c, vec3(1.0/2.4)) - 0.055, step(0.0031308, c)); }`;
const fragment = (deriv: boolean) => (deriv ? "#extension GL_OES_standard_derivatives : enable\n#define HAS_D\n" : "") + `
precision highp float;
uniform sampler2D uTex; uniform vec3 uCam, uColA, uColB, uCrack, uBg, uLight;
uniform float uRim, uOpacity, uOpVar, uDof, uFocal, uKeyI, uSpec, uExposure;
varying vec2 vUV; varying vec3 vN; varying vec3 vPos; varying float vEdge; varying vec4 vRand; varying float vAlpha;
${ENCODE}
void main(){
  float l = texture2D(uTex, vUV).r;
  vec3 base = mix(uColB, uColA, clamp(l*0.9 + (vRand.x - 0.5)*0.4, 0.0, 1.0));
  vec3 n = normalize(vN); bool back = !gl_FrontFacing; if (back) n = -n;
  vec3 L = normalize(uLight), V = normalize(uCam - vPos);
  float diff = max(dot(n, L), 0.0);
  float spec = pow(max(dot(n, normalize(L + V)), 0.0), 64.0);
  float fres = pow(1.0 - abs(dot(n, V)), 3.0);
  vec3 col = base*(0.22 + 0.85*diff*uKeyI) + vec3(spec*uSpec*0.6) + uColA*fres*0.35;
  if (back) col = mix(col*0.45, uColB, 0.35);
#ifdef HAS_D
  float rim = 1.0 - smoothstep(0.0, 1.8, vEdge / max(fwidth(vEdge), 1e-5));
#else
  float rim = 1.0 - smoothstep(0.0, 0.05, vEdge);
#endif
  col = mix(col, uCrack*1.1, rim*uRim);
  float off = clamp(abs(length(uCam - vPos) - uFocal) * uDof, 0.0, 1.0);
  col = mix(col, uBg, off*0.6);
  col *= uExposure;
  float alpha = uOpacity * mix(1.0, 0.3 + 0.7*vRand.y, uOpVar);
  alpha = mix(alpha, 1.0, fres*0.5);
  alpha = max(alpha, rim*uRim*0.85);
  alpha *= (1.0 - off*0.65) * vAlpha;
  gl_FragColor = vec4(encode(col), alpha);
}`;
const BG_VS = `attribute vec2 p; varying vec2 v; void main(){ v = p; gl_Position = vec4(p, 0.999, 1.0); }`;
const BG_FS = `precision mediump float; varying vec2 v; uniform vec3 uBg; uniform float uVig;
${ENCODE}
void main(){ float vig = 1.0 - smoothstep(0.1, 1.7 - uVig*0.6, length(v*vec2(1.0, 0.85))); gl_FragColor = vec4(encode(mix(uBg*(0.6 - uVig*0.35), uBg*1.35 + 0.001, vig)), 1.0); }`;
const VIG_FS = `precision mediump float; varying vec2 v; uniform float uVig;
void main(){ float d = length(v*vec2(1.0, 0.8)); gl_FragColor = vec4(0.0, 0.0, 0.0, smoothstep(0.55, 1.5, d) * uVig * 0.75); }`;

/**
 * Starts the field on a canvas. Returns null when the browser gives no WebGL context; the page
 * is complete without it. Reader signals are read from elements carrying data-valence and
 * data-arousal (and optionally data-x, data-y), which the content's mood frontmatter writes.
 */
export function createField(canvas: HTMLCanvasElement, opts: { seed?: number; simulateMusic?: boolean } = {}): FieldHandle | null {
  const gl = canvas.getContext("webgl", { antialias: true, alpha: false, premultipliedAlpha: false });
  if (!gl) return null;
  const deriv = !!gl.getExtension("OES_standard_derivatives");
  const uint32 = !!gl.getExtension("OES_element_index_uint");

  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const R = motion.reduced;
  const cam = shatter.camera;
  const D = shatter.dynamics;

  // ---------- world ----------
  let W = 8, H = 4.5, cssW = 1, cssH = 1, dpr = 1;
  function sizeWorld() {
    cssW = Math.max(1, innerWidth); cssH = Math.max(1, innerHeight); dpr = Math.min(1.75, devicePixelRatio || 1);
    H = 2 * cam.distance * Math.tan(cam.fov / 2) * cam.overscan; W = (H * cssW) / cssH;
  }
  sizeWorld();

  // ---------- this visit's shatter ----------
  const seed = opts.seed ?? 1 + Math.floor(Math.random() * 99990);
  const rnd = mulberry32(seed);
  const pattern = shatter.patterns[Math.floor(rnd() * shatter.patterns.length)];
  const loadPoint: [number, number] = [(rnd() - 0.5) * 0.7, (rnd() - 0.5) * 0.7];
  const pool = Math.round(clamp(W * H * shatter.shardsPerUnit, shatter.shardRange[0], shatter.shardRange[1]));

  // ---------- source art (placeholder) ----------
  const TEXW = 2048, TEXH = 1152;
  const tex = document.createElement("canvas"); tex.width = TEXW; tex.height = TEXH;
  {
    const c = tex.getContext("2d")!;
    const g = c.createLinearGradient(0, 0, TEXW, TEXH);
    for (const [at, light] of shatter.source.stops) { const v = Math.round(light * 255); g.addColorStop(at, `rgb(${v},${v},${v})`); }
    c.fillStyle = g; c.fillRect(0, 0, TEXW, TEXH);
    const r = mulberry32(11);
    c.globalAlpha = 0.07; c.fillStyle = "#000"; for (let y = 0; y < TEXH; y += 2) if (r() < 0.45) c.fillRect(0, y, TEXW, 1);
    c.globalAlpha = 0.05; c.fillStyle = "#fff"; for (let i = 0; i < 9; i++) c.fillRect(r() * TEXW, 0, 2 + r() * 40, TEXH);
  }

  // ---------- Voronoi fracture ----------
  type P = [number, number];
  function genSites(n: number, [ix, iy]: P) {
    const pts: P[] = [], maxR = Math.hypot(W, H) * 0.75;
    const inRect = (x: number, y: number) => Math.abs(x) < W / 2 && Math.abs(y) < H / 2;
    if (pattern === "glass") for (let i = 0; i < n; i++) pts.push([(rnd() - 0.5) * W, (rnd() - 0.5) * H]);
    else if (pattern === "splinter") {
      const rays = Math.max(9, Math.round(n / 10)); let guard = 0;
      while (pts.length < n && guard++ < 80) for (let k = 0; k < rays && pts.length < n; k++) {
        const a0 = (k / rays) * Math.PI * 2 + (rnd() - 0.5) * 0.5 + guard * 0.37; let r = 0.04 + rnd() * 0.08;
        while (r < maxR && pts.length < n) { const a = a0 + (rnd() - 0.5) * 0.08, x = ix + Math.cos(a) * r, y = iy + Math.sin(a) * r; if (inRect(x, y)) pts.push([x, y]); r = r * (1.2 + rnd() * 0.4) + 0.03; }
      }
    } else {
      let guard = 0;
      while (pts.length < n && guard++ < n * 20) {
        let x: number, y: number;
        if (rnd() < 0.22) { x = (rnd() - 0.5) * W; y = (rnd() - 0.5) * H; }
        else { const r = maxR * Math.pow(rnd(), 1.9), a = rnd() * Math.PI * 2; x = ix + Math.cos(a) * r; y = iy + Math.sin(a) * r; }
        if (inRect(x, y)) pts.push([x, y]);
      }
    }
    return pts;
  }
  function clip(poly: P[], s: P, q: P) {
    const nx = q[0] - s[0], ny = q[1] - s[1], mx = (s[0] + q[0]) / 2, my = (s[1] + q[1]) / 2, out: P[] = [];
    for (let k = 0; k < poly.length; k++) {
      const a = poly[k], b = poly[(k + 1) % poly.length];
      const fa = (a[0] - mx) * nx + (a[1] - my) * ny, fb = (b[0] - mx) * nx + (b[1] - my) * ny;
      if (fa <= 0) out.push(a);
      if (fa <= 0 !== fb <= 0) { const t = fa / (fa - fb); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
    }
    return out;
  }
  const shards: Shard[] = [], staticData: number[] = [];
  {
    const pts = genSites(pool, [loadPoint[0] * W, loadPoint[1] * H]);
    const rect: P[] = [[-W / 2, -H / 2], [W / 2, -H / 2], [W / 2, H / 2], [-W / 2, H / 2]];
    const idx = pts.map((_, j) => j);
    for (let i = 0; i < pts.length; i++) {
      const s = pts[i];
      const d2 = (j: number) => (pts[j][0] - s[0]) ** 2 + (pts[j][1] - s[1]) ** 2;
      const order = idx.filter((j) => j !== i).sort((a, b) => d2(a) - d2(b));
      const reach = (p: P[]) => p.reduce((m, v) => Math.max(m, (v[0] - s[0]) ** 2 + (v[1] - s[1]) ** 2), 0);
      let poly = rect, R2 = reach(poly);
      for (const j of order) { if (d2(j) > 4 * R2) break; poly = clip(poly, s, pts[j]); if (poly.length < 3) break; R2 = reach(poly); }
      if (poly.length < 3) continue;
      let A = 0, cx = 0, cy = 0;
      for (let k = 0; k < poly.length; k++) { const a = poly[k], b = poly[(k + 1) % poly.length], cr = a[0] * b[1] - b[0] * a[1]; A += cr; cx += (a[0] + b[0]) * cr; cy += (a[1] + b[1]) * cr; }
      A *= 0.5; if (Math.abs(A) < 1e-7) continue; cx /= 6 * A; cy /= 6 * A;
      const r = [rnd(), rnd(), rnd(), rnd()];
      const ax = rnd() * 2 - 1, ay = rnd() * 2 - 1, az = (rnd() * 2 - 1) * 0.35, al = Math.hypot(ax, ay, az) || 1;
      const start = staticData.length / 12;
      const push = (x: number, y: number, e: number) => staticData.push(x - cx, y - cy, (x + W / 2) / W, (y + H / 2) / H, r[0], r[1], r[2], r[3], ax / al, ay / al, az / al, e);
      for (let k = 0; k < poly.length; k++) { const a = poly[k], b = poly[(k + 1) % poly.length]; push(cx, cy, 1); push(a[0], a[1], 0); push(b[0], b[1], 0); }
      shards.push({ start, n: poly.length * 3, x: 0, y: 0, z: 0, angle: 0, scale: 1, alpha: 1, alive: true,
        k: 0.55 + r[0] * 0.9, zf: (0.2 + r[1] * 1.1) * (r[3] < 0.72 ? 1 : -1), spin: (0.3 + r[2] * 1.4) * (r[0] < 0.5 ? -1 : 1), depth: 0 });
    }
  }
  const VERTS = staticData.length / 12;

  // ---------- reader signals: how the page is read, as data ----------
  const sig = { scrollSpeed: 0, linger: 0, opened: 0, select: 0, pause: 0, tension: 0 };
  const sm = motion.signals;
  let beats: HTMLElement[] = [];
  const dwell = new WeakMap<HTMLElement, number>();
  const refreshBeats = () => { beats = [...document.querySelectorAll<HTMLElement>("[data-valence]")]; };
  refreshBeats();
  const mo = new MutationObserver(refreshBeats);
  mo.observe(document.body, { childList: true, subtree: true });

  let lastActivity = performance.now(), openPoint: P | null = null, scrollPrev = scrollY, scrollDelta = 0, selectRaw = 0;
  const touch = () => { lastActivity = performance.now(); };
  const onScroll = () => { scrollDelta += scrollY - scrollPrev; scrollPrev = scrollY; touch(); };
  const onSelect = () => { const s = getSelection(); const txt = s ? String(s) : ""; selectRaw = txt.trim() ? clamp(txt.length / 140, 0.15, 1) : 0; touch(); };
  const onToggle = (e: Event) => {
    const d = e.target as HTMLDetailsElement;
    if (!(d instanceof HTMLDetailsElement)) return;
    touch();
    const r = d.getBoundingClientRect();
    const halfH = cam.distance * Math.tan(cam.fov / 2), halfW = (halfH * cssW) / cssH;
    openPoint = [((r.left + r.width / 2) / cssW * 2 - 1) * halfW, (1 - ((r.top + r.height / 2) / cssH) * 2) * halfH];
    sig.opened = Math.min(1.6, sig.opened + (d.open ? 1 : 0.35));
  };
  const activity = ["pointermove", "pointerdown", "keydown", "wheel", "touchstart"] as const;
  addEventListener("scroll", onScroll, { passive: true });
  activity.forEach((t) => addEventListener(t, touch, { passive: true }));
  document.addEventListener("selectionchange", onSelect);
  document.addEventListener("toggle", onToggle, true);

  const num = (el: HTMLElement, k: string, d = 0) => { const v = el.dataset[k]; return v == null ? d : +v; };
  function readerMood() {
    let wsum = 0, v = 0, a = 0, x = 0, y = 0, lin = 0;
    const mid = innerHeight / 2;
    for (const b of beats) {
      const r = b.getBoundingClientRect();
      const d = (r.top + r.height / 2 - mid) / innerHeight;
      let w = Math.exp(-(d * d) / 0.12);
      if (b.querySelector("details[open]")) w *= 2.5;
      wsum += w; v += w * num(b, "valence"); a += w * num(b, "arousal"); x += w * num(b, "x"); y += w * num(b, "y");
      lin += w * (1 - Math.exp(-(dwell.get(b) ?? 0) / sm.lingerSec));
    }
    if (wsum < 1e-4) return { v: 0.3, a: 0.2, x: 0, y: 0, lin: 0 };
    return { v: v / wsum, a: a / wsum, x: x / wsum, y: y / wsum, lin: lin / wsum };
  }
  function updateSignals(dt: number, now: number) {
    const speed = dt > 0 ? Math.abs(scrollDelta) / dt : 0;
    sig.scrollSpeed = lerp(sig.scrollSpeed, clamp(speed / 1400, 0, 1.6), Math.min(1, dt * sm.scrollFollowPerSec));
    const mid = innerHeight / 2;
    for (const b of beats) {
      const r = b.getBoundingClientRect();
      const centered = Math.abs(r.top + r.height / 2 - mid) < innerHeight * 0.28;
      const t = dwell.get(b) ?? 0;
      dwell.set(b, centered && sig.scrollSpeed < 0.15 && !document.hidden ? t + dt : Math.max(0, t - dt * 0.6));
    }
    sig.opened *= Math.exp(-dt / sm.openedDecaySec);
    sig.select = lerp(sig.select, selectRaw, Math.min(1, dt * sm.selectFollowPerSec));
    sig.pause = sstep(sm.pauseRampSec[0], sm.pauseRampSec[1], (now - lastActivity) / 1000);
    sig.tension = clamp(sig.tension + (sig.scrollSpeed * 0.35 + sig.opened * 0.12) * dt - (0.03 + 0.1 * sig.pause) * dt, 0, 1);
  }

  // ---------- hour, light, music ----------
  const input = { tod: null as number | null, music: { simulated: opts.simulateMusic ?? true, x: 0, y: 0, energy: 0 } };
  const hourNow = () => input.tod ?? new Date().getHours() + new Date().getMinutes() / 60;
  function keyLight(h: number): Vec3 {
    // the sun crosses east to west through the day; at night a cool, high, frontal moon
    const day = sstep(5.5, 7.5, h) * (1 - sstep(18.5, 20.5, h));
    const az = ((h - 6) / 12) * Math.PI, el = Math.max(0, Math.sin(az));
    const L = mixv([0.25, 0.8, 0.55], [-Math.cos(az) * 0.85, 0.25 + 0.6 * el, 0.6], day), n = Math.hypot(...L);
    return L.map((x) => x / n) as Vec3;
  }

  // ---------- targets: recomputed every frame from the signals and the tokens ----------
  const ms = shatter.moodShift, st = shatter.stillness;
  function targets(T: number) {
    const m = readerMood(), s = sig;
    const openedCapped = Math.min(1, s.opened);
    const v = clamp(m.v, -1, 1);
    const a = clamp(m.a + ms.tension * s.tension + ms.openedCapped * openedCapped + ms.pause * s.pause, 0, 1);
    const scrollFrac = clamp(scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight), 0, 1);
    if (input.music.simulated) {
      input.music.x = 0.4 * Math.sin(T * 0.071); input.music.y = 0.3 * Math.sin(T * 0.113 + 1.3);
      input.music.energy = 0.5 + 0.5 * Math.sin(T * 0.19) * Math.sin(T * 0.053 + 2);
    }
    const { energy, x: mx, y: my } = input.music;
    const S: Record<Signal, number> = {
      arousal: a, arousal2: a * a, calm: 1 - a, valence: v, negative: Math.max(0, -v), scroll: s.scrollSpeed, scrollFrac,
      opened: s.opened, openedCapped, linger: s.linger, select: s.select, pause: s.pause, tension: s.tension, energy, energyArousal: energy * a,
    };
    const slow = (1 - st.linger * s.linger) * (1 - st.select * s.select) * (1 - st.pause * s.pause);
    const e = (lin: Linear) => evaluate(lin, S, slow);

    let px = lerp(loadPoint[0], m.x, sstep(0.02, 0.2, scrollFrac)) * W + mx * 0.25 * W;
    let py = lerp(loadPoint[1], m.y, sstep(0.02, 0.2, scrollFrac)) * H + my * 0.25 * H;
    if (openPoint) { const o = openedCapped * 0.6; px = lerp(px, openPoint[0], o); py = lerp(py, openPoint[1], o); }

    const h = hourNow(), pal = fieldPalette(h, v, a);
    const t = {
      expand: e(D.expand), spinRate: e(D.spin), depth: e(D.depth), swirl: e(D.swirl), sink: e(D.sink), countFrac: clamp(e(D.count), 0, 1),
      pointX: px, pointY: py, gap: e(D.gap), rim: e(D.rim), opacity: e(D.opacity), opVar: e(D.opacityVariance),
      dolly: e(D.dolly), pitch: e(D.pitch), yaw: e(D.yaw), camX: px * 0.1, camY: py * 0.1,
      focusOff: e(D.focusOffset), dof: e(D.depthOfField), keyI: e(D.keyLight), spec: e(D.specular), exposure: e(D.exposure), vignette: e(D.vignette),
      light: keyLight(h) as number[],
      colA: toLinear(pal.light) as number[], colB: toLinear(pal.dark) as number[], crack: toLinear(pal.crack) as number[], bg: toLinear(pal.bg) as number[],
    };
    if (reduced) {
      t.expand *= R.expand; t.spinRate *= R.spin; t.swirl *= R.swirl;
      t.dolly = lerp(cam.distance, t.dolly, R.camera); t.camX *= R.camera; t.camY *= R.camera; t.pitch *= R.camera;
    }
    return t;
  }
  type Targets = ReturnType<typeof targets>;

  // ---------- springs ----------
  const F = motion.follow, SP = motion.springs;
  const followOf: Record<string, number> = {
    expand: SP[F.expand], spinRate: SP[F.spin], pointX: SP[F.point], pointY: SP[F.point], countFrac: SP[F.count],
    colA: SP[F.color], colB: SP[F.color], crack: SP[F.color], bg: SP[F.color],
    dolly: SP[F.dolly], pitch: SP[F.pitch], yaw: SP[F.yaw], camX: SP[F.camera], camY: SP[F.camera], light: SP[F.light],
    focusOff: SP[F.focus], dof: SP[F.depthOfField], keyI: SP[F.keyLight], spec: SP[F.specular], exposure: SP[F.exposure], vignette: SP[F.vignette],
  };
  const cur: Record<string, Spring | Spring[]> = {};
  function damp(s: Spring, target: number, dt: number, T: number) {
    const w = 2 / T, x = w * dt, ex = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
    const ch = s.x - target, tmp = (s.v + w * ch) * dt;
    s.v = (s.v - w * tmp) * ex; s.x = target + (ch + tmp) * ex;
  }
  function stepSprings(t: Targets, dt: number, snap: boolean) {
    for (const k in t) {
      const T = followOf[k] ?? SP.deliberate, target = t[k as keyof Targets];
      if (Array.isArray(target)) {
        const c = (cur[k] ??= target.map((x) => ({ x, v: 0 }))) as Spring[];
        c.forEach((s, i) => (snap ? (s.x = target[i]) : damp(s, target[i], dt, T)));
      } else {
        const c = (cur[k] ??= { x: target, v: 0 }) as Spring;
        if (snap) c.x = target; else damp(c, target, dt, T);
      }
    }
  }
  const val = (k: string) => (cur[k] as Spring).x;
  const col = (k: string) => (cur[k] as Spring[]).map((s) => s.x) as Rgb;

  // ---------- camera ----------
  const persp = (fy: number, a: number, n: number, f: number) => { const t = 1 / Math.tan(fy / 2); return [t / a, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) / (n - f), -1, 0, 0, (2 * f * n) / (n - f), 0]; };
  function lookAt(e: Vec3, c: Vec3, u: Vec3) {
    let z = [e[0] - c[0], e[1] - c[1], e[2] - c[2]]; let l = Math.hypot(...z); z = z.map((v) => v / l);
    let x = [u[1] * z[2] - u[2] * z[1], u[2] * z[0] - u[0] * z[2], u[0] * z[1] - u[1] * z[0]]; l = Math.hypot(...x); x = x.map((v) => v / l);
    const y = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]];
    const d = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    return [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -d(x, e), -d(y, e), -d(z, e), 1];
  }
  function mul(a: number[], b: number[]) { const o = new Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; }
  let PV: number[] = [], eye: Vec3 = [0, 0, cam.distance], fwd: Vec3 = [0, 0, -1];
  function computeCamera() {
    const d = val("dolly"), p = val("pitch"), yaw = val("yaw"), tx = val("camX"), ty = val("camY");
    eye = [tx + d * Math.sin(yaw) * Math.cos(p), ty + d * Math.sin(p), d * Math.cos(yaw) * Math.cos(p)];
    const f = [tx - eye[0], ty - eye[1], -eye[2]], fl = Math.hypot(...f); fwd = f.map((v) => v / fl) as Vec3;
    PV = mul(persp(cam.fov, cssW / cssH, 0.05, 80), lookAt(eye, [tx, ty, 0], [0, 1, 0]));
  }
  const ndc = (x: number, y: number, z: number) => {
    const cw = PV[3] * x + PV[7] * y + PV[11] * z + PV[15];
    return [(PV[0] * x + PV[4] * y + PV[8] * z + PV[12]) / cw, (PV[1] * x + PV[5] * y + PV[9] * z + PV[13]) / cw, cw];
  };

  // ---------- simulation: rates change, positions never jump ----------
  const srnd = mulberry32(seed ^ 0x5f3759df);
  function respawn(s: Shard) {
    const a = srnd() * Math.PI * 2, r = 0.05 + srnd() * 0.45;
    s.x = val("pointX") + Math.cos(a) * r; s.y = val("pointY") + Math.sin(a) * r * 0.8;
    s.z = (srnd() - 0.5) * 0.3; s.scale = 0.02; s.alpha = 0; s.alive = true;
  }
  function simulate(dt: number, parallaxDy: number) {
    const ex = val("expand"), sp = val("spinRate"), dp = val("depth"), sw = val("swirl"), sk = val("sink");
    const px = val("pointX"), py = val("pointY");
    const active = Math.round(val("countFrac") * shards.length);
    for (let i = 0; i < shards.length; i++) {
      const s = shards[i], want = i < active;
      if (!s.alive) { if (want) respawn(s); else continue; }
      const dx = s.x - px, dy = s.y - py, rate = ex * s.k;
      s.x += (dx * rate - dy * sw * s.k * 0.35) * dt;
      s.y += (dy * rate + dx * sw * s.k * 0.35 - sk) * dt + parallaxDy * (1 + s.z * 0.35);
      s.z += rate * s.zf * dp * 1.6 * dt;
      s.angle += s.spin * sp * dt;
      s.scale += (1 - s.scale) * Math.min(1, dt * 0.45);
      s.alpha += ((want ? 1 : 0) - s.alpha) * Math.min(1, dt * 0.5);
      const p = ndc(s.x, s.y, s.z);
      const gone = p[2] < 0.6 || Math.abs(p[0]) > 1.35 || Math.abs(p[1]) > 1.35 || s.z < -9;
      if (gone || (!want && s.alpha < 0.004)) { if (want) respawn(s); else s.alive = false; }
    }
  }

  // ---------- GL ----------
  function sh(type: number, src: string) { const s = gl!.createShader(type)!; gl!.shaderSource(s, src); gl!.compileShader(s); if (!gl!.getShaderParameter(s, gl!.COMPILE_STATUS)) throw new Error(gl!.getShaderInfoLog(s) ?? "shader"); return s; }
  function link(vs: string, fs: string) { const p = gl!.createProgram()!; gl!.attachShader(p, sh(gl!.VERTEX_SHADER, vs)); gl!.attachShader(p, sh(gl!.FRAGMENT_SHADER, fs)); gl!.linkProgram(p); if (!gl!.getProgramParameter(p, gl!.LINK_STATUS)) throw new Error(gl!.getProgramInfoLog(p) ?? "link"); return p; }
  const prog = link(VS, fragment(deriv)), bgProg = link(BG_VS, BG_FS), vigProg = link(BG_VS, VIG_FS);
  const U: Record<string, WebGLUniformLocation | null> = {}, A: Record<string, number> = {};
  ["uPV", "uGap", "uTex", "uCam", "uColA", "uColB", "uCrack", "uBg", "uLight", "uRim", "uOpacity", "uOpVar", "uDof", "uFocal", "uKeyI", "uSpec", "uExposure"].forEach((n) => (U[n] = gl.getUniformLocation(prog, n)));
  ["aLocal", "aUV", "aRand", "aAxis", "aPos", "aDyn"].forEach((n) => (A[n] = gl.getAttribLocation(prog, n)));
  const BU = { p: gl.getAttribLocation(bgProg, "p"), uBg: gl.getUniformLocation(bgProg, "uBg"), uVig: gl.getUniformLocation(bgProg, "uVig") };
  const VU = { p: gl.getAttribLocation(vigProg, "p"), uVig: gl.getUniformLocation(vigProg, "uVig") };
  const sBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, sBuf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(staticData), gl.STATIC_DRAW);
  const dynData = new Float32Array(VERTS * 6);
  const dBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, dBuf); gl.bufferData(gl.ARRAY_BUFFER, dynData.byteLength, gl.DYNAMIC_DRAW);
  const iBuf = gl.createBuffer();
  const bgBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, bgBuf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const glTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, glTex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tex);
  ([[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]] as const).forEach(([p, v]) => gl.texParameteri(gl.TEXTURE_2D, p, v));
  const idxData = VERTS > 65535 && uint32 ? new Uint32Array(VERTS) : new Uint16Array(VERTS);
  let idxCount = 0;

  function writeDynamic() {
    let i = 0;
    for (const s of shards) {
      s.depth = (s.x - eye[0]) * fwd[0] + (s.y - eye[1]) * fwd[1] + (s.z - eye[2]) * fwd[2];
      for (let k = 0; k < s.n; k++) {
        const o = (s.start + k) * 6;
        dynData[o] = s.x; dynData[o + 1] = s.y; dynData[o + 2] = s.z;
        dynData[o + 3] = s.angle; dynData[o + 4] = s.scale; dynData[o + 5] = s.alive ? s.alpha : 0;
      }
    }
    // back to front, so overlapping glass blends correctly
    const order = shards.filter((s) => s.alive && s.alpha > 0.003).sort((a, b) => b.depth - a.depth);
    for (const s of order) for (let k = 0; k < s.n; k++) idxData[i++] = s.start + k;
    idxCount = i;
  }
  function fullscreen(loc: number) {
    gl!.bindBuffer(gl!.ARRAY_BUFFER, bgBuf);
    gl!.enableVertexAttribArray(loc); gl!.vertexAttribPointer(loc, 2, gl!.FLOAT, false, 0, 0);
    gl!.drawArrays(gl!.TRIANGLES, 0, 3); gl!.disableVertexAttribArray(loc);
  }
  function render() {
    const g = gl!;
    g.viewport(0, 0, canvas.width, canvas.height);
    const bg = col("bg"), vig = val("vignette");
    g.disable(g.DEPTH_TEST); g.disable(g.BLEND);
    g.useProgram(bgProg); g.uniform3fv(BU.uBg, bg); g.uniform1f(BU.uVig, vig); fullscreen(BU.p);

    g.useProgram(prog);
    g.enable(g.BLEND); g.blendFunc(g.SRC_ALPHA, g.ONE_MINUS_SRC_ALPHA);
    g.bindBuffer(g.ARRAY_BUFFER, sBuf);
    ([["aLocal", 2, 0], ["aUV", 2, 2], ["aRand", 4, 4], ["aAxis", 4, 8]] as const).forEach(([n, sz, off]) => { g.enableVertexAttribArray(A[n]); g.vertexAttribPointer(A[n], sz, g.FLOAT, false, 48, off * 4); });
    g.bindBuffer(g.ARRAY_BUFFER, dBuf); g.bufferSubData(g.ARRAY_BUFFER, 0, dynData);
    ([["aPos", 3, 0], ["aDyn", 3, 3]] as const).forEach(([n, sz, off]) => { g.enableVertexAttribArray(A[n]); g.vertexAttribPointer(A[n], sz, g.FLOAT, false, 24, off * 4); });
    g.uniformMatrix4fv(U.uPV, false, new Float32Array(PV));
    g.uniform1f(U.uGap, val("gap")); g.uniform1f(U.uRim, val("rim")); g.uniform1f(U.uOpacity, val("opacity")); g.uniform1f(U.uOpVar, val("opVar"));
    g.uniform1f(U.uDof, val("dof")); g.uniform1f(U.uKeyI, val("keyI")); g.uniform1f(U.uSpec, val("spec")); g.uniform1f(U.uExposure, val("exposure"));
    g.uniform1f(U.uFocal, val("dolly") + val("focusOff"));
    g.uniform3fv(U.uCam, eye); g.uniform3fv(U.uLight, col("light"));
    g.uniform3fv(U.uColA, col("colA")); g.uniform3fv(U.uColB, col("colB")); g.uniform3fv(U.uCrack, col("crack")); g.uniform3fv(U.uBg, bg);
    g.activeTexture(g.TEXTURE0); g.bindTexture(g.TEXTURE_2D, glTex); g.uniform1i(U.uTex, 0);
    g.bindBuffer(g.ELEMENT_ARRAY_BUFFER, iBuf); g.bufferData(g.ELEMENT_ARRAY_BUFFER, idxData.subarray(0, idxCount), g.DYNAMIC_DRAW);
    g.drawElements(g.TRIANGLES, idxCount, idxData instanceof Uint32Array ? g.UNSIGNED_INT : g.UNSIGNED_SHORT, 0);
    Object.values(A).forEach((l) => g.disableVertexAttribArray(l));

    g.useProgram(vigProg); g.uniform1f(VU.uVig, vig); fullscreen(VU.p);
  }
  function resize() { sizeWorld(); canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr); }

  // ---------- frame ----------
  let last = performance.now(), raf = 0, running = true;
  const T0 = last;
  const listeners = new Set<(s: Record<string, unknown>) => void>();
  function snapshot() {
    const o: Record<string, unknown> = { signals: { ...sig } };
    for (const k in cur) { const c = cur[k]; o[k] = Array.isArray(c) ? c.map((s) => +s.x.toFixed(3)) : +c.x.toFixed(3); }
    return o;
  }
  const camH = 2 * cam.distance * Math.tan(cam.fov / 2);
  function frame(now: number) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    updateSignals(dt, now);
    const delta = scrollDelta; scrollDelta = 0;
    const t = targets((now - T0) / 1000);
    stepSprings(t, dt, false);
    computeCamera();
    simulate(dt, (reduced ? R.parallax : 1) * (delta / cssH) * camH * 0.28);
    writeDynamic(); render();
    if (listeners.size) { const snap = snapshot(); listeners.forEach((fn) => { try { fn(snap); } catch (err) { console.error(err); } }); }
    raf = requestAnimationFrame(frame);
  }
  const onVisibility = () => { if (document.hidden) { cancelAnimationFrame(raf); } else { last = performance.now(); raf = requestAnimationFrame(frame); } };
  document.addEventListener("visibilitychange", onVisibility);
  addEventListener("resize", resize);

  // ---------- boot ----------
  resize();
  updateSignals(0, performance.now());
  stepSprings(targets(0), 0, true);
  computeCamera();
  {
    // pre-shattered: the art is never seen whole; every shard starts somewhere in the visible volume
    const r = mulberry32(seed ^ 0x9e3779b9), aspect = cssW / cssH, [zNear, zFar] = shatter.preShatterDepth;
    for (const s of shards) {
      s.z = zNear + r() * (zFar - zNear);
      const halfH = (cam.distance - s.z) * Math.tan(cam.fov / 2) * 1.1, halfW = halfH * aspect;
      s.x = (r() * 2 - 1) * halfW; s.y = (r() * 2 - 1) * halfH; s.angle = r() * Math.PI * 2;
    }
  }
  raf = requestAnimationFrame(frame);

  return {
    setTimeOfDay(h) { input.tod = h == null ? null : ((h % 24) + 24) % 24; },
    setMusic(x, y, energy) { input.music.simulated = false; Object.assign(input.music, { x, y, energy }); },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    get numbers() { return snapshot(); },
    seed, pattern,
    destroy() {
      running = false; cancelAnimationFrame(raf); mo.disconnect();
      removeEventListener("scroll", onScroll); activity.forEach((t) => removeEventListener(t, touch));
      document.removeEventListener("selectionchange", onSelect); document.removeEventListener("toggle", onToggle, true);
      document.removeEventListener("visibilitychange", onVisibility); removeEventListener("resize", resize);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
