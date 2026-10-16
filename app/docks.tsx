"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { begin } from "@/lib/begin";
import { isColumn } from "@/lib/column";
import { createBar } from "@/lib/dock/bar";
import { draggable } from "@/lib/dock/draggable";
import { ambienceControls, navLinks } from "@/lib/dock/nav";
import { popover } from "@/lib/dock/popover";
import { arrive, leave } from "@/lib/type";
import { resetComposition, setAnimation } from "@/lib/ambience";
import { spanOpposite } from "@/lib/dock/span";
import { timelineBlocks } from "@/lib/dock/timeline";
import { typing } from "@/lib/dock/typing";
import { visualizer } from "@/lib/dock/visualizer";
import { soundSwitch } from "@/lib/sound/switch";
import { dive, setShape } from "@/lib/flight";
import { leavePage } from "@/lib/route";
import { travelTo } from "@/lib/travel";
import { dock } from "@/tokens/dock";
import { motion } from "@/tokens/motion";

// Mount point for the docks. React is only the shell; the bars are plain DOM.
// The page opens with the field still, the logotype typing, and one button, begin. Pressing it drops
// the logo behind the button; then the button withdraws while the field, the music, the visualizer
// and the docks come in: dock 1, the nav and effects controls, is
// draggable; dock 2, the timeline, spans the edge opposite it. Everything arrives and leaves by the
// one pattern, type in and type out (lib/type.ts).
/** the logo falls to the button's place, easing in, and passes behind it */
function drop(logo: HTMLElement, button: HTMLElement): Promise<void> {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) { logo.style.visibility = "hidden"; return Promise.resolve(); }
  const a = logo.getBoundingClientRect(), b = button.getBoundingClientRect();
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  const run = logo.animate([{ transform: "translateY(0)" }, { transform: `translateY(${dy}px)` }],
    { duration: motion.beginDropMs, easing: "cubic-bezier(.55, 0, .9, .45)", fill: "forwards" });
  return run.finished.then(() => { logo.style.visibility = "hidden"; });
}

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
    const cleanup: (() => void)[] = [];
    // before begin: the logotype typing on its own, with begin under it
    const NAMES = ["Kevin Conboy", "Alternate.org", { text: "View Source", italic: true }];
    const intro = document.createElement("div");
    intro.className = "intro";
    const logo = typing(NAMES);
    const go = document.createElement("button");
    go.type = "button"; go.className = "begin"; go.textContent = "begin";
    intro.append(logo.el, go);
    document.body.append(intro);
    void arrive(intro);
    go.focus({ preventScroll: true });
    // the page waits at dial-up, the top, unseen behind the begin screen; once everything has come
    // in, it travels down through every phase to the welcome at the end
    window.scrollTo({ top: 0, behavior: "instant" });

    go.addEventListener("click", () => {
      const sound = soundSwitch();
      sound.start(); // inside the press, so the browser lets it play
      go.setAttribute("aria-disabled", "true"); go.style.pointerEvents = "none"; // no restyle, just no second press
      // the logo drops down behind the button; then the button withdraws while everything else sets in
      void drop(logo.el, go).then(() => {
        void Promise.all([logo.out(), leave(go)]).then(() => { logo.destroy(); intro.remove(); });
        enter(sound);
      });
    }, { once: true });

    // everything after begin: the field and music start, the docks set in
    function enter(sound: ReturnType<typeof soundSwitch>) {
      begin();
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
      const fx = popover(navBar, { id: "ambience", label: "ambience", buttonClass: "dock-ambience" });
      // the logotype is the way home: pressing it travels, eased, to Hello
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
      let going = false;
      async function go(to: string) {
        if (going) return;
        going = true;
        const into = to === WORK && location.pathname !== WORK;
        if (into) void dive((t) => { if (t > 0.35) setShape(true); });
        else setShape(false);
        await Promise.all([leavePage(), to === HOME ? null : timeline(false)]);
        router.push(to);
        going = false;
      }
      // the nav's link to the page we're already on doesn't reload it: it travels, eased, to the start;
      // a link to another page goes there without a reload
      const onLink = (e: MouseEvent) => {
        const a = (e.target as HTMLElement).closest<HTMLAnchorElement>("a[href]");
        if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        const to = a.getAttribute("href")!;
        if (a.getAttribute("aria-current") === "page") { e.preventDefault(); travel(0); return; }
        if (to === HOME || to === WORK) { e.preventDefault(); void go(to); }
      };
      links.el.addEventListener("click", onLink);
      home.addEventListener("click", () => {
        const hello = document.querySelector<HTMLElement>(".beat.welcome");
        if (hello) travel(hello.offsetTop); else void go(HOME);
      });
      live.current = {
        timeline,
        current(p) { links.el.querySelectorAll("a").forEach((a) => (a.getAttribute("href") === p ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current"))); },
      };

      const viz = visualizer(navBar, sound);
      // the opening trip: down through every phase to Hello, or, when the page was opened on a link to
      // a phase or a piece, a journey to it (lib/surface.ts). The work page opens where it is, at now.
      const opened = location.hash.slice(1), atHome = location.pathname === HOME;
      void Promise.all([arrive(navBar.el), timeline(atHome)]).then(() => {
        if (!atHome) return;
        if (opened && /^(phase-|piece-|welcome$)/.test(opened) && document.getElementById(opened)) dispatchEvent(new CustomEvent("viewsource:go", { detail: opened }));
        else travel(document.documentElement.scrollHeight);
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
