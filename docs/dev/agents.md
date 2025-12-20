# Parallel Agent Orchestrator

The parallel agent orchestrator coordinates multiple browser-agent subtasks in parallel to speed up planning and implementation for a high-level request.

## What it does
- Splits an input task into research, spec, and code subtasks.
- Executes those subtasks concurrently using the existing browser agent service.
- Aggregates summaries, logs, and any generated artifacts.

## API usage
Send a POST request to the dev endpoint with your task description:

```
POST /api/dev/agent/parallel
Content-Type: application/json
{
  "task": "Describe the high-level task you want",
  "repoPath": "/absolute/path/to/repo" // optional
}
```

## CLI usage
Ensure the dev server is running at `http://localhost:3000`, then run:

```
pnpm agent:parallel "Add a FHIR MedicationRequest endpoint that wires into IPrescribe and our EMR's existing patient model"
pnpm agent:parallel "Add a YouTubeService that syncs channel metrics nightly into our Marketing Studio dashboard"
pnpm agent:parallel "Refactor Morning Briefing to include operations/compliance alerts and restructure prompts for Gemini/Vertex"
```

Artifacts returned by the parallel agent are written to disk relative to your repository root.
