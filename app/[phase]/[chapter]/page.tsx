import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getChapter, getChapters, getPhases, publishable } from "@/lib/content";
import { renderChapterBody } from "@/lib/content/mdx";

type Props = PageProps<"/[phase]/[chapter]">;

export async function generateStaticParams() {
  const chapters = await getChapters();
  return chapters.filter(publishable).map((c) => ({ phase: c.phase, chapter: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { phase, chapter } = await params;
  const c = await getChapter(phase, chapter);
  return c ? { title: c.title, description: c.summary } : {};
}

// Every listed chapter is prerendered whole. An unknown URL renders the not-found view, but
// under Cache Components the prerendered shell goes out first, so the status is 200 (a soft
// 404). If that ever matters for search, a proxy that checks the built route list is the fix.
export default async function ChapterPage({ params }: Props) {
  const { phase, chapter } = await params;
  const c = await getChapter(phase, chapter);
  if (!c || !publishable(c)) notFound();
  const phases = await getPhases();
  const p = phases.find((x) => x.key === c.phase)!;
  const body = await renderChapterBody(c.body);
  return (
    <main>
      <article>
        <header>
          <p className="kicker">
            <Link href={`/#${p.key}`}>{p.name}</Link> · {c.start.slice(0, 4)}
            {c.end && c.end.slice(0, 4) !== c.start.slice(0, 4) ? `–${c.end.slice(0, 4)}` : ""}
          </p>
          <h1>{c.title}</h1>
          <p className="lede">{c.summary}</p>
          {c.status !== "told" && (
            <p className="meta">
              {c.status === "stub" ? "A placeholder: the chapter is still to be told." : "A draft, not yet read back."}
            </p>
          )}
        </header>
        {body}
        {c.sources.length > 0 && (
          <footer className="sources">
            <h3>Sources</h3>
            <ol>
              {c.sources.map((s, i) => (
                <li key={i}>
                  {s.url ? <a href={s.url}>{s.label}</a> : s.label}
                  {s.note ? ` — ${s.note}` : ""}
                </li>
              ))}
            </ol>
          </footer>
        )}
      </article>
    </main>
  );
}
