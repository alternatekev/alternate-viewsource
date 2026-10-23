// Type in, type out: the one transition pattern for everything that isn't the ambient layer.
// Words arrive letter by letter and leave the same way, at the logotype's speeds; boxes and lines
// (a dock's frame, the popover, the visualizer) are revealed and withdrawn in the same steps, like a
// line of type being set. Nothing appears, disappears or changes at once.
// A piece that answers a press directly (the popover) runs it quicker: `pace` scales the timings.
// With reduced motion, everything is simply there or not.

import { dock } from "@/tokens/dock";

const T = dock.typing;
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
// what is typing where: a newer retype of the same node takes over, and the older one resolves.
// One clock drives every word: each waits for its next step, and all the steps that fall due
// together run together, so a page of words typing costs one timer, not one per word
type Job = { due: number; step: () => void; done: () => void };
const running = new Map<Node, Job>();
let clock = 0, clockAt = Infinity;
function tick() {
  clock = 0; clockAt = Infinity;
  const now = performance.now();
  // one word going wrong never stops the others
  for (const [node, job] of [...running]) if (job.due <= now + 2) { running.delete(node); try { job.step(); } catch (err) { console.error(err); job.done(); } }
  arm();
}
function arm() {
  let next = Infinity;
  for (const job of running.values()) next = Math.min(next, job.due);
  if (next === Infinity || next >= clockAt) return;
  clearTimeout(clock); clockAt = next;
  clock = window.setTimeout(tick, Math.max(0, next - performance.now()));
}
/** the next step for this node, ms from now */
function later(node: Node, ms: number, step: () => void, done: () => void) {
  const due = performance.now() + ms;
  running.set(node, { due, step, done });
  if (due < clockAt) { clearTimeout(clock); clockAt = due; clock = window.setTimeout(tick, ms); }
}
/** a newer typing of this node takes over: the older one stops where it is and resolves */
function supersede(node: Node) { const prev = running.get(node); if (prev) { running.delete(node); prev.done(); } }
// what each word is meant to say, so it can type back in after it has been erased
const full = new WeakMap<Text, string>();
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** retypes one text node or element: erases back to what it shares with `to`, then types the rest */
export function retype(node: Node, to: string, pace = 1): Promise<void> {
  supersede(node);
  if (to && node instanceof Text) full.set(node, to);
  if (reduced()) { node.textContent = to; return Promise.resolve(); }
  return new Promise((done) => {
    const step = () => {
      const now = node.textContent ?? "";
      let ms = 0;
      if (now.length && !to.startsWith(now)) { node.textContent = now.slice(0, -1); ms = T.eraseMs; }
      else if (now.length < to.length) { node.textContent = to.slice(0, now.length + 1); ms = T.charMs; }
      else { done(); return; }
      later(node, ms * pace, step, done);
    };
    step();
  });
}

const texts = (root: Node) => {
  const out: Text[] = [], w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    // the logotype runs itself, and hidden sizers hold widths; neither is typed from outside.
    // An erased word is still a word: it is empty now but knows what it says
    if (n.parentElement?.closest("[data-type-self]")) continue;
    if (!(n.textContent ?? "").trim() && !full.has(n as Text)) continue;
    out.push(n as Text);
  }
  return out;
};

// A word typing in or out keeps its whole shape on the page: the whole word is always there, and
// the letters not yet typed (or already erased) are painted transparent with the CSS Custom
// Highlight API. The text node is never split, so kerning, ligatures and line breaks stay exactly
// where they will be at the end, and nothing moves while it types. Without that API, the untyped
// letters sit beside the word in an invisible span instead, which is close but can shift a pixel.
type Hidden = { range: Range; ghost?: HTMLElement };
const hidden = new WeakMap<Text, Hidden>();
const canHighlight = typeof CSS !== "undefined" && "highlights" in CSS && typeof Highlight !== "undefined";
let untyped: Highlight | null = null;
function hide(t: Text, from: number) {
  let h = hidden.get(t);
  if (canHighlight) {
    if (!untyped) { untyped = new Highlight(); CSS.highlights.set("untyped", untyped); }
    if (!h) { h = { range: new Range() }; hidden.set(t, h); untyped.add(h.range); }
    // something else may have changed the word's text meanwhile (a retype): never reach past it
    const end = (t.textContent ?? "").length;
    h.range.setStart(t, Math.min(from, end)); h.range.setEnd(t, end);
    return;
  }
  // fallback: the untyped letters move into an invisible span after the word
  if (!h || !h.ghost?.isConnected) {
    const g = document.createElement("span");
    g.className = "type-ghost"; g.dataset.typeSelf = ""; g.setAttribute("aria-hidden", "true");
    t.after(g); h = { range: new Range(), ghost: g }; hidden.set(t, h);
  }
  const word = full.get(t) ?? "";
  t.textContent = word.slice(0, from); h.ghost!.textContent = word.slice(from);
}
function reveal(t: Text) {
  const h = hidden.get(t);
  if (!h) return;
  if (h.ghost) { t.textContent = full.get(t) ?? t.textContent; h.ghost.remove(); }
  else untyped?.delete(h.range);
  hidden.delete(t);
}
// how many letters of a word are showing, whichever way it is hidden
const shownOf = (t: Text) => {
  const h = hidden.get(t);
  if (!h) return (t.textContent ?? "").length;
  return h.ghost ? (t.textContent ?? "").length : h.range.startOffset;
};

function ghostType(t: Text, word: string, typeIn: boolean, pace: number): Promise<void> {
  supersede(t);
  full.set(t, word);
  if (reduced()) { if (typeIn) reveal(t); else hide(t, 0); return Promise.resolve(); }
  // the whole word is always in the node (or, in the fallback, split across node and ghost)
  const showing = Math.min(shownOf(t), word.length);
  if (!hidden.get(t)?.ghost && t.textContent !== word) t.textContent = word;
  hide(t, showing);
  return new Promise((done) => {
    const step = () => {
      // a retype elsewhere has taken this word over: leave it to that
      if (!hidden.get(t)?.ghost && t.textContent !== word) { reveal(t); done(); return; }
      const n = shownOf(t), want = typeIn ? word.length : 0;
      if (n === want) {
        if (typeIn) reveal(t); // all there: nothing left to hide
        done(); return; // erased: still hidden in place, holding its shape until the piece goes
      }
      // a long run of text keeps the same overall time as a short one: past T.longChars it takes
      // several letters a step, so a whole paragraph types in about as long as a name does
      const per = (n < want ? T.charMs : T.eraseMs) * pace, size = Math.max(1, Math.ceil(word.length / T.longChars));
      hide(t, n < want ? Math.min(want, n + size) : Math.max(want, n - size));
      later(t, per, step, done);
    };
    step();
  });
}

/** every word under root types in, all at once, each from empty, without moving anything around it */
export function typeIn(root: Node, pace = 1) {
  return Promise.all(texts(root).map((t) => {
    const word = full.get(t) ?? t.textContent ?? "";
    if (!running.has(t) && !hidden.has(t)) hide((full.set(t, word), t), 0); // a fresh arrival starts with nothing showing
    return ghostType(t, word, true, pace);
  }));
}
/** every word under root erases in place; it can type back in later */
export function typeOut(root: Node, pace = 1) {
  return Promise.all(texts(root).map((t) => ghostType(t, full.get(t) ?? t.textContent ?? "", false, pace)));
}

/** a box sets in like a line of type, left to right in steps at typing speed (CSS: [data-set]) */
export function setIn(el: HTMLElement, pace = 1) { el.style.setProperty("--type-pace", String(pace)); el.dataset.set = "in"; }
/** and withdraws the same way, at erasing speed; resolves when it is gone */
export async function setOut(el: HTMLElement, pace = 1) {
  el.style.setProperty("--type-pace", String(pace));
  el.dataset.set = "out";
  if (!reduced()) await wait(T.eraseMs * T.revealSteps * pace);
}

/** a whole piece arriving: its box sets in and its words type in */
export function arrive(el: HTMLElement, pace = 1) { setIn(el, pace); return typeIn(el, pace); }
/** a whole piece leaving: its words erase and its box withdraws */
export function leave(el: HTMLElement, pace = 1) { return Promise.all([typeOut(el, pace), setOut(el, pace)]); }

/** a piece put back as it was before it ever came in: every word whole, every box unset, at once.
 *  Only for a page out of sight, kept hidden between visits, so it can come in again by the one transition */
export function unset(root: HTMLElement) {
  for (const t of texts(root)) { supersede(t); reveal(t); }
  for (const el of [root, ...root.querySelectorAll<HTMLElement>("[data-set]")]) { delete el.dataset.set; el.style.removeProperty("--type-pace"); }
}
