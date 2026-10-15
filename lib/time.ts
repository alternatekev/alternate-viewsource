// Where in time the page is: 0 at the first phase (dial-up), 1 at the last (agents), whichever way
// the page runs. The field's color and the music read it. Scrolling moves it; the timeline moves it
// by scrolling the page. With the spine newest first, the top of the page is 1.

let place = 0, fromScroll = true;
export const newestFirst = () => document.querySelector(".beats")?.getAttribute("data-order") === "newest-first";
const scrollPlace = () => {
  const f = Math.max(0, Math.min(1, scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight)));
  return newestFirst() ? 1 - f : f;
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
