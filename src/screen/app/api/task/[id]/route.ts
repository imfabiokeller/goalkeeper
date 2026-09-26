import { screenDb } from "../../../../lib/db.ts";
import { buildTask } from "../../../../lib/task.ts";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await ctx.params;
  const c = await screenDb();
  const task = await buildTask(c, id);
  if (!task) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json(task, { headers: { "cache-control": "no-store" } });
}
