import { screenDb } from "../../../lib/db.ts";
import { buildLibrary, type RowFilter } from "../../../lib/library.ts";

export const dynamic = "force-dynamic";

const FILTERS: RowFilter[] = ["all", "worked", "dead", "gate", "run"];

export async function GET(req: Request): Promise<Response> {
  const c = await screenDb();
  const kind = new URL(req.url).searchParams.get("kind");
  const filter: RowFilter = FILTERS.includes(kind as RowFilter) ? (kind as RowFilter) : "all";
  return Response.json(await buildLibrary(c, filter), { headers: { "cache-control": "no-store" } });
}
