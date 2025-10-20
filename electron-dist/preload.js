const { contextBridge, ipcRenderer } = require('electron');
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // Browser view management
    createBrowserView: (tabId) => ipcRenderer.invoke('create-browser-view', tabId),
    navigateBrowserView: (tabId, url) => ipcRenderer.invoke('navigate-browser-view', tabId, url),
    executeJavaScript: (tabId, code) => ipcRenderer.invoke('execute-javascript', tabId, code),
    getPageContent: (tabId) => ipcRenderer.invoke('get-page-content', tabId),
    clickElement: (tabId, elementId) => ipcRenderer.invoke('click-element', tabId, elementId),
    fillFormElement: (tabId, elementId, value) => ipcRenderer.invoke('fill-form-element', tabId, elementId, value),
    takeScreenshot: (tabId) => ipcRenderer.invoke('take-screenshot', tabId),
    closeBrowserView: (tabId) => ipcRenderer.invoke('close-browser-view', tabId),
    setActiveBrowserView: (tabId) => ipcRenderer.invoke('set-active-browser-view', tabId),
    // Event listeners
    onPageLoaded: (callback) => {
        ipcRenderer.on('page-loaded', (event, tabId) => callback(tabId));
    },
    onPageNavigated: (callback) => {
        ipcRenderer.on('page-navigated', (event, tabId, url) => callback(tabId, url));
    },
    onPageTitleUpdated: (callback) => {
        ipcRenderer.on('page-title-updated', (event, tabId, title) => callback(tabId, title));
    },
    onPageLoadFailed: (callback) => {
        ipcRenderer.on('page-load-failed', (event, tabId, errorCode, errorDescription) => callback(tabId, errorCode, errorDescription));
    },
    // MCP Server management
    startMCPServer: (serverConfig) => ipcRenderer.invoke('start-mcp-server', serverConfig),
    stopMCPServer: (serverId) => ipcRenderer.invoke('stop-mcp-server', serverId),
    getMCPTools: (serverId) => ipcRenderer.invoke('get-mcp-tools', serverId),
    // Remove event listeners
    removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
});
// Global declaration moved to types file
