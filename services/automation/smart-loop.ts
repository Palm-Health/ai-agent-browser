// Smart Automation Loop - Plan-Execute-Reflect with Stable RAM
// Integrates planning, resolution, execution, reflection, and memory management

import { Action, Plan, ActionResult, PlanResult } from './actions';
import { planFor, PlanningContext } from './planner';
import { resolveHandles } from './resolver';
import { PolicyAwareExecutor, ExecPolicy } from './policy';
import { reflect, applyAdjustments, ReflectionResult } from './reflection';
import { automationMemoryManager } from './memory';
import { automationTelemetry } from './telemetry';

export interface SmartAutomationOptions {
  maxRetries?: number;
  maxAdjustments?: number;
  enableReflection?: boolean;
  enableMemoryManagement?: boolean;
  enableTelemetry?: boolean;
  policy?: Partial<ExecPolicy>;
}

export interface SmartAutomationResult {
  success: boolean;
  plan: Plan;
  result: PlanResult;
  reflection?: ReflectionResult;
  adjustments?: number;
  metrics?: {
    executionTimeMs: number;
    memoryDeltaMB: number;
    successRate: number;
  };
}

export class SmartAutomationLoop {
  private executor: PolicyAwareExecutor;
  private options: Required<SmartAutomationOptions>;
  private disposed = false;

  constructor(
    private bridge: any, // AIBrowserBridge
    private permissions: any, // PermissionService
    options: SmartAutomationOptions = {}
  ) {
    this.options = {
      maxRetries: 1,
      maxAdjustments: 1,
      enableReflection: true,
      enableMemoryManagement: true,
      enableTelemetry: true,
      policy: {},
      ...options
    };

    this.executor = new PolicyAwareExecutor(
      bridge, 
      permissions, 
      this.options.policy
    );
  }

  async execute(
    context: PlanningContext,
    tabId: string,
    signal?: AbortSignal
  ): Promise<SmartAutomationResult> {
    if (this.disposed) {
      throw new Error('SmartAutomationLoop has been disposed');
    }

    const startTime = performance.now();
    const heapMeasurer = this.options.enableTelemetry ? 
      automationTelemetry.measureHeapDelta() : 
      () => 0;

    try {
      // Phase 1: Planning
      const plan = planFor(context);
      
      if (this.options.enableMemoryManagement) {
        automationMemoryManager.log('info', 'Plan created', { 
          planId: plan.id, 
          stepCount: plan.steps.length 
        });
      }

      // Phase 2: Resolution
      const resolvedPlan = await resolveHandles(this.bridge, tabId, plan);
      
      if (this.options.enableMemoryManagement) {
        // Dispose snapshot after resolution
        automationMemoryManager.disposeSnapshot(tabId);
      }

      // Phase 3: Execution with retries and adjustments
      let finalResult: PlanResult;
      let adjustments = 0;
      let reflection: ReflectionResult | undefined;

      for (let attempt = 0; attempt <= this.options.maxRetries; attempt++) {
        // Execute plan
        finalResult = await this.executor.runPlanWithPolicy(
          tabId, 
          resolvedPlan, 
          signal
        );

        // Record execution metrics
        if (this.options.enableTelemetry) {
          const heapDelta = heapMeasurer();
          automationTelemetry.recordPlanExecution({
            planId: resolvedPlan.id,
            success: finalResult.results.every(r => r.ok),
            actionCount: finalResult.results.length,
            executionTimeMs: finalResult.elapsedMs,
            timeoutCount: finalResult.results.filter(r => r.code === 'TIMEOUT').length,
            retryCount: finalResult.results.filter(r => r.meta?.retryCount).length,
            heapDeltaMB: heapDelta
          });
        }

        // Phase 4: Reflection (if enabled and not successful)
        if (this.options.enableReflection && !finalResult.results.every(r => r.ok)) {
          reflection = reflect(resolvedPlan, finalResult.results);
          
          if (this.options.enableMemoryManagement) {
            automationMemoryManager.log('info', 'Reflection completed', {
              status: reflection.status,
              notes: reflection.notes
            });
          }

          // Apply adjustments if suggested and within limits
          if (reflection.status === 'adjust' && 
              adjustments < this.options.maxAdjustments &&
              reflection.suggestions) {
            
            const adjustedPlan = applyAdjustments(resolvedPlan, reflection.suggestions);
            resolvedPlan.steps = adjustedPlan.steps;
            resolvedPlan.budgetMs = adjustedPlan.budgetMs;
            resolvedPlan.budgetOps = adjustedPlan.budgetOps;
            
            adjustments++;
            
            if (this.options.enableMemoryManagement) {
              automationMemoryManager.log('info', 'Plan adjusted', {
                adjustmentCount: adjustments,
                suggestions: reflection.suggestions.length
              });
            }
            
            // Continue to next attempt with adjusted plan
            continue;
          }
        }

        // If successful or no more adjustments possible, break
        break;
      }

      const executionTime = performance.now() - startTime;
      const heapDelta = heapMeasurer();

      // Record final metrics
      const metrics = this.options.enableTelemetry ? {
        executionTimeMs: executionTime,
        memoryDeltaMB: heapDelta,
        successRate: automationTelemetry.getStats().successRate
      } : undefined;

      const success = finalResult!.results.every(r => r.ok);

      if (this.options.enableMemoryManagement) {
        automationMemoryManager.log('info', 'Automation completed', {
          success,
          executionTimeMs: executionTime,
          adjustments,
          heapDeltaMB: heapDelta
        });
      }

      return {
        success,
        plan: resolvedPlan,
        result: finalResult!,
        reflection,
        adjustments,
        metrics
      };

    } catch (error) {
      const executionTime = performance.now() - startTime;
      
      if (this.options.enableMemoryManagement) {
        automationMemoryManager.log('error', 'Automation failed', {
          error: (error as Error).message,
          executionTimeMs: executionTime
        });
      }

      throw error;
    }
  }

  // Get current automation statistics
  getStats() {
    if (!this.options.enableTelemetry) {
      return null;
    }
    return automationTelemetry.getStats();
  }

  // Get memory usage statistics
  getMemoryStats() {
    if (!this.options.enableMemoryManagement) {
      return null;
    }
    return automationMemoryManager.getMemoryStats();
  }

  // Cancel current execution
  cancel(): void {
    this.executor.cancel();
  }

  // Dispose resources
  dispose(): void {
    if (this.disposed) return;
    
    this.disposed = true;
    this.executor.dispose();
    
    if (this.options.enableMemoryManagement) {
      automationMemoryManager.log('info', 'SmartAutomationLoop disposed');
    }
  }
}

// Convenience function for simple automation tasks
export async function automate(
  context: PlanningContext,
  tabId: string,
  bridge: any, // AIBrowserBridge
  permissions: any, // PermissionService
  options?: SmartAutomationOptions,
  signal?: AbortSignal
): Promise<SmartAutomationResult> {
  const loop = new SmartAutomationLoop(bridge, permissions, options);
  
  try {
    return await loop.execute(context, tabId, signal);
  } finally {
    loop.dispose();
  }
}

// Export all components for advanced usage
export * from './actions';
export * from './planner';
export * from './resolver';
export * from './policy';
export * from './reflection';
export * from './memory';
export * from './telemetry';
