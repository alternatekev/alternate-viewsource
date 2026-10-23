import { existsSync } from "node:fs";
import path from "node:path";
import { defineConfig, devices, type PlaywrightTestOptions, type PlaywrightWorkerOptions, type Project } from "@playwright/test";
import type { Options } from "./tests/e2e/fixtures";

// The end-to-end suite (docs/testing.md). It runs against `npm run start` on a prior `npm run build`,
// or against any deployment named by E2E_BASE_URL (CI points it at the Vercel preview).
//
// The matrix is the plan's: the code branches on pointer, width, height and preferences, so the
// contexts vary those, not brand names. Each project runs the tests carrying one of the tags in its
// `grep`: @any (every context with JavaScript), @surface (the zoom surface: tablets and desktops),
// @column (phones), @touch, @short, @reduced, @nojs, @axe, @laptop, @phone, @perf. A test says where
// it applies by its tags; nothing is skipped inside a test.

const PORT = 3177;
const baseURL = process.env.E2E_BASE_URL || `http://127.0.0.1:${PORT}`;
const CI = !!process.env.CI;

if (!process.env.E2E_BASE_URL && !existsSync(path.join(__dirname, ".next", "BUILD_ID"))) {
  throw new Error("No build to test: run `npm run build` first (or set E2E_BASE_URL to a deployment).");
}

const tags = (...t: string[]) => new RegExp(t.map((x) => `${x}\\b`).join("|"));
// WebGL in headless Chromium, in software (CI has no GPU). Device scale 1 everywhere: layout is in CSS
// pixels either way, and software GL pays for every device pixel of the field
const gl = { launchOptions: { args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] } };
type P = Project<PlaywrightTestOptions & Options, PlaywrightWorkerOptions>;
type Use = NonNullable<P["use"]>;
const project = (name: string, grep: RegExp, use: Use): P => ({ name, grep, use: { ...use, deviceScaleFactor: 1 } });
const size = (width: number, height: number) => ({ viewport: { width, height }, screen: { width, height } });

const PHONE = tags("@any", "@column", "@touch");
const phone = (name: string, width: number, height: number, grep = PHONE, extra: Use = {}) =>
  project(name, grep, { ...devices["Pixel 7"], ...gl, ...size(width, height), hasTouch: true, isMobile: true, device: "phone", ...extra });
const webkitPhone = (name: string, width: number, height: number) =>
  project(`webkit-${name}`, PHONE, { ...devices["iPhone 13"], ...size(width, height), hasTouch: true, isMobile: true, device: "phone" });
const tablet = (name: string, width: number, height: number, grep: RegExp) =>
  project(name, grep, { ...devices["Desktop Chrome"], ...gl, ...size(width, height), hasTouch: true, isMobile: false, device: "tablet" });
const desktop = (name: string, width: number, height: number, grep: RegExp, extra: Use = {}) =>
  project(name, grep, { ...devices["Desktop Chrome"], ...gl, ...size(width, height), hasTouch: false, isMobile: false, device: "desktop", ...extra });

const projects: P[] = [
  phone("phone-small", 360, 780),
  phone("phone", 390, 844, tags("@any", "@column", "@touch", "@axe", "@phone")),
  phone("phone-large", 430, 932),
  tablet("tablet-portrait", 820, 1180, tags("@any", "@surface", "@touch", "@axe")),
  tablet("tablet-landscape", 1180, 820, tags("@any", "@surface", "@touch", "@short")),
  desktop("laptop-short", 1366, 700, tags("@any", "@surface", "@mouse", "@short")),
  desktop("laptop", 1440, 900, tags("@any", "@surface", "@mouse", "@axe", "@laptop")),
  desktop("wide", 1920, 1080, tags("@any", "@surface", "@mouse")),
  desktop("ultrawide", 2560, 1080, tags("@any", "@surface", "@mouse")),
  desktop("laptop-reduced-motion", 1440, 900, tags("@any", "@surface", "@mouse", "@reduced"), { contextOptions: { reducedMotion: "reduce" } }),
  desktop("laptop-no-js", 1440, 900, tags("@nojs"), { javaScriptEnabled: false, field: false }),
];
// the performance reference, budgets only. In CI it runs against the Vercel preview (E2E_BASE_URL),
// never against the local build: next start's gzip and a shared runner aren't what a phone gets
// it keeps the docks' glass: paint costs are what it measures
if (!CI || process.env.E2E_BASE_URL) projects.push(phone("phone-throttled", 390, 844, tags("@perf"), { throttle: true, glass: true }));
// Safari is what phones run: the phone contexts again in WebKit, in CI (WebKit isn't installed everywhere)
if (CI) projects.push(webkitPhone("phone-small", 360, 780), webkitPhone("phone", 390, 844), webkitPhone("phone-large", 430, 932));

export default defineConfig<Options>({
  testDir: "tests/e2e",
  outputDir: "test-results",
  timeout: 180_000, // software GL on a shared runner: a home visit with its gate is 10–40 s, a phase dived in and out four times more
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  workers: CI ? 2 : 1,
  // in CI each part writes a blob, and the e2e-report job merges them into the one HTML report
  reporter: CI ? [["list"], ["github"], ["blob"]] : [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL,
    colorScheme: "dark",
    trace: "retain-on-failure",
    // never full-page: it resets touch emulation on mobile contexts, and with the field running in
    // software GL one capture of the document takes minutes (docs/testing.md, harness caveats)
    screenshot: "off",
    actionTimeout: 30_000, // a frame of software GL on a busy runner can take seconds; actionability waits for two
    navigationTimeout: 60_000,
  },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: `npm run start -- -p ${PORT}`, url: baseURL, reuseExistingServer: !CI, timeout: 120_000 },
  projects,
});
