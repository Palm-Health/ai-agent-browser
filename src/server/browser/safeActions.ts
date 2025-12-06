import { BrowserGoal, BrowserPlan, BrowserRunResult } from './types';
import { navigate } from './chromiumClient';
import { SIMULATION_MODE } from '../config/safety';

export function planSafeActions(goal: BrowserGoal): BrowserPlan {
  return {
    id: `browser-plan-${Date.now()}`,
    steps: [
      { id: 'visit', action: 'visit', target: goal.url },
      { id: 'extract-title', action: 'extract', target: 'title' },
    ],
  };
}

export async function executePlan(plan: BrowserPlan): Promise<BrowserRunResult> {
  if (plan.steps.length === 0) return { success: false };
  const visitStep = plan.steps.find((step) => step.action === 'visit');
  const title = visitStep && (await navigate({ url: visitStep.target || 'about:blank', instruction: 'visit' })).title;

  const simulatedScreenshot = SIMULATION_MODE ? 'data:image/png;base64,simulated' : undefined;
  return { success: true, title, screenshot: simulatedScreenshot };
}
