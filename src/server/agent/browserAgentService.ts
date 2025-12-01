import { categorizeMCPTool, invokeMCPTool, listMCPTools, MCPInvocationResult, MCPTool } from '../mcp/mcpClient';

export type BrowserAgentArtifact = {
  type: 'text' | 'link' | 'file';
  content: string;
  label?: string;
};

export type BrowserAgentInput = {
  task: string;
  repoPath?: string;
  files?: string[];
  extraContext?: string;
  useMCP?: boolean;
  allowedMCPTools?: string[];
};

export type BrowserAgentResult = {
  summary: string;
  artifacts?: BrowserAgentArtifact[];
  logs?: string[];
  mcpCalls?: MCPInvocationResult[];
};

function describeTools(tools: MCPTool[]): string {
  if (!tools.length) return 'No MCP tools available.';

  return tools
    .map(tool => {
      const description = tool.description ? ` - ${tool.description}` : '';
      return `${tool.name}${description}`;
    })
    .join('\n');
}

async function selectTools(useMCP: boolean | undefined, allowedMCPTools?: string[]): Promise<MCPTool[]> {
  if (!useMCP) return [];

  const availableTools = await listMCPTools();
  if (!allowedMCPTools?.length) return availableTools;

  const allowedSet = new Set(allowedMCPTools.map(name => name.toLowerCase()));
  return availableTools.filter(tool => allowedSet.has(tool.name.toLowerCase()));
}

export async function runBrowserAgentTask(input: BrowserAgentInput): Promise<BrowserAgentResult> {
  const logs: string[] = [`Starting browser agent task: ${input.task}`];
  const mcpCalls: MCPInvocationResult[] = [];

  const selectedTools = await selectTools(input.useMCP, input.allowedMCPTools);
  if (input.useMCP) {
    logs.push(`MCP enabled. ${selectedTools.length} tools available after filtering.`);
  }

  const contextSummary = `Task: ${input.task}\nRepo: ${input.repoPath || 'n/a'}\nFiles: ${(input.files || []).join(', ') || 'none'}\nExtra: ${input.extraContext || 'n/a'}`;
  const mcpToolSummary = input.useMCP ? describeTools(selectedTools) : 'MCP disabled.';

  logs.push('Context prepared for agent.');
  logs.push('Available MCP tools:\n' + mcpToolSummary);

  if (input.useMCP && selectedTools.length) {
    const maxCalls = Math.min(3, selectedTools.length);
    for (let i = 0; i < maxCalls; i++) {
      const tool = selectedTools[i];
      const category = categorizeMCPTool(tool);
      logs.push(`Invoking MCP tool ${tool.name} (category: ${category}).`);
      const result = await invokeMCPTool({ toolName: tool.name });
      mcpCalls.push(result);
      logs.push(`MCP tool ${tool.name} completed.`);
    }
  }

  const summaryParts = [
    'Browser agent run completed.',
    input.useMCP && selectedTools.length
      ? `Used ${mcpCalls.length} MCP tool(s) (${selectedTools.length} available).`
      : 'MCP usage was disabled or no tools were available.',
  ];

  return {
    summary: summaryParts.join(' '),
    artifacts: [
      {
        type: 'text',
        content: contextSummary,
        label: 'Context',
      },
    ],
    logs,
    mcpCalls,
  };
}
