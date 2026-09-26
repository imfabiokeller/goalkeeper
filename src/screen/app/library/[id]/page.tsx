"use client";

// One library entry, where a precedent link lands: kind, key, when, the
// gist and labels the indexer wrote, the flattened text every agent can
// retrieve, and the raw record folded away. In the mockup's system.

import Link from "next/link";
import { useParams } from "next/navigation";
import { compact, hhmm } from "../../../lib/format.ts";
import { usePoll } from "../../../lib/poll.ts";
import type { SourcePayload } from "../../../lib/types.ts";

const SOURCE_POLL_MS = 60_000; // sources are append-only; one fetch is enough
const FONTS = "https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap";

const KIND: Record<string, { label: string; color: string; what: string }> = {
  "worker-run": { label: "agent run", color: "var(--gk-working)", what: "everything one agent read and did on one attempt" },
  gate: { label: "gate verdict", color: "var(--gk-retry)", what: "what the gate said about one proposal" },
  "planner-turn": { label: "planner turn", color: "var(--gk-human)", what: "one pass of the planner over the record" },
  error: { label: "error", color: "var(--gk-dead)", what: "a crash or a provider failure, kept so nobody repeats it" },
};

export default function LibraryEntryPage() {
  const { id } = useParams<{ id: string }>();
  const poll = usePoll<SourcePayload>(`/api/sources/${id}`, SOURCE_POLL_MS);
  const s = poll.data;
  const kind = s ? (KIND[s.kind] ?? { label: s.kind, color: "var(--gk-dimmer)", what: "" }) : null;
  return (
    <main className="gk" style={{ padding: "30px 36px", maxWidth: 1480, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
      <link rel="stylesheet" href={FONTS} />
      <header style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <Link href="/" style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em" }}>
          goalkeeper
        </Link>
        <span style={{ fontSize: 22, color: "#333" }}>/</span>
        <Link href="/library" style={{ fontSize: 20, color: "var(--gk-dim)" }}>
          Library
        </Link>
        <span style={{ fontSize: 22, color: "#333" }}>/</span>
        <span className="gk-mono" style={{ fontSize: 16, color: "var(--gk-dimmer)" }}>
          {id}
        </span>
        {poll.error ? <span className="gk-chip" style={{ color: "var(--gk-dead)", borderColor: "var(--gk-dead-bd)" }}>{poll.error}</span> : null}
        {poll.loading ? <span className="gk-label">loading</span> : null}
        <span style={{ flex: 1 }} />
        {s?.key ? (
          <Link href={`/unit/${s.key}`} className="gk-button" style={{ height: 40 }}>
            Puzzle {s.key}
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#ededed" strokeWidth="1.6" aria-hidden>
              <path d="M4 8h8M9 5l3 3-3 3" />
            </svg>
          </Link>
        ) : null}
        {s?.taskId ? (
          <Link href={`/task/${s.taskId}`} className="gk-button" style={{ height: 40 }}>
            The attempt, step by step
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#ededed" strokeWidth="1.6" aria-hidden>
              <path d="M4 8h8M9 5l3 3-3 3" />
            </svg>
          </Link>
        ) : null}
      </header>

      {s && kind ? (
        <section className="gk-card" style={{ gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span className="gk-chip" style={{ color: kind.color }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: kind.color }} />
              {kind.label}
            </span>
            {s.key ? (
              <span className="gk-mono" style={{ fontSize: 16 }}>
                {s.key}
              </span>
            ) : null}
            <span className="gk-sub" style={{ textAlign: "left" }}>
              written {hhmm(s.createdAt)} · goal v{s.version} · {compact(s.tokens.in)} in · {compact(s.tokens.out)} out
            </span>
            <span style={{ flex: 1 }} />
            <span className="gk-label">{kind.what}</span>
          </div>
          {s.enrichment ? (
            <>
              <span style={{ fontSize: 20, lineHeight: 1.35, fontWeight: 500 }}>{s.enrichment.gist}</span>
              {s.enrichment.labels.length ? (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {s.enrichment.labels.map((l) => (
                    <span key={l} className="gk-chip" style={{ height: 22, fontSize: 11 }}>
                      {l}
                    </span>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <span className="gk-label">not indexed yet: the gist and labels arrive when the indexer gets to it</span>
          )}
        </section>
      ) : null}

      {s ? (
        <section className="gk-card" aria-label="text">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span className="gk-title">What an agent retrieves</span>
            <span className="gk-sub">the flattened text, {s.text.length.toLocaleString("en-US")} characters</span>
          </div>
          <pre className="gk-pre" style={{ maxHeight: 640, color: "var(--gk-dim)" }}>
            {s.text}
          </pre>
        </section>
      ) : null}

      {s ? (
        <details className="gk-card" style={{ gap: 0 }}>
          <summary style={{ cursor: "pointer", listStyle: "none", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span className="gk-title">Raw record</span>
            <span className="gk-sub">never edited{s.truncated ? " · clipped for the wire" : ""}</span>
          </summary>
          <pre className="gk-pre" style={{ marginTop: 12, maxHeight: 800, fontSize: 12, color: "var(--gk-dim)" }}>
            {JSON.stringify(s.raw, null, 2)}
          </pre>
        </details>
      ) : null}
    </main>
  );
}
