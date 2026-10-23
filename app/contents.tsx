import type { Chapter, Writing } from "@/lib/content/schema";

// What a phase holds, named at reading size under its intro (cohesion branch): the chapters in my
// words and the essays and work from those years, each a link that journeys into the piece (through
// the field, one level at a time; lib/surface.ts), and the old blog's posts counted, as one press
// into the field where they are. The field beside the name shows the same pieces too small to read;
// this is how you choose one without knowing the field is there. Order follows the field: chapters
// first, newest first, then the pieces, newest first.

const dot = " · ";

export function Contents({ phase, chapters, pieces }: { phase: string; chapters: Chapter[]; pieces: Writing[] }) {
  const named = pieces.filter((w) => w.kind !== "post");
  const posts = pieces.length - named.length;
  const links = [
    ...chapters.map((c) => ({ id: `piece-chapter-${c.slug}`, title: c.title })),
    ...named.map((w) => ({ id: `piece-${w.key}`, title: w.title })),
  ];
  if (!links.length && !posts) return null;
  return (
    <p className="phase-contents">
      {links.map((l, i) => (
        <span key={l.id}>
          {i > 0 && dot}
          <a href={`#${l.id}`}>{l.title}</a>
        </span>
      ))}
      {posts > 0 && (
        <span>
          {links.length > 0 && dot}
          <button type="button" className="dive phase-contents-posts" data-dive={`near-${phase}`}>
            {posts} {posts === 1 ? "post" : "posts"} from the blog
          </button>
        </span>
      )}
    </p>
  );
}
