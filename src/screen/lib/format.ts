// Small pure formatters shared by the components. No locale surprises:
// times are HH:MM(:SS) in the viewer's zone, numbers are compact.

export function hhmm(iso: string | number | Date | null | undefined): string {
  if (iso === null || iso === undefined) return "--:--";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--:--";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function hhmmss(iso: string | number | Date | null | undefined): string {
  if (iso === null || iso === undefined) return "--:--:--";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--:--:--";
  return `${hhmm(d)}:${String(d.getSeconds()).padStart(2, "0")}`;
}

// 1234 -> "1.2k", 210_000_000 -> "210M"
export function compact(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "-";
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${(n / 1e9).toFixed(digits)}B`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(digits)}M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(digits)}k`;
  return String(Math.round(n));
}

export function pct(rate: number | null | undefined, digits = 0): string {
  if (rate === null || rate === undefined || !Number.isFinite(rate)) return "-";
  return `${(rate * 100).toFixed(digits)}%`;
}

// Seconds as "42s", "3m 05s", "1h 12m"
export function duration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) return "-";
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${String(s % 60).padStart(2, "0")}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${String(m % 60).padStart(2, "0")}m`;
}

export function secondsSince(iso: string | null | undefined, now = Date.now()): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : Math.max(0, (now - t) / 1000);
}

// Rough token estimate for a context section: four characters per token.
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function clip(s: string, max = 200): string {
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

// A tool argument or result as one clipped line of JSON or text.
export function oneLine(v: unknown, max = 200): string {
  const s = typeof v === "string" ? v : JSON.stringify(v) ?? String(v);
  return clip(s.replace(/\s+/g, " "), max);
}

// Workers are agents on screen: "w-06" is "agent 6", "w-2196so" is
// "agent 2196so". Null is "no agent".
export function agentLabel(worker: string | null | undefined): string {
  if (!worker) return "no agent";
  const id = worker.replace(/^w-/, "").replace(/^0+(?=\d)/, "");
  return `agent ${id}`;
}
