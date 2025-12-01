import { runParallelAgentTask } from '@/src/server/agent/parallelAgentService';

export const runtime = 'nodejs';

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const result = await runParallelAgentTask({
      task: body.task,
      repoPath: body.repoPath,
      useMCP: body.useMCP ?? false,
      allowedMCPTools: body.allowedMCPTools,
    });

    return new Response(JSON.stringify(result), {
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
