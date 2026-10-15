"use client";

import { useEffect } from "react";
import { surface } from "@/lib/surface";

// Mounted inside the page, after the beats, so the surface only touches them once they have hydrated.
export default function Surface() {
  useEffect(() => surface().destroy, []);
  return null;
}
