// The only way the goal changes: a human approves a question. Claim the
// question, bump the goal under a version precondition, reopen the blocked
// tasks that ran under the old version, leave an answer in the library.

import type { ObjectId } from "mongodb";
import type { Collections } from "../shared/db.ts";
import type { Goal, Question } from "../shared/types.ts";
import { writeSource } from "./sources.ts";

export type ApplyResult = { question: Question; version: number; reopened: number };

async function claimQuestion(
  c: Collections,
  questionId: ObjectId,
  status: "approved" | "rejected",
  by: string,
): Promise<Question | null> {
  return c.questions.findOneAndUpdate(
    { _id: questionId, status: "open" },
    { $set: { status, answeredBy: by, answeredAt: new Date() } },
    { returnDocument: "after" },
  );
}

async function bumpGoal(c: Collections, question: Question, by: string): Promise<Goal | null> {
  const goal = await c.goal.findOne({ _id: "goal" });
  if (!goal) throw new Error("no goal document");
  const next = goal.version + 1;
  return c.goal.findOneAndUpdate(
    { _id: "goal", version: goal.version },
    {
      $push: {
        guidelines: question.proposedDiff.text,
        history: { version: next, at: new Date(), by, diff: question.proposedDiff, questionId: question._id },
      },
      $inc: { version: 1 },
    },
    { returnDocument: "after" },
  );
}

export async function applyDiff(c: Collections, questionId: ObjectId, by: string): Promise<ApplyResult | null> {
  const question = await claimQuestion(c, questionId, "approved", by);
  if (!question) return null;

  // One retry on a lost version race, then give up loudly.
  const goal = (await bumpGoal(c, question, by)) ?? (await bumpGoal(c, question, by));
  if (!goal) throw new Error(`applyDiff ${questionId.toHexString()}: lost the goal version race twice`);

  const now = new Date();
  const r = await c.tasks.updateMany(
    { status: "blocked", version: { $lt: goal.version } },
    {
      $set: {
        status: "open",
        attempt: 1,
        blockReason: null,
        version: goal.version,
        worker: null,
        heartbeat: null,
        updatedAt: now,
      },
    },
  );

  await writeSource(
    c,
    "answer",
    { questionId, status: "approved", by, diff: question.proposedDiff, reopened: r.modifiedCount },
    {
      version: goal.version,
      text: `approved by ${by}: ${question.proposedDiff.text} (goal version ${goal.version}, ${r.modifiedCount} tasks reopened)`,
    },
  );
  return { question, version: goal.version, reopened: r.modifiedCount };
}

export async function rejectQuestion(c: Collections, questionId: ObjectId, by: string): Promise<Question | null> {
  const question = await claimQuestion(c, questionId, "rejected", by);
  if (!question) return null;
  const goal = await c.goal.findOne({ _id: "goal" }, { projection: { version: 1 } });
  await writeSource(
    c,
    "answer",
    { questionId, status: "rejected", by, diff: question.proposedDiff },
    { version: goal?.version ?? 0, text: `rejected by ${by}: ${question.proposedDiff.text}` },
  );
  return question;
}
