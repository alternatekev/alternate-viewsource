// Where in time the page is: 0 at dial-up, 1 at agents, whichever way the page runs (data-order on
// .beats; on the work page: 0 at the oldest year, 1 at now). The field's color and the music read it.
// Scrolling moves it; the timeline moves it by scrolling the page. It is read from the phase beats
// only (.beat[data-key]), so anything above or below them sits at the nearest end: the welcome, now
// first and above agents, is now (place 1), since a view above the first phase clamps to it.

import { isColumn } from "@/lib/column";

let place = 0, fromScroll = true;
export const newestFirst = () => document.querySelector(".beats, .stops")?.getAttribute("data-order") === "newest-first";

/** where the reader is among beats, in page order: k plus how far through beat k, from 0 at the first
 *  to beats.length - 1 at the last. The one reading of it: the field (below) and the timeline's marker
 *  (lib/dock/timeline.ts) both ask here, so they always agree. A beat is at its exact place when its top
 *  is at the top of the view, where a trip to it lands (a beat grows with its words, so it can be taller
 *  than the screen; for one a screen tall that is the view's middle at its middle). Read as a column, a
 *  beat is current from its first line in the middle of the view, and the place crosses it as you read */
export function readerAt(beats: HTMLElement[], column = isColumn()) {
  const n = beats.length - 1;
  if (n < 0) return 0;
  const at = scrollY + (column ? innerHeight / 2 : 0);
  let k = beats.findIndex((b) => at < b.offsetTop + b.offsetHeight);
  if (k < 0) k = n;
  const b = beats[k];
  return Math.max(0, Math.min(n, k + (at - b.offsetTop) / Math.max(1, b.offsetHeight)));
}
const scrollPlace = () => {
  // the home page's phases, or the work page's years
  const beats = [...document.querySelectorAll<HTMLElement>(".beat[data-key], .stop[data-key]")], n = beats.length - 1;
  if (n < 1) return 0;
  const dom = readerAt(beats);
  return (newestFirst() ? n - dom : dom) / n;
};
const listeners = new Set<(p: number) => void>();
let wired = false;

function wire() {
  if (wired || typeof window === "undefined") return;
  wired = true; place = scrollPlace();
  addEventListener("scroll", () => { fromScroll = true; set(scrollPlace()); }, { passive: true });
}
function set(p: number) { place = Math.max(0, Math.min(1, p)); listeners.forEach((fn) => fn(place)); }

export function timePlace() { wire(); return place; }
/** the timeline's jump; the page stays where it is */
export function setTimePlace(p: number) { wire(); fromScroll = false; set(p); }
export function onTime(fn: (p: number) => void) { wire(); listeners.add(fn); return () => listeners.delete(fn); }
export const timeFromScroll = () => fromScroll;
