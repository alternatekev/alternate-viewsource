import { getDesigns, getMilestones, getPhases, getWriting } from "@/lib/content";
import Surface from "./surface";

// The spine as one typographic surface (David Small's pattern: zoom is navigation, and type stays
// type at every scale). Each phase is a full-height beat. Far: the phase's name. Near, set small
// beside it: what the web was then, its milestones and the site's designs from those years. Close,
// smaller still beside each one: its sources. Scroll travels between phases; pressing dives in
// (lib/surface.ts). Without JavaScript this is simply a document, every word in reading order.
// Words here are the sourced spine only; chapters arrive when Kevin dictates them.
// Oldest first (Kevin, Oct 15): dial-up at the top, scrolling down through time to agents, then the welcome.
const year = (d: string) => new Date(d).getUTCFullYear();
// a piece of work's years: one year, or the span it ran
const span = (w: { date: string; end?: string }) => (w.end && year(w.end) !== year(w.date) ? `${year(w.date)}–${year(w.end)}` : String(year(w.date)));

// the welcome: the line from my old homepage, as I have since edited it
const WELCOME = {
  text: "I'm Kevin, and I've been working to make the internet more usable, organized, and engaging since 1999.",
};

export default async function Home() {
  const [phases, milestones, designs, writing] = await Promise.all([getPhases(), getMilestones(), getDesigns(), getWriting()]);
  return (
    <div className="beats" data-order="oldest-first">
      <h1 className="visually-hidden">viewsource</h1>
      {phases.map((p) => {
        const marks = milestones.filter((m) => m.phase === p.key);
        const sites = designs.filter((d) => d.start >= p.start && d.start <= p.end);
        const here = writing.filter((w) => w.date >= p.start && w.date <= p.end);
        // what has words is a piece to dive into; work that was only ever a name in a list is a line
        const pieces = here.filter((w) => w.html), names = here.filter((w) => !w.html);
        return (
          <section
            key={p.key}
            className="beat"
            aria-labelledby={`phase-${p.key}`}
            data-valence={p.mood.valence}
            data-arousal={p.mood.arousal}
            data-x={p.mood.x}
            data-y={p.mood.y}
            data-key={p.key}
            data-name={p.name}
            data-start={p.start}
            data-end={p.end}
          >
            <div className="space">
              <div className="far">
                <button type="button" className="dive" data-dive={`near-${p.key}`}>
                  <span className="far-years">{year(p.start)}–{year(p.end)}</span>
                  <h2 id={`phase-${p.key}`}>{p.name}</h2>
                </button>
                {/* the intro, in my words, under the name; its links travel to the pieces they came from */}
                {p.intro.html && <p className="phase-intro" data-status={p.intro.status} dangerouslySetInnerHTML={{ __html: p.intro.html }} />}
                {/* near: everything from these years, in full, as paragraphs set too small to read until you dive in */}
                <div className="near" id={`near-${p.key}`}>
                  <div className="near-col">
                    <p className="near-web">{p.web}</p>
                    {marks.map((m) => (
                      <p key={m.key} className="near-mark">
                        <span className="near-year">{m.approximate ? "c. " : ""}{year(m.date)}</span> {m.label}.{" "}
                        <span className="near-source">
                          {m.sources.map((s, i) => (s.url ? <a key={i} href={s.url}>{s.label}</a> : <span key={i}>{s.label}</span>))}
                        </span>
                      </p>
                    ))}
                    {sites.map((d) => (
                      <p key={d.key} className="near-site">
                        <span className="near-year">{year(d.start)}</span> {d.name}. <em>{d.tagline}</em> {d.stack}.{" "}
                        {d.snapshot && <a href={d.snapshot.url}>Archived {d.snapshot.captured}</a>}
                      </p>
                    ))}
                    {names.map((w) => (
                      <p key={w.key} className="near-work">
                        <span className="near-year">{w.approximate ? "c. " : ""}{span(w)}</span> {w.title}{w.org ? `, ${w.org}` : ""}.{" "}
                        <span className="near-source"><a href={w.source.url}>{w.source.label}</a></span>
                      </p>
                    ))}
                  </div>
                  {/* the posts, as blocks: a row per year, time running down and the year's posts across */}
                  {[...new Set(pieces.map((w) => year(w.date)))].map((y) => (
                    <div key={y} className="near-row">
                      <p className="near-row-year">{y}</p>
                      {pieces.filter((w) => year(w.date) === y).map((w) => (
                        <article key={w.key} className="piece" id={`piece-${w.key}`} data-dive={`piece-${w.key}`}>
                          <button type="button" className="dive" data-dive={`piece-${w.key}`}>
                            <span className="near-year">{w.kind === "work" || w.kind === "album" ? `${w.approximate ? "c. " : ""}${span(w)}` : w.date}</span>
                            <h3>{w.title}</h3>
                            {w.org && <span className="piece-org">{w.org}</span>}
                          </button>
                          <div className="piece-body" dangerouslySetInnerHTML={{ __html: w.html }} />
                          <p className="piece-source">First published at <a href={w.source.url}>{w.source.label}</a></p>
                        </article>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        );
      })}
      <section className="beat welcome" aria-labelledby="welcome">
        <div className="space">
          <div className="far">
            <h2 id="welcome">Hello</h2>
          </div>
          <p className="subhead">{WELCOME.text}</p>
        </div>
      </section>
      <Surface />
    </div>
  );
}
