import matter from "gray-matter";
import { cacheLife, cacheTag } from "next/cache";
import { contentSource } from "./source";
import { Chapter, ChapterMeta, Design, Milestone, Phase, PHASE_KEYS, type PhaseKey } from "./schema";

// Readers. In production every reader is cached under the "content" tag and lives until
// /api/revalidate is hit; in development they read the files on every request so an edit
// shows on the next reload.

const dev = process.env.NODE_ENV === "development";

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
async function cachedChapters() {
  "use cache";
  cacheTag("content");
  cacheLife("max");
  return readChapters();
}

export const getPhases = dev ? readPhases : cachedPhases;
export const getMilestones = dev ? readMilestones : cachedMilestones;
export const getDesigns = dev ? readDesigns : cachedDesigns;
export const getChapters = dev ? readChapters : cachedChapters;

export async function getChapter(phase: string, slug: string): Promise<Chapter | undefined> {
  if (!(PHASE_KEYS as readonly string[]).includes(phase)) return undefined;
  const all = await getChapters();
  return all.find((c) => c.phase === (phase as PhaseKey) && c.slug === slug);
}

// What production shows: only chapters that are Kevin's to publish or have been cleared.
export function publishable(c: Chapter) {
  return c.clearance !== "review";
}
