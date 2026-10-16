// Flight: how the reader is travelling through time, for the field. The work page and the trip
// into it write here; the field reads it every frame and carries it through its own motion, so
// nothing here moves on its own. Shape is the source art's outline (0, the rectangle; 1, the
// circle the work page is cut from). Surge is the rush of crossing years, building with every
// year passed and draining over seconds. Push is a steady pull through the shards toward the
// camera while a dive is under way. Gather is how far the shards have come back together at
// the beginning of the work page, the oldest year.

import { motion } from "@/tokens/motion";

const F = motion.flight;
export const flight = { shape: 0, surge: 0, push: 0, gather: 0 };

/** the work page is cut from the circle; everything else from the rectangle */
export function setShape(circle: boolean) { flight.shape = circle ? 1 : 0; }
/** a year passed: the rush builds by one crossing, up to its ceiling */
export function crossYear(years = 1) { flight.surge = Math.min(F.surgeMax, flight.surge + F.surgePerYear * Math.min(4, Math.abs(years))); }
/** a dive through the timeline: the shards stream past while it lasts */
export function setPush(amount: number) { flight.push = Math.max(0, amount); }
/** how close the reader is to the beginning (0 far from it, 1 there) */
export function setGather(amount: number) { flight.gather = Math.max(0, Math.min(1, amount)); }
/** called by the field every frame: the rush drains */
export function drain(dt: number) { flight.surge *= Math.exp(-dt / F.surgeDecaySec); }

// A dive: the shards stream past the camera for F.diveMs, the pull rising and falling in an
// ease-in-out bell. onStep hears how far through it is (0..1), for whatever lands on its beats; a
// page that mounts mid-dive waits on diving() to land its own arrival.
let current: Promise<void> | null = null, progress = 0;
export const diving = () => current;
export const diveProgress = () => progress;
export function dive(onStep?: (t: number) => void): Promise<void> {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ms = reduced ? F.diveMs * 0.35 : F.diveMs, t0 = performance.now();
  current = new Promise((done) => {
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / ms);
      progress = t;
      setPush(reduced ? 0 : Math.pow(Math.sin(Math.PI * t), 2));
      onStep?.(t);
      if (t < 1) requestAnimationFrame(step); else { current = null; progress = 0; done(); }
    };
    requestAnimationFrame(step);
  });
  return current;
}
