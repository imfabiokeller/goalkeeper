// AI SDK providers. Workers go through OpenRouter, enrichment and
// classification through Cerebras, embeddings through Voyage. Nothing
// else in src/ imports a provider package.

import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createCerebras } from "@ai-sdk/cerebras";
import { createVoyage } from "voyage-ai-provider";
import { embed, type EmbeddingModel, type LanguageModel } from "ai";
import { env } from "./db.ts";

export function workerModel(): LanguageModel {
  const openrouter = createOpenRouter({ apiKey: env("OPENROUTER_API_KEY") });
  return openrouter(env("WORKER_MODEL", "anthropic/claude-sonnet-5"));
}

export function enrichModel(): LanguageModel {
  const cerebras = createCerebras({ apiKey: env("CEREBRAS_API_KEY") });
  return cerebras(env("ENRICH_MODEL", "llama-3.3-70b"));
}

export function embeddingModel(): EmbeddingModel {
  const voyage = createVoyage({ apiKey: env("VOYAGE_API_KEY") });
  return voyage.textEmbeddingModel(env("EMBED_MODEL", "voyage-3.5"));
}

export async function embedText(text: string): Promise<number[]> {
  const { embedding } = await embed({ model: embeddingModel(), value: text.slice(0, 16_000) });
  return embedding;
}

// Rough USD cost per token pair for the counters. Override per model in
// .env if the OpenRouter code is on a different tier.
export function costUsd(model: "worker" | "enrich", tokensIn: number, tokensOut: number): number {
  const rates = model === "worker" ? [3, 15] : [0.6, 0.6]; // per million
  const inRate = Number(process.env[`${model.toUpperCase()}_USD_PER_MTOK_IN`] ?? rates[0]);
  const outRate = Number(process.env[`${model.toUpperCase()}_USD_PER_MTOK_OUT`] ?? rates[1]);
  return (tokensIn * inRate + tokensOut * outRate) / 1_000_000;
}
