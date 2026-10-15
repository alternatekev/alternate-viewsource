// The nav's contents after the typing cursor: the pages as a list of links, then "ambience" at the
// far end of the bar, a button that opens a popover for the effects controls. The popover is the
// browser's own (the popover attribute): Escape and a click outside close it, focus is handled.
// It opens beside the button, on the side away from the edge the bar is on.

import type { Bar } from "./bar";

export type Page = { label: string; href: string };

export function navLinks(pages: Page[], current: string) {
  const ul = document.createElement("ul");
  ul.className = "dock-links";
  for (const p of pages) {
    const li = document.createElement("li"), a = document.createElement("a");
    a.href = p.href; a.textContent = p.label;
    if (p.href === current) a.setAttribute("aria-current", "page");
    li.append(a); ul.append(li);
  }
  return { el: ul, destroy() { ul.remove(); } };
}

export function ambience(bar: Bar, label = "ambience") {
  const button = document.createElement("button");
  button.type = "button"; button.className = "dock-ambience"; button.textContent = label;
  const pop = document.createElement("div");
  pop.id = `${bar.id}-ambience`; pop.className = "dock-popover"; pop.popover = "auto";
  pop.setAttribute("aria-label", label);
  button.popoverTargetElement = pop;
  document.body.append(pop);

  const gap = 8;
  function place() {
    const b = bar.el.getBoundingClientRect(), t = button.getBoundingClientRect(), p = pop.getBoundingClientRect();
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
    pop.style.left = `${x}px`; pop.style.top = `${y}px`;
  }
  const onToggle = (e: Event) => { if ((e as ToggleEvent).newState === "open") place(); };
  const close = () => { if (pop.matches(":popover-open")) pop.hidePopover(); };
  pop.addEventListener("toggle", onToggle);
  // moving the bar closes it rather than leaving it stranded
  addEventListener("dock:lift", close);
  addEventListener("resize", close);
  return {
    el: button,
    /** the popover's contents go here */
    panel: pop,
    destroy() { removeEventListener("dock:lift", close); removeEventListener("resize", close); button.remove(); pop.remove(); },
  };
}

/** the popover's other controls: animation on/off, and reset composition */
export function ambienceControls(set: { animation(on: boolean): void; reset(): void }) {
  const anim = document.createElement("button");
  anim.type = "button"; anim.className = "dock-option";
  let on = true;
  const label = () => { anim.setAttribute("aria-pressed", String(on)); anim.textContent = on ? "animation on" : "animation off"; };
  label();
  anim.addEventListener("click", () => { on = !on; label(); set.animation(on); });
  const reset = document.createElement("button");
  reset.type = "button"; reset.className = "dock-option"; reset.textContent = "reset composition";
  reset.addEventListener("click", () => set.reset());
  return { els: [anim, reset], destroy() { anim.remove(); reset.remove(); } };
}
