"use client";

import { useEffect } from "react";
import { work } from "@/lib/work";

// Mounted inside the work page, after the years, so the corridor only touches them once they have hydrated.
export default function Corridor() {
  useEffect(() => work().destroy, []);
  return null;
}
