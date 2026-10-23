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
import { traveling, travelTo } from "@/lib/travel";
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
  // one year of scrolling, and where the camera is in years from now. A piece open can be longer than
  // the screen: its year then takes that much more scroll, and the window reads it, so there is no
  // box with a scrollbar of its own to crop the words. While it is read the camera waits at the year.
  const extra = stops.map(() => 0); // px of reading each year holds beyond its screen
  const yearPx = () => (stops[0]?.offsetHeight || innerHeight) - extra[0];
  const topOf = (i: number) => { let t = i * yearPx(); for (let j = 0; j < i; j++) t += extra[j]; return t; };
  /** the camera: which year it is at, in years from now, and how far down an open piece it has read */
  function where() {
    const s = scrollY, y = yearPx();
    let top = 0;
    for (let i = 0; i < n; i++) {
      if (s < top + y + extra[i] || i === n - 1) return { at: i + Math.max(0, s - top - extra[i]) / y };
      top += y + extra[i];
    }
    return { at: 0 };
  }
  const camAt = () => where().at;
  // what a year's words may take of the screen: the middle 80%, and the scrim's margins (globals.css)
  const room = () => innerHeight * 0.8 + 40;
  function setExtra(k: number, e: number) {
    e = Math.max(0, Math.round(e));
    const old = extra[k];
    if (e === old) return;
    // read all the way through and on to the next year: the length handed back comes off the scroll
    // too, so the camera stays where it is and nothing jumps
    const top = topOf(k);
    const past = e < old && scrollY >= top + old;
    // still reading below where the year now ends (a trip back up was cut short): stop at its end
    const deep = e < old && scrollY > top + e && scrollY < top + old;
    extra[k] = e;
    stops[k].style.height = e ? `calc(100dvh + ${e}px)` : "";
    if (past) window.scrollTo({ top: scrollY - (old - e), behavior: "instant" });
    else if (deep) window.scrollTo({ top: top + e, behavior: "instant" });
  }
  // the years whose words are longer than the screen: a year with many pieces is, before any is open,
  // and a piece open makes its year longer still. Measured as they change, and again when the window does.
  const tall = new Set<number>();
  const survey = () => spaces.forEach((sp, i) => { if (sp.offsetHeight > room()) tall.add(i); });
  function measure() {
    for (const k of tall) {
      setExtra(k, spaces[k].offsetHeight - room());
      if (!extra[k]) tall.delete(k);
    }
  }
  /** where the stop at i begins to be read from the end of its piece: the stop to settle on when the camera is between years */
  const settleAt = (i: number, at: number) => (i < at ? topOf(i) + extra[i] : topOf(i));

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
  // after the key press that asked has finished: a key press cuts any trip short (lib/travel.ts), this one's own included
  const later = () => new Promise<void>((r) => setTimeout(r, 0));
  const close = (d: HTMLDetailsElement) => {
    if (!d.open || closing.has(d)) return;
    closing.add(d);
    // read some way down it, the page eases back up to the top of its year as the words type out
    const k = stops.indexOf(d.closest<HTMLElement>(".stop")!);
    const here = k >= 0 && !column && scrollY > topOf(k) && scrollY < topOf(k) + yearPx() + extra[k];
    void Promise.all([...partsOf(d).map((p) => leave(p)), here && scrollY < topOf(k) + extra[k] ? later().then(() => travelTo(topOf(k))) : null]).then(() => { d.open = false; closing.delete(d); });
  };
  const open = (d: HTMLDetailsElement) => {
    if (d.open) return;
    d.open = true;
    const k = stops.indexOf(d.closest<HTMLElement>(".stop")!);
    if (k >= 0 && !column) tall.add(k);
    partsOf(d).forEach((p) => { setIn(p); void typeIn(p); });
  };
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
    } else await travelTo(topOf(stops.indexOf(stop)));
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
      for (const k of ["visibility", "opacity", "transform", "z-index", "top", "--read"]) sp.style.removeProperty(k);
    }
    for (const s of stops) if (s.classList.contains("quiet")) s.hidden = true;
    extra.fill(0); tall.clear(); for (const s of stops) s.style.removeProperty("height");
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
  survey();
  addEventListener("resize", survey);
  let raf = 0, lastYear = Math.round(camAt());
  function frame() {
    measure();
    const cam = camAt(), go = ready();
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
      // a year with a long piece open sits from the top of its room, and the words travel up past it as they are read
      const e = extra[i], read = e ? Math.min(e, Math.max(0, scrollY - topOf(i))) : 0;
      if (e) { sp.style.top = `${(innerHeight - room()) / 2}px`; sp.style.setProperty("--read", `${read}px`); }
      else if (sp.style.top) { sp.style.removeProperty("top"); sp.style.removeProperty("--read"); }
      sp.style.transform = `translate(-50%, ${e ? `${-read}px` : "-50%"}) perspective(1000px) translateZ(${(-rel * F.depthPx).toFixed(1)}px)`;
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
      if (traveling()) return; // a trip to a far year is still under way; settling now cut it short (e2e, Oct 18)
      const cam = camAt(), to = Math.round(cam);
      if (Math.abs(cam - to) > 0.002) void travelTo(settleAt(to, cam));
    }, F.settleMs);
  };
  addEventListener("scroll", onScroll, { passive: true });

  return {
    destroy() {
      cancelAnimationFrame(raf); clearTimeout(quiet); timers.forEach(clearTimeout); removeEventListener("resize", survey);
      removeEventListener("scroll", onScroll); document.removeEventListener("click", onSummary); document.removeEventListener("keydown", onKey); offLeave(); offLinks();
      root.removeAttribute("data-work"); setShape(false); setGather(0); unsettle();
    },
  };
}
