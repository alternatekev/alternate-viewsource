import type { Chapter, Milestone } from "@/lib/content/schema";
import { Sources, When } from "./when";

// A list of milestones, dated, with their real sources. Agents work says where it happened, and
// the list sets it apart under two headings, at Cisco and at home (Kevin, Oct 16); anything that
// doesn't say where comes first, unheaded. The timeline and the work page share it.
// A milestone a chapter tells ends with a link to that chapter (cohesion branch): on the timeline's
// notes a link into the piece, on the work page the way back up to it.

const WHERE = [["cisco", "At Cisco"], ["home", "At home"]] as const;

/** which chapter tells each milestone, by the milestone's key */
export type Told = Map<string, { slug: string; title: string }>;
export function toldBy(chapters: Chapter[]): Told {
  const told: Told = new Map();
  for (const c of chapters) for (const k of c.milestones) if (!told.has(k)) told.set(k, { slug: c.slug, title: c.title });
  return told;
}

type Props = {
  marks: Milestone[]; className: string; sourceClass: string; headClass: string; dated?: boolean;
  told?: Told;
  // where the link to a chapter goes from here: a piece on this page, or one on the timeline from elsewhere
  toldHref?: (slug: string) => string;
};

export function Marks({ marks, className, sourceClass, headClass, dated = true, told, toldHref = (slug) => `#piece-chapter-${slug}` }: Props) {
  const tells = (m: Milestone) => {
    const c = told?.get(m.key);
    return c ? <span className="told"> told in <a href={toldHref(c.slug)}>{c.title}</a></span> : null;
  };
  // on the work page the year is the heading, so a line there carries no date of its own
  const line = (m: Milestone) =>
    dated ? (
      <p key={m.key} className={`${className} dated`}>
        <When date={m.date} approximate={m.approximate} />{" "}
        <span className="dated-what">{m.label}. <Sources sources={m.sources} className={sourceClass} />{tells(m)}</span>
      </p>
    ) : (
      <p key={m.key} className={className}>
        {m.label}. <Sources sources={m.sources} className={sourceClass} />{tells(m)}
      </p>
    );
  return (
    <>
      {marks.filter((m) => !m.where).map(line)}
      {WHERE.map(([where, head]) => {
        const here = marks.filter((m) => m.where === where);
        return here.length ? (
          <div key={where} className="marks-where">
            <h3 className={headClass}>{head}</h3>
            {here.map(line)}
          </div>
        ) : null;
      })}
    </>
  );
}
