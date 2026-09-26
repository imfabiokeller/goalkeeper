// An example pair: input, arrow, expected output, and optionally the
// program's actual output with the differing cells outlined (or the error
// when the program threw). Test inputs pass `expected={null}`.

import { ArcGrid, diffCells } from "../lib/arc.tsx";
import type { ActualOutput, Grid } from "../lib/types.ts";

export type GridPairProps = {
  input: Grid;
  expected: Grid | null; // null for a test input (the answer is never shown)
  actual?: ActualOutput; // the latest attempt's program run on `input`
  cell?: number; // px per cell, default 12
  label?: string | null; // "example 1", "test 1"
};

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 11, color: "var(--fg-dim)", fontFamily: "var(--mono)" }}>{label}</span>
      {children}
    </div>
  );
}

export function GridPair({ input, expected, actual = null, cell = 12, label = null }: GridPairProps) {
  const diffs = actual && actual.ok && expected ? diffCells(actual.output, expected).length : null;
  return (
    <div className="grid-pair" style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
      {label ? <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--fg-dim)", minWidth: "5em" }}>{label}</span> : null}
      <Labeled label="input">
        <ArcGrid grid={input} cell={cell} title={`${label ?? "pair"} input`} />
      </Labeled>
      {expected ? (
        <>
          <span style={{ alignSelf: "center", color: "var(--fg-dim)" }} aria-hidden>
            →
          </span>
          <Labeled label="expected">
            <ArcGrid grid={expected} cell={cell} title={`${label ?? "pair"} expected output`} />
          </Labeled>
        </>
      ) : null}
      {actual ? (
        actual.ok ? (
          <Labeled label={diffs === null ? "actual" : diffs === 0 ? "actual: match" : `actual: ${diffs} cells differ`}>
            <ArcGrid grid={actual.output} cell={cell} diff={expected} title={`${label ?? "pair"} actual output`} />
          </Labeled>
        ) : (
          <Labeled label="actual">
            <span style={{ color: "var(--status-blocked)", fontFamily: "var(--mono)", fontSize: 12, maxWidth: 320 }}>{actual.error}</span>
          </Labeled>
        )
      ) : null}
    </div>
  );
}
