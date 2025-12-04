export const runtime = 'nodejs';

import { runBrowserAgentTask } from '../../../../../../services/agent/browserAgentService';

function jsonResponse(body: any, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { task, repoPath, files } = body ?? {};

    if (!task || typeof task !== 'string') {
      return jsonResponse({ error: 'Missing required field: task' }, { status: 400 });
    }

    const result = await runBrowserAgentTask({
      task,
      repoPath: repoPath || process.cwd(),
      files,
    });

    return jsonResponse(result, { status: 200 });
  } catch (error) {
    console.error('Error handling browser agent request', error);
    return jsonResponse(
      { error: 'Failed to process browser agent request' },
      { status: 500 }
    );
  }
}
