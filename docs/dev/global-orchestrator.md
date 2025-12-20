# Global Orchestrator

The global orchestrator is the mission-level planner and execution engine that coordinates specialist agents (browser, marketing, clinical, self-healing, and shadow mode).

## Concepts
- **Mission**: A high-level user intent describing an outcome. Missions are typed and include constraints, permissions, and context.
- **Subtask**: A routable unit of work assigned to a specialist agent with optional tool hints and dependencies.
- **Mission Plan**: Structured list of subtasks plus orchestration graph describing ordering/dependencies.
- **Mission Result**: Aggregated results, logs, and issues after execution.

## Files
- `src/server/orchestrator/orchestratorTypes.ts` – Types for missions, plans, subtasks, and results.
- `src/server/orchestrator/missionRegistry.ts` – Templates for common mission types.
- `src/server/orchestrator/context.ts` – Builder for mission context (brand profile, safety flags, tool availability).
- `src/server/orchestrator/planner.ts` – Planner that seeds subtasks, validates constraints, and shapes orchestration graphs.
- `src/server/orchestrator/executor.ts` – Execution loop with dependency ordering, safety checks, and agent routing.
- `src/server/orchestrator/agentRouter.ts` – Routes subtasks to the right agent family with basic fallbacks.
- `src/server/orchestrator/index.ts` – Convenience exports and end-to-end run helper.

## Missions & Templates
Mission templates live in `missionRegistry.ts` and outline input schema, suggested subtasks, and permissions. Use `listMissionTemplates()` to enumerate options and `seedPlanFromTemplate()` to pre-populate plans.

### Example Mission Requests
```ts
{
  id: 'mission-001',
  userId: 'user-123',
  type: 'marketing.campaign',
  goal: 'Launch a back-to-school TikTok blitz',
  brandId: 'brand-789',
  constraints: { budget: 5000 }
}
```

### Example Mission Plan
```ts
{
  missionId: 'mission-001',
  summary: 'Launch a back-to-school TikTok blitz',
  subtasks: [
    { id: 'mission-001-seed-1', agent: 'marketing', description: 'Draft campaign creative options', tool: 'marketing.generate_campaign' },
    { id: 'mission-001-seed-2', agent: 'browser', description: 'Research competitor positioning', tool: 'browser.plan' },
    { id: 'mission-001-seed-3', agent: 'marketing', description: 'Assemble final campaign brief', tool: 'marketing.compile_brief', dependsOn: ['mission-001-seed-1', 'mission-001-seed-2'] }
  ],
  orchestrationGraph: { nodes: [], edges: [] }
}
```

### Example Mission Result
```ts
{
  missionId: 'mission-001',
  success: true,
  results: { /* subtask keyed responses */ },
  issues: [],
  logs: ['Executed mission-001-seed-1 with agent marketing']
}
```

## Safety & Permissions
- Marketing subtasks block PHI-related descriptions.
- Mission constraint validation surfaces guardrail warnings.
- `executeMissionPlan` respects plan issues and short-circuits blocked steps.

## Extending
- Add a new mission template to `missionRegistry.ts` with suggested subtasks and permissions.
- Enhance `buildMissionContext` to pull real brand/persona data, tool availability, and healing memory.
- Expand `routeToAgent` with real MCP calls and recovery paths.
- Wire orchestrator MCP tools (`orchestrator.plan`, `orchestrator.run`, `orchestrator.status`, `orchestrator.list_missions`) to your tool execution layer.
