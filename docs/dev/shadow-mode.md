# Shadow Mode Design Prompt

The following specification outlines how to implement AI Shadow Mode in the existing Chromium agent + MCP + Marketing Studio stack. Use it as a ready-to-run Cursor super-prompt.

---

## High-Level Goal
Implement a mode where the system:
1. Observes user-driven browser and app actions (clicks, navigation, forms, MCP tool calls).
2. Records these as structured flows with context and intent.
3. Learns from repeated patterns and suggests new automations.
4. Converts a learned flow into an executable agent workflow (browser plan + MCP calls).
5. Operates safely across three modes: record-only, suggest automation, and fully autonomous replay.

---

## Discovery Checklist
Before coding, locate:
- Browser agent/plan execution modules (e.g., executePlan, flows, chromiumClient, browserAgentService).
- Existing flow or recording systems.
- MCP tool definitions and logging/audit layers.
- User identity plumbing (user_id, staff_id, practice_id, etc.).

Reuse these components instead of inventing new patterns.

---

## Event Model
Create `src/server/shadow/shadowTypes.ts` defining:
- `ShadowEventType`: `browser:navigation`, `browser:click`, `browser:type`, `browser:scroll`, `browser:submit`, `mcp:tool_call`, `app:route_change`, `app:action`.
- `ShadowEvent` with IDs, user/session IDs, timestamps, optional URL/selector/textContent/inputValue (redacted), tool info, and metadata.
- `ShadowFlow` containing flow metadata plus event list.

---

## Supabase Storage
Add migrations for:
- `shadow_sessions`: id, user_id, started_at, ended_at, context (jsonb).
- `shadow_events`: id, session_id, user_id, type, url, selector, text_content, input_value_redacted, tool_name, tool_input_redacted, meta, timestamp.
- `shadow_flows`: id, user_id, name, description, tags, events (jsonb), created_at, updated_at.

Enforce RLS so users only see their own data and allow future practice_id scoping.

---

## Shadow Session Manager
Create `src/server/shadow/shadowSessionManager.ts` exporting:
- `ShadowContext` with userId, sessionId, optional practiceId, and mode (`record-only`, `suggest-automation`, `auto`).
- `startShadowSession(userId, context?)`: starts a session and returns context.
- `endShadowSession(context)`: stops recording.
- `recordShadowEvent(context, event)`: fills IDs/timestamps, redacts sensitive fields, and writes to `shadow_events`.

Session IDs are generated per recording session.

---

## Instrumentation
Enable only when Shadow Mode is active:
- **Browser agent**: emit events on navigation, clicks, typing, and submissions (url, selector, textContent, etc.).
- **MCP tools**: wrap calls to emit `mcp:tool_call` with redacted input.
- **App events**: optionally register `app:action` for key internal actions.
Ensure minimal overhead when Shadow Mode is off.

---

## Flow Learner
Create `src/server/shadow/flowLearner.ts` exporting:
- `LearnedFlowSummary` structure.
- `learnFlowsFromSession(sessionId)`: fetches ordered events, uses an LLM to group meaningful sequences, discards noise, names flows, and stores results in `shadow_flows` with tags and events/steps.

---

## Flow Compiler
Create `src/server/shadow/flowCompiler.ts` with:
- `compileFlowToBrowserPlan(flow)`: maps events to browser actions (goto, click, type, waits), optionally LLM-optimizes selectors, and returns a `BrowserTaskPlan` compatible with existing planners.

---

## Suggestions Service
Create `src/server/shadow/shadowSuggestions.ts` exporting:
- `ShadowSuggestion` shape with name, description, trigger idea, and estimated time saved.
- `generateShadowSuggestionsForUser(userId)`: analyzes repeated patterns and flows, optionally via LLM, to surface automation ideas.

---

## UI
Add `dashboard/app/dev/shadow/page.tsx` to:
- Toggle Shadow Mode and show active session status.
- List recent sessions and learned flows.
- Rename/tag flows and set policy: Just Log, Suggest Automation, Auto-Replay Allowed.

Add a flow detail page to view steps, test-run compiled plans in simulation mode, and promote flows to agents.

---

## MCP Tools
Expose controls following existing registration patterns:
- `shadow.start_session` (input: optional context; output: `ShadowContext`).
- `shadow.end_session` (input: sessionId; triggers flow learning).
- `shadow.list_flows` (optional userId filter).
- `shadow.compile_flow` (input: flowId; output: `BrowserTaskPlan`).
- `shadow.suggestions` (optional userId; returns suggestions).

---

## Safety & Privacy
- Opt-in only with clear visual indication when active.
- Redact sensitive inputs (passwords, emails, PHI, payment data) and PHI-related MCP fields.
- Allow scoped recording (e.g., marketing-only; exclude EMR screens).
- Add retention policy to anonymize or delete old shadow events.

---

## Developer Notes
Describe in `docs/dev/shadow-mode.md` (this file):
- How to enable/disable Shadow Mode.
- How flows are learned and promoted to automations.
- Recommended validation: run app, enable Shadow Mode, perform a short flow, end session, verify events/flows, compile a plan, and simulate it safely.

---

## Quickstart
1. **Turn on Shadow Mode**: expose a toggle in the developer or agent menu. Activating it should return a `ShadowContext` with
   the current user and session ID.
2. **Perform a flow**: navigate the app normally (clicks, form entries, MCP tool invocations). Instrumented events are captured
   only while Shadow Mode is active.
3. **End session**: stop recording via the toggle or the `shadow.end_session` MCP tool to trigger flow learning.
4. **Review learned flows**: open the Shadow page to inspect derived flows, rename/tag them, and choose a policy (Just Log,
   Suggest Automation, Auto-Replay Allowed).
5. **Compile and simulate**: use `shadow.compile_flow` to produce a browser plan, then run it in simulation/safe mode before
   promoting it to an agent or scheduled automation.
