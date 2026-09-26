// The task page: one task, its worker-run source (raw, trimmed to the
// wire budget) and the next task on the same key.

import { ObjectId } from "mongodb";
import type { Collections } from "../../shared/db.ts";
import { trimRaw } from "./trim.ts";
import type { SourcePayload, TaskPayload } from "./types.ts";

export async function buildTask(c: Collections, id: string): Promise<TaskPayload | null> {
  if (!ObjectId.isValid(id)) return null;
  const _id = new ObjectId(id);
  const task = await c.tasks.findOne({ _id });
  if (!task) return null;

  const [run, next] = await Promise.all([
    c.sources.findOne(
      { taskId: _id, kind: "worker-run" },
      { sort: { createdAt: -1 }, projection: { raw: 1, tokens: 1, createdAt: 1, "enrichment.gist": 1, "enrichment.labels": 1 } },
    ),
    c.tasks.findOne(
      { key: task.key, createdAt: { $gt: task.createdAt } },
      { sort: { createdAt: 1 }, projection: { attempt: 1, status: 1, hint: 1, createdAt: 1 } },
    ),
  ]);

  const trimmed = run ? trimRaw(run.raw) : null;
  return {
    task: {
      id,
      key: task.key,
      criteria: task.criteria,
      version: task.version,
      status: task.status,
      priority: task.priority,
      attempt: task.attempt,
      worker: task.worker,
      heartbeat: task.heartbeat ? task.heartbeat.toISOString() : null,
      proposal: task.proposal ?? null,
      gate: task.gate,
      blockReason: task.blockReason,
      hint: task.hint,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    },
    run:
      run && trimmed
        ? {
            id: run._id.toHexString(),
            createdAt: run.createdAt.toISOString(),
            tokens: run.tokens,
            enrichment: run.enrichment ? { gist: run.enrichment.gist, labels: run.enrichment.labels ?? [] } : null,
            raw: trimmed.raw,
            truncated: trimmed.truncated,
          }
        : null,
    next: next
      ? { id: next._id.toHexString(), attempt: next.attempt, status: next.status, hint: next.hint, createdAt: next.createdAt.toISOString() }
      : null,
  };
}

export async function buildSource(c: Collections, id: string): Promise<SourcePayload | null> {
  if (!ObjectId.isValid(id)) return null;
  const s = await c.sources.findOne({ _id: new ObjectId(id) }, { projection: { "enrichment.embedding": 0 } });
  if (!s) return null;
  const trimmed = trimRaw(s.raw);
  return {
    id,
    kind: s.kind,
    taskId: s.taskId ? s.taskId.toHexString() : null,
    key: s.key,
    version: s.version,
    raw: trimmed.raw,
    text: s.text,
    enrichment: s.enrichment
      ? { gist: s.enrichment.gist, labels: s.enrichment.labels ?? [], entities: s.enrichment.entities ?? { keys: [], fields: [] } }
      : null,
    tokens: s.tokens,
    createdAt: s.createdAt.toISOString(),
    truncated: trimmed.truncated,
  };
}
