import { AIProvider, AIModel, AICapability, AIResponse, ChatMessage, Tool } from '../types';

export interface ProviderConfig {
  apiKey?: string;
  endpoint?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
}

export abstract class BaseAIProvider implements AIProvider {
  abstract name: string;
  abstract models: AIModel[];
  abstract capabilities: AICapability[];

  constructor(protected config: ProviderConfig) {}

  abstract chat(messages: ChatMessage[], tools?: Tool[]): Promise<AIResponse>;
  abstract generateContent(prompt: string, options?: any): Promise<string>;
  abstract streamResponse(messages: ChatMessage[], tools?: Tool[]): AsyncIterable<AIResponse>;
  abstract embeddings(text: string): Promise<number[]>;

  // Helper methods
  protected convertToolsToProviderFormat(tools: Tool[]): any[] {
    return tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
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
          return { role: 'assistant', function_call: msg.functionCall };
        case 'tool_result':
          return { role: 'function', name: 'tool_result', content: JSON.stringify(msg.toolResult) };
        default:
          return { role: 'system', content: 'Unknown message type' };
      }
    });
  }

  protected estimateCost(promptTokens: number, completionTokens: number, model: string): number {
    const modelInfo = this.models.find(m => m.id === model);
    if (!modelInfo) return 0;

    const promptCost = promptTokens * modelInfo.costPerToken;
    const completionCost = completionTokens * modelInfo.costPerToken;
    return promptCost + completionCost;
  }

  protected validateModel(modelId: string): boolean {
    return this.models.some(model => model.id === modelId);
  }

  protected getModelCapabilities(modelId: string): AICapability[] {
    const model = this.models.find(m => m.id === modelId);
    return model?.capabilities || [];
  }
}

export class AIProviderRegistry {
  private providers: Map<string, AIProvider> = new Map();

  registerProvider(provider: AIProvider): void {
    this.providers.set(provider.name, provider);
  }

  getProvider(name: string): AIProvider | undefined {
    return this.providers.get(name);
  }

  getAllProviders(): AIProvider[] {
    return Array.from(this.providers.values());
  }

  getAllModels(): AIModel[] {
    const allModels: AIModel[] = [];
    for (const provider of this.providers.values()) {
      allModels.push(...provider.models);
    }
    return allModels;
  }

  getModelsByCapability(capability: AICapability): AIModel[] {
    return this.getAllModels().filter(model => 
      model.capabilities.includes(capability)
    );
  }

  getBestModelForTask(requiredCapabilities: AICapability[], maxCost?: number): AIModel | undefined {
    const suitableModels = this.getAllModels().filter(model => {
      // Check if model has all required capabilities
      const hasAllCapabilities = requiredCapabilities.every(cap => 
        model.capabilities.includes(cap)
      );
      
      // Check cost constraint
      const withinCostLimit = !maxCost || model.costPerToken <= maxCost;
      
      return hasAllCapabilities && withinCostLimit;
    });

    if (suitableModels.length === 0) return undefined;

    // Sort by cost (prefer cheaper models) and return the first one
    return suitableModels.sort((a, b) => a.costPerToken - b.costPerToken)[0];
  }
}

export const aiProviderRegistry = new AIProviderRegistry();
