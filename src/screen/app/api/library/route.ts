import { screenDb } from "../../../lib/db.ts";
import { buildLibrary } from "../../../lib/library.ts";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const c = await screenDb();
  return Response.json(await buildLibrary(c), { headers: { "cache-control": "no-store" } });
}
