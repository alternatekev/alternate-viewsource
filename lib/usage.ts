// Reading the usage strip (app/usage.tsx) a day at a time. The strip itself never moves: pointing
// at a day, or stepping with the arrow keys once it has focus, retypes the line under it with that
// day's words; leaving types the whole back. Only the words change, by the one transition.
// Every day's line is written on the server and travels as one attribute on the figure
// (data-lines, in order, joined by LINE), not one per bar: the bars are one path (app/chart.tsx).
// The strip is a slot every chart.bar.step, drawn to its width, so the day under the pointer is its
// share of the strip's width.

import { retype } from "@/lib/type";
import { dock } from "@/tokens/dock";

const LINE = "|";

/** the strip's lines, one a slot in order, as the figure's data-lines (written on the server) */
export const joinLines = (lines: string[]) => lines.join(LINE);

export function readDays(fig: HTMLElement) {
  const svg = fig.querySelector<SVGSVGElement>(".usage-days");
  const out = fig.querySelector<HTMLElement>(".usage-read");
  const days = fig.dataset.lines?.split(LINE) ?? [];
  if (!svg || !out || !days.length) return;
  const whole = fig.dataset.read ?? out.textContent ?? "";
  // the line is one text node, so retyping keeps what the old and new words share
  const text = out.firstChild instanceof Text ? out.firstChild : out.appendChild(document.createTextNode(""));
  let at = -1;
  const read = (i: number) => {
    if (i === at) return;
    at = i;
    // the line answers the pointer, so it runs at the popover's pace; neighbouring days share
    // their month, so moving along the strip retypes only the end of the line
    void retype(text, i < 0 ? whole : days[i], dock.typing.popoverPace);
  };
  const dayAt = (x: number) => {
    const r = svg.getBoundingClientRect();
    return Math.max(0, Math.min(days.length - 1, Math.floor(((x - r.left) / r.width) * days.length)));
  };
  // leaving waits a moment before the whole comes back, so a pointer that slips off and back (or a
  // layer passing over the strip) doesn't retype the line twice
  let away = 0;
  const onMove = (e: PointerEvent) => { clearTimeout(away); read(dayAt(e.clientX)); };
  const onLeave = () => { clearTimeout(away); away = window.setTimeout(() => { if (document.activeElement !== svg) read(-1); }, dock.typing.gapMs); };
  const onKey = (e: KeyboardEvent) => {
    const to = e.key === "ArrowRight" ? Math.max(0, at) + (at < 0 ? 0 : 1)
      : e.key === "ArrowLeft" ? (at < 0 ? days.length - 1 : at - 1)
      : e.key === "Home" ? 0 : e.key === "End" ? days.length - 1 : null;
    if (to === null) return;
    e.preventDefault();
    e.stopPropagation(); // the arrows read days here; they don't travel the timeline
    read(Math.max(0, Math.min(days.length - 1, to)));
  };
  const onBlur = () => read(-1);
  svg.addEventListener("pointerenter", onMove);
  svg.addEventListener("pointermove", onMove);
  svg.addEventListener("pointerleave", onLeave);
  svg.addEventListener("keydown", onKey);
  svg.addEventListener("blur", onBlur);
  return () => {
    clearTimeout(away);
    svg.removeEventListener("pointerenter", onMove);
    svg.removeEventListener("pointermove", onMove);
    svg.removeEventListener("pointerleave", onLeave);
    svg.removeEventListener("keydown", onKey);
    svg.removeEventListener("blur", onBlur);
  };
}
