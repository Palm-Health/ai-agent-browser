# Adaptive Personal Memory Engine

The Adaptive Personal Memory Engine persistently tracks user interactions to personalize the AI Agent Browser. It stores behavior, selector performance, plugin usage, and mission history in an encrypted local data store so the browser, orchestrator, and Sentinel can adapt over time.

## Memory categories

- **UserBehaviorMemory**: domains, skill packs, click patterns, workflows, and time-of-day activity.
- **AgentMemory**: selector performance including successes, failures, healed selectors, and preferred recovery paths.
- **BrowserMemory**: plugin affinity, panel usage, pinned sidebars, and shortcut preferences.
- **ContextualMemory**: keywords, frequently used tags, and content topics to help infer intent.
- **MissionMemory**: recent missions, completion patterns, and suggested shortcuts or follow-ups.

Each category is described in `src/memory/memoryTypes.ts` and persisted through the memory engine.

## Memory engine

`src/memory/memoryEngine.ts` loads and saves encrypted memory, records incoming events, updates selector confidence, and emits lightweight recommendations. Events cover skill usage, plugin open/close events, orchestrator missions, Sentinel warnings, shadow mode recovery, and vault interactions. Memory is encrypted on disk using AES-256-CTR and sensitive payload fields are sanitized before storage.

## Learning loop

The loop in `src/memory/learningLoop.ts` processes buffered events to update confidence scores, detect habits, and feed insights to Forge, Sentinel, and the mission planner. It can be run on a schedule or invoked directly to flush buffered events.

## Personalization layer

`src/personality/personalization.ts` converts memory signals into UI changes: rearranging toolbars, suggesting plugins to surface or hide, highlighting successful flows, preloading skill packs or vault pages, and offering workflow continuation prompts. Recommendations also inform orchestrator hints.

## Mission-aware planning

`src/orchestrator/memoryAwarePlanner.ts` uses mission history to propose shortcuts, default agents based on past tags, and common follow-up tasks such as post-processing after analytics exports.

## Dashboard UI

`dashboard/app/dev/memory/page.tsx` renders a developer-facing dashboard summarizing top domains, workflows, selector health, mission sequences, and recommended actions. Use it to debug personalization output and tune Forge generation.

## Privacy and safety

`src/memory/privacy.ts` enforces local-only storage, sanitizes sensitive keys, supports private mode, category-level disabling, full memory wipes, and encryption at rest. Update `MEMORY_SECRET` to customize the encryption key.

## Extending the memory system

- Add new event types to `memoryTypes.ts` and handle them in `memoryEngine.ts`.
- Expand the learning loop with additional detectors and feeds.
- Extend personalization logic to adjust new UI surfaces.
- Add more mission planning heuristics based on domain-specific sequences.

## Erase and opt-out options

Developers can call `privacyManager.wipeMemory` to delete stored data, enable private mode to pause collection, or disable specific event categories. Ensure user-facing controls surface these options when wiring the engine into the browser UI.
