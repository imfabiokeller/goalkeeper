# Lesson 8: Context Engineering & Context Management

- Play
Watch on YouTube

About this lesson
The videos in this course are a snapshot in time. Strands is under active development, so the code featured on this page reflects the most up-to-date patterns, but the concepts covered in the video still apply. When in doubt, trust the code.
In particular, this video demonstrates SummarizingConversationManager and the ContextOffloader plugin. Those have been superseded by the unified ContextManager and Offload strategies shown below. The ideas (summarize old history, offload large tool results, compress proactively) are the same; the API is now one system instead of two.

Code for this lesson: samples/08-context-management

## What Context Engineering Is
Section titled “What Context Engineering Is”

Context engineering is the discipline of deciding what information enters the model’s context window, when, and in what form. Unlike prompt engineering (which focuses on instructions), context engineering ensures the model has the right data at the right time without overflowing the window or wasting tokens.

It breaks down into four categories:

CategoryWhat It DoesStrands Primitive
SelectChoose what enters context, inject relevant info, filter out noiseContextInjector plugin
CompressShrink what’s already in context, summarize history, truncate resultsContextManager strategies (truncate, summarize, drop)
IsolateSeparate concerns, give sub-agents their own context windowsMulti-agent patterns, context_manager="agentic"
ExternalizeMove large data out of context, store externally, keep a compact referenceContextManager stash + retrieval tool

## The One-Line Default: context_manager="auto"
Section titled “The One-Line Default: context_manager="auto"”

For most use cases, start here:

- 
```
from strands import Agent
agent = Agent(context_manager="auto")
```

This single parameter enables:

- Offloading large tool results to a stash, replaced with truncated previews

- Summarization of old messages into structured summaries (not dropped)

- Proactive compression firing at 85% context usage to stay ahead of overflow

In benchmarks on real code investigation tasks, costs dropped 55% while accuracy went from 68% to 98%. Half the tokens, better results.

For agents that need to protect specific context across long conversations, use context_manager="agentic". The model gets tools to summarize, truncate, or pin messages itself, trading some tokens for judgment.

## Context Injector
Section titled “Context Injector”

The ContextInjector plugin folds ephemeral text into the model input before each call. The text is never written to conversation history; it augments one call only. Use it for context the agent should always have but that doesn’t belong in stored history: current time, environment facts, retrieval lookups.

```
from datetime import datetime, timezonefrom strands import Agentfrom strands.vended_plugins.context_injector import ContextInjector
agent = Agent(    plugins=[        ContextInjector(            lambda context: f"<now>{datetime.now(timezone.utc).isoformat()}</now>"        ),    ],)
```

{datetime.now(timezone.utc).isoformat()}"        ),    ],)">

Control when injection fires:

- trigger="userTurn" (default): only on fresh user messages

- trigger="everyTurn": before every model call, including mid-task tool-result turns

- Custom predicate: trigger=lambda context: context.state.get("recall_enabled") is True

## ContextManager and Offload Strategies
Section titled “ContextManager and Offload Strategies”

The ContextManager is the engine behind context_manager="auto". When you need custom control over how context is managed, build your own strategy pipeline using Offload strategies.

Experimental
ContextManager and Offload are currently exported from strands.experimental.context_manager. They are fully functional and will move to the main namespace in an upcoming release.

There are three types of Offload strategies:

StrategyWhat stays in context
Offload.truncate(...)A head/tail preview of the original
Offload.summarize(...)An LLM-generated summary of the original
Offload.drop(...)Nothing (original goes to stash only)

Each strategy takes a target that controls what content it operates on:

```
from strands.experimental.context_manager import Offload
Offload.summarize("*")                   # everything: all message typesOffload.truncate("tool_results")         # only successful tool resultsOffload.drop("tool_result_errors")       # only errored tool resultsOffload.summarize("assistant_text")      # only assistant text blocksOffload.truncate(["bash", "read_file"])  # only results from specific toolsOffload.truncate(["!read_file"])         # everything except read_file
```

And .when(...) sets the conditions:

- threshold=N: fire on individual blocks exceeding N tokens (per-block mode)

- utilization=0.85: fire when the context window is 85% full (per-message mode)

- preserve_recent=N: skip the N most recent matching messages

### Truncate Strategy (Drop Oldest)
Section titled “Truncate Strategy (Drop Oldest)”

The simplest approach. Remove old messages when context gets full:

```
from strands import Agentfrom strands.experimental.context_manager import ContextManager, Offload
agent = Agent(    tools=[...],    context_manager=ContextManager(        strategies=[            Offload.truncate("tool_results").when(threshold=2500),            Offload.truncate("*").when(utilization=0.9, preserve_recent=10),        ],    ),)
```

📂 sliding_window.py

### Summarize Strategy
Section titled “Summarize Strategy”

Instead of dropping old messages, compress them into summaries. Preserves more information, but summaries are lossy:

```
from strands.experimental.context_manager import ContextManager, Offload
agent = Agent(    tools=[...],    context_manager=ContextManager(        strategies=[            Offload.truncate("tool_results").when(threshold=2500),            Offload.summarize("*").when(utilization=0.85, preserve_recent=10),        ],    ),)
```

📂 summarizing.py

### Custom Summarizer (Cheaper Model)
Section titled “Custom Summarizer (Cheaper Model)”

Summarizing history doesn’t require your most capable model. Pass a cheaper one, and a domain-specific prompt, via the config dict:

```
from strands.models import BedrockModelfrom strands.experimental.context_manager import ContextManager, Offload
summarizer_model = BedrockModel(model_id="us.anthropic.claude-haiku-4-5-20251001-v1:0")
agent = Agent(    tools=[...],    context_manager=ContextManager(        strategies=[            Offload.truncate("tool_results").when(threshold=2500),            Offload.summarize(                "*",                {                    "model": summarizer_model,                    "system_prompt": "Summarize the customer service conversation...",                },            ).when(utilization=0.85, preserve_recent=8),        ],        stash=False,    ),)
```

stash=False turns off the stash entirely: offloaded content isn’t kept anywhere and the agent gets no retrieval tool. That’s fine for pure summarization where you don’t need to pull anything back. Leave it on (the default) when you want the agent to be able to recover offloaded tool results.

📂 custom_summarizer.py

## Strategy Comparison
Section titled “Strategy Comparison”

StrategyTradeoff
context_manager="auto"Best default. Offloading + summarization + proactive compression
context_manager="agentic"Model self-manages context. Trades tokens for judgment
Offload.truncate(...)Simple, predictable. Loses old info entirely
Offload.summarize(...)Preserves more info. Lossy compression, costs an LLM call
Offload.drop(...)Most aggressive. Content goes to stash only
Context injectionEphemeral per-call data. Never persisted to history

## Resources
Section titled “Resources”

- 📖 Context Management

- 📖 Context Injector

- 📖 Blog: Reduced cost, better isolation, and more resilience
