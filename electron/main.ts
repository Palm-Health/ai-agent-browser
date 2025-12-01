const electron = require('electron');
const path = require('path');
const { join } = require('path');
const fs = require('fs');
const fsp = require('fs').promises;
const os = require('os');
const crypto = require('crypto');

const { app, BrowserWindow, ipcMain, session, protocol } = electron;

// Fix Windows cache issues and improve network performance
app.commandLine.appendSwitch('--disable-gpu');
app.commandLine.appendSwitch('--disable-software-rasterizer');
app.commandLine.appendSwitch('--disable-gpu-sandbox');
app.commandLine.appendSwitch('--no-sandbox');
app.commandLine.appendSwitch('--disable-web-security');
app.commandLine.appendSwitch('--disable-features', 'VizDisplayCompositor');
// Add network optimizations
app.commandLine.appendSwitch('--enable-features', 'NetworkService');
app.commandLine.appendSwitch('--disable-background-timer-throttling');
app.commandLine.appendSwitch('--disable-renderer-backgrounding');
app.commandLine.appendSwitch('--disable-backgrounding-occluded-windows');

const electronDir = process.cwd();

// Keep a global reference of the window object
let mainWindow: any = null;
let browserTabs: Map<string, any> = new Map();

class VaultManager {
  basePath: string;

  constructor(basePath: string = path.join(os.homedir(), 'PalmVault')) {
    this.basePath = basePath;
  }

  private async ensureStructure(): Promise<void> {
    await fsp.mkdir(path.join(this.basePath, 'pages'), { recursive: true });
    await fsp.mkdir(path.join(this.basePath, 'markdown'), { recursive: true });
    await fsp.mkdir(path.join(this.basePath, 'assets'), { recursive: true });
    const indexPath = path.join(this.basePath, 'index.json');
    try {
      await fsp.access(indexPath);
    } catch {
      await fsp.writeFile(indexPath, JSON.stringify([], null, 2), 'utf-8');
    }
  }

  private async loadIndex(): Promise<any[]> {
    await this.ensureStructure();
    const indexPath = path.join(this.basePath, 'index.json');
    try {
      const content = await fsp.readFile(indexPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error('Failed to read vault index:', error);
      return [];
    }
  }

  private async saveIndex(entries: any[]): Promise<void> {
    await this.ensureStructure();
    const indexPath = path.join(this.basePath, 'index.json');
    await fsp.writeFile(indexPath, JSON.stringify(entries, null, 2), 'utf-8');
  }

  async overwriteIndex(entries: any[]): Promise<void> {
    await this.saveIndex(entries);
  }

  async savePageSnapshot(payload: { url: string; html: string; metadata?: any }): Promise<any> {
    const { url, html, metadata = {} } = payload;
    if (!url) throw new Error('URL is required');

    await this.ensureStructure();
    const id = metadata.id || crypto.randomUUID();
    const title = (metadata.title || 'Untitled Page').trim();
    const htmlPath = path.join('pages', `${id}.html`);
    const markdownPath = path.join('markdown', `${id}.md`);
    const markdown = this.createMarkdown(html, url, title);

    await fsp.writeFile(path.join(this.basePath, htmlPath), html, 'utf-8');
    await fsp.writeFile(path.join(this.basePath, markdownPath), markdown, 'utf-8');

    const entries = await this.loadIndex();
    const without = entries.filter((entry: any) => entry.id !== id);
    const snapshot = {
      id,
      url,
      title,
      createdAt: new Date().toISOString(),
      htmlPath,
      markdownPath,
      metadata,
    };

    without.push(snapshot);
    await this.saveIndex(without);

    return { ...snapshot, html, markdown };
  }

  async listSnapshots(filters: { query?: string } = {}): Promise<any[]> {
    const entries = await this.loadIndex();
    if (!filters.query) return entries;
    const q = filters.query.toLowerCase();
    return entries.filter((entry: any) =>
      entry.title.toLowerCase().includes(q) || entry.url.toLowerCase().includes(q)
    );
  }

  async getSnapshotById(id: string): Promise<any | null> {
    const entries = await this.loadIndex();
    const entry = entries.find((item: any) => item.id === id);
    if (!entry) return null;
    const html = await fsp.readFile(path.join(this.basePath, entry.htmlPath), 'utf-8');
    const markdown = await fsp.readFile(path.join(this.basePath, entry.markdownPath), 'utf-8');
    return { ...entry, html, markdown };
  }

  private createMarkdown(html: string, url: string, title: string): string {
    const safeHtml = html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    const text = safeHtml
      .replace(/\s+/g, ' ')
      .replace(/<[^>]+>/g, '\n')
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .join('\n');
    return `# ${title}\nSource: ${url}\n\n${text}`;
  }

  async renderVaultRoute(requestUrl: string): Promise<Buffer> {
    const parsed = new URL(requestUrl);
    const route = parsed.hostname || parsed.pathname.replace(/^\//, '');
    const pathSegments = parsed.pathname.split('/').filter(Boolean);

    if (route === 'list' || route === '') {
      const snapshots = await this.listSnapshots();
      const html = `<!DOCTYPE html><html><head><title>Vault</title><style>
        body { font-family: Arial, sans-serif; background: #0b1220; color: #e5e7eb; padding: 24px; }
        h1 { color: #22d3ee; }
        .card { background: #111827; border: 1px solid #1f2937; border-radius: 8px; padding: 12px 16px; margin-bottom: 12px; }
        a { color: #38bdf8; text-decoration: none; }
        a:hover { text-decoration: underline; }
        .meta { color: #9ca3af; font-size: 12px; }
      </style></head><body><h1>Saved Vault Pages</h1>
      ${snapshots
        .map(
          (s: any) =>
            `<div class="card"><a href="vault://page/${s.id}"><strong>${s.title}</strong></a><div class="meta">${s.url} · ${
              new Date(s.createdAt).toLocaleString()
            }</div></div>`
        )
        .join('')}
      </body></html>`;
      return Buffer.from(html);
    }

    if (route.startsWith('page')) {
      const id = route === 'page' ? pathSegments[0] : route.split('/')[1] || pathSegments[0];
      const snapshot = id ? await this.getSnapshotById(id) : null;
      if (!snapshot) {
        return Buffer.from('<html><body><h2>Snapshot not found</h2></body></html>');
      }
      const html = `<!DOCTYPE html><html><head><base href="${snapshot.url}" /><title>${snapshot.title}</title></head><body>
        <div style="padding:12px;background:#0f172a;color:#e5e7eb;font-family:Arial,sans-serif;">
          <div style="margin-bottom:12px;">
            <div style="color:#22d3ee;font-weight:bold;">${snapshot.title}</div>
            <div style="color:#94a3b8;font-size:12px;">${snapshot.url}</div>
          </div>
        </div>
        ${snapshot.html}
      </body></html>`;
      return Buffer.from(html);
    }

    return Buffer.from('<html><body><h2>Unsupported vault route</h2></body></html>');
  }
}

const vaultManager = new VaultManager();

async function createWindow(): Promise<void> {
  // Create the browser window with improved security and performance
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(electronDir, 'electron-dist/preload.js'),
      webSecurity: false, // Disable for development
      allowRunningInsecureContent: true, // Allow HTTP content
      experimentalFeatures: true,
    },
    titleBarStyle: 'hiddenInset',
    show: false,
  });

  // Configure session for better network handling
  const ses = mainWindow.webContents.session;
  
  // Set up CSP headers to allow external resources
  ses.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: http: https: ws: wss:; " +
          "connect-src 'self' http: https: ws: wss:; " +
          "img-src 'self' data: blob: http: https:; " +
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
          "style-src 'self' 'unsafe-inline';"
        ]
      }
    });
  });

  // Load the app - try ports in order with proper error handling
  const ports = ['5173', '5174', '5175', '5176', '5177', '5178', '5179', '5180', '5181', '5182'];
  let loaded = false;
  
  for (const port of ports) {
    try {
      const viteUrl = `http://localhost:${port}`;
      console.log(`🔍 Trying to load from ${viteUrl}...`);
      
      // Use a timeout to avoid hanging
      const loadPromise = mainWindow.loadURL(viteUrl);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Load timeout')), 5000)
      );
      
      await Promise.race([loadPromise, timeoutPromise]);
      console.log(`✅ Successfully loaded Vite from ${viteUrl}`);
      mainWindow.webContents.openDevTools();
      loaded = true;
      break;
    } catch (error) {
      console.log(`❌ Failed to load from port ${port}: ${error.message}`);
    }
  }
  
  if (!loaded) {
    console.log('⚠️ Failed to load Vite dev server, loading fallback...');
    try {
      await mainWindow.loadFile(join(electronDir, '../dist/index.html'));
    } catch (fallbackError) {
      console.error('❌ Fallback also failed:', fallbackError);
    }
  }

  mainWindow.once('ready-to-show', () => {
    console.log('📺 Window is ready to show');
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    console.log('🔴 Window closed');
    mainWindow = null;
  });

  // Prevent window from closing accidentally
  mainWindow.on('close', (e) => {
    console.log('⚠️  Window close event triggered');
  });

  // Log any crashes
  mainWindow.webContents.on('crashed', (event, killed) => {
    console.error('💥 Renderer process crashed!', { killed });
  });

  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('💥 Renderer process gone!', details);
  });

  // Log console messages from the renderer
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer ${level}]:`, message);
  });
}

// Set up custom protocol for AI-enhanced navigation BEFORE app is ready
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'ai',
    privileges: {
      standard: true,
      secure: true,
      bypassCSP: true,
      allowServiceWorkers: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
  {
    scheme: 'vault',
    privileges: {
      standard: true,
      secure: true,
      bypassCSP: true,
      allowServiceWorkers: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

// This method will be called when Electron has finished initialization
app.whenReady().then(async () => {
  console.log('🚀 Electron app is ready, creating window...');

  try {
    protocol.registerBufferProtocol('vault', async (request, respond) => {
      try {
        const data = await vaultManager.renderVaultRoute(request.url);
        respond({ mimeType: 'text/html', data });
      } catch (error) {
        console.error('Failed to serve vault protocol:', error);
        respond({ mimeType: 'text/html', data: Buffer.from('<html><body><h2>Vault error</h2></body></html>') });
      }
    });

    await createWindow();
    console.log('✅ Window created successfully');
  } catch (error) {
    console.error('❌ Error creating window:', error);
  }

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers for browser tab management
ipcMain.handle('create-browser-view', async (event, tabId: string) => {
  if (!mainWindow) return null;

  const browserTab = new BrowserWindow({
    width: 800,
    height: 600,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Disable for development
    },
  });

  browserTabs.set(tabId, browserTab);

  // Set up event listeners
  browserTab.webContents.on('did-finish-load', () => {
    event.sender.send('page-loaded', tabId);
  });

  browserTab.webContents.on('did-navigate', (navEvent, url) => {
    event.sender.send('page-navigated', tabId, url);
  });

  browserTab.webContents.on('page-title-updated', (titleEvent, title) => {
    event.sender.send('page-title-updated', tabId, title);
  });

  browserTab.webContents.on('did-fail-load', (failEvent, errorCode, errorDescription) => {
    event.sender.send('page-load-failed', tabId, errorCode, errorDescription);
  });

  return tabId;
});

ipcMain.handle('navigate-browser-view', async (event, tabId: string, url: string) => {
  const browserTab = browserTabs.get(tabId);
  if (browserTab) {
    try {
      // Add timeout and retry logic for navigation
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Navigation timeout')), 30000)
      );
      
      const navigationPromise = browserTab.webContents.loadURL(url);
      
      await Promise.race([navigationPromise, timeoutPromise]);
      console.log(`✅ Successfully navigated to ${url}`);
      return { success: true, url };
    } catch (error) {
      console.error(`❌ Failed to navigate to ${url}:`, error);
      
      // Try retry with exponential backoff
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await browserTab.webContents.loadURL(url);
        console.log(`✅ Retry successful for ${url}`);
        return { success: true, url, retried: true };
      } catch (retryError) {
        console.error(`❌ Retry failed for ${url}:`, retryError);
        return { success: false, error: error.message, url };
      }
    }
  }
  return { success: false, error: 'Browser view not found' };
});

ipcMain.handle('execute-javascript', async (event, tabId: string, code: string) => {
  const browserTab = browserTabs.get(tabId);
  if (browserTab) {
    try {
      const result = await browserTab.webContents.executeJavaScript(code);
      return { success: true, result };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }
  return { success: false, error: 'Browser view not found' };
});

ipcMain.handle('get-page-content', async (event, tabId: string) => {
  const browserTab = browserTabs.get(tabId);
  if (browserTab) {
    try {
      const html = await browserTab.webContents.executeJavaScript(`
        (() => {
          const elements = [];
          document.querySelectorAll('a, button, input, textarea, select').forEach((el, index) => {
            elements.push({
              id: \`agent-el-\${index}\`,
              tag: el.tagName.toLowerCase(),
              attributes: {
                href: el.getAttribute('href') || '',
                'aria-label': el.getAttribute('aria-label') || '',
                placeholder: el.getAttribute('placeholder') || '',
                type: el.getAttribute('type') || '',
                value: el.value || '',
              },
              text: el.textContent?.trim() || '',
              rect: el.getBoundingClientRect()
            });
          });
          return {
            url: window.location.href,
            title: document.title,
            elements,
            html: document.documentElement.outerHTML
          };
        })()
      `);
      return { success: true, content: html };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }
  return { success: false, error: 'Browser view not found' };
});

ipcMain.handle('click-element', async (event, tabId: string, elementId: string) => {
  const browserTab = browserTabs.get(tabId);
  if (browserTab) {
    try {
      await browserTab.webContents.executeJavaScript(`
        (() => {
          const element = document.querySelector(\`[data-agent-id="\${elementId}"]\`);
          if (element) {
            element.click();
            return true;
          }
          return false;
        })()
      `);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }
  return { success: false, error: 'Browser view not found' };
});

ipcMain.handle('fill-form-element', async (event, tabId: string, elementId: string, value: string) => {
  const browserTab = browserTabs.get(tabId);
  if (browserTab) {
    try {
      await browserTab.webContents.executeJavaScript(`
        (() => {
          const element = document.querySelector(\`[data-agent-id="\${elementId}"]\`);
          if (element) {
            element.value = \`\${value}\`;
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
          }
          return false;
        })()
      `);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }
  return { success: false, error: 'Browser view not found' };
});

ipcMain.handle('take-screenshot', async (event, tabId: string) => {
  const browserTab = browserTabs.get(tabId);
  if (browserTab) {
    try {
      const screenshot = await browserTab.webContents.capturePage();
      return { success: true, image: screenshot.toPNG() };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }
  return { success: false, error: 'Browser view not found' };
});

ipcMain.handle('close-browser-view', async (event, tabId: string) => {
  const browserTab = browserTabs.get(tabId);
  if (browserTab) {
    browserTabs.delete(tabId);
    browserTab.close();
    return true;
  }
  return false;
});

ipcMain.handle('set-active-browser-view', async (event, tabId: string) => {
  const browserTab = browserTabs.get(tabId);
  if (browserTab) {
    browserTab.focus();
    return true;
  }
  return false;
});

// MCP Server management
ipcMain.handle('start-mcp-server', async (event, serverConfig: any) => {
  // TODO: Implement MCP server startup
  console.log('Starting MCP server:', serverConfig);
  return { success: true, serverId: `mcp-${Date.now()}` };
});

ipcMain.handle('stop-mcp-server', async (event, serverId: string) => {
  // TODO: Implement MCP server shutdown
  console.log('Stopping MCP server:', serverId);
  return { success: true };
});

ipcMain.handle('get-mcp-tools', async (event, serverId: string) => {
  // TODO: Implement MCP tool discovery
  console.log('Getting MCP tools for server:', serverId);
  return { success: true, tools: [] };
});

ipcMain.handle('vault-save-snapshot', async (event, payload) => {
  try {
    return await vaultManager.savePageSnapshot(payload);
  } catch (error) {
    console.error('Failed to save vault snapshot:', error);
    throw error;
  }
});

ipcMain.handle('vault-list-pages', async (event, filters) => {
  return await vaultManager.listSnapshots(filters || {});
});

ipcMain.handle('vault-get-page', async (event, id: string) => {
  return await vaultManager.getSnapshotById(id);
});

ipcMain.handle('vault-write-index', async (event, entries) => {
  await vaultManager.overwriteIndex(entries || []);
  return true;
});

ipcMain.handle('vault-get-base-path', () => vaultManager.basePath);
