const DEFAULT_MCP_BASE_URL = process.env.MCP_SERVER_URL || process.env.NEXT_PUBLIC_MCP_SERVER_URL || 'http://localhost:4000';
const MCP_API_KEY = process.env.MCP_API_KEY;

export type MCPTool = {
  name: string;
  description?: string;
  inputSchema?: unknown;
  outputSchema?: unknown;
  namespace?: string;
};

export type MCPInvocationInput = {
  toolName: string;
  args?: Record<string, unknown>;
};

export type MCPInvocationResult = {
  toolName: string;
  raw: unknown;
  summary?: string;
};

export type MCPToolCategory = 'clinical' | 'marketing' | 'education' | 'ops' | 'other';

function getMCPBaseUrl(): string {
  const trimmed = DEFAULT_MCP_BASE_URL?.replace(/\/$/, '');
  return trimmed || 'http://localhost:4000';
}

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (MCP_API_KEY) {
    headers.Authorization = `Bearer ${MCP_API_KEY}`;
  }

  return headers;
}

function normalizeToolName(tool: MCPTool): string {
  if (tool.namespace && !tool.name.startsWith(`${tool.namespace}.`)) {
    return `${tool.namespace}.${tool.name}`;
  }
  return tool.name;
}

export async function listMCPTools(): Promise<MCPTool[]> {
  const baseUrl = getMCPBaseUrl();
  try {
    const response = await fetch(`${baseUrl}/tools`, {
      method: 'GET',
      headers: getHeaders(),
    });

    if (!response.ok) {
      console.error(`[MCP client] Failed to list tools: ${response.status} ${response.statusText}`);
      return [];
    }

    const payload = await response.json().catch(() => undefined);
    const tools = (payload?.tools || payload || []) as MCPTool[];
    return tools.map(tool => ({
      ...tool,
      name: normalizeToolName(tool),
    }));
  } catch (error) {
    console.error('[MCP client] Error listing tools', error);
    return [];
  }
}

export async function invokeMCPTool(input: MCPInvocationInput): Promise<MCPInvocationResult> {
  const baseUrl = getMCPBaseUrl();
  try {
    const response = await fetch(`${baseUrl}/invoke`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        tool: input.toolName,
        args: input.args || {},
      }),
    });

    const raw = await response.json().catch(() => undefined);

    if (!response.ok) {
      console.error(`[MCP client] Invocation failed for ${input.toolName}: ${response.status} ${response.statusText}`);
      return {
        toolName: input.toolName,
        raw: raw || { error: response.statusText },
        summary: `Invocation failed for ${input.toolName}`,
      };
    }

    const summary = typeof raw === 'object' && raw && 'summary' in (raw as Record<string, unknown>)
      ? String((raw as Record<string, unknown>).summary)
      : undefined;

    return {
      toolName: input.toolName,
      raw,
      summary,
    };
  } catch (error) {
    console.error(`[MCP client] Error invoking ${input.toolName}`, error);
    return {
      toolName: input.toolName,
      raw: { error: (error as Error).message },
      summary: `Invocation failed for ${input.toolName}: ${(error as Error).message}`,
    };
  }
}

export function categorizeMCPTool(tool: MCPTool): MCPToolCategory {
  const identifier = normalizeToolName(tool).toLowerCase();
  const description = tool.description?.toLowerCase() || '';

  if (identifier.startsWith('clinical.') || description.includes('clinical') || description.includes('patient')) {
    return 'clinical';
  }
  if (identifier.startsWith('marketing.') || description.includes('marketing') || description.includes('seo')) {
    return 'marketing';
  }
  if (identifier.startsWith('education.') || description.includes('course') || description.includes('learning')) {
    return 'education';
  }
  if (identifier.startsWith('ops.') || identifier.startsWith('operations.') || description.includes('ops') || description.includes('operations')) {
    return 'ops';
  }
  return 'other';
}
