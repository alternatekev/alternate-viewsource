"use client";

import { useEffect } from "react";
import { colophon } from "@/lib/colophon";

// Mounted inside the colophon, after its words, so it only touches them once they have hydrated.
export default function Reading() {
  useEffect(() => colophon().destroy, []);
  return null;
}
