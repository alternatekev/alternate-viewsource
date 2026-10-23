import type { Page } from "@playwright/test";
import { ROUTES, enter, expect, note, test } from "./fixtures";
import { chapterTexts, phaseKeys, plain, publishablePieces } from "./content";

// Findability, from the server's HTML alone (JavaScript off): following only <a href> links from /,
// every chapter, essay and piece of work in content/ can be reached, and every phase has a link. The
// old blog's posts aren't listed (Kevin, Oct 18: the contents name "chapters and work only"): each is
// in the page with its id, inside a phase whose contents carry the dive into its posts. /work and
// /colophon are linked from the Site nav on every route; with JavaScript on, the Site nav or the docks
// are the nav, never both and never neither. And the no-JS tier shows every chapter's words.

type Seen = { ids: string[]; links: string[]; siteNav: { links: string[]; visible: boolean } | null; postDives: string[]; pieceBeats: Record<string, string> };

async function read(page: Page, path: string): Promise<Seen> {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  return page.evaluate(() => {
    const same = (a: HTMLAnchorElement) => a.origin === location.origin;
    const at = (a: HTMLAnchorElement) => (a.pathname.replace(/\/+$/, "") || "/") + a.hash;
    const nav = document.querySelector<HTMLElement>('nav[aria-label="Site"]');
    const shows = (el: Element) => { const s = getComputedStyle(el), r = el.getBoundingClientRect(); return s.display !== "none" && s.visibility === "visible" && r.width > 0 && r.height > 0; };
    return {
      ids: [...document.querySelectorAll("[id]")].map((e) => e.id),
      links: [...document.querySelectorAll<HTMLAnchorElement>("a[href]")].filter(same).map(at),
      siteNav: nav ? { links: [...nav.querySelectorAll<HTMLAnchorElement>("a[href]")].filter(same).map(at), visible: shows(nav) && [...nav.querySelectorAll("a[href]")].every(shows) } : null,
      // the phases whose contents carry the press into their blog posts
      postDives: [...document.querySelectorAll<HTMLElement>(".beat[data-key]")].filter((b) => !!b.querySelector(`.phase-contents [data-dive="near-${b.dataset.key}"]`)).map((b) => b.dataset.key!),
      // the phase each piece sits in
      pieceBeats: Object.fromEntries([...document.querySelectorAll<HTMLElement>('.beat[data-key] [id^="piece-"]')].map((p) => [p.id, p.closest<HTMLElement>(".beat")!.dataset.key!])),
    };
  });
}

/** every page a link from / leads to, read once each */
async function crawl(page: Page) {
  const pages = new Map<string, Seen>();
  const queue = ["/"];
  while (queue.length) {
    const path = queue.shift()!;
    if (pages.has(path)) continue;
    const seen = await read(page, path);
    pages.set(path, seen);
    for (const l of seen.links) {
      const p = l.split("#")[0];
      // pages of the site only: not its files, its API or the framework's assets
      if (!pages.has(p) && !queue.includes(p) && !/^\/(_next|api)\b/.test(p) && !/\.[a-z0-9]{2,5}$/i.test(p)) queue.push(p);
    }
  }
  return pages;
}

test("reach: following links from /, every chapter, essay and piece of work is reachable; every post is on the page under its phase's dive", { tag: "@nojs" }, async ({ page }) => {
  const pages = await crawl(page);
  const links = new Set([...pages.values()].flatMap((s) => s.links));
  // an address is reached when some link names it and the page it names has that id
  const reached = new Set([...links].filter((l) => { const [p, id] = l.split("#"); return !!id && pages.get(p)?.ids.includes(id); }));
  const pieces = publishablePieces();
  const listed = pieces.filter((p) => p.kind !== "post"), posts = pieces.filter((p) => p.kind === "post");
  note("reach", `pages reached: ${[...pages.keys()].join(", ")}; ${listed.length} chapters, essays and work, ${posts.length} posts; ${reached.size} addresses linked`);

  const missing = listed.filter((p) => !p.anchors.some((a) => reached.has(a))).map((p) => `${p.key} (${p.title})`);
  expect.soft(missing, "every chapter, essay and piece of work is reachable by following links from /").toEqual([]);

  // nothing on the page that content/ doesn't publish (a stub, or a chapter under review), and nothing missing
  const home = pages.get("/")!;
  const known = new Set(pieces.flatMap((p) => p.anchors));
  const extra = home.ids.filter((id) => id.startsWith("piece-") && !known.has(`/#${id}`));
  expect.soft(extra, "the home page holds nothing content/ doesn't publish").toEqual([]);
  const absent = pieces.filter((p) => p.anchors.some((a) => a.startsWith("/#")) && !p.anchors.some((a) => a.startsWith("/#") && home.ids.includes(a.slice(2)))).map((p) => p.key);
  expect.soft(absent, "the home page holds every piece content/ publishes there").toEqual([]);

  // the timeline's chapters, essays and work, and its phases, each have a link of their own
  const linkedIds = home.ids.filter((id) => id.startsWith("phase-") || listed.some((p) => p.anchors.includes(`/#${id}`)));
  const unlinked = linkedIds.filter((id) => !reached.has(`/#${id}`));
  note("reach", `timeline ids that need a link: ${linkedIds.length}, without one: ${unlinked.length}`);
  expect.soft(unlinked, "every #phase-… and every chapter, essay and work #piece-… on / has an inbound link").toEqual([]);
  expect.soft(phaseKeys().filter((k) => !home.ids.includes(`phase-${k}`)), "every phase is on /").toEqual([]);

  // the old posts: in the page with their id, inside the phase they belong to, whose contents carry the dive into them
  const stray = posts.filter((p) => p.phase && home.pieceBeats[`piece-${p.key}`] !== p.phase).map((p) => `${p.key}: in ${home.pieceBeats[`piece-${p.key}`] ?? "no phase"}, belongs in ${p.phase}`);
  expect.soft(stray, "every post is on / with its id, inside its own phase").toEqual([]);
  const phasesWithPosts = [...new Set(posts.map((p) => p.phase).filter((p): p is string => !!p))];
  note("reach", `phases holding posts: ${phasesWithPosts.join(", ")}; carrying the dive into them: ${home.postDives.join(", ") || "none"}`);
  expect.soft(phasesWithPosts.filter((k) => !home.postDives.includes(k)), "every phase that holds posts carries the dive into them in its contents").toEqual([]);

  // the work page's pieces: each is reachable, by its own address or its timeline one
  const work = pages.get("/work");
  expect.soft(work, "/work is reached").toBeTruthy();
  if (work) {
    const workIds = work.ids.filter((id) => id.startsWith("work-"));
    const own = workIds.filter((id) => reached.has(`/work#${id}`));
    note("reach", `/work: ${workIds.length} #work-… ids, ${own.length} with a link of their own`);
    const stranded = workIds.filter((id) => !reached.has(`/work#${id}`) && !reached.has(`/#piece-${id.slice(5)}`));
    expect.soft(stranded, "every #work-… piece is reachable, by its own address or its timeline one").toEqual([]);
  }
});

test("reach: with JavaScript off, the Site nav links /work and /colophon on every route, and shows", { tag: "@nojs" }, async ({ page }) => {
  for (const path of ROUTES) {
    const seen = await read(page, path);
    const nav = new Set((seen.siteNav?.links ?? []).map((l) => l.split("#")[0]));
    note("reach", `${path}: Site nav ${seen.siteNav ? `links ${[...nav].join(", ")}, ${seen.siteNav.visible ? "showing" : "not showing"}` : "missing"}`);
    expect.soft(seen.siteNav, `${path}: a <nav aria-label="Site">`).toBeTruthy();
    expect.soft(nav.has("/work"), `${path}: the Site nav links to /work`).toBe(true);
    expect.soft(nav.has("/colophon"), `${path}: the Site nav links to /colophon`).toBe(true);
    expect.soft(seen.siteNav?.visible, `${path}: the Site nav and its links show`).toBe(true);
  }
});

test("reach: with JavaScript off, / shows every chapter's words", { tag: "@nojs" }, async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const text = plain(await page.evaluate(() => document.body.innerText));
  const chapters = chapterTexts();
  const missing: string[] = [];
  for (const c of chapters) {
    if (!text.includes(plain(c.title))) missing.push(`${c.slug}: its title`);
    for (const chunk of c.chunks) if (!text.includes(chunk)) missing.push(`${c.slug}: "${chunk}"`);
  }
  note("reach", `${chapters.length} chapters, ${chapters.reduce((n, c) => n + c.chunks.length, 0)} passages checked`);
  expect.soft(missing, "every chapter's words show with JavaScript off").toEqual([]);
  // Kevin's editorial markers stay in the source and never reach a built page
  expect.soft(text.match(/\[(check|needs Kevin):[^\]]{0,40}/g) ?? [], "no [check: …] or [needs Kevin: …] marker on the page").toEqual([]);
});

// Sampled every 50 ms from the document's first content: is the Site nav exposed (to sight and to a
// screen reader), is any dock's nav, and is the page showing nothing else: begin's gate up ("begin:
// the only thing on the page until it is pressed"), or, with JavaScript, the page still unseen until
// the docks set it up (html[data-js] until html[data-docked]). No nav is fine then.
const NAV_SAMPLER = `(() => {
  const rec = (window.__e2eNav = []);
  const exposed = (el) => {
    if (!el.isConnected || el.closest('[aria-hidden="true"], [inert]')) return false;
    const s = getComputedStyle(el);
    return s.display !== "none" && s.visibility === "visible" && el.getClientRects().length > 0;
  };
  const tick = () => {
    rec.push({
      t: Math.round(performance.now()),
      site: [...document.querySelectorAll('nav[aria-label="Site"]')].some(exposed),
      docks: [...document.querySelectorAll("nav.dock")].some(exposed),
      gate: !!document.querySelector(".intro") || (!!document.body && getComputedStyle(document.body).visibility !== "visible"),
    });
  };
  document.addEventListener("DOMContentLoaded", () => { tick(); setInterval(tick, 50); }, { once: true });
})();`;

test("reach: with JavaScript on, the Site nav or the docks are the nav: never both, and one whenever the page shows", { tag: "@any" }, async ({ page, hasTouch }) => {
  await page.addInitScript({ content: NAV_SAMPLER });
  for (const path of ROUTES) {
    await page.goto(path, { waitUntil: "load" });
    await enter(page, hasTouch);
    await page.waitForTimeout(1000);
    const samples = await page.evaluate(() => (window as unknown as { __e2eNav: { t: number; site: boolean; docks: boolean; gate: boolean }[] }).__e2eNav);
    const both = samples.filter((s) => s.site && s.docks), neither = samples.filter((s) => !s.site && !s.docks && !s.gate);
    const span = (xs: { t: number }[]) => (xs.length ? `${xs.length} samples, ${xs[0].t}–${xs[xs.length - 1].t} ms` : "none");
    note("nav", `${path}: ${samples.length} samples; both exposed: ${span(both)}; neither: ${span(neither)}`);
    expect.soft(samples.length, `${path}: sampled`).toBeGreaterThan(0);
    expect.soft(span(both), `${path}: the Site nav and the docks are never exposed together`).toBe("none");
    expect.soft(span(neither), `${path}: there is always one of them while the page shows (not behind begin, not while it waits unseen for the docks)`).toBe("none");
  }
});
