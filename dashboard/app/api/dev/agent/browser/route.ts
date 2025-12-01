import { runBrowserAgentTask } from '../../../../../src/server/agent/browserAgentService';

export const runtime = 'nodejs';

export type BrowserAgentRequestBody = {
  task: string;
  repoPath?: string;
  files?: string[];
  extraContext?: string;
};

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as BrowserAgentRequestBody;
    if (!body?.task || !body.task.trim()) {
      return new Response(JSON.stringify({ error: 'task is required' }), { status: 400 });
    }

    const result = await runBrowserAgentTask({
      task: body.task,
      repoPath: body.repoPath || process.cwd(),
      files: body.files,
      extraContext: body.extraContext,
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Browser agent API error', error);
    return new Response(JSON.stringify({ error: 'Failed to run agent' }), { status: 500 });
  }
}
