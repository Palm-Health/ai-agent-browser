import { categorizeMCPTool, listMCPTools, MCPToolCategory } from '@/src/server/mcp/mcpClient';

export const runtime = 'nodejs';

export async function GET(): Promise<Response> {
  try {
    const tools = await listMCPTools();
    const categorized = tools.reduce<Record<MCPToolCategory, typeof tools>>(
      (acc, tool) => {
        const category = categorizeMCPTool(tool);
        acc[category] = acc[category] || [];
        acc[category].push(tool);
        return acc;
      },
      { clinical: [], marketing: [], education: [], ops: [], other: [] },
    );

    return new Response(JSON.stringify({ tools, categorized }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
