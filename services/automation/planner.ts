import { Action, Plan } from './actions';

export interface PlanningContext {
  intent: 'login' | 'form_submit' | 'scrape' | 'download' | 'custom';
  hints?: { 
    selector?: string; 
    containsText?: string; 
    url?: string;
    targetElement?: string;
  };
  constraints?: { 
    privacyGate?: boolean; 
    timeMs?: number; 
    ops?: number; 
  };
}

// Tiny heuristic scaffolds - no large allocations or model calls
export function planFor(ctx: PlanningContext): Plan {
  const steps: Action[] = [];
  
  switch (ctx.intent) {
    case 'login':
      steps.push(
        { kind: 'waitFor', selector: 'input[type="email"],input[name*="user"],input[name*="login"],input[name*="username"]', timeoutMs: 10000 },
        { kind: 'click', handle: 'h_login_email_guess' }, // Will be resolved to actual handle
        { kind: 'type', handle: 'h_login_email_guess', text: '${email}', replace: true },
        { kind: 'waitFor', selector: 'input[type="password"],input[name*="pass"]', timeoutMs: 5000 },
        { kind: 'click', handle: 'h_login_password_guess' },
        { kind: 'type', handle: 'h_login_password_guess', text: '${password}', replace: true },
        { kind: 'waitFor', selector: 'button[type="submit"],input[type="submit"],button:contains("login"),button:contains("sign in")', timeoutMs: 3000 },
        { kind: 'click', handle: 'h_login_submit_guess' },
        { kind: 'waitFor', selector: 'body', timeoutMs: 15000 } // Wait for redirect/load
      );
      break;
      
    case 'form_submit':
      steps.push(
        { kind: 'waitFor', selector: 'form', timeoutMs: 10000 },
        { kind: 'screenshot', fullPage: false, timeoutMs: 3000 }
      );
      
      // Add form filling steps based on hints
      if (ctx.hints?.targetElement) {
        steps.push(
          { kind: 'click', handle: 'h_form_target_guess' },
          { kind: 'type', handle: 'h_form_target_guess', text: '${formData}', replace: true }
        );
      }
      
      steps.push(
        { kind: 'waitFor', selector: 'button[type="submit"],input[type="submit"],button:contains("submit"),button:contains("send")', timeoutMs: 3000 },
        { kind: 'click', handle: 'h_form_submit_guess' },
        { kind: 'waitFor', selector: 'body', timeoutMs: 10000 },
        { kind: 'screenshot', fullPage: true, timeoutMs: 3000 }
      );
      break;
      
    case 'scrape':
      steps.push(
        { kind: 'waitFor', selector: 'body', timeoutMs: 15000 },
        { kind: 'screenshot', fullPage: true, timeoutMs: 3000 }
      );
      
      if (ctx.hints?.selector) {
        steps.push(
          { kind: 'waitFor', selector: ctx.hints.selector, timeoutMs: 10000 },
          { kind: 'screenshot', fullPage: false, timeoutMs: 3000 }
        );
      }
      
      // Add click-through if specified
      if (ctx.hints?.targetElement) {
        steps.push(
          { kind: 'click', handle: 'h_scrape_target_guess' },
          { kind: 'waitFor', selector: 'body', timeoutMs: 10000 },
          { kind: 'screenshot', fullPage: true, timeoutMs: 3000 }
        );
      }
      break;
      
    case 'download':
      steps.push(
        { kind: 'waitFor', selector: 'body', timeoutMs: 15000 },
        { kind: 'screenshot', fullPage: false, timeoutMs: 3000 }
      );
      
      if (ctx.hints?.targetElement) {
        steps.push(
          { kind: 'click', handle: 'h_download_target_guess' },
          { kind: 'waitFor', selector: 'body', timeoutMs: 10000 }
        );
      }
      
      // Look for download links/buttons
      steps.push(
        { kind: 'waitFor', selector: 'a[href*="download"],a[href*=".pdf"],a[href*=".zip"],button:contains("download")', timeoutMs: 5000 },
        { kind: 'click', handle: 'h_download_link_guess' },
        { kind: 'waitFor', selector: 'body', timeoutMs: 15000 }
      );
      break;
      
    case 'custom':
      // Minimal custom scaffold
      steps.push(
        { kind: 'waitFor', selector: 'body', timeoutMs: 10000 },
        { kind: 'screenshot', fullPage: true, timeoutMs: 3000 }
      );
      
      if (ctx.hints?.selector) {
        steps.push(
          { kind: 'waitFor', selector: ctx.hints.selector, timeoutMs: 10000 },
          { kind: 'click', handle: 'h_custom_target_guess' }
        );
      }
      break;
  }
  
  // Ensure we don't exceed operation budget
  const maxOps = ctx.constraints?.ops ?? 25;
  if (steps.length > maxOps) {
    steps.splice(maxOps);
  }
  
  return { 
    id: crypto.randomUUID(), 
    steps, 
    budgetMs: ctx.constraints?.timeMs ?? 20_000, 
    budgetOps: maxOps 
  };
}

// Helper to create common wait patterns
export function createWaitPattern(selector: string, timeoutMs: number = 5000): Action {
  return { kind: 'waitFor', selector, timeoutMs };
}

// Helper to create common click patterns
export function createClickPattern(handle: string, timeoutMs: number = 3000): Action {
  return { kind: 'click', handle, timeoutMs };
}

// Helper to create common type patterns
export function createTypePattern(handle: string, text: string, replace: boolean = true, delayMs: number = 100): Action {
  return { kind: 'type', handle, text, replace, delayMs, timeoutMs: 5000 };
}
