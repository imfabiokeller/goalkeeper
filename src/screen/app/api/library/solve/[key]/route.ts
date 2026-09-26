import { screenDb } from "../../../../../lib/db.ts";
import { buildSolve } from "../../../../../lib/solve.ts";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ key: string }> }): Promise<Response> {
  const { key } = await ctx.params;
  if (!/^[a-z0-9_-]{1,64}$/i.test(key)) return Response.json({ error: "bad key" }, { status: 400 });
  const c = await screenDb();
  const solve = await buildSolve(c, key);
  if (!solve) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json(solve, { headers: { "cache-control": "no-store" } });
}
