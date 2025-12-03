import os from 'node:os';
import path from 'node:path';

import { Action, Plan, ActionExecutor, PermissionService, AIBrowserBridge } from '../services/automation/actions';
import { ActionExecutor as ExecutorClass } from '../services/automation/executor';
import { aiBrowserBridge } from '../aiBridge';

const tmpPath = (fileName: string) => path.join(os.tmpdir(), fileName);

// Integration test for the complete action DSL system
describe('Action DSL Integration Tests', () => {
  let executor: ActionExecutor;

  beforeEach(() => {
    // Use the real aiBrowserBridge with a mock permission service for integration testing
    const mockPermissions: PermissionService = {
      async require(operation: string, context: Record<string, any>): Promise<void> {
        // Allow all operations for integration testing
        console.log(`Permission check: ${operation}`, context);
      }
    };
    
    executor = new ExecutorClass(aiBrowserBridge, mockPermissions);
  });

  it('should create and execute a complex automation plan', async () => {
    const plan: Plan = {
      id: 'integration-test-1',
      steps: [
        { kind: 'navigate', url: 'https://example.com', timeoutMs: 10000 },
        { kind: 'waitFor', selector: 'body', timeoutMs: 5000 },
        { kind: 'screenshot', fullPage: true, timeoutMs: 3000 }
      ],
      budgetMs: 30000,
      budgetOps: 10
    };

    // Note: This test will only work in Electron environment
    // In web environment, it should return UNSUPPORTED errors
    const result = await executor.runPlan('test-tab', plan);

    expect(result.planId).toBe('integration-test-1');
    expect(result.results).toHaveLength(3);
    expect(result.elapsedMs).toBeGreaterThan(0);
    
    // In web environment, all actions should return UNSUPPORTED
    // In Electron environment, they should succeed (if tab exists)
    const hasUnsupported = result.results.some(r => r.code === 'UNSUPPORTED');
    const allSuccessful = result.results.every(r => r.ok);
    
    // Either all should be unsupported (web) or all should succeed (Electron with proper setup)
    expect(hasUnsupported || allSuccessful).toBe(true);
  });

  it('should handle budget constraints in real execution', async () => {
    const plan: Plan = {
      id: 'integration-budget-test',
      steps: [
        { kind: 'navigate', url: 'https://example.com' },
        { kind: 'screenshot', fullPage: false },
        { kind: 'screenshot', fullPage: false },
        { kind: 'screenshot', fullPage: false }
      ],
      budgetOps: 2 // Only allow 2 operations
    };

    const result = await executor.runPlan('test-tab', plan);

    expect(result.results).toHaveLength(3); // Should stop after budget exceeded
    expect(result.results[0].ok).toBe(true); // navigate
    expect(result.results[1].ok).toBe(true); // first screenshot
    expect(result.results[2].ok).toBe(false); // budget exceeded
    expect(result.results[2].code).toBe('BUDGET_OPS_EXCEEDED');
  });

  it('should demonstrate action DSL type safety', () => {
    // This test verifies TypeScript compilation and type safety
    const actions: Action[] = [
      { kind: 'navigate', url: 'https://test.com' },
      { kind: 'click', handle: 'h_btn123' },
      { kind: 'type', handle: 'h_input456', text: 'test', replace: true, delayMs: 100 },
      { kind: 'select', handle: 'h_select789', value: 'option1' },
      { kind: 'waitFor', selector: '.loading' },
      { kind: 'waitFor', handle: 'h_wait123' },
      { kind: 'scrollIntoView', handle: 'h_scroll456' },
      { kind: 'screenshot', fullPage: true, path: tmpPath('test.png') }
    ];

    const plan: Plan = {
      id: 'type-safety-test',
      steps: actions,
      budgetMs: 30000,
      budgetOps: 20
    };

    // If this compiles without TypeScript errors, type safety is working
    expect(plan.steps).toHaveLength(8);
    expect(plan.steps.every(step => 'kind' in step)).toBe(true);
  });
});
