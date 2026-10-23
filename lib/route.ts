// Going from one page to another without a reload: the docks, the field and the music stay, and
// the page that is leaving takes its words away first, by the one transition (type out, set out).
// A page registers how it leaves; the docks call leavePage() before they navigate.
//
// Links are journeys, on every page and between them (cohesion branch). A link to somewhere on the
// same page is the page's own to take (the surface journeys to a phase or a piece, the work page to
// a year or a piece of work). A link to another page goes through the docks, which register go()
// here: the page leaves, the next one comes in, and the thing the link named is left here, pending,
// for that page to pick up when it mounts and journey to. So a piece on the timeline can send you
// down into a year on the work page, and a year can send you back up into a piece, and neither one
// asks for begin again.

const leaving = new Set<() => Promise<unknown>>();

/** how this page takes itself away; returns an unsubscribe */
export function onLeave(fn: () => Promise<unknown>) { leaving.add(fn); return () => { leaving.delete(fn); }; }

/** every part of the page leaves, together; resolves when it has gone */
export function leavePage() { return Promise.all([...leaving].map((fn) => fn().catch(() => {}))); }

// where to arrive on the page that comes next: the page that mounts takes it, once
let pending = "";
export function setPending(id: string) { pending = id; }
export function takePending() { const id = pending; pending = ""; return id; }

// the docks register how to go to another page; a link anywhere on the site asks here
type Go = (path: string, hash: string) => void;
let go: Go | null = null;
export function registerGo(fn: Go) { go = fn; return () => { if (go === fn) go = null; }; }

/** the page a link points at and the thing on it, for a link into this site; null for anything else */
export function parseLink(href: string): { path: string; hash: string } | null {
  if (!href) return null;
  if (href.startsWith("#")) return { path: location.pathname, hash: href.slice(1) };
  if (!href.startsWith("/") || href.startsWith("//")) return null;
  const [path, hash = ""] = href.split("#");
  return { path: path.replace(/\/+$/, "") || "/", hash };
}

/** asks the page for a journey to one of its own ids; the page answers by taking it */
export const EVENT_GO = "viewsource:go";
export function goHere(hash: string) { dispatchEvent(new CustomEvent(EVENT_GO, { detail: hash })); }

/** go to another page, and to something on it; false when no one has registered how */
export function goTo(path: string, hash = "") {
  if (!go) return false;
  go(path, hash);
  return true;
}
