import type { Metadata } from "next";
import { getDesigns } from "@/lib/content";
import { When } from "../when";

// The colophon (Kevin, Oct 16): two things. View source, this site's own making, in my words; and
// every design of alternate.org since 2000, newest first, each with its stack and its archived
// snapshot. The one place on the site that names tools. A document first: the same column as the
// work page, no corridor, every word in reading order without JavaScript.

export const metadata: Metadata = { title: "Colophon" };

const REPO = "https://github.com/alternatekev/alternate-viewsource";

export default async function Colophon() {
  const designs = (await getDesigns()).slice().sort((a, b) => b.start.localeCompare(a.start));
  return (
    <div className="stops colophon">
      <section className="stop" aria-labelledby="colophon-h">
        <div className="stop-space">
          <div className="stop-head">
            <h1 id="colophon-h" className="stop-year">Colophon</h1>
            <h2 id="made-h">How this site is made</h2>
            <div className="stop-body">
              <p>This is the first alternate.org you can read the source of while it is being built.</p>
              <p>It is a Next.js 16 app that prerenders to static HTML. The content is files in a <a href={REPO}>public repo</a>: the spine as JSON, the chapters as MDX. There is no database. (Two headless backends died under earlier versions of this site. Files survive.)</p>
              <p>The field behind the words is plain WebGL, a port of doooomgaze. The instrument is Web Audio, dooombient, with my pedals modeled per sample. Both load after idle, on devices that qualify, and nothing waits for them to read a word.</p>
              <p>The type is from my Adobe Fonts kit: Argent Pixel CF for the small lines, Le Monde Livre for the display and the prose.</p>
              <p>I built it with Claude Code, and the rules the agents follow when they work here are in <a href={`${REPO}/blob/main/CLAUDE.md`}>CLAUDE.md</a> and the skills beside it. The repo is public on purpose. It is part of the evidence: how the thing was planned, built and changed, commit by commit, with agents working in it alongside me.</p>
            </div>
          </div>
        </div>
      </section>
      <section className="stop" aria-labelledby="designs-h">
        <div className="stop-space">
          <div className="stop-head">
            <h2 id="designs-h">Every design of alternate.org since 2000</h2>
            {designs.map((d) => (
              <p key={d.key} className="stop-work dated">
                <When date={d.start} approximate={d.approximate} />{" "}
                <span className="dated-what">
                  {d.name}. <em>{d.tagline}</em> {d.stack}.{" "}
                  {d.snapshot && <a href={d.snapshot.url}>Archived {d.snapshot.captured}</a>}
                </span>
              </p>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
