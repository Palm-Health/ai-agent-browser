// Example PII-safe logging utility for context analysis
// This demonstrates how to log analysis results without exposing sensitive data

export function logAnalysisResult(result: any, context: string = 'analyzeContext.result') {
  // Only log flags and metadata, never raw user text or regex match groups
  console.info(context, {
    type: result.type,
    complexity: result.complexity,
    privacyLevel: result.privacyLevel,
    domains: result.detectedDomains,
    tokens: { 
      in: result.expectedInputTokens, 
      out: result.expectedOutputTokens 
    },
    time: result.timeConstraint,
    confidence: result.confidence,
    reasons: result.reasons, // generic cues only
    requiresPrivacy: result.requiresPrivacy
  });
  
  // NEVER log:
  // - result.rawText or any user input
  // - regex match groups or extracted PII
  // - specific privacy patterns that matched
  // - any content that could contain sensitive data
}

// Example usage in your router or other services:
/*
import { analyzeContext } from './contextAnalyzer';
import { logAnalysisResult } from './logger';

const analysis = analyzeContext({ messages, tools, privacyMode });
logAnalysisResult(analysis, 'model-selection.analysis');
*/
