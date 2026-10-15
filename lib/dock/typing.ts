// The logotype: types each phrase, holds, erases, and after the last one pauses before starting
// over. The visitor's first interaction stops it: the phrase it was on finishes typing (or types
// back in, if it was erasing) and stays. After that, step() erases it and types the next one.
// Built on the type-in/type-out pattern (lib/type.ts), like every other change of words.
// Decorative: hidden from assistive tech. It always takes the width of its longest phrase, so
// whatever follows it never moves.

import { retype } from "@/lib/type";
import { dock } from "@/tokens/dock";

const FIRST = ["pointerdown", "keydown", "wheel", "touchstart"] as const;

export type Phrase = string | { text: string; italic?: boolean };

export function typing(list: Phrase[]) {
  const phrases = list.map((p) => (typeof p === "string" ? p : p.text));
  const italic = list.map((p) => typeof p !== "string" && !!p.italic);
  const T = dock.typing;
  const el = document.createElement("span");
  el.className = "dock-type";
  el.dataset.typeSelf = ""; // the pattern's typeIn/typeOut leave it to itself
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

  let i = 0, looping = true, run = 0, hold = 0;
  // go to phrase k: erase what is there, switch the face when the line is empty, type it in
  async function goTo(k: number) {
    const mine = ++run;
    clearTimeout(hold);
    if (k !== i) {
      await retype(text, "");
      if (mine !== run) return;
      i = k;
      if (italic[i]) text.dataset.italic = ""; else delete text.dataset.italic;
    }
    await retype(text, phrases[i]);
    if (mine !== run || !looping) return;
    const last = i === phrases.length - 1;
    hold = window.setTimeout(() => void goTo((i + 1) % phrases.length), T.holdMs + (last ? T.pauseMs : 0) + T.gapMs);
  }
  function stop() {
    if (!looping) return;
    looping = false;
    FIRST.forEach((t) => removeEventListener(t, stop, true));
    el.dataset.still = "";
    void goTo(i);
  }

  if (matchMedia("(prefers-reduced-motion: reduce)").matches) { looping = false; el.dataset.still = ""; text.textContent = phrases[0]; }
  else { FIRST.forEach((t) => addEventListener(t, stop, true)); hold = window.setTimeout(() => void goTo(0), T.gapMs); }

  return {
    el,
    /** one phrase on: the current one erases, the next types in, and it stays */
    step() { stop(); void goTo((i + 1) % phrases.length); },
    /** erases, for leaving */
    out() { looping = false; ++run; clearTimeout(hold); return retype(text, ""); },
    destroy() { looping = false; ++run; clearTimeout(hold); FIRST.forEach((t) => removeEventListener(t, stop, true)); el.remove(); },
  };
}
