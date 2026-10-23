// The nav's contents after the logotype: the pages as a list of links, and what goes in the
// ambience popover (the popover itself is lib/dock/popover.ts; the controls are lib/dock/toggle.ts).

import { action, toggle } from "./toggle";

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

/** what the ambience popover holds besides sound: animation, fullscreen (where the browser allows it), reset */
export function ambienceControls(set: { animation(on: boolean): void; reset(): void }) {
  const anim = toggle({ name: "animation", on: true, onChange: set.animation });
  // fullscreen follows the browser's own state, so Escape or the browser's exit keeps the label true
  const full = toggle({
    name: "fullscreen", on: !!document.fullscreenElement,
    onChange: (on) => { if (on) void document.documentElement.requestFullscreen().catch(() => full.set(false)); else if (document.fullscreenElement) void document.exitFullscreen(); },
  });
  const follow = () => full.set(!!document.fullscreenElement);
  document.addEventListener("fullscreenchange", follow);
  const reset = action({ label: "reset composition", onPress: set.reset });
  const parts = document.fullscreenEnabled ? [anim, full, reset] : [anim, reset];
  return { els: parts.map((p) => p.el), destroy() { document.removeEventListener("fullscreenchange", follow); parts.forEach((p) => p.destroy()); } };
}
