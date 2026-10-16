// Where in time the page is: 0 at dial-up, 1 at agents, whichever way the page runs (data-order on
// .beats; on the work page: 0 at the oldest year, 1 at now). The field's color and the music read it.
// Scrolling moves it; the timeline moves it by scrolling the page. It is read from the phase beats
// only (.beat[data-key]), so anything above or below them sits at the nearest end: the welcome, now
// first and above agents, is now (place 1), since a view above the first phase clamps to it.

let place = 0, fromScroll = true;
export const newestFirst = () => document.querySelector(".beats, .stops")?.getAttribute("data-order") === "newest-first";
const scrollPlace = () => {
  // the home page's phases, or the work page's years
  const beats = [...document.querySelectorAll<HTMLElement>(".beat[data-key], .stop[data-key]")], n = beats.length - 1;
  if (n < 1) return 0;
  // which beat the middle of the view is in, and how far through it; a beat's middle is its phase
  const mid = scrollY + innerHeight / 2;
  let i = beats.findIndex((b) => mid < b.offsetTop + b.offsetHeight);
  if (i < 0) i = n;
  const b = beats[i], t = (mid - b.offsetTop) / Math.max(1, b.offsetHeight);
  const dom = Math.max(0, Math.min(n, i + t - 0.5));
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
