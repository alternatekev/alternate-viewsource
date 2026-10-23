import { getPhases } from "@/lib/content";
import "./nav.css";

// The way around in the server's own HTML, on every route: the pages, and the phases of the
// timeline, as plain links. Without JavaScript it is the nav. With it the docks are the nav (the main
// nav and the timeline, app/docks.tsx), so this one steps aside as they mount (html[data-docked],
// app/nav.css) and is never there twice. Its words are the docks' own: the pages, and each phase by
// its name as the timeline types it; a phase's link goes to its name on the home page.
export default async function SiteNav() {
  const phases = await getPhases();
  return (
    <nav className="site-nav" aria-label="Site">
      <ul className="site-nav-list">
        {/* plain links on purpose: this nav is only seen without JavaScript; with it the docks go between pages */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <li><a href="/">hello</a></li>
        <li><a href="/work">work</a></li>
        <li><a href="/colophon">colophon</a></li>
      </ul>
      <ul className="site-nav-list" aria-label="Timeline">
        {/* newest first, as the page and the timeline run */}
        {[...phases].reverse().map((p) => (
          <li key={p.key}><a href={`/#phase-${p.key}`}>{p.name.toLowerCase()}</a></li>
        ))}
      </ul>
    </nav>
  );
}
