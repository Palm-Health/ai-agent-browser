export const ANALYZER_CFG = {
  wordTiers: { simple: 0, medium: 50, complex: 200 },
  toolEscalators: ['browser','vision','sql','code_interpreter'],
  outputBuffers: {
    simple_query: 200,
    code_generation: 500,
    data_analysis: 800,
    complex_reasoning: 600,
  },
  tokenSystemOverhead: 120,
  maxScanChars: 200_000, // cap scanning for perf
};

export type TaskType = 'simple_query'|'code_generation'|'data_analysis'|'complex_reasoning';
export type Complexity = 'low'|'medium'|'high';
export type TimeConstraint = 'realtime'|'batch'|'unspecified';
