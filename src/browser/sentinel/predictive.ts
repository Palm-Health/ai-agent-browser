import { BrowserHealthEvent } from './sentinel';

export interface PredictiveResult {
  risk: 'low' | 'medium' | 'high';
  reasons: string[];
  suggestedPreHeals: string[];
}

export function predictFailure(events: BrowserHealthEvent[]): PredictiveResult {
  const reasons: string[] = [];
  const suggestedPreHeals: string[] = [];

  const hasMissingSelector = events.some((event) => event.type === 'missing-selector');
  const hasPopup = events.some((event) => event.type === 'popup-detected');
  const hasRateLimit = events.some((event) => event.type === 'rate-limit');
  const layoutShiftFlurry = events.filter((event) => event.type === 'skill-pack-mismatch').length >= 2;
  const rapidDomChanges = events.filter((event) => event.type === 'dom-change').length > 10;

  if (hasMissingSelector) {
    reasons.push('Skill pack selector not found in DOM');
    suggestedPreHeals.push('Attempt selector recovery', 'Reload skill pack metadata');
  }

  if (hasPopup) {
    reasons.push('Popup overlay detected');
    suggestedPreHeals.push('Attempt to close overlay via known selectors');
  }

  if (hasRateLimit) {
    reasons.push('Rate limit responses detected');
    suggestedPreHeals.push('Throttle requests', 'Retry with exponential backoff');
  }

  if (layoutShiftFlurry) {
    reasons.push('Repeated layout shifts suggest DOM drift');
    suggestedPreHeals.push('Delay action until layout stabilizes');
  }

  if (rapidDomChanges) {
    reasons.push('DOM changing quickly; skill pack may be mismatched');
    suggestedPreHeals.push('Re-evaluate selectors before continuing');
  }

  let risk: PredictiveResult['risk'] = 'low';
  if (hasMissingSelector || (hasPopup && layoutShiftFlurry)) {
    risk = 'high';
  } else if (hasPopup || hasRateLimit || layoutShiftFlurry || rapidDomChanges) {
    risk = 'medium';
  }

  return { risk, reasons, suggestedPreHeals };
}
