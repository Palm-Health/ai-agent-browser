import { promises as fs } from 'node:fs';
import path from 'node:path';

export type RepoFile = {
  path: string;
  content: string;
};

const DEFAULT_IGNORES = new Set([
  'node_modules',
  '.git',
  '.next',
  'dist',
  'dist-electron',
  'electron-dist',
  '.turbo',
  '.cache',
]);

const DEFAULT_PATTERNS = [
  'dashboard/app/api/**/*.ts',
  'src/server/**/*.ts',
  'services/**/*.ts',
  'supabase/migrations/**/*.sql',
  'components/**/*.tsx',
  'components/**/*.ts',
];

function globToRegex(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  const withWildcards = escaped
    .replace(/\\\*\\\*/g, '.*')
    .replace(/\\\*/g, '[^/]*');
  return new RegExp(`^${withWildcards}$`);
}

async function walkDir(baseDir: string, dir: string, files: string[]): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (DEFAULT_IGNORES.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
    if (entry.isDirectory()) {
      await walkDir(baseDir, fullPath, files);
    } else {
      files.push(relPath);
    }
  }
}

export async function listRelevantFiles(repoPath: string, pattern?: string | string[]): Promise<string[]> {
  const patterns = Array.isArray(pattern) ? pattern : pattern ? [pattern] : DEFAULT_PATTERNS;
  const regexes = patterns.map(globToRegex);
  const files: string[] = [];
  await walkDir(repoPath, repoPath, files);
  return files.filter((file) => regexes.some((regex) => regex.test(file)));
}

export async function readFilesForContext(repoPath: string, paths: string[], maxBytes = 20_000): Promise<RepoFile[]> {
  const results: RepoFile[] = [];
  for (const relPath of paths) {
    try {
      const absolute = path.isAbsolute(relPath) ? relPath : path.join(repoPath, relPath);
      const stat = await fs.stat(absolute);
      if (stat.size > maxBytes) continue;
      const content = await fs.readFile(absolute, 'utf8');
      results.push({ path: relPath, content });
    } catch (error) {
      // Skip unreadable files
      continue; // eslint-disable-line no-continue
    }
  }
  return results;
}

export function buildRepoContextSnippet(files: RepoFile[], maxPerFile = 800): string {
  if (!files.length) return '';
  const parts = files.map((file) => {
    const excerpt = file.content.length > maxPerFile ? `${file.content.slice(0, maxPerFile)}...` : file.content;
    return `File: ${file.path}\n${excerpt}`;
  });
  return `Repository context (partial):\n${parts.join('\n\n')}`;
}
