// Day 12 — Model Context Protocol (MCP)
// Updated: March 2026
// Note: Day 12 was missing from legacy phase files. Created as new content.
// Review guide: one of the strongest day concepts in the course.
// Changes applied:
// - References MCP 1.0 specification
// - Added transport types: stdio, SSE/HTTP (remote), in-process
// - Added OAuth 2.0 authorization for remote MCP servers
// - Upgraded task: real API connection, not just get_timestamp
// - Added MCP security model section
// - Added remote MCP deployment context
// - Added Claude Desktop + MCP clarification
// - Reframed from "Anthropic's answer to function calling" → different abstraction layer
// - Added GitHub commit task structure

window.COURSE_DAY_DATA = window.COURSE_DAY_DATA || {};

window.COURSE_DAY_DATA[12] = {
  subtitle: 'The protocol that makes AI tools reusable across every application — MCP is the USB standard for AI.',

  context: `<p>The <strong>Model Context Protocol (MCP)</strong> is an open standard that defines how AI applications discover and use external tools, data sources, and prompts. Where Day 11\u2019s tool use defines tools <em>inline per API call</em>, MCP defines tools as <em>reusable servers</em> that any MCP-compatible client can discover and use. The analogy: tool use is like plugging a specific cable into your computer; MCP is like USB — a universal standard that any device can use. MCP reached version 1.0 in late 2024 with a formal specification at <a href="https://modelcontextprotocol.io/specification" target="_blank">spec.modelcontextprotocol.io</a>.</p>
  <p>An MCP server exposes three types of capabilities: <strong>Tools</strong> (functions the model can call, like querying a database or creating a ticket), <strong>Resources</strong> (data the model can read, like files or API responses), and <strong>Prompts</strong> (reusable prompt templates with parameters). Each server publishes a manifest describing its capabilities, and MCP clients (like Claude Desktop, Claude Code, or API-connected applications) discover and use those capabilities through a standardized protocol.</p>
  <p><strong>Transport types</strong> matter for architecture. MCP supports: <strong>stdio</strong> (local process communication — ideal for desktop development and testing), <strong>Server-Sent Events / HTTP</strong> (remote MCP servers accessible over the network — the dominant production pattern by 2025), and <strong>in-process</strong> (embedding MCP servers directly in your application). A PM building a product that uses MCP needs to choose the right transport: stdio for local development and Claude Desktop testing, HTTP/SSE for production services. Remote MCP servers with <strong>OAuth 2.0 authorization</strong> (added in MCP 1.0) are critical for enterprise deployments where you can\u2019t give AI agents unlimited access to systems.</p>
  <p>MCP is <strong>not "Anthropic\u2019s answer to function calling"</strong> — that framing undersells it. Function calling defines tools per API call. MCP creates an ecosystem of reusable tool servers that any application can consume. The strategic value is ecosystem: by 2025-2026, there are hundreds of production MCP servers — for GitHub, Slack, databases, file systems, APIs, and internal enterprise tools. The official <a href="https://github.com/modelcontextprotocol/servers" target="_blank">MCP servers repository</a> lists maintained community servers. Building a new MCP server means every MCP-compatible AI application can instantly use your service. This is a platform play.</p>
  <p><strong>Claude Desktop is the primary local MCP client for testing.</strong> Claude.ai (the web app) does not support MCP — only the Claude Desktop app and API-connected clients do. This distinction matters for students doing the implementation task. Claude Code also has native MCP client support, making it a powerful development environment for MCP servers.</p>`,

  tasks: [
    {
      title: 'Build an MCP server that connects to a real API',
      description: 'Build an MCP server (TypeScript or Python) that exposes at least 2 tools connected to a real service \u2014 weather API, GitHub API, or a Supabase database. It should expose a Resource (returning some data) and a Tool (performing an action). Test it in Claude Desktop. Save in /day-12/mcp_server/ with package.json or requirements.txt. This should actually run.',
      time: '40 min'
    },
    {
      title: 'Test in Claude Desktop and document results',
      description: 'Configure your MCP server in Claude Desktop\u2019s config (claude_desktop_config.json). Verify Claude can discover and call your tools. Test with 5 different natural language requests. Document: which requests correctly triggered tools? Which failed? What would you improve? Save as /day-12/mcp_test_results.md.',
      time: '20 min'
    },
    {
      title: 'MCP vs inline tool use comparison',
      description: 'Write a 1-page comparison: when do you define tools inline (per API call) vs publish them as MCP servers? Consider: reusability across applications, team size, development speed, enterprise governance, security. When does the overhead of MCP not pay off? Save as /day-12/mcp_vs_function_calling.md.',
      time: '15 min'
    },
    {
      title: 'Design an MCP security model',
      description: 'Your enterprise wants to expose internal databases via MCP to AI assistants. Design the security model: authentication (OAuth 2.0 for remote servers), authorization (which agents can access which tools?), audit logging (what was called, by whom?), principle of least privilege (only expose what the agent needs). Save as /day-12/mcp_security_model.md.',
      time: '15 min'
    }
  ],

  codeExample: {
    title: 'MCP server structure — TypeScript (simplified)',
    lang: 'js',
    code: `// MCP Server — Simplified Structure (TypeScript)
// Full implementation: use @modelcontextprotocol/sdk
// Docs: https://modelcontextprotocol.io/quickstart/server

// === MCP SERVER ANATOMY ===
const mcpServerStructure = {
  // 1. Server metadata
  name: "weather-mcp-server",
  version: "1.0.0",
  description: "Provides weather data for any city",

  // 2. Tools — functions the model can call
  tools: [
    {
      name: "get_weather",
      description: "Get current weather for a city. Returns temperature, conditions, and humidity. Use when the user asks about weather in a specific location.",
      inputSchema: {
        type: "object",
        properties: {
          city: { type: "string", description: "City name (e.g., 'San Francisco')" },
          units: { type: "string", enum: ["celsius", "fahrenheit"], description: "Temperature unit" }
        },
        required: ["city"]
      }
    },
    {
      name: "get_forecast",
      description: "Get 5-day weather forecast for a city.",
      inputSchema: {
        type: "object",
        properties: {
          city: { type: "string", description: "City name" },
          days: { type: "number", description: "Number of forecast days (1-5)" }
        },
        required: ["city"]
      }
    }
  ],

  // 3. Resources — data the model can read
  resources: [
    {
      uri: "weather://supported-cities",
      name: "Supported Cities List",
      description: "List of all cities with weather data available"
    }
  ],

  // 4. Prompts — reusable prompt templates
  prompts: [
    {
      name: "weather_report",
      description: "Generate a weather report for a city",
      arguments: [{ name: "city", required: true }]
    }
  ]
};

// === TRANSPORT OPTIONS ===
const transports = {
  stdio: {
    useCase: "Local development, Claude Desktop testing",
    config: "In claude_desktop_config.json: { command: 'node', args: ['server.js'] }",
    security: "Runs as local process — inherits user permissions"
  },
  http_sse: {
    useCase: "Production deployment, remote access",
    config: "Deploy as HTTP service, clients connect via URL",
    security: "OAuth 2.0 authorization required for enterprise"
  },
  in_process: {
    useCase: "Embedded in application, no network overhead",
    config: "Import server module directly in application code",
    security: "Application-level access control"
  }
};

// === MCP vs INLINE TOOL USE ===
console.log("MCP SERVER STRUCTURE");
console.log("=".repeat(55));
console.log("Server: " + mcpServerStructure.name + " v" + mcpServerStructure.version);
console.log("Tools:  " + mcpServerStructure.tools.length);
console.log("Resources: " + mcpServerStructure.resources.length);
console.log("Prompts: " + mcpServerStructure.prompts.length);

console.log("\\nTOOLS:");
mcpServerStructure.tools.forEach(t => {
  console.log("  " + t.name + " — " + t.description.slice(0, 60) + "...");
});

console.log("\\nTRANSPORT OPTIONS:");
Object.entries(transports).forEach(([name, t]) => {
  console.log("\\n  " + name.toUpperCase());
  console.log("    Use case: " + t.useCase);
  console.log("    Security: " + t.security);
});

console.log("\\n" + "=".repeat(55));
console.log("MCP vs INLINE TOOL USE — Decision Framework");
console.log("=".repeat(55));
console.log("\\nInline tool definitions (Day 11):");
console.log("  + Fast to prototype, zero infrastructure");
console.log("  + Tools defined per API call");
console.log("  - Not reusable across applications");
console.log("  - No ecosystem benefit");
console.log("\\nMCP servers (Day 12):");
console.log("  + Tools reusable by ANY MCP client");
console.log("  + Ecosystem: 100s of pre-built servers");
console.log("  + Enterprise governance (OAuth, audit)");
console.log("  - More setup and infrastructure");
console.log("  - Overkill for single-app tools");
console.log("\\nProgression: Start inline → Move to MCP when reuse matters");`
  },

  interview: {
    question: 'What is MCP and how does it differ from regular tool use / function calling?',
    answer: `MCP \u2014 the Model Context Protocol \u2014 is an open standard for how AI applications discover and use external tools, data sources, and prompts. It reached version 1.0 in late 2024.<br><br>The key difference from inline tool use: <strong>scope and reusability</strong>. Inline tool use (Day 11) defines tools per API call \u2014 you pass tool definitions directly to the model. MCP publishes tools as independent servers that any MCP-compatible client can discover and use. Think of it as the difference between writing a function in one file vs publishing it as a package that any application can install.<br><br>MCP exposes three capability types: Tools (functions), Resources (readable data), and Prompts (reusable templates). It supports multiple transport modes: stdio for local development, HTTP/SSE for production remote servers, and in-process for embedded use. Enterprise MCP uses OAuth 2.0 for authorization \u2014 critical for controlling which agents access which systems.<br><br>The strategic dimension: MCP creates an ecosystem. By 2025-2026, there are hundreds of production MCP servers \u2014 GitHub, Slack, databases, enterprise systems. Building your product as an MCP server means every AI application can instantly use it. That\u2019s a platform play, not just a protocol choice.<br><br>Practically: most products start with inline tools for speed, then evolve to MCP when reuse across applications or enterprise governance becomes important.`
  },

  pmAngle: 'MCP is a platform strategy disguised as a protocol specification. The PM who understands MCP can spec products that become part of the AI tool ecosystem \u2014 any client, any model, any application. That\u2019s a distribution advantage that inline tool definitions can\u2019t provide. Know the three MCP capability types (Tools, Resources, Prompts), the three transports (stdio, HTTP/SSE, in-process), and the security model (OAuth 2.0 for enterprise) \u2014 and you can have a credible architecture conversation about agentic products.',

  resources: [
    { type: 'DOCS', title: 'MCP Specification', url: 'https://modelcontextprotocol.io/specification', note: 'The official MCP 1.0 specification. Read the architecture overview first.' },
    { type: 'DOCS', title: 'MCP Quickstart (Server)', url: 'https://modelcontextprotocol.io/quickstart/server', note: 'Build your first MCP server in 30 minutes. TypeScript or Python.' },
    { type: 'GITHUB', title: 'MCP Servers Repository', url: 'https://github.com/modelcontextprotocol/servers', note: 'Official list of maintained MCP servers. Check before building your own.' },
    { type: 'DOCS', title: 'Claude Desktop MCP Config', url: 'https://modelcontextprotocol.io/quickstart/user', note: 'How to configure MCP servers in Claude Desktop for testing.' },
    { type: 'DOCS', title: 'MCP Authorization (OAuth)', url: 'https://modelcontextprotocol.io/specification/2025-03-26/basic/authorization', note: 'OAuth 2.0 framework for remote MCP servers. Critical for enterprise.' },
    { type: 'BLOG', title: 'Anthropic MCP Announcement', url: 'https://www.anthropic.com/news/model-context-protocol', note: 'Why Anthropic created MCP and the ecosystem vision.' }
  ]
};
