// The colophon, read straight down like the work page's column. After begin each part sets in as its
// top comes into view, by the one transition; going to another page, what has set in types out and
// withdraws. Before begin nothing on it shows, as on every other page, so begin is the one thing on
// screen. Without JavaScript none of this runs and it is simply a document.

import { onBegin } from "@/lib/begin";
import { columnInView } from "@/lib/column";
import { onLeave } from "@/lib/route";
import { setIn, setOut, typeOut, unset } from "@/lib/type";

export function colophon() {
  const root = document.documentElement;
  root.setAttribute("data-colophon", "");
  const spaces = [...document.querySelectorAll<HTMLElement>(".colophon .stop-space")];
  const arrived = new Set<HTMLElement>();
  function arrive(sp: HTMLElement) {
    if (arrived.has(sp)) return;
    arrived.add(sp);
    sp.dataset.arrived = "";
    for (const part of sp.children) setIn(part as HTMLElement);
  }
  let seen: IntersectionObserver | null = null;
  const off = onBegin(() => {
    seen = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { seen!.unobserve(e.target); arrive(e.target as HTMLElement); }
    }, columnInView);
    spaces.forEach((sp) => seen!.observe(sp));
  });
  const offLeave = onLeave(() => Promise.all([...arrived].map((sp) =>
    Promise.all([typeOut(sp), ...[...sp.children].map((part) => setOut(part as HTMLElement))]))));
  return {
    destroy() {
      off(); seen?.disconnect(); offLeave(); root.removeAttribute("data-colophon");
      // gone from sight (Next keeps the page, hidden, for a later visit): back to how it first was
      for (const sp of spaces) { unset(sp); delete sp.dataset.arrived; }
    },
  };
}
