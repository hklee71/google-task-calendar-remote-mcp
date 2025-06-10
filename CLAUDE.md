# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **NEW** Google Task Calendar Remote MCP Server project, separate from the existing local server. The goal is to create a production-ready remote server for Claude AI integration while preserving the working local server.

**Key Constraint**: The local server at `../google-task-calendar/` must remain UNTOUCHED. This is a READ-ONLY reference for copying successful patterns.

## Build and Development Commands

```bash
# Install dependencies
npm install

# Build TypeScript to JavaScript
npm run build

# Development with auto-rebuild
npm run dev

# Start production server
npm start

# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:tools
npm run test:oauth

# Lint code
npm run lint

# Clean build directory
npm run clean

# Docker commands
npm run docker:build
npm run docker:run
npm run docker:dev
```

## Project Architecture

### Source Reference Pattern
- **Local Server**: `../google-task-calendar/src/index.ts` (READ ONLY - contains 10 working tools)
- **Copy Strategy**: Extract tool implementations exactly, adapt for remote transport
- **Preserve**: All Google API patterns, error handling, input/output schemas

### New Remote Components
- **Transport**: SSE instead of stdio for Claude AI integration
- **Authentication**: OAuth 2.1 with PKCE for secure remote access
- **Server Framework**: Express.js HTTP server with security middleware
- **Deployment**: Docker container for Synology NAS production

### Directory Structure
```
src/
├── index.ts                 # Main Express server with MCP integration
├── auth/                    # OAuth 2.1 implementation (NEW)
├── transport/               # SSE transport layer (NEW)
├── tools/                   # Google API tools (COPIED from local)
├── google/                  # Google API client setup (COPIED)
├── config/                  # Configuration management
└── utils/                   # Shared utilities
```

## Development Workflow

### Tool Implementation Strategy
1. **Reference Local Server**: Always check `../google-task-calendar/src/index.ts` for working implementations
2. **Copy Exactly**: Tool handlers should work identically to local version
3. **Adapt Transport**: Replace stdio patterns with SSE/HTTP patterns
4. **Preserve APIs**: Keep Google API integration patterns unchanged

### Key Implementation Files
- **src/index.ts**: Main server combining Express + MCP Server + OAuth
- **src/tools/**: 10 Google API tools copied from local server
- **src/auth/**: OAuth 2.1 discovery endpoints and PKCE implementation
- **src/transport/**: SSE transport for real-time MCP communication

### Google API Tools (Copy from Local)
**Tasks (5 tools)**: list_task_lists, list_tasks, add_task, update_task, delete_task
**Calendar (5 tools)**: list_calendars, list_events, create_event, update_event, delete_event

## Testing Strategy

### Comparison Testing
Compare outputs between local and remote servers to ensure identical functionality:
```bash
# Test local server (reference)
cd ../google-task-calendar && npm test

# Test remote server (new implementation)
npm test

# Compare tool outputs directly
npm run test:compare-outputs
```

### OAuth Flow Testing
```bash
# Discovery endpoints
curl http://localhost:3001/.well-known/mcp
curl http://localhost:3001/.well-known/oauth-authorization-server

# Client registration
curl -X POST http://localhost:3001/oauth/register \
  -H "Content-Type: application/json" \
  -d '{"client_name":"Test","redirect_uris":["http://localhost:8080/callback"]}'

# SSE connection
curl -N -H "Accept: text/event-stream" \
     -H "Authorization: Bearer test-token" \
     http://localhost:3001/sse
```

## Environment Configuration

Copy Google credentials from local server, add OAuth security:
```env
# Google API (copy from ../google-task-calendar/.env)
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REFRESH_TOKEN=your_refresh_token

# OAuth 2.1 Security (new for remote)
OAUTH_SIGNING_KEY=rsa_private_key
SESSION_SECRET=32_plus_character_secret

# Server Settings
NODE_ENV=production
PORT=3001
LOG_LEVEL=info
```

## Production Deployment

### Docker Commands
```bash
# Build production container
docker build -t google-task-calendar-remote .

# Run container locally
docker-compose up --build

# Check health
curl http://localhost:3001/health
```

### NAS Deployment Checklist
- [ ] Docker container builds successfully
- [ ] All 10 tools work identically to local server
- [ ] OAuth 2.1 flow completes with Claude AI
- [ ] SSE transport handles multiple connections
- [ ] Health checks pass
- [ ] Environment variables configured securely

## Key Development Principles

1. **Local Server Safety**: Never modify `../google-task-calendar/` - it's your working backup
2. **Exact Tool Copy**: Tools must work identically to local version
3. **Transport Adaptation**: Replace stdio with SSE, preserve tool logic
4. **Security First**: Implement proper OAuth 2.1 with PKCE
5. **Production Ready**: Design for 24/7 NAS deployment

## Reference Commands for Local Server Analysis

```bash
# Study local server structure (READ ONLY)
cat ../google-task-calendar/src/index.ts
ls -la ../google-task-calendar/

# Compare package dependencies
diff package.json ../google-task-calendar/package.json

# Test local server functionality
cd ../google-task-calendar && npm test
```

Remember: This project creates a NEW remote server while keeping the existing local server perfectly safe and unchanged.

## Current Status and TODO List

### Deployment Status
✅ **Successfully deployed to Synology NAS with Cloudflare Tunnel**
- Container running healthy at https://task.wandermusings.com
- All 10 Google API tools operational
- Health checks passing
- Discovery endpoints responding correctly

### Fixed Issues
✅ Docker health check failures (removed conflicting curl dependency)
✅ Environment variable conflicts (removed hardcoded environment section from docker-compose.yml)  
✅ OAuth issuer configuration (corrected to use HTTPS)
✅ Container Manager deployment process documented

### Current TODO List - OAuth MCP 2025-03-26 Compliance Issues

**HIGH PRIORITY:**
- [ ] Fix redirect URI validation to only allow localhost or HTTPS URLs per MCP spec (currently allows HTTP)
- [ ] Add Client Credentials grant type support as required by MCP spec (currently only has authorization_code)
- [ ] Enable debug logging (LOG_LEVEL=debug) to capture Claude AI connection attempts
- [ ] Test Claude AI connection after OAuth fixes

**MEDIUM PRIORITY:**
- [ ] Update OAuth discovery metadata to be fully RFC8414 compliant (missing some required fields)
- [ ] Add fallback URL handling for non-RFC8414 compliant clients

### Key Findings - Claude AI Connection Issue

**Root Cause**: OAuth implementation not fully compliant with MCP 2025-03-26 specification
- **Current Error**: "Missing required parameters" when Claude AI attempts authorization
- **Spec Gap**: Redirect URI validation too permissive (allows HTTP, should only allow HTTPS/localhost)
- **Missing Feature**: Client Credentials grant type required by MCP spec
- **Discovery Issue**: OAuth metadata may not be fully RFC8414 compliant

**Analysis**: 
- Basic endpoints working (health, discovery respond correctly)
- OAuth registration works via curl tests
- Authorization endpoint fails with parameter validation
- No logs captured when Claude AI connects (suggests early rejection)

**Next Steps**: Fix OAuth implementation gaps to achieve full MCP 2025-03-26 compliance

## Additional Notes

### Commit Guidelines
- Do not add these commit messages to project git commits:
  * "🤖 Generated with [Claude Code](https://claude.ai/code)"
  * "Co-Authored-By: Claude <noreply@anthropic.com>"
- These are unnecessary information to check in