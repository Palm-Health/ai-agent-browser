import { AIModel, AICapability, ChatMessage, Tool, Pricing } from '../types';
import { aiProviderRegistry } from './aiProvider';
import { TaskComplexity } from './modelRouter';
import { TaskAnalysis, SystemContext, PrivacyLevel } from './contextAnalyzer';
import { ROUTING_WEIGHTS } from './config';

export interface ModelPerformance {
  successRate: number;
  avgLatency: number;
  avgCost: number;
  lastUsed: Date;
  taskTypeSuccess: Map<string, number>;
  // G7: Per-task-type buckets with EWMA
  taskBuckets?: Map<string, {
    successRate: number;
    avgLatency: number;
    sampleCount: number;
  }>;
}

export interface RoutingContext {
  // Task context
  taskComplexity: TaskComplexity;
  taskAnalysis: TaskAnalysis;
  requiredCapabilities: AICapability[];
  
  // User preferences
  privacyMode: 'strict' | 'balanced' | 'performance';
  costBudget: number;
  maxResponseTime?: number;
  
  // System context
  systemContext: SystemContext;
  privacyLevel: PrivacyLevel;
  
  // Historical data
  previousModelPerformance: Map<string, ModelPerformance>;
  
  // G2: Token estimates for cost calculation
  messages: any[];
  tools?: any[];
  expectedInputTokens?: number;
  expectedOutputTokens?: number;
}

// G4: Enhanced decision with structured reasoning
export interface RoutingDecision {
  model: AIModel;
  score: number;
  reasoning: string; // human-readable
  confidence: number;
  // G4: Machine-readable structured reason
  structuredReason: {
    privacyGate: 'strict' | 'moderate' | 'none';
    dominantFactors: string[]; // e.g., ['complexity','cost']
    expectedCostUSD?: number;
    estimates: { inTok: number; outTok: number };
  };
  // G4: Compact alternatives
  alternatives: Array<{
    id: string;
    isLocal: boolean;
    score: number;
    notes?: string[];
  }>;
}

// G3: Helper functions for normalized scoring
const clamp = (n: number, min = 0, max = 1): number => Math.min(max, Math.max(min, n));
const normLatency = (ms: number): number => 1 - clamp(ms / ROUTING_WEIGHTS.latencyMaxMs);

// G7: EWMA (Exponentially Weighted Moving Average) for adaptive performance tracking
function ewma(prev: number | undefined, sample: number, alpha = 0.3): number {
  return prev === undefined ? sample : alpha * sample + (1 - alpha) * prev;
}

// G2: Cost estimation function
function estimateCostUSD(model: AIModel, ctx: RoutingContext): number {
  if (!model.pricing) {
    // Fallback to legacy costPerToken if pricing not available
    const avgTokens = (ctx.expectedInputTokens ?? 800) + (ctx.expectedOutputTokens ?? 600);
    return model.costPerToken * avgTokens;
  }
  
  const inTok = Math.max(0, ctx.expectedInputTokens ?? 800);
  const outTok = Math.max(0, ctx.expectedOutputTokens ?? 600);
  const p = model.pricing;
  
  return (p.perCall ?? 0) + (inTok / 1000) * (p.inputPer1k ?? 0) + (outTok / 1000) * (p.outputPer1k ?? 0);
}

export class IntelligentRouter {
  private cumulativeCost: number = 0;
  private sessionStartTime: Date = new Date();
  private modelProvider?: () => AIModel[]; // For testing/dependency injection
  
  // Allow dependency injection for testing
  setModelProvider(provider: () => AIModel[]): void {
    this.modelProvider = provider;
  }
  
  clearModelProvider(): void {
    this.modelProvider = undefined;
  }
  
  async selectOptimalModel(context: RoutingContext): Promise<RoutingDecision> {
    console.log('🧠 Intelligent Router: Analyzing context for optimal model selection');
    
    // G5: HARD PRE-FILTER - Privacy gate comes BEFORE scoring
    const privacyGate = this.determinePrivacyGate(context);
    const allModels = this.modelProvider ? this.modelProvider() : aiProviderRegistry.getAllModels();
    let candidateModels = this.applyPrivacyGate(
      allModels,
      privacyGate
    );
    
    if (candidateModels.length === 0) {
      throw new Error('No models available after applying privacy gate');
    }
    
    // Step 2: Filter by required capabilities
    candidateModels = candidateModels.filter(model =>
      context.requiredCapabilities.every(cap => model.capabilities.includes(cap))
    );
    
    if (candidateModels.length === 0) {
      throw new Error('No models available with required capabilities');
    }
    
    // Step 3: Apply cost budget constraints
    candidateModels = this.filterByCostBudget(candidateModels, context);
    
    if (candidateModels.length === 0) {
      // If budget exceeded, fall back to local models
      console.warn('Cost budget exceeded, falling back to local models');
      candidateModels = aiProviderRegistry.getAllModels().filter(m => m.isLocal);
    }
    
    // Step 4: Score all candidate models
    const scoredModels = candidateModels.map(model => ({
      model,
      score: this.calculateContextualScore(model, context),
    }));
    
    // Sort by score (highest first)
    scoredModels.sort((a, b) => b.score - a.score);
    
    // G4: Determine dominant factors
    const dominantFactors = this.identifyDominantFactors(context);
    
    // G4 & G5: Generate safe reasoning (no PII)
    const selectedModel = scoredModels[0].model;
    const selectedScore = scoredModels[0].score;
    const reasoning = this.generateSafeReasoning(selectedModel, context, selectedScore, privacyGate);
    
    // G4: Expected cost
    const expectedCostUSD = selectedModel.isLocal ? 0 : estimateCostUSD(selectedModel, context);
    
    // G4: Build structured alternatives
    const alternatives = scoredModels.slice(1, 4).map(alt => ({
      id: alt.model.id,
      isLocal: alt.model.isLocal,
      score: alt.score,
      notes: this.generateAlternativeNotes(alt.model, context),
    }));
    
    return {
      model: selectedModel,
      score: selectedScore,
      reasoning,
      confidence: selectedScore / 100, // Normalize to 0-1
      structuredReason: {
        privacyGate,
        dominantFactors,
        expectedCostUSD,
        estimates: {
          inTok: context.expectedInputTokens ?? 800,
          outTok: context.expectedOutputTokens ?? 600,
        },
      },
      alternatives,
    };
  }
  
  // G5: Determine privacy gate level
  private determinePrivacyGate(context: RoutingContext): 'strict' | 'moderate' | 'none' {
    if (context.privacyMode === 'strict' || 
        context.privacyLevel === 'strict' || 
        context.taskAnalysis.requiresPrivacy) {
      return 'strict';
    }
    
    if (context.privacyMode === 'balanced' && context.privacyLevel === 'moderate') {
      return 'moderate';
    }
    
    return 'none';
  }
  
  // G5: Hard privacy gate - filter BEFORE scoring
  private applyPrivacyGate(
    models: AIModel[],
    gate: 'strict' | 'moderate' | 'none'
  ): AIModel[] {
    switch (gate) {
      case 'strict':
        // HARD CONSTRAINT: Only local models
        console.log('🔒 Privacy gate: STRICT - local models only');
        return models.filter(m => m.isLocal);
      
      case 'moderate':
        // Prefer local but allow remote
        console.log('🔒 Privacy gate: MODERATE - preferring local');
        const localModels = models.filter(m => m.isLocal);
        return localModels.length > 0 ? localModels : models;
      
      case 'none':
      default:
        // All models available
        return models;
    }
  }
  
  private filterByCostBudget(models: AIModel[], context: RoutingContext): AIModel[] {
    // G2: Use real pricing and budget estimation
    const remainingBudget = context.costBudget - this.cumulativeCost;
    
    if (remainingBudget <= 0) {
      console.warn('💰 Cost budget exhausted, filtering to local models');
      return models.filter(m => m.isLocal);
    }
    
    // Hard filter: exclude models costing > 150% of remaining budget
    const hardLimit = remainingBudget * 1.5;
    
    return models.filter(m => {
      if (m.isLocal) return true; // Always include local models
      const estimatedCost = estimateCostUSD(m, context);
      return estimatedCost <= hardLimit;
    });
  }
  
  private calculateContextualScore(model: AIModel, context: RoutingContext): number {
    // G3: Normalized scoring with bounded components [0..100]
    let totalScore = 0;
    
    // 1. Task complexity match (30 points max)
    const complexityScore = this.scoreComplexityMatch(model, context.taskAnalysis);
    totalScore += complexityScore * ROUTING_WEIGHTS.complexity;
    
    // 2. Performance metrics (25 points max)
    const performanceScore = this.scorePerformance(model, context);
    totalScore += performanceScore * ROUTING_WEIGHTS.performance;
    
    // 3. Cost efficiency (20 points max)
    const costScore = this.scoreCostEfficiency(model, context);
    totalScore += costScore * ROUTING_WEIGHTS.cost;
    
    // 4. System context match (15 points max)
    const systemScore = this.scoreSystemContext(model, context.systemContext);
    totalScore += systemScore * ROUTING_WEIGHTS.system;
    
    // 5. Capability match (10 points max)
    const capabilityScore = this.scoreCapabilityMatch(model, context.requiredCapabilities);
    totalScore += capabilityScore * ROUTING_WEIGHTS.capability;
    
    // Add tiny random tiebreaker
    totalScore += Math.random() * ROUTING_WEIGHTS.tieBreaker;
    
    // Clamp final score to [0..100]
    return clamp(totalScore, 0, 100);
  }
  
  private scoreComplexityMatch(model: AIModel, taskAnalysis: TaskAnalysis): number {
    // G3: Normalized scoring [0..1] using tags instead of hardcoded IDs
    let score = 0.5; // Base score
    
    const tags = model.tags || [];
    const hasTag = (tag: string) => tags.includes(tag);
    
    // Match model to task complexity
    switch (taskAnalysis.complexity) {
      case 'low':
        // Simple tasks: prefer fast local models
        if (model.isLocal) {
          score = 1.0;
          if (hasTag('fast')) score += 0.1; // Bonus for fast models
        } else {
          score = 0.5; // API models work but not optimal
        }
        break;
        
      case 'medium':
        // Medium tasks: balanced approach - both local and remote work
        if (model.isLocal && hasTag('reasoning')) {
          score = 0.85; // Good local reasoning model
        } else if (!model.isLocal && hasTag('reasoning')) {
          score = 1.0; // Optimal: API reasoning model
        } else {
          score = 0.7;
        }
        break;
        
      case 'high':
        // Complex tasks: prefer powerful API models
        if (!model.isLocal) {
          score = 1.0;
          if (hasTag('reasoning')) score += 0.15; // Bonus for reasoning capability
        } else if (hasTag('reasoning')) {
          score = 0.7; // Local reasoning models can still handle
        } else {
          score = 0.3;
        }
        break;
    }
    
    // Task type bonuses using tags
    if (taskAnalysis.type === 'code_generation' && hasTag('codegen')) {
      score += 0.15;
    } else if (taskAnalysis.type === 'medical' && hasTag('medical')) {
      score += 0.3; // Strong bonus for specialized medical models
    }
    
    return clamp(score, 0, 1);
  }
  
  private scorePerformance(model: AIModel, context: RoutingContext): number {
    // G7: Use task-specific buckets when available, fall back to global
    const performance = context.previousModelPerformance.get(model.id);
    
    if (!performance) {
      return 0.6; // Default score for untested models (slightly above average)
    }
    
    // G7: Prefer task-specific bucket if available and has enough samples
    const taskType = context.taskAnalysis.type;
    const taskBucket = performance.taskBuckets?.get(taskType);
    
    let successRate: number;
    let latency: number;
    
    if (taskBucket && taskBucket.sampleCount >= 3) {
      // Use task-specific metrics (EWMA-smoothed)
      successRate = taskBucket.successRate;
      latency = taskBucket.avgLatency;
    } else {
      // Fall back to global metrics
      successRate = performance.successRate;
      latency = performance.avgLatency;
    }
    
    // Success rate component [0..1]
    const successComponent = clamp(successRate, 0, 1);
    
    // Latency component [0..1] (normalized using ROUTING_WEIGHTS.latencyMaxMs)
    const latencyComponent = normLatency(latency);
    
    // Combine: 70% success rate, 30% latency
    return clamp(successComponent * 0.7 + latencyComponent * 0.3, 0, 1);
  }
  
  private scoreCostEfficiency(model: AIModel, context: RoutingContext): number {
    // G3: Normalized cost scoring [0..1] with soft budget penalty
    if (model.isLocal) {
      return 1.0; // Local models are free, max score
    }
    
    const estimatedCost = estimateCostUSD(model, context);
    const remainingBudget = context.costBudget - this.cumulativeCost;
    
    // Soft penalty: gradually reduce score as we approach budget
    if (estimatedCost >= remainingBudget) {
      // Over budget: penalty score
      const overageRatio = estimatedCost / Math.max(remainingBudget, 0.0001);
      return clamp(1.0 - (overageRatio - 1.0), 0, 0.3); // Max 0.3 when over budget
    } else {
      // Within budget: score based on how much budget we're using
      const usageRatio = estimatedCost / remainingBudget;
      return clamp(1.0 - usageRatio * 0.5, 0.5, 1.0); // Scale from 0.5 to 1.0
    }
  }
  
  private scoreCapabilityMatch(model: AIModel, requiredCapabilities: AICapability[]): number {
    // G3: Normalized capability matching [0..1]
    if (requiredCapabilities.length === 0) {
      return 1.0; // No specific requirements
    }
    
    const matchedCount = requiredCapabilities.filter(cap =>
      model.capabilities.includes(cap)
    ).length;
    
    return matchedCount / requiredCapabilities.length;
  }
  
  private scoreSystemContext(model: AIModel, systemContext: SystemContext): number {
    // G3: Normalized system context scoring [0..1]
    let score = 0.7; // Neutral base score
    
    // Battery considerations
    if (systemContext.isOnBattery && systemContext.batteryLevel && systemContext.batteryLevel < 20) {
      // Low battery: prefer API models to save power
      score += model.isLocal ? -0.3 : 0.3;
    }
    
    // Network quality considerations
    if (systemContext.networkQuality === 'poor') {
      // Poor network: prefer local models
      score += model.isLocal ? 0.3 : -0.4;
    } else if (systemContext.networkQuality === 'excellent') {
      // Excellent network: API models work well
      score += model.isLocal ? 0 : 0.2;
    }
    
    // Time of day (off-peak hours might favor API models)
    if (systemContext.timeOfDay >= 22 || systemContext.timeOfDay <= 6) {
      // Late night/early morning: potentially better API performance
      score += model.isLocal ? 0 : 0.1;
    }
    
    return clamp(score, 0, 1);
  }
  
  // G4: Identify dominant factors that drove the decision
  private identifyDominantFactors(context: RoutingContext): string[] {
    const factors: string[] = [];
    
    // Privacy is always dominant if active
    if (context.taskAnalysis.requiresPrivacy || context.privacyMode === 'strict') {
      factors.push('privacy');
    }
    
    // Complexity is key for high/low tasks
    if (context.taskAnalysis.complexity === 'high' || context.taskAnalysis.complexity === 'low') {
      factors.push('complexity');
    }
    
    // Cost matters when budget is tight
    const remainingBudget = context.costBudget - this.cumulativeCost;
    if (remainingBudget < context.costBudget * 0.3) {
      factors.push('cost');
    }
    
    // System context matters in extreme cases
    if (context.systemContext.networkQuality === 'poor' || 
        (context.systemContext.isOnBattery && context.systemContext.batteryLevel && context.systemContext.batteryLevel < 20)) {
      factors.push('system');
    }
    
    // Default to performance if nothing else stands out
    if (factors.length === 0) {
      factors.push('performance');
    }
    
    return factors;
  }
  
  // G5: Generate safe reasoning without echoing user input or PII
  private generateSafeReasoning(
    model: AIModel, 
    context: RoutingContext, 
    score: number,
    privacyGate: 'strict' | 'moderate' | 'none'
  ): string {
    const reasons: string[] = [];
    const tags = model.tags || [];
    const hasTag = (tag: string) => tags.includes(tag);
    
    // G5: Privacy reasoning (generic, no details)
    if (privacyGate === 'strict') {
      reasons.push('privacy constraints active');
    }
    
    // Complexity reasoning
    if (context.taskAnalysis.complexity === 'low' && model.isLocal) {
      reasons.push('simple task suitable for fast local model');
    } else if (context.taskAnalysis.complexity === 'high' && !model.isLocal) {
      reasons.push('complex task benefits from advanced model');
    }
    
    // Cost reasoning (no exact figures that might leak context)
    if (model.isLocal) {
      reasons.push('zero cost local processing');
    } else {
      const remainingBudget = context.costBudget - this.cumulativeCost;
      if (remainingBudget < context.costBudget * 0.2) {
        reasons.push('cost budget consideration');
      }
    }
    
    // System context (generic)
    if (context.systemContext.networkQuality === 'poor' && model.isLocal) {
      reasons.push('network conditions favor local');
    }
    
    // Task type reasoning using tags (no user text)
    if (context.taskAnalysis.type === 'medical' && hasTag('medical')) {
      reasons.push('specialized for medical domain');
    } else if (context.taskAnalysis.type === 'code_generation' && hasTag('codegen')) {
      reasons.push('optimized for code generation');
    } else if (hasTag('reasoning') && context.taskAnalysis.complexity === 'high') {
      reasons.push('reasoning capability matches complexity');
    }
    
    const reasoningText = reasons.length > 0
      ? reasons.join(', ')
      : 'best overall match for task';
    
    return `Selected ${model.name} (score: ${score.toFixed(1)}): ${reasoningText}`;
  }
  
  // G4: Generate notes for alternative models
  private generateAlternativeNotes(model: AIModel, context: RoutingContext): string[] {
    const notes: string[] = [];
    const tags = model.tags || [];
    
    if (model.isLocal) {
      notes.push('Local');
    } else {
      const cost = estimateCostUSD(model, context);
      if (cost > 0.01) {
        notes.push('Premium');
      } else {
        notes.push('Low-cost');
      }
    }
    
    if (tags.includes('reasoning')) {
      notes.push('Reasoning');
    }
    if (tags.includes('codegen')) {
      notes.push('Code');
    }
    if (tags.includes('fast')) {
      notes.push('Fast');
    }
    
    return notes;
  }
  
  // Track cost for budget management
  recordCost(cost: number): void {
    this.cumulativeCost += cost;
  }
  
  getCumulativeCost(): number {
    return this.cumulativeCost;
  }
  
  resetCostTracking(): void {
    this.cumulativeCost = 0;
    this.sessionStartTime = new Date();
  }
  
  getSessionStats(): {
    duration: number;
    totalCost: number;
    avgCostPerMinute: number;
  } {
    const duration = Date.now() - this.sessionStartTime.getTime();
    const minutes = duration / 60000;
    
    return {
      duration,
      totalCost: this.cumulativeCost,
      avgCostPerMinute: minutes > 0 ? this.cumulativeCost / minutes : 0,
    };
  }
  
  // G7: Record performance with EWMA and task-specific buckets
  recordPerformance(
    modelId: string,
    taskType: string,
    success: boolean,
    latencyMs: number,
    cost: number,
    performanceMap: Map<string, ModelPerformance>
  ): void {
    let perf = performanceMap.get(modelId);
    
    if (!perf) {
      // Initialize new performance record
      perf = {
        successRate: success ? 1.0 : 0.0,
        avgLatency: latencyMs,
        avgCost: cost,
        lastUsed: new Date(),
        taskTypeSuccess: new Map(),
        taskBuckets: new Map(),
      };
      performanceMap.set(modelId, perf);
    } else {
      // G7: Update with EWMA
      perf.successRate = ewma(perf.successRate, success ? 1.0 : 0.0, 0.3);
      perf.avgLatency = ewma(perf.avgLatency, latencyMs, 0.3);
      perf.avgCost = ewma(perf.avgCost, cost, 0.3);
      perf.lastUsed = new Date();
    }
    
    // G7: Update task-specific bucket
    if (!perf.taskBuckets) {
      perf.taskBuckets = new Map();
    }
    
    let bucket = perf.taskBuckets.get(taskType);
    if (!bucket) {
      bucket = {
        successRate: success ? 1.0 : 0.0,
        avgLatency: latencyMs,
        sampleCount: 1,
      };
      perf.taskBuckets.set(taskType, bucket);
    } else {
      // EWMA for task bucket
      bucket.successRate = ewma(bucket.successRate, success ? 1.0 : 0.0, 0.3);
      bucket.avgLatency = ewma(bucket.avgLatency, latencyMs, 0.3);
      bucket.sampleCount += 1;
    }
  }
}

export const intelligentRouter = new IntelligentRouter();

