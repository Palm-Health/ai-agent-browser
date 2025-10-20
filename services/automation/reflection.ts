import { Plan, ActionResult } from './actions';

export interface ReflectionResult {
  status: 'success' | 'adjust' | 'fail';
  notes: string[];
  suggestions?: PlanAdjustment[];
}

export interface PlanAdjustment {
  type: 'insert_wait' | 'increase_timeout' | 'reduce_budget' | 'retry_action';
  position?: number;
  action?: any; // Action
  reason: string;
}

export function reflect(plan: Plan, results: ActionResult[]): ReflectionResult {
  const last = results.at(-1);
  
  // Success case - all actions completed successfully
  if (results.every(r => r.ok)) {
    return { 
      status: 'success', 
      notes: ['all actions completed successfully'] 
    };
  }

  // Analyze failure patterns
  const analysis = analyzeFailures(results);
  
  // Determine reflection status and suggestions
  if (analysis.hasRecoverableErrors) {
    return {
      status: 'adjust',
      notes: analysis.notes,
      suggestions: generateAdjustments(plan, results, analysis)
    };
  }
  
  // Unrecoverable errors
  return {
    status: 'fail',
    notes: analysis.notes
  };
}

interface FailureAnalysis {
  hasRecoverableErrors: boolean;
  notes: string[];
  errorCounts: Record<string, number>;
  failurePositions: number[];
}

function analyzeFailures(results: ActionResult[]): FailureAnalysis {
  const errorCounts: Record<string, number> = {};
  const failurePositions: number[] = [];
  const notes: string[] = [];
  
  // Count error types and track positions
  results.forEach((result, index) => {
    if (!result.ok && result.code) {
      errorCounts[result.code] = (errorCounts[result.code] || 0) + 1;
      failurePositions.push(index);
    }
  });
  
  // Analyze patterns
  const timeouts = errorCounts['TIMEOUT'] || 0;
  const notFound = errorCounts['NOT_FOUND'] || 0;
  const permissionDenied = errorCounts['PERMISSION_DENIED'] || 0;
  const budgetExceeded = errorCounts['BUDGET_OPS_EXCEEDED'] || errorCounts['BUDGET_TIME_EXCEEDED'] || 0;
  const unsupported = errorCounts['UNSUPPORTED'] || 0;
  
  // Generate notes based on error patterns
  if (notFound > 0) {
    notes.push(`${notFound} element(s) not found - try broader selector or waitFor before click`);
  }
  
  if (timeouts > 0) {
    notes.push(`${timeouts} timeout(s) occurred - increase timeout or reduce budgetOps`);
  }
  
  if (budgetExceeded > 0) {
    notes.push('budget exceeded - reduce plan complexity or increase limits');
  }
  
  if (permissionDenied > 0) {
    notes.push(`${permissionDenied} permission(s) denied - check user permissions`);
  }
  
  if (unsupported > 0) {
    notes.push(`${unsupported} action(s) not supported in current environment`);
  }
  
  // Determine if errors are recoverable
  const hasRecoverableErrors = notFound > 0 || timeouts > 0;
  
  return {
    hasRecoverableErrors,
    notes,
    errorCounts,
    failurePositions
  };
}

function generateAdjustments(
  plan: Plan, 
  results: ActionResult[], 
  analysis: FailureAnalysis
): PlanAdjustment[] {
  const adjustments: PlanAdjustment[] = [];
  
  // Find first failure position for targeted adjustments
  const firstFailure = analysis.failurePositions[0];
  if (firstFailure === undefined) return adjustments;
  
  const failedAction = plan.steps[firstFailure];
  const failedResult = results[firstFailure];
  
  if (!failedAction || !failedResult) return adjustments;
  
  // Generate specific adjustments based on error type
  switch (failedResult.code) {
    case 'NOT_FOUND':
      // Insert waitFor before the failing action
      adjustments.push({
        type: 'insert_wait',
        position: firstFailure,
        action: {
          kind: 'waitFor',
          selector: getBroaderSelector(failedAction),
          timeoutMs: 10000
        },
        reason: 'Element not found, waiting for page to load'
      });
      break;
      
    case 'TIMEOUT':
      // Increase timeout for the failing action
      adjustments.push({
        type: 'increase_timeout',
        position: firstFailure,
        reason: 'Action timed out, increasing timeout'
      });
      break;
      
    case 'BUDGET_OPS_EXCEEDED':
      // Reduce budget to prevent runaway execution
      adjustments.push({
        type: 'reduce_budget',
        reason: 'Operation budget exceeded, reducing complexity'
      });
      break;
      
    case 'BUDGET_TIME_EXCEEDED':
      // Reduce time budget
      adjustments.push({
        type: 'reduce_budget',
        reason: 'Time budget exceeded, reducing complexity'
      });
      break;
  }
  
  return adjustments;
}

function getBroaderSelector(action: any): string {
  // Generate broader selectors based on action type
  switch (action.kind) {
    case 'click':
      return 'body, main, [role="main"], .content, .container';
    case 'type':
      return 'input, textarea, [contenteditable]';
    case 'select':
      return 'select, [role="combobox"]';
    case 'waitFor':
      return action.selector || 'body';
    default:
      return 'body';
  }
}

// Apply adjustments to create a new plan
export function applyAdjustments(plan: Plan, adjustments: PlanAdjustment[]): Plan {
  let adjustedPlan = { ...plan };
  
  for (const adjustment of adjustments) {
    switch (adjustment.type) {
      case 'insert_wait':
        if (adjustment.position !== undefined && adjustment.action) {
          adjustedPlan.steps.splice(adjustment.position, 0, adjustment.action);
        }
        break;
        
      case 'increase_timeout':
        if (adjustment.position !== undefined) {
          const step = adjustedPlan.steps[adjustment.position];
          if (step && 'timeoutMs' in step) {
            (step as any).timeoutMs = Math.min(
              ((step as any).timeoutMs || 8000) * 2, 
              30000 // Cap at 30 seconds
            );
          }
        }
        break;
        
      case 'reduce_budget':
        // Reduce operation budget
        adjustedPlan.budgetOps = Math.max(
          Math.floor((adjustedPlan.budgetOps || 25) * 0.7), 
          5 // Minimum 5 operations
        );
        
        // Reduce time budget
        adjustedPlan.budgetMs = Math.max(
          Math.floor((adjustedPlan.budgetMs || 30000) * 0.7), 
          10000 // Minimum 10 seconds
        );
        break;
        
      case 'retry_action':
        // This would be handled by the execution policy, not plan adjustment
        break;
    }
  }
  
  return adjustedPlan;
}

// Simple success rate calculation
export function calculateSuccessRate(results: ActionResult[]): number {
  if (results.length === 0) return 0;
  
  const successful = results.filter(r => r.ok).length;
  return successful / results.length;
}

// Performance metrics
export function calculatePerformanceMetrics(plan: Plan, results: ActionResult[]): {
  successRate: number;
  avgActionTime: number;
  totalTime: number;
  retryCount: number;
} {
  const successRate = calculateSuccessRate(results);
  
  // Estimate action times (this would be more accurate with actual timing data)
  const avgActionTime = results.length > 0 ? 1000 : 0; // Assume 1s per action
  
  const totalTime = avgActionTime * results.length;
  
  // Count retries (actions that failed but were retried)
  const retryCount = results.filter(r => !r.ok && r.meta?.retryCount).length;
  
  return {
    successRate,
    avgActionTime,
    totalTime,
    retryCount
  };
}
