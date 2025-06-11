#!/usr/bin/env node

/**
 * Direct MCP Server Test for Calendar Query
 * Alternative to MCP Inspector when IPv6/IPv4 issues occur
 */

import fetch from 'node-fetch';

const SERVER_URL = 'https://task.wandermusings.com';
const TOMORROW = '2025-06-11';

async function testMCPServer() {
  console.log('🔍 Testing Remote MCP Server');
  console.log('============================');
  console.log(`Server: ${SERVER_URL}`);
  console.log(`Tomorrow: ${TOMORROW}`);
  console.log('');

  try {
    // 1. Test server health
    console.log('1. 🏥 Testing server health...');
    const healthResponse = await fetch(`${SERVER_URL}/health`);
    const health = await healthResponse.json();
    console.log(`   ✅ Health: ${health.status} at ${health.timestamp}`);

    // 2. Test OAuth discovery
    console.log('2. 🔐 Testing OAuth discovery...');
    const oauthResponse = await fetch(`${SERVER_URL}/.well-known/oauth-authorization-server`);
    const oauth = await oauthResponse.json();
    console.log(`   ✅ OAuth issuer: ${oauth.issuer}`);
    console.log(`   ✅ Scopes: ${oauth.scopes_supported.join(', ')}`);

    // 3. Test MCP discovery
    console.log('3. 🔗 Testing MCP discovery...');
    const mcpResponse = await fetch(`${SERVER_URL}/.well-known/mcp`);
    const mcp = await mcpResponse.json();
    console.log(`   ✅ MCP version: ${mcp.mcpVersion}`);
    console.log(`   ✅ Transport: ${mcp.transport.type} at ${mcp.transport.endpoint}`);
    console.log(`   ✅ Tools available: ${mcp.capabilities.tools.count}`);

    // 4. Register OAuth client
    console.log('4. 📝 Registering OAuth client...');
    const clientResponse = await fetch(`${SERVER_URL}/oauth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_name: 'Direct Calendar Test',
        redirect_uris: ['http://localhost:8080/callback']
      })
    });
    const client = await clientResponse.json();
    console.log(`   ✅ Client ID: ${client.client_id}`);

    // 5. Get access token
    console.log('5. 🎫 Getting access token...');
    const tokenResponse = await fetch(`${SERVER_URL}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=client_credentials&client_id=${client.client_id}`
    });
    const token = await tokenResponse.json();
    console.log(`   ✅ Access token received (${token.access_token.substring(0, 20)}...)`);

    console.log('');
    console.log('🎯 READY FOR CALENDAR QUERY!');
    console.log('============================');
    console.log('Your MCP server is fully operational and ready to query tomorrow\'s meetings.');
    console.log('');
    console.log('📋 To query tomorrow\'s calendar events:');
    console.log('1. Use MCP Inspector at http://127.0.0.1:6274 (try different browsers)');
    console.log('2. Or set up Claude Desktop integration');
    console.log('3. Or use the access token above for direct API calls');
    console.log('');
    console.log(`🔑 Your access token: ${token.access_token}`);
    console.log(`📅 Tomorrow's date range: ${TOMORROW}T00:00:00Z to ${TOMORROW}T23:59:59Z`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testMCPServer();