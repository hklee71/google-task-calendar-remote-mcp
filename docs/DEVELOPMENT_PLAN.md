# Remote MCP Development Plan - NEW PROJECT

## Overview
Step-by-step plan for creating a NEW Google Task Calendar Remote MCP Server project, separate from the existing local server. This ensures the local server remains untouched while creating a production-ready remote server for Claude AI integration.

## Project Strategy

### Keep Local Server Safe ✅
- **No modifications** to existing local server
- **Reference only** - copy successful patterns
- **Backup available** - local server always works
- **Risk-free development** - experiment in new project

### Create New Remote Server ✅
- **New project directory**: `google-task-calendar-remote`
- **Independent git repository** for version control
- **Production-optimized** for NAS deployment
- **Claude AI integration** with OAuth 2.1

## Phase 1: Project Initialization

### Milestone 1.1: New Project Setup
- [ ] **Create Project Structure**
  ```bash
  cd /mnt/c/Users/hklee/source/mcp-servers/
  mkdir google-task-calendar-remote
  cd google-task-calendar-remote
  git init
  ```

- [ ] **Initialize Package Configuration**
  ```bash
  npm init -y
  # Update package.json with remote-specific configuration
  ```

- [ ] **Create Directory Structure**
  ```bash
  mkdir -p src/{auth,transport,tools,google,config,utils}
  mkdir -p tests/{unit,integration,fixtures}
  mkdir -p docker
  mkdir docs
  ```

### Milestone 1.2: Copy Reference Implementation
- [ ] **Analyze Local Server Structure**
  - Read existing `../google-task-calendar/src/index.ts`
  - Document all 10 tool implementations
  - Map Google API integration patterns
  - Identify reusable components

- [ ] **Copy Tool Logic**
  ```bash
  # Copy tool implementations as reference
  cp ../google-task-calendar/src/index.ts src/tools-reference.ts
  cp ../google-task-calendar/.env .env.example
  cp ../google-task-calendar/tsconfig.json .
  ```

- [ ] **Create Base Package Configuration**
  ```json
  {
    "name": "google-task-calendar-remote-mcp",
    "version": "1.0.0",
    "description": "Remote MCP Server for Google Tasks & Calendar with Claude AI Integration",
    "main": "build/index.js",
    "type": "module"
  }
  ```

## Phase 2: Dependencies & Environment

### Milestone 2.1: Install Dependencies
- [ ] **Core MCP Dependencies**
  ```bash
  npm install @modelcontextprotocol/sdk@0.6.0
  npm install googleapis@^149.0.0 axios@^1.9.0
  ```

- [ ] **Remote Server Dependencies**  
  ```bash
  npm install express@^4.19.2 cors@^2.8.5 helmet@^7.1.0
  npm install jsonwebtoken@^9.0.2 uuid@^9.0.1
  npm install zod@^3.22.4 winston@^3.11.0
  ```

- [ ] **Development Dependencies**
  ```bash
  npm install -D typescript@^5.3.3 @types/node@^20.11.24
  npm install -D @types/express@^4.17.21 @types/jsonwebtoken@^9.0.5
  npm install -D @types/uuid@^9.0.7 jest@^29.7.0
  ```

### Milestone 2.2: Environment Configuration
- [ ] **Create Environment Template**
  ```env
  # .env.example
  # Google API Credentials (copy from local server)
  GOOGLE_CLIENT_ID=your_client_id_here
  GOOGLE_CLIENT_SECRET=your_client_secret_here  
  GOOGLE_REFRESH_TOKEN=your_refresh_token_here
  
  # OAuth 2.1 Security (new for remote)
  OAUTH_SIGNING_KEY=generate_rsa_private_key_here
  SESSION_SECRET=generate_32_plus_character_secret_here
  
  # Application Settings
  NODE_ENV=production
  PORT=3001
  LOG_LEVEL=info
  ```

- [ ] **Copy Working Credentials**
  ```bash
  # Copy actual credentials from local server
  cp ../google-task-calendar/.env .env
  # Add new OAuth 2.1 variables to .env
  ```

## Phase 3: Core Implementation

### Milestone 3.1: Tool Implementation Copy
- [ ] **Extract Tool Handlers**
  ```typescript
  // src/tools/tasks.ts - Copy from local server
  export class GoogleTasksTools {
    async listTaskLists() { /* copy from local */ }
    async listTasks() { /* copy from local */ }
    async addTask() { /* copy from local */ }
    async updateTask() { /* copy from local */ }
    async deleteTask() { /* copy from local */ }
  }
  
  // src/tools/calendar.ts - Copy from local server  
  export class GoogleCalendarTools {
    async listCalendars() { /* copy from local */ }
    async listEvents() { /* copy from local */ }
    async createEvent() { /* copy from local */ }
    async updateEvent() { /* copy from local */ }
    async deleteEvent() { /* copy from local */ }
  }
  ```

- [ ] **Copy Google API Client Setup**
  ```typescript
  // src/google/client.ts - Copy from local server
  import { google } from 'googleapis';
  
  export class GoogleApiClient {
    // Copy exact OAuth2 setup from local server
    private oauth2Client: OAuth2Client;
    public tasks: any;
    public calendar: any;
    
    constructor() {
      // Copy exact initialization from local
    }
  }
  ```

### Milestone 3.2: OAuth 2.1 Implementation
- [ ] **Discovery Endpoints**
  ```typescript
  // src/auth/discovery.ts
  export const oauthDiscovery = (req, res) => {
    res.json({
      issuer: process.env.MCP_SERVER_URL,
      authorization_endpoint: `${process.env.MCP_SERVER_URL}/oauth/authorize`,
      token_endpoint: `${process.env.MCP_SERVER_URL}/oauth/token`,
      registration_endpoint: `${process.env.MCP_SERVER_URL}/oauth/register`,
      scopes_supported: ["mcp:read", "mcp:write"],
      code_challenge_methods_supported: ["S256"]
    });
  };
  ```

- [ ] **PKCE Implementation**
  ```typescript
  // src/auth/pkce.ts
  import crypto from 'crypto';
  
  export class PKCEUtils {
    static generateCodeVerifier(): string {
      return crypto.randomBytes(32).toString('base64url');
    }
    
    static generateCodeChallenge(verifier: string): string {
      return crypto.createHash('sha256').update(verifier).digest('base64url');
    }
  }
  ```

### Milestone 3.3: SSE Transport Layer
- [ ] **SSE Server Implementation**
  ```typescript
  // src/transport/sse.ts
  import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
  import express from 'express';
  
  export class SSEManager {
    private connections = new Map();
    
    async handleSSEConnection(req, res, mcpServer) {
      const transport = new SSEServerTransport('/sse', res);
      await mcpServer.connect(transport);
    }
  }
  ```

- [ ] **HTTP Server Setup**
  ```typescript
  // src/index.ts - Main server entry point
  import express from 'express';
  import { Server } from '@modelcontextprotocol/sdk/server/index.js';
  
  const app = express();
  const mcpServer = new Server({
    name: 'google-tasks-calendar-remote',
    version: '1.0.0'
  });
  
  // Copy tool handlers from local server
  // Add OAuth 2.1 endpoints
  // Add SSE transport
  ```

## Phase 4: Integration & Testing

### Milestone 4.1: Tool Integration Testing
- [ ] **Unit Tests for Tools**
  ```bash
  # Test each tool works identically to local server
  npm run test:tools
  ```

- [ ] **Google API Integration Test**
  ```bash
  # Verify Google API calls work with copied credentials
  npm run test:google-api
  ```

- [ ] **Functionality Comparison**
  ```bash
  # Compare outputs between local and remote servers
  npm run test:compare-outputs
  ```

### Milestone 4.2: OAuth Flow Testing
- [ ] **Discovery Endpoint Test**
  ```bash
  curl http://localhost:3001/.well-known/mcp | jq .
  curl http://localhost:3001/.well-known/oauth-authorization-server | jq .
  ```

- [ ] **Client Registration Test**
  ```bash
  curl -X POST http://localhost:3001/oauth/register \
    -H "Content-Type: application/json" \
    -d '{"client_name":"Test Client","redirect_uris":["http://localhost:8080/callback"]}'
  ```

- [ ] **SSE Connection Test**
  ```bash
  curl -N -H "Accept: text/event-stream" \
       -H "Authorization: Bearer test-token" \
       http://localhost:3001/sse
  ```

## Phase 5: Docker Deployment

### Milestone 5.1: Docker Configuration
- [ ] **Production Dockerfile**
  ```dockerfile
  # Multi-stage build
  FROM node:20-alpine AS builder
  WORKDIR /app
  COPY package*.json tsconfig.json ./
  RUN npm ci --only=production
  COPY src/ ./src/
  RUN npm run build
  
  FROM node:20-alpine AS production
  RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
  WORKDIR /app
  COPY --from=builder --chown=nodejs:nodejs /app/build ./build
  COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
  USER nodejs
  EXPOSE 3001
  CMD ["node", "build/index.js"]
  ```

- [ ] **Docker Compose for NAS**
  ```yaml
  version: '3.8'
  services:
    google-tasks-calendar-remote:
      build: .
      container_name: google-tasks-calendar-remote
      restart: unless-stopped
      ports:
        - "3001:3001"
      env_file: .env
      healthcheck:
        test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
        interval: 30s
        timeout: 10s
        retries: 3
  ```

### Milestone 5.2: NAS Deployment Testing
- [ ] **Local Docker Test**
  ```bash
  docker-compose up --build
  # Test all endpoints locally
  ```

- [ ] **NAS Deployment**
  ```bash
  # Upload to NAS
  # Deploy via Container Manager
  # Configure Cloudflare tunnel
  ```

- [ ] **Claude AI Integration Test**
  ```bash
  # Add to Claude.ai integrations
  # Test OAuth flow with Claude AI
  # Verify all tools work via remote MCP
  ```

## Git Workflow for New Project

### Repository Setup
```bash
cd /mnt/c/Users/hklee/source/mcp-servers/google-task-calendar-remote
git init
git add .
git commit -m "Initial commit: Google Task Calendar Remote MCP Server"

# Create GitHub repository
git remote add origin https://github.com/yourusername/google-task-calendar-remote-mcp.git
git push -u origin main
```

### Development Branches
```bash
# Feature development
git checkout -b feature/oauth-implementation
git checkout -b feature/sse-transport  
git checkout -b feature/docker-deployment

# Commit frequently
git add .
git commit -m "feat: implement OAuth 2.1 discovery endpoints"
git commit -m "feat: add PKCE authentication flow"
git commit -m "feat: copy Google Tasks tools from local server"
```

## Validation Checklist

### Local Server Preservation ✅
- [ ] Local server at `../google-task-calendar/` unchanged
- [ ] Local server continues working on laptop
- [ ] No modifications to local codebase

### New Remote Server ✅
- [ ] All 10 tools work identically to local version
- [ ] OAuth 2.1 authentication flow completes  
- [ ] SSE transport handles multiple connections
- [ ] Docker container builds and runs
- [ ] NAS deployment successful
- [ ] Claude AI integration working
- [ ] External access via https://task.wandermusings.com

This approach ensures a completely safe development process where your local server remains untouched while creating a new, production-ready remote server specifically optimized for Claude AI integration.