interface CategoryMetrics {
  successRate: number;
  avgLatency: number;
  totalRequests: number;
  lastUsed: Date;
}

interface ServerMetrics {
  successRate: number;
  avgLatency: number;
  toolCategoryPerformance: Map<string, CategoryMetrics>;
  uptime: number;
  lastFailure?: Date;
  totalRequests: number;
}

export class MCPServerRouter {
  private serverMetrics: Map<string, ServerMetrics> = new Map();
  private readonly STORAGE_KEY = 'mcp-server-metrics';
  
  constructor() {
    this.loadMetrics();
  }
  
  recordServerPerformance(
    serverId: string,
    toolCategory: string,
    success: boolean,
    latency: number
  ): void {
    // Get or create server metrics
    let metrics = this.serverMetrics.get(serverId);
    if (!metrics) {
      metrics = {
        successRate: 1.0,
        avgLatency: 0,
        toolCategoryPerformance: new Map(),
        uptime: 100,
        totalRequests: 0,
      };
      this.serverMetrics.set(serverId, metrics);
    }
    
    // Update overall metrics
    metrics.totalRequests++;
    const prevSuccessTotal = metrics.successRate * (metrics.totalRequests - 1);
    metrics.successRate = (prevSuccessTotal + (success ? 1 : 0)) / metrics.totalRequests;
    
    const prevLatencyTotal = metrics.avgLatency * (metrics.totalRequests - 1);
    metrics.avgLatency = (prevLatencyTotal + latency) / metrics.totalRequests;
    
    // Update category-specific metrics
    let categoryMetrics = metrics.toolCategoryPerformance.get(toolCategory);
    if (!categoryMetrics) {
      categoryMetrics = {
        successRate: 1.0,
        avgLatency: 0,
        totalRequests: 0,
        lastUsed: new Date(),
      };
      metrics.toolCategoryPerformance.set(toolCategory, categoryMetrics);
    }
    
    categoryMetrics.totalRequests++;
    const prevCategorySuccessTotal = categoryMetrics.successRate * (categoryMetrics.totalRequests - 1);
    categoryMetrics.successRate = (prevCategorySuccessTotal + (success ? 1 : 0)) / categoryMetrics.totalRequests;
    
    const prevCategoryLatencyTotal = categoryMetrics.avgLatency * (categoryMetrics.totalRequests - 1);
    categoryMetrics.avgLatency = (prevCategoryLatencyTotal + latency) / categoryMetrics.totalRequests;
    categoryMetrics.lastUsed = new Date();
    
    // Record failure
    if (!success) {
      metrics.lastFailure = new Date();
      metrics.uptime = Math.max(0, metrics.uptime - 5); // Reduce uptime score
    } else {
      metrics.uptime = Math.min(100, metrics.uptime + 0.5); // Slowly recover uptime
    }
    
    // Persist metrics
    this.saveMetrics();
  }
  
  selectOptimalServer(toolCategory: string, availableServers: string[]): string {
    if (availableServers.length === 0) {
      throw new Error('No available servers for tool category: ' + toolCategory);
    }
    
    if (availableServers.length === 1) {
      return availableServers[0];
    }
    
    // Score each server for this category
    const scoredServers = availableServers.map(serverId => ({
      serverId,
      score: this.scoreServerForCategory(serverId, toolCategory),
    }));
    
    // Sort by score (highest first)
    scoredServers.sort((a, b) => b.score - a.score);
    
    console.log(`🔧 MCP Server Router: Selected ${scoredServers[0].serverId} for ${toolCategory} (score: ${scoredServers[0].score.toFixed(2)})`);
    
    return scoredServers[0].serverId;
  }
  
  getServerFallbackChain(toolCategory: string, availableServers: string[]): string[] {
    if (availableServers.length === 0) {
      return [];
    }
    
    // Score all servers
    const scoredServers = availableServers.map(serverId => ({
      serverId,
      score: this.scoreServerForCategory(serverId, toolCategory),
    }));
    
    // Sort by score (highest first)
    scoredServers.sort((a, b) => b.score - a.score);
    
    return scoredServers.map(s => s.serverId);
  }
  
  private scoreServerForCategory(serverId: string, toolCategory: string): number {
    const metrics = this.serverMetrics.get(serverId);
    
    // If no metrics, give default score
    if (!metrics) {
      return 50; // Neutral score for untested servers
    }
    
    let score = 0;
    
    // Category-specific performance (40 points)
    const categoryMetrics = metrics.toolCategoryPerformance.get(toolCategory);
    if (categoryMetrics) {
      score += categoryMetrics.successRate * 30; // Success rate weight
      score += Math.max(0, 10 - (categoryMetrics.avgLatency / 100)); // Latency weight
      
      // Recency bonus
      const hoursSinceLastUse = (Date.now() - categoryMetrics.lastUsed.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastUse < 1) {
        score += 5; // Recently used bonus
      }
    } else {
      score += 20; // Default score for category not tested yet
    }
    
    // Overall server reliability (30 points)
    score += metrics.successRate * 20;
    score += (metrics.uptime / 100) * 10;
    
    // Recent failure penalty
    if (metrics.lastFailure) {
      const hoursSinceFailure = (Date.now() - metrics.lastFailure.getTime()) / (1000 * 60 * 60);
      if (hoursSinceFailure < 1) {
        score -= 15; // Recent failure penalty
      } else if (hoursSinceFailure < 24) {
        score -= 5; // Moderate penalty
      }
    }
    
    // Experience bonus (10 points)
    const experienceScore = Math.min(10, metrics.totalRequests / 10);
    score += experienceScore;
    
    return Math.max(0, score);
  }
  
  getServerMetrics(serverId: string): ServerMetrics | undefined {
    return this.serverMetrics.get(serverId);
  }
  
  getAllServerMetrics(): Map<string, ServerMetrics> {
    return new Map(this.serverMetrics);
  }
  
  getServerPerformanceReport(): {
    serverId: string;
    successRate: number;
    avgLatency: number;
    uptime: number;
    totalRequests: number;
    topCategories: Array<{ category: string; requests: number }>;
  }[] {
    const report: any[] = [];
    
    for (const [serverId, metrics] of this.serverMetrics.entries()) {
      const topCategories = Array.from(metrics.toolCategoryPerformance.entries())
        .map(([category, catMetrics]) => ({
          category,
          requests: catMetrics.totalRequests,
        }))
        .sort((a, b) => b.requests - a.requests)
        .slice(0, 3);
      
      report.push({
        serverId,
        successRate: metrics.successRate,
        avgLatency: metrics.avgLatency,
        uptime: metrics.uptime,
        totalRequests: metrics.totalRequests,
        topCategories,
      });
    }
    
    return report.sort((a, b) => b.totalRequests - a.totalRequests);
  }
  
  resetMetrics(serverId?: string): void {
    if (serverId) {
      this.serverMetrics.delete(serverId);
    } else {
      this.serverMetrics.clear();
    }
    this.saveMetrics();
  }
  
  private saveMetrics(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        // Convert Map to array for JSON serialization
        const data: any = {};
        for (const [serverId, metrics] of this.serverMetrics.entries()) {
          data[serverId] = {
            ...metrics,
            toolCategoryPerformance: Array.from(metrics.toolCategoryPerformance.entries()),
          };
        }
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      }
    } catch (error) {
      console.error('Failed to save MCP server metrics:', error);
    }
  }
  
  private loadMetrics(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const data = localStorage.getItem(this.STORAGE_KEY);
        if (data) {
          const parsed = JSON.parse(data);
          for (const [serverId, metrics] of Object.entries(parsed)) {
            const metricsObj = metrics as any;
            this.serverMetrics.set(serverId, {
              ...metricsObj,
              toolCategoryPerformance: new Map(metricsObj.toolCategoryPerformance || []),
              lastFailure: metricsObj.lastFailure ? new Date(metricsObj.lastFailure) : undefined,
            });
          }
        }
      }
    } catch (error) {
      console.error('Failed to load MCP server metrics:', error);
    }
  }
}

export const mcpServerRouter = new MCPServerRouter();

