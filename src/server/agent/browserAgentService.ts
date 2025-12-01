export type BrowserAgentInput = {
  task: string;
  repoPath?: string;
};

export type BrowserAgentArtifact = {
  path: string;
  content: string;
};

export type BrowserAgentResult = {
  summary: string;
  artifacts?: BrowserAgentArtifact[];
  logs?: string[];
};

/**
 * Placeholder browser agent implementation.
 * In a full deployment, this should delegate to the browser automation layer
 * to execute the requested task. For now we return a structured response so
 * orchestrators and API consumers can build on top of it.
 */
export async function runBrowserAgentTask(
  input: BrowserAgentInput
): Promise<BrowserAgentResult> {
  const logs = [`Received task: ${input.task}`];
  if (input.repoPath) {
    logs.push(`Using repository path: ${input.repoPath}`);
  }

  return {
    summary: `Executed browser agent task: ${input.task}`,
    artifacts: [],
    logs
  };
}
