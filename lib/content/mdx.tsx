import { evaluate } from "@mdx-js/mdx";
import type { ReactNode } from "react";
import * as runtime from "react/jsx-runtime";
import Cadence from "@/app/cadence";
import Telemetry from "@/app/telemetry";

// Tier markers an author can use inside a chapter. Every tier renders into the HTML, so the
// transcript is complete for search engines and screen readers; how much a device *shows*
// is a rendering decision made from these attributes, never a second copy of the text.
function Glance({ children }: { children: ReactNode }) {
  return <section data-tier="glance">{children}</section>;
}
function Inhabit({ children }: { children: ReactNode }) {
  return <section data-tier="inhabit">{children}</section>;
}

// Charts a chapter can place: drawn on the server from an object's rows, read without a script.
const components = { Glance, Inhabit, Cadence, Telemetry };

export async function renderChapterBody(source: string) {
  const { default: Body } = await evaluate(source, {
    ...runtime,
    baseUrl: import.meta.url,
    useMDXComponents: () => components,
  });
  return <Body />;
}
