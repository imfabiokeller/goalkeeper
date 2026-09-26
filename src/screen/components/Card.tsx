"use client";

// One puzzle card on the stage, the mockup's card: header (key, attempt,
// chip), example / expected / agent's try for the shown pair, pair dots
// and the note, the lessons panel, the footer line and step.

import { ATTEMPTS_MAX, agentName, controlLine, footerLine, noteColor, noteLine, pairVerdicts, precedentKind, shownPair, stepLabel, type ControlResult } from "../lib/cards.ts";
import type { Precedent, StageCard, UnitPayload } from "../lib/types.ts";
import { Arrow, Cells, Dot, NoGrid, Thumb } from "./Cells.tsx";
import { Chip, TONES } from "./Chip.tsx";

const LABEL: React.CSSProperties = { fontSize: 11, color: "var(--fg-dimmer)" };

export function lessonsTitle(card: StageCard, precedents: Precedent[]): { title: string; note: string; arriving: boolean } {
  if (card.status === "stopped") return { title: "Its lessons stay in the library", note: "the next agent reads them again", arriving: false };
  if (card.status === "retrying") return { title: "Carrying forward what went wrong", note: "for the next agent", arriving: false };
  if (!precedents.length && (card.status === "working" || card.status === "resumed")) return { title: "Pulling lessons from the library…", note: "from other agents", arriving: true };
  if (!precedents.length) return { title: "Lessons pulled from the library", note: "none for this puzzle", arriving: false };
  return { title: "Lessons pulled from the library", note: "from other agents", arriving: false };
}

export function Card({ card, unit, control, onOpen, flash }: { card: StageCard; unit: UnitPayload | null; control: ControlResult | undefined; onOpen: () => void; flash: "solved" | "retry" | null }) {
  const t = TONES[card.status];
  const pairs = unit ? pairVerdicts(unit.train, unit.latest?.actual) : [];
  const show = pairs[shownPair(pairs)] ?? null;
  const precedents = unit?.latest?.precedents ?? [];
  const lessons = lessonsTitle(card, precedents);
  // A retrying card carries its own failed tries first: the refuted rules.
  const own = card.status === "retrying" ? (unit?.latest?.refutedRules ?? []).slice(0, 3) : [];
  const tiles: Array<{ grid: Precedent["thumb"]; worked: boolean; kind: string; from: string }> = [
    ...own.map((r, j) => ({ grid: show?.expected ?? null, worked: false, kind: "dead end", from: `its try ${Math.max(1, card.attempt - 1 - j)}` })),
    ...precedents.slice(0, Math.max(0, 3 - own.length)).map((p) => {
      const k = precedentKind(p);
      return { grid: p.thumb ?? null, worked: k === "worked", kind: k, from: agentName(p.worker) };
    }),
  ].slice(0, 3);
  const foot = footerLine(card, pairs);
  const ctrl = controlLine(control, pairs.length);
  const cls = flash === "solved" ? "solvedflash" : flash === "retry" ? "retryflash" : undefined;

  return (
    <button
      type="button"
      className={cls}
      onClick={onOpen}
      style={{
        textAlign: "left",
        border: `1px solid ${t.bd}`,
        borderRadius: 14,
        background: t.bg,
        padding: "16px 20px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: 10,
        color: "var(--fg)",
        cursor: "pointer",
        minHeight: 0,
        minWidth: 0,
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: 16 }}>{card.key}</span>
          <span style={{ fontSize: 13, color: "var(--fg-dimmer)" }}>
            attempt <span style={{ color: card.status === "retrying" ? "#d9b45a" : "#8f8f8f" }}>{card.attempt}</span>
            {card.attempt <= ATTEMPTS_MAX ? ` of ${ATTEMPTS_MAX}` : ""}
          </span>
        </div>
        <Chip status={card.status} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 20px 1fr 1fr", gap: 10, alignItems: "end" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={LABEL}>example</span>
          {show ? <Cells grid={show.input} /> : <NoGrid text="" />}
        </div>
        <div style={{ marginBottom: 48 }}>
          <Arrow />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={LABEL}>expected</span>
          {show ? <Cells grid={show.expected} /> : <NoGrid text="" />}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={LABEL}>agent’s try</span>
          {show?.actual ? <Cells grid={show.actual} diff={show.expected} /> : <NoGrid text={card.status === "stopped" ? "stopped" : "no program yet"} />}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          {pairs.map((p, i) => (
            <Dot key={i} state={p.state} />
          ))}
        </div>
        <span style={{ fontSize: 14, color: noteColor(card.status), whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{unit ? noteLine(card, pairs) : "loading"}</span>
        {ctrl ? (
          <span style={{ marginLeft: "auto", flexShrink: 0, display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--fg-dimmer)", whiteSpace: "nowrap" }}>
            <span style={{ width: 12, borderTop: "1.5px dashed #6b6b6b" }} />
            {ctrl}
          </span>
        ) : null}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "14px 14px 12px", borderRadius: 10, background: "#070707", border: "1px solid #161616" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: 13, color: "#e6e6e6" }}>{lessons.title}</span>
          <span style={{ fontSize: 12, color: "var(--fg-dimmer)" }}>{lessons.note}</span>
        </div>
        <div style={{ display: "flex", gap: 12, minHeight: 30 }}>
          {tiles.map((l, j) => (
            <div key={j} className={lessons.arriving ? "arrive" : undefined} style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 9, animationDelay: `${j * 0.6}s` }}>
              <Thumb grid={l.grid} tone={l.worked ? "#1d3527" : "#2e2612"} />
              <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0, overflow: "hidden" }}>
                <span style={{ fontSize: 12, color: l.worked ? "#6fbf8e" : "#d9b45a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.kind}</span>
                <span style={{ fontSize: 12, color: "var(--fg-dimmer)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.from}</span>
              </div>
            </div>
          ))}
          {!tiles.length && lessons.arriving
            ? [0, 1, 2].map((j) => (
                <div key={j} className="arrive" style={{ flex: 1, display: "flex", alignItems: "center", gap: 9, animationDelay: `${j * 0.6}s` }}>
                  <Thumb grid={null} tone="#1c1c22" />
                  <span style={{ fontSize: 12, color: "var(--fg-dimmer)" }}>searching</span>
                </div>
              ))
            : null}
          {!tiles.length && !lessons.arriving ? <span style={{ fontSize: 12, color: "var(--fg-dimmer)" }}>{card.status === "retrying" ? "no rule was tried yet" : "this agent wrote from the puzzle alone"}</span> : null}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, gap: 12 }}>
        <span style={{ color: foot.color, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{foot.text}</span>
        <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--fg-dimmer)", flexShrink: 0 }}>{stepLabel(card)}</span>
      </div>
    </button>
  );
}
