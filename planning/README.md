# Planning

Raw material for the hackathon. Nothing here is code. `sources/` holds the
event's resource guide, the partners' messages and the docs we will build
against, saved as-is so the agents working in this repo can read them
without going online.

## judges.md

Who the six first-round judges are, what each will likely listen for, and
the sources behind it.

## sources/

Event:
- `hackathon-resources-gdoc.txt`: the official resource guide, text export.
- `hackathon-resources-gdoc-links.md`: every hyperlink from the guide.
- `aws-brooke-discord-message.md`: the AWS judge's links (Kiro credits,
  Strands, Harness Optimizer, ARC-AGI-3, the context engineering lesson).

MongoDB (markdown exports of the official docs, `.md` appended to the URL):
- `mongodb-agent-skills-docs.md` and `mongodb-agent-skills-repo/`: the
  skills now installed under `.claude/skills/`.
- `mongodb-mcp-server-get-started.md`, `mongodb-mcp-server-configuration.md`,
  `mongodb-mcp-options.md`: the MCP server wired in `.mcp.json`.
- `mongodb-rankfusion.md`, `mongodb-hybrid-search-overview.md`,
  `mongodb-hybrid-vector-fulltext.md`: the briefing query.
- `mongodb-vector-search-index.md`, `mongodb-vectorsearch-stage.md`,
  `mongodb-vector-search-quickstart.md`: the vector index on `sources`.
- `mongodb-native-reranking-quickstart.md` and
  `mongodb-embedding-reranking-api.md`: Voyage rerank inside Atlas, an
  option for the briefing retrieval.
- `mongodb-automated-embeddings-blog.md`: Atlas can generate the
  embeddings itself, which would remove the embedding call from ingest.
- `mongodb-change-streams.md`: the live screen and the ingest trigger.
- `mongodb-natural-language-queries.md`: prompting guidance.
- `mongodb-state-persistence-blog.md`: MongoDB's own framing of
  checkpoints, suspend/resume and crash recovery. Useful language for the
  pitch.

AWS / Strands:
- `strands-typescript-quickstart.md`: the SDK and its docs MCP server
  (wired in `.mcp.json`).
- `strands-harness-optimizer-blog.md`, `strands-harness-optimizer-README.md`:
  their take on Statement One. Read for the judge's vocabulary.
- `strands-arc-agi-3-blog.md`, `strands-arc-agi-3-agent-README.md`.
- `strands-context-engineering-lesson.md`: lesson 8, context management.

Voyage AI:
- `voyage-quickstart.md`, `voyage-pricing.md`: 200M free tokens for the
  event; embeddings and reranking.

## What is set up

- `.mcp.json`: MongoDB MCP server (needs `MDB_MCP_CONNECTION_STRING` in
  `.env`) and the Strands docs MCP server (needs `uv`, installed).
- `.claude/skills/`: the seven MongoDB agent skills.
- `.env.example`: the keys the day needs.
- Installed on this machine: mongosh 2.12, uv, Codex CLI 0.157.1
  (fallback worker), Claude Code.

## Still needs a human (see docs/DAY-PLAN.md)

- Atlas sandbox: create the project and cluster through the link in the
  sandbox email, put the connection string in `.env`.
- Claude Code login: `claude -p` currently fails with an expired OAuth
  session; log in again from a terminal or set `ANTHROPIC_API_KEY`.
- OpenRouter code (10:30 email), Codex credits (10:30 email), v0 code
  (10:30 email), Kiro credits form, Voyage account and key.
