import type { Chapter, Milestone } from "@/lib/content/schema";
import { renderChapterBody } from "@/lib/content/mdx";
import { Sources, When } from "./when";

// The chapters, in my words, set beside the writing as pieces to dive into: the same article, the
// same button, the same body. A stub stays off the page until it has words. Agents chapters say
// where the work happened and sit under the two headings the milestones use, At Cisco and At home
// (Kevin, Oct 16), newest first in each row; a row's label takes the year's place in the gutter.
// A chapter ends with where it leads (cohesion branch): the pieces it goes with, and the years on
// the work page it belongs to (from the milestones it tells). Each is a link that journeys there.

const WHERE = [["cisco", "At Cisco"], ["home", "At home"]] as const;
const year = (d: string) => new Date(d).getUTCFullYear();

/** every piece on the page by its id without the piece- prefix, for naming what a chapter goes with */
export type PieceTitles = Map<string, string>;

function Leads({ c, titles, milestones }: { c: Chapter; titles: PieceTitles; milestones: Milestone[] }) {
  const related = c.related.filter((id) => titles.has(id));
  const years = [...new Set(c.milestones.map((k) => milestones.find((m) => m.key === k)).filter((m): m is Milestone => !!m).map((m) => year(m.date)))].sort((a, b) => b - a);
  if (!related.length && !years.length) return null;
  return (
    <p className="piece-leads">
      {related.length > 0 && (
        <span className="piece-lead">
          Goes with{" "}
          {related.map((id, i) => (
            <span key={id}>{i > 0 && ", "}<a href={`#piece-${id}`}>{titles.get(id)}</a></span>
          ))}
        </span>
      )}
      {years.length > 0 && (
        <span className="piece-lead">
          On the work page{" "}
          {years.map((y, i) => (
            <span key={y}>{i > 0 && ", "}<a href={`/work#year-${y}`}>{y}</a></span>
          ))}
        </span>
      )}
    </p>
  );
}

async function Piece({ c, titles, milestones }: { c: Chapter; titles: PieceTitles; milestones: Milestone[] }) {
  const id = `piece-chapter-${c.slug}`;
  return (
    <article className="piece chapter" id={id} data-dive={id} data-status={c.status}>
      <button type="button" className="dive" data-dive={id} aria-label={c.title}>
        <When date={c.start} end={c.end} />
        <h3>{c.title}</h3>
      </button>
      <div className="piece-body">{await renderChapterBody(c.body)}</div>
      <Sources sources={c.sources} className="piece-source near-source" />
      <Leads c={c} titles={titles} milestones={milestones} />
    </article>
  );
}

/** the chapters with words, in the order the field shows them: newest first in each row */
export function toldChapters(chapters: Chapter[]) {
  const told = chapters.filter((c) => c.status !== "stub").sort((a, b) => b.start.localeCompare(a.start) || a.order - b.order);
  const rows: { key: string; label: string; here: Chapter[] }[] = [];
  const unplaced = told.filter((c) => !c.where);
  if (unplaced.length) rows.push({ key: "all", label: "", here: unplaced });
  for (const [where, label] of WHERE) {
    const here = told.filter((c) => c.where === where);
    if (here.length) rows.push({ key: where, label, here });
  }
  return rows;
}

export function Chapters({ chapters, titles, milestones }: { chapters: Chapter[]; titles: PieceTitles; milestones: Milestone[] }) {
  const rows = toldChapters(chapters);
  if (!rows.length) return null;
  return (
    <>
      {rows.map((r) => (
        <div key={r.key} className="near-row chapters-row">
          <p className="near-row-year">{r.label}</p>
          {r.here.map((c) => <Piece key={c.slug} c={c} titles={titles} milestones={milestones} />)}
        </div>
      ))}
    </>
  );
}
