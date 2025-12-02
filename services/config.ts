import { AppConfig, MCPServerConfig } from '../types';

// G3: Central routing weights for normalized scoring
export const ROUTING_WEIGHTS = {
  complexity: 30,      // Task complexity match weight
  performance: 25,     // Historical performance metrics
  cost: 20,           // Cost efficiency
  system: 15,         // System context (battery, network, etc.)
  capability: 10,     // Capability match bonus
  latencyMaxMs: 5000, // Max acceptable latency for normalization
  tieBreaker: 0.5,    // Small random tiebreaker
} as const;

// Feature flags for progressive rollout
export const FEATURE_FLAGS = {
  ROUTER_V2: true, // Enable new routing system with pricing, privacy gates, etc.
} as const;

export class ConfigService {
  private config: AppConfig;
  private readonly CONFIG_KEY = 'ai-agent-browser-config';

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): AppConfig {
    try {
      // Check if we're in a browser environment
      if (typeof window !== 'undefined' && window.localStorage) {
        const savedConfig = localStorage.getItem(this.CONFIG_KEY);
        if (savedConfig) {
          return JSON.parse(savedConfig);
        }
      }
    } catch (error) {
      console.error('Failed to load config from localStorage:', error);
    }

    // Return default configuration
    return this.getDefaultConfig();
  }

  private getDefaultConfig(): AppConfig {
    return {
      aiProviders: {
        gemini: {
          apiKey: process.env.GEMINI_API_KEY || '',
        },
        openai: {
          apiKey: process.env.OPENAI_API_KEY || '',
        },
        anthropic: {
          apiKey: process.env.ANTHROPIC_API_KEY || '',
        },
        ollama: {
          endpoint: process.env.OLLAMA_ENDPOINT || 'http://localhost:11434',
        },
        deepseek: {
          apiKey: process.env.DEEPSEEK_API_KEY || '',
        },
      },
      mcpServers: [
        // Existing built-in servers
        {
          id: 'browser-automation',
          name: 'Browser Automation Server',
          type: 'local',
          command: 'node',
          args: ['./mcp-servers/browser-automation-server/index.js'],
          autoStart: false,
          timeout: 30000,
          retries: 3,
        },
        {
          id: 'web-scraping',
          name: 'Web Scraping Server',
          type: 'local',
          command: 'node',
          args: ['./mcp-servers/web-scraping-server/index.js'],
          autoStart: false,
          timeout: 30000,
          retries: 3,
        },
        {
          id: 'file-system',
          name: 'File System Server',
          type: 'local',
          command: 'node',
          args: ['./mcp-servers/file-system-server/index.js'],
          autoStart: false,
          timeout: 30000,
          retries: 3,
        },
        {
          id: 'vision',
          name: 'Vision Server',
          type: 'local',
          command: 'node',
          args: ['./mcp-servers/vision-server/index.js'],
          autoStart: false,
          timeout: 30000,
          retries: 3,
        },
        
        // Your custom MCPs from mcp.json
        {
          id: 'sequential-thinking',
          name: 'Sequential Thinking Server',
          type: 'local',
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-sequential-thinking'],
          autoStart: false,
          timeout: 30000,
          retries: 3,
        },
        {
          id: 'memory',
          name: 'Memory Server',
          type: 'local',
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-memory'],
          autoStart: false,
          timeout: 30000,
          retries: 3,
        },
        {
          id: 'filesystem',
          name: 'Filesystem Server',
          type: 'local',
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-filesystem', 'D:/VIRTUALNEWSSTUDIO'],
          autoStart: false,
          timeout: 30000,
          retries: 3,
        },
        // NOTE: The following MCP servers require API keys to be set via environment variables.
        // See .env.example for the required variables.
        {
          id: 'brave-search',
          name: 'Brave Search Server',
          type: 'local',
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-brave-search'],
          autoStart: false,
          timeout: 30000,
          retries: 3,
          env: {
            BRAVE_API_KEY: process.env.BRAVE_API_KEY || ''
          }
        },
        {
          id: 'github',
          name: 'GitHub Server',
          type: 'local',
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-github'],
          autoStart: false,
          timeout: 30000,
          retries: 3,
          env: {
            GITHUB_PERSONAL_ACCESS_TOKEN: process.env.GITHUB_PERSONAL_ACCESS_TOKEN || ''
          }
        },
        {
          id: 'puppeteer',
          name: 'Puppeteer Server',
          type: 'local',
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-puppeteer'],
          autoStart: false,
          timeout: 30000,
          retries: 3,
          env: {
            PUPPETEER_HEADLESS: process.env.PUPPETEER_HEADLESS || 'true',
            PUPPETEER_USER_DATA_DIR: process.env.PUPPETEER_USER_DATA_DIR || ''
          }
        },
        {
          id: 'gitkraken',
          name: 'GitKraken Server',
          type: 'local',
          command: 'node',
          args: [process.env.GITKRAKEN_MCP_PATH || './node_modules/@gitkraken/mcp-server-gitkraken/dist/index.js'],
          autoStart: false,
          timeout: 30000,
          retries: 3,
        },
        {
          id: '2slides',
          name: '2Slides Server',
          type: 'local',
          command: 'npx',
          args: ['2slides-mcp'],
          autoStart: false,
          timeout: 30000,
          retries: 3,
          env: {
            API_KEY: process.env.TWOSLIDES_API_KEY || ''
          }
        },
        {
          id: 'endgame',
          name: 'Endgame Server',
          type: 'local',
          command: 'npx',
          args: ['endgame-mcp@latest'],
          autoStart: false,
          timeout: 30000,
          retries: 3,
          env: {
            API_KEY: process.env.ENDGAME_API_KEY || ''
          }
        },
        {
          id: 'telegram-mcp',
          name: 'Telegram MCP Server',
          type: 'local',
          command: 'telegram-mcp',
          args: [],
          autoStart: false,
          timeout: 30000,
          retries: 3,
          env: {
            TG_APP_ID: process.env.TG_APP_ID || '',
            TG_API_HASH: process.env.TG_API_HASH || ''
          }
        },
        {
          id: 'pubmed',
          name: 'PubMed Server',
          type: 'local',
          command: process.env.PYTHON_PATH || 'python',
          args: ['-m', 'mcp_simple_pubmed'],
          autoStart: false,
          timeout: 30000,
          retries: 3,
          env: {
            PUBMED_EMAIL: process.env.PUBMED_EMAIL || ''
          }
        },
        {
          id: 'agentcare',
          name: 'AgentCare Server',
          type: 'local',
          command: 'node',
          args: [process.env.AGENTCARE_MCP_PATH || './mcp-servers/agentcare/index.js'],
          autoStart: false,
          timeout: 30000,
          retries: 3,
          env: {
            OAUTH_CLIENT_ID: process.env.AGENTCARE_OAUTH_CLIENT_ID || '',
            FHIR_BASE_URL: process.env.AGENTCARE_FHIR_BASE_URL || ''
          }
        },
        {
          id: 'unreal-mcp',
          name: 'Unreal Engine MCP Server',
          type: 'local',
          command: 'uv',
          args: ['--directory', process.env.UNREAL_MCP_PATH || './mcp-servers/unreal-engine', 'run', 'unreal_mcp_server_advanced.py'],
          autoStart: false,
          timeout: 30000,
          retries: 3,
        },
      ],
      modelPreferences: {
        defaultModel: 'gemini-2.5-flash',
        costLimit: 0.01, // $0.01 per request
        maxTokens: 4096,
      },
      routingPreferences: {
        privacyMode: 'balanced', // Smart hybrid: local for simple, API for complex
        defaultCostBudget: 0.10, // Increased to $0.10 per request
        preferLocalForCategories: ['medical', 'financial', 'personal'],
        maxResponseTime: 30000, // Increased to 30 seconds
        autoFallback: true,
        learningEnabled: true,
        // Task-specific routing preferences
        preferredProviders: ['deepseek', 'ollama', 'openai', 'anthropic', 'gemini'],
        fallbackChain: ['deepseek', 'ollama', 'openai', 'anthropic', 'gemini'],
        taskRouting: {
          simple: {
            preferredProviders: ['ollama', 'deepseek'],
            maxResponseTime: 5000,
            costBudget: 0.01,
          },
          moderate: {
            preferredProviders: ['deepseek', 'ollama'],
            maxResponseTime: 15000,
            costBudget: 0.05,
          },
          complex: {
            preferredProviders: ['deepseek', 'openai', 'anthropic'],
            maxResponseTime: 30000,
            costBudget: 0.10,
          },
        },
        // Privacy-aware routing
        privacyRouting: {
          sensitive: {
            preferredProviders: ['ollama'],
            maxResponseTime: 10000,
            costBudget: 0.00,
          },
          normal: {
            preferredProviders: ['deepseek', 'ollama'],
            maxResponseTime: 20000,
            costBudget: 0.05,
          },
        },
      },
      browserSettings: {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        enableDevTools: process.env.NODE_ENV === 'development',
        disableCORS: process.env.NODE_ENV === 'development',
      },
      security: {
        requireConfirmationFor: ['execute_javascript', 'write_file', 'delete_file', 'query_database'],
        allowedDomains: [],
        blockedDomains: [],
      },
    };
  }

  saveConfig(): void {
    try {
      // Check if we're in a browser environment
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(this.CONFIG_KEY, JSON.stringify(this.config));
      }
    } catch (error) {
      console.error('Failed to save config to localStorage:', error);
    }
  }

  // Getters
  getConfig(): AppConfig {
    return { ...this.config };
  }

  getAIProviderConfig(provider: keyof AppConfig['aiProviders']) {
    return this.config.aiProviders[provider];
  }

  getMCPServerConfigs(): MCPServerConfig[] {
    return [...this.config.mcpServers];
  }

  getModelPreferences() {
    return { ...this.config.modelPreferences };
  }

  getBrowserSettings() {
    return { ...this.config.browserSettings };
  }

  getSecuritySettings() {
    return { ...this.config.security };
  }

  // Setters
  setAIProviderConfig(provider: keyof AppConfig['aiProviders'], config: any): void {
    this.config.aiProviders[provider] = config;
    this.saveConfig();
  }

  setMCPServerConfigs(servers: MCPServerConfig[]): void {
    this.config.mcpServers = [...servers];
    this.saveConfig();
  }

  addMCPServerConfig(server: MCPServerConfig): void {
    this.config.mcpServers.push(server);
    this.saveConfig();
  }

  removeMCPServerConfig(serverId: string): void {
    this.config.mcpServers = this.config.mcpServers.filter(s => s.id !== serverId);
    this.saveConfig();
  }

  updateMCPServerConfig(serverId: string, updates: Partial<MCPServerConfig>): void {
    const index = this.config.mcpServers.findIndex(s => s.id === serverId);
    if (index !== -1) {
      this.config.mcpServers[index] = { ...this.config.mcpServers[index], ...updates };
      this.saveConfig();
    }
  }

  setModelPreferences(preferences: Partial<AppConfig['modelPreferences']>): void {
    this.config.modelPreferences = { ...this.config.modelPreferences, ...preferences };
    this.saveConfig();
  }

  setBrowserSettings(settings: Partial<AppConfig['browserSettings']>): void {
    this.config.browserSettings = { ...this.config.browserSettings, ...settings };
    this.saveConfig();
  }

  setSecuritySettings(settings: Partial<AppConfig['security']>): void {
    this.config.security = { ...this.config.security, ...settings };
    this.saveConfig();
  }

  // Validation
  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate AI provider configs
    const providers = this.config.aiProviders;
    if (!providers.gemini?.apiKey && !providers.openai?.apiKey && !providers.anthropic?.apiKey) {
      errors.push('At least one AI provider API key must be configured');
    }

    // Validate MCP server configs
    for (const server of this.config.mcpServers) {
      if (!server.id) errors.push('MCP server ID is required');
      if (!server.name) errors.push('MCP server name is required');
      if (server.type === 'local' && !server.command) {
        errors.push(`Local MCP server ${server.id} must have a command`);
      }
      if (server.type === 'remote' && !server.endpoint) {
        errors.push(`Remote MCP server ${server.id} must have an endpoint`);
      }
    }

    // Validate model preferences
    if (this.config.modelPreferences.costLimit < 0) {
      errors.push('Cost limit must be non-negative');
    }
    if (this.config.modelPreferences.maxTokens < 1) {
      errors.push('Max tokens must be at least 1');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  // Reset to defaults
  resetToDefaults(): void {
    this.config = this.getDefaultConfig();
    this.saveConfig();
  }

  // Export/Import
  exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  importConfig(configJson: string): { success: boolean; errors: string[] } {
    try {
      const importedConfig = JSON.parse(configJson);
      const validation = this.validateConfig();
      
      if (validation.valid) {
        this.config = importedConfig;
        this.saveConfig();
        return { success: true, errors: [] };
      } else {
        return { success: false, errors: validation.errors };
      }
    } catch (error) {
      return { success: false, errors: ['Invalid JSON format'] };
    }
  }
}

export const configService = new ConfigService();
