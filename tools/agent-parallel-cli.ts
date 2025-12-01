#!/usr/bin/env ts-node

import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';

const [,, ...args] = process.argv;
const task = args.join(' ').trim();

if (!task) {
  console.error('Usage: agent:parallel "<task description>"');
  process.exit(1);
}

const repoPath = process.cwd();
const endpoint = 'http://localhost:3000/api/dev/agent/parallel';

async function main() {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task, repoPath })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Request failed with status ${response.status}: ${errorText}`);
    }

    const result = await response.json();

    console.log('=== Parallel Agent Summary ===');
    console.log(result.summary);
    console.log('\n=== Subtasks ===');
    for (const subtask of result.subtasks || []) {
      console.log(`- ${subtask.name}: ${subtask.summary}`);
    }

    console.log('\n=== Generated Artifacts ===');
    for (const artifact of result.artifacts || []) {
      const filePath = path.join(repoPath, artifact.path);
      const dirPath = path.dirname(filePath);
      mkdirSync(dirPath, { recursive: true });
      writeFileSync(filePath, artifact.content, 'utf-8');
      console.log(`Wrote ${filePath}`);
    }

    if (result.logs && result.logs.length > 0) {
      console.log('\n=== Logs ===');
      for (const log of result.logs) {
        console.log(`- ${log}`);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Parallel agent failed:', message);
    process.exit(1);
  }
}

main();
