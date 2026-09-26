"use client";

// The library as a timeline (docs/mockups/library/Library-Timeline): the
// library's size against what one agent reads, solve rate against library
// tokens with the control as a dashed line, tokens per solve, then every
// solve as a tile in its ten-minute bucket. Click a tile: arcs to the
// later puzzles that read one of its records, and the panel shows where
// its tokens went, what it read and who read its lesson. The whole
// library on the right: kind chips and the newest records. Polls every
// 5 s; the selected key lives in the URL (?sel=key).

import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { ARC_PALETTE } from "../../lib/arc.tsx";
import type { BaselinePayload } from "../../lib/baseline.ts";
import { bucketFinished } from "../../lib/curve.ts";
import { agentLabel, compact, hhmm, pct } from "../../lib/format.ts";
import { usePoll } from "../../lib/poll.ts";
import type { Grid, LibraryPayload, LibraryRow, LibraryRowKind, SolvePayload } from "../../lib/types.ts";
import { useSize } from "../../lib/useSize.ts";

const LIBRARY_POLL_MS = 5000;
const BASELINE_POLL_MS = 60_000;
const FONTS = "https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap";
const BUCKET_MS = 10 * 60_000;
const PLOT_H = 236;
const MONO = "var(--gk-mono)";

const K: Record<LibraryRowKind, string> = { worked: "#4a8f67", dead: "#c29a3a", gate: "#6b6b6b", run: "#3a3a3a", planner: "#9d8cf5", error: "#7a2e31" };
const GREEN = "#6fbf8e";
const GREY = "#6b6b6b";

type Filter = "all" | "worked" | "dead" | "gate" | "run";

function kfmt(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(Math.round(n));
}

// A tiny grid as pixels: the tile and the panel's thumbnail.
function Pixels({ grid, cell, size, radius = 3 }: { grid: Grid | null; cell: number; size: number; radius?: number }) {
  const rows = grid?.length ?? 0;
  const cols = grid?.[0]?.length ?? 0;
  const pad = Math.max(0, Math.round((size - Math.max(rows, cols) * cell) / 2));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block", borderRadius: radius, background: "#10141a" }} aria-hidden>
      {grid?.map((row, y) => row.map((v, x) => (v ? <rect key={`${x}-${y}`} x={pad + x * cell} y={pad + y * cell} width={cell} height={cell} fill={ARC_PALETTE[v] ?? "#fff"} /> : null)))}
    </svg>
  );
}

function Panel({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ border: "1px solid #1f1f1f", borderRadius: 14, background: "#0a0a0a", display: "flex", flexDirection: "column", minWidth: 0, ...style }}>{children}</div>;
}

// Solve rate against library tokens; the control as a flat dashed line.
function RateChart({ d, base }: { d: LibraryPayload | null; base: BaselinePayload }) {
  const pts = (d?.solveRate ?? []).filter((b) => bucketFinished(b) > 0).map((b) => ({ x: b.tokens, y: b.solved / bucketFinished(b) }));
  const last = pts.at(-1);
  const baseRate = base ? (base.solveRateAt2 ?? base.solveRate) : null;
  const w = 580;
  const h = 72;
  const maxX = Math.max(1, ...pts.map((p) => p.x));
  const maxY = Math.max(0.05, ...pts.map((p) => p.y), baseRate ?? 0) * 1.15;
  const X = (x: number) => (x / maxX) * w;
  const Y = (y: number) => h - (y / maxY) * h;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => compact(f * maxX, f === 0 ? 0 : 1));
  return (
    <Panel style={{ padding: "16px 22px 10px", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span style={{ fontFamily: MONO, fontSize: 24, lineHeight: 1, color: GREEN }}>{last ? pct(last.y) : "-"}</span>
          <span style={{ fontSize: 14, color: "#a1a1a1" }}>solved</span>
          {baseRate === null ? (
            <span style={{ fontSize: 13, color: "#8f8f8f", marginLeft: 8 }}>no control run yet</span>
          ) : (
            <>
              <span style={{ fontFamily: MONO, fontSize: 17, color: "#8f8f8f", marginLeft: 8 }}>{pct(baseRate)}</span>
              <span style={{ fontSize: 13, color: "#8f8f8f" }}>baseline, no library</span>
            </>
          )}
        </div>
        <span style={{ fontSize: 12, color: "#8f8f8f" }}>vs library tokens</span>
      </div>
      <div style={{ position: "relative", flex: 1, borderBottom: "1px solid #333", minHeight: h }}>
        <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ position: "absolute", left: 0, bottom: 0, overflow: "visible" }} role="img" aria-label="solve rate against library tokens">
          {baseRate !== null ? <line x1={0} x2={w} y1={Y(baseRate)} y2={Y(baseRate)} stroke="#8f8f8f" strokeWidth={1.8} strokeDasharray="5 4" vectorEffect="non-scaling-stroke" /> : null}
          {pts.length > 1 ? <polyline points={pts.map((p) => `${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join(" ")} fill="none" stroke={GREEN} strokeWidth={2.5} strokeLinejoin="round" vectorEffect="non-scaling-stroke" /> : null}
          {last ? <circle cx={X(last.x)} cy={Y(last.y)} r={3} fill={GREEN} /> : null}
        </svg>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 11, color: "#6b6b6b" }}>
        {ticks.map((t, i) => (
          <span key={i}>{t}</span>
        ))}
      </div>
    </Panel>
  );
}

// Library tokens up to each bucket over the solves so far.
function PerSolveChart({ d }: { d: LibraryPayload | null }) {
  const pts = (d?.solveRate ?? []).filter((b) => b.solved > 0).map((b) => ({ at: b.bucket, v: b.tokens / b.solved }));
  const first = pts[0];
  const last = pts.at(-1);
  const falls = first && last && pts.length > 1 && last.v < first.v * 0.98;
  const w = 470;
  const h = 72;
  const max = Math.max(1, ...pts.map((p) => p.v));
  const min = Math.min(max, ...pts.map((p) => p.v));
  const span = Math.max(1, max - min) * 1.3;
  const X = (i: number) => (pts.length > 1 ? (i / (pts.length - 1)) * w : 0);
  const Y = (v: number) => h - ((v - min + span * 0.1) / span) * h;
  const labels = pts.length ? [pts[0], pts[Math.floor((pts.length - 1) / 3)], pts[Math.floor(((pts.length - 1) * 2) / 3)], pts[pts.length - 1]] : [];
  return (
    <Panel style={{ padding: "16px 22px 10px", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span style={{ fontFamily: MONO, fontSize: 24, lineHeight: 1 }}>{last ? compact(last.v, 0) : "-"}</span>
          <span style={{ fontSize: 14, color: "#a1a1a1" }}>tokens per solve</span>
          {first && last && first !== last ? <span style={{ fontFamily: MONO, fontSize: 15, color: "#8f8f8f", marginLeft: 8 }}>was {compact(first.v, 0)}</span> : null}
        </div>
        <span style={{ fontSize: 12, color: falls ? GREEN : "#8f8f8f" }}>{falls ? "cheaper as it learns" : "per solve"}</span>
      </div>
      <div style={{ position: "relative", flex: 1, borderBottom: "1px solid #333", minHeight: h }}>
        <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ position: "absolute", left: 0, bottom: 0, overflow: "visible" }} role="img" aria-label="tokens per solve over time">
          {pts.length > 1 ? <polyline points={pts.map((p, i) => `${X(i).toFixed(1)},${Y(p.v).toFixed(1)}`).join(" ")} fill="none" stroke="#ededed" strokeWidth={2.5} strokeLinejoin="round" vectorEffect="non-scaling-stroke" /> : null}
          {last ? <circle cx={X(pts.length - 1)} cy={Y(last.v)} r={3} fill="#ededed" /> : null}
        </svg>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 11, color: "#6b6b6b" }}>
        {labels.map((p, i) => (
          <span key={i}>{hhmm(p.at)}</span>
        ))}
      </div>
    </Panel>
  );
}

type Tile = { key: string; x: number; y: number; at: number; thumb: Grid | null };

// Every solve in its ten-minute bucket from the run's start to now. Tiles
// are 16 px like the mockup once the run is long; a short run with wide
// buckets gets bigger ones so the row reads from across the room.
function layoutTiles(solves: LibraryPayload["solves"], start: number, now: number, width: number): { tiles: Tile[]; buckets: number; tile: number } {
  const buckets = Math.max(6, Math.ceil((now - start) / BUCKET_MS) + 1);
  const colW = width / buckets;
  const tile = buckets <= 12 ? 24 : buckets <= 24 ? 20 : 16;
  const pitch = tile + 2;
  const perCol = Math.max(1, Math.floor((colW - 2) / pitch));
  const fill: number[] = new Array(buckets).fill(0);
  const tiles = solves.map((s) => {
    const at = new Date(s.at).getTime();
    const b = Math.min(buckets - 1, Math.max(0, Math.floor((at - start) / BUCKET_MS)));
    const i = fill[b]++;
    return { key: s.key, at, thumb: s.thumb, x: Math.round(b * colW + 1 + (i % perCol) * pitch), y: PLOT_H - pitch - Math.floor(i / perCol) * pitch };
  });
  return { tiles, buckets, tile };
}

function hourTicks(start: number, now: number, width: number): Array<{ t: string; x: number }> {
  const span = now - start;
  const step = span <= 2 * 3600_000 ? 15 * 60_000 : span <= 6 * 3600_000 ? 30 * 60_000 : 3600_000;
  const first = Math.ceil(start / step) * step;
  const out: Array<{ t: string; x: number }> = [];
  for (let t = first; t <= now + step; t += step) out.push({ t: hhmm(t), x: Math.round(((t - start) / (span || 1)) * width) });
  return out.filter((h) => h.x <= width);
}

function Timeline({ d, sel, solve, onPick }: { d: LibraryPayload | null; sel: string | null; solve: SolvePayload | null; onPick: (key: string) => void }) {
  const { ref, width } = useSize<HTMLDivElement>();
  const now = d ? new Date(d.at).getTime() : Date.now();
  const start = d?.runStart ? new Date(d.runStart).getTime() : now - 3600_000;
  const plotW = Math.max(300, width);
  const { tiles, buckets, tile: TILE } = useMemo(() => layoutTiles(d?.solves ?? [], start, now, plotW), [d?.solves, start, now, plotW]);
  const byKey = new Map(tiles.map((t) => [t.key, t]));
  const selected = sel ? byKey.get(sel) : undefined;
  const targets = new Map<string, boolean>();
  for (const u of solve?.used ?? []) if (solve && solve.key === sel) targets.set(u.key, u.solved);
  const arcs: Array<{ d: string; c: string; end: [number, number] | null }> = [];
  if (selected && solve && solve.key === sel) {
    const x0 = selected.x + TILE / 2;
    const y0 = selected.y;
    for (const u of solve.used) {
      const t = byKey.get(u.key);
      const x1 = t ? t.x + TILE / 2 : Math.round(((new Date(u.at).getTime() - start) / (now - start || 1)) * plotW);
      const y1 = t ? t.y : PLOT_H;
      const top = Math.max(6, Math.min(y0, y1) - 30 - Math.abs(x1 - x0) * 0.12);
      arcs.push({ d: `M${x0} ${y0} C ${x0} ${top.toFixed(0)}, ${x1} ${top.toFixed(0)}, ${x1} ${y1}`, c: u.solved ? GREEN : GREY, end: t ? null : [x1, y1] });
    }
  }
  const ticks = hourTicks(start, now, plotW);
  const open = d?.notSolved ?? 0;
  const openCols = 16;
  return (
    <Panel style={{ height: 300, flexShrink: 0, padding: "16px 24px", boxSizing: "border-box", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: 15, color: "#a1a1a1" }}>
          every solve, when it happened · click one{d ? <span style={{ color: "#6b6b6b" }}> · {d.solves.length} solved · one column per 10 min</span> : null}
        </span>
        <div style={{ display: "flex", gap: 18, fontSize: 13, color: "#a1a1a1" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ width: 18, height: 2, background: GREEN }} />
            its lesson helped solve
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ width: 18, height: 2, background: GREY }} />
            read, not solved yet
          </span>
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", gap: 32, minHeight: 0 }}>
        <div ref={ref} style={{ position: "relative", flex: 1, height: PLOT_H + 30, minWidth: 0 }}>
          <div style={{ position: "absolute", left: 0, right: 0, top: PLOT_H, height: 1, background: "#333" }} />
          {ticks.map((h) => (
            <span key={h.x} style={{ position: "absolute", left: h.x, top: PLOT_H + 8, transform: "translateX(-50%)", fontFamily: MONO, fontSize: 12, color: "#8f8f8f" }}>
              {h.t}
            </span>
          ))}
          {tiles.map((t) => {
            const isSel = t.key === sel;
            const tg = targets.get(t.key);
            const ring = isSel ? "0 0 0 2px #ededed" : tg === true ? `0 0 0 2px ${GREEN}` : tg === false ? `0 0 0 2px ${GREY}` : "inset 0 0 0 1px #1d3527";
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => onPick(t.key)}
                aria-label={t.key}
                title={`${t.key} · ${hhmm(t.at)}`}
                style={{ position: "absolute", left: t.x, top: t.y, width: TILE, height: TILE, padding: 0, border: 0, borderRadius: 3, background: "#10141a", boxShadow: ring, opacity: isSel || tg !== undefined || !sel ? 1 : 0.75, cursor: "pointer", overflow: "hidden" }}
              >
                <Pixels grid={t.thumb} cell={Math.floor(TILE / 7)} size={TILE} />
              </button>
            );
          })}
          <svg width={plotW} height={PLOT_H} viewBox={`0 0 ${plotW} ${PLOT_H}`} style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none", overflow: "visible" }} aria-hidden>
            {arcs.map((a, i) => (
              <g key={i}>
                <path d={a.d} fill="none" stroke={a.c} strokeWidth={2} strokeOpacity={0.85} />
                {a.end ? <circle cx={a.end[0]} cy={a.end[1]} r={3} fill={a.c} /> : null}
              </g>
            ))}
          </svg>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, justifyContent: "flex-end", paddingBottom: 30, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontFamily: MONO, fontSize: 22 }}>{d ? open : "-"}</span>
            <span style={{ fontSize: 13, color: "#8f8f8f" }}>not solved yet</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${openCols}, 8px)`, gap: 2, maxHeight: 190, overflow: "hidden" }}>
            {Array.from({ length: Math.min(open, openCols * 19) }, (_, i) => (
              <div key={i} style={{ width: 8, height: 8, borderRadius: 2, background: "#1a1a1e" }} />
            ))}
          </div>
        </div>
      </div>
    </Panel>
  );
}

function Stage({ v, k }: { v: string; k: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 1, padding: "6px 10px", borderRadius: 8, background: "#111" }}>
        <span style={{ fontFamily: MONO, fontSize: 15, lineHeight: 1 }}>{v}</span>
        <span style={{ fontSize: 11, color: "#8f8f8f", whiteSpace: "nowrap" }}>{k}</span>
      </div>
      <svg width="12" height="10" viewBox="0 0 12 10" fill="none" stroke="#444" strokeWidth="1.4" aria-hidden>
        <path d="M1 5h8M6 2l3 3-3 3" />
      </svg>
    </div>
  );
}

function SolvePanel({ s, loading, onPick }: { s: SolvePayload | null; loading: boolean; onPick: (key: string) => void }) {
  const [openAttempt, setOpenAttempt] = useState<number | null>(null);
  if (!s) {
    return (
      <Panel style={{ padding: "22px 26px", justifyContent: "center", alignItems: "center", color: "#8f8f8f", fontSize: 14 }}>
        {loading ? "loading the solve…" : "click a solve on the timeline"}
      </Panel>
    );
  }
  return (
    <Panel style={{ padding: "22px 26px", gap: 18, overflow: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <Pixels grid={s.thumb} cell={s.thumb ? Math.max(2, Math.floor(56 / Math.max(s.thumb.length, s.thumb[0]?.length ?? 1))) : 8} size={60} radius={8} />
        <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <Link href={`/unit/${s.key}`} style={{ fontFamily: MONO, fontSize: 22 }}>
              {s.key}
            </Link>
            <span style={{ fontSize: 14, color: GREEN }}>
              solved {hhmm(s.at)} · {agentLabel(s.who)}
            </span>
          </div>
          <span title={s.rule ?? ""} style={{ fontSize: 17, color: "#ededed", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {s.rule ? `“${s.rule}”` : <span style={{ color: "#8f8f8f" }}>no rule stored</span>}
          </span>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 24, flexShrink: 0 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "flex-end" }}>
            <span style={{ fontFamily: MONO, fontSize: 24, lineHeight: 1 }}>{kfmt(s.total)}</span>
            <span style={{ fontSize: 12, color: "#8f8f8f" }}>tokens to solve</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "flex-end" }}>
            <span style={{ fontFamily: MONO, fontSize: 24, lineHeight: 1 }}>{s.attempts.length}</span>
            <span style={{ fontSize: 12, color: "#8f8f8f" }}>attempts</span>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <span style={{ fontSize: 13, color: "#8f8f8f" }}>where the tokens went · click an attempt for what it read</span>
        {s.attempts.map((a) => {
          const open = openAttempt === a.n;
          return (
            <div key={a.n} style={{ border: `1px solid ${a.ok ? "#1d3527" : "#2e2612"}`, borderRadius: 10, background: "#050505" }}>
              <button
                type="button"
                onClick={() => setOpenAttempt(open ? null : a.n)}
                style={{ width: "100%", display: "grid", gridTemplateColumns: "150px 1fr 90px", gap: 16, alignItems: "center", padding: "10px 14px", border: 0, background: "transparent", color: "inherit", font: "inherit", textAlign: "left", cursor: "pointer" }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: 14 }}>
                    attempt {a.n} · {agentLabel(a.who)}
                  </span>
                  <span style={{ fontFamily: MONO, fontSize: 12, color: "#8f8f8f" }}>{hhmm(a.at)}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <Stage v={kfmt(a.read)} k="read" />
                  <Stage v={kfmt(a.write)} k="think + write" />
                  <Stage v={String(a.tests)} k={a.tests === 1 ? "test run" : "test runs"} />
                  <span title={a.outcome} style={{ fontSize: 13, color: a.ok ? GREEN : "#d9b45a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {a.outcome}
                  </span>
                </div>
                <span style={{ fontFamily: MONO, fontSize: 15, textAlign: "right" }}>{kfmt(a.total)}</span>
              </button>
              {open ? (
                <div style={{ padding: "0 14px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontSize: 12, color: "#8f8f8f" }}>
                    what it read · {kfmt(a.read)} tokens, built fresh · precedents are one slice of it
                    {a.taskId ? (
                      <>
                        {" · "}
                        <Link href={`/task/${a.taskId}`} style={{ color: "#a1a1a1", textDecoration: "underline", textDecorationColor: "#333" }}>
                          step by step
                        </Link>
                      </>
                    ) : null}
                  </span>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {a.sections.map((sec, i) => (
                      <span key={i} style={{ display: "flex", gap: 6, alignItems: "baseline", padding: "4px 8px", borderRadius: 6, background: "#111", fontSize: 12, color: "#a1a1a1" }}>
                        {sec.label}
                        <span style={{ fontFamily: MONO, color: "#ededed" }}>{kfmt(sec.tokens)}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, flex: 1, minHeight: 0 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
          <span style={{ fontSize: 13, color: "#8f8f8f" }}>it read · from earlier puzzles</span>
          {s.read.length ? null : <span style={{ fontSize: 13, color: "#6b6b6b" }}>nothing cited</span>}
          {s.read.map((l) => (
            <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, background: "#050505", border: "1px solid #161616" }}>
              <span style={{ width: 7, height: 7, borderRadius: 2, flexShrink: 0, background: K[l.kind] }} />
              <span title={l.gist} style={{ fontSize: 13, color: l.kind === "worked" ? "#ededed" : "#a1a1a1", textDecoration: l.kind === "dead" ? "line-through" : "none", textDecorationColor: "#6b5a2a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {l.gist}
              </span>
              {l.key && !l.own ? (
                <button type="button" onClick={() => onPick(l.key!)} style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 12, color: "#a1a1a1", background: "transparent", border: 0, padding: 0, cursor: "pointer", flexShrink: 0 }}>
                  {l.key}
                </button>
              ) : null}
              <span style={{ marginLeft: l.key && !l.own ? 0 : "auto", fontFamily: MONO, fontSize: 12, color: "#8f8f8f", flexShrink: 0 }}>{hhmm(l.at)}</span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
          <span style={{ fontSize: 13, color: "#8f8f8f" }}>its lesson was read by · later puzzles</span>
          {s.used.length ? null : <span style={{ fontSize: 13, color: "#6b6b6b" }}>nobody yet</span>}
          {s.used.map((u) => (
            <button
              key={u.key}
              type="button"
              onClick={() => (u.solved ? onPick(u.key) : undefined)}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, background: "#050505", border: "1px solid #161616", color: "inherit", font: "inherit", textAlign: "left", cursor: u.solved ? "pointer" : "default" }}
            >
              <span style={{ fontFamily: MONO, fontSize: 13 }}>{u.key}</span>
              <span style={{ fontFamily: MONO, fontSize: 12, color: "#8f8f8f" }}>{hhmm(u.at)}</span>
              <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: u.solved ? GREEN : "#a1a1a1" }}>
                <span style={{ width: 7, height: 7, borderRadius: 2, background: u.solved ? K.worked : "#5b7cfa" }} />
                {u.solved ? "solved" : "still trying"}
              </span>
            </button>
          ))}
        </div>
      </div>
    </Panel>
  );
}

const CHIPS: Array<{ id: Filter; t: string; c: string }> = [
  { id: "all", t: "all", c: "#ededed" },
  { id: "worked", t: "rules that worked", c: K.worked },
  { id: "dead", t: "dead ends", c: K.dead },
  { id: "gate", t: "gate verdicts", c: K.gate },
  { id: "run", t: "raw runs", c: K.run },
];

function rowMatches(r: LibraryRow, f: Filter): boolean {
  if (f === "all") return true;
  if (f === "gate") return r.kind === "gate" || r.kind === "dead";
  if (f === "run") return r.kind === "run" || r.kind === "worked";
  return r.kind === f;
}

function WholeLibrary({ d, solvedKeys, onPick, filter, setFilter }: { d: LibraryPayload | null; solvedKeys: Set<string>; onPick: (key: string) => void; filter: Filter; setFilter: (f: Filter) => void }) {
  const [q, setQ] = useState("");
  const rows = (d?.rows ?? []).filter((r) => rowMatches(r, filter) && (!q || `${r.key ?? ""} ${r.text}`.toLowerCase().includes(q.toLowerCase())));
  const counts = d?.kindCounts;
  return (
    <Panel style={{ padding: "22px 26px", gap: 14, overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: 17 }}>The whole library</span>
        <span style={{ fontFamily: MONO, fontSize: 13, color: "#8f8f8f" }}>{d ? `${d.entries.toLocaleString("en-US")} records · append-only` : ""}</span>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {CHIPS.map((k) => (
          <button
            key={k.id}
            type="button"
            onClick={() => setFilter(k.id)}
            style={{ height: 32, padding: "0 12px", borderRadius: 8, border: `1px solid ${filter === k.id ? "#555" : "#262626"}`, background: filter === k.id ? "#161616" : "transparent", color: "#ededed", fontSize: 13, display: "flex", alignItems: "center", gap: 8, cursor: "pointer", font: "inherit" }}
          >
            <span style={{ width: 7, height: 7, borderRadius: 2, background: k.c }} />
            {k.t}
            <span style={{ fontFamily: MONO, color: "#8f8f8f" }}>{counts ? counts[k.id].toLocaleString("en-US") : ""}</span>
          </button>
        ))}
      </div>
      <label style={{ height: 38, display: "flex", alignItems: "center", gap: 10, padding: "0 12px", border: "1px solid #262626", borderRadius: 8, background: "#050505", flexShrink: 0 }}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#8f8f8f" strokeWidth="1.6" aria-hidden>
          <circle cx="7" cy="7" r="4.5" />
          <path d="M10.5 10.5L14 14" />
        </svg>
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="search the newest records: rules, puzzles, agents" style={{ flex: 1, background: "transparent", border: 0, outline: "none", color: "#ededed", fontSize: 14, font: "inherit" }} />
      </label>
      <div style={{ display: "grid", gridTemplateColumns: "52px 20px 86px 1fr 56px", gap: 10, fontSize: 12, color: "#6b6b6b", padding: "0 4px" }}>
        <span>time</span>
        <span />
        <span>puzzle</span>
        <span>record</span>
        <span style={{ textAlign: "right" }}>tokens</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", overflow: "auto", minHeight: 0 }}>
        {rows.map((w) => {
          const solved = !!w.key && solvedKeys.has(w.key);
          return (
            <button
              key={w.id}
              type="button"
              onClick={() => (solved && w.key ? onPick(w.key) : undefined)}
              title={w.text}
              style={{ display: "grid", gridTemplateColumns: "52px 20px 86px 1fr 56px", gap: 10, alignItems: "center", height: 36, flexShrink: 0, padding: "0 4px", border: 0, borderBottom: "1px solid #141414", background: "transparent", color: "#ededed", textAlign: "left", cursor: solved ? "pointer" : "default", font: "inherit" }}
            >
              <span style={{ fontFamily: MONO, fontSize: 12, color: "#8f8f8f" }}>{hhmm(w.at)}</span>
              <span style={{ width: 7, height: 7, borderRadius: 2, background: K[w.kind] }} />
              <span style={{ fontFamily: MONO, fontSize: 12, color: solved ? "#ededed" : "#a1a1a1" }}>{w.key ?? ""}</span>
              <span style={{ fontSize: 13, color: w.kind === "worked" ? "#ededed" : w.kind === "dead" ? "#cdbd9c" : "#a1a1a1", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{w.text}</span>
              <span style={{ fontFamily: MONO, fontSize: 12, color: "#8f8f8f", textAlign: "right" }}>{kfmt(w.tokens)}</span>
            </button>
          );
        })}
        {d && !rows.length ? <span style={{ fontSize: 13, color: "#6b6b6b", padding: "8px 4px" }}>nothing in the newest {d.rows.length} records</span> : null}
      </div>
    </Panel>
  );
}

function selFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const v = new URLSearchParams(window.location.search).get("sel");
  return v && /^[a-z0-9_-]{1,64}$/i.test(v) ? v : null;
}

export default function LibraryPage() {
  // The rows filter is matched in the database (every record, not the newest 40).
  const [filter, setFilter] = useState<Filter>("all");
  const poll = usePoll<LibraryPayload>(filter === "all" ? "/api/library" : `/api/library?kind=${filter}`, LIBRARY_POLL_MS);
  const base = usePoll<BaselinePayload>("/api/baseline", BASELINE_POLL_MS);
  const d = poll.data;
  const [sel, setSel] = useState<string | null>(null);
  useEffect(() => {
    setSel(selFromUrl());
  }, []);
  // Default: the latest solve.
  useEffect(() => {
    if (!sel && d?.solves.length) setSel(d.solves[d.solves.length - 1].key);
  }, [d, sel]);
  const pick = (key: string) => {
    setSel(key);
    const url = new URL(window.location.href);
    url.searchParams.set("sel", key);
    window.history.replaceState(null, "", url);
  };
  // Before a key is selected the poll targets the library itself, so no request 404s.
  const solvePoll = usePoll<SolvePayload>(sel ? `/api/library/solve/${sel}` : "/api/library", LIBRARY_POLL_MS);
  const solve = sel && solvePoll.data?.key === sel ? solvePoll.data : null;
  const solvedKeys = useMemo(() => new Set((d?.solves ?? []).map((s) => s.key)), [d?.solves]);
  const readsFrac = d?.contextAvg && d.tokens ? Math.max(0.004, d.contextAvg / d.tokens) : 0;

  return (
    <main className="gk" style={{ padding: "32px 48px", minHeight: "100vh", height: "100vh", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 22, overflow: "hidden" }}>
      <link rel="stylesheet" href={FONTS} />
      <header style={{ height: 44, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <svg width="24" height="24" viewBox="0 0 22 22" fill="none" stroke="#ededed" strokeWidth="1.6" aria-hidden>
            <circle cx="11" cy="11" r="9" />
            <path d="M6 11h10" />
          </svg>
          <Link href="/" style={{ fontSize: 22, fontWeight: 600 }}>
            goalkeeper
          </Link>
          <span style={{ fontSize: 22, color: "#333" }}>/</span>
          <span style={{ fontSize: 20, color: "#a1a1a1" }}>Library</span>
          {poll.error ? <span className="gk-chip" style={{ color: "var(--gk-dead)", borderColor: "var(--gk-dead-bd)" }}>{poll.error}</span> : null}
        </div>
        <Link href="/" style={{ height: 40, display: "flex", alignItems: "center", gap: 8, padding: "0 16px", border: "1px solid #333", borderRadius: 10, fontSize: 15 }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#ededed" strokeWidth="1.6" aria-hidden>
            <path d="M12 8H4M7 5L4 8l3 3" />
          </svg>
          Puzzles
        </Link>
      </header>

      <div style={{ height: 150, flexShrink: 0, display: "grid", gridTemplateColumns: "1fr 1.2fr 1fr", gap: 20 }}>
        <Panel style={{ padding: "18px 22px", justifyContent: "center", gap: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontSize: 14, color: "#a1a1a1" }}>library · {d ? `${d.entries.toLocaleString("en-US")} records` : ""}</span>
              <span style={{ fontFamily: MONO, fontSize: 24, lineHeight: 1 }}>{d ? compact(d.tokens) : "-"}</span>
            </div>
            <div style={{ height: 12, borderRadius: 4, background: "#6a6a70" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontSize: 14, color: "#a1a1a1" }}>what one agent reads · last 20 runs</span>
              <span style={{ fontFamily: MONO, fontSize: 24, lineHeight: 1 }}>{d?.contextAvg ? compact(d.contextAvg, 0) : "-"}</span>
            </div>
            <div style={{ height: 12, borderRadius: 4, background: "#141414" }}>
              <div style={{ width: `max(3px, ${(readsFrac * 100).toFixed(2)}%)`, height: 12, borderRadius: 2, background: "#ededed" }} />
            </div>
          </div>
        </Panel>
        <RateChart d={d} base={base.data ?? null} />
        <PerSolveChart d={d} />
      </div>

      <Timeline d={d} sel={sel} solve={solve} onPick={pick} />

      <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: 20 }}>
        <SolvePanel s={solve} loading={!!sel && solvePoll.loading} onPick={pick} />
        <WholeLibrary d={d} solvedKeys={solvedKeys} onPick={pick} filter={filter} setFilter={setFilter} />
      </div>
    </main>
  );
}
