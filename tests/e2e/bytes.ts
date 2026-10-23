import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { brotliCompressSync, constants } from "node:zlib";
import { BROTLI_QUALITY } from "./budgets";

/** a body's weight as the budgets count it: brotli at its best (budgets.ts), whatever the server sent */
export function brotli(body: Buffer) {
  return brotliCompressSync(body, { params: { [constants.BROTLI_PARAM_QUALITY]: BROTLI_QUALITY } }).length;
}

export type Classified = { framework: number; app: number; how: "modules" | "manifest" | "unknown" };

// Framework or this app's own code, by the chunk's modules. Turbopack writes a chunk as
// TURBOPACK.push([script, id, factory, id, factory, …]). This app's TypeScript compiles to ES module
// factories (one parameter: `e => { … e.s([...exports]) }`); the CommonJS packages the framework ships
// (react, react-dom, scheduler, next/dist) compile to CommonJS factories (`(e, t, r) => { … }`). The
// Turbopack runtime itself (no push, TURBOPACK_ASSET_SUFFIX) is framework. Measured on the Oct 18 build:
// every chunk was wholly one or the other. Anything else falls back to the local build manifest's
// rootMainFiles when there is one, and otherwise counts as the app's, so an unknown never hides bytes.
export function classify(url: string, source: string): Classified {
  if (source.includes("TURBOPACK_ASSET_SUFFIX") && !/\.push\(\[/.test(source.slice(0, 200))) return { framework: source.length, app: 0, how: "modules" };
  const pushed: unknown[][] = [];
  const sandbox: Record<string, unknown> = { TURBOPACK: { push: (x: unknown[]) => pushed.push(x) }, document: undefined };
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;
  try {
    vm.runInNewContext(source, sandbox, { timeout: 2000 });
  } catch {
    // a chunk that does more than push its modules isn't one this reads
  }
  const factories: ((...a: unknown[]) => unknown)[] = [];
  // [script, id, factory, …], or [script, [id, factory, …], id, factory, …]: every factory, at either level
  const collect = (xs: unknown[]) => { for (const x of xs) if (typeof x === "function") factories.push(x as (...a: unknown[]) => unknown); else if (Array.isArray(x)) collect(x); };
  for (const p of pushed) collect(p.slice(1));
  if (factories.length) {
    let framework = 0, app = 0;
    for (const f of factories) { const n = f.toString().length; if (f.length === 1) app += n; else framework += n; }
    const total = framework + app || 1;
    // the chunk's own bytes, split in proportion
    return { framework: Math.round((source.length * framework) / total), app: Math.round((source.length * app) / total), how: "modules" };
  }
  const manifest = path.join(__dirname, "..", "..", ".next", "build-manifest.json");
  if (existsSync(manifest)) {
    const m = JSON.parse(readFileSync(manifest, "utf8")) as { rootMainFiles?: string[]; polyfillFiles?: string[] };
    const file = new URL(url).pathname.replace(/^\/_next\//, "");
    if ([...(m.rootMainFiles ?? []), ...(m.polyfillFiles ?? [])].includes(file)) return { framework: source.length, app: 0, how: "manifest" };
  }
  return { framework: 0, app: source.length, how: "unknown" };
}

/** the field's chunk (lib/air/field.ts) and the instrument's (lib/sound/instrument.ts), by what's in them */
export const isField = (source: string) => source.includes("WEBGL_lose_context");
export const isInstrument = (source: string) => source.includes("no-worklet");
export const isWorklet = (url: string) => /\/sound\/pedals\.js(\?|$)/.test(url);
