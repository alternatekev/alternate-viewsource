// What the ambience popover controls besides sound: whether the field animates, and starting the
// composition over (a new shatter and a new key). The field and the instrument listen here.

let animating = true;
const motionFns = new Set<(on: boolean) => void>();
const resetFns = new Set<() => void>();

export const animationOn = () => animating;
export function setAnimation(on: boolean) { animating = on; motionFns.forEach((fn) => fn(on)); }
export function onAnimation(fn: (on: boolean) => void) { motionFns.add(fn); return () => { motionFns.delete(fn); }; }

export function resetComposition() { resetFns.forEach((fn) => fn()); }
export function onReset(fn: () => void) { resetFns.add(fn); return () => { resetFns.delete(fn); }; }
