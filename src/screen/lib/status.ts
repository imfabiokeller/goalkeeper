// Status to color: the brief's tones, each one a CSS custom property in
// lib/theme.css. A unit's tone is derived from its status plus what the
// latest task says (a reopened or retried unit is amber, not grey).

import type { StageUnit, UnitStatus } from "./types.ts";

export type Tone = "open" | "working" | "merged" | "solved" | "retrying" | "blocked" | "dead" | "parked";

export const TONE_VAR: Record<Tone, string> = {
  open: "var(--status-open)",
  working: "var(--status-working)",
  merged: "var(--status-merged)",
  solved: "var(--status-solved)",
  retrying: "var(--status-retrying)",
  blocked: "var(--status-blocked)",
  dead: "var(--status-dead)",
  parked: "var(--status-parked)",
};

export function statusTone(status: UnitStatus, attempt: number | null = null, hint: string | null = null): Tone {
  switch (status) {
    case "solved":
      return "solved";
    case "merged":
      return "merged";
    case "claimed":
      return "working";
    case "blocked":
      return "blocked";
    case "parked":
      return "parked";
    case "open":
      return hint || (attempt ?? 0) > 1 ? "retrying" : "open";
    default:
      return "open";
  }
}

export function unitTone(u: Pick<StageUnit, "status" | "attempt" | "hint">): Tone {
  return statusTone(u.status, u.attempt, u.hint);
}

// Feed outcomes to a tone; unknown outcomes fall back to plain text color.
export function outcomeTone(outcome: string): Tone | null {
  switch (outcome) {
    case "pass":
    case "merged":
    case "submit":
      return "merged";
    case "solved":
      return "solved";
    case "claimed":
      return "working";
    case "fail":
    case "retrying":
    case "too specific":
    case "reopened":
    case "requeued":
      return "retrying";
    case "block":
    case "blocked":
    case "error":
      return "blocked";
    default:
      return null;
  }
}
