"use client";

import { useLayoutEffect } from "react";
import { work } from "@/lib/work";

// Mounted inside the work page, after the years, so the corridor only touches them once they have hydrated.
// A layout effect, not an effect: arriving from another page, the years are in the document the moment
// the page commits, and an effect runs after that first paint, so for one frame they would show whole
// (html[data-work] is what hides them until they set in). Layout effects run before the paint.
export default function Corridor() {
  useLayoutEffect(() => work().destroy, []);
  return null;
}
