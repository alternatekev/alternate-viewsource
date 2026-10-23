import { createHmac, timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";

// GitHub webhook target. A push to the content repo marks everything tagged "content" stale;
// the next visit to each page regenerates it in the background. No build, no redeploy.
// The webhook's secret and REVALIDATE_SECRET must match; the value lives only in the host's env.
export async function POST(req: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) return new Response("revalidation is not configured", { status: 503 });

  const body = await req.text();
  const given = req.headers.get("x-hub-signature-256") ?? "";
  const expected = "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
  const ok = given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
  if (!ok) return new Response("bad signature", { status: 401 });

  revalidateTag("content", "max");
  return Response.json({ revalidated: true, at: new Date().toISOString() });
}
