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
        const pieces = writing.filter((w) => w.date >= p.start && w.date <= p.end);
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
                  </div>
                  {pieces.map((w) => (
                    <article key={w.key} className="piece" id={`piece-${w.key}`} data-dive={`piece-${w.key}`}>
                      <button type="button" className="dive" data-dive={`piece-${w.key}`}>
                        <span className="near-year">{w.date}</span>
                        <h3>{w.title}</h3>
                      </button>
                      <div className="piece-body" dangerouslySetInnerHTML={{ __html: w.html }} />
                      <p className="piece-source">First published at <a href={w.source.url}>{w.source.label}</a></p>
                    </article>
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
