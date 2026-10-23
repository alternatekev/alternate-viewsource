import { getObjectRows } from "@/lib/content";
import { Chart, Ends, Panel, Stat, Stats } from "./chart";

// What this site borrowed, and from when (content/objects/viewsource-lineage): one row for each
// thing, on a time axis from 1995 to the end of 2026. A point marks the year it came from, a
// hairline runs from there to where it landed here in October 2026, and the words sit at either end
// of the line, so the list reads top to bottom without the drawing. Drawn on the server from the
// object's rows; the page carries none of it in its script. Where I don't know the year, there is
// no point and no line, only the end. Drawn as the HUD draws a table (app/chart.tsx, Oct 18):
// hairline rows, the dates as numerals, and the axis a hairline with a year at either end.

const FROM = 1995, TO = 2027, W = 1000, H = 8, PAD = 4; // the line's own geometry: 8 tall (as .lineage-line), PAD keeps the first tick off the edge

type Row = {
  key: string;
  origin: string | null;
  approximate: boolean;
  what: string;
  used?: string;
  via?: { date: string; what: string };
  reused: string;
  became: string;
  note?: string;
};

// a year, a year and month, or a full date, as a decimal year
const decimal = (d: string) => {
  const [y, m = "1", day = "1"] = d.split("-");
  return Number(y) + (Number(m) - 1) / 12 + (Number(day) - 1) / 365;
};
const frac = (t: number) => (t - FROM) / (TO - FROM);
const at = (d: string) => PAD + frac(decimal(d)) * (W - 2 * PAD);
// a point is a short tick, as a date is everywhere on the site (app/when.tsx); its stroke never scales
const Tick = ({ x, className }: { x: number; className: string }) => <line className={className} x1={x} x2={x} y1={0} y2={H} />;
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
// the date as words: 1995, October 2000, or October 15, 2026
const words = (d: string) => {
  const [y, m, day] = d.split("-");
  return !m ? y : !day ? `${MONTHS[Number(m) - 1]} ${y}` : `${MONTHS[Number(m) - 1]} ${Number(day)}, ${y}`;
};

export default async function Lineage() {
  const rows = (await getObjectRows("viewsource-lineage")) as Row[];
  if (!rows?.length) return null;
  const dated = rows.filter((r) => r.origin);
  const oldest = dated.reduce((a, b) => (decimal(b.origin!) < decimal(a.origin!) ? b : a));
  const lead = `What this site borrowed, and from when: ${rows.length} things on a line from ${FROM} to ${TO - 1}, each a point at the year it came from and a hairline to where it landed here in October 2026.`;
  const whole = `The oldest is from ${words(oldest.origin!)}, ${2026 - Number(oldest.origin!.slice(0, 4))} years before this site.`;
  const span = 2026 - Number(oldest.origin!.slice(0, 4));
  return (
    <Chart className="usage lineage">
      <Stats n={3}>
        <Stat label="Borrowed" value={rows.length} tone="headline" />
        <Stat label="Oldest" value={oldest.origin!.slice(0, 4)} />
        <Stat label="Years before this site" value={span} />
      </Stats>
      <Panel>
        <ol className="lineage-rows">
          {rows.map((r) => {
            const x0 = r.origin ? at(r.origin) : null, x1 = at(r.reused);
            const from = r.origin ? `${r.approximate ? "around " : ""}${words(r.origin)}` : null;
            return (
              <li key={r.key} className="lineage-row" data-key={r.key}>
                <span className="lineage-what">
                  {from && <><span className="lineage-when">{from}</span> </>}{r.what}
                  {r.via && <span className="lineage-via">, by way of {r.via.what}, {words(r.via.date)}</span>}
                </span>
                <svg className="lineage-line" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" width="100%" height={H} aria-hidden="true">
                  {x0 !== null && <line className="chart-hairline" x1={x0} x2={x1} y1={H / 2} y2={H / 2} />}
                  {x0 !== null && <Tick className="chart-tick" x={x0} />}
                  {r.via && <Tick className="chart-tick lineage-via-point" x={at(r.via.date)} />}
                  <Tick className="chart-tick chart-tick--end" x={x1} />
                </svg>
                <span className="lineage-became">
                  <span className="lineage-when">{words(r.reused)}</span> {r.became}
                  {r.note && <span className="lineage-note"> ({r.note})</span>}
                </span>
              </li>
            );
          })}
        </ol>
        <div className="lineage-axis">
          <Ends from={String(FROM)} to={String(TO - 1)} />
        </div>
      </Panel>
      <figcaption className="chart-panel">
        <span className="usage-what">{lead}</span>{" "}
        <span className="usage-read">{whole}</span>
      </figcaption>
    </Chart>
  );
}
