import { getObjectRows } from "@/lib/content";
import { joinLines } from "@/lib/usage";
import { chart } from "@/tokens/chart";
import { Bars, Chart, Panel, Stat, Stats } from "./chart";
import UsageRead from "./usage-read";

// This repository's own commits, an hour at a time (content/objects/viewsource-cadence): the same
// still strip as the racing rig's, one slot for every hour of every day from the first commit to the
// latest, so the build reads as a strip of days and the nights are gaps of true time. Every line is
// written here, on the server; pointing at an hour retypes the line under the strip with that hour's
// count, and leaving types the whole back. The numbers under the strip are a table, hidden from
// sight, so the strip reads without a script and without a pointer. Drawn as the HUD draws
// (app/chart.tsx, Oct 18): the lines added and removed are the deltas, green and red. The bars are
// one path for every hour of every day, and the hours' lines ride on the figure as one attribute
// (lib/usage.ts).

const H = chart.strip.height, STEP = chart.bar.step, BAR = chart.bar.width, HOURS = 24;
const fmt = new Intl.NumberFormat("en-US");
const when = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" });
const short = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const hour = (h: number) => (h === 0 ? "midnight" : h === 12 ? "noon" : h < 12 ? `${h} am` : `${h - 12} pm`);
const plural = (n: number) => `${fmt.format(n)} ${n === 1 ? "commit" : "commits"}`;
// the clock time of an ISO stamp with its own offset, as it was on the wall where it was made
const clock = (iso: string) => { const m = iso.match(/T(\d\d):(\d\d)/); return m ? `${m[1]}:${m[2]}` : ""; };

type Totals = { commits: number; pull_requests_merged: number; lines_added: number; lines_removed: number; hours: number; sittings: number };
type Rows = { first: string; last: string; totals: Totals; days: [string, number[]][]; hour_of_day: number[] };

export default async function BuildCadence() {
  const rows = (await getObjectRows("viewsource-cadence")) as Rows;
  const days = rows.days;
  if (!days?.length) return null;
  const slots = days.length * HOURS;
  const max = Math.max(...days.flatMap(([, hours]) => hours));
  const all = days.reduce((s, [, hours]) => s + hours.reduce((a, b) => a + b, 0), 0);
  const byDay = days.map(([d, hours]) => [d, hours.reduce((a, b) => a + b, 0)] as const);
  const busiestDay = byDay.reduce((a, b) => (b[1] > a[1] ? b : a));
  let busiest: { d: string; h: number; n: number } = { d: days[0][0], h: 0, n: -1 };
  for (const [d, hours] of days) hours.forEach((n, h) => { if (n > busiest.n) busiest = { d, h, n }; });
  const t = rows.totals;
  const lead = `Every commit to this site's repository, an hour at a time, from the first on ${when(days[0][0])} at ${clock(rows.first)} to ${when(days[days.length - 1][0])}, 2026, each day its own strip: ${plural(all)}, ${fmt.format(t.pull_requests_merged)} pull requests, ${fmt.format(t.lines_added)} lines added and ${fmt.format(t.lines_removed)} removed, in ${t.sittings} sittings over ${Math.floor(t.hours)} hours. The nights are gaps of real time.`;
  const whole = `The most in an hour, ${fmt.format(busiest.n)}, at ${hour(busiest.h)} on ${when(busiest.d)}; the most in a day, ${fmt.format(busiestDay[1])}, on ${when(busiestDay[0])}.`;
  const lines = days.flatMap(([d, hours]) => hours.map((n, h) => (n ? `${when(d)}, ${hour(h)}: ${plural(n)}.` : `${when(d)}, ${hour(h)}: none.`)));
  return (
    <Chart className="usage build" data-usage data-read={whole} data-lines={joinLines(lines)}>
      <Stats n={6}>
        <Stat label="Commits" value={fmt.format(all)} tone="headline" />
        <Stat label="Pull requests" value={fmt.format(t.pull_requests_merged)} />
        <Stat label="Lines added" value={`+${fmt.format(t.lines_added)}`} tone="better" />
        <Stat label="Lines removed" value={`−${fmt.format(t.lines_removed)}`} tone="worse" />
        <Stat label="Sittings" value={fmt.format(t.sittings)} />
        <Stat label="Hours" value={fmt.format(Math.floor(t.hours))} />
      </Stats>
      <Panel>
        <svg
          className="chart-strip usage-days build-hours"
          viewBox={`0 0 ${slots * STEP} ${H}`}
          preserveAspectRatio="none"
          width="100%"
          height={H}
          role="img"
          aria-label={`${lead} ${whole} Use the arrow keys to read an hour.`}
          tabIndex={0}
        >
          {days.map(([d], i) => (
            <g key={d} className="build-day" data-day={d}>
              {/* each day's base runs from its first hour to its last, so the days read as separate strips */}
              <line className="chart-hairline" x1={i * HOURS * STEP + (STEP - BAR) / 2} x2={(i + 1) * HOURS * STEP - (STEP - BAR) / 2} y1={H - 0.5} y2={H - 0.5} />
            </g>
          ))}
          {/* every hour of every day in one path, slot by slot, over the days' bases as the bars always sat */}
          <Bars heights={days.flatMap(([, hours]) => hours.map((n) => (n ? Math.max(1, (n / max) * H) : 0)))} />
        </svg>
        <ol className="build-days" aria-hidden="true">
          {byDay.map(([d, n]) => (
            <li key={d}><span className="build-days-when">{short(d)}</span> <span className="build-days-n">{fmt.format(n)}</span></li>
          ))}
        </ol>
      </Panel>
      {/* hidden by a box around it: a table won't shrink below its words, so hidden itself it still
          widened the page on a phone; the box clips it to nothing, and assistive readers still read it */}
      <div className="visually-hidden">
        <table>
          <caption>Commits by day and hour, Denver time</caption>
          <thead><tr><th scope="col">Day</th><th scope="col">Hour</th><th scope="col">Commits</th></tr></thead>
          <tbody>
            {days.flatMap(([d, hours]) => hours.map((n, h) => (n ? <tr key={`${d}-${h}`}><td>{when(d)}</td><td>{hour(h)}</td><td>{n}</td></tr> : null)))}
          </tbody>
        </table>
      </div>
      <UsageRead />
      <figcaption className="chart-panel">
        <span className="usage-what">{lead}</span>{" "}
        <span className="usage-read" aria-live="polite">{whole}</span>
      </figcaption>
    </Chart>
  );
}
