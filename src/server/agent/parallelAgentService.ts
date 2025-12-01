import { BrowserAgentArtifact, BrowserAgentResult, runBrowserAgentTask } from './browserAgentService';
import { categorizeMCPTool, listMCPTools, MCPInvocationResult, MCPTool, MCPToolCategory } from '../mcp/mcpClient';

export type ParallelAgentInput = {
  task: string;
  repoPath?: string;
  useMCP?: boolean;
  allowedMCPTools?: string[];
};

export type ParallelAgentSubtaskResult = {
  name: string;
  summary: string;
  artifacts?: BrowserAgentArtifact[];
  logs?: string[];
  mcpCalls?: MCPInvocationResult[];
};

export type ParallelAgentResult = {
  summary: string;
  subtasks: ParallelAgentSubtaskResult[];
  artifacts: BrowserAgentArtifact[];
  logs: string[];
  mcpCalls: MCPInvocationResult[];
};

function formatToolName(tool: MCPTool): string {
  return tool.namespace ? `${tool.namespace}.${tool.name}` : tool.name;
}

function filterToolsByCategory(tools: MCPTool[], categories: MCPToolCategory[], allowed?: string[]): string[] {
  const allowedSet = allowed && allowed.length ? new Set(allowed.map(name => name.toLowerCase())) : undefined;
  return tools
    .filter(tool => categories.includes(categorizeMCPTool(tool)))
    .map(formatToolName)
    .filter(name => !allowedSet || allowedSet.has(name.toLowerCase()));
}

async function prepareMCPTooling(useMCP?: boolean, allowedMCPTools?: string[]) {
  if (!useMCP) return { available: [] as MCPTool[], research: [] as string[], spec: [] as string[], code: [] as string[] };

  const available = await listMCPTools();
  const research = filterToolsByCategory(available, ['clinical', 'education', 'marketing'], allowedMCPTools);
  const spec = filterToolsByCategory(available, ['clinical', 'education', 'ops', 'marketing'], allowedMCPTools);
  const code = filterToolsByCategory(available, ['ops'], allowedMCPTools);

  return { available, research, spec, code };
}

function buildSummary(mcpCalls: MCPInvocationResult[], subtasks: ParallelAgentSubtaskResult[]): string {
  const totalCalls = mcpCalls.length;
  const categories = ['clinical', 'marketing', 'education', 'ops', 'other'] as MCPToolCategory[];
  const categoryCounts = categories.reduce<Record<string, number>>((acc, category) => {
    acc[category] = 0;
    return acc;
  }, {});

  for (const call of mcpCalls) {
    const category = categories.find(cat => call.toolName.toLowerCase().startsWith(`${cat}.`)) || 'other';
    categoryCounts[category] += 1;
  }

  const categorySummary = categories
    .filter(category => categoryCounts[category] > 0)
    .map(category => `${categoryCounts[category]} ${category}`)
    .join(', ');

  const subtaskSummary = subtasks.map(sub => `${sub.name}: ${sub.summary}`).join(' ');
  const mcpSummary = totalCalls ? `MCP usage: ${totalCalls} call(s)${categorySummary ? ` (${categorySummary})` : ''}.` : 'No MCP tools were used.';

  return `${subtaskSummary} ${mcpSummary}`.trim();
}

export async function runParallelAgentTask(input: ParallelAgentInput): Promise<ParallelAgentResult> {
  const logs: string[] = [`Starting parallel agent for task: ${input.task}`];
  const mcpCalls: MCPInvocationResult[] = [];

  const { research, spec, code } = await prepareMCPTooling(input.useMCP, input.allowedMCPTools);

  const researchResult: BrowserAgentResult = await runBrowserAgentTask({
    task: `Research: ${input.task}`,
    repoPath: input.repoPath,
    useMCP: input.useMCP,
    allowedMCPTools: research.length ? research : input.allowedMCPTools,
  });
  mcpCalls.push(...(researchResult.mcpCalls || []));

  const specResult: BrowserAgentResult = await runBrowserAgentTask({
    task: `Specification: ${input.task}`,
    repoPath: input.repoPath,
    useMCP: input.useMCP,
    allowedMCPTools: spec.length ? spec : input.allowedMCPTools,
  });
  mcpCalls.push(...(specResult.mcpCalls || []));

  const codeResult: BrowserAgentResult = await runBrowserAgentTask({
    task: `Implementation: ${input.task}`,
    repoPath: input.repoPath,
    useMCP: input.useMCP,
    allowedMCPTools: code.length ? code : input.allowedMCPTools,
  });
  mcpCalls.push(...(codeResult.mcpCalls || []));

  const subtasks: ParallelAgentSubtaskResult[] = [
    { name: 'research', summary: researchResult.summary, artifacts: researchResult.artifacts, logs: researchResult.logs, mcpCalls: researchResult.mcpCalls },
    { name: 'spec', summary: specResult.summary, artifacts: specResult.artifacts, logs: specResult.logs, mcpCalls: specResult.mcpCalls },
    { name: 'code', summary: codeResult.summary, artifacts: codeResult.artifacts, logs: codeResult.logs, mcpCalls: codeResult.mcpCalls },
  ];

  const artifacts: BrowserAgentArtifact[] = [
    ...(researchResult.artifacts || []),
    ...(specResult.artifacts || []),
    ...(codeResult.artifacts || []),
  ];

  const summary = buildSummary(mcpCalls, subtasks);
  logs.push('Parallel agent run completed.');

  return {
    summary,
    subtasks,
    artifacts,
    logs,
    mcpCalls,
  };
}
