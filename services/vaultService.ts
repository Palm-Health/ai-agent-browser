import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

export interface VaultSnapshotMeta {
  id: string;
  url: string;
  domain: string;
  title?: string;
  tags?: string[];
  createdAt: string;
  missionId?: string;
  skillHint?: string;
}

export interface VaultIndexEntry {
  id: string;
  title?: string;
  domain: string;
  tags?: string[];
  createdAt: string;
  skillHint?: string;
}

export interface SaveSnapshotPayload {
  url: string;
  html: string;
  markdown?: string;
  title?: string;
  tags?: string[];
  missionId?: string;
  skillHint?: string;
}

export class VaultService {
  private vaultRoot: string;
  private pagesDir: string;
  private markdownDir: string;
  private metaDir: string;
  private indexPath: string;

  constructor(rootDir: string = path.join(process.cwd(), 'PalmVault')) {
    this.vaultRoot = rootDir;
    this.pagesDir = path.join(this.vaultRoot, 'pages');
    this.markdownDir = path.join(this.vaultRoot, 'markdown');
    this.metaDir = path.join(this.vaultRoot, 'meta');
    this.indexPath = path.join(this.vaultRoot, 'index.json');
  }

  async saveSnapshot(payload: SaveSnapshotPayload): Promise<VaultSnapshotMeta> {
    await this.ensureStructure();

    const id = randomUUID();
    const domain = this.extractDomain(payload.url);
    const skillHint = payload.skillHint ?? this.deriveSkillHint(domain);
    const createdAt = new Date().toISOString();
    const baseTags = payload.tags ?? [];
    const tags = this.enrichTags(baseTags, domain, skillHint);

    const meta: VaultSnapshotMeta = {
      id,
      url: payload.url,
      domain,
      title: payload.title,
      tags,
      createdAt,
      missionId: payload.missionId,
      skillHint,
    };

    await fs.writeFile(path.join(this.pagesDir, `${id}.html`), payload.html, 'utf8');
    if (payload.markdown) {
      await fs.writeFile(path.join(this.markdownDir, `${id}.md`), payload.markdown, 'utf8');
    }
    await fs.writeFile(path.join(this.metaDir, `${id}.json`), JSON.stringify(meta, null, 2), 'utf8');
    await this.updateIndex(meta);

    return meta;
  }

  async getSnapshotMeta(id: string): Promise<VaultSnapshotMeta | null> {
    try {
      const raw = await fs.readFile(path.join(this.metaDir, `${id}.json`), 'utf8');
      return JSON.parse(raw) as VaultSnapshotMeta;
    } catch {
      return null;
    }
  }

  async getSnapshotById(id: string): Promise<{ html?: string; markdown?: string; meta?: VaultSnapshotMeta } | null> {
    const meta = await this.getSnapshotMeta(id);
    if (!meta) return null;

    const [html, markdown] = await Promise.all([
      this.readOptional(path.join(this.pagesDir, `${id}.html`)),
      this.readOptional(path.join(this.markdownDir, `${id}.md`)),
    ]);

    return { html: html ?? undefined, markdown: markdown ?? undefined, meta };
  }

  async listSnapshots(): Promise<VaultIndexEntry[]> {
    const exists = await this.exists(this.indexPath);
    if (!exists) return [];

    const raw = await fs.readFile(this.indexPath, 'utf8');
    return JSON.parse(raw) as VaultIndexEntry[];
  }

  openSnapshot(id: string): string {
    return `vault://page/${id}`;
  }

  private async ensureStructure(): Promise<void> {
    await fs.mkdir(this.vaultRoot, { recursive: true });
    await Promise.all([
      fs.mkdir(this.pagesDir, { recursive: true }),
      fs.mkdir(this.markdownDir, { recursive: true }),
      fs.mkdir(this.metaDir, { recursive: true }),
    ]);

    const exists = await this.exists(this.indexPath);
    if (!exists) {
      await fs.writeFile(this.indexPath, '[]', 'utf8');
    }
  }

  private extractDomain(url: string): string {
    try {
      const parsed = new URL(url);
      return parsed.host;
    } catch {
      return url;
    }
  }

  private deriveSkillHint(domain: string): string | undefined {
    const normalized = domain.toLowerCase();
    if (normalized.includes('youtube.com')) return 'youtube';
    if (normalized.includes('tiktok.com')) return 'tiktok';
    if (normalized.includes('supabase.io')) return 'supabase';
    return undefined;
  }

  private async updateIndex(meta: VaultSnapshotMeta): Promise<void> {
    const index = await this.listSnapshots();
    const entry: VaultIndexEntry = {
      id: meta.id,
      title: meta.title ?? meta.url,
      domain: meta.domain,
      tags: meta.tags,
      createdAt: meta.createdAt,
      skillHint: meta.skillHint,
    };

    const filtered = index.filter(item => item.id !== meta.id);
    filtered.push(entry);
    await fs.writeFile(this.indexPath, JSON.stringify(filtered, null, 2), 'utf8');
  }

  private enrichTags(tags: string[], domain: string, skillHint?: string): string[] {
    const set = new Set(tags);
    set.add(`source:${domain}`);
    if (skillHint) {
      set.add(`skill:${skillHint}`);
    }
    return Array.from(set);
  }

  private async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private async readOptional(filePath: string): Promise<string | null> {
    try {
      return await fs.readFile(filePath, 'utf8');
    } catch {
      return null;
    }
  }
}

export const vaultService = new VaultService();
