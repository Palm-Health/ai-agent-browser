import { BaseAIProvider, ProviderConfig } from '../aiProvider';
import { AIModel, AICapability, AIResponse, ChatMessage, Tool } from '../../types';

export class OllamaProvider extends BaseAIProvider {
  name = 'ollama';
  private endpoint: string;

  models: AIModel[] = [
    {
      id: 'deepseek-r1:latest',
      name: 'DeepSeek R1 (Local)',
      provider: 'ollama',
      capabilities: [AICapability.TEXT_GENERATION, AICapability.REASONING, AICapability.STREAMING],
      contextWindow: 128000,
      costPerToken: 0, // DEPRECATED
      maxTokens: 4096,
      supportsVision: false,
      supportsFunctionCalling: false,
      // G1: New fields
      isLocal: true,
      tags: ['reasoning', 'local'],
      pricing: { inputPer1k: 0, outputPer1k: 0 },
    },
    {
      id: 'llama3.3:latest',
      name: 'Llama 3.3 (Local)',
      provider: 'ollama',
      capabilities: [AICapability.TEXT_GENERATION, AICapability.STREAMING, AICapability.CODE_GENERATION],
      contextWindow: 128000,
      costPerToken: 0, // DEPRECATED
      maxTokens: 4096,
      supportsVision: false,
      supportsFunctionCalling: false,
      // G1: New fields
      isLocal: true,
      tags: ['codegen', 'local', 'fast'],
      pricing: { inputPer1k: 0, outputPer1k: 0 },
    },
    {
      id: 'llama3.1:latest',
      name: 'Llama 3.1 (Local)',
      provider: 'ollama',
      capabilities: [AICapability.TEXT_GENERATION, AICapability.STREAMING],
      contextWindow: 128000,
      costPerToken: 0, // DEPRECATED
      maxTokens: 4096,
      supportsVision: false,
      supportsFunctionCalling: false,
      // G1: New fields
      isLocal: true,
      tags: ['local', 'fast'],
      pricing: { inputPer1k: 0, outputPer1k: 0 },
    },
    {
      id: 'meditron:latest',
      name: 'Meditron (Local Medical AI)',
      provider: 'ollama',
      capabilities: [AICapability.TEXT_GENERATION, AICapability.STREAMING],
      contextWindow: 128000,
      costPerToken: 0, // DEPRECATED
      maxTokens: 4096,
      supportsVision: false,
      supportsFunctionCalling: false,
      // G1: New fields
      isLocal: true,
      tags: ['medical', 'local'],
      pricing: { inputPer1k: 0, outputPer1k: 0 },
    },
    {
      id: 'llama3.2:3b',
      name: 'Llama 3.2 3B',
      provider: 'ollama',
      capabilities: [AICapability.TEXT_GENERATION, AICapability.STREAMING],
      contextWindow: 128000,
      costPerToken: 0, // DEPRECATED
      maxTokens: 4096,
      supportsVision: false,
      supportsFunctionCalling: false,
      // G1: New fields
      isLocal: true,
      tags: ['local', 'fast', 'lightweight'],
      pricing: { inputPer1k: 0, outputPer1k: 0 },
    },
    {
      id: 'llama3.2:1b',
      name: 'Llama 3.2 1B',
      provider: 'ollama',
      capabilities: [AICapability.TEXT_GENERATION, AICapability.STREAMING],
      contextWindow: 128000,
      costPerToken: 0, // DEPRECATED
      maxTokens: 4096,
      supportsVision: false,
      supportsFunctionCalling: false,
      // G1: New fields
      isLocal: true,
      tags: ['local', 'fast', 'lightweight'],
      pricing: { inputPer1k: 0, outputPer1k: 0 },
    },
    {
      id: 'mistral:7b',
      name: 'Mistral 7B',
      provider: 'ollama',
      capabilities: [AICapability.TEXT_GENERATION, AICapability.STREAMING],
      contextWindow: 32000,
      costPerToken: 0, // DEPRECATED
      maxTokens: 4096,
      supportsVision: false,
      supportsFunctionCalling: false,
      // G1: New fields
      isLocal: true,
      tags: ['local'],
      pricing: { inputPer1k: 0, outputPer1k: 0 },
    },
    {
      id: 'codellama:7b',
      name: 'Code Llama 7B',
      provider: 'ollama',
      capabilities: [AICapability.TEXT_GENERATION, AICapability.CODE_GENERATION, AICapability.STREAMING],
      contextWindow: 100000,
      costPerToken: 0, // DEPRECATED
      maxTokens: 4096,
      supportsVision: false,
      supportsFunctionCalling: false,
      // G1: New fields
      isLocal: true,
      tags: ['codegen', 'local'],
      pricing: { inputPer1k: 0, outputPer1k: 0 },
    },
  ];

  capabilities: AICapability[] = [
    AICapability.TEXT_GENERATION,
    AICapability.CODE_GENERATION,
    AICapability.STREAMING,
  ];

  constructor(config: ProviderConfig) {
    super(config);
    
    this.endpoint = config.endpoint || 'http://localhost:11434';
  }

  async chat(messages: ChatMessage[], tools?: Tool[]): Promise<AIResponse> {
    try {
      // Convert messages to Ollama format
      const ollamaMessages = this.convertMessagesToProviderFormat(messages);
      
      // Ollama doesn't support function calling natively, so we'll include tool descriptions in the prompt
      let systemPrompt = this.buildSystemPrompt(tools);
      
      // Send message to Ollama
      const response = await fetch(`${this.endpoint}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model || 'llama3.2:3b',
          messages: [
            { role: 'system', content: systemPrompt },
            ...ollamaMessages,
          ],
          stream: false,
          options: {
            temperature: this.config.temperature || 0.7,
            num_predict: this.config.maxTokens || 4096,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        text: data.message.content,
        model: data.model,
        finishReason: data.done ? 'stop' : 'length',
      };
    } catch (error) {
      console.error('Ollama chat error:', error);
      throw error;
    }
  }

  async generateContent(prompt: string, options?: any): Promise<string> {
    try {
      const response = await fetch(`${this.endpoint}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: options?.model || this.config.model || 'llama3.2:3b',
          prompt: prompt,
          stream: false,
          options: {
            temperature: options?.temperature || this.config.temperature || 0.7,
            num_predict: options?.maxTokens || this.config.maxTokens || 4096,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error('Ollama generateContent error:', error);
      throw error;
    }
  }

  async *streamResponse(messages: ChatMessage[], tools?: Tool[]): AsyncIterable<AIResponse> {
    try {
      // Convert messages to Ollama format
      const ollamaMessages = this.convertMessagesToProviderFormat(messages);
      
      // Ollama doesn't support function calling natively, so we'll include tool descriptions in the prompt
      let systemPrompt = this.buildSystemPrompt(tools);
      
      // Create streaming completion
      const response = await fetch(`${this.endpoint}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model || 'llama3.2:3b',
          messages: [
            { role: 'system', content: systemPrompt },
            ...ollamaMessages,
          ],
          stream: true,
          options: {
            temperature: this.config.temperature || 0.7,
            num_predict: this.config.maxTokens || 4096,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader available');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line);
              if (data.message?.content) {
                yield {
                  text: data.message.content,
                  model: data.model,
                };
              }
            } catch (e) {
              // Skip invalid JSON lines
            }
          }
        }
      }
    } catch (error) {
      console.error('Ollama streamResponse error:', error);
      throw error;
    }
  }

  async embeddings(text: string): Promise<number[]> {
    try {
      const response = await fetch(`${this.endpoint}/api/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model || 'llama3.2:3b',
          prompt: text,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.embedding;
    } catch (error) {
      console.error('Ollama embeddings error:', error);
      throw error;
    }
  }

  // Helper methods for Ollama-specific conversions
  protected convertMessagesToProviderFormat(messages: ChatMessage[]): any[] {
    return messages.map(msg => {
      switch (msg.type) {
        case 'user':
          return { role: 'user', content: msg.text };
        case 'agent':
          return { role: 'assistant', content: msg.text };
        case 'function_call':
          return { 
            role: 'assistant', 
            content: `I need to call the function ${msg.functionCall.name} with arguments: ${JSON.stringify(msg.functionCall.args)}`,
          };
        case 'tool_result':
          return { 
            role: 'user', 
            content: `Tool result: ${JSON.stringify(msg.toolResult)}`,
          };
        default:
          return { role: 'user', content: 'Unknown message type' };
      }
    });
  }

  private buildSystemPrompt(tools?: Tool[]): string {
    let prompt = `You are an autonomous web browsing agent. Your goal is to assist the user by interacting with web pages to accomplish their tasks.

- **PLANNING**: For any multi-step task, you MUST start by creating a step-by-step plan. This plan will be shown to the user for approval before you begin execution.
- **EXECUTION**: After the user approves the plan, I will execute it step by step. I will give you the result of each action. You must analyze the result and then tell me the next action to execute from the plan.
- **SEARCH**: Use Google search to find information. After searching, you MUST analyze the search results.
- **COMPLETION**: Once the entire objective is complete, you MUST provide a final summary of how the task was completed.
- **LEARNING**: I will provide you with examples of past successful tasks. Learn from these examples to create better plans for the current objective.`;

    if (tools && tools.length > 0) {
      prompt += `\n\nAvailable tools:\n`;
      for (const tool of tools) {
        prompt += `- ${tool.name}: ${tool.description}\n`;
      }
      prompt += `\nWhen you need to use a tool, describe what tool you want to use and with what parameters.`;
    }

    return prompt;
  }

  // Health check
  async isHealthy(): Promise<boolean> {
    try {
      const response = await fetch(`${this.endpoint}/api/tags`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  // Get available models
  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.endpoint}/api/tags`);
      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.models?.map((model: any) => model.name) || [];
    } catch (error) {
      console.error('Ollama getAvailableModels error:', error);
      return [];
    }
  }
}
