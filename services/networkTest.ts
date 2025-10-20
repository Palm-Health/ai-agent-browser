// Enhanced Network Connectivity Test
// This helps diagnose internet connectivity issues with comprehensive diagnostics

export const networkTest = {
  async testConnectivity(): Promise<{ connected: boolean; latency: number; error?: string }> {
    const startTime = Date.now();
    
    try {
      // Test basic connectivity with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch('https://httpbin.org/get', {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const latency = Date.now() - startTime;
        return { connected: true, latency };
      } else {
        return { connected: false, latency: Date.now() - startTime, error: `HTTP ${response.status}` };
      }
    } catch (error) {
      const latency = Date.now() - startTime;
      return { 
        connected: false, 
        latency, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  },

  async testAIProviders(): Promise<Record<string, { available: boolean; latency: number; error?: string }>> {
    const results: Record<string, { available: boolean; latency: number; error?: string }> = {};
    
    // Test DeepSeek (Priority provider)
    try {
      const start = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      const response = await fetch('https://api.deepseek.com/v1/models', {
        method: 'GET',
        headers: { 
          'Authorization': 'Bearer test-key', // This will fail but test connectivity
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      results.deepseek = { 
        available: response.status !== 401, // 401 means API is reachable but key is invalid
        latency: Date.now() - start,
        error: response.status === 401 ? 'API key required' : 
               response.status === 403 ? 'API access forbidden' :
               response.status >= 500 ? 'Server error' : undefined
      };
    } catch (error) {
      results.deepseek = { 
        available: false, 
        latency: 0, 
        error: error instanceof Error ? error.message : 'Connection failed' 
      };
    }

    // Test OpenAI
    try {
      const start = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': 'Bearer test-key' },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      results.openai = { 
        available: response.status !== 401,
        latency: Date.now() - start,
        error: response.status === 401 ? 'API key required' : undefined
      };
    } catch (error) {
      results.openai = { 
        available: false, 
        latency: 0, 
        error: error instanceof Error ? error.message : 'Connection failed' 
      };
    }

    // Test Anthropic
    try {
      const start = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 
          'x-api-key': 'test-key',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ model: 'claude-3-sonnet-20240229', max_tokens: 10, messages: [] }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      results.anthropic = { 
        available: response.status !== 401,
        latency: Date.now() - start,
        error: response.status === 401 ? 'API key required' : undefined
      };
    } catch (error) {
      results.anthropic = { 
        available: false, 
        latency: 0, 
        error: error instanceof Error ? error.message : 'Connection failed' 
      };
    }

    return results;
  },

  async testLocalServices(): Promise<Record<string, { available: boolean; latency: number; error?: string }>> {
    const results: Record<string, { available: boolean; latency: number; error?: string }> = {};
    
    // Test Ollama
    try {
      const start = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout for local
      
      const response = await fetch('http://localhost:11434/api/tags', {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      results.ollama = { 
        available: response.ok,
        latency: Date.now() - start,
        error: response.ok ? undefined : `HTTP ${response.status}`
      };
    } catch (error) {
      results.ollama = { 
        available: false, 
        latency: 0, 
        error: error instanceof Error ? error.message : 'Not running' 
      };
    }

    return results;
  },

  // Comprehensive diagnostic function
  async runFullDiagnostics(): Promise<{
    timestamp: string;
    basicConnectivity: { connected: boolean; latency: number; error?: string };
    aiProviders: Record<string, { available: boolean; latency: number; error?: string }>;
    localServices: Record<string, { available: boolean; latency: number; error?: string }>;
    summary: {
      internetConnected: boolean;
      deepseekAvailable: boolean;
      ollamaAvailable: boolean;
      recommendedAction: string;
    };
  }> {
    console.log('🔍 Running comprehensive network diagnostics...');
    
    const timestamp = new Date().toISOString();
    
    // Run all tests in parallel for speed
    const [basicConnectivity, aiProviders, localServices] = await Promise.all([
      this.testConnectivity(),
      this.testAIProviders(),
      this.testLocalServices()
    ]);

    // Generate summary and recommendations
    const internetConnected = basicConnectivity.connected;
    const deepseekAvailable = aiProviders.deepseek?.available || false;
    const ollamaAvailable = localServices.ollama?.available || false;

    let recommendedAction = '';
    if (internetConnected && deepseekAvailable) {
      recommendedAction = '✅ All systems operational - DeepSeek ready for use';
    } else if (internetConnected && ollamaAvailable) {
      recommendedAction = '⚠️ Internet connected but DeepSeek unavailable - using Ollama fallback';
    } else if (ollamaAvailable) {
      recommendedAction = '🏠 Offline mode - using local Ollama only';
    } else if (internetConnected) {
      recommendedAction = '❌ Internet connected but no AI providers available - check API keys';
    } else {
      recommendedAction = '🚫 No internet connection and no local AI - check network settings';
    }

    const diagnostics = {
      timestamp,
      basicConnectivity,
      aiProviders,
      localServices,
      summary: {
        internetConnected,
        deepseekAvailable,
        ollamaAvailable,
        recommendedAction
      }
    };

    console.log('📊 Diagnostics complete:', diagnostics.summary);
    return diagnostics;
  }
};
