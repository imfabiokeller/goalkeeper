"use client";

// One library entry, where a precedent link lands: kind, key, gist,
// labels, tokens, the flattened text, and the raw record folded away.

import Link from "next/link";
import { useParams } from "next/navigation";
import { CodeBlock } from "../../../components/CodeBlock.tsx";
import { compact, hhmmss } from "../../../lib/format.ts";
import { usePoll } from "../../../lib/poll.ts";
import type { SourcePayload } from "../../../lib/types.ts";

const SOURCE_POLL_MS = 60_000; // sources are append-only; one fetch is enough

export default function LibraryPage() {
  const { id } = useParams<{ id: string }>();
  const poll = usePoll<SourcePayload>(`/api/sources/${id}`, SOURCE_POLL_MS);
  const s = poll.data;
  return (
    <main className="library" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16, maxWidth: 1200, margin: "0 auto" }}>
      <header style={{ display: "flex", gap: 16, alignItems: "baseline", flexWrap: "wrap", fontFamily: "var(--mono)", fontSize: 12 }}>
        <Link href="/" style={{ color: "var(--fg-dim)" }}>
          stage
        </Link>
        <h1 style={{ fontSize: 18, margin: 0 }}>library entry {id}</h1>
        {s ? (
          <>
            <span>{s.kind}</span>
            {s.key ? <Link href={`/unit/${s.key}`}>{s.key}</Link> : null}
            {s.taskId ? <Link href={`/task/${s.taskId}`}>task</Link> : null}
            <span style={{ color: "var(--fg-dim)" }}>
              {hhmmss(s.createdAt)}, v{s.version}, {compact(s.tokens.in)} in / {compact(s.tokens.out)} out
            </span>
          </>
        ) : null}
        {poll.error ? <span style={{ color: "var(--status-blocked)" }}>{poll.error}</span> : null}
        {poll.loading ? <span style={{ color: "var(--fg-dim)" }}>loading</span> : null}
      </header>
      {s?.enrichment ? (
        <section>
          <p style={{ margin: "0 0 4px", fontSize: 15 }}>{s.enrichment.gist}</p>
          <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--fg-dim)" }}>{s.enrichment.labels.join(", ")}</span>
        </section>
      ) : null}
      {s ? <CodeBlock label="text" code={s.text} maxHeight={600} /> : null}
      {s ? (
        <details>
          <summary style={{ cursor: "pointer", fontFamily: "var(--mono)", fontSize: 12, color: "var(--fg-dim)" }}>raw record{s.truncated ? " (clipped for the wire)" : ""}</summary>
          <CodeBlock code={JSON.stringify(s.raw, null, 2)} maxHeight={800} />
        </details>
      ) : null}
    </main>
  );
}
