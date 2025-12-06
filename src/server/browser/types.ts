export interface BrowserGoal {
  url: string;
  instruction: string;
}

export interface BrowserPlanStep {
  id: string;
  action: 'visit' | 'extract' | 'screenshot';
  target?: string;
}

export interface BrowserPlan {
  id: string;
  steps: BrowserPlanStep[];
}

export interface BrowserRunResult {
  success: boolean;
  title?: string;
  screenshot?: string;
}
