// The library page: how big the raw record is right now. Entries and
// tokens per kind off `sources`, bytes on disk off $collStats, the rules
// stored (solved off `state`, refuted off failed gate sources), the
// growth line off metrics.perMinute (cumulative tokens), the lessons
// digest as pinned into every context, and the newest entries.

import type { Collections } from "../../shared/db.ts";
import type { LibraryPayload } from "./types.ts";

const NEWEST = 20;
const GIST_CHARS = 240;

export async function buildLibrary(c: Collections): Promise<LibraryPayload> {
  const [perKind, storage, solvedRules, refutedRules, metrics, newest] = await Promise.all([
    c.sources
      .aggregate<{ _id: string; entries: number; tokens: number }>([{ $group: { _id: "$kind", entries: { $sum: 1 }, tokens: { $sum: { $add: ["$tokens.in", "$tokens.out"] } } } }])
      .toArray(),
    storageSize(c),
    c.state.countDocuments({ score: 1 }),
    c.sources.countDocuments({ kind: "gate", "raw.gate.pass": false }),
    c.metrics.findOne({ _id: "metrics" }, { projection: { at: 1, "totals.libraryTokens": 1, "totals.librarySources": 1, perMinute: 1, "lessons.text": 1, "lessons.at": 1 } }),
    c.sources
      .find({}, { sort: { createdAt: -1 }, limit: NEWEST, projection: { kind: 1, key: 1, createdAt: 1, "enrichment.gist": 1, text: 1 } })
      .toArray(),
  ]);

  const byKind: Record<string, number> = {};
  let entries = 0;
  let tokens = 0;
  for (const k of perKind) {
    byKind[k._id] = k.entries;
    entries += k.entries;
    tokens += k.tokens;
  }

  let sum = 0;
  const growth = (metrics?.perMinute ?? []).map((m) => {
    sum += m.tokens;
    return { at: m.minute.toISOString(), tokens: sum };
  });

  return {
    at: new Date().toISOString(),
    entries,
    tokens,
    bytes: storage,
    byKind,
    solvedRules,
    refutedRules,
    growth,
    lessons: metrics?.lessons?.text ?? null,
    lessonsAt: metrics?.lessons?.at ? metrics.lessons.at.toISOString() : null,
    newest: newest.map((s) => ({
      id: s._id.toHexString(),
      at: s.createdAt.toISOString(),
      kind: s.kind,
      key: s.key,
      gist: (s.enrichment?.gist ?? s.text ?? "").replace(/\s+/g, " ").slice(0, GIST_CHARS),
    })),
  };
}

// storageSize of `sources` in bytes, 0 when the role may not run $collStats.
async function storageSize(c: Collections): Promise<number> {
  try {
    const [row] = await c.sources.aggregate<{ storageStats?: { storageSize?: number; size?: number } }>([{ $collStats: { storageStats: {} } }]).toArray();
    const st = row?.storageStats;
    return typeof st?.storageSize === "number" ? st.storageSize : typeof st?.size === "number" ? st.size : 0;
  } catch {
    return 0;
  }
}
