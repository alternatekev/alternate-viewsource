// The timeline's contents: one block per beat of the page, in page order. A phase's block is sized
// by the years it covers and shows its span; Hello, at the end, gets a short block of its own
// (dock.helloSpan) so the marker can say you are there, not in agents. A marker shows where the
// reader is, read from the scroll position across all the beats. Pressing a block scrolls the page to that phase,
// animated, never a jump; the field and the music follow the scroll, and a long trip surges them.
// The trip itself is lib/travel.ts, shared with every other trip down the page.

import { isColumn } from "@/lib/column";
import { travelTo } from "@/lib/travel";
import { retype } from "@/lib/type";
import { dock } from "@/tokens/dock";

export function timelineBlocks(onPress?: () => void) {
  const beats = [...document.querySelectorAll<HTMLElement>(".beat")];
  const year = (d?: string) => (d ? new Date(d).getUTCFullYear() + new Date(d).getUTCMonth() / 12 : 0); // dates are UTC days
  const isPhase = (b: HTMLElement) => !!b.dataset.start;
  const spans = beats.map((b) => (isPhase(b) ? Math.max(1, year(b.dataset.end) - year(b.dataset.start)) : dock.helloSpan));
  const total = spans.reduce((a, b) => a + b, 0);

  // on a phone the spans shorten to the year each phase began ('91), and the phase you're in types its
  // name, since there is no hovering there; the full span stays in each block's label
  const column = isColumn();
  const shows: ((on: boolean) => void)[] = [];
  const el = document.createElement("div");
  el.className = "dock-timeline";
  const blocks = beats.map((b, i) => {
    const btn = document.createElement("button");
    btn.type = "button"; btn.className = "dock-block";
    btn.style.flexGrow = String(spans[i]);
    // each phase's block shows its whole span, so its edges never read as another phase's start;
    // Hello's shows its name
    const label = (b.dataset.name ?? b.querySelector("h2")?.textContent ?? "").toLowerCase();
    const span = isPhase(b) ? `${Math.floor(year(b.dataset.start))}–${Math.floor(year(b.dataset.end))}` : label;
    btn.setAttribute("aria-label", `${label}, ${span}`);
    // the name is hidden until the block is hovered or focused, then types out like the logotype
    const name = document.createElement("span"); name.className = "dock-block-name"; name.setAttribute("aria-hidden", "true");
    const yr = document.createElement("span"); yr.className = "dock-block-year"; yr.setAttribute("aria-hidden", "true");
    yr.textContent = column && isPhase(b) ? `’${String(Math.floor(year(b.dataset.start))).slice(2)}` : span;
    btn.append(yr, name);
    if (!isPhase(b)) { shows.push(() => {}); btn.setAttribute("aria-label", label); btn.addEventListener("click", () => { scrollToY(b.offsetTop); onPress?.(); }); el.append(btn); return btn; }
    const show = () => { name.dataset.typing = ""; void retype(name, label); };
    const hide = () => { void retype(name, "").then(() => { if (!name.textContent) delete name.dataset.typing; }); };
    shows.push((on) => (on ? show() : hide()));
    if (!column) {
      btn.addEventListener("pointerenter", show); btn.addEventListener("focus", show);
      btn.addEventListener("pointerleave", hide); btn.addEventListener("blur", hide);
    }
    btn.addEventListener("click", () => { scrollToY(b.offsetTop); onPress?.(); });
    el.append(btn);
    return btn;
  });
  const scrollToY = (y: number) => void travelTo(y);
  const marker = document.createElement("span");
  marker.className = "dock-marker"; marker.setAttribute("aria-hidden", "true");
  el.append(marker);

  // where the reader is: which beat the middle of the view is in and how far through it (a beat's
  // middle is its exact place), drawn across the blocks
  function sync() {
    const n = beats.length - 1, mid = scrollY + innerHeight / 2;
    let k = beats.findIndex((b) => mid < b.offsetTop + b.offsetHeight);
    if (k < 0) k = n;
    // a beat a screen tall is placed at its middle; a phone's column, screens long, is current from its
    // first line, and the marker crosses its block as you read down it
    const f = Math.max(0, Math.min(n, k + (mid - beats[k].offsetTop) / Math.max(1, beats[k].offsetHeight) - (column ? 0 : 0.5)));
    const i = Math.min(n, Math.floor(f + 1e-6)), t = f - i;
    // the marker is a single point travelling through time between phases, and opens into a
    // highlight over the label of the phase you've arrived at (whose text then reads black)
    const before = spans.slice(0, i).reduce((a, c) => a + c, 0);
    const box = el.getBoundingClientRect(), horiz = box.width >= box.height, len = horiz ? box.width : box.height;
    const point = ((before + t * spans[i]) / total) * len;
    const near = Math.round(f), d = Math.abs(f - near);
    const open = 1 - Math.min(1, Math.max(0, (d - 0.03) / 0.12)); // fully open within a few % of a phase, a point beyond ~15%
    const eased = open * open * (3 - 2 * open);
    const label = blocks[near].querySelector<HTMLElement>(".dock-block-year")!.getBoundingClientRect(), pad = 6;
    const lStart = (horiz ? label.left - box.left : label.top - box.top) - pad, lLen = (horiz ? label.width : label.height) + pad * 2;
    marker.style.insetInlineStart = `${point + (lStart - point) * eased}px`;
    marker.style.inlineSize = `${1 + (lLen - 1) * eased}px`;
    blocks.forEach((x, k) => (k === i ? x.setAttribute("aria-current", "step") : x.removeAttribute("aria-current")));
    if (column && i !== named) { if (named >= 0) shows[named](false); shows[i](true); named = i; }
  }
  let named = -1;
  addEventListener("scroll", sync, { passive: true });
  addEventListener("resize", sync);
  const off = () => { removeEventListener("scroll", sync); removeEventListener("resize", sync); };
  sync();
  return {
    el,
    /** an eased trip to a scroll position, the same one a block press makes */
    travel: scrollToY,
    destroy() { off(); el.remove(); },
  };
}
