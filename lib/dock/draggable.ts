// Behavior: the bar can be dragged by a grip to anywhere along any edge. A position is an edge and an
// offset along it; internally one number p in [0, 4), clockwise from the top-left corner, so sliding
// around a corner is continuous and p can feed the field and the music.
//   - with stops, it locks to the nearest one along the edge (the nav: corners and center)
//   - a press becomes a drag only after the pointer moves; a click leaves the bar alone
//   - while dragging, the bar collapses to a stub that trails the pointer, and a ghost shows where it lands
//   - on release it is simply there, with no travel
//   - arrows slide it along its edge, Shift + arrow moves it to another edge, Home/End go to the ends,
//     Escape cancels a drag; a live region says where it landed
//   - phones (coarse pointers) get the top and bottom edges only

import { dock as D } from "@/tokens/dock";
import { motion } from "@/tokens/motion";
import { applyBox, edgeLength, EDGES, emit, horizontal, vh, vw, type Bar, type Box, type Edge } from "./bar";

export type Place = { edge: Edge; t: number }; // t in [0, 1] along the free run of the edge, clockwise

export function draggable(bar: Bar, opts: { maxLength: number; edges?: Edge[]; start?: Place; stops?: number[] }) {
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const thick = bar.thick;
  const allowed = (opts.edges ?? EDGES).filter((e) => !bar.coarse || horizontal(e));

  const grip = document.createElement("button");
  grip.className = "dock-grip";
  grip.type = "button";
  grip.setAttribute("aria-label", `Move ${bar.label}. Arrow keys slide it, Shift and an arrow moves it to another edge.`);
  bar.el.prepend(grip);

  const ghost = document.createElement("div");
  ghost.className = "dock-ghost";
  ghost.setAttribute("aria-hidden", "true");
  const live = document.createElement("div");
  live.className = "visually-hidden";
  live.setAttribute("aria-live", "polite");
  document.body.append(ghost, live);

  const lengthOn = (e: Edge) => Math.max(thick * 3, Math.min(opts.maxLength, edgeLength(e) - 2 * D.inset));
  function rect({ edge, t }: Place): Box {
    const L = lengthOn(edge), run = edgeLength(edge) - 2 * D.inset - L, s = D.inset + Math.max(0, run) * t;
    switch (edge) {
      case "top": return { x: s, y: D.inset, w: L, h: thick };
      case "bottom": return { x: vw() - s - L, y: vh() - D.inset - thick, w: L, h: thick };
      case "right": return { x: vw() - D.inset - thick, y: s, w: thick, h: L };
      case "left": return { x: D.inset, y: vh() - s - L, w: thick, h: L };
    }
  }
  const pOf = ({ edge, t }: Place) => EDGES.indexOf(edge) + t;
  // with stops, a place along an edge locks to the nearest one
  const stops = opts.stops?.length ? [...opts.stops].sort((a, b) => a - b) : null;
  const lock = (t: number) => (stops ? stops.reduce((a, b) => (Math.abs(b - t) < Math.abs(a - t) ? b : a)) : t);

  // nearest edge to a point (the diagonals decide in the corners), with the bar centered on it
  function project(x: number, y: number): Place & { dist: number } {
    const d: Record<Edge, number> = { top: y, bottom: vh() - y, left: x, right: vw() - x };
    const edge = allowed.reduce((a, b) => (d[b] < d[a] ? b : a));
    const L = lengthOn(edge), run = Math.max(1, edgeLength(edge) - 2 * D.inset - L);
    const along = edge === "top" ? x : edge === "right" ? y : edge === "bottom" ? vw() - x : vh() - y;
    const t = lock(Math.min(1, Math.max(0, (along - D.inset - L / 2) / run)));
    return { edge, t, dist: d[edge] };
  }

  let place: Place = opts.start ?? { edge: allowed[Math.floor(Math.random() * allowed.length)], t: Math.random() };
  place = { edge: place.edge, t: lock(place.t) };

  // the lifted stub chases the pointer on critically damped springs; drops and key moves are instant
  const keys = ["x", "y", "w", "h"] as const;
  let cur: Box = rect(place), target: Box = { ...cur };
  const vel: Box = { x: 0, y: 0, w: 0, h: 0 };
  let posT = motion.dockSnapMs / 1000, sizeT = motion.dockSnapMs / 1000, anim = 0, last = 0;
  const draw = () => bar.place(cur);
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
    bar.edge = place.edge;
    bar.el.dataset.p = pOf(place).toFixed(4);
    cur = rect(place); target = { ...cur }; draw();
  }

  // ---------- the drag ----------
  const snap = motion.dockSnapMs / 1000;
  let pressed = false, dragging = false, down = { x: 0, y: 0 }, origin: Place = place, pending: (Place & { dist: number }) | null = null, hold = { x: 0, y: 0 };
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
    bar.el.dataset.lifted = "";
    emit("dock:lift", { id: bar.id, p: pOf(place) });
    move(e);
  }
  function move(e: PointerEvent) {
    if (pressed && !dragging) {
      if (Math.hypot(e.clientX - down.x, e.clientY - down.y) < D.dragStartPx) return;
      lift(e);
      return;
    }
    if (!dragging) return;
    const horiz = horizontal(place.edge);
    animateTo({ x: e.clientX - hold.x, y: e.clientY - hold.y, w: horiz ? D.stub : thick, h: horiz ? thick : D.stub }, D.followSec, snap);
    const p = project(e.clientX, e.clientY);
    pending = p.dist <= D.reach ? p : null;
    ghost.dataset.on = pending ? "1" : "";
    if (pending) { ghost.dataset.edge = pending.edge; applyBox(ghost, rect(pending)); emit("dock:move", { id: bar.id, p: pOf(pending), edge: pending.edge, t: pending.t }); }
  }
  function drop(cancel = false) {
    pressed = false;
    if (!dragging) return;
    dragging = false;
    delete bar.el.dataset.lifted;
    ghost.dataset.on = "";
    place = !cancel && pending ? { edge: pending.edge, t: pending.t } : origin;
    cancelAnimationFrame(anim); anim = 0;
    settle();
    pending = null;
    announce();
    emit("dock:drop", { id: bar.id, p: pOf(place), edge: place.edge, t: place.t });
  }
  const onUp = () => drop(), onCancel = () => drop(true);
  grip.addEventListener("pointerdown", press);
  grip.addEventListener("pointermove", move);
  grip.addEventListener("pointerup", onUp);
  grip.addEventListener("pointercancel", onCancel);
  const onEscape = (e: KeyboardEvent) => { if (e.key === "Escape") drop(true); };
  addEventListener("keydown", onEscape);

  // ---------- the keyboard ----------
  function announce() {
    const third = place.t < 1 / 3 ? "first third" : place.t < 2 / 3 ? "middle" : "last third";
    live.textContent = `${bar.label} docked at ${place.edge}, ${third}.`;
  }
  grip.addEventListener("keydown", (e) => {
    let to: Place | null = null;
    const horiz = horizontal(place.edge);
    // arrows move along the edge in reading direction; on bottom and left, t runs the other way
    const forward = place.edge === "top" || place.edge === "right" ? 1 : -1;
    const along = (dir: number): Place => {
      if (!stops) return { edge: place.edge, t: Math.min(1, Math.max(0, place.t + dir * forward * D.keyStep)) };
      const k = stops.indexOf(lock(place.t)) + dir * forward;
      return { edge: place.edge, t: stops[Math.min(stops.length - 1, Math.max(0, k))] };
    };
    if (e.shiftKey && e.key.startsWith("Arrow")) {
      const target: Edge = e.key === "ArrowUp" ? "top" : e.key === "ArrowDown" ? "bottom" : e.key === "ArrowLeft" ? "left" : "right";
      if (allowed.includes(target)) to = { edge: target, t: lock(place.t) };
    } else if (e.key === (horiz ? "ArrowRight" : "ArrowDown")) to = along(1);
    else if (e.key === (horiz ? "ArrowLeft" : "ArrowUp")) to = along(-1);
    else if (e.key === "Home") to = { edge: place.edge, t: stops ? stops[0] : 0 };
    else if (e.key === "End") to = { edge: place.edge, t: stops ? stops[stops.length - 1] : 1 };
    if (!to) return;
    e.preventDefault();
    place = to;
    settle();
    announce();
    emit("dock:drop", { id: bar.id, p: pOf(to), edge: to.edge, t: to.t });
  });

  const onResize = () => { if (!dragging) settle(); };
  addEventListener("resize", onResize);
  settle();

  return {
    get place() { return place; },
    destroy() {
      cancelAnimationFrame(anim);
      removeEventListener("resize", onResize); removeEventListener("keydown", onEscape);
      grip.remove(); ghost.remove(); live.remove();
    },
  };
}
