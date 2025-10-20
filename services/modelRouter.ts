import { AIModel, AICapability, ChatMessage, Tool } from '../types';
import { aiProviderRegistry } from './aiProvider';
import { intelligentRouter, RoutingContext, ModelPerformance } from './intelligentRouter';
import { analyzeContext, TaskAnalysis } from './contextAnalyzer';
import { userPreferenceService } from './userPreferenceService';
import { configService } from './config';

export interface TaskComplexity {
  level: 'simple' | 'moderate' | 'complex';
  reasoningRequired: boolean;
  toolUseRequired: boolean;
  visionRequired: boolean;
  contextLength: number;
  estimatedTokens: number;
}

export class ModelRouter {
  private performanceMetrics: Map<string, { successRate: number; avgLatency: number; totalRequests: number }> = new Map();
  private costTracker: Map<string, number> = new Map();

  constructor() {
    // Don't initialize metrics immediately - wait for providers to be registered
  }

  private initializeMetrics(): void {
    // Clear existing metrics
    this.performanceMetrics.clear();
    this.costTracker.clear();
    
    // Initialize metrics for all available models
    const allModels = aiProviderRegistry.getAllModels();
    if (allModels.length === 0) {
      console.warn('No AI models available. Please configure API keys or check provider initialization.');
      return;
    }
    
    for (const model of allModels) {
      this.performanceMetrics.set(model.id, {
        successRate: 1.0,
        avgLatency: 1000, // 1 second default
        totalRequests: 0,
      });
      this.costTracker.set(model.id, 0);
    }
    
    console.log(`Model router initialized with ${allModels.length} models:`, allModels.map(m => m.name));
  }

  async selectModel(
    messages: ChatMessage[],
    tools: Tool[] = [],
    maxCost?: number,
    preferredCapabilities?: AICapability[],
    userOverride?: { privacyMode?: string; maxCost?: number }
  ): Promise<AIModel> {
    // Initialize metrics if not already done
    if (this.performanceMetrics.size === 0) {
      this.initializeMetrics();
    }
    
    // Use intelligent routing
    const config = configService.getConfig();
    const routingPrefs = config.routingPreferences;
    
    // Analyze context using new context analyzer
    const taskAnalysis = analyzeContext({ messages, tools });
    const systemContext = { privacyMode: taskAnalysis.privacyLevel };
    const privacyLevel = taskAnalysis.privacyLevel;
    
    // Build routing context
    const complexity = this.analyzeTaskComplexity(messages, tools);
    const requiredCapabilities = this.determineRequiredCapabilities(complexity, tools, preferredCapabilities);
    
    // Convert performance metrics to ModelPerformance format
    const previousModelPerformance = new Map<string, ModelPerformance>();
    for (const [modelId, metrics] of this.performanceMetrics.entries()) {
      previousModelPerformance.set(modelId, {
        successRate: metrics.successRate,
        avgLatency: metrics.avgLatency,
        avgCost: this.costTracker.get(modelId) || 0,
        lastUsed: new Date(),
        taskTypeSuccess: new Map(),
      });
    }
    
    const routingContext: RoutingContext = {
      taskComplexity: complexity,
      taskAnalysis,
      requiredCapabilities,
      privacyMode: (userOverride?.privacyMode as any) || routingPrefs.privacyMode,
      costBudget: userOverride?.maxCost || maxCost || routingPrefs.defaultCostBudget,
      maxResponseTime: routingPrefs.maxResponseTime,
      systemContext,
      privacyLevel,
      previousModelPerformance,
    };
    
    // Check user preferences if learning is enabled
    if (routingPrefs.learningEnabled) {
      const preferredModel = userPreferenceService.getPreferredModelForContext(routingContext);
      if (preferredModel) {
        const model = aiProviderRegistry.getAllModels().find(m => m.id === preferredModel);
        if (model) {
          console.log(`📚 Using learned preference: ${model.name}`);
          return model;
        }
      }
    }
    
    // Use intelligent router
    const decision = await intelligentRouter.selectOptimalModel(routingContext);
    console.log(`🎯 ${decision.reasoning}`);
    
    return decision.model;
  }

  private analyzeTaskComplexity(messages: ChatMessage[], tools: Tool[]): TaskComplexity {
    const lastMessage = messages[messages.length - 1];
    const messageText = lastMessage?.type === 'user' ? lastMessage.text : '';
    
    // Analyze message length and complexity
    const wordCount = messageText.split(/\s+/).length;
    const hasQuestions = messageText.includes('?');
    const hasMultipleSteps = messageText.includes('then') || messageText.includes('next') || messageText.includes('after');
    const hasComplexReasoning = messageText.includes('analyze') || messageText.includes('compare') || messageText.includes('explain');
    
    // Determine complexity level
    let level: 'simple' | 'moderate' | 'complex';
    if (wordCount < 20 && !hasQuestions && !hasMultipleSteps) {
      level = 'simple';
    } else if (wordCount < 100 && !hasComplexReasoning) {
      level = 'moderate';
    } else {
      level = 'complex';
    }

    // Check for vision requirements
    const visionRequired = messageText.includes('image') || messageText.includes('screenshot') || 
                          messageText.includes('visual') || messageText.includes('see');

    // Estimate context length
    const contextLength = messages.reduce((total, msg) => {
      if (msg.type === 'user' || msg.type === 'agent') {
        return total + (msg.text?.length || 0);
      }
      return total;
    }, 0);

    // Estimate tokens (rough approximation: 1 token ≈ 4 characters)
    const estimatedTokens = Math.ceil(contextLength / 4) + 200; // Add buffer for response

    return {
      level,
      reasoningRequired: hasComplexReasoning || level === 'complex',
      toolUseRequired: tools.length > 0,
      visionRequired,
      contextLength,
      estimatedTokens,
    };
  }

  private determineRequiredCapabilities(
    complexity: TaskComplexity,
    tools: Tool[],
    preferredCapabilities?: AICapability[]
  ): AICapability[] {
    const capabilities: AICapability[] = [AICapability.TEXT_GENERATION];

    if (complexity.toolUseRequired) {
      capabilities.push(AICapability.FUNCTION_CALLING);
    }

    if (complexity.visionRequired) {
      capabilities.push(AICapability.VISION);
    }

    if (complexity.reasoningRequired) {
      capabilities.push(AICapability.REASONING);
    }

    if (preferredCapabilities) {
      capabilities.push(...preferredCapabilities);
    }

    return [...new Set(capabilities)]; // Remove duplicates
  }

  private getSuitableModels(requiredCapabilities: AICapability[], maxCost?: number): AIModel[] {
    const allModels = aiProviderRegistry.getAllModels();
    
    return allModels.filter(model => {
      // Check capabilities
      const hasAllCapabilities = requiredCapabilities.every(cap => 
        model.capabilities.includes(cap)
      );

      // Check cost constraint
      const withinCostLimit = !maxCost || model.costPerToken <= maxCost;

      // Check context window (basic check)
      const hasEnoughContext = model.contextWindow >= 2000; // Minimum context window

      return hasAllCapabilities && withinCostLimit && hasEnoughContext;
    });
  }

  private calculateModelScore(
    model: AIModel,
    complexity: TaskComplexity,
    requiredCapabilities: AICapability[]
  ): number {
    const metrics = this.performanceMetrics.get(model.id);
    if (!metrics) return 0;

    let score = 0;

    // Performance score (40% weight)
    score += metrics.successRate * 40;

    // Latency score (20% weight) - lower latency is better
    const latencyScore = Math.max(0, 20 - (metrics.avgLatency / 100)); // Convert to score
    score += latencyScore;

    // Cost score (20% weight) - lower cost is better
    const costScore = Math.max(0, 20 - (model.costPerToken * 10000)); // Scale cost
    score += costScore;

    // Capability match score (20% weight)
    const capabilityScore = (requiredCapabilities.filter(cap => 
      model.capabilities.includes(cap)
    ).length / requiredCapabilities.length) * 20;
    score += capabilityScore;

    // Bonus for models with more capabilities (up to 10 points)
    const capabilityBonus = Math.min(10, model.capabilities.length * 2);
    score += capabilityBonus;

    return score;
  }

  // Performance tracking
  recordModelPerformance(modelId: string, success: boolean, latency: number, cost: number): void {
    const metrics = this.performanceMetrics.get(modelId);
    if (!metrics) return;

    // Update success rate
    metrics.totalRequests++;
    if (success) {
      metrics.successRate = (metrics.successRate * (metrics.totalRequests - 1) + 1) / metrics.totalRequests;
    } else {
      metrics.successRate = (metrics.successRate * (metrics.totalRequests - 1)) / metrics.totalRequests;
    }

    // Update average latency
    metrics.avgLatency = (metrics.avgLatency * (metrics.totalRequests - 1) + latency) / metrics.totalRequests;

    // Update cost tracking
    const currentCost = this.costTracker.get(modelId) || 0;
    this.costTracker.set(modelId, currentCost + cost);
  }

  getModelPerformance(modelId: string): { successRate: number; avgLatency: number; totalRequests: number; totalCost: number } | undefined {
    const metrics = this.performanceMetrics.get(modelId);
    const cost = this.costTracker.get(modelId) || 0;
    
    if (!metrics) return undefined;

    return {
      ...metrics,
      totalCost: cost,
    };
  }

  getAllModelPerformance(): Map<string, { successRate: number; avgLatency: number; totalRequests: number; totalCost: number }> {
    const result = new Map();
    
    for (const [modelId, metrics] of this.performanceMetrics.entries()) {
      const cost = this.costTracker.get(modelId) || 0;
      result.set(modelId, {
        ...metrics,
        totalCost: cost,
      });
    }

    return result;
  }

  // Fallback chain
  async executeWithFallback(
    messages: ChatMessage[],
    tools: Tool[] = [],
    maxCost?: number,
    preferredCapabilities?: AICapability[]
  ): Promise<{ model: AIModel; result: any }> {
    const primaryModel = await this.selectModel(messages, tools, maxCost, preferredCapabilities);
    
    try {
      const provider = aiProviderRegistry.getProvider(primaryModel.provider);
      if (!provider) {
        throw new Error(`Provider ${primaryModel.provider} not found`);
      }

      const startTime = Date.now();
      const result = await provider.chat(messages, tools);
      const latency = Date.now() - startTime;
      
      // Record successful performance
      this.recordModelPerformance(primaryModel.id, true, latency, 0); // Cost calculation would be done elsewhere
      
      return { model: primaryModel, result };
    } catch (error) {
      console.error(`Primary model ${primaryModel.id} failed:`, error);
      
      // Record failed performance
      this.recordModelPerformance(primaryModel.id, false, 0, 0);
      
      // Try fallback models
      const fallbackModels = this.getSuitableModels(
        this.determineRequiredCapabilities(
          this.analyzeTaskComplexity(messages, tools),
          tools,
          preferredCapabilities
        ),
        maxCost
      ).filter(m => m.id !== primaryModel.id);

      for (const fallbackModel of fallbackModels) {
        try {
          const provider = aiProviderRegistry.getProvider(fallbackModel.provider);
          if (!provider) continue;

          const startTime = Date.now();
          const result = await provider.chat(messages, tools);
          const latency = Date.now() - startTime;
          
          // Record successful performance
          this.recordModelPerformance(fallbackModel.id, true, latency, 0);
          
          return { model: fallbackModel, result };
        } catch (fallbackError) {
          console.error(`Fallback model ${fallbackModel.id} failed:`, fallbackError);
          this.recordModelPerformance(fallbackModel.id, false, 0, 0);
        }
      }

      throw new Error('All models failed to process the request');
    }
  }

  // Reset metrics
  resetMetrics(): void {
    this.performanceMetrics.clear();
    this.costTracker.clear();
    this.initializeMetrics();
  }

  // Public method to reinitialize metrics
  reinitializeMetrics(): void {
    this.initializeMetrics();
  }
}

export const modelRouter = new ModelRouter();
