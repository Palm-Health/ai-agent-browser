import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

export const MEDIA_ROOT_PATH = process.env.MEDIA_ROOT_PATH || path.join(process.cwd(), 'media');

async function ensureMediaRoot(): Promise<string> {
  const normalized = path.resolve(MEDIA_ROOT_PATH);
  await fs.mkdir(normalized, { recursive: true });
  return normalized;
}

function assertWithinRoot(resolvedPath: string) {
  const normalizedRoot = path.resolve(MEDIA_ROOT_PATH) + path.sep;
  const normalizedPath = path.resolve(resolvedPath);
  if (!normalizedPath.startsWith(normalizedRoot)) {
    throw new Error(`Path ${normalizedPath} escapes media root ${normalizedRoot}`);
  }
}

export async function resolveMediaPath(relativePath: string): Promise<string> {
  const base = await ensureMediaRoot();
  const resolved = path.isAbsolute(relativePath)
    ? relativePath
    : path.join(base, relativePath);
  const normalized = path.normalize(resolved);
  assertWithinRoot(normalized);
  return normalized;
}

export async function listMediaFiles(dir: string, extensions: string[] = []): Promise<string[]> {
  const targetDir = await resolveMediaPath(dir);
  const entries = await fs.readdir(targetDir, { withFileTypes: true });
  const exts = extensions.map(ext => ext.toLowerCase());

  return entries
    .filter(entry => entry.isFile())
    .filter(entry =>
      exts.length === 0 || exts.some(ext => entry.name.toLowerCase().endsWith(ext)),
    )
    .map(entry => path.join(targetDir, entry.name));
}

export async function readFileBuffer(filePath: string): Promise<Buffer> {
  const resolved = await resolveMediaPath(filePath);
  return fs.readFile(resolved);
}

export type VideoMetadata = {
  path: string;
  durationSeconds?: number;
  width?: number;
  height?: number;
  orientation?: '9:16' | '16:9' | '1:1' | 'other';
  codec?: string;
};

function deriveOrientation(width?: number, height?: number): VideoMetadata['orientation'] {
  if (!width || !height) return 'other';
  const ratio = width / height;
  if (Math.abs(ratio - 9 / 16) < 0.05) return '9:16';
  if (Math.abs(ratio - 16 / 9) < 0.05) return '16:9';
  if (Math.abs(ratio - 1) < 0.05) return '1:1';
  return ratio > 1 ? '16:9' : '9:16';
}

export async function getVideoMetadata(filePath: string): Promise<VideoMetadata> {
  const target = await resolveMediaPath(filePath);
  const args = [
    '-v',
    'error',
    '-select_streams',
    'v:0',
    '-show_entries',
    'stream=width,height,duration,codec_name',
    '-of',
    'json',
    target,
  ];

  return new Promise<VideoMetadata>((resolve) => {
    try {
      const proc = spawn('ffprobe', args);
      let output = '';
      proc.stdout.on('data', chunk => (output += chunk.toString()));
      proc.on('close', () => {
        try {
          const parsed = JSON.parse(output || '{}');
          const stream = parsed.streams?.[0] || {};
          const width = stream.width ? Number(stream.width) : undefined;
          const height = stream.height ? Number(stream.height) : undefined;
          const duration = stream.duration ? Number(stream.duration) : undefined;
          const codec = stream.codec_name as string | undefined;

          resolve({
            path: target,
            width,
            height,
            durationSeconds: duration,
            orientation: deriveOrientation(width, height),
            codec,
          });
        } catch (error) {
          console.warn('Failed to parse ffprobe output', error);
          resolve({ path: target });
        }
      });
      proc.on('error', () => {
        resolve({ path: target });
      });
    } catch (error) {
      console.warn('ffprobe not available or failed', error);
      resolve({ path: target });
    }
  });
}
