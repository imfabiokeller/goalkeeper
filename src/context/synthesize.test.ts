import { describe, expect, it } from "vitest";
import { MockLanguageModelV3 } from "ai/test";
import { citationsOf, ground, sentencesOf, synthesize } from "./synthesize.ts";
import type { Passage } from "./retrieve.ts";

const hit = (id: string, text: string): Passage => ({
  id,
  kind: "gate",
  key: `k-${id}`,
  gist: `gist ${id}`,
  excerpt: text,
  score: 1,
  createdAt: new Date("2026-09-26T12:00:00Z"),
});

describe("ground", () => {
  it("keeps cited sentences in order, drops unknown ids and uncited sentences", () => {
    const briefing =
      "Banks report net revenue and the gate accepts it as revenue [a1]. " +
      "This sentence has no citation. " +
      "NVIDIA's fiscal year runs ahead of the calendar [b2][c3]. " +
      "Made up claim about Apple [zz9]. " +
      "Mixed citations fail the whole sentence [a1, zz9]. " +
      "Table rows in millions must be multiplied out [c3].";
    const out = ground(briefing, ["a1", "b2", "c3"]);
    expect(out.text).toBe(
      "Banks report net revenue and the gate accepts it as revenue [a1]. " +
        "NVIDIA's fiscal year runs ahead of the calendar [b2][c3]. " +
        "Table rows in millions must be multiplied out [c3].",
    );
    expect(out.citedIds).toEqual(["a1", "b2", "c3"]);
  });

  it("returns nothing for an empty or fully ungrounded briefing", () => {
    expect(ground("", ["a"])).toEqual({ text: "", citedIds: [] });
    expect(ground("Nothing here. Or here [x].", ["a"])).toEqual({ text: "", citedIds: [] });
  });

  it("caps at twelve sentences", () => {
    const many = Array.from({ length: 20 }, (_, i) => `Sentence ${i} [a].`).join(" ");
    expect(sentencesOf(ground(many, ["a"]).text)).toHaveLength(12);
  });

  it("parses citation groups and attaches a trailing citation chunk to its sentence", () => {
    expect(citationsOf("x [a][b] y [c, d]")).toEqual(["a", "b", "c", "d"]);
    expect(sentencesOf("First thing. [a] Second thing [b].")).toEqual(["First thing. [a]", "Second thing [b]."]);
    expect(ground("First thing. [a] Second thing [b].", ["a"]).text).toBe("First thing. [a]");
  });
});

describe("synthesize", () => {
  const goal = { statement: "Extract headline results.", criteria: [{ id: "c1", kind: "all-units" as const, text: "Grounded.", check: { kind: "grounded", params: {} } }] };
  const task = { key: "aapl-2026-07-30", criteria: ["c1"] };

  const modelSaying = (text: string) =>
    new MockLanguageModelV3({
      doGenerate: async () => ({
        content: [{ type: "text", text }],
        finishReason: { unified: "stop", raw: "stop" },
        usage: {
          inputTokens: { total: 300, noCache: 300, cacheRead: undefined, cacheWrite: undefined },
          outputTokens: { total: 40, text: 40, reasoning: undefined },
        },
        warnings: [],
      }),
    });

  it("returns the grounded briefing with only the cited hits and the tokens", async () => {
    const hits = [hit("a1", "net revenue"), hit("b2", "fiscal year"), hit("c3", "unused")];
    const out = await synthesize({ goal, task, hits, model: modelSaying("Banks report net revenue [a1]. Fiscal years differ [b2]. Invented [q9].") });
    expect(out?.text).toBe("Banks report net revenue [a1]. Fiscal years differ [b2].");
    expect(out?.cited.map((h) => h.id)).toEqual(["a1", "b2"]);
    expect(out?.tokens).toEqual({ in: 300, out: 40 });
  });

  it("returns null with no hits, an empty answer, or a failing model", async () => {
    expect(await synthesize({ goal, task, hits: [], model: modelSaying("x [a]") })).toBeNull();
    expect(await synthesize({ goal, task, hits: [hit("a1", "t")], model: modelSaying("") })).toBeNull();
    const failing = new MockLanguageModelV3({
      doGenerate: async () => {
        throw new Error("no key");
      },
    });
    expect(await synthesize({ goal, task, hits: [hit("a1", "t")], model: failing })).toBeNull();
  });
});
