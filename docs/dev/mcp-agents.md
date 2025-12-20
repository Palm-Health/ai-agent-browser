# MCP-aware Agent Stack

This document explains how the browser and parallel agents can optionally use MCP tools for richer workflows.

## Mental Model
- **Browser Agent** handles planning and single-task execution.
- **Parallel Agent** breaks work into research/spec/code subtasks.
- **MCP tools** provide clinical, marketing, education, and ops capabilities that the agents can invoke when enabled.

## Enabling MCP for Agents
Both agents accept the `useMCP` flag and optional `allowedMCPTools` list to limit scope. If `useMCP` is false, existing behavior is unchanged.

### Browser Agent
- Entry point: `/api/dev/agent/browser`
- Flags: `useMCP`, `allowedMCPTools`
- Output includes any MCP calls performed.

### Parallel Agent
- Entry point: `/api/dev/agent/parallel`
- Each subtask forwards MCP options and aggregates tool calls.

## CLI Usage Examples
```bash
# Let the browser agent use MCP tools
pnpm agent browse --mcp --tools=clinical.rag_search "Summarize obesity treatment workflows and propose AI triage upgrades."

# Run the parallel agent with specific tools
pnpm agent:parallel --mcp --tools=clinical.rag_search,marketing.outline "Design a DPC onboarding micro-course for new patients."
```

Set `DEV_API_BASE_URL` if your dev API is not running on `http://localhost:3000`.

## Inspecting MCP Tools
A dev endpoint lists available tools with basic categorization:
- `GET /api/dev/mcp/tools`

## Safety & Scope
- Keep `useMCP` off by default when testing unrelated features.
- Pass `--tools` to constrain what the agents may call (e.g., only clinical tools during EMR tasks).
