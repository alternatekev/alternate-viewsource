"use client";

import { useEffect } from "react";
import { createDock, createSpanDock } from "@/lib/dock/dock";
import { dock } from "@/tokens/dock";

// Mount point for the docks. React is only the shell; the bars are plain DOM.
// Dock 1, the nav and effects controls, is the one you drag; dock 2, the timeline, spans the edge opposite it.
export default function Docks() {
  useEffect(() => {
    const nav = createDock({ id: "nav", label: "Main", maxLength: dock.navMaxLength });
    const timeline = createSpanDock({ id: "timeline", label: "Timeline", opposite: { id: "nav", place: nav.place } });
    return () => { timeline.destroy(); nav.destroy(); };
  }, []);
  return null;
}
