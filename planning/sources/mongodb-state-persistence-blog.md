MongoDB.localStream MongoDB.local NYC starting at 9 a.m. ET on Sept 30 Learn more > >>
NewPower reliable AI agents with accurate, relevant data Read the blog >

 >>
NewBuild software faster with AI agents—without losing control Read the blog > >>

Blog homearrow-left

# State & Persistence: The Problem of Agent Reliability
July 6, 2026 ・ 6 min read

State is what a single agent run produces and consumes; memory is what an agent carries between runs. Most teams store and govern them as one thing.

## Agent state vs. memory: The distinction behind most reliability failures
State is the execution context of a single agent run: the intermediate results, the tool outputs, the plan, and the position in a multi-step task. Memory is the durable knowledge an agent carries across runs: what it learned, what a user prefers, and how a codebase is organized. The two are different kinds of data with different lifecycles, and most teams keep both under one label. That conflation is behind much of what gets reported as agent unreliability.
State and memory can share one store — that is not the problem. The failures show up downstream when they share one lifecycle and one governance policy. A checkpoint expires at the same time-to-live as a long-lived preference. Recovery restores the wrong thing. A worker dies on step five, and the agent restarts from step one. The label “reliability problem” sits on top of what is actually a persistence problem.
Not every reliability complaint is a state problem. When a team calls an agent unreliable, the cause is often memory — the agent acted on wrong or missing context — or the model’s own non-determinism, where the same input yields a different output. An agent that returns a wrong answer has a memory or model problem; an agent that cannot resume work it has already finished has a state problem. This post is about the second kind.
This matters now because agent runs are getting longer. METR's time-horizons work puts the frontier 50% task-completion horizon at roughly 12 hours by mid-2026, with the post-2023 doubling rate re-estimated at about four months (down from the seven-month rate measured over 2019–2024) and tasks beyond 16 hours now unreliable to measure on the current suite (METR1). At multi-hour task lengths, the probability that some failure — a network blip, an out-of-memory kill, a rate-limit, a routine deploy — interrupts a run approaches one, which makes recovery a baseline requirement rather than an enhancement. The failure does not have to be exotic: Anthropic’s April 23 post-mortem2 describes a change to how reasoning was retained in conversation history that degraded stale sessions and took more than a week to detect.
What follows treats the state layer as a first-class architectural concern: how state differs from memory, what gets checkpointed and when, how recovery behaves when a restored agent re-issues a tool call, and what governance persisted state inherits — the persistence plane of the harness, the part that survives a process death. Memory, the durable-knowledge layer, is the subject of Part 5. In the series intro’s terms, state is where the first of the three properties every production platform rests on — durable persistence at scale — gets built.

## How agent state persistence works: Checkpoints, files, and suspend/resume

### Agent state vs. memory: Different data, different lifecycles
State and memory separate along the axes that decide how each is stored and governed. Seen at the loop level, state is the input, output, and environment of each tick; memory is the prompt, the tool results, and the aggregations built from them over time. Vivek Trivedy’s anatomy of an agent harness3 treats durable storage and cross-session memory as distinct harness primitives — the closest existing precedent; the comparison below narrows it to state versus memory.
Figure 1. State versus memory, with concrete examples of each.

The conflation is visible in shipping frameworks. LangGraph’s default checkpointer collapses execution state and message history into one storage backend (LangGraph persistence4). CrewAI’s memory=True shares short- and long-term storage with no governance separation. A bare LangChain agent models no axis at all — “state” is whatever happens to be in the working dictionary. These are sensible defaults for a prototype. They stop fitting the first time the data needs different lifecycles or different access controls — a property of the workload, not a flaw in the framework.

### What to checkpoint in an agent, and when
A checkpoint is a durable snapshot of execution state taken at a point where the run could later resume. Four decisions define a checkpoint architecture: what gets captured, when the capture happens, where it lives, and at what granularity.
What gets captured: the full conversation history, the results of each tool call, a filesystem snapshot, or a key-value state object. Capturing more raises fidelity and storage cost; capturing less raises the work redone on recovery.
When the capture happens: the tool-call boundary is the converging norm. AGDebugger5 checkpoints before every new message; HumanLayer's Agent Control Plane checkpoints around tool calls and agent delegations. The tool call is where side effects enter the world, so it is the natural unit of recovery.
Where it lives: at the framework layer (a LangGraph checkpointer), the infrastructure layer (an Inngest6, Temporal, or Restate journal), or the database layer (a DBOS7 transaction that commits step state alongside application data). The field has converged on “externalized” and splintered on which layer owns it.
And at what granularity: per super-step, per tool call, or per message. Finer granularity lowers the recovery point objective — less work redone — at the cost of more write overhead per run.
Figure 2. Checkpoint granularity and the recovery trade-off.

### Progress files and Git as durable agent state
Not all states live in a database; the minimalist version is a file. The Ralph Wiggum loop8  — a shell loop that re-invokes the agent against a prompt file each iteration — holds all its state in files on disk, so the context window can reset each cycle while progress survives. Coding agents extend the idea with version control: Aider9 commits dirty files before its own edits, Claude Code writes per-session JSONL alongside git history, and Mitchell Hashimoto describes treating each commit as a checkpoint10. Git doubles as the audit trail — every change attributable, every prior state reachable again.

### Tenant isolation and agent state locality
Where a state lives also sets how cleanly it can be isolated between tenants. Per-execution sandboxes (Modal11 Filesystem Snapshots, Fly12 Sprites, Cloudflare13 per-session storage) isolate state at the compute layer; namespace-scoped checkpoint stores isolate at the storage layer; transactional databases isolate by row or collection. Part 3 treats tenant isolation as a security primitive; here, it is a property of where the state is persisted.
Figure 3. The three planes of an agent’s state, and what survives a crash.

### Suspend and resume: What externalized agent state makes possible
Suspend and resume is the operation of freezing an agent’s full execution state to durable storage when it hits a wait condition, then restoring it when a trigger fires. It is possible only when the state lives outside the harness process: if the execution context is held in process memory, there is nothing to freeze to and nothing to thaw from.
Listing 1. Suspend & resume.

Three things follow from the externalized state. Runtime cost is bounded by active execution rather than wall-clock duration — the meter follows work, not waiting (Fly Sprites⁶ report roughly $0.44 for a four-hour persistent-VM coding session). Long-duration workflows become possible: a run can wait on a webhook, a scheduled trigger, or a multi-day process without holding compute open. And human-in-the-loop review becomes feasible, because an approval gate can pause a run for hours or days — the review UX is Part 4’s territory, but the state requirement is here.
Externalized state also surfaces engineering edge cases that in-process state hides: partial tool-call results captured at freeze time, schema migrations that change the state format between freeze and thaw, model swaps that resume a run on a model unavailable when it was frozen, and credentials that expire mid-freeze. Each is a place where freezing the bytes and restoring them later is necessary but not sufficient.
These four surfaces are not equally dangerous. A clean pause is safe: the run checkpoints between steps, so a completed tool result comes back intact on resume. A model swap is similarly benign — resume replays the recorded steps rather than re-asking the model. What actually breaks a run is a version change while it waits. If a deployment alters the shape of the agent’s state between freeze and thaw, the resume loads an old checkpoint into new code that expects a field the old state does not carry, and the run wedges: not a loud failure-and-retry but a run stuck suspended, because every resume attempt hits the same mismatch. The deploy looks clean — every component comes up healthy — and the break surfaces only when an old run resumes, not at deploy time. The case teams miss until production is the quietest: a short-lived delegated token, issued so the agent can call a tool on a user’s behalf, that a multi-hour or multi-day pause simply outlives.

## Agent state failures in production: practitioner and research evidence

### How production state primitives broke under agent workloads
The clearest production signal comes from teams whose state primitives broke under agent workloads. Cloudflare13 rearchitected its Workflows control plane for the agentic era, lifting concurrency from 4,500 to 50,000 instances, the instance-creation rate from 100 per ten seconds to 300 per second, and queued instances from one million to two million per workflow — a change it attributes to a quantitative shift in workload and access pattern. Inngest6 names async checkpointing as the difference between hundreds-of-milliseconds and single-digit-millisecond inter-step latency.²

### What enterprise teams ask for in agent state management
Several patterns recur across recent enterprise engagements, in generalized form. The most consistent requirement is the ability to stop an agent mid-run and bring it back later without losing or corrupting where it was — durable, run-bounded state that suspends and resumes deterministically, often across approval waits of hours to days with no compute on the meter. 
A second pattern shows up as a question that gets asked without prompting: if a run is suspended and the agent’s definition changes before it resumes, which version resumes? Teams that have thought it through want the run to resume on the version it started with, with a narrow override for security-critical updates — the bundle-versioning problem of Section 4, arrived at independently. 
A third recurring ask: once execution context outgrows the model’s window, teams checkpoint working state at every tool call, and the ones doing it well have separated run-bounded state from durable knowledge without naming it. The fourth is the recovery trap — teams want a failed worker reconstituted by reloading its context, then hit the wall that a restored agent cannot safely re-run tool calls that already had side effects.

### Why idempotent tools aren't enough for agent recovery
Three research results anchor the recovery argument. MAST14 (Cemri et al., NeurIPS 2025) catalogs 14 failure modes across seven multi-agent frameworks over 1,600+ annotated traces — multi-step traces long enough that replaying the full conversation history is not a viable recovery strategy. ACRFence15 (Zheng et al.) shows the deeper trap: an agent restored to the checkpoint before a $500 transfer re-attempts it with a fresh identifier, so the bank sees no match, processes a second transaction, and the customer is charged twice. Checkpoint-restore breaks here not because the tool was non-idempotent but because the restored agent re-synthesized a different request — semantic rollback. The cause of that divergence is contested: ACRFence attributes it to GPU floating-point nondeterminism, while Thinking Machines Lab16 argues the dominant cause is batch-invariance failure, not a fixed GPU property. The architectural conclusion holds either way: idempotent tools are necessary but not sufficient, and the durable answer is to replay the recorded decision rather than re-invoke the model — as Temporal17 does, replaying from an event history on recovery.
For scale, Gartner18 projects more than 40% of agentic AI projects canceled by the end of 2027, citing cost and unclear value among the reasons. The field is converging on externalized state captured at tool-call boundaries and splintering on whether its home is the framework, the infrastructure, or the database, with the state-versus-memory separation still being worked out in the open.

## Choosing an agent state architecture: patterns, versioning, and cost

### Five state patterns teams ship, from in-memory to database-as-state
The state architectures in production fall into a small number of patterns. Unlike Part 1’s three maturity stages, these are a per-workload choice — not strictly sequential, and some workloads are right to stay on a simpler one permanently.
- Pattern 1, in-memory state. Fits prototypes and single-session interactions. Breaks on the first process restart: nothing survives, no recovery, no resume.
- Pattern 2, persistent message log. Fits chat agents where the conversation history is the state and tasks are short enough that replay-from-start is cheap. Breaks on long-horizon tasks, where replay blows the context window and re-charges for tool calls that already ran — Addy Osmani’s 200 documents over four hours, failing on document 201 and starting over, is the canonical case.

- Pattern 3, step-checkpoint with an idempotency contract. Fits long-running workflows with well-defined steps and tools that can be made idempotent. Breaks on non-idempotent side effects, and — per ACRFence — even on nominally idempotent ones, because a restored agent re-synthesizes a different request and a different idempotency key.

- Pattern 4, decoupled state and memory stores. Fits production agents that need governance, audit, cross-session memory, and recovery as separate concerns. Breaks on drift: a memory write succeeds, but the state record that it happened is lost on recovery, and consistency between two stores becomes the new problem.

- Pattern 5, database-as-state with transactional state-memory sync. Fits enterprise agents where state, memory, and operational data must commit together with audit and multi-tenancy. Breaks on the transactional boundary itself — sustaining OLTP-style state writes, vector retrieval, and large-blob storage in one layer is the structural hard part, and in practice, the binding cost is latency more than storage. Choosing it commits you to a database that can carry all three.

Two recent pieces sharpen the boundaries. Diagrid19 argues that checkpointers are save points, not durable execution — no automatic failure detection, resumption, or duplicate-execution prevention — which is why Patterns 2 and 3 alone fall short. DBOS7 makes the published case for Pattern 5: committing step state and application data in one database transaction to get exactly-once semantics for steps that perform database operations. Even so, the durable execution platforms that enforce this were built for microservice workloads, not the volume of short-lived runs an agent fleet produces, so teams reach for them mainly when the harness offers no lightweight durability of its own.
Figure 4. The five state-architecture patterns.

The same handler under three architectures makes the trade-offs concrete. Pattern 3 keeps state and memory in one store; recovery works, governance does not. Pattern 4 splits them; the drift between the stores becomes the new hard problem. Pattern 5 commits both in one transaction; drift becomes impossible, at the cost of a database that can carry all three data types.
Listing 2. Pattern 3 - State and memory in one store; recovery works, governance doesn’t.

Listing 3. Pattern 4 - State and memory are split into separate stores; drift between them is the new hard problem.

Listing 4. Pattern 5 - The enterprise extension. State, memory, and operational data carry transactional guarantees together.

In practice, they rarely commit together. State, short-term memory, and the business data a run touches are written at different moments by different paths: business data through tool calls, short-term memory ahead of the state checkpoint, the checkpoint between execution steps, and long-term memory aggregated asynchronously after the run. Decoupled stores with no shared transaction are the common production setup, so a crash in the window between any two of those writes can leave them inconsistent — Pattern 4’s drift. The single transaction that avoids the drift is the rare Pattern 5 case; what keeps it rare is latency — the slow, derived memory write forced into the same commit as fast per-step state.

### Bundle versioning: The agent deployment primitive
Treating state as durable raises a second deployment question: what is the unit of versioning? 
A model swap, a prompt change, and a code change each alter agent behavior, often non-obviously, and versioning them independently lets an in-flight execution resume on a model never tested with its prompt and code. In current practice, the split is uneven: code and prompt ship together as one immutable image pinned by digest, while the model and its runtime configuration — feature flags, credentials — change independently. The break is at that seam: nothing pins a running execution to the versions it began on, so a paused run resumes on whatever is live when it wakes. 
The fix is to make the unit of versioning the bundle of model, code, and prompt together, and to give an in-flight execution the bundle it started on. Restate’s pinned-executions20 approach is the closest existing precedent — immutable deployments with executions pinned to the version they began on. The extension is to treat the model-code-prompt bundle the way a container treats an application image: one artifact, one version, one deploy.
Listing 5. Antipattern. Each surface versioned independently.

Listing 6. Bundle versioning. Code, prompt, and model are pinned and shipped as one versioned artifact.

### How agent state architecture drives cost
State architecture shows up directly on the bill, along four axes. Re-execution cost is how much work is redone on failure — Pattern 2’s weak point. Idle-compute cost is whether the runtime keeps paying while waiting, which suspend/resume removes in Patterns 4 and 5. Retry cost is how expensive each retry is, which worsens when tools are not safely repeatable at Pattern 3. Rebuild cost is how much the state must be recreated when versioning fails, invisible until a deploy lands on in-flight executions. Reported single-run costs span orders of magnitude — $47 on a looping CSS bug, $4,200 over 63 hours on a runaway re-planning loop, $0.44 for a four-hour persistent-VM session — and the spread tracks which axis dominates more than which model was used. These figures are anecdotal, not benchmark data.

### How to audit your agent state layer (three checks)
Three checks translate the argument into action. Run the kill test: SIGKILL a worker mid-task and see whether it resumes, from where, and what was lost. Separate state and memory into different persistence stacks with different granularity and lifecycle policies, rather than one store under one TTL. And map each state artifact to a lifecycle policy, the way an operational database already is — encryption at rest, retention, RBAC, and an audit log of mutations.
These patterns describe what Part 1 separated into two layers: the state component of the harness, and the durable-execution property of the platform underneath — the layer that keeps an agent’s work intact through crashes and long pauses so the harness can resume instead of starting over. Pattern 4 is the move most production agent infrastructure still needs to make; Pattern 5 is the posture for enterprise contexts where state, memory, and operational data must carry transactional guarantees together. Neither is universal: short-task chat agents, single-tenant prototypes, and internal tools can stay on Patterns 2 and 3 indefinitely. “The Case for Bounded Autonomy” framed state fragility as a design concern — a system cannot exercise bounded autonomy if it cannot recover from the state it is in. This post takes that to the persistence layer. (The Case for Bounded Autonomy)

## Open problems in agent state and persistence
Several problems in this layer are still open. Keeping state and memory distinct gets harder once a supervisor and its specialists hand work back and forth, and agent state still lacks the governance and cross-region durability that operational data takes for granted. Recovery has no clean answer yet: a run that pauses on purpose resumes from its checkpoint, but one that dies in an unplanned crash does not — a restored non-deterministic agent can re-synthesize different calls and reach a different outcome.
Interested in building production-grade agent systems with MongoDB? Check out our resources on agent memory with LangGraph + MongoDB, building AI agents with Atlas Vector Search, and context engineering for enterprise AI.

### Series: Designing an Agentic Platform
Intro — The Infrastructure That Makes Agents Work
Pt 1 — The Agent Harness: Why the LLM Is the Smallest Part
Pt 2 — State & Persistence (this post)
Pt 3 — Security & Governance
Pt 4 — Orchestration & Tool Use
Pt 5 — Memory Inside the Harness
Pt 6 — Observability
Pt 7 — Evals for Agent Memory
Capstone — The Agent Platform Buyer’s Checklist

### References
- METR — "Task-Completion Time Horizons of Frontier AI Models" (live tracker)

- Anthropic — April 23 post-mortem (Apr 2026)

- LangChain — “The Anatomy of an Agent Harness” (Vivek Trivedy, Mar 2026)

- LangChain — LangGraph persistence documentation

- AGDebugger (Epperson et al., CHI 2025)

- Inngest — “Principles of Durable Execution” (Jan 2026)

- DBOS — “Why Postgres for Durable Workflow Execution”

- Ralph Wiggum loop (GitHub)

- Aider — Git integration

- Mitchell Hashimoto — “My AI Adoption Journey”

- Modal — “Building with Modal and the OpenAI Agents SDK”

- Fly.io — “Code and Let Live” (Sprites)

- Cloudflare — “Rearchitecting Workflows for the agentic era” (Apr 2026)

- MAST — “Why Do Multi-Agent LLM Systems Fail?” (Cemri et al., NeurIPS 2025)

- ACRFence (Zheng et al., Mar 2026)

- Thinking Machines Lab — “Defeating Nondeterminism in LLM Inference” (Sep 2025)

- Temporal — “Of Course You Can Build Dynamic AI Agents with Temporal” (Nov 2025)

- Gartner — “Over 40% of Agentic AI Projects Canceled by 2027” (Jun 2025)

- Diagrid — “Checkpoints Are Not Durable Execution” (Feb 2026)

- Restate — “Updating AI Agents Safely in Production” (Mar 2026)

### Authors
Mikiko Bazeley, Staff Developer Advocate, MongoDB. Mikiko focuses on agentic AI systems and enterprise agent infrastructure, writing about agent memory engineering, context engineering, and the POC-to-production gap in AI systems.
Ashish Kumar, Technical Fellow, MongoDB. Ashish joined MongoDB over two years ago through the acquisition of Grainite, a database startup he co-founded. Before that, he spent many years at Google, most recently responsible for Google’s native database suite — Bigtable, Spanner, Datastore, and Firestore — across Google’s own products and Google Cloud. His passion is large-scale distributed systems, and at MongoDB he focuses on architectural improvements across the product stack.
Max Marcon, Director of Product Management, MongoDB. Max leads product for agentic AI initiatives at MongoDB. His mission is to ensure customers are successful with running agents at enterprise scale.
Srinidhi Kaushik, Staff Site Reliability Engineer, MongoDB. Srinidhi works on sandboxing, network isolation, and infrastructure reliability.
Simon Zhu, Staff Engineer, MongoDB. Simon works on security, agent identity, and infrastructure reliability.

share this

Author

Mikiko Bazeley
Staff Developer Advocate

Ashish Kumar
Technical Fellow, MongoDB

Massimiliano Marcon
Director of Product Management, MongoDB

Srinidhi Kaushik
Staff Site Reliability Engineer, MongoDB

Simon Zhu
Staff Engineer, MongoDB

MongoDB Resources
Documentation|MongoDB Community|MongoDB Skill Badges|Atlas Learning Hub|MongoDB Events
