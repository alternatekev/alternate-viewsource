"use client";

import { useEffect } from "react";
import { begin } from "@/lib/begin";
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

export default function Docks() {
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
      navBar.content.append(home, links.el, fx.button);
      const controls = ambienceControls({ animation: setAnimation, reset: resetComposition });
      fx.panel.append(sound.el, ...controls.els);
      (window as unknown as { dooombient: typeof sound }).dooombient = sound;

      // a new location steps the cursor on; a drag that lands where it started does not
      let at = navBar.el.dataset.p;
      const onDrop = (e: Event) => {
        const d = (e as CustomEvent<{ id: string; p: number }>).detail;
        if (d.id !== "nav" || d.p.toFixed(4) === at) return;
        at = d.p.toFixed(4); cursor.step();
      };
      addEventListener("dock:drop", onDrop);

      const timelineBar = createBar({ id: "timeline", label: "Timeline" });
      const timeline = spanOpposite(timelineBar, { id: "nav", place: nav.place });
      // a press on the timeline steps the logotype on, as moving the nav does
      const blocks = timelineBlocks(() => cursor.step());
      // the nav's link to the page we're already on doesn't reload it: it travels, eased, to the start
      const onHere = (e: MouseEvent) => {
        const a = (e.target as HTMLElement).closest<HTMLAnchorElement>("a[aria-current='page']");
        if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault(); blocks.travel(0);
      };
      links.el.addEventListener("click", onHere);
      home.addEventListener("click", () => { const hello = document.querySelector<HTMLElement>(".beat.welcome"); if (hello) blocks.travel(hello.offsetTop); });
      timelineBar.content.append(blocks.el);

      const viz = visualizer(navBar, sound);
      void Promise.all([arrive(navBar.el), arrive(timelineBar.el)]).then(() => blocks.travel(document.documentElement.scrollHeight));
      cleanup.push(() => {
        removeEventListener("dock:drop", onDrop);
        viz.destroy(); blocks.destroy(); timeline.destroy(); timelineBar.destroy();
        controls.destroy(); sound.destroy(); cursor.destroy(); links.destroy(); fx.destroy(); nav.destroy(); navBar.destroy();
      });
    }

    return () => { logo.destroy(); intro.remove(); cleanup.forEach((f) => f()); };
  }, []);
  return null;
}
