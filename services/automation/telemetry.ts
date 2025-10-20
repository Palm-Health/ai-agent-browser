// KPIs & Telemetry for Automation System
// Tracks success rates, performance metrics, and memory usage without retaining large arrays

export interface AutomationStats {
  successRate: number;           // Last 50 plans success rate
  medianActionsPerPlan: number;  // Median actions per plan
  medianPlanTime: number;        // Median plan execution time (ms)
  timeoutRate: number;           // Percentage of actions that timeout
  retryRate: number;             // Percentage of actions that retry
  avgHeapDelta: number;          // Average heap delta (MB)
  totalPlansExecuted: number;    // Total plans executed
  totalActionsExecuted: number;  // Total actions executed
  lastUpdated: number;           // Last update timestamp
}

export interface PlanMetrics {
  planId: string;
  success: boolean;
  actionCount: number;
  executionTimeMs: number;
  timeoutCount: number;
  retryCount: number;
  heapDeltaMB: number;
  timestamp: number;
}

// EWMA (Exponentially Weighted Moving Average) for smooth metrics
class EWMA {
  private value: number;
  private alpha: number;

  constructor(initialValue: number = 0, alpha: number = 0.1) {
    this.value = initialValue;
    this.alpha = alpha;
  }

  update(newValue: number): number {
    this.value = this.alpha * newValue + (1 - this.alpha) * this.value;
    return this.value;
  }

  getValue(): number {
    return this.value;
  }
}

// Ring buffer for recent plan metrics (N=50)
class PlanMetricsRingBuffer {
  private buffer: PlanMetrics[] = [];
  private maxSize = 50;
  private head = 0;
  private count = 0;

  push(metrics: PlanMetrics): void {
    this.buffer[this.head] = metrics;
    this.head = (this.head + 1) % this.maxSize;
    
    if (this.count < this.maxSize) {
      this.count++;
    }
  }

  getAll(): PlanMetrics[] {
    if (this.count === 0) return [];
    
    const result: PlanMetrics[] = [];
    for (let i = 0; i < this.count; i++) {
      const index = (this.head - this.count + i + this.maxSize) % this.maxSize;
      result.push(this.buffer[index]);
    }
    return result;
  }

  getMedian<T>(getter: (m: PlanMetrics) => T): T {
    const all = this.getAll();
    if (all.length === 0) return 0 as T;
    
    const values = all.map(getter).sort((a, b) => (a as any) - (b as any));
    const mid = Math.floor(values.length / 2);
    
    if (values.length % 2 === 0) {
      return ((values[mid - 1] as any) + (values[mid] as any)) / 2 as T;
    } else {
      return values[mid];
    }
  }

  getSuccessRate(): number {
    const all = this.getAll();
    if (all.length === 0) return 0;
    
    const successful = all.filter(m => m.success).length;
    return successful / all.length;
  }

  getTimeoutRate(): number {
    const all = this.getAll();
    if (all.length === 0) return 0;
    
    const totalActions = all.reduce((sum, m) => sum + m.actionCount, 0);
    const totalTimeouts = all.reduce((sum, m) => sum + m.timeoutCount, 0);
    
    return totalActions > 0 ? totalTimeouts / totalActions : 0;
  }

  getRetryRate(): number {
    const all = this.getAll();
    if (all.length === 0) return 0;
    
    const totalActions = all.reduce((sum, m) => sum + m.actionCount, 0);
    const totalRetries = all.reduce((sum, m) => sum + m.retryCount, 0);
    
    return totalActions > 0 ? totalRetries / totalActions : 0;
  }

  getAvgHeapDelta(): number {
    const all = this.getAll();
    if (all.length === 0) return 0;
    
    const totalHeapDelta = all.reduce((sum, m) => sum + m.heapDeltaMB, 0);
    return totalHeapDelta / all.length;
  }
}

// Main telemetry manager
export class AutomationTelemetry {
  private planMetrics = new PlanMetricsRingBuffer();
  private heapDeltaEWMA = new EWMA(0, 0.1);
  private totalPlansExecuted = 0;
  private totalActionsExecuted = 0;
  private lastHeapMeasurement = 0;

  // Record plan execution metrics
  recordPlanExecution(metrics: Omit<PlanMetrics, 'timestamp'>): void {
    const planMetrics: PlanMetrics = {
      ...metrics,
      timestamp: Date.now()
    };
    
    this.planMetrics.push(planMetrics);
    this.totalPlansExecuted++;
    this.totalActionsExecuted += metrics.actionCount;
    
    // Update heap delta EWMA
    this.heapDeltaEWMA.update(metrics.heapDeltaMB);
  }

  // Record individual action metrics
  recordActionExecution(
    planId: string, 
    actionKind: string, 
    success: boolean, 
    executionTimeMs: number,
    retryCount: number = 0,
    timeoutOccurred: boolean = false
  ): void {
    // This could be used for more granular action-level metrics
    // For now, we focus on plan-level metrics to keep memory usage low
  }

  // Get current statistics
  getStats(): AutomationStats {
    const recentMetrics = this.planMetrics.getAll();
    
    return {
      successRate: this.planMetrics.getSuccessRate(),
      medianActionsPerPlan: this.planMetrics.getMedian(m => m.actionCount),
      medianPlanTime: this.planMetrics.getMedian(m => m.executionTimeMs),
      timeoutRate: this.planMetrics.getTimeoutRate(),
      retryRate: this.planMetrics.getRetryRate(),
      avgHeapDelta: this.heapDeltaEWMA.getValue(),
      totalPlansExecuted: this.totalPlansExecuted,
      totalActionsExecuted: this.totalActionsExecuted,
      lastUpdated: Date.now()
    };
  }

  // Get detailed metrics for debugging
  getDetailedMetrics(): {
    recentPlans: PlanMetrics[];
    stats: AutomationStats;
    memoryInfo?: any;
  } {
    const stats = this.getStats();
    const recentPlans = this.planMetrics.getAll();
    
    let memoryInfo: any = undefined;
    if (typeof window !== 'undefined' && 'memory' in performance) {
      memoryInfo = (performance as any).memory;
    }
    
    return {
      recentPlans,
      stats,
      memoryInfo
    };
  }

  // Reset all metrics
  reset(): void {
    this.planMetrics = new PlanMetricsRingBuffer();
    this.heapDeltaEWMA = new EWMA(0, 0.1);
    this.totalPlansExecuted = 0;
    this.totalActionsExecuted = 0;
  }

  // Measure heap delta for a plan execution
  measureHeapDelta(): () => number {
    const startHeap = this.getCurrentHeapSize();
    const startTime = Date.now();
    
    return () => {
      const endHeap = this.getCurrentHeapSize();
      const endTime = Date.now();
      
      // Only measure if enough time has passed (avoid noise)
      if (endTime - startTime > 1000) {
        return Math.max(0, endHeap - startHeap) / (1024 * 1024); // Convert to MB
      }
      return 0;
    };
  }

  private getCurrentHeapSize(): number {
    if (typeof window !== 'undefined' && 'memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }
}

// Global telemetry instance
export const automationTelemetry = new AutomationTelemetry();

// Performance Dashboard integration
export interface PerformanceDashboardData {
  automation: {
    successRate: number;
    medianPlanTime: number;
    avgHeapDelta: number;
    totalPlans: number;
    lastUpdated: number;
  };
}

export function getAutomationDashboardData(): PerformanceDashboardData {
  const stats = automationTelemetry.getStats();
  
  return {
    automation: {
      successRate: Math.round(stats.successRate * 100) / 100,
      medianPlanTime: Math.round(stats.medianPlanTime),
      avgHeapDelta: Math.round(stats.avgHeapDelta * 100) / 100,
      totalPlans: stats.totalPlansExecuted,
      lastUpdated: stats.lastUpdated
    }
  };
}

// Export function for external access
export function getAutomationStats(): AutomationStats {
  return automationTelemetry.getStats();
}

// Memory usage tracking
export class MemoryTracker {
  private measurements: Array<{ timestamp: number; heapSize: number }> = [];
  private maxMeasurements = 100;

  recordMeasurement(): void {
    const heapSize = this.getCurrentHeapSize();
    this.measurements.push({
      timestamp: Date.now(),
      heapSize
    });
    
    // Keep only recent measurements
    if (this.measurements.length > this.maxMeasurements) {
      this.measurements.splice(0, this.measurements.length - this.maxMeasurements);
    }
  }

  getHeapTrend(): { trend: 'increasing' | 'decreasing' | 'stable'; delta: number } {
    if (this.measurements.length < 2) {
      return { trend: 'stable', delta: 0 };
    }
    
    const recent = this.measurements.slice(-10); // Last 10 measurements
    const oldest = recent[0];
    const newest = recent[recent.length - 1];
    
    const delta = newest.heapSize - oldest.heapSize;
    const deltaMB = delta / (1024 * 1024);
    
    if (deltaMB > 5) return { trend: 'increasing', delta: deltaMB };
    if (deltaMB < -5) return { trend: 'decreasing', delta: deltaMB };
    return { trend: 'stable', delta: deltaMB };
  }

  private getCurrentHeapSize(): number {
    if (typeof window !== 'undefined' && 'memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }
}

export const memoryTracker = new MemoryTracker();

// Periodic memory measurement
if (typeof window !== 'undefined') {
  setInterval(() => {
    memoryTracker.recordMeasurement();
  }, 10000); // Every 10 seconds
}
