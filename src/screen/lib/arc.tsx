// The ARC grid renderer: a number[][] as an SVG with the standard ten-color
// palette, a cell size, and an optional `diff` grid whose differing cells
// get an outline. Server-safe: no hooks, no client state.

import type { CSSProperties } from "react";
import type { Grid } from "./types.ts";

export const ARC_PALETTE: readonly string[] = [
  "#000000", // 0 black
  "#0074D9", // 1 blue
  "#FF4136", // 2 red
  "#2ECC40", // 3 green
  "#FFDC00", // 4 yellow
  "#AAAAAA", // 5 grey
  "#F012BE", // 6 magenta
  "#FF851B", // 7 orange
  "#7FDBFF", // 8 light blue
  "#870C25", // 9 maroon
];

export const DIFF_OUTLINE = "#FFFFFF";
export const GRID_LINE = "#2a2f36";

export type ArcGridProps = {
  grid: Grid;
  cell?: number; // pixels per cell, default 12
  diff?: Grid | null; // cells that differ from this grid get an outline
  gap?: number; // grid line width in pixels, default 1
  title?: string;
  className?: string;
  style?: CSSProperties;
};

export function gridSize(grid: Grid): { rows: number; cols: number } {
  const rows = grid.length;
  const cols = rows ? Math.max(...grid.map((r) => r.length)) : 0;
  return { rows, cols };
}

// Cells where `a` and `b` differ, including cells outside the smaller grid.
export function diffCells(a: Grid, b: Grid): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  const rows = Math.max(a.length, b.length);
  for (let r = 0; r < rows; r++) {
    const ra = a[r] ?? [];
    const rb = b[r] ?? [];
    const cols = Math.max(ra.length, rb.length);
    for (let c = 0; c < cols; c++) if (ra[c] !== rb[c]) out.push([r, c]);
  }
  return out;
}

export function ArcGrid({ grid, cell = 12, diff = null, gap = 1, title, className, style }: ArcGridProps) {
  const { rows, cols } = gridSize(grid);
  const diffRows = diff ? Math.max(rows, diff.length) : rows;
  const diffCols = diff ? Math.max(cols, ...diff.map((r) => r.length), 0) : cols;
  const width = diffCols * cell + gap;
  const height = diffRows * cell + gap;
  const outlined = diff ? diffCells(grid, diff) : [];
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      style={{ display: "block", background: GRID_LINE, ...style }}
      role="img"
      aria-label={title ?? `${rows} by ${cols} grid`}
      shapeRendering="crispEdges"
    >
      {title ? <title>{title}</title> : null}
      {grid.map((row, r) =>
        row.map((v, c) => (
          <rect
            key={`${r}-${c}`}
            x={c * cell + gap}
            y={r * cell + gap}
            width={cell - gap}
            height={cell - gap}
            fill={ARC_PALETTE[v] ?? "#ff00ff"}
          />
        )),
      )}
      {outlined.map(([r, c]) => (
        <rect
          key={`d-${r}-${c}`}
          x={c * cell + gap / 2}
          y={r * cell + gap / 2}
          width={cell}
          height={cell}
          fill="none"
          stroke={DIFF_OUTLINE}
          strokeWidth={Math.max(1, gap)}
        />
      ))}
    </svg>
  );
}
