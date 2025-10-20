import { RX, detectPrivacySignals, containsAny, foldDiacritics, PRIVACY_TERMS, PrivacyDomain } from './analyzer/pii';
import { ANALYZER_CFG, TaskType, Complexity, TimeConstraint } from './analyzer/config';

const RX_CODE_BLOCK = /```[\s\S]*?```/m;
const RX_STACK_TRACE = /(Error|Exception|Traceback).+\n\s+at\s+/i;
const RX_CODE_FILE = /\b\w+\.(ts|tsx|js|jsx|py|java|rb|go|rs|c|cpp|h|hpp|json|yml|yaml|toml)\b/i;
const RX_JSON_OBJ = /\{[^]*?\}/m;
const RX_CSV_HEADER = /(^|[\n\r])[^,\n\r]{2,},[^,\n\r]{2,},[^,\n\r]{2,}(\n|\r|$)/;

export interface TaskAnalysis {
  type: TaskType;
  complexity: Complexity;
  requiresPrivacy: boolean;
  detectedDomains?: PrivacyDomain[];
  privacyLevel: 'strict'|'moderate'|'relaxed';
  expectedInputTokens: number;
  expectedOutputTokens: number;
  timeConstraint: TimeConstraint;
  confidence: number;     // 0..1
  reasons: string[];      // Non-PII cues only
}

export function analyzeContext(input: {
  messages: Array<{role:'user'|'assistant'|'system', content:string}>;
  tools?: string[];
  privacyMode?: 'strict'|'balanced'|'performance';
}): TaskAnalysis {
  const joined = (input.messages ?? []).map(m => m.content).join('\n');
  const text = joined.length > ANALYZER_CFG.maxScanChars
    ? joined.slice(0, ANALYZER_CFG.maxScanChars/2) + '\n...\n' + joined.slice(-ANALYZER_CFG.maxScanChars/2)
    : joined;

  // 1) Privacy
  const priv = detectPrivacySignals(text);
  const privacyLevel =
    input.privacyMode === 'strict' || priv.requiresPrivacy ? 'strict'
    : (priv.domains?.length ? 'moderate' : 'relaxed');

  // 2) Task type
  const type = detectTaskType(text, input.tools);

  // 3) Complexity
  const words = text.trim().split(/\s+/).length;
  const complexity = estimateComplexity(words, type, input.tools);

  // 4) Tokens
  const { inputTokens, outputTokens } = estimateTokens(text, type);

  // 5) Time constraint
  const timeConstraint = detectTimeConstraint(text);

  // 6) Confidence (simple blend)
  let confidence = 0.6;
  if (type === 'code_generation' || type === 'data_analysis') confidence += 0.2;
  if (complexity === 'high') confidence += 0.1;
  if (priv.requiresPrivacy) confidence += 0.05;
  confidence = Math.min(0.95, confidence);

  const reasons: string[] = [];
  if (RX_CODE_BLOCK.test(text)) reasons.push('code block detected');
  if (RX_JSON_OBJ.test(text)) reasons.push('json/object detected');
  if (RX_CSV_HEADER.test(text)) reasons.push('csv pattern detected');
  if (priv.requiresPrivacy) reasons.push('privacy signals present');
  if (complexity !== 'low') reasons.push('elevated complexity signals');

  return {
    type,
    complexity,
    requiresPrivacy: privacyLevel === 'strict',
    detectedDomains: priv.domains,
    privacyLevel,
    expectedInputTokens: inputTokens,
    expectedOutputTokens: outputTokens,
    timeConstraint,
    confidence,
    reasons,
  };
}

// ——— Helpers ———

export function detectTaskType(text: string, tools?: string[]): TaskType {
  if (RX_CODE_BLOCK.test(text) || RX_STACK_TRACE.test(text) || RX_CODE_FILE.test(text)) return 'code_generation';
  if (RX_JSON_OBJ.test(text) || RX_CSV_HEADER.test(text) || looksStatistical(text)) return 'data_analysis';
  if (looksMultiStep(text)) return 'complex_reasoning';
  return 'simple_query';
}

function looksMultiStep(t: string){
  return /(^|\s)(first|second|third|finally|step\s?\d+|phase\s?\d+)/i.test(t) || (countChars(t,'?') >= 2);
}

function looksStatistical(t:string){
  return /\b(regression|p-?value|cohort|anova|confidence interval|logit|roc|auc|pearson|spearman)\b/i.test(t);
}

function countChars(s:string,c:string){ 
  let n=0; 
  for (const ch of s) if (ch===c) n++; 
  return n; 
}

export function estimateComplexity(words: number, taskType: TaskType, tools?: string[]): Complexity {
  let tier: Complexity = words > ANALYZER_CFG.wordTiers.complex ? 'high'
                : words > ANALYZER_CFG.wordTiers.medium ? 'medium'
                : 'low';
  if ((tools ?? []).some(t => ANALYZER_CFG.toolEscalators.includes(t))) {
    tier = tier === 'low' ? 'medium' : 'high';
  }
  if (taskType === 'data_analysis' || taskType === 'complex_reasoning') tier = tier==='low'?'medium':'high';
  return tier;
}

export function estimateTokens(text: string, taskType: TaskType) {
  const clipped = text.length > ANALYZER_CFG.maxScanChars ? ANALYZER_CFG.maxScanChars : text.length;
  const inTok = Math.ceil(clipped / 4) + ANALYZER_CFG.tokenSystemOverhead;
  const outTok = ANALYZER_CFG.outputBuffers[taskType] ?? 400;
  return { inputTokens: inTok, outputTokens: outTok };
}

export function detectTimeConstraint(text: string): TimeConstraint {
  if (/\b(asap|right now|urgent|today|tonight|in\s+\d+\s*(min|hour)s?)\b/i.test(text)) return 'realtime';
  if (/\b(report|long[- ]?form|deep dive|compare|benchmark|literature review)\b/i.test(text)) return 'batch';
  return 'unspecified';
}

// Export as object for compatibility
export const contextAnalyzer = {
  analyzeContext,
  detectTimeConstraint
};

// Default export for compatibility
export default contextAnalyzer;