import Link from "next/link";
import { getChapters, getMilestones, getPhases, publishable } from "@/lib/content";

// The glance tier, v0: the spine as a list the eye can scan in two minutes between meetings.
// Everything here is in the HTML; there is no client JavaScript on this page.
export default async function Home() {
  const [phases, milestones, chapters] = await Promise.all([getPhases(), getMilestones(), getChapters()]);
  const shown = chapters.filter(publishable);
  return (
    <main>
      <p className="kicker">alternate.org · since March 2000</p>
      <h1>An analog child, a digital adult.</h1>
      <p className="lede">
        Kevin Conboy has built for the web since 1998, early in every phase it has had. This is the story, told in his
        voice, one phase at a time.
      </p>
      <ol className="spine">
        {phases.map((p) => (
          <li key={p.key} id={p.key} style={{ borderLeft: `3px solid var(--${p.key})`, paddingLeft: "1rem" }}>
            <div className="phase-head">
              <h2>{p.name}</h2>
              <span className="years">
                {p.start.slice(0, 4)}–{p.end.slice(0, 4)}
              </span>
            </div>
            <p className="phase-web">{p.web}</p>
            <ul className="marks">
              {milestones
                .filter((m) => m.phase === p.key)
                .map((m) => (
                  <li key={m.key}>
                    <span className="year">{m.date.slice(0, 4)}</span>
                    <span>{m.label}</span>
                  </li>
                ))}
            </ul>
            {shown.some((c) => c.phase === p.key) && (
              <ul className="chapters">
                {shown
                  .filter((c) => c.phase === p.key)
                  .map((c) => (
                    <li key={c.slug}>
                      <Link href={`/${c.phase}/${c.slug}`}>{c.title}</Link>
                      {c.status !== "told" && <span className="status">{c.status}</span>}
                      <span className="summary">{c.summary}</span>
                    </li>
                  ))}
              </ul>
            )}
          </li>
        ))}
      </ol>
    </main>
  );
}
