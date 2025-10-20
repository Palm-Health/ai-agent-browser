import { BaseAIProvider, ProviderConfig } from '../aiProvider';
import { AIModel, AICapability, AIResponse, ChatMessage, Tool } from '../../types';

export class MockAIProvider extends BaseAIProvider {
  name = 'mock';
  
  models: AIModel[] = [
    {
      id: 'mock-model',
      name: 'Mock AI Model',
      provider: 'mock',
      capabilities: [AICapability.TEXT_GENERATION, AICapability.FUNCTION_CALLING],
      contextWindow: 4000,
      costPerToken: 0.000001,
      maxTokens: 2048,
      supportsVision: false,
      supportsFunctionCalling: true,
    },
  ];

  capabilities: AICapability[] = [
    AICapability.TEXT_GENERATION,
    AICapability.FUNCTION_CALLING,
  ];

  constructor(config: ProviderConfig) {
    super(config);
  }

  async chat(messages: ChatMessage[], tools?: Tool[]): Promise<AIResponse> {
    const lastMessage = messages[messages.length - 1];
    const messageText = lastMessage?.type === 'user' ? lastMessage.text : '';

    // Simple mock responses based on message content
    let responseText = '';
    let functionCalls = undefined;

    if (messageText.toLowerCase().includes('search')) {
      responseText = `I'll help you search for information. Let me use the search tool to find what you're looking for.`;
      functionCalls = [{
        name: 'google_search',
        args: { query: messageText.replace(/search\s+for\s+/i, '') }
      }];
    } else if (messageText.toLowerCase().includes('navigate') || messageText.toLowerCase().includes('go to')) {
      responseText = `I'll navigate to the requested page for you.`;
      functionCalls = [{
        name: 'navigate_to_url',
        args: { url: 'https://www.google.com' }
      }];
    } else if (messageText.toLowerCase().includes('plan')) {
      responseText = `I'll create a plan to accomplish your task.`;
      functionCalls = [{
        name: 'create_plan',
        args: {
          steps: [
            { functionCall: { name: 'navigate_to_url', args: { url: 'https://www.google.com' } } },
            { functionCall: { name: 'read_page_content', args: {} } }
          ]
        }
      }];
    } else {
      responseText = `I understand you want me to help with: "${messageText}". I'm ready to assist you with browser automation tasks. You can ask me to search for information, navigate to websites, or perform other web-based tasks.`;
    }

    return {
      text: responseText,
      functionCalls,
      model: 'mock-model',
      finishReason: 'stop',
    };
  }

  async generateContent(prompt: string, options?: any): Promise<string> {
    return `Mock response to: ${prompt}`;
  }

  async *streamResponse(messages: ChatMessage[], tools?: Tool[]): AsyncIterable<AIResponse> {
    const response = await this.chat(messages, tools);
    yield response;
  }

  async embeddings(text: string): Promise<number[]> {
    // Return mock embeddings (random numbers)
    return Array.from({ length: 768 }, () => Math.random() - 0.5);
  }
}
