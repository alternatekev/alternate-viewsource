import { getObjectRows } from "@/lib/content";
import UsageRead from "./usage-read";

// The racing rig's commits, a day at a time (content/objects/sim-racing-cadence): the same still
// strip as the usage one, a bar for every day from the first commit to the last, so quiet days are
// gaps of true time. Every line is written here, on the server; pointing at a day retypes the line
// under the strip with that day's count, and leaving types the whole back.

const H = 48, STEP = 4, BAR = 2;
const fmt = new Intl.NumberFormat("en-US");
const when = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" });
const plural = (n: number) => `${fmt.format(n)} ${n === 1 ? "commit" : "commits"}`;

type Rows = { days: [string, number][] };

export default async function Cadence() {
  const rows = (await getObjectRows("sim-racing-cadence")) as Rows;
  const days = rows.days;
  if (!days?.length) return null;
  const max = Math.max(...days.map(([, n]) => n));
  const active = days.filter(([, n]) => n > 0);
  const all = days.reduce((s, [, n]) => s + n, 0);
  const busiest = days.find(([, n]) => n === max)!;
  const lead = `Commits to the racing rig's repositories, a day at a time, ${when(days[0][0])} to ${when(days[days.length - 1][0])}, 2026: ${plural(all)} over ${active.length} days. Quiet days are gaps of real time.`;
  const whole = `The most, ${fmt.format(max)}, on ${when(busiest[0])}.`;
  return (
    <figure className="usage" data-usage data-read={whole}>
      <svg
        className="usage-days"
        viewBox={`0 0 ${days.length * STEP} ${H}`}
        preserveAspectRatio="none"
        width="100%"
        height={H}
        role="img"
        aria-label={`${lead} ${whole} Use the arrow keys to read a day.`}
        tabIndex={0}
      >
        <line className="usage-base" x1={0} x2={days.length * STEP} y1={H - 0.5} y2={H - 0.5} />
        {days.map(([d, n], i) => {
          const h = n ? Math.max(1, (n / max) * H) : 0;
          return <rect key={d} x={i * STEP + (STEP - BAR) / 2} y={H - h} width={BAR} height={h} data-read={n ? `${when(d)}: ${plural(n)}.` : `${when(d)}: none.`} />;
        })}
      </svg>
      <figcaption>
        <span className="usage-what">{lead}</span>{" "}
        <span className="usage-read" aria-live="polite">{whole}</span>
      </figcaption>
      <UsageRead />
    </figure>
  );
}
