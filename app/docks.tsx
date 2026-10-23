"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { begin, clear, namesAPiece, whenClear } from "@/lib/begin";
import { isColumn } from "@/lib/column";
import { clearance, createBar } from "@/lib/dock/bar";
import { draggable } from "@/lib/dock/draggable";
import { ambienceControls, navLinks } from "@/lib/dock/nav";
import { popover } from "@/lib/dock/popover";
import { arrive, leave, typeIn, typeOut } from "@/lib/type";
import { resetComposition, setAnimation } from "@/lib/ambience";
import { spanOpposite } from "@/lib/dock/span";
import { timelineBlocks } from "@/lib/dock/timeline";
import { typing } from "@/lib/dock/typing";
import { visualizer } from "@/lib/dock/visualizer";
import { soundSwitch } from "@/lib/sound/switch";
import { dive, setShape } from "@/lib/flight";
import { goHere, leavePage, parseLink, registerGo, setPending } from "@/lib/route";
import { travelTo } from "@/lib/travel";
import { dock } from "@/tokens/dock";
import { motion } from "@/tokens/motion";

// Mount point for the docks. React is only the shell; the bars are plain DOM.
// The home page opens with the field still, the logotype typing, and one button, begin. Pressing it drops
// the logo behind the button, and out from under the button drops one line, "this site was written
// to be played loud, so TURN IT UP" (Kevin, Oct 17), typing in as it falls; then the button withdraws
// while the field, the music, the visualizer and the docks come in: dock 1, the nav and effects
// controls, is draggable; dock 2, the timeline, spans the edge opposite it. The line holds as long
// as the logotype holds a name, then erases, and only then do the page's words come in (Kevin,
// Oct 18: the Hello waits for it, so nothing overlaps; lib/begin.ts). A visit opened on a piece or a
// phase skips the line and the press goes straight into the trip there (Kevin, Oct 19). Everything arrives and leaves
// by the one pattern, type in and type out (lib/type.ts); the fall is the begin drop, the one motion
// the gate has. The gate is the home page's alone (Kevin, Oct 18): every other page opens straight
// in with the docks, and sound starts from the ambience popover's switch, a press of its own.
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const center = (el: Element) => { const r = el.getBoundingClientRect(); return r.top + r.height / 2; };
/** the begin drop: el falls from `from` to `to` px below its place, easing in like a fall */
function fall(el: HTMLElement, from: number, to: number) {
  return el.animate([{ transform: `translateY(${from}px)` }, { transform: `translateY(${to}px)` }],
    { duration: motion.beginDropMs, easing: "cubic-bezier(.55, 0, .9, .45)", fill: "forwards" }).finished;
}
/** the logo falls to the button's place, easing in, and passes behind it */
function drop(logo: HTMLElement, button: HTMLElement): Promise<void> {
  if (reduced()) { logo.style.visibility = "hidden"; return Promise.resolve(); }
  return fall(logo, 0, center(button) - center(logo)).then(() => { logo.style.visibility = "hidden"; });
}
/** the line under begin: starts behind the button, falls out from under it to its place beneath
 *  while its words type in, holds, and erases; `done` resolves once it has gone. Leaving the page
 *  while it holds hushes it: it erases then. Reduced motion: simply there, then gone */
type Line = { done: Promise<void>; hush(): void };
function loud(button: HTMLElement): Line {
  const line = document.createElement("p");
  line.className = "begin-loud"; line.textContent = "this site was written to be played loud, so TURN IT UP";
  button.after(line);
  if (!reduced()) void fall(line, center(button) - center(line), 0);
  let hushed = () => {};
  const leaving = new Promise<void>((r) => { hushed = r; });
  const done = typeIn(line).then(() => Promise.race([wait(dock.typing.holdMs), leaving])).then(() => typeOut(line)).then(() => {});
  return { done, hush: () => hushed() };
}
/** no line: a phone's gate is only the button, and every other page has no gate */
const NO_LINE: Line = { done: Promise.resolve(), hush() {} };
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// The timeline belongs to the home page. Going to work dives into it: the timeline and the page's
// words leave by the one transition while the field streams past and the source art becomes a circle,
// and the work page lands at now (lib/work.ts). The docks, the field and the music stay across pages.
const HOME = "/", WORK = "/work";
type Live = { timeline(on: boolean): Promise<unknown>; current(path: string): void };

export default function Docks() {
  const router = useRouter(), path = usePathname();
  const live = useRef<Live | null>(null);
  // a new page: the nav marks it, and the timeline is there only at home
  useEffect(() => { live.current?.current(path); void live.current?.timeline(path === HOME); }, [path]);
  useEffect(() => {
    // the page is the docks' now: the server's nav steps aside for them (app/nav.css), and the words
    // keep clear of the edges they dock to (--dock-clear, globals.css)
    const root = document.documentElement;
    root.setAttribute("data-docked", "");
    root.style.setProperty("--dock-clear", `${clearance()}px`);
    const cleanup: (() => void)[] = [() => { root.removeAttribute("data-docked"); root.style.removeProperty("--dock-clear"); }];
    const NAMES = ["Kevin Conboy", "Alternate.org", { text: "View Source", italic: true }];
    // the page waits at its top (Hello, unseen behind the begin screen; now, on the work page), and
    // stays there once everything has come in (Kevin, Oct 16: no opening trip; newest is first)
    window.scrollTo({ top: 0, behavior: "instant" });
    // every page but home opens straight in, the docks with it; the page takes its own address
    if (location.pathname !== HOME) {
      enter(soundSwitch(), NO_LINE, false);
      return () => cleanup.forEach((f) => f());
    }
    // before begin: the logotype typing on its own, with begin under it
    const intro = document.createElement("div");
    intro.className = "intro";
    const logo = typing(NAMES);
    const go = document.createElement("button");
    go.type = "button"; go.className = "begin"; go.textContent = "begin";
    intro.append(logo.el, go);
    document.body.append(intro);
    void arrive(intro);
    go.focus({ preventScroll: true });

    go.addEventListener("click", () => {
      const sound = soundSwitch();
      sound.start(); // inside the press, so the browser lets it play
      go.setAttribute("aria-disabled", "true"); go.style.pointerEvents = "none"; // no restyle, just no second press
      // the logo drops down behind the button and the line drops out from under it (a desktop's
      // gate; a phone's is only the button); then the button withdraws while everything else sets
      // in, and the line stays to be read until it erases. A visit that names a piece or a phase
      // (/#piece-…, /#phase-…) goes straight to it (Kevin, Oct 19): no line, and the trip starts with
      // the press, unseen, the phase setting in once the button has gone
      const straight = !isColumn() && namesAPiece(location.hash.slice(1));
      const line = isColumn() || straight ? NO_LINE : loud(go);
      if (straight) goHere(location.hash.slice(1));
      void drop(logo.el, go).then(() => {
        const gone = Promise.all([logo.out(), leave(go)]).then(() => { logo.destroy(); intro.style.pointerEvents = "none"; });
        void Promise.all([gone, line.done]).then(() => intro.remove());
        enter(sound, straight ? { done: gone.then(() => {}), hush() {} } : line, true, straight);
      });
    }, { once: true });

    // everything after begin: the field and music start, the docks set in, and once the line under
    // begin has erased (at once where there is none) the page's words come in
    function enter(sound: ReturnType<typeof soundSwitch>, line: Line, gated: boolean, journeying = false) {
      begin();
      void line.done.then(clear);
      const navBar = createBar({ id: "nav", label: "Main" });
      const nav = draggable(navBar, { maxLength: dock.navMaxLength, start: dock.navStart, stops: dock.stops, edges: [...dock.navEdges], zones: true });
      const cursor = typing(NAMES);
      const links = navLinks(
        [
          { label: "timeline", href: "/" },
          { label: "work", href: "/work" },
          { label: "colophon", href: "/colophon" },
        ],
        location.pathname,
      );
      // on a phone the popover holds the pages too, so its button is the menu; on a desktop, ambience
      const fx = popover(navBar, { id: "ambience", label: isColumn() ? "menu" : "ambience", buttonClass: "dock-ambience" });
      // the logotype is the way home: pressing it travels, eased, to Hello, the top of the page
      const home = document.createElement("button");
      home.type = "button"; home.className = "dock-home"; home.setAttribute("aria-label", "Kevin Conboy: go to Hello");
      home.append(cursor.el);
      const controls = ambienceControls({ animation: setAnimation, reset: resetComposition });
      // on a phone the bar holds the logotype and ambience; the pages go in the popover, above the effects
      if (isColumn()) { navBar.content.append(home, fx.button); fx.panel.append(links.el, sound.el, ...controls.els); }
      else { navBar.content.append(home, links.el, fx.button); fx.panel.append(sound.el, ...controls.els); }
      (window as unknown as { dooombient: typeof sound }).dooombient = sound;

      // a new location steps the cursor on; a drag that lands where it started does not
      let at = navBar.el.dataset.p;
      const onDrop = (e: Event) => {
        const d = (e as CustomEvent<{ id: string; p: number }>).detail;
        if (d.id !== "nav" || d.p.toFixed(4) === at) return;
        at = d.p.toFixed(4); cursor.step();
      };
      addEventListener("dock:drop", onDrop);

      // the timeline: across the edge opposite the nav, on the home page only
      let tl: { bar: ReturnType<typeof createBar>; span: { destroy(): void }; blocks: ReturnType<typeof timelineBlocks> } | null = null;
      let tlBusy: Promise<unknown> = Promise.resolve();
      const timeline = (on: boolean) => (tlBusy = tlBusy.then(async () => {
        if (on && !tl) {
          const bar = createBar({ id: "timeline", label: "Timeline" });
          const span = spanOpposite(bar, { id: "nav", place: nav.place });
          // a press on the timeline steps the logotype on, as moving the nav does
          const blocks = timelineBlocks(() => cursor.step());
          bar.content.append(blocks.el);
          tl = { bar, span, blocks };
          await arrive(bar.el);
        } else if (!on && tl) {
          const t = tl; tl = null;
          await leave(t.bar.el);
          t.blocks.destroy(); t.span.destroy(); t.bar.destroy();
        }
      }));
      const travel = (y: number) => (tl ? tl.blocks.travel(y) : void travelTo(y));
      // going to another page: this page's words and the timeline leave, then the next page comes in.
      // Into work it is a dive: the shards stream past, and the art becomes a circle as you pass through
      // A link can name a thing on the page it goes to (a piece, a year): it is left pending for that
      // page to journey to once it has come in (lib/route.ts)
      let going = false;
      async function go(to: string, hash = "") {
        if (going) return;
        going = true;
        // leaving while the line under begin still holds: it erases now, before the next page comes in
        line.hush();
        const into = to === WORK && location.pathname !== WORK;
        if (into) void dive((t) => { if (t > 0.35) setShape(true); });
        else setShape(false);
        setPending(hash);
        await Promise.all([leavePage(), to === HOME ? null : timeline(false), whenClear()]);
        router.push(to);
        going = false;
      }
      cleanup.push(registerGo((p, h) => void go(p, h)));
      // links into the site from anywhere on the page: the words of a piece, a milestone, the colophon.
      // One to another page goes there the way the nav does; one to this page (/work#year-2008 while on
      // the work page) is the page's own, asked for by id; a plain #id is left to the page entirely
      const onSiteLink = (e: MouseEvent) => {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        const a = (e.target as HTMLElement).closest<HTMLAnchorElement>("a[href]");
        if (!a || navBar.el.contains(a) || a.target === "_blank") return;
        const href = a.getAttribute("href")!;
        if (href.startsWith("#")) return;
        const link = parseLink(href);
        if (!link) return;
        e.preventDefault();
        if (link.path === location.pathname.replace(/\/+$/, "") || (link.path === HOME && location.pathname === HOME)) {
          if (link.hash) { history.pushState(null, "", `#${link.hash}`); goHere(link.hash); } else travel(0);
          return;
        }
        void go(link.path, link.hash);
      };
      document.addEventListener("click", onSiteLink);
      cleanup.push(() => document.removeEventListener("click", onSiteLink));
      // the nav's link to the page we're already on doesn't reload it: it travels, eased, to the start;
      // a link to any other page goes there without a reload, so begin is never asked for twice
      const onLink = (e: MouseEvent) => {
        const a = (e.target as HTMLElement).closest<HTMLAnchorElement>("a[href]");
        if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        const to = a.getAttribute("href")!;
        if (a.getAttribute("aria-current") === "page") { e.preventDefault(); travel(0); return; }
        if (to.startsWith("/")) { e.preventDefault(); void go(to); }
      };
      links.el.addEventListener("click", onLink);
      home.addEventListener("click", () => {
        // Hello may still be in the document on another page (Next keeps recent pages, hidden): ask where we are
        if (location.pathname === HOME) travel(0); else void go(HOME);
      });
      live.current = {
        timeline,
        current(p) { links.el.querySelectorAll("a").forEach((a) => (a.getAttribute("href") === p ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current"))); },
      };

      const viz = visualizer(navBar, sound);
      // the page opens where it is, at Hello, or at now on the work page; opened on a link to something
      // on it (a phase, a piece, a year), it journeys there: behind the gate, once the docks are in (the
      // page's words wait for the line, lib/surface.ts), or from the press itself when the address names
      // a piece or a phase on a desktop (it's already on its way); with no gate the page took its address
      // as it mounted, begun (lib/work.ts)
      const opened = location.hash.slice(1), atHome = location.pathname === HOME;
      void Promise.all([arrive(navBar.el), timeline(atHome)]).then(() => {
        if (gated && !journeying && opened && document.getElementById(opened)) goHere(opened);
      });
      cleanup.push(() => {
        removeEventListener("dock:drop", onDrop); live.current = null;
        viz.destroy(); if (tl) { tl.blocks.destroy(); tl.span.destroy(); tl.bar.destroy(); }
        controls.destroy(); sound.destroy(); cursor.destroy(); links.destroy(); fx.destroy(); nav.destroy(); navBar.destroy();
      });
    }

    return () => { logo.destroy(); intro.remove(); cleanup.forEach((f) => f()); };
    // the docks are built once and outlive every page; the router is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
