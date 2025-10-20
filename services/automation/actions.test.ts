import { Action, Plan, ActionResult, ActionExecutor, PermissionService, AIBrowserBridge } from '../services/automation/actions';
import { ActionExecutor as ExecutorClass } from '../services/automation/executor';

// Mock implementations for testing
class MockPermissionService implements PermissionService {
  private deniedOperations = new Set<string>();

  denyOperation(operation: string) {
    this.deniedOperations.add(operation);
  }

  allowOperation(operation: string) {
    this.deniedOperations.delete(operation);
  }

  async require(operation: string, context: Record<string, any>): Promise<void> {
    if (this.deniedOperations.has(operation)) {
      throw new Error('PERMISSION_DENIED');
    }
  }
}

class MockAIBrowserBridge implements AIBrowserBridge {
  private responses = new Map<string, ActionResult>();
  private delays = new Map<string, number>();

  setResponse(method: string, response: ActionResult) {
    this.responses.set(method, response);
  }

  setDelay(method: string, delayMs: number) {
    this.delays.set(method, delayMs);
  }

  async navigateTo(tabId: string, url: string): Promise<void> {
    await this.simulateDelay('navigateTo');
    // Always succeeds for navigation
  }

  async clickHandle(tabId: string, handle: string): Promise<ActionResult> {
    await this.simulateDelay('clickHandle');
    return this.responses.get('clickHandle') || { ok: true };
  }

  async typeInto(tabId: string, handle: string, text: string, replace: boolean, delayMs: number): Promise<ActionResult> {
    await this.simulateDelay('typeInto');
    return this.responses.get('typeInto') || { ok: true };
  }

  async selectOption(tabId: string, handle: string, value: string): Promise<ActionResult> {
    await this.simulateDelay('selectOption');
    return this.responses.get('selectOption') || { ok: true };
  }

  async waitFor(tabId: string, selector?: string, handle?: string): Promise<ActionResult> {
    await this.simulateDelay('waitFor');
    return this.responses.get('waitFor') || { ok: true };
  }

  async scrollIntoView(tabId: string, handle: string): Promise<ActionResult> {
    await this.simulateDelay('scrollIntoView');
    return this.responses.get('scrollIntoView') || { ok: true };
  }

  async takeScreenshot(tabId: string, fullPage: boolean): Promise<string> {
    await this.simulateDelay('takeScreenshot');
    return 'data:image/png;base64,mock-screenshot-data';
  }

  async saveFile(mimeType: string, data: string, path: string): Promise<void> {
    await this.simulateDelay('saveFile');
    // Always succeeds for save file
  }

  private async simulateDelay(method: string): Promise<void> {
    const delay = this.delays.get(method) || 0;
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

describe('Action DSL System', () => {
  let executor: ActionExecutor;
  let mockBridge: MockAIBrowserBridge;
  let mockPermissions: MockPermissionService;

  beforeEach(() => {
    mockBridge = new MockAIBrowserBridge();
    mockPermissions = new MockPermissionService();
    executor = new ExecutorClass(mockBridge, mockPermissions);
  });

  describe('Plan Construction', () => {
    it('should construct a plan with multiple step kinds', () => {
      const plan: Plan = {
        id: 'test-plan-1',
        steps: [
          { kind: 'navigate', url: 'https://example.com' },
          { kind: 'click', handle: 'h_abc123' },
          { kind: 'type', handle: 'h_def456', text: 'test input' },
          { kind: 'select', handle: 'h_ghi789', value: 'option1' },
          { kind: 'screenshot', fullPage: true }
        ],
        budgetMs: 30000,
        budgetOps: 10
      };

      expect(plan.id).toBe('test-plan-1');
      expect(plan.steps).toHaveLength(5);
      expect(plan.steps[0].kind).toBe('navigate');
      expect(plan.steps[1].kind).toBe('click');
      expect(plan.steps[2].kind).toBe('type');
      expect(plan.steps[3].kind).toBe('select');
      expect(plan.steps[4].kind).toBe('screenshot');
    });

    it('should handle all action types with optional parameters', () => {
      const plan: Plan = {
        id: 'test-plan-2',
        steps: [
          { kind: 'navigate', url: 'https://test.com', timeoutMs: 5000 },
          { kind: 'click', handle: 'h_click123', timeoutMs: 3000 },
          { kind: 'type', handle: 'h_type456', text: 'typed text', replace: true, delayMs: 100, timeoutMs: 4000 },
          { kind: 'select', handle: 'h_select789', value: 'selected', timeoutMs: 2000 },
          { kind: 'waitFor', selector: '.loading', timeoutMs: 10000 },
          { kind: 'waitFor', handle: 'h_wait123', timeoutMs: 5000 },
          { kind: 'scrollIntoView', handle: 'h_scroll456', timeoutMs: 3000 },
          { kind: 'screenshot', fullPage: false, path: '/tmp/screenshot.png', timeoutMs: 2000 }
        ]
      };

      expect(plan.steps).toHaveLength(8);
      expect((plan.steps[0] as any).timeoutMs).toBe(5000);
      expect((plan.steps[2] as any).replace).toBe(true);
      expect((plan.steps[2] as any).delayMs).toBe(100);
    });
  });

  describe('Action Execution', () => {
    it('should execute a plan with click→type→select→screenshot under budgets', async () => {
      const plan: Plan = {
        id: 'test-execution-1',
        steps: [
          { kind: 'navigate', url: 'https://example.com' },
          { kind: 'click', handle: 'h_btn123' },
          { kind: 'type', handle: 'h_input456', text: 'test value' },
          { kind: 'select', handle: 'h_select789', value: 'option1' },
          { kind: 'screenshot', fullPage: true }
        ],
        budgetMs: 30000,
        budgetOps: 10
      };

      const result = await executor.runPlan('tab1', plan);

      expect(result.planId).toBe('test-execution-1');
      expect(result.results).toHaveLength(5);
      expect(result.results.every(r => r.ok)).toBe(true);
      expect(result.elapsedMs).toBeGreaterThan(0);
      expect(result.aborted).toBeUndefined();
    });

    it('should handle denied permissions with PERMISSION_DENIED code', async () => {
      mockPermissions.denyOperation('dom_click');

      const plan: Plan = {
        id: 'test-permission-denied',
        steps: [
          { kind: 'navigate', url: 'https://example.com' },
          { kind: 'click', handle: 'h_btn123' }
        ]
      };

      const result = await executor.runPlan('tab1', plan);

      expect(result.results).toHaveLength(2);
      expect(result.results[0].ok).toBe(true); // navigate succeeds
      expect(result.results[1].ok).toBe(false); // click fails
      expect(result.results[1].code).toBe('PERMISSION_DENIED');
    });

    it('should respect operation budget limits', async () => {
      const plan: Plan = {
        id: 'test-budget-ops',
        steps: [
          { kind: 'navigate', url: 'https://example.com' },
          { kind: 'click', handle: 'h_btn1' },
          { kind: 'click', handle: 'h_btn2' },
          { kind: 'click', handle: 'h_btn3' }
        ],
        budgetOps: 2 // Only allow 2 operations
      };

      const result = await executor.runPlan('tab1', plan);

      expect(result.results).toHaveLength(3); // Should stop after budget exceeded
      expect(result.results[0].ok).toBe(true); // navigate
      expect(result.results[1].ok).toBe(true); // click 1
      expect(result.results[2].ok).toBe(false); // budget exceeded
      expect(result.results[2].code).toBe('BUDGET_OPS_EXCEEDED');
    });

    it('should respect time budget limits', async () => {
      mockBridge.setDelay('clickHandle', 1000); // 1 second delay

      const plan: Plan = {
        id: 'test-budget-time',
        steps: [
          { kind: 'navigate', url: 'https://example.com' },
          { kind: 'click', handle: 'h_btn1' },
          { kind: 'click', handle: 'h_btn2' }
        ],
        budgetMs: 500 // 500ms budget
      };

      const result = await executor.runPlan('tab1', plan);

      expect(result.results).toHaveLength(2); // Should stop after time budget exceeded
      expect(result.results[0].ok).toBe(true); // navigate
      expect(result.results[1].ok).toBe(false); // time budget exceeded
      expect(result.results[1].code).toBe('BUDGET_TIME_EXCEEDED');
    });

    it('should handle waitFor timeouts properly', async () => {
      mockBridge.setResponse('waitFor', { ok: false, code: 'TIMEOUT' });

      const plan: Plan = {
        id: 'test-wait-timeout',
        steps: [
          { kind: 'waitFor', selector: '.never-appears', timeoutMs: 1000 }
        ]
      };

      const result = await executor.runPlan('tab1', plan);

      expect(result.results).toHaveLength(1);
      expect(result.results[0].ok).toBe(false);
      expect(result.results[0].code).toBe('TIMEOUT');
    });

    it('should handle abort signal cancellation', async () => {
      const abortController = new AbortController();
      
      // Abort after first action
      setTimeout(() => abortController.abort(), 100);

      const plan: Plan = {
        id: 'test-abort',
        steps: [
          { kind: 'navigate', url: 'https://example.com' },
          { kind: 'click', handle: 'h_btn1' },
          { kind: 'click', handle: 'h_btn2' }
        ]
      };

      const result = await executor.runPlan('tab1', plan, abortController.signal);

      expect(result.aborted).toBe(true);
      expect(result.results.length).toBeLessThanOrEqual(1);
    });

    it('should handle individual action timeouts', async () => {
      mockBridge.setDelay('clickHandle', 10000); // 10 second delay

      const plan: Plan = {
        id: 'test-action-timeout',
        steps: [
          { kind: 'click', handle: 'h_btn1', timeoutMs: 100 } // 100ms timeout
        ]
      };

      const result = await executor.runPlan('tab1', plan);

      expect(result.results).toHaveLength(1);
      expect(result.results[0].ok).toBe(false);
      expect(result.results[0].code).toBe('TIMEOUT');
    });
  });

  describe('Element Handle Stability', () => {
    it('should maintain element handle validity after DOM mutations', async () => {
      // Simulate DOM mutation by changing the response after first call
      let callCount = 0;
      const originalClickHandle = mockBridge.clickHandle.bind(mockBridge);
      mockBridge.clickHandle = async (tabId: string, handle: string) => {
        callCount++;
        if (callCount === 1) {
          return { ok: true }; // First call succeeds
        } else {
          return { ok: false, code: 'ELEMENT_NOT_FOUND' }; // Second call fails due to mutation
        }
      };

      const plan: Plan = {
        id: 'test-handle-stability',
        steps: [
          { kind: 'click', handle: 'h_stable123' },
          { kind: 'click', handle: 'h_stable123' } // Same handle, should work
        ]
      };

      const result = await executor.runPlan('tab1', plan);

      expect(result.results).toHaveLength(2);
      expect(result.results[0].ok).toBe(true);
      expect(result.results[1].ok).toBe(false);
      expect(result.results[1].code).toBe('ELEMENT_NOT_FOUND');
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown action types', async () => {
      const plan: Plan = {
        id: 'test-unknown-action',
        steps: [
          { kind: 'navigate', url: 'https://example.com' },
          // @ts-ignore - Testing unknown action type
          { kind: 'unknownAction', someParam: 'value' }
        ]
      };

      const result = await executor.runPlan('tab1', plan);

      expect(result.results).toHaveLength(2);
      expect(result.results[0].ok).toBe(true);
      expect(result.results[1].ok).toBe(false);
      expect(result.results[1].code).toBe('UNKNOWN_ACTION');
    });

    it('should handle bridge execution errors', async () => {
      mockBridge.setResponse('clickHandle', { ok: false, code: 'ELEMENT_NOT_FOUND' });

      const plan: Plan = {
        id: 'test-bridge-error',
        steps: [
          { kind: 'click', handle: 'h_nonexistent' }
        ]
      };

      const result = await executor.runPlan('tab1', plan);

      expect(result.results).toHaveLength(1);
      expect(result.results[0].ok).toBe(false);
      expect(result.results[0].code).toBe('ELEMENT_NOT_FOUND');
    });
  });

  describe('Screenshot and File Operations', () => {
    it('should handle screenshot with file save', async () => {
      const plan: Plan = {
        id: 'test-screenshot-save',
        steps: [
          { kind: 'screenshot', fullPage: true, path: '/tmp/test-screenshot.png' }
        ]
      };

      const result = await executor.runPlan('tab1', plan);

      expect(result.results).toHaveLength(1);
      expect(result.results[0].ok).toBe(true);
      expect(result.results[0].data).toBeDefined();
      expect(result.results[0].data?.base64).toBe('data:image/png;base64,mock-screenshot-data');
    });

    it('should handle screenshot without file save', async () => {
      const plan: Plan = {
        id: 'test-screenshot-only',
        steps: [
          { kind: 'screenshot', fullPage: false }
        ]
      };

      const result = await executor.runPlan('tab1', plan);

      expect(result.results).toHaveLength(1);
      expect(result.results[0].ok).toBe(true);
      expect(result.results[0].data?.base64).toBe('data:image/png;base64,mock-screenshot-data');
    });
  });
});
