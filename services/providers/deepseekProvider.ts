import { BaseAIProvider, ProviderConfig } from '../aiProvider';
import { AIModel, AICapability, AIResponse, ChatMessage, Tool } from '../../types';

export class DeepSeekProvider extends BaseAIProvider {
  name = 'deepseek';
  private apiKey: string;
  private baseURL: string;

  models: AIModel[] = [
    {
      id: 'deepseek-chat',
      name: 'DeepSeek Chat',
      provider: 'deepseek',
      capabilities: [AICapability.TEXT_GENERATION, AICapability.FUNCTION_CALLING, AICapability.STREAMING, AICapability.REASONING],
      contextWindow: 32768,
      costPerToken: 0.0000014, // DEPRECATED
      maxTokens: 4096,
      supportsVision: false,
      supportsFunctionCalling: true,
      // G1: New fields
      isLocal: false,
      tags: ['reasoning', 'remote'],
      pricing: { inputPer1k: 0.0014, outputPer1k: 0.0014 }, // $1.4 per 1M tokens
    },
    {
      id: 'deepseek-coder',
      name: 'DeepSeek Coder',
      provider: 'deepseek',
      capabilities: [AICapability.TEXT_GENERATION, AICapability.FUNCTION_CALLING, AICapability.STREAMING, AICapability.CODE_GENERATION, AICapability.REASONING],
      contextWindow: 16384,
      costPerToken: 0.0000014, // DEPRECATED
      maxTokens: 4096,
      supportsVision: false,
      supportsFunctionCalling: true,
      // G1: New fields
      isLocal: false,
      tags: ['codegen', 'reasoning', 'remote'],
      pricing: { inputPer1k: 0.0014, outputPer1k: 0.0014 }, // $1.4 per 1M tokens
    },
    {
      id: 'deepseek-reasoner',
      name: 'DeepSeek Reasoner',
      provider: 'deepseek',
      capabilities: [AICapability.TEXT_GENERATION, AICapability.FUNCTION_CALLING, AICapability.STREAMING, AICapability.REASONING],
      contextWindow: 128000,
      costPerToken: 0.0000055, // DEPRECATED
      maxTokens: 4096,
      supportsVision: false,
      supportsFunctionCalling: true,
      // G1: New fields
      isLocal: false,
      tags: ['reasoning', 'remote', 'advanced'],
      pricing: { inputPer1k: 0.0055, outputPer1k: 0.0055 }, // $5.5 per 1M tokens
    },
  ];

  capabilities: AICapability[] = [
    AICapability.TEXT_GENERATION,
    AICapability.FUNCTION_CALLING,
    AICapability.STREAMING,
    AICapability.CODE_GENERATION,
    AICapability.REASONING,
  ];

  constructor(config: ProviderConfig) {
    super(config);
    
    if (!config.apiKey) {
      throw new Error("DeepSeek API key is required");
    }

    this.apiKey = config.apiKey;
    this.baseURL = config.endpoint || 'https://api.deepseek.com/v1';
  }

  async chat(messages: ChatMessage[], tools?: Tool[]): Promise<AIResponse> {
    try {
      // Convert tools to DeepSeek format
      const deepseekTools = tools ? this.convertToolsToProviderFormat(tools) : [];
      
      // Convert messages to DeepSeek format
      const deepseekMessages = this.convertMessagesToProviderFormat(messages);
      
      // Prepare request body
      const requestBody: any = {
        model: this.config.model || 'deepseek-chat',
        messages: deepseekMessages,
        max_tokens: this.config.maxTokens || 4096,
        temperature: this.config.temperature || 0.7,
        stream: false,
      };

      // Add tools if available
      if (deepseekTools.length > 0) {
        requestBody.tools = deepseekTools;
        requestBody.tool_choice = 'auto';
      }

      // Send request to DeepSeek API
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`DeepSeek API error: ${response.status} ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      const choice = data.choices[0];
      const message = choice.message;

      // Extract function calls
      const functionCalls = message.tool_calls?.map((toolCall: any) => ({
        name: toolCall.function.name,
        args: JSON.parse(toolCall.function.arguments),
      }));

      return {
        text: message.content,
        functionCalls,
        model: data.model,
        finishReason: choice.finish_reason,
        usage: data.usage ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        } : undefined,
      };
    } catch (error) {
      console.error('DeepSeek chat error:', error);
      throw error;
    }
  }

  async generateContent(prompt: string, options?: any): Promise<string> {
    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: options?.model || this.config.model || 'deepseek-chat',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: options?.maxTokens || this.config.maxTokens || 4096,
          temperature: options?.temperature || this.config.temperature || 0.7,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`DeepSeek API error: ${response.status} ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      return data.choices[0].message.content || '';
    } catch (error) {
      console.error('DeepSeek generateContent error:', error);
      throw error;
    }
  }

  async *streamResponse(messages: ChatMessage[], tools?: Tool[]): AsyncIterable<AIResponse> {
    try {
      // Convert tools to DeepSeek format
      const deepseekTools = tools ? this.convertToolsToProviderFormat(tools) : [];
      
      // Convert messages to DeepSeek format
      const deepseekMessages = this.convertMessagesToProviderFormat(messages);
      
      // Prepare request body
      const requestBody: any = {
        model: this.config.model || 'deepseek-chat',
        messages: deepseekMessages,
        max_tokens: this.config.maxTokens || 4096,
        temperature: this.config.temperature || 0.7,
        stream: true,
      };

      // Add tools if available
      if (deepseekTools.length > 0) {
        requestBody.tools = deepseekTools;
        requestBody.tool_choice = 'auto';
      }

      // Send streaming request to DeepSeek API
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`DeepSeek API error: ${response.status} ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader available');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices[0]?.delta;
                if (delta?.content) {
                  yield {
                    text: delta.content,
                    model: parsed.model,
                  };
                }
              } catch (e) {
                // Skip invalid JSON lines
                continue;
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      console.error('DeepSeek streamResponse error:', error);
      throw error;
    }
  }

  async embeddings(text: string): Promise<number[]> {
    try {
      const response = await fetch(`${this.baseURL}/embeddings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'deepseek-embedding',
          input: text,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`DeepSeek API error: ${response.status} ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      return data.data[0].embedding;
    } catch (error) {
      console.error('DeepSeek embeddings error:', error);
      throw error;
    }
  }

  // Helper methods for DeepSeek-specific conversions
  protected convertToolsToProviderFormat(tools: Tool[]): any[] {
    return tools.map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
      },
    }));
  }

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
            content: null,
            tool_calls: [{
              id: `call_${Date.now()}`,
              type: 'function',
              function: {
                name: msg.functionCall.name,
                arguments: JSON.stringify(msg.functionCall.args),
              },
            }],
          };
        case 'tool_result':
          return { 
            role: 'tool', 
            content: JSON.stringify(msg.toolResult),
            tool_call_id: `call_${Date.now()}`,
          };
        default:
          return { role: 'user', content: 'Unknown message type' };
      }
    });
  }

  // Health check method
  async isHealthy(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });
      return response.ok;
    } catch (error) {
      console.error('DeepSeek health check failed:', error);
      return false;
    }
  }
}
