// The puzzle grid: one StatusCell per unit in a CSS grid that fills its
// container (both axes), so 400 cells never scroll at 1920x1080. The
// parent sets the size; `columns` sets the shape (25 x 16 by default).

import { StatusCell } from "./StatusCell.tsx";
import type { StageUnit } from "../lib/types.ts";

export type UnitGridProps = {
  units: StageUnit[];
  columns?: number; // default 25
  gap?: number; // px, default 2
  className?: string;
};

export function UnitGrid({ units, columns = 25, gap = 2, className }: UnitGridProps) {
  const rows = Math.max(1, Math.ceil(units.length / columns));
  return (
    <div
      className={className}
      data-testid="unit-grid"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
        gap,
        width: "100%",
        height: "100%",
        minHeight: 0,
        minWidth: 0,
      }}
    >
      {units.map((u) => (
        <StatusCell key={u.key} unit={u} />
      ))}
    </div>
  );
}
