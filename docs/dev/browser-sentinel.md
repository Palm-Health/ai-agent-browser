# Browser Sentinel

The Browser Sentinel adds real-time monitoring, predictive healing, and plugin-facing signals to the browser runtime. It is designed to work across live sites, `vault://` snapshots, and pages augmented by skill packs.

## What Sentinel Monitors
- **DOM mutations** to detect drift, high churn, and new popups or banners.
- **Network latency and responses** (429/401/403) to spot rate limits or login gates.
- **Layout shifts (CLS signals)** that hint at unstable surfaces.
- **Selector checks** to flag skill-pack elements missing from the current DOM.

Each observation becomes a `BrowserHealthEvent` with timestamps, URLs, and optional virtual domains for vault contexts.

## Predictive Healing
`predictFailure` evaluates recent health events and assigns a `low`, `medium`, or `high` risk. Heuristics include missing selectors, popup overlays, rate limits, repeated layout shifts, and rapid DOM churn. Suggested pre-heals accompany each risk to keep workflows resilient.

## Skill Packs and Vault Snapshots
- Skill pack selectors are validated early; missing entries raise a high-risk warning and trigger selector recovery suggestions.
- In `vault://` mode, network monitoring is disabled and missing selectors mark snapshots as potentially stale. Static DOM analysis is preferred for healing.

## Orchestrator Integration
`AgentRouter.executeWithSentinel` wraps workflow execution. High-risk findings pause the flow, notify the healing supervisor, and re-run pre-healing suggestions before resuming.

## Plugin Integration
Plugins can call `getBrowserHealth()` to retrieve overall health, recent events, and risk assessments, or subscribe to live events via `subscribeToBrowserEvents(cb)`. UI surfaces can warn users, adjust flows, or surface repair actions.

## Overlay for Operators
`SentinelOverlay` can be toggled with **Ctrl+Shift+S** to visualize current risk, recent events, and warnings directly in the browser viewport.
