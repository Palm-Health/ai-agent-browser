# Offline Vault Mode

Offline Vault Mode allows the browser to capture webpages as offline snapshots and revisit them later through a dedicated `vault://` protocol. Saved pages are stored locally with their HTML, a markdown copy, and metadata so the agent can keep working even without network access.

## Saving pages
- Click **Save to Vault** in the browser toolbar to capture the current tab.
- The browser will read the iframe content, record the full HTML, and generate markdown automatically.
- Metadata such as title, domain, tags, timestamp, and optional mission identifiers are stored alongside the content.

## Vault storage layout
Snapshots are stored under `PalmVault/` (or a custom base path passed to `initVault`) with the following structure:
```
PalmVault/
  pages/{id}.html
  markdown/{id}.md
  meta/{id}.json
  index.json
```

## vault:// URLs
You can browse saved content through the following URLs:
- `vault://list` – list all snapshots
- `vault://page/{id}` – render the saved HTML for a snapshot
- `vault://markdown/{id}` – fetch the markdown version
- `vault://tag/{tagName}` – list snapshots filtered by tag
- `vault://offline-home` – minimal offline landing page with recent entries

These URLs resolve locally without network access and can be opened like any other navigation target.

## Agent tools
Native tools are available to let the agent read from the vault:
- `vault.list_pages` – list snapshots with optional tag/mission filters
- `vault.get_page` – return HTML for a snapshot
- `vault.get_markdown` – return the markdown copy
- `vault.search` – keyword search across titles, URLs, and tags

## Offline behavior
The protocol handler exposes an `offline-home` view to use when the network is down. You can point the browser to `vault://offline-home` to surface recent saves, tags, and quick navigation links without needing external connectivity.
