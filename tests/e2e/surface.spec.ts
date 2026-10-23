import type { Page } from "@playwright/test";
import { DEEP, decided, expect, fonts, note, press, settle, stillField, test, toBeat, visit } from "./fixtures";
import { idInView, minTextIn } from "./measure";
import { phaseKeys } from "./content";

// The zoom surface (desktops and tablets). Opening a phase lands near and readable (Kevin, Oct 18):
// pressing its name, by mouse, touch or keyboard, goes to the depth where its words are 11 px or more;
// the far overview is one step back out (Escape). Deep links land on their piece, in view within 5 s of
// load, or 8 s of begin's press: a deep link skips the TURN IT UP line (Kevin, Oct 19).

const READABLE = 11; // px, effective
const IN_VIEW_MS = 5000; // a deep link with no gate on the way
const IN_VIEW_GATED_MS = 8000; // a deep link through begin: begin starts the page, the line doesn't play (Kevin, Oct 19); the logo's fall and the journey still come first, 1.6-3 s locally, 5-6.2 s on CI's runners on short and touch screens

const depthOf = (page: Page, key: string) => page.evaluate((key) => document.querySelector<HTMLElement>(`.beat[data-key="${key}"]`)?.dataset.depth ?? "0", key);
const cameraAtRest = (page: Page, key: string) => page.evaluate((key) => {
  const t = getComputedStyle(document.querySelector(`.beat[data-key="${key}"] .space`)!).transform;
  if (t === "none") return true;
  const m = new DOMMatrix(t);
  return Math.abs(m.a - 1) < 0.01 && Math.abs(m.e) < 1 && Math.abs(m.f) < 1;
}, key);

async function readable(page: Page, key: string, how: string) {
  await settle(page);
  const depth = await depthOf(page, key);
  const m = await page.evaluate(minTextIn, `.beat[data-key="${key}"]`);
  note("surface", `${key}, ${how}: depth ${depth}, smallest visible text ${m.min.toFixed(1)} px over ${m.count} elements`);
  expect.soft(Number(depth), `${key}, ${how}: the press goes in`).toBeGreaterThanOrEqual(1);
  expect.soft(m.under, `${key}, ${how}: every visible word is ${READABLE} px or more`).toEqual([]);
}

async function stepOut(page: Page, key: string, how: string) {
  await page.keyboard.press("Escape");
  await settle(page);
  expect.soft(await depthOf(page, key), `${key}, ${how}: Escape steps back out to the overview`).toBe("0");
  expect.soft(await cameraAtRest(page, key), `${key}, ${how}: the camera is back at the overview`).toBe(true);
}

for (const key of phaseKeys()) {
  test(`surface: opening ${key} lands readable; Escape steps back out; the keyboard does the same`, { tag: "@surface" }, async ({ page, hasTouch }) => {
    await visit(page, "/", hasTouch);
    await stillField(page);
    await toBeat(page, key);
    // the phase's name (the contents line under it has a dive of its own, into the blog's posts)
    const name = page.locator(`.beat[data-key="${key}"] .far > button.dive`);
    await press(name, hasTouch);
    await readable(page, key, hasTouch ? "tap" : "click");
    await stepOut(page, key, hasTouch ? "tap" : "click");
    await name.focus();
    await page.keyboard.press("Enter");
    await readable(page, key, "keyboard");
    await stepOut(page, key, "keyboard");
  });
}

// the deep links time the trip, which is the site's: no field (in software GL its frames would time SwiftShader)
test.describe("without the field", () => {
  test.use({ field: false });

  test("surface: a chapter's deep link lands on the piece, in view within 9 s of begin, at reading size", { tag: "@surface" }, async ({ page, hasTouch }) => {
    const id = DEEP.chapter.split("#")[1];
    await page.goto(DEEP.chapter, { waitUntil: "load" });
    await fonts(page);
    if (await decided(page)) await press(page.locator("button.begin"), hasTouch);
    const t0 = Date.now();
    await expect.poll(async () => (await page.evaluate(idInView, id)).inView, { message: `#${id} comes into view within 20 s`, timeout: 20_000, intervals: [100] }).toBe(true);
    const ms = Date.now() - t0;
    await settle(page);
    const where = await page.evaluate(idInView, id);
    const m = await page.evaluate(minTextIn, `#${id}`);
    note("surface", `${DEEP.chapter}: in view ${ms} ms after begin; depth ${where.depth}, address ${where.hash}, smallest text in the piece ${m.min.toFixed(1)} px`);
    expect.soft(ms, `the piece is in view within ${IN_VIEW_GATED_MS} ms of the press`).toBeLessThanOrEqual(IN_VIEW_GATED_MS);
    expect.soft(where.hash, "the address names the piece").toBe(`#${id}`);
    expect.soft(Number(where.depth ?? 0), "dived in to the piece").toBeGreaterThanOrEqual(1);
    expect.soft(where.inView, "and it's still in view").toBe(true);
    expect.soft(m.under, `the piece reads at ${READABLE} px or more`).toEqual([]);
  });

  test("surface: a work year's deep link lands on the year, in view within 5 s", { tag: "@surface" }, async ({ page, hasTouch }) => {
    const id = DEEP.year.split("#")[1];
    await page.goto(DEEP.year, { waitUntil: "load" });
    let t0 = Date.now(); // the work page opens straight in: the clock runs from load
    await fonts(page);
    if (await decided(page)) { await press(page.locator("button.begin"), hasTouch); t0 = Date.now(); }
    await expect.poll(async () => (await page.evaluate(idInView, id)).inView, { message: `#${id} comes into view within 20 s`, timeout: 20_000, intervals: [100] }).toBe(true);
    const ms = Date.now() - t0;
    await settle(page);
    const where = await page.evaluate(idInView, id);
    note("surface", `${DEEP.year}: in view ${ms} ms after the page began; scrollY ${where.scrollY}, address ${where.hash}`);
    expect.soft(ms, `the year is in view within ${IN_VIEW_MS} ms`).toBeLessThanOrEqual(IN_VIEW_MS);
    expect.soft(where.hash, "the address names the year").toBe(`#${id}`);
    expect.soft(where.inView, "and it's still in view").toBe(true);
  });
});
