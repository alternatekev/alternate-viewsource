// Validates every file under content/ against lib/content/schema.ts.
// Runs in CI and before a build; exits non-zero on the first bad file.
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { REPO_URL } from "../lib/site";
import { ChapterMeta, Colophon, Design, Milestone, UsageDay, Phase, PHASE_KEYS, Writing } from "../lib/content/schema";

const root = path.join(process.cwd(), "content");
let problems = 0;
const fail = (file: string, msg: string) => {
  problems++;
  console.error(`✗ ${file}: ${msg}`);
};

async function json(file: string) {
  return JSON.parse(await readFile(path.join(root, file), "utf8")) as unknown[];
}

async function main() {
  const phases = (await json("spine/phases.json")).map((x) => Phase.parse(x));
  if (phases.map((p) => p.key).join() !== PHASE_KEYS.join()) fail("spine/phases.json", `phases must be ${PHASE_KEYS.join(", ")} in order`);
  for (let i = 1; i < phases.length; i++) {
    if (phases[i].start <= phases[i - 1].end) fail("spine/phases.json", `${phases[i].key} starts before ${phases[i - 1].key} ends`);
  }

  const milestones = (await json("spine/milestones.json")).map((x) => Milestone.parse(x));
  const keys = new Set<string>();
  for (const m of milestones) {
    if (keys.has(m.key)) fail("spine/milestones.json", `duplicate key ${m.key}`);
    keys.add(m.key);
    const p = phases.find((p) => p.key === m.phase)!;
    if (m.date < p.start || m.date > p.end) fail("spine/milestones.json", `${m.key} (${m.date}) is outside ${p.key} (${p.start}–${p.end})`);
    if (m.sources.length === 0) fail("spine/milestones.json", `${m.key} has no source`);
  }

  const usage = (await json("spine/usage.json")).map((x) => UsageDay.parse(x));
  for (const [i, u] of usage.entries()) {
    if (i && u.day <= usage[i - 1].day) fail("spine/usage.json", `${u.day} is out of order or repeated`);
    if (!(u.opus + u.fable + u.sonnet + u.haiku)) fail("spine/usage.json", `${u.day} has no replies; leave the day out`);
  }
  const designs = (await json("spine/designs.json")).map((x) => Design.parse(x));
  for (const d of designs) if (d.snapshot.captured < d.start) fail("spine/designs.json", `${d.key} captured before it started`);

  const writing = [...(await json("writing/posts.json")), ...(await json("writing/work.json")), ...(await json("writing/old.json"))].map((x) => Writing.parse(x));
  const wkeys = new Set<string>();
  for (const w of writing) {
    if (wkeys.has(w.key)) fail("writing/posts.json", `duplicate key ${w.key}`);
    wkeys.add(w.key);
    if (/<script|<iframe|\son[a-z]+\s*=/i.test(w.html)) fail("writing/posts.json", `${w.key} carries script, an embed or an event handler`);
    for (const m of w.html.matchAll(/src="([^"]+)"/g)) {
      if (!m[1].startsWith("/writing/")) fail("writing/posts.json", `${w.key} loads ${m[1]} from elsewhere`);
      else if (!existsSync(path.join(root, "..", "public", m[1]))) fail("writing", `${w.key} shows ${m[1]}, which isn't in public/`);
    }
    if (w.end && w.end < w.date) fail("writing", `${w.key} ends before it starts`);
  }

  // a phase's intro is plain words and links into the site: each link goes to a piece that exists
  const ids = new Set(writing.map((w) => `piece-${w.key}`));
  for (const p of phases) {
    if (p.intro.status === "stub" ? p.intro.html !== "" : !p.intro.html) fail("spine/phases.json", `${p.key} intro is ${p.intro.status} but ${p.intro.html ? "has" : "has no"} words`);
    if (/<(?!\/?(a|em)\b)/i.test(p.intro.html)) fail("spine/phases.json", `${p.key} intro carries markup other than links and emphasis`);
    for (const m of p.intro.html.matchAll(/href="([^"]+)"/g)) if (!m[1].startsWith("#") || !ids.has(m[1].slice(1))) fail("spine/phases.json", `${p.key} intro links to ${m[1]}, which isn't a piece here`);
  }

  // the colophon: plain words and links, every link into this repo pointing at a file that is here
  const colophon = Colophon.parse(JSON.parse(await readFile(path.join(root, "colophon.json"), "utf8")));
  const words = colophon.sections.some((sec) => sec.html);
  if (colophon.status === "stub" ? words : !words) fail("colophon.json", `status is ${colophon.status} but it ${words ? "has" : "has no"} words`);
  if (colophon.status !== "stub" && colophon.sources.length === 0) fail("colophon.json", "words need sources");
  const ckeys = new Set<string>();
  for (const sec of colophon.sections) {
    if (ckeys.has(sec.key)) fail("colophon.json", `duplicate section ${sec.key}`);
    ckeys.add(sec.key);
    if (/<(?!\/?(p|a|em|code|ul|li)\b)/i.test(sec.html)) fail("colophon.json", `${sec.key} carries markup other than paragraphs, lists, links, emphasis and code`);
    for (const m of sec.html.matchAll(/href="([^"]+)"/g)) {
      const href = m[1];
      if (!href.startsWith("https://")) fail("colophon.json", `${sec.key} links to ${href}, which isn't an https address`);
      const own = href.match(new RegExp(`^${REPO_URL.replace(/[.]/g, "\\.")}/(?:blob|tree)/main/(.+)$`));
      if (own && !existsSync(path.join(root, "..", decodeURIComponent(own[1])))) fail("colophon.json", `${sec.key} links to ${own[1]}, which isn't in this repo`);
    }
  }

  const storyDir = path.join(root, "story");
  const files = (await readdir(storyDir, { recursive: true, withFileTypes: true }))
    .filter((e) => e.isFile() && e.name.endsWith(".mdx") && !e.name.startsWith("_"))
    .map((e) => path.relative(root, path.join(e.parentPath ?? e.path, e.name)));
  for (const file of files) {
    try {
      const { data } = matter(await readFile(path.join(root, file), "utf8"));
      const meta = ChapterMeta.parse(data);
      const dir = file.split(path.sep)[1];
      if (dir !== meta.phase) fail(file, `folder "${dir}" and phase "${meta.phase}" disagree`);
      const p = phases.find((p) => p.key === meta.phase)!;
      if (meta.start < p.start || meta.start > p.end) fail(file, `start ${meta.start} is outside ${p.key}`);
      if (meta.status !== "stub" && meta.sources.length === 0) fail(file, "a chapter with words needs sources");
    } catch (e) {
      fail(file, e instanceof Error ? e.message : String(e));
    }
  }

  console.log(`${phases.length} phases, ${milestones.length} milestones, ${designs.length} designs, ${writing.length} pieces of writing, ${files.length} chapters, the colophon checked`);
  if (problems) {
    console.error(`${problems} problem(s)`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
