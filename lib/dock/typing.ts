// The typing cursor: types each phrase, holds, erases, and after the last one pauses before
// starting over. The visitor's first interaction stops it, showing the phrase it was on in full;
// after that, step() moves it on one phrase and leaves it there. Decorative: hidden from assistive
// tech, and with reduced motion it never types, it just shows the first phrase.
// It always takes the width of its longest phrase, so whatever follows it in the bar never moves.

import { dock } from "@/tokens/dock";

const FIRST = ["pointerdown", "keydown", "wheel", "touchstart"] as const;

export type Phrase = string | { text: string; italic?: boolean };

export function typing(list: Phrase[]) {
  const phrases = list.map((p) => (typeof p === "string" ? p : p.text));
  const italic = list.map((p) => typeof p !== "string" && !!p.italic);
  const T = dock.typing;
  const el = document.createElement("span");
  el.className = "dock-type";
  el.setAttribute("aria-hidden", "true");
  // invisible copies of every phrase share one grid cell with the visible text and hold its size
  const sizers = phrases.map((p, k) => {
    const s = document.createElement("span");
    s.className = "dock-type-text dock-type-sizer"; s.textContent = p;
    if (italic[k]) s.dataset.italic = "";
    return s;
  });
  const text = document.createElement("span");
  text.className = "dock-type-text";
  el.append(...sizers, text);
  let i = 0, shown = 0, timer = 0, running = true;
  const show = (n: number) => {
    shown = n; text.textContent = phrases[i].slice(0, n);
    if (italic[i]) text.dataset.italic = ""; else delete text.dataset.italic;
  };

  function tick(phase: "type" | "erase") {
    if (!running) return;
    const word = phrases[i];
    if (phase === "type") {
      if (shown < word.length) { show(shown + 1); timer = window.setTimeout(() => tick("type"), T.charMs); return; }
      const last = i === phrases.length - 1;
      timer = window.setTimeout(() => tick("erase"), T.holdMs + (last ? T.pauseMs : 0));
      return;
    }
    if (shown > 0) { show(shown - 1); timer = window.setTimeout(() => tick("erase"), T.eraseMs); return; }
    i = (i + 1) % phrases.length;
    timer = window.setTimeout(() => tick("type"), T.gapMs);
  }

  function stop() {
    if (!running) return;
    running = false; clearTimeout(timer);
    FIRST.forEach((t) => removeEventListener(t, stop, true));
    show(phrases[i].length);
    el.dataset.still = "";
  }

  if (matchMedia("(prefers-reduced-motion: reduce)").matches) { show(phrases[0].length); running = false; el.dataset.still = ""; }
  else { FIRST.forEach((t) => addEventListener(t, stop, true)); timer = window.setTimeout(() => tick("type"), T.gapMs); }

  return {
    el,
    /** one phrase on, shown whole, and it stays */
    step() { stop(); i = (i + 1) % phrases.length; show(phrases[i].length); },
    destroy() { running = false; clearTimeout(timer); FIRST.forEach((t) => removeEventListener(t, stop, true)); el.remove(); },
  };
}
