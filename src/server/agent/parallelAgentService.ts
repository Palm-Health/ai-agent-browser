import {
  runBrowserAgentTask,
  type BrowserAgentArtifact,
  type BrowserAgentResult
} from './browserAgentService';

export type ParallelAgentInput = {
  task: string;
  repoPath?: string;
};

export type ParallelAgentSubtaskResult = {
  name: string;
  summary: string;
  artifacts?: BrowserAgentArtifact[];
  logs?: string[];
};

export type ParallelAgentResult = {
  summary: string;
  subtasks: ParallelAgentSubtaskResult[];
  artifacts: BrowserAgentArtifact[];
  logs: string[];
};

async function executeSubtask(
  name: string,
  description: string,
  repoPath?: string
): Promise<ParallelAgentSubtaskResult> {
  try {
    const result: BrowserAgentResult = await runBrowserAgentTask({
      task: description,
      repoPath
    });

    return {
      name,
      summary: result.summary,
      artifacts: result.artifacts || [],
      logs: result.logs || []
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error executing subtask';
    return {
      name,
      summary: `Failed: ${message}`,
      artifacts: [],
      logs: [message]
    };
  }
}

export async function runParallelAgentTask(
  input: ParallelAgentInput
): Promise<ParallelAgentResult> {
  const { task, repoPath } = input;
  const orchestratorLogs: string[] = [];

  const researchDescription =
    'Research external docs + our codebase context needed to accomplish: ' +
    task +
    '. Focus on APIs, integrations, and constraints. Return a structured summary and suggestions.';

  const specDescription =
    'Generate a concise technical spec and file-level plan for: ' +
    task +
    '. Use any relevant context from our EMR architecture (modules, MCP tools, FHIR, Rupa, IPrescribe, etc.).';

  const codeDescription =
    'Draft code artifacts or patches to implement: ' +
    task +
    ' based on the planned spec. Prefer TypeScript and our existing patterns. Include paths and file content.';

  const [researchResult, specResult, codeResult] = await Promise.all([
    executeSubtask('research', researchDescription, repoPath),
    executeSubtask('spec', specDescription, repoPath),
    executeSubtask('code', codeDescription, repoPath)
  ]);

  const subtasks = [researchResult, specResult, codeResult];
  const artifactsMap = new Map<string, BrowserAgentArtifact>();

  for (const subtask of subtasks) {
    for (const artifact of subtask.artifacts || []) {
      artifactsMap.set(artifact.path, artifact);
    }
  }

  const artifacts = Array.from(artifactsMap.values());
  orchestratorLogs.push(
    `Subtasks completed: ${subtasks.length}. Artifacts generated: ${artifacts.length}.`
  );

  const failed = subtasks.filter((subtask) => subtask.summary.startsWith('Failed'));
  const summaryParts = [
    failed.length === 0
      ? 'All subtasks succeeded.'
      : `${failed.length} subtasks failed: ${failed.map((f) => f.name).join(', ')}.`,
    `Total artifacts: ${artifacts.length}.`
  ];

  return {
    summary: summaryParts.join(' '),
    subtasks,
    artifacts,
    logs: orchestratorLogs
  };
}
