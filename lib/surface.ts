// The surface: David Small's zoom as the way into the content. Each phase's beat is a space of type
// at three scales. Far, its name; near, set small beside it, what the web was then, its milestones
// and the site's designs; close, smaller still beside each, its sources. Type stays type at every
// scale: diving in is moving the camera, never swapping the words.
//
// Scroll travels between phases. Pressing dives one level in (the phase name, then a milestone or a
// design); so does a pinch or ctrl + wheel over it. Escape, the back control, or pinching out steps
// back out. Each beat keeps its own depth. The camera eases there over zoom.ms; with reduced motion
// it is simply there. The back control types in and out like every other word. A beat sets
// in only once it has scrolled into view.

import { onBegin } from "@/lib/begin";
import { travelTo } from "@/lib/travel";
import { retype, setIn } from "@/lib/type";
import { motion } from "@/tokens/motion";

type Cam = { x: number; y: number; k: number };

export function surface() {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const Z = motion.zoom;
  document.documentElement.setAttribute("data-surface", "");
  const beats = [...document.querySelectorAll<HTMLElement>(".beat")];

  const spaces = beats.map((beat) => {
    const space = beat.querySelector<HTMLElement>(".space")!;
    const stack: HTMLElement[] = []; // the targets dived into, outermost first
    let run: Animation | null = null;

    const back = document.createElement("button");
    back.type = "button"; back.className = "surface-back"; back.textContent = "";
    back.setAttribute("aria-label", "Back out one level");
    back.tabIndex = -1;
    beat.append(back);

    // the camera that frames a target: its box, measured in the space's own coordinates, scaled to
    // fill zoom.fill of the beat and centered in it
    // where the camera is right now, mid-move included, read from the space's live transform
    const now = (): Cam => { const t = getComputedStyle(space).transform; if (t === "none") return { x: 0, y: 0, k: 1 }; const m = new DOMMatrix(t); return { x: m.e, y: m.f, k: m.a }; };
    // a piece of writing is framed for reading: its column fills zoom.read of the width, its top
    // near the top of the view, and scrolling then reads down it (pan); anything else is framed whole
    // the field and a piece can both be bigger than the screen: scrolling moves through them (pan)
    let panX = 0, panY = 0, panMaxX = 0, panMaxY = 0;
    const isPiece = (t: HTMLElement) => t.classList.contains("piece");
    const isField = (t: HTMLElement) => t.classList.contains("near");
    const pannable = (t?: HTMLElement) => !!t && (isPiece(t) || isField(t));
    function frame(target: HTMLElement): Cam {
      const c = now();
      const s = space.getBoundingClientRect(), t = target.getBoundingClientRect(), b = beat.getBoundingClientRect();
      const x = (t.left - s.left) / c.k, y = (t.top - s.top) / c.k, w = t.width / c.k, h = t.height / c.k;
      // the space's untransformed origin, relative to the beat
      const ox = s.left - b.left - c.x, oy = s.top - b.top - c.y;
      panX = panY = 0;
      if (isPiece(target)) {
        const k = (b.width * Z.read) / w, top = b.height * 0.14;
        panMaxX = 0; panMaxY = Math.max(0, h * k - (b.height - top * 2));
        return { k, x: b.width / 2 - ox - (x + w / 2) * k, y: top - oy - y * k };
      }
      if (isField(target)) {
        // diving into a phase: the camera moves in until its text is a dense field of zoom.fieldPx
        // type filling the screen; the name, beside it, rushes past and out of the way
        const fs = parseFloat(getComputedStyle(target).fontSize) || 16;
        const k = Z.fieldPx / (fs * Z.near), left = b.width * 0.08, top = b.height * 0.16;
        panMaxX = Math.max(0, w * k - (b.width - left * 2)); panMaxY = Math.max(0, h * k - (b.height - top * 2));
        return { k, x: left - ox - x * k, y: top - oy - y * k };
      }
      panMaxX = panMaxY = 0;
      const k = Math.min((b.width * Z.fill) / w, (b.height * Z.fill) / h);
      return { k, x: b.width / 2 - ox - (x + w / 2) * k, y: b.height / 2 - oy - (y + h / 2) * k };
    }
    let base: Cam | null = null; // the framed camera before any reading pan
    function move(to: Cam) {
      base = to;
      const from = getComputedStyle(space).transform;
      const css = `translate(${to.x}px, ${to.y}px) scale(${to.k})`;
      run?.cancel();
      space.style.transform = css;
      if (reduced) return;
      run = space.animate([{ transform: from === "none" ? "none" : from }, { transform: css }], { duration: Z.ms, easing: "cubic-bezier(.65, 0, .35, 1)" });
    }
    function settle() {
      beat.dataset.depth = String(stack.length);
      void retype(back, stack.length ? "back" : "");
      back.tabIndex = stack.length ? 0 : -1;
    }
    // the address names what you're reading: a piece while you're in one, otherwise nothing extra
    function address() {
      const top = stack[stack.length - 1], id = top && isPiece(top) ? top.id : "";
      if (location.hash.slice(1) !== id) history.replaceState(history.state, "", id ? `#${id}` : location.pathname + location.search);
    }
    function dive(target: HTMLElement) {
      if (stack.includes(target)) return;
      stack.push(target);
      move(frame(target));
      settle();
      address();
      // focus follows the reader in, without scrolling the page
      target.querySelector<HTMLElement>(".dive, a")?.focus({ preventScroll: true });
    }
    function out() {
      if (!stack.length) return;
      const from = stack.pop()!;
      move(stack.length ? frame(stack[stack.length - 1]) : { x: 0, y: 0, k: 1 });
      settle();
      address();
      const opener = space.querySelector<HTMLElement>(`[data-dive="${from.id}"]`);
      opener?.focus({ preventScroll: true });
    }

    beat.addEventListener("click", (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>("[data-dive]");
      if (!btn) return;
      const target = document.getElementById(btn.dataset.dive!);
      if (target) dive(target);
    });
    back.addEventListener("click", out);
    // a pinch (ctrl + wheel to the browser) dives in over a target, or steps out; one level per gesture.
    // Plain scrolling travels the page, except inside a piece being read, where it reads down the piece
    // until its end, and then travels on
    // moves the camera across what's dived into; false when it's already at that end
    function pan(dx: number, dy: number) {
      if (!base) return false;
      const nx = Math.max(0, Math.min(panMaxX, panX + dx)), ny = Math.max(0, Math.min(panMaxY, panY + dy));
      if (nx === panX && ny === panY) return false;
      panX = nx; panY = ny; run?.cancel(); run = null;
      space.style.transform = `translate(${base.x - panX}px, ${base.y - panY}px) scale(${base.k})`;
      return true;
    }
    // dived in, the pointer near the left or right edge slides the content toward that edge: nothing
    // at the inside of the zone, gathering speed to edgeSpeed at the very edge, so it eases in and out
    let lean = { x: 0, y: 0 }, slide = 0, last = 0;
    const toward = (p: number, size: number) => {
      const z = size * Z.edge;
      if (!z) return 0;
      const f = p < z ? -(1 - p / z) : p > size - z ? (p - (size - z)) / z : 0;
      return Math.sign(f) * f * f;
    };
    function glide(t: number) {
      const dt = Math.min(0.05, (t - last) / 1000); last = t;
      const top = stack[stack.length - 1];
      if (!pannable(top) || run?.playState === "running" || (!lean.x && !lean.y)) { slide = 0; return; }
      pan(lean.x * Z.edgeSpeed * dt, lean.y * Z.edgeSpeed * dt);
      slide = requestAnimationFrame(glide);
    }
    beat.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse" || reduced || !pannable(stack[stack.length - 1])) { lean = { x: 0, y: 0 }; return; }
      const b = beat.getBoundingClientRect();
      lean = { x: toward(e.clientX - b.left, b.width), y: 0 };
      if ((lean.x || lean.y) && !slide) { last = performance.now(); slide = requestAnimationFrame(glide); }
    });
    beat.addEventListener("pointerleave", () => { lean = { x: 0, y: 0 }; });
    let quiet = 0;
    beat.addEventListener("wheel", (e) => {
      if (!e.ctrlKey) {
        const top = stack[stack.length - 1];
        if (!pannable(top) || !base) return;
        if (pan(e.deltaX, e.deltaY)) e.preventDefault(); // at an end: let the page travel
        return;
      }
      e.preventDefault();
      const now = performance.now();
      if (now < quiet) return;
      quiet = now + Z.ms * 0.6;
      if (e.deltaY > 0) { out(); return; }
      const btn = (e.target as HTMLElement).closest<HTMLElement>("[data-dive]")
        ?? space.querySelector<HTMLElement>(stack.length ? `#${stack[stack.length - 1].id} [data-dive]` : "[data-dive]");
      const target = btn && document.getElementById(btn.dataset.dive!);
      if (target) dive(target);
    }, { passive: false });
    addEventListener("resize", () => { if (stack.length) move(frame(stack[stack.length - 1])); });
    settle();
    const field = space.querySelector<HTMLElement>(".near");
    return { beat, space, field, out, dive, depth: () => stack.length, top: () => stack[stack.length - 1] };
  });

  // Escape steps out of the beat the reader is looking at
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== "Escape") return;
    const mid = innerHeight / 2;
    const here = spaces.find((s) => { const r = s.beat.getBoundingClientRect(); return r.top <= mid && r.bottom > mid; });
    if (here?.depth()) here.out();
  };
  addEventListener("keydown", onKey);

  // after begin, each beat waits until it scrolls into view, then sets in
  let seen: IntersectionObserver | null = null;
  const off = onBegin(() => {
    seen = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        seen!.unobserve(e.target);
        const s = spaces.find((x) => x.beat === e.target);
        if (s) arrive(s);
      }
    }, { threshold: 0.5 });
    spaces.forEach((s) => seen!.observe(s.beat));
  });

  // Following a link is a journey, never a jump: out of whatever you're reading, one level at a time,
  // down (or up) the timeline to the phase it lives in, then in through the phase's field to the
  // piece. A link to a phase stops at its name. Links anywhere on the page that point at a phase or
  // a piece (#phase-…, #piece-…, #welcome) take it, and so do the browser's back and forward.
  const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, reduced ? 0 : ms));
  let journeying = 0;
  async function journey(id: string) {
    const el = id ? document.getElementById(id) : null;
    const to = el && spaces.find((s) => s.beat.contains(el));
    if (!el || !to) return;
    const run = ++journeying, still = () => run === journeying;
    for (const s of spaces) {
      if (s.top() === el) continue;
      const here = inView(s.beat);
      while (s.depth() && still()) { s.out(); if (here) await wait(Z.ms * 0.8); }
    }
    if (!still()) return;
    await travelTo(to.beat.offsetTop);
    if (!still()) return;
    arrive(to);
    // stepping out on the way rewrote the address; a link to a phase or to Hello keeps its own
    if (!el.classList.contains("piece") && location.hash.slice(1) !== id) history.replaceState(history.state, "", `#${id}`);
    if (el.classList.contains("piece") && to.field) {
      if (to.top() !== to.field && to.top() !== el) { to.dive(to.field); await wait(Z.ms * 0.9); }
      if (still() && to.top() !== el) to.dive(el);
    }
  }
  const inView = (b: HTMLElement) => { const r = b.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; };
  function arrive(s: (typeof spaces)[number]) {
    if ("arrived" in s.space.dataset) return;
    // headings don't type (Kevin, Oct 15): the phase's name and years, the field beside it and
    // Hello each set in as one box, which is one clip each instead of thousands of letters
    s.space.dataset.arrived = "";
    for (const part of s.space.children) setIn(part as HTMLElement);
  }
  const linkable = (id: string) => /^(phase-|piece-|welcome$)/.test(id) && !!document.getElementById(id);
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
  const onPop = () => { const id = location.hash.slice(1); if (linkable(id)) void journey(id); };
  addEventListener("popstate", onPop);
  // the docks ask for a journey when the page opens on a link (lib/begin: the opening trip)
  const onGo = (e: Event) => { void journey((e as CustomEvent<string>).detail); };
  addEventListener("viewsource:go", onGo);
  return { destroy() { off(); seen?.disconnect(); removeEventListener("keydown", onKey); document.removeEventListener("click", onLink); removeEventListener("popstate", onPop); removeEventListener("viewsource:go", onGo); } };
}
