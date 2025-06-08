# Google Task Calendar Remote MCP Server - NEW PROJECT

## Project Overview

**NEW REMOTE MCP SERVER PROJECT** - Separate from existing local server

**Based on**: Existing local server at `C:\Users\hklee\source\mcp-servers\google-task-calendar`
**Purpose**: Create a NEW remote MCP server for Claude AI integration via Synology NAS deployment
**Repository**: New git repository for version control and NAS deployment

## Project Goals

### Keep Existing Local Server Intact ✅
- **Local Server Location**: `C:\Users\hklee\source\mcp-servers\google-task-calendar`
- **Status**: Keep working exactly as-is on laptop
- **No Changes**: Original local server remains untouched

### Create New Remote Server ✅  
- **New Project Location**: `C:\Users\hklee\source\mcp-servers\google-task-calendar-remote`
- **Purpose**: Remote MCP server with Claude AI integration
- **Deployment**: Synology NAS via Docker + Cloudflare tunnel
- **Domain**: https://task.wandermusings.com

## Architecture Comparison

### Existing Local Server (Keep As-Is)
```
Local Laptop
├── MCP SDK v0.6.0
├── StdioServerTransport  
├── 10 Tools (Tasks + Calendar)
├── Google OAuth2 credentials
└── Claude Desktop integration
```

### New Remote Server (Create New)
```
Synology NAS Container
├── MCP SDK v0.6.0  
├── SSEServerTransport + HTTP endpoints
├── Same 10 Tools (copied from local)
├── OAuth 2.1 + PKCE authentication
├── Express.js server framework
└── Claude AI remote integration
```

## Development Strategy

### Source Material
- **Copy tools logic** from existing `src/index.ts` 
- **Reuse Google API patterns** from working local server
- **Copy .env structure** for credential management
- **Adapt successful patterns** for remote deployment

### New Implementation  
- **OAuth 2.1 authentication layer** for Claude AI
- **SSE transport** for real-time communication  
- **HTTP endpoints** for discovery and health checks
- **Docker configuration** for NAS deployment
- **Production security** and monitoring

## Project Structure (New)
```
google-task-calendar-remote/
├── docs/                           # Project documentation
├── src/                            # New remote server source
│   ├── index.ts                   # Main remote server entry
│   ├── auth/                      # OAuth 2.1 implementation
│   ├── transport/                 # SSE transport layer
│   ├── tools/                     # Copied & adapted from local
│   ├── google/                    # Google API client
│   └── config/                    # Configuration management
├── tests/                         # Testing framework
├── docker/                        # Docker deployment files
├── .env.example                   # Environment template
├── package.json                   # New dependencies
├── tsconfig.json                  # TypeScript config
├── Dockerfile                     # Production container
├── docker-compose.yml             # NAS deployment
└── README.md                      # Project documentation
```

## Implementation Approach

### Step 1: Project Setup
```bash
cd /mnt/c/Users/hklee/source/mcp-servers/google-task-calendar-remote
git init
npm init
```

### Step 2: Copy Working Components
- Copy 10 tool implementations from local `src/index.ts`
- Copy Google API client setup and credentials pattern
- Copy successful patterns and adapt for remote use

### Step 3: Add Remote Capabilities
- Implement OAuth 2.1 with PKCE for Claude AI
- Add SSE transport for real-time communication
- Create HTTP endpoints for discovery and health
- Add production Docker configuration

### Step 4: NAS Deployment
- Build Docker container
- Deploy via Synology Container Manager
- Configure Cloudflare tunnel routing
- Test Claude AI integration

## Benefits of Separate Project

### Risk Mitigation ✅
- **Local server stays working** - no risk to current functionality
- **Independent development** - can experiment freely
- **Easy rollback** - local server always available as backup
- **Gradual migration** - test remote server before switching

### Development Benefits ✅
- **Clean codebase** - optimized for remote deployment
- **Version control** - proper git workflow for remote server
- **Independent testing** - test remote features without affecting local
- **Documentation** - specific to remote deployment requirements

### Deployment Benefits ✅
- **Production ready** - designed for 24/7 NAS deployment
- **Claude AI optimized** - built specifically for remote integration
- **Security focused** - OAuth 2.1 and container hardening
- **Monitoring ready** - health checks and logging

## Success Criteria

### Local Server (Unchanged) ✅
- [ ] Continue working exactly as before
- [ ] No modifications or disruptions
- [ ] Available as backup/reference

### New Remote Server ✅
- [ ] All 10 tools work identically to local version
- [ ] Claude AI integration successful (web + mobile)
- [ ] OAuth 2.1 compliance with PKCE
- [ ] Production deployment on NAS
- [ ] 24/7 availability via https://task.wandermusings.com

## Next Steps

1. **Review complete documentation** in `docs/` directory
2. **Initialize new git repository** for remote server
3. **Copy tool implementations** from local server as starting point
4. **Implement OAuth 2.1 and SSE transport** for remote access
5. **Create Docker deployment** for NAS container
6. **Test Claude AI integration** with new remote server

This approach gives you the best of both worlds: a reliable local server that continues working, plus a new production-ready remote server for Claude AI integration across all your devices.