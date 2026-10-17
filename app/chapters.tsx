import type { Chapter } from "@/lib/content/schema";
import { renderChapterBody } from "@/lib/content/mdx";
import { Sources, When } from "./when";

// The chapters, in my words, set beside the writing as pieces to dive into: the same article, the
// same button, the same body. A stub stays off the page until it has words. Agents chapters say
// where the work happened and sit under the two headings the milestones use, At Cisco and At home
// (Kevin, Oct 16), newest first in each row; a row's label takes the year's place in the gutter.

const WHERE = [["cisco", "At Cisco"], ["home", "At home"]] as const;

async function Piece({ c }: { c: Chapter }) {
  const id = `piece-chapter-${c.slug}`;
  return (
    <article className="piece chapter" id={id} data-dive={id} data-status={c.status}>
      <button type="button" className="dive" data-dive={id} aria-label={c.title}>
        <When date={c.start} end={c.end} />
        <h3>{c.title}</h3>
      </button>
      <div className="piece-body">{await renderChapterBody(c.body)}</div>
      <Sources sources={c.sources} className="piece-source near-source" />
    </article>
  );
}

export function Chapters({ chapters }: { chapters: Chapter[] }) {
  const told = chapters.filter((c) => c.status !== "stub").sort((a, b) => b.start.localeCompare(a.start) || a.order - b.order);
  if (!told.length) return null;
  const rows: { key: string; label: string; here: Chapter[] }[] = [];
  const unplaced = told.filter((c) => !c.where);
  if (unplaced.length) rows.push({ key: "all", label: "", here: unplaced });
  for (const [where, label] of WHERE) {
    const here = told.filter((c) => c.where === where);
    if (here.length) rows.push({ key: where, label, here });
  }
  return (
    <>
      {rows.map((r) => (
        <div key={r.key} className="near-row chapters-row">
          <p className="near-row-year">{r.label}</p>
          {r.here.map((c) => <Piece key={c.slug} c={c} />)}
        </div>
      ))}
    </>
  );
}
