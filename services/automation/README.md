# Action DSL - Minimal, Safe Page Automation

A declarative DSL for page actions routed through aiBridge with permissions, stable element handles, timeouts, retries, and cancellation. No eval. Works in Electron (primary), no-ops on web.

## Features

- **Type-safe**: Full TypeScript support with discriminated unions
- **Permission-gated**: All actions require explicit permissions
- **Budget-controlled**: Time and operation limits prevent runaway automation
- **Cancellable**: Support for AbortSignal cancellation
- **Stable handles**: Uses CSS path + hashed keys for element identification
- **No eval**: No arbitrary JavaScript execution
- **Electron-first**: Primary target is Electron, graceful web fallbacks

## Quick Start

```typescript
import { Action, Plan, ActionExecutor, PermissionService } from './services/automation';
import { aiBrowserBridge } from './services/aiBridge';

// Create a permission service
const permissionService: PermissionService = {
  async require(operation: string, context: Record<string, any>): Promise<void> {
    // Check permissions here
    console.log(`Permission: ${operation}`, context);
  }
};

// Create executor
const executor = new ActionExecutor(aiBrowserBridge, permissionService);

// Define a plan
const plan: Plan = {
  id: 'example-plan',
  steps: [
    { kind: 'navigate', url: 'https://example.com' },
    { kind: 'click', handle: 'h_btn123' },
    { kind: 'type', handle: 'h_input456', text: 'Hello World' },
    { kind: 'screenshot', fullPage: true }
  ],
  budgetMs: 30000,
  budgetOps: 10
};

// Execute the plan
const result = await executor.runPlan('tab1', plan);
console.log('Results:', result.results);
```

## Action Types

### Navigate
```typescript
{ kind: 'navigate', url: string, timeoutMs?: number }
```

### Click
```typescript
{ kind: 'click', handle: string, timeoutMs?: number }
```

### Type
```typescript
{ kind: 'type', handle: string, text: string, replace?: boolean, delayMs?: number, timeoutMs?: number }
```

### Select
```typescript
{ kind: 'select', handle: string, value: string, timeoutMs?: number }
```

### Wait For
```typescript
{ kind: 'waitFor', selector?: string, handle?: string, timeoutMs?: number }
```

### Scroll Into View
```typescript
{ kind: 'scrollIntoView', handle: string, timeoutMs?: number }
```

### Screenshot
```typescript
{ kind: 'screenshot', fullPage?: boolean, path?: string, timeoutMs?: number }
```

## Element Handles

Element handles are stable identifiers that remain valid across DOM mutations. They use CSS path + hashed text content:

```typescript
// Handle format: h_<hash>
// Example: h_abc123def456
```

Handles are generated using:
- CSS selector path (limited to 5 levels deep)
- Element text content (first 64 characters)
- Hash of combined selector + text

## Budget Controls

### Time Budget
```typescript
const plan: Plan = {
  id: 'timed-plan',
  steps: [...],
  budgetMs: 30000 // 30 seconds total
};
```

### Operation Budget
```typescript
const plan: Plan = {
  id: 'limited-plan',
  steps: [...],
  budgetOps: 10 // Maximum 10 operations
};
```

## Cancellation

```typescript
const abortController = new AbortController();

// Cancel after 2 minutes
setTimeout(() => abortController.abort(), 120000);

const result = await executor.runPlan('tab1', plan, abortController.signal);

if (result.aborted) {
  console.log('Plan was cancelled');
}
```

## Permissions

All actions require explicit permissions:

```typescript
const permissionService: PermissionService = {
  async require(operation: string, context: Record<string, any>): Promise<void> {
    switch (operation) {
      case 'navigate_to_url':
        // Check if URL is allowed
        break;
      case 'dom_click':
        // Check if clicking is allowed
        break;
      case 'dom_type':
        // Check if typing is allowed
        break;
      case 'take_screenshot':
        // Check if screenshots are allowed
        break;
      default:
        throw new Error('Unknown operation');
    }
  }
};
```

## Error Handling

All actions return `ActionResult` with consistent error codes:

```typescript
interface ActionResult<T = unknown> {
  ok: boolean;
  code?: string;            // 'TIMEOUT' | 'NOT_FOUND' | 'PERMISSION_DENIED' | etc.
  data?: T;
  meta?: Record<string, unknown>;
}
```

Common error codes:
- `TIMEOUT`: Action timed out
- `NOT_FOUND`: Element not found
- `PERMISSION_DENIED`: Permission denied
- `BUDGET_OPS_EXCEEDED`: Operation budget exceeded
- `BUDGET_TIME_EXCEEDED`: Time budget exceeded
- `UNSUPPORTED`: Action not supported in current environment
- `EXEC_ERROR`: General execution error

## Examples

See `services/automation/examples.ts` for comprehensive examples including:
- Form filling automation
- E-commerce checkout
- Data scraping workflows
- Robust multi-step processes

## Testing

Run the test suite:

```bash
npm test services/automation
```

Tests cover:
- Plan construction and type safety
- Action execution with budgets
- Permission handling
- Error scenarios
- Element handle stability
- Cancellation support

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Action DSL    │───▶│  ActionExecutor  │───▶│   aiBridge      │
│   (Plan/Action) │    │  (Permission     │    │   (Electron     │
│                 │    │   + Budget       │    │    IPC)         │
│                 │    │   + Timeout)     │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

The DSL provides a safe, declarative way to define browser automation tasks with built-in safety features and no arbitrary code execution.
