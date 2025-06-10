# Complete Deployment Guide: Google Task Calendar Remote MCP Server to Synology NAS

## Step 1: Push Repository to GitHub

1. **Navigate to your local project directory**:
   ```bash
   cd /mnt/c/Users/hklee/source/mcp-servers/google-task-calendar-remote
   ```

2. **Create GitHub repository** (via GitHub web interface)

3. **Push to GitHub**:
   ```bash
   git remote add origin https://github.com/yourusername/google-task-calendar-remote.git
   git branch -M main
   git push -u origin main
   ```

## Step 2: Clone Repository to NAS

1. **SSH into your Synology NAS**

2. **Navigate to Docker configs directory**:
   ```bash
   cd /volume4/docker/configs/
   ```

3. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/google-task-calendar-remote.git google-task-calendar-remote-mcp
   cd google-task-calendar-remote-mcp
   ```

## Step 3: Configure Environment Variables

1. **Copy environment template**:
   ```bash
   cp .env.example .env
   ```

2. **Generate session secret**:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

3. **Edit .env file**:
   ```bash
   nano .env
   ```

4. **Update key values**:
   ```bash
   # Google API Credentials (from your working local server)
   GOOGLE_CLIENT_ID=your_actual_google_client_id
   GOOGLE_CLIENT_SECRET=your_actual_google_client_secret
   GOOGLE_REFRESH_TOKEN=your_actual_google_refresh_token
   
   # Generated session secret
   SESSION_SECRET=your_generated_32_character_secret
   
   # Production settings
   NODE_ENV=production
   OAUTH_ISSUER=https://task.wandermusings.com
   ALLOWED_ORIGINS=https://claude.ai
   PORT=3001
   LOG_LEVEL=info
   ```

## Step 4: Setup Cloudflare Tunnel

1. **Create Cloudflare Tunnel** with subdomain `task`
2. **Configure Public Hostname**:
   - **Subdomain**: `task`
   - **Domain**: `wandermusings.com`
   - **Service Type**: `HTTP`
   - **URL**: `localhost:3001`
   - **Path**: (leave empty)

## Step 5: Fix Docker Compose Configuration

1. **Edit docker-compose.yml**:
   ```bash
   nano docker-compose.yml
   ```

2. **Use this corrected configuration** (remove conflicting environment variables and health check):
   ```yaml
   version: '3.8'
   
   services:
     google-task-calendar-remote:
       build:
         context: .
         dockerfile: Dockerfile
       container_name: google-task-calendar-remote
       restart: unless-stopped
       ports:
         - "3001:3001"
       env_file:
         - .env
       volumes:
         - ./logs:/app/logs
       networks:
         - mcp-network
   
   networks:
     mcp-network:
       driver: bridge
   ```

   **Key changes**:
   - **Removed `environment:` section** - prevents override of .env file values
   - **Removed health check** - use Dockerfile's built-in health check instead
   - **Clean configuration** - only uses .env file for all variables

## Step 6: Deploy via Synology Container Manager

1. **Open Container Manager** in DSM
2. **Go to Project tab** → **Create**
3. **General Settings**:
   - **Project name**: `google-task-calendar-remote-mcp`
   - **Path**: `/volume4/docker/configs/google-task-calendar-remote-mcp`
   - **Source**: `Upload docker-compose.yml`
4. **Browse and select** your `docker-compose.yml` file
5. **Click Next** → **Done**

## Step 7: Verify Deployment

1. **Check Container Manager logs** for successful startup messages:
   - ✅ Server running on port 3001
   - ✅ All 10 Google API tools available
   - ✅ OAuth issuer configured
   - ✅ Health check passing

2. **Test public endpoints**:
   ```bash
   curl https://task.wandermusings.com/health
   curl https://task.wandermusings.com/.well-known/mcp
   curl https://task.wandermusings.com/.well-known/oauth-authorization-server
   ```

## Step 8: Claude AI Integration

Your MCP server is now ready at: `https://task.wandermusings.com`

**Available for integration with:**
- Claude AI (primary)
- Other AI agents (by adding their domains to `ALLOWED_ORIGINS`)

**Key endpoints:**
- **Discovery**: `https://task.wandermusings.com/.well-known/mcp`
- **OAuth**: `https://task.wandermusings.com/.well-known/oauth-authorization-server`
- **SSE Transport**: `https://task.wandermusings.com/sse`

## Summary

Your Google Task Calendar Remote MCP Server is successfully deployed with:
- ✅ 10 Google API tools (5 Tasks + 5 Calendar)
- ✅ OAuth 2.1 authentication with PKCE
- ✅ SSE transport for real-time communication
- ✅ Production-ready Docker deployment
- ✅ Cloudflare Tunnel for secure public access
- ✅ Multi-AI agent support capability

## Troubleshooting

### Common Issues

1. **Container won't start**: Check `.env` file has all required values
2. **Health check fails**: Verify port 3001 is accessible inside container
3. **OAuth errors**: Ensure `OAUTH_ISSUER` matches your Cloudflare tunnel URL
4. **CORS errors**: Add AI agent domains to `ALLOWED_ORIGINS`

### Maintenance

- **Update deployment**: `git pull` in NAS directory, rebuild container
- **View logs**: Use Container Manager log viewer
- **Monitor health**: Check `/health` endpoint regularly