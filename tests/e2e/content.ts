import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { ChapterMeta, Phase, Writing } from "../../lib/content/schema";

// What the site should publish, read straight from content/ in Node (lib/content's readers are
// Next's cached functions and only run inside Next). The rules are the site's own: a chapter shows
// when it's publishable (not under review, lib/content publishable()) and has words (not a stub,
// app/chapters.tsx toldChapters()); a piece of writing shows on the timeline when it has words, isn't
// music, and falls in a phase (app/page.tsx), and work with words shows on the work page too.

const root = path.join(__dirname, "..", "..", "content");
const json = (file: string) => JSON.parse(readFileSync(path.join(root, file), "utf8")) as unknown[];

/** a piece the site publishes: a chapter, or writing (an essay, a piece of work, an old blog post),
 *  the phase it sits in on the timeline (none when it's only on the work page), and its addresses */
export type Piece = { key: string; title: string; kind: "chapter" | "essay" | "work" | "post"; phase: string | null; anchors: string[] };
export type ChapterText = { slug: string; title: string; chunks: string[] };

function chapters() {
  const out: { slug: string; meta: ReturnType<typeof ChapterMeta.parse>; body: string }[] = [];
  for (const phase of readdirSync(path.join(root, "story"))) {
    const dir = path.join(root, "story", phase);
    if (!/^[a-z]+$/.test(phase)) continue;
    for (const file of readdirSync(dir)) {
      if (!file.endsWith(".mdx") || file.startsWith("_")) continue;
      const { data, content } = matter(readFileSync(path.join(dir, file), "utf8"));
      out.push({ slug: file.replace(/\.mdx$/, ""), meta: ChapterMeta.parse(data), body: content });
    }
  }
  return out.filter((c) => c.meta.clearance !== "review" && c.meta.status !== "stub");
}

/** every piece the site should publish, with the addresses it can be reached at (/#piece-…, /work#work-…) */
export function publishablePieces(): Piece[] {
  const phases = json("spine/phases.json").map((x) => Phase.parse(x));
  const writing = [...json("writing/posts.json"), ...json("writing/work.json"), ...json("writing/old.json")].map((x) => Writing.parse(x));
  const pieces: Piece[] = chapters().map((c) => ({ key: `chapter-${c.slug}`, title: c.meta.title, kind: "chapter", phase: c.meta.phase, anchors: [`/#piece-chapter-${c.slug}`] }));
  for (const w of writing) {
    if (!w.html || w.kind === "music" || w.kind === "album") continue; // music lives somewhere of its own (app/page.tsx)
    const phase = phases.find((p) => w.date >= p.start && w.date <= p.end)?.key ?? null;
    const anchors: string[] = [];
    if (phase) anchors.push(`/#piece-${w.key}`);
    if (w.kind === "work") anchors.push(`/work#work-${w.key}`);
    if (anchors.length) pieces.push({ key: w.key, title: w.title, kind: w.kind, phase, anchors });
  }
  return pieces;
}

/** the phase keys, for #phase-… */
export function phaseKeys() {
  return json("spine/phases.json").map((x) => Phase.parse(x).key);
}

/** squeezes text to what a reader sees, so source and page compare: one space, straight quotes */
export const plain = (s: string) => s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/ /g, " ").replace(/\s+/g, " ").trim();

/** every publishable chapter's words, as the start and the end of each paragraph, in plain text.
 *  Editorial markers ([check: …], [needs Kevin: …]) are Kevin's notes, not words the page shows */
export function chapterTexts(): ChapterText[] {
  return chapters().map((c) => {
    const chunks: string[] = [];
    for (const block of c.body.split(/\n\s*\n/)) {
      // a line that is only a component's tag (<Glance>, </Inhabit>, <Cadence … />) carries no words
      const lines = block.split("\n").filter((l) => !/^\s*<\/?[A-Za-z][^>]*>\s*$/.test(l)).map((l) => l.replace(/^\s*(?:[-*]|\d+\.)\s+/, "").replace(/^\s*>\s?/, ""));
      let text = lines.join(" ").trim();
      if (!text || text.startsWith("<") || /^!\[/.test(text) || /^(import|export) /.test(text)) continue;
      text = text
        // a marker goes with the space before it, so its sentence closes up; one may hold a check of its own
        .replace(/[ \t]?\[(?:check|needs Kevin):(?:[^[\]]|\[[^\]]*\])*\]/g, "")
        .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
        .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
        .replace(/`([^`]*)`/g, "$1")
        .replace(/\*\*([^*]+)\*\*/g, "$1")
        .replace(/(^|[^\w*])\*([^*\n]+)\*/g, "$1$2")
        .replace(/(^|\W)_([^_\n]+)_/g, "$1$2")
        .replace(/^#+\s+/, "")
        .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ");
      text = plain(text);
      if (text.length < 24) continue;
      chunks.push(text.slice(0, 40).trim(), text.slice(-40).trim());
    }
    return { slug: c.slug, title: c.meta.title, chunks: [...new Set(chunks)] };
  });
}
