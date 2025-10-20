/**
 * Action DSL Usage Examples
 * 
 * This file demonstrates how to use the minimal, safe action DSL for page automation.
 * The DSL provides a declarative way to define browser automation tasks with built-in
 * safety features like permissions, timeouts, retries, and cancellation.
 */

import { Action, Plan, ActionExecutor, PermissionService, AIBrowserBridge } from './actions';
import { ActionExecutor as ExecutorClass } from './executor';
import { aiBrowserBridge } from '../aiBridge';

// Example 1: Simple form filling automation
export function createFormFillingPlan(): Plan {
  return {
    id: 'form-filling-example',
    steps: [
      { kind: 'navigate', url: 'https://example.com/contact', timeoutMs: 10000 },
      { kind: 'waitFor', selector: 'form', timeoutMs: 5000 },
      { kind: 'type', handle: 'h_name_input', text: 'John Doe', replace: true },
      { kind: 'type', handle: 'h_email_input', text: 'john@example.com', replace: true },
      { kind: 'select', handle: 'h_subject_select', value: 'General Inquiry' },
      { kind: 'type', handle: 'h_message_textarea', text: 'Hello, I would like to inquire about...', replace: true },
      { kind: 'click', handle: 'h_submit_button' },
      { kind: 'waitFor', selector: '.success-message', timeoutMs: 10000 },
      { kind: 'screenshot', fullPage: true, path: '/tmp/form-submission-success.png' }
    ],
    budgetMs: 60000, // 1 minute total budget
    budgetOps: 20    // Maximum 20 operations
  };
}

// Example 2: E-commerce checkout automation
export function createCheckoutPlan(): Plan {
  return {
    id: 'checkout-example',
    steps: [
      { kind: 'navigate', url: 'https://shop.example.com/product/123', timeoutMs: 15000 },
      { kind: 'waitFor', selector: '.add-to-cart-button', timeoutMs: 5000 },
      { kind: 'click', handle: 'h_add_to_cart' },
      { kind: 'waitFor', selector: '.cart-popup', timeoutMs: 3000 },
      { kind: 'click', handle: 'h_proceed_checkout' },
      { kind: 'waitFor', selector: '.checkout-form', timeoutMs: 10000 },
      { kind: 'type', handle: 'h_email', text: 'customer@example.com', replace: true },
      { kind: 'type', handle: 'h_first_name', text: 'Jane', replace: true },
      { kind: 'type', handle: 'h_last_name', text: 'Smith', replace: true },
      { kind: 'type', handle: 'h_address', text: '123 Main St', replace: true },
      { kind: 'type', handle: 'h_city', text: 'Anytown', replace: true },
      { kind: 'select', handle: 'h_state', value: 'CA' },
      { kind: 'type', handle: 'h_zip', text: '12345', replace: true },
      { kind: 'click', handle: 'h_continue_payment' },
      { kind: 'waitFor', selector: '.payment-section', timeoutMs: 5000 },
      { kind: 'screenshot', fullPage: true, path: '/tmp/checkout-form-filled.png' }
    ],
    budgetMs: 120000, // 2 minutes total budget
    budgetOps: 30     // Maximum 30 operations
  };
}

// Example 3: Data scraping automation
export function createDataScrapingPlan(): Plan {
  return {
    id: 'data-scraping-example',
    steps: [
      { kind: 'navigate', url: 'https://news.example.com', timeoutMs: 15000 },
      { kind: 'waitFor', selector: '.article-list', timeoutMs: 10000 },
      { kind: 'screenshot', fullPage: true, path: '/tmp/news-homepage.png' },
      { kind: 'click', handle: 'h_first_article' },
      { kind: 'waitFor', selector: '.article-content', timeoutMs: 10000 },
      { kind: 'screenshot', fullPage: true, path: '/tmp/first-article.png' },
      { kind: 'scrollIntoView', handle: 'h_article_footer' },
      { kind: 'screenshot', fullPage: false, path: '/tmp/article-footer.png' }
    ],
    budgetMs: 90000,  // 1.5 minutes total budget
    budgetOps: 15     // Maximum 15 operations
  };
}

// Example 4: Multi-step workflow with error handling
export function createRobustWorkflowPlan(): Plan {
  return {
    id: 'robust-workflow-example',
    steps: [
      // Step 1: Navigate and verify page load
      { kind: 'navigate', url: 'https://app.example.com/login', timeoutMs: 20000 },
      { kind: 'waitFor', selector: 'body', timeoutMs: 10000 },
      
      // Step 2: Login process
      { kind: 'type', handle: 'h_username', text: 'user@example.com', replace: true, delayMs: 100 },
      { kind: 'type', handle: 'h_password', text: 'securepassword123', replace: true, delayMs: 100 },
      { kind: 'click', handle: 'h_login_button' },
      
      // Step 3: Wait for dashboard and verify login success
      { kind: 'waitFor', selector: '.dashboard', timeoutMs: 15000 },
      { kind: 'screenshot', fullPage: true, path: '/tmp/dashboard-loaded.png' },
      
      // Step 4: Navigate to specific feature
      { kind: 'click', handle: 'h_reports_menu' },
      { kind: 'waitFor', selector: '.reports-section', timeoutMs: 10000 },
      { kind: 'click', handle: 'h_monthly_report' },
      
      // Step 5: Generate and download report
      { kind: 'waitFor', selector: '.report-generator', timeoutMs: 10000 },
      { kind: 'select', handle: 'h_report_period', value: 'last-month' },
      { kind: 'click', handle: 'h_generate_button' },
      { kind: 'waitFor', selector: '.download-ready', timeoutMs: 30000 },
      { kind: 'screenshot', fullPage: true, path: '/tmp/report-generated.png' }
    ],
    budgetMs: 300000, // 5 minutes total budget
    budgetOps: 50     // Maximum 50 operations
  };
}

// Example usage function
export async function runAutomationExample() {
  // Create a permission service (in real usage, this would be more sophisticated)
  const permissionService: PermissionService = {
    async require(operation: string, context: Record<string, any>): Promise<void> {
      console.log(`Permission requested: ${operation}`, context);
      // In a real implementation, this would check user permissions
      // For demo purposes, we'll allow all operations
    }
  };

  // Create the executor
  const executor = new ExecutorClass(aiBrowserBridge, permissionService);

  // Example: Run form filling automation
  const formPlan = createFormFillingPlan();
  console.log('Running form filling automation...');
  
  try {
    const result = await executor.runPlan('demo-tab', formPlan);
    console.log('Automation completed:', {
      planId: result.planId,
      stepsExecuted: result.results.length,
      elapsedMs: result.elapsedMs,
      success: result.results.every(r => r.ok)
    });
    
    // Log any failures
    const failures = result.results.filter(r => !r.ok);
    if (failures.length > 0) {
      console.log('Failed steps:', failures.map(f => ({ code: f.code, data: f.data })));
    }
  } catch (error) {
    console.error('Automation failed:', error);
  }
}

// Example with cancellation
export async function runCancellableAutomation() {
  const permissionService: PermissionService = {
    async require(operation: string, context: Record<string, any>): Promise<void> {
      // Allow all operations for demo
    }
  };

  const executor = new ExecutorClass(aiBrowserBridge, permissionService);
  const plan = createRobustWorkflowPlan();

  // Create an abort controller for cancellation
  const abortController = new AbortController();
  
  // Cancel after 2 minutes
  setTimeout(() => {
    console.log('Cancelling automation...');
    abortController.abort();
  }, 120000);

  try {
    const result = await executor.runPlan('demo-tab', plan, abortController.signal);
    
    if (result.aborted) {
      console.log('Automation was cancelled');
    } else {
      console.log('Automation completed successfully');
    }
  } catch (error) {
    console.error('Automation error:', error);
  }
}

// Export all example plans for easy access
export const examplePlans = {
  formFilling: createFormFillingPlan,
  checkout: createCheckoutPlan,
  dataScraping: createDataScrapingPlan,
  robustWorkflow: createRobustWorkflowPlan
};
