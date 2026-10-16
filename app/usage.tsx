import type { UsageDay } from "@/lib/content/schema";
import UsageRead from "./usage-read";

// My use of agents, a day at a time, under the Agents name (Kevin, Oct 16): a strip with a bar for
// every day from the first reply to the last, as tall as that day's count, so quiet days are gaps
// of true time. It stays still. Pointing at a day, or stepping along with the arrow keys, retypes
// the line under it with that day's count; leaving types the whole back. Every line is written
// here, on the server, so the page carries no numbers in its script and reads without one.

const DAY = 86_400_000;
const H = 48, STEP = 4, BAR = 2;
const fmt = new Intl.NumberFormat("en-US");
const when = (t: number) => new Date(t).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" });
const FAMILIES = [["opus", "Opus"], ["fable", "Fable"], ["sonnet", "Sonnet"], ["haiku", "Haiku"]] as const;

const total = (u: UsageDay) => u.opus + u.fable + u.sonnet + u.haiku;
const plural = (n: number) => `${fmt.format(n)} ${n === 1 ? "reply" : "replies"}`;

function line(t: number, u?: UsageDay) {
  if (!u) return `${when(t)}: none.`;
  const n = total(u), mix = FAMILIES.filter(([k]) => u[k] > 0);
  if (mix.length === 1) return `${when(t)}: ${plural(n)}, all ${mix[0][1]}.`;
  return `${when(t)}: ${plural(n)}; ${mix.sort(([a], [b]) => u[b] - u[a]).map(([k, name]) => `${fmt.format(u[k])} ${name}`).join(", ")}.`;
}

export default function Usage({ days }: { days: UsageDay[] }) {
  if (!days.length) return null;
  const first = Date.parse(days[0].day), last = Date.parse(days[days.length - 1].day);
  const by = new Map(days.map((u) => [Date.parse(u.day), u]));
  const slots = Math.round((last - first) / DAY) + 1;
  const max = Math.max(...days.map(total));
  const busiest = days.find((u) => total(u) === max)!;
  const all = days.reduce((s, u) => s + total(u), 0);
  const whole = `${plural(all)} over ${days.length} days; the most, ${fmt.format(max)}, on ${when(Date.parse(busiest.day))}.`;
  const span = `${when(first)} to ${when(last)}, ${new Date(last).getUTCFullYear()}`;
  return (
    <figure className="usage" data-usage data-read={whole}>
      <svg
        className="usage-days"
        viewBox={`0 0 ${slots * STEP} ${H}`}
        preserveAspectRatio="none"
        width="100%"
        height={H}
        role="img"
        aria-label={`Claude Code's replies to me each day, ${span}. ${whole} Use the arrow keys to read a day.`}
        tabIndex={0}
      >
        <line className="usage-base" x1={0} x2={slots * STEP} y1={H - 0.5} y2={H - 0.5} />
        {Array.from({ length: slots }, (_, i) => {
          const t = first + i * DAY, u = by.get(t), h = u ? Math.max(1, (total(u) / max) * H) : 0;
          return <rect key={i} x={i * STEP + (STEP - BAR) / 2} y={H - h} width={BAR} height={h} data-read={line(t, u)} />;
        })}
      </svg>
      <figcaption>
        <span className="usage-what">Claude Code&rsquo;s replies to me, a day at a time, {span}.</span>{" "}
        <span className="usage-read" aria-live="polite">{whole}</span>
      </figcaption>
      <UsageRead />
    </figure>
  );
}
