# Google Task Calendar Remote MCP Server - Product Requirements Document

## 1. Project Overview

### Project Name
Google Task Calendar Remote MCP Server (NEW PROJECT)

### Objective
Create a NEW remote MCP server based on existing local Google Task Calendar MCP server, with full Claude AI integration compatibility, while preserving all current functionality and keeping the original local server untouched.

### Project Scope
- **NEW PROJECT**: Separate codebase and repository  
- **SOURCE**: Copy from existing local server at `C:\Users\hklee\source\mcp-servers\google-task-calendar`
- **TARGET**: New remote server at `C:\Users\hklee\source\mcp-servers\google-task-calendar-remote`
- **DEPLOYMENT**: Synology NAS Docker container
- **ACCESS**: https://task.wandermusings.com via Cloudflare tunnel

### Success Criteria
- ✅ Keep original local server working and untouched
- ✅ New remote server with all 10 tools working identically
- ✅ Claude AI remote integration on all devices
- ✅ 24/7 availability via NAS deployment
- ✅ OAuth 2.1 security and authentication
- ✅ Production-ready deployment with monitoring

## 2. Source System Analysis

### Existing Local Server (Reference Only)
- **Location**: `C:\Users\hklee\source\mcp-servers\google-task-calendar`
- **Status**: Keep working exactly as-is
- **Architecture**: MCP SDK v0.6.0 + StdioServerTransport
- **Tools**: 10 comprehensive tools (5 Tasks + 5 Calendar)
- **Authentication**: Pre-configured Google OAuth2 credentials

### Tools to Copy and Adapt (10 Total)
**Google Tasks Tools (5):**
1. `list_task_lists` - List all Google Task lists
2. `list_tasks` - List tasks within specific list  
3. `add_task` - Add new task to list
4. `update_task` - Update existing task (title/notes/status)
5. `delete_task` - Delete task from list

**Google Calendar Tools (5):**
1. `list_calendars` - List all Google Calendars
2. `list_events` - List events from calendar (with filters)
3. `create_event` - Create new calendar event
4. `update_event` - Update existing event  
5. `delete_event` - Delete event from calendar

### Google API Integration Patterns
- **OAuth2 Client Setup**: Copy successful Google API authentication
- **Credential Management**: Reuse environment variable structure
- **Error Handling**: Copy proven Google API error patterns
- **Rate Limiting**: Copy quota management approaches

## 3. New Remote Server Requirements

### FR1: Project Structure Creation
- **FR1.1**: Create new project directory structure
- **FR1.2**: Initialize new git repository for version control
- **FR1.3**: Set up independent package.json with remote-specific dependencies
- **FR1.4**: Create separate environment configuration

### FR2: Tool Implementation Copy
- **FR2.1**: Copy all 10 tool implementations from local server
- **FR2.2**: Maintain identical input/output schemas
- **FR2.3**: Preserve Google API integration patterns
- **FR2.4**: Keep error handling and response formats identical

### FR3: Transport Layer Conversion
- **FR3.1**: Replace StdioServerTransport with SSEServerTransport
- **FR3.2**: Add Express.js HTTP server framework
- **FR3.3**: Implement real-time bidirectional communication
- **FR3.4**: Add connection management for multiple clients

### FR4: OAuth 2.1 Authentication
- **FR4.1**: Implement OAuth discovery endpoints
  - `/.well-known/oauth-authorization-server`
  - `/.well-known/mcp`
- **FR4.2**: Support dynamic client registration for Claude AI
- **FR4.3**: PKCE (Proof Key for Code Exchange) implementation
- **FR4.4**: Bearer token validation and session management

### FR5: HTTP Endpoint Implementation
- **FR5.1**: Root endpoint `/` with server discovery info
- **FR5.2**: Health check endpoint `/health` for container monitoring
- **FR5.3**: SSE endpoint `/sse` for real-time communication
- **FR5.4**: Messages endpoint `/messages` for Claude AI requests
- **FR5.5**: OAuth endpoints for authentication flow

### FR6: Production Deployment
- **FR6.1**: Multi-stage Docker build for optimization
- **FR6.2**: Docker Compose for NAS deployment
- **FR6.3**: Environment variable security management
- **FR6.4**: Container health checks and restart policies
- **FR6.5**: Non-root execution and security hardening

## 4. Technical Architecture

### High-Level Architecture
```
Claude AI (Multiple Devices)
    ↓ HTTPS
Cloudflare CDN & Security
    ↓ HTTPS  
Cloudflare Tunnel (Encrypted)
    ↓ HTTP (Local Network)
Synology NAS Container Manager
    ↓ Port 3001
NEW Remote Google Task Calendar MCP Server
    ↓ OAuth2 (copied from local)
Google APIs (Tasks & Calendar)
```

### Component Mapping

#### From Local Server (Copy These)
- **Tool Implementations**: All 10 MCP tool handlers
- **Google API Client**: OAuth2 setup and credential management
- **Error Handling**: Proven Google API error responses
- **Input Validation**: Existing parameter validation logic

#### New Remote Components (Add These)
- **OAuth 2.1 Server**: Authentication layer for Claude AI
- **SSE Transport**: Real-time communication transport
- **HTTP Server**: Express.js framework with endpoints
- **Session Management**: Multi-client connection tracking
- **Docker Container**: Production deployment package

### Dependencies Addition
```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "0.6.0",
    "googleapis": "^149.0.0", 
    "axios": "^1.9.0",
    "express": "^4.19.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "jsonwebtoken": "^9.0.2",
    "uuid": "^9.0.1",
    "zod": "^3.22.4",
    "winston": "^3.11.0"
  },
  "devDependencies": {
    "@types/node": "^20.11.24",
    "@types/express": "^4.17.21",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/uuid": "^9.0.7",
    "typescript": "^5.3.3"
  }
}
```

## 5. Implementation Strategy

### Phase 1: Project Setup
1. **Create New Project Structure**
   ```bash
   mkdir google-task-calendar-remote
   cd google-task-calendar-remote
   git init
   npm init
   ```

2. **Copy Reference Materials**
   - Copy tool implementations from local `src/index.ts`
   - Copy `.env` structure for Google credentials
   - Copy successful patterns and schemas

3. **Install Remote Dependencies**
   - Add Express.js for HTTP server
   - Add OAuth 2.1 libraries
   - Add Docker development tools

### Phase 2: Core Implementation
1. **Create Remote Server Structure**
   ```
   src/
   ├── index.ts                 # Main remote server entry
   ├── auth/                    # OAuth 2.1 implementation
   ├── transport/               # SSE transport layer
   ├── tools/                   # Copied from local server
   └── google/                  # Google API client (copied)
   ```

2. **Tool Integration**
   - Copy all 10 tool handlers exactly
   - Adapt for SSE transport instead of stdio
   - Preserve Google API integration patterns

3. **Authentication Layer**
   - Implement OAuth 2.1 discovery endpoints
   - Add PKCE authentication flow
   - Create bearer token validation

### Phase 3: Testing & Validation
1. **Functionality Testing**
   - Verify all 10 tools work identically to local
   - Test Google API integration preservation
   - Validate error handling patterns

2. **Integration Testing**
   - Test OAuth 2.1 flow with Claude AI
   - Verify SSE transport reliability
   - Test multi-client connections

### Phase 4: Production Deployment
1. **Docker Configuration**
   - Multi-stage build for production
   - Security hardening and optimization
   - Health check implementation

2. **NAS Deployment**
   - Container Manager configuration
   - Cloudflare tunnel setup
   - Claude AI integration testing

## 6. Risk Mitigation

### Development Risks
- **Local Server Disruption**: ELIMINATED - separate project ensures local server remains untouched
- **Feature Loss**: MITIGATED - copy exact implementations from working local server
- **Authentication Complexity**: MITIGATED - use proven OAuth 2.1 patterns

### Deployment Risks
- **Production Issues**: MITIGATED - local server always available as backup
- **Performance Problems**: MITIGATED - copy proven Google API patterns
- **Security Vulnerabilities**: MITIGATED - implement industry-standard OAuth 2.1

## 7. Success Metrics

### Local Server Preservation ✅
- **Functionality**: 100% unchanged and working
- **Performance**: No impact or degradation
- **Availability**: Continue as reliable backup

### New Remote Server ✅  
- **Tool Compatibility**: 100% identical functionality to local
- **Claude AI Integration**: Successful authentication and operation
- **Performance**: <2 seconds response time, <256MB memory
- **Availability**: 99.9% uptime via NAS deployment
- **Security**: OAuth 2.1 compliance and container hardening

## 8. Project Timeline

### Week 1: Foundation
- Create new project structure
- Copy tool implementations from local server
- Set up development environment

### Week 2: Remote Implementation  
- Implement OAuth 2.1 authentication
- Add SSE transport layer
- Create HTTP endpoints

### Week 3: Integration & Testing
- Test all tool functionality
- Validate Claude AI integration
- Performance and security testing

### Week 4: Production Deployment
- Docker configuration and optimization
- NAS deployment via Container Manager
- Final validation and monitoring setup

This approach ensures your existing local server remains perfectly functional while creating a new, production-ready remote server optimized for Claude AI integration.