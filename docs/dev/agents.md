# Dev Agents

This project includes a lightweight developer agent stack for local use. The stack is designed for development and debugging; routes and CLIs are dev-only and rely on your local dev server if available.

## Browser Agent

The Browser Agent wraps our existing Gemini helper with repo-aware, docs-aware, and cloud-aware context gathering.

**Usage**

```bash
pnpm agent browse "Explain all FHIR endpoints in this repo and suggest a new MedicationRequest route."
pnpm agent spec "Propose a spec + file list for integrating YouTube metrics into Marketing Studio."
pnpm agent patch "Draft code changes to refactor Morning Briefing into a Gemini/Vertex specific service."
```

**What it does**
- Reads relevant repository files (limited selection to avoid huge context) and shares snippets with the model.
- Adds curated doc snippets based on task keywords (Next.js app router, Supabase, LangGraph, FHIR, YouTube metrics).
- Summarizes Supabase and GCP config from environment variables and migration folders.
- Falls back to a local summarizer when cloud APIs are not configured.

The Browser Agent is also exposed as a dev-only API route at `/api/dev/agent/browser` (POST).

## Parallel Agent

The Parallel Agent orchestrates three Browser Agent subtasks (research, spec, code) concurrently.

**Usage**

```bash
pnpm agent:parallel "Add a full FHIR MedicationRequest module wired to IPrescribe and our EMR patient model."
pnpm agent:parallel "Extend Morning Briefing to include operations/compliance alerts with audit logging."
```

Each subtask returns its own summary, and artifacts are merged (later subtasks win on conflicting paths). The orchestrator is also reachable via `/api/dev/agent/parallel` (POST).

## Super Browser capabilities

- **Repo awareness**: Selects relevant files from `services`, `src/server`, `dashboard/app/api`, `components`, and `supabase/migrations`, extracts snippets, and attaches them to the prompt.
- **Docs awareness**: Adds curated reminders for Next.js app router, Supabase migrations/RLS, LangGraph/LangChain orchestration, FHIR primitives, and YouTube metrics when the task mentions them.
- **Cloud awareness**: Summarizes Supabase URLs/keys (masked), Cloud Run/GCP identifiers, Pub/Sub topics, and available Supabase migration folders so the model codes against the right resources.

## Notes

- The CLIs will try the local dev API first (`http://localhost:3000`); if unavailable they fall back to running the agent in-process.
- Provide `API_KEY` (Gemini) or other provider keys if you want real model output; otherwise, a safe local summary is returned.
