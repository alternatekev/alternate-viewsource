"use client";

import { useEffect, useRef } from "react";
import { readDays } from "@/lib/usage";

// Mounted inside the usage figure, so the reading only starts once the strip has hydrated.
export default function UsageRead() {
  const at = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const fig = at.current?.closest<HTMLElement>("[data-usage]");
    return fig ? readDays(fig) : undefined;
  }, []);
  return <span ref={at} hidden />;
}
