"use client";

// The puzzle page: the expanded card on its own, for laptops and links.
// Same component as the stage overlay, polling the same routes.

import { useParams } from "next/navigation";
import { Expanded } from "../../../components/Expanded.tsx";
import type { ControlResult } from "../../../lib/cards.ts";
import { usePoll } from "../../../lib/poll.ts";
import type { TaskPayload, UnitPayload } from "../../../lib/types.ts";

const UNIT_POLL_MS = 3000;

export default function UnitPage() {
  const { key } = useParams<{ key: string }>();
  const unit = usePoll<UnitPayload>(`/api/unit/${key}`, UNIT_POLL_MS);
  const control = usePoll<ControlResult>(`/api/baseline?key=${key}`, 30_000);
  const taskId = unit.data?.tasks.at(-1)?.id ?? null;
  const task = usePoll<TaskPayload>(taskId ? `/api/task/${taskId}` : "/api/baseline", 10_000);
  // A 404 on the control route reads "not tried"; anything else not yet fetched.
  const ctrl: ControlResult | undefined = control.error?.startsWith("404") ? null : control.data === null && control.at ? null : (control.data ?? undefined);

  return (
    <main style={{ minHeight: "100vh", background: "#000", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 24 }}>
      <div style={{ width: 1480, minHeight: 1010, border: "1px solid #262626", borderRadius: 18, background: "#0a0a0a", padding: "30px 36px" }}>
        {unit.error && !unit.data ? (
          <div style={{ color: "var(--status-blocked)" }}>
            {key}: {unit.error}
          </div>
        ) : (
          <Expanded card={null} unit={unit.data} control={ctrl} task={taskId ? task.data : null} contextAvg={null} />
        )}
      </div>
    </main>
  );
}
