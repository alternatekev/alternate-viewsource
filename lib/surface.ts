// The surface: David Small's zoom as the way into the content. Each phase's beat is a space of type
// at three scales. Far, its name; near, set small beside it, what the web was then, its milestones
// and the site's designs; close, smaller still beside each, its sources. Type stays type at every
// scale: diving in is moving the camera, never swapping the words.
//
// Scroll travels between phases. Pressing dives one level in (the phase name, then a milestone or a
// design); so does a pinch or ctrl + wheel over it, or the one control above the name, which reads
// "dive in" at the surface. Opening a phase lands near and readable (Kevin, Oct 18): the camera moves
// in until the field's words are at their own size, and the far overview, the surface, is one step
// back out. The field beside the name takes a press too, from the surface (cohesion
// branch): pressing a piece's preview goes to that piece, through the field, one level at a time;
// pressing the field anywhere else goes into the field. A press first brings the beat square to the
// screen, so what it opens, and the way back out, sit where they belong. Escape, that control (reading "back" once dived in), or pinching out
// steps back out. Each beat keeps its own depth. The camera eases there over zoom.ms; with reduced
// motion it is simply there. The control types in and out like every other word. A beat sets in
// only once it has scrolled into view.

import { begun, namesAPiece, onClear, whenClear } from "@/lib/begin";
import { columnInView, isColumn } from "@/lib/column";
import { travelTo } from "@/lib/travel";
import { EVENT_GO, onLeave, takePending } from "@/lib/route";
import { retype, setIn, setOut, typeOut, unset } from "@/lib/type";
import { motion } from "@/tokens/motion";

type Cam = { x: number; y: number; k: number };

export function surface() {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const Z = motion.zoom;
  // the camera's scale at which the near's words are their own size: near is set at zoom.near of it
  const READ = 1 / Z.near;
  // phones have no zoom (Kevin, Oct 16): each phase is a column read by scrolling, at reading size,
  // everything already open. The journeys, the set-in on arrival and the rest of the surface still apply.
  const column = isColumn();
  document.documentElement.setAttribute("data-surface", column ? "column" : "zoom");
  const beats = [...document.querySelectorAll<HTMLElement>(".beat")];
  const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, reduced ? 0 : ms));
  // everything the beats listen for goes with the surface: a page kept between visits (Next keeps
  // the last few, hidden) builds a new surface over the same beats when it comes back
  const listening = new AbortController(), { signal } = listening;

  const spaces = beats.map((beat) => {
    const space = beat.querySelector<HTMLElement>(".space")!;
    if (column) return { beat, space, field: null, out() {}, dive: (() => {}) as (t: HTMLElement) => void, into: (async () => {}) as (t: HTMLElement) => Promise<void>, depth: () => 0, top: (): HTMLElement | undefined => undefined, hint() {}, back: null as HTMLElement | null };
    const stack: HTMLElement[] = []; // the targets dived into, outermost first
    let run: Animation | null = null;

    // one quiet control: once the beat has set in it reads "dive in" and takes you into the field;
    // dived in it reads "back" and steps out one level (Kevin, Oct 16: a way into the far state)
    const field = space.querySelector<HTMLElement>(".near");
    const back = document.createElement("button");
    back.type = "button"; back.className = "surface-back"; back.textContent = "";
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
    function frame(target: HTMLElement, at?: HTMLElement | null): Cam {
      const c = now();
      const s = space.getBoundingClientRect(), t = target.getBoundingClientRect(), b = beat.getBoundingClientRect();
      // what the camera frames in: the beat's first screen (a beat grows with its words, so it can be
      // taller than the screen; a press first brings its top to the top of the screen)
      const bw = b.width, bh = Math.min(b.height, innerHeight);
      const x = (t.left - s.left) / c.k, y = (t.top - s.top) / c.k, w = t.width / c.k, h = t.height / c.k;
      // the space's untransformed origin, relative to the beat
      const ox = s.left - b.left - c.x, oy = s.top - b.top - c.y;
      panX = panY = 0;
      if (isPiece(target)) {
        // never smaller than the words' own size, unless the piece wouldn't fit the view at that size
        const k = Math.max((bw * Z.read) / w, Math.min(READ, (bw * Z.fill) / w)), top = bh * 0.14;
        panMaxX = 0; panMaxY = Math.max(0, h * k - (bh - top * 2));
        return { k, x: bw / 2 - ox - (x + w / 2) * k, y: top - oy - y * k };
      }
      if (isField(target)) {
        // opening a phase: the camera moves in until the field's words are their own size, its start
        // at the top left; the name, beside it, rushes past and out of the way, and scrolling (or a
        // finger) reads on through the field. Opened from something in it, it lands with that there
        const k = READ, left = bw * 0.08, top = bh * 0.16;
        panMaxX = Math.max(0, w * k - (bw - left * 2)); panMaxY = Math.max(0, h * k - (bh - top * 2));
        if (at) {
          const a = at.getBoundingClientRect();
          panX = Math.max(0, Math.min(panMaxX, ((a.left - t.left) / c.k) * k));
          panY = Math.max(0, Math.min(panMaxY, ((a.top - t.top) / c.k) * k));
        }
        return { k, x: left - ox - x * k, y: top - oy - y * k };
      }
      panMaxX = panMaxY = 0;
      const k = Math.min((bw * Z.fill) / w, (bh * Z.fill) / h);
      return { k, x: bw / 2 - ox - (x + w / 2) * k, y: bh / 2 - oy - (y + h / 2) * k };
    }
    let base: Cam | null = null; // the framed camera before any reading pan
    function move(to: Cam) {
      base = to;
      const from = getComputedStyle(space).transform;
      const css = `translate(${to.x - panX}px, ${to.y - panY}px) scale(${to.k})`;
      run?.cancel();
      space.style.transform = css;
      if (reduced) return;
      run = space.animate([{ transform: from === "none" ? "none" : from }, { transform: css }], { duration: Z.ms, easing: "cubic-bezier(.65, 0, .35, 1)" });
    }
    function settle() {
      beat.dataset.depth = String(stack.length);
      // dived into something bigger than the screen, a finger moves through it instead of the page
      beat.toggleAttribute("data-pan", pannable(stack[stack.length - 1]));
      const hint = !stack.length && !!field && "arrived" in space.dataset;
      void retype(back, stack.length ? "back" : hint ? "dive in" : "");
      back.setAttribute("aria-label", stack.length ? "Back out one level" : "Dive into this phase");
      back.tabIndex = stack.length || hint ? 0 : -1;
    }
    // the address names what you're reading: a piece while you're in one, otherwise nothing extra
    function address() {
      const top = stack[stack.length - 1], id = top && isPiece(top) ? top.id : "";
      if (location.hash.slice(1) !== id) history.replaceState(history.state, "", id ? `#${id}` : location.pathname + location.search);
    }
    function dive(target: HTMLElement, at?: HTMLElement | null) {
      // only a phase that has set in opens (its words, and its pictures, are there)
      if (stack.includes(target) || !("arrived" in space.dataset)) return;
      stack.push(target);
      move(frame(target, at));
      settle();
      address();
      // focus follows the reader in, without scrolling the page
      (at ?? target).querySelector<HTMLElement>(".dive, a")?.focus({ preventScroll: true });
    }
    // to a target, one level at a time: into the field first when the target is inside it
    async function into(target: HTMLElement, at?: HTMLElement | null) {
      if (field && target !== field && !stack.includes(field)) { dive(field); await wait(Z.ms * 0.9); }
      if (stack[stack.length - 1] !== target) dive(target, at);
    }
    function out() {
      if (!stack.length) return;
      const from = stack.pop()!;
      if (!stack.length) panX = panY = 0;
      move(stack.length ? frame(stack[stack.length - 1]) : { x: 0, y: 0, k: 1 });
      settle();
      address();
      const opener = space.querySelector<HTMLElement>(`[data-dive="${from.id}"]`);
      opener?.focus({ preventScroll: true });
    }

    beat.addEventListener("click", (e) => {
      const at = e.target as HTMLElement;
      if (at.closest("a[href]")) return; // a link is a journey of its own (onLink), never a dive
      const btn = at.closest<HTMLElement>("[data-dive]");
      let target = btn ? document.getElementById(btn.dataset.dive!) : null;
      // at the surface the field is one press (its parts are too small to aim at): the piece under
      // the pointer, if one is there, otherwise the field itself
      if (!target && field && !stack.length && at === field) {
        const under = (el: Element) => { const r = el.getBoundingClientRect(); return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom; };
        target = [...field.querySelectorAll<HTMLElement>(".piece")].find(under) ?? field;
      }
      if (!target) return;
      // the contents' count of the blog's posts opens the field where the posts are
      const from = target === field && btn?.closest(".phase-contents") ? field.querySelector<HTMLElement>(".near-row") : null;
      square();
      void into(target, from);
    }, { signal });
    // a press from the surface first brings the beat square to the screen, eased, if it has drifted
    function square() {
      if (stack.length || reduced) return;
      if (Math.abs(beat.getBoundingClientRect().top) > 1) void travelTo(beat.offsetTop);
    }
    back.addEventListener("click", () => { if (stack.length) out(); else if (field) dive(field); }, { signal });
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
    }, { signal });
    beat.addEventListener("pointerleave", () => { lean = { x: 0, y: 0 }; }, { signal });
    // touch: the same three gestures, by finger. One finger dived in drags through what's open and, at
    // its end, carries on down the page, with the glide a native scroll has when let go. Two fingers
    // spreading dive in one level over what's between them; pinching together steps back out.
    const fingers = new Map<number, { x: number; y: number }>();
    let pinch0 = 0, pinched = false, dragged = false, fling = 0, flingV = { x: 0, y: 0 }, lastMove = 0;
    const spread = () => { const [a, b] = [...fingers.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
    // moves what's open by a finger's motion; what the piece can't take, the page does
    function drag(dx: number, dy: number) {
      const y0 = panY;
      pan(dx, dy);
      const rest = dy - (panY - y0);
      if (Math.abs(rest) > 0.5) window.scrollBy({ top: rest, behavior: "instant" });
    }
    function glideOn() {
      let t0 = performance.now();
      const step = (t: number) => {
        const dt = Math.min(32, t - t0); t0 = t;
        flingV = { x: flingV.x * Math.pow(0.95, dt / 16), y: flingV.y * Math.pow(0.95, dt / 16) };
        if (Math.hypot(flingV.x, flingV.y) < 0.02) { fling = 0; return; }
        drag(flingV.x * dt, flingV.y * dt);
        fling = requestAnimationFrame(step);
      };
      fling = requestAnimationFrame(step);
    }
    beat.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "touch") return;
      cancelAnimationFrame(fling); fling = 0; flingV = { x: 0, y: 0 };
      fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (fingers.size === 1) { dragged = false; pinched = false; }
      if (fingers.size === 2) pinch0 = spread();
    }, { signal });
    beat.addEventListener("pointermove", (e) => {
      const was = e.pointerType === "touch" && fingers.get(e.pointerId);
      if (!was) return;
      const now = { x: e.clientX, y: e.clientY };
      fingers.set(e.pointerId, now);
      if (fingers.size >= 2) {
        if (pinched || !pinch0) return;
        const r = spread() / pinch0;
        if (r < 1.25 && r > 0.8) return;
        pinched = true; dragged = true; // one level per gesture
        if (r <= 0.8) { out(); return; }
        const [a, b] = [...fingers.values()];
        const under = document.elementFromPoint((a.x + b.x) / 2, (a.y + b.y) / 2)?.closest<HTMLElement>("[data-dive]");
        const btn = under && beat.contains(under) ? under
          : space.querySelector<HTMLElement>(stack.length ? `#${stack[stack.length - 1].id} [data-dive]` : "[data-dive]");
        const target = btn && document.getElementById(btn.dataset.dive!);
        if (target) dive(target);
        return;
      }
      if (pinched || !pannable(stack[stack.length - 1]) || !base) return;
      const dx = was.x - now.x, dy = was.y - now.y;
      if (!dragged && Math.hypot(dx, dy) < 2) return;
      dragged = true;
      const t = performance.now(), dt = Math.max(1, t - lastMove); lastMove = t;
      flingV = { x: flingV.x * 0.6 + (dx / dt) * 0.4, y: flingV.y * 0.6 + (dy / dt) * 0.4 };
      drag(dx, dy);
    }, { signal });
    const lift = (e: PointerEvent) => {
      if (!fingers.delete(e.pointerId)) return;
      if (fingers.size) return;
      pinch0 = 0;
      // let go mid-drag: it glides on; held still before letting go: it stays
      if (dragged && !pinched && !reduced && performance.now() - lastMove < 80) glideOn();
    };
    beat.addEventListener("pointerup", lift, { signal });
    beat.addEventListener("pointercancel", lift, { signal });
    // a drag or a pinch is not a press: the click it would end in doesn't dive or follow a link
    beat.addEventListener("click", (e) => { if (dragged) { e.preventDefault(); e.stopImmediatePropagation(); dragged = false; } }, { capture: true, signal });
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
    }, { passive: false, signal });
    addEventListener("resize", () => { if (stack.length) move(frame(stack[stack.length - 1])); }, { signal });
    settle();
    return { beat, space, field, out, dive, into, depth: () => stack.length, top: () => stack[stack.length - 1], hint: settle, back: back as HTMLElement | null };
  });

  // Escape steps out of the beat the reader is looking at
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== "Escape") return;
    const mid = innerHeight / 2;
    const here = spaces.find((s) => { const r = s.beat.getBoundingClientRect(); return r.top <= mid && r.bottom > mid; });
    if (here?.depth()) here.out();
  };
  addEventListener("keydown", onKey);

  // once the begin screen has gone, each beat waits until it scrolls into view, then sets in: as it
  // reaches the middle of the screen (half of a beat a screen tall; a beat grows with its words)
  let seen: IntersectionObserver | null = null;
  const off = onClear(() => {
    seen = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        seen!.unobserve(e.target);
        const s = spaces.find((x) => x.beat === e.target);
        if (s) arrive(s);
      }
    }, column ? columnInView : { rootMargin: "-50% 0px -50% 0px" }); // a column is taller than the screen: it sets in as its top comes into view
    spaces.forEach((s) => seen!.observe(s.beat));
  });

  // Following a link is a journey, never a jump: out of whatever you're reading, one level at a time,
  // down (or up) the timeline to the phase it lives in, then in through the phase's field to the
  // piece. A link to a phase stops at its name. Links anywhere on the page that point at a phase or
  // a piece (#phase-…, #piece-…, #welcome) take it, and so do the browser's back and forward.
  let journeying = 0, gone = false; // a surface taken down mid-journey stops where it is
  async function journey(id: string) {
    const el = id ? document.getElementById(id) : null;
    const to = el && spaces.find((s) => s.beat.contains(el));
    if (!el || !to) return;
    const run = ++journeying, still = () => run === journeying && !gone;
    for (const s of spaces) {
      if (s.top() === el) continue;
      const here = inView(s.beat);
      while (s.depth() && still()) { s.out(); if (here) await wait(Z.ms * 0.8); }
    }
    if (!still()) return;
    // in a column the trip goes to the thing itself, clear of the dock across the top
    const topDock = column ? Math.max(0, ...[...document.querySelectorAll<HTMLElement>(".dock")].map((d) => d.getBoundingClientRect()).filter((r) => r.top < innerHeight / 2).map((r) => r.bottom)) : 0;
    await travelTo(column && el !== to.beat.querySelector("h2") ? el.getBoundingClientRect().top + scrollY - topDock - 24 : to.beat.offsetTop);
    if (!still()) return;
    // a link opened behind the gate travels while the line under begin holds; its words wait for it
    await whenClear();
    if (!still()) return;
    arrive(to);
    // stepping out on the way rewrote the address; a link to a phase or to Hello keeps its own
    if (!el.classList.contains("piece") && location.hash.slice(1) !== id) history.replaceState(history.state, "", `#${id}`);
    if (el.classList.contains("piece") && to.field) await to.into(el);
  }
  const inView = (b: HTMLElement) => { const r = b.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; };
  function arrive(s: (typeof spaces)[number]) {
    if ("arrived" in s.space.dataset) return;
    // headings don't type (Kevin, Oct 15): the phase's name and years, the field beside it and
    // Hello each set in as one box, which is one clip each instead of thousands of letters
    s.space.dataset.arrived = "";
    for (const part of s.space.children) setIn(part as HTMLElement);
    s.hint(); // the way in, "dive in", types once the beat is here to dive into
  }
  const linkable = (id: string) => namesAPiece(id) || (id === "welcome" && !!document.getElementById(id));
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
  // the docks ask for a journey when the page opens on a link, and when a link on this page names a
  // piece or a phase by its address (/#piece-…); a page arriving from another page takes the thing a
  // link there named (lib/route.ts), or the address it came back to, and journeys there
  const onGo = (e: Event) => { void journey((e as CustomEvent<string>).detail); };
  addEventListener(EVENT_GO, onGo);
  // (taken on the next frame, so a surface mounted and unmounted at once, as in development, leaves it)
  requestAnimationFrame(() => {
    if (gone) return;
    const came = takePending() || (begun() ? location.hash.slice(1) : "");
    if (came && linkable(came)) void journey(came);
  });
  // going to another page: every phase that has set in types out and withdraws
  const offLeave = onLeave(() => Promise.all(spaces.filter((s) => "arrived" in s.space.dataset).map((s) =>
    Promise.all([typeOut(s.space), ...[...s.space.children].map((part) => setOut(part as HTMLElement))]))));
  return {
    destroy() {
      gone = true; ++journeying;
      offLeave(); off(); seen?.disconnect(); listening.abort(); removeEventListener("keydown", onKey); document.removeEventListener("click", onLink); removeEventListener("popstate", onPop); removeEventListener(EVENT_GO, onGo);
      // the page is out of sight now; it comes back as it first was, waiting to set in again
      for (const s of spaces) {
        s.back?.remove();
        s.space.style.transform = ""; delete s.space.dataset.arrived;
        delete s.beat.dataset.depth; s.beat.removeAttribute("data-pan");
        unset(s.space);
      }
    },
  };
}
