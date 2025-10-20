// RAM Stability Tactics for Automation System
// Implements bounded caches, memory pressure handling, and resource cleanup

// Bounded page data - cap elements to 500, cap html to 2MB
export const MEMORY_LIMITS = {
  MAX_ELEMENTS: 500,
  MAX_HTML_SIZE: 2_000_000, // 2MB
  MAX_SNAPSHOTS_PER_TAB: 1,
  MAX_ACTION_RESULTS: 50, // Ring buffer size
  MAX_PAGE_CACHE: 5, // LRU cache size
  MAX_LOG_ENTRIES: 100
};

// LRU Cache for page metadata (N=5)
class LRUPageCache {
  private cache = new Map<string, PageMetadata>();
  private maxSize = MEMORY_LIMITS.MAX_PAGE_CACHE;

  set(url: string, metadata: PageMetadata): void {
    // Remove oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    // Remove if already exists (to move to end)
    this.cache.delete(url);
    this.cache.set(url, metadata);
  }

  get(url: string): PageMetadata | undefined {
    const metadata = this.cache.get(url);
    if (metadata) {
      // Move to end (most recently used)
      this.cache.delete(url);
      this.cache.set(url, metadata);
    }
    return metadata;
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

interface PageMetadata {
  url: string;
  title: string;
  mainSelectors: string[];
  lastSeen: number;
  elementCount: number;
}

// Ring buffer for action results (N=50)
class ActionResultRingBuffer {
  private buffer: ActionResult[] = [];
  private maxSize = MEMORY_LIMITS.MAX_ACTION_RESULTS;
  private head = 0;
  private count = 0;

  push(result: ActionResult): void {
    this.buffer[this.head] = result;
    this.head = (this.head + 1) % this.maxSize;
    
    if (this.count < this.maxSize) {
      this.count++;
    }
  }

  getAll(): ActionResult[] {
    if (this.count === 0) return [];
    
    const result: ActionResult[] = [];
    for (let i = 0; i < this.count; i++) {
      const index = (this.head - this.count + i + this.maxSize) % this.maxSize;
      result.push(this.buffer[index]);
    }
    return result;
  }

  getLast(n: number): ActionResult[] {
    const all = this.getAll();
    return all.slice(-n);
  }

  clear(): void {
    this.buffer = [];
    this.head = 0;
    this.count = 0;
  }

  size(): number {
    return this.count;
  }
}

// Memory manager for automation system
export class AutomationMemoryManager {
  private pageCache = new LRUPageCache();
  private tabResults = new Map<string, ActionResultRingBuffer>();
  private tabSnapshots = new Map<string, any>(); // Track snapshots per tab
  private logBuffer: LogEntry[] = [];
  private disposed = false;

  // Track page snapshot usage
  setPageSnapshot(tabId: string, snapshot: any): void {
    // Dispose previous snapshot for this tab
    this.disposeSnapshot(tabId);
    
    // Store new snapshot (only one per tab)
    this.tabSnapshots.set(tabId, snapshot);
  }

  getPageSnapshot(tabId: string): any | undefined {
    return this.tabSnapshots.get(tabId);
  }

  disposeSnapshot(tabId: string): void {
    const snapshot = this.tabSnapshots.get(tabId);
    if (snapshot) {
      // Clear any references
      if (snapshot.elements) {
        snapshot.elements.length = 0;
      }
      this.tabSnapshots.delete(tabId);
    }
  }

  // Track action results per tab
  addActionResult(tabId: string, result: ActionResult): void {
    if (!this.tabResults.has(tabId)) {
      this.tabResults.set(tabId, new ActionResultRingBuffer());
    }
    this.tabResults.get(tabId)!.push(result);
  }

  getActionResults(tabId: string, lastN?: number): ActionResult[] {
    const buffer = this.tabResults.get(tabId);
    if (!buffer) return [];
    
    return lastN ? buffer.getLast(lastN) : buffer.getAll();
  }

  // Page cache management
  cachePageMetadata(url: string, metadata: Omit<PageMetadata, 'lastSeen'>): void {
    this.pageCache.set(url, {
      ...metadata,
      lastSeen: Date.now()
    });
  }

  getPageMetadata(url: string): PageMetadata | undefined {
    return this.pageCache.get(url);
  }

  // Logging with bounded buffer
  log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any): void {
    if (this.disposed) return;
    
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      message,
      data: data ? this.sanitizeLogData(data) : undefined
    };
    
    this.logBuffer.push(entry);
    
    // Keep only last N entries
    if (this.logBuffer.length > MEMORY_LIMITS.MAX_LOG_ENTRIES) {
      this.logBuffer.splice(0, this.logBuffer.length - MEMORY_LIMITS.MAX_LOG_ENTRIES);
    }
    
    // Only log to console if debug mode is enabled
    if (this.isDebugMode() && level === 'debug') {
      console.debug(`[Automation] ${message}`, data);
    }
  }

  private sanitizeLogData(data: any): any {
    // Remove large objects and circular references
    try {
      const serialized = JSON.stringify(data);
      if (serialized.length > 1000) {
        return { type: typeof data, size: serialized.length };
      }
      return data;
    } catch {
      return { type: typeof data, error: 'circular_reference' };
    }
  }

  private isDebugMode(): boolean {
    // Check if debug mode is enabled (could be from localStorage, env var, etc.)
    return typeof window !== 'undefined' && 
           localStorage.getItem('debug.automation') === 'true';
  }

  // Memory pressure handling
  handleMemoryPressure(): void {
    this.log('warn', 'Memory pressure detected, cleaning up resources');
    
    // Clear oldest page cache entries
    this.pageCache.clear();
    
    // Clear old action results (keep only last 10 per tab)
    for (const [tabId, buffer] of this.tabResults.entries()) {
      const recent = buffer.getLast(10);
      buffer.clear();
      recent.forEach(result => buffer.push(result));
    }
    
    // Clear log buffer
    this.logBuffer.splice(0, this.logBuffer.length - 20);
    
    // Force garbage collection if available
    if (typeof window !== 'undefined' && (window as any).gc) {
      (window as any).gc();
    }
  }

  // Get memory usage statistics
  getMemoryStats(): {
    pageCacheSize: number;
    tabResultsCount: number;
    snapshotCount: number;
    logEntryCount: number;
    estimatedHeapDelta: number;
  } {
    let totalResults = 0;
    for (const buffer of this.tabResults.values()) {
      totalResults += buffer.size();
    }
    
    // Rough estimate of heap delta (in bytes)
    const estimatedHeapDelta = 
      (this.pageCache.size() * 1000) + // Page metadata
      (totalResults * 200) + // Action results
      (this.tabSnapshots.size * 50000) + // Snapshots
      (this.logBuffer.length * 100); // Log entries
    
    return {
      pageCacheSize: this.pageCache.size(),
      tabResultsCount: totalResults,
      snapshotCount: this.tabSnapshots.size,
      logEntryCount: this.logBuffer.length,
      estimatedHeapDelta
    };
  }

  // Cleanup and disposal
  dispose(): void {
    if (this.disposed) return;
    
    this.disposed = true;
    
    // Clear all caches
    this.pageCache.clear();
    this.tabResults.clear();
    this.tabSnapshots.clear();
    this.logBuffer.length = 0;
    
    this.log('info', 'AutomationMemoryManager disposed');
  }
}

interface LogEntry {
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: any;
}

// WeakMap for handle ↔ element mapping (automatic cleanup)
const elementHandleMap = new WeakMap<Element, string>();

export function setElementHandle(element: Element, handle: string): void {
  elementHandleMap.set(element, handle);
}

export function getElementHandle(element: Element): string | undefined {
  return elementHandleMap.get(element);
}

// WebWorker support for heavy parsing (if needed)
export class AutomationWorker {
  private worker?: Worker;
  private messageId = 0;
  private pendingMessages = new Map<number, { resolve: Function; reject: Function }>();

  constructor() {
    // Only create worker if supported and needed
    if (typeof Worker !== 'undefined') {
      this.createWorker();
    }
  }

  private createWorker(): void {
    // Create a minimal worker for heavy operations
    const workerCode = `
      self.onmessage = function(e) {
        const { id, type, data } = e.data;
        
        try {
          let result;
          switch (type) {
            case 'parseSelectors':
              result = parseSelectors(data);
              break;
            case 'scoreElements':
              result = scoreElements(data);
              break;
            default:
              throw new Error('Unknown operation: ' + type);
          }
          
          self.postMessage({ id, success: true, result });
        } catch (error) {
          self.postMessage({ id, success: false, error: error.message });
        }
      };
      
      function parseSelectors(selectors) {
        // Heavy selector parsing logic
        return selectors.map(s => ({ selector: s, score: Math.random() }));
      }
      
      function scoreElements(elements) {
        // Heavy element scoring logic
        return elements.map(e => ({ ...e, score: Math.random() }));
      }
    `;
    
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    this.worker = new Worker(URL.createObjectURL(blob));
    
    this.worker.onmessage = (e) => {
      const { id, success, result, error } = e.data;
      const pending = this.pendingMessages.get(id);
      
      if (pending) {
        this.pendingMessages.delete(id);
        if (success) {
          pending.resolve(result);
        } else {
          pending.reject(new Error(error));
        }
      }
    };
  }

  async execute<T>(type: string, data: any): Promise<T> {
    if (!this.worker) {
      throw new Error('Worker not supported');
    }
    
    const id = ++this.messageId;
    
    return new Promise((resolve, reject) => {
      this.pendingMessages.set(id, { resolve, reject });
      this.worker!.postMessage({ id, type, data });
      
      // Timeout after 5 seconds
      setTimeout(() => {
        if (this.pendingMessages.has(id)) {
          this.pendingMessages.delete(id);
          reject(new Error('Worker operation timeout'));
        }
      }, 5000);
    });
  }

  dispose(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = undefined;
    }
    this.pendingMessages.clear();
  }
}

// Global memory manager instance
export const automationMemoryManager = new AutomationMemoryManager();

// Memory pressure detection (if available)
if (typeof window !== 'undefined' && 'memory' in performance) {
  const checkMemoryPressure = () => {
    const memInfo = (performance as any).memory;
    if (memInfo && memInfo.usedJSHeapSize > memInfo.jsHeapSizeLimit * 0.8) {
      automationMemoryManager.handleMemoryPressure();
    }
  };
  
  // Check every 30 seconds
  setInterval(checkMemoryPressure, 30000);
}
