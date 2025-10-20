import { MCPResource, MCPServer } from '../../types';
import { mcpManager } from './mcpManager';

export class MCPResourceManager {
  private resources: Map<string, MCPResource> = new Map();
  private resourceCache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();
  private subscriptions: Map<string, Set<(data: any) => void>> = new Map();

  constructor() {
    this.setupResourceDiscovery();
  }

  private setupResourceDiscovery(): void {
    // Listen for MCP server changes
    mcpManager.on('server-started', (server) => {
      this.addMCPServerResources(server);
    });

    mcpManager.on('server-stopped', (server) => {
      this.removeMCPServerResources(server.id);
    });

    // Add resources from existing servers
    const servers = mcpManager.getAllServers();
    for (const server of servers) {
      this.addMCPServerResources(server);
    }
  }

  private addMCPServerResources(server: MCPServer): void {
    for (const resource of server.resources) {
      this.resources.set(resource.uri, resource);
    }
  }

  private removeMCPServerResources(serverId: string): void {
    const resourcesToRemove: string[] = [];
    
    for (const [uri, resource] of this.resources.entries()) {
      if (resource.serverId === serverId) {
        resourcesToRemove.push(uri);
      }
    }

    for (const uri of resourcesToRemove) {
      this.resources.delete(uri);
      this.resourceCache.delete(uri);
      this.subscriptions.delete(uri);
    }
  }

  async getResource(uri: string, useCache: boolean = true): Promise<any> {
    const resource = this.resources.get(uri);
    if (!resource) {
      throw new Error(`Resource ${uri} not found`);
    }

    // Check cache first
    if (useCache) {
      const cached = this.resourceCache.get(uri);
      if (cached && this.isCacheValid(cached)) {
        return cached.data;
      }
    }

    try {
      // Fetch resource from MCP server
      const data = await mcpManager.getResource(resource.serverId, uri);
      
      // Cache the result
      this.resourceCache.set(uri, {
        data,
        timestamp: Date.now(),
        ttl: this.getResourceTTL(resource),
      });

      return data;
    } catch (error) {
      console.error(`Failed to get resource ${uri}:`, error);
      throw error;
    }
  }

  async getResourceStream(uri: string): Promise<ReadableStream> {
    const resource = this.resources.get(uri);
    if (!resource) {
      throw new Error(`Resource ${uri} not found`);
    }

    // For streaming resources, we might need to implement a different approach
    // This is a placeholder implementation
    const data = await this.getResource(uri, false);
    
    return new ReadableStream({
      start(controller) {
        controller.enqueue(data);
        controller.close();
      },
    });
  }

  subscribeToResource(uri: string, callback: (data: any) => void): () => void {
    if (!this.subscriptions.has(uri)) {
      this.subscriptions.set(uri, new Set());
    }
    
    this.subscriptions.get(uri)!.add(callback);

    // Return unsubscribe function
    return () => {
      const subscribers = this.subscriptions.get(uri);
      if (subscribers) {
        subscribers.delete(callback);
        if (subscribers.size === 0) {
          this.subscriptions.delete(uri);
        }
      }
    };
  }

  private notifySubscribers(uri: string, data: any): void {
    const subscribers = this.subscriptions.get(uri);
    if (subscribers) {
      subscribers.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in resource subscription callback for ${uri}:`, error);
        }
      });
    }
  }

  private isCacheValid(cached: { timestamp: number; ttl: number }): boolean {
    return Date.now() - cached.timestamp < cached.ttl;
  }

  private getResourceTTL(resource: MCPResource): number {
    // Default TTL based on resource type
    const defaultTTL = 5 * 60 * 1000; // 5 minutes

    // Custom TTL based on resource metadata
    if (resource.metadata?.ttl) {
      return resource.metadata.ttl;
    }

    // TTL based on MIME type
    if (resource.mimeType) {
      const ttlMap: Record<string, number> = {
        'text/html': 1 * 60 * 1000, // 1 minute
        'application/json': 5 * 60 * 1000, // 5 minutes
        'image/png': 30 * 60 * 1000, // 30 minutes
        'image/jpeg': 30 * 60 * 1000, // 30 minutes
        'text/plain': 10 * 60 * 1000, // 10 minutes
      };
      return ttlMap[resource.mimeType] || defaultTTL;
    }

    return defaultTTL;
  }

  // Public API
  getAllResources(): MCPResource[] {
    return Array.from(this.resources.values());
  }

  getResourcesByServer(serverId: string): MCPResource[] {
    return this.getAllResources().filter(resource => resource.serverId === serverId);
  }

  getResourcesByType(mimeType: string): MCPResource[] {
    return this.getAllResources().filter(resource => resource.mimeType === mimeType);
  }

  getResourceMetadata(uri: string): MCPResource | undefined {
    return this.resources.get(uri);
  }

  // Cache management
  clearCache(): void {
    this.resourceCache.clear();
  }

  clearResourceCache(uri: string): void {
    this.resourceCache.delete(uri);
  }

  getCacheStats(): { size: number; entries: Array<{ uri: string; age: number; ttl: number }> } {
    const entries = Array.from(this.resourceCache.entries()).map(([uri, cached]) => ({
      uri,
      age: Date.now() - cached.timestamp,
      ttl: cached.ttl,
    }));

    return {
      size: this.resourceCache.size,
      entries,
    };
  }

  // Resource templates (parameterized resources)
  async getResourceTemplate(templateUri: string, parameters: Record<string, any>): Promise<any> {
    // Replace parameters in URI
    let resolvedUri = templateUri;
    for (const [key, value] of Object.entries(parameters)) {
      resolvedUri = resolvedUri.replace(`{${key}}`, String(value));
    }

    return this.getResource(resolvedUri);
  }

  // Batch resource fetching
  async getResources(uris: string[]): Promise<Map<string, any>> {
    const results = new Map<string, any>();
    
    // Fetch resources in parallel
    const promises = uris.map(async (uri) => {
      try {
        const data = await this.getResource(uri);
        results.set(uri, data);
      } catch (error) {
        console.error(`Failed to fetch resource ${uri}:`, error);
        results.set(uri, { error: (error as Error).message });
      }
    });

    await Promise.all(promises);
    return results;
  }

  // Resource prefetching
  async prefetchResources(uris: string[]): Promise<void> {
    // Prefetch resources in background
    uris.forEach(uri => {
      this.getResource(uri, true).catch(error => {
        console.warn(`Failed to prefetch resource ${uri}:`, error);
      });
    });
  }
}

export const mcpResourceManager = new MCPResourceManager();
