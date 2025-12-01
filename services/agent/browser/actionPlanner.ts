import { inferPageIntent, type PageStructure } from './pageUnderstanding';

export interface BrowserTaskPlanStep {
  action: string;
  selector?: string;
  value?: string;
}

export interface BrowserTaskPlan {
  goal: string;
  steps: BrowserTaskPlanStep[];
  reasoning: string;
}

function findElementByKeyword(
  elements: { selector: string; text?: string; type?: string }[],
  keywords: string[],
): string | undefined {
  const lowerKeywords = keywords.map(word => word.toLowerCase());
  const matched = elements.find(el => {
    const haystack = (el.text || el.type || '').toLowerCase();
    return lowerKeywords.some(keyword => haystack.includes(keyword));
  });
  return matched?.selector;
}

function findInputByHint(inputs: { selector: string; placeholder?: string; label?: string }[], hint: string) {
  const lowerHint = hint.toLowerCase();
  return inputs.find(input =>
    (input.placeholder || '').toLowerCase().includes(lowerHint) ||
    (input.label || '').toLowerCase().includes(lowerHint),
  )?.selector;
}

export async function planBrowserTask(goal: string, structure: PageStructure): Promise<BrowserTaskPlan> {
  const steps: BrowserTaskPlanStep[] = [];
  const reasoning: string[] = [];

  if (structure.url) {
    steps.push({ action: 'navigate', value: structure.url });
    reasoning.push('Navigate to the target URL to inspect interactive elements.');
  }

  const intent = await inferPageIntent(structure);
  reasoning.push(`Detected page intent: ${intent}.`);

  const normalizedGoal = goal.toLowerCase();
  const clickable = structure.clickableElements || [];
  const inputs = structure.inputElements || [];

  if (/login|sign in|authenticate/.test(normalizedGoal)) {
    const userSelector = findInputByHint(inputs, 'email') || findInputByHint(inputs, 'username');
    const passwordSelector = findInputByHint(inputs, 'password');
    const submitSelector = findElementByKeyword(clickable, ['log in', 'sign in', 'continue']) ||
      findElementByKeyword(clickable, ['submit']);

    if (userSelector) steps.push({ action: 'type', selector: userSelector, value: '<username>' });
    if (passwordSelector) steps.push({ action: 'type', selector: passwordSelector, value: '<password>' });
    if (submitSelector) steps.push({ action: 'click', selector: submitSelector });
    reasoning.push('Constructed login sequence using detected email/username and password inputs.');
  }

  if (/upload|add media|new file/.test(normalizedGoal)) {
    const uploadSelector = findElementByKeyword(clickable, ['upload', 'new', 'add']);
    if (uploadSelector) {
      steps.push({ action: 'click', selector: uploadSelector });
      reasoning.push('Upload-related CTA detected; plan includes triggering upload control.');
    }
  }

  if (/analytics|metrics|stats|report/.test(normalizedGoal)) {
    const analyticsSelector = findElementByKeyword(clickable, ['analytics', 'dashboard', 'insights']);
    if (analyticsSelector) {
      steps.push({ action: 'click', selector: analyticsSelector });
      reasoning.push('Analytics entry point found; plan navigates to analytics/dashboard.');
    }
    steps.push({ action: 'extract', selector: structure.dataTables?.[0]?.selector });
  }

  if (steps.length === 1 && steps[0].action === 'navigate') {
    const primaryButton = clickable[0];
    if (primaryButton?.selector) {
      steps.push({ action: 'click', selector: primaryButton.selector });
      reasoning.push('Fallback action: click the first prominent clickable element.');
    }
  }

  return {
    goal,
    steps: steps.filter(step => step.action !== 'extract' || step.selector),
    reasoning: reasoning.join(' '),
  } satisfies BrowserTaskPlan;
}
