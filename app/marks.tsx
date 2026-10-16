import type { Milestone } from "@/lib/content/schema";
import { Sources, When } from "./when";

// A list of milestones, dated, with their real sources. Agents work says where it happened, and
// the list sets it apart under two headings, at Cisco and at home (Kevin, Oct 16); anything that
// doesn't say where comes first, unheaded. The timeline and the work page share it.

const WHERE = [["cisco", "At Cisco"], ["home", "At home"]] as const;

export function Marks({ marks, className, sourceClass, headClass, dated = true }: { marks: Milestone[]; className: string; sourceClass: string; headClass: string; dated?: boolean }) {
  // on the work page the year is the heading, so a line there carries no date of its own
  const line = (m: Milestone) =>
    dated ? (
      <p key={m.key} className={`${className} dated`}>
        <When date={m.date} approximate={m.approximate} />{" "}
        <span className="dated-what">{m.label}. <Sources sources={m.sources} className={sourceClass} /></span>
      </p>
    ) : (
      <p key={m.key} className={className}>
        {m.label}. <Sources sources={m.sources} className={sourceClass} />
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
