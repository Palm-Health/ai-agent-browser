import { BrowserGoal, BrowserPlan } from './types';
import { planSafeActions } from './safeActions';

export function buildActionPlan(goal: BrowserGoal): BrowserPlan {
  return planSafeActions(goal);
}
