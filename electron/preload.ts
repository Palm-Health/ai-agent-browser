const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Browser view management
  createBrowserView: (tabId: string) => ipcRenderer.invoke('create-browser-view', tabId),
  navigateBrowserView: (tabId: string, url: string) => ipcRenderer.invoke('navigate-browser-view', tabId, url),
  executeJavaScript: (tabId: string, code: string) => ipcRenderer.invoke('execute-javascript', tabId, code),
  getPageContent: (tabId: string) => ipcRenderer.invoke('get-page-content', tabId),
  clickElement: (tabId: string, elementId: string) => ipcRenderer.invoke('click-element', tabId, elementId),
  fillFormElement: (tabId: string, elementId: string, value: string) => ipcRenderer.invoke('fill-form-element', tabId, elementId, value),
  takeScreenshot: (tabId: string) => ipcRenderer.invoke('take-screenshot', tabId),
  closeBrowserView: (tabId: string) => ipcRenderer.invoke('close-browser-view', tabId),
  setActiveBrowserView: (tabId: string) => ipcRenderer.invoke('set-active-browser-view', tabId),

  // Event listeners
  onPageLoaded: (callback: (tabId: string) => void) => {
    ipcRenderer.on('page-loaded', (event, tabId) => callback(tabId));
  },
  onPageNavigated: (callback: (tabId: string, url: string) => void) => {
    ipcRenderer.on('page-navigated', (event, tabId, url) => callback(tabId, url));
  },
  onPageTitleUpdated: (callback: (tabId: string, title: string) => void) => {
    ipcRenderer.on('page-title-updated', (event, tabId, title) => callback(tabId, title));
  },
  onPageLoadFailed: (callback: (tabId: string, errorCode: number, errorDescription: string) => void) => {
    ipcRenderer.on('page-load-failed', (event, tabId, errorCode, errorDescription) => callback(tabId, errorCode, errorDescription));
  },

  // MCP Server management
  startMCPServer: (serverConfig: any) => ipcRenderer.invoke('start-mcp-server', serverConfig),
  stopMCPServer: (serverId: string) => ipcRenderer.invoke('stop-mcp-server', serverId),
  getMCPTools: (serverId: string) => ipcRenderer.invoke('get-mcp-tools', serverId),

  // Vault service
  vaultSaveSnapshot: (payload: any) => ipcRenderer.invoke('vault-save-snapshot', payload),
  vaultListPages: (filters: any) => ipcRenderer.invoke('vault-list-pages', filters),
  vaultGetPage: (id: string) => ipcRenderer.invoke('vault-get-page', id),
  vaultWriteIndex: (entries: any[]) => ipcRenderer.invoke('vault-write-index', entries),
  vaultGetBasePath: () => ipcRenderer.invoke('vault-get-base-path'),

  // Remove event listeners
  removeAllListeners: (channel: string) => ipcRenderer.removeAllListeners(channel),
});

// Type definitions for the exposed API
interface ElectronAPI {
  createBrowserView: (tabId: string) => Promise<string | null>;
  navigateBrowserView: (tabId: string, url: string) => Promise<boolean>;
  executeJavaScript: (tabId: string, code: string) => Promise<{ success: boolean; result?: any; error?: string }>;
  getPageContent: (tabId: string) => Promise<{ success: boolean; content?: any; error?: string }>;
  clickElement: (tabId: string, elementId: string) => Promise<{ success: boolean; error?: string }>;
  fillFormElement: (tabId: string, elementId: string, value: string) => Promise<{ success: boolean; error?: string }>;
  takeScreenshot: (tabId: string) => Promise<{ success: boolean; image?: Buffer; error?: string }>;
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

  // Vault API
  vaultSaveSnapshot: (payload: any) => Promise<any>;
  vaultListPages: (filters: any) => Promise<any[]>;
  vaultGetPage: (id: string) => Promise<any>;
  vaultWriteIndex: (entries: any[]) => Promise<boolean>;
  vaultGetBasePath: () => Promise<string>;
}

// Global declaration moved to types file
