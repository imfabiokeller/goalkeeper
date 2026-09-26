# The judges

Six judges for the first round on September 26. Researched from public
sources on September 26, 2026; LinkedIn profiles were not readable, so
details come from company pages, talks, posts and press. Treat the "what
they will listen for" lines as informed guesses.

## Joseph Morais, Principal Evangelist (Builder Relations), MongoDB

- Path: network and solutions engineer (FMC, Urban Outfitters: CI/CD,
  containers, IaC), Kafka and Hadoop at a payments startup, senior TAM at
  AWS, then Confluent (cloud partner SA, Confluent Cloud evangelist,
  "data in motion"), now MongoDB. Handle "thedatagiant".
- Streaming and event-driven systems are his native language. He has
  posted about running MongoDB in production himself.
- MongoDB's 2026 agent story: memory as database plumbing (automated Voyage
  embeddings, LangGraph long-term memory store, MongoDB 8.3), a three-part
  workshop series on agent architecture, memory systems and harness
  infrastructure, and the "State & Persistence: the problem of agent
  reliability" post (checkpoints, suspend/resume, crash recovery).
- Will listen for: is Atlas doing real work (queue, memory, ledger, change
  streams) or is it a side dish. Change streams as the event bus and
  `$rankFusion` in one aggregation will land with him. Use MongoDB's own
  words: checkpoint, suspend, resume, crash recovery.

## Louis Vichy, Co-founder, OpenRouter

- Co-founded OpenRouter (2023, NYC) with Alex Atallah: one API and one
  key for 300 to 500 models, routing, fallbacks, cost. Series B of $113M
  in May 2026 led by CapitalG, with MongoDB Ventures among the investors.
  A Menlo Ventures piece from 2026 discusses Stripe acquiring OpenRouter
  (reported, not verified here).
- Before: co-founder of Plasmo (browser extension framework, 5k GitHub
  stars) and RosHub (realtime connectivity for robot fleets); engineer at
  Intuit (TurboTax support UI). GitHub "louisgv". RIT, game and
  interactive media design.
- OpenRouter's stated agent trends: longer-running agents, small models for
  routing and classification with specialized models downstream.
- Will listen for: per-step model choice (cheap model for enrichment and
  classification, strong model for the hard tasks, routed by failure),
  cost per task, token counters. He builds developer tools; DX of the
  runtime matters to him. Robot fleets means he has thought about many
  disposable nodes and one coordinator before.

## Brooke Jamieson, Senior Developer Advocate, AWS

- Australian mathematician and ML specialist in NYC. Speaks widely
  (devopsdays, Airflow Summit, university guest lectures) on generative AI,
  Amazon Q, ML, cloud. Medium and Threads presence ("brooke.bytes").
- Has built a real-time voice agent with Strands and published "10 ideas"
  for a Strands hackathon. Today she is pushing Kiro (spec-driven coding),
  Strands Agents, the Strands Harness Optimizer (their Statement One
  story) and lesson 8 of the Strands course on context engineering.
- Will listen for: context management done deliberately (she teaches it),
  spec-driven work (our lens is a spec), and whether we know Strands. Say
  where Strands fits (a fine worker loop) and where it does not (in-process
  swarm as coordination), with respect, not dismissal. Kiro credits form
  is her ask; filling it costs nothing.

## Vin Sachidananda, Partner, Radical Ventures

- PhD and MS in EE from Stanford, research on language models with papers
  at NeurIPS, ICLR, ICML, ACL, EMNLP. Built early LLM products at Google,
  Apple and Amazon; founding engineer at Celect (MIT spinout, acquired by
  Nike) and Clockwork Systems (Stanford). Then Partner at Two Sigma
  Ventures leading AI and deeptech; joined Radical in late 2025.
- Investments: Etched (AI chips), Inception Labs (diffusion LLMs),
  Zeromatter, SDF (acquired by dbt), Iambic, Cerby, Distributional,
  Objective (acquired by Upwork). Infrastructure and research-heavy bets.
- Will listen for: is there a real, defensible idea or a wrapper. He will
  ask the researcher's question: what is the evidence. Have the numbers
  ready (41.7% cross-agent conflict rate; our own bench result on raw vs
  consolidated memory; the two counters). Frame library and lens as a
  thesis, and the runtime as the open half of a platform. He is the one
  judge for whom "where does this go after today" matters.

## Dan Zakon, Director of Engineering, Tenex (TENEX.AI)

- Leads engineering at TENEX.AI, an AI-native managed detection and
  response company built by the ex-Google Chronicle team: an agentic SOC
  where agents triage, investigate and respond to every alert in under a
  minute, with human analysts always in the loop. Raised $250M in 2026 at
  over $1B; ranked first on the 2026 IT-Harvest Cyber 150 by growth.
- Dan has led engineering teams for over a decade (earlier: Veracode,
  Voodoo, MintyBrain, Michigan Ross). Based in New York.
- Will listen for: production reality. Agents that run unattended on real
  alerts, humans in the loop by design, audit trails. Our asks, the
  deterministic gate, the raw append-only record (an audit log by
  construction) and kill-and-resume are his world. He will ask what
  happens when it fails; have the failure paths ready (heartbeat requeue,
  redo on conflict, three failures become an ask).

## Andrey Sibirev, Senior Director of Engineering (Compute), Vercel

- Eleven-plus years of platform and infrastructure: Yandex's Cocaine PaaS
  (he wrote it; handle "kobolog"), Spotify's Helios, Uber's M3 and
  observability, Dropbox compute and fleet management, founded Datadog's
  Fabric org (networking, datacenter architecture, security automation).
  Now runs compute at Vercel: Fluid compute, Sandbox, the substrate agents
  run on.
- Vercel's 2026 line: one compute platform for functions, builds, servers,
  sandboxes and AI workloads; Cursor cloud agents run in Vercel Sandbox;
  AI SDK, AI Gateway, Workflow.
- Will listen for: scheduling, fleets, failure. He has built the thing
  under our workers several times. Do not oversell the compute layer; say
  plainly that hosting exists (his) and the coordination on top is ours.
  Atomic claims, heartbeats, serialized merges, stateless workers are
  words he will check for correctness. The "single server to
  microservices, now for agents" framing is his career.

## Cross-cutting

- Three of six (Sibirev, Zakon, Morais) are systems people. Lead with the
  runtime, not the model.
- Two of six (Vichy, Sachidananda) will judge whether it is a business or
  a thesis. Have the after-today line.
- One (Jamieson) will judge whether we understand context engineering and
  whether we noticed AWS's tools. Both are true; say so.
- Nobody on the panel wants a chat UI, a dashboard or a RAG demo. The
  screen shows a runtime.

## Sources

- https://www.linkedin.com/in/thedatagiant/ (title only), Confluent
  Streamposium speaker page, LinkedIn post "the first time I ran MongoDB
  in production"
- https://www.mongodb.com/company/blog/product-release-announcements/mongodb-for-agentic-era-built-for-developers-ai-agents
- https://www.mongodb.com/company/blog/technical/state-persistence-the-problem-of-agent-reliability
- https://en.wikipedia.org/wiki/OpenRouter, https://openrouter.ai/blog/announcements/series-b/,
  https://www.capitalg.com/insights/Leading-OpenRouters-Series-B,
  https://menlovc.com/perspective/stripe-to-acquire-openrouter-why-everyone-is-obsessed-with-model-routing/,
  https://github.com/louisgv, https://www.crunchbase.com/person/louis-vichy
- https://devopsdays.org/events/2023-denver/speakers/brooke-jamieson/,
  https://airflowsummit.org/speakers/brooke-jamieson/, https://medium.com/@brookejamieson
- https://radical.vc/team/vin-sachidananda/, https://www.vinsachi.com/
- https://tenex.ai/, https://www.pymnts.com/news/investment-tracker/2026/tenex-raises-250-million-as-ai-security-spending-accelerates/,
  https://tenex.ai/tenex-named-1-on-the-2026-it-harvest-cyber-150/, https://x.com/dan_zakon
- https://theorg.com/org/vercel/org-chart/andrey-sibirev, https://www.getprog.ai/profile/andrey_sibirev,
  https://vercel.com/blog/vercel-ship-2026-recap, https://vercel.com/docs/fluid-compute,
  https://vercel.com/docs/sandbox
