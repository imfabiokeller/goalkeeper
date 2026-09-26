# Prior art

What exists, what we take from it, and where goalkeeper differs. Cite these
when asked "isn't this X".

- **Claim Plane** (arXiv 2607.21909, July 2026). Agents declare change
  intents (base commit, files, dependencies) before writing; a control plane
  admits compatible ones, serializes conflicts, tracks premise invalidation,
  fails closed on ambiguity. No code released, six-pair evaluation. Our
  declared file scopes and admission rule are a shipped version of this.
- **When Agents Collide** (33,596 agent PRs, July 2026). Cross-agent pairs
  conflict at 41.7% vs 19.8% intra-agent; 42% of conflicts are structural.
  Defenses match ours: non-overlapping file ownership, worktrees, sequential
  merge with rebase, `git merge-tree` during the task. Advice not to let a
  third agent resolve three-way conflicts supports redo over merge.
- **Gastown** (Steve Yegge). Coordinator, 20 to 30 agents, git-backed issue
  tracking, health watchdogs, Bors-style merge queue. Closest on
  coordination; memory is issue tracking, local tool, not a runtime.
- **Composio agent-orchestrator** (Apache 2). Worker per task in its own
  worktree, project orchestrator whose conversation holds goals and
  decisions, kanban. The orchestrator's chat as memory is what we say
  degrades.
- **guild, NEEDLE, paperclip.** SQLite-backed shared context and atomic
  claims, heartbeat-driven ticket pickup. Same coordination primitive,
  single machine.
- **Memory frameworks** (Mem0, Cognee, Letta, Zep, Network-AI). Consolidate
  into facts or graphs. None tie memory to a goal or a gate.
- **Google ADK / Agent Engine / Cloud Run.** Hosting and per-request
  multi-agent routing, sessions per user, a memory bank that extracts
  memories. Request model; no goal, no ledger, no task claiming.
- **Strands Agents** (AWS, Apache 2, Python and TypeScript). Agent loop,
  session persistence, Swarm and Graph as in-process handoffs with shared
  context inside one session. Usable as a worker loop; not as coordination.
- **Cerebras internal knowledge base.** No consolidation, distilled fields
  at ingest, raw lexical index, hybrid retrieval with RRF, reranker, context
  expansion, synthesis with citations, staleness by recency. Our library is
  this shape on Atlas.
- **Anthropic contextual retrieval.** Prepend chunk context before embedding
  and BM25, fuse, rerank: 67% fewer retrieval failures. Cheap version of the
  ingest.
- **mergiraf.** Syntax-aware git merge driver (Rust, GPL). Optional for
  add/add conflicts.
- **DBOS, Vercel Workflow SDK.** Durable execution; the natural layer under
  the orchestrator after the hackathon.

What none of them have as one runtime: stateless disposable workers
coordinated only through the database, memory kept raw with read-time
slicing under a human-owned lens, and a goal with criteria that every task
links to and a deterministic gate enforces.
