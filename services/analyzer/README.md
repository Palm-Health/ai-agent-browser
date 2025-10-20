# Context Analyzer System

A comprehensive context analysis system for AI agent browsers that provides privacy-aware task classification, complexity estimation, and token prediction.

## Features

- **Pattern-based PII/PHI Detection**: Regex patterns + context keywords for medical, financial, and personal data
- **Smart Task Typing**: Detects code generation, data analysis, and complex reasoning without explicit keywords
- **Config-driven Thresholds**: No magic numbers - all thresholds are configurable
- **Separate Token Estimates**: Input/output token predictions for accurate billing
- **Rich Analysis Output**: Confidence scores, domains, time constraints, and reasoning
- **PII-safe Logging**: Never logs sensitive data, only flags and metadata

## Files

### Core Files
- `services/contextAnalyzer.ts` - Main analysis engine
- `services/analyzer/pii.ts` - PII/PHI detection patterns and utilities
- `services/analyzer/config.ts` - Configurable thresholds and constants
- `services/analyzer/logger.ts` - PII-safe logging utilities

### Testing
- `services/analyzer/__tests__/contextAnalyzer.test.ts` - Comprehensive test suite

### Examples
- `services/analyzer/integration-example.ts` - Model selection integration example

## Usage

```typescript
import { analyzeContext } from './services/contextAnalyzer';

const analysis = analyzeContext({
  messages: [
    { role: 'user', content: 'Analyze this patient data: 123-45-6789' }
  ],
  tools: ['browser', 'sql'],
  privacyMode: 'balanced'
});

console.log(analysis);
// {
//   type: 'data_analysis',
//   complexity: 'high',
//   requiresPrivacy: true,
//   detectedDomains: ['personal'],
//   privacyLevel: 'strict',
//   expectedInputTokens: 150,
//   expectedOutputTokens: 800,
//   timeConstraint: 'unspecified',
//   confidence: 0.85,
//   reasons: ['privacy signals present', 'elevated complexity signals']
// }
```

## Privacy Detection

The system detects:
- **SSN patterns**: `123-45-6789`
- **Credit card numbers**: 13-19 digit sequences
- **Email addresses**: Standard email format
- **Phone numbers**: US phone number formats
- **Medical records**: MRN patterns and HIPAA keywords
- **Financial data**: Routing numbers, IBAN, banking terms

## Task Types

- **simple_query**: Basic questions and requests
- **code_generation**: Code blocks, stack traces, file extensions
- **data_analysis**: JSON objects, CSV headers, statistical terms
- **complex_reasoning**: Multi-step processes, multiple questions

## Configuration

All thresholds are configurable in `config.ts`:

```typescript
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
  maxScanChars: 200_000,
};
```

## Integration

The analyzer integrates seamlessly with model selection:

```typescript
import { selectOptimalModel } from './services/analyzer/integration-example';

const optimalModel = selectOptimalModel({
  analysis,
  availableModels: [...]
});
```

## Testing

Run tests with:
```bash
npm test services/analyzer/__tests__/contextAnalyzer.test.ts
```

## Security

- **No PII Logging**: Only flags and metadata are logged
- **Pattern Matching Only**: No raw data extraction
- **Configurable Privacy Modes**: Strict, balanced, performance
- **Domain Detection**: Medical, financial, personal classification

## Performance

- **Bounded Scanning**: Max 200k characters to prevent performance issues
- **Precompiled Regex**: All patterns are precompiled for speed
- **Efficient Token Estimation**: Simple character-based estimation
- **Minimal Dependencies**: TypeScript only, no external libraries
