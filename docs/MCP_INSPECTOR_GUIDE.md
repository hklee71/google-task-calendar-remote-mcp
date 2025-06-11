# MCP Inspector Debugging Guide

## 🔧 Quick Start

The MCP Inspector is now running and ready to test your remote MCP server!

### 🌐 Access the Inspector
- **URL**: http://127.0.0.1:6274
- **Proxy Port**: 6277
- **Status**: ✅ Running

### 🔗 Connect to Your Remote Server

1. **Open Browser**: Navigate to http://127.0.0.1:6274
2. **Enter Server URL**: `https://task.wandermusings.com`
3. **Click Connect**: This will start the OAuth 2.1 authentication flow

### 📋 OAuth Flow Steps

1. **Client Registration**: Inspector automatically registers with your server
2. **Authorization**: You'll be redirected to authenticate
3. **Token Exchange**: Inspector receives access token
4. **Connection**: SSE transport established with MCP server

### 🛠️ Available Tools

Once connected, you'll see 10 Google API tools:

**Tasks (5 tools):**
- `list_task_lists` - List all task lists
- `list_tasks` - List tasks from a specific list
- `add_task` - Create a new task
- `update_task` - Update an existing task
- `delete_task` - Delete a task

**Calendar (5 tools):**
- `list_calendars` - List all calendars
- `list_events` - List calendar events
- `create_event` - Create a new event
- `update_event` - Update an existing event
- `delete_event` - Delete an event

### 📅 Query Tomorrow's Meetings

**Tool**: `list_events`
**Parameters**:
```json
{
  "calendarId": "primary",
  "timeMin": "2025-06-11T00:00:00Z",
  "timeMax": "2025-06-11T23:59:59Z",
  "maxResults": 20
}
```

### 🐛 Debugging Features

**Connection Status**: Shows OAuth and SSE connection state
**Tool Results**: Displays complete API responses
**Error Messages**: Shows detailed error information
**Request/Response**: View complete MCP protocol messages

### 📊 Monitoring

- **Server Health**: https://task.wandermusings.com/health
- **OAuth Discovery**: https://task.wandermusings.com/.well-known/oauth-authorization-server
- **MCP Discovery**: https://task.wandermusings.com/.well-known/mcp

## 🔄 Restart Inspector

If you need to restart the inspector:

```bash
# Kill existing instance
pkill -f mcp-inspector

# Start new instance
mcp-inspector
```

## 📝 Development Notes

- **Perfect for Testing**: Test any remote MCP server during development
- **OAuth Debugging**: See complete OAuth 2.1 flow in action
- **Tool Testing**: Execute individual tools with custom parameters
- **Response Analysis**: Inspect Google API responses in detail

## 🎯 Success Indicators

✅ **Connection Established**: Green status indicator
✅ **Tools Listed**: All 10 tools visible
✅ **Authentication Complete**: Access token received
✅ **API Calls Working**: Successful tool executions

---

**Your server is ready for testing!** 🚀