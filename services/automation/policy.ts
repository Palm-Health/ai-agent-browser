import { ActionResult } from './actions';

export interface ExecPolicy {
  maxRetries: number;            // e.g., 1–2
  backoffMs: number;             // e.g., 250–500
  perActionTimeoutMs: number;    // default if action lacks one
}

export const DEFAULT_POLICY: ExecPolicy = { 
  maxRetries: 1, 
  backoffMs: 300, 
  perActionTimeoutMs: 8000 
};

// Enhanced ActionExecutor with retry policy and cancellation
export class PolicyAwareExecutor {
  private policy: ExecPolicy;
  private abortController?: AbortController;
  
  constructor(
    private bridge: any, // AIBrowserBridge
    private permissions: any, // PermissionService
    policy: Partial<ExecPolicy> = {}
  ) {
    this.policy = { ...DEFAULT_POLICY, ...policy };
  }

  async runPlanWithPolicy(
    tabId: string, 
    plan: any, // Plan
    signal?: AbortSignal
  ): Promise<any> { // PlanResult
    const started = performance.now();
    const out: ActionResult[] = [];
    let ops = 0;

    const budgetMs = plan.budgetMs ?? 30_000;
    const budgetOps = plan.budgetOps ?? 40;

    // Create abort controller for internal cancellation
    this.abortController = new AbortController();
    
    // Combine external signal with internal controller
    const combinedSignal = this.combineAbortSignals(signal, this.abortController.signal);

    try {
      for (const step of plan.steps) {
        if (combinedSignal?.aborted) {
          return { 
            planId: plan.id, 
            results: out, 
            elapsedMs: performance.now() - started, 
            aborted: true 
          };
        }
        
        if (ops++ >= budgetOps) { 
          out.push({ ok: false, code: 'BUDGET_OPS_EXCEEDED' }); 
          break; 
        }
        
        if (performance.now() - started > budgetMs) { 
          out.push({ ok: false, code: 'BUDGET_TIME_EXCEEDED' }); 
          break; 
        }

        // Execute with retry policy
        const result = await this.executeWithRetry(tabId, step, combinedSignal);
        out.push(result);
        
        // If action failed and we can't recover, abort the plan
        if (!result.ok && !this.isRetryableError(result)) {
          this.abortController?.abort();
        }
      }
      
      return { 
        planId: plan.id, 
        results: out, 
        elapsedMs: performance.now() - started 
      };
    } finally {
      this.abortController = undefined;
    }
  }

  private async executeWithRetry(
    tabId: string, 
    step: any, // Action
    signal?: AbortSignal
  ): Promise<ActionResult> {
    let lastError: ActionResult | null = null;
    
    for (let attempt = 0; attempt <= this.policy.maxRetries; attempt++) {
      if (signal?.aborted) {
        return { ok: false, code: 'CANCELLED' };
      }
      
      try {
        const timeout = step.timeoutMs ?? this.policy.perActionTimeoutMs;
        const result = await this.withTimeout(
          this.execOne(tabId, step), 
          timeout
        );
        
        // If successful, return immediately
        if (result.ok) {
          return result;
        }
        
        // If not retryable, return the error
        if (!this.isRetryableError(result)) {
          return result;
        }
        
        lastError = result;
        
        // If this was the last attempt, return the error
        if (attempt === this.policy.maxRetries) {
          return result;
        }
        
        // Apply recovery strategy before retry
        await this.applyRecoveryStrategy(tabId, step, result);
        
        // Wait with backoff before retry
        if (attempt < this.policy.maxRetries) {
          await this.delay(this.policy.backoffMs);
        }
        
      } catch (error) {
        lastError = { 
          ok: false, 
          code: 'EXEC_ERROR', 
          data: String((error as Error).message) 
        };
        
        // If this was the last attempt, return the error
        if (attempt === this.policy.maxRetries) {
          return lastError;
        }
        
        // Wait with backoff before retry
        if (attempt < this.policy.maxRetries) {
          await this.delay(this.policy.backoffMs);
        }
      }
    }
    
    return lastError || { ok: false, code: 'UNKNOWN_ERROR' };
  }

  private async execOne(tabId: string, step: any): Promise<ActionResult> {
    switch (step.kind) {
      case 'navigate':
        await this.permissions.require('navigate_to_url', { tabId });
        await this.bridge.navigateTo(tabId, step.url);
        return { ok: true };
        
      case 'click':
        await this.permissions.require('dom_click', { tabId, handle: step.handle });
        return await this.bridge.clickHandle(tabId, step.handle);
        
      case 'type':
        await this.permissions.require('dom_type', { tabId, handle: step.handle });
        return await this.bridge.typeInto(
          tabId, 
          step.handle, 
          step.text, 
          step.replace ?? false, 
          step.delayMs ?? 0
        );
        
      case 'select':
        await this.permissions.require('dom_select', { tabId, handle: step.handle });
        return await this.bridge.selectOption(tabId, step.handle, step.value);
        
      case 'waitFor':
        return await this.bridge.waitFor(tabId, step.selector, step.handle);
        
      case 'scrollIntoView':
        return await this.bridge.scrollIntoView(tabId, step.handle);
        
      case 'screenshot':
        await this.permissions.require('take_screenshot', { tabId });
        const base64 = await this.bridge.takeScreenshot(tabId, !!step.fullPage);
        if (step.path) {
          await this.bridge.saveFile('image/png', base64, step.path);
        }
        return { ok: true, data: { base64 } };
        
      default:
        return { ok: false, code: 'UNKNOWN_ACTION' };
    }
  }

  private isRetryableError(result: ActionResult): boolean {
    if (!result.code) return false;
    
    // Retryable errors
    const retryableCodes = [
      'NOT_FOUND',
      'ELEMENT_OBSCURED',
      'TIMEOUT',
      'ELEMENT_NOT_INTERACTABLE'
    ];
    
    return retryableCodes.includes(result.code);
  }

  private async applyRecoveryStrategy(
    tabId: string, 
    step: any, 
    error: ActionResult
  ): Promise<void> {
    switch (error.code) {
      case 'NOT_FOUND':
      case 'ELEMENT_OBSCURED':
        // Try scrolling into view before retry
        if (step.handle) {
          try {
            await this.bridge.scrollIntoView(tabId, step.handle);
          } catch (scrollError) {
            // Ignore scroll errors, continue with retry
          }
        }
        break;
        
      case 'TIMEOUT':
        // Small delay before retry for timeout errors
        await this.delay(500);
        break;
        
      case 'ELEMENT_NOT_INTERACTABLE':
        // Try clicking a parent element or waiting
        await this.delay(1000);
        break;
    }
  }

  private async withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject({ code: 'TIMEOUT', message: `timeout ${ms}ms` });
      }, ms);
      
      promise
        .then(value => {
          clearTimeout(timer);
          resolve(value);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private combineAbortSignals(...signals: (AbortSignal | undefined)[]): AbortSignal | undefined {
    const validSignals = signals.filter(s => s !== undefined);
    if (validSignals.length === 0) return undefined;
    if (validSignals.length === 1) return validSignals[0];
    
    // Create a combined signal that aborts when any signal aborts
    const controller = new AbortController();
    
    for (const signal of validSignals) {
      if (signal!.aborted) {
        controller.abort();
        break;
      }
      
      signal!.addEventListener('abort', () => {
        controller.abort();
      });
    }
    
    return controller.signal;
  }

  // Cancel current execution within 100ms
  cancel(): void {
    this.abortController?.abort();
  }

  // Dispose resources
  dispose(): void {
    this.cancel();
    this.abortController = undefined;
  }
}
