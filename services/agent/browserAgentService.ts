import { geminiService } from '../geminiService';

export interface BrowserAgentInput {
  task: string;
  repoPath?: string;
  files?: string[];
}

export interface BrowserAgentResult {
  summary: string;
  artifacts?: { path: string; content: string }[];
  logs?: string[];
}

function buildAgentPrompt(input: BrowserAgentInput): string {
  const segments = [
    `Task: ${input.task}`,
  ];

  if (input.repoPath) {
    segments.push(`Repository Path: ${input.repoPath}`);
  }

  if (input.files?.length) {
    segments.push(`Focus Files: ${input.files.join(', ')}`);
  }

  segments.push('Provide a concise summary of your planned or completed actions.');

  return segments.join('\n');
}

export async function runBrowserAgentTask(
  input: BrowserAgentInput
): Promise<BrowserAgentResult> {
  try {
    const prompt = buildAgentPrompt(input);
    const response = await geminiService.sendMessage(prompt, []);

    const logs: string[] = [];

    if (response.functionCalls?.length) {
      logs.push(
        `Function calls planned: ${response.functionCalls
          .map((call) => call.name)
          .join(', ')}`
      );
    }

    if (response.text) {
      logs.push('Received text response from browser agent.');
    }

    return {
      summary: response.text ?? 'No summary provided by browser agent.',
      artifacts: [],
      logs: logs.length ? logs : undefined,
    };
  } catch (error) {
    console.error('Failed to execute browser agent task', error);
    throw error;
  }
}
