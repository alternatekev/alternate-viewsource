// A popover opened from a button in a bar. It sits in the browser's top layer (popover="manual"),
// and closes on Escape, a press outside, a second press of its button, or the bar moving. It opens
// beside its button, on the side away from the bar's edge, and arrives and leaves like everything
// else: its box sets in and its words type in, then the reverse, and only then is it hidden.

import { arrive, leave } from "@/lib/type";
import { dock } from "@/tokens/dock";
import type { Bar } from "./bar";

export function popover(bar: Bar, opts: { id: string; label: string; buttonClass?: string }) {
  const button = document.createElement("button");
  button.type = "button"; button.className = opts.buttonClass ?? "dock-option"; button.textContent = opts.label;
  const panel = document.createElement("div");
  panel.id = `${bar.id}-${opts.id}`; panel.className = "dock-popover"; panel.popover = "manual";
  panel.setAttribute("aria-label", opts.label);
  button.setAttribute("aria-expanded", "false");
  button.setAttribute("aria-controls", panel.id);
  document.body.append(panel);

  const gap = 8;
  function place() {
    const b = bar.el.getBoundingClientRect(), t = button.getBoundingClientRect(), p = panel.getBoundingClientRect();
    const vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight;
    const clampX = (x: number) => Math.max(gap, Math.min(vw - p.width - gap, x));
    const clampY = (y: number) => Math.max(gap, Math.min(vh - p.height - gap, y));
    let x = 0, y = 0;
    switch (bar.edge) {
      case "bottom": x = clampX(t.right - p.width); y = b.top - gap - p.height; break;
      case "top": x = clampX(t.right - p.width); y = b.bottom + gap; break;
      case "left": x = b.right + gap; y = clampY(t.bottom - p.height); break;
      case "right": x = b.left - gap - p.width; y = clampY(t.bottom - p.height); break;
    }
    panel.style.left = `${x}px`; panel.style.top = `${y}px`;
  }
  let open = false, closing = 0;
  function show() {
    if (open) return;
    open = true; ++closing;
    button.setAttribute("aria-expanded", "true");
    if (!panel.matches(":popover-open")) panel.showPopover();
    place(); void arrive(panel, dock.typing.popoverPace);
  }
  function close() {
    if (!open) return;
    open = false;
    button.setAttribute("aria-expanded", "false");
    const mine = ++closing;
    void leave(panel, dock.typing.popoverPace).then(() => { if (mine === closing && panel.matches(":popover-open")) panel.hidePopover(); });
  }
  const onButton = () => (open ? close() : show());
  const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && open) { close(); button.focus(); } };
  const onOutside = (e: PointerEvent) => { if (open && !panel.contains(e.target as Node) && !button.contains(e.target as Node)) close(); };
  button.addEventListener("click", onButton);
  addEventListener("keydown", onKey);
  addEventListener("pointerdown", onOutside, true);
  addEventListener("dock:lift", close);
  addEventListener("resize", close);
  return {
    button, panel,
    destroy() {
      removeEventListener("keydown", onKey); removeEventListener("pointerdown", onOutside, true);
      removeEventListener("dock:lift", close); removeEventListener("resize", close); button.remove(); panel.remove();
    },
  };
}
