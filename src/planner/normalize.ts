// One way to group free-text reasons: lowercase, alphanumeric words only,
// the first PREFIX_CHARS characters. Used by propose (block reasons) and
// by the lessons digest (gate reasons and block reasons) so both count
// the same groups.

export const PREFIX_CHARS = 40;

export function normalizeReason(reason: string): string {
  return reason
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .slice(0, PREFIX_CHARS);
}
