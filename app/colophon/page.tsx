import type { Metadata } from "next";
import { getColophon, getDesigns } from "@/lib/content";
import { When } from "../when";
import Reading from "./reading";

// The colophon (Kevin, Oct 16): two things. View source, this site's own making, in my words; and
// every design of alternate.org since 2000, newest first, each with its stack and its archived
// snapshot. The one place on the site that names tools. The words are content/colophon.json, read
// like every other content file (draft until I've read them). A document first: the same column as the
// work page, no corridor, every word in reading order without JavaScript.

export const metadata: Metadata = { title: "Colophon" };

export default async function Colophon() {
  const colophon = await getColophon();
  const designs = (await getDesigns()).slice().sort((a, b) => b.start.localeCompare(a.start));
  return (
    <div className="stops colophon">
      <section className="stop" aria-labelledby="colophon-h">
        <div className="stop-space">
          <div className="stop-head">
            <h1 id="colophon-h" className="stop-year">Colophon</h1>
            {colophon.sections.map((sec, i) => (
              <div key={sec.key}>
                <h2 id={i === 0 ? "made-h" : `made-${sec.key}`}>{sec.heading}</h2>
                <div className="stop-body" data-status={colophon.status} dangerouslySetInnerHTML={{ __html: sec.html }} />
              </div>
            ))}
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
      <Reading />
    </div>
  );
}
