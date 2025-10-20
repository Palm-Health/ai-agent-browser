# Intelligent AI Model and MCP Routing System

## Overview

The AI Agent Browser now features an intelligent routing system that automatically selects the optimal AI model and MCP server based on context, user preferences, privacy requirements, and performance metrics.

## Key Features

### 1. Smart Hybrid Model Selection

The system intelligently routes requests between local and API models:

- **Simple tasks** (< 50 words, no reasoning) → Local models (Llama 3.1, fast and free)
- **Medium tasks** (50-200 words) → DeepSeek API (fast and affordable) or local if budget exceeded
- **Complex tasks** (reasoning, analysis) → Advanced API models (DeepSeek Reasoner, GPT-4)
- **Privacy-sensitive tasks** → Always local models (100% private)

### 2. Privacy-First Architecture

Three privacy modes available:

#### Strict Mode 🔒
- **All requests** use local models only
- Zero cost, complete privacy
- No data leaves your computer
- Perfect for: Medical data, financial information, confidential documents

#### Balanced Mode ⚖️ (Recommended)
- **Smart routing** based on task complexity
- Simple tasks → Local models
- Complex tasks → API models
- Privacy-sensitive content → Automatically switches to local
- Best balance of privacy, performance, and cost

#### Performance Mode ⚡
- **Best model** for each task regardless of cost
- Fastest responses
- May incur higher API costs
- Ideal for: Time-critical tasks, maximum quality

### 3. Automatic Privacy Detection

The system automatically detects privacy-sensitive content:

**Privacy Keywords Monitored:**
- Financial: credit card, bank account, SSN, routing number
- Medical: patient, diagnosis, prescription, medical record, HIPAA
- Personal: password, PIN, confidential, private, proprietary

**When detected:** Automatically switches to local models regardless of privacy mode setting.

### 4. Context-Aware Routing

The system considers multiple factors:

**Task Analysis:**
- Word count and complexity
- Required reasoning level
- Tool usage requirements
- Estimated token count

**System Context:**
- Battery status (low battery → prefer API to save power)
- Network quality (poor network → prefer local)
- Time of day (off-peak → better API performance)
- Available system resources

**Cost Management:**
- Tracks cumulative costs per session
- Switches to local models when budget exceeded
- Provides cost estimates and warnings

### 5. MCP Server Performance Tracking

Intelligently selects the best MCP server for each tool category:

**Metrics Tracked:**
- Success rate per server
- Average latency
- Category-specific performance
- Uptime and reliability
- Recent failures

**Automatic Failover:**
- If a server fails, automatically tries alternatives
- Learns from failures to avoid problematic servers
- Maintains fallback chains for reliability

### 6. Machine Learning from User Behavior

The system learns your preferences over time:

**What it learns:**
- Model preferences for specific task types
- Privacy sensitivity patterns
- Performance vs. cost trade-offs
- Time-of-day preferences

**Privacy:** All learning data stored locally, never shared.

## Configuration

### Default Settings

```typescript
routingPreferences: {
  privacyMode: 'balanced',          // Smart hybrid approach
  defaultCostBudget: 0.01,          // $0.01 per request
  preferLocalForCategories: [        // Always use local for these
    'medical',
    'financial', 
    'personal'
  ],
  maxResponseTime: 10000,           // 10 seconds max
  autoFallback: true,               // Auto-retry with alternatives
  learningEnabled: true,            // Learn from user choices
}
```

### Customization

You can customize routing preferences in `services/config.ts` or through the UI:

```typescript
import { configService } from './services/config';

// Change privacy mode
const config = configService.getConfig();
config.routingPreferences.privacyMode = 'strict';
configService.saveConfig();

// Adjust cost budget
config.routingPreferences.defaultCostBudget = 0.05; // $0.05
configService.saveConfig();
```

## Usage Examples

### Example 1: Simple Query (Routes to Local)

```typescript
User: "What is 2+2?"

System Analysis:
- Complexity: LOW
- Privacy: Not required
- Decision: Llama 3.1 (local, fast, free)
- Reasoning: Simple task suitable for fast local model
```

### Example 2: Complex Analysis (Routes to API)

```typescript
User: "Analyze the economic implications of AI on healthcare..."

System Analysis:
- Complexity: HIGH
- Reasoning required: YES
- Decision: DeepSeek Reasoner API
- Reasoning: Complex task benefits from advanced API model
```

### Example 3: Privacy-Sensitive (Forces Local)

```typescript
User: "Help me analyze my medical records for diagnosis..."

System Analysis:
- Privacy keywords detected: YES (medical, diagnosis)
- Privacy level: STRICT
- Decision: Meditron (local medical AI)
- Reasoning: Privacy requirements mandate local processing
```

### Example 4: Budget Exceeded (Switches to Local)

```typescript
User: "Explain quantum computing..."

System Analysis:
- Complexity: MEDIUM
- Cumulative cost: $0.009 (approaching $0.01 budget)
- Decision: DeepSeek R1 (local)
- Reasoning: Approaching cost budget limit, using local model
```

## Performance Dashboard

Access real-time performance metrics:

### Session Statistics
- Session duration
- Total cost incurred
- Average cost per minute
- Model usage breakdown

### MCP Server Performance
- Success rates per server
- Average latency
- Uptime percentages
- Top categories per server

### Learning Statistics
- User overrides recorded
- Learned preference patterns
- Confidence levels
- Most common preferences

## API Reference

### Context Analyzer

```typescript
import { contextAnalyzer } from './services/contextAnalyzer';

// Analyze task complexity
const analysis = contextAnalyzer.analyzeTask(messages, tools);
// Returns: { type, complexity, estimatedTokens, requiresPrivacy, timeConstraint }

// Get system context
const systemContext = contextAnalyzer.getSystemContext();
// Returns: { isOnBattery, networkQuality, cpuLoad, timeOfDay, ... }

// Assess privacy requirements
const privacyLevel = contextAnalyzer.assessPrivacyRequirements(messages);
// Returns: 'strict' | 'moderate' | 'relaxed'
```

### Intelligent Router

```typescript
import { intelligentRouter } from './services/intelligentRouter';

// Select optimal model
const decision = await intelligentRouter.selectOptimalModel(routingContext);
// Returns: { model, reasoning, confidence, alternatives }

// Track costs
intelligentRouter.recordCost(0.0015);

// Get session stats
const stats = intelligentRouter.getSessionStats();
// Returns: { duration, totalCost, avgCostPerMinute }
```

### MCP Server Router

```typescript
import { mcpServerRouter } from './services/mcp/mcpServerRouter';

// Select optimal server
const serverId = mcpServerRouter.selectOptimalServer('browser', availableServers);

// Record performance
mcpServerRouter.recordServerPerformance(serverId, category, success, latency);

// Get performance report
const report = mcpServerRouter.getServerPerformanceReport();
```

### User Preference Service

```typescript
import { userPreferenceService } from './services/userPreferenceService';

// Record user override
userPreferenceService.recordUserOverride(suggestedModel, chosenModel, context);

// Get learned preference
const preferredModel = userPreferenceService.getPreferredModelForContext(context);

// Detect privacy-sensitive content
const isPrivate = userPreferenceService.detectPrivacySensitiveContent(message);
```

## Testing

Run the comprehensive test suite:

```bash
npm run test:routing
# or
npx tsx test-intelligent-routing.ts
```

Tests cover:
1. Context analysis for different task types
2. Privacy keyword detection
3. Model selection for simple/complex tasks
4. Privacy mode enforcement
5. MCP server routing
6. Performance tracking
7. User preference learning

## Troubleshooting

### Models not routing as expected

**Check privacy mode:**
```typescript
const config = configService.getConfig();
console.log(config.routingPreferences.privacyMode);
```

**Check cumulative costs:**
```typescript
const cost = intelligentRouter.getCumulativeCost();
console.log(`Current session cost: $${cost.toFixed(4)}`);
```

### MCP servers not being selected

**Check server metrics:**
```typescript
const metrics = mcpServerRouter.getAllServerMetrics();
console.log(metrics);
```

**Reset metrics if needed:**
```typescript
mcpServerRouter.resetMetrics('server-id');
```

### Learning not working

**Check if learning is enabled:**
```typescript
const config = configService.getConfig();
console.log(config.routingPreferences.learningEnabled);
```

**View learned preferences:**
```typescript
const stats = userPreferenceService.getPreferenceStats();
console.log(stats.topPreferences);
```

## Best Practices

1. **Use Balanced Mode** for most use cases - it provides the best mix of privacy, performance, and cost

2. **Enable Learning** to improve routing decisions over time based on your preferences

3. **Set appropriate cost budgets** to avoid unexpected API charges

4. **Use Strict Mode** for sensitive data like medical records, financial information, or confidential documents

5. **Monitor the Performance Dashboard** to understand routing decisions and optimize settings

6. **Review privacy keywords** if you have domain-specific sensitive terms to add

## Privacy Guarantee

- **Local models**: 100% private, no data transmission
- **Learning data**: Stored locally only, never shared
- **API models**: Only used when explicitly allowed by privacy mode
- **Automatic protection**: Privacy-sensitive content always uses local models

## Cost Optimization

- **Free tier**: Use local models exclusively (Strict mode)
- **Budget-conscious**: Use Balanced mode with low cost budget ($0.01)
- **Performance-first**: Use Performance mode with higher budget

Average costs (Balanced mode):
- Simple queries: $0.000 (local)
- Medium tasks: $0.001 - $0.003 (DeepSeek API)
- Complex tasks: $0.003 - $0.010 (Advanced models)

## Future Enhancements

Planned features:
- [ ] A/B testing for model selection strategies
- [ ] Advanced cost prediction
- [ ] Multi-model ensemble routing
- [ ] Custom privacy keyword lists
- [ ] Per-user model preferences
- [ ] Historical routing analytics
- [ ] Model performance benchmarking

## Support

For issues or questions:
1. Check the Performance Dashboard for insights
2. Review test output: `npx tsx test-intelligent-routing.ts`
3. Check console logs for routing decisions
4. Reset preferences if needed: `userPreferenceService.resetPreferences()`

---

**Intelligent Routing System v1.0**  
Making AI model selection smart, private, and cost-effective.

