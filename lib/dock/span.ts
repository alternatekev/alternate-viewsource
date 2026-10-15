// Behavior: the bar has no position of its own. It spans the whole edge opposite another dock and
// moves there, instantly, whenever that dock is dropped somewhere new.

import { OPPOSITE, type Bar, type Edge } from "./bar";

export function spanOpposite(bar: Bar, of: { id: string; place: { edge: Edge } }) {
  const settle = () => bar.place(bar.spanBox(bar.edge));
  bar.edge = OPPOSITE[of.place.edge];
  const onDrop = (e: Event) => {
    const d = (e as CustomEvent<{ id: string; edge: Edge }>).detail;
    if (d.id !== of.id) return;
    bar.edge = OPPOSITE[d.edge];
    settle();
  };
  addEventListener("dock:drop", onDrop);
  addEventListener("resize", settle);
  settle();
  return {
    destroy() { removeEventListener("dock:drop", onDrop); removeEventListener("resize", settle); },
  };
}
