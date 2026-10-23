import type { ComponentProps, ReactNode } from "react";
import { chart } from "@/tokens/chart";

// The one way a chart is drawn on the site (tokens/chart.ts; the look in globals.css under .chart):
// the racing HUD's cards. A chart is a figure of tiled panels: a row of stat tiles, each a small
// quiet label over a large numeral, then one wide panel with the drawing, the two words at the ends
// of its baseline, and the caption. Every value on a tile is already in the caption, so the tiles
// are hidden from assistive readers rather than read twice. Nothing here moves.

type Tone = "headline" | "better" | "worse" | "exception";

// A drawing's path is written to a hundred-thousandth of a unit: short, and fine enough that every
// edge lands on the same pixel it did when each bar was its own rect (coarser, the odd edge sitting
// near a pixel's middle moves across it).
const fine = (v: number) => Math.round(v * 1e5);
/** a coordinate, to the hundred-thousandth */
export const coord = (v: number) => String(fine(v) / 1e5);
/** the step from a to b, between the two as written, so a path's steps add up exactly */
export const span = (a: number, b: number) => String((fine(b) - fine(a)) / 1e5);

/** boxes in one path, standing on or hanging from the line at y: each box is its own steps (relative
 *  h and v), closed, and the next starts from where this one started, so a box costs only its steps */
export function boxes(y: number) {
  let d = "", last = 0;
  return {
    add(x: number, steps: string) {
      d += d ? `m${span(last, x)} 0${steps}z` : `M${coord(x)} ${y}${steps}z`;
      last = x;
    },
    get d() { return d; },
  };
}

/** a strip's bars, all of them one path (one element, not one per bar): a bar for every slot with
 *  a height, chart.bar.width wide every chart.bar.step, standing on the strip's baseline. A slot of
 *  height 0 draws nothing, so an empty day is a gap of real time. */
export function Bars({ heights }: { heights: number[] }) {
  const H = chart.strip.height, STEP = chart.bar.step, BAR = chart.bar.width;
  const bars = boxes(H);
  heights.forEach((h, i) => { if (h) bars.add(i * STEP + (STEP - BAR) / 2, `h${BAR}v${coord(-h)}h${-BAR}`); });
  return bars.d ? <path className="chart-bar" d={bars.d} /> : null;
}

/** the figure: tiled panels, with whatever attributes the chart needs on the figure itself */
export function Chart({ className, children, ...rest }: ComponentProps<"figure">) {
  return <figure className={["chart", className].filter(Boolean).join(" ")} {...rest}>{children}</figure>;
}

/** the row of stat tiles; n sets how they tile */
export function Stats({ children, n }: { children: ReactNode; n: number }) {
  return <div className="chart-stats" data-n={n} aria-hidden="true">{children}</div>;
}

/** one tile: a label over a numeral, with a unit after it if it has one; the tone colors the numeral */
export function Stat({ label, value, unit, tone }: { label: string; value: string | number; unit?: string; tone?: Tone }) {
  return (
    <div className="chart-stat chart-panel">
      <span className="chart-label">{label}</span>
      <span className="chart-numeral" data-tone={tone}>{value}{unit && <span className="chart-unit">{unit}</span>}</span>
    </div>
  );
}

/** the words at either end of a baseline */
export function Ends({ from, to }: { from: string; to: string }) {
  return (
    <div className="chart-ends" aria-hidden="true">
      <span>{from}</span>
      <span>{to}</span>
    </div>
  );
}

/** the wide panel: the drawing and its ends. The caption is the figure's own figcaption, set to join it. */
export function Panel({ children }: { children: ReactNode }) {
  return <div className="chart-panel chart-main">{children}</div>;
}
