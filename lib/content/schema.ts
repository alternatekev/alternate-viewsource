import { z } from "zod";

// The content model. Every file under content/ is validated against these at build
// (scripts/validate-content.ts) and again when it is read, so a bad file fails loudly, early.

export const PHASE_KEYS = ["dialup", "broadband", "apps", "components", "agents"] as const;
export type PhaseKey = (typeof PHASE_KEYS)[number];

// YAML parses a bare 2008-08-06 as a Date; accept both and keep the string form.
const isoDate = z.preprocess(
  (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD"),
);

export const Source = z.object({
  label: z.string().min(1),
  url: z.string().url().optional(),
  // "firsthand" when there is no document yet: my own account. The site shows no label for it.
  note: z.string().optional(),
});
export type Source = z.infer<typeof Source>;

// Where the chapter sits in the mood space the field and the instrument read.
// valence: -1 (dark) .. 1 (bright); arousal: 0 (still) .. 1 (charged); x, y: a point in the frame, -0.5 .. 0.5.
export const Mood = z.object({
  valence: z.number().min(-1).max(1),
  arousal: z.number().min(0).max(1),
  x: z.number().min(-0.5).max(0.5).default(0),
  y: z.number().min(-0.5).max(0.5).default(0),
});
export type Mood = z.infer<typeof Mood>;

export const Phase = z.object({
  key: z.enum(PHASE_KEYS),
  name: z.string(),
  start: isoDate,
  end: isoDate,
  // What changed on the web in this phase, in one line.
  web: z.string(),
  // The event that opens the phase, when there is one hinge rather than a slow edge.
  opens: z.object({ event: z.string(), date: isoDate, source: Source.optional() }).nullable(),
  // the phase's point in the mood space, read by the field while the phase is in view
  mood: Mood,
  // a paragraph under the phase's name, in my words: drafted from what I published (each link goes to
  // the piece it came from), stub until there are words, draft until I've read it, told after
  intro: z.object({ status: z.enum(["stub", "draft", "told"]), html: z.string() }).default({ status: "stub", html: "" }),
});
export type Phase = z.infer<typeof Phase>;

export const Milestone = z.object({
  key: z.string().regex(/^[a-z0-9-]+$/),
  date: isoDate,
  // true when the day or month is a placeholder for a year or season that is known
  approximate: z.boolean().default(false),
  label: z.string(),
  phase: z.enum(PHASE_KEYS),
  // true when a milestone sits in its phase by what the work was about, not by its date: my Cisco
  // design-system years run past the Design systems phase, and belong in it (Kevin, Oct 16)
  byTheme: z.boolean().optional(),
  // agents: where the work happened, at Cisco or at home; the phase sets the two apart (Kevin, Oct 16)
  where: z.enum(["cisco", "home"]).optional(),
  sources: z.array(Source).default([]),
});
export type Milestone = z.infer<typeof Milestone>;

export const Design = z.object({
  key: z.string().regex(/^[a-z0-9-]+$/),
  // first seen, as "YYYY-MM-DD"; approximate when the capture is later than the launch
  start: isoDate,
  approximate: z.boolean().default(false),
  name: z.string(),
  tagline: z.string().optional(),
  stack: z.string(),
  snapshot: z.object({ url: z.string().url(), captured: isoDate, note: z.string().optional() }),
});
export type Design = z.infer<typeof Design>;

// My use of agents, a day at a time: how many replies Claude Code gave me each day, by model family,
// counted from my own session transcripts (Oct 16, 2026). Replies, not tokens; days with none are absent.
const count = z.number().int().min(0);
export const UsageDay = z.object({ day: isoDate, opus: count, fable: count, sonnet: count, haiku: count });
export type UsageDay = z.infer<typeof UsageDay>;


export const ChapterMeta = z.object({
  title: z.string().min(1),
  phase: z.enum(PHASE_KEYS),
  order: z.number().int().nonnegative(),
  start: isoDate,
  end: isoDate.optional(),
  // The glance line: what a phone shows between meetings. One sentence.
  summary: z.string().min(1).max(240),
  // stub: a labeled placeholder · draft: words on the page · told: Kevin has read or heard it
  status: z.enum(["stub", "draft", "told"]).default("stub"),
  // own: Kevin's to publish · review: needs an external review before it is public · cleared: reviewed
  clearance: z.enum(["own", "review", "cleared"]).default("own"),
  // agents: where the work happened, at Cisco or at home, as for a milestone (Kevin, Oct 16)
  where: z.enum(["cisco", "home"]).optional(),
  mood: Mood,
  sources: z.array(Source).default([]),
  // ids under content/objects this chapter places
  objects: z.array(z.string()).default([]),
  // the milestones this chapter tells (keys in spine/milestones.json): the timeline's notes and the
  // work page's years link to the chapter from each, and the chapter links to its years on the work page
  milestones: z.array(z.string().regex(/^[a-z0-9-]+$/)).default([]),
  // other pieces this one goes with, by id without the piece- prefix (chapter-<slug>, or a writing
  // key): the chapter ends with links to them, and following one is a journey (lib/surface.ts)
  related: z.array(z.string().regex(/^[a-z0-9-]+$/)).default([]),
  // set when a recording exists: the audio lives outside the repo, the word timings inside it
  voice: z
    .object({ audio: z.string().url(), alignment: z.string() })
    .optional(),
});
export type ChapterMeta = z.infer<typeof ChapterMeta>;

export type Chapter = ChapterMeta & { slug: string; body: string; path: string };

// Writing I published before this site, brought in whole (cleared by me piece by piece), with the
// place it first appeared as its source. html is cleaned: no scripts, no embeds, images local.
// Portfolio work and albums from my old site come in the same way (kind work, album): org is who it
// was for or with, end when it ended, approximate when the date is read from the text. A portfolio
// entry that was only ever a name in a list has no words (html is empty). Posts from the old
// alternate.org blog (2000–2011) come in as kind post, or music when they were about music
export const Writing = z.object({
  key: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  date: isoDate,
  end: isoDate.optional(),
  approximate: z.boolean().optional(),
  kind: z.enum(["essay", "post", "music", "work", "album"]),
  org: z.string().min(1).optional(),
  source: z.object({ label: z.string().min(1), url: z.string().url() }),
  html: z.string(),
});
export type Writing = z.infer<typeof Writing>;

// The colophon's "how this site is made": headed groups of short paragraphs in my words, about this
// version of the site. html is paragraphs, lists, links, emphasis and code only; every link into
// this repo must point at a file that exists (scripts/validate-content.ts). Status as for a chapter.
export const Colophon = z.object({
  status: z.enum(["stub", "draft", "told"]),
  sources: z.array(Source).default([]),
  sections: z.array(z.object({ key: z.string().regex(/^[a-z0-9-]+$/), heading: z.string().min(1), html: z.string() })),
});
export type Colophon = z.infer<typeof Colophon>;
