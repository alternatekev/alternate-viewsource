// Controls for the docks and their popovers, one look and one behavior.
// A toggle reads "<name> on" or "<name> off", carries aria-pressed, and retypes only what changes
// ("on" erases to "o" and types "ff"). An action is a plain press with a fixed label.

import { retype } from "@/lib/type";

export function toggle(opts: { name: string; on: boolean; onChange?: (on: boolean) => void }) {
  const el = document.createElement("button");
  el.type = "button"; el.className = "dock-option";
  let on = opts.on;
  const label = () => `${opts.name} ${on ? "on" : "off"}`;
  el.textContent = label(); el.setAttribute("aria-pressed", String(on));
  el.addEventListener("click", () => { set(!on); opts.onChange?.(on); });
  /** shows a new state (from a press, or from outside, like the browser leaving fullscreen) */
  function set(next: boolean) {
    if (next === on) return;
    on = next; el.setAttribute("aria-pressed", String(on));
    void retype(el, label());
  }
  /** a toggle that can't work here says so, and stops taking presses */
  function unavailable(note: string) { el.disabled = true; el.removeAttribute("aria-pressed"); void retype(el, `${opts.name} ${note}`); }
  return { el, set, unavailable, get on() { return on; }, destroy() { el.remove(); } };
}

export function action(opts: { label: string; onPress: () => void }) {
  const el = document.createElement("button");
  el.type = "button"; el.className = "dock-option"; el.textContent = opts.label;
  el.addEventListener("click", opts.onPress);
  return { el, destroy() { el.remove(); } };
}
