#!/usr/bin/env node
/**
 * AI Agent Browser - Debug & Performance Fix Script
 * This script identifies and fixes common performance and connectivity issues
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 AI Agent Browser - Debug & Performance Fix Script');
console.log('==================================================');

// Check for common issues
const issues = [];

// 1. Check if API keys are configured
const envFile = path.join(process.cwd(), '.env');
if (!fs.existsSync(envFile)) {
  issues.push({
    type: 'warning',
    message: 'No .env file found - API keys not configured',
    fix: 'Create .env file with your API keys'
  });
}

// 2. Check node_modules
const nodeModules = path.join(process.cwd(), 'node_modules');
if (!fs.existsSync(nodeModules)) {
  issues.push({
    type: 'error',
    message: 'node_modules not found',
    fix: 'Run: npm install'
  });
}

// 3. Check for build files
const electronDist = path.join(process.cwd(), 'electron-dist');
if (!fs.existsSync(electronDist)) {
  issues.push({
    type: 'warning',
    message: 'electron-dist not found - will be created on first run',
    fix: 'Run: npm run build:electron'
  });
}

// 4. Check for MCP server files
const mcpServers = path.join(process.cwd(), 'mcp-servers');
if (!fs.existsSync(mcpServers)) {
  issues.push({
    type: 'warning',
    message: 'MCP servers directory not found',
    fix: 'MCP servers will use placeholder implementations'
  });
}

// Report issues
console.log('\n📋 Issues Found:');
if (issues.length === 0) {
  console.log('✅ No issues found!');
} else {
  issues.forEach((issue, index) => {
    const icon = issue.type === 'error' ? '❌' : '⚠️';
    console.log(`${icon} ${index + 1}. ${issue.message}`);
    console.log(`   Fix: ${issue.fix}`);
  });
}

// Performance recommendations
console.log('\n🚀 Performance Recommendations:');
console.log('1. Use local Ollama models for faster responses');
console.log('2. Configure API keys in .env file for cloud providers');
console.log('3. Disable MCP servers if not needed');
console.log('4. Use development mode for faster startup');

// Create .env template if missing
if (!fs.existsSync(envFile)) {
  const envTemplate = `# AI Agent Browser - Environment Configuration
# Add your API keys here

# AI Provider API Keys
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
DEEPSEEK_API_KEY=your_deepseek_api_key_here

# Ollama Configuration
OLLAMA_ENDPOINT=http://localhost:11434

# Development Settings
NODE_ENV=development
`;
  
  fs.writeFileSync(envFile, envTemplate);
  console.log('\n📝 Created .env template file');
}

console.log('\n✨ Debug script completed!');
console.log('Run "npm run dev" to start the application');
