import { screenDb } from "../../../../lib/db.ts";
import { buildSource } from "../../../../lib/task.ts";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await ctx.params;
  const c = await screenDb();
  const source = await buildSource(c, id);
  if (!source) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json(source, { headers: { "cache-control": "no-store" } });
}
