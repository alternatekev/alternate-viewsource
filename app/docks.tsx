"use client";

import { useEffect } from "react";
import { begin } from "@/lib/begin";
import { createBar } from "@/lib/dock/bar";
import { draggable } from "@/lib/dock/draggable";
import { ambience, ambienceControls, navLinks } from "@/lib/dock/nav";
import { resetComposition, setAnimation } from "@/lib/ambience";
import { spanOpposite } from "@/lib/dock/span";
import { timelineBlocks } from "@/lib/dock/timeline";
import { typing } from "@/lib/dock/typing";
import { visualizer } from "@/lib/dock/visualizer";
import { soundSwitch } from "@/lib/sound/switch";
import { dock } from "@/tokens/dock";

// Mount point for the docks. React is only the shell; the bars are plain DOM.
// The page opens with the field still and one button, begin. Pressing it starts the field, the
// music and the visualizer and brings in the docks: dock 1, the nav and effects controls, is
// draggable; dock 2, the timeline, spans the edge opposite it.
export default function Docks() {
  useEffect(() => {
    const cleanup: (() => void)[] = [];
    const go = document.createElement("button");
    go.type = "button"; go.className = "begin"; go.textContent = "begin";
    document.body.append(go);
    go.focus({ preventScroll: true });

    go.addEventListener("click", () => {
      go.remove();
      const sound = soundSwitch();
      sound.start(); // inside the press, so the browser lets it play
      begin();

      const navBar = createBar({ id: "nav", label: "Main" });
      const nav = draggable(navBar, { maxLength: dock.navMaxLength, start: dock.navStart, stops: dock.stops, edges: [...dock.navEdges] });
      const cursor = typing(["Kevin Conboy", "Alternate.org", { text: "View Source", italic: true }]);
      const links = navLinks(
        [
          { label: "timeline", href: "/" },
          { label: "work", href: "/work" },
          { label: "influences", href: "/influences" },
          { label: "colophon", href: "/colophon" },
        ],
        location.pathname,
      );
      const fx = ambience(navBar);
      navBar.content.append(cursor.el, links.el, fx.el);
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
      timelineBar.content.append(blocks.el);

      const viz = visualizer(navBar, sound);
      cleanup.push(() => {
        removeEventListener("dock:drop", onDrop);
        viz.destroy(); blocks.destroy(); timeline.destroy(); timelineBar.destroy();
        controls.destroy(); sound.destroy(); cursor.destroy(); links.destroy(); fx.destroy(); nav.destroy(); navBar.destroy();
      });
    }, { once: true });

    return () => { go.remove(); cleanup.forEach((f) => f()); };
  }, []);
  return null;
}
