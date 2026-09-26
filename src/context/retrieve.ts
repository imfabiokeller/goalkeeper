// Library retrieval for a briefing: one $rankFusion aggregation over
// `sources` (vector, text and recent pipelines, docs/DATABASE.md). When
// the Atlas Search indexes are missing, the embedding provider is not
// configured, or the aggregation throws for any reason, it degrades to
// plain queries so a worker always gets something and never fails on
// retrieval.

import type { Document } from "mongodb";
import type { Collections } from "../shared/db.ts";
import { embedText } from "../shared/llm.ts";
import type { Source, SourceKind } from "../shared/types.ts";

export type Passage = {
  id: string;
  kind: SourceKind;
  key: string | null;
  gist: string | null;
  excerpt: string;
  score: number;
  createdAt: Date;
};

export type RetrieveOptions = {
  limit?: number; // default 10
  excludeKey?: string; // the task's own key: its sources are pinned, not retrieved
  embed?: (text: string) => Promise<number[]>; // injectable for tests
  excerptChars?: number; // default 600
};

export type RetrieveResult = { passages: Passage[]; degraded: boolean };

const STOP = new Set(
  "a an and are as at be by for from in is it its of on or that the this to with every each never any all".split(" "),
);

// The words a criterion is made of, for the text regex of the fallback.
export function queryWords(query: string, max = 12): string[] {
  const seen = new Set<string>();
  for (const w of query.toLowerCase().match(/[a-z][a-z-]{2,}/g) ?? []) {
    if (STOP.has(w) || seen.has(w)) continue;
    seen.add(w);
    if (seen.size >= max) break;
  }
  return [...seen];
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toPassage(doc: Source & { score?: number }, excerptChars: number, score: number): Passage {
  return {
    id: String(doc._id),
    kind: doc.kind,
    key: doc.key ?? null,
    gist: doc.enrichment?.gist ?? null,
    excerpt: (doc.text ?? "").slice(0, excerptChars),
    score,
    createdAt: doc.createdAt,
  };
}

export async function retrieve(c: Collections, query: string, opts: RetrieveOptions = {}): Promise<RetrieveResult> {
  const limit = opts.limit ?? 10;
  const excerptChars = opts.excerptChars ?? 600;
  const embed = opts.embed ?? embedText;

  try {
    const queryVector = await embed(query);
    const pipeline: Document[] = [
      {
        $rankFusion: {
          input: {
            pipelines: {
              vector: [
                {
                  $vectorSearch: {
                    index: "vec",
                    path: "enrichment.embedding",
                    queryVector,
                    numCandidates: 200,
                    limit: 30,
                  },
                },
              ],
              text: [
                { $search: { index: "txt", text: { query, path: ["text", "enrichment.gist"] } } },
                { $limit: 30 },
              ],
              recent: [
                { $match: { kind: { $in: ["gate", "worker-run"] } } },
                { $sort: { createdAt: -1 } },
                { $limit: 30 },
              ],
            },
          },
          combination: { weights: { vector: 1, text: 1, recent: 0.5 } },
        },
      },
      ...(opts.excludeKey ? [{ $match: { key: { $ne: opts.excludeKey } } }] : []),
      { $limit: limit },
      { $set: { score: { $meta: "score" } } },
    ];
    const docs = (await c.sources.aggregate(pipeline).toArray()) as Array<Source & { score?: number }>;
    return {
      degraded: false,
      passages: docs.map((d, i) => toPassage(d, excerptChars, typeof d.score === "number" ? d.score : 1 / (i + 1))),
    };
  } catch {
    return { degraded: true, passages: await fallback(c, query, limit, excerptChars, opts.excludeKey) };
  }
}

// Plain queries, no search indexes: the most recent enriched gate and
// worker-run sources for other keys, plus a text regex on the query words.
async function fallback(
  c: Collections,
  query: string,
  limit: number,
  excerptChars: number,
  excludeKey?: string,
): Promise<Passage[]> {
  const notOwn = excludeKey ? { key: { $ne: excludeKey } } : {};
  const recent = await c.sources
    .find({ kind: { $in: ["gate", "worker-run"] }, enrichment: { $ne: null }, ...notOwn })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
  const words = queryWords(query);
  const byText =
    words.length === 0
      ? []
      : await c.sources
          .find({ text: { $regex: words.map(escapeRegex).join("|"), $options: "i" }, ...notOwn })
          .sort({ createdAt: -1 })
          .limit(limit)
          .toArray();
  const seen = new Set<string>();
  const out: Passage[] = [];
  for (const doc of [...recent, ...byText]) {
    const id = String(doc._id);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(toPassage(doc, excerptChars, 1 / (out.length + 1)));
    if (out.length >= limit) break;
  }
  return out;
}
