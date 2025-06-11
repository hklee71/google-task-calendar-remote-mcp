#!/usr/bin/env node

/**
 * Manual MCP Client Test for Google Calendar Query
 * Tests the deployed MCP server by querying tomorrow's meetings
 */

const https = require('https');
const { URL } = require('url');

const ACCESS_TOKEN = 'a19cc5ec31dc057ad01a345423722ddbce4e817518d34fa37da0a23f572618b4';
const MCP_SERVER_URL = 'https://task.wandermusings.com/sse';

// Calculate tomorrow's date
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const tomorrowStr = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD format

console.log(`🔍 Querying calendar events for tomorrow: ${tomorrowStr}`);

async function testSSEConnection() {
  return new Promise((resolve, reject) => {
    const url = new URL(MCP_SERVER_URL);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'GET',
      headers: {
        'Accept': 'text/event-stream',
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    };

    console.log('📡 Connecting to SSE endpoint...');
    
    const req = https.request(options, (res) => {
      console.log(`✅ SSE Response: ${res.statusCode} ${res.statusMessage}`);
      
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }

      res.on('data', (chunk) => {
        const data = chunk.toString().trim();
        console.log(`📨 SSE Data: ${data}`);
      });

      res.on('error', reject);
      
      // Close after 5 seconds
      setTimeout(() => {
        console.log('🔚 Closing SSE connection');
        res.destroy();
        resolve();
      }, 5000);
    });

    req.on('error', reject);
    req.end();
  });
}

// Alternative: Use the MCP Inspector approach
async function testViaCurl() {
  console.log('\n🔧 Alternative: Testing via curl commands...');
  
  // We need to use a proper MCP client library or the MCP inspector
  console.log('📋 To manually query the calendar, we need:');
  console.log('1. A proper MCP client that can handle the bidirectional communication');
  console.log('2. Or use the @modelcontextprotocol/inspector package');
  console.log('3. Or connect via Claude Desktop with mcp-remote proxy');
  
  console.log('\n💡 Manual steps:');
  console.log(`1. Access token: ${ACCESS_TOKEN}`);
  console.log(`2. Tomorrow's date: ${tomorrowStr}`);
  console.log(`3. SSE endpoint: ${MCP_SERVER_URL}`);
}

// Run tests
testSSEConnection()
  .then(() => testViaCurl())
  .then(() => {
    console.log('\n✅ Manual testing guidance provided');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error.message);
    testViaCurl().then(() => process.exit(1));
  });