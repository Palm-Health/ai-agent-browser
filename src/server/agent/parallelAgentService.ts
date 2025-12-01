import { BrowserAgentArtifact, runBrowserAgentTask } from './browserAgentService';

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

async function runSubtask(name: string, task: string, repoPath?: string) {
  try {
    return await runBrowserAgentTask({ task, repoPath });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { summary: `Subtask failed: ${message}`, logs: [`${name} failed: ${message}`] };
  }
}

export async function runParallelAgentTask(input: ParallelAgentInput): Promise<ParallelAgentResult> {
  const logs: string[] = [];
  const { task, repoPath } = input;
  if (!task || !task.trim()) {
    return { summary: 'No task provided.', subtasks: [], artifacts: [], logs };
  }

  const subtasks = [
    {
      name: 'research',
      prompt: `Research external docs and our codebase context needed to accomplish: ${task}. Focus on APIs, integrations, constraints, and EMR modules. Return a structured summary and suggestions.`,
    },
    {
      name: 'spec',
      prompt: `Generate a concise technical spec and file-level plan for: ${task}. Use our architecture patterns and keep the output concise.`,
    },
    {
      name: 'code',
      prompt: `Draft code artifacts or patches to implement: ${task}. Follow our project conventions and TypeScript patterns. Include file paths and contents.`,
    },
  ];

  const results = await Promise.all(
    subtasks.map(async (subtask) => {
      const result = await runSubtask(subtask.name, subtask.prompt, repoPath);
      return {
        name: subtask.name,
        summary: result.summary,
        artifacts: result.artifacts,
        logs: result.logs,
      };
    })
  );

  const artifactMap = new Map<string, BrowserAgentArtifact>();
  results.forEach((result) => {
    result.artifacts?.forEach((artifact) => {
      artifactMap.set(artifact.path, artifact);
    });
  });

  const flattenedArtifacts = Array.from(artifactMap.values());
  const failed = results.filter((r) => r.summary.toLowerCase().startsWith('subtask failed'));
  const summary = `Parallel agent completed. ${results.length - failed.length}/${results.length} subtasks succeeded. Produced ${flattenedArtifacts.length} artifacts.`;
  logs.push(`Completed subtasks with ${failed.length} failures.`);

  return {
    summary,
    subtasks: results,
    artifacts: flattenedArtifacts,
    logs,
  };
}
