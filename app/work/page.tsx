import type { Metadata } from "next";
import { getMilestones, getPhases, getWriting } from "@/lib/content";
import type { Milestone, Phase, Writing } from "@/lib/content/schema";
import { Sources, When } from "../when";
import Corridor from "./corridor";

// Work: a time capsule opened at now. It starts at the newest year and scrolls back through time,
// a year at a time, to the beginning (Kevin, Oct 16). Every year is here, the quiet ones too, so the
// distance between two pieces of work is the time between them. A year with work holds what began
// that year: its milestones and the work I did, each with its source, and the screenshots stacked
// behind it. Without JavaScript this is a document, newest first, every word in reading order; with
// it, lib/work.ts turns the years into a corridor you travel down, and the field flies with you.
// Words here are the sourced spine and my old portfolio only; chapters arrive when Kevin dictates them.

export const metadata: Metadata = { title: "Work" };

const year = (d: string) => new Date(d).getUTCFullYear();
// the screenshots a piece of work carries, in its own words' order
const shots = (html: string) => [...html.matchAll(/<img[^>]*src="([^"]+)"[^>]*>/g)].map((m) => m[1]);
const phaseOf = (phases: Phase[], y: number) => phases.find((p) => year(p.start) <= y && y <= year(p.end)) ?? phases[phases.length - 1];

type Year = { y: number; marks: Milestone[]; work: Writing[]; phase: Phase };

export default async function Work() {
  const [phases, milestones, writing] = await Promise.all([getPhases(), getMilestones(), getWriting()]);
  const work = writing.filter((w) => w.kind === "work");
  const newest = Math.max(...milestones.map((m) => year(m.date)), ...work.map((w) => year(w.date)));
  const oldest = Math.min(...milestones.map((m) => year(m.date)), ...work.map((w) => year(w.date)));
  const years: Year[] = [];
  for (let y = newest; y >= oldest; y--) {
    years.push({ y, marks: milestones.filter((m) => year(m.date) === y), work: work.filter((w) => year(w.date) === y), phase: phaseOf(phases, y) });
  }
  return (
    <div className="stops" data-order="newest-first">
      <h1 className="visually-hidden">Work</h1>
      {years.map(({ y, marks, work, phase }) => {
        const mood = { "data-valence": phase.mood.valence, "data-arousal": phase.mood.arousal, "data-x": phase.mood.x, "data-y": phase.mood.y };
        // a quiet year is only distance: the corridor shows its number in passing (lib/work.ts unhides it);
        // a reader without it, with or without the stylesheet, never sees a run of bare numbers
        if (!marks.length && !work.length) {
          return (
            <div key={y} className="stop quiet" data-key={`y${y}`} data-year={y} aria-hidden="true" hidden {...mood}>
              <div className="stop-space"><span className="stop-quiet">{y}</span></div>
            </div>
          );
        }
        const stack = work.flatMap((w) => shots(w.html).map((src) => ({ src, of: w.title })));
        return (
          <section key={y} className="stop" id={`year-${y}`} data-key={`y${y}`} data-year={y} aria-labelledby={`year-${y}-h`} {...mood}>
            <div className="stop-space">
              <div className="stop-head">
                <h2 id={`year-${y}-h`} className="stop-year">{y}</h2>
                {marks.map((m) => (
                  <p key={m.key} className="stop-mark">
                    {m.label}. <Sources sources={m.sources} className="stop-source" />
                  </p>
                ))}
                {work.map((w) =>
                  w.html ? (
                    <details key={w.key} className="stop-work" id={`work-${w.key}`}>
                      <summary className="dated">
                        <When date={w.date} end={w.end} approximate={w.approximate} />
                        <span className="dated-what">
                          <span className="stop-title">{w.title}</span>
                          {w.org && <span className="stop-org">{w.org}</span>}
                        </span>
                      </summary>
                      <div className="stop-body" dangerouslySetInnerHTML={{ __html: w.html }} />
                      <p className="stop-source">First published at <a href={w.source.url}>{w.source.label}</a></p>
                    </details>
                  ) : (
                    <p key={w.key} className="stop-work stop-line dated">
                      <When date={w.date} end={w.end} approximate={w.approximate} />
                      <span className="dated-what">
                        <span className="stop-title">{w.title}</span>
                        {w.org && <span className="stop-org">{w.org}</span>}
                        <Sources sources={[w.source]} className="stop-source" />
                      </span>
                    </p>
                  ),
                )}
              </div>
              {/* the screenshots, stacked into the space behind the year; the pieces themselves carry them for reading */}
              {stack.length > 0 && (
                <div className="stop-stack" aria-hidden="true">
                  {stack.slice(0, 5).map((s, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={s.src} className="stop-shot" src={s.src} alt="" loading="lazy" decoding="async" style={{ ["--i" as string]: i }} />
                  ))}
                </div>
              )}
            </div>
          </section>
        );
      })}
      <Corridor />
    </div>
  );
}
