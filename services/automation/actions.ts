// Atomic actions for page automation DSL
export type Action =
  | { kind: 'navigate'; url: string; timeoutMs?: number }
  | { kind: 'click'; handle: string; timeoutMs?: number }
  | { kind: 'type'; handle: string; text: string; replace?: boolean; delayMs?: number; timeoutMs?: number }
  | { kind: 'select'; handle: string; value: string; timeoutMs?: number }
  | { kind: 'waitFor'; selector?: string; handle?: string; timeoutMs?: number }
  | { kind: 'scrollIntoView'; handle: string; timeoutMs?: number }
  | { kind: 'screenshot'; fullPage?: boolean; path?: string; timeoutMs?: number };

export interface Plan {
  id: string;               // uuid
  steps: Action[];
  budgetMs?: number;        // overall time budget
  budgetOps?: number;       // max actions to execute
}

export interface ActionResult<T = unknown> {
  ok: boolean;
  code?: string;            // e.g., 'TIMEOUT' | 'NOT_FOUND' | 'PERMISSION_DENIED'
  data?: T;
  meta?: Record<string, unknown>;
}

export interface PlanResult {
  planId: string;
  results: ActionResult[];
  elapsedMs: number;
  aborted?: boolean;
}

// Permission service interface for action execution
export interface PermissionService {
  require(operation: string, context: Record<string, any>): Promise<void>;
}

// AI Browser Bridge interface for action execution
export interface AIBrowserBridge {
  navigateTo(tabId: string, url: string): Promise<void>;
  clickHandle(tabId: string, handle: string): Promise<ActionResult>;
  typeInto(tabId: string, handle: string, text: string, replace: boolean, delayMs: number): Promise<ActionResult>;
  selectOption(tabId: string, handle: string, value: string): Promise<ActionResult>;
  waitFor(tabId: string, selector?: string, handle?: string): Promise<ActionResult>;
  scrollIntoView(tabId: string, handle: string): Promise<ActionResult>;
  takeScreenshot(tabId: string, fullPage: boolean): Promise<string>;
  saveFile(mimeType: string, data: string, path: string): Promise<void>;
}
