// Phase 3 course content — Days 41-60
// Loaded by course.html; extends window.COURSE_DAY_DATA

window.COURSE_DAY_DATA = window.COURSE_DAY_DATA || {};

Object.assign(window.COURSE_DAY_DATA, {

41: {
  subtitle: "How Anthropic keeps Claude safe — from Constitutional AI to the Responsible Scaling Policy.",
  context: `<p>Claude's safety architecture is a layered stack, not a single system. At the training layer, <strong>Constitutional AI (CAI)</strong> embeds values through a self-critique and revision loop guided by a written set of principles — so Claude reasons about potential harm rather than pattern-matching against a prohibited-content list. <strong>RLHF and RLAIF</strong> further refine behavior using preference data from humans and AI feedback. The result: values internalized at training time, not patched on afterward. This is why Claude's refusals are contextual and nuanced rather than keyword-triggered.</p>
  <p>At the deployment layer, Anthropic's approach includes <strong>usage policies</strong> (explicit rules about permitted and prohibited uses), <strong>pre-release red-teaming</strong> (systematic adversarial testing before each model ships), and <strong>prompt-injection defenses</strong> (Claude is trained to resist instructions embedded in tool outputs or retrieved content that attempt to override its system prompt). The <strong>Responsible Scaling Policy (RSP)</strong> is the formal mechanism tying deployment to safety evaluations: models are assessed against ASL thresholds before release, and Anthropic commits to enhanced safeguards if a model approaches ASL-3 capability levels (meaningful CBRN uplift). All deployed Claude models are ASL-2 as of early 2026.</p>
  <p>For AI PMs, Claude's safety architecture creates both constraints and competitive advantages. Constraints: some use cases are restricted or require explicit approval; some user requests Claude will decline where a competitor's model would not. Advantages: enterprise buyers with compliance requirements prefer Claude's documented safety architecture; CAI makes behavior more predictable and auditable; the RSP gives enterprise customers a framework for evaluating Anthropic's deployment decisions over time.</p>`,
  tasks: [
    { title: "Read Claude's three core safety documents", description: "Read the model card (anthropic.com/model-card), Usage Policy (anthropic.com/usage-policy), and RSP (anthropic.com/responsible-scaling-policy). For each, write one sentence on the most product-relevant commitment Anthropic makes.", time: '30 min' },
    { title: "Map your product against the usage policy", description: "Choose a product from earlier in the course. Map every feature against Claude's usage policy. Flag features that fall into restricted categories and note the design changes needed for compliance.", time: '20 min' },
    { title: "Design a red-teaming exercise", description: "Design a 2-hour red-teaming sprint for a Claude-based customer support product. What categories of adversarial inputs do you test? Write 5 specific test prompts. What is pass vs. fail for each?", time: '20 min' },
    { title: "Enterprise safety differentiation pitch", description: "Write a 150-word pitch to a risk-conscious financial services buyer explaining why Claude's safety architecture — specifically CAI and the RSP — is a reason to choose it over a competitor. Be specific.", time: '10 min' },
  ],
  interview: {
    question: "How does Constitutional AI differ from a content filter, and why does it matter for product design?",
    answer: `A content filter is post-hoc: the model outputs, the filter checks. It's brittle — bypassed by rephrasing, and produces blunt refusals.<br><br>Constitutional AI is different: values are embedded during training through a self-critique process. Claude reasons about harm — weighing context, intent, and consequences — rather than matching against a block-list. This produces contextual responses: Claude declines a jailbreak attempt while helping with a legitimately similar request.<br><br>The product design implication is significant. With a filter, you design around it. With CAI, you engage Claude's reasoning directly in the system prompt. A prompt that says "This assistant serves licensed medical professionals in clinical settings" genuinely changes Claude's reasoning about medical queries — not just its output checking. That's a fundamentally more powerful customization mechanism.`
  },
  pmAngle: "Claude's safety architecture is a product differentiator in regulated industries. The PM who can explain CAI and the RSP credibly to a healthcare, legal, or financial services buyer closes more enterprise deals.",
  resources: [
    { type: 'BLOG', title: "Claude's Model Card", url: 'https://www.anthropic.com/model-card', note: "Anthropic's transparency document — capabilities, limitations, safety properties." },
    { type: 'BLOG', title: 'Responsible Scaling Policy', url: 'https://www.anthropic.com/responsible-scaling-policy', note: 'How Anthropic links deployment decisions to safety evaluations.' },
    { type: 'PAPER', title: 'Constitutional AI Paper', url: 'https://arxiv.org/abs/2212.08073', note: 'The foundational paper — understand the mechanism, not just the label.' },
  ]
},

42: {
  subtitle: "OpenAI's approach to safety — the Preparedness Framework, o-series evaluations, and key divergences from Anthropic.",
  context: `<p>OpenAI's <strong>Preparedness Framework</strong>, released in 2023 and updated through 2025, is the closest analogue to Anthropic's RSP. It defines four risk categories (CBRN, cybersecurity, deception, model autonomy), scores models on each before deployment, and commits to halting deployment if scores exceed defined thresholds. The key structural similarity: both frameworks tie deployment decisions to pre-release capability evaluations. The key difference: Anthropic's RSP has a longer track record of being tested under real commercial pressure; OpenAI's framework was developed partly in response to high-profile safety team departures in 2024.</p>
  <p>The o-series reasoning models introduced a new safety dimension: <strong>chain-of-thought faithfulness</strong>. When a model thinks at inference time, is its stated reasoning an accurate reflection of its computation — or a post-hoc rationalization? OpenAI's o1 system card documented cases where the model's visible reasoning chain didn't fully reflect its decision process. Claude's extended thinking mode faces the same challenge. Anthropic's mechanistic interpretability research is partly aimed at developing tools to verify that visible reasoning actually corresponds to internal computation.</p>
  <p>For competitive positioning, the honest characterization is: both organizations have serious safety programs; Anthropic has longer-standing safety-first organizational DNA and public commitments that predate commercial pressure; OpenAI has greater commercial scale and a more complex organizational history around safety tradeoffs. In enterprise sales, compliance-sensitive buyers research vendor safety posture. Know both frameworks well enough to answer questions about either honestly.</p>`,
  tasks: [
    { title: 'Compare RSP and Preparedness Framework', description: "Build a comparison table on: capability thresholds, what triggers a pause, how evaluations are conducted, and who decides. Where are the frameworks most different?", time: '25 min' },
    { title: 'Research o1 chain-of-thought faithfulness', description: "Search 'o1 chain of thought faithfulness OpenAI system card'. What did OpenAI find? What is the product implication for features that use extended thinking?", time: '20 min' },
    { title: 'Write an enterprise vendor safety comparison', description: "Write a 1-page document a CISO could use to compare Claude vs GPT-4o on safety architecture. Cover: training approach, pre-deployment evaluation, usage policies, incident response, organizational structure. Be balanced and evidence-based.", time: '25 min' },
    { title: 'Safety-helpfulness tradeoff case study', description: "Find one documented case where OpenAI or Anthropic faced a public safety-helpfulness tradeoff. What was the tradeoff, how was it resolved, and what would you have done differently as the product PM?", time: '10 min' },
  ],
  interview: {
    question: "How would you compare Anthropic's and OpenAI's safety approaches for an enterprise buyer?",
    answer: `Both have serious documented frameworks, but with meaningful differences in history and emphasis.<br><br>Anthropic was founded specifically because of concerns about AI safety tradeoffs, and the safety-first mission is constitutive — it's why the organization exists. The RSP makes specific capability-dependent commitments that have been maintained through commercial pressure. Constitutional AI embeds safety at training time.<br><br>OpenAI has greater commercial scale, a broader product surface, and a more complex organizational history around safety prioritization. The Preparedness Framework is a strong commitment but newer and with less demonstrated track record under pressure.<br><br>As an enterprise buyer, I'd review both companies' public documentation and ask each vendor directly about incident history and resolution. Organizational culture matters as much as framework documents — ask for specific examples of cases where safety concerns slowed or changed a product decision.`
  },
  pmAngle: "You will be asked by enterprise buyers to explain the difference between Anthropic and OpenAI on safety. A balanced, evidence-based answer builds more trust than advocacy.",
  resources: [
    { type: 'DOCS', title: 'OpenAI Preparedness Framework', url: 'https://cdn.openai.com/openai-preparedness-framework-beta.pdf', note: 'The primary document — compare directly to the RSP.' },
    { type: 'BLOG', title: 'OpenAI o1 System Card', url: 'https://openai.com/index/openai-o1-system-card/', note: 'Safety evaluation for o1 — includes the chain-of-thought faithfulness findings.' },
    { type: 'BLOG', title: 'Anthropic Safety Research', url: 'https://www.anthropic.com/research', note: 'Interpretability, evals, and red-teaming research that informs the RSP.' },
  ]
},

43: {
  subtitle: "The agentic CLI that turns Claude into a full-stack developer — and what it means for PM workflows.",
  context: `<p><strong>Claude Code</strong>, launched by Anthropic in February 2025 and reaching GA in April 2025, is an agentic coding tool that operates in your terminal, reads the actual project filesystem, writes code across multiple files, executes shell commands, runs tests, and iterates on failures — autonomously and without re-prompting at each step. By early 2026, Claude Code supports up to 10 concurrent sub-agents for parallelizing large tasks, hooks for pre/post execution rules, and the Agent SDK for custom orchestration workflows. The <strong>CLAUDE.md</strong> file is the product's most important concept: a project-level instruction file placed at the repo root that gives Claude project-specific context — tech stack, conventions, file layout, and do-not-touch rules — at every session start.</p>
  <p>The permission model is central to Claude Code's design philosophy. Before writing files, executing shell commands, or making git commits, Claude Code pauses for explicit developer approval — keeping humans in the loop on side-effecting actions. This design makes Claude Code safe for production codebases while still enabling multi-file, multi-step autonomous work. Tasks that previously took developers days — security audits across a large codebase, dependency upgrades, comprehensive test coverage improvements — can be completed in hours.</p>
  <p>For AI PMs, Claude Code is directly valuable in three workflows: <strong>codebase understanding</strong> (ask Claude Code to explain an unfamiliar codebase before a technical design review), <strong>prototype building</strong> (build proof-of-concept implementations without depending on engineering bandwidth), and <strong>specification generation</strong> (Claude Code can draft technical specs from high-level product descriptions, which engineers then refine). The PM who can produce a working prototype in 4 hours before a customer meeting operates fundamentally differently than one who can only describe ideas in documents.</p>`,
  tasks: [
    { title: 'Install and run Claude Code', description: 'Install Claude Code (docs.anthropic.com/en/docs/claude-code). Navigate to any codebase. Ask it to: (1) explain the architecture in 5 sentences, (2) identify the 3 most complex functions, (3) suggest one specific improvement. Document what it gets right and misses.', time: '30 min' },
    { title: 'Write a CLAUDE.md for your project', description: 'Write a CLAUDE.md for the ai-course-platform (or any project). Include: tech stack, naming conventions, testing approach, important files, and what not to modify. Aim for 200–400 words.', time: '20 min' },
    { title: 'Build a small prototype', description: 'Use Claude Code to build something small: a cost calculator, a data parser, or a simple API integration. Time it. Compare to manual effort. Note where human guidance was most needed.', time: '30 min' },
    { title: 'PM workflow integration design', description: 'Design how you would incorporate Claude Code into your daily PM workflow: codebase review before design meetings, generating technical specs, building prototypes. What is the first workflow you would change?', time: '10 min' },
  ],
  codeExample: {
    title: 'CLAUDE.md structure — project context file',
    lang: 'js',
    code: `// CLAUDE.md lives at the repo root and gives Claude Code persistent project context.
// Below simulates the structure of a well-written CLAUDE.md

const CLAUDE_MD_EXAMPLE = [
  '# Claude Code Context — ai-course-platform',
  '',
  '## Architecture',
  '- Next.js 14 with /api serverless routes (pages router, not app router)',
  '- Static HTML in /public served via CDN (no SSR for course pages)',
  '- Supabase (Postgres) for progress; Clerk for auth; Stripe for payments',
  '',
  '## Key files',
  '- /public/course.html — main course player (SPA, vanilla JS)',
  '- /public/course-data-phase*.js — day content loaded via script tag',
  '- /api/check-access.js — Supabase RLS access gate',
  '',
  '## Conventions',
  '- Vanilla JS in /public (no bundler, no npm imports)',
  '- API routes: always return { error } field on failure',
  '- Never skip Supabase RLS policies',
  '',
  '## Do NOT',
  '- Add npm deps to /public (no bundler)',
  '- Modify CSS custom properties in course.html (brand-locked)',
  '- Use localStorage (blocked in sandbox)',
].join('\n');

console.log('CLAUDE.md sections:');
CLAUDE_MD_EXAMPLE.split('## ').filter(Boolean).forEach(s =>
  console.log(' •', s.split('\n')[0])
);
console.log('\nWith this context Claude Code knows:');
['tech stack without asking', 'which files are safe to modify', 'project-specific conventions'].forEach(x =>
  console.log(' ✓', x)
);`
  },
  interview: {
    question: "How does Claude Code change how an AI PM should work?",
    answer: `Claude Code changes the PM role in two important ways: it removes the prototype-dependency on engineering bandwidth, and it enables codebase-level understanding previously available only to engineers.<br><br>On prototyping: instead of PRD → wait for engineering PoC → discover fatal flaws, the PM builds the prototype in hours, discovers flaws personally, and arrives at the design review with a refined idea rather than a hypothesis.<br><br>On codebase understanding: a PM who can ask Claude Code to explain the recommendation engine architecture and then ask follow-up questions is a fundamentally better technical collaborator. They can challenge estimates, identify hidden complexity, and catch technical debt before it shows up in sprint planning.<br><br>The meta-point: Claude Code reduces the technical literacy gap between PMs and engineers. At frontier AI labs, PMs who can speak precisely about technical constraints are significantly more effective than those who can only describe product ideas.`
  },
  pmAngle: "Claude Code is one of Anthropic's most important commercial products. As a PM at Anthropic, you should be a power user — not to be an engineer, but to understand the product deeply enough to represent it credibly and use it to make your own work better.",
  resources: [
    { type: 'DOCS', title: 'Claude Code Documentation', url: 'https://docs.anthropic.com/en/docs/claude-code', note: 'Installation, CLAUDE.md format, sub-agents, hooks, and Agent SDK.' },
    { type: 'BLOG', title: 'Introducing Claude Code', url: 'https://www.anthropic.com/news/claude-code', note: "Anthropic's announcement and capability overview." },
    { type: 'GITHUB', title: 'Claude Code Quickstarts', url: 'https://github.com/anthropics/anthropic-quickstarts', note: 'Reference implementations and example CLAUDE.md files.' },
  ]
},

44: {
  subtitle: "GitHub Copilot's ecosystem — understanding the largest-deployed AI coding product in the world.",
  context: `<p><strong>GitHub Copilot</strong> is the most widely deployed AI coding tool, with over 1.3 million paid subscribers as of early 2025 and deep integration across VS Code, JetBrains, Visual Studio, and the terminal. Originally an inline autocomplete tool, Copilot has expanded into a full ecosystem: <strong>Copilot Chat</strong> (conversational coding), <strong>Copilot in GitHub.com</strong> (PR summaries, issue triage), <strong>Copilot Autofix</strong> (automated security vulnerability remediation), and by late 2025, a full <strong>agentic Copilot</strong> with multi-file task execution. The product is powered by a multi-model infrastructure including OpenAI, Anthropic, and Google models, selectable by the user or automatically routed by task type.</p>
  <p>The <strong>Copilot Extensions</strong> ecosystem (launched 2024) is GitHub's platform bet: third-party developers build extensions that bring external capabilities into the Copilot Chat interface — a Jira extension adds ticket context, a Datadog extension surfaces production metrics, a custom extension accesses proprietary documentation. This is GitHub's answer to MCP: a pre-built integration layer for common developer workflows, surfaced through the IDE. For AI PMs building developer tools, a Copilot Extension is a distribution channel worth evaluating — reaching developers in their existing context without requiring a context switch.</p>
  <p>The competitive dynamic between Copilot and Cursor/Claude Code reveals a fundamental product question: is AI coding assistance a point solution or a workflow integration? Copilot's strength is ubiquity — already in every VS Code install, zero behavior change required. Its weakness is that inline completion is now table stakes, and Cursor's multi-file context awareness and Claude Code's agentic terminal represent qualitatively higher productivity gains for complex tasks. GitHub's response (agentic Copilot, multi-model support) is directionally right, but first-mover advantage in agentic workflows may be harder to overcome than in autocomplete.</p>`,
  tasks: [
    { title: 'Map the Copilot product ecosystem', description: 'Research and map all Copilot products: capabilities, pricing, and how they connect. Build a diagram showing individual, enterprise, and developer tool experiences. What does the full ecosystem reveal about GitHub\'s strategy?', time: '20 min' },
    { title: 'Copilot vs Cursor vs Claude Code comparison', description: 'Compare on: task completion approach, context model (file vs codebase), pricing, CI/CD integration, and multi-model support. Build a feature comparison table from public information.', time: '25 min' },
    { title: 'Evaluate the Copilot Extensions opportunity', description: 'For a developer tool you would build: would a Copilot Extension create meaningful distribution leverage? What workflow would the extension surface? Write a 200-word extension concept brief.', time: '20 min' },
    { title: 'Enterprise AI coding tool selection framework', description: 'Build a 10-question evaluation framework for a 500-person engineering org choosing an AI coding tool. Cover: security/data handling, IDE compatibility, model quality, enterprise management features, and cost at scale.', time: '15 min' },
  ],
  interview: {
    question: "How does GitHub Copilot's competitive position look against Claude Code and Cursor in the agentic era?",
    answer: `Copilot's position is more nuanced now that the market has moved past autocomplete. Its strengths remain: pre-installed in VS Code for millions of developers, enterprise management infrastructure (SSO, audit logs, usage policies), and GitHub platform integration (PRs, issues, Actions) that no standalone tool can match.<br><br>The structural challenge: Copilot built its install base on a capability now commoditizing. Cursor's multi-file context and Claude Code's agentic terminal represent meaningfully higher productivity on complex tasks. For a developer doing a codebase-wide refactoring or building a feature across 20 files, Claude Code delivers what Copilot Chat cannot.<br><br>GitHub's response — agentic Copilot, multi-model support — is the right direction. But first-mover disadvantage in agentic patterns is real. Developers who've built workflows with Claude Code or Cursor are unlikely to switch back.<br><br>Likely outcome: Copilot retains the enterprise market (compliance, integration depth, zero-friction deployment) while specialized tools capture developer power users.`
  },
  pmAngle: "GitHub Copilot is the most important competitor benchmark for any AI coding product. If your tool doesn't beat Copilot on the specific task you're optimizing for, you have a feature GitHub will ship next quarter.",
  resources: [
    { type: 'DOCS', title: 'GitHub Copilot Documentation', url: 'https://docs.github.com/en/copilot', note: 'Full feature coverage including Extensions, CLI, and enterprise management.' },
    { type: 'DOCS', title: 'Copilot Extensions', url: 'https://docs.github.com/en/copilot/building-copilot-extensions', note: 'How to build a Copilot Extension — a distribution channel for developer tools.' },
    { type: 'BLOG', title: 'GitHub Next', url: 'https://githubnext.com', note: "GitHub's research projects — leading indicators of future Copilot capabilities." },
  ]
},

45: {
  subtitle: "Microsoft's unified AI development platform — and why enterprise AI deployments run through Azure.",
  context: `<p><strong>Azure AI Foundry</strong> (consolidated from Azure AI Studio and Azure Machine Learning in 2024) is Microsoft's unified platform for enterprise AI development and deployment. It provides: model access (OpenAI models, Meta Llama, Mistral, and third-party models including Claude via Azure AI Marketplace), the <strong>Azure AI Foundry Agent Service</strong> (managed agent infrastructure with built-in tool integration, state management, and MCP support as of 2025), prompt flow for visual orchestration, content safety APIs, and fine-tuning infrastructure. For AI PMs, Azure AI Foundry is where enterprise AI actually gets built and deployed at scale — it hosts a significant fraction of enterprise AI production workloads due to existing Azure enterprise agreements, M365 integration, and Azure's compliance portfolio (FedRAMP, HIPAA, SOC 2, GDPR).</p>
  <p>The <strong>Azure AI Foundry Agent Service</strong> is Microsoft's managed agent runtime — serverless infrastructure for AI agents. Developers define agent logic and tool integrations; Azure handles scaling, state persistence, and observability. The Agent Service supports MCP servers as a first-class integration: point an Azure agent at any MCP server and it uses the tools that server exposes. This makes Azure AI Foundry a neutral platform for multi-framework agent deployments — AutoGen agents, Semantic Kernel agents, and custom agents all run on the same infrastructure.</p>
  <p>For PMs at companies with existing Azure enterprise agreements, Azure AI Foundry resolves enterprise procurement friction that direct API access does not: data stays in the customer's Azure tenant, access is controlled via Azure Active Directory, audit logs go to Azure Monitor, and the compliance certifications the customer already holds extend to AI workloads. This compresses security review from weeks to days — a procurement accelerant that is often more important to the enterprise sale than model quality differences.</p>`,
  tasks: [
    { title: 'Explore Azure AI Foundry', description: 'Go to azure.microsoft.com/products/ai-foundry. Review: models available, Agent Service pricing, compliance certifications. Write 200 words on when you would recommend Azure AI Foundry over a direct Anthropic API integration.', time: '25 min' },
    { title: 'Design an Azure AI Foundry deployment architecture', description: 'You are deploying a legal AI product for a Fortune 500 company with an existing Azure enterprise agreement. Design the full architecture: which AI Foundry components you use, how Claude is accessed, where data lives, and how access is controlled via Azure AD.', time: '25 min' },
    { title: 'Azure vs direct API comparison', description: 'Compare deploying Claude via direct Anthropic API vs via Azure AI Marketplace on: pricing, compliance, data residency, SLA, latency, and model version availability. Build a decision matrix for an enterprise buyer.', time: '20 min' },
    { title: 'MCP on Azure AI Foundry Agent Service', description: 'Research how the Azure AI Foundry Agent Service supports MCP servers. What is the registration mechanism? What are the security implications of connecting an Azure-hosted agent to an external MCP server?', time: '10 min' },
  ],
  interview: {
    question: "Why does enterprise AI deployment often go through Azure AI Foundry rather than direct API access?",
    answer: `For enterprise customers with existing Azure relationships, Azure AI Foundry resolves four deployment friction points simultaneously.<br><br>First, compliance and data residency. Enterprise security teams have already approved Azure workloads against their compliance requirements — HIPAA, FedRAMP, SOC 2, GDPR. AI workloads on Azure inherit those approvals rather than requiring a new vendor assessment for Anthropic as a direct vendor. That's weeks of security review eliminated.<br><br>Second, identity and access management. Azure AI Foundry uses Azure Active Directory — the identity system the enterprise already uses for M365. No new OAuth flows, no new credential management.<br><br>Third, cost management. Azure AI costs appear on the existing Azure invoice, allocatable to existing cost centers with existing FinOps tooling. CFOs prefer single vendor invoices.<br><br>Fourth, enterprise SLA. Azure's 99.9%+ SLAs with financial penalties are more bankable for enterprise procurement than direct API terms. These factors compound into a procurement process that is weeks faster for existing Azure customers.`
  },
  pmAngle: "Enterprise AI deals often close or fail based on deployment architecture, not model quality. A PM who understands why Azure AI Foundry matters to enterprise IT can accelerate deals that would otherwise die in security review.",
  resources: [
    { type: 'DOCS', title: 'Azure AI Foundry Documentation', url: 'https://learn.microsoft.com/en-us/azure/ai-studio/', note: 'Complete documentation including Agent Service and MCP integration.' },
    { type: 'BLOG', title: 'Azure AI Foundry Agent Service', url: 'https://azure.microsoft.com/en-us/blog/azure-ai-foundry/', note: "Microsoft's announcement of the unified agent infrastructure." },
    { type: 'DOCS', title: 'Claude on Azure AI Marketplace', url: 'https://azuremarketplace.microsoft.com/en-us/marketplace/apps/anthropic.claude', note: 'How to access Claude models through Azure infrastructure.' },
  ]
},

46: {
  subtitle: "Reusable agent skills and registries — building the components that agents discover and compose.",
  context: `<p><strong>Agent skills</strong> are discrete, reusable capabilities that an AI agent can invoke to complete specific tasks. The skills framework adds a discovery and registry layer on top of individual tools: instead of hardcoding which tools an agent has, the agent discovers available skills at runtime from a <strong>skill registry</strong> — a catalog of capabilities with input/output schemas and capability descriptions. This dynamic discovery enables true composability: an orchestrator agent can spin up a new task and select the right skills without a fixed tool list.</p>
  <p>GitHub Copilot implemented this pattern with <strong>Agent Skills</strong> in VS Code v1.108 (late 2025): developers define reusable domain-specific automation routines that the Copilot agent can discover and invoke. The <strong>MCP registry pattern</strong> — MCP servers discovered via well-known URLs and registered in a catalog — is the broader ecosystem implementation of the same idea. CrewAI Enterprise, AutoGen's AgentRuntime, and Azure AI Foundry's Agent Service all provide some form of skill or tool registry.</p>
  <p>The strategic question for AI PMs: open or proprietary skills? Open skills (publishing your MCP server or skill definition publicly) create ecosystem leverage — other agents and developers build on your capability, increasing adoption and potentially creating network effects. Proprietary skills create moats — capabilities only your agents can use. GitHub Copilot Extensions (a skills platform, open ecosystem) and a company's private MCP server fleet (proprietary) are examples of each strategy. The right choice depends on whether you are building a platform (open) or a product (proprietary).</p>`,
  tasks: [
    { title: 'Design a skill registry for an enterprise AI platform', description: 'You are building an AI platform serving 50 business units. Design the skill registry: metadata schema for each skill, how business units publish new skills, how the orchestrator discovers and selects skills at runtime, and governance controls that prevent unsafe skills from being deployed.', time: '25 min' },
    { title: 'Write 5 skill definitions', description: 'Write complete skill definitions (MCP tool schema or OASF format) for: expense approval, contract review, code security scan, weekly report generation, and CRM record enrichment. Each must be precise enough for an agent to use without additional guidance.', time: '25 min' },
    { title: 'Open vs proprietary skills decision', description: 'For your AI product: identify 3 skills you would open to the ecosystem and 3 you would keep proprietary. Write the strategic rationale for each decision.', time: '15 min' },
    { title: 'Explore GitHub Copilot Agent Skills', description: "Research VS Code Agent Skills (VS Code 1.108 release notes). What is the definition format? How are skills invoked by the agent? What community skills have been built?", time: '15 min' },
  ],
  interview: {
    question: "What is the difference between a tool, a skill, and an agent, and how do they compose?",
    answer: `Tools are atomic functions: get_weather(city), search_database(query). No internal state, no multi-step logic. MCP formalizes the tool definition and connection layer.<br><br>A skill is a reusable multi-step workflow built from tools. "Weekly report generation" is a skill: query the database, format in a spreadsheet, email to recipients. Skills encapsulate domain logic at a higher level of abstraction than individual tools.<br><br>An agent is an autonomous system that perceives state, selects and executes skills and tools, maintains context across steps, and produces outcomes. The agent is the planner; skills and tools are the execution layer.<br><br>Composition: well-designed platforms separate these layers cleanly. Agents discover available skills from a registry rather than having them hardcoded. Skills call abstract tool interfaces rather than hardcoded implementations. This separation enables skill and tool substitution without modifying agent logic — the foundation of truly composable agent platforms.`
  },
  pmAngle: "The skill/registry pattern is how AI platforms achieve extensibility at scale. If you're building a platform rather than a product, the skill registry design — what's open, what's gated, who can publish — is the most consequential architectural decision you'll make.",
  resources: [
    { type: 'DOCS', title: 'VS Code Agent Skills', url: 'https://code.visualstudio.com/updates/v1_108#agent-skills', note: "GitHub Copilot's implementation of reusable agent skills in the IDE." },
    { type: 'DOCS', title: 'MCP Servers Registry', url: 'https://github.com/modelcontextprotocol/servers', note: 'Official and community MCP server registry — the open skill ecosystem.' },
    { type: 'DOCS', title: 'OASF Specification', url: 'https://github.com/agntcy/oasf', note: 'Open Agent Schema Framework — standardized agent capability descriptions.' },
  ]
},

47: {
  subtitle: "Semantic Kernel for enterprise — Microsoft's production-ready AI orchestration framework.",
  context: `<p><strong>Semantic Kernel (SK)</strong> is Microsoft's enterprise-grade AI orchestration framework, designed for production AI applications on Azure. While AutoGen focuses on multi-agent research and development workflows, SK is purpose-built for enterprise production: deep Azure OpenAI integration, .NET and Python SDKs, enterprise security patterns, and official Microsoft support. The core abstraction is the <strong>Kernel</strong> — a central AI runtime connecting LLM services, memory, and <strong>plugins</strong> (SK's term for tool collections). The OpenAPI plugin type automatically generates callable functions from any REST API with an OpenAPI spec — a major productivity win for teams integrating enterprise systems.</p>
  <p>SK's strategic relationship with AutoGen is complementary by design: SK handles enterprise-grade orchestration and plugin management; AutoGen handles complex multi-agent coordination. Microsoft's official guidance (2025) is to use SK as the production deployment framework and integrate AutoGen's multi-agent capabilities when needed. The SK + AutoGen stack is Microsoft's answer to LangChain — production-ready and enterprise-supported, optimized for teams on Azure.</p>
  <p>The most powerful SK feature for enterprise AI PMs is the <strong>Planner</strong>: a meta-capability where the Kernel dynamically creates a plan (a sequence of plugin function calls) to accomplish a goal described in natural language, using whatever plugins are registered. The Planner pattern enables "AI as workflow automation" — users describe what they want in plain language and the Kernel constructs execution steps automatically. This is the architecture behind products like Microsoft Copilot for M365: a user asks "generate the Q3 board report" and the Planner orchestrates data retrieval, analysis, and formatting steps without hardcoded workflow logic.</p>`,
  tasks: [
    { title: 'SK vs LangChain for enterprise', description: 'For a Fortune 500 bank building an internal knowledge assistant on Azure: compare SK and LangChain on 8 enterprise-relevant dimensions (Microsoft support, .NET availability, Azure integration, plugin ecosystem, observability, enterprise auth, documentation, community). Which would you recommend?', time: '25 min' },
    { title: 'Design a Semantic Kernel plugin', description: 'Design an HR Systems Plugin for SK. Define 4 functions: get_employee_record, check_pto_balance, submit_vacation_request, escalate_to_hr. For each: function signature, parameters, return type, and a 2-sentence description.', time: '20 min' },
    { title: 'Planner pattern design exercise', description: 'Using the Planner concept: what plugins and goal prompt would handle "Prepare for my 10am meeting with the Q3 team"? What sequence of function calls would the Planner generate? What does the assembled context look like?', time: '20 min' },
    { title: 'SK + AutoGen integration research', description: 'Research the official Microsoft documentation on using SK with AutoGen. What is the integration point? What does SK handle vs. AutoGen? When would you use both?', time: '15 min' },
  ],
  codeExample: {
    title: 'Semantic Kernel plugin + Planner pattern — JavaScript',
    lang: 'js',
    code: `// Semantic Kernel concepts: Plugins (tool collections) + Planner (auto-orchestration)
// Production: uses Python or .NET SK SDK

const HRPlugin = {
  name: 'HRSystems',
  description: 'Access HR systems for employee data, PTO, and HR requests',
  functions: {
    get_employee_record: {
      description: 'Get employee details — role, department, start date',
      params: { employee_id: 'string' },
      returns: { name: 'string', role: 'string', department: 'string', startDate: 'string' }
    },
    check_pto_balance: {
      description: 'Check remaining PTO balance for an employee',
      params: { employee_id: 'string', year: 'number' },
      returns: { available: 'number', taken: 'number', accrued: 'number' }
    },
    submit_vacation_request: {
      description: 'Submit a vacation request. Returns request ID and estimated approval date.',
      params: { employee_id: 'string', startDate: 'string', endDate: 'string' },
      returns: { requestId: 'string', status: 'string', estimatedApproval: 'string' }
    }
  }
};

// Planner: given a natural language goal, generate an execution plan
function planner(goal, plugins) {
  console.log('Goal:', goal);
  console.log('Available plugins:', plugins.map(p => p.name).join(', '));
  console.log('\nGenerated plan:');

  // Planner selects and orders functions to achieve the goal
  const plan = [
    { step: 1, fn: 'HRSystems.get_employee_record',    args: { employee_id: 'EMP-7742' },   reason: 'Verify employee exists and is eligible' },
    { step: 2, fn: 'HRSystems.check_pto_balance',      args: { employee_id: 'EMP-7742', year: 2025 }, reason: 'Confirm sufficient PTO available' },
    { step: 3, fn: 'HRSystems.submit_vacation_request', args: { employee_id: 'EMP-7742', startDate: '2025-08-15', endDate: '2025-08-22' }, reason: 'Submit the request' },
  ];

  plan.forEach(s =>
    console.log('  Step ' + s.step + ': ' + s.fn + '\n    → ' + s.reason)
  );
  console.log('\nSK handles: plugin discovery, plan generation, execution, result synthesis');
  console.log('AutoGen handles: multi-agent coordination when the task needs parallel agents');
}

planner(
  'Submit a vacation request for employee EMP-7742 from August 15-22 2025',
  [HRPlugin]
);`
  },
  interview: {
    question: "When would you use Semantic Kernel vs LangChain vs AutoGen for an enterprise AI product?",
    answer: `These frameworks have different sweet spots.<br><br>Semantic Kernel: choose for enterprise production deployments on Azure, especially with .NET stacks or when Microsoft support is a procurement requirement. SK's plugin model, Azure OpenAI integration, and Planner component make it the right choice for "AI as workflow automation" in enterprise. The OpenAPI plugin type — automatically generating callable functions from any REST API spec — is a major productivity win for teams integrating enterprise systems.<br><br>LangChain: choose for Python-first teams that need maximum flexibility and the broadest integration ecosystem. Best for products mixing multiple AI capabilities that need the widest framework support.<br><br>AutoGen: choose when the problem requires genuine multi-agent coordination — specialized agents working in parallel, human-in-the-loop approvals, or event-driven workflows. Often combined with SK (SK handles individual agent orchestration; AutoGen coordinates the multi-agent system).<br><br>The Microsoft-recommended stack for enterprise: SK for orchestration, AutoGen only when multi-agent is genuinely needed, LlamaIndex for document retrieval.`
  },
  pmAngle: "Semantic Kernel is underrepresented in the AI PM curriculum outside Microsoft-adjacent environments. If 40% of your enterprise prospects are on Azure — which is typical — you need to speak SK fluently in enterprise sales conversations.",
  resources: [
    { type: 'DOCS', title: 'Semantic Kernel Documentation', url: 'https://learn.microsoft.com/en-us/semantic-kernel/', note: "Microsoft's official docs — start with the Python quickstart and plugin examples." },
    { type: 'BLOG', title: 'AutoGen and Semantic Kernel Together', url: 'https://devblogs.microsoft.com/semantic-kernel/microsofts-agentic-ai-frameworks-autogen-and-semantic-kernel/', note: "Microsoft's official guidance on combining the two frameworks." },
    { type: 'GITHUB', title: 'Semantic Kernel Samples', url: 'https://github.com/microsoft/semantic-kernel/tree/main/python/samples', note: 'Production-ready plugin and planner patterns.' },
  ]
},

48: {
  subtitle: "Understanding how AI models work internally — and why interpretability matters for safety and product trust.",
  context: `<p><strong>Mechanistic interpretability</strong> is the branch of AI safety research that attempts to reverse-engineer what happens inside neural networks: which circuits implement which algorithms, which features correspond to which concepts, and why specific inputs produce specific outputs. Anthropic is one of the leading organizations in this research, with published findings on superposition (models represent more concepts than they have neurons), features as the fundamental unit of model behavior, and circuits (groups of interacting neurons implementing discrete algorithms). The research program's goal is tools that let humans understand and verify AI model behavior from the inside, not just from outputs.</p>
  <p>Key findings from Anthropic's interpretability work: models represent internal emotional-state-like features that correlate with outputs; models can be steered by directly activating specific feature directions rather than through prompting; and internal concept representations are more distributed and context-dependent than simple feature maps suggest. The most commercially significant technique is <strong>activation steering</strong> — modifying model behavior by directly activating specific features in the residual stream. This is the foundation for more precise behavior customization than prompt engineering allows and for safety monitoring that can detect whether a model is "attending to" problematic concepts even when outputs appear benign.</p>
  <p>For AI PMs, interpretability matters in two contexts. Enterprise trust: buyers increasingly ask whether AI vendors can explain why a specific output was generated. Current tools don't fully answer this, but interpretability is the long-term trajectory toward AI auditability. Product design: understanding that models have measurable internal states opens product possibilities that pure black-box models don't — monitoring feature activations for safety-relevant signals is already being explored as a production safety layer at Anthropic.</p>`,
  tasks: [
    { title: "Read Anthropic's interpretability research overview", description: "Find 'Mapping the Mind of a Large Language Model' at anthropic.com/research. Read the key findings section. Write 3 findings most relevant to product decisions you would make.", time: '25 min' },
    { title: 'Design an interpretability-informed product feature', description: 'Based on what you know about interpretability: design a feature that uses model transparency to improve user trust. Example: a confidence indicator, an explanation UI that traces why an output was generated. Write the feature spec.', time: '20 min' },
    { title: 'Explainability in regulated AI procurement', description: 'A healthcare customer requires your AI product to explain every clinical recommendation. Design the explainability architecture: what information do you surface, how do you generate explanations, and what are the honest limits of current interpretability tools for this requirement?', time: '20 min' },
    { title: 'Interpretability vs explanation vs transparency', description: 'Define each precisely with an example and product implication: (a) mechanistic interpretability, (b) output explanation, (c) behavioral transparency.', time: '15 min' },
  ],
  interview: {
    question: "What is mechanistic interpretability and why does Anthropic invest in it?",
    answer: `Mechanistic interpretability is AI safety research aimed at reverse-engineering what's happening inside neural networks — identifying which internal structures correspond to which concepts, how information flows through the model, and why specific inputs produce specific outputs. It's "opening the black box" rather than characterizing behavior from the outside.<br><br>Anthropic invests for two interlocking reasons. First, alignment: if you can understand what a model is internally representing, you can detect misalignment — situations where the model is pursuing goals that differ from what its outputs suggest. This is especially important as models become more capable. Second, capability improvement: interpretability tools give researchers specific targets for improvement — if you know which circuits handle reasoning, you can improve them more precisely than by adjusting training data.<br><br>The commercial applications are emerging: interpretability will eventually enable AI auditability enterprise buyers require, production safety monitoring via feature activation, and more precise model customization than prompt engineering allows.`
  },
  pmAngle: "Interpretability research at Anthropic is a competitive moat most competitors aren't investing in at the same depth. When an enterprise customer asks 'can you explain how Claude makes decisions,' interpretability research is where a real answer will eventually come from.",
  resources: [
    { type: 'BLOG', title: 'Mapping the Mind of a Large Language Model', url: 'https://www.anthropic.com/research/mapping-mind-language-model', note: "Anthropic's accessible overview of interpretability findings." },
    { type: 'BLOG', title: 'Anthropic Interpretability Research', url: 'https://www.anthropic.com/research#interpretability', note: 'All published interpretability papers from the team.' },
    { type: 'BLOG', title: 'Towards Monosemanticity', url: 'https://transformer-circuits.pub/2023/monosemantic-features/index.html', note: 'The foundational interpretability paper on features and superposition.' },
  ]
},

49: {
  subtitle: "The AI regulatory landscape in 2025–2026 — what PMs need to know to build and sell legally.",
  context: `<p>The AI regulatory environment has shifted from voluntary commitments to enforceable requirements across multiple jurisdictions as of 2025–2026. The <strong>EU AI Act</strong>, which entered into force in August 2024 with phased compliance timelines, is the most comprehensive regulation in effect. It classifies AI systems by risk level: unacceptable risk (banned), high-risk (conformity assessment required — includes AI in employment, credit, healthcare, law enforcement, education, critical infrastructure), limited risk (transparency obligations), and minimal risk (unregulated). Foundation models above 10²⁵ FLOPs face additional obligations: adversarial testing, incident reporting, and training data transparency. High-risk systems must have technical documentation, audit logging, human oversight mechanisms, and bias/fairness evaluations before EU deployment.</p>
  <p>In the United States, federal regulation has proceeded through executive orders and agency guidance rather than comprehensive legislation as of early 2026. The NIST AI Risk Management Framework (AI RMF) is a voluntary but increasingly referenced enterprise governance standard. California's SB-1047 failed but state-level AI legislation is proliferating. Enterprise buyers increasingly require vendors to demonstrate compliance with applicable regulations and provide AI system documentation supporting the buyer's own compliance obligations.</p>
  <p>For AI PMs, the regulatory landscape creates both requirements and market opportunities. Requirements: documentation (model cards, system cards, data provenance), auditability (logs of AI decisions for high-risk use cases), human oversight mechanisms, and bias/fairness evaluation. Market opportunities: enterprises in regulated industries need AI products specifically designed for their compliance requirements. A legal-tech or HR-tech AI product with built-in EU AI Act compliance documentation commands a premium over a generic AI product that makes the customer figure out compliance themselves.</p>`,
  tasks: [
    { title: 'Map your product to the EU AI Act risk tiers', description: 'Choose an AI product from this course. Classify it under the EU AI Act. What specific provisions apply? What documentation, transparency, and oversight requirements would you need for EU deployment?', time: '25 min' },
    { title: 'Read the NIST AI RMF', description: 'Find the NIST AI RMF at airc.nist.gov/RMF. Read the executive summary and the Govern/Map/Measure/Manage framework. Write 3 specific actions your product team should take based on the RMF, in priority order.', time: '20 min' },
    { title: 'Design a compliance documentation package', description: 'Design the compliance documentation package for an AI product sold to an EU enterprise customer. What documents do you provide? What does each contain? How do you handle documentation updates when the underlying model changes?', time: '20 min' },
    { title: 'Regulatory roadmap', description: 'Build a 12-month regulatory readiness roadmap for your AI product. What milestones do you need for EU sales readiness? US NIST alignment? What engineering investments does each milestone require?', time: '15 min' },
  ],
  interview: {
    question: "How does the EU AI Act affect AI product development and go-to-market strategy?",
    answer: `The EU AI Act creates a tiered compliance structure with three main product implications.<br><br>First, risk classification determines your documentation burden. If your product is used for hiring, credit, healthcare, or education, you're in the high-risk category with mandatory conformity assessment, technical documentation, logging, and human oversight mechanisms. This must be built into product architecture, not added at go-to-market time.<br><br>Second, foundation model requirements. Claude and GPT-4-class models are above the threshold for "general-purpose AI with systemic risk" under the Act, requiring adversarial testing and training data transparency from Anthropic. This creates compliance documentation that Anthropic provides to customers building on Claude.<br><br>Third, competitive moat for compliant products. Enterprise buyers in regulated industries will pay a premium for AI products that come with EU AI Act-compliant documentation and architecture, rather than requiring them to figure out compliance themselves. This is a real product differentiation opportunity in legal tech, HR tech, and healthcare AI.`
  },
  pmAngle: "Regulatory compliance is moving from nice-to-have to table stakes for enterprise sales. The PM who can map a product to EU AI Act risk tiers and articulate what compliance documentation the customer receives is meaningfully more effective at enterprise sales.",
  resources: [
    { type: 'DOCS', title: 'EU AI Act Full Text', url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1689', note: 'Official text — read Annex III (high-risk classification) and the recitals.' },
    { type: 'DOCS', title: 'NIST AI Risk Management Framework', url: 'https://airc.nist.gov/RMF', note: 'The US voluntary framework increasingly used as enterprise AI governance standard.' },
    { type: 'BLOG', title: 'EU AI Act for Practitioners', url: 'https://iapp.org/news/a/eu-ai-act-compliance-guide-for-practitioners/', note: "IAPP's practitioner compliance guide." },
  ]
},

50: {
  subtitle: "Phase 3 Capstone — build the enterprise AI strategy that demonstrates full-stack PM depth.",
  context: `<p>The Phase 3 Capstone asks you to produce an <strong>Enterprise AI Strategy document</strong> for a mid-size company entering AI adoption — not an AI-native startup, but a traditional enterprise evaluating AI. This is the most common type of presentation for AI PMs in enterprise sales, the most common consulting deliverable in this space, and the document that demonstrates the full range of skills from this course: technical architecture, competitive analysis, cost modeling, safety/compliance, and product strategy in one integrated deliverable.</p>
  <p>The structure that works: (1) <strong>Executive Summary</strong> (1 page) — the problem, recommended approach, and expected ROI in language a non-technical CFO can read. (2) <strong>Use Case Portfolio</strong> (1–2 pages) — 3–5 specific AI use cases with effort/value scoring and recommended sequencing. Start with the use cases with clear ROI, low regulatory risk, and high data availability. (3) <strong>Technical Architecture</strong> (1 page) — which models, deployment infrastructure, key integrations, with explicit rationale for each choice. (4) <strong>Compliance and Risk</strong> (0.5 pages) — EU AI Act risk tiers, NIST RMF alignment, documentation requirements, human oversight mechanisms. (5) <strong>Roadmap and Investment</strong> (0.5 pages) — 12-month plan with milestones, investment, and expected ROI timeline.</p>
  <p>The highest-value insight in any enterprise AI strategy is specificity. "Use AI to automate repetitive tasks" is not a strategy. "Use Claude 3.5 Sonnet with a RAG layer over your contract management system to reduce contract review time from 4 hours to 45 minutes per contract, at $8 fully-loaded cost vs. $400 in attorney time, targeting 1,200 contracts/year for $469K in annual value at $9.6K implementation cost" is a strategy. Specificity is what separates a strategic advisor from a consultant selling a generic AI deck.</p>`,
  tasks: [
    { title: 'Choose your enterprise subject', description: 'Pick one: (a) a 500-person regional bank, (b) a 1,000-person law firm, (c) a 2,000-person healthcare system, or (d) a 300-person insurance company. Write the 3-sentence company profile: industry, size, existing tech stack, and primary business challenge.', time: '10 min' },
    { title: 'Build the use case portfolio', description: 'Identify 5 AI use cases for your chosen company. For each: describe the use case, estimate annual value (time saved × hourly rate), estimate implementation complexity (1–5), and compliance risk (1–5). Score them and recommend the top 2 to start.', time: '35 min' },
    { title: 'Write technical architecture and compliance sections', description: 'Write the technical architecture recommendation: which models, which infrastructure, which integrations. Write the compliance section: EU AI Act risk tier, NIST RMF alignment, documentation requirements, human oversight mechanisms.', time: '25 min' },
    { title: 'Write executive summary and roadmap', description: 'Write the 1-page executive summary (readable by a non-technical CFO) and the 12-month roadmap with specific milestones and investment estimates.', time: '20 min' },
  ],
  interview: {
    question: "Present a 2-minute enterprise AI strategy for a regional bank.",
    answer: `Structure: business context → top use cases → technical architecture → risk and compliance → investment and return.<br><br>Business context: regional banks face margin pressure, compliance costs, and competitive threat from AI-native fintechs. AI is not optional; the question is which use cases to prioritize.<br><br>Top use cases: (1) Loan document processing — extract key terms from mortgage documents; high ROI, low regulatory risk since humans make lending decisions. (2) Customer support deflection — resolve tier-1 queries; 60–70% deflection achievable. (3) SAR narrative generation — AI drafts Suspicious Activity Reports for compliance officers to review; saves 2–3 hours per SAR at $150/hour.<br><br>Technical architecture: deploy Claude via Azure AI Foundry (the bank almost certainly has an Azure enterprise agreement) with private tenant deployment, Azure AD authentication, and all data in the bank's Azure environment. The compliance story writes itself.<br><br>Risk and compliance: loan document processing is high-risk under EU AI Act if the bank has EU exposure — implement human review and full audit logging. SAR generation requires strict audit trails.<br><br>Investment and return: 18-month implementation at approximately $800K, targeting $3.2M in annual savings at full deployment.`
  },
  pmAngle: "The enterprise AI strategy is the most frequently-requested PM deliverable in the first 90 days of an enterprise AI PM role. Produce this one at portfolio quality — you may be presenting a version of it in your first month.",
  resources: [
    { type: 'BLOG', title: 'State of AI in Enterprise — McKinsey', url: 'https://www.mckinsey.com/capabilities/quantumblack/our-insights/the-state-of-ai', note: 'Annual enterprise AI adoption research — useful benchmark data.' },
    { type: 'BLOG', title: 'Building the Business Case for AI', url: 'https://hbr.org/2023/03/how-to-build-a-business-case-for-ai', note: 'HBR ROI framework for enterprise AI strategy.' },
    { type: 'DOCS', title: 'Anthropic Enterprise', url: 'https://www.anthropic.com/enterprise', note: 'Reference for enterprise deployment options, compliance, and security.' },
  ]
},

51: {
  subtitle: "How to build and lead high-performing AI product teams — the roles, rituals, and culture that work.",
  context: `<p>AI product teams have a different shape than traditional SaaS teams. Core additional roles: a <strong>Machine Learning Engineer</strong> (model integration, fine-tuning, technical AI decisions), an <strong>AI Safety/Quality Engineer</strong> (evals, red-teaming, monitoring), and a <strong>Prompt Engineer or AI Quality Analyst</strong> (system prompt design, few-shot curation, quality measurement). In smaller teams these roles overlap; in frontier lab PM teams, each is a specialized function. The PM's job is to coordinate across these roles with clear quality standards, eval criteria, and decision rights — not to make the technical AI decisions themselves.</p>
  <p>The most important leadership challenge in AI product teams is managing the <strong>velocity vs. quality tension</strong>. AI teams can move fast — model improvements are free, new capabilities emerge without engineering work — but quality is unpredictable: a model update that improves task A often degrades task B. Teams that manage this well have one discipline: <em>no model change without eval delta measurement</em>. Before and after every model update, evals are compared. If quality degrades on a production task, the update is rolled back. This requires eval infrastructure to exist before the team feels it needs it — building it retrospectively is significantly harder.</p>
  <p>Recruiting for AI PM teams requires updated criteria: comfort with probability and uncertainty (AI products don't give binary answers), technical fluency with the AI stack, and — most underweighted — domain expertise in the target vertical. A legal AI PM who understands legal workflow is more valuable than one with generic AI knowledge, because domain expertise is the hardest to acquire quickly. Build for this in hiring.</p>`,
  tasks: [
    { title: 'Design the AI product team for your product', description: 'For an AI product you have been developing: design the ideal 5-person team. Define each role, hiring criteria, and interaction model. Include at least one non-traditional role (prompt engineer, AI safety, domain expert). Write the job description for your most critical hire.', time: '25 min' },
    { title: 'Design AI team rituals', description: 'Design a weekly ritual schedule for a 5-person AI PM team. What meetings do you run, with what agendas and outputs? How do you review eval results, share quality insights, and track model-related risks?', time: '20 min' },
    { title: 'Write an AI PM job description', description: 'Write a 400-word AI PM job description for your product. Make the AI-specific responsibilities explicit. Include required skills, nice-to-haves, and why someone would want this role. Write it to attract candidates who know what they are getting into.', time: '20 min' },
    { title: 'Velocity vs quality decision framework', description: 'Describe a scenario where moving fast on an AI feature creates quality risk. Write the decision framework you would use: what criteria tip the decision toward "deploy and monitor" vs "hold for more testing"?', time: '15 min' },
  ],
  interview: {
    question: "What makes a great AI product team different from a great traditional PM team?",
    answer: `The core structure overlaps — PM, engineering, design, data — but AI teams have important additions and different dynamics.<br><br>Additional roles: a Machine Learning Engineer or AI Architect who owns technical AI decisions; an AI Quality function that owns evals and monitoring; increasingly, a Prompt Engineer who treats system prompts as a versioned, tested product artifact. These have no equivalents in traditional SaaS teams.<br><br>Different dynamics: in traditional SaaS, the product does exactly what the team builds. In AI products, the model contributes behavior no one explicitly programmed. Great AI teams treat model behavior as a measurable variable — running evals before and after every significant change, including model API updates.<br><br>Different culture: great AI teams normalize uncertainty and probabilistic thinking. "This works 94% of the time" is a success criterion, not an admission of failure. PMs who demand binary success metrics create pressure to hide failures rather than measure them. The shift is from "does it work?" to "how well does it work and under what conditions?"`
  },
  pmAngle: "The best AI engineers and researchers have options. What they want: clear product vision, culture of measurement, technical autonomy on AI decisions, and a PM they trust to translate user value into specific, testable criteria.",
  resources: [
    { type: 'BLOG', title: 'Building AI Product Teams', url: 'https://www.reforge.com/blog/ai-product-teams', note: 'Reforge analysis of emerging AI team structures and roles.' },
    { type: 'BLOG', title: 'The AI PM Role', url: 'https://www.lennysnewsletter.com/p/the-ai-pm-role-in-2024', note: "Lenny's research on what AI PMs actually do vs traditional PMs." },
    { type: 'BLOG', title: 'Hiring for AI Product Teams', url: 'https://www.ycombinator.com/library/Mf-hiring-technical-talent-for-ai', note: "YC's guidance on hiring ML and AI engineers for product companies." },
  ]
},

52: {
  subtitle: "Write OKRs that create AI product accountability without destroying model experimentation.",
  context: `<p>OKRs for AI products require careful design to avoid two failure modes: <strong>over-specificity</strong> (locking in metric targets before you have production data, creating pressure to hit a number that turns out to be the wrong metric) and <strong>under-specificity</strong> (vague objectives like "make the AI better" that create no accountability). The balance: objectives should be qualitative and aspirational; key results should be specific and measurable, but set <em>after</em> you have baseline data from production or a mature beta.</p>
  <p>AI quality metrics require dedicated OKRs separate from business metrics. A common mistake: the only AI-related KR is a business outcome ("achieve $1M ARR") with no intermediate AI quality targets. This creates a black box between AI quality and business outcomes, making it impossible to attribute a business miss to product quality, sales execution, or market fit. Include at least one AI quality KR per quarter: an eval score threshold, an acceptance rate target, or a hallucination rate ceiling. These create accountability for what the AI team can actually control — output quality — separate from outcomes they influence but don't fully control.</p>
  <p>The OKR review cadence matters as much as the content. Business metrics: quarterly. AI quality metrics: weekly or bi-weekly, because model updates and prompt changes can shift quality rapidly. The team that reviews eval scores weekly and catches a 5% degradation immediately is more effective than the team that discovers it at the quarterly review. Build a weekly AI health review into team rituals: eval score, acceptance rate, error rate, cost per outcome. Flag anything that moved more than 10% from the prior week.</p>`,
  tasks: [
    { title: 'Write Q1 OKRs for your AI product', description: 'Write one complete Objective with 4 Key Results for an AI product in its first quarter post-launch. Include at least one AI quality KR, one user adoption KR, one business KR, and one infrastructure KR. Make each KR unambiguous in 90 days.', time: '25 min' },
    { title: 'AI quality OKR design', description: 'Design the AI quality OKR set for a document processing AI. What are the 3 most important quality dimensions? How do you set targets without production baseline data? How do you handle a baseline that turns out to be wrong mid-quarter?', time: '20 min' },
    { title: 'Review a failing OKR', description: "It's Day 60 of a 90-day quarter. Your acceptance rate KR (target: 80%) is at 63%. Write the honest assessment: 3 most likely root causes, what data would diagnose the cause, and your recommendation: revise the target, change the approach, or both?", time: '20 min' },
    { title: 'Design the weekly AI health review', description: 'Design a 30-minute weekly AI health review: what metrics are on the dashboard, who attends, what triggers escalation, and what output does the meeting produce. Write a specific agenda template.', time: '15 min' },
  ],
  interview: {
    question: "How do you set OKRs for an AI product when you don't have baseline quality data?",
    answer: `Separate discovery OKRs from performance OKRs, and be explicit about which phase you're in.<br><br>Without baseline data, make discovering the baseline a Key Result. Instead of "achieve 90% acceptance rate" (arbitrary without baseline), the KR is "establish baseline acceptance rate, hallucination rate, and task completion rate by measuring 200 production interactions by week 4." This creates accountability for building measurement infrastructure rather than hitting an arbitrary target.<br><br>Once you have baseline data (typically 4–6 weeks in), set performance KRs: "improve acceptance rate from the 68% baseline to 80% by end of quarter." Now the target is grounded in real data, not aspiration.<br><br>Never skip the baseline measurement step. Teams that set performance OKRs without baselines either optimize for metrics they can measure (which may be the wrong metrics) or lose confidence in OKRs entirely when targets turn out to be wrong. Baseline first, then optimize.`
  },
  pmAngle: "AI OKRs are one of the most common topics in first-year AI PM reviews. The PM with a clear framework for AI quality metrics alongside business metrics is demonstrably more mature than one who only tracks business metrics.",
  resources: [
    { type: 'BLOG', title: "AI Product KPIs That Actually Work", url: 'https://eugeneyan.com/writing/llm-metrics/', note: "Eugene Yan's practical guide to LLM application metrics." },
    { type: 'BOOK', title: 'Measure What Matters — John Doerr', url: 'https://www.whatmatters.com', note: 'The foundational OKR text — principles apply directly to AI products.' },
    { type: 'BLOG', title: 'AI Metrics Framework', url: 'https://www.lennysnewsletter.com/p/ai-product-metrics', note: "Lenny's guide to metrics for AI-native products." },
  ]
},

53: {
  subtitle: "Advanced evals and red-teaming — find the failure modes before your users do.",
  context: `<p><strong>Advanced evaluations</strong> go beyond basic LLM-as-judge scoring to address failure categories that simple quality measurement misses. <strong>Adversarial evals</strong> test whether the product fails under intentional misuse: jailbreaks, prompt injection via tool outputs, and cross-prompt contamination. <strong>Distribution evals</strong> test whether quality holds across the full real-user input distribution — not just your representative golden dataset. <strong>Regression evals</strong> run automatically after every model update to detect degradation on previously-passing tests. The team with all three can confidently ship model updates; the team with only basic quality evals is partially blind.</p>
  <p><strong>Red-teaming</strong> is systematic adversarial testing conducted by a team specifically tasked with finding failure modes. Frontier labs run both internal red teams (employees with adversarial testing skills) and external red teams (academic researchers and domain experts). The PM's role: define scope and priority, review findings, triage results (immediate mitigation vs. acceptable risk vs. out of scope), and translate findings into product changes. Red-teaming is quality assurance for the failure modes standard testing doesn't catch.</p>
  <p>The most important emerging eval technique for agentic products is <strong>multi-turn and multi-step evals</strong>. Most current eval infrastructure tests single exchanges. Agentic products execute multi-step workflows where errors in early steps cascade into later failures. Multi-turn evals simulate the full workflow — tool calls, state transitions, human interactions — and measure whether the agent reaches the correct final state, not just whether each individual step looks reasonable. Building multi-turn eval infrastructure before launching agentic features is one of the highest-leverage quality investments an AI product team can make.</p>`,
  tasks: [
    { title: 'Design an adversarial eval suite', description: 'Design a 20-question adversarial eval for a Claude-based product. Include: 5 prompt injection attempts, 5 jailbreak probes (against specific usage policies), 5 distribution edge cases, and 5 multi-step cascade scenarios. Write pass/fail criteria for each.', time: '30 min' },
    { title: 'Run a red-team sprint', description: 'Spend 30 minutes red-teaming any AI product. Document every prompt that produces an unexpected result. Categorize findings: safety failure, quality failure, UX failure, or unexpected capability. Write up the 3 most significant findings.', time: '30 min' },
    { title: 'Design a multi-turn eval for an agentic feature', description: 'Design a multi-turn eval for a document review agent processing a contract over 5 steps. Define: starting state, expected actions at each step, final success state, and at least 2 distinct failure states. How do you measure partial completion?', time: '20 min' },
    { title: 'Red-team findings triage framework', description: 'Your red team returns 15 findings. Design the triage framework: severity × exploitability classification, prioritization criteria, and what goes to immediate hotfix vs next sprint vs backlog.', time: '10 min' },
  ],
  interview: {
    question: "How would you set up a red-teaming program for a new AI product feature before launch?",
    answer: `Three phases: scoping, execution, and remediation.<br><br>Scoping (week 1): define the threat model — who are adversarial actors, what do they want to accomplish, and what's the worst-case impact? For a customer support AI: users extracting information they shouldn't have, users attempting harm, compliance boundary testing. Prioritize test surface by impact × likelihood.<br><br>Execution (weeks 2–3): parallel tracks. Internal red team (2–3 people with adversarial skills and deep product knowledge) focuses on product-specific attacks. External red team (1–2 domain experts) focuses on creative attack vectors the internal team is blind to. Document every finding with exact prompt, response, failure category, and severity.<br><br>Remediation (week 4): triage by severity. P0 (immediate blocking) — failures causing real harm or major compliance violation. P1 (pre-launch fix) — significant quality or safety failures affecting substantial user cases. P2 (post-launch) — edge cases with limited real-world impact. Ship P0 and P1 before GA; track P2 in the quality backlog.`
  },
  pmAngle: "Red-teaming is a PM responsibility as much as an engineering one. The threat model and severity triage are product decisions about acceptable risk. PMs who treat red-teaming as someone else's job ship quality problems they could have caught.",
  resources: [
    { type: 'BLOG', title: "Anthropic Red-Teaming Research", url: 'https://www.anthropic.com/research/red-teaming', note: "Anthropic's published methodology for AI red-teaming." },
    { type: 'DOCS', title: 'OWASP LLM Top 10', url: 'https://owasp.org/www-project-top-10-for-large-language-model-applications/', note: 'The security framework for LLM vulnerabilities — use as a red-team checklist.' },
    { type: 'BLOG', title: 'Adversarial Attacks on LLMs', url: 'https://lilianweng.github.io/posts/2023-10-25-adv-attack-llm/', note: "Lilian Weng's deep dive on adversarial attacks and defenses." },
  ]
},

54: {
  subtitle: "Developer experience as a product — how to design APIs, documentation, and SDKs that developers love.",
  context: `<p><strong>Developer Experience (DX)</strong> is the product quality that determines whether developers choose your API, become advocates, and build high-quality integrations rather than fragile hacks. For AI products built on an API, DX is not just a nice-to-have — it is the product. Three dimensions drive DX quality: <strong>Time to First Successful Call (TTFSC)</strong> — how long from zero to a meaningful response; <strong>documentation clarity</strong> — whether docs anticipate developer questions and answer them correctly; and <strong>error experience</strong> — whether error messages are actionable and lead to resolution rather than confusion.</p>
  <p>The anatomy of excellent AI API documentation: a <strong>quickstart</strong> that produces a working result in under 5 minutes; <strong>concept guides</strong> that explain the mental model (what is a context window, what is a tool call) in developer-friendly terms; <strong>how-to guides</strong> for specific use cases (streaming, structured output, tool use, RAG); complete <strong>reference documentation</strong>; and <strong>cookbook examples</strong> — working code for real use cases developers can copy and adapt. The failing pattern: exhaustive reference docs with no quickstart, leaving developers reading API specs without the mental model to apply them.</p>
  <p>SDK quality is increasingly a DX differentiator. A well-designed SDK abstracts complexity while preserving full access — 5 lines of code to get started, but full parameter access when needed. The Anthropic Python and TypeScript SDKs are widely cited as among the cleanest in the LLM ecosystem. SDK roadmap decisions — which languages to support, which abstractions to provide, when to hide vs. expose complexity — directly impact adoption and retention. The SDK is not an afterthought; it is the primary product surface for most API developers.</p>`,
  tasks: [
    { title: "Audit an AI API's developer experience", description: "Audit the Anthropic API DX: time your own TTFSC from zero. Rate: quickstart (1–5), how-to guides (1–5), reference completeness (1–5), error message quality (1–5), cookbook examples (1–5). Write the 3 improvements with highest DX impact.", time: '30 min' },
    { title: 'Design a DX-first quickstart', description: 'Design a 5-minute quickstart for a hypothetical new AI feature. Include: prerequisites, the exact code (5–10 lines) producing the first working result, and what the developer sees. Target: any developer completes it in 5 minutes.', time: '20 min' },
    { title: 'Write developer-facing error messages', description: 'For 5 common AI API errors (rate limit, context window exceeded, invalid tool call, auth failure, content policy): write the error message the developer sees and the exact documentation link they should follow. Make each message actionable.', time: '20 min' },
    { title: 'SDK feature gap analysis', description: 'Compare the Anthropic Python SDK and the OpenAI Python SDK. What is easier in each? What is missing from each? What 3 improvements would you ship for the Anthropic SDK next quarter to improve developer adoption?', time: '10 min' },
  ],
  interview: {
    question: "How would you improve developer adoption for an AI API you own?",
    answer: `Start with measuring what's actually broken. Three data sources: TTFSC measurement (observe 5–10 new developer sessions, note every friction point), support ticket analysis (what questions do developers ask most), and churn attribution (why do developers who try the API not build on it).<br><br>The data almost always reveals the same pattern: the biggest drop-off is between signup and first working API call, and the biggest support volume is a small set of recurring questions indicating documentation gaps.<br><br>Highest-ROI improvements: first, quickstart — most are over-engineered. The target is 5 lines of code producing a meaningful output in under 5 minutes. Everything else comes after. If TTFSC is over 15 minutes, you're losing a significant fraction of evaluators before they experience the product's value.<br><br>Second, error messages. A developer who hits a 429 and gets "rate limit exceeded" with no context on retry timing churns. A developer who gets the specific limit, retry guidance, and a link to the upgrade path fixes the problem and continues. Error messages are product surface — treat them that way.<br><br>Measure improvement by tracking TTFSC weekly, support ticket volume for fixed issues, and the second-API-call conversion rate.`
  },
  pmAngle: "Developer experience is one of the highest-ROI product investments for API businesses. Top developers make platform decisions based on DX quality. Every hour invested in DX improvement compounds through word-of-mouth in the developer community.",
  resources: [
    { type: 'BLOG', title: "Stripe's API Design Philosophy", url: 'https://stripe.com/blog/payment-api-design', note: 'The gold standard DX post — how API design decisions affect developer adoption.' },
    { type: 'DOCS', title: 'Anthropic Developer Documentation', url: 'https://docs.anthropic.com', note: 'Review with a DX audit lens — note what works and what could be better.' },
    { type: 'BLOG', title: 'Developer Experience Resources', url: 'https://dx.tips', note: 'Comprehensive resource on building excellent developer experience.' },
  ]
},

55: {
  subtitle: "Capstone: audit a real AI product's DX and produce the improvement roadmap.",
  context: `<p>The DX Audit Capstone asks you to conduct a structured developer experience audit of a real AI API, produce a scored assessment, and write a prioritized improvement roadmap. This is a deliverable you will produce regularly as an AI PM at any API-first AI company — and it's a strong portfolio piece because it demonstrates both product taste and technical familiarity.</p>
  <p>A rigorous DX audit has five dimensions: <strong>Onboarding and TTFSC</strong> (time to first working result from zero), <strong>Documentation completeness and clarity</strong> (all features documented, examples correct, questions actually developers have answered), <strong>SDK quality</strong> (abstractions correct, idiomatic in each language, edge cases handled), <strong>Error and debugging experience</strong> (errors actionable, developer tools available, monitoring story adequate), and <strong>Community and support</strong> (active community, responsive support, visible feedback loop from issues to product improvements).</p>
  <p>The improvement roadmap should be prioritized by impact × effort, not impact alone. A documentation improvement taking 2 days that reduces confusion on the most common error outranks an SDK refactor taking 3 months addressing a rare edge case. Be specific: "add retry-after header guidance to the 429 error documentation page" is actionable; "improve documentation" is not. The PM who delivers a 3-page audit with 10 specific, implementable recommendations is demonstrably more effective than one who delivers a 10-page report with vague findings.</p>`,
  tasks: [
    { title: 'Conduct the DX audit', description: 'Choose one of: Anthropic API, OpenAI API, or Google Gemini API. Spend 45 minutes auditing across all 5 dimensions. Time your TTFSC. Read the quickstart and 2 how-to guides. Deliberately trigger an error and read the message.', time: '45 min' },
    { title: 'Score and document findings', description: 'Score each dimension 1–5. For each: the specific finding, the developer impact, and a specific recommendation. 5 dimensions × 3 rows = 15-row findings table.', time: '20 min' },
    { title: 'Write the prioritized improvement roadmap', description: 'Select your 5 highest-priority improvements. For each: the specific change, engineering effort estimate (days), DX impact (% of developers affected), and the prioritization rationale. Sort by impact/effort ratio.', time: '20 min' },
    { title: 'Competitive DX benchmark', description: 'Where does the audited API rank vs. competitors on each of the 5 dimensions? Write a 200-word competitive DX summary that a head of developer relations could share with the product team.', time: '15 min' },
  ],
  interview: {
    question: "You've been asked to improve developer adoption for an AI API. Where do you start?",
    answer: `Start with data, not hypotheses. Three immediate inputs: TTFSC measurement (observe new developer sessions end-to-end), funnel analysis (signup → first API call → second API call → paid conversion, where's the biggest drop-off), and support ticket clustering (which 3 questions do 80% of developers ask).<br><br>The data almost always reveals: biggest drop-off is between signup and first working API call; biggest support volume is a small set of recurring questions showing documentation gaps. Invest in quickstart quality and documentation of the top-10 questions first — highest impact, lowest effort, affects every new developer.<br><br>After that: SDK improvements addressing the most common errors and most painful manual steps, and developer tooling (request inspector, cost calculator, token counter) reducing debugging time.<br><br>Measure improvement by tracking TTFSC weekly, support ticket volume for fixed issues, and second-API-call rate.`
  },
  pmAngle: "A DX audit is a strong portfolio artifact. A rigorous, specific audit of a real API with an implementable improvement roadmap differentiates you in interviews. Keep this one as a writing sample.",
  resources: [
    { type: 'BLOG', title: 'How to Conduct a DX Audit', url: 'https://dx.tips/audits', note: 'Structured framework for developer experience audits.' },
    { type: 'DOCS', title: 'Anthropic Developer Documentation', url: 'https://docs.anthropic.com', note: 'The audit subject — approach it with fresh eyes.' },
    { type: 'BLOG', title: 'Measuring Developer Experience', url: 'https://segment.com/blog/developer-experience-survey/', note: 'How to measure DX quantitatively with surveys and funnel analysis.' },
  ]
},

56: {
  subtitle: "Build the portfolio that proves you can do the job — before you're hired.",
  context: `<p>An AI PM portfolio is not a resume — it's a demonstration of work. The strongest portfolios contain three types of artifacts: <strong>strategy documents</strong> (competitive teardowns, product strategy docs, enterprise AI recommendations) that show analytical quality; <strong>technical specifications</strong> (AI feature specs with model selection rationale, eval criteria, cost models) that show technical fluency; and <strong>product artifacts</strong> (prototypes, working demos built with Claude Code) that show you can build, not just write. The combination — think, specify, and build — is what frontier AI companies look for.</p>
  <p>Curation is as important as content. Five polished pieces outperform twenty mediocre ones. Each piece should be self-contained: a reader who knows nothing about you should understand the problem, approach, and quality of thinking from the artifact alone. Add a two-paragraph context note to each piece: what was the situation, what did you produce, and what did you learn? This framing prevents the reviewer from spending cognitive energy on context you should provide.</p>
  <p>The three artifacts from this course most valuable in a portfolio: (1) the Phase 2 Competitive Teardown (Day 39) — strategic analysis at depth; (2) the Phase 3 Enterprise AI Strategy (Day 50) — integrated technical and business strategy; and (3) any prototype built with Claude Code in Phase 3 — hands-on capability demonstration. Supplement with 2–3 pieces from actual work experience with AI relevance, and you have a 5–7 piece portfolio that is genuinely differentiating at frontier AI labs.</p>`,
  tasks: [
    { title: 'Inventory and curate your artifacts', description: 'List every substantive artifact you produced in this course. For each, rate quality (1–5) and portfolio potential (1–5). Select the top 5. What refining does each need to be portfolio-ready?', time: '20 min' },
    { title: 'Write context notes for each piece', description: 'For each of your top 5 portfolio pieces: write a 2-paragraph context note. Paragraph 1: situation and objective. Paragraph 2: what you produced, the key insight, and what you would do differently. Under 150 words per piece.', time: '20 min' },
    { title: 'Build the portfolio page', description: 'Create a portfolio presentation: a Notion page, personal website, or organized Google Drive. Include: brief professional summary (3 sentences), the 5 portfolio pieces with context notes, and a "what I am building now" section showing current engagement with the AI field.', time: '25 min' },
    { title: 'Peer review', description: 'Share your portfolio with someone whose judgment you trust. Ask: which piece is strongest and why, which needs the most work, and what impression they have of your technical depth and product sense. Incorporate the feedback.', time: '15 min' },
  ],
  interview: {
    question: "Walk me through your strongest portfolio piece and why you chose it.",
    answer: `The content is unique to your work — but the structure is universal.<br><br>Open with the situation (1 sentence): what was the context and what problem were you solving? Describe the work (2–3 sentences): what did you produce, what decisions did you make, and what made it non-trivial? Highlight the key insight (1 sentence): the one thing you learned or realized that made the work good. Close with the outcome or implication (1 sentence): what happened, or how you'd apply it in the role you're interviewing for.<br><br>Practice this for each piece until you can deliver it in 90 seconds without notes. The portfolio piece is a conversation starter — the best pieces prompt follow-up questions, giving you the opportunity to go deeper on exactly the topics you know best.<br><br>One discipline: be honest about limitations. "One thing I would do differently" signals better judgment than "this was perfect." Interviewers trust candidates who show self-awareness.`
  },
  pmAngle: "The portfolio you build in this course is a demonstration to yourself of what you've learned. If you can't point to 5 strong artifacts after 56 days, the gaps are your review agenda for the final 4 days.",
  resources: [
    { type: 'BLOG', title: 'PM Portfolio Guide', url: 'https://www.productmanagementexercises.com/portfolio', note: 'How to structure and present a product management portfolio.' },
    { type: 'TOOL', title: 'Notion Portfolio Templates', url: 'https://www.notion.so/templates/categories/portfolio', note: 'Clean, shareable portfolio templates in Notion.' },
    { type: 'BLOG', title: 'Getting an AI PM Job', url: 'https://www.lennysnewsletter.com/p/how-to-get-a-job-in-ai-products', note: "Lenny's research on what AI PM hiring managers actually look for." },
  ]
},

57: {
  subtitle: "The final mock interview loop — simulate the full frontier lab PM interview experience.",
  context: `<p>The Day 57 mock interview loop simulates a full AI PM interview day at a frontier lab. A typical Anthropic or OpenAI PM loop has 5–6 rounds: recruiter screen (30 min), hiring manager screen (45 min), product sense interview (60 min), technical/AI interview (60 min), cross-functional interview (45 min), and sometimes a leadership/strategy round (45 min). The most common failure is preparing for one type of question across all rounds rather than adapting to each round's specific focus.</p>
  <p>The <strong>hiring manager screen</strong> is your most important round — it's where the decision-maker forms their first impression of your AI product thinking. Expect: a 5-minute background review, a product discussion ("tell me about an AI product you've thought deeply about"), a technical depth question ("how does RAG work?"), and a product instinct question ("what would you change about Claude?" or "how would you prioritize the next Claude feature?"). The technical question is often brief and more about communication clarity than deep recall — but stumbling on a concept in the job description is a significant negative signal.</p>
  <p>The <strong>system design exercise</strong> is the highest-variance round. The safe structure: start with the user problem and product vision (2 min), dive into technical architecture (5 min), address metrics and success criteria (3 min), then acknowledge tradeoffs and alternatives. Candidates who fail the system design round either (a) go straight to architecture without establishing user value, or (b) stay at the product layer without getting technical. Both are signals of imbalance. Practice the structure until the sequence is automatic.</p>`,
  tasks: [
    { title: 'Full 45-minute mock interview', description: 'Arrange a mock interview with a peer, mentor, or AI interview tool. Run: 5 min intro, 10 min system design (design an AI product for X), 10 min product sense (how would you improve Claude?), 10 min metrics (how would you measure Y?), 10 min behavioral. Record it.', time: '45 min' },
    { title: 'Self-assessment and gap analysis', description: 'Review your recording. Score yourself on each round (1–5). Identify the 3 weakest moments: what did you not know, what were you unclear on, what caught you off guard? These are your final review priorities.', time: '20 min' },
    { title: 'Answer bank review and update', description: 'Review the answer bank from Day 33. Which answers are stronger after Phase 3 work? Which are still thin? Update the 5 weakest with specific examples and data points from Phase 3 content. Each answer should have at least one concrete example.', time: '20 min' },
    { title: 'Questions to ask the interviewer', description: 'Prepare 10 strong questions to ask interviewers at frontier AI labs. Strong questions demonstrate knowledge of the company while genuinely learning useful information. Avoid questions answerable by reading the company website.', time: '15 min' },
  ],
  interview: {
    question: "Tell me about a time you made a significant product decision with incomplete information.",
    answer: `Structure: Situation → incomplete information → reasoning process → decision → outcome and learning.<br><br>Example frame: "We were deciding between a fine-tuned smaller model and a larger general model for classification. We had benchmark data but no production data, and the approaches had opposite cost/quality profiles. I weighted three factors: the latency SLA (the fine-tuned model would meet it; the general model wouldn't), the 90-day inference cost projection at scale, and the maintenance burden of keeping a fine-tuned model current as our taxonomy evolved. I recommended the general model, accepting the higher cost, because the taxonomy change maintenance would have required a dedicated ML engineer we didn't have. Six months later, when our taxonomy changed significantly, we updated prompts in 2 hours instead of retraining a model."<br><br>Key elements: the decision involved technical tradeoffs, you made them explicitly, and you learned something applicable to future decisions.`
  },
  pmAngle: "The mock interview is the most underutilized tool in interview preparation. Every hour of recorded mock interview is worth 10 hours of reading about interviews. Record yourself. Watch it. Do the uncomfortable thing.",
  resources: [
    { type: 'TOOL', title: 'Interviewing.io', url: 'https://interviewing.io', note: 'Paid mock interviews with ex-FAANG interviewers — worth it for the final 2 weeks.' },
    { type: 'BLOG', title: 'AI PM Interview Preparation', url: 'https://www.tryexponent.com/guides/ai-pm-interview', note: "Exponent's guide to AI PM interview rounds and preparation." },
    { type: 'TOOL', title: 'BigInterview', url: 'https://biginterview.com', note: 'AI-powered mock interview tool with instant feedback on your answers.' },
  ]
},

58: {
  subtitle: "Write the vision statement that defines your contribution to AI product development.",
  context: `<p>An AI product vision statement is not a mission statement, a tagline, or a feature description. It is a clear, specific articulation of the future state you are working to create — the world that will exist because of the product you build. Great vision statements are: aspirational but not vague ("the world's best AI assistant" is vague; "the product that makes expert legal guidance accessible to anyone, not just those who can afford a $500/hour attorney" is aspirational and specific), time-bounded (you can evaluate whether you achieved it in 3–5 years), and product-grounded (the vision is achievable through building a specific product, not through circumstance or luck).</p>
  <p>The vision statement is one of the most underutilized PM tools in the AI era. Most AI products are built around a technical capability ("we have access to GPT-4") rather than a user vision. Products built around technical capability pivot with each new model release, because their identity is tied to the capability rather than the user outcome. Products built around a vision persist through model changes and competitive shifts, because the team always knows what they are optimizing for. The vision is the anchor that prevents the AI product team from being permanently distracted by new capabilities.</p>
  <p>Your personal AI product vision statement is also an interview tool. When asked "where do you want to take AI product development?" or "what AI problem do you most want to solve?", a prepared, specific, well-reasoned vision answer separates candidates who have thought seriously about the field from those who are reacting to trends. Write it now, refine it with feedback, and be able to deliver it confidently in 90 seconds.</p>`,
  tasks: [
    { title: 'Draft your product vision statement', description: 'Write 3 candidate vision statements for an AI product you would build. Each should be 2–3 sentences, specific, and time-bounded. For each: who is the user, what future do they live in because of your product, and what does "success" look like in 3 years?', time: '20 min' },
    { title: 'Test your vision against the criteria', description: 'For each of your 3 vision drafts: test against the criteria — aspirational but not vague, time-bounded, product-grounded, and independent of a specific model capability. Which survives all four tests?', time: '15 min' },
    { title: 'Write your personal AI PM vision', description: 'Write your personal vision statement as an AI PM: what contribution do you want to make to AI product development? What types of products do you most want to build? What user problem do you most want to solve? 150–200 words. This is your interview answer to "what drives you?"', time: '20 min' },
    { title: 'Deliver your vision out loud', description: 'Practice delivering your product vision statement out loud. Record yourself. Time it: it should be 60–90 seconds. Review for: specificity (does it sound like your product or any AI product?), conviction (does it sound like you believe it?), and clarity (does a non-expert understand it?).', time: '15 min' },
  ],
  interview: {
    question: "What AI problem do you most want to solve, and why?",
    answer: `This question rewards preparation. A strong answer has three components: the specific problem (with user and stakes), why AI makes it solvable now (specific capability that wasn't available 2 years ago), and why you personally are motivated to work on it (connection to your experience or values).<br><br>Example structure: "The problem I most want to solve is [specific description of user pain with stakes]. This is solvable now because [specific AI capability — long context, tool use, reasoning models] that didn't exist at this quality level two years ago. I'm personally motivated by [connection to experience or values — your own or someone you know who faced this problem]."<br><br>What makes this answer strong: the problem is specific enough to sound researched, the capability connection shows technical fluency, and the personal motivation makes it memorable. Avoid: vague problems ("improving productivity"), capability-first framing ("I want to build with LLMs"), or generic mission statements ("I want to make AI safe").`
  },
  pmAngle: "The AI PM who has a clear, specific vision for what they want to build is a more compelling hire and a more effective product leader than one who is reacting to trends. Vision is a signal of conviction — and conviction is what moves organizations.",
  resources: [
    { type: 'BLOG', title: "How to Write a Product Vision", url: 'https://www.productplan.com/learn/product-vision/', note: 'ProductPlan framework for writing clear product vision statements.' },
    { type: 'BLOG', title: 'Good Strategy/Bad Strategy', url: 'https://www.goodreads.com/book/show/11721966-good-strategy-bad-strategy', note: "Richard Rumelt's framework for the difference between vision and strategy — essential reading." },
    { type: 'BLOG', title: 'The Brilliant Friend Vision', url: 'https://www.anthropic.com/news/anthropics-responsible-development-and-maintenance-of-advanced-ai', note: "Anthropic's vision for AI as a brilliant friend — the model vision statement for the field." },
  ]
},

59: {
  subtitle: "The capstone case study — one product, fully specced, ready to present.",
  context: `<p>The Day 59 Capstone Case Study asks you to produce the most complete, highest-quality product artifact of the course: a full case study for one AI product you would build. Not a sketch, not a teardown — a complete product story covering every dimension you've learned: user problem and market size, technical architecture, cost model, competitive positioning, safety and compliance, success metrics and evals, go-to-market strategy, and a 12-month roadmap. This is the artifact you bring to an Anthropic, OpenAI, or frontier lab interview when you're asked "show me something you've worked on."</p>
  <p>The case study format that works best for AI PM interviews: 6–8 pages, structured but conversational, with explicit decisions and tradeoffs at each stage. Interviewers don't want to read a generic AI product pitch; they want to see how you think. Every major decision should be documented with the rationale and the alternatives you considered. "I chose Claude 3.5 Sonnet over GPT-4o because the 200K context window handles full contracts natively — but I would switch to GPT-4o if the customer is Azure-centric or if Anthropic's context quality at 150K+ tokens degrades" is the kind of decision documentation that signals real depth.</p>
  <p>The hardest section to write well is the safety and compliance section. Most candidates either skip it (pretending AI products have no safety considerations) or add a superficial disclaimer ("we will ensure the AI is safe"). A strong case study treats safety as a product design constraint: what specifically will this product not do, why, what are the known failure modes, and how do you detect them in production? If the product is in a high-risk EU AI Act category, acknowledge it and specify the compliance requirements. This is what real frontier lab PMs do.</p>`,
  tasks: [
    { title: 'Choose your capstone product', description: 'Select the AI product you have developed most thoroughly throughout this course. Write the 3-sentence product concept: what it does, who it is for, and why now. This is your anchor statement for the entire case study.', time: '10 min' },
    { title: 'Write the full product case study', description: 'Write a 6–8 page case study covering: user problem and market size, technical architecture (model, infra, tools), cost model, competitive positioning, safety and compliance, success metrics and eval strategy, GTM strategy, and 12-month roadmap. Make every major decision explicit with rationale and alternatives considered.', time: '90 min' },
    { title: 'Self-review against the quality bar', description: 'Review your case study against this bar: (a) is every major decision documented with rationale? (b) is the technical architecture specific enough for an engineer to start building? (c) does the safety section treat safety as a design constraint, not a disclaimer? (d) is the cost model grounded in real pricing? Revise the weakest section.', time: '20 min' },
    { title: 'Prepare the 5-minute verbal presentation', description: 'Prepare a 5-minute verbal walkthrough of your case study. Cover: the problem (30 sec), why AI now (30 sec), architecture (90 sec), cost and business model (30 sec), safety/compliance (30 sec), metrics and roadmap (60 sec). Practice until the structure is automatic.', time: '20 min' },
  ],
  codeExample: {
    title: 'Cost model calculator for your capstone product — JavaScript',
    lang: 'js',
    code: `// Capstone cost model: calculate unit economics for your AI product

const MODELS = {
  'claude-3-5-sonnet':  { inPer1M: 3.00,  outPer1M: 15.00, name: 'Claude 3.5 Sonnet' },
  'claude-3-haiku':     { inPer1M: 0.25,  outPer1M: 1.25,  name: 'Claude 3 Haiku' },
  'gpt-4o':             { inPer1M: 5.00,  outPer1M: 15.00, name: 'GPT-4o' },
  'gpt-4o-mini':        { inPer1M: 0.15,  outPer1M: 0.60,  name: 'GPT-4o-mini' },
};

function calcCost(model, inputTokens, outputTokens, dailyRequests) {
  const m = MODELS[model];
  const perReq = (inputTokens / 1e6 * m.inPer1M) + (outputTokens / 1e6 * m.outPer1M);
  return {
    perRequest: perReq,
    monthly: perReq * dailyRequests * 30,
    model: m.name,
  };
}

// Example: Legal Contract Review product
const product = {
  name: 'ContractAI — Legal Document Review',
  avgInputTokens: 95000,   // 75K doc + 20K system + history
  avgOutputTokens: 2500,   // structured extraction output
  dailyRequests: 500,      // 500 contract reviews/day
  pricePerContract: 8.00,  // $8 per contract reviewed
};

console.log('=== ' + product.name + ' ===');
console.log('Volume: ' + product.dailyRequests + ' contracts/day');
console.log('Avg input tokens: ' + product.avgInputTokens.toLocaleString());
console.log();

const results = Object.keys(MODELS).map(m => calcCost(m, product.avgInputTokens, product.avgOutputTokens, product.dailyRequests));
const maxNameLen = Math.max(...results.map(r => r.model.length));

console.log('Monthly inference cost by model:');
console.log('─'.repeat(55));
results.forEach(r => {
  const gross = product.pricePerContract * product.dailyRequests * 30;
  const margin = ((gross - r.monthly) / gross * 100).toFixed(1);
  console.log(r.model.padEnd(maxNameLen + 2) + '$' + r.monthly.toFixed(0).padStart(8) + '/mo' + '   GM: ' + margin + '%');
});

console.log();
console.log('Revenue: $' + (product.pricePerContract * product.dailyRequests * 30).toLocaleString() + '/month at $' + product.pricePerContract + '/contract');
console.log('Claude 3.5 Sonnet is optimal: handles 95K ctx natively, best extraction quality');`
  },
  interview: {
    question: "Present your capstone case study in 5 minutes.",
    answer: `The structure of a strong 5-minute presentation:<br><br><strong>Problem (30 sec):</strong> "[User type] spends [time/cost] on [task]. Existing solutions fail because [specific reason]. This creates [$X] in annual waste for a [market size] addressable market."<br><br><strong>Why AI now (30 sec):</strong> "This is solvable today because [specific model capability — 200K context, tool use, structured output] that didn't exist at production quality two years ago."<br><br><strong>Architecture (90 sec):</strong> "We use Claude 3.5 Sonnet for [reason], a RAG layer over [data source], tool use for [specific integration], and [deployment architecture] for enterprise compliance. Cost is [$X per unit] at [volume], yielding [Y%] gross margin."<br><br><strong>Safety and compliance (30 sec):</strong> "This is [EU AI Act risk tier] because [reason]. We implement [specific oversight mechanisms]. Known failure modes are [X and Y], detected via [monitoring approach]."<br><br><strong>Metrics and roadmap (60 sec):</strong> "North Star is [specific outcome metric]. Launch target: [eval score] by [date]. Six-month roadmap: [3 milestones with specific model or engineering dependencies]."<br><br>Time all 5 sections. If one runs long, cut the narrative — the specifics are what matter.`
  },
  pmAngle: "The capstone case study is your most polished work product from this course. It should be something you are genuinely proud to share with a hiring manager at Anthropic. That is the bar.",
  resources: [
    { type: 'BLOG', title: 'How to Write a Product Case Study', url: 'https://www.lennysnewsletter.com/p/product-case-study', note: 'Structure and best practices for PM case studies.' },
    { type: 'DOCS', title: 'Anthropic API Pricing', url: 'https://www.anthropic.com/pricing', note: 'Current pricing for your cost model — verify before presenting.' },
    { type: 'BLOG', title: 'AI Product Case Study Examples', url: 'https://www.reforge.com/blog/ai-case-studies', note: 'Examples of AI product strategy at depth from top practitioners.' },
  ]
},

60: {
  subtitle: "Retrospective and launch — look back, synthesize, and go.",
  context: `<p>Day 60 is not more content — it is a structured retrospective and launch ritual. You have spent 59 days building a knowledge base that most working PMs spend 2–3 years accumulating through trial and error. You understand how LLMs work, how frontier labs compete, how agentic protocols interoperate, how to design evals, how to lead AI product teams, how to price AI products, and how to navigate the regulatory landscape. The question is not whether you know enough — you do. The question is what you do next, and whether you do it with the intentionality the last 60 days deserve.</p>
  <p>A structured retrospective has three parts: <strong>what you know well enough to teach</strong> (the material that is fully internalized, where you can explain it clearly to anyone), <strong>what you know but couldn't defend under pressure</strong> (the material you understand conceptually but would struggle to answer specific questions about), and <strong>what you still need to work on</strong> (the gaps where your knowledge is thin, your answer bank is weak, or your portfolio piece is missing). The gap map from this retrospective is your review priority list for the next 2–4 weeks before your first interview.</p>
  <p>The launch ritual is simple: commit to your next concrete action. Apply for the role you've been preparing for. Reach out to the hiring manager whose team you've been studying. Submit the application you've been waiting to feel ready for. The 60 days are complete; the work now is to convert this knowledge into opportunity. The candidates who get offers at frontier AI labs are not the ones who know the most — they are the ones who show up, prepared, with a clear vision of what they want to build and the technical depth to back it up. That is you, today.</p>`,
  tasks: [
    { title: 'Complete the retrospective', description: 'Go through every phase and write your honest self-assessment: 3 topics you can teach confidently, 3 topics you know but couldn\'t defend under pressure, and 3 genuine gaps. For each gap: what is the highest-leverage action to close it (re-read a day, build a project, do a mock interview)?', time: '30 min' },
    { title: 'Update your answer bank one final time', description: 'Review every answer in your answer bank. For each, ask: does this reflect what you now know after 60 days? Is there a more specific example, a more recent data point, or a clearer framework you can use? Update every answer that feels stale.', time: '25 min' },
    { title: 'Define your next 30 days', description: 'Write your action plan: which companies you are applying to (3–5 specific roles), what interview prep remains (which question types, which topics), what portfolio piece you are finishing, and what daily habit keeps your knowledge current (which changelog, which paper, which community). Be specific. Set dates.', time: '20 min' },
    { title: 'Submit one application today', description: 'Identify the role you most want. Write or refine the cover letter or application materials today, while the course is fresh and your motivation is highest. Submit it. Then repeat for the next role. The work of the last 60 days is wasted if it stays in a Notion page.', time: '25 min' },
  ],
  interview: {
    question: "Why do you want to work at Anthropic specifically, not another frontier lab?",
    answer: `This question rewards genuine specificity over rehearsed mission-alignment answers. A strong answer has three elements: organizational specificity (something true of Anthropic that isn't true of OpenAI or Google DeepMind), product specificity (a specific product or research direction you want to work on), and personal connection (why this matters to you specifically).<br><br>Example structure: "I want to work at Anthropic specifically for three reasons. First, [specific organizational characteristic — the RSP's genuine accountability structure, the Constitutional AI approach to safety, the interpretability research program]. Second, [specific product you want to work on — Claude Code, the API developer experience, the enterprise platform]. Third, [personal connection — a specific use case you've built, a safety concern you've thought about, a type of user problem you most want to solve].<br><br>What to avoid: generic mission alignment ("Anthropic's safety focus resonates with me"), capability comparison ("Claude is the best model"), or answers that would work equally well for any AI company. The interviewer is testing whether you've done the research and thought about why Anthropic specifically is where your work will have the most impact.`
  },
  pmAngle: "You are ready. The knowledge is there. The portfolio is there. The preparation is done. What separates the candidates who get offers from those who don't is not more preparation — it is action. Apply. Reach out. Show up. Go.",
  resources: [
    { type: 'BLOG', title: 'Anthropic Careers', url: 'https://www.anthropic.com/careers', note: 'Current open roles at Anthropic — apply today.' },
    { type: 'BLOG', title: 'OpenAI Careers', url: 'https://openai.com/careers', note: 'Open roles at OpenAI — PM roles are listed under Product.' },
    { type: 'BLOG', title: 'The 60-Day Retrospective', url: 'https://www.lennysnewsletter.com/p/how-to-become-a-great-pm', note: "Lenny's framework for ongoing PM development — what comes after the course." },
  ]
},

});
