import { screenDb } from "../../../lib/db.ts";
import { buildStage } from "../../../lib/stage.ts";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const c = await screenDb();
  return Response.json(await buildStage(c), { headers: { "cache-control": "no-store" } });
}
