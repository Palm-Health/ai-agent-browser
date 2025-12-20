import type { FunctionCall, FunctionDeclaration } from "@google/genai";
import { Type } from "@google/genai";

// Export FunctionDeclaration for MCP tools
export { FunctionDeclaration };

// AI Provider Types
export interface AIProvider {
  name: string;
  models: AIModel[];
  capabilities: AICapability[];
  chat: (messages: ChatMessage[], tools?: Tool[]) => Promise<AIResponse>;
  generateContent: (prompt: string, options?: any) => Promise<string>;
  streamResponse: (messages: ChatMessage[], tools?: Tool[]) => AsyncIterable<AIResponse>;
  embeddings: (text: string) => Promise<number[]>;
}

// Pricing structure for AI models
export interface Pricing {
  inputPer1k?: number;   // USD per 1k input tokens
  outputPer1k?: number;  // USD per 1k output tokens
  perCall?: number;      // USD per API call (fixed cost)
}

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  capabilities: AICapability[];
  contextWindow: number;
  costPerToken: number; // DEPRECATED: Use pricing instead
  maxTokens: number;
  supportsVision: boolean;
  supportsFunctionCalling: boolean;
  // G1 enhancements
  isLocal: boolean;            // Explicit local vs remote flag
  tags?: string[];             // e.g., ['reasoning','codegen','fast','medical']
  pricing?: Pricing;           // Structured pricing information
}

export enum AICapability {
  TEXT_GENERATION = 'text_generation',
  FUNCTION_CALLING = 'function_calling',
  VISION = 'vision',
  EMBEDDINGS = 'embeddings',
  STREAMING = 'streaming',
  CODE_GENERATION = 'code_generation',
  REASONING = 'reasoning',
}

export interface AIResponse {
  text?: string;
  functionCalls?: FunctionCall[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model?: string;
  finishReason?: string;
}

// MCP Types
export interface MCPServer {
  id: string;
  name: string;
  description: string;
  version: string;
  status: 'connected' | 'disconnected' | 'error';
  endpoint?: string;
  tools: MCPTool[];
  resources: MCPResource[];
  capabilities: string[];
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
  serverId: string;
  category?: string;
  permissions?: ToolPermission[];
}

export interface MCPResource {
  uri: string;
  name: string;
  description: string;
  mimeType?: string;
  serverId: string;
  metadata?: Record<string, any>;
}

export interface ToolPermission {
  type: 'read' | 'write' | 'execute';
  scope: string;
  requiresConfirmation: boolean;
}

export interface Tool {
  name: string;
  description: string;
  inputSchema: any;
  source: 'native' | 'mcp';
  serverId?: string;
  category?: string;
  permissions?: ToolPermission[];
}

// Enhanced Browser Context
export interface BrowserContext {
  url: string;
  title: string;
  pageContent: InteractiveElement[];
  screenshot?: string; // T9: Base64 PNG data URI for cross-context reliability
  metadata: {
    loadTime: number;
    lastModified: Date;
    cookies: any[];
    localStorage: Record<string, any>;
    sessionStorage: Record<string, any>;
  };
  domSnapshot?: string;
}

// Enhanced Execution Context
export interface ExecutionContext {
  browserContext: BrowserContext;
  tabId: string;
  url: string;
  pageContent: any;
  navigate: (url: string) => Promise<void>;
  clickElement: (elementId: string) => Promise<void>;
  fillFormElement: (elementId: string, value: string) => Promise<void>;
  executeJavaScript: (code: string) => Promise<any>;
  takeScreenshot: () => Promise<string>; // T9: Returns base64 PNG data URI
  getPageContent: () => Promise<any>;
  // MCP tool execution
  executeMCPTool: (toolName: string, args: any, serverId?: string) => Promise<ToolResult>;
  // Native browser tools
  executeNativeTool: (toolName: string, args: any) => Promise<ToolResult>;
}

// Enhanced Tool Result
export interface ToolResult {
  success: boolean;
  message?: string;
  content?: any;
  summary?: string;
  data?: any;
  error?: string;
  executionTime?: number;
  toolUsed?: string;
  serverId?: string;
}

// Workflow and Automation
export interface WorkflowRecording {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  createdAt: Date;
  lastUsed?: Date;
  successRate: number;
}

export interface WorkflowStep {
  id: string;
  type: 'navigation' | 'click' | 'fill' | 'wait' | 'tool_call';
  target?: string;
  value?: any;
  timestamp: number;
  success: boolean;
  error?: string;
}

export interface BrowserEvent {
  type: 'page_load' | 'title_update' | 'click' | 'form_submit' | 'navigation' | 'error';
  timestamp: number;
  data: any;
  tabId: string;
}

// Discriminated union for Chat Messages
export type ChatMessage = { id: number } & (
    | { type: 'user'; text: string }
    | { type: 'agent'; text: string }
    | { type: 'plan'; plan: Plan }
    | { type: 'function_call'; functionCall: FunctionCall }
    | { type: 'tool_result'; toolResult: ToolResult }
    | { type: 'mcp_tool_call'; toolCall: MCPToolCall }
    | { type: 'mcp_tool_result'; toolResult: ToolResult }
);

export interface MCPToolCall {
  name: string;
  arguments: any;
  serverId: string;
  id: string;
}

export interface Plan {
    id: number;
    objective: string;
    steps: PlanStep[];
    status: 'awaiting_approval' | 'executing' | 'completed' | 'failed' | 'cancelled';
    modelUsed?: string;
    estimatedCost?: number;
    executionTime?: number;
}

export interface PlanStep {
    functionCall: FunctionCall | MCPToolCall;
    status: 'pending' | 'executing' | 'completed' | 'failed';
    result?: ToolResult;
    executionTime?: number;
    retryCount?: number;
}

export interface FunctionCallPlan {
    steps: { functionCall: FunctionCall }[];
}

export interface InteractiveElement {
    id: string;
    tag: string;
    attributes: { [key: string]: string };
    text?: string;
    rect?: DOMRect;
    visible?: boolean;
    clickable?: boolean;
}

export interface Memory {
    objective: string;
    steps: (FunctionCall | MCPToolCall)[];
    successRate: number;
    lastUsed: Date;
    embeddings?: number[];
    tags: string[];
}

export interface Bookmark {
    id: string;
    url: string;
    title: string;
    description?: string;
    tags: string[];
    createdAt: Date;
    lastVisited?: Date;
}

export interface Tab {
    id: number;
    url: string;
    title: string;
    pageContent: InteractiveElement[];
    faviconUrl?: string;
    browserViewId?: string;
    lastActive: Date;
    isLoading: boolean;
}

// Configuration Types
export interface AppConfig {
  aiProviders: {
    gemini?: { apiKey: string };
    openai?: { apiKey: string };
    anthropic?: { apiKey: string };
    ollama?: { endpoint: string };
    deepseek?: { apiKey: string };
  };
  mcpServers: MCPServerConfig[];
  modelPreferences: {
    defaultModel: string;
    costLimit: number;
    maxTokens: number;
  };
  routingPreferences: {
    privacyMode: 'strict' | 'balanced' | 'performance';
    defaultCostBudget: number;
    preferLocalForCategories: string[];
    maxResponseTime: number;
    autoFallback: boolean;
    learningEnabled: boolean;
  };
  browserSettings: {
    userAgent: string;
    enableDevTools: boolean;
    disableCORS: boolean;
  };
  security: {
    requireConfirmationFor: string[];
    allowedDomains: string[];
    blockedDomains: string[];
  };
}

export interface MCPServerConfig {
  id: string;
  name: string;
  type: 'local' | 'remote';
  command?: string;
  args?: string[];
  endpoint?: string;
  autoStart: boolean;
  timeout: number;
  retries: number;
  env?: Record<string, string>;
}

// Native browser tools (enhanced)
export const nativeTools: FunctionDeclaration[] = [
    {
        name: 'create_plan',
        description: 'Creates a step-by-step plan to accomplish a complex user objective. Use this for any task that requires more than one tool call.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                steps: {
                    type: Type.ARRAY,
                    description: 'An array of function calls that represent the plan.',
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            functionCall: {
                                type: Type.OBJECT,
                                description: 'A single tool call, e.g., navigate_to_url({ "url": "..." })',
                            }
                        }
                    }
                }
            },
            required: ['steps']
        }
    },
    {
        name: 'navigate_to_url',
        description: 'Navigates the browser to the specified URL.',
        parameters: {
            type: Type.OBJECT,
            properties: { url: { type: Type.STRING, description: 'The full URL to navigate to.' } },
            required: ['url'],
        },
    },
    {
        name: 'google_search',
        description: 'Performs a Google search for the given query.',
        parameters: {
            type: Type.OBJECT,
            properties: { query: { type: Type.STRING, description: 'The search query.' } },
            required: ['query'],
        },
    },
    {
        name: 'read_page_content',
        description: 'Reads the interactive elements (links, buttons, inputs) from the current page.',
        parameters: { type: Type.OBJECT, properties: {} },
    },
    {
        name: 'click_element',
        description: 'Clicks on an interactive element on the current page, identified by its ID.',
        parameters: {
            type: Type.OBJECT,
            properties: { elementId: { type: Type.STRING, description: 'The ID of the element to click.' } },
            required: ['elementId'],
        },
    },
    {
        name: 'fill_form_element',
        description: 'Fills a form input element on the current page with a value.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                elementId: { type: Type.STRING, description: 'The ID of the form element to fill.' },
                value: { type: Type.STRING, description: 'The value to fill.' },
            },
            required: ['elementId', 'value'],
        },
    },
    {
        name: 'execute_javascript',
        description: 'Executes JavaScript code in the current page context.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                code: { type: Type.STRING, description: 'The JavaScript code to execute.' },
            },
            required: ['code'],
        },
    },
    {
        name: 'take_screenshot',
        description: 'Takes a screenshot of the current page.',
        parameters: { type: Type.OBJECT, properties: {} },
    },
    {
        name: 'summarize_current_page',
        description: 'Fetches and summarizes the text content of the current page.',
        parameters: { type: Type.OBJECT, properties: {} },
    },
    {
        name: 'orchestrator.plan',
        description: 'Generate a mission plan for a high-level goal across agents.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                id: { type: Type.STRING, description: 'Mission identifier' },
                userId: { type: Type.STRING, description: 'Requesting user identifier' },
                type: { type: Type.STRING, description: 'Mission type key' },
                goal: { type: Type.STRING, description: 'Natural language mission intent' },
                brandId: { type: Type.STRING, description: 'Optional brand ID' },
                practiceId: { type: Type.STRING, description: 'Optional practice ID' },
                constraints: { type: Type.OBJECT, description: 'Constraint object' },
                context: { type: Type.OBJECT, description: 'Prebuilt mission context' },
            },
            required: ['id', 'userId', 'type', 'goal'],
        },
    },
    {
        name: 'orchestrator.run',
        description: 'Plan and execute a mission, returning results.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                id: { type: Type.STRING, description: 'Mission identifier' },
                userId: { type: Type.STRING, description: 'Requesting user identifier' },
                type: { type: Type.STRING, description: 'Mission type key' },
                goal: { type: Type.STRING, description: 'Natural language mission intent' },
                brandId: { type: Type.STRING, description: 'Optional brand ID' },
                practiceId: { type: Type.STRING, description: 'Optional practice ID' },
                constraints: { type: Type.OBJECT, description: 'Constraint object' },
                context: { type: Type.OBJECT, description: 'Prebuilt mission context' },
            },
            required: ['id', 'userId', 'type', 'goal'],
        },
    },
    {
        name: 'orchestrator.status',
        description: 'Return recent mission status, logs, and outcomes.',
        parameters: { type: Type.OBJECT, properties: {} },
    },
    {
        name: 'orchestrator.list_missions',
        description: 'List predefined mission templates and metadata.',
        parameters: { type: Type.OBJECT, properties: {} },
    },
    {
        name: 'task_completed',
        description: 'Call this function when you have fully completed the user\'s request.',
        parameters: {
            type: Type.OBJECT,
            properties: { summary: { type: Type.STRING, description: 'A summary of how the task was completed.' } },
            required: ['summary'],
        },
    }
];

// Legacy tools export for backward compatibility
export const tools = nativeTools;

// Global type declarations for Electron API
declare global {
  interface Window {
    electronAPI: {
      createBrowserView: (tabId: string) => Promise<string | null>;
      navigateBrowserView: (tabId: string, url: string) => Promise<{ success: boolean; url?: string; error?: string; retried?: boolean }>;
      executeJavaScript: (tabId: string, code: string) => Promise<{ success: boolean; result?: any; error?: string }>;
      getPageContent: (tabId: string) => Promise<{ success: boolean; content?: any; error?: string }>;
      clickElement: (tabId: string, elementId: string) => Promise<{ success: boolean; error?: string }>;
      fillFormElement: (tabId: string, elementId: string, value: string) => Promise<{ success: boolean; error?: string }>;
      takeScreenshot: (tabId: string) => Promise<{ success: boolean; image?: Buffer | string; base64Png?: string; error?: string }>;
      closeBrowserView: (tabId: string) => Promise<boolean>;
      setActiveBrowserView: (tabId: string) => Promise<boolean>;
      onPageLoaded: (callback: (tabId: string) => void) => void;
      onPageNavigated: (callback: (tabId: string, url: string) => void) => void;
      onPageTitleUpdated: (callback: (tabId: string, title: string) => void) => void;
      onPageLoadFailed: (callback: (tabId: string, errorCode: number, errorDescription: string) => void) => void;
      startMCPServer: (serverConfig: any) => Promise<{ success: boolean; serverId?: string }>;
      stopMCPServer: (serverId: string) => Promise<{ success: boolean }>;
      getMCPTools: (serverId: string) => Promise<{ success: boolean; tools?: any[] }>;
      removeAllListeners: (channel: string) => void;
      // Additional methods that may not be implemented yet
      clickHandle?: (tabId: string, handle: string) => Promise<{ success: boolean; error?: string }>;
      typeInto?: (tabId: string, handle: string, text: string, replace: boolean, delayMs: number) => Promise<{ success: boolean; error?: string }>;
      selectOption?: (tabId: string, handle: string, option: string) => Promise<{ success: boolean; error?: string }>;
      waitFor?: (tabId: string, condition: { selector?: string; handle?: string }) => Promise<{ success: boolean; error?: string }>;
      scrollIntoView?: (tabId: string, handle: string) => Promise<{ success: boolean; error?: string }>;
      saveFile?: (mimeType: string, data: string, path: string) => Promise<{ success: boolean; error?: string }>;
    };
  }
}
