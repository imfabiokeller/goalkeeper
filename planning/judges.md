# The judges

The event page (cerebralvalley.ai/e/mongodb-nyc-hackathon) lists six
judges and no scoring rubric. The kickoff slide titled "First Round
Judges" showed about eighteen more, most of them from MongoDB; they are in
"The first-round panel" below. Researched from public sources on September
26, 2026. Treat the "what they will listen for" lines as informed guesses.

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

## The first-round panel (kickoff slide)

Read from a photo of the slide at 14:20; the bottom row was partly hidden
by heads, one name there ends in "Wang", and the rest are unread. Names
marked (unconfirmed) could not be matched to a public profile; check them
before saying them on stage. Every doubt below is against the project as
it stands at 14:30: ARC, 400 puzzles, no goal changes, no crowd.

### Steffan Mejia, Strategic Developer Relations, MongoDB

- Director of Strategic Developer Relations; earlier Principal Consulting
  Engineer at MongoDB and data warehouse operations at Facebook on its
  largest Hadoop cluster. Scale, operations, and whether developers will
  pick this up.
- Doubt: a clever hackathon system no developer could run or reuse.
- Fix: README opens with one diagram and one command to run it locally;
  say which part is reusable (the runtime) and which is the example (ARC).

### Shakil Rafi, MongoDB (Atlas Search)

- Engineer on Atlas Search in New York since 2021. He knows `$search`,
  `$vectorSearch` and `$rankFusion` from the inside.
- Doubt: hybrid search used as a buzzword. Why these weights, which
  analyzer on program text and digit grids, and do you know search indexes
  lag behind writes?
- Fix: have the index definitions and the one retrieval pipeline ready;
  explain the weights in one sentence; say the last failures on a puzzle
  come from a plain indexed query, not search, because search is
  eventually consistent.

### Aniket Divecha, Senior Engineering Manager, MongoDB

- Engineering leader: software development manager at Amazon, head of
  engineering at Glossier. Team execution and operational maturity.
- Doubt: a demo held together by luck. What breaks at 20 workers, and how
  would you know?
- Fix: point at the tests (70 plus), the invariants command run every 30
  minutes, and the failure paths (heartbeat requeue, redo on version
  conflict, block after five attempts).

### Abhay (surname unconfirmed), Staff Engineer, MongoDB

- A staff engineer reads code. Correctness of the database layer.
- Doubt, confirmed in our code: heartbeats and the reaper use each
  process's own clock, and the merge writes state and task in separate
  writes with no transaction.
- Fix: database time for heartbeats and the reaper; a transaction around
  the merge; the index plan of the claim query ready to show.

### Laura Zhukas, Product, MongoDB

- Product at MongoDB in New York.
- Doubt: who is the user, and which MongoDB features does this show off?
  Why call Voyage yourselves when Atlas can generate embeddings?
- Fix: one sentence on the user (teams running agent fleets on long jobs);
  name the four jobs Atlas does; say automated embeddings are the next
  step and why not today.

### Blake (surname unconfirmed), Senior Solutions Architect, MongoDB

- Sizes and designs customer deployments.
- Doubt: an append-only library that grows without bound. Document sizes,
  indexes, what happens at a billion tokens.
- Fix: largest source document size measured; Online Archive for old
  runs; shard `sources` when needed; indexes listed per query.

### Manav Thadani, Solutions Architect, MongoDB

- Solutions architect in New York.
- Doubt: would a customer run this in production, and what would it cost?
- Fix: cost per solved puzzle on screen; connection pools sized for 20
  workers plus the screen; the screen caches its database client.

### Kai Yong Lai (Vandyck), MongoDB Champion

- MongoDB community leader, user group leader, full-stack developer and
  tutorial author; 2025 William Zola Award.
- Doubt: can someone learn from this? Is it explained, or only shown?
- Fix: the README and the video explain the idea in plain words; the repo
  is public and runs.

### Brooke Jamieson, Senior Developer Advocate, AWS

- See her section above. Current doubt: her team's ARC-AGI-3 harness post
  reports near-perfect scores with a frontier model; our cheap-model
  ARC-AGI-1 numbers will look small.
- Fix: frame ours as the same question her team asked (how much the
  harness adds) answered with a control group; open one worker's context
  with a token count per section.

### Jacky Liang, Developer Solutions Lead, OpenRouter

- Writes OpenRouter's developer posts, including one on evaluating which
  model to use for what you build.
- Doubt: why this model? Did you compare any? What does a solve cost?
  Will 20 workers hit rate limits?
- Fix: say we fixed one model on purpose so the harness is the only
  variable; cost per solve from OpenRouter's reported cost; provider
  fallbacks configured; cached tokens shown (the goal is a stable prefix).

### Ty Zhang, Vercel

- Software engineer at Vercel in New York, focused on web experience and
  design.
- Doubt: a rough screen. Jank, empty states, a change stream that dies
  when the Vercel function hits its time limit.
- Fix: polish the stage view first; reconnect the stream with its resume
  token or serve it from the VPS; test the page on a projector.

### Marcus Ellison, Founder, Breadcrumb.ai

- Founder and CEO of Breadcrumb.ai (AI dashboards from data); formerly
  head of partnerships at Cerebral Valley, the organizer. He has seen what
  wins these events.
- Doubt: a screen that needs narration, a story that takes a minute to
  land.
- Fix: the thesis in the first ten seconds; every number on the stage view
  labeled in words; the screen understandable with the sound off.

### Michael Zhang, Partner, Long Lake

- Long Lake is an AI holding company that buys services businesses and
  runs them with AI. He thinks in back-office work and unit economics.
- Doubt: ARC is a puzzle. What real work in a real business runs on this,
  and what does a unit cost?
- Fix: the after-today line names back-office jobs with a check (claims,
  reconciliations, document processing); cost per unit and recovery from
  crashes are the numbers that matter to him.

### Across the panel

- MongoDB is the largest group. Database correctness is scored by people
  who build the database; fix the two gaps above before 15:30.
- Two judges (Sachidananda, Jamieson) will ask what the curve does with
  memory off. The current solve rate is cumulative and rises from retries
  alone; a library-off control group on fresh puzzles is the only answer.
- Two judges (Zhang at Long Lake, Ellison) judge the story and the
  business, not the code: thesis first, real work named, cost shown.
- One judge (Zhang at Vercel) judges the screen itself.

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

- https://cerebralvalley.ai/e/mongodb-nyc-hackathon, the kickoff slide photo
- https://theorg.com/org/mongodb/org-chart/steffan-mejia, https://www.linkedin.com/in/srafi1/,
  https://www.linkedin.com/in/adivecha, https://www.linkedin.com/in/laurazhukas/,
  https://www.linkedin.com/in/manav-thadani-aaa9b7227/,
  https://www.mongodb.com/community/forums/t/our-mongodb-user-group-leader-of-the-month-is-kai-yong-lai-vandyck/333677,
  https://openrouter.ai/blog/announcements/ori-eval/, https://tyz.sh/,
  https://theorg.com/org/breadcrumb-ai/org-chart/marcus-ellison, https://llmh.com/

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
