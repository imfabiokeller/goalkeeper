# Judges' questions

**Isn't this just RAG?**
RAG retrieves to answer a question. Here retrieval builds the context for
a worker that produces verified work toward a goal, and the model never
sees history. The memory drives a runtime, it does not answer questions.

**Why not one agent with a one-million-token context?**
Cost per request, degradation as the pile grows, and the process dying with
everything in it. Our context per request is flat all day while the library
grows without bound, and any worker can die.

**Is ARC contaminated? Did the model memorize it?**
We run the evaluation set, not training. And the curve is the answer: the
same model, same puzzles, solving more at 17:00 than at 14:30. Memorization
does not climb.

**Why not a frontier model? Why reasoning off?**
Cheap open-weight models only, so the harness is what improves, not the
model. Reasoning is off for the same reason: with thinking on, DeepSeek V4
already scores about 90% on ARC-AGI-1 and there is nothing left to show.
With thinking off it starts around 13% single shot, and every point above
that comes from the tool loop, the gate and the library.

**How does your score compare to published results?**
We are not claiming a benchmark result. The claim is the delta over the
day with the same model, which is what long-horizon learning looks like.
Reference points: the same model single shot is our own baseline script
(`npm run baseline`); ARC Prize's no-thinking DeepSeek V4 runs are 12 to
13% (semi-private, pass@2); the best published program-synthesis pipeline
on a non-thinking DeepSeek is 67% pass@2 at $0.62 per task (Moghe and
Chin, 2026); Greenblatt's GPT-4o pipeline was 42% with thousands of
samples per task (2024). The public eval set is likely in training data,
so any public-eval number is best case; ARC Prize scores semi-private.

**Is the comparison with the control fair?**
Same model, no thinking, same puzzle text, same gate, and at most two
shots at the hidden test on both sides (ARC's rule). Not the same: the
harness runs its program on the example pairs and reads the diff, the
control writes blind; and a harness attempt costs about ten times the
control's tokens. So the honest claim is "same model, one shot 12%,
with the harness about 50%", not "same budget". Whether the library, and
not just feedback plus retries, is the cause needs an ablation with
retrieval off; we did not run it today. The curve of solve rate against
library size over the day is the evidence we have.

**Two workers, same puzzle?**
Cannot happen: the claim is one atomic update, the planner never emits a
task for a busy key, and the state write has a version precondition. A
lost race is a redo, not a merge.

**How do you know it did not drift?**
Every task cites its criteria and the gate runs those checks. No code
path writes the goal after seed: the swarm learns into the library, never
into its instructions.

**Why no judge agent?**
A model judging a model shares its biases. Our judge runs the program on
the example pairs. Deterministic, milliseconds, auditable.

**Could a program cheat by hardcoding the examples?**
The `general` check rejects any program whose text contains an example
output as a literal, and the hidden test scores it anyway. A hardcoded
program passes the gate at most once and never scores.

**Is running model-written code safe?**
Every program runs in a child process with an empty environment, Node's
permission model (no file system, network or child processes), a one
second limit and an output cap. The worker container is disposable.

**Why don't workers ask questions?**
A worker asking a human per puzzle does not scale. A worker blocks with
the hypotheses it tried; the planner reopens it once the library has
grown, with those hypotheses as a hint.

**Why pure state instead of code in a repo?**
The proposal is JSON that carries a program. Same harness, no repo, no
worktree: the check runs the program. A coding worker on a repo is the
same loop with a `tsc` check kind.

**Isn't this Gastown / Composio / a Strands swarm?**
Those are supervision tools with the coordinator's own chat as memory, or
in-process handoffs inside one session. Here no agent keeps state, the
database is the only coordinator, and the goal is enforced at merge time.

**What did you build today, what did you reuse?**
Built: the worker loop (claim, heartbeat, context assembly, AI SDK tool
loop, gate, write), the check registry and the sandbox, the planner
(reaper, emit, hidden scoring, reopen, metrics), enrichment and
retrieval, the live screen. Reused: Atlas, the
Vercel AI SDK, OpenRouter, Voyage, Next.js, Docker, the ARC data.

**Where does this go after today?**
Text-to-SQL over a real database with an agreement check (BIRD), coding
workers with a test check kind, metric criteria, durable execution
underneath.
