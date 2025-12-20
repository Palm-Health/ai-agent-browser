import { runParallelAgentTask } from '../../../../../src/server/agent/parallelAgentService';

export const runtime = 'nodejs';

export type ParallelAgentRequestBody = {
  task: string;
  repoPath?: string;
};

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as ParallelAgentRequestBody;
    if (!body?.task || !body.task.trim()) {
      return new Response(JSON.stringify({ error: 'task is required' }), { status: 400 });
    }

    const result = await runParallelAgentTask({
      task: body.task,
      repoPath: body.repoPath || process.cwd(),
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Parallel agent API error', error);
    return new Response(JSON.stringify({ error: 'Failed to run parallel agent' }), { status: 500 });
  }
}
