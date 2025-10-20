import { Action, Plan, ActionResult } from './actions';
import { AIBrowserBridge } from './actions';

// Minimal page snapshot for resolution - not retained beyond resolution step
interface PageSnapshot {
  url: string;
  title: string;
  elements: Array<{
    handle: string;
    role: string;
    text: string;
    selector: string;
    attributes?: Record<string, string>;
  }>;
}

// Handle mapping cache - WeakMap for automatic cleanup
const handleMap = new WeakMap<Element, string>();

export async function resolveHandles(bridge: AIBrowserBridge, tabId: string, plan: Plan): Promise<Plan> {
  // Get minimal page snapshot (throttled by aiBridge)
  const snapshot = await getPageSnapshot(bridge, tabId);
  
  // Create resolved plan with concrete handles
  const resolvedSteps: Action[] = [];
  
  for (const step of plan.steps) {
    const resolvedStep = await resolveActionStep(step, snapshot);
    resolvedSteps.push(resolvedStep);
  }
  
  // Return resolved plan - snapshot is not retained
  return {
    ...plan,
    steps: resolvedSteps
  };
}

async function getPageSnapshot(bridge: AIBrowserBridge, tabId: string): Promise<PageSnapshot> {
  try {
    // Use existing getPageContent method which is already throttled
    const content = await bridge.getPageContent(tabId);
    
    return {
      url: content.url || '',
      title: content.title || '',
      elements: (content.elements || []).slice(0, 500) // Cap to 500 elements
    };
  } catch (error) {
    // Return empty snapshot if page content fails
    return {
      url: '',
      title: '',
      elements: []
    };
  }
}

async function resolveActionStep(step: Action, snapshot: PageSnapshot): Promise<Action> {
  switch (step.kind) {
    case 'click':
    case 'type':
    case 'select':
    case 'scrollIntoView':
      // Resolve placeholder handles
      const resolvedHandle = resolveHandle(step.handle, snapshot);
      return {
        ...step,
        handle: resolvedHandle
      };
      
    case 'waitFor':
      // Resolve selector-based waitFor
      if (step.selector && !step.handle) {
        const resolvedHandle = resolveSelector(step.selector, snapshot);
        if (resolvedHandle) {
          return {
            ...step,
            handle: resolvedHandle,
            selector: undefined // Remove selector since we have handle
          };
        }
      }
      return step;
      
    default:
      // No resolution needed for other action types
      return step;
  }
}

function resolveHandle(placeholderHandle: string, snapshot: PageSnapshot): string {
  // Map common placeholder handles to actual elements
  const mappings: Record<string, (elements: PageSnapshot['elements']) => string | null> = {
    'h_login_email_guess': (elements) => findElementByRole(elements, ['input'], ['email', 'user', 'login', 'username']),
    'h_login_password_guess': (elements) => findElementByRole(elements, ['input'], ['password', 'pass']),
    'h_login_submit_guess': (elements) => findElementByRole(elements, ['button', 'input'], ['submit', 'login', 'sign in']),
    'h_form_target_guess': (elements) => findElementByRole(elements, ['input', 'textarea'], []),
    'h_form_submit_guess': (elements) => findElementByRole(elements, ['button', 'input'], ['submit', 'send']),
    'h_scrape_target_guess': (elements) => findElementByRole(elements, ['a', 'button'], []),
    'h_download_target_guess': (elements) => findElementByRole(elements, ['a', 'button'], ['download']),
    'h_download_link_guess': (elements) => findElementByRole(elements, ['a'], ['download', '.pdf', '.zip']),
    'h_custom_target_guess': (elements) => findElementByRole(elements, ['a', 'button', 'input'], [])
  };
  
  const resolver = mappings[placeholderHandle];
  if (resolver) {
    const resolved = resolver(snapshot.elements);
    if (resolved) {
      return resolved;
    }
  }
  
  // If no mapping found, return the original handle
  return placeholderHandle;
}

function resolveSelector(selector: string, snapshot: PageSnapshot): string | null {
  // Simple selector resolution - find first matching element
  for (const element of snapshot.elements) {
    if (matchesSelector(element, selector)) {
      return element.handle;
    }
  }
  return null;
}

function findElementByRole(
  elements: PageSnapshot['elements'], 
  roles: string[], 
  keywords: string[]
): string | null {
  // Score elements based on role and keyword matches
  let bestMatch: { element: PageSnapshot['elements'][0]; score: number } | null = null;
  
  for (const element of elements) {
    let score = 0;
    
    // Role matching
    if (roles.includes(element.role)) {
      score += 10;
    }
    
    // Keyword matching in text or attributes
    const searchText = `${element.text} ${JSON.stringify(element.attributes || {})}`.toLowerCase();
    for (const keyword of keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        score += 5;
      }
    }
    
    // Prefer elements with text content
    if (element.text.trim()) {
      score += 2;
    }
    
    if (score > 0 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { element, score };
    }
  }
  
  return bestMatch?.element.handle || null;
}

function matchesSelector(element: PageSnapshot['elements'][0], selector: string): boolean {
  // Simple selector matching - check if element's selector contains the target
  const elementSelector = element.selector.toLowerCase();
  const targetSelector = selector.toLowerCase();
  
  // Handle common selector patterns
  if (targetSelector.includes(',')) {
    // Multiple selectors (OR)
    return targetSelector.split(',').some(s => elementSelector.includes(s.trim()));
  }
  
  if (targetSelector.includes(':')) {
    // Pseudo-selectors - extract base selector
    const baseSelector = targetSelector.split(':')[0];
    return elementSelector.includes(baseSelector);
  }
  
  // Direct match
  return elementSelector.includes(targetSelector);
}

// Helper to create stable handle from element
export function createStableHandle(element: Element): string {
  // Check if we already have a handle for this element
  const existingHandle = handleMap.get(element);
  if (existingHandle) {
    return existingHandle;
  }
  
  // Generate new stable handle using CSS path + text hash
  const cssPath = getCssPath(element);
  const text = (element as HTMLElement).innerText?.slice(0, 64) ?? '';
  const key = `${cssPath}::${text}`;
  const handle = `h_${hash(key)}`;
  
  // Cache the mapping
  handleMap.set(element, handle);
  
  return handle;
}

function getCssPath(el: Element): string {
  if (el.id) {
    return `#${el.id}`;
  }
  
  const path: string[] = [];
  let current: Element | null = el;
  
  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let selector = current.nodeName.toLowerCase();
    
    if (current.parentElement) {
      const siblings = Array.from(current.parentElement.children);
      const sameTag = siblings.filter(s => s.nodeName === current!.nodeName);
      
      if (sameTag.length > 1) {
        const index = sameTag.indexOf(current) + 1;
        selector += `:nth-of-type(${index})`;
      }
    }
    
    path.unshift(selector);
    current = current.parentElement;
    
    // Limit path depth to avoid extremely long selectors
    if (path.length >= 5) break;
  }
  
  return path.join(' > ');
}

function hash(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}
