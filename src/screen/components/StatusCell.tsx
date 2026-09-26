// One puzzle cell: status colored, pulsing while held by a worker, hover
// title with key, status, attempt, last reason and the rule when merged.
// Pure: everything comes in as props.

import Link from "next/link";
import { TONE_VAR, unitTone } from "../lib/status.ts";
import type { StageUnit } from "../lib/types.ts";

export type StatusCellProps = {
  unit: StageUnit;
  href?: string | null; // default /unit/[key]; null renders a plain div
  size?: number | string; // css size, default 100% (the grid decides)
};

export function cellTitle(u: StageUnit): string {
  const parts = [`${u.key} ${u.status}`];
  if (u.attempt !== null) parts.push(`attempt ${u.attempt}${u.step !== null ? ` step ${u.step}` : ""}`);
  if (u.hint) parts.push(`hint: ${u.hint}`);
  if (u.reason) parts.push(`reason: ${u.reason}`);
  if (u.rule) parts.push(`rule: ${u.rule}`);
  return parts.join("\n");
}

export function StatusCell({ unit, href, size = "100%" }: StatusCellProps) {
  const tone = unitTone(unit);
  const pulse = unit.status === "claimed";
  const style = { display: "block", width: size, height: size, background: TONE_VAR[tone], borderRadius: 1 } as const;
  const title = cellTitle(unit);
  const className = pulse ? "cell pulse" : "cell";
  if (href === null) return <div className={className} title={title} style={style} data-key={unit.key} data-tone={tone} />;
  return <Link href={href ?? `/unit/${unit.key}`} className={className} title={title} style={style} data-key={unit.key} data-tone={tone} aria-label={title} />;
}
