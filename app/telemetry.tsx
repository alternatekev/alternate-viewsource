import { getObjectRows } from "@/lib/content";

// One recording's telemetry sidecar, as a still strip (content/objects/sim-racing-telemetry):
// speed as a line in the ink, brake pressure as bars in the accent below it, throttle as bars in
// the rule. The numbers are drawn on the server; the page carries none of them in its script.

const W = 1000, H = 96, BASE = 72; // speed above the base, pedals in the band under it
const SPEED_MAX = 180;

type Row = [t: number, speed: number, throttle: number, brake: number, lateral: number];

export default async function Telemetry() {
  const rows = (await getObjectRows("sim-racing-telemetry")) as Row[];
  if (!rows?.length) return null;
  const tmax = rows[rows.length - 1][0];
  const x = (t: number) => (t / tmax) * W;
  const ys = (v: number) => BASE - (v / SPEED_MAX) * (BASE - 4);
  const speed = rows.map(([t, s], i) => `${i ? "L" : "M"}${x(t).toFixed(1)} ${ys(s).toFixed(1)}`).join(" ");
  const top = Math.max(...rows.map((r) => r[1]));
  const braking = rows.filter((r) => r[3] > 0).length / rows.length;
  const lead = `Speed, throttle and brake from one Racing Desk recording: McLaren 570S GT4, Nürburgring Gesamtstrecke, October 7, 2026, the first ${Math.round(tmax)} seconds. The line is speed, to ${Math.round(top)} mph; the bars under it are the pedals, throttle in the rule and brake in the accent.`;
  const whole = `On the brakes ${Math.round(braking * 100)}% of the time. The sidecar carries 38 channels a frame, ${Math.round(rows.length / tmax * 27)} frames a second, beside the video.`;
  const step = W / rows.length;
  return (
    <figure className="usage telemetry">
      <svg className="telemetry-strip" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" width="100%" height={H} role="img" aria-label={`${lead} ${whole}`}>
        {rows.map(([t, , th, br], i) => (
          <g key={i}>
            {th > 0 && <rect className="telemetry-throttle" x={x(t)} y={BASE + 2} width={Math.max(step, 1)} height={(th / 100) * (H - BASE - 4)} />}
            {br > 0 && <rect className="telemetry-brake" x={x(t)} y={BASE + 2} width={Math.max(step, 1)} height={(br / 100) * (H - BASE - 4)} />}
          </g>
        ))}
        <line className="usage-base" x1={0} x2={W} y1={BASE + 0.5} y2={BASE + 0.5} />
        <path className="telemetry-speed" d={speed} />
      </svg>
      <figcaption>
        <span className="usage-what">{lead}</span>{" "}
        <span className="usage-read">{whole}</span>
      </figcaption>
    </figure>
  );
}
