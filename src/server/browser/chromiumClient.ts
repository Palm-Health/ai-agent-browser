import { BrowserGoal } from './types';
import { SIMULATION_MODE } from '../config/safety';

export async function navigate(goal: BrowserGoal): Promise<{ title: string }> {
  if (SIMULATION_MODE) {
    return { title: `Simulated visit to ${goal.url}` };
  }
  // In production this would drive Playwright/Puppeteer.
  return { title: 'Browser automation placeholder' };
}
