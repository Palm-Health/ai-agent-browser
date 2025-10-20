#!/usr/bin/env tsx

/**
 * Ultra-Simple MCP Configuration Test
 * Just verifies the configuration is loaded correctly
 */

import { configService } from './services/config';

function testConfiguration(): void {
  console.log('🔧 Testing MCP Configuration...\n');
  
  const servers = configService.getMCPServerConfigs();
  
  console.log(`📋 Found ${servers.length} configured MCP servers:\n`);
  
  servers.forEach((server, index) => {
    const status = server.autoStart ? '🟢 Auto-start' : '🔴 Disabled';
    console.log(`${index + 1}. ${server.name} (${server.id})`);
    console.log(`   Type: ${server.type}`);
    console.log(`   Command: ${server.command} ${server.args?.join(' ') || ''}`);
    console.log(`   Status: ${status}`);
    
    if (server.env && Object.keys(server.env).length > 0) {
      console.log(`   Environment: ${Object.keys(server.env).join(', ')}`);
    }
    console.log('');
  });
  
  // Categorize servers
  const autoStart = servers.filter(s => s.autoStart);
  const disabled = servers.filter(s => !s.autoStart);
  const withEnv = servers.filter(s => s.env && Object.keys(s.env).length > 0);
  
  console.log('📊 SUMMARY:');
  console.log(`✅ Auto-start servers: ${autoStart.length}`);
  console.log(`⏸️  Disabled servers: ${disabled.length}`);
  console.log(`🔑 Servers with env vars: ${withEnv.length}`);
  
  console.log('\n🎯 Ready to test! You can now:');
  console.log('1. Run: npm run dev');
  console.log('2. Use the chat interface to test MCPs');
  console.log('3. Or run individual MCP servers manually');
  
  console.log('\n💡 Example commands to test individual MCPs:');
  console.log('npx @modelcontextprotocol/server-memory');
  console.log('npx @modelcontextprotocol/server-sequential-thinking');
  console.log('npx @modelcontextprotocol/server-brave-search');
}

// Run the test
testConfiguration();
