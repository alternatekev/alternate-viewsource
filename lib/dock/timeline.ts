// The timeline's contents: one block per phase, in page order (newest first), sized by the years it covers, read from the page's
// beats. A marker shows where in time the page is. Pressing a block scrolls the page to that phase,
// animated, never a jump; the field and the music follow the scroll, and a long trip surges them.
// A wheel, touch or key during the trip hands control back to the visitor.

import { newestFirst, onTime, timePlace } from "@/lib/time";
import { dock } from "@/tokens/dock";

/** a phase name that types itself out while the block is hovered or focused, and erases after */
function typedName(el: HTMLElement, full: string) {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let shown = 0, want = 0, timer = 0;
  const tick = () => {
    if (shown === want) { timer = 0; if (!want) delete el.dataset.typing; return; }
    shown += shown < want ? 1 : -1;
    el.textContent = full.slice(0, shown);
    timer = window.setTimeout(tick, shown < want ? dock.typing.charMs : dock.typing.eraseMs);
  };
  const to = (n: number) => {
    want = n;
    if (n) el.dataset.typing = "";
    if (reduced) { shown = n; el.textContent = full.slice(0, n); if (!n) delete el.dataset.typing; return; }
    if (!timer) tick();
  };
  return { show: () => to(full.length), hide: () => to(0), destroy: () => clearTimeout(timer) };
}

export function timelineBlocks(onPress?: () => void) {
  const beats = [...document.querySelectorAll<HTMLElement>(".beat[data-key]")];
  const year = (d?: string) => (d ? new Date(d).getUTCFullYear() + new Date(d).getUTCMonth() / 12 : 0); // dates are UTC days
  const spans = beats.map((b) => Math.max(1, year(b.dataset.end) - year(b.dataset.start)));
  const total = spans.reduce((a, b) => a + b, 0);

  const el = document.createElement("div");
  el.className = "dock-timeline";
  const typers: ReturnType<typeof typedName>[] = [];
  const blocks = beats.map((b, i) => {
    const btn = document.createElement("button");
    btn.type = "button"; btn.className = "dock-block";
    btn.style.flexGrow = String(spans[i]);
    const label = (b.dataset.name ?? "").toLowerCase(), from = String(Math.floor(year(b.dataset.start)));
    btn.setAttribute("aria-label", `${label}, from ${from}`);
    // the name is hidden until the block is hovered or focused, then types out like the logotype
    const name = document.createElement("span"); name.className = "dock-block-name"; name.setAttribute("aria-hidden", "true");
    const yr = document.createElement("span"); yr.className = "dock-block-year"; yr.setAttribute("aria-hidden", "true"); yr.textContent = from;
    btn.append(yr, name);
    const typer = typedName(name, label);
    typers.push(typer);
    btn.addEventListener("pointerenter", typer.show); btn.addEventListener("focus", typer.show);
    btn.addEventListener("pointerleave", typer.hide); btn.addEventListener("blur", typer.hide);
    btn.addEventListener("click", () => { scrollToY(b.offsetTop); onPress?.(); });
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
  return { el, destroy() { off(); stopTrip(); typers.forEach((t) => t.destroy()); INTERRUPT.forEach((t) => removeEventListener(t, stopTrip)); el.remove(); } };
}
