import { getObjectRows } from "@/lib/content";
import { chart } from "@/tokens/chart";
import { boxes, Chart, coord, Ends, Panel, span, Stat, Stats } from "./chart";

// One recording's telemetry sidecar, as a still strip (content/objects/sim-racing-telemetry):
// speed as a line in the ink, throttle as bars in the series mint below it, brake as bars in the
// exception coral, the way the HUD draws a lap (app/chart.tsx, Oct 18). The numbers are drawn on
// the server; the page carries none of them in its script. Each pedal is one path, not a box a
// frame, and the two paths keep the order the frames were drawn in (see pedals, below).

const W = 1000, H = chart.strip.tall, BASE = H - 24; // speed above the base, pedals in the band under it
const SPEED_MAX = 180;
// The pedals are drawn on the recording's own clock, in ticks (the sidecar's times are tenths of a
// second), so each frame's bar starts on a whole tick and the steps between bars add up exactly; the
// band's group scales the clock to the strip. In the strip's own units the steps would carry a
// little rounding each, and summed over hundreds of bars that moves the odd edge across a pixel.
const TICKS = 10; // a second

type Row = [t: number, speed: number, throttle: number, brake: number, lateral: number];

// The pedals' band, a path for each pedal: a frame's bar hangs from the band's top, x to x + w,
// as deep as the pedal is pressed. Frames sit closer than a bar is wide where the recording ran
// fast, so a frame's bar overlaps the next one's left end. Drawn a box at a time, frame by frame
// with the brake over the throttle, the next frame's throttle covered this frame's brake there;
// drawn as one path a pedal (all the throttle, then all the brake), the brake would cover it
// instead. So a brake bar leaves out the corner the next frame's throttle covered, and the band
// reads exactly as it did box by box.
function pedals(rows: Row[], x: (t: number) => number, w: number, top: number, deep: (v: number) => number) {
  const throttle = boxes(top), brake = boxes(top);
  rows.forEach(([t, , th, br], i) => {
    const x0 = x(t), x1 = x0 + w;
    if (th > 0) throttle.add(x0, `h${span(x0, x1)}v${coord(deep(th))}h${span(x1, x0)}`);
    if (br > 0) {
      const next = rows[i + 1], xn = next ? x(next[0]) : x1, hb = deep(br);
      if (next && next[2] > 0 && xn < x1) {
        const ht = Math.min(deep(next[2]), hb); // the next frame's throttle, as far down as this brake goes
        brake.add(x0, `h${span(x0, xn)}v${coord(ht)}h${span(xn, x1)}v${span(ht, hb)}h${span(x1, x0)}`);
      } else brake.add(x0, `h${span(x0, x1)}v${coord(hb)}h${span(x1, x0)}`);
    }
  });
  return { throttle: throttle.d, brake: brake.d };
}

export default async function Telemetry() {
  const rows = (await getObjectRows("sim-racing-telemetry")) as Row[];
  if (!rows?.length) return null;
  const tmax = rows[rows.length - 1][0];
  const x = (t: number) => (t / tmax) * W;
  const ys = (v: number) => BASE - (v / SPEED_MAX) * (BASE - 4);
  const speed = rows.map(([t, s], i) => `${i ? "L" : "M"}${x(t).toFixed(1)} ${ys(s).toFixed(1)}`).join(" ");
  const top = Math.max(...rows.map((r) => r[1]));
  const braking = rows.filter((r) => r[3] > 0).length / rows.length;
  const fps = Math.round(rows.length / tmax * 27);
  const lead = `Speed, throttle and brake from one Racing Desk recording: McLaren 570S GT4, Nürburgring Gesamtstrecke, October 7, 2026, the first ${Math.round(tmax)} seconds. The line is speed, to ${Math.round(top)} mph; the bars under it are the pedals, throttle in mint and brake in coral.`;
  const whole = `On the brakes ${Math.round(braking * 100)}% of the time. The sidecar carries 38 channels a frame, ${fps} frames a second, beside the video.`;
  const step = W / rows.length, ticks = tmax * TICKS;
  const band = pedals(rows, (t) => t * TICKS, (Math.max(step, 1) * ticks) / W, BASE + 2, (v) => (v / 100) * (H - BASE - 4));
  return (
    <Chart className="usage telemetry">
      <Stats n={4}>
        <Stat label="Top speed" value={Math.round(top)} unit="mph" tone="headline" />
        <Stat label="On the brakes" value={`${Math.round(braking * 100)}%`} tone="exception" />
        <Stat label="Channels a frame" value={38} />
        <Stat label="Frames a second" value={fps} />
      </Stats>
      <Panel>
        <svg className="chart-strip chart-strip--tall" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" width="100%" height={H} role="img" aria-label={`${lead} ${whole}`}>
          <g transform={`scale(${W / ticks} 1)`}>
            {band.throttle && <path className="chart-bar" d={band.throttle} />}
            {band.brake && <path className="chart-bar chart-bar--exception" d={band.brake} />}
          </g>
          <line className="chart-hairline" x1={0} x2={W} y1={BASE + 0.5} y2={BASE + 0.5} />
          <path className="chart-line" d={speed} />
        </svg>
        <Ends from="0 s" to={`${Math.round(tmax)} s`} />
      </Panel>
      <figcaption className="chart-panel">
        <span className="usage-what">{lead}</span>{" "}
        <span className="usage-read">{whole}</span>
      </figcaption>
    </Chart>
  );
}
