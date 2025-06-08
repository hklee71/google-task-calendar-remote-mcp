# Claude Code Instructions - NEW Remote MCP Project

## Project Overview

**CREATING NEW PROJECT** - Separate from existing local server

**Existing Local Server**: `C:\Users\hklee\source\mcp-servers\google-task-calendar` (KEEP UNTOUCHED)
**New Remote Project**: `C:\Users\hklee\source\mcp-servers\google-task-calendar-remote` (CREATE NEW)

## Project Context for Claude Code

You are helping create a **NEW Google Task Calendar Remote MCP Server** project. This is a completely separate project from the existing working local server.

### Objectives
1. **Preserve Local Server**: Keep existing local server working exactly as-is
2. **Create Remote Server**: Build new remote MCP server with Claude AI integration
3. **Copy & Enhance**: Use local server as reference, add remote capabilities
4. **Deploy to NAS**: Production deployment via Docker on Synology NAS

### Project Locations
- **Local Server (Reference)**: `/mnt/c/Users/hklee/source/mcp-servers/google-task-calendar`
- **New Remote Project**: `/mnt/c/Users/hklee/source/mcp-servers/google-task-calendar-remote`

## Available Documentation

The new remote project has comprehensive documentation in `docs/`:

### 1. Project Overview (`README.md`)
- Complete project overview and architecture comparison
- Explanation of separate project approach
- Benefits of keeping local server intact

### 2. Product Requirements (`docs/PRD.md`)
- Complete requirements for new remote server
- Tool copying strategy from local server
- OAuth 2.1 and deployment requirements

### 3. Development Plan (`docs/DEVELOPMENT_PLAN.md`)
- 5-phase implementation roadmap
- Specific instructions for copying from local server
- Git workflow for new project

### 4. This File (`docs/CLAUDE_CODE_INSTRUCTIONS.md`)
- Claude Code specific guidance
- WSL development workflow
- Testing and validation procedures

## Reference Material (Local Server)

### Source to Copy From
```bash
# Local server location (READ ONLY - DO NOT MODIFY)
/mnt/c/Users/hklee/source/mcp-servers/google-task-calendar/

# Key files to reference:
src/index.ts        # 10 tool implementations to copy
.env               # Google credentials structure to copy  
package.json       # Dependencies to reference
tsconfig.json      # TypeScript configuration to copy
```

### What to Copy
- **All 10 tool implementations** - exact functionality
- **Google API client setup** - OAuth2 patterns
- **Error handling patterns** - proven approaches
- **Input/output schemas** - maintain compatibility
- **Environment structure** - credential management

### What NOT to Copy
- **StdioServerTransport** - replace with SSE
- **Local-specific configurations** - adapt for remote
- **Package.json exactly** - add remote dependencies

## Development Environment Setup

### Initial Project Creation
```bash
# Navigate to parent directory
cd /mnt/c/Users/hklee/source/mcp-servers/

# Create new project
mkdir google-task-calendar-remote
cd google-task-calendar-remote

# Initialize git repository
git init

# Initialize npm project
npm init -y
```

### Copy Reference Files
```bash
# Copy reference implementation (DO NOT MODIFY ORIGINAL)
cp ../google-task-calendar/src/index.ts src/tools-reference.ts
cp ../google-task-calendar/.env .env.example  
cp ../google-task-calendar/tsconfig.json .
```

### Install Dependencies
```bash
# Core MCP dependencies (same as local)
npm install @modelcontextprotocol/sdk@0.6.0
npm install googleapis@^149.0.0 axios@^1.9.0

# New remote server dependencies
npm install express@^4.19.2 cors@^2.8.5 helmet@^7.1.0
npm install jsonwebtoken@^9.0.2 uuid@^9.0.1 zod@^3.22.4
npm install winston@^3.11.0

# Development dependencies
npm install -D typescript@^5.3.3 @types/node@^20.11.24
npm install -D @types/express@^4.17.21 @types/jsonwebtoken@^9.0.5
npm install -D @types/uuid@^9.0.7 jest@^29.7.0
```

## Implementation Strategy

### Phase 1: Project Foundation
1. **Analyze Local Server** (READ ONLY)
   - Study `../google-task-calendar/src/index.ts`
   - Understand all 10 tool implementations
   - Map Google API integration patterns

2. **Create Project Structure**
   ```bash
   mkdir -p src/{auth,transport,tools,google,config,utils}
   mkdir -p tests/{unit,integration,fixtures}
   mkdir -p docker
   ```

3. **Copy Tool Implementations**
   ```typescript
   // Extract from ../google-task-calendar/src/index.ts
   // Copy all 10 tool handlers exactly
   // Adapt for remote transport (SSE instead of stdio)
   ```

### Phase 2: Remote Capabilities
1. **OAuth 2.1 Implementation**
   ```typescript
   // src/auth/oauth.ts - NEW
   // src/auth/pkce.ts - NEW  
   // src/auth/discovery.ts - NEW
   ```

2. **SSE Transport Layer**
   ```typescript
   // src/transport/sse.ts - NEW
   // src/transport/http.ts - NEW
   // Replace StdioServerTransport with SSEServerTransport
   ```

3. **HTTP Server Framework**
   ```typescript
   // src/index.ts - NEW (main server)
   // Express.js server with OAuth + MCP endpoints
   ```

### Phase 3: Integration & Testing
1. **Tool Compatibility Testing**
   - Verify all 10 tools work identically
   - Test Google API integration
   - Compare outputs with local server

2. **OAuth Flow Testing**
   - Test discovery endpoints
   - Validate PKCE implementation
   - Test Claude AI integration

### Phase 4: Production Deployment
1. **Docker Configuration**
   ```dockerfile
   # Multi-stage production build
   # Security hardening
   # Health checks
   ```

2. **NAS Deployment**
   ```yaml
   # docker-compose.yml for Container Manager
   # Environment configuration
   # Cloudflare tunnel integration
   ```

## Key Implementation Files

### Main Server Entry (`src/index.ts`)
```typescript
import express from 'express';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';

// NEW: Express server for remote access
const app = express();

// NEW: MCP server with same tools as local
const mcpServer = new Server({
  name: 'google-tasks-calendar-remote',
  version: '1.0.0'
});

// COPY: All 10 tool implementations from local server
// setupGoogleTasksTools(mcpServer);
// setupGoogleCalendarTools(mcpServer);

// NEW: OAuth 2.1 endpoints
// app.get('/.well-known/oauth-authorization-server', ...);
// app.get('/.well-known/mcp', ...);
// app.post('/oauth/register', ...);

// NEW: SSE transport endpoint  
// app.get('/sse', authenticateBearer, handleSSEConnection);
```

### Google API Client (`src/google/client.ts`)
```typescript
// COPY: Exact OAuth2 setup from local server
import { google } from 'googleapis';

export class GoogleApiClient {
  // COPY: Same initialization as local server
  private oauth2Client: OAuth2Client;
  public tasks: any;
  public calendar: any;
  
  constructor() {
    // COPY: Exact setup from ../google-task-calendar/src/index.ts
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      'urn:ietf:wg:oauth:2.0:oob'
    );
    
    this.oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN
    });
    
    this.tasks = google.tasks({ version: 'v1', auth: this.oauth2Client });
    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
  }
}
```

### Tools Implementation (`src/tools/`)
```typescript
// COPY: Extract all 10 tools from local server exactly
// Preserve identical functionality and schemas

// From ../google-task-calendar/src/index.ts
export class GoogleTasksTools {
  async listTaskLists() {
    // COPY: Exact implementation
  }
  
  async addTask(tasklistId: string, title: string, notes?: string) {
    // COPY: Exact implementation  
  }
  
  // ... all 5 task tools
}

export class GoogleCalendarTools {
  async listCalendars() {
    // COPY: Exact implementation
  }
  
  async createEvent(summary: string, startDateTime: string, endDateTime: string) {
    // COPY: Exact implementation
  }
  
  // ... all 5 calendar tools
}
```

## Testing Strategy

### Functional Testing
```bash
# Start development server
npm run dev

# Test tool functionality (compare with local)
curl -X POST http://localhost:3001/messages \
  -H "Authorization: Bearer test-token" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":"1","method":"tools/call","params":{"name":"list_task_lists","arguments":{}}}'
```

### OAuth Testing
```bash
# Test discovery
curl http://localhost:3001/.well-known/mcp | jq .

# Test client registration
curl -X POST http://localhost:3001/oauth/register \
  -H "Content-Type: application/json" \
  -d '{"client_name":"Test","redirect_uris":["http://localhost:8080/callback"]}'
```

### Docker Testing
```bash
# Build and test container
docker-compose up --build

# Test container health
curl http://localhost:3001/health
```

## Validation Checklist

### Local Server Safety ✅
- [ ] No modifications to `../google-task-calendar/`
- [ ] Local server continues working on laptop
- [ ] Original codebase remains untouched

### New Remote Server ✅
- [ ] New project in separate directory
- [ ] Independent git repository
- [ ] All 10 tools copied and working
- [ ] OAuth 2.1 authentication implemented
- [ ] SSE transport functional
- [ ] Docker container builds
- [ ] Claude AI integration successful

## Common Development Tasks

### Daily Development Workflow
```bash
# Start in new remote project
cd /mnt/c/Users/hklee/source/mcp-servers/google-task-calendar-remote

# Check status
git status
npm run test

# Reference local server (READ ONLY)
cat ../google-task-calendar/src/index.ts

# Develop new features
npm run dev

# Test continuously
npm run test:tools
npm run test:oauth

# Commit progress
git add .
git commit -m "feat: implement OAuth discovery endpoints"
```

### Troubleshooting
```bash
# Compare with local server
diff src/tools/tasks.ts ../google-task-calendar/src/index.ts

# Test Google API directly
curl -H "Authorization: Bearer $GOOGLE_ACCESS_TOKEN" \
     https://www.googleapis.com/tasks/v1/users/@me/lists

# Debug container
docker logs google-tasks-calendar-remote
```

This approach ensures your existing local server remains perfectly safe while creating a new, production-ready remote server optimized for Claude AI integration and NAS deployment.