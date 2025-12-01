#!/usr/bin/env ts-node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { runParallelAgentTask } from '../src/server/agent/parallelAgentService';

const API_URL = 'http://localhost:3000/api/dev/agent/parallel';

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
  const task = process.argv.slice(2).join(' ').trim();
  if (!task) {
    console.error('Usage: pnpm agent:parallel "<task description>"');
    process.exit(1);
  }

  const repoPath = process.cwd();
  console.log(`Running parallel agent for task: ${task}`);

  try {
    const result = await callApi(task, repoPath);
    console.log('=== Parallel Agent Summary ===');
    console.log(result.summary);

    console.log('=== Subtasks ===');
    result.subtasks?.forEach((subtask: any) => {
      console.log(`- ${subtask.name}: ${subtask.summary}`);
    });

    console.log('=== Generated Artifacts ===');
    await writeArtifacts(repoPath, result.artifacts);

    if (result.logs?.length) {
      console.log('=== Logs ===');
      result.logs.forEach((log: string) => console.log(log));
    }
  } catch (error) {
    console.warn('Parallel API unavailable, running locally.', error);
    const fallback = await runParallelAgentTask({ task, repoPath });
    console.log('=== Parallel Agent Summary ===');
    console.log(fallback.summary);

    console.log('=== Subtasks ===');
    fallback.subtasks.forEach((subtask) => {
      console.log(`- ${subtask.name}: ${subtask.summary}`);
    });

    console.log('=== Generated Artifacts ===');
    await writeArtifacts(repoPath, fallback.artifacts);

    if (fallback.logs?.length) {
      console.log('=== Logs ===');
      fallback.logs.forEach((log) => console.log(log));
    }
  }
}

main().catch((error) => {
  console.error('Parallel agent CLI failed', error);
  process.exit(1);
});
