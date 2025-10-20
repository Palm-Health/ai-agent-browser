import { MCPServer } from '../../types';
import { mcpManager } from './mcpManager';

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  content: string;
  variables: string[];
  category: string;
  version: string;
  serverId?: string;
}

export class MCPPromptManager {
  private prompts: Map<string, PromptTemplate> = new Map();
  private promptCategories: Map<string, PromptTemplate[]> = new Map();
  private activePrompts: Set<string> = new Set();

  constructor() {
    this.initializeDefaultPrompts();
    this.setupMCPServerPromptDiscovery();
  }

  private initializeDefaultPrompts(): void {
    const defaultPrompts: PromptTemplate[] = [
      {
        id: 'browser-automation',
        name: 'Browser Automation Assistant',
        description: 'System prompt for browser automation tasks',
        content: `You are an autonomous web browsing agent. Your goal is to assist the user by interacting with web pages to accomplish their tasks.

- **PLANNING**: For any multi-step task, you MUST start by using the 'create_plan' tool. This plan will be shown to the user for approval before you begin execution. For very simple, single-step tasks (like a single navigation), you may call the tool directly.
- **EXECUTION**: After the user approves the plan, I will execute it step by step. I will give you the result of each tool call. You must analyze the result and then tell me the next function call to execute from the plan.
- **SEARCH**: Use 'google_search' to find information. After searching, you MUST use 'read_page_content' to analyze the search results.
- **COMPLETION**: Once the entire objective is complete, you MUST call the 'task_completed' function with a final summary.
- **LEARNING**: I will provide you with examples of past successful tasks. Learn from these examples to create better plans for the current objective.`,
        variables: [],
        category: 'browser',
        version: '1.0.0',
      },
      {
        id: 'web-scraping',
        name: 'Web Scraping Specialist',
        description: 'System prompt for web scraping and data extraction tasks',
        content: `You are a web scraping specialist. Your expertise is in extracting structured data from web pages efficiently and ethically.

- **DATA EXTRACTION**: Focus on extracting specific, structured data from web pages
- **RESPECT ROBOTS.TXT**: Always check and respect robots.txt files
- **RATE LIMITING**: Implement appropriate delays between requests to avoid overwhelming servers
- **ERROR HANDLING**: Handle pagination, dynamic content, and anti-bot measures gracefully
- **DATA VALIDATION**: Verify extracted data for completeness and accuracy
- **FORMATTING**: Return data in structured formats (JSON, CSV) when requested`,
        variables: ['target_url', 'data_schema'],
        category: 'scraping',
        version: '1.0.0',
      },
      {
        id: 'file-operations',
        name: 'File Operations Assistant',
        description: 'System prompt for file and directory operations',
        content: `You are a file operations assistant. You help users manage files and directories on their system.

- **SAFETY FIRST**: Always confirm destructive operations (delete, overwrite) with the user
- **BACKUP**: Suggest creating backups before making significant changes
- **PERMISSIONS**: Respect file permissions and system security
- **ORGANIZATION**: Help organize files logically and efficiently
- **SEARCH**: Use efficient search methods to locate files and content
- **BATCH OPERATIONS**: Group similar operations for efficiency`,
        variables: ['workspace_path', 'operation_type'],
        category: 'filesystem',
        version: '1.0.0',
      },
      {
        id: 'api-integration',
        name: 'API Integration Specialist',
        description: 'System prompt for API integration and data exchange',
        content: `You are an API integration specialist. You help users interact with various APIs and services.

- **AUTHENTICATION**: Handle different authentication methods (API keys, OAuth, JWT)
- **RATE LIMITS**: Respect API rate limits and implement appropriate throttling
- **ERROR HANDLING**: Handle API errors gracefully with retry logic
- **DATA TRANSFORMATION**: Convert between different data formats as needed
- **MONITORING**: Track API usage and performance
- **SECURITY**: Protect sensitive data and credentials`,
        variables: ['api_endpoint', 'auth_method'],
        category: 'api',
        version: '1.0.0',
      },
      {
        id: 'vision-analysis',
        name: 'Vision Analysis Assistant',
        description: 'System prompt for image and visual content analysis',
        content: `You are a vision analysis assistant. You help users understand and extract information from visual content.

- **IMAGE ANALYSIS**: Analyze images for content, objects, text, and patterns
- **OCR**: Extract text from images accurately
- **ACCESSIBILITY**: Describe images for accessibility purposes
- **DATA EXTRACTION**: Extract structured data from charts, graphs, and diagrams
- **COMPARISON**: Compare images and detect differences
- **ANNOTATION**: Provide detailed descriptions and annotations`,
        variables: ['image_url', 'analysis_type'],
        category: 'vision',
        version: '1.0.0',
      },
    ];

    for (const prompt of defaultPrompts) {
      this.addPrompt(prompt);
    }
  }

  private setupMCPServerPromptDiscovery(): void {
    // Listen for MCP server changes
    mcpManager.on('server-started', (server) => {
      this.loadPromptsFromServer(server);
    });

    mcpManager.on('server-stopped', (server) => {
      this.removePromptsFromServer(server.id);
    });

    // Load prompts from existing servers
    const servers = mcpManager.getAllServers();
    for (const server of servers) {
      this.loadPromptsFromServer(server);
    }
  }

  private async loadPromptsFromServer(server: MCPServer): Promise<void> {
    // This would typically load prompts from MCP server resources
    // For now, we'll use placeholder implementation
    console.log(`Loading prompts from MCP server: ${server.name}`);
  }

  private removePromptsFromServer(serverId: string): void {
    const promptsToRemove: string[] = [];
    
    for (const [promptId, prompt] of this.prompts.entries()) {
      if (prompt.serverId === serverId) {
        promptsToRemove.push(promptId);
      }
    }

    for (const promptId of promptsToRemove) {
      this.removePrompt(promptId);
    }
  }

  addPrompt(prompt: PromptTemplate): void {
    this.prompts.set(prompt.id, prompt);
    this.addToCategory(prompt);
  }

  removePrompt(promptId: string): void {
    const prompt = this.prompts.get(promptId);
    if (prompt) {
      this.removeFromCategory(prompt);
      this.prompts.delete(promptId);
      this.activePrompts.delete(promptId);
    }
  }

  private addToCategory(prompt: PromptTemplate): void {
    const category = prompt.category || 'general';
    if (!this.promptCategories.has(category)) {
      this.promptCategories.set(category, []);
    }
    this.promptCategories.get(category)!.push(prompt);
  }

  private removeFromCategory(prompt: PromptTemplate): void {
    const category = prompt.category || 'general';
    const categoryPrompts = this.promptCategories.get(category);
    if (categoryPrompts) {
      const index = categoryPrompts.findIndex(p => p.id === prompt.id);
      if (index > -1) {
        categoryPrompts.splice(index, 1);
      }
    }
  }

  // Public API
  getAllPrompts(): PromptTemplate[] {
    return Array.from(this.prompts.values());
  }

  getPromptsByCategory(category: string): PromptTemplate[] {
    return this.promptCategories.get(category) || [];
  }

  getPrompt(promptId: string): PromptTemplate | undefined {
    return this.prompts.get(promptId);
  }

  getPromptCategories(): string[] {
    return Array.from(this.promptCategories.keys());
  }

  // Prompt composition
  composePrompt(promptId: string, variables: Record<string, any> = {}): string {
    const prompt = this.prompts.get(promptId);
    if (!prompt) {
      throw new Error(`Prompt ${promptId} not found`);
    }

    let content = prompt.content;
    
    // Replace variables in prompt content
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{${key}}`;
      content = content.replace(new RegExp(placeholder, 'g'), String(value));
    }

    return content;
  }

  // Dynamic prompt composition based on active MCP servers
  composeSystemPrompt(activeServers: string[] = []): string {
    const basePrompt = this.getPrompt('browser-automation');
    if (!basePrompt) {
      return 'You are an AI assistant.';
    }

    let systemPrompt = basePrompt.content;

    // Add server-specific prompts
    for (const serverId of activeServers) {
      const serverPrompts = this.getAllPrompts().filter(p => p.serverId === serverId);
      for (const prompt of serverPrompts) {
        systemPrompt += `\n\n## ${prompt.name}\n${prompt.content}`;
      }
    }

    return systemPrompt;
  }

  // Prompt versioning and A/B testing
  getPromptVersion(promptId: string, version?: string): PromptTemplate | undefined {
    const prompt = this.prompts.get(promptId);
    if (!prompt) return undefined;

    if (!version) return prompt;

    // For now, we only support the latest version
    // In a full implementation, you would support multiple versions
    return prompt.version === version ? prompt : undefined;
  }

  // Activate/deactivate prompts
  activatePrompt(promptId: string): void {
    if (this.prompts.has(promptId)) {
      this.activePrompts.add(promptId);
    }
  }

  deactivatePrompt(promptId: string): void {
    this.activePrompts.delete(promptId);
  }

  getActivePrompts(): PromptTemplate[] {
    return Array.from(this.activePrompts).map(id => this.prompts.get(id)!);
  }

  // Prompt validation
  validatePrompt(prompt: PromptTemplate): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!prompt.id) errors.push('Prompt ID is required');
    if (!prompt.name) errors.push('Prompt name is required');
    if (!prompt.content) errors.push('Prompt content is required');
    if (!prompt.category) errors.push('Prompt category is required');

    // Check for undefined variables
    const variableMatches = prompt.content.match(/\{(\w+)\}/g);
    if (variableMatches) {
      const usedVariables = variableMatches.map(match => match.slice(1, -1));
      const undefinedVariables = usedVariables.filter(variable => 
        !prompt.variables.includes(variable)
      );
      if (undefinedVariables.length > 0) {
        errors.push(`Undefined variables: ${undefinedVariables.join(', ')}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export const mcpPromptManager = new MCPPromptManager();
