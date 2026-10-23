import { evaluate } from "@mdx-js/mdx";
import type { ComponentProps, ReactNode } from "react";
import * as runtime from "react/jsx-runtime";
import BuildCadence from "@/app/build-cadence";
import Cadence from "@/app/cadence";
import Lineage from "@/app/lineage";
import Telemetry from "@/app/telemetry";
import { checksInMdx } from "./checks";
import { imageSize } from "./images";

// Tier markers an author can use inside a chapter. Every tier renders into the HTML, so the
// transcript is complete for search engines and screen readers; how much a device *shows*
// is a rendering decision made from these attributes, never a second copy of the text.
function Glance({ children }: { children: ReactNode }) {
  return <section data-tier="glance">{children}</section>;
}
function Inhabit({ children }: { children: ReactNode }) {
  return <section data-tier="inhabit">{children}</section>;
}

// A chapter's figure, as every picture in the words (lib/content/images.ts): its size, lazy, decoded
// off the main thread. (Without loading="lazy" React also preloads it from <head>, on every visit.)
function Img({ src, alt = "" }: ComponentProps<"img">) {
  if (typeof src !== "string") return null;
  const size = imageSize(src);
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} width={size?.width} height={size?.height} loading="lazy" decoding="async" />;
}

// Charts a chapter can place: drawn on the server from an object's rows, read without a script.
const components = { Glance, Inhabit, Cadence, Telemetry, BuildCadence, Lineage, img: Img };

export async function renderChapterBody(source: string) {
  // the editorial markers ([check: …], [needs Kevin: …]) leave a production build here, and show highlighted in development
  const { default: Body } = await evaluate(checksInMdx(source), {
    ...runtime,
    baseUrl: import.meta.url,
    useMDXComponents: () => components,
  });
  return <Body />;
}
