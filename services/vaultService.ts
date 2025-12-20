import * as path from 'path';
import * as os from 'os';
import { promises as fs } from 'fs';
import { VaultSnapshot, VaultSnapshotIndexEntry, VaultSnapshotMetadata, VaultSnapshotFilters } from '../types';

interface BrowserSnapshotStore {
  index: VaultSnapshotIndexEntry[];
  html: Record<string, string>;
  markdown: Record<string, string>;
}

export class VaultService {
  private basePath: string;
  private browserStoreKey = 'vault-browser-store';
  private isRendererElectron: boolean;
  private isNodeEnvironment: boolean;

  constructor(basePath?: string) {
    this.isRendererElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;
    this.isNodeEnvironment = typeof process !== 'undefined' && !!(process as any).versions?.node;
    this.basePath = basePath || this.getDefaultBasePath();
  }

  private getDefaultBasePath(): string {
    if (this.isNodeEnvironment) {
      return path.join(os.homedir(), 'PalmVault');
    }
    return 'PalmVault';
  }

  private async ensureStructure(): Promise<void> {
    await fs.mkdir(path.join(this.basePath, 'pages'), { recursive: true });
    await fs.mkdir(path.join(this.basePath, 'markdown'), { recursive: true });
    await fs.mkdir(path.join(this.basePath, 'assets'), { recursive: true });
    const indexPath = path.join(this.basePath, 'index.json');
    try {
      await fs.access(indexPath);
    } catch {
      await fs.writeFile(indexPath, JSON.stringify([], null, 2), 'utf-8');
    }
  }

  private async loadIndex(): Promise<VaultSnapshotIndexEntry[]> {
    if (this.isRendererElectron && (window as any).electronAPI?.vaultListPages) {
      return (await (window as any).electronAPI.vaultListPages({})) as VaultSnapshotIndexEntry[];
    }

    if (typeof window !== 'undefined' && !this.isNodeEnvironment) {
      const store = this.readBrowserStore();
      return store.index;
    }

    await this.ensureStructure();
    const indexPath = path.join(this.basePath, 'index.json');
    try {
      const content = await fs.readFile(indexPath, 'utf-8');
      return JSON.parse(content) as VaultSnapshotIndexEntry[];
    } catch (error) {
      console.error('Failed to load vault index:', error);
      return [];
    }
  }

  private async saveIndex(entries: VaultSnapshotIndexEntry[]): Promise<void> {
    if (this.isRendererElectron && (window as any).electronAPI?.vaultWriteIndex) {
      await (window as any).electronAPI.vaultWriteIndex(entries);
      return;
    }

    if (typeof window !== 'undefined' && !this.isNodeEnvironment) {
      const store = this.readBrowserStore();
      store.index = entries;
      this.writeBrowserStore(store);
      return;
    }

    await this.ensureStructure();
    const indexPath = path.join(this.basePath, 'index.json');
    await fs.writeFile(indexPath, JSON.stringify(entries, null, 2), 'utf-8');
  }

  private readBrowserStore(): BrowserSnapshotStore {
    if (typeof window === 'undefined') {
      return { index: [], html: {}, markdown: {} };
    }
    try {
      const raw = window.localStorage.getItem(this.browserStoreKey);
      if (!raw) return { index: [], html: {}, markdown: {} };
      return JSON.parse(raw) as BrowserSnapshotStore;
    } catch (error) {
      console.warn('Failed to read browser vault store:', error);
      return { index: [], html: {}, markdown: {} };
    }
  }

  private writeBrowserStore(store: BrowserSnapshotStore): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(this.browserStoreKey, JSON.stringify(store));
  }

  private sanitizeTitle(title?: string): string {
    if (title?.trim()) return title.trim();
    return 'Untitled Page';
  }

  private generateId(): string {
    if (typeof crypto !== 'undefined' && (crypto as any).randomUUID) {
      return (crypto as any).randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  private async createMarkdown(html: string, url: string, title: string): Promise<string> {
    const lines: string[] = [`# ${title}`, '', `Source: ${url}`, '' ];
    const text = html
      .replace(/\s+/g, ' ')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, '\n')
      .split('\n')
      .map(part => part.trim())
      .filter(Boolean);
    lines.push(...text);
    return lines.join('\n');
  }

  private async saveToFileSystem(url: string, html: string, metadata: VaultSnapshotMetadata): Promise<VaultSnapshot> {
    await this.ensureStructure();
    const id = metadata.id || this.generateId();
    const title = this.sanitizeTitle(metadata.title);
    const htmlPath = path.join('pages', `${id}.html`);
    const markdownPath = path.join('markdown', `${id}.md`);

    const markdown = await this.createMarkdown(html, url, title);
    await fs.writeFile(path.join(this.basePath, htmlPath), html, 'utf-8');
    await fs.writeFile(path.join(this.basePath, markdownPath), markdown, 'utf-8');

    const entry: VaultSnapshotIndexEntry = {
      id,
      url,
      title,
      createdAt: new Date().toISOString(),
      htmlPath,
      markdownPath,
      metadata,
    };

    const entries = await this.loadIndex();
    const filtered = entries.filter(item => item.id !== id);
    filtered.push(entry);
    await this.saveIndex(filtered);

    return {
      ...entry,
      html,
      markdown,
    };
  }

  private async saveViaElectron(url: string, html: string, metadata: VaultSnapshotMetadata): Promise<VaultSnapshot> {
    const result = await (window as any).electronAPI.vaultSaveSnapshot({ url, html, metadata });
    return result as VaultSnapshot;
  }

  private async saveInBrowser(url: string, html: string, metadata: VaultSnapshotMetadata): Promise<VaultSnapshot> {
    const store = this.readBrowserStore();
    const id = metadata.id || this.generateId();
    const title = this.sanitizeTitle(metadata.title);
    const markdown = await this.createMarkdown(html, url, title);

    const entry: VaultSnapshotIndexEntry = {
      id,
      url,
      title,
      createdAt: new Date().toISOString(),
      htmlPath: `pages/${id}.html`,
      markdownPath: `markdown/${id}.md`,
      metadata,
    };

    const without = store.index.filter(item => item.id !== id);
    store.index = [...without, entry];
    store.html[id] = html;
    store.markdown[id] = markdown;
    this.writeBrowserStore(store);

    return { ...entry, html, markdown };
  }

  async savePageSnapshot(url: string, html: string, metadata: VaultSnapshotMetadata = {}): Promise<VaultSnapshot> {
    if (!url) {
      throw new Error('URL is required to save a snapshot');
    }

    if (this.isRendererElectron && (window as any).electronAPI?.vaultSaveSnapshot) {
      return this.saveViaElectron(url, html, metadata);
    }

    if (typeof window === 'undefined') {
      return this.saveToFileSystem(url, html, metadata);
    }

    return this.saveInBrowser(url, html, metadata);
  }

  async listSnapshots(filters: VaultSnapshotFilters = {}): Promise<VaultSnapshotIndexEntry[]> {
    if (this.isRendererElectron && (window as any).electronAPI?.vaultListPages) {
      return (await (window as any).electronAPI.vaultListPages(filters)) as VaultSnapshotIndexEntry[];
    }

    const entries = await this.loadIndex();
    if (!filters.query) return entries;
    const query = filters.query.toLowerCase();
    return entries.filter(entry =>
      entry.title.toLowerCase().includes(query) ||
      entry.url.toLowerCase().includes(query)
    );
  }

  async getSnapshotById(id: string): Promise<VaultSnapshot | null> {
    if (this.isRendererElectron && (window as any).electronAPI?.vaultGetPage) {
      return (await (window as any).electronAPI.vaultGetPage(id)) as VaultSnapshot;
    }

    const entries = await this.loadIndex();
    const entry = entries.find(item => item.id === id);
    if (!entry) return null;

    if (typeof window === 'undefined') {
      const html = await fs.readFile(path.join(this.basePath, entry.htmlPath), 'utf-8');
      const markdown = await fs.readFile(path.join(this.basePath, entry.markdownPath), 'utf-8');
      return { ...entry, html, markdown };
    }

    const store = this.readBrowserStore();
    const html = store.html[id];
    const markdown = store.markdown[id];
    if (!html || !markdown) return null;
    return { ...entry, html, markdown };
  }

  async renderVaultUrl(url: string): Promise<{ html: string; title: string }> {
    const parsed = new URL(url);
    const route = parsed.hostname || parsed.pathname.replace(/^\//, '');
    const pathSegments = parsed.pathname.split('/').filter(Boolean);

    if (route === 'list' || route === '') {
      const snapshots = await this.listSnapshots();
      const listHtml = `<!DOCTYPE html>
      <html><head><title>Vault</title>
      <style>
        body { font-family: Arial, sans-serif; background: #0b1220; color: #e5e7eb; padding: 24px; }
        h1 { color: #22d3ee; }
        .card { background: #111827; border: 1px solid #1f2937; border-radius: 8px; padding: 12px 16px; margin-bottom: 12px; }
        a { color: #38bdf8; text-decoration: none; }
        a:hover { text-decoration: underline; }
        .meta { color: #9ca3af; font-size: 12px; }
      </style></head><body>
      <h1>Saved Vault Pages</h1>
      ${snapshots.map(s => `<div class="card"><a href="vault://page/${s.id}"><strong>${s.title}</strong></a><div class="meta">${s.url} · ${new Date(s.createdAt).toLocaleString()}</div></div>`).join('')}
      </body></html>`;
      return { html: listHtml, title: 'Vault' };
    }

    if (route.startsWith('page')) {
      const id = route === 'page' ? pathSegments[0] : route.split('/')[1] || pathSegments[0];
      const snapshot = id ? await this.getSnapshotById(id) : null;
      if (!snapshot) {
        return { html: `<html><body><h2>Snapshot not found</h2><p>Could not find vault page for id ${id}</p></body></html>`, title: 'Not found' };
      }
      const html = `<!DOCTYPE html><html><head><base href="${snapshot.url}" /><title>${snapshot.title}</title></head><body>
      <div style="padding:12px;background:#0f172a;color:#e5e7eb;font-family:Arial,sans-serif;">
        <div style="margin-bottom:12px;">
          <div style="color:#22d3ee;font-weight:bold;">${snapshot.title}</div>
          <div style="color:#94a3b8;font-size:12px;">${snapshot.url}</div>
        </div>
      </div>
      ${snapshot.html}
      </body></html>`;
      return { html, title: snapshot.title };
    }

    return { html: '<html><body><h2>Unsupported vault route</h2></body></html>', title: 'Vault' };
  }
}

export const vaultService = new VaultService();
export type { VaultSnapshot };
