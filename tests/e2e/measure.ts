// What the suite measures inside the page. Each export is handed to page.evaluate, which sends its
// source to the browser: every function here is self-contained (no imports, nothing from module
// scope), and returns plain data.

export type Item = { at: string; text?: string; px?: number; by?: string; w?: number; h?: number };

export type ViewReport = {
  innerWidth: number;
  clientWidth: number;
  scrollWidth: number;
  surface: string | null;
  /** element boxes that show past the right edge of the viewport */
  pastRight: Item[];
  /** text an overflow: hidden (or clip) box cuts off by more than the tolerance */
  clipped: Item[];
  /** visible text under the minimum size, in view, outside the far overview */
  small: Item[];
  smallCount: number;
  minFont: number;
};

/**
 * The layout checks for the view as it stands: overflow, boxes past the right edge, clipped text and
 * small text. Text inside a phase the reader hasn't opened (the near field beside a phase's name at
 * the surface, html[data-surface="zoom"], its beat at depth 0) is exempt from the size floor and the
 * clip check: that is the far overview, one step out by design (Kevin, Oct 18).
 */
export function measureView(o: { minFont: number; clipTolerance: number }): ViewReport {
  const vw = innerWidth, vh = innerHeight;
  type Box = { l: number; t: number; r: number; b: number };
  const INF: Box = { l: -1e9, t: -1e9, r: 1e9, b: 1e9 };
  const cut = (a: Box, b: Box): Box => ({ l: Math.max(a.l, b.l), t: Math.max(a.t, b.t), r: Math.min(a.r, b.r), b: Math.min(a.b, b.b) });
  const of = (r: DOMRect): Box => ({ l: r.left, t: r.top, r: r.right, b: r.bottom });
  const w = (a: Box) => Math.max(0, a.r - a.l), h = (a: Box) => Math.max(0, a.b - a.t);
  const view: Box = { l: 0, t: 0, r: vw, b: vh };
  const styles = new Map<Element, CSSStyleDeclaration>();
  const cs = (e: Element) => { let s = styles.get(e); if (!s) { s = getComputedStyle(e); styles.set(e, s); } return s; };
  const desc = (el: Element) => {
    const id = el.id ? "#" + el.id : "";
    const cls = typeof el.className === "string" && el.className.trim() ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : "";
    return el.tagName.toLowerCase() + id + cls;
  };
  const snippet = (s: string) => s.trim().replace(/\s+/g, " ").slice(0, 60);
  // a fixed element escapes its ancestors' clipping; html and body hand theirs to the viewport
  const skipsUp = (el: Element) => cs(el).position === "fixed";
  const clipping = (s: CSSStyleDeclaration) => s.overflowX !== "visible" || s.overflowY !== "visible";
  const padBox = (el: Element, s: CSSStyleDeclaration): Box => {
    const r = el.getBoundingClientRect();
    if (s.transform !== "none") return of(r);
    const l = r.left + el.clientLeft, t = r.top + el.clientTop;
    return {
      l: s.overflowX !== "visible" ? l : -1e9, r: s.overflowX !== "visible" ? l + el.clientWidth : 1e9,
      t: s.overflowY !== "visible" ? t : -1e9, b: s.overflowY !== "visible" ? t + el.clientHeight : 1e9,
    };
  };
  const clipMemo = new Map<Element, Box>();
  /** the box an element's content is clipped to, in viewport coordinates */
  function contentClip(el: Element | null): Box {
    if (!el || el === document.documentElement || el === document.body) return INF;
    const hit = clipMemo.get(el);
    if (hit) return hit;
    const s = cs(el);
    let c = skipsUp(el) ? INF : contentClip(el.parentElement);
    if (clipping(s)) c = cut(c, padBox(el, s));
    clipMemo.set(el, c);
    return c;
  }
  const fadeMemo = new Map<Element, boolean>();
  function faded(el: Element | null): boolean {
    if (!el) return false;
    const hit = fadeMemo.get(el);
    if (hit !== undefined) return hit;
    const f = parseFloat(cs(el).opacity) === 0 || faded(el.parentElement);
    fadeMemo.set(el, f);
    return f;
  }
  // the screen-reader-only pattern (.visually-hidden: clip-path inset(50%)) shows nothing, whatever its box
  const srMemo = new Map<Element, boolean>();
  function readerOnly(el: Element | null): boolean {
    if (!el) return false;
    const hit = srMemo.get(el);
    if (hit !== undefined) return hit;
    const v = /inset\(\s*50%/.test(cs(el).clipPath) || readerOnly(el.parentElement);
    srMemo.set(el, v);
    return v;
  }
  const rendered = (el: Element) => el.getClientRects().length > 0 && cs(el).visibility === "visible" && !faded(el) && !readerOnly(el);
  const scaleMemo = new Map<Element, number>();
  function scaleOf(el: Element | null): number {
    if (!el || el === document.documentElement) return 1;
    const hit = scaleMemo.get(el);
    if (hit !== undefined) return hit;
    const t = cs(el).transform;
    let k = 1;
    if (t && t !== "none") { const m = new DOMMatrix(t); k = Math.hypot(m.a, m.b); }
    k *= scaleOf(el.parentElement);
    scaleMemo.set(el, k);
    return k;
  }
  const zoom = document.documentElement.dataset.surface === "zoom";
  const unopened = (el: Element) => {
    if (!zoom || !el.closest(".near")) return false;
    const beat = el.closest<HTMLElement>(".beat");
    return !!beat && (beat.dataset.depth ?? "0") === "0";
  };

  const out: ViewReport = {
    innerWidth: vw, clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth,
    surface: document.documentElement.dataset.surface ?? null, pastRight: [], clipped: [], small: [], smallCount: 0, minFont: Infinity,
  };

  // boxes past the right edge: what shows of each element, after its ancestors' clipping
  for (const el of document.querySelectorAll("body *")) {
    if (out.pastRight.length >= 20) break;
    if (/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test(el.tagName) || !rendered(el)) continue;
    const r = of(el.getBoundingClientRect());
    if (w(r) < 1 || h(r) < 1) continue;
    const shown = cut(r, skipsUp(el) ? INF : contentClip(el.parentElement));
    if (w(shown) < 1 || h(shown) < 1 || shown.b <= 0 || shown.t >= vh) continue;
    if (shown.r > vw + 1) out.pastRight.push({ at: desc(el), px: Math.round(shown.r - vw), w: Math.round(w(r)) });
  }

  // text: its size where it is in view, and whether a box cuts it off
  const small = new Set<Element>(), clippedBy = new Set<string>();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const p = n.parentElement;
    if (!p || !(n.textContent ?? "").trim() || /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test(p.tagName) || !rendered(p)) continue;
    const range = document.createRange();
    range.selectNodeContents(n);
    const rects = [...range.getClientRects()].map(of).filter((r) => w(r) > 0 && h(r) > 0);
    if (!rects.length) continue;
    const exempt = unopened(p);
    const clip = contentClip(p);
    const inView = rects.some((r) => { const s = cut(cut(r, clip), view); return w(s) >= 1 && h(s) >= 1; });
    if (inView && !exempt) {
      const eff = parseFloat(cs(p).fontSize) * scaleOf(p);
      out.minFont = Math.min(out.minFont, eff);
      if (eff < o.minFont) {
        out.smallCount++;
        if (!small.has(p) && out.small.length < 30) { small.add(p); out.small.push({ at: desc(p), px: +eff.toFixed(2), text: snippet(n.textContent ?? "") }); }
      }
    }
    if (exempt) continue;
    // every box between the text and the viewport that hides its overflow: how far does the text run past it
    for (let a: Element | null = p; a && a !== document.body && a !== document.documentElement; a = skipsUp(a) ? null : a.parentElement) {
      const s = cs(a);
      if (!/^(hidden|clip)$/.test(s.overflowX) && !/^(hidden|clip)$/.test(s.overflowY)) continue;
      // dived in, the beat is the camera's frame: what lies outside it is out of shot, reached by
      // panning or stepping back out, not cut off (at the surface, depth 0, the beat must hold its words)
      if (zoom && a.classList.contains("beat") && ((a as HTMLElement).dataset.depth ?? "0") !== "0") continue;
      if (s.textOverflow === "ellipsis") continue; // a clean truncation, by design
      const box = padBox(a, s);
      if (w(box) <= 2 || h(box) <= 2) continue; // a screen-reader-only box
      const past = Math.max(...rects.map((r) => Math.max(
        /^(hidden|clip)$/.test(s.overflowX) ? Math.max(box.l - r.l, r.r - box.r) : 0,
        /^(hidden|clip)$/.test(s.overflowY) ? Math.max(box.t - r.t, r.b - box.b) : 0,
      )));
      if (past > o.clipTolerance) {
        const key = desc(a) + "|" + desc(p);
        if (!clippedBy.has(key) && out.clipped.length < 30) { clippedBy.add(key); out.clipped.push({ at: desc(p), by: desc(a), px: Math.round(past), text: snippet(n.textContent ?? "") }); }
      }
    }
  }
  if (out.minFont === Infinity) out.minFont = 0;
  return out;
}

/**
 * Text under the docks is by design (Kevin, Oct 16: the docks obscure and refract what flows beneath
 * them); what isn't is a line that can never be read clear of them. For every line of text that
 * scrolls with the page, is there a scroll position where it sits whole between the docks it shares
 * columns with? The docks are fixed, so this is arithmetic on their boxes and the page's scroll range.
 * Lines inside a fixed box (the work corridor's camera) don't scroll with the page; lines in an
 * unopened phase's field, or in a beat the camera has moved into, are the surface's, not the column's.
 */
export function unclearLines(): { docks: string[]; lines: number; unclear: Item[] } {
  const vh = innerHeight, sy = scrollY, maxScroll = Math.max(0, document.documentElement.scrollHeight - vh);
  const styles = new Map<Element, CSSStyleDeclaration>();
  const cs = (e: Element) => { let x = styles.get(e); if (!x) { x = getComputedStyle(e); styles.set(e, x); } return x; };
  const shows = (e: Element) => e.getClientRects().length > 0 && cs(e).visibility === "visible" && parseFloat(cs(e).opacity) > 0;
  const docks = [...document.querySelectorAll<HTMLElement>(".dock")].filter(shows).map((d) => ({ id: d.dataset.dock ?? "dock", r: d.getBoundingClientRect() }));
  const zoom = document.documentElement.dataset.surface === "zoom";
  const out = { docks: docks.map((d) => `${d.id} ${Math.round(d.r.left)},${Math.round(d.r.top)} ${Math.round(d.r.width)}x${Math.round(d.r.height)}`), lines: 0, unclear: [] as Item[] };
  // where a line shows of its box, and whether it moves with the page at all
  const settle = new Map<Element, { moves: boolean; clip: { l: number; t: number; r: number; b: number } }>();
  function of(el: Element): { moves: boolean; clip: { l: number; t: number; r: number; b: number } } {
    const hit = settle.get(el);
    if (hit) return hit;
    const s = cs(el);
    let res;
    if (s.position === "fixed" || s.position === "sticky") res = { moves: false, clip: { l: -1e9, t: -1e9, r: 1e9, b: 1e9 } };
    else {
      const up = el.parentElement && el.parentElement !== document.body ? of(el.parentElement) : { moves: true, clip: { l: -1e9, t: -1e9, r: 1e9, b: 1e9 } };
      let clip = up.clip;
      if (s.overflowX !== "visible" || s.overflowY !== "visible") { const r = el.getBoundingClientRect(); clip = { l: Math.max(clip.l, r.left), t: Math.max(clip.t, r.top), r: Math.min(clip.r, r.right), b: Math.min(clip.b, r.bottom) }; }
      res = { moves: up.moves, clip };
    }
    settle.set(el, res);
    return res;
  }
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set<Element>();
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const p = n.parentElement;
    if (!p || !(n.textContent ?? "").trim() || /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test(p.tagName)) continue;
    if (p.closest(".dock, .dock-popover, .intro, .dock-visualizer, .dock-ghost, .visually-hidden") || !shows(p)) continue;
    let readerOnly = false;
    for (let e: Element | null = p; e && !readerOnly; e = e.parentElement) readerOnly = /inset\(\s*50%/.test(cs(e).clipPath);
    if (readerOnly) continue; // screen-reader-only text shows nothing
    const beat = p.closest<HTMLElement>(".beat");
    if (zoom && beat && ((beat.dataset.depth ?? "0") !== "0" || p.closest(".near"))) continue;
    const at = of(p);
    if (!at.moves) continue;
    const range = document.createRange();
    range.selectNodeContents(n);
    for (const r of range.getClientRects()) {
      const w = Math.min(r.right, at.clip.r) - Math.max(r.left, at.clip.l), h = Math.min(r.bottom, at.clip.b) - Math.max(r.top, at.clip.t);
      if (w < 2 || h < 2) continue; // cut off or screen-reader-only: the clip check's business
      out.lines++;
      const a = r.top + sy, b = r.bottom + sy;
      // the free bands of the screen, top to bottom, between the docks that share the line's columns
      let free: [number, number][] = [[0, vh]];
      for (const d of docks) {
        if (Math.min(r.right, d.r.right) - Math.max(r.left, d.r.left) < 1) continue;
        const cut = (u: number, v: number): [number, number][] => (d.r.bottom <= u || d.r.top >= v ? [[u, v]] : [[u, Math.max(u, d.r.top)], [Math.min(v, d.r.bottom), v]]);
        free = free.flatMap(([u, v]) => cut(u, v)).filter(([x, y]) => y > x);
      }
      const clear = free.some(([u, v]) => v - u >= r.height - 0.5 && Math.max(0, b - v) <= Math.min(maxScroll, a - u) + 0.5);
      if (!clear && !seen.has(p)) {
        seen.add(p);
        if (out.unclear.length < 20) out.unclear.push({ at: p.tagName.toLowerCase() + (typeof p.className === "string" && p.className ? "." + p.className.trim().split(/\s+/)[0] : ""), text: (n.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 50), px: Math.round(a) });
      }
    }
  }
  return out;
}

/** true while anything of the one transition or the camera is still moving, or a word is still typing */
export function stillMoving(): string | null {
  for (const a of document.getAnimations()) {
    if (a.playState !== "running") continue;
    const name = (a as CSSAnimation).animationName;
    if (name === "set-in" || name === "set-out") return `${name} on ${(a.effect as KeyframeEffect | null)?.target?.className ?? "?"}`;
    const t = (a.effect as KeyframeEffect | null)?.target;
    if (t && !(a instanceof CSSAnimation) && !(a instanceof CSSTransition) && t.closest(".space, .stop-space, .begin-loud, .intro")) return `the camera or the gate (${t.className})`;
  }
  const hl = typeof CSS !== "undefined" && "highlights" in CSS ? CSS.highlights.get("untyped") : undefined;
  if (hl) {
    for (const r of hl) {
      if (r.collapsed || !(r instanceof Range)) continue;
      const p = r.startContainer.parentElement;
      if (p && p.isConnected && p.getClientRects().length && getComputedStyle(p).visibility === "visible" && !p.closest("[data-type-self]")) return `typing: "${(r.startContainer.textContent ?? "").slice(0, 30)}"`;
    }
  }
  return null;
}

/** how many letters of an element are showing: none while it (or an ancestor) is hidden, see-through,
 *  clipped away by the set-in, or its letters are still untyped (lib/type.ts paints them out) */
export function shownLetters(selector: string): number {
  const el = document.querySelector(selector);
  if (!el || !el.isConnected || !el.getClientRects().length) return 0;
  for (let e: Element | null = el; e; e = e.parentElement) {
    const s = getComputedStyle(e);
    if (parseFloat(s.opacity) === 0) return 0;
    const m = /inset\(([^)]*)\)/.exec(s.clipPath);
    if (m) {
      const v = m[1].split(/\s+/).map((x) => (x.endsWith("%") ? parseFloat(x) : NaN));
      if (v.some((x) => x >= 100) || (v.length === 4 && v[1] + v[3] >= 100) || (v.length === 4 && v[0] + v[2] >= 100)) return 0;
    }
  }
  const hidden = new Map<Node, number>();
  const hl = typeof CSS !== "undefined" && "highlights" in CSS ? CSS.highlights.get("untyped") : undefined;
  if (hl) for (const r of hl) if (!r.collapsed && el.contains(r.startContainer)) hidden.set(r.startContainer, (hidden.get(r.startContainer) ?? 0) + (r.endOffset - r.startOffset));
  let n = 0;
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let t = walker.nextNode(); t; t = walker.nextNode()) {
    const p = t.parentElement;
    if (!p || getComputedStyle(p).visibility !== "visible" || p.closest(".type-ghost")) continue;
    n += Math.max(0, (t.textContent ?? "").replace(/\s/g, "").length - (hidden.get(t) ?? 0));
  }
  return n;
}

/** whether the element with this id shows inside the viewport (after every box that clips it) */
export function idInView(id: string): { found: boolean; inView: boolean; top?: number; scrollY: number; depth?: string; hash: string } {
  const el = document.getElementById(id);
  const out = { found: !!el, inView: false, scrollY: Math.round(scrollY), hash: location.hash } as { found: boolean; inView: boolean; top?: number; scrollY: number; depth?: string; hash: string };
  if (!el) return out;
  let r = { l: 0, t: 0, r: 0, b: 0 };
  const b = el.getBoundingClientRect();
  r = { l: b.left, t: b.top, r: b.right, b: b.bottom };
  for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
    const s = getComputedStyle(a);
    if (s.position === "fixed") break;
    if (s.overflowX === "visible" && s.overflowY === "visible") continue;
    const c = a.getBoundingClientRect();
    r = { l: Math.max(r.l, c.left), t: Math.max(r.t, c.top), r: Math.min(r.r, c.right), b: Math.min(r.b, c.bottom) };
  }
  r = { l: Math.max(r.l, 0), t: Math.max(r.t, 0), r: Math.min(r.r, innerWidth), b: Math.min(r.b, innerHeight) };
  out.inView = r.r - r.l >= 1 && r.b - r.t >= 1 && getComputedStyle(el).visibility === "visible";
  out.top = Math.round(b.top);
  out.depth = el.closest<HTMLElement>(".beat")?.dataset.depth;
  return out;
}

/** the smallest effective font size of the visible, in-view text inside a root (transforms included) */
export function minTextIn(selector: string): { min: number; count: number; under: Item[] } {
  const root = document.querySelector(selector);
  const out = { min: Infinity, count: 0, under: [] as Item[] };
  if (!root) return { min: 0, count: 0, under: [] };
  const vw = innerWidth, vh = innerHeight;
  const scale = (el: Element | null) => { let k = 1; for (let e = el; e && e !== document.documentElement; e = e.parentElement) { const t = getComputedStyle(e).transform; if (t && t !== "none") { const m = new DOMMatrix(t); k *= Math.hypot(m.a, m.b); } } return k; };
  const clipOf = (el: Element) => {
    let c = { l: 0, t: 0, r: vw, b: vh };
    for (let a: Element | null = el; a && a !== document.body; a = a.parentElement) {
      const s = getComputedStyle(a);
      if (s.overflowX !== "visible" || s.overflowY !== "visible") { const r = a.getBoundingClientRect(); c = { l: Math.max(c.l, r.left), t: Math.max(c.t, r.top), r: Math.min(c.r, r.right), b: Math.min(c.b, r.bottom) }; }
      if (s.position === "fixed") break;
    }
    return c;
  };
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const done = new Set<Element>();
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const p = n.parentElement;
    if (!p || done.has(p) || !(n.textContent ?? "").trim()) continue;
    const s = getComputedStyle(p);
    if (!p.getClientRects().length || s.visibility !== "visible") continue;
    let o = 1;
    for (let e: Element | null = p; e; e = e.parentElement) o = Math.min(o, parseFloat(getComputedStyle(e).opacity));
    if (o === 0) continue;
    const range = document.createRange();
    range.selectNodeContents(n);
    const c = clipOf(p);
    const shows = [...range.getClientRects()].some((r) => Math.min(r.right, c.r) - Math.max(r.left, c.l) >= 1 && Math.min(r.bottom, c.b) - Math.max(r.top, c.t) >= 1);
    if (!shows) continue;
    done.add(p);
    const eff = parseFloat(s.fontSize) * scale(p);
    out.count++;
    out.min = Math.min(out.min, eff);
    if (eff < 11 && out.under.length < 15) out.under.push({ at: p.tagName.toLowerCase() + (typeof p.className === "string" && p.className ? "." + p.className.split(" ")[0] : ""), px: +eff.toFixed(2), text: (n.textContent ?? "").trim().slice(0, 40) });
  }
  if (out.min === Infinity) out.min = 0;
  return out;
}

/** the visible interactive targets in view smaller than min × min. A link inside running prose is
 *  exempt (WCAG 2.5.8's inline exception: a link in a sentence, sized by its line). A smaller target
 *  whose 24 px spacing circle, centered on it, meets no other target and no other undersized target's
 *  circle (2.5.8's spacing exception) is close-set: reported, not failed (Kevin's call, Oct 18).
 *  Everything else under min fails. */
export function smallTargets(min: number): { count: number; items: Item[]; spaced: Item[] } {
  const vw = innerWidth, vh = innerHeight;
  const out = { count: 0, items: [] as Item[], spaced: [] as Item[] };
  const blockOf = (el: Element) => { for (let e = el.parentElement; e; e = e.parentElement) if (!getComputedStyle(e).display.startsWith("inline")) return e; return document.body; };
  const prose = (el: Element) => {
    if (getComputedStyle(el).display !== "inline") return false;
    const block = blockOf(el);
    let words = 0;
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (n.parentElement?.closest("a, button, [role=button]")) continue;
      words += ((n.textContent ?? "").match(/\p{L}{2,}/gu) ?? []).length;
    }
    return words >= 3;
  };
  const sel = "a[href], button, [role=button], input, select, textarea, summary, [tabindex]:not([tabindex='-1'])";
  const reachable: { el: HTMLElement; r: DOMRect }[] = [];
  for (const el of document.querySelectorAll<HTMLElement>(sel)) {
    if (!el.getClientRects().length) continue;
    const s = getComputedStyle(el);
    if (s.visibility !== "visible" || s.pointerEvents === "none" || (el as HTMLButtonElement).disabled) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1 || r.bottom <= 0 || r.top >= vh || r.right <= 0 || r.left >= vw) continue;
    // a target is one the reader can reach: at its visible middle, the hit lands on it
    const x = Math.min(vw - 1, Math.max(0, r.left + r.width / 2)), y = Math.min(vh - 1, Math.max(0, r.top + r.height / 2));
    const hit = document.elementFromPoint(x, y);
    if (!hit || !(hit === el || el.contains(hit))) continue;
    reachable.push({ el, r });
  }
  const center = (r: DOMRect) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
  const undersized = (r: DOMRect) => r.width < 24 || r.height < 24;
  const meetsBox = (c: { x: number; y: number }, r: DOMRect) => Math.hypot(c.x - Math.max(r.left, Math.min(c.x, r.right)), c.y - Math.max(r.top, Math.min(c.y, r.bottom))) < 12;
  const desc = (el: HTMLElement, r: DOMRect): Item => ({ at: el.tagName.toLowerCase() + (typeof el.className === "string" && el.className ? "." + el.className.split(" ")[0] : ""), text: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 40), w: Math.round(r.width), h: Math.round(r.height) });
  for (const { el, r } of reachable) {
    if (r.width >= min && r.height >= min) continue;
    if (el.tagName === "A" && prose(el)) continue;
    const c = center(r);
    // neighbors in the same layer: an open popover covers the page beneath it, so a link half under it is no neighbor of its options
    const layer = el.closest(":popover-open");
    const crowded = reachable.some((o) => o.el !== el && !o.el.contains(el) && !el.contains(o.el) && o.el.closest(":popover-open") === layer && (meetsBox(c, o.r) || (undersized(o.r) && Math.hypot(c.x - center(o.r).x, c.y - center(o.r).y) < 24)));
    if (!crowded) { if (out.spaced.length < 30) out.spaced.push(desc(el, r)); continue; }
    out.count++;
    if (out.items.length < 30) out.items.push(desc(el, r));
  }
  return out;
}

/** every image without alt, and every control without an accessible name (by the probe's reading of it) */
export function namesAndAlts(): { imgNoAlt: string[]; unnamed: string[] } {
  const name = (el: Element) =>
    (el.getAttribute("aria-label") ?? "").trim() ||
    (el.getAttribute("aria-labelledby") ? (el.getAttribute("aria-labelledby") ?? "").split(/\s+/).map((id) => document.getElementById(id)?.textContent ?? "").join(" ").trim() : "") ||
    (el.textContent ?? "").trim() ||
    (el.getAttribute("title") ?? "").trim() ||
    [...el.querySelectorAll("img[alt]")].map((i) => i.getAttribute("alt") ?? "").join(" ").trim();
  const d = (el: Element) => el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + (typeof el.className === "string" && el.className ? "." + el.className.split(" ")[0] : "") + (el.getAttribute("href") ? " -> " + el.getAttribute("href") : "");
  return {
    imgNoAlt: [...document.querySelectorAll("img:not([alt])")].map(d).slice(0, 20),
    unnamed: [...document.querySelectorAll("a[href], button, [role=button], summary")].filter((el) => !name(el)).map(d).slice(0, 20),
  };
}

/** remembers the animations running now, so a later call can list only the new ones */
export function markAnimations(): number {
  const w = window as unknown as { __e2eAnims?: WeakSet<Animation> };
  const all = document.getAnimations();
  w.__e2eAnims = new WeakSet(all);
  return all.length;
}

export type Anim = { kind: string; name: string; target: string; inDocks: boolean; inType: boolean; state: string };

/** the animations and transitions that started since markAnimations() */
export function newAnimations(): Anim[] {
  const seen = (window as unknown as { __e2eAnims?: WeakSet<Animation> }).__e2eAnims ?? new WeakSet<Animation>();
  return document.getAnimations().filter((a) => !seen.has(a)).map((a) => {
    const t = (a.effect as KeyframeEffect | null)?.target ?? null;
    const kind = a instanceof CSSAnimation ? "css-animation" : a instanceof CSSTransition ? "css-transition" : "web-animation";
    const name = a instanceof CSSAnimation ? a.animationName : a instanceof CSSTransition ? a.transitionProperty : a.id || "";
    const target = t ? t.tagName.toLowerCase() + (typeof t.className === "string" && t.className ? "." + t.className.trim().split(/\s+/).join(".") : "") : "?";
    return { kind, name, target, inDocks: !!t?.closest(".dock, .dock-popover, .dock-visualizer"), inType: !!t?.closest(".space, .stop-space, .intro"), state: a.playState };
  });
}

/** what the page recorded from its first moment (fixtures.ts, the harness init script) */
export type Recorded = {
  audio: { t: number; active: boolean | null; afterPress: boolean }[];
  webgl: number | null;
  /** audio worklet modules asked for, and when */
  worklets: { url: string; t: number }[];
  press: number | null;
  /** when begin's gate (.intro, button.begin) first appeared, and the "TURN IT UP" line */
  gate: number | null;
  loud: number | null;
};

/** samples the gate every 50 ms from the press on: the line's letters, its place under the button,
 *  the Hello's letters, and the docks. Needs window.__shownLetters (shownLetters, installed by the test) */
export function sampleGate(): void {
  type Sample = { t: number; line: number; lineText: string | null; lineTop: number | null; buttonBottom: number | null; hello: number; docks: number; intro: boolean };
  const w = window as unknown as { __shownLetters: (s: string) => number; __gate: { samples: Sample[]; t0: number } };
  const shown = w.__shownLetters;
  const g = (w.__gate = { samples: [] as Sample[], t0: performance.now() });
  let button: Element | null = null;
  const tick = () => {
    button = button ?? document.querySelector("button.begin");
    const line = document.querySelector(".begin-loud");
    g.samples.push({
      t: Math.round(performance.now() - g.t0),
      line: line ? shown(".begin-loud") : -1,
      lineText: line ? line.textContent : null,
      lineTop: line ? Math.round(line.getBoundingClientRect().top) : null,
      buttonBottom: button && button.isConnected ? Math.round(button.getBoundingClientRect().bottom) : null,
      hello: shown(".beat.welcome .subhead") + shown("#welcome"),
      docks: document.querySelectorAll(".dock").length,
      intro: !!document.querySelector(".intro"),
    });
    if (g.samples.length < 700) setTimeout(tick, 50);
  };
  tick();
}
export function recorded(): Recorded | null {
  return (window as unknown as { __e2e?: Recorded }).__e2e ?? null;
}
