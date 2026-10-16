// Going from one page to another without a reload: the docks, the field and the music stay, and
// the page that is leaving takes its words away first, by the one transition (type out, set out).
// A page registers how it leaves; the docks call leavePage() before they navigate.

const leaving = new Set<() => Promise<unknown>>();

/** how this page takes itself away; returns an unsubscribe */
export function onLeave(fn: () => Promise<unknown>) { leaving.add(fn); return () => { leaving.delete(fn); }; }

/** every part of the page leaves, together; resolves when it has gone */
export function leavePage() { return Promise.all([...leaving].map((fn) => fn().catch(() => {}))); }
