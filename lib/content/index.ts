import matter from "gray-matter";
import { cacheLife, cacheTag } from "next/cache";
import { contentSource } from "./source";
import { Chapter, ChapterMeta, Colophon, Design, UsageDay, Milestone, Phase, PHASE_KEYS, Writing, type PhaseKey } from "./schema";

// Readers. In production every reader is cached under the "content" tag and lives until
// /api/revalidate is hit; in development they read the files on every request so an edit
// shows on the next reload.

async function readJson<T>(file: string, parse: (x: unknown) => T): Promise<T[]> {
  const text = await contentSource().read(file);
  const raw = JSON.parse(text) as unknown[];
  return raw.map(parse);
}

async function readPhases() {
  return readJson("spine/phases.json", (x) => Phase.parse(x));
}
async function readMilestones() {
  const rows = await readJson("spine/milestones.json", (x) => Milestone.parse(x));
  return rows.sort((a, b) => a.date.localeCompare(b.date));
}
async function readDesigns() {
  const rows = await readJson("spine/designs.json", (x) => Design.parse(x));
  return rows.sort((a, b) => a.start.localeCompare(b.start));
}
async function readUsage() {
  const rows = await readJson("spine/usage.json", (x) => UsageDay.parse(x));
  return rows.sort((a, b) => a.day.localeCompare(b.day));
}
// The old posts' pictures load as they come near and decode off the main thread, so the page's
// first load carries none of them. An image that already says how it loads keeps that.
const lazyImages = (html: string) =>
  html.replace(/<img\b[^>]*>/g, (tag) => {
    let out = tag.replace(/\s*\/?>$/, "");
    if (!/\sloading=/.test(out)) out += ' loading="lazy"';
    if (!/\sdecoding=/.test(out)) out += ' decoding="async"';
    return out + (tag.endsWith("/>") ? " />" : ">");
  });

async function readWriting() {
  const rows = [...await readJson("writing/posts.json", (x) => Writing.parse(x)), ...await readJson("writing/work.json", (x) => Writing.parse(x)), ...await readJson("writing/old.json", (x) => Writing.parse(x))];
  return rows.map((w) => ({ ...w, html: lazyImages(w.html) })).sort((a, b) => a.date.localeCompare(b.date));
}
async function readColophon() {
  return Colophon.parse(JSON.parse(await contentSource().read("colophon.json")));
}
async function readChapters(): Promise<Chapter[]> {
  const src = contentSource();
  const files = (await src.list("story")).filter((f) => f.endsWith(".mdx") && !f.split("/").pop()!.startsWith("_"));
  const chapters = await Promise.all(
    files.map(async (file) => {
      const text = await src.read(file);
      const { data, content } = matter(text);
      const meta = ChapterMeta.parse(data);
      const [phaseDir, name] = file.replace(/^story\//, "").split("/");
      if (phaseDir !== meta.phase) throw new Error(`${file}: folder "${phaseDir}" and phase "${meta.phase}" disagree`);
      return { ...meta, slug: name.replace(/\.mdx$/, ""), body: content, path: file };
    }),
  );
  return chapters.sort((a, b) => a.start.localeCompare(b.start) || a.order - b.order);
}

async function cachedPhases() {
  "use cache";
  cacheTag("content");
  cacheLife("max");
  return readPhases();
}
async function cachedMilestones() {
  "use cache";
  cacheTag("content");
  cacheLife("max");
  return readMilestones();
}
async function cachedDesigns() {
  "use cache";
  cacheTag("content");
  cacheLife("max");
  return readDesigns();
}
async function cachedWriting() {
  "use cache";
  cacheTag("content");
  cacheLife("max");
  return readWriting();
}
async function cachedColophon() {
  "use cache";
  cacheTag("content");
  cacheLife("max");
  return readColophon();
}
async function cachedChapters() {
  "use cache";
  cacheTag("content");
  cacheLife("max");
  return readChapters();
}

// Cached in development too: Cache Components refuses uncached reads outside Suspense.
// The dev server drops the cache when these files change.
async function cachedUsage() {
  "use cache";
  cacheTag("content");
  cacheLife("max");
  return readUsage();
}


// An object's rows (content/objects/<id>/rows.json): the numbers a chart draws, read like the rest.
async function readObjectRows(id: string): Promise<unknown> {
  if (!/^[a-z0-9-]+$/.test(id)) throw new Error(`object id ${id}`);
  return JSON.parse(await contentSource().read(`objects/${id}/rows.json`)) as unknown;
}
async function cachedObjectRows(id: string) {
  "use cache";
  cacheTag("content");
  cacheLife("max");
  return readObjectRows(id);
}

export const getObjectRows = cachedObjectRows;
export const getPhases = cachedPhases;
export const getMilestones = cachedMilestones;
export const getDesigns = cachedDesigns;
export const getChapters = cachedChapters;
export const getWriting = cachedWriting;
export const getUsage = cachedUsage;
export const getColophon = cachedColophon;

export async function getChapter(phase: string, slug: string): Promise<Chapter | undefined> {
  if (!(PHASE_KEYS as readonly string[]).includes(phase)) return undefined;
  const all = await getChapters();
  return all.find((c) => c.phase === (phase as PhaseKey) && c.slug === slug);
}

// What production shows: only chapters that are Kevin's to publish or have been cleared.
export function publishable(c: Chapter) {
  return c.clearance !== "review";
}
