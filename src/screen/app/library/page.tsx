"use client";

// The library: how big the raw record is right now. One line saying what
// it is, the big numbers, a growth line, the lessons digest as pinned
// into every context, and the newest entries. Polls every 5 s.

import Link from "next/link";
import { compact, hhmm } from "../../lib/format.ts";
import { usePoll } from "../../lib/poll.ts";
import type { LibraryPayload } from "../../lib/types.ts";

const LIBRARY_POLL_MS = 5000;
const FONTS = "https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap";

const KINDS: Array<{ kind: string; label: string; color: string }> = [
  { kind: "worker-run", label: "agent runs", color: "var(--gk-working)" },
  { kind: "gate", label: "gate verdicts", color: "var(--gk-retry)" },
  { kind: "planner-turn", label: "planner turns", color: "var(--gk-human)" },
  { kind: "error", label: "errors", color: "var(--gk-dead)" },
];

function kindLabel(kind: string): string {
  return KINDS.find((k) => k.kind === kind)?.label ?? kind;
}

function kindColor(kind: string): string {
  return KINDS.find((k) => k.kind === kind)?.color ?? "var(--gk-dimmer)";
}

// 5505024 -> "5.5 MB"
function bytesLabel(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)} GB`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} MB`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)} kB`;
  return `${n} B`;
}

function Big({ value, label, color }: { value: string; label: string; color?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span className="gk-big" style={{ color }}>
        {value}
      </span>
      <span className="gk-label">{label}</span>
    </div>
  );
}

// The growth line: cumulative tokens per minute, plain SVG, no axes but
// the first and last time and the last value.
function Growth({ points }: { points: LibraryPayload["growth"] }) {
  const w = 640;
  const h = 120;
  const pad = 4;
  const nonzero = points.findIndex((p) => p.tokens > 0);
  const pts = nonzero > 0 ? points.slice(Math.max(0, nonzero - 1)) : points;
  const max = Math.max(1, ...pts.map((p) => p.tokens));
  const x = (i: number) => pad + (pts.length > 1 ? (i / (pts.length - 1)) * (w - pad * 2) : 0);
  const y = (t: number) => h - pad - (t / max) * (h - pad * 2);
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.tokens).toFixed(1)}`).join(" ");
  const area = pts.length ? `${d} L${x(pts.length - 1).toFixed(1)},${h - pad} L${x(0).toFixed(1)},${h - pad} Z` : "";
  const last = pts[pts.length - 1];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" style={{ display: "block" }} role="img" aria-label="tokens in the library over time">
        {pts.length > 1 ? (
          <>
            <path d={area} fill="var(--gk-solved)" opacity={0.08} />
            <path d={d} fill="none" stroke="var(--gk-solved)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
          </>
        ) : null}
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between" }} className="gk-sub">
        <span>{pts.length ? hhmm(pts[0].at) : "--:--"}</span>
        <span>{last ? `${compact(last.tokens)} tokens at ${hhmm(last.at)}` : "no minutes yet"}</span>
      </div>
    </div>
  );
}

export default function LibraryPage() {
  const poll = usePoll<LibraryPayload>("/api/library", LIBRARY_POLL_MS);
  const d = poll.data;
  const reads = d?.contextAvg ? `about ${compact(d.contextAvg, 0)}` : "about 17k";
  return (
    <main className="gk" style={{ padding: "30px 36px", maxWidth: 1480, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
      <link rel="stylesheet" href={FONTS} />
      <header style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <Link href="/" style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em" }}>
          goalkeeper
        </Link>
        <span style={{ fontSize: 22, color: "#333" }}>/</span>
        <span style={{ fontSize: 20, color: "var(--gk-dim)" }}>Library</span>
        {poll.error ? <span className="gk-chip" style={{ color: "var(--gk-dead)", borderColor: "var(--gk-dead-bd)" }}>{poll.error}</span> : null}
        <span style={{ flex: 1 }} />
        {d ? <span className="gk-sub">updated {hhmm(d.at)}</span> : null}
        <Link href="/" className="gk-button" style={{ height: 40 }}>
          Stage
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#ededed" strokeWidth="1.6" aria-hidden>
            <path d="M4 8h8M9 5l3 3-3 3" />
          </svg>
        </Link>
      </header>

      <p style={{ margin: 0, fontSize: 17, lineHeight: 1.45, color: "var(--gk-dim)", maxWidth: 980 }}>
        Raw, append-only, machine written. Nobody reads it whole. Every agent reads {reads} tokens of it, chosen for its puzzle.
      </p>

      <section className="gk-card" aria-label="size" style={{ flexDirection: "row", gap: 48, padding: "22px 24px", flexWrap: "wrap" }}>
        <Big value={d ? String(d.entries) : "-"} label="entries" />
        <Big value={d ? compact(d.tokens) : "-"} label="tokens" />
        <Big value={d ? bytesLabel(d.bytes) : "-"} label="on disk" />
        <span style={{ width: 1, background: "var(--gk-line)", alignSelf: "stretch" }} />
        {KINDS.map((k) => (
          <Big key={k.kind} value={d ? String(d.byKind[k.kind] ?? 0) : "-"} label={k.label} color={k.color} />
        ))}
        <span style={{ width: 1, background: "var(--gk-line)", alignSelf: "stretch" }} />
        <Big value={d ? String(d.solvedRules) : "-"} label="solved rules stored" color="var(--gk-solved)" />
        <Big value={d ? String(d.refutedRules) : "-"} label="refuted rules stored" color="var(--gk-retry)" />
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "minmax(0, 3fr) minmax(0, 2fr)", gap: 24, alignItems: "stretch" }}>
        <div className="gk-card" aria-label="growth">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span className="gk-title">Tokens in the library over time</span>
            <span className="gk-sub">per minute, cumulative</span>
          </div>
          <Growth points={d?.growth ?? []} />
        </div>
        <div className="gk-card" aria-label="lessons">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span className="gk-title">Lessons digest</span>
            <span className="gk-sub">pinned into every context{d?.lessonsAt ? ` · ${hhmm(d.lessonsAt)}` : ""}</span>
          </div>
          <pre className="gk-pre" style={{ maxHeight: 260, fontSize: 12.5, color: "var(--gk-dim)" }}>
            {d ? (d.lessons ?? "no digest yet") : ""}
          </pre>
        </div>
      </section>

      <section className="gk-card" aria-label="newest" style={{ gap: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span className="gk-title">Newest entries</span>
          <span className="gk-sub">{d ? `${d.newest.length} of ${d.entries}` : ""}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {(d?.newest ?? []).map((e) => (
            <Link
              key={e.id}
              href={`/library/${e.id}`}
              className="gk-row"
              style={{ display: "grid", gridTemplateColumns: "48px 140px 96px 1fr", gap: 14, alignItems: "center", padding: "8px 6px", margin: "0 -6px", borderBottom: "1px solid var(--gk-line-soft)", borderRadius: 6 }}
            >
              <span className="gk-mono" style={{ fontSize: 13, color: "var(--gk-dimmer)" }}>
                {hhmm(e.at)}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--gk-dim)" }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: kindColor(e.kind), flexShrink: 0 }} />
                {kindLabel(e.kind)}
              </span>
              <span className="gk-mono" style={{ fontSize: 13 }}>
                {e.key ?? ""}
              </span>
              <span style={{ fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.gist || <span style={{ color: "var(--gk-dimmer)" }}>not indexed yet</span>}</span>
            </Link>
          ))}
          {d && !d.newest.length ? <span className="gk-label">nothing written yet</span> : null}
        </div>
      </section>
    </main>
  );
}
