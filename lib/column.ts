// Phones read the site as a column: no zoom surface (Kevin, Oct 16), the docks fitted to a narrow
// screen. One test, so the surface and the docks always agree on what a phone is.
export const isColumn = () => typeof window !== "undefined" && matchMedia("(pointer: coarse) and (max-width: 767px)").matches;
/** read as a column, a part sets in as its top comes into view, a little above the bottom of the screen */
export const columnInView: IntersectionObserverInit = { rootMargin: "0px 0px -20% 0px" };
