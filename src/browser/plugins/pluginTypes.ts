export type PluginPermission = 'browser' | 'dom' | 'mcp' | 'vault';

export interface PluginUIConfig {
  sidebar?: boolean;
  toolbarButton?: boolean;
  pageOverlay?: boolean;
}

export interface StableSelector {
  selector: string;
  description?: string;
  action?: string;
}

export interface WorkflowStep {
  id: string;
  description: string;
  selectors?: StableSelector[];
  mcpTool?: string;
}

export interface SkillPackDefinition {
  domain: string;
  selectors?: StableSelector[];
  workflows?: WorkflowStep[];
  notes?: string;
}

export interface PluginManifest {
  id: string;
  name: string;
  permissions: PluginPermission[];
  entry: string;
  ui?: PluginUIConfig;
  domains?: string[];
  version?: string;
  description?: string;
}

export interface BrowserControlApi {
  openTab: (url: string) => Promise<void> | void;
  navigate: (url: string) => Promise<void> | void;
  executeScript?: (script: string) => Promise<unknown> | unknown;
}

export interface DomAccessApi {
  querySelector: (selector: string) => Promise<unknown> | unknown;
  querySelectorAll: (selector: string) => Promise<unknown[]> | unknown[];
  waitForSelector?: (selector: string, timeout?: number) => Promise<unknown> | unknown;
}

export interface McpApi {
  callTool: (toolName: string, args?: Record<string, unknown>) => Promise<unknown>;
  listTools?: () => Promise<string[]>;
}

export interface VaultApi {
  readSecret: (key: string) => Promise<string | null>;
  writeSecret: (key: string, value: string) => Promise<void>;
}

export interface PluginContext {
  manifest: PluginManifest;
  permissions: PluginPermission[];
  browser?: BrowserControlApi;
  dom?: DomAccessApi;
  mcp?: McpApi;
  vault?: VaultApi;
}

export interface PluginHooks {
  activate?: () => Promise<void> | void;
  deactivate?: () => Promise<void> | void;
  onDomainMatched?: (domain: string) => Promise<void> | void;
}

export interface PluginEntry {
  hooks: PluginHooks;
  skills?: SkillPackDefinition[];
}

export interface PluginModule {
  createPlugin: (context: PluginContext) => PluginEntry | Promise<PluginEntry>;
}

export interface LoadedPlugin {
  manifest: PluginManifest;
  entry: PluginEntry;
  status: 'loaded' | 'failed';
}

export interface PluginLoaderOptions {
  pluginDirectory?: string;
  allowedPermissions?: PluginPermission[];
  browserApi?: BrowserControlApi;
  domApi?: DomAccessApi;
  mcpApi?: McpApi;
  vaultApi?: VaultApi;
}
