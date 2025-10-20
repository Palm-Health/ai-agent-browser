import { Action, Plan, ActionResult } from './actions';
import { planFor, PlanningContext } from './planner';
import { resolveHandles } from './resolver';
import { PolicyAwareExecutor, ExecPolicy, DEFAULT_POLICY } from './policy';
import { reflect, applyAdjustments, ReflectionResult } from './reflection';
import { AutomationMemoryManager, MEMORY_LIMITS } from './memory';
import { AutomationTelemetry, PlanMetrics } from './telemetry';

// Mock implementations for testing
class MockAIBrowserBridge {
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
  }

  async getPageContent(tabId: string): Promise<any> {
    return {
      url: 'https://example.com',
      title: 'Test Page',
      elements: [
        { handle: 'h_email123', role: 'input', text: '', selector: 'input[type="email"]' },
        { handle: 'h_password456', role: 'input', text: '', selector: 'input[type="password"]' },
        { handle: 'h_submit789', role: 'button', text: 'Login', selector: 'button[type="submit"]' }
      ]
    };
  }

  private async simulateDelay(method: string): Promise<void> {
    const delay = this.delays.get(method) || 0;
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

class MockPermissionService {
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

describe('Smarter Automation Loop', () => {
  let mockBridge: MockAIBrowserBridge;
  let mockPermissions: MockPermissionService;
  let executor: PolicyAwareExecutor;
  let memoryManager: AutomationMemoryManager;
  let telemetry: AutomationTelemetry;

  beforeEach(() => {
    mockBridge = new MockAIBrowserBridge();
    mockPermissions = new MockPermissionService();
    executor = new PolicyAwareExecutor(mockBridge, mockPermissions);
    memoryManager = new AutomationMemoryManager();
    telemetry = new AutomationTelemetry();
  });

  afterEach(() => {
    executor.dispose();
    memoryManager.dispose();
    telemetry.reset();
  });

  describe('Planning Heuristic', () => {
    it('should create login plan with appropriate steps', () => {
      const context: PlanningContext = {
        intent: 'login',
        hints: { url: 'https://example.com/login' }
      };

      const plan = planFor(context);

      expect(plan.id).toBeDefined();
      expect(plan.steps.length).toBeGreaterThan(0);
      expect(plan.steps.length).toBeLessThanOrEqual(25);
      expect(plan.budgetMs).toBe(20000);
      expect(plan.budgetOps).toBe(25);

      // Check for login-specific steps
      const stepKinds = plan.steps.map(s => s.kind);
      expect(stepKinds).toContain('waitFor');
      expect(stepKinds).toContain('click');
      expect(stepKinds).toContain('type');
    });

    it('should create form submission plan', () => {
      const context: PlanningContext = {
        intent: 'form_submit',
        hints: { targetElement: 'contact-form' },
        constraints: { timeMs: 30000, ops: 15 }
      };

      const plan = planFor(context);

      expect(plan.budgetMs).toBe(30000);
      expect(plan.budgetOps).toBe(15);
      expect(plan.steps.length).toBeLessThanOrEqual(15);
    });

    it('should respect operation budget limits', () => {
      const context: PlanningContext = {
        intent: 'scrape',
        constraints: { ops: 5 }
      };

      const plan = planFor(context);

      expect(plan.steps.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Handle Resolution', () => {
    it('should resolve placeholder handles to concrete handles', async () => {
      const plan: Plan = {
        id: 'test-resolve',
        steps: [
          { kind: 'click', handle: 'h_login_email_guess' },
          { kind: 'type', handle: 'h_login_password_guess', text: 'password' }
        ]
      };

      const resolvedPlan = await resolveHandles(mockBridge, 'tab1', plan);

      expect(resolvedPlan.steps[0].handle).toBe('h_email123');
      expect(resolvedPlan.steps[1].handle).toBe('h_password456');
    });

    it('should handle missing elements gracefully', async () => {
      // Mock empty page content
      mockBridge.getPageContent = async () => ({
        url: 'https://example.com',
        title: 'Empty Page',
        elements: []
      });

      const plan: Plan = {
        id: 'test-empty',
        steps: [
          { kind: 'click', handle: 'h_nonexistent' }
        ]
      };

      const resolvedPlan = await resolveHandles(mockBridge, 'tab1', plan);

      // Should return original handle if not found
      expect(resolvedPlan.steps[0].handle).toBe('h_nonexistent');
    });
  });

  describe('Execution Policy', () => {
    it('should retry on NOT_FOUND errors', async () => {
      mockBridge.setResponse('clickHandle', { ok: false, code: 'NOT_FOUND' });

      const plan: Plan = {
        id: 'test-retry',
        steps: [
          { kind: 'click', handle: 'h_test123' }
        ]
      };

      const result = await executor.runPlanWithPolicy('tab1', plan);

      expect(result.results).toHaveLength(1);
      expect(result.results[0].ok).toBe(false);
      expect(result.results[0].code).toBe('NOT_FOUND');
    });

    it('should respect budget constraints', async () => {
      const plan: Plan = {
        id: 'test-budget',
        steps: [
          { kind: 'navigate', url: 'https://example.com' },
          { kind: 'click', handle: 'h_btn1' },
          { kind: 'click', handle: 'h_btn2' }
        ],
        budgetOps: 2
      };

      const result = await executor.runPlanWithPolicy('tab1', plan);

      expect(result.results).toHaveLength(3);
      expect(result.results[0].ok).toBe(true); // navigate
      expect(result.results[1].ok).toBe(true); // click 1
      expect(result.results[2].ok).toBe(false); // budget exceeded
      expect(result.results[2].code).toBe('BUDGET_OPS_EXCEEDED');
    });

    it('should cancel within 100ms', async () => {
      const abortController = new AbortController();
      
      // Cancel after 50ms
      setTimeout(() => abortController.abort(), 50);

      const plan: Plan = {
        id: 'test-cancel',
        steps: [
          { kind: 'navigate', url: 'https://example.com' },
          { kind: 'click', handle: 'h_btn1' }
        ]
      };

      const startTime = performance.now();
      const result = await executor.runPlanWithPolicy('tab1', plan, abortController.signal);
      const elapsed = performance.now() - startTime;

      expect(result.aborted).toBe(true);
      expect(elapsed).toBeLessThan(200); // Should cancel quickly
    });

    it('should apply recovery strategies on retryable errors', async () => {
      // First call fails with NOT_FOUND, second succeeds
      let callCount = 0;
      mockBridge.clickHandle = async (tabId: string, handle: string) => {
        callCount++;
        if (callCount === 1) {
          return { ok: false, code: 'NOT_FOUND' };
        } else {
          return { ok: true };
        }
      };

      const plan: Plan = {
        id: 'test-recovery',
        steps: [
          { kind: 'click', handle: 'h_test123' }
        ]
      };

      const result = await executor.runPlanWithPolicy('tab1', plan);

      expect(result.results).toHaveLength(1);
      expect(result.results[0].ok).toBe(true);
      expect(callCount).toBe(2); // Should have retried
    });
  });

  describe('Reflection System', () => {
    it('should identify success cases', () => {
      const plan: Plan = { id: 'test', steps: [] };
      const results: ActionResult[] = [
        { ok: true },
        { ok: true },
        { ok: true }
      ];

      const reflection = reflect(plan, results);

      expect(reflection.status).toBe('success');
      expect(reflection.notes).toContain('all actions completed successfully');
    });

    it('should suggest adjustments for NOT_FOUND errors', () => {
      const plan: Plan = {
        id: 'test',
        steps: [
          { kind: 'click', handle: 'h_btn1' },
          { kind: 'click', handle: 'h_btn2' }
        ]
      };
      const results: ActionResult[] = [
        { ok: true },
        { ok: false, code: 'NOT_FOUND' }
      ];

      const reflection = reflect(plan, results);

      expect(reflection.status).toBe('adjust');
      expect(reflection.notes).toContain('element(s) not found');
      expect(reflection.suggestions).toBeDefined();
      expect(reflection.suggestions![0].type).toBe('insert_wait');
    });

    it('should suggest timeout adjustments', () => {
      const plan: Plan = { id: 'test', steps: [] };
      const results: ActionResult[] = [
        { ok: false, code: 'TIMEOUT' },
        { ok: false, code: 'TIMEOUT' }
      ];

      const reflection = reflect(plan, results);

      expect(reflection.status).toBe('adjust');
      expect(reflection.notes).toContain('timeout(s) occurred');
    });

    it('should apply adjustments to plan', () => {
      const plan: Plan = {
        id: 'test',
        steps: [
          { kind: 'click', handle: 'h_btn1' }
        ]
      };

      const adjustments = [
        {
          type: 'insert_wait' as const,
          position: 0,
          action: { kind: 'waitFor' as const, selector: 'body', timeoutMs: 5000 },
          reason: 'Wait for page load'
        }
      ];

      const adjustedPlan = applyAdjustments(plan, adjustments);

      expect(adjustedPlan.steps).toHaveLength(2);
      expect(adjustedPlan.steps[0].kind).toBe('waitFor');
      expect(adjustedPlan.steps[1].kind).toBe('click');
    });
  });

  describe('Memory Management', () => {
    it('should cap page snapshots to 1 per tab', () => {
      const snapshot1 = { url: 'https://example.com', elements: [] };
      const snapshot2 = { url: 'https://example.com', elements: [] };

      memoryManager.setPageSnapshot('tab1', snapshot1);
      memoryManager.setPageSnapshot('tab1', snapshot2);

      const retrieved = memoryManager.getPageSnapshot('tab1');
      expect(retrieved).toBe(snapshot2); // Should be the latest
    });

    it('should maintain bounded action results', () => {
      // Add more results than the limit
      for (let i = 0; i < 100; i++) {
        memoryManager.addActionResult('tab1', { ok: true });
      }

      const results = memoryManager.getActionResults('tab1');
      expect(results.length).toBeLessThanOrEqual(MEMORY_LIMITS.MAX_ACTION_RESULTS);
    });

    it('should handle memory pressure', () => {
      // Fill up caches
      for (let i = 0; i < 10; i++) {
        memoryManager.cachePageMetadata(`https://example${i}.com`, {
          url: `https://example${i}.com`,
          title: `Page ${i}`,
          mainSelectors: ['body'],
          elementCount: 100
        });
      }

      const statsBefore = memoryManager.getMemoryStats();
      memoryManager.handleMemoryPressure();
      const statsAfter = memoryManager.getMemoryStats();

      expect(statsAfter.pageCacheSize).toBeLessThan(statsBefore.pageCacheSize);
    });

    it('should dispose resources properly', () => {
      memoryManager.setPageSnapshot('tab1', { url: 'test', elements: [] });
      memoryManager.addActionResult('tab1', { ok: true });
      memoryManager.cachePageMetadata('https://test.com', {
        url: 'https://test.com',
        title: 'Test',
        mainSelectors: ['body'],
        elementCount: 10
      });

      memoryManager.dispose();

      expect(memoryManager.getPageSnapshot('tab1')).toBeUndefined();
      expect(memoryManager.getActionResults('tab1')).toHaveLength(0);
      expect(memoryManager.getMemoryStats().pageCacheSize).toBe(0);
    });
  });

  describe('Telemetry', () => {
    it('should track plan execution metrics', () => {
      const metrics: Omit<PlanMetrics, 'timestamp'> = {
        planId: 'test-plan',
        success: true,
        actionCount: 5,
        executionTimeMs: 2000,
        timeoutCount: 0,
        retryCount: 1,
        heapDeltaMB: 2.5
      };

      telemetry.recordPlanExecution(metrics);
      const stats = telemetry.getStats();

      expect(stats.totalPlansExecuted).toBe(1);
      expect(stats.totalActionsExecuted).toBe(5);
      expect(stats.successRate).toBe(1);
    });

    it('should calculate median metrics', () => {
      // Record multiple plans with different metrics
      const plans = [
        { planId: 'plan1', success: true, actionCount: 3, executionTimeMs: 1000, timeoutCount: 0, retryCount: 0, heapDeltaMB: 1 },
        { planId: 'plan2', success: false, actionCount: 7, executionTimeMs: 3000, timeoutCount: 1, retryCount: 2, heapDeltaMB: 3 },
        { planId: 'plan3', success: true, actionCount: 5, executionTimeMs: 2000, timeoutCount: 0, retryCount: 1, heapDeltaMB: 2 }
      ];

      plans.forEach(plan => telemetry.recordPlanExecution(plan));
      const stats = telemetry.getStats();

      expect(stats.medianActionsPerPlan).toBe(5);
      expect(stats.medianPlanTime).toBe(2000);
      expect(stats.successRate).toBeCloseTo(0.67, 2); // 2/3 success rate
    });

    it('should track timeout and retry rates', () => {
      const plans = [
        { planId: 'plan1', success: true, actionCount: 10, executionTimeMs: 1000, timeoutCount: 2, retryCount: 1, heapDeltaMB: 1 },
        { planId: 'plan2', success: false, actionCount: 5, executionTimeMs: 2000, timeoutCount: 1, retryCount: 3, heapDeltaMB: 2 }
      ];

      plans.forEach(plan => telemetry.recordPlanExecution(plan));
      const stats = telemetry.getStats();

      expect(stats.timeoutRate).toBeCloseTo(0.2, 2); // 3 timeouts out of 15 actions
      expect(stats.retryRate).toBeCloseTo(0.27, 2); // 4 retries out of 15 actions
    });
  });

  describe('Integration Tests', () => {
    it('should execute complete plan-execute-reflect loop', async () => {
      const context: PlanningContext = {
        intent: 'login',
        constraints: { timeMs: 15000, ops: 10 }
      };

      // Plan
      const plan = planFor(context);
      expect(plan.steps.length).toBeGreaterThan(0);

      // Resolve
      const resolvedPlan = await resolveHandles(mockBridge, 'tab1', plan);
      expect(resolvedPlan.steps.length).toBe(plan.steps.length);

      // Execute
      const result = await executor.runPlanWithPolicy('tab1', resolvedPlan);
      expect(result.results).toHaveLength(resolvedPlan.steps.length);

      // Reflect
      const reflection = reflect(resolvedPlan, result.results);
      expect(reflection.status).toBeDefined();
      expect(reflection.notes).toBeDefined();
    });

    it('should handle memory constraints during execution', async () => {
      // Create multiple plans to test memory management
      const plans: Plan[] = [];
      for (let i = 0; i < 5; i++) {
        plans.push({
          id: `plan-${i}`,
          steps: [
            { kind: 'navigate', url: `https://example${i}.com` },
            { kind: 'screenshot', fullPage: true }
          ]
        });
      }

      // Execute plans and track memory
      for (const plan of plans) {
        const resolvedPlan = await resolveHandles(mockBridge, `tab-${plan.id}`, plan);
        const result = await executor.runPlanWithPolicy(`tab-${plan.id}`, resolvedPlan);
        
        // Record metrics
        telemetry.recordPlanExecution({
          planId: plan.id,
          success: result.results.every(r => r.ok),
          actionCount: result.results.length,
          executionTimeMs: result.elapsedMs,
          timeoutCount: result.results.filter(r => r.code === 'TIMEOUT').length,
          retryCount: 0,
          heapDeltaMB: 1.5
        });
      }

      const stats = telemetry.getStats();
      expect(stats.totalPlansExecuted).toBe(5);
      expect(stats.totalActionsExecuted).toBe(10); // 2 actions per plan
    });
  });
});
