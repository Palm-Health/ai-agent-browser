import { SmartAutomationLoop, automate, PlanningContext } from '../services/automation/smart-loop';
import { aiBrowserBridge } from '../aiBridge';

// Integration test for the complete smart automation system
describe('Smart Automation Integration', () => {
  let mockPermissions: any;

  beforeEach(() => {
    mockPermissions = {
      async require(operation: string, context: Record<string, any>): Promise<void> {
        console.log(`Permission: ${operation}`, context);
        // Allow all operations for integration testing
      }
    };
  });

  it('should execute complete smart automation loop', async () => {
    const context: PlanningContext = {
      intent: 'login',
      hints: { url: 'https://example.com/login' },
      constraints: { timeMs: 30000, ops: 15 }
    };

    const result = await automate(
      context,
      'test-tab',
      aiBrowserBridge,
      mockPermissions,
      {
        maxRetries: 1,
        maxAdjustments: 1,
        enableReflection: true,
        enableMemoryManagement: true,
        enableTelemetry: true
      }
    );

    expect(result).toBeDefined();
    expect(result.plan).toBeDefined();
    expect(result.result).toBeDefined();
    expect(result.success).toBeDefined();
    expect(result.metrics).toBeDefined();
  });

  it('should handle form submission automation', async () => {
    const context: PlanningContext = {
      intent: 'form_submit',
      hints: { 
        targetElement: 'contact-form',
        containsText: 'contact us'
      },
      constraints: { timeMs: 45000, ops: 20 }
    };

    const loop = new SmartAutomationLoop(aiBrowserBridge, mockPermissions, {
      enableReflection: true,
      enableTelemetry: true
    });

    try {
      const result = await loop.execute(context, 'form-tab');

      expect(result.plan.steps.length).toBeGreaterThan(0);
      expect(result.plan.steps.length).toBeLessThanOrEqual(20);
      expect(result.metrics?.executionTimeMs).toBeGreaterThan(0);
    } finally {
      loop.dispose();
    }
  });

  it('should demonstrate memory management', async () => {
    const loop = new SmartAutomationLoop(aiBrowserBridge, mockPermissions, {
      enableMemoryManagement: true,
      enableTelemetry: true
    });

    try {
      // Execute multiple plans to test memory management
      const contexts: PlanningContext[] = [
        { intent: 'scrape', constraints: { ops: 5 } },
        { intent: 'download', constraints: { ops: 8 } },
        { intent: 'custom', constraints: { ops: 3 } }
      ];

      for (let i = 0; i < contexts.length; i++) {
        const result = await loop.execute(contexts[i], `tab-${i}`);
        expect(result.success).toBeDefined();
      }

      // Check memory stats
      const memoryStats = loop.getMemoryStats();
      expect(memoryStats).toBeDefined();
      expect(memoryStats?.estimatedHeapDelta).toBeGreaterThan(0);

      // Check telemetry stats
      const telemetryStats = loop.getStats();
      expect(telemetryStats).toBeDefined();
      expect(telemetryStats?.totalPlansExecuted).toBe(3);
    } finally {
      loop.dispose();
    }
  });

  it('should handle cancellation', async () => {
    const abortController = new AbortController();
    
    // Cancel after 1 second
    setTimeout(() => abortController.abort(), 1000);

    const context: PlanningContext = {
      intent: 'scrape',
      constraints: { timeMs: 60000, ops: 50 } // Large plan
    };

    const loop = new SmartAutomationLoop(aiBrowserBridge, mockPermissions);

    try {
      const result = await loop.execute(context, 'cancel-tab', abortController.signal);
      
      // Should be cancelled
      expect(result.result.aborted).toBe(true);
    } finally {
      loop.dispose();
    }
  });

  it('should demonstrate reflection and adjustment', async () => {
    const context: PlanningContext = {
      intent: 'login',
      constraints: { timeMs: 20000, ops: 10 }
    };

    const loop = new SmartAutomationLoop(aiBrowserBridge, mockPermissions, {
      enableReflection: true,
      maxAdjustments: 2
    });

    try {
      const result = await loop.execute(context, 'reflection-tab');

      expect(result.reflection).toBeDefined();
      expect(result.adjustments).toBeGreaterThanOrEqual(0);
      expect(result.adjustments).toBeLessThanOrEqual(2);
    } finally {
      loop.dispose();
    }
  });
});
