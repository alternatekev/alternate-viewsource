import type { Page } from "@playwright/test";
import { VIEWS, enter, expect, landed, note, stillField, test, toBeat } from "./fixtures";
import { measureView, unclearLines } from "./measure";

// Overflow, clipping, legibility and the docks on every route and both deep links, in every context
// with JavaScript. Text under 11 px is allowed only inside a phase the reader hasn't opened (the far
// overview beside a phase's name, one step out by design: Kevin, Oct 18). Text may pass under the
// docks (Kevin, Oct 16: they obscure and refract what flows beneath them), but no box cuts its words
// off (beats grow with their words) and every line can be scrolled clear of both docks.

const MIN_FONT = 11; // px, effective (font size times every transform above it)
const CLIP = 4; // px a box may trim off its text (descenders, a hairline) before it counts as cutting it off

async function check(page: Page, label: string, phoneWidth: number | null) {
  const r = await page.evaluate(measureView, { minFont: MIN_FONT, clipTolerance: CLIP });
  note("layout", `${label}: width ${r.innerWidth}, scrollWidth ${r.scrollWidth}, smallest text ${r.minFont.toFixed(1)} px`);
  expect.soft(r.scrollWidth, `${label}: the page is no wider than the screen`).toBeLessThanOrEqual(r.innerWidth);
  if (phoneWidth) expect.soft(r.innerWidth, `${label}: the layout viewport is the phone's own width`).toBe(phoneWidth);
  expect.soft(r.pastRight, `${label}: nothing shows past the right edge`).toEqual([]);
  expect.soft(r.clipped, `${label}: no box cuts off its text by more than ${CLIP} px`).toEqual([]);
  expect.soft(r.small, `${label}: no visible text under ${MIN_FONT} px (${r.smallCount} in all)`).toEqual([]);
  const docks = await page.evaluate(unclearLines);
  note("layout", `${label}: ${docks.lines} lines scroll with the page; docks ${docks.docks.join("; ") || "none"}`);
  expect.soft(docks.unclear, `${label}: every line can be scrolled clear of both docks`).toEqual([]);
}

for (const path of VIEWS) {
  test(`layout: ${path}`, { tag: "@any" }, async ({ page, device, viewport, hasTouch }) => {
    const phoneWidth = device === "phone" ? viewport!.width : null;
    // before begin too: the layout viewport is set by what the page holds, gate or not
    await page.goto(path, { waitUntil: "load" });
    const before = await page.evaluate(() => ({ w: innerWidth, sw: document.documentElement.scrollWidth }));
    if (phoneWidth) expect.soft(before.w, `${path} on load: the layout viewport is the phone's own width`).toBe(phoneWidth);
    expect.soft(before.sw, `${path} on load: the page is no wider than the screen`).toBeLessThanOrEqual(before.w);

    await enter(page, hasTouch);
    await stillField(page);
    const hash = path.split("#")[1];
    if (hash) await landed(page, hash, 30_000);
    await check(page, hash ? `${path}, landed` : path, phoneWidth);
    if (path !== "/") return;
    // home: every beat as the reader arrives at it (the zoom surface), or the next one down (the column)
    const keys = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".beat[data-key]")].map((b) => b.dataset.key!));
    for (const key of device === "phone" ? keys.slice(0, 1) : keys) {
      await toBeat(page, key);
      await check(page, `/ at ${key}`, phoneWidth);
    }
  });
}
