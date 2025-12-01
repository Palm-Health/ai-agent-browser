# Browser Forge

Browser Forge is the learning loop that turns shadow mode recordings, Sentinel alerts, and orchestrated workflows into new or improved skill packs. It mines candidate patterns, proposes changes, and lets you preview or apply those updates safely.

## Lifecycle

1. **Mine candidates**: Aggregate shadow flows, Sentinel warnings, and repeated task successes to identify selectors and workflows worth turning into skills.
2. **Propose changes**: Use the synthesizer to generate selector and workflow patches that match the skill pack format.
3. **Review**: Inspect candidates and proposals in the Forge dashboard (`/dev/forge`).
4. **Apply**: Preview or apply proposals to skill pack files under `src/browser/skills/`.
5. **Validate**: Use vault snapshots to sanity-check selectors and workflows before shipping.

## Key modules

- `src/browser/forge/forgeMiner.ts`: Gathers raw candidates from shadow data and Sentinel-style events.
- `src/browser/forge/forgeSynthesizer.ts`: Generates human-readable proposals for selectors and workflows.
- `src/browser/forge/forgeApplier.ts`: Creates diffs and writes updated `.skill.json` files in safe mode.
- `services/automation/forgeMission.ts`: Mission wrapper for orchestrator-style flows with optional auto-apply.
- `services/enhancedToolService.ts`: Exposes forge actions as native tools (`forge.*`) for MCP callers.
- `dashboard/app/dev/forge/page.tsx`: Lightweight review UI to browse candidates and trigger proposals.

## Running a Forge mission

```bash
npm run qa:forge
```

This smoke test mines a mock candidate, synthesizes a proposal, shows a diff, and writes the resulting skill pack.

For programmatic control, use the forge tools:
- `forge.mine_candidates` — list candidates (optional domain filter)
- `forge.propose_changes` — generate a proposal for a candidate
- `forge.apply_changes` — preview or apply a proposal

## Snapshot validation

Forge applier is snapshot-aware: skill updates are written to disk in `apply` mode, and preview mode returns a diff. Hook snapshot validation into `forgeApplier` to assert selectors exist in `vault://` snapshots before committing.
