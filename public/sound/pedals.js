// Pedal models for the alternate.org instrument. Each runs per-sample in an AudioWorklet.
// Settings arrive as port messages and are smoothed inside, so big changes glide rather than click.
const TAU = Math.PI * 2;

class Smooth {
  constructor(v, t = .05){ this.v = v; this.t = v; this.setTime(t); }
  setTime(t){ this.k = 1 - Math.exp(-1 / (Math.max(1e-4, t) * sampleRate)); }
  next(){ this.v += (this.t - this.v) * this.k; return this.v; }
}
class Biquad {  // RBJ cookbook, transposed direct form II
  constructor(){ this.b0 = 1; this.b1 = this.b2 = this.a1 = this.a2 = this.z1 = this.z2 = 0; }
  set(type, f, q){
    f = Math.max(10, Math.min(f, sampleRate * .45));
    const w = TAU * f / sampleRate, c = Math.cos(w), s = Math.sin(w), al = s / (2 * q), a0 = 1 + al;
    let b0, b1, b2;
    if (type === 'lp'){ b0 = (1 - c) / 2; b1 = 1 - c; b2 = b0; }
    else if (type === 'hp'){ b0 = (1 + c) / 2; b1 = -(1 + c); b2 = b0; }
    else { b0 = al; b1 = 0; b2 = -al; }                     // band-pass, 0 dB peak
    this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0; this.a1 = -2 * c / a0; this.a2 = (1 - al) / a0;
  }
  run(x){ const y = this.b0 * x + this.z1; this.z1 = this.b1 * x - this.a1 * y + this.z2; this.z2 = this.b2 * x - this.a2 * y; return y; }
}
class Line {
  constructor(n){ this.n = n; this.b = new Float32Array(n); this.w = 0; }
  push(x){ this.b[this.w] = x; this.w = (this.w + 1) % this.n; }
  read(d){  // value written d samples ago (d >= 1), linear interpolation
    let p = this.w - d; while (p < 0) p += this.n;
    const i = p | 0, f = p - i, a = this.b[i % this.n], b = this.b[(i + 1) % this.n];
    return a + (b - a) * f;
  }
}
const setFrom = (P, d) => { for (const k in d) if (P[k]) P[k].t = d[k]; };
const copyOut = outs => { const o = outs[0]; for (let c = 1; c < o.length; c++) o[c].set(o[0]); };

/* ------------------------------------------------------------------ */
/* Flanger: classic analog-style through-zero-less flanger.
   Short swept delay (manual + width), triangle LFO, regeneration, wet summed with dry.
   Generic until we know which flanger Kevin plays.                    */
class Flanger extends AudioWorkletProcessor {
  constructor(){
    super();
    this.line = new Line(Math.ceil(sampleRate * .03)); this.ph = 0; this.fb = 0;
    this.P = {mix:new Smooth(0), rate:new Smooth(.2,.3), width:new Smooth(.002,.3), manual:new Smooth(.0012,.3), regen:new Smooth(.4,.1)};
    this.port.onmessage = e => setFrom(this.P, e.data);
  }
  process(ins, outs){
    const i = ins[0][0], o = outs[0][0]; if (!o) return true;
    const P = this.P, sr = sampleRate;
    for (let n = 0; n < o.length; n++){
      const x = i ? i[n] : 0, rate = P.rate.next(), wd = P.width.next(), man = P.manual.next(), rg = P.regen.next(), mix = P.mix.next();
      this.ph += rate / sr; if (this.ph >= 1) this.ph -= 1;
      const tri = 1 - Math.abs(2 * this.ph - 1);                // 0..1
      const d = Math.max(.00015, man + wd * tri) * sr;
      this.line.push(x + this.fb * rg);
      const y = this.line.read(d);
      this.fb = Math.tanh(y);
      o[n] = x * (1 - mix * .35) + y * mix * .75;
    }
    copyOut(outs); return true;
  }
}

/* ------------------------------------------------------------------ */
/* Carbon Copy: bucket-brigade analog delay, 20–600 ms.
   Signal path modeled on a BBD delay: anti-alias filter → 2:1 compressor → BBD
   (bandwidth and sample-and-hold aliasing follow the clock, which slows as the
   delay lengthens) → reconstruction filter → 2:1 expander. Repeats are
   saturated and thinned in the regen loop so each one darkens and degrades.
   Mod: triangle LFO on delay time (the internal width and rate trimmers).   */
class CarbonCopy extends AudioWorkletProcessor {
  constructor(){
    super();
    const sr = sampleRate;
    this.line = new Line(Math.ceil(sr * .7));
    this.time = new Smooth(.3, .15);
    this.P = {mix:new Smooth(.5), regen:new Smooth(.4,.05), width:new Smooth(.0015,.3), rate:new Smooth(.45,.3), mod:new Smooth(1,.05)};
    this.f = [new Biquad(), new Biquad(), new Biquad(), new Biquad()];
    this.fbHP = new Biquad(); this.fbHP.set('hp', 90, .7);
    this.envI = this.envO = this.fb = this.ph = this.clk = this.hold = this.lastCut = this.cnt = 0; this.fclk = 2e4;
    this.port.onmessage = e => {
      const d = e.data;
      if (d.time != null) this.time.t = Math.min(.6, Math.max(.02, d.time));
      if (d.slew != null) this.time.setTime(d.slew);
      setFrom(this.P, d);
    };
  }
  process(ins, outs){
    const i = ins[0][0], o = outs[0][0]; if (!o) return true;
    const P = this.P, sr = sampleRate, f = this.f;
    const atk = 1 - Math.exp(-1 / (.004 * sr)), rel = 1 - Math.exp(-1 / (.06 * sr)), K = .3;
    for (let n = 0; n < o.length; n++){
      const x = i ? i[n] : 0;
      const t0 = this.time.next(), mix = P.mix.next(), rg = P.regen.next(), wd = P.width.next(), rate = P.rate.next(), md = P.mod.next();
      this.ph += rate / sr; if (this.ph >= 1) this.ph -= 1;
      const t = Math.max(.02, t0 + wd * (1 - Math.abs(2 * this.ph - 1) * 2) * md);
      if ((this.cnt++ & 31) === 0){
        this.fclk = 8192 / (2 * t);                              // two 4096-stage BBDs
        const cut = Math.min(.3 * this.fclk, 7000);
        if (Math.abs(cut - this.lastCut) > this.lastCut * .02){
          this.lastCut = cut; f[0].set('lp', cut, .54); f[1].set('lp', cut, 1.31); f[2].set('lp', cut, .54); f[3].set('lp', cut, 1.31);
        }
      }
      let s = f[1].run(f[0].run(x + this.fb));
      const a = Math.abs(s); this.envI += (a > this.envI ? atk : rel) * (a - this.envI);
      this.line.push(s * K / Math.sqrt(this.envI + 1e-4));        // compressor
      this.clk += this.fclk / sr;
      if (this.clk >= 1 || this.fclk >= sr){ this.clk %= 1; this.hold = this.line.read(t * sr); }  // BBD sample-and-hold
      let y = f[3].run(f[2].run(this.hold + (Math.random() - .5) * 6e-4));                       // clock hiss before expansion
      const b = Math.abs(y); this.envO += (b > this.envO ? atk : rel) * (b - this.envO);
      let wet = y * this.envO / (K * K);                                                         // expander
      wet = Math.tanh(wet * 1.4) / 1.4;
      this.fb = this.fbHP.run(wet) * rg;
      o[n] = x + wet * mix * 1.1;                                  // dry stays at full level; Mix sets the repeats
    }
    copyOut(outs); return true;
  }
}

/* ------------------------------------------------------------------ */
/* Pitch shifter used by Fathom's Sonar mode: two crossfaded rotating taps. */
class Shifter {
  constructor(ratio){ this.r = ratio; this.W = Math.floor(sampleRate * .06); this.line = new Line(this.W + 8); this.ph = 0; }
  run(x){
    this.line.push(x);
    const W = this.W; this.ph = ((this.ph + 1 - this.r) % W + W) % W;
    const p2 = (this.ph + W / 2) % W, w1 = Math.sin(Math.PI * this.ph / W) ** 2, w2 = Math.sin(Math.PI * p2 / W) ** 2;
    return this.line.read(this.ph + 2) * w1 + this.line.read(p2 + 2) * w2;
  }
}

/* Fathom: multi-function reverb. 8-line feedback delay network, Householder mix,
   damping in the loop (Dampen), modulated lines (Lo / Med / Hi), Decay as RT60,
   Sustain holds the tail. Modes and their X knob:
     hall  – long lines, softened highs; X = pre-delay
     plate – short lines, dense input diffusion, even decay; X = pre-delay
     lofi  – band-limited, rate-reduced, gently clipped like a small radio; X = filter width
     sonar – octave-down and octave-up voices in the tail; X blends low ↔ high octave
   Mono in, stereo out.                                                              */
class Fathom extends AudioWorkletProcessor {
  constructor(){
    super();
    const sr = sampleRate;
    this.base = [37.1, 41.9, 53.3, 61.7, 71.9, 83.3, 97.1, 107.9].map(ms => ms / 1000);
    this.lines = this.base.map(s => new Line(Math.ceil(s * sr * 2.3) + 64));
    this.lp = new Float32Array(8); this.y = new Float32Array(8); this.g = new Float32Array(8).fill(.5);
    this.mph = this.base.map((_, i) => i * .77); this.mrate = this.base.map((_, i) => .09 + i * .061);
    this.pre = new Line(Math.ceil(sr * .3)); this.inHP = new Biquad(); this.inHP.set('hp', 120, .7);
    this.ap = [142, 107, 379, 277].map(d => ({line: new Line(d + 4), d: Math.round(d * sr / 44100)}));
    this.bpL = new Biquad(); this.bpR = new Biquad(); this.lastQ = -1;
    this.shU = new Shifter(2); this.shD = new Shifter(.5);
    this.P = {decay:new Smooth(4,.3), damp:new Smooth(4000,.2), x:new Smooth(.3,.3), mod:new Smooth(8,.5), mix:new Smooth(1,.1), scale:new Smooth(1,1.2), sustain:new Smooth(0,.6), shim:new Smooth(.32,.5)};
    this.mode = 'hall'; this.cnt = 0; this.dk = .3; this.hL = 0; this.hR = 0; this.hn = 0;
    this.port.onmessage = e => { if (e.data.mode) this.mode = e.data.mode; setFrom(this.P, e.data); };
  }
  process(ins, outs){
    const i = ins[0][0], oL = outs[0][0], oR = outs[0][1] || outs[0][0]; if (!oL) return true;
    const P = this.P, sr = sampleRate, L = this.lines, mode = this.mode;
    const plate = mode === 'plate', lofi = mode === 'lofi', sonar = mode === 'sonar';
    for (let n = 0; n < oL.length; n++){
      const x0 = i ? i[n] : 0;
      const decay = P.decay.next(), damp = P.damp.next(), X = P.x.next(), mod = P.mod.next(), mix = P.mix.next(), sc = P.scale.next(), sus = P.sustain.next();
      const lineScale = sc * (plate ? .55 : 1);
      if ((this.cnt++ & 31) === 0){
        const rt = decay + sus * 60;
        for (let k = 0; k < 8; k++) this.g[k] = Math.pow(10, -3 * this.base[k] * lineScale / rt);
        this.dk = 1 - Math.exp(-TAU * Math.min(damp * (lofi ? .5 : 1), sr * .45) / sr);
        if (lofi){ const q = .5 + (1 - X) * 3.5; if (Math.abs(q - this.lastQ) > .01){ this.lastQ = q; this.bpL.set('bp', 1100, q); this.bpR.set('bp', 1250, q); } }
      }
      // input: highpass, pre-delay, diffusion
      let x = this.inHP.run(x0);
      this.pre.push(x);
      x = this.pre.read(Math.max(1, ((mode === 'hall' || plate) ? X * .25 : .012) * sr));
      for (let a = 0; a < (plate ? 4 : 2); a++){
        const A = this.ap[a], vd = A.line.read(A.d), v = x + .6 * vd; A.line.push(v); x = vd - .6 * v;
      }
      // network
      let sum = 0;
      for (let k = 0; k < 8; k++){
        this.mph[k] += this.mrate[k] / sr; if (this.mph[k] >= 1) this.mph[k] -= 1;
        let y = L[k].read(this.base[k] * lineScale * sr + mod * (1 + Math.sin(TAU * this.mph[k])));
        this.lp[k] += this.dk * (y - this.lp[k]); y = this.lp[k] * this.g[k];
        this.y[k] = y; sum += y;
      }
      let shimmer = 0;
      if (sonar){ const s = (this.y[0] + this.y[3] + this.y[5]) * .5; shimmer = (this.shU.run(s) * X + this.shD.run(s) * (1 - X)) * P.shim.next(); }
      const h = sum * .25;
      for (let k = 0; k < 8; k++) L[k].push(this.y[k] - h + x * (k & 1 ? .32 : -.32) + shimmer * (k & 1 ? -1 : 1));
      let wl = (this.y[0] + this.y[2] + this.y[4] + this.y[6]) * .45, wr = (this.y[1] + this.y[3] + this.y[5] + this.y[7]) * .45;
      if (lofi){
        if ((this.hn++ % 3) === 0){ this.hL = this.bpL.run(wl) * 2.2; this.hR = this.bpR.run(wr) * 2.2; }
        wl = Math.tanh(this.hL * 1.6) / 1.6; wr = Math.tanh(this.hR * 1.6) / 1.6;
      }
      wl = Math.tanh(wl * 1.5) / 1.5; wr = Math.tanh(wr * 1.5) / 1.5;   // soft ceiling for held Sustain tails
      oL[n] = x0 * (1 - mix) + wl * mix; oR[n] = x0 * (1 - mix) + wr * mix;
    }
    return true;
  }
}

/* ------------------------------------------------------------------ */
/* Infinite Jets: two-channel resynthesizer (Sampler A and B).
   A trigger captures a slice of the input into the next channel (alternating A/B).
   Poly: both channels sustain. Mono: the new note cancels the other.
   Each channel's level follows the envelope generator (shape × time, Infinite,
   or Repeat Waveform; in Poly + Repeat, B runs 50% offset from A).
   Voices (presets):
     blur   – freezes the note with its attack and decay removed (windowed grain loop);
              oct −1 / +1 mixes an octave below / above; Dimension = delay size, bigger moves bend pitch
     synth  – hard-edged digital tone from the frozen slice; Dimension = low-pass cutoff
     glitch – loops short fragments from the start of the capture; Dimension = one of four lengths
     swell  – envelope applied to the live input, into the Dimension delay
   Drive: analog-style overdrive with gain compensation, then Tone. Dry: 50% = equal blend,
   above 75% the effect drops away.                                                         */
const SHAPES = {
  rampDown: p => 1 - p, rampUp: p => p, triangle: p => 1 - Math.abs(2 * p - 1),
  square: p => p < .5 ? 1 : 0, sine: p => .5 - .5 * Math.cos(TAU * p), random: null
};
class InfiniteJets extends AudioWorkletProcessor {
  constructor(){
    super();
    const sr = sampleRate;
    this.ch = [0, 1].map(() => ({buf: new Float32Array(Math.ceil(sr * 1.2)), len: 0, rec: false, rp: 0, rt: 0, ss: 0,
      p1: 0, p2: 0, ph: 0, env: 0, target: 0, active: false, gain: 1, rnd: Math.random()}));
    this.next = 0; this.inRms = .01;
    this.dly = new Line(Math.ceil(sr * 1.3)); this.dfb = 0; this.dlp = 0;
    this.toneF = new Biquad(); this.toneLast = 0; this.synF = new Biquad(); this.synLast = 0;
    this.P = {dry:new Smooth(.5,.05), dimension:new Smooth(.4,.25), drive:new Smooth(.1,.1), tone:new Smooth(5000,.2), envTime:new Smooth(2,.1), rate:new Smooth(1,.1)};
    this.cfg = {voice:'blur', oct:0, shape:'sine', envMode:'repeat', trigger:'poly', capture:.18};
    this.port.onmessage = e => {
      const d = e.data;
      for (const k in d){ if (this.P[k]) this.P[k].t = d[k]; else if (k in this.cfg) this.cfg[k] = d[k]; }
      if (d.trig) this.trigger();
    };
  }
  trigger(){
    const c = this.ch[this.next], other = this.ch[1 - this.next];
    if (this.cfg.trigger === 'mono') other.target = 0, other.active = false;
    c.rec = true; c.rp = 0; c.rt = Math.floor(this.cfg.capture * sampleRate); c.ss = 0;
    c.ph = (this.cfg.envMode === 'repeat' && this.cfg.trigger === 'poly' && this.next === 1) ? .5 : 0;
    this.next = 1 - this.next;
  }
  process(ins, outs){
    const i = ins[0][0], o = outs[0][0]; if (!o) return true;
    const P = this.P, sr = sampleRate, cfg = this.cfg, shape = SHAPES[cfg.shape];
    const ek = 1 - Math.exp(-1 / (.004 * sr));
    for (let n = 0; n < o.length; n++){
      const x = i ? i[n] : 0;
      const dry = P.dry.next(), dim = P.dimension.next(), drive = P.drive.next(), tone = P.tone.next(), et = P.envTime.next(), rate = P.rate.next();
      this.inRms += (x * x - this.inRms) * 2e-5;
      if ((n & 31) === 0){
        if (Math.abs(tone - this.toneLast) > 20){ this.toneLast = tone; this.toneF.set('lp', tone, .7); }
        const sc = 200 * Math.pow(30, dim); if (Math.abs(sc - this.synLast) > 5){ this.synLast = sc; this.synF.set('lp', sc, 2); }
      }
      let wet = 0;
      for (const c of this.ch){
        if (c.rec){
          c.buf[c.rp++] = x; c.ss += x * x;
          if (c.rp >= c.rt){                                     // capture done: level-match to the recent input
            c.rec = false; c.len = c.rt; c.active = true; c.p1 = 0; c.p2 = c.len / 2;
            c.gain = Math.min(2, Math.max(.5, Math.sqrt(this.inRms / (c.ss / c.len + 1e-9))));
          }
        }
        // envelope generator
        if (c.active){
          if (cfg.envMode === 'repeat'){ c.ph += rate / sr; if (c.ph >= 1){ c.ph -= 1; c.rnd = Math.random(); } }
          else if (cfg.envMode === 'time'){ c.ph += 1 / (Math.max(.02, et) * sr); if (c.ph >= 1){ c.ph = 1; c.active = false; } }
          const p = cfg.envMode === 'infinite' ? .5 : c.ph;
          c.target = cfg.envMode === 'infinite' ? 1 : (shape ? shape(p) : c.rnd);
        } else c.target = 0;
        c.env += (c.target - c.env) * ek;
        if (c.env < 1e-4 || !c.len) continue;
        // voice
        let v = 0;
        const Ln = c.len, b = c.buf;
        if (cfg.voice === 'swell') v = x;
        else if (cfg.voice === 'glitch'){
          const gl = Math.min(Ln - 1, Math.floor([.03, .06, .12, .24][Math.min(3, (dim * 4) | 0)] * sr));
          c.p1 = (c.p1 + 1) % gl; const e = Math.min(1, c.p1 / 96, (gl - c.p1) / 96);
          v = b[c.p1 | 0] * e;
        } else {
          const sp = cfg.oct > 0 ? 2 : 1;
          c.p1 = (c.p1 + 1) % Ln; c.p2 = (c.p2 + 1) % Ln;
          v = b[c.p1 | 0] * Math.sin(Math.PI * c.p1 / Ln) ** 2 + b[c.p2 | 0] * Math.sin(Math.PI * c.p2 / Ln) ** 2;
          if (cfg.oct){                                          // octave voice: same frozen slice at half or double speed
            c.oq = ((c.oq || 0) + (cfg.oct < 0 ? .5 : 2)) % Ln; const q2 = (c.oq + Ln / 2) % Ln;
            v = v * .6 + (b[c.oq | 0] * Math.sin(Math.PI * c.oq / Ln) ** 2 + b[q2 | 0] * Math.sin(Math.PI * q2 / Ln) ** 2) * .7;
          }
          if (cfg.voice === 'synth') v = this.synF.run(Math.max(-1, Math.min(1, v * 12)) * .1);
        }
        wet += v * c.gain * c.env * (cfg.voice === 'swell' ? .55 : .8);
      }
      // Dimension delay for blur and swell: size, feedback and filtering
      if (cfg.voice === 'blur' || cfg.voice === 'swell'){
        const dt = (cfg.voice === 'swell' ? .08 + dim * .6 : .02 + dim * .5) * sr;
        this.dly.push(wet + this.dfb);
        const y = this.dly.read(dt); this.dlp += (y - this.dlp) * (.08 + (1 - dim) * .3);
        this.dfb = this.dlp * (.25 + dim * .5); wet = wet * .7 + this.dlp * .6;
      }
      // drive with gain compensation, then tone
      const g = 1 + drive * 10;
      wet = this.toneF.run(Math.tanh(wet * g) / Math.tanh(g) * .9);
      const dg = Math.min(1, 2 * dry), wg = Math.min(1, 2 * (1 - dry)) * (dry > .75 ? (1 - dry) * 4 : 1);
      o[n] = x * dg + wet * wg;
    }
    copyOut(outs); return true;
  }
}

registerProcessor('flanger', Flanger);
registerProcessor('carbon-copy', CarbonCopy);
registerProcessor('fathom', Fathom);
registerProcessor('infinite-jets', InfiniteJets);
