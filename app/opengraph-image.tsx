import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { connection } from "next/server";

// The image a link to the site unfurls with: a frame of the field itself, picked at random each time
// it's asked for. The frames in public/og are real captures of the running field (muted, everything
// but the field hidden, at random places along the timeline and with the nav on different edges),
// so a preview shows the art as it is, not a drawing of it. Chat apps keep the one they fetched for a
// given link for a while; a new link, or the same one later, gets another.
export const alt = "The shattered field from viewsource";
export const size = { width: 1200, height: 630 };
export const contentType = "image/jpeg";
const FRAMES = 24;

export default async function Image() {
  await connection(); // picked on request, never once at build
  const n = String(1 + Math.floor(Math.random() * FRAMES)).padStart(2, "0");
  const frame = await readFile(join(process.cwd(), "public", "og", `frame-${n}.jpg`));
  return new Response(new Uint8Array(frame), { headers: { "Content-Type": contentType, "Cache-Control": "no-store, max-age=0" } });
}
