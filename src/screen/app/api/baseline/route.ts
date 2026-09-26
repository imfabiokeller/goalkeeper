// The control run: `?key=` gives one puzzle's control result (null when
// the control has not tried it), no key gives the totals for the dashed
// line on the curve.

import { readBaseline, readBaselinePuzzle } from "../../../lib/baseline.ts";

export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  const key = new URL(req.url).searchParams.get("key");
  const body = key ? await readBaselinePuzzle(key) : await readBaseline();
  return Response.json(body, { headers: { "cache-control": "no-store" } });
}
