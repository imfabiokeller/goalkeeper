Models beating video games can feel like AGI.

However, we wondered how crucial Anthropic’s harness was when they reported Fable 5 completed Pokémon FireRed with a “minimal, vision-only harness”. Fable 5 beat Pokémon FireRed with an agent harness that took screenshots, but it failed to complete every game puzzle in ARC-AGI, an intelligence benchmark designed so humans solve 100% of games but current models can’t.

Your browser does not support the video tag.

Example of ARC-AGI-3 puzzle being done by a human. Our agent harness beat all levels without screenshots.

Anthropic isn’t permitted to use a harness for its ARC-AGI set, so our team felt curious using our harness with a weaker model for ARC-AGI-3. We tested our open source Strands SDK with Opus 5 and achieved a 99.95% ARC-AGI-3 score with all levels completed!

Achieving a 99.95% score with Opus 5 and our harness, compared to Opus 5’s current 30.16% score, highlights how much intelligence gets left on the table without a harness. OpenAI’s latest model Astra needed a custom harness to hit 99.99% on ARC-AGI-3. NVIDIA’s AVO harness with Opus 5 scored a 100% on ARC-AGI-3. But, a key difference with our harness is we made the code public.

Through the power of a well-constructed agent loop and basic tools (e.g. bash, grep, file operations), our harness enabled Opus 5 to solve all levels without needing a single screenshot.

## Our agent did its own context engineering

Our harness first renders ARC-AGI-3’s numeric grid as text. The runner stores the latest board in current_board.txt and appends it to a logs.txt file to keep a history of the game. The agent can start to play the puzzle.

The loop kicks off when the action queue is empty, triggering the runner to invoke the agent. Opus 5 can repeatedly search logs, write and run shell or Python scripts, check the results, then adjust its strategy.

- 
```
def analyze(    self,    log_path: Path,    action_num: int,    retry_nudge: str = "",    **kwargs: Any,) -> Optional[dict[str, Any]]:    log_path = Path(log_path)    workspace = log_path.parent
    ...
    path_key = str(log_path)    is_first = self._call_count.get(path_key, 0) == 0    self._call_count[path_key] = self._call_count.get(path_key, 0) + 1
    actions_path = workspace / _ACTIONS_FILE    if actions_path.exists():        actions_path.unlink()  # PRO-LONG clears it every call
    active_route = self._route_for(path_key)
    agent = Agent(        model=self._build_model(*active_route),        tools=make_prolong_tools(workspace),        system_prompt=self._build_system_prompt(),        callback_handler=None,    )    prompt = self._build_prompt(        log_path, action_num, is_first, retry_nudge=retry_nudge, **kwargs    )
    t0 = time.time()    result = None    for attempt in range(_MAX_THROTTLE_RETRIES):        try:            result = agent(prompt)            break        except Exception as exc:            ...    if result is None:        return None    elapsed = time.time() - t0
    text = str(result)    meta = self._extract_usage(result, active_route[0])
    if not actions_path.exists():        ...        try:            agent(                f"You have not written {_ACTIONS_FILE} yet. Write it now with "                'the shape {"actions": ["ACTION1", "ACTION6(30,40)"]} — a list of '                f"1-{self._action_cap} actions to execute in order. Write the file; "                "do not reply with the JSON only."            )        except Exception as exc:            ...        ...
    actions = self._parse_actions_json_text(        actions_path.read_text(errors="replace"), cap=self._action_cap    )
    ...
    return {        "actions": actions,        "hint": self._extract_tag(text, "PLAN") or text[-1500:],        "plan": self._extract_tag(text, "PLAN") or "",        "meta": meta,        "cost": 0.0,    }
```

 Optional[dict[str, Any]]:    log_path = Path(log_path)    workspace = log_path.parent    ...    path_key = str(log_path)    is_first = self._call_count.get(path_key, 0) == 0    self._call_count[path_key] = self._call_count.get(path_key, 0) + 1    actions_path = workspace / _ACTIONS_FILE    if actions_path.exists():        actions_path.unlink()  # PRO-LONG clears it every call    active_route = self._route_for(path_key)    agent = Agent(        model=self._build_model(*active_route),        tools=make_prolong_tools(workspace),        system_prompt=self._build_system_prompt(),        callback_handler=None,    )    prompt = self._build_prompt(        log_path, action_num, is_first, retry_nudge=retry_nudge, **kwargs    )    t0 = time.time()    result = None    for attempt in range(_MAX_THROTTLE_RETRIES):        try:            result = agent(prompt)            break        except Exception as exc:            ...    if result is None:        return None    elapsed = time.time() - t0    text = str(result)    meta = self._extract_usage(result, active_route[0])    if not actions_path.exists():        ...        try:            agent(                f"You have not written {_ACTIONS_FILE} yet. Write it now with "                'the shape {"actions": ["ACTION1", "ACTION6(30,40)"]} — a list of '                f"1-{self._action_cap} actions to execute in order. Write the file; "                "do not reply with the JSON only."            )        except Exception as exc:            ...        ...    actions = self._parse_actions_json_text(        actions_path.read_text(errors="replace"), cap=self._action_cap    )    ...    return {        "actions": actions,        "hint": self._extract_tag(text, "PLAN") or text[-1500:],        "plan": self._extract_tag(text, "PLAN") or "",        "meta": meta,        "cost": 0.0,    }">

Source: GitHub

What if the agent made a bad move? The runner records it in logs.txt. This allows our agent to learn and adjust, effectively running its own context engineering. The loop continues until the agent writes its next action plan in actions.json. Afterwards, the runner validates and executes the plan, kicking off another loop and recording the results. This cycle continues until every level is complete.

## What’s next

This design demonstrated a huge improvement in token-efficiency. The underlying PRO-LONG research, used in our harness, found that keeping history in an external log and retrieving only relevant slices used 4.2–5.8× fewer billed tokens than specialized harnesses (WorldModeler and Schema) with similar ARC-AGI-3 scores.

The results we got back from our agent also revealed an impressive feat of self-directed context engineering. The agent made 734 scripts across 25 games after many loops. Imagine if this pattern extended into physical AI: A Strands Agent enabling a robot to maintain a working model of its environment, predict consequences for an action, then create a goal-oriented plan.

We’d love to hear your thoughts. Find us in our Discord!
