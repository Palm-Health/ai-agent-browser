#!/usr/bin/env ts-node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { runBrowserAgentTask } from '../src/server/agent/browserAgentService';

const API_URL = 'http://localhost:3000/api/dev/agent/browser';

async function writeArtifacts(repoPath: string, artifacts?: { path: string; content: string }[]) {
  if (!artifacts?.length) return;
  for (const artifact of artifacts) {
    const targetPath = path.isAbsolute(artifact.path)
      ? artifact.path
      : path.join(repoPath, artifact.path);
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, artifact.content, 'utf8');
    console.log(`🔧 wrote ${targetPath}`);
  }
}

async function callApi(task: string, repoPath: string) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task, repoPath }),
  });
  if (!response.ok) {
    throw new Error(`API error ${response.status}`);
  }
  return (await response.json()) as any;
}

async function main() {
  const args = process.argv.slice(2);
  const subcommand = args.shift();
  const task = args.join(' ').trim();

  if (!task) {
    console.error('Usage: pnpm agent <subcommand?> "task description"');
    process.exit(1);
  }

  const repoPath = process.cwd();
  console.log(`Running agent${subcommand ? ` (${subcommand})` : ''} for task: ${task}`);

  try {
    const result = await callApi(task, repoPath);
    console.log('=== Agent Summary ===');
    console.log(result.summary);
    console.log('=== Generated Artifacts ===');
    await writeArtifacts(repoPath, result.artifacts);
    if (result.logs?.length) {
      console.log('=== Logs ===');
      result.logs.forEach((log: string) => console.log(log));
    }
  } catch (error) {
    console.warn('API unavailable, running locally.', error);
    const fallback = await runBrowserAgentTask({ task, repoPath });
    console.log('=== Agent Summary ===');
    console.log(fallback.summary);
    console.log('=== Generated Artifacts ===');
    await writeArtifacts(repoPath, fallback.artifacts);
    if (fallback.logs?.length) {
      console.log('=== Logs ===');
      fallback.logs.forEach((log) => console.log(log));
    }
  }
}

main().catch((error) => {
  console.error('Agent CLI failed', error);
  process.exit(1);
});
