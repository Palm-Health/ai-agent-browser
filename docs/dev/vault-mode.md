# Vault Mode

The Vault preserves offline copies of pages and keeps their original context so the agent can continue using site-specific skills when browsing snapshots.

## Snapshot layout

Snapshots are stored under `PalmVault`:

- `pages/{id}.html` – raw HTML saved from the browser.
- `markdown/{id}.md` – optional rendered Markdown.
- `meta/{id}.json` – metadata including the original URL, domain, and skill hint.
- `index.json` – lightweight listing for offline browse views.

Every metadata record follows:

```ts
interface VaultSnapshotMeta {
  id: string;
  url: string;
  domain: string;
  title?: string;
  tags?: string[];
  createdAt: string;
  missionId?: string;
  skillHint?: string;
}
```

The domain is extracted from the original URL. A `skillHint` is derived automatically for common hosts (YouTube, TikTok, Supabase) so the skills system can map snapshots back to their live site behaviors.

## Page context for snapshots

Opening `vault://page/{id}` yields a `PageContext` that mirrors the live browsing context:

- `url`: the `vault://` location.
- `virtualDomain`: the original host (e.g., `studio.youtube.com`).
- `snapshotId`: the vault ID.
- `skillHint`: the derived skill pack key when available.
- `isVaultSnapshot`: marks offline mode.

Agents and plugins can use this context to choose the correct skill pack even when browsing offline content.

## Tags and filtering

Snapshots are automatically tagged with `source:<domain>` and `skill:<skillHint>` (when present). The tags appear in `index.json`, enabling filters for source site or skill pack in vault UI surfaces.

## Offline behavior

When running skills against a snapshot, navigation steps are skipped while DOM operations continue to run on the saved HTML. This lets workflows such as YouTube analytics inspection operate without network connectivity.
