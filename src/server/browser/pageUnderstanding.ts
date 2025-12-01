import { BrowserGoal } from './types';

export function understandPage(goal: BrowserGoal) {
  return {
    hints: [`Inspect ${goal.url}`, `Look for ${goal.instruction}`],
  };
}
