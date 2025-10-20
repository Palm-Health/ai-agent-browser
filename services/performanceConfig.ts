// Performance Optimization Configuration
// This file contains settings to improve app performance and reduce startup time

export const PERFORMANCE_CONFIG = {
  // Disable heavy features during development
  ENABLE_MCP_SERVERS: false,
  ENABLE_VISION_PROCESSING: false,
  ENABLE_MEMORY_SERVICE: true,
  
  // Reduce initialization overhead
  SKIP_HEALTH_CHECKS: true,
  USE_PLACEHOLDER_TOOLS: true,
  
  // Network optimizations - Increased for better reliability
  TIMEOUT_MS: 30000, // Increased to 30 seconds
  RETRY_ATTEMPTS: 3, // Increased retries
  
  // UI optimizations
  LAZY_LOAD_COMPONENTS: true,
  REDUCE_ANIMATIONS: false,
  
  // Startup optimizations
  SKIP_PORT_SCANNING: true, // Only try port 5173
  ENABLE_NETWORK_DIAGNOSTICS: true, // Run diagnostics on startup
  CACHE_PROVIDER_STATUS: true, // Cache provider status to avoid re-checking
};

export const DEBUG_CONFIG = {
  VERBOSE_LOGGING: false,
  SKIP_API_VALIDATION: true,
  USE_MOCK_PROVIDERS: false,
  ENABLE_PERFORMANCE_MONITORING: true,
};
