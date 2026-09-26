// The task page's pure readers of a run record.

import { describe, expect, it } from "vitest";
import { contextSections, inputMessages, resultVerdict, stepLines } from "./transcript.ts";

describe("contextSections", () => {
  it("splits the system prompt on headings with a char and token estimate", () => {
    const s = contextSections("# Goal\nsolve puzzles\n\n# Library records (precedents)\n[abc] worker-run on k1\ngist: g");
    expect(s.map((x) => x.label)).toEqual(["Goal", "Library records (precedents)"]);
    expect(s[0]).toMatchObject({ text: "solve puzzles", chars: 13, tokens: 4 });
    expect(s[1]!.text).toContain("[abc] worker-run on k1");
  });
  it("labels text before the first heading as preamble and handles nothing", () => {
    expect(contextSections("hello\n# A\nb").map((x) => x.label)).toEqual(["preamble", "A"]);
    expect(contextSections(null)).toEqual([]);
  });
});

describe("inputMessages", () => {
  it("reads the user messages before the model's first turn", () => {
    const msgs = [
      { role: "user", content: "puzzle text" },
      { role: "user", content: [{ type: "text", text: "state" }] },
      { role: "assistant", content: [{ type: "tool-call", toolName: "read_input", input: {} }] },
      { role: "user", content: "nudge" },
    ];
    expect(inputMessages(msgs).map((m) => m.text)).toEqual(["puzzle text", "state"]);
    expect(inputMessages(undefined)).toEqual([]);
  });
});

describe("stepLines", () => {
  it("keeps tool calls and results per step and reads the gate verdict off try_submit", () => {
    const steps = [
      { text: "thinking", toolCalls: [{ name: "read_input", input: {} }], toolResults: [{ name: "read_input", output: "grid" }], finishReason: "tool-calls", usage: { in: 100, out: 20 } },
      {
        text: "",
        toolCalls: [{ name: "try_submit", input: { proposal: { rule: "flip" } } }],
        toolResults: [{ name: "try_submit", output: { pass: false, reasons: ["pair 1: 3 cells differ"] } }],
        finishReason: "tool-calls",
        usage: { in: 200, out: 40 },
      },
    ];
    const lines = stepLines(steps);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({ n: 1, text: "thinking", finishReason: "tool-calls", usage: { in: 100, out: 20 } });
    expect(lines[0]!.results[0]).toMatchObject({ name: "read_input", ok: null, reasons: [] });
    expect(lines[1]!.results[0]).toMatchObject({ name: "try_submit", ok: false, reasons: ["pair 1: 3 cells differ"] });
    expect(stepLines(null)).toEqual([]);
  });
  it("reads verdicts from JSON strings and nested gates", () => {
    expect(resultVerdict('{"ok":true,"reasons":[]}')).toEqual({ ok: true, reasons: [] });
    expect(resultVerdict({ gate: { pass: false, reasons: ["r"] } })).toEqual({ ok: false, reasons: ["r"] });
    expect(resultVerdict("plain text")).toEqual({ ok: null, reasons: [] });
  });
});
