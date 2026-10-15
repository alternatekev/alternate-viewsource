"use client";

import { useEffect, useRef } from "react";
import { motion, shatter } from "@/tokens";

// The air layer's mount point. The page is complete without it: the canvas stays empty until the
// browser is idle, the device qualifies for a tier that runs the field, and WebGL is there. Then
// the field module loads as its own chunk and fades in. It never takes a pointer event.
function tier(): "glance" | "read" | "inhabit" {
  const fine = matchMedia("(pointer: fine)").matches;
  const wide = matchMedia("(min-width: 768px)").matches;
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (!fine || !wide || conn?.saveData || matchMedia("(prefers-reduced-data: reduce)").matches) return "glance";
  return (navigator.hardwareConcurrency ?? 4) >= 8 ? "inhabit" : "read";
}

export default function Air() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!(shatter.tiers as readonly string[]).includes(tier())) return;
    let destroy: (() => void) | undefined, cancelled = false;
    const start = () =>
      import("@/lib/air/field").then(({ createField }) => {
        if (cancelled || !ref.current) return;
        const field = createField(ref.current);
        if (!field) return;
        ref.current.dataset.on = "";
        destroy = field.destroy;
        (window as unknown as { doooomgaze: typeof field }).doooomgaze = field;
      });
    const idle = "requestIdleCallback" in window
      ? requestIdleCallback(start, { timeout: 2000 })
      : (setTimeout(start, 800) as unknown as number);
    return () => {
      cancelled = true;
      if ("cancelIdleCallback" in window) cancelIdleCallback(idle); else clearTimeout(idle);
      destroy?.();
    };
  }, []);
  return <canvas ref={ref} className="air" aria-hidden="true" style={{ transitionDuration: `${motion.fieldFadeInMs}ms` }} />;
}
