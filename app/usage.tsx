import type { UsageDay } from "@/lib/content/schema";
import { joinLines } from "@/lib/usage";
import { chart } from "@/tokens/chart";
import { Bars, Chart, Ends, Panel, Stat, Stats } from "./chart";
import UsageRead from "./usage-read";

// My use of agents, a day at a time, under the Agents name (Kevin, Oct 16): a strip with a bar for
// every day from the first reply to the last, as tall as that day's count, so quiet days are gaps
// of true time. It stays still. Pointing at a day, or stepping along with the arrow keys, retypes
// the line under it with that day's count; leaving types the whole back. Every line is written
// here, on the server, so the page carries no numbers in its script and reads without one.
// The tool is incidental and the site shows the transformation (Kevin, Oct 16): the lines lead with
// what the days produced, the model families stay in the data (schema.ts) and off the page, and the
// tool is named on the colophon, not here. Drawn as the HUD draws (app/chart.tsx, Oct 18): the bars
// are one path, and the days' lines ride on the figure as one attribute (lib/usage.ts).

const DAY = 86_400_000;
const H = chart.strip.height, STEP = chart.bar.step;
const fmt = new Intl.NumberFormat("en-US");
const when = (t: number) => new Date(t).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" });
const short = (t: number) => new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

const total = (u: UsageDay) => u.opus + u.fable + u.sonnet + u.haiku;
const plural = (n: number) => `${fmt.format(n)} ${n === 1 ? "reply" : "replies"}`;

// a day's line: its date and its count, nothing more
const line = (t: number, u?: UsageDay) => (u ? `${when(t)}: ${plural(total(u))}.` : `${when(t)}: none.`);

export default function Usage({ days }: { days: UsageDay[] }) {
  if (!days.length) return null;
  const first = Date.parse(days[0].day), last = Date.parse(days[days.length - 1].day);
  const by = new Map(days.map((u) => [Date.parse(u.day), u]));
  const slots = Math.round((last - first) / DAY) + 1;
  const max = Math.max(...days.map(total));
  const busiest = days.find((u) => total(u) === max)!;
  const all = days.reduce((s, u) => s + total(u), 0);
  const span = `${when(first)} to ${when(last)}, ${new Date(last).getUTCFullYear()}`;
  const lead = `My use of coding agents, a day at a time, ${span}: ${plural(all)} over ${days.length} days. Quiet days are gaps of real time.`;
  const whole = `The most, ${fmt.format(max)}, on ${when(Date.parse(busiest.day))}.`;
  const slot = Array.from({ length: slots }, (_, i) => first + i * DAY);
  return (
    <Chart className="usage" data-usage data-read={whole} data-lines={joinLines(slot.map((t) => line(t, by.get(t))))}>
      <Stats n={3}>
        <Stat label="Replies" value={fmt.format(all)} tone="headline" />
        <Stat label="Days" value={fmt.format(days.length)} />
        <Stat label="Most in a day" value={fmt.format(max)} />
      </Stats>
      <Panel>
        <svg
          className="chart-strip usage-days"
          viewBox={`0 0 ${slots * STEP} ${H}`}
          preserveAspectRatio="none"
          width="100%"
          height={H}
          role="img"
          aria-label={`${lead} ${whole} Use the arrow keys to read a day.`}
          tabIndex={0}
        >
          <line className="chart-hairline" x1={0} x2={slots * STEP} y1={H - 0.5} y2={H - 0.5} />
          <Bars heights={slot.map((t) => { const u = by.get(t); return u ? Math.max(1, (total(u) / max) * H) : 0; })} />
        </svg>
        <Ends from={short(first)} to={short(last)} />
      </Panel>
      <UsageRead />
      <figcaption className="chart-panel">
        <span className="usage-what">{lead}</span>{" "}
        <span className="usage-read" aria-live="polite">{whole}</span>
      </figcaption>
    </Chart>
  );
}
