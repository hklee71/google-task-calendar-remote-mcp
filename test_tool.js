#!/usr/bin/env node

/**
 * Test individual Google API tools with the modern MCP server
 */

import fetch from 'node-fetch';

const SERVER_URL = 'http://localhost:3001/mcp';

// Get OAuth token first (this would normally be handled by mcp-remote)
async function getTestToken() {
  // For testing, we'll use a simple token - in real usage this would be from OAuth flow
  return 'test-token-for-manual-testing';
}

async function testTool(toolName, args = {}) {
  try {
    const token = await getTestToken();
    
    const response = await fetch(SERVER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: args,
        },
      }),
    });

    const result = await response.json();
    console.log(`\n🔧 Testing tool: ${toolName}`);
    console.log(`📊 Response status: ${response.status}`);
    console.log(`📋 Result:`, JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error(`❌ Error testing ${toolName}:`, error.message);
  }
}

async function main() {
  console.log('🚀 Testing Google API tools with modern MCP server');
  
  // Test list_task_lists (no arguments required)
  await testTool('list_task_lists');
  
  // Test list_calendars (no arguments required)  
  await testTool('list_calendars');
}

main().catch(console.error);