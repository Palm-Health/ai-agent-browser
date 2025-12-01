#!/usr/bin/env ts-node

const API_BASE = process.env.DEV_API_BASE_URL || 'http://localhost:3000';

function parseArgs(argv: string[]) {
  const args = argv.slice(2);
  const useMCP = args.includes('--mcp') || args.includes('--use-mcp');
  const toolsArg = args.find(arg => arg.startsWith('--tools='));
  const allowedMCPTools = toolsArg ? toolsArg.replace('--tools=', '').split(',').filter(Boolean) : undefined;
  const task = args.filter(arg => !arg.startsWith('--')).join(' ');

  return { useMCP, allowedMCPTools, task };
}

async function run() {
  const { useMCP, allowedMCPTools, task } = parseArgs(process.argv);

  if (!task) {
    console.error('Usage: pnpm agent:parallel [--mcp] [--tools=tool1,tool2] "task description"');
    process.exit(1);
  }

  const response = await fetch(`${API_BASE}/api/dev/agent/parallel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      task,
      repoPath: process.cwd(),
      useMCP,
      allowedMCPTools,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Parallel agent request failed:', errorText);
    process.exit(1);
  }

  const result = await response.json();
  console.log('Parallel Agent Result:', JSON.stringify(result, null, 2));
}

run();
