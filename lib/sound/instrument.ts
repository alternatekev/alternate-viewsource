// dooombient: the instrument, ported from prototypes/dooombient onto the sound tokens.
//
// Chords from bright modes bloom slowly through three pedalboards (Flanger → Carbon Copy →
// Infinite Jets → Fathom, modeled in public/sound/pedals.js), over an amp drone that breathes.
// Where the reader is on the spine picks the pedals: each phase has its own settings and they blend
// between phases. A jump through time surges the boards. Until the timeline scrubs, scrolling
// stands in for it, as it does for the field's color.
//
// Every musical value comes from tokens/sound.ts. What is here is mechanism.

import { timePlace } from "@/lib/time";
import { sound as S } from "@/tokens/sound";

type Pedals = (typeof S.phases)["dialup"]["pedals"];
type PhaseKey = keyof typeof S.phases;
const PHASES = Object.keys(S.phases) as PhaseKey[];

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, f: number) => a + (b - a) * f;
const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
function mulberry32(a: number) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** where on the spine, 0 at the first phase to 1 at the last; the index is fractional */
const phaseAt = (place: number) => clamp(place, 0, 1) * (PHASES.length - 1);
function pedalsAt(place: number): Pedals {
  const f = phaseAt(place), i = Math.min(PHASES.length - 2, Math.floor(f)), t = f - i, s = t * t * (3 - 2 * t);
  const a = S.phases[PHASES[i]].pedals, b = S.phases[PHASES[i + 1]].pedals, o = {} as Pedals;
  for (const k in a) o[k as keyof Pedals] = lerp(a[k as keyof Pedals], b[k as keyof Pedals], s);
  return o;
}
const phaseOf = (place: number) => S.phases[PHASES[Math.round(phaseAt(place))]];
/** a phase is worth this many years when the surge measures a jump */
const YEARS_PER_SPINE = 28;

export type Instrument = {
  readonly analyser: AnalyserNode;
  setOn(on: boolean): void;
  /** a new composition: new key and mode, the old chord fading out */
  reset(): void;
  /** the music as the field reads it: x, y in about [-0.5, 0.5], energy in [0, 1] */
  readonly music: { x: number; y: number; energy: number };
  destroy(): void;
};

export async function createInstrument(ac: AudioContext, workletUrl: string): Promise<Instrument> {
  if (!ac.audioWorklet) throw new Error("no-worklet");
  await ac.audioWorklet.addModule(workletUrl);

  // ---------- the composition for this visit ----------
  const r = mulberry32((Date.now() ^ (Math.random() * 1e9)) >>> 0);
  const now = new Date();
  const hour = now.getHours() + now.getMinutes() / 60;
  const doy = Math.floor((+now - +new Date(now.getFullYear(), 0, 0)) / 864e5);
  const daylight = 0.5 - 0.5 * Math.cos((hour / 24) * Math.PI * 2);
  const modes = Object.keys(S.modeWeights);
  const pickMode = () => { let x = r(); for (const m of modes) { x -= S.modeWeights[m as keyof typeof S.modeWeights]; if (x < 0) return m; } return modes[0]; };
  const lo = S.register.lowestRoot, hi = S.register.highestRoot;
  const compose = () => ({
    mode: pickMode(), root: lo + ((doy + Math.floor(r() * 12)) % 12), deg: 0, pendingExplore: false,
    driftEvery: S.drift.everyChords[0] + Math.floor(r() * (S.drift.everyChords[1] - S.drift.everyChords[0] + 1)),
  });
  const comp = compose();
  let scale = S.modes[comp.mode as keyof typeof S.modes];

  // ---------- the boards ----------
  // everything sums at full level into a leveler, and only then meets the (very low) volume, so the
  // leveler actually holds a surge down instead of sitting idle below its threshold
  const sum = ac.createGain();
  const master = ac.createGain(); master.gain.value = 0;
  const dyn = ac.createDynamicsCompressor();
  const LV = S.leveler;
  dyn.threshold.value = LV.thresholdDb; dyn.knee.value = LV.kneeDb; dyn.ratio.value = LV.ratio; dyn.attack.value = LV.attackSec; dyn.release.value = LV.releaseSec;
  const analyser = ac.createAnalyser(); analyser.fftSize = 1024;
  sum.connect(dyn); dyn.connect(master); master.connect(analyser); analyser.connect(ac.destination);
  const W = (name: string, opts: AudioWorkletNodeOptions = {}) => new AudioWorkletNode(ac, name, { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1], ...opts });
  const bus = ac.createGain(); bus.gain.value = 0.5; bus.connect(sum); // dry path kept low: the reverbs lead
  type Layer = { inp: BiquadFilterNode; fl: AudioWorkletNode; cc: AudioWorkletNode; jt: AudioWorkletNode; fa: AudioWorkletNode; send: GainNode; last: Record<string, Record<string, number | string>> };
  const layers: Layer[] = S.boards.map((B) => {
    const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.Q.value = 0.5; lp.frequency.value = 1000;
    const fl = W("flanger"), cc = W("carbon-copy"), jt = W("infinite-jets"), fa = W("fathom", { outputChannelCount: [2] });
    const send = ac.createGain(), faOut = ac.createGain(); faOut.gain.value = 1.2;
    lp.connect(fl); fl.connect(cc); cc.connect(jt); jt.connect(bus); jt.connect(send); send.connect(fa); fa.connect(faOut); faOut.connect(sum);
    fa.port.postMessage({ mix: 1, mod: 8 });
    jt.port.postMessage(B.jets);
    return { inp: lp, fl, cc, jt, fa, send, last: {} };
  });
  // send only what changed, so the worklets aren't flooded
  function post(L: Layer, node: AudioWorkletNode, key: string, msg: Record<string, number | string>) {
    const prev = (L.last[key] ??= {}), out: Record<string, number | string> = {};
    let any = false;
    for (const k in msg) {
      const v = msg[k], p = prev[k];
      if (p === undefined || (typeof v === "number" ? Math.abs(v - (p as number)) > Math.abs(p as number) * 0.004 + 1e-6 : v !== p)) { out[k] = v; any = true; }
    }
    if (any) { node.port.postMessage(out); Object.assign(prev, out); }
  }

  // ---------- the amp drone: root, fifth, octave through a dark, cranked amp ----------
  const drone = (() => {
    const g = ac.createGain(), pre = ac.createGain(), sh = ac.createWaveShaper(), body = ac.createBiquadFilter(), cab = ac.createBiquadFilter();
    const c = new Float32Array(2048);
    for (let i = 0; i < 2048; i++) { const x = (i / 2047) * 2 - 1; c[i] = Math.tanh(x * 3.5) * 0.8 + Math.tanh(x * 1.2) * 0.2; }
    sh.curve = c; sh.oversample = "4x"; pre.gain.value = 1.4;
    body.type = "peaking"; body.frequency.value = 120; body.gain.value = 4; body.Q.value = 0.8;
    cab.type = "lowpass"; cab.frequency.value = 1400; cab.Q.value = 0.9;
    const oscs = ([[0, -4], [0, 5], [7, -2], [12, 3]] as const).map(([iv, det]) => {
      const o = ac.createOscillator(); o.type = "sawtooth"; o.frequency.value = mtof(comp.root + iv); o.detune.value = det;
      o.connect(pre); o.start(); return { o, iv };
    });
    pre.connect(sh); sh.connect(body); body.connect(cab); cab.connect(g);
    g.gain.value = 0; g.connect(layers[0].inp);
    return { g, oscs };
  })();
  const retune = () => drone.oscs.forEach((x) => x.o.frequency.setTargetAtTime(mtof(comp.root + x.iv), ac.currentTime, 3));

  // ---------- harmony ----------
  const scaleAt = (d: number) => { const L = scale.length; return scale[((d % L) + L) % L] + 12 * Math.floor(d / L); };
  const iv = (d: number, n: number) => (((scaleAt(d + n) - scaleAt(d)) % 12) + 12) % 12;
  const quality = (d: number) => (iv(d, 4) === 6 ? "dim" : iv(d, 2) === 3 ? "min" : "maj");
  type Voice = { midi: number; role: "bass" | "mid" | "top"; t: number; att: number; rel: number; end: number; lvl: number; nodes?: { g: GainNode; os: OscillatorNode[] } };
  const voices: Voice[] = [];
  const layerOf = (role: Voice["role"]) => (role === "bass" ? 0 : role === "mid" ? 1 : 2);
  let chordCount = 0, nextChordAt = 0, nextSwell = 0;

  // the home key drifts one step around the circle of fifths now and then; a big leap in time takes it there at once
  const NEIGHBOR: Record<string, string[]> = { lydian: ["ionian"], ionian: ["lydian", "mixolydian"], mixolydian: ["ionian"] };
  function explore() {
    if (r() < 0.35) { const m = NEIGHBOR[comp.mode] ?? [comp.mode]; comp.mode = m[Math.floor(r() * m.length)]; scale = S.modes[comp.mode as keyof typeof S.modes]; }
    else { comp.root += r() < 0.5 ? 7 : -7; while (comp.root > hi) comp.root -= 12; while (comp.root < lo) comp.root += 12; }
    comp.deg = 0; retune();
  }
  function startVoice(v: Voice) {
    const voice = phaseOf(place).voice;
    const g = ac.createGain(), lvl = v.lvl * voice.loud;
    g.gain.setValueAtTime(0, v.t); g.gain.linearRampToValueAtTime(lvl, v.t + v.att);
    const a = ac.createOscillator(), b = ac.createOscillator(), c = ac.createOscillator(), cg = ac.createGain(), lp = ac.createBiquadFilter();
    a.type = voice.wave; b.type = "triangle"; c.type = "sawtooth";
    a.frequency.value = b.frequency.value = c.frequency.value = mtof(v.midi); a.detune.value = -3; b.detune.value = 3; c.detune.value = 7; cg.gain.value = 0.45;
    lp.type = "lowpass"; lp.Q.value = 0.7;
    lp.frequency.setValueAtTime(300, v.t); lp.frequency.linearRampToValueAtTime(1100 + (v.midi - 40) * 15, v.t + v.att * 1.3);
    a.connect(lp); b.connect(lp); c.connect(cg); cg.connect(lp); lp.connect(g); g.connect(layers[layerOf(v.role)].inp);
    [a, b, c].forEach((o) => o.start(v.t));
    v.nodes = { g, os: [a, b, c] };
  }
  function releaseVoice(v: Voice, t: number, rel: number) {
    if (!v.nodes) return;
    v.nodes.g.gain.cancelScheduledValues(t); v.nodes.g.gain.setTargetAtTime(0, t, rel / 4);
    v.nodes.os.forEach((o) => o.stop(t + rel + 0.2));
  }
  function changeChord(t: number, att: number) {
    chordCount++;
    let explored = false;
    if (comp.pendingExplore || chordCount % comp.driftEvery === 0) { explore(); comp.pendingExplore = false; explored = true; }
    const L = scale.length, moves = [1, -1, 1, -1, 2, -2, 3, -3, 4];
    let d = comp.deg;
    // the first chord in a new key is its home chord; now and then the old one rubs against it as it fades
    const pivot = explored && r() > S.drift.dissonance;
    for (let k = 0; !pivot && k < 10; k++) {
      d = (((comp.deg + moves[Math.floor(r() * moves.length)]) % L) + L) % L;
      const q = quality(d);
      if (q === "maj" || (q === "min" && r() < 0.35)) break; // minor chords are rare guests, diminished never
    }
    comp.deg = d;
    const v0 = S.voicings[Math.floor(r() * S.voicings.length)];
    const bassDeg = r() < 0.45 ? 0 : d; // sometimes hold the home note under a moving chord
    const notes: { midi: number; role: Voice["role"] }[] = [{ midi: comp.root + 12 + scaleAt(bassDeg), role: "bass" as const }, ...(
      v0.steps.map((st, i) => ({ midi: comp.root + 24 + scaleAt(d + st), role: i === v0.steps.length - 1 ? ("top" as const) : ("mid" as const) })))];
    const rel = att * 1.5;
    voices.forEach((v) => { if (!v.end) { v.end = t; v.rel = rel; releaseVoice(v, t, rel); } });
    notes.forEach((n, i) => {
      const v: Voice = { midi: n.midi, role: n.role, t: t + i * att * 0.3, att, rel, end: 0, lvl: n.role === "bass" ? 0.07 : 0.045 };
      startVoice(v); voices.push(v); // the chord blooms note by note
    });
    layers.forEach((Ly, i) => setTimeout(() => Ly.jt.port.postMessage({ trig: 1 }), (att * 0.9 + i * 0.3) * 1000));
  }
  // feedback swells: a rare high chord tone that blooms slowly and hangs
  function swell(t: number) {
    const ups = voices.filter((v) => !v.end && v.role !== "bass");
    if (!ups.length) return;
    const midi = ups[Math.floor(r() * ups.length)].midi + 12;
    const g = ac.createGain(), o = ac.createOscillator(), o2 = ac.createOscillator();
    o.type = "sine"; o2.type = "triangle"; o.frequency.value = o2.frequency.value = mtof(midi); o2.detune.value = 4;
    const b = S.swells.bloomSec;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(S.swells.level, t + b); g.gain.setTargetAtTime(0, t + b + 1, 2.2);
    o.connect(g); o2.connect(g); g.connect(layers[2].inp); o.start(t); o2.start(t); o.stop(t + 18); o2.stop(t + 18);
  }

  // ---------- where the reader is, and the surge from jumping ----------
  const spinePlace = timePlace;
  let place = spinePlace(), rush = 0, on = false;
  const cur = pedalsAt(place);
  let lastT = performance.now();
  function follow() {
    const p = spinePlace(), jump = Math.abs(p - place) * YEARS_PER_SPINE;
    if (jump < 1e-3) return;
    const crossed = Math.round(phaseAt(p)) !== Math.round(phaseAt(place));
    place = p;
    rush = Math.min(1, rush + jump / S.surge.decadeIsFull);
    if (jump > S.surge.keyChangeYears) comp.pendingExplore = true;
    if (jump > 4 || crossed) nextChordAt = Math.min(nextChordAt, ac.currentTime + (jump > 4 ? 0 : 0.3));
  }

  // the music as the field reads it
  const music = { x: 0, y: 0, energy: 0 };
  const buf = new Float32Array(analyser.fftSize), spec = new Uint8Array(analyser.frequencyBinCount);
  function listen(dt: number) {
    analyser.getFloatTimeDomainData(buf);
    let sq = 0; for (let i = 0; i < buf.length; i++) sq += buf[i] * buf[i];
    const level = on ? clamp((Math.sqrt(sq / buf.length) * 8 * 0.9) / S.masterLevel, 0, 1) : 0; // as loud as it would be at the prototype's level
    analyser.getByteFrequencyData(spec);
    let w = 0, c = 0; for (let i = 1; i < spec.length; i++) { w += spec[i]; c += spec[i] * i; }
    const centroid = w > 0 ? c / w / spec.length : 0.1;
    const k = 1 - Math.exp(-dt / 0.6);
    music.energy = lerp(music.energy, level, k);
    music.x = lerp(music.x, on ? clamp((centroid - 0.08) * 6, -0.5, 0.5) : 0, k * 0.3);
    music.y = lerp(music.y, on ? rush - 0.3 : 0, k * 0.3);
  }

  // ---------- the control loop: where the reader is drives the pedals ----------
  function control() {
    const nowMs = performance.now(), dt = Math.min(0.25, (nowMs - lastT) / 1000); lastT = nowMs;
    const t = ac.currentTime, beat = 60 / S.bpm;
    follow();
    rush *= Math.exp(-dt / S.surge.decaySec);

    const tgt = pedalsAt(place);
    // at rest the swirl is held back; a jump through time lets it all the way in
    const calm = S.calmAtRest + (1 - S.calmAtRest) * rush;
    tgt.flMix *= calm; tgt.flFb *= 0.6 + 0.4 * rush; tgt.flRate *= 0.7 + 0.3 * rush;
    tgt.ccMod *= 0.4 + 0.6 * rush; tgt.jtMix *= calm;
    tgt.flRate *= 1 + rush * 3;
    tgt.flFb = Math.min(0.85, tgt.flFb + rush * 0.3);
    tgt.ccFb = Math.min(0.9, tgt.ccFb + rush * S.surge.feedback);
    tgt.ccTime *= 1 - rush * 0.35; // a quick leap bends the delay like a tape stop
    tgt.jtRate *= 1 + rush * 3;
    tgt.faMix = Math.min(1, tgt.faMix + rush * S.surge.reverb);
    tgt.cut = tgt.cut * (0.6 + daylight * 0.4) + rush * S.surge.brightness;
    // slow drift at rest, snappy after a big jump
    const k = 1 - Math.exp(-dt * (0.35 + rush * 7));
    for (const key in cur) cur[key as keyof Pedals] = lerp(cur[key as keyof Pedals], tgt[key as keyof Pedals], k);

    if (on) {
      if (t >= nextChordAt) {
        // a surge quickens the chords, but never into hard attacks or a pile of overlapping voices
        const att = S.surge.attackFloor + (3.95 - S.surge.attackFloor) * (1 - Math.min(1, rush * 1.2));
        changeChord(t + 0.03, att);
        nextChordAt = t + beat * 8 * (1 - rush * S.surge.quicken) * (0.85 + r() * 0.4);
      }
      if (t >= nextSwell) { swell(t + 0.02); nextSwell = t + (S.swells.everySec[0] + r() * (S.swells.everySec[1] - S.swells.everySec[0])) * (1 - rush * 0.6); }
      const breath = 0.55 + 0.45 * Math.sin((t * Math.PI * 2) / (beat * S.drone.breathBeats));
      drone.g.gain.setTargetAtTime(S.drone.level * breath + rush * S.drone.surgeLevel, t, 0.5);
    }
    for (let i = voices.length - 1; i >= 0; i--) if (voices[i].end && t > voices[i].end + voices[i].rel * 2) voices.splice(i, 1);

    const ph = phaseOf(place), mode = ph.fathom;
    const rt60 = (size: number) => 2.2 + Math.min(1, cur.faSize * size) * 9;
    S.boards.forEach((B, i) => {
      const L = layers[i], jtMix = cur.jtMix * B.jtMix;
      L.inp.frequency.setTargetAtTime(Math.min(9000, cur.cut * B.tone), t, 0.1);
      post(L, L.fl, "fl", { mix: cur.flMix, rate: cur.flRate * B.fl, width: cur.flDepth, regen: cur.flFb });
      post(L, L.cc, "cc", { time: Math.min(0.6, cur.ccTime * B.cc), regen: cur.ccFb, mix: cur.ccMix * B.ccMix, width: cur.ccMod, rate: 0.45 * B.fl, slew: 0.15 + rush * 0.2 });
      post(L, L.jt, "jt", { dry: 1 - jtMix * 0.5, rate: (cur.jtRate * B.jt) / (2 * beat), envTime: beat * 4, dimension: Math.min(1, B.dim + rush * 0.45),
        drive: 0.12 + ph.voice.drive + rush * 0.3, tone: 2500 + cur.faTone });
      post(L, L.fa, "fa", { mode, decay: rt60(B.size), damp: cur.faTone * B.tone, sustain: rush > S.surge.freezeAt ? 1 : 0,
        x: mode === "sonar" ? B.sonar : mode === "lofi" ? 0.35 * B.size : 0.2 * B.pre,
        scale: 0.6 + cur.faSize * B.size * 0.9, mod: (mode === "sonar" ? 3 : 5) + rush * 20, shim: 0.16 + rush * 0.25 });
      L.send.gain.setTargetAtTime(cur.faMix, t, 0.2);
    });
    // the master ducks under a surge, so a jump reads as motion, not volume
    if (on) master.gain.setTargetAtTime(S.masterLevel * (1 - S.surge.duck * rush), t, 0.15);
    listen(dt);
  }
  const loop = window.setInterval(control, 40);
  const onVisibility = () => { if (document.hidden) void ac.suspend(); else if (on) void ac.resume(); };
  document.addEventListener("visibilitychange", onVisibility);

  return {
    analyser, music,
    reset() {
      Object.assign(comp, compose()); scale = S.modes[comp.mode as keyof typeof S.modes];
      const t = ac.currentTime;
      voices.forEach((v) => { if (!v.end) { v.end = t; v.rel = 3; releaseVoice(v, t, 3); } });
      retune(); nextChordAt = t + 0.2; chordCount = 0;
    },
    setOn(next) {
      if (next === on) return;
      on = next;
      const t = ac.currentTime;
      if (on) { void ac.resume(); nextChordAt = t; nextSwell = t + 5; master.gain.setTargetAtTime(S.masterLevel, t, 0.6); }
      else {
        master.gain.setTargetAtTime(0, t, 0.3);
        voices.forEach((v) => { if (!v.end) { v.end = t; v.rel = 1; releaseVoice(v, t, 1); } });
        drone.g.gain.setTargetAtTime(0, t, 0.3);
      }
    },
    destroy() {
      clearInterval(loop); document.removeEventListener("visibilitychange", onVisibility);
      void ac.close();
    },
  };
}
