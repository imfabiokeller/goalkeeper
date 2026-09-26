// The mockup's grid: a CSS grid of colored cells with a 1px #2a2a2a gap,
// the mockup's ARC palette, and an inset outline on cells that differ
// from `diff`. The cell size shrinks so any grid fits a `box` in pixels.

import type { CSSProperties } from "react";
import type { Grid } from "../lib/types.ts";

export const MOCK_PALETTE: readonly string[] = ["#07070d", "#5a5fe0", "#ec5a78", "#3fd0a4", "#f6c453", "#7c7f99", "#c65ae0", "#f58b4c", "#72d8f5", "#8a2f60"];

export function cellSize(grid: Grid, box: number, max: number): number {
  const rows = grid.length;
  const cols = rows ? Math.max(...grid.map((r) => r.length)) : 0;
  const n = Math.max(rows, cols, 1);
  return Math.max(2, Math.min(max, Math.floor((box - 2 - (n - 1)) / n)));
}

export function Cells({ grid, diff = null, box = 109, max = 17, style }: { grid: Grid; diff?: Grid | null; box?: number; max?: number; style?: CSSProperties }) {
  const size = cellSize(diff && diff.length > grid.length ? diff : grid, box, max);
  const cols = grid.length ? Math.max(...grid.map((r) => r.length)) : 0;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, ${size}px)`,
        gap: 1,
        padding: 1,
        background: "#2a2a2a",
        borderRadius: 3,
        justifySelf: "start",
        width: "max-content",
        ...style,
      }}
    >
      {grid.flatMap((row, y) =>
        row.map((v, x) => {
          const differs = diff ? diff[y]?.[x] !== v : false;
          return (
            <div
              key={`${y}-${x}`}
              style={{
                width: size,
                height: size,
                background: MOCK_PALETTE[v] ?? "#ff00ff",
                boxShadow: differs ? `inset 0 0 0 ${size >= 8 ? 2 : 1}px #ededed` : undefined,
              }}
            />
          );
        }),
      )}
    </div>
  );
}

// The dashed placeholder where a grid would be.
export function NoGrid({ box = 109, text = "no program yet", fontSize = 11 }: { box?: number; text?: string; fontSize?: number }) {
  return (
    <div
      style={{
        width: box,
        height: box,
        border: "1px dashed #333",
        borderRadius: 3,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        fontSize,
        lineHeight: 1.3,
        color: "var(--fg-dimmer)",
        padding: 6,
      }}
    >
      {text}
    </div>
  );
}

// A precedent thumbnail: a 6x6-ish sample of the puzzle on the dark tile.
export function Thumb({ grid, cell = 5, tone }: { grid: Grid | null | undefined; cell?: number; tone: string }) {
  const rows = grid?.slice(0, 6) ?? [];
  const cols = rows.length ? Math.min(6, Math.max(...rows.map((r) => r.length))) : 6;
  return (
    <div style={{ position: "relative", flexShrink: 0, padding: 4, borderRadius: 6, background: "#111118", boxShadow: `inset 0 0 0 1px ${tone}` }}>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, ${cell}px)`, gap: 1 }}>
        {(rows.length ? rows : Array.from({ length: 6 }, () => Array.from({ length: 6 }, () => 0))).flatMap((row, y) =>
          Array.from({ length: cols }, (_, x) => {
            const v = row[x] ?? 0;
            return <div key={`${y}-${x}`} style={{ width: cell, height: cell, borderRadius: 1, background: v === 0 ? "#1c1c24" : (MOCK_PALETTE[v] ?? "#1c1c24") }} />;
          }),
        )}
      </div>
    </div>
  );
}

export function Arrow({ width = 20 }: { width?: number }) {
  return (
    <svg width={width} height="14" viewBox={`0 0 ${width} 14`} fill="none" stroke="#555" strokeWidth="1.5">
      <path d={`M2 7h${width - 6}M${width - 9} 2l5 5-5 5`} />
    </svg>
  );
}

export function Dot({ state, size = 9 }: { state: "match" | "differ" | "none"; size?: number }) {
  const c = state === "match" ? "#4a8f67" : state === "differ" ? "#c29a3a" : "transparent";
  const b = state === "none" ? "#444444" : c;
  return <div style={{ width: size, height: size, borderRadius: "50%", background: c, boxShadow: `inset 0 0 0 1px ${b}`, flexShrink: 0 }} />;
}
