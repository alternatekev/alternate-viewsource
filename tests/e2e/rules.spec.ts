import type { Locator, Page } from "@playwright/test";
import { expect, note, press, settle, stillField, test, toBeat, visit } from "./fixtures";
import { markAnimations, newAnimations, type Anim } from "./measure";

// The house rules a machine can check (CLAUDE.md): the field never takes a pointer; leave it alone by
// default (hovering, focusing or pressing a link animates nothing but the docks and the one
// transition, type in and type out; a press may also move the camera, since that is the press's
// action); reduced motion keeps the field's moods and drops its drift.

const TYPE = new Set(["set-in", "set-out", "dock-caret"]); // the one transition's keyframes, and the docks' caret
const allowed = (a: Anim, pressed: boolean) =>
  (a.kind === "css-animation" && TYPE.has(a.name)) ||
  a.inDocks ||
  (a.kind === "css-transition" && a.target.startsWith("canvas.air")) || // the field fading, the ambient layer's own
  (pressed && a.kind === "web-animation" && a.inType); // the camera moving, when the press is a journey

/** the content links a reader sees first on each route (the home page's at the first phase, where the links are) */
async function contentLinks(page: Page, path: string): Promise<Locator[]> {
  // the first beat that holds a link to a piece (the Hello holds none; whether the next beat's links
  // show below it depends on the fonts and the screen, so don't rely on it)
  if (path === "/") await toBeat(page, await page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".beat[data-key]")].find((b) => b.querySelector('a[href^="#piece-"]'))!.dataset.key!));
  // on a phone the column is long and the contents can sit screens below the phase's name: bring them in
  if (path === "/") {
    await page.evaluate(() => document.querySelector<HTMLElement>('.beat[data-key] .phase-contents a[href^="#piece-"]')?.scrollIntoView({ block: "center", behavior: "instant" }));
    await settle(page);
  }
  // the first four a reader can reach: in view, and the hit at their start lands on them
  const picks = await page.evaluate(() => [...document.querySelectorAll(".beats a[href], .stops a[href]")].map((el, i) => {
    const r = el.getBoundingClientRect(), x = r.left + Math.min(r.width / 2, 4), y = r.top + r.height / 2;
    if (r.width < 1 || r.bottom <= 0 || r.top >= innerHeight || r.right <= 0 || r.left >= innerWidth) return -1;
    const hit = document.elementFromPoint(Math.max(0, x), y);
    return hit && (hit === el || el.contains(hit)) ? i : -1;
  }).filter((i) => i >= 0).slice(0, 4));
  const all = page.locator(".beats a[href], .stops a[href]");
  return picks.map((i) => all.nth(i));
}

async function watch(page: Page, act: () => Promise<unknown>, pressed = false) {
  await page.evaluate(markAnimations);
  await act();
  await page.waitForTimeout(700);
  return (await page.evaluate(newAnimations)).filter((a) => !allowed(a, pressed));
}

test("rules: the field's canvas never takes a pointer", { tag: "@any" }, async ({ page, hasTouch }) => {
  await visit(page, "/", hasTouch);
  await page.waitForFunction(() => !!document.querySelector("canvas.air[data-on]"), null, { timeout: 15_000 });
  const r = await page.evaluate(() => {
    const canvases = [...document.querySelectorAll<HTMLCanvasElement>("canvas.air")];
    const hits: string[] = [];
    for (let i = 1; i < 4; i++) for (let j = 1; j < 4; j++) {
      const el = document.elementFromPoint((innerWidth * i) / 4, (innerHeight * j) / 4);
      if (el && el.matches("canvas.air")) hits.push(`${i}/4, ${j}/4`);
    }
    return { count: canvases.length, events: canvases.map((c) => getComputedStyle(c).pointerEvents), hits };
  });
  expect(r.count, "the field is on the page").toBeGreaterThan(0);
  expect(r.events.every((e) => e === "none"), `pointer-events: ${r.events.join(", ")}`).toBe(true);
  expect(r.hits, "no point on the screen lands on the field").toEqual([]);
});

for (const path of ["/", "/work", "/colophon"]) {
  test(`rules: hovering a link on ${path} animates nothing but the docks and the one transition`, { tag: "@mouse" }, async ({ page }) => {
    await visit(page, path, false);
    await stillField(page);
    const links = await contentLinks(page, path);
    expect(links.length, `${path} has content links in view`).toBeGreaterThan(0);
    for (const a of links) {
      const label = (await a.textContent())?.trim().slice(0, 30);
      const extra = await watch(page, () => a.hover());
      expect.soft(extra, `hovering "${label}"`).toEqual([]);
      await page.mouse.move(1, 1);
    }
  });

  test(`rules: focusing a link on ${path} animates nothing but the docks and the one transition`, { tag: "@any" }, async ({ page, hasTouch }) => {
    await visit(page, path, hasTouch);
    await stillField(page);
    const links = await contentLinks(page, path);
    expect(links.length, `${path} has content links in view`).toBeGreaterThan(0);
    for (const a of links) {
      const label = (await a.textContent())?.trim().slice(0, 30);
      const extra = await watch(page, () => a.focus());
      expect.soft(extra, `focusing "${label}"`).toEqual([]);
    }
  });
}

test("rules: pressing a link on / takes its journey with the camera and the one transition only", { tag: "@any" }, async ({ page, hasTouch }) => {
  await visit(page, "/", hasTouch);
  await stillField(page);
  const links = await contentLinks(page, "/");
  // a link to a piece on this page: the press is a journey, through the field, to the piece
  let journey: Locator | null = null;
  for (const a of links) if ((await a.getAttribute("href"))?.startsWith("#piece-")) { journey = a; break; }
  expect(journey, "the first phase links to one of its pieces").toBeTruthy();
  const extra = await watch(page, () => press(journey!, hasTouch), true);
  note("rules", `pressed ${await journey!.getAttribute("href")}`);
  expect(extra, "pressing it animates nothing else").toEqual([]);
});

const drift = (page: Page) => page.evaluate(() => {
  const n = (window as unknown as { doooomgaze?: { numbers: Record<string, unknown> } }).doooomgaze?.numbers;
  if (!n) return null;
  const pick = (k: string) => (typeof n[k] === "number" ? (n[k] as number) : NaN);
  return { spinRate: pick("spinRate"), swirl: pick("swirl"), camX: pick("camX"), camY: pick("camY"), pitch: pick("pitch"), dolly: pick("dolly") };
});

async function fieldRunning(page: Page, touch: boolean) {
  await visit(page, "/", touch);
  await page.waitForFunction(() => !!(window as unknown as { doooomgaze?: unknown }).doooomgaze && !!document.querySelector("canvas.air[data-on]"), null, { timeout: 15_000 });
  await page.waitForTimeout(1500);
}

test("rules: reduced motion keeps the field's moods and drops its drift, and nothing animates", { tag: "@reduced" }, async ({ page }) => {
  await fieldRunning(page, false);
  const a = await drift(page);
  await page.waitForTimeout(2000);
  const b = await drift(page);
  note("drift", `reduced: ${JSON.stringify(a)} then ${JSON.stringify(b)}`);
  expect(a, "the field exposes its numbers (window.doooomgaze)").toBeTruthy();
  for (const k of ["spinRate", "swirl", "camX", "camY", "pitch"] as const) {
    expect.soft(Math.abs(a![k]), `${k} holds at zero`).toBeLessThan(1e-3);
    expect.soft(Math.abs(b![k]), `${k} still at zero`).toBeLessThan(1e-3);
  }
  expect.soft(Math.abs(a!.dolly - b!.dolly), "the camera stays where it is").toBeLessThan(1e-3);
  const running = await page.evaluate(() => document.getAnimations().filter((x) => x.playState === "running").map((x) => (x as CSSAnimation).animationName || (x as CSSTransition).transitionProperty || "web animation"));
  expect.soft(running, "nothing animates with reduced motion").toEqual([]);
});

test("rules: with motion allowed, the field drifts (the control for the reduced-motion check)", { tag: "@laptop" }, async ({ page }) => {
  await fieldRunning(page, false);
  const a = await drift(page);
  note("drift", `motion allowed: ${JSON.stringify(a)}`);
  expect(a, "the field exposes its numbers (window.doooomgaze)").toBeTruthy();
  expect(Math.abs(a!.spinRate), "the shards turn").toBeGreaterThan(1e-3);
});
