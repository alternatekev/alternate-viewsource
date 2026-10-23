import { mix, type Oklch } from "@/lib/color";
import { color } from "./color";
import { dock } from "./dock";
import type { ChartTokens } from "./schema";

// The charts, drawn the way the racing HUD draws its own (content/objects/sim-racing-hud, Kevin,
// Oct 18): dark cards on the dark ground, a 1px low-contrast border and a small radius, tiled with
// narrow gutters; small quiet labels over large numerals; data ink only, no gridlines, no axis boxes,
// a hairline baseline with a label at either end; bars thin and flat with gaps, a pale mint for the
// normal series and a coral for the exception; green for a delta that went the right way, red for
// one that didn't; a yellow for the one value a panel leads with. The panel and its lines come from
// the page's own paper, rule and ink, so a chart sits on the page as one of the HUD's cards would.
const tuple = (c: Oklch): [number, number, number] => [c[0], c[1], c[2]];

export const chart = {
  panel: {
    bg: tuple(mix(color.ui.paper, color.ui.rule, 0.25)), // a step up from the paper, as the HUD's cards are from its ground
    border: tuple(color.ui.rule),
    radius: 4, // px; the HUD's cards are barely rounded. No radius token exists yet: the docks are square (Kevin's call)
    gutter: 6, // px between tiled cards
    pad: [12, 14], // px, block then inline
  },
  series: [0.92, 0.07, 198], // the HUD's mint, sampled from the lap-time bars
  exception: [0.8, 0.11, 24], // its coral, from the incident laps
  better: [0.8, 0.17, 155], // its green, from the deltas that went the right way
  worse: [0.64, 0.2, 24], // its red, from the ones that didn't
  headline: [0.88, 0.17, 95], // its yellow, from the headline number
  label: [0.68, 0.012, 260], // between quiet and rule: the HUD's labels sit back further than the page's quiet ink
  numeral: tuple(color.ui.ink),
  hairline: { color: tuple(color.ui.rule), width: dock.look.borderWidth },
  face: { label: "pixel", numeral: "numeral" }, // labels in Argent Pixel CF; numerals in Trade Gothic Next Condensed, the HUD's condensed lining figures (Kevin, Oct 18)
  size: { label: 11, numeral: [22, 30], ends: 11 },
  letterSpacing: { label: 0.08, numeral: 0 },
  bar: { width: 2, step: 4 }, // viewBox units; the strips scale to their width, so this is the duty cycle, half ink, half gap
  strip: { height: 48, tall: 96 },
} satisfies ChartTokens;
