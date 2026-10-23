import matter from "gray-matter";
import { cacheLife, cacheTag } from "next/cache";
import { checksInHtml, checksInText } from "./checks";
import { imageAttrs } from "./images";
import { contentSource } from "./source";
import { Chapter, ChapterMeta, Colophon, Design, UsageDay, Milestone, Phase, PHASE_KEYS, Writing, type PhaseKey } from "./schema";

// Readers. In production every reader is cached under the "content" tag and lives until
// /api/revalidate is hit; in development they read the files on every request so an edit
// shows on the next reload. Whatever a reader hands a page has its editorial markers taken out
// (lib/content/checks.ts) and its pictures sized and lazy (lib/content/images.ts).

async function readJson<T>(file: string, parse: (x: unknown) => T): Promise<T[]> {
  const text = await contentSource().read(file);
  const raw = JSON.parse(text) as unknown[];
  return raw.map(parse);
}

async function readPhases() {
  const rows = await readJson("spine/phases.json", (x) => Phase.parse(x));
  return rows.map((p) => ({ ...p, web: checksInText(p.web), intro: { ...p.intro, html: checksInHtml(p.intro.html) } }));
}
async function readMilestones() {
  const rows = await readJson("spine/milestones.json", (x) => Milestone.parse(x));
  return rows.map((m) => ({ ...m, label: checksInText(m.label) })).sort((a, b) => a.date.localeCompare(b.date));
}
async function readDesigns() {
  const rows = await readJson("spine/designs.json", (x) => Design.parse(x));
  return rows.map((d) => ({ ...d, name: checksInText(d.name), tagline: d.tagline && checksInText(d.tagline), stack: checksInText(d.stack) })).sort((a, b) => a.start.localeCompare(b.start));
}
async function readUsage() {
  const rows = await readJson("spine/usage.json", (x) => UsageDay.parse(x));
  return rows.sort((a, b) => a.day.localeCompare(b.day));
}
// The old posts' pictures load as they come near and decode off the main thread, and say their size
async function readWriting() {
  const rows = [...await readJson("writing/posts.json", (x) => Writing.parse(x)), ...await readJson("writing/work.json", (x) => Writing.parse(x)), ...await readJson("writing/old.json", (x) => Writing.parse(x))];
  return rows.map((w) => ({ ...w, title: checksInText(w.title), html: checksInHtml(imageAttrs(w.html)) })).sort((a, b) => a.date.localeCompare(b.date));
}
async function readColophon() {
  const c = Colophon.parse(JSON.parse(await contentSource().read("colophon.json")));
  return { ...c, sections: c.sections.map((sec) => ({ ...sec, heading: checksInText(sec.heading), html: checksInHtml(sec.html) })) };
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
      // the body's markers go in the MDX pipeline (lib/content/mdx.tsx); the lines a page shows go here
      return { ...meta, title: checksInText(meta.title), summary: checksInText(meta.summary), slug: name.replace(/\.mdx$/, ""), body: content, path: file };
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
