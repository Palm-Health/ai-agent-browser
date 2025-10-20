#!/usr/bin/env node

/**
 * AI Agent Browser - Comprehensive Debug Script
 * 
 * This script tests connectivity, providers, and generates diagnostic reports
 * to help troubleshoot performance and connectivity issues.
 */

// Note: This is a simplified JavaScript version for Node.js compatibility
// For full TypeScript support, use: npm run debug:full:ts

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`  ${title}`, 'bright');
  log(`${'='.repeat(60)}`, 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

async function testEnvironmentVariables() {
  logSection('Environment Variables Check');
  
  const envVars = {
    'DEEPSEEK_API_KEY': process.env.DEEPSEEK_API_KEY,
    'OLLAMA_ENDPOINT': process.env.OLLAMA_ENDPOINT,
    'GEMINI_API_KEY': process.env.GEMINI_API_KEY,
    'OPENAI_API_KEY': process.env.OPENAI_API_KEY,
    'ANTHROPIC_API_KEY': process.env.ANTHROPIC_API_KEY,
    'NODE_ENV': process.env.NODE_ENV,
  };

  for (const [key, value] of Object.entries(envVars)) {
    if (value) {
      const maskedValue = key.includes('API_KEY') ? `${value.substring(0, 8)}...` : value;
      logSuccess(`${key}: ${maskedValue}`);
    } else {
      logWarning(`${key}: Not set`);
    }
  }
}

async function testBasicConnectivity() {
  logSection('Basic Connectivity Test');
  
  try {
    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch('https://httpbin.org/get', {
      method: 'GET',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const latency = Date.now() - startTime;
      logSuccess(`Internet connected (${latency}ms)`);
      return { connected: true, latency };
    } else {
      logError(`HTTP ${response.status}`);
      return { connected: false, latency: Date.now() - startTime };
    }
  } catch (error) {
    logError(`Connection failed: ${error.message}`);
    return { connected: false, latency: 0 };
  }
}

async function testDeepSeekAPI() {
  logSection('DeepSeek API Test');
  
  try {
    const start = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    const response = await fetch('https://api.deepseek.com/v1/models', {
      method: 'GET',
      headers: { 
        'Authorization': 'Bearer test-key',
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.status === 401) {
      logSuccess(`DeepSeek API reachable (${Date.now() - start}ms) - API key required`);
      return { available: true, latency: Date.now() - start };
    } else if (response.status === 403) {
      logWarning(`DeepSeek API access forbidden (${Date.now() - start}ms)`);
      return { available: false, latency: Date.now() - start };
    } else {
      logWarning(`DeepSeek API unexpected response: ${response.status}`);
      return { available: false, latency: Date.now() - start };
    }
  } catch (error) {
    logError(`DeepSeek API test failed: ${error.message}`);
    return { available: false, latency: 0 };
  }
}

async function testOllamaService() {
  logSection('Ollama Service Test');
  
  try {
    const start = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch('http://localhost:11434/api/tags', {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      logSuccess(`Ollama service available (${Date.now() - start}ms)`);
      return { available: true, latency: Date.now() - start };
    } else {
      logWarning(`Ollama service responded with HTTP ${response.status}`);
      return { available: false, latency: Date.now() - start };
    }
  } catch (error) {
    logWarning(`Ollama service not running: ${error.message}`);
    return { available: false, latency: 0 };
  }
}

async function generateSummary(connectivity, deepseek, ollama) {
  logSection('Summary & Recommendations');
  
  if (connectivity.connected && deepseek.available) {
    logSuccess('All systems operational - DeepSeek ready for use');
    logInfo('Your AI Agent Browser is optimally configured');
  } else if (connectivity.connected && ollama.available) {
    logWarning('Internet connected but DeepSeek unavailable - using Ollama fallback');
    logInfo('Add DeepSeek API key to .env file for better performance');
  } else if (ollama.available) {
    logWarning('Offline mode - using local Ollama only');
    logInfo('Install Ollama models: ollama pull llama3.2:3b');
  } else if (connectivity.connected) {
    logError('Internet connected but no AI providers available');
    logInfo('1. Add DeepSeek API key to .env file');
    logInfo('2. Install Ollama: https://ollama.ai');
  } else {
    logError('No internet connection and no local AI');
    logInfo('1. Check your internet connection');
    logInfo('2. Install Ollama for offline use: https://ollama.ai');
  }
}

async function main() {
  log('AI Agent Browser - Debug Script', 'bright');
  log('================================', 'cyan');
  
  try {
    await testEnvironmentVariables();
    const connectivity = await testBasicConnectivity();
    const deepseek = await testDeepSeekAPI();
    const ollama = await testOllamaService();
    await generateSummary(connectivity, deepseek, ollama);
    
    log('\nDebug script completed successfully!', 'green');
    
  } catch (error) {
    logError(`Debug script failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);
