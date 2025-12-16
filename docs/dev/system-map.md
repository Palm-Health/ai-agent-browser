# System Map

This repository now includes lightweight stubs to exercise the orchestrator, browser agent, marketing content machine, self-healing supervisor, shadow mode, and voice command flows.

## Entrypoints
- Orchestrator: `src/server/orchestrator/index.ts`
- Browser agent: `src/server/browser/index.ts`
- Marketing content machine: `src/server/marketing/index.ts`
- Self-healing: `src/server/health/index.ts`
- Shadow mode: `src/server/shadow/index.ts`
- Voice: `src/server/voice/index.ts`
- Observability: `src/server/observability/index.ts`

## MCP tools
Additional stub MCP registrations can be applied via `services/mcp/extendedTools.ts`.

## QA
Run `npm run qa:smoke` to execute the non-destructive QA sweep.
