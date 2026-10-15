// The dock bar: the shell every dock shares. It owns the element (a nav landmark with its label),
// the outline and orientation (CSS keyed on data-edge), the thickness, and putting itself on the
// perimeter. It has no behavior; behaviors (draggable, spanOpposite) are added to a bar.
// Contents go in `content`; a behavior may put its own controls before it (the grip).

import { dock as D } from "@/tokens/dock";

export type Edge = "top" | "right" | "bottom" | "left";
export const EDGES: Edge[] = ["top", "right", "bottom", "left"];
export const OPPOSITE: Record<Edge, Edge> = { top: "bottom", bottom: "top", left: "right", right: "left" };
export const horizontal = (e: Edge) => e === "top" || e === "bottom";
export type Box = { x: number; y: number; w: number; h: number };

export const vw = () => document.documentElement.clientWidth;
export const vh = () => document.documentElement.clientHeight;
export const edgeLength = (e: Edge) => (horizontal(e) ? vw() : vh());

export function emit(name: string, detail: object) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

/** Puts any element at a box, in CSS pixels. */
export function applyBox(el: HTMLElement, r: Box) {
  el.style.transform = `translate(${r.x}px, ${r.y}px)`;
  el.style.width = `${r.w}px`;
  el.style.height = `${r.h}px`;
}

export type Bar = {
  readonly id: string;
  readonly label: string;
  readonly el: HTMLElement;
  readonly content: HTMLElement;
  readonly thick: number;
  readonly coarse: boolean;
  edge: Edge;
  place(r: Box): void;
  /** the box that spans the whole of an edge, inside the inset */
  spanBox(e: Edge): Box;
  destroy(): void;
};

export function createBar(opts: { id: string; label: string }): Bar {
  const coarse = matchMedia("(pointer: coarse)").matches;
  const thick = coarse ? D.thicknessCoarse : D.thickness;
  const el = document.createElement("nav");
  el.className = "dock";
  el.dataset.dock = opts.id;
  el.setAttribute("aria-label", opts.label);
  const content = document.createElement("div");
  content.className = "dock-content";
  el.append(content);
  document.body.append(el);
  // the field reads this to brighten the pane under a hovered bar
  const enter = () => el.setAttribute("data-hover", ""), leave = () => el.removeAttribute("data-hover");
  el.addEventListener("pointerenter", enter); el.addEventListener("pointerleave", leave);

  let edge: Edge = "top";
  return {
    id: opts.id, label: opts.label, el, content, thick, coarse,
    get edge() { return edge; },
    set edge(e: Edge) { edge = e; el.dataset.edge = e; },
    place(r) { applyBox(el, r); },
    spanBox(e) {
      const i = D.inset;
      return e === "top" ? { x: i, y: i, w: vw() - 2 * i, h: thick }
        : e === "bottom" ? { x: i, y: vh() - i - thick, w: vw() - 2 * i, h: thick }
        : e === "left" ? { x: i, y: i, w: thick, h: vh() - 2 * i }
        : { x: vw() - i - thick, y: i, w: thick, h: vh() - 2 * i };
    },
    destroy() { el.remove(); },
  };
}
