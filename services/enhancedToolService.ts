import { ExecutionContext, ToolResult, MCPToolCall } from '../types';
import { FunctionCall } from '@google/genai';
import { mcpManager } from './mcp/mcpManager';
import { mcpToolRegistry } from './mcp/toolRegistry';
import { mcpServerRouter } from './mcp/mcpServerRouter';
import { configService } from './config';
import { vaultService } from './vaultService';

export class EnhancedToolService {
  private executionHistory: Array<{ toolName: string; success: boolean; executionTime: number; timestamp: number }> = [];

  async executeTool(
    functionCall: FunctionCall | MCPToolCall,
    context: ExecutionContext
  ): Promise<ToolResult> {
    const startTime = Date.now();
    
    try {
      let result: ToolResult;

      // Determine tool category for MCP server selection
      const tool = mcpToolRegistry.getTool(functionCall.name);
      const category = tool?.category || 'general';

      // Determine if this is a native tool or MCP tool
      if ('serverId' in functionCall) {
        // MCP tool call - use intelligent server selection
        const availableServers = mcpToolRegistry.getToolsByCategory(category)
          .map(t => t.serverId)
          .filter((id): id is string => id !== undefined);
        
        if (availableServers.length > 1) {
          // Multiple servers available - select optimal one
          const optimalServer = mcpServerRouter.selectOptimalServer(category, availableServers);
          functionCall.serverId = optimalServer;
          console.log(`🔧 Selected optimal MCP server: ${optimalServer} for ${category}`);
        }
        
        // MCP tool call
        result = await this.executeMCPTool(functionCall, context);
        
        // Record MCP server performance
        if ('serverId' in functionCall) {
          const executionTime = Date.now() - startTime;
          mcpServerRouter.recordServerPerformance(
            functionCall.serverId,
            category,
            result.success,
            executionTime
          );
        }
      } else {
        // Native tool call
        result = await this.executeNativeTool(functionCall, context);
      }

      const executionTime = Date.now() - startTime;
      
      // Record execution metrics
      this.recordExecution(functionCall.name, result.success, executionTime);
      
      return {
        ...result,
        executionTime,
        toolUsed: functionCall.name,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.recordExecution(functionCall.name, false, executionTime);
      
      // Record failure for MCP server if applicable
      if ('serverId' in functionCall) {
        const tool = mcpToolRegistry.getTool(functionCall.name);
        const category = tool?.category || 'general';
        mcpServerRouter.recordServerPerformance(
          functionCall.serverId,
          category,
          false,
          executionTime
        );
      }
      
      return {
        success: false,
        error: (error as Error).message,
        executionTime,
        toolUsed: functionCall.name,
      };
    }
  }

  private async executeNativeTool(
    functionCall: FunctionCall,
    context: ExecutionContext
  ): Promise<ToolResult> {
    const { name, args } = functionCall;

    console.log(`Executing native tool: ${name}`, args);

    switch (name) {
      case 'navigate_to_url':
        return await this.navigateToUrl(args.url as string, context);
      
      case 'google_search':
        return await this.googleSearch(args.query as string, context);
      
      case 'read_page_content':
        return await this.readPageContent(context);
      
      case 'click_element':
        return await this.clickElement(args.elementId as string, context);
      
      case 'fill_form_element':
        return await this.fillFormElement(args.elementId as string, args.value as string, context);
      
      case 'execute_javascript':
        return await this.executeJavaScript(args.code as string, context);
      
      case 'take_screenshot':
        return await this.takeScreenshot(context);
      
      case 'summarize_current_page':
        return await this.summarizeCurrentPage(context);
      
      case 'task_completed':
        return await this.taskCompleted(args.summary as string);

      case 'vault.list_pages':
        return await this.listVaultPages(args.query as string | undefined);

      case 'vault.get_page':
        return await this.getVaultPage(args.id as string);
      
      default:
        return {
          success: false,
          error: `Native tool '${name}' not found.`,
        };
    }
  }

  private async executeMCPTool(
    toolCall: MCPToolCall,
    context: ExecutionContext
  ): Promise<ToolResult> {
    const { name, arguments: args, serverId } = toolCall;

    console.log(`Executing MCP tool: ${name} on server ${serverId}`, args);

    try {
      // Check if tool requires confirmation
      const tool = mcpToolRegistry.getTool(name);
      if (tool?.permissions?.some(p => p.requiresConfirmation)) {
        // In a real implementation, this would show a confirmation dialog
        console.log(`Tool ${name} requires user confirmation`);
      }

      // Execute the MCP tool
      const result = await mcpManager.executeTool(serverId, name, args);
      
      return {
        success: true,
        data: result,
        message: `MCP tool ${name} executed successfully`,
        serverId,
      };
    } catch (error) {
      return {
        success: false,
        error: `MCP tool execution failed: ${(error as Error).message}`,
        serverId,
      };
    }
  }

  // Native tool implementations
  private async navigateToUrl(url: string, context: ExecutionContext): Promise<ToolResult> {
    try {
      await context.navigate(url);
      return {
        success: true,
        message: `Navigating to ${url}. I will read the content next.`,
      };
    } catch (error) {
      return {
        success: false,
        error: `Navigation failed: ${(error as Error).message}`,
      };
    }
  }

  private async googleSearch(query: string, context: ExecutionContext): Promise<ToolResult> {
    if (!query) {
      return {
        success: false,
        error: "Search failed: The 'query' parameter is required.",
      };
    }

    try {
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
      await context.navigate(searchUrl);
      return {
        success: true,
        message: `Searching Google for '${query}'. I will now read the page content to analyze the results.`,
      };
    } catch (error) {
      return {
        success: false,
        error: `Search failed: ${(error as Error).message}`,
      };
    }
  }

  private async readPageContent(context: ExecutionContext): Promise<ToolResult> {
    try {
      const content = await context.getPageContent();
      if (!content || content.elements?.length === 0) {
        return {
          success: false,
          message: 'No interactive content found on the page.',
        };
      }
      return {
        success: true,
        content: content.elements,
        data: content,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to read page content: ${(error as Error).message}`,
      };
    }
  }

  private async clickElement(elementId: string, context: ExecutionContext): Promise<ToolResult> {
    try {
      await context.clickElement(elementId);
      return {
        success: true,
        message: `Clicked element with ID '${elementId}'. I will read the page again to see the result.`,
      };
    } catch (error) {
      return {
        success: false,
        error: `Click failed: ${(error as Error).message}`,
      };
    }
  }

  private async fillFormElement(elementId: string, value: string, context: ExecutionContext): Promise<ToolResult> {
    try {
      await context.fillFormElement(elementId, value);
      return {
        success: true,
        message: `Filled element '${elementId}' with value '${value}'.`,
      };
    } catch (error) {
      return {
        success: false,
        error: `Form fill failed: ${(error as Error).message}`,
      };
    }
  }

  private async executeJavaScript(code: string, context: ExecutionContext): Promise<ToolResult> {
    try {
      const result = await context.executeJavaScript(code);
      return {
        success: true,
        data: result,
        message: `JavaScript executed successfully.`,
      };
    } catch (error) {
      return {
        success: false,
        error: `JavaScript execution failed: ${(error as Error).message}`,
      };
    }
  }

  private async takeScreenshot(context: ExecutionContext): Promise<ToolResult> {
    try {
      const screenshot = await context.takeScreenshot();
      return {
        success: true,
        data: screenshot,
        message: `Screenshot captured successfully.`,
      };
    } catch (error) {
      return {
        success: false,
        error: `Screenshot failed: ${(error as Error).message}`,
      };
    }
  }

  private async summarizeCurrentPage(context: ExecutionContext): Promise<ToolResult> {
    try {
      const content = await context.getPageContent();
      if (!content || !content.text) {
        return {
          success: false,
          message: 'The page content is too short to provide a meaningful summary.',
        };
      }

      // Limit content size to avoid overly large API requests
      const truncatedText = content.text.substring(0, 15000);
      
      // This would use an AI service to summarize the text
      // For now, we'll return a placeholder
      const summary = `Page summary: ${truncatedText.substring(0, 200)}...`;
      
      return {
        success: true,
        summary,
        data: { originalLength: content.text.length, summaryLength: summary.length },
      };
    } catch (error) {
      return {
        success: false,
        error: `Summarization failed: ${(error as Error).message}`,
      };
    }
  }

  private async listVaultPages(query?: string): Promise<ToolResult> {
    try {
      const entries = await vaultService.listSnapshots({ query });
      return {
        success: true,
        data: entries,
        message: `Found ${entries.length} saved page(s) in the vault.`,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to list vault pages: ${(error as Error).message}`,
      };
    }
  }

  private async getVaultPage(id: string): Promise<ToolResult> {
    if (!id) {
      return { success: false, error: 'Snapshot id is required.' };
    }

    try {
      const snapshot = await vaultService.getSnapshotById(id);
      if (!snapshot) {
        return { success: false, error: `Snapshot ${id} not found.` };
      }

      return {
        success: true,
        data: snapshot,
        message: `Loaded vault snapshot '${snapshot.title}'.`,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to load vault snapshot: ${(error as Error).message}`,
      };
    }
  }

  private async taskCompleted(summary: string): Promise<ToolResult> {
    return {
      success: true,
      message: `Task Completed: ${summary}`,
      data: { summary },
    };
  }

  // Execution metrics and analytics
  private recordExecution(toolName: string, success: boolean, executionTime: number): void {
    this.executionHistory.push({
      toolName,
      success,
      executionTime,
      timestamp: Date.now(),
    });

    // Keep only the last 1000 executions
    if (this.executionHistory.length > 1000) {
      this.executionHistory = this.executionHistory.slice(-1000);
    }
  }

  getExecutionStats(): {
    totalExecutions: number;
    successRate: number;
    averageExecutionTime: number;
    toolStats: Record<string, { count: number; successRate: number; avgTime: number }>;
  } {
    const totalExecutions = this.executionHistory.length;
    const successfulExecutions = this.executionHistory.filter(e => e.success).length;
    const successRate = totalExecutions > 0 ? successfulExecutions / totalExecutions : 0;
    const averageExecutionTime = totalExecutions > 0 
      ? this.executionHistory.reduce((sum, e) => sum + e.executionTime, 0) / totalExecutions 
      : 0;

    // Calculate stats per tool
    const toolStats: Record<string, { count: number; successRate: number; avgTime: number }> = {};
    const toolGroups = this.executionHistory.reduce((groups, execution) => {
      if (!groups[execution.toolName]) {
        groups[execution.toolName] = [];
      }
      groups[execution.toolName].push(execution);
      return groups;
    }, {} as Record<string, typeof this.executionHistory>);

    for (const [toolName, executions] of Object.entries(toolGroups)) {
      const successful = executions.filter(e => e.success).length;
      const avgTime = executions.reduce((sum, e) => sum + e.executionTime, 0) / executions.length;
      
      toolStats[toolName] = {
        count: executions.length,
        successRate: executions.length > 0 ? successful / executions.length : 0,
        avgTime,
      };
    }

    return {
      totalExecutions,
      successRate,
      averageExecutionTime,
      toolStats,
    };
  }

  // Tool discovery and recommendations
  getRecommendedTools(context: ExecutionContext): string[] {
    const recommendations: string[] = [];
    
    // Analyze current page context to recommend tools
    if (context.browserContext.url.includes('google.com/search')) {
      recommendations.push('read_page_content', 'click_element');
    }
    
    if (context.browserContext.pageContent.some(el => el.tag === 'input')) {
      recommendations.push('fill_form_element');
    }
    
    if (context.browserContext.pageContent.some(el => el.tag === 'button')) {
      recommendations.push('click_element');
    }

    return recommendations;
  }

  // Parallel execution support
  async executeToolsInParallel(
    toolCalls: Array<FunctionCall | MCPToolCall>,
    context: ExecutionContext
  ): Promise<ToolResult[]> {
    // Group tools that can run in parallel
    const parallelGroups = mcpToolRegistry.getParallelExecutableTools(
      toolCalls.map(tc => tc.name)
    );

    const results: ToolResult[] = [];

    for (const group of parallelGroups) {
      const groupTools = toolCalls.filter(tc => group.includes(tc.name));
      
      // Execute tools in the group in parallel
      const groupPromises = groupTools.map(toolCall => 
        this.executeTool(toolCall, context)
      );
      
      const groupResults = await Promise.all(groupPromises);
      results.push(...groupResults);
    }

    return results;
  }
}

export const enhancedToolService = new EnhancedToolService();
