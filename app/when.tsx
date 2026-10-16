import type { Source } from "@/lib/content/schema";

// Dates, set one way wherever they appear (Kevin picked "drawn spans", Oct 16). A point in time is
// its date with a short tick. A span is its first year, a hairline down the height of its line, and
// its last year a step quieter. A hidden "–" between the two keeps "2010–2012" for screen readers
// and for reading without CSS. A dated line is a gutter for the date and the words beside it
// (.dated in globals.css); the date can also stand on its own, as a piece's does above its title.

const year = (d: string) => new Date(d).getUTCFullYear();

type Dated = { date: string; end?: string; approximate?: boolean };

/** a date or a span; `full` shows a point's whole date (a post's day), otherwise its year */
export function When({ date, end, approximate, full }: Dated & { full?: boolean }) {
  const from = year(date), to = end ? year(end) : from;
  const c = approximate ? <span className="when-c">c. </span> : null;
  if (to === from) {
    return (
      <span className="when">
        <time className="when-t" dateTime={date}>{c}{full ? date : from}</time>
      </span>
    );
  }
  return (
    <span className="when when-span">
      <time className="when-t" dateTime={date}>{c}{from}</time>
      <span className="when-to">–</span>
      <time className="when-t" dateTime={end}>{to}</time>
    </span>
  );
}

/** only real sources show, as links; a firsthand line (my own account) carries no label */
export function Sources({ sources, className }: { sources: Source[]; className: string }) {
  const real = sources.filter((s) => s.url);
  if (!real.length) return null;
  return (
    <span className={className}>
      {real.map((s, i) => <a key={i} href={s.url}>{s.label}</a>)}
    </span>
  );
}
