"use client";

import { useEffect, useRef, useState } from "react";
import { animationOn, onAnimation, onReset } from "@/lib/ambience";
import { begun, onBegin } from "@/lib/begin";
import { motion, shatter } from "@/tokens";

// The air layer's mount point. The page is complete without it: the canvas stays empty until the
// browser is idle, the device qualifies for a tier that runs the field, and WebGL is there. Then
// the field module loads as its own chunk, still and hidden until begin, when it fades in. It never
// takes a pointer event. Ambience can hold it still, or start it over with a new shatter (a new
// canvas, since a WebGL context can't be reused once released).
function tier(): "glance" | "read" | "inhabit" {
  const fine = matchMedia("(pointer: fine)").matches;
  const wide = matchMedia("(min-width: 768px)").matches;
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (!fine || !wide || conn?.saveData || matchMedia("(prefers-reduced-data: reduce)").matches) return "glance";
  return (navigator.hardwareConcurrency ?? 4) >= 8 ? "inhabit" : "read";
}

export default function Air() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [generation, setGeneration] = useState(0);
  useEffect(() => onReset(() => setGeneration((g) => g + 1)), []);
  useEffect(() => {
    if (!(shatter.tiers as readonly string[]).includes(tier())) return;
    let destroy: (() => void) | undefined, cancelled = false;
    const offs: (() => void)[] = [];
    const start = () =>
      import("@/lib/air/field").then(({ createField }) => {
        if (cancelled || !ref.current) return;
        const field = createField(ref.current, { paused: !begun() || !animationOn() });
        if (!field) return;
        const canvas = ref.current;
        destroy = field.destroy;
        (window as unknown as { doooomgaze: typeof field }).doooomgaze = field;
        // the field fades in when it starts, at begin
        offs.push(onBegin(() => { canvas.dataset.on = ""; if (animationOn()) field.play(); }));
        offs.push(onAnimation((on) => { if (!begun()) return; if (on) field.play(); else field.pause(); }));
      });
    // a reset happens after begin: no need to wait for idle
    const idle = generation > 0 ? (setTimeout(start, 0) as unknown as number)
      : "requestIdleCallback" in window ? requestIdleCallback(start, { timeout: 2000 }) : (setTimeout(start, 800) as unknown as number);
    return () => {
      cancelled = true;
      if (generation === 0 && "cancelIdleCallback" in window) cancelIdleCallback(idle); else clearTimeout(idle);
      offs.forEach((f) => f()); destroy?.();
    };
  }, [generation]);
  return <canvas key={generation} ref={ref} className="air" aria-hidden="true" style={{ transitionDuration: `${motion.fieldFadeInMs}ms` }} />;
}
