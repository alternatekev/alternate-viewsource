import { test as base, expect, type Locator, type Page } from "@playwright/test";
import { stillMoving } from "./measure";

// The suite's own test(): every page starts with the harness below. Options are set per project in
// playwright.config.ts. Tests pick the projects they run on by tag (see the config's `grep`), never by
// skipping inside a test.

export type Device = "phone" | "tablet" | "desktop";
export type Options = {
  /** what the code treats this context as: a phone is (pointer: coarse) and (max-width: 767px) (lib/column.ts) */
  device: Device;
  /** the field runs: report a real device's cores and memory, so app/air.tsx picks the tier that runs
   *  it (true); or ask for data saving, so it picks glance and no field runs (false: the timing tests,
   *  where a software-GL field would time SwiftShader instead of the site) */
  field: boolean;
  /** CPU 4x and Fast 3G through CDP (Chromium only): the performance reference */
  throttle: boolean;
  /** the docks' frosted glass (backdrop-filter). Off unless a test needs to see it: in software
   *  compositing it costs seconds a frame at 1920 px and wider, and nothing in week one looks at pixels */
  glass: boolean;
};

// Recorded from the first moment of every page, before any of the site's code runs: each AudioContext
// made (and whether a press had happened, and whether the browser counted it as one), the first WebGL
// context, each audio worklet module asked for (the worklet's fetch is invisible to the network
// events), the first trusted press, and when the gate (begin) and the "TURN IT UP" line first appeared.
const RECORDERS = `(() => {
  const rec = (window.__e2e = { audio: [], webgl: null, worklets: [], press: null, gate: null, loud: null });
  new MutationObserver(() => {
    if (rec.gate === null && document.querySelector(".intro, button.begin")) rec.gate = performance.now();
    if (rec.loud === null && document.querySelector(".begin-loud")) rec.loud = performance.now();
  }).observe(document, { childList: true, subtree: true });
  const mark = (e) => { if (e.isTrusted && rec.press === null) rec.press = performance.now(); };
  for (const t of ["pointerdown", "mousedown", "touchstart", "keydown"]) addEventListener(t, mark, { capture: true, passive: true });
  for (const name of ["AudioContext", "webkitAudioContext"]) {
    const AC = window[name];
    if (typeof AC !== "function") continue;
    const Wrapped = function (...args) {
      rec.audio.push({ t: performance.now(), active: navigator.userActivation ? navigator.userActivation.isActive : null, afterPress: rec.press !== null });
      return new AC(...args);
    };
    Wrapped.prototype = AC.prototype;
    window[name] = Wrapped;
  }
  if (window.AudioWorklet) {
    const addModule = AudioWorklet.prototype.addModule;
    AudioWorklet.prototype.addModule = function (url, ...rest) {
      rec.worklets.push({ url: String(url), t: performance.now() });
      return addModule.call(this, url, ...rest);
    };
  }
  const getContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
    if (/webgl/i.test(String(type)) && rec.webgl === null) rec.webgl = performance.now();
    return getContext.call(this, type, ...rest);
  };
})();`;

// The test machines have few cores and no GPU; app/air.tsx gates the field on cores and memory, so
// without this every context would be "glance" and the field would never run (the probe, Oct 18).
const REAL_DEVICE = `(() => {
  try {
    Object.defineProperty(Navigator.prototype, "hardwareConcurrency", { get: () => 8, configurable: true });
    Object.defineProperty(Navigator.prototype, "deviceMemory", { get: () => 8, configurable: true });
  } catch (e) {}
})();`;

// The glass off, as a constructed stylesheet: nothing enters the DOM, so hydration never sees it.
const NO_GLASS = `(() => {
  try {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync("*, *::before, *::after { -webkit-backdrop-filter: none !important; backdrop-filter: none !important; }");
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
  } catch (e) {}
})();`;

// No field: the device asks to save data, which app/air.tsx answers with the glance tier.
const NO_FIELD = `(() => {
  try { Object.defineProperty(Navigator.prototype, "connection", { get: () => ({ saveData: true, effectiveType: "4g" }), configurable: true }); } catch (e) {}
})();`;

const isLocal = (url: string) => /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?/.test(url);

export const test = base.extend<Options & { harness: void }>({
  device: ["desktop", { option: true }],
  field: [true, { option: true }],
  throttle: [false, { option: true }],
  glass: [false, { option: true }],
  harness: [
    async ({ context, page, field, throttle, glass, javaScriptEnabled, baseURL }, provide) => {
      // a protected Vercel preview: one request with the bypass header sets the cookie the browser then
      // carries; the secret itself goes only to the deployment, never to a third party (fonts)
      const secret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
      if (secret && baseURL && !isLocal(baseURL)) {
        await context.request.get(baseURL, { headers: { "x-vercel-protection-bypass": secret, "x-vercel-set-bypass-cookie": "true" }, maxRedirects: 0 });
      }
      if (javaScriptEnabled !== false) {
        await page.addInitScript({ content: RECORDERS });
        await page.addInitScript({ content: field ? REAL_DEVICE : NO_FIELD });
        if (!glass) await page.addInitScript({ content: NO_GLASS });
      }
      if (throttle) {
        const cdp = await context.newCDPSession(page);
        await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
        await cdp.send("Network.enable");
        // DevTools' Fast 3G (now "Slow 4G"): 562.5 ms latency, 1.6 Mbps down and 750 kbps up, at 90%
        await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150 * 3.75, downloadThroughput: (1.6 * 1000 * 1000) / 8 * 0.9, uploadThroughput: (750 * 1000) / 8 * 0.9 });
      }
      await provide();
    },
    { auto: true },
  ],
});

export { expect };

/** the routes every suite reads, and the two deep links (a chapter on the timeline, a year on the work page) */
export const ROUTES = ["/", "/work", "/colophon"] as const;
export const DEEP = { chapter: "/#piece-chapter-the-chores", year: "/work#year-2008" } as const;
export const VIEWS = [...ROUTES, DEEP.chapter, DEEP.year] as const;

/** the faces from the kit when they can load, never longer than 3 s: nothing here waits on the network */
export async function fonts(page: Page) {
  await page.evaluate(() => Promise.race([document.fonts.ready.then(() => true), new Promise<boolean>((r) => setTimeout(() => r(false), 3000))]));
}

/** a press the way this device makes one: a tap on touch screens, a click with a mouse */
export async function press(target: Locator, touch: boolean) {
  if (touch) await target.tap();
  else await target.click();
}

/** waits for the page to decide whether it has a gate: begin is there, or the page has begun */
export async function decided(page: Page) {
  await page.waitForFunction(
    () => !!document.querySelector("button.begin") || document.documentElement.hasAttribute("data-begun") || !!document.querySelector(".dock"),
    null,
    { timeout: 20_000 },
  );
  return (await page.locator("button.begin").count()) > 0 && !(await page.evaluate(() => document.documentElement.hasAttribute("data-begun")));
}

/** waits until the gate has gone, the docks are in, and nothing of the one transition or the camera is still moving */
export async function settle(page: Page, timeout = 45_000) {
  await page.waitForFunction(() => !document.querySelector(".intro") && !!document.querySelector(".dock"), null, { timeout });
  let still: string | null = null;
  const until = Date.now() + timeout;
  do {
    still = await page.evaluate(stillMoving);
    if (!still) break;
    await page.waitForTimeout(250);
  } while (Date.now() < until);
  if (still) throw new Error(`the page never settled: ${still}`);
}

/** on a loaded page: lets the faces load, presses begin if the page asks, and waits for it to settle */
export async function enter(page: Page, touch: boolean) {
  await fonts(page);
  if (await decided(page)) await press(page.locator("button.begin"), touch);
  await settle(page);
}

/** opens a route as a reader would: loads it, lets the faces load, presses begin if the page asks, and waits for it to settle */
export async function visit(page: Page, path: string, touch: boolean) {
  const response = await page.goto(path, { waitUntil: "load" });
  await enter(page, touch);
  return response;
}

/** a deep link has landed when its target shows in the viewport and the camera has stopped */
export async function landed(page: Page, id: string, timeout = 15_000) {
  await page.waitForFunction(
    (id) => {
      const el = document.getElementById(id);
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
    },
    id,
    { timeout },
  ).catch(async () => {
    const at = await page.evaluate((id) => ({ scrollY: Math.round(scrollY), top: Math.round(document.getElementById(id)?.getBoundingClientRect().top ?? NaN) }), id);
    throw new Error(`#${id} never came into view within ${timeout} ms (scrollY ${at.scrollY}, its top at ${at.top})`);
  });
  await settle(page);
}

/** goes to a beat on the home page as a reader does, and waits for it to set in. A jump alone isn't
 *  enough: with nothing else moving, Chromium can skip the frame that would tell the beat it's in
 *  view, so the last two pixels come by the wheel, as a reader's scroll would */
export async function toBeat(page: Page, key: string) {
  await page.evaluate((key) => window.scrollTo({ top: document.querySelector<HTMLElement>(`.beat[data-key="${key}"]`)!.offsetTop - 2, behavior: "instant" }), key);
  const v = page.viewportSize();
  // mobile WebKit has no wheel; there a script scroll of the last two pixels does the same job
  if (page.context().browser()?.browserType().name() === "webkit" && (v?.width ?? 800) < 768) {
    await page.evaluate(() => window.scrollBy({ top: 2, behavior: "instant" }));
  } else {
    await page.mouse.move((v?.width ?? 800) / 2, (v?.height ?? 600) / 2);
    await page.mouse.wheel(0, 2);
  }
  await page.waitForFunction((key) => !!document.querySelector(`.beat[data-key="${key}"] .space[data-arrived]`), key, { timeout: 15_000 })
    .catch(() => { throw new Error(`the ${key} beat never set in after scrolling to it`); });
  await settle(page);
}

/** holds the field still and takes its canvases out of the picture, for measuring and timing a page
 *  in software GL, where a frame of the field (or of a hidden canvas still composited) can take
 *  seconds. Waits a few seconds for the field to load if its canvas is there. The canvases are fixed
 *  and pointer-less, so the layout and every other node are untouched. Begin plays the field again:
 *  call this after the press */
export async function stillField(page: Page) {
  await page.waitForFunction(() => !document.querySelector("canvas.air") || !!(window as unknown as { doooomgaze?: unknown }).doooomgaze, null, { timeout: 5000 }).catch(() => {});
  await page.evaluate(() => {
    (window as unknown as { doooomgaze?: { pause(): void } }).doooomgaze?.pause();
    for (const c of document.querySelectorAll<HTMLElement>("canvas.air, .dock-visualizer")) c.style.display = "none";
  });
}

/** a short line for a test's annotations, so a green run still shows the numbers */
export function note(type: string, description: string) {
  test.info().annotations.push({ type, description });
}
