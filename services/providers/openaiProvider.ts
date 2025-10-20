import OpenAI from 'openai';
import { BaseAIProvider, ProviderConfig } from '../aiProvider';
import { AIModel, AICapability, AIResponse, ChatMessage, Tool } from '../../types';

export class OpenAIProvider extends BaseAIProvider {
  name = 'openai';
  private client: OpenAI;

  models: AIModel[] = [
    {
      id: 'gpt-4o-mini',
      name: 'GPT-4o Mini',
      provider: 'openai',
      capabilities: [AICapability.TEXT_GENERATION, AICapability.FUNCTION_CALLING, AICapability.STREAMING],
      contextWindow: 128000,
      costPerToken: 0.00000015, // DEPRECATED
      maxTokens: 16384,
      supportsVision: false,
      supportsFunctionCalling: true,
      // G1: New fields
      isLocal: false,
      tags: ['fast', 'remote'],
      pricing: { inputPer1k: 0.00015, outputPer1k: 0.0006 }, // $0.15/$0.60 per 1M tokens
    },
    {
      id: 'gpt-4o',
      name: 'GPT-4o',
      provider: 'openai',
      capabilities: [AICapability.TEXT_GENERATION, AICapability.FUNCTION_CALLING, AICapability.VISION, AICapability.REASONING, AICapability.STREAMING],
      contextWindow: 128000,
      costPerToken: 0.000005, // DEPRECATED
      maxTokens: 4096,
      supportsVision: true,
      supportsFunctionCalling: true,
      // G1: New fields
      isLocal: false,
      tags: ['reasoning', 'remote', 'advanced'],
      pricing: { inputPer1k: 0.0025, outputPer1k: 0.01 }, // $2.50/$10 per 1M tokens
    },
    {
      id: 'gpt-4-turbo',
      name: 'GPT-4 Turbo',
      provider: 'openai',
      capabilities: [AICapability.TEXT_GENERATION, AICapability.FUNCTION_CALLING, AICapability.VISION, AICapability.REASONING, AICapability.STREAMING],
      contextWindow: 128000,
      costPerToken: 0.00001, // DEPRECATED
      maxTokens: 4096,
      supportsVision: true,
      supportsFunctionCalling: true,
      // G1: New fields
      isLocal: false,
      tags: ['reasoning', 'remote', 'advanced'],
      pricing: { inputPer1k: 0.01, outputPer1k: 0.03 }, // $10/$30 per 1M tokens
    },
  ];

  capabilities: AICapability[] = [
    AICapability.TEXT_GENERATION,
    AICapability.FUNCTION_CALLING,
    AICapability.VISION,
    AICapability.REASONING,
    AICapability.STREAMING,
  ];

  constructor(config: ProviderConfig) {
    super(config);
    
    if (!config.apiKey) {
      throw new Error("OpenAI API key is required");
    }

    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.endpoint,
      dangerouslyAllowBrowser: true, // Allow browser usage for Electron
    });
  }

  async chat(messages: ChatMessage[], tools?: Tool[]): Promise<AIResponse> {
    try {
      // Convert tools to OpenAI format
      const openaiTools = tools ? this.convertToolsToProviderFormat(tools) : [];
      
      // Convert messages to OpenAI format
      const openaiMessages = this.convertMessagesToProviderFormat(messages);
      
      // Send message to OpenAI
      const response = await this.client.chat.completions.create({
        model: this.config.model || 'gpt-4o',
        messages: openaiMessages,
        tools: openaiTools.length > 0 ? openaiTools : undefined,
        tool_choice: openaiTools.length > 0 ? 'auto' : undefined,
        max_tokens: this.config.maxTokens || 4096,
        temperature: this.config.temperature || 0.7,
      });

      const choice = response.choices[0];
      const message = choice.message;

      // Extract function calls
      const functionCalls = message.tool_calls?.map(toolCall => ({
        name: toolCall.function.name,
        args: JSON.parse(toolCall.function.arguments),
      }));

      return {
        text: message.content,
        functionCalls,
        model: response.model,
        finishReason: choice.finish_reason,
        usage: response.usage ? {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
        } : undefined,
      };
    } catch (error) {
      console.error('OpenAI chat error:', error);
      throw error;
    }
  }

  async generateContent(prompt: string, options?: any): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: options?.model || this.config.model || 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: options?.maxTokens || this.config.maxTokens || 4096,
        temperature: options?.temperature || this.config.temperature || 0.7,
      });

      return response.choices[0].message.content || '';
    } catch (error) {
      console.error('OpenAI generateContent error:', error);
      throw error;
    }
  }

  async *streamResponse(messages: ChatMessage[], tools?: Tool[]): AsyncIterable<AIResponse> {
    try {
      // Convert tools to OpenAI format
      const openaiTools = tools ? this.convertToolsToProviderFormat(tools) : [];
      
      // Convert messages to OpenAI format
      const openaiMessages = this.convertMessagesToProviderFormat(messages);
      
      // Create streaming completion
      const stream = await this.client.chat.completions.create({
        model: this.config.model || 'gpt-4o',
        messages: openaiMessages,
        tools: openaiTools.length > 0 ? openaiTools : undefined,
        tool_choice: openaiTools.length > 0 ? 'auto' : undefined,
        max_tokens: this.config.maxTokens || 4096,
        temperature: this.config.temperature || 0.7,
        stream: true,
      });

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        if (delta?.content) {
          yield {
            text: delta.content,
            model: chunk.model,
          };
        }
      }
    } catch (error) {
      console.error('OpenAI streamResponse error:', error);
      throw error;
    }
  }

  async embeddings(text: string): Promise<number[]> {
    try {
      const response = await this.client.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      });
      return response.data[0].embedding;
    } catch (error) {
      console.error('OpenAI embeddings error:', error);
      throw error;
    }
  }

  // Helper methods for OpenAI-specific conversions
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
}
