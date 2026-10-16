// Travel: an eased trip down (or up) the page to a scroll position, never a jump. The timeline's
// presses, the logotype's way home and following a link all take the same trip, over
// dock.timelineScrollMs. A wheel, touch or key during the trip hands control back to the visitor,
// and the trip resolves where it stopped. With reduced motion it simply goes there.

import { dock } from "@/tokens/dock";

let trip = 0;
let settle: (() => void) | null = null;
const INTERRUPT = ["wheel", "touchstart", "keydown"] as const;
function stop() {
  cancelAnimationFrame(trip); trip = 0;
  settle?.(); settle = null;
}
if (typeof window !== "undefined") INTERRUPT.forEach((t) => addEventListener(t, stop, { passive: true }));

const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

/** an eased trip to a scroll position; resolves on arrival, or where the visitor took over */
export function travelTo(y: number): Promise<void> {
  stop();
  const max = document.documentElement.scrollHeight - innerHeight;
  const to = Math.max(0, Math.min(max, y));
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) { window.scrollTo({ top: to, behavior: "instant" }); return Promise.resolve(); }
  const from = scrollY, t0 = performance.now(), ms = dock.timelineScrollMs;
  return new Promise((done) => {
    settle = done;
    const step = (now: number) => {
      const x = Math.min(1, (now - t0) / ms);
      window.scrollTo({ top: from + (to - from) * ease(x), behavior: "instant" });
      if (x < 1) trip = requestAnimationFrame(step);
      else { trip = 0; settle = null; done(); }
    };
    trip = requestAnimationFrame(step);
  });
}
