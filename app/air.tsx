"use client";

import { useEffect, useRef, useState } from "react";
import { animationOn, onAnimation, onReset } from "@/lib/ambience";
import { begun, onBegin } from "@/lib/begin";
// the two families it reads, from their own files: the tokens index would bring the sound tables into this chunk
import { motion } from "@/tokens/motion";
import { shatter } from "@/tokens/shatter";

// The air layer's mount point. The page is complete without it: the canvas stays empty until the
// browser is idle, the device qualifies for a tier that runs the field, and WebGL is there. Then
// the field module loads as its own chunk, still and hidden until begin, when it fades in. It never
// takes a pointer event. Ambience can hold it still, or reset the composition: a new shatter on a
// new canvas fades in over the old one, which is let go once it is covered.
// Tiers come from capability, not screen width: a phone with a real GPU runs the field too (lib/air/field
// budgets it for the smaller GPU). Glance is for asked-for data saving and devices too slight to keep it smooth.
function tier(): "glance" | "read" | "inhabit" {
  const fine = matchMedia("(pointer: fine)").matches;
  const wide = matchMedia("(min-width: 768px)").matches;
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  if (conn?.saveData || matchMedia("(prefers-reduced-data: reduce)").matches) return "glance";
  if (!fine || !wide) return cores >= 4 && memory >= 3 ? "read" : "glance";
  return cores >= 8 ? "inhabit" : "read";
}

function FieldCanvas({ generation, fadeMs }: { generation: number; fadeMs: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
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
        // the field fades in when it starts: at begin, or over the old one after a reset
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
  return <canvas ref={ref} className="air" aria-hidden="true" style={{ transitionDuration: `${fadeMs}ms` }} />;
}

export default function Air() {
  // the canvases alive right now: normally one, two while a reset crossfades
  const [generations, setGenerations] = useState([0]);
  useEffect(
    () =>
      onReset(() => {
        setGenerations((g) => {
          const next = g[g.length - 1] + 1;
          // the old field goes once the new one has covered it
          setTimeout(() => setGenerations((now) => now.filter((x) => x >= next)), motion.crossfadeMs + 200);
          return [...g, next];
        });
      }),
    [],
  );
  return (
    <>
      {generations.map((g) => (
        <FieldCanvas key={g} generation={g} fadeMs={g === 0 ? motion.fieldFadeInMs : motion.crossfadeMs} />
      ))}
    </>
  );
}
