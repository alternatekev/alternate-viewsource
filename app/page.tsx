import { getDesigns, getMilestones, getPhases, getUsage, getWriting } from "@/lib/content";
import Surface from "./surface";
import Usage from "./usage";
import { Sources, When } from "./when";

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
  const [phases, milestones, designs, writing, usage] = await Promise.all([getPhases(), getMilestones(), getDesigns(), getWriting(), getUsage()]);
  return (
    <div className="beats" data-order="oldest-first">
      <h1 className="visually-hidden">viewsource</h1>
      {phases.map((p) => {
        const marks = milestones.filter((m) => m.phase === p.key);
        const sites = designs.filter((d) => d.start >= p.start && d.start <= p.end);
        // my music (posts about it and the albums) lives somewhere of its own, not on the timeline (Kevin, Oct 16)
        const here = writing.filter((w) => w.kind !== "music" && w.kind !== "album" && w.date >= p.start && w.date <= p.end);
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
                {/* agents: my use of them, a day at a time, part of the phase's description (Kevin, Oct 16) */}
                {p.key === "agents" && <Usage days={usage} />}
                {/* near: everything from these years, in full, as paragraphs set too small to read until you dive in */}
                <div className="near" id={`near-${p.key}`}>
                  <div className="near-col">
                    <p className="near-web">{p.web}</p>
                    {marks.map((m) => (
                      <p key={m.key} className="near-mark dated">
                        <When date={m.date} approximate={m.approximate} />{" "}
                        <span className="dated-what">{m.label}. <Sources sources={m.sources} className="near-source" /></span>
                      </p>
                    ))}
                    {sites.map((d) => (
                      <p key={d.key} className="near-site dated">
                        <When date={d.start} />{" "}
                        <span className="dated-what">
                          {d.name}. <em>{d.tagline}</em> {d.stack}.{" "}
                          {d.snapshot && <a href={d.snapshot.url}>Archived {d.snapshot.captured}</a>}
                        </span>
                      </p>
                    ))}
                    {names.map((w) => (
                      <p key={w.key} className="near-work dated">
                        <When date={w.date} end={w.end} approximate={w.approximate} />{" "}
                        <span className="dated-what">
                          {w.title}{w.org ? `, ${w.org}` : ""}. <Sources sources={[w.source]} className="near-source" />
                        </span>
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
                            <When date={w.date} end={w.end} approximate={w.approximate} full={w.kind !== "work"} />
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
