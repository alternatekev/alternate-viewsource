import type { Page } from "@playwright/test";
import { decided, expect, fonts, note, press, settle, test } from "./fixtures";
import { recorded, sampleGate, shownLetters } from "./measure";

// Begin (Kevin's decisions, Oct 18): the gate is the home page's alone. On desktops and tablets, after
// the press the line "this site was written to be played loud, so TURN IT UP" falls out from under
// the button, holds and erases, and only then does the Hello type in; a phone's gate is the button
// alone, with no line, and a deep link to a piece skips the line too (Kevin, Oct 19). /work and
// /colophon open straight in on every device. No AudioContext is made
// before a press of the reader's own. With JavaScript the plain document never shows before the docks
// have set the page up (html[data-js] until html[data-docked]); without it, everything shows at once.

const LINE = "this site was written to be played loud, so TURN IT UP";
const letters = (s: string) => s.replace(/\s/g, "").length;
const READABLE_MS = 5000; // "readable at once": the first words show within this long of load

type Sample = { t: number; line: number; lineText: string | null; lineTop: number | null; buttonBottom: number | null; hello: number; docks: number; intro: boolean };
type Shown = { __shownLetters: (s: string) => number };

/** puts shownLetters() on the page from its first moment, for the samplers */
async function counting(page: Page) {
  await page.addInitScript({ content: `window.__shownLetters = ${shownLetters.toString()};` });
}

test("gate: / shows begin; the line falls, holds and erases before the Hello types; the docks arrive", { tag: "@surface" }, async ({ page, hasTouch }) => {
  await counting(page);
  await page.goto("/", { waitUntil: "load" });
  await fonts(page);
  expect(await decided(page), "the home page opens on begin").toBe(true);
  await expect(page.locator("button.begin")).toBeVisible();
  // the page idles a while first: what waits for idle loads (the field), and still no sound
  await page.waitForTimeout(2500);
  expect((await page.evaluate(recorded))?.audio ?? [], "no AudioContext before the press").toEqual([]);

  await page.evaluate(sampleGate);
  await press(page.locator("button.begin"), hasTouch);
  await page.waitForFunction(() => {
    const s = (window as unknown as { __gate: { samples: Sample[] } }).__gate.samples;
    const last = s[s.length - 1];
    return !!last && last.hello > 0 && last.line <= 0 && last.docks > 0;
  }, null, { timeout: 30_000 }).catch(() => {});
  const s = await page.evaluate(() => (window as unknown as { __gate: { samples: Sample[] } }).__gate.samples);
  const full = s.filter((x) => x.line >= letters(LINE));
  const lastLine = [...s].reverse().find((x) => x.line > 0);
  const firstHello = s.find((x) => x.hello > 0);
  note("gate", `line whole at ${full[0]?.t ?? "never"} ms, last letter seen at ${lastLine?.t ?? "never"} ms, the Hello's first letters at ${firstHello?.t ?? "never"} ms (${s.length} samples, 50 ms apart)`);

  expect(s.find((x) => x.lineText)?.lineText, "the line under begin").toBe(LINE);
  expect(full.length, "the line types in whole").toBeGreaterThan(0);
  const placed = full[full.length - 1];
  expect(placed.buttonBottom === null || (placed.lineTop ?? 0) >= placed.buttonBottom - 1, `the line sits under the button (line top ${placed.lineTop}, button bottom ${placed.buttonBottom})`).toBe(true);
  expect(s.some((x) => x.line <= 0 && x.t > placed.t), "the line erases").toBe(true);
  expect(firstHello, "the Hello types in").toBeTruthy();
  expect(firstHello!.t, "the Hello doesn't start typing until the line has erased").toBeGreaterThan(lastLine!.t);

  await settle(page);
  await expect(page.locator('.dock[data-dock="nav"]'), "the nav dock arrives").toBeVisible();
  await expect(page.locator('.dock[data-dock="timeline"]'), "the timeline arrives (home)").toBeVisible();
  const rec = await page.evaluate(recorded);
  expect(rec?.audio.every((a) => a.afterPress && a.active !== false), `every AudioContext was made inside a press: ${JSON.stringify(rec?.audio)}`).toBe(true);
});

test("gate: a deep link to a piece passes begin without the TURN IT UP line (Kevin, Oct 19)", { tag: "@surface" }, async ({ page, hasTouch }) => {
  await page.goto("/#piece-chapter-the-chores", { waitUntil: "load" });
  await fonts(page);
  expect(await decided(page), "home still opens on begin").toBe(true);
  await press(page.locator("button.begin"), hasTouch);
  await settle(page);
  const rec = await page.evaluate(recorded);
  expect(rec?.loud ?? null, "no line on a deep link").toBeNull();
  expect(rec?.audio.every((a) => a.afterPress && a.active !== false), `every AudioContext was made inside a press: ${JSON.stringify(rec?.audio)}`).toBe(true);
});

// "readable at once" times the site, so no field: in software GL its first frames hold the main thread for seconds
test.describe("without the field", () => {
  test.use({ field: false });
  for (const [path, first] of [["/work", ".work > .stop:not(.quiet) .stop-year"], ["/colophon", "#colophon-h"]] as const) {
    test(`gate: ${path} opens straight in, readable at once; sound starts from the popover`, { tag: "@any" }, async ({ page, hasTouch }) => {
      await counting(page);
      await page.goto(path, { waitUntil: "load" });
      const t0 = Date.now();
      await decided(page);
      expect((await page.evaluate(recorded))?.gate ?? null, `${path} never shows begin`).toBeNull();
      await page.waitForFunction((sel) => (window as unknown as Shown).__shownLetters(sel) > 0, first, { timeout: 15_000 }).catch(() => {});
      const readable = Date.now() - t0;
      note("gate", `${path}: first words showing ${readable} ms after load`);
      expect(readable, `${path}'s first words show within ${READABLE_MS} ms of load`).toBeLessThanOrEqual(READABLE_MS);
      await settle(page);
      expect((await page.evaluate(recorded))?.audio ?? [], "no AudioContext without a press").toEqual([]);
      // sound from the ambience popover (on a phone, the menu): that press is the gesture that starts it
      await press(page.locator("button.dock-ambience"), hasTouch);
      const sound = page.locator(".dock-popover .dock-option", { hasText: /^sound / });
      await expect(sound).toBeVisible();
      await press(sound, hasTouch);
      await expect.poll(async () => (await page.evaluate(recorded))?.audio.length ?? 0, { message: "the sound switch makes the AudioContext" }).toBeGreaterThan(0);
      const after = await page.evaluate(recorded);
      expect(after?.audio.every((a) => a.afterPress && a.active !== false), `every AudioContext was made inside a press: ${JSON.stringify(after?.audio)}`).toBe(true);
    });
  }
});

test("gate: a phone's home gate is begin alone, with no TURN IT UP line", { tag: "@column" }, async ({ page, hasTouch }) => {
  await page.goto("/", { waitUntil: "load" });
  await fonts(page);
  expect(await decided(page), "a phone's home opens on begin (Kevin, Oct 18: a button-only gate)").toBe(true);
  await press(page.locator("button.begin"), hasTouch);
  await settle(page);
  const rec = await page.evaluate(recorded);
  expect(rec?.loud ?? null, "no line on a phone").toBeNull();
  expect(rec?.audio.every((a) => a.afterPress && a.active !== false), `every AudioContext was made inside a press: ${JSON.stringify(rec?.audio)}`).toBe(true);
});

// every frame from the first until the docks have set the page up: does any of the page's words show?
const PLAIN_SAMPLER = `(() => {
  const rec = (window.__e2ePlain = { frames: 0, shown: [], docked: null });
  const words = ".beats .subhead, .beats .far, .beats .phase-intro, .stops .stop-head, .site-nav, main p";
  const tick = () => {
    if (document.documentElement.hasAttribute("data-docked")) { rec.docked = performance.now(); return; }
    rec.frames++;
    for (const el of document.querySelectorAll(words)) {
      const s = getComputedStyle(el), r = el.getBoundingClientRect();
      if (s.visibility === "visible" && s.display !== "none" && r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight) {
        if (rec.shown.length < 10) rec.shown.push({ t: Math.round(performance.now()), at: el.className || el.tagName });
        break;
      }
    }
    if (performance.now() < 20000) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
})();`;

test("gate: with JavaScript, the plain document never shows before the docks set the page up", { tag: "@any" }, async ({ page }) => {
  await page.addInitScript({ content: PLAIN_SAMPLER });
  for (const path of ["/", "/work", "/colophon"]) {
    await page.goto(path, { waitUntil: "load" });
    await page.waitForFunction(() => document.documentElement.hasAttribute("data-docked"), null, { timeout: 20_000 }).catch(() => {});
    const rec = await page.evaluate(() => (window as unknown as { __e2ePlain: { frames: number; shown: { t: number; at: string }[]; docked: number | null } }).__e2ePlain);
    note("flash", `${path}: ${rec.frames} frames before the docks set up at ${rec.docked == null ? "never" : `${Math.round(rec.docked)} ms`}; words shown in ${rec.shown.length ? `${rec.shown.length}+, first at ${rec.shown[0].t} ms (${rec.shown[0].at})` : "none"}`);
    expect.soft(rec.docked, `${path}: the docks set the page up`).not.toBeNull();
    expect.soft(rec.shown, `${path}: no frame before then shows the page's words`).toEqual([]);
  }
});

test("gate: if the scripts never arrive, the words still show (the failsafe)", { tag: "@any" }, async ({ page }) => {
  await page.route(/\/_next\/static\/chunks\/.*\.js(\?|$)/, (r) => r.abort());
  await page.goto("/", { waitUntil: "load" });
  const t0 = Date.now();
  const shown = await page.waitForFunction(() => {
    const el = document.querySelector(".subhead");
    return !!el && getComputedStyle(el).visibility === "visible";
  }, null, { timeout: 15_000 }).then(() => true).catch(() => false);
  note("failsafe", shown ? `the Hello showed ${Date.now() - t0} ms after load with no scripts` : "the Hello never showed with no scripts");
  expect(shown, "with no scripts, the Hello shows within 15 s").toBe(true);
});

test("gate: with JavaScript off, every route shows everything at once", { tag: "@nojs" }, async ({ page }) => {
  for (const path of ["/", "/work", "/colophon"]) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    const r = await page.evaluate(() => {
      const hidden = [...document.querySelectorAll(".beat .space, .stop .stop-space, .site-nav, .subhead, .phase-intro")].filter((el) => {
        const s = getComputedStyle(el);
        return s.visibility !== "visible" || s.display === "none" || parseFloat(s.opacity) === 0;
      }).map((el) => el.className);
      return { body: getComputedStyle(document.body).visibility, hidden: [...new Set(hidden)].slice(0, 10) };
    });
    expect.soft(r.body, `${path}: the body shows`).toBe("visible");
    expect.soft(r.hidden, `${path}: nothing of the page is hidden`).toEqual([]);
  }
});
