import type { Page, Response } from "@playwright/test";
import { budgets } from "./budgets";
import { brotli, classify, isField, isInstrument, isWorklet } from "./bytes";
import { ROUTES, decided, expect, fonts, note, press, settle, test } from "./fixtures";
import { recorded } from "./measure";
import { shatter } from "../../tokens/shatter";

// The budgets (tests/e2e/budgets.ts) as tests. Every measured number is written into the test's
// annotations, so a green run still shows them. Sizes are the served bytes, decoded, compressed here
// with brotli at its best (quality 11), whatever the server sent; the wire size is noted beside it.

const kb = (n: number) => `${(n / 1000).toFixed(1)} KB`;
const sameOrigin = (page: Page, url: string) => new URL(url).origin === new URL(page.url() || "http://x").origin;

async function compressed(r: Response) {
  const body = await r.body();
  const wire = (await r.request().sizes()).responseBodySize;
  return { raw: body.length, size: brotli(body), wire, encoding: r.headers()["content-encoding"] || "identity", body };
}

/** every script the page loads from its own origin, with its body, from navigation on */
function scripts(page: Page) {
  const got: Promise<{ url: string; size: number; source: string; start: number }>[] = [];
  page.on("response", (r) => {
    if (r.request().resourceType() !== "script" || !r.ok()) return;
    got.push(compressed(r).then(({ size, body }) => ({ url: r.url(), size, source: body.toString("utf8"), start: r.request().timing().startTime })).catch(() => ({ url: r.url(), size: 0, source: "", start: 0 })));
  });
  return got;
}

async function idle(page: Page) {
  await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
}

test("budget: the HTML of each route, compressed", { tag: ["@laptop", "@perf"] }, async ({ page }) => {
  for (const path of ROUTES) {
    const r = await page.goto(path, { waitUntil: "domcontentloaded" });
    expect(r, `${path} answers`).toBeTruthy();
    const { raw, size, wire, encoding } = await compressed(r!);
    const limit = path === "/" ? budgets.html.home : budgets.html.page;
    const scriptTags = await page.evaluate(() => document.querySelectorAll("script").length);
    note("html", `${path}: ${kb(size)} at brotli 11; ${kb(raw)} raw; ${kb(wire)} on the wire (${encoding}); ${scriptTags} script tags; budget ${kb(limit)}`);
    expect.soft(size, `${path}: compressed HTML within ${kb(limit)}`).toBeLessThanOrEqual(limit);
  }
});

test("budget: the app's own JavaScript before begin, framework excluded", { tag: ["@laptop", "@phone", "@perf"] }, async ({ page }) => {
  const got = scripts(page);
  await page.goto("/", { waitUntil: "load" });
  await idle(page);
  const all = (await Promise.all(got)).filter((s) => sameOrigin(page, s.url));
  let app = 0, framework = 0;
  const lines: string[] = [];
  for (const s of all) {
    const c = classify(s.url, s.source);
    const share = c.app + c.framework ? c.app / (c.app + c.framework) : 1;
    app += s.size * share;
    framework += s.size * (1 - share);
    lines.push(`${s.url.split("/").pop()} ${kb(s.size)} ${share > 0.99 ? "app" : share < 0.01 ? "framework" : `${Math.round(share * 100)}% app`} (${c.how})`);
  }
  note("js", `app ${kb(app)}, framework ${kb(framework)} (reported, not budgeted), ${all.length} scripts before begin`);
  note("js chunks", lines.join("; "));
  expect(app, `this app's own JavaScript before begin within ${kb(budgets.appJs)}`).toBeLessThanOrEqual(budgets.appJs);
});

test("budget: no WebGL before first paint; the field and the instrument load after it", { tag: ["@laptop", "@perf"] }, async ({ page, hasTouch, field }) => {
  const got = scripts(page);
  await page.goto("/", { waitUntil: "load" });
  await idle(page);
  await page.waitForTimeout(3000); // idle: the field's chunk and its WebGL context come now, on devices that run it
  const paint = await page.evaluate(() => {
    const p = performance.getEntriesByName("first-paint")[0] ?? performance.getEntriesByName("first-contentful-paint")[0];
    return p ? { at: performance.timeOrigin + p.startTime, ms: p.startTime } : null;
  });
  expect(paint, "the page paints").toBeTruthy();
  const rec = await page.evaluate(recorded);
  const origin = await page.evaluate(() => performance.timeOrigin);
  note("paint", `first paint ${paint!.ms.toFixed(0)} ms; first WebGL context ${rec?.webgl == null ? "none yet" : `${rec.webgl.toFixed(0)} ms`}`);
  if (rec?.webgl != null) expect.soft(origin + rec.webgl, "no WebGL context before first paint").toBeGreaterThan(paint!.at);
  // begin starts the sound, which loads the instrument and its worklet
  if (await decided(page)) await press(page.locator("button.begin"), hasTouch);
  await settle(page).catch(() => {});
  await idle(page);
  const loaded = await Promise.all(got);
  const fieldChunks = loaded.filter((s) => isField(s.source));
  const instrument = loaded.filter((s) => isInstrument(s.source));
  // the worklet's fetch never reaches the network events: the page records when it asks for it
  const worklet = ((await page.evaluate(recorded))?.worklets ?? []).filter((w) => isWorklet(new URL(w.url, page.url()).href)).map((w) => ({ url: w.url, start: origin + w.t }));
  const after = (start: number) => `${(start - paint!.at).toFixed(0)} ms after first paint`;
  note("after paint", [...fieldChunks.map((s) => `field ${after(s.start)}`), ...instrument.map((s) => `instrument ${after(s.start)}`), ...worklet.map((s) => `worklet ${after(s.start)}`)].join("; ") || "none loaded");
  if (field) expect.soft(fieldChunks.length, "the field loads on this device").toBeGreaterThan(0);
  expect.soft(instrument.length, "begin loads the instrument").toBeGreaterThan(0);
  expect.soft(worklet.length, "and its worklet").toBeGreaterThan(0);
  for (const s of [...fieldChunks, ...instrument, ...worklet]) expect.soft(s.start, `${s.url.split("/").pop()} starts loading after first paint`).toBeGreaterThan(paint!.at);
});

test("budget: no picture on / before begin, with no scroll", { tag: ["@laptop", "@phone", "@perf"] }, async ({ page }) => {
  // the field's own portrait (tokens/shatter.ts) is the field's, loaded after idle: not a picture of the page's
  const portrait = new URL(shatter.portrait.src, "http://x").pathname;
  const images: Promise<{ url: string; bytes: number }>[] = [];
  page.on("requestfinished", (r) => {
    if (r.resourceType() !== "image" && !/\.(avif|webp|png|jpe?g|gif|svg)(\?|$)/i.test(r.url())) return;
    images.push(r.sizes().then((s) => ({ url: r.url(), bytes: s.responseBodySize })).catch(() => ({ url: r.url(), bytes: 0 })));
  });
  await page.goto("/", { waitUntil: "load" });
  await fonts(page);
  await idle(page);
  await page.waitForTimeout(2000); // idle work (the field) has had its turn
  const all = await Promise.all(images);
  const pictures = all.filter((i) => new URL(i.url).pathname !== portrait);
  const field = all.find((i) => new URL(i.url).pathname === portrait);
  const total = pictures.reduce((n, i) => n + i.bytes, 0);
  const list = pictures.sort((a, b) => b.bytes - a.bytes).slice(0, 8).map((i) => `${i.url.split("/").pop()} ${kb(i.bytes)}`).join(", ");
  note("images", `before begin: ${pictures.length} pictures, ${kb(total)}${list ? `: ${list}` : ""}; the field's portrait ${field ? `${kb(field.bytes)}, not counted` : "not loaded yet"}`);
  expect(pictures.map((i) => i.url.split("/").pop()), "no picture is requested before begin").toEqual([]);
  expect(total, `pictures before begin within ${kb(budgets.imagesBeforeBegin)}`).toBeLessThanOrEqual(budgets.imagesBeforeBegin);
});

test("budget: layout shift from load through begin to the first view", { tag: ["@laptop", "@phone", "@perf"] }, async ({ page, hasTouch }) => {
  await page.goto("/", { waitUntil: "load" });
  await fonts(page);
  if (await decided(page)) await press(page.locator("button.begin"), hasTouch);
  await settle(page);
  type Shift = PerformanceEntry & { value: number; hadRecentInput: boolean; sources?: { node?: Node | null; previousRect: DOMRectReadOnly; currentRect: DOMRectReadOnly }[] };
  const cls = await page.evaluate(() => new Promise<{ cls: number; shifts: number; worst: string[] }>((done) => {
    const entries: { startTime: number; value: number; what: string }[] = [];
    const name = (n?: Node | null) => (n instanceof Element ? n.tagName.toLowerCase() + (n.id ? "#" + n.id : "") + (typeof n.className === "string" && n.className ? "." + n.className.trim().split(/\s+/)[0] : "") : n ? n.nodeName : "?");
    new PerformanceObserver((l) => {
      for (const e of l.getEntries() as Shift[]) {
        if (e.hadRecentInput) continue;
        const what = (e.sources ?? []).slice(0, 2).map((x) => `${name(x.node)} ${Math.round(x.previousRect.y)}→${Math.round(x.currentRect.y)}`).join(", ");
        entries.push({ startTime: e.startTime, value: e.value, what });
      }
    }).observe({ type: "layout-shift", buffered: true });
    setTimeout(() => {
      // the largest session window: shifts less than 1 s apart, a window at most 5 s long
      let best = 0, sum = 0, start = -Infinity, last = -Infinity;
      for (const e of entries.sort((a, b) => a.startTime - b.startTime)) {
        if (e.startTime - last > 1000 || e.startTime - start > 5000) { sum = 0; start = e.startTime; }
        sum += e.value; last = e.startTime; best = Math.max(best, sum);
      }
      const worst = entries.sort((a, b) => b.value - a.value).slice(0, 4).map((e) => `${e.value.toFixed(3)} at ${Math.round(e.startTime)} ms: ${e.what}`);
      done({ cls: best, shifts: entries.length, worst });
    }, 100);
  }));
  note("cls", `CLS ${cls.cls.toFixed(4)} over ${cls.shifts} shifts; the largest: ${cls.worst.join("; ") || "none"}`);
  expect(cls.cls, `CLS under ${budgets.cls}`).toBeLessThan(budgets.cls);
});

test("budget: largest contentful paint on the throttled phone", { tag: "@perf" }, async ({ page }) => {
  await page.goto("/", { waitUntil: "load", timeout: 120_000 });
  await idle(page);
  const lcp = await page.evaluate(() => new Promise<{ ms: number; el: string } | null>((done) => {
    let last: { ms: number; el: string } | null = null;
    new PerformanceObserver((l) => {
      for (const e of l.getEntries() as (PerformanceEntry & { element?: Element | null })[]) last = { ms: e.startTime, el: e.element ? e.element.tagName.toLowerCase() + (e.element.className && typeof e.element.className === "string" ? "." + e.element.className.split(" ")[0] : "") : "?" };
    }).observe({ type: "largest-contentful-paint", buffered: true });
    setTimeout(() => done(last), 100);
  }));
  expect(lcp, "the page has a largest contentful paint").toBeTruthy();
  note("lcp", `LCP ${lcp!.ms.toFixed(0)} ms on ${lcp!.el} (CPU 4x, Fast 3G)`);
  expect(lcp!.ms, `LCP under ${budgets.lcpMs} ms`).toBeLessThan(budgets.lcpMs);
});
