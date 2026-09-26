// The status chip and the card tones, straight from the mockup's ST map.

import { STATUS_LABEL } from "../lib/cards.ts";
import type { CardStatus } from "../lib/types.ts";

export type Tone = { chipC: string; chipBd: string; dot: string; bd: string; bg: string; pulse: boolean };

export const TONES: Record<CardStatus, Tone> = {
  solved: { chipC: "#6fbf8e", chipBd: "#1d3527", dot: "#4a8f67", bd: "#1d3527", bg: "#08120c", pulse: false },
  working: { chipC: "#a1a1a1", chipBd: "#262626", dot: "#5b7cfa", bd: "#1f1f1f", bg: "#0a0a0a", pulse: true },
  resumed: { chipC: "#a1a1a1", chipBd: "#262626", dot: "#5b7cfa", bd: "#1f1f1f", bg: "#0a0a0a", pulse: true },
  retrying: { chipC: "#d9b45a", chipBd: "#3a2f14", dot: "#c29a3a", bd: "#2e2612", bg: "#0d0b05", pulse: false },
  merged: { chipC: "#5fb8b3", chipBd: "#16403e", dot: "#2f8f8a", bd: "#16403e", bg: "#061110", pulse: false },
  stopped: { chipC: "#f07178", chipBd: "#3a1a1b", dot: "#7a2e31", bd: "#3a1a1b", bg: "#120707", pulse: false },
  blocked: { chipC: "#f07178", chipBd: "#3a1a1b", dot: "#7a2e31", bd: "#3a1a1b", bg: "#120707", pulse: false },
};

export function Chip({ status, size = "sm" }: { status: CardStatus; size?: "sm" | "lg" }) {
  const t = TONES[status];
  const lg = size === "lg";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 7,
        height: lg ? 30 : 24,
        padding: lg ? "0 12px" : "0 10px",
        border: `1px solid ${t.chipBd}`,
        borderRadius: 999,
        fontSize: lg ? 14 : 12,
        color: t.chipC,
        whiteSpace: "nowrap",
      }}
    >
      <div className={t.pulse ? "pulse" : undefined} style={{ width: lg ? 8 : 7, height: lg ? 8 : 7, borderRadius: 2, background: t.dot }} />
      {STATUS_LABEL[status]}
    </div>
  );
}
