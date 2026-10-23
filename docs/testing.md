# Testing

`npm run check` proves the code and the content are well formed. The end-to-end suite proves what a reader gets: it opens the built site in real browsers at the sizes and pointers the code branches on, and checks the house rules in `CLAUDE.md` the way a reader would meet them. It is Playwright, in `tests/e2e/`, configured in `playwright.config.ts`.

## What runs where

| Where | What | Against |
| --- | --- | --- |
| Your machine, `npm run e2e:quick` | the laptop and phone contexts, Chromium | `next start` on your last `npm run build` |
| Your machine, `npm run e2e` | every context below, Chromium | the same |
| CI, job `e2e` (every PR and push to main, after `check-and-build`) | every context in Chromium, the three phones again in WebKit; not the throttled phone. In four shards at once: with software GL the whole matrix is close to an hour on one runner | a fresh `npm run build` on each shard, started by Playwright |
| CI, job `e2e-report` | merges the four shards' results into one HTML report | |
| CI, job `preview-budgets` (each successful Vercel deployment) | `budgets.spec.ts`: the laptop, the phone and the throttled phone | the deployment's own URL |

The HTML reports are artifacts (`playwright-report` from `e2e-report`, `playwright-report-preview`). Failures carry a trace; in CI a failed test is retried once and shows as flaky if the retry passes.

## Running it

```sh
npm run build          # the suite tests a build, never the dev server
npm run e2e:quick      # laptop + phone
npm run e2e            # the whole matrix
npx playwright test tests/e2e/gate.spec.ts --project=laptop   # one suite, one context
npx playwright show-report                                     # the last run's report
```

Playwright starts `npm run start -- -p 3177` itself, or reuses a server already on that port. To test something else, name it: `E2E_BASE_URL=https://… npm run e2e`. Chromium comes from `npx playwright install chromium` (CI: `npx playwright install --with-deps chromium webkit`); `@playwright/test` is pinned to 1.56.1, whose Chromium is build 1194, so a machine with that build already installed and CI agree.

## The matrix

The code branches on pointer, width, height and preferences (`(pointer: coarse) and (max-width: 767px)` is a phone, `lib/column.ts`), so the contexts vary those. Each project runs the tests whose tags it lists; a test says where it applies by its tags, and nothing is skipped inside a test.

| Project | Viewport | Pointer | Tags it runs |
| --- | --- | --- | --- |
| phone-small | 360×780 | touch, mobile | @any @column @touch |
| phone | 390×844 | touch, mobile | @any @column @touch @axe @phone |
| phone-large | 430×932 | touch, mobile | @any @column @touch |
| tablet-portrait | 820×1180 | touch, not mobile | @any @surface @touch @axe |
| tablet-landscape | 1180×820 | touch, not mobile | @any @surface @touch @short |
| laptop-short | 1366×700 | mouse | @any @surface @mouse @short |
| laptop | 1440×900 | mouse | @any @surface @mouse @axe @laptop |
| wide | 1920×1080 | mouse | @any @surface @mouse |
| ultrawide | 2560×1080 | mouse | @any @surface @mouse |
| laptop-reduced-motion | 1440×900, `prefers-reduced-motion: reduce` | mouse | @any @surface @mouse @reduced |
| laptop-no-js | 1440×900, JavaScript off | mouse | @nojs |
| phone-throttled | 390×844, CPU 4×, Fast 3G | touch, mobile | @perf |
| webkit-phone-small, webkit-phone, webkit-phone-large (CI) | as the phones | touch, mobile | @any @column @touch |

Fast 3G is DevTools' preset: 562.5 ms latency, 1.6 Mbps down, 750 kbps up, each at 90%. Every context renders at device scale 1 (layout is in CSS pixels either way, and software GL pays for every device pixel of the field).

## The suites

Every suite reads `/`, `/work` and `/colophon`, and where it matters the two deep links, `/#piece-chapter-the-chores` and `/work#year-2008`.

- **layout**: no horizontal overflow, and on phones the layout viewport is the phone's width; nothing shows past the right edge; no `overflow: hidden` box cuts its text off by more than 4 px (beats grow with their words); no visible text under 11 px, except inside a phase the reader hasn't opened (the far overview); and every line that scrolls with the page can be scrolled clear of both docks. Text may pass under the docks (Kevin, Oct 16: they obscure and refract what flows beneath them); what the test catches is a line that can never be read clear of them. Every phase is checked as the reader arrives at it.
- **gate**: begin on the home page; on a desktop or tablet the "TURN IT UP" line types in under the button, holds and erases, and only then does the Hello type in; the docks arrive. A phone's home gate is the button alone, with no line. `/work` and `/colophon` open straight in on every device, readable within 5 s, and their sound starts from the ambience popover. No AudioContext is made before a press of the reader's own. With JavaScript no frame shows the plain document before the docks have set the page up (`html[data-js]` until `html[data-docked]`); if the scripts never arrive, the words still show (the failsafe); with JavaScript off, every route shows everything at once.
- **surface**: pressing a phase's name (click, tap or Enter) lands where every visible word is 11 px or more; Escape steps back out to the overview; the chapter deep link lands on its piece, readable, within 8 s of the press (it opens behind begin; a deep link skips the TURN IT UP line, Kevin, Oct 19, but the logo's fall and the journey still take their time); the work year's deep link, with no gate, within 5 s of load.
- **reach**: following only links in the server's HTML from `/`, every chapter, essay and piece of work in `content/` is reachable, and every one of them and every phase on the timeline has a link of its own; the old blog's posts aren't listed (the contents name chapters and work only, Kevin, Oct 18), so each must be in the page with its id, inside its phase, whose contents carry the dive into its posts; with JavaScript off, the Site nav (`<nav aria-label="Site">`) shows and links `/work` and `/colophon` on every route; with JavaScript on, the Site nav or the docks are the nav: never both, and always one of them while the page shows anything but begin (behind begin, or while the page waits unseen for the docks, there is nothing to navigate; sampled every 50 ms from the first content to the settled page); with JavaScript off, every chapter's words are on the page and no editorial marker is.
- **a11y**: axe on each route (serious and critical fail); alt on every image and a name on every control, popover open or not; on touch screens every target the reader can reach is 44×44 px or more. Two exceptions, both WCAG 2.5.8's: a link inside running prose, and a smaller target whose 24 px spacing circle meets no neighbor in its layer (an open popover covers the page beneath it), which is reported as close-set rather than failed (the popover's list, a phase's contents line and the phone timeline's agents block need more room to reach 44 px, Kevin's call).
- **budgets**: the numbers below.
- **rules**: the field's canvas never takes a pointer; hovering, focusing or pressing a link animates nothing but the docks and the one transition (a press may also move the camera, since that is its action); with reduced motion the field's drift is zero and nothing animates, with a control test that it does drift otherwise.

## The budgets

All in `tests/e2e/budgets.ts`, one file, each with who set it and when. KB is 1000 bytes.

| Budget | Number | Set by |
| --- | --- | --- |
| `/` HTML, brotli 11 | 130 KB | Kevin, Oct 18 2026: every word stays in the home document; was 14 KB |
| `/work`, `/colophon` HTML, brotli 11 | 30 KB | the lead, Oct 18 2026 |
| this site's own JavaScript before begin, brotli 11, not counting React and Next.js | 50 KB | `CLAUDE.md`, Kevin; the framework reported, not failed (the lead, Oct 18 2026) |
| no WebGL context before first paint; the field's and the instrument's requests after it | — | `CLAUDE.md` |
| pictures requested on `/` before begin, no scroll (the field's own portrait, loaded after idle, not counted) | 0 | the lead, Oct 18 2026, from P's measurement; `CLAUDE.md`: "no picture fetched before it's near" |
| CLS, load through begin to the first view | < 0.1 | the plan, Oct 18 2026 |
| LCP on the throttled phone | < 7 s | Kevin, Oct 19 2026: the page stays hidden until the docks set it up, on every device (was 2.5 s, the plan) |

Every test writes what it measured into its annotations, so a green run still shows the numbers in the report.

How the bytes are counted:

- **Brotli at its best.** Every size is the served bytes, decoded, compressed in the test with brotli at quality 11, whatever the server sent (`next start` sends gzip, and never brotli). The budget is the document's weight, not one host's setting (Kevin, Oct 18). The wire size is noted beside it. The deployment serves the home page at about 200 KB on the wire, because the host compresses on the fly at a lighter setting (Vercel's edge sent the PR #19 preview's chunks at exactly their quality-3 sizes); that number is reported, not budgeted.
- **Framework or app.** Turbopack writes each chunk as a list of module factories. This app's TypeScript compiles to ES module factories, the framework's CommonJS packages (react, react-dom, scheduler, next) to CommonJS ones, and the Turbopack runtime has no modules of its own; `tests/e2e/bytes.ts` reads each chunk that way and splits its bytes. A chunk it can't read falls back to the build manifest's `rootMainFiles`, and otherwise counts as the app's, so nothing unknown hides. The framework's bytes are reported in the annotations, never failed.

## Changing a budget

Change the number in `tests/e2e/budgets.ts`, say who decided and when in the comment beside it, and commit it on its own with the reason in the message. A budget moves because someone chose to move it, never to turn a run green.

## Harness caveats

- **Software GL.** CI has no GPU; Chromium runs WebGL in SwiftShader (`--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`). With the field running, a frame can take seconds, and so can a frame with its canvas only hidden (it is still composited). Tests that measure the page, or time a journey, hold the field still and take its canvases out (`stillField()` in `tests/e2e/fixtures.ts`: paused, `display: none`; the canvases are fixed and take no pointer, so the layout and every other node are untouched). Timing a trip with the field running would time SwiftShader, not the site; the field's own cost is the plan's week-three frame test, against a real-device baseline. Never screenshot the whole document with the field running: one capture can take minutes.
- **The glass is off.** In software compositing the docks' frosted glass (`backdrop-filter`) costs seconds a frame at 1920 px and wider (measured Oct 18 at 2560×1080: frames of 0.7–41 s with it, 17 ms without), long enough that Playwright can't confirm a button is still. Nothing in week one looks at pixels, and the glass changes no layout, timing or behavior the suite checks, so every context turns it off with a constructed stylesheet (the `glass` option; nothing enters the DOM). The throttled phone keeps it, since paint cost is what it measures; the week-two pixel tests will turn it on.
- **No full-page screenshots on phones.** Playwright's full-page capture resets touch emulation on mobile contexts (`(pointer: coarse)` turns false afterwards, and the page rebuilds its docks as a desktop's). The suite takes none.
- **Cores and memory, and the field on or off.** `app/air.tsx` gates the field on `navigator.hardwareConcurrency` and `deviceMemory`; test machines have few cores, so every context with JavaScript reports 8 of each (the `field` option), as the devices it stands for would. The tests that time the site (`/work` and `/colophon` readable at once, the deep links in view within 5 s) set `field: false` instead: the page asks to save data and gets the glance tier, with no field, since in software GL the field's first frames hold the main thread for seconds and the timing would be SwiftShader's.
- **What the network events can't see.** An audio worklet's module (`/sound/pedals.js`) is fetched where neither Playwright nor resource timing sees it, so the harness records each `addModule` call, and when, from the page's first moment; it records each `AudioContext` made, the first WebGL context and when begin first appeared the same way (`RECORDERS` in `tests/e2e/fixtures.ts`).
- **Beats are hidden until they arrive.** Each beat and year is `visibility: hidden` until it scrolls into view after begin. Tests scroll to a beat and wait for it to set in before measuring it.
- **Fonts.** The faces come from Adobe Fonts. Nothing waits on them more than 3 s, so no result depends on the network; where they don't load, text is measured in the fallback faces.
- **Vercel deployment protection.** The preview job passes it with the project's Protection Bypass for Automation secret, stored in the repository as `VERCEL_AUTOMATION_BYPASS_SECRET`. The harness sends it once, as the `x-vercel-protection-bypass` header with `x-vercel-set-bypass-cookie: true`, to the deployment only; the browser then carries the cookie, so the secret never goes to a third party (the font host). That job runs with repository secrets on a deployment's commit: Vercel deploys a pull request from a fork only once a maintainer authorizes it, and that authorization is the gate.
- **Timing on shared machines.** Times like "in view within 5 s" are generous on purpose; a 2-core runner with software GL is much slower than a phone with a GPU. Frame-rate tests wait for a real-device baseline (the plan's week three).
