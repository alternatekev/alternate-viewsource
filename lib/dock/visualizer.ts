// The music, drawn in the gaps on either side of the main nav, out to the window's edges. One
// waveform runs the whole edge and passes behind the nav. With the sound off it settles to a flat,
// still line. It hides while the nav is being dragged and reappears where the nav lands.

import { dock as D } from "@/tokens/dock";
import { sound as S } from "@/tokens/sound";
import { horizontal, vh, vw, type Bar } from "./bar";

export function visualizer(nav: Bar, source: { readonly analyser: AnalyserNode | null; readonly on: boolean }) {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pieces = [0, 1].map(() => {
    const c = document.createElement("canvas");
    c.className = "dock-visualizer"; c.setAttribute("aria-hidden", "true");
    document.body.append(c);
    return c;
  });
  let buf = new Float32Array(1024), amp = 0, raf = 0, lifted = false;
  const line = getComputedStyle(document.documentElement).getPropertyValue("--dock-line").trim() || "rgba(255,255,255,.45)";

  function layout() {
    const b = nav.el.getBoundingClientRect(), i = D.inset, g = D.gap, t = nav.thick, e = nav.edge;
    const H = horizontal(e);
    const rects = H
      ? [{ x: i, y: e === "top" ? i : vh() - i - t, w: b.left - g - i, h: t }, { x: b.right + g, y: e === "top" ? i : vh() - i - t, w: vw() - i - b.right - g, h: t }]
      : [{ x: e === "left" ? i : vw() - i - t, y: i, w: t, h: b.top - g - i }, { x: e === "left" ? i : vw() - i - t, y: b.bottom + g, w: t, h: vh() - i - b.bottom - g }];
    const dpr = Math.min(2, devicePixelRatio || 1);
    pieces.forEach((c, k) => {
      const r = rects[k], ok = r.w > 2 && r.h > 2 && !lifted;
      c.style.display = ok ? "" : "none";
      if (!ok) return;
      c.style.transform = `translate(${r.x}px, ${r.y}px)`; c.style.width = `${r.w}px`; c.style.height = `${r.h}px`;
      c.width = Math.round(r.w * dpr); c.height = Math.round(r.h * dpr);
      c.dataset.from = String(H ? r.x : r.y); // where along the edge this piece starts, in CSS px
    });
  }

  function draw() {
    const a = source.analyser;
    if (a && buf.length !== a.fftSize) buf = new Float32Array(a.fftSize);
    if (a && source.on) a.getFloatTimeDomainData(buf); else buf.fill(0);
    // settles: the amplitude eases to nothing when the sound is off
    amp += ((source.on ? 1 : 0) - amp) * 0.05;
    const H = horizontal(nav.edge), length = H ? vw() : vh(), gain = (amp / S.masterLevel) * (reduced ? 0.3 : 1);
    for (const c of pieces) {
      if (c.style.display === "none") continue;
      const ctx = c.getContext("2d")!, dpr = c.width / parseFloat(c.style.width || "1");
      const from = +(c.dataset.from ?? 0), along = H ? c.width : c.height, across = H ? c.height : c.width;
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.strokeStyle = line; ctx.lineWidth = dpr; ctx.beginPath();
      for (let p = 0; p <= along; p += 2) {
        const at = (from + p / dpr) / length, s = buf[Math.min(buf.length - 1, Math.floor(at * buf.length))];
        const off = across / 2 + s * gain * across * 0.45;
        if (H) { if (p) ctx.lineTo(p, off); else ctx.moveTo(p, off); } else { if (p) ctx.lineTo(off, p); else ctx.moveTo(off, p); }
      }
      ctx.stroke();
    }
    raf = requestAnimationFrame(draw);
  }

  const onLift = (e: Event) => { if ((e as CustomEvent<{ id: string }>).detail.id === nav.id) { lifted = true; layout(); } };
  const onDrop = (e: Event) => { if ((e as CustomEvent<{ id: string }>).detail.id === nav.id) { lifted = false; layout(); } };
  addEventListener("dock:lift", onLift); addEventListener("dock:drop", onDrop); addEventListener("resize", layout);
  layout(); raf = requestAnimationFrame(draw);
  return {
    destroy() {
      cancelAnimationFrame(raf);
      removeEventListener("dock:lift", onLift); removeEventListener("dock:drop", onDrop); removeEventListener("resize", layout);
      pieces.forEach((c) => c.remove());
    },
  };
}
