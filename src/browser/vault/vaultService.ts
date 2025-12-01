
export interface SnapshotMeta {
  id: string;
  url: string;
  title: string;
  domain: string;
  tags: string[];
  timestamp: string;
  missionId?: string;
  description?: string;
}

export interface SnapshotRecord extends SnapshotMeta {
  htmlPath: string;
  markdownPath: string;
  metaPath: string;
}

export interface SaveSnapshotInput {
  url: string;
  html: string;
  markdown?: string;
  meta?: Partial<Omit<SnapshotMeta, 'id' | 'url' | 'domain' | 'timestamp'>>;
}

const DEFAULT_VAULT_FOLDER = 'PalmVault';
const INDEX_FILE = 'index.json';

let baseVaultPath = DEFAULT_VAULT_FOLDER;
let fsReady: Promise<typeof import('fs/promises') | null> | null = null;
let pathReady: Promise<typeof import('path')> | null = null;

const memoryStore: {
  index: SnapshotMeta[];
  html: Record<string, string>;
  markdown: Record<string, string>;
  meta: Record<string, SnapshotMeta>;
} = {
  index: [],
  html: {},
  markdown: {},
  meta: {},
};

function supportsFs(): boolean {
  return typeof process !== 'undefined' && !!process.versions?.node;
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && (crypto as any).randomUUID) {
    return (crypto as any).randomUUID();
  }

  return `vault-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function getFs(): Promise<typeof import('fs/promises') | null> {
  if (!supportsFs()) return null;
  if (!fsReady) {
    fsReady = import('fs/promises').catch(() => null);
  }
  return fsReady;
}

async function getPathModule(): Promise<typeof import('path') | null> {
  if (!supportsFs()) return null;
  if (!pathReady) {
    pathReady = import('path');
  }
  return pathReady;
}

async function ensureDir(fs: typeof import('fs/promises'), dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function initVault(basePath?: string): Promise<string> {
  if (basePath) {
    const path = await getPathModule();
    baseVaultPath = path ? path.resolve(basePath) : basePath;
  }

  const fs = await getFs();
  const path = await getPathModule();
  if (fs && path) {
    if (baseVaultPath === DEFAULT_VAULT_FOLDER) {
      baseVaultPath = path.resolve(process.cwd(), DEFAULT_VAULT_FOLDER);
    }

    await ensureDir(fs, baseVaultPath);
    await ensureDir(fs, path.join(baseVaultPath, 'pages'));
    await ensureDir(fs, path.join(baseVaultPath, 'markdown'));
    await ensureDir(fs, path.join(baseVaultPath, 'meta'));

    const indexPath = path.join(baseVaultPath, INDEX_FILE);
    try {
      await fs.access(indexPath);
    } catch {
      await fs.writeFile(indexPath, '[]', 'utf-8');
    }
  }

  return baseVaultPath;
}

function simpleMarkdownFromHtml(html: string): string {
  try {
    if (typeof window !== 'undefined' && window.document) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      return doc.body.innerText || '';
    }
  } catch {
    // ignore
  }
  return html.replace(/\s+/g, ' ').replace(/<[^>]+>/g, '').trim();
}

async function readIndex(fs: typeof import('fs/promises') | null): Promise<SnapshotMeta[]> {
  const path = await getPathModule();
  if (fs && path) {
    const indexPath = path.join(baseVaultPath, INDEX_FILE);
    const raw = await fs.readFile(indexPath, 'utf-8');
    return JSON.parse(raw || '[]');
  }
  return memoryStore.index;
}

async function writeIndex(fs: typeof import('fs/promises') | null, entries: SnapshotMeta[]): Promise<void> {
  const path = await getPathModule();
  if (fs && path) {
    const indexPath = path.join(baseVaultPath, INDEX_FILE);
    await fs.writeFile(indexPath, JSON.stringify(entries, null, 2), 'utf-8');
    return;
  }
  memoryStore.index = entries;
}

export async function saveSnapshot({ url, html, markdown, meta = {} }: SaveSnapshotInput): Promise<SnapshotRecord> {
  const fs = await getFs();
  const id = generateId();
  const computedMarkdown = markdown ?? simpleMarkdownFromHtml(html);
  const urlObj = new URL(url);
  const timestamp = new Date().toISOString();

  const snapshotMeta: SnapshotMeta = {
    id,
    url,
    title: meta.title || urlObj.hostname,
    domain: urlObj.hostname,
    tags: meta.tags || [],
    timestamp,
    missionId: meta.missionId,
    description: meta.description,
  };

  const paths = {
    htmlPath: supportsFs() ? `pages/${id}.html` : `${id}.html`,
    markdownPath: supportsFs() ? `markdown/${id}.md` : `${id}.md`,
    metaPath: supportsFs() ? `meta/${id}.json` : `${id}.json`,
  };

  const path = await getPathModule();
  if (fs && path) {
    await initVault();
    await fs.writeFile(path.join(baseVaultPath, paths.htmlPath), html, 'utf-8');
    await fs.writeFile(path.join(baseVaultPath, paths.markdownPath), computedMarkdown, 'utf-8');
    await fs.writeFile(path.join(baseVaultPath, paths.metaPath), JSON.stringify(snapshotMeta, null, 2), 'utf-8');
  } else {
    memoryStore.html[id] = html;
    memoryStore.markdown[id] = computedMarkdown;
    memoryStore.meta[id] = snapshotMeta;
  }

  const index = await readIndex(fs);
  index.unshift(snapshotMeta);
  await writeIndex(fs, index);

  return {
    ...snapshotMeta,
    ...paths,
  };
}

export async function listSnapshots(filters?: { tag?: string; missionId?: string }): Promise<SnapshotMeta[]> {
  const fs = await getFs();
  let entries = await readIndex(fs);

  if (filters?.tag) {
    entries = entries.filter((entry) => entry.tags.includes(filters.tag!));
  }
  if (filters?.missionId) {
    entries = entries.filter((entry) => entry.missionId === filters.missionId);
  }

  return entries;
}

export async function getSnapshotById(id: string): Promise<SnapshotMeta | null> {
  const fs = await getFs();
  const path = await getPathModule();
  if (fs && path) {
    const metaPath = path.join(baseVaultPath, 'meta', `${id}.json`);
    try {
      const raw = await fs.readFile(metaPath, 'utf-8');
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return memoryStore.meta[id] || null;
}

export async function getSnapshotHTML(id: string): Promise<string | null> {
  const fs = await getFs();
  const path = await getPathModule();
  if (fs && path) {
    const htmlPath = path.join(baseVaultPath, 'pages', `${id}.html`);
    try {
      return await fs.readFile(htmlPath, 'utf-8');
    } catch {
      return null;
    }
  }
  return memoryStore.html[id] || null;
}

export async function getSnapshotMarkdown(id: string): Promise<string | null> {
  const fs = await getFs();
  const path = await getPathModule();
  if (fs && path) {
    const markdownPath = path.join(baseVaultPath, 'markdown', `${id}.md`);
    try {
      return await fs.readFile(markdownPath, 'utf-8');
    } catch {
      return null;
    }
  }
  return memoryStore.markdown[id] || null;
}
