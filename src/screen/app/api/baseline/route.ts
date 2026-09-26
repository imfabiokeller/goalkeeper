import { readBaseline } from "../../../lib/baseline.ts";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  return Response.json(await readBaseline(), { headers: { "cache-control": "no-store" } });
}
