import { getChapters, getDesigns, getMilestones, getPhases, getUsage, getWriting, publishable } from "@/lib/content";
import Surface from "./surface";
import Usage from "./usage";
import { Marks, toldBy } from "./marks";
import { Chapters, toldChapters, type PieceTitles } from "./chapters";
import { Contents } from "./contents";
import { Sources, When } from "./when";

// The spine as one typographic surface (David Small's pattern: zoom is navigation, and type stays
// type at every scale). Each phase is a full-height beat. Far: the phase's name. Near, set small
// beside it: what the web was then, its milestones and the site's designs from those years. Close,
// smaller still beside each one: its sources. Scroll travels between phases; pressing dives in
// (lib/surface.ts). Without JavaScript this is simply a document, every word in reading order.
// Words here are the sourced spine and the chapters that have words; a stub chapter stays off until it does.
// Newest first (Kevin, Oct 16): Hello at the top, then agents, scrolling down through time to dial-up.
// Inside each phase every list runs newest first too.
const year = (d: string) => new Date(d).getUTCFullYear();
const newest = <T extends { date: string }>(rows: T[]) => [...rows].sort((a, b) => b.date.localeCompare(a.date));

// the welcome, in my words (Kevin, Oct 16)
const WELCOME = {
  text: "I'm Kevin. I've spent 28 years learning each new way the web gets built, then teaching teams to build that way. In 2026 the material is agents: I run the design system behind Cisco's network administration products, my three teams went fully agentic in March, and most of what I build at home is built with agents too. Newest first, from here down.",
};

export default async function Home() {
  const [phases, milestones, designs, writing, usage, chapters] = await Promise.all([getPhases(), getMilestones(), getDesigns(), getWriting(), getUsage(), getChapters()]);
  const shown = chapters.filter(publishable);
  // every piece by id, so a chapter can name what it goes with; and which chapter tells each milestone
  const titles: PieceTitles = new Map([...writing.filter((w) => w.html).map((w) => [w.key, w.title] as const), ...shown.map((c) => [`chapter-${c.slug}`, c.title] as const)]);
  const told = toldBy(shown);
  return (
    // the page's one landmark; the beats stay a child of the body, as the surface's styles expect
    <div className="beats" role="main" data-order="newest-first">
      <h1 className="visually-hidden">viewsource</h1>
      <section className="beat welcome" aria-labelledby="welcome">
        <div className="space">
          <div className="far">
            <h2 id="welcome">Hello</h2>
          </div>
          <p className="subhead">{WELCOME.text}</p>
        </div>
      </section>
      {[...phases].reverse().map((p) => {
        const marks = newest(milestones.filter((m) => m.phase === p.key));
        const sites = designs.filter((d) => d.start >= p.start && d.start <= p.end).sort((a, b) => b.start.localeCompare(a.start));
        // my music (posts about it and the albums) lives somewhere of its own, not on the timeline (Kevin, Oct 16)
        const here = newest(writing.filter((w) => w.kind !== "music" && w.kind !== "album" && w.date >= p.start && w.date <= p.end));
        // what has words is a piece to dive into; work that was only ever a name in a list is a line
        const pieces = here.filter((w) => w.html), names = here.filter((w) => !w.html);
        const years = [...new Set(pieces.map((w) => year(w.date)))].sort((a, b) => b - a);
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
                <button type="button" className="dive" data-dive={`near-${p.key}`} aria-label={p.name}>
                  <span className="far-years">{year(p.start)}–{year(p.end)}</span>
                  <h2 id={`phase-${p.key}`}>{p.name}</h2>
                </button>
                {/* the intro, in my words, under the name; its links travel to the pieces they came from */}
                {p.intro.html && <p className="phase-intro" data-status={p.intro.status} dangerouslySetInnerHTML={{ __html: p.intro.html }} />}
                {/* agents: my use of them, a day at a time, part of the phase's description (Kevin, Oct 16) */}
                {p.key === "agents" && <Usage days={usage} />}
                {/* what these years hold, named at reading size: the way to choose a piece from the surface */}
                <Contents phase={p.key} chapters={toldChapters(shown.filter((c) => c.phase === p.key)).flatMap((r) => r.here)} pieces={pieces} />
                {/* near: everything from these years, in full, as paragraphs set too small to read until you dive in */}
                <div className="near" id={`near-${p.key}`}>
                  <div className="near-col">
                    <p className="near-web">{p.web}</p>
                    <Marks marks={marks} className="near-mark" sourceClass="near-source" headClass="near-where" told={told} />
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
                  {/* the chapters, in my words, before the posts: for agents a row at Cisco and a row at home */}
                  <Chapters chapters={shown.filter((c) => c.phase === p.key)} titles={titles} milestones={milestones} />
                  {/* the posts, as blocks: a row per year, newest year first, and the year's posts across, newest first */}
                  {years.map((y) => (
                    <div key={y} className="near-row">
                      <p className="near-row-year">{y}</p>
                      {pieces.filter((w) => year(w.date) === y).map((w) => (
                        <article key={w.key} className="piece" id={`piece-${w.key}`} data-dive={`piece-${w.key}`}>
                          <button type="button" className="dive" data-dive={`piece-${w.key}`} aria-label={w.title}>
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
      <Surface />
    </div>
  );
}
