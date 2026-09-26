// AI SDK providers. Workers, enrichment and classification go through
// OpenRouter (two model names, cheap open-weight models: DeepSeek, Qwen,
// never Claude), embeddings through Voyage. Nothing else in src/ imports a
// provider package.

import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createVoyage } from "voyage-ai-provider";
import { embed, type EmbeddingModel, type LanguageModel } from "ai";
import { env } from "./db.ts";

export function workerModel(): LanguageModel {
  const openrouter = createOpenRouter({ apiKey: env("OPENROUTER_API_KEY") });
  return openrouter(env("WORKER_MODEL", "deepseek/deepseek-v4-pro"));
}

// Cheap and fast: ingest enrichment, crowd classification, briefing synthesis.
export function enrichModel(): LanguageModel {
  const openrouter = createOpenRouter({ apiKey: env("OPENROUTER_API_KEY") });
  return openrouter(env("ENRICH_MODEL", "deepseek/deepseek-v4-flash"));
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
  const rates = model === "worker" ? [0.35, 0.7] : [0.05, 0.1]; // USD per million tokens
  const inRate = Number(process.env[`${model.toUpperCase()}_USD_PER_MTOK_IN`] ?? rates[0]);
  const outRate = Number(process.env[`${model.toUpperCase()}_USD_PER_MTOK_OUT`] ?? rates[1]);
  return (tokensIn * inRate + tokensOut * outRate) / 1_000_000;
}
