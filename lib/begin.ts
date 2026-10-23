// "begin": the home page opens with the field still and nothing else. The visitor's press of begin
// starts the field, the music and the visualizer and brings in the docks. Everything that waits
// for it asks here. Every other page has no gate (Kevin, Oct 18): it begins as it opens.
//
// Then the begin screen clears. On a desktop the line under begin ("TURN IT UP") holds and erases,
// and only then do the page's words come in (Kevin, Oct 18: the Hello waits for it, so nothing
// overlaps). A phone's gate is only the button, so it is clear as soon as it begins; so is a page
// that never had a gate.

const EVENT = "viewsource:begin", CLEAR = "viewsource:clear";

export const begun = () => document.documentElement.hasAttribute("data-begun");

export function begin() {
  if (begun()) return;
  document.documentElement.setAttribute("data-begun", "");
  window.dispatchEvent(new Event(EVENT));
}

/** runs fn at begin, or now if it already happened; returns an unsubscribe */
export function onBegin(fn: () => void) {
  if (begun()) { fn(); return () => {}; }
  window.addEventListener(EVENT, fn, { once: true });
  return () => window.removeEventListener(EVENT, fn);
}

/** the begin screen has gone, so the page's words can come in */
export const cleared = () => document.documentElement.hasAttribute("data-clear");

export function clear() {
  begin();
  if (cleared()) return;
  document.documentElement.setAttribute("data-clear", "");
  window.dispatchEvent(new Event(CLEAR));
}

/** runs fn once the begin screen has gone, or now if it has; returns an unsubscribe */
export function onClear(fn: () => void) {
  if (cleared()) { fn(); return () => {}; }
  window.addEventListener(CLEAR, fn, { once: true });
  return () => window.removeEventListener(CLEAR, fn);
}

/** resolves once the begin screen has gone */
export const whenClear = () => new Promise<void>((done) => { onClear(done); });

/** an address on home that names a phase or a piece (lib/surface.ts journeys to these, and to Hello). A
 *  visit opened on one goes straight to it at begin, with no line under the button (Kevin, Oct 19) */
export const namesAPiece = (id: string) => /^(phase-|piece-)/.test(id) && !!document.getElementById(id);
