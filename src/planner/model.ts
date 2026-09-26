// The planner's only model access: one structured generateText call, no
// tools, no history. The model comes from shared/llm.ts, never from a
// provider package. Tokens are added to the accumulator the caller owns.

import { generateText, Output } from "ai";
import type { z } from "zod";
import { costUsd, enrichModel } from "../shared/llm.ts";
import type { Tokens } from "../shared/types.ts";
import { addTokens } from "./sources.ts";

export async function structured<S extends z.ZodType>(
  schema: S,
  prompt: string,
  tokens?: Tokens,
): Promise<z.infer<S>> {
  const result = await generateText({
    model: enrichModel(),
    output: Output.object({ schema }),
    prompt,
    temperature: 0,
  });
  const usage = result.totalUsage;
  const tin = usage.inputTokens ?? 0;
  const tout = usage.outputTokens ?? 0;
  if (tokens) addTokens(tokens, { in: tin, out: tout, cost: costUsd("enrich", tin, tout) });
  return schema.parse(result.output);
}
