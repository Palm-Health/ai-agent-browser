// Example integration with model router
// This shows how the enhanced contextAnalyzer can be used with model selection

import { analyzeContext, TaskAnalysis } from './contextAnalyzer';

export interface ModelSelectionContext {
  analysis: TaskAnalysis;
  availableModels: Array<{
    name: string;
    isLocal: boolean;
    tags: string[];
    costPerToken: number;
    speed: 'fast' | 'medium' | 'slow';
  }>;
}

export function selectOptimalModel(context: ModelSelectionContext) {
  const { analysis, availableModels } = context;
  
  // Pre-filter based on privacy requirements
  let candidates = availableModels;
  if (analysis.requiresPrivacy || analysis.privacyLevel === 'strict') {
    candidates = candidates.filter(m => m.isLocal);
  }
  
  // Filter by domain expertise if available
  if (analysis.detectedDomains && analysis.detectedDomains.length > 0) {
    candidates = candidates.filter(m => 
      analysis.detectedDomains!.some(domain => m.tags.includes(domain))
    );
  }
  
  // Consider time constraints
  if (analysis.timeConstraint === 'realtime') {
    candidates = candidates.filter(m => m.speed === 'fast');
  }
  
  // Cost estimation based on token predictions
  const estimatedCost = candidates.map(m => ({
    model: m,
    cost: (analysis.expectedInputTokens * m.costPerToken) + 
          (analysis.expectedOutputTokens * m.costPerToken)
  }));
  
  // Choose based on confidence and cost
  if (analysis.confidence < 0.7) {
    // Low confidence - prefer robust models
    return estimatedCost
      .filter(c => c.model.tags.includes('robust'))
      .sort((a, b) => a.cost - b.cost)[0]?.model;
  }
  
  // High confidence - optimize for cost
  return estimatedCost
    .sort((a, b) => a.cost - b.cost)[0]?.model;
}

// Example usage:
/*
const analysis = analyzeContext({
  messages: [{ role: 'user', content: 'Analyze this patient data for HIPAA compliance' }],
  tools: ['browser'],
  privacyMode: 'balanced'
});

const optimalModel = selectOptimalModel({
  analysis,
  availableModels: [
    { name: 'gpt-4', isLocal: false, tags: ['general'], costPerToken: 0.03, speed: 'medium' },
    { name: 'claude-local', isLocal: true, tags: ['medical', 'robust'], costPerToken: 0.01, speed: 'slow' },
    { name: 'gemini-pro', isLocal: false, tags: ['general'], costPerToken: 0.02, speed: 'fast' }
  ]
});
*/
