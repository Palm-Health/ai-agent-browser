import Anthropic from '@anthropic-ai/sdk';
import { BaseAIProvider, ProviderConfig } from '../aiProvider';
import { AIModel, AICapability, AIResponse, ChatMessage, Tool } from '../../types';

export class AnthropicProvider extends BaseAIProvider {
  name = 'anthropic';
  private client: Anthropic;

  models: AIModel[] = [
    {
      id: 'claude-3-5-haiku-20241022',
      name: 'Claude 3.5 Haiku',
      provider: 'anthropic',
      capabilities: [AICapability.TEXT_GENERATION, AICapability.FUNCTION_CALLING, AICapability.STREAMING],
      contextWindow: 200000,
      costPerToken: 0.00000025, // DEPRECATED
      maxTokens: 4096,
      supportsVision: false,
      supportsFunctionCalling: true,
      // G1: New fields
      isLocal: false,
      tags: ['fast', 'remote'],
      pricing: { inputPer1k: 0.0008, outputPer1k: 0.004 }, // $0.80/$4 per 1M tokens
    },
    {
      id: 'claude-3-5-sonnet-20241022',
      name: 'Claude 3.5 Sonnet',
      provider: 'anthropic',
      capabilities: [AICapability.TEXT_GENERATION, AICapability.FUNCTION_CALLING, AICapability.VISION, AICapability.REASONING, AICapability.STREAMING],
      contextWindow: 200000,
      costPerToken: 0.000003, // DEPRECATED
      maxTokens: 4096,
      supportsVision: true,
      supportsFunctionCalling: true,
      // G1: New fields
      isLocal: false,
      tags: ['reasoning', 'remote', 'advanced'],
      pricing: { inputPer1k: 0.003, outputPer1k: 0.015 }, // $3/$15 per 1M tokens
    },
    {
      id: 'claude-3-opus-20240229',
      name: 'Claude 3 Opus',
      provider: 'anthropic',
      capabilities: [AICapability.TEXT_GENERATION, AICapability.FUNCTION_CALLING, AICapability.VISION, AICapability.REASONING, AICapability.STREAMING],
      contextWindow: 200000,
      costPerToken: 0.000015, // DEPRECATED
      maxTokens: 4096,
      supportsVision: true,
      supportsFunctionCalling: true,
      // G1: New fields
      isLocal: false,
      tags: ['reasoning', 'remote', 'advanced', 'premium'],
      pricing: { inputPer1k: 0.015, outputPer1k: 0.075 }, // $15/$75 per 1M tokens
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
      throw new Error("Anthropic API key is required");
    }

    this.client = new Anthropic({
      apiKey: config.apiKey,
      baseURL: config.endpoint,
    });
  }

  async chat(messages: ChatMessage[], tools?: Tool[]): Promise<AIResponse> {
    try {
      // Convert tools to Anthropic format
      const anthropicTools = tools ? this.convertToolsToProviderFormat(tools) : [];
      
      // Convert messages to Anthropic format
      const anthropicMessages = this.convertMessagesToProviderFormat(messages);
      
      // Send message to Anthropic
      const response = await this.client.messages.create({
        model: this.config.model || 'claude-3-5-sonnet-20241022',
        max_tokens: this.config.maxTokens || 4096,
        temperature: this.config.temperature || 0.7,
        messages: anthropicMessages,
      });

      const message = response.content[0];

      // Extract function calls
      const functionCalls = (message as any).type === 'tool_use' ? [{
        name: (message as any).name,
        args: (message as any).input,
      }] : undefined;

      return {
        text: message.type === 'text' ? message.text : undefined,
        functionCalls,
        model: response.model,
        finishReason: response.stop_reason,
        usage: {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        },
      };
    } catch (error) {
      console.error('Anthropic chat error:', error);
      throw error;
    }
  }

  async generateContent(prompt: string, options?: any): Promise<string> {
    try {
      const response = await this.client.messages.create({
        model: options?.model || this.config.model || 'claude-3-5-sonnet-20241022',
        max_tokens: options?.maxTokens || this.config.maxTokens || 4096,
        temperature: options?.temperature || this.config.temperature || 0.7,
        messages: [{ role: 'user', content: prompt }],
      });

      const message = response.content[0];
      return message.type === 'text' ? message.text : '';
    } catch (error) {
      console.error('Anthropic generateContent error:', error);
      throw error;
    }
  }

  async *streamResponse(messages: ChatMessage[], tools?: Tool[]): AsyncIterable<AIResponse> {
    try {
      // Convert tools to Anthropic format
      const anthropicTools = tools ? this.convertToolsToProviderFormat(tools) : [];
      
      // Convert messages to Anthropic format
      const anthropicMessages = this.convertMessagesToProviderFormat(messages);
      
      // Create streaming completion
      const stream = await this.client.messages.create({
        model: this.config.model || 'claude-3-5-sonnet-20241022',
        max_tokens: this.config.maxTokens || 4096,
        temperature: this.config.temperature || 0.7,
        messages: anthropicMessages,
        stream: true,
      });

      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          yield {
            text: chunk.delta.text,
            model: this.config.model || 'claude-3-5-sonnet-20241022',
          };
        }
      }
    } catch (error) {
      console.error('Anthropic streamResponse error:', error);
      throw error;
    }
  }

  async embeddings(text: string): Promise<number[]> {
    // Anthropic doesn't have a direct embeddings API
    // This would need to be implemented using a different service
    throw new Error('Anthropic does not provide embeddings API');
  }

  // Helper methods for Anthropic-specific conversions
  protected convertToolsToProviderFormat(tools: Tool[]): any[] {
    return tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema,
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
            content: [{
              type: 'tool_use',
              id: `tool_${Date.now()}`,
              name: msg.functionCall.name,
              input: msg.functionCall.args,
            }],
          };
        case 'tool_result':
          return { 
            role: 'user', 
            content: [{
              type: 'tool_result',
              tool_use_id: `tool_${Date.now()}`,
              content: JSON.stringify(msg.toolResult),
            }],
          };
        default:
          return { role: 'user', content: 'Unknown message type' };
      }
    });
  }
}
