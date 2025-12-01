# Plugins and skills on live pages and vault snapshots

The skill system can now run against both live URLs and `vault://` snapshots by sharing a common `PageContext`.

## Virtual domains

When a `vault://page/{id}` URL is resolved, the protocol handler reads `meta/{id}.json` to populate a `PageContext` with `virtualDomain`, `snapshotId`, and `skillHint`. The virtual domain mirrors the original host, letting the skill manager select the same skill pack used for the live site.

For live pages, `PageContext.virtualDomain` falls back to the current hostname.

## Skill selection

`SkillManager.getActiveSkillForPage(pageContext)` now:

1. Checks `skillHint` when available.
2. Matches the virtual domain against known skill packs.
3. Falls back to the live URL host.

Skill packs live under `browser/skills/*.skill.json` and include domain metadata, selectors, and workflows. The YouTube pack example ships with an `openAnalytics` workflow used by the QA smoke test.

## Snapshot-aware workflows

Workflows can contain navigation and DOM actions. In snapshot mode:

- `goto` steps are skipped with a log message.
- DOM-centric steps (wait, click, extract) operate directly against the saved HTML.

The `SkillWorkflowExecutor` handles these semantics, keeping behaviors aligned between live browsing and offline snapshots.

## Plugin API helpers

Plugins can read context and skills through `PluginAPI`:

- `getPageContext()` returns `{ url, virtualDomain, snapshotId, skillHint, isVaultSnapshot }` for the active tab.
- `vault.getSnapshotMeta(id)` and `vault.openSnapshot(id)` provide access to saved pages.
- `skills.getActiveSkill()` returns the skill pack for the current page, regardless of whether it is live or from the vault.
