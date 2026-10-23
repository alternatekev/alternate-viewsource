import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { ROUTES, expect, note, press, settle, stillField, test, visit } from "./fixtures";
import { namesAndAlts, smallTargets } from "./measure";

// Accessibility on every route, after begin, as a reader finds it: axe (serious and critical fail),
// alt on every image and a name on every control, and on touch screens every target the reader can
// reach at least 44 x 44 px. A link inside running prose is exempt (WCAG 2.5.8's inline exception);
// a smaller target with 2.5.8's 24 px spacing clear of its neighbors is close-set, reported and not
// failed: more room for the popover's list, a phase's contents line and the phone timeline's agents
// block is Kevin's call (the lead, Oct 18).

const TARGET = 44;

async function popover(page: Page, touch: boolean) {
  await press(page.locator("button.dock-ambience"), touch);
  await expect(page.locator("button.dock-ambience")).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator(".dock-popover")).toBeVisible();
  await settle(page); // the popover sets in and its words type in
}

for (const path of ROUTES) {
  test(`a11y: axe finds nothing serious or critical on ${path}`, { tag: "@axe" }, async ({ page, hasTouch }) => {
    await visit(page, path, hasTouch);
    await stillField(page);
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"]).analyze();
    const bad = result.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    const rest = result.violations.filter((v) => !bad.includes(v));
    note("axe", `${path}: ${bad.length} serious or critical, ${rest.length} moderate or minor (${rest.map((v) => v.id).join(", ") || "none"}), ${result.incomplete.length} for a person to review`);
    expect(bad.map((v) => `${v.impact} ${v.id}: ${v.help} (${v.nodes.length}: ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")})`), `${path}: no serious or critical violations`).toEqual([]);
  });

  test(`a11y: every image has alt and every control a name on ${path}`, { tag: "@any" }, async ({ page, hasTouch }) => {
    await visit(page, path, hasTouch);
    await stillField(page);
    const settled = await page.evaluate(namesAndAlts);
    expect.soft(settled.imgNoAlt, `${path}: every img has alt`).toEqual([]);
    expect.soft(settled.unnamed, `${path}: every control has a name`).toEqual([]);
    await popover(page, hasTouch);
    const open = await page.evaluate(namesAndAlts);
    expect.soft(open.unnamed, `${path}, popover open: every control has a name`).toEqual([]);
  });

  test(`a11y: touch targets are ${TARGET} px or more on ${path}`, { tag: "@touch" }, async ({ page, hasTouch }) => {
    await visit(page, path, hasTouch);
    await stillField(page);
    const settled = await page.evaluate(smallTargets, TARGET);
    note("targets", `${path}: ${settled.count} under ${TARGET} px; close-set (Kevin's call): ${settled.spaced.map((t) => `${t.text} ${t.w}x${t.h}`).join(", ") || "none"}`);
    expect.soft(settled.items, `${path}: every target in view is ${TARGET} x ${TARGET} px or more`).toEqual([]);
    await popover(page, hasTouch);
    const open = await page.evaluate(smallTargets, TARGET);
    note("targets", `${path}, popover open: ${open.count} under ${TARGET} px; close-set (Kevin's call): ${open.spaced.map((t) => `${t.text} ${t.w}x${t.h}`).join(", ") || "none"}`);
    expect.soft(open.items, `${path}, popover open: every target in view is ${TARGET} x ${TARGET} px or more`).toEqual([]);
  });
}
