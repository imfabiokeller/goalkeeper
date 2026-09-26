"use client";

// The stage: header (goal, the hero chart, the counters, the Library
// link), a grid of puzzle cards, the kill button and its toast, and the
// expanded card as an overlay at ?open=key. 1920x1080, no scrolling.

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card } from "../components/Card.tsx";
import { Expanded } from "../components/Expanded.tsx";
import { Hero } from "../components/Hero.tsx";
import type { ControlResult } from "../lib/cards.ts";
import { compact, hhmm } from "../lib/format.ts";
import { usePoll } from "../lib/poll.ts";
import type { StageCard, StagePayload, TaskPayload, UnitPayload } from "../lib/types.ts";
import { useMany } from "../lib/useMany.ts";

type BaselineTotals = { solveRate?: number; solveRateAt2?: number | null; n?: number; model?: string } | null;

const STAGE_POLL_MS = 2000;
const UNIT_POLL_MS = 3000;
const CONTROL_POLL_MS = 30_000;
const BASELINE_POLL_MS = 60_000;
const TOAST_MS = 30_000;
const KILL_N = 5;

const unitUrl = (key: string) => `/api/unit/${key}`;
const controlUrl = (key: string) => `/api/baseline?key=${key}`;
const taskUrl = (id: string) => `/api/task/${id}`;

function Kpi({ value, note, color }: { value: React.ReactNode; note: string; color?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, whiteSpace: "nowrap", flexShrink: 0 }}>
      <span style={{ fontFamily: "var(--mono)", fontSize: 26, lineHeight: 1, color }}>{value}</span>
      <span style={{ fontSize: 13, color: "var(--fg-dimmer)" }}>{note}</span>
    </div>
  );
}

function Stage() {
  const router = useRouter();
  const params = useSearchParams();
  const openKey = params.get("open");
  const stage = usePoll<StagePayload>("/api/stage", STAGE_POLL_MS);
  const baseline = usePoll<BaselineTotals>("/api/baseline", BASELINE_POLL_MS);
  const s = stage.data;

  // The cards stay where they are between polls: a card keeps its slot
  // while its key is on the list, new keys fill freed slots.
  const slots = useRef<Array<string | null>>([]);
  const cards = useMemo(() => {
    const list = s?.cards ?? [];
    const byKey = new Map(list.map((c) => [c.key, c]));
    const next: Array<string | null> = slots.current.map((k) => (k && byKey.has(k) ? k : null));
    for (const c of list) {
      if (next.includes(c.key)) continue;
      const free = next.indexOf(null);
      if (free === -1) next.push(c.key);
      else next[free] = c.key;
    }
    while (next.length && next[next.length - 1] === null) next.pop();
    slots.current = next;
    return next.map((k) => (k ? byKey.get(k) ?? null : null));
  }, [s]);

  const keys = useMemo(() => cards.flatMap((c) => (c ? [c.key] : [])), [cards]);
  const allKeys = useMemo(() => (openKey && !keys.includes(openKey) ? [...keys, openKey] : keys), [keys, openKey]);
  const units = useMany<UnitPayload>(allKeys, unitUrl, UNIT_POLL_MS);
  const controls = useMany<ControlResult>(allKeys, controlUrl, CONTROL_POLL_MS);

  // A card flashes when it turns solved or retrying while on screen.
  const prev = useRef<Map<string, StageCard["status"]>>(new Map());
  const [flashes, setFlashes] = useState<Record<string, "solved" | "retry">>({});
  useEffect(() => {
    const next: Record<string, "solved" | "retry"> = {};
    for (const c of cards) {
      if (!c) continue;
      const was = prev.current.get(c.key);
      if (was && was !== c.status && c.status === "solved") next[c.key] = "solved";
      if (was && was !== c.status && c.status === "retrying") next[c.key] = "retry";
    }
    prev.current = new Map(cards.flatMap((c) => (c ? [[c.key, c.status] as const] : [])));
    if (Object.keys(next).length) setFlashes((f) => ({ ...f, ...next }));
  }, [cards]);

  // The expanded card: its unit and the latest attempt's run.
  const openCard = openKey ? (cards.find((c) => c?.key === openKey) ?? null) : null;
  const openUnit = openKey ? (units[openKey] ?? null) : null;
  const openTaskId = openUnit?.tasks.at(-1)?.id ?? null;
  const task = usePoll<TaskPayload>(openTaskId ? taskUrl(openTaskId) : "/api/task/none", 10_000);
  const close = useCallback(() => router.replace("/"), [router]);
  const open = useCallback((key: string) => router.replace(`/?open=${key}`), [router]);

  // The kill: one POST, one toast, nothing else on the screen changes by hand.
  const [toast, setToast] = useState<string | null>(null);
  const [killing, setKilling] = useState(false);
  const kill = async () => {
    setKilling(true);
    try {
      const res = await fetch("/api/kill", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ n: KILL_N }) });
      if (!res.ok) throw new Error(`${res.status}`);
      setToast(`${KILL_N} agents stopped`);
    } catch {
      setToast("could not reach the kill switch");
    } finally {
      setKilling(false);
    }
  };
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(t);
  }, [toast]);

  const totals = s?.metrics.totals ?? null;
  const solved = s?.counts.solved ?? 0;
  const alive = s?.workers.alive ?? 0;
  const target = s?.workers.target ?? 0;
  const stopped = (s?.cards ?? []).filter((c) => c.status === "stopped").length;
  const controlRate = typeof baseline.data?.solveRate === "number" ? baseline.data.solveRate : null;

  return (
    <main style={{ position: "relative", width: 1920, height: 1080, padding: "36px 48px", display: "flex", flexDirection: "column", gap: 24, background: "#000", color: "var(--fg)", overflow: "hidden", margin: "0 auto" }}>
      <header style={{ height: 60, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, minWidth: 0 }}>
          <svg width="24" height="24" viewBox="0 0 22 22" fill="none" stroke="#ededed" strokeWidth="1.6">
            <circle cx="11" cy="11" r="9" />
            <path d="M6 11h10" />
          </svg>
          <span style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em" }}>goalkeeper</span>
          <span style={{ fontSize: 22, color: "#333" }}>/</span>
          <span style={{ fontSize: 20, color: "var(--fg-dim)", whiteSpace: "nowrap" }}>Solve {s?.counts.units ?? 400} ARC puzzles</span>
          <span style={{ fontSize: 13, color: "var(--accent)", border: "1px solid var(--accent-line)", borderRadius: 999, padding: "5px 12px", whiteSpace: "nowrap" }}>goal written by a human · {hhmm(s?.goal?.writtenAt)}</span>
          {stage.error ? <span style={{ fontSize: 12, color: "var(--status-blocked)" }}>stale: {stage.error}</span> : null}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 28, flexShrink: 0 }}>
          <Hero solveRate={s?.metrics.solveRate ?? []} perMinute={s?.metrics.perMinute ?? []} libraryTokens={totals?.libraryTokens ?? null} controlRate={controlRate} width={300} height={44} />
          <Kpi
            value={
              <>
                {solved}
                <span style={{ color: "#555" }}> / {s?.counts.units ?? 400}</span>
              </>
            }
            note="puzzles solved"
          />
          <Kpi value={`${alive} / ${target || alive}`} note={stopped ? `${stopped} restarting` : "agents running"} color={stopped ? "#f07178" : undefined} />
          <Kpi value={compact(totals?.contextLast20Avg)} note="tokens each agent reads" />
          <Kpi value={compact(totals?.libraryTokens)} note="tokens in the library" />
          <Link href="/library" style={{ height: 44, display: "flex", alignItems: "center", gap: 10, padding: "0 16px", border: "1px solid #333", borderRadius: 10, textDecoration: "none", fontSize: 15 }}>
            <span>Library</span>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#ededed" strokeWidth="1.6">
              <path d="M4 8h8M9 5l3 3-3 3" />
            </svg>
          </Link>
        </div>
      </header>

      <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gridTemplateRows: "repeat(2, minmax(0, 1fr))", gap: 18 }}>
        {cards.slice(0, 8).map((c, i) =>
          c ? (
            <Card key={c.key} card={c} unit={units[c.key] ?? null} control={controls[c.key]} onOpen={() => open(c.key)} flash={flashes[c.key] ?? null} />
          ) : (
            <div key={`empty-${i}`} style={{ border: "1px dashed #1a1a1a", borderRadius: 14 }} />
          ),
        )}
        {!cards.length && s ? <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--fg-dimmer)", fontSize: 16 }}>no agent is holding a puzzle right now</div> : null}
      </div>

      {toast ? (
        <div className="toast" style={{ position: "absolute", left: "50%", top: 116, transform: "translateX(-50%)", height: 48, padding: "0 20px", display: "flex", alignItems: "center", gap: 12, border: "1px solid #3a1a1b", borderRadius: 12, background: "#140808", boxShadow: "0 12px 40px rgba(0,0,0,.6)", fontSize: 16, whiteSpace: "nowrap", zIndex: 5 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#d4575b" }} />
          <span style={{ color: "#f07178" }}>{toast}</span>
          {toast.startsWith(`${KILL_N} agents`) ? <span style={{ color: "var(--fg-dim)" }}>· their {KILL_N} puzzles went back in the queue · replacements starting · nothing lost</span> : null}
        </div>
      ) : null}
      <button type="button" onClick={kill} disabled={killing} style={{ position: "absolute", right: 48, bottom: 10, height: 26, padding: "0 12px", borderRadius: 7, background: "transparent", border: "1px dashed #3a3a3a", color: "var(--fg-dimmer)", fontSize: 12, cursor: "pointer" }}>
        {killing ? "stopping" : `Simulate failure: stop ${KILL_N} agents`}
      </button>

      {openKey ? (
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }} onClick={close}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 1480, height: 1010, border: "1px solid #262626", borderRadius: 18, background: "#0a0a0a", padding: "30px 36px", boxShadow: "0 30px 80px rgba(0,0,0,.8)", overflow: "hidden" }}>
            <Expanded card={openCard} unit={openUnit} control={controls[openKey]} task={openTaskId ? task.data : null} onClose={close} contextAvg={totals?.contextLast20Avg ?? null} />
          </div>
        </div>
      ) : null}
    </main>
  );
}

export default function StagePage() {
  return (
    <Suspense fallback={null}>
      <Stage />
    </Suspense>
  );
}
