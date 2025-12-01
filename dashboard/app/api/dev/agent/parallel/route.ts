import { runParallelAgentTask } from '../../../../../../src/server/agent/parallelAgentService';

export const runtime = 'nodejs';

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body.task !== 'string' || body.task.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Missing task in request body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const result = await runParallelAgentTask({
      task: body.task,
      repoPath: typeof body.repoPath === 'string' ? body.repoPath : undefined
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Parallel agent failed unexpectedly';
    console.error('Parallel agent API error', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
