#!/usr/bin/env ts-node
import fs from 'fs';
import path from 'path';

const API_ENDPOINT = 'http://localhost:3000/api/dev/agent/browser';

function printUsage() {
  console.error('Usage: pnpm agent <browse|spec|patch> "task description"');
}

async function main() {
  const [, , subcommand, ...rest] = process.argv;
  const task = rest.join(' ').trim();

  const supported = ['browse', 'spec', 'patch'];

  if (!subcommand || !supported.includes(subcommand) || !task) {
    printUsage();
    process.exit(1);
  }

  const repoPath = process.cwd();
  const payload = { task: `${subcommand.toUpperCase()}: ${task}`, repoPath };

  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Request failed with status ${response.status}: ${errorText}`);
      process.exit(1);
    }

    const result = await response.json();

    console.log('=== Agent Summary ===');
    console.log(result.summary || 'No summary available.');

    if (Array.isArray(result.artifacts) && result.artifacts.length > 0) {
      console.log('\n=== Generated Artifacts ===');
      for (const artifact of result.artifacts) {
        const artifactPath = path.join(repoPath, artifact.path);
        await fs.promises.mkdir(path.dirname(artifactPath), { recursive: true });
        await fs.promises.writeFile(artifactPath, artifact.content, 'utf8');
        console.log(`Wrote artifact: ${artifact.path}`);
      }
    }

    if (Array.isArray(result.logs) && result.logs.length > 0) {
      console.log('\n=== Agent Logs ===');
      result.logs.forEach((entry: string) => console.log(entry));
    }
  } catch (error) {
    console.error('Error running browser agent:', error);
    process.exit(1);
  }
}

main();
