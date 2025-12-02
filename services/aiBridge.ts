import { BrowserContext, ExecutionContext, BrowserEvent, Tab } from '../types';
import { enhancedToolService } from './enhancedToolService';
import { mcpManager } from './mcp/mcpManager';
import { mcpToolRegistry } from './mcp/toolRegistry';
import { configService } from './config';
import { ActionResult } from './automation/actions';

// Structured error class for bridge operations
export class BridgeError extends Error {
  public readonly code: string;
  public readonly context: Record<string, any>;
  public readonly timestamp: number;

  constructor(code: string, message: string, context: Record<string, any> = {}) {
    super(message);
    this.name = 'BridgeError';
    this.code = code;
    this.context = context;
    this.timestamp = Date.now();
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }
}

// Permission checking interface
interface PermissionChecker {
  checkOrPrompt(operation: string, context: Record<string, any>): Promise<boolean>;
}

// Simple permission checker implementation
class SimplePermissionChecker implements PermissionChecker {
  async checkOrPrompt(operation: string, context: Record<string, any>): Promise<boolean> {
    const securitySettings = configService.getSecuritySettings();
    
    // Check if operation requires confirmation
    if (securitySettings.requireConfirmationFor.includes(operation)) {
      // In a real implementation, this would show a confirmation dialog
      // For now, we'll log and return false for security
      console.warn(`Operation ${operation} requires user confirmation but no UI available`);
      return false;
    }
    
    return true;
  }
}

// Helper functions for stable element handles (T5)
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

function getStableHandle(el: Element): string {
  const sel = getCssPath(el);
  const text = (el as HTMLElement).innerText?.slice(0, 64) ?? '';
  const key = `${sel}::${text}`;
  return `h_${hash(key)}`;
}

export class AIBrowserBridge {
  private activeTabs: Map<string, Tab> = new Map();
  private browserEvents: BrowserEvent[] = [];
  private eventListeners: Map<string, ((event: BrowserEvent) => void)[]> = new Map();
  private isElectron: boolean = false;
  private permissions: PermissionChecker;
  private disposed: boolean = false;
  private operationLocks: Map<string, Promise<any>> = new Map();
  private lastPageContentFetch: Map<string, number> = new Map(); // Throttling for page content
  private readonly PAGE_CONTENT_THROTTLE_MS = 500; // 500ms throttle per tab
  private activeTabId: string | null = null; // T8: Track active tab for consistency
  private bound: {
    onLoaded: (tabId: string) => void;
    onNavigated: (tabId: string, url: string) => void;
    onTitle: (tabId: string, title: string) => void;
    onLoadFailed: (tabId: string, errorCode: number, errorDescription: string) => void;
  };

  constructor() {
    this.isElectron = typeof window !== 'undefined' && window.electronAPI !== undefined;
    this.permissions = new SimplePermissionChecker();
    
    // Bind event handlers for proper cleanup
    this.bound = {
      onLoaded: (tabId: string) => {
        this.handleBrowserEvent({
          type: 'page_load',
          timestamp: Date.now(),
          data: { tabId },
          tabId,
        });
      },
      onNavigated: (tabId: string, url: string) => {
        this.handleBrowserEvent({
          type: 'navigation',
          timestamp: Date.now(),
          data: { tabId, url },
          tabId,
        });
      },
      onTitle: (tabId: string, title: string) => {
        this.handleBrowserEvent({
          type: 'title_update',
          timestamp: Date.now(),
          data: { tabId, title },
          tabId,
        });
      },
      onLoadFailed: (tabId: string, errorCode: number, errorDescription: string) => {
        this.handleBrowserEvent({
          type: 'error',
          timestamp: Date.now(),
          data: { tabId, errorCode, errorDescription },
          tabId,
        });
      },
    };
    
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    if (this.isElectron) {
      // Set up Electron IPC listeners with bound methods for proper cleanup
      window.electronAPI.onPageLoaded(this.bound.onLoaded);
      window.electronAPI.onPageNavigated(this.bound.onNavigated);
      window.electronAPI.onPageTitleUpdated(this.bound.onTitle);
      window.electronAPI.onPageLoadFailed(this.bound.onLoadFailed);
    }
  }

  // Tab management
  async createTab(tabId: string, url: string = 'https://www.google.com'): Promise<Tab> {
    this.ensureNotDisposed();
    
    const lockKey = `createTab_${tabId}`;
    if (this.operationLocks.has(lockKey)) {
      throw new BridgeError('OPERATION_IN_PROGRESS', `Tab creation already in progress for ${tabId}`, { tabId, op: 'createTab' });
    }

    const operation = this.performCreateTab(tabId, url);
    this.operationLocks.set(lockKey, operation);
    
    try {
      const result = await operation;
      return result;
    } finally {
      this.operationLocks.delete(lockKey);
    }
  }

  private async performCreateTab(tabId: string, url: string): Promise<Tab> {
    try {
      if (this.isElectron) {
        await window.electronAPI.createBrowserView(tabId);
        await window.electronAPI.navigateBrowserView(tabId, url);
      }

      const tab: Tab = {
        id: parseInt(tabId),
        url,
        title: 'Loading...',
        pageContent: [],
        browserViewId: tabId,
        lastActive: new Date(),
        isLoading: true,
      };

      this.activeTabs.set(tabId, tab);
      return tab;
    } catch (error) {
      throw new BridgeError('TAB_CREATION_FAILED', `Failed to create tab ${tabId}: ${(error as Error).message}`, { tabId, op: 'createTab' });
    }
  }

  async closeTab(tabId: string): Promise<void> {
    this.ensureNotDisposed();
    
    const lockKey = `closeTab_${tabId}`;
    if (this.operationLocks.has(lockKey)) {
      throw new BridgeError('OPERATION_IN_PROGRESS', `Tab closure already in progress for ${tabId}`, { tabId, op: 'closeTab' });
    }

    const operation = this.performCloseTab(tabId);
    this.operationLocks.set(lockKey, operation);
    
    try {
      await operation;
    } finally {
      this.operationLocks.delete(lockKey);
    }
  }

  private async performCloseTab(tabId: string): Promise<void> {
    try {
      if (this.isElectron) {
        await window.electronAPI.closeBrowserView(tabId);
      }
      
      // T8: Clear active tab if we're closing it
      if (this.activeTabId === tabId) {
        this.activeTabId = null;
      }
      
      this.activeTabs.delete(tabId);
    } catch (error) {
      throw new BridgeError('TAB_CLOSURE_FAILED', `Failed to close tab ${tabId}: ${(error as Error).message}`, { tabId, op: 'closeTab' });
    }
  }

  async setActiveTab(tabId: string): Promise<void> {
    this.ensureNotDisposed();
    
    const lockKey = `setActiveTab_${tabId}`;
    if (this.operationLocks.has(lockKey)) {
      throw new BridgeError('OPERATION_IN_PROGRESS', `Tab activation already in progress for ${tabId}`, { tabId, op: 'setActiveTab' });
    }

    const operation = this.performSetActiveTab(tabId);
    this.operationLocks.set(lockKey, operation);
    
    try {
      await operation;
    } finally {
      this.operationLocks.delete(lockKey);
    }
  }

  private async performSetActiveTab(tabId: string): Promise<void> {
    // T8: Check tab exists before attempting activation
    if (!this.activeTabs.has(tabId)) {
      throw new BridgeError('TAB_NOT_FOUND', `Tab ${tabId} not found`, { tabId, op: 'setActiveTab' });
    }
    
    try {
      if (this.isElectron) {
        // T8: Wait for Electron acknowledgment before updating local state
        const result = await window.electronAPI.setActiveBrowserView(tabId);
        
        // Check if Electron API returns success indicator
        if (!result) {
          throw new BridgeError('ELECTRON_FAIL', 'Failed to activate tab in Electron', { tabId, op: 'setActiveTab' });
        }
      }
      
      // T8: Update local state only after successful Electron operation
      this.activeTabId = tabId;
      const tab = this.activeTabs.get(tabId);
      if (tab) {
        tab.lastActive = new Date();
      }
    } catch (error) {
      if (error instanceof BridgeError) {
        throw error;
      }
      throw new BridgeError('TAB_ACTIVATION_FAILED', `Failed to set active tab ${tabId}: ${(error as Error).message}`, { tabId, op: 'setActiveTab' });
    }
  }

  getTab(tabId: string): Tab | undefined {
    return this.activeTabs.get(tabId);
  }

  getAllTabs(): Tab[] {
    return Array.from(this.activeTabs.values());
  }

  // T8: Get current active tab ID
  getActiveTabId(): string | null {
    return this.activeTabId;
  }

  // Browser context management
  async getBrowserContext(tabId: string): Promise<BrowserContext> {
    this.ensureNotDisposed();
    
    const tab = this.activeTabs.get(tabId);
    if (!tab) {
      throw new BridgeError('TAB_NOT_FOUND', `Tab ${tabId} not found`, { tabId, op: 'getBrowserContext' });
    }

    const lockKey = `getBrowserContext_${tabId}`;
    if (this.operationLocks.has(lockKey)) {
      throw new BridgeError('OPERATION_IN_PROGRESS', `Browser context retrieval already in progress for ${tabId}`, { tabId, op: 'getBrowserContext' });
    }

    const operation = this.performGetBrowserContext(tabId, tab);
    this.operationLocks.set(lockKey, operation);
    
    try {
      return await operation;
    } finally {
      this.operationLocks.delete(lockKey);
    }
  }

  private async performGetBrowserContext(tabId: string, tab: Tab): Promise<BrowserContext> {
    try {
      let pageContent: any = [];
      let screenshot: string | undefined; // T9: Changed from Buffer to string
      let domSnapshot: string | undefined;

      if (this.isElectron) {
        const contentResult = await window.electronAPI.getPageContent(tabId);
        if (contentResult.success) {
          // Trim and structure page content for better performance
          pageContent = this.trimPageContent(contentResult.content.elements || []);
          domSnapshot = this.trimDOMSnapshot(contentResult.content.html);
        }

        // T9: Use the normalized screenshot method that returns base64
        try {
          screenshot = await this.takeScreenshot(tabId);
        } catch (screenshotError) {
          // Screenshot is optional, log error but don't fail the entire context fetch
          console.warn(`Failed to capture screenshot for tab ${tabId}:`, screenshotError);
          screenshot = undefined;
        }
      }

      return {
        url: tab.url,
        title: tab.title,
        pageContent,
        screenshot,
        metadata: {
          loadTime: Date.now() - tab.lastActive.getTime(),
          lastModified: tab.lastActive,
          cookies: [], // Would be populated from browser
          localStorage: {}, // Would be populated from browser
          sessionStorage: {}, // Would be populated from browser
        },
        domSnapshot,
      };
    } catch (error) {
      throw new BridgeError('BROWSER_CONTEXT_FAILED', `Failed to get browser context for tab ${tabId}: ${(error as Error).message}`, { tabId, op: 'getBrowserContext' });
    }
  }

  // Execution context factory
  createExecutionContext(tabId: string): ExecutionContext {
    return {
      browserContext: {} as BrowserContext, // Will be populated when needed
      tabId,
      url: '', // Will be populated when needed
      pageContent: null, // Will be populated when needed
      navigate: async (url: string) => {
        await this.navigateToUrl(tabId, url);
      },
      clickElement: async (elementId: string) => {
        await this.clickElement(tabId, elementId);
      },
      fillFormElement: async (elementId: string, value: string) => {
        await this.fillFormElement(tabId, elementId, value);
      },
      executeJavaScript: async (code: string) => {
        return await this.executeJavaScript(tabId, code);
      },
      takeScreenshot: async () => {
        return await this.takeScreenshot(tabId);
      },
      getPageContent: async () => {
        return await this.getPageContent(tabId);
      },
      executeMCPTool: async (toolName: string, args: any, serverId?: string) => {
        return await this.executeMCPTool(toolName, args, serverId);
      },
      executeNativeTool: async (toolName: string, args: any) => {
        return await this.executeNativeTool(toolName, args, tabId);
      },
    };
  }

  // Browser operations
  private async navigateToUrl(tabId: string, url: string): Promise<void> {
    await this.ensurePermission('navigate_to_url', tabId);
    
    const lockKey = `navigate_${tabId}`;
    if (this.operationLocks.has(lockKey)) {
      throw new BridgeError('OPERATION_IN_PROGRESS', `Navigation already in progress for ${tabId}`, { tabId, op: 'navigate' });
    }

    const operation = this.performNavigateToUrl(tabId, url);
    this.operationLocks.set(lockKey, operation);
    
    try {
      await operation;
    } finally {
      this.operationLocks.delete(lockKey);
    }
  }

  private async performNavigateToUrl(tabId: string, url: string): Promise<void> {
    try {
      if (this.isElectron) {
        await window.electronAPI.navigateBrowserView(tabId, url);
      } else {
        // Fallback for web version
        window.open(url, '_blank');
      }

      const tab = this.activeTabs.get(tabId);
      if (tab) {
        tab.url = url;
        tab.isLoading = true;
      }
    } catch (error) {
      throw new BridgeError('NAVIGATION_FAILED', `Failed to navigate tab ${tabId} to ${url}: ${(error as Error).message}`, { tabId, op: 'navigate', url });
    }
  }

  private async clickElement(tabId: string, elementId: string): Promise<void> {
    await this.ensurePermission('click_element', tabId);
    
    const lockKey = `click_${tabId}_${elementId}`;
    if (this.operationLocks.has(lockKey)) {
      throw new BridgeError('OPERATION_IN_PROGRESS', `Click operation already in progress for element ${elementId}`, { tabId, elementId, op: 'click' });
    }

    const operation = this.performClickElement(tabId, elementId);
    this.operationLocks.set(lockKey, operation);
    
    try {
      await operation;
    } finally {
      this.operationLocks.delete(lockKey);
    }
  }

  private async performClickElement(tabId: string, elementId: string): Promise<void> {
    try {
      if (this.isElectron) {
        const result = await window.electronAPI.clickElement(tabId, elementId);
        if (!result.success) {
          throw new BridgeError('ELEMENT_CLICK_FAILED', result.error || 'Unknown click error', { tabId, elementId, op: 'click' });
        }
      } else {
        // Fallback for web version
        const element = document.querySelector(`[data-agent-id="${elementId}"]`);
        if (element) {
          (element as HTMLElement).click();
        } else {
          throw new BridgeError('ELEMENT_NOT_FOUND', `Element with ID ${elementId} not found`, { tabId, elementId, op: 'click' });
        }
      }
    } catch (error) {
      if (error instanceof BridgeError) {
        throw error;
      }
      throw new BridgeError('ELEMENT_CLICK_FAILED', `Failed to click element ${elementId} in tab ${tabId}: ${(error as Error).message}`, { tabId, elementId, op: 'click' });
    }
  }

  private async fillFormElement(tabId: string, elementId: string, value: string): Promise<void> {
    await this.ensurePermission('fill_form_element', tabId);
    
    const lockKey = `fill_${tabId}_${elementId}`;
    if (this.operationLocks.has(lockKey)) {
      throw new BridgeError('OPERATION_IN_PROGRESS', `Fill operation already in progress for element ${elementId}`, { tabId, elementId, op: 'fill' });
    }

    const operation = this.performFillFormElement(tabId, elementId, value);
    this.operationLocks.set(lockKey, operation);
    
    try {
      await operation;
    } finally {
      this.operationLocks.delete(lockKey);
    }
  }

  private async performFillFormElement(tabId: string, elementId: string, value: string): Promise<void> {
    try {
      if (this.isElectron) {
        const result = await window.electronAPI.fillFormElement(tabId, elementId, value);
        if (!result.success) {
          throw new BridgeError('ELEMENT_FILL_FAILED', result.error || 'Unknown fill error', { tabId, elementId, op: 'fill' });
        }
      } else {
        // Fallback for web version
        const element = document.querySelector(`[data-agent-id="${elementId}"]`) as HTMLInputElement;
        if (element) {
          element.value = value;
          element.dispatchEvent(new Event('input', { bubbles: true }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
          throw new BridgeError('ELEMENT_NOT_FOUND', `Element with ID ${elementId} not found`, { tabId, elementId, op: 'fill' });
        }
      }
    } catch (error) {
      if (error instanceof BridgeError) {
        throw error;
      }
      throw new BridgeError('ELEMENT_FILL_FAILED', `Failed to fill element ${elementId} in tab ${tabId}: ${(error as Error).message}`, { tabId, elementId, op: 'fill' });
    }
  }

  private async executeJavaScript(tabId: string, code: string): Promise<any> {
    await this.ensurePermission('execute_javascript', tabId);
    
    if (!this.isElectron) {
      throw new BridgeError('UNSUPPORTED', 'executeJavaScript requires Electron', { tabId, op: 'executeJS' });
    }
    
    const lockKey = `executeJS_${tabId}`;
    if (this.operationLocks.has(lockKey)) {
      throw new BridgeError('OPERATION_IN_PROGRESS', `JavaScript execution already in progress for ${tabId}`, { tabId, op: 'executeJS' });
    }

    const operation = this.performExecuteJavaScript(tabId, code);
    this.operationLocks.set(lockKey, operation);
    
    try {
      return await operation;
    } finally {
      this.operationLocks.delete(lockKey);
    }
  }

  private async performExecuteJavaScript(tabId: string, code: string): Promise<any> {
    try {
      const result = await window.electronAPI.executeJavaScript(tabId, code);
      if (!result?.success) {
        throw new BridgeError('ELECTRON_EXEC_FAIL', String(result?.error ?? 'Unknown'), { tabId, op: 'executeJS' });
      }
      return result.result;
    } catch (error) {
      if (error instanceof BridgeError) {
        throw error;
      }
      throw new BridgeError('ELECTRON_EXEC_FAIL', `Failed to execute JavaScript in tab ${tabId}: ${(error as Error).message}`, { tabId, op: 'executeJS' });
    }
  }

  // T9: Return base64 PNG string instead of Buffer for cross-context reliability
  private async takeScreenshot(tabId: string): Promise<string> {
    await this.ensurePermission('take_screenshot', tabId);
    
    const lockKey = `screenshot_${tabId}`;
    if (this.operationLocks.has(lockKey)) {
      throw new BridgeError('OPERATION_IN_PROGRESS', `Screenshot already in progress for ${tabId}`, { tabId, op: 'screenshot' });
    }

    const operation = this.performTakeScreenshot(tabId);
    this.operationLocks.set(lockKey, operation);
    
    try {
      return await operation;
    } finally {
      this.operationLocks.delete(lockKey);
    }
  }

  private async performTakeScreenshot(tabId: string): Promise<string> {
    try {
      if (this.isElectron) {
        const result = await window.electronAPI.takeScreenshot(tabId);
        if (!result?.success) {
          throw new BridgeError('ELECTRON_SCREENSHOT_FAIL', String(result?.error ?? 'Unknown'), { tabId, op: 'screenshot' });
        }
        
        // T9: Normalize to base64 PNG format
        // Handle both base64 string and Buffer responses
        const imageData = result.image;
        if (typeof imageData === 'string') {
          // Already base64, ensure it has data URI prefix
          if (imageData.startsWith('data:image/png;base64,')) {
            return imageData;
          } else if (imageData.startsWith('data:')) {
            return imageData; // Other data URI format
          } else {
            // Raw base64 string, add prefix
            return `data:image/png;base64,${imageData}`;
          }
        } else if (imageData && (imageData instanceof Buffer || imageData instanceof Uint8Array)) {
          // Convert Buffer to base64
          const base64 = Buffer.from(imageData).toString('base64');
          return `data:image/png;base64,${base64}`;
        } else if (result.base64Png) {
          // Use explicit base64Png field if available
          const base64Png = result.base64Png;
          return base64Png.startsWith('data:') 
            ? base64Png 
            : `data:image/png;base64,${base64Png}`;
        }
        
        throw new BridgeError('SCREENSHOT_INVALID_FORMAT', 'Screenshot returned in unexpected format', { tabId, op: 'screenshot' });
      } else {
        throw new BridgeError('UNSUPPORTED', 'Screenshot not supported in web version', { tabId, op: 'screenshot' });
      }
    } catch (error) {
      if (error instanceof BridgeError) {
        throw error;
      }
      throw new BridgeError('SCREENSHOT_FAILED', `Failed to take screenshot of tab ${tabId}: ${(error as Error).message}`, { tabId, op: 'screenshot' });
    }
  }

  private async getPageContent(tabId: string): Promise<any> {
    // T4: Throttle page content requests per tab
    const now = Date.now();
    const lastFetch = this.lastPageContentFetch.get(tabId);
    if (lastFetch && now - lastFetch < this.PAGE_CONTENT_THROTTLE_MS) {
      throw new BridgeError('THROTTLED', `Page content fetch throttled for tab ${tabId}. Please wait ${this.PAGE_CONTENT_THROTTLE_MS}ms between requests.`, { tabId, op: 'getPageContent', throttleMs: this.PAGE_CONTENT_THROTTLE_MS });
    }
    
    const lockKey = `getPageContent_${tabId}`;
    if (this.operationLocks.has(lockKey)) {
      throw new BridgeError('OPERATION_IN_PROGRESS', `Page content retrieval already in progress for ${tabId}`, { tabId, op: 'getPageContent' });
    }

    const operation = this.performGetPageContent(tabId);
    this.operationLocks.set(lockKey, operation);
    
    try {
      const result = await operation;
      this.lastPageContentFetch.set(tabId, Date.now());
      return result;
    } finally {
      this.operationLocks.delete(lockKey);
    }
  }

  private async performGetPageContent(tabId: string): Promise<any> {
    try {
      if (this.isElectron) {
        const result = await window.electronAPI.getPageContent(tabId);
        if (!result.success) {
          throw new BridgeError('PAGE_CONTENT_FAILED', result.error || 'Unknown page content error', { tabId, op: 'getPageContent' });
        }
        return this.structurePageContent(result.content);
      } else {
        // Fallback for web version with enhanced structure (T4 + T5)
        const htmlRaw = document.documentElement.outerHTML;
        const MAX_HTML_SIZE = 2_000_000; // 2MB cap
        const html = htmlRaw.length > MAX_HTML_SIZE ? htmlRaw.slice(0, MAX_HTML_SIZE) : htmlRaw;
        const truncated = htmlRaw.length > MAX_HTML_SIZE;
        
        // T5: Use stable handles instead of index-based IDs
        const elements = Array.from(document.querySelectorAll('a, button, input, textarea, [role="button"]'))
          .slice(0, 500) // Cap to 500 elements
          .map(el => ({
            handle: getStableHandle(el),
            role: el.getAttribute('role') || el.tagName.toLowerCase(),
            text: (el as HTMLElement).innerText?.slice(0, 200) ?? '',
            href: (el as HTMLAnchorElement).href ?? undefined,
            selector: getCssPath(el),
            attributes: {
              'aria-label': el.getAttribute('aria-label') || undefined,
              placeholder: el.getAttribute('placeholder') || undefined,
            },
          }));

        return {
          url: window.location.href,
          title: document.title,
          elements,
          html,
          truncated,
        };
      }
    } catch (error) {
      if (error instanceof BridgeError) {
        throw error;
      }
      throw new BridgeError('PAGE_CONTENT_FAILED', `Failed to get page content for tab ${tabId}: ${(error as Error).message}`, { tabId, op: 'getPageContent' });
    }
  }

  // Tool execution
  private async executeMCPTool(toolName: string, args: any, serverId?: string): Promise<any> {
    const lockKey = `mcpTool_${toolName}_${serverId || 'default'}`;
    if (this.operationLocks.has(lockKey)) {
      throw new BridgeError('OPERATION_IN_PROGRESS', `MCP tool ${toolName} execution already in progress`, { toolName, serverId, op: 'executeMCPTool' });
    }

    const operation = this.performExecuteMCPTool(toolName, args, serverId);
    this.operationLocks.set(lockKey, operation);
    
    try {
      return await operation;
    } finally {
      this.operationLocks.delete(lockKey);
    }
  }

  private async performExecuteMCPTool(toolName: string, args: any, serverId?: string): Promise<any> {
    try {
      // Find the appropriate MCP server
      const tool = mcpToolRegistry.getTool(toolName);
      if (!tool || tool.source !== 'mcp') {
        throw new BridgeError('MCP_TOOL_NOT_FOUND', `MCP tool ${toolName} not found`, { toolName, op: 'executeMCPTool' });
      }

      const targetServerId = serverId || tool.serverId;
      if (!targetServerId) {
        throw new BridgeError('MCP_SERVER_NOT_SPECIFIED', `No server ID specified for tool ${toolName}`, { toolName, op: 'executeMCPTool' });
      }

      return await mcpManager.executeTool(targetServerId, toolName, args);
    } catch (error) {
      if (error instanceof BridgeError) {
        throw error;
      }
      throw new BridgeError('MCP_TOOL_EXECUTION_FAILED', `Failed to execute MCP tool ${toolName}: ${(error as Error).message}`, { toolName, serverId, op: 'executeMCPTool' });
    }
  }

  private async executeNativeTool(toolName: string, args: any, tabId: string): Promise<any> {
    const lockKey = `nativeTool_${toolName}_${tabId}`;
    if (this.operationLocks.has(lockKey)) {
      throw new BridgeError('OPERATION_IN_PROGRESS', `Native tool ${toolName} execution already in progress`, { toolName, tabId, op: 'executeNativeTool' });
    }

    const operation = this.performExecuteNativeTool(toolName, args, tabId);
    this.operationLocks.set(lockKey, operation);
    
    try {
      return await operation;
    } finally {
      this.operationLocks.delete(lockKey);
    }
  }

  private async performExecuteNativeTool(toolName: string, args: any, tabId: string): Promise<any> {
    try {
      const context = this.createExecutionContext(tabId);
      const functionCall = { name: toolName, args };
      return await enhancedToolService.executeTool(functionCall, context);
    } catch (error) {
      throw new BridgeError('NATIVE_TOOL_EXECUTION_FAILED', `Failed to execute native tool ${toolName}: ${(error as Error).message}`, { toolName, tabId, op: 'executeNativeTool' });
    }
  }

  // Event handling (T8: Guard against stale events)
  private handleBrowserEvent(event: BrowserEvent): void {
    // T8: Silently ignore events for unknown/closed tabs to prevent race conditions
    if (event.tabId && !this.activeTabs.has(event.tabId)) {
      console.debug(`Ignoring event ${event.type} for unknown tab ${event.tabId}`);
      return;
    }
    
    this.browserEvents.push(event);
    
    // Keep only the last 1000 events
    if (this.browserEvents.length > 1000) {
      this.browserEvents = this.browserEvents.slice(-1000);
    }

    // Notify listeners
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error('Error in browser event listener:', error);
        }
      });
    }
  }

  // Event subscription
  onBrowserEvent(eventType: string, listener: (event: BrowserEvent) => void): () => void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(listener);

    // Return unsubscribe function
    return () => {
      const listeners = this.eventListeners.get(eventType);
      if (listeners) {
        const index = listeners.indexOf(listener);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    };
  }

  // Analytics and monitoring
  getBrowserStats(): {
    activeTabs: number;
    totalEvents: number;
    recentEvents: BrowserEvent[];
    tabStats: Record<string, { url: string; lastActive: Date; isLoading: boolean }>;
  } {
    const recentEvents = this.browserEvents.slice(-100);
    const tabStats: Record<string, any> = {};

    for (const [tabId, tab] of this.activeTabs.entries()) {
      tabStats[tabId] = {
        url: tab.url,
        lastActive: tab.lastActive,
        isLoading: tab.isLoading,
      };
    }

    return {
      activeTabs: this.activeTabs.size,
      totalEvents: this.browserEvents.length,
      recentEvents,
      tabStats,
    };
  }

  // Permission checking
  private async ensurePermission(operation: string, tabId: string): Promise<void> {
    const allowed = await this.permissions.checkOrPrompt(operation, { tabId });
    if (!allowed) {
      throw new BridgeError('PERMISSION_DENIED', `Operation ${operation} was denied`, { tabId, op: operation });
    }
  }

  // Utility methods for content trimming and structuring (T4)
  private structurePageContent(content: any): any {
    const MAX_HTML_SIZE = 2_000_000; // 2MB cap
    
    // Handle both old and new content formats
    const htmlRaw = content.html || content.domSnapshot || '';
    const html = htmlRaw.length > MAX_HTML_SIZE ? htmlRaw.slice(0, MAX_HTML_SIZE) : htmlRaw;
    const truncated = htmlRaw.length > MAX_HTML_SIZE;
    
    // Structure elements with stable handles (T5)
    const elements = (content.elements || [])
      .slice(0, 500) // Cap to 500 elements
      .map((el: any) => {
        // If element already has a handle, keep it; otherwise generate one
        if (el.handle) {
          return {
            handle: el.handle,
            role: el.role || el.tag || 'unknown',
            text: el.text ? el.text.substring(0, 200) : '',
            href: el.href || el.attributes?.href,
            selector: el.selector,
            attributes: el.attributes,
          };
        }
        
        // Legacy format - create structured element
        return {
          handle: el.id || `legacy_${hash(JSON.stringify(el))}`,
          role: el.tag || 'unknown',
          text: el.text ? el.text.substring(0, 200) : '',
          href: el.attributes?.href,
          selector: el.selector || `[data-agent-id="${el.id}"]`,
          attributes: el.attributes,
        };
      });
    
    return {
      url: content.url,
      title: content.title,
      elements,
      html,
      truncated,
    };
  }

  private trimPageContent(elements: any[]): any[] {
    // Limit to first 100 interactive elements for performance
    return elements.slice(0, 100).map(el => ({
      ...el,
      text: el.text ? el.text.substring(0, 200) : el.text, // Limit text length
    }));
  }

  private trimDOMSnapshot(html: string): string {
    // Limit DOM snapshot size to prevent memory issues
    const maxSize = 50000; // 50KB limit
    if (html.length > maxSize) {
      return html.substring(0, maxSize) + '... [truncated]';
    }
    return html;
  }

  // Action DSL methods for automation
  async clickHandle(tabId: string, handle: string): Promise<ActionResult> {
    this.ensureNotDisposed();
    
    const lockKey = `clickHandle_${tabId}_${handle}`;
    if (this.operationLocks.has(lockKey)) {
      throw new BridgeError('OPERATION_IN_PROGRESS', `Click handle operation already in progress for handle ${handle}`, { tabId, handle, op: 'clickHandle' });
    }

    const operation = this.performClickHandle(tabId, handle);
    this.operationLocks.set(lockKey, operation);
    
    try {
      return await operation;
    } finally {
      this.operationLocks.delete(lockKey);
    }
  }

  private async performClickHandle(tabId: string, handle: string): Promise<ActionResult> {
    try {
      if (this.isElectron && window.electronAPI.clickHandle) {
        const result = await window.electronAPI.clickHandle(tabId, handle);
        if (!result.success) {
          return { ok: false, code: result.error || 'CLICK_FAILED' };
        }
        return { ok: true };
      } else {
        return { ok: false, code: 'UNSUPPORTED' };
      }
    } catch (error) {
      return { ok: false, code: 'EXEC_ERROR', data: String((error as Error).message) };
    }
  }

  async typeInto(tabId: string, handle: string, text: string, replace: boolean, delayMs: number): Promise<ActionResult> {
    this.ensureNotDisposed();
    
    const lockKey = `typeInto_${tabId}_${handle}`;
    if (this.operationLocks.has(lockKey)) {
      throw new BridgeError('OPERATION_IN_PROGRESS', `Type into operation already in progress for handle ${handle}`, { tabId, handle, op: 'typeInto' });
    }

    const operation = this.performTypeInto(tabId, handle, text, replace, delayMs);
    this.operationLocks.set(lockKey, operation);
    
    try {
      return await operation;
    } finally {
      this.operationLocks.delete(lockKey);
    }
  }

  private async performTypeInto(tabId: string, handle: string, text: string, replace: boolean, delayMs: number): Promise<ActionResult> {
    try {
      if (this.isElectron && window.electronAPI.typeInto) {
        const result = await window.electronAPI.typeInto(tabId, handle, text, replace, delayMs);
        if (!result.success) {
          return { ok: false, code: result.error || 'TYPE_FAILED' };
        }
        return { ok: true };
      } else {
        return { ok: false, code: 'UNSUPPORTED' };
      }
    } catch (error) {
      return { ok: false, code: 'EXEC_ERROR', data: String((error as Error).message) };
    }
  }

  async selectOption(tabId: string, handle: string, value: string): Promise<ActionResult> {
    this.ensureNotDisposed();
    
    const lockKey = `selectOption_${tabId}_${handle}`;
    if (this.operationLocks.has(lockKey)) {
      throw new BridgeError('OPERATION_IN_PROGRESS', `Select option operation already in progress for handle ${handle}`, { tabId, handle, op: 'selectOption' });
    }

    const operation = this.performSelectOption(tabId, handle, value);
    this.operationLocks.set(lockKey, operation);
    
    try {
      return await operation;
    } finally {
      this.operationLocks.delete(lockKey);
    }
  }

  private async performSelectOption(tabId: string, handle: string, value: string): Promise<ActionResult> {
    try {
      if (this.isElectron && window.electronAPI.selectOption) {
        const result = await window.electronAPI.selectOption(tabId, handle, value);
        if (!result.success) {
          return { ok: false, code: result.error || 'SELECT_FAILED' };
        }
        return { ok: true };
      } else {
        return { ok: false, code: 'UNSUPPORTED' };
      }
    } catch (error) {
      return { ok: false, code: 'EXEC_ERROR', data: String((error as Error).message) };
    }
  }

  async waitFor(tabId: string, selector?: string, handle?: string): Promise<ActionResult> {
    this.ensureNotDisposed();
    
    const lockKey = `waitFor_${tabId}_${selector || handle}`;
    if (this.operationLocks.has(lockKey)) {
      throw new BridgeError('OPERATION_IN_PROGRESS', `Wait for operation already in progress`, { tabId, selector, handle, op: 'waitFor' });
    }

    const operation = this.performWaitFor(tabId, selector, handle);
    this.operationLocks.set(lockKey, operation);
    
    try {
      return await operation;
    } finally {
      this.operationLocks.delete(lockKey);
    }
  }

  private async performWaitFor(tabId: string, selector?: string, handle?: string): Promise<ActionResult> {
    try {
      if (this.isElectron && window.electronAPI.waitFor) {
        const result = await window.electronAPI.waitFor(tabId, { selector, handle });
        if (!result.success) {
          return { ok: false, code: result.error || 'WAIT_FAILED' };
        }
        return { ok: true };
      } else {
        return { ok: false, code: 'UNSUPPORTED' };
      }
    } catch (error) {
      return { ok: false, code: 'EXEC_ERROR', data: String((error as Error).message) };
    }
  }

  async scrollIntoView(tabId: string, handle: string): Promise<ActionResult> {
    this.ensureNotDisposed();
    
    const lockKey = `scrollIntoView_${tabId}_${handle}`;
    if (this.operationLocks.has(lockKey)) {
      throw new BridgeError('OPERATION_IN_PROGRESS', `Scroll into view operation already in progress for handle ${handle}`, { tabId, handle, op: 'scrollIntoView' });
    }

    const operation = this.performScrollIntoView(tabId, handle);
    this.operationLocks.set(lockKey, operation);
    
    try {
      return await operation;
    } finally {
      this.operationLocks.delete(lockKey);
    }
  }

  private async performScrollIntoView(tabId: string, handle: string): Promise<ActionResult> {
    try {
      if (this.isElectron && window.electronAPI.scrollIntoView) {
        const result = await window.electronAPI.scrollIntoView(tabId, handle);
        if (!result.success) {
          return { ok: false, code: result.error || 'SCROLL_FAILED' };
        }
        return { ok: true };
      } else {
        return { ok: false, code: 'UNSUPPORTED' };
      }
    } catch (error) {
      return { ok: false, code: 'EXEC_ERROR', data: String((error as Error).message) };
    }
  }

  async saveFile(mimeType: string, data: string, path: string): Promise<void> {
    this.ensureNotDisposed();
    
    const lockKey = `saveFile_${path}`;
    if (this.operationLocks.has(lockKey)) {
      throw new BridgeError('OPERATION_IN_PROGRESS', `Save file operation already in progress for path ${path}`, { path, op: 'saveFile' });
    }

    const operation = this.performSaveFile(mimeType, data, path);
    this.operationLocks.set(lockKey, operation);
    
    try {
      await operation;
    } finally {
      this.operationLocks.delete(lockKey);
    }
  }

  private async performSaveFile(mimeType: string, data: string, path: string): Promise<void> {
    try {
      if (this.isElectron && window.electronAPI.saveFile) {
        const result = await window.electronAPI.saveFile(mimeType, data, path);
        if (!result.success) {
          throw new BridgeError('SAVE_FILE_FAILED', result.error || 'Unknown save file error', { path, op: 'saveFile' });
        }
      } else {
        throw new BridgeError('UNSUPPORTED', 'Save file not supported in web version', { path, op: 'saveFile' });
      }
    } catch (error) {
      if (error instanceof BridgeError) {
        throw error;
      }
      throw new BridgeError('SAVE_FILE_FAILED', `Failed to save file to ${path}: ${(error as Error).message}`, { path, op: 'saveFile' });
    }
  }

  // Lifecycle management
  private ensureNotDisposed(): void {
    if (this.disposed) {
      throw new BridgeError('BRIDGE_DISPOSED', 'Bridge has been disposed and cannot perform operations', { op: 'disposed_check' });
    }
  }

  // Cleanup and disposal (T7, T8)
  cleanup(): void {
    this.eventListeners.clear();
    this.browserEvents = [];
    this.activeTabs.clear();
    this.operationLocks.clear();
    this.lastPageContentFetch.clear();
    this.activeTabId = null; // T8: Clear active tab
  }

  dispose(): void {
    if (this.disposed) {
      return; // Already disposed
    }
    
    this.disposed = true;
    
    // T7: Unregister IPC listeners to prevent memory leaks
    if (this.isElectron) {
      // Use optional chaining in case off methods don't exist
      if (typeof (window.electronAPI as any).offPageLoaded === 'function') {
        (window.electronAPI as any).offPageLoaded(this.bound.onLoaded);
      }
      if (typeof (window.electronAPI as any).offPageNavigated === 'function') {
        (window.electronAPI as any).offPageNavigated(this.bound.onNavigated);
      }
      if (typeof (window.electronAPI as any).offPageTitleUpdated === 'function') {
        (window.electronAPI as any).offPageTitleUpdated(this.bound.onTitle);
      }
      if (typeof (window.electronAPI as any).offPageLoadFailed === 'function') {
        (window.electronAPI as any).offPageLoadFailed(this.bound.onLoadFailed);
      }
    }
    
    this.cleanup();
  }
}

export const aiBrowserBridge = new AIBrowserBridge();
