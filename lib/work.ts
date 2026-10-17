// The work page as a corridor through time (Kevin, Oct 16). Every year is a stop, newest first; a
// year is a screen of scrolling, and scrolling moves the camera down the corridor, past the years
// still ahead of it in depth. When the reader stops, the page settles on the nearest year (the same
// eased trip as every other, lib/travel.ts). A year sets in as it comes near, its words first and
// its screenshots after, one by one; that is how a dive into the page lands. Opening a piece types
// its words in; closing it types them out. Crossing years rushes the field, and at the oldest year
// the shards gather back into the circle (lib/flight.ts). The field is the only thing with its own
// motion; everything here is the camera or the one transition.
//
// Phones read the years as a column (Kevin, Oct 16): no corridor, each year setting in as it scrolls
// into view. With reduced motion, the corridor is still there; the field keeps its moods.
//
// A link into the page (cohesion branch) names a year (#year-2008) or a piece of work (#work-…):
// the corridor travels there, eased, from wherever it is, and a piece opens on arrival. A link
// from another page lands here at now, then takes the same trip, so arriving from the timeline is
// the dive and then the years passing. Links on this page to the timeline leave through the docks.

import { begun, onBegin } from "@/lib/begin";
import { columnInView, isColumn } from "@/lib/column";
import { crossYear, diveProgress, diving, setGather, setShape } from "@/lib/flight";
import { EVENT_GO, onLeave, takePending } from "@/lib/route";
import { travelTo } from "@/lib/travel";
import { leave, setIn, setOut, typeIn, typeOut, unset } from "@/lib/type";
import { dock } from "@/tokens/dock";
import { motion } from "@/tokens/motion";

const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const smooth = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

export function work() {
  const F = motion.flight, T = dock.typing;
  const root = document.documentElement;
  const column = isColumn();
  root.setAttribute("data-work", column ? "column" : "corridor");
  setShape(true);

  // this page's years only: the colophon's sections are stops too, and Next may be keeping it, hidden
  const stops = [...document.querySelectorAll<HTMLElement>(".work > .stop")];
  // the quiet years are hidden in the document (app/work/page.tsx); the corridor is where they show, as distance
  if (!column) for (const s of stops) if (s.classList.contains("quiet")) s.hidden = false;
  const spaces = stops.map((s) => s.querySelector<HTMLElement>(".stop-space")!);
  const n = stops.length;
  // one year of scrolling, and where the camera is in years from now
  const yearPx = () => stops[0]?.offsetHeight || innerHeight;
  const camAt = () => scrollY / yearPx();

  // a year comes near: its words set in, then its screenshots, one after another, a box's time apart
  const arrived = new Set<number>();
  const timers: number[] = [];
  function arrive(i: number) {
    if (arrived.has(i)) return;
    arrived.add(i);
    const sp = spaces[i];
    sp.dataset.arrived = "";
    for (const part of sp.querySelectorAll<HTMLElement>(":scope > .stop-head, :scope > .stop-quiet")) setIn(part);
    const box = T.charMs * T.revealSteps;
    sp.querySelectorAll<HTMLElement>(".stop-shot").forEach((shot, k) => timers.push(window.setTimeout(() => setIn(shot), box * (k + 1))));
  }
  // a dive lands on its last beat: nothing arrives until it is nearly through
  const ready = () => begun() && (!diving() || diveProgress() > 0.72);

  // opening a piece types its words in; closing it types them out, then it closes
  const partsOf = (d: HTMLDetailsElement) => [...d.children].filter((c): c is HTMLElement => c.tagName !== "SUMMARY" && c instanceof HTMLElement);
  const closing = new WeakSet<HTMLDetailsElement>();
  const close = (d: HTMLDetailsElement) => {
    if (!d.open || closing.has(d)) return;
    closing.add(d);
    void Promise.all(partsOf(d).map((p) => leave(p))).then(() => { d.open = false; closing.delete(d); });
  };
  const open = (d: HTMLDetailsElement) => { if (d.open) return; d.open = true; partsOf(d).forEach((p) => { setIn(p); void typeIn(p); }); };
  const onSummary = (e: MouseEvent) => {
    const sum = (e.target as HTMLElement).closest("summary");
    const d = sum?.parentElement;
    if (!sum || !(d instanceof HTMLDetailsElement) || !d.closest(".stop")) return;
    e.preventDefault();
    if (!d.open) open(d); else close(d);
  };
  document.addEventListener("click", onSummary);
  // a journey to a year or a piece of work on this page: once any dive into the page has landed,
  // down (or up) the corridor to its year, then the piece opens; the address says where you are
  let journeying = 0, gone = false; // a page taken down mid-journey stops where it is
  async function journey(id: string) {
    const el = document.getElementById(id), stop = el?.closest<HTMLElement>(".work > .stop");
    if (!el || !stop) return;
    const run = ++journeying, still = () => run === journeying && !gone;
    await diving();
    if (!still()) return;
    if (column) {
      const topDock = Math.max(0, ...[...document.querySelectorAll<HTMLElement>(".dock")].map((d) => d.getBoundingClientRect()).filter((r) => r.top < innerHeight / 2).map((r) => r.bottom));
      await travelTo(stop.offsetTop - topDock - 24);
    } else await travelTo(stops.indexOf(stop) * yearPx());
    if (!still()) return;
    if (el instanceof HTMLDetailsElement) open(el);
    if (location.hash.slice(1) !== id) history.replaceState(history.state, "", `#${id}`);
  }
  const linkable = (id: string) => /^(year-|work-)/.test(id) && !!document.getElementById(id);
  const onLink = (e: MouseEvent) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
    const id = a?.getAttribute("href")!.slice(1);
    if (!id || !linkable(id)) return;
    e.preventDefault();
    history.pushState(null, "", `#${id}`);
    void journey(id);
  };
  document.addEventListener("click", onLink);
  const onGo = (e: Event) => { const id = (e as CustomEvent<string>).detail; if (linkable(id)) void journey(id); };
  addEventListener(EVENT_GO, onGo);
  const onPop = () => { const id = location.hash.slice(1); if (linkable(id)) void journey(id); };
  addEventListener("popstate", onPop);
  // arriving from another page with somewhere to go (lib/route.ts), or coming back to an address
  // (taken on the next frame, so a page mounted and unmounted at once, as in development, leaves it)
  requestAnimationFrame(() => {
    if (gone) return;
    const came = takePending() || (begun() ? location.hash.slice(1) : "");
    if (came && linkable(came)) void journey(came);
  });
  const offLinks = () => { gone = true; ++journeying; document.removeEventListener("click", onLink); removeEventListener(EVENT_GO, onGo); removeEventListener("popstate", onPop); };
  // the ways out of a piece (Kevin, Oct 16: "I can't get out of it"): Escape closes it, as Escape
  // steps back out on the timeline; reading past its end hands the scroll back to the corridor
  // (globals.css), and leaving its year closes it behind you
  const openIn = (el: ParentNode) => [...el.querySelectorAll<HTMLDetailsElement>(".stop details[open]")];
  const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") openIn(document).forEach(close); };
  document.addEventListener("keydown", onKey);

  // leaving the page: every year that has come in types out and withdraws
  const offLeave = onLeave(async () => {
    timers.forEach(clearTimeout);
    await Promise.all([...arrived].map((i) => Promise.all([typeOut(spaces[i]), ...[...spaces[i].querySelectorAll<HTMLElement>("[data-set]")].map((el) => setOut(el))])));
  });

  // gone from sight (Next keeps the page, hidden, for a later visit): the years go back to how they
  // first were, so coming back they set in again
  function unsettle() {
    for (const sp of spaces) {
      unset(sp); delete sp.dataset.arrived; sp.removeAttribute("data-here");
      for (const k of ["visibility", "opacity", "transform", "z-index"]) sp.style.removeProperty(k);
    }
    for (const s of stops) if (s.classList.contains("quiet")) s.hidden = true;
  }

  if (column) {
    // phones: a column, each year setting in as its top comes into view
    let seen: IntersectionObserver | null = null;
    const off = onBegin(() => {
      seen = new IntersectionObserver((entries) => {
        for (const e of entries) if (e.isIntersecting && ready()) { seen!.unobserve(e.target); arrive(stops.indexOf(e.target as HTMLElement)); }
      }, columnInView);
      stops.forEach((s) => seen!.observe(s));
    });
    return { destroy() { off(); seen?.disconnect(); offLeave(); offLinks(); document.removeEventListener("click", onSummary); document.removeEventListener("keydown", onKey); timers.forEach(clearTimeout); root.removeAttribute("data-work"); setShape(false); setGather(0); unsettle(); } };
  }

  // the corridor: each year placed in depth by how far it is from the camera
  let raf = 0, lastYear = Math.round(camAt());
  function frame() {
    const cam = camAt();
    const go = ready();
    // while a piece is open, the years behind it step back so it can be read
    const here = spaces[Math.round(clamp(cam, 0, n - 1))], reading = !!here?.querySelector("details[open]");
    for (let i = 0; i < n; i++) {
      const rel = i - cam, sp = spaces[i], quietYear = stops[i].classList.contains("quiet");
      if (rel < -0.3 || rel > (quietYear ? 1.6 : 4.5)) { sp.style.visibility = "hidden"; continue; }
      if (go && rel <= 2.2) arrive(i);
      // ahead of the camera a year hazes with distance; one passing it fades as it goes by
      let o = rel < 0 ? clamp(1 + rel / 0.28) : clamp(1 - rel * 0.3);
      if (quietYear) o *= 0.3;
      if (reading && sp !== here) o *= 0.15;
      sp.style.visibility = "";
      sp.style.opacity = o.toFixed(3);
      sp.style.transform = `translate(-50%, -50%) perspective(1000px) translateZ(${(-rel * F.depthPx).toFixed(1)}px)`;
      sp.style.zIndex = String(clamp(Math.round(6 - rel * 2), 1, 9)); // nearer years in front of farther ones, all under the docks
      sp.toggleAttribute("data-here", Math.abs(rel) < 0.35);
    }
    const y = Math.round(cam);
    if (y !== lastYear) { const left = spaces[clamp(lastYear, 0, n - 1)]; if (left) openIn(left).forEach(close); crossYear(y - lastYear); lastYear = y; }
    setGather(smooth(n - 2.2, n - 1, cam));
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  // stopping between years settles on the nearest one
  let quiet = 0;
  const onScroll = () => {
    clearTimeout(quiet);
    quiet = window.setTimeout(() => {
      const cam = camAt(), to = Math.round(cam);
      if (Math.abs(cam - to) > 0.002) void travelTo(to * yearPx());
    }, F.settleMs);
  };
  addEventListener("scroll", onScroll, { passive: true });

  return {
    destroy() {
      cancelAnimationFrame(raf); clearTimeout(quiet); timers.forEach(clearTimeout);
      removeEventListener("scroll", onScroll); document.removeEventListener("click", onSummary); document.removeEventListener("keydown", onKey); offLeave(); offLinks();
      root.removeAttribute("data-work"); setShape(false); setGather(0); unsettle();
    },
  };
}
