import { getCloudContextSummary } from './context/cloudContext';
import { getDocsContextForTask } from './context/docsContext';
import {
  buildRepoContextSnippet,
  listRelevantFiles,
  readFilesForContext,
} from './context/repoContext';

export type BrowserAgentInput = {
  task: string;
  repoPath?: string;
  files?: string[];
  extraContext?: string;
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

function buildPrompt(task: string, context: string): string {
  return `You are the Browser Agent for this repository. Complete the following task with concise reasoning and actionable output.\n\nTask:\n${task}\n\nContext:\n${context}`;
}

async function gatherRepoContext(repoPath?: string, files?: string[]): Promise<{ snippet: string; usedFiles: string[] }> {
  if (!repoPath) return { snippet: '', usedFiles: [] };
  const targetFiles = files?.length ? files : await listRelevantFiles(repoPath);
  const repoFiles = await readFilesForContext(repoPath, targetFiles.slice(0, 15));
  return { snippet: buildRepoContextSnippet(repoFiles), usedFiles: repoFiles.map((file) => file.path) };
}

async function attemptGeminiSummary(prompt: string): Promise<string> {
  try {
    const module = await import('../../../services/geminiService');
    const service = module.geminiService;
    const response = await service.summarizeText(prompt);
    if (response) return response.trim();
  } catch (error) {
    console.info('Gemini summary unavailable, using fallback.', error);
  }
  return `Planned response for prompt:\n${prompt.slice(0, 1200)}`;
}

export async function runBrowserAgentTask(input: BrowserAgentInput): Promise<BrowserAgentResult> {
  const logs: string[] = [];
  try {
    const { task, repoPath, files, extraContext } = input;
    if (!task || !task.trim()) {
      return { summary: 'No task provided.', logs };
    }

    const repoContext = await gatherRepoContext(repoPath, files);
    if (repoContext.snippet) logs.push('Included repository context.');
    const docsContext = await getDocsContextForTask(task);
    if (docsContext) logs.push('Included docs context.');
    const cloudContext = await getCloudContextSummary(repoPath);
    if (cloudContext) logs.push('Included cloud context.');

    const combinedContext = [repoContext.snippet, docsContext, cloudContext, extraContext]
      .filter(Boolean)
      .join('\n\n');

    const prompt = buildPrompt(task, combinedContext);
    const summary = await attemptGeminiSummary(prompt);

    const artifacts: BrowserAgentArtifact[] = [];
    if (repoContext.usedFiles.length) {
      artifacts.push({
        path: 'agent/context-summary.txt',
        content: combinedContext,
      });
    }

    logs.push(`Processed ${repoContext.usedFiles.length} repo files.`);
    return { summary, artifacts, logs };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logs.push(`Browser agent failed: ${message}`);
    return {
      summary: `Task failed safely: ${message}`,
      logs,
    };
  }
}
