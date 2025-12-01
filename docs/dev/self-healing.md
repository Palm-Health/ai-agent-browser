# Self-Healing Architecture Prompt

The following specification outlines how to build a self-healing layer for the browser agent, MCP tools, marketing workflows, and Supabase-backed services. Use it as a Cursor-ready super-prompt at the repo root.

---

## High-Level Goal
Implement automatic detection, diagnosis, repair, retesting, and redeployment for browser actions, MCP tools, marketing jobs, and render jobs. The system learns successful fixes over time and is supervised by an autonomous healing agent.

---

## Discovery Checklist
Identify existing components before integrating the self-healing layer:
- **Browser agent** modules (action wrappers, safe actions, selector recovery, executePlan, chromium client/service).
- **MCP architecture** (tool registration, validation, logging/audit layers).
- **Marketing studio** pipelines (render jobs, campaign planning, media selection, fragile areas).
- **Supabase** migration structure, schema enforcement, and type generation.

Use these anchors to place healing sensors and repair hooks.

---

## System Health Model
Create `src/server/health/healthTypes.ts` defining:
- `HealthState` (`healthy`, `degraded`, `broken`).
- `HealthIssue` with component, severity, symptoms, probable causes, recommended fixes, and auto-fix metadata.
- `SystemHealthReport` aggregating health issues with timestamps and overall state.

---

## Detection: Health Sensors
Instrument major components to emit `HealthIssue` entries:
- **Browser agent**: selector not found, timeouts, navigation loops, 4xx/5xx responses, DOM changes, persistent retries.
- **MCP tools**: input/output validation failures, exceptions, contract/signature drift, missing env vars, external API errors.
- **Supabase**: RLS violations, row inconsistencies, missing fields, schema drift, type mismatches, missing tables.
- **Marketing workflows**: render jobs stuck, zero media results, campaign plan token overruns, naming inconsistencies.

---

## Root-Cause Analyzer
Add `src/server/health/rootCause.ts` exporting `diagnoseIssue(issue)` to enrich probable causes and recommended fixes using heuristics and LLM inference (e.g., selector regeneration, tool contract repair, inferred migrations, output schema extensions).

---

## Auto-Fix Engine
Create `src/server/health/autoFixer.ts` with `attemptAutoFix(issue)` to perform automated repairs:
- **Browser**: aggressive selector recovery, regenerated selectors, patched flows.
- **MCP**: regenerate TypeScript interfaces, patch missing fields, rebuild wrappers, add fallbacks.
- **Supabase**: infer missing migrations, suggest/run dev migrations.
- **Marketing**: retry media selection, regenerate prompts, shorten captions when token limits hit.

---

## Retesting
Implement `src/server/health/retester.ts` with `revalidateIssue(issue)` to rerun the failing step (plan action, selector, tool call, DB query) and mark auto-fix success with notes.

---

## Health Memory
Add Supabase table `healing_memory` storing issue and fix signatures, success rate, timestamps, and improvement suggestions. Implement `src/server/health/healthMemory.ts` so agents favor historically successful fixes and avoid repeated failures.

---

## Self-Healing Supervisor Agent
Create `src/server/health/selfHealingSupervisor.ts` to:
1. Scan recent logs/events (agent_logs, shadow_events, browser traces, MCP errors, render failures).
2. Generate `SystemHealthReport`.
3. Diagnose, auto-fix, and retest issues; update healing memory.
4. For persistent issues, generate patch files, open AI pull requests, and notify developers.

Expose MCP tools: `healing.get_health_report`, `healing.run_supervisor`, `healing.auto_fix`, `healing.suggest_manual_patches` following existing registration patterns.

---

## UI Dashboard
Add `dashboard/app/dev/self-healing/page.tsx` showing system health (green/yellow/red), recent issues/fixes, auto-fix timeline, healing-memory insights, and controls to run the supervisor or generate patches.

---

## Safety & Limits
- Auto-migrations run only in dev unless `ALLOW_PROD_HEALING=1`.
- Browser fix attempts avoid submitting forms or publishing content.
- All auto-fix attempts are logged and require review in CI; self-healing PRs need manual approval.

---

## Developer Notes
Document in this file how to:
- Enable monitoring and sensors.
- Run the supervisor agent.
- Interpret reports and healing-memory insights.
- Validate a full healing loop: detection → diagnosis → repair → retest → memory update.

---

## Quickstart
1. **Enable sensors**: deploy the detection hooks for browser, MCP, Supabase, and marketing pipelines, then set any required
   environment flags (for example, allow dev auto-migrations by leaving `ALLOW_PROD_HEALING` unset).
2. **Seed health memory**: create the `healing_memory` table via migration so successful fixes can be persisted.
3. **Run the supervisor**: trigger `healing.run_supervisor` (via MCP tool or scheduled job) to produce a `SystemHealthReport`
   and attempt repairs.
4. **Review fixes**: inspect logged auto-fix attempts, approve generated patches, and rerun the failing scenario with the
   retester.
5. **Verify the loop**: confirm that issues move from `broken` → `healthy`, and that recurring issues reuse the stored
   `fix_signature` from healing memory.

---

## Example Flow: Detection → Diagnosis → Repair → Retest → Memory
1. **Detection**: a browser selector fails repeatedly; the browser sensor records a `HealthIssue` with component `browser` and
   symptom `selector not found`.
2. **Diagnosis**: `diagnoseIssue` inspects DOM context, tags probable causes like "DOM updated" and recommends rebuilding the
   selector.
3. **Auto-repair**: `attemptAutoFix` regenerates a resilient selector, patches the stored flow, and marks `autoFixAttempted`.
4. **Retest**: `revalidateIssue` reruns the flow step; if successful, it flags `autoFixSuccessful` and updates the
   `SystemHealthReport`.
5. **Memory update**: the successful repair is hashed into `healing_memory` so future similar selector failures immediately
   reuse the proven fix.
