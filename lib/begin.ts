// "begin": the page opens with the field still and nothing else. The visitor's press of begin
// starts the field, the music and the visualizer and brings in the docks. Everything that waits
// for it asks here.

const EVENT = "viewsource:begin";

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
