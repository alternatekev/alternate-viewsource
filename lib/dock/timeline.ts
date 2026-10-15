// The timeline's contents: one block per phase, in page order (newest first), sized by the years it covers, read from the page's
// beats. A marker shows where in time the page is. Pressing a block scrolls the page to that phase,
// animated, never a jump; the field and the music follow the scroll, and a long trip surges them.
// A wheel, touch or key during the trip hands control back to the visitor.

import { newestFirst, onTime, timePlace } from "@/lib/time";
import { dock } from "@/tokens/dock";

export function timelineBlocks() {
  const beats = [...document.querySelectorAll<HTMLElement>(".beat[data-key]")];
  const year = (d?: string) => (d ? new Date(d).getUTCFullYear() + new Date(d).getUTCMonth() / 12 : 0); // dates are UTC days
  const spans = beats.map((b) => Math.max(1, year(b.dataset.end) - year(b.dataset.start)));
  const total = spans.reduce((a, b) => a + b, 0);

  const el = document.createElement("div");
  el.className = "dock-timeline";
  const blocks = beats.map((b, i) => {
    const btn = document.createElement("button");
    btn.type = "button"; btn.className = "dock-block";
    btn.style.flexGrow = String(spans[i]);
    const name = document.createElement("span"); name.textContent = (b.dataset.name ?? "").toLowerCase();
    const from = document.createElement("span"); from.className = "dock-block-year"; from.textContent = String(Math.floor(year(b.dataset.start)));
    btn.append(from, name);
    btn.addEventListener("click", () => scrollToY(b.offsetTop));
    el.append(btn);
    return btn;
  });
  // the trip: eased in and out over the token's duration; reduced motion goes straight there
  let trip = 0;
  const stopTrip = () => { cancelAnimationFrame(trip); trip = 0; };
  const INTERRUPT = ["wheel", "touchstart", "keydown"] as const;
  INTERRUPT.forEach((t) => addEventListener(t, stopTrip, { passive: true }));
  function scrollToY(to: number) {
    stopTrip();
    const max = document.documentElement.scrollHeight - innerHeight;
    to = Math.max(0, Math.min(max, to));
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { window.scrollTo({ top: to, behavior: "instant" }); return; }
    const from = scrollY, t0 = performance.now(), ms = dock.timelineScrollMs;
    const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
    const step = (now: number) => {
      const x = Math.min(1, (now - t0) / ms);
      window.scrollTo({ top: from + (to - from) * ease(x), behavior: "instant" });
      trip = x < 1 ? requestAnimationFrame(step) : 0;
    };
    trip = requestAnimationFrame(step);
  }
  const marker = document.createElement("span");
  marker.className = "dock-marker"; marker.setAttribute("aria-hidden", "true");
  el.append(marker);

  // time as a fractional phase index, drawn across blocks sized by their years
  function sync() {
    const n = beats.length - 1, chrono = timePlace() * n, f = newestFirst() ? n - chrono : chrono;
    const i = Math.min(n, Math.floor(f + 1e-6)), t = f - i;
    const before = spans.slice(0, i).reduce((a, c) => a + c, 0);
    marker.style.insetInlineStart = `${((before + t * spans[i]) / total) * 100}%`;
    blocks.forEach((x, k) => (k === i ? x.setAttribute("aria-current", "step") : x.removeAttribute("aria-current")));
  }
  const off = onTime(sync);
  sync();
  return { el, destroy() { off(); stopTrip(); INTERRUPT.forEach((t) => removeEventListener(t, stopTrip)); el.remove(); } };
}
