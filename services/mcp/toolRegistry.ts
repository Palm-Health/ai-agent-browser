import { Tool, MCPTool, nativeTools, FunctionDeclaration } from '../../types';
import { mcpManager } from './mcpManager';

export class MCPToolRegistry {
  private tools: Map<string, Tool> = new Map();
  private toolCategories: Map<string, Tool[]> = new Map();
  private toolPermissions: Map<string, any[]> = new Map();

  constructor() {
    this.initializeNativeTools();
    this.setupMCPToolDiscovery();
  }

  private initializeNativeTools(): void {
    // Add native browser tools
    for (const tool of nativeTools) {
      const toolObj: Tool = {
        name: tool.name,
        description: tool.description,
        inputSchema: tool.parameters,
        source: 'native',
        category: this.categorizeTool(tool.name),
        permissions: this.getToolPermissions(tool.name),
      };
      this.tools.set(tool.name, toolObj);
      this.addToCategory(toolObj);
    }
  }

  private setupMCPToolDiscovery(): void {
    // Listen for MCP server changes
    mcpManager.on('server-started', (server) => {
      this.addMCPServerTools(server);
    });

    mcpManager.on('server-stopped', (server) => {
      this.removeMCPServerTools(server.id);
    });

    // Add tools from existing servers
    const servers = mcpManager.getAllServers();
    for (const server of servers) {
      this.addMCPServerTools(server);
    }
  }

  private addMCPServerTools(server: any): void {
    for (const mcpTool of server.tools) {
      const tool: Tool = {
        name: mcpTool.name,
        description: mcpTool.description,
        inputSchema: mcpTool.inputSchema,
        source: 'mcp',
        serverId: server.id,
        category: mcpTool.category || this.categorizeTool(mcpTool.name),
        permissions: mcpTool.permissions || this.getToolPermissions(mcpTool.name),
      };

      // Handle namespace conflicts
      const toolKey = this.resolveToolName(tool.name, server.id);
      this.tools.set(toolKey, tool);
      this.addToCategory(tool);
    }
  }

  private removeMCPServerTools(serverId: string): void {
    const toolsToRemove: string[] = [];
    
    for (const [toolKey, tool] of this.tools.entries()) {
      if (tool.source === 'mcp' && tool.serverId === serverId) {
        toolsToRemove.push(toolKey);
      }
    }

    for (const toolKey of toolsToRemove) {
      const tool = this.tools.get(toolKey);
      if (tool) {
        this.removeFromCategory(tool);
        this.tools.delete(toolKey);
      }
    }
  }

  private resolveToolName(toolName: string, serverId: string): string {
    // Check for conflicts with existing tools
    if (this.tools.has(toolName)) {
      const existingTool = this.tools.get(toolName);
      if (existingTool?.source === 'native') {
        // Native tools take precedence, prefix MCP tool
        return `${serverId}_${toolName}`;
      } else if (existingTool?.source === 'mcp') {
        // Both are MCP tools, prefix with server ID
        return `${serverId}_${toolName}`;
      }
    }
    return toolName;
  }

  private categorizeTool(toolName: string): string {
    const categories: Record<string, string[]> = {
      'browser': ['navigate_to_url', 'click_element', 'fill_form_element', 'read_page_content', 'take_screenshot'],
      'search': ['google_search'],
      'automation': ['execute_javascript', 'create_plan'],
      'forge': ['forge.mine_candidates', 'forge.propose_changes', 'forge.apply_changes'],
      'analysis': ['summarize_current_page'],
      'completion': ['task_completed'],
      'scraping': ['scrape_page', 'extract_data', 'parse_html'],
      'file': ['read_file', 'write_file', 'list_directory'],
      'api': ['make_request', 'post_data', 'get_data'],
      'database': ['query_database', 'insert_data', 'update_data'],
      'vision': ['analyze_image', 'extract_text', 'detect_objects'],
      'workflow': ['record_action', 'replay_workflow', 'save_macro'],
    };

    for (const [category, tools] of Object.entries(categories)) {
      if (tools.some(tool => toolName.includes(tool) || toolName === tool)) {
        return category;
      }
    }

    return 'general';
  }

  private getToolPermissions(toolName: string): any[] {
    const permissions: Record<string, any[]> = {
      'navigate_to_url': [{ type: 'execute', scope: 'browser', requiresConfirmation: false }],
      'click_element': [{ type: 'execute', scope: 'browser', requiresConfirmation: false }],
      'fill_form_element': [{ type: 'write', scope: 'browser', requiresConfirmation: false }],
      'execute_javascript': [{ type: 'execute', scope: 'browser', requiresConfirmation: true }],
      'take_screenshot': [{ type: 'read', scope: 'browser', requiresConfirmation: false }],
      'write_file': [{ type: 'write', scope: 'filesystem', requiresConfirmation: true }],
      'delete_file': [{ type: 'write', scope: 'filesystem', requiresConfirmation: true }],
      'make_request': [{ type: 'execute', scope: 'network', requiresConfirmation: false }],
      'query_database': [{ type: 'read', scope: 'database', requiresConfirmation: true }],
    };

    return permissions[toolName] || [{ type: 'execute', scope: 'general', requiresConfirmation: false }];
  }

  private addToCategory(tool: Tool): void {
    const category = tool.category || 'general';
    if (!this.toolCategories.has(category)) {
      this.toolCategories.set(category, []);
    }
    this.toolCategories.get(category)!.push(tool);
  }

  private removeFromCategory(tool: Tool): void {
    const category = tool.category || 'general';
    const categoryTools = this.toolCategories.get(category);
    if (categoryTools) {
      const index = categoryTools.findIndex(t => t.name === tool.name && t.serverId === tool.serverId);
      if (index > -1) {
        categoryTools.splice(index, 1);
      }
    }
  }

  // Public API
  getAllTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  getToolsByCategory(category: string): Tool[] {
    return this.toolCategories.get(category) || [];
  }

  getTool(toolName: string): Tool | undefined {
    return this.tools.get(toolName);
  }

  getNativeTools(): Tool[] {
    return this.getAllTools().filter(tool => tool.source === 'native');
  }

  getMCPTools(): Tool[] {
    return this.getAllTools().filter(tool => tool.source === 'mcp');
  }

  getToolsByServer(serverId: string): Tool[] {
    return this.getAllTools().filter(tool => tool.serverId === serverId);
  }

  getToolCategories(): string[] {
    return Array.from(this.toolCategories.keys());
  }

  getToolPermissionsMetadata(toolName: string): any[] {
    return this.toolPermissions.get(toolName) || [];
  }

  // Convert tools to function declarations for AI models
  getFunctionDeclarations(): FunctionDeclaration[] {
    return this.getAllTools().map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
    }));
  }

  // Check if tool requires user confirmation
  requiresConfirmation(toolName: string): boolean {
    const permissions = this.getToolPermissions(toolName);
    return permissions.some(permission => permission.requiresConfirmation);
  }

  // Get optimal tool for a category (considering server performance)
  getOptimalToolForCategory(category: string): Tool | undefined {
    const tools = this.getToolsByCategory(category);
    if (tools.length === 0) return undefined;
    if (tools.length === 1) return tools[0];
    
    // Prefer native tools over MCP tools for reliability
    const nativeTool = tools.find(t => t.source === 'native');
    if (nativeTool) return nativeTool;
    
    // Return first MCP tool (server selection happens at execution time)
    return tools[0];
  }

  // Get tools that can be executed in parallel
  getParallelExecutableTools(toolNames: string[]): string[][] {
    const parallelGroups: string[][] = [];
    const processed = new Set<string>();

    for (const toolName of toolNames) {
      if (processed.has(toolName)) continue;

      const tool = this.getTool(toolName);
      if (!tool) continue;

      const parallelGroup = [toolName];
      processed.add(toolName);

      // Find tools that can run in parallel with this one
      for (const otherToolName of toolNames) {
        if (processed.has(otherToolName)) continue;

        const otherTool = this.getTool(otherToolName);
        if (!otherTool) continue;

        // Check if tools can run in parallel (same category, no conflicts)
        if (this.canRunInParallel(tool, otherTool)) {
          parallelGroup.push(otherToolName);
          processed.add(otherToolName);
        }
      }

      parallelGroups.push(parallelGroup);
    }

    return parallelGroups;
  }

  private canRunInParallel(tool1: Tool, tool2: Tool): boolean {
    // Tools can run in parallel if they don't conflict
    // This is a simplified implementation
    const conflictingCategories = ['browser', 'filesystem'];
    const category1 = tool1.category || 'general';
    const category2 = tool2.category || 'general';

    // If both tools are in conflicting categories, they can't run in parallel
    if (conflictingCategories.includes(category1) && conflictingCategories.includes(category2)) {
      return false;
    }

    return true;
  }
}

export const mcpToolRegistry = new MCPToolRegistry();
