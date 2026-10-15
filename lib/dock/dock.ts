// The dock layer: bars that live on the viewport's perimeter, never floating, never pushing content.
// A position is an edge and an offset along it; internally one number p in [0, 4), clockwise from the
// top-left corner, so sliding around a corner is continuous and p can feed the field and the music.
// DOM and Pointer Events only. Step 1 of the menu plan: one bar, the drag, the ghost, the keyboard.

import { dock as D } from "@/tokens/dock";
import { motion } from "@/tokens/motion";

export type Edge = "top" | "right" | "bottom" | "left";
const EDGES: Edge[] = ["top", "right", "bottom", "left"];
const horizontal = (e: Edge) => e === "top" || e === "bottom";

type Place = { edge: Edge; t: number }; // t in [0, 1] along the free run of the edge, clockwise

function emit(name: string, detail: object) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

export function createDock(opts: { id: string; label: string; maxLength: number; edges?: Edge[]; start?: Place }) {
  const coarse = matchMedia("(pointer: coarse)").matches;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const thick = coarse ? D.thicknessCoarse : D.thickness;
  // phones: top and bottom only
  const allowed = (opts.edges ?? EDGES).filter((e) => !coarse || horizontal(e));

  const bar = document.createElement("nav");
  bar.className = "dock";
  bar.dataset.dock = opts.id;
  bar.setAttribute("aria-label", opts.label);
  const grip = document.createElement("button");
  grip.className = "dock-grip";
  grip.type = "button";
  grip.setAttribute("aria-label", `Move ${opts.label}. Arrow keys slide it, Shift and an arrow moves it to another edge.`);
  bar.append(grip);

  const ghost = document.createElement("div");
  ghost.className = "dock-ghost";
  ghost.setAttribute("aria-hidden", "true");

  const live = document.createElement("div");
  live.className = "visually-hidden";
  live.setAttribute("aria-live", "polite");
  document.body.append(ghost, bar, live);

  const vw = () => document.documentElement.clientWidth;
  const vh = () => document.documentElement.clientHeight;
  const edgeLen = (e: Edge) => (horizontal(e) ? vw() : vh());
  const lengthOn = (e: Edge) => Math.max(thick * 3, Math.min(opts.maxLength, edgeLen(e) - 2 * D.inset));

  // the rectangle a placement occupies, in CSS pixels
  function rect({ edge, t }: Place) {
    const L = lengthOn(edge), run = edgeLen(edge) - 2 * D.inset - L, s = D.inset + Math.max(0, run) * t;
    switch (edge) {
      case "top": return { x: s, y: D.inset, w: L, h: thick };
      case "bottom": return { x: vw() - s - L, y: vh() - D.inset - thick, w: L, h: thick };
      case "right": return { x: vw() - D.inset - thick, y: s, w: thick, h: L };
      case "left": return { x: D.inset, y: vh() - s - L, w: thick, h: L };
    }
  }
  const pOf = ({ edge, t }: Place) => EDGES.indexOf(edge) + t;

  // nearest edge to a point (the diagonals decide in the corners), with the bar centered on it
  function project(x: number, y: number): Place & { dist: number } {
    const d: Record<Edge, number> = { top: y, bottom: vh() - y, left: x, right: vw() - x };
    const edge = allowed.reduce((a, b) => (d[b] < d[a] ? b : a));
    const L = lengthOn(edge), run = Math.max(1, edgeLen(edge) - 2 * D.inset - L);
    const along = edge === "top" ? x : edge === "right" ? y : edge === "bottom" ? vw() - x : vh() - y;
    const t = Math.min(1, Math.max(0, (along - D.inset - L / 2) / run));
    return { edge, t, dist: d[edge] };
  }

  function apply(el: HTMLElement, r: { x: number; y: number; w: number; h: number }) {
    el.style.transform = `translate(${r.x}px, ${r.y}px)`;
    el.style.width = `${r.w}px`;
    el.style.height = `${r.h}px`;
  }

  let place: Place = opts.start ?? { edge: allowed[Math.floor(Math.random() * allowed.length)], t: Math.random() };

  // One animator for everything the bar does: its rectangle (position and size) chases a target on
  // critically damped springs, so lifting, dragging, dropping and turning a corner are all one motion.
  type Box = { x: number; y: number; w: number; h: number };
  const keys = ["x", "y", "w", "h"] as const;
  let cur: Box = rect(place), target: Box = { ...cur };
  const vel: Box = { x: 0, y: 0, w: 0, h: 0 };
  let posT = motion.dockSnapMs / 1000, sizeT = motion.dockSnapMs / 1000, anim = 0, last = 0;
  const draw = () => apply(bar, cur);
  function damp(k: (typeof keys)[number], T: number, dt: number) {
    const w = 2 / Math.max(1e-3, T * 0.5), z = w * dt, e = 1 / (1 + z + 0.48 * z * z + 0.235 * z * z * z);
    const ch = cur[k] - target[k], tmp = (vel[k] + w * ch) * dt;
    vel[k] = (vel[k] - w * tmp) * e; cur[k] = target[k] + (ch + tmp) * e;
  }
  function tick(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    for (const k of keys) damp(k, k === "x" || k === "y" ? posT : sizeT, dt);
    draw();
    const done = keys.every((k) => Math.abs(cur[k] - target[k]) < 0.3 && Math.abs(vel[k]) < 5);
    if (done && !dragging) { cur = { ...target }; draw(); anim = 0; return; }
    anim = requestAnimationFrame(tick);
  }
  function animateTo(b: Box, pos: number, size: number) {
    target = b; posT = pos; sizeT = size;
    if (reducedMotion) { cur = { ...b }; draw(); return; }
    if (!anim) { last = performance.now(); anim = requestAnimationFrame(tick); }
  }
  function settle() {
    bar.dataset.edge = place.edge;
    bar.dataset.p = pOf(place).toFixed(4);
    cur = rect(place); target = { ...cur }; draw();
  }

  // ---------- the drag ----------
  const snap = motion.dockSnapMs / 1000, follow = D.followSec;
  // a press only becomes a drag once the pointer has moved; a click on the grip leaves the bar alone
  const DRAG_START = D.dragStartPx;
  let pressed = false, dragging = false, down = { x: 0, y: 0 }, origin: Place = place, pending: (Place & { dist: number }) | null = null, hold = { x: 20, y: 20 };
  function press(e: PointerEvent) {
    if (e.button !== 0) return;
    e.preventDefault();
    grip.setPointerCapture(e.pointerId);
    pressed = true; down = { x: e.clientX, y: e.clientY };
  }
  function lift(e: PointerEvent) {
    dragging = true; origin = place;
    // keep the point that was grabbed under the pointer as the bar collapses to a stub
    hold = { x: Math.min(down.x - cur.x, horizontal(place.edge) ? D.stub - 10 : thick), y: Math.min(down.y - cur.y, horizontal(place.edge) ? thick : D.stub - 10) };
    bar.dataset.lifted = "";
    emit("dock:lift", { id: opts.id, p: pOf(place) });
    move(e);
  }
  function move(e: PointerEvent) {
    if (pressed && !dragging) {
      if (Math.hypot(e.clientX - down.x, e.clientY - down.y) < DRAG_START) return;
      lift(e);
      return;
    }
    if (!dragging) return;
    const horiz = horizontal(place.edge);
    animateTo({ x: e.clientX - hold.x, y: e.clientY - hold.y, w: horiz ? D.stub : thick, h: horiz ? thick : D.stub }, follow, snap);
    const p = project(e.clientX, e.clientY);
    pending = p.dist <= D.reach ? p : null;
    ghost.dataset.on = pending ? "1" : "";
    if (pending) { ghost.dataset.edge = pending.edge; apply(ghost, rect(pending)); emit("dock:move", { id: opts.id, p: pOf(pending), edge: pending.edge, t: pending.t }); }
  }
  function drop(cancel = false) {
    pressed = false;
    if (!dragging) return;
    dragging = false;
    delete bar.dataset.lifted;
    ghost.dataset.on = "";
    const to = !cancel && pending ? { edge: pending.edge, t: pending.t } : origin;
    place = to; bar.dataset.edge = to.edge;
    // no travel after the drop: the bar is simply there
    cancelAnimationFrame(anim); anim = 0;
    settle();
    pending = null;
    announce();
    emit("dock:drop", { id: opts.id, p: pOf(to), edge: to.edge, t: to.t });
  }
  grip.addEventListener("pointerdown", press);
  grip.addEventListener("pointermove", move);
  grip.addEventListener("pointerup", () => drop());
  grip.addEventListener("pointercancel", () => drop(true));
  const onKeyCancel = (e: KeyboardEvent) => { if (e.key === "Escape") drop(true); };
  addEventListener("keydown", onKeyCancel);

  // ---------- the keyboard ----------
  function announce() {
    const third = place.t < 1 / 3 ? "first third" : place.t < 2 / 3 ? "middle" : "last third";
    live.textContent = `${opts.label} docked at ${place.edge}, ${third}.`;
  }
  grip.addEventListener("keydown", (e) => {
    const i = allowed.indexOf(place.edge);
    let to: Place | null = null;
    const horiz = horizontal(place.edge);
    // arrows move along the edge in reading direction; on bottom and left, t runs the other way
    const forward = place.edge === "top" || place.edge === "right" ? 1 : -1;
    const along = (dir: number) => ({ edge: place.edge, t: Math.min(1, Math.max(0, place.t + dir * forward * D.keyStep)) });
    if (e.shiftKey && e.key.startsWith("Arrow")) {
      const target: Edge = e.key === "ArrowUp" ? "top" : e.key === "ArrowDown" ? "bottom" : e.key === "ArrowLeft" ? "left" : "right";
      if (allowed.includes(target)) to = { edge: target, t: place.t };
    } else if (e.key === (horiz ? "ArrowRight" : "ArrowDown")) to = along(1);
    else if (e.key === (horiz ? "ArrowLeft" : "ArrowUp")) to = along(-1);
    else if (e.key === "Home") to = { edge: place.edge, t: 0 };
    else if (e.key === "End") to = { edge: place.edge, t: 1 };
    if (!to || i < 0) return;
    e.preventDefault();
    place = to;
    settle();
    announce();
    emit("dock:drop", { id: opts.id, p: pOf(to), edge: to.edge, t: to.t });
  });

  const onResize = () => { if (!dragging) settle(); };
  addEventListener("resize", onResize);
  settle();

  return {
    get place() { return place; },
    destroy() {
      cancelAnimationFrame(anim);
      removeEventListener("resize", onResize); removeEventListener("keydown", onKeyCancel);
      bar.remove(); ghost.remove(); live.remove();
    },
  };
}

// A bar that has no position of its own: it spans the whole edge opposite another dock, and moves
// there, instantly, whenever that dock is dropped somewhere new.
const OPPOSITE: Record<Edge, Edge> = { top: "bottom", bottom: "top", left: "right", right: "left" };

export function createSpanDock(opts: { id: string; label: string; opposite: { id: string; place: { edge: Edge } } }) {
  const coarse = matchMedia("(pointer: coarse)").matches;
  const thick = coarse ? D.thicknessCoarse : D.thickness;
  const bar = document.createElement("nav");
  bar.className = "dock";
  bar.dataset.dock = opts.id;
  bar.setAttribute("aria-label", opts.label);
  document.body.append(bar);

  let edge: Edge = OPPOSITE[opts.opposite.place.edge];
  function settle() {
    const vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight;
    const r = edge === "top" ? { x: D.inset, y: D.inset, w: vw - 2 * D.inset, h: thick }
      : edge === "bottom" ? { x: D.inset, y: vh - D.inset - thick, w: vw - 2 * D.inset, h: thick }
      : edge === "left" ? { x: D.inset, y: D.inset, w: thick, h: vh - 2 * D.inset }
      : { x: vw - D.inset - thick, y: D.inset, w: thick, h: vh - 2 * D.inset };
    bar.dataset.edge = edge;
    bar.style.transform = `translate(${r.x}px, ${r.y}px)`;
    bar.style.width = `${r.w}px`;
    bar.style.height = `${r.h}px`;
  }
  const onDrop = (e: Event) => {
    const d = (e as CustomEvent<{ id: string; edge: Edge }>).detail;
    if (d.id !== opts.opposite.id) return;
    edge = OPPOSITE[d.edge];
    settle();
  };
  addEventListener("dock:drop", onDrop);
  addEventListener("resize", settle);
  settle();
  return {
    destroy() { removeEventListener("dock:drop", onDrop); removeEventListener("resize", settle); bar.remove(); },
  };
}
