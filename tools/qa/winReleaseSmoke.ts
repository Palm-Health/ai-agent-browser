import { spawn } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const DIST_DIR = path.resolve(process.cwd(), 'dist');

function assertDistExists(distDir: string): void {
  if (!existsSync(distDir)) {
    throw new Error(`Expected dist directory at ${distDir}, but it was not found.`);
  }
}

export function findLatestInstaller(distDir: string): string {
  const entries = readdirSync(distDir)
    .filter((file) => file.toLowerCase().endsWith('.exe'))
    .map((file) => ({
      file,
      stats: statSync(path.join(distDir, file)),
    }))
    .sort((a, b) => b.stats.mtimeMs - a.stats.mtimeMs);

  if (entries.length === 0) {
    throw new Error(`No Windows installer (.exe) found inside ${distDir}.`);
  }

  return path.join(distDir, entries[0].file);
}

async function runInstaller(executablePath: string): Promise<void> {
  const child = spawn(executablePath, ['--smoke-test'], {
    stdio: 'inherit',
  });

  const timeoutMs = 30000;

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`Smoke test timed out after ${timeoutMs / 1000} seconds.`));
    }, timeoutMs);

    child.once('exit', (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Smoke test failed with exit code ${code ?? 'unknown'}.`));
      }
    });

    child.once('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

export async function runWinReleaseSmokeTest(distDir = DIST_DIR, providedPath?: string): Promise<string> {
  assertDistExists(distDir);
  const installerPath = providedPath ?? findLatestInstaller(distDir);
  console.log(`\n🚬 Running smoke test with installer at: ${installerPath}`);
  await runInstaller(installerPath);
  console.log('✅ Windows installer smoke test passed.');
  return installerPath;
}

if (require.main === module) {
  runWinReleaseSmokeTest().catch((error) => {
    console.error('❌ Windows release smoke test failed:', error);
    process.exit(1);
  });
}
