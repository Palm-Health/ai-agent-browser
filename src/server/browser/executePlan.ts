import { BrowserPlan, BrowserRunResult } from './types';
import { executePlan as runSafePlan } from './safeActions';

export async function executeBrowserPlan(plan: BrowserPlan): Promise<BrowserRunResult> {
  return runSafePlan(plan);
}
