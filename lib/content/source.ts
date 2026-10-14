import { readdir, readFile as fsRead } from "node:fs/promises";
import path from "node:path";

// One way to read content, two places it can come from.
//   fs      – the content/ folder in this checkout (development, CI, and a fully static build)
//   github  – the same folder in a repo at a ref, read at request time and cached by tag, so a
//             content commit goes live on revalidation without a rebuild
// Nothing here knows what the files mean; schema.ts and index.ts do.

export type ContentSource = {
  list(dir: string): Promise<string[]>; // relative paths under content/, files only
  read(file: string): Promise<string>;
};

const ROOT = path.join(process.cwd(), "content");

const fsSource: ContentSource = {
  async list(dir) {
    const base = path.join(ROOT, dir);
    const entries = await readdir(base, { recursive: true, withFileTypes: true });
    return entries
      .filter((e) => e.isFile())
      .map((e) => path.relative(ROOT, path.join(e.parentPath ?? e.path, e.name)))
      .sort();
  },
  async read(file) {
    return fsRead(path.join(ROOT, file), "utf8");
  },
};

function githubSource(repo: string, ref: string, token?: string): ContentSource {
  const auth: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
  let tree: Promise<string[]> | null = null;
  return {
    async list(dir) {
      tree ??= fetch(`https://api.github.com/repos/${repo}/git/trees/${ref}?recursive=1`, {
        headers: { ...auth, Accept: "application/vnd.github+json" },
      })
        .then((r) => {
          if (!r.ok) throw new Error(`content tree ${r.status}`);
          return r.json() as Promise<{ tree: { path: string; type: string }[] }>;
        })
        .then((j) => j.tree.filter((t) => t.type === "blob" && t.path.startsWith("content/")).map((t) => t.path.slice("content/".length)));
      const all = await tree;
      const prefix = dir.replace(/\/?$/, "/");
      return all.filter((p) => p.startsWith(prefix)).sort();
    },
    async read(file) {
      const r = await fetch(`https://raw.githubusercontent.com/${repo}/${ref}/content/${file}`, { headers: auth });
      if (!r.ok) throw new Error(`content read ${r.status}: ${file}`);
      return r.text();
    },
  };
}

export function contentSource(): ContentSource {
  if (process.env.CONTENT_SOURCE === "github") {
    const repo = process.env.CONTENT_REPO;
    if (!repo) throw new Error("CONTENT_SOURCE=github needs CONTENT_REPO");
    return githubSource(repo, process.env.CONTENT_REF ?? "main", process.env.CONTENT_TOKEN);
  }
  return fsSource;
}
