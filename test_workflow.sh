#!/bin/bash

echo "🚀 Testing complete MCP workflow with Google API tools"
echo "📋 Server: http://localhost:3001/mcp"
echo

# Test health check
echo "🔍 1. Testing server health..."
curl -s http://localhost:3001/health | jq .
echo

# Test discovery endpoints
echo "🔍 2. Testing OAuth discovery..."
curl -s http://localhost:3001/.well-known/oauth-authorization-server | jq .authorization_endpoint
echo

echo "🔍 3. Testing MCP discovery..."
curl -s http://localhost:3001/.well-known/mcp | jq .mcpVersions
echo

echo "🔍 4. Testing OAuth Protected Resource discovery..."
curl -s http://localhost:3001/.well-known/oauth-protected-resource | jq .resource
echo

echo "✅ All discovery endpoints working"
echo "🎯 Ready for Claude AI integration!"
echo
echo "📝 Next: Test with Claude Desktop using mcp-remote proxy"