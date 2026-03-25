# Course Content Changelog

This folder contains individual day content files. Each file overrides the corresponding
entry in the legacy phase files (`course-data-phase1.js`, `course-data-phase2.js`, `course-data-phase3.js`).

**Content validated for:** March 2026  
**Model generation:** Claude 4.x (`claude-sonnet-4-6`, `claude-opus-4-6`, `claude-haiku-4-5-20251001`)  
**Total files:** 60 individual day overrides (day-01.js through day-60.js)

## Update Summary (March 2026)

All 60 days updated based on the comprehensive course review. Key changes:

### Priority 1 — Critical Fixes (Applied)
- [x] All model names/strings updated to Claude 4.x generation
- [x] Open-source model landscape table added (Day 1: Llama 4, DeepSeek R1, Mistral, Qwen, Phi-4)
- [x] Prompt caching added (Days 2 intro, 9 deep-dive, 17 as #1 optimization)
- [x] LangSmith factual error fixed — LangChain product, NOT Anthropic's (Day 15)
- [x] US AI policy updated — Biden EO partially rescinded Jan 2025 (Day 49)
- [x] Voyage AI added — Anthropic acquisition for embeddings (Day 16)

### Priority 2 — Content Additions (Applied)
- [x] GitHub commit tasks added to all 60 days
- [x] LangGraph coverage added (Day 15)
- [x] Open-source competitive pressure added (Days 1, 5, 8, 14, 32, 36, 37)
- [x] DeepSeek R1 strategic inflection (Days 1, 5, 8)
- [x] EU AI Act enforcement timeline updated (Day 49)
- [x] Alignment faking research added (Days 41, 48)
- [x] OpenAI Operator added (Days 5, 25)
- [x] Vibe-coding category implication (Days 32, 43)

### Priority 3 — Enhancements (Applied)
- [x] Pydantic AI added (Day 15)
- [x] CrewAI Flows + memory updates (Day 22)
- [x] AutoGen evolution + Magentic-One (Day 23)
- [x] Artificial Analysis as benchmark resource (Days 18, 36)
- [x] Windsurf added to coding tool landscape (Day 44)
- [x] Computer use pricing context (Day 25)
- [x] AWS Bedrock comparison (Day 45)
- [x] Sparse autoencoders (Day 48)

### Factual Errors Fixed
1. Days 1, 4, 9, 10: Model names updated to current generation
2. Day 15: LangSmith attribution corrected (LangChain, not Anthropic)
3. Day 8: Stale ARR estimates removed, research skill taught instead
4. Day 14: Fine-tuning availability presented honestly with verification links
5. Day 16: Voyage AI acquisition added
6. Day 49: US AI policy updated (Biden EO rescission)
7. Day 38: Mock interview platform updated (Exponent, Interviewing.io)
8. Day 25: Computer use updated from beta to GA
9. Day 45: Azure AI Marketplace model availability noted for verification
10. Day 6: Extended thinking updated to Claude 4.x series

## Day-by-Day Update Log

### Phase 1 — Foundations (Days 1-20)
- **Day 01** — Model landscape: Claude 4.x strings, open-source tier table, DeepSeek R1, GitHub portfolio
- **Day 02** — Tokens: Anthropic token counting API, Gemini 2.5 Pro 1M+, sampling guidance, caching intro
- **Day 03** — CAI: RLAIF prominence, Model Spec resource, constitutional reasoning exercise
- **Day 04** — Claude family: 4.x throughout, product surface map, Claude.ai vs API distinction
- **Day 05** — OpenAI: Operator, DeepSeek R1 response, open-source SWOT threat, GPT-4.5/o4-mini
- **Day 06** — Reasoning: Extended thinking 4.x, budget_tokens, o4-mini, reasoning hurts on easy tasks
- **Day 07** — Multimodal: Native PDF support, video production-ready, structured form extraction
- **Day 08** — Business model: Removed stale ARR, open-source disruption, inference cost trajectory
- **Day 09** — Anthropic API: Model string fix, prompt caching deep-dive, token counting endpoint
- **Day 10** — OpenAI API: Responses API, Structured Outputs default, GPT-4.5, comparison table
- **Day 11** — Tool use: Terminology alignment, MCP progression, error-as-result, injection security
- **Day 12** — MCP: NEW content (was missing), MCP 1.0, transports, OAuth, security model
- **Day 13** — RAG: Contextual Retrieval (Anthropic), Agentic/Graph/Self-RAG, RAGAS framework
- **Day 14** — Fine-tuning: 3-option decision tree (Claude/LoRA/prompting), Phi-4, synthetic data
- **Day 15** — Orchestration: LangSmith fix, LangGraph, Pydantic AI, updated decision guide
- **Day 16** — Embeddings: Voyage AI acquisition, re-ranking, pgvector HNSW vs IVFFlat
- **Day 17** — Cost: Prompt caching as #1, reordered hierarchy, cost attribution by feature
- **Day 18** — Evals: HLE, SWE-bench, Braintrust, Artificial Analysis, CI/CD automation
- **Day 19** — RSP: Updated 2024 RSP, ASL-3 triggers, UKAIS/EU AI Office commitments
- **Day 20** — Capstone: Network effects defensibility, open-source stress test, portfolio checkpoint

### Phase 2 — Protocols & Frameworks (Days 21-40)
- **Day 21** — LlamaIndex: LlamaParse, LlamaCloud, Workflows, competing frameworks
- **Day 22** — CrewAI: Flows, entity memory, async, human_input, updated cost framework
- **Day 23** — AutoGen: Magentic-One, Claude client, SK relationship, Swarm pattern
- **Day 24** — Observability: Braintrust, Arize Phoenix, OpenTelemetry standard, Helicone, cost attribution
- **Day 25** — Computer use: GA status, Operator comparison, UI-TARS, pricing, safety model
- **Day 26** — A2A: Spec evolution, OAuth 2.0, MCP+A2A two-layer architecture
- **Day 27** — ACP: REST-native, protocol convergence reality check, BeeAI status
- **Day 28** — ANP: Adoption reality check, alternative cross-org approaches
- **Day 29** — OASF: Adoption status, A2A Agent Card relationship, procurement checklist
- **Day 30** — Enterprise: Updated certifications, MCP integration layer, integration timeline fix
- **Day 31** — Metrics: TTFT/TTLT distinction, acceptance rate, hallucination measurement, A/B testing
- **Day 32** — Strategy: Network effects, open-source moat question, vibe-coding implication
- **Day 33** — Interview prep: Safety questions, agent design, multi-agent eval, staying current
- **Day 34** — Communication: System prompt as artifact, incident comms, feature spec template
- **Day 35** — Roadmapping: Model deprecation, API versioning, stakeholder communication
- **Day 36** — Competitive: 4-layer monitoring (+ open-source), Artificial Analysis
- **Day 37** — Pricing: Open-source floor, per-seat dominance, freemium guidance
- **Day 38** — GTM: Developer channels, red-teaming gate, launch metrics
- **Day 39** — Capstone: Primary research requirement, enhanced template
- **Day 40** — Mock interview: Phase 2 topics, Anthropic prep, updated platforms

### Phase 3 — Leadership & Ship (Days 41-60)
- **Day 41** — Claude safety: Alignment faking, Model Spec, formal commitments
- **Day 42** — OpenAI safety: DeepMind comparison, org changes, for-profit conversion
- **Day 43** — Claude Code: GA status, SDK/API, GitHub Actions, CLAUDE.md best practices
- **Day 44** — Copilot: Windsurf, GitHub Models, SWE-bench, Copilot Workspace
- **Day 45** — Azure AI Foundry: Bedrock comparison, BYOD pattern
- **Day 46** — Skills: MCP as de facto protocol, governance framework
- **Day 47** — Semantic Kernel: Process Framework, Python SDK, when NOT to use
- **Day 48** — Interpretability: Sparse autoencoders, alignment faking, scaling monosemanticity
- **Day 49** — Policy: EU AI Act timeline (Feb 2025/Aug 2025/Feb 2026), US policy update, GPAI
- **Day 50** — Capstone: Regulatory risk dimension, reference architecture, Bedrock/Azure guidance
- **Day 51** — Teams: AI Safety PM role, Evals Lead, in-person culture
- **Day 52** — OKRs: Agentic dimensions, eval as hygiene vs OKR
- **Day 53** — Red-teaming: Garak, PyRIT, red team report template
- **Day 54** — DX: Anthropic Cookbook, TTFSC metric, error messages as product surface
- **Day 55** — DX audit: Updated 2026 dimensions, Cookbook audit
- **Day 56** — Portfolio: GitHub repo as primary portfolio, organization guide
- **Day 57** — Mock interview: Phase 3 topics, Anthropic-specific preparation
- **Day 58** — Vision: Failure modes to avoid, good examples, deliver aloud
- **Day 59** — Case study: Updated model strings, safety as design constraint
- **Day 60** — Launch: 30/60/90-day action plan, "apply today" call to action
