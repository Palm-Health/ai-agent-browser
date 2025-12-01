import { getSnapshotHTML, getSnapshotMarkdown, listSnapshots, SnapshotMeta } from '../vault/vaultService';

export interface VaultResponse {
  content: string;
  contentType: 'text/html' | 'text/markdown' | 'application/json';
}

function renderListPage(entries: SnapshotMeta[]): string {
  const listItems = entries
    .map(
      (entry) => `
      <li style="margin-bottom:8px;">
        <a href="vault://page/${entry.id}" style="font-weight:bold;">${entry.title || entry.url}</a>
        <div style="font-size:12px;color:#666;">${new Date(entry.timestamp).toLocaleString()} — ${entry.domain}</div>
        ${entry.tags?.length ? `<div style="font-size:12px;color:#0ea5e9;">${entry.tags.join(', ')}</div>` : ''}
      </li>`
    )
    .join('\n');

  return `<!doctype html><html><head><title>Vault List</title></head><body><h1>Saved Snapshots</h1><ul>${listItems}</ul></body></html>`;
}

function renderOfflineHome(entries: SnapshotMeta[]): string {
  const listItems = entries
    .slice(0, 10)
    .map((entry) => `<li><a href="vault://page/${entry.id}">${entry.title || entry.url}</a></li>`)
    .join('');

  return `<!doctype html><html><head><title>Offline Vault</title></head><body><h1>You are offline</h1><p>Recent snapshots:</p><ul>${listItems}</ul><p><a href="vault://list">See all</a></p></body></html>`;
}

export async function resolveVaultUrl(url: string): Promise<VaultResponse | null> {
  if (!url.startsWith('vault://')) return null;
  const [, pathSegment] = url.split('vault://');

  if (pathSegment.startsWith('page/')) {
    const id = pathSegment.replace('page/', '');
    const html = await getSnapshotHTML(id);
    if (!html) return null;
    return { content: html, contentType: 'text/html' };
  }

  if (pathSegment.startsWith('markdown/')) {
    const id = pathSegment.replace('markdown/', '');
    const md = await getSnapshotMarkdown(id);
    if (!md) return null;
    return { content: md, contentType: 'text/markdown' };
  }

  if (pathSegment.startsWith('tag/')) {
    const tag = decodeURIComponent(pathSegment.replace('tag/', ''));
    const entries = await listSnapshots({ tag });
    return { content: renderListPage(entries), contentType: 'text/html' };
  }

  if (pathSegment === 'offline-home') {
    const entries = await listSnapshots();
    return { content: renderOfflineHome(entries), contentType: 'text/html' };
  }

  if (pathSegment === 'list' || pathSegment === '') {
    const entries = await listSnapshots();
    return { content: renderListPage(entries), contentType: 'text/html' };
  }

  return null;
}
