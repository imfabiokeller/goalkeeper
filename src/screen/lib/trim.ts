// Trim a raw record to a byte budget for the wire: every string leaf is
// clipped to the largest cap in the ladder that brings the JSON under the
// limit. Structure survives, long transcripts get shorter.

export const RAW_LIMIT_BYTES = 200_000;
const CAPS = [Infinity, 16_000, 8_000, 4_000, 2_000, 1_000, 500, 200, 80];

function clipStrings(v: unknown, cap: number): unknown {
  if (typeof v === "string") return v.length > cap ? v.slice(0, cap) + `… [${v.length - cap} more chars]` : v;
  if (Array.isArray(v)) return v.map((x) => clipStrings(x, cap));
  if (v && typeof v === "object") {
    if (v instanceof Date) return v;
    if (typeof (v as { toHexString?: unknown }).toHexString === "function") return v; // ObjectId
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v)) out[k] = clipStrings(x, cap);
    return out;
  }
  return v;
}

export function trimRaw<T>(raw: T, limit = RAW_LIMIT_BYTES): { raw: T; truncated: boolean } {
  for (const cap of CAPS) {
    const candidate = cap === Infinity ? raw : (clipStrings(raw, cap) as T);
    if (Buffer.byteLength(JSON.stringify(candidate)) <= limit) return { raw: candidate, truncated: cap !== Infinity };
  }
  return { raw: clipStrings(raw, 80) as T, truncated: true };
}
