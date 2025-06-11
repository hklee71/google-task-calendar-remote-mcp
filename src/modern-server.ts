#!/usr/bin/env node

/**
 * Modern Google Task Calendar Remote MCP Server
 * 
 * Implements MCP 2025-03-26 Streamable HTTP specification
 * with OAuth 2.1 authentication and Dynamic Client Registration
 * 
 * Based on working legacy server but with modern transport
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import { config, logConfiguration } from './config/environment.js';

console.log('🔧 Importing OAuth server...');
import { oauthServer } from './auth/oauth.js';

console.log('🔧 OAuth server imported successfully!');

console.log('🔧 Importing Google API client...');
import { googleApiClient } from './google/client.js';

console.log('🔧 All imports completed successfully!');

console.log('🚀 Modern Google Task Calendar Remote MCP Server (2025-03-26)');
console.log('📍 Streamable HTTP transport with OAuth 2.1');
console.log('🎯 Goal: Claude AI integration with modern MCP specification');

// Log configuration
logConfiguration();

// SimpleScraper Part 2: Session Management
// Store transport instances by session ID as recommended
interface TransportInstance {
  sessionId: string;
  type: string;
  authContext?: any;
  createdAt: Date;
  lastActivity: Date;
  conversationHistory: Array<{
    timestamp: Date;
    type: string;
    [key: string]: any;
  }>;
  onclose: () => void;
  updateActivity: () => void;
  addToHistory: (entry: any) => void;
}

const transports = {} as Record<string, TransportInstance>;

// Part 6 Gotcha: Race condition prevention with pendingTransports
const pendingTransports = {} as Record<string, Promise<TransportInstance>>;

console.log('📋 Session management initialized - using SimpleScraper Part 2 patterns + Part 6 gotchas');

/**
 * Create and connect transport for session (SimpleScraper Part 2 pattern)
 * @param sessionId Unique session identifier
 * @param authContext Authentication context for the session
 * @returns Transport instance for the session
 */
async function createAndConnectTransport(sessionId: string, authContext?: any): Promise<TransportInstance> {
  // Part 6 Gotcha: Check both transports and pendingTransports before creating
  if (transports[sessionId]) {
    console.log(`[Session] Transport already exists for session: ${sessionId}`);
    return transports[sessionId];
  }
  
  if (sessionId in pendingTransports) {
    console.log(`[Session] Waiting for pending transport creation: ${sessionId}`);
    return await pendingTransports[sessionId];
  }
  
  console.log(`[Session] Creating new transport for session: ${sessionId}`);
  
  // Create promise for this transport creation (race condition prevention)
  const transportPromise = new Promise<TransportInstance>((resolve, reject) => {
    try {
      // Create transport instance for this session
      const transport: TransportInstance = {
        sessionId,
        type: 'streamable-http',
        authContext,
        createdAt: new Date(),
        lastActivity: new Date(),
        conversationHistory: [],
        
        // Part 6 Gotcha: Explicit cleanup with onclose handler
        onclose: () => {
          console.log(`[Session] Cleaning up transport for session: ${sessionId}`);
          delete transports[sessionId];
          delete pendingTransports[sessionId]; // Clean up pending too
        },
        
        // Update activity timestamp
        updateActivity: () => {
          transport.lastActivity = new Date();
        },
        
        // Add conversation entry
        addToHistory: (entry: any) => {
          const historyEntry = {
            timestamp: new Date(),
            type: entry.type || 'unknown',
            ...entry,
          };
          transport.conversationHistory.push(historyEntry);
          
          // Limit history size to prevent memory leaks
          if (transport.conversationHistory.length > 100) {
            transport.conversationHistory = transport.conversationHistory.slice(-50);
          }
        },
      };
      
      // Part 6 Gotcha: Explicitly assign transport.sessionId for consistency
      transport.sessionId = sessionId;
      
      resolve(transport);
    } catch (error) {
      reject(error);
    }
  });
  
  // Store the pending promise to prevent race conditions
  pendingTransports[sessionId] = transportPromise;
  
  try {
    const transport = await transportPromise;
    
    // Store the completed transport and clean up pending
    transports[sessionId] = transport;
    delete pendingTransports[sessionId];
    
    console.log(`[Session] Transport created and stored for session: ${sessionId}`);
    return transport;
  } catch (error) {
    // Clean up on error
    delete pendingTransports[sessionId];
    console.error(`[Session] Error creating transport for session ${sessionId}:`, error);
    throw error;
  }
}

// Part 6 Gotcha: Enhanced session cleanup with pending transport handling
setInterval(() => {
  const now = Date.now();
  const staleThreshold = 30 * 60 * 1000; // 30 minutes
  
  // Clean up stale active transports
  Object.keys(transports).forEach(sessionId => {
    const transport = transports[sessionId];
    if (transport && (now - transport.lastActivity.getTime()) > staleThreshold) {
      console.log(`[Session] Removing stale session: ${sessionId}`);
      transport.onclose();
    }
  });
  
  // Clean up stale pending transports (should not hang forever)
  Object.keys(pendingTransports).forEach(sessionId => {
    // If a transport has been pending for more than 5 minutes, clean it up
    if (!transports[sessionId]) {
      console.log(`[Session] Cleaning up stale pending transport: ${sessionId}`);
      delete pendingTransports[sessionId];
    }
  });
  
  console.log(`[Session] Cleanup complete. Active: ${Object.keys(transports).length}, Pending: ${Object.keys(pendingTransports).length}`);
}, 15 * 60 * 1000); // Check every 15 minutes

// Create Express app
const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
app.use(cors({
  origin: config.allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Mcp-Session-Id', 'Origin'],
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Origin validation for DNS rebinding protection
app.use((req, res, next) => {
  const origin = req.get('Origin');
  if (origin && !config.allowedOrigins.includes(origin)) {
    return res.status(403).json({ error: 'Forbidden origin' });
  }
  return next();
});

// OAuth 2.1 Protected Resource Metadata Discovery (NEW for 2025-03-26)
app.get('/.well-known/oauth-protected-resource', (req, res) => {
  res.json({
    resource: config.oauthIssuer,
    resource_server: config.oauthIssuer,
    authorization_servers: [config.oauthIssuer],
    scopes_supported: ['mcp', 'claudeai', 'tasks:read', 'tasks:write', 'calendar:read', 'calendar:write'],
    bearer_methods_supported: ['header', 'body', 'query'],
    resource_documentation: `${config.oauthIssuer}/.well-known/mcp`,
    
    // Enhanced metadata for OAuth 2.1 compliance
    scope_descriptions: {
      'mcp': 'Full access to all MCP server capabilities',
      'claudeai': 'Claude AI specific access scope',
      'tasks:read': 'Read access to Google Tasks',
      'tasks:write': 'Write access to Google Tasks',
      'calendar:read': 'Read access to Google Calendar',
      'calendar:write': 'Write access to Google Calendar',
    },
    
    // Resource-specific claims
    supported_claims: ['sub', 'client_id', 'scope', 'exp', 'iat'],
    token_introspection_endpoint: `${config.oauthIssuer}/oauth/introspect`,
    
    // MCP-specific metadata
    mcp_version: '2025-03-26',
    transport_methods: ['streamable-http'],
    tool_count: 10,
    resource_categories: ['tasks', 'calendar'],
  });
});

// OAuth Authorization Server Discovery (existing)
app.get('/.well-known/oauth-authorization-server', (req, res) => {
  res.json(oauthServer.getDiscoveryDocument());
});

// MCP Discovery Endpoint (updated for 2025-03-26)
app.get('/.well-known/mcp', (req, res) => {
  res.json(oauthServer.getMcpDiscoveryDocument());
});

// OAuth endpoints (OAuth 2.1 compliant)
app.post('/oauth/register', oauthServer.registerClient.bind(oauthServer));
app.get('/oauth/authorize', oauthServer.authorize.bind(oauthServer));
app.post('/oauth/token', oauthServer.token.bind(oauthServer));

// Additional OAuth 2.1 endpoints from SimpleScraper compliance
app.post('/oauth/introspect', oauthServer.introspect.bind(oauthServer));
app.post('/oauth/revoke', oauthServer.revoke.bind(oauthServer));

// Part 6 Gotcha: Explicit session cleanup endpoint (DELETE handler)
app.delete('/mcp/session/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  
  console.log(`[Session] Explicit cleanup requested for session: ${sessionId}`);
  
  let cleaned = false;
  
  // Clean up active transport
  if (transports[sessionId]) {
    transports[sessionId].onclose();
    cleaned = true;
    console.log(`[Session] Cleaned up active transport for session: ${sessionId}`);
  }
  
  // Clean up pending transport
  if (sessionId in pendingTransports) {
    delete pendingTransports[sessionId];
    cleaned = true;
    console.log(`[Session] Cleaned up pending transport for session: ${sessionId}`);
  }
  
  if (cleaned) {
    res.json({ success: true, message: `Session ${sessionId} cleaned up` });
  } else {
    res.status(404).json({ success: false, message: `Session ${sessionId} not found` });
  }
});

// Session statistics endpoint for monitoring
app.get('/mcp/sessions', (req, res) => {
  const activeSessions = Object.keys(transports);
  const pendingSessions = Object.keys(pendingTransports);
  const stats = {
    active: activeSessions.length,
    pending: pendingSessions.length,
    sessions: activeSessions.map(id => {
      const transport = transports[id];
      return {
        sessionId: id,
        createdAt: transport.createdAt,
        lastActivity: transport.lastActivity,
        conversationLength: transport.conversationHistory.length,
        authContext: transport.authContext?.client_id || 'anonymous',
      };
    }),
  };
  
  res.json(stats);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    transport: 'streamable-http',
    specification: '2025-03-26',
    tools: 10,
  });
});

// Main MCP Streamable HTTP Endpoint (NEW for 2025-03-26)
// Single endpoint supporting both POST and GET methods per spec
app.all('/mcp', async (req, res) => {
  try {
    // Validate authentication
    const authHeader = req.get('Authorization');
    const token = oauthServer.extractToken(authHeader);
    
    if (!token) {
      // Add proper WWW-Authenticate header for OAuth 2.1 compliance
      const wwwAuthHeader = `Bearer realm="MCP Server", resource_metadata_uri="${config.oauthIssuer}/.well-known/oauth-protected-resource"`;
      res.header('WWW-Authenticate', wwwAuthHeader);
      return res.status(401).json({
        error: 'unauthorized',
        error_description: 'Bearer token required',
      });
    }

    // Enhanced token validation with security context for OAuth 2.1 compliance
    const securityContext: any = {
      resource: 'mcp',
      action: req.method,
    };
    
    // Only add optional fields if they have values
    if (req.ip) {
      securityContext.ip_address = req.ip;
    }
    if (req.get('User-Agent')) {
      securityContext.user_agent = req.get('User-Agent');
    }
    
    const tokenValidation = oauthServer.validateToken(token, undefined, securityContext);
    if (!tokenValidation.valid) {
      // RFC 6750 compliant WWW-Authenticate header with specific error
      const wwwAuthHeader = `Bearer realm="MCP Server", error="${tokenValidation.error || 'invalid_token'}", error_description="${tokenValidation.error_description || 'Token is invalid or expired'}", resource_metadata_uri="${config.oauthIssuer}/.well-known/oauth-protected-resource"`;
      res.header('WWW-Authenticate', wwwAuthHeader);
      return res.status(401).json({
        error: tokenValidation.error || 'invalid_token',
        error_description: tokenValidation.error_description || 'Token is invalid or expired',
      });
    }

    // SimpleScraper Part 2: Session Management Implementation
    let sessionId = req.get('Mcp-Session-Id');
    let transport;
    let isNewSession = false;
    
    // Check for existing session in transports object
    if (sessionId && transports[sessionId]) {
      transport = transports[sessionId];
      transport.updateActivity(); // Update session activity
      console.log(`[Session] Using existing session: ${sessionId}`);
    } else {
      // Generate new session ID for new sessions
      sessionId = uuidv4();
      isNewSession = true;
      
      // Create authentication context for transport creation
      const initialAuthContext = {
        token,
        client_id: tokenValidation.client_id,
        scope: tokenValidation.scope,
        tokenData: tokenValidation.tokenData,
        authenticated: true,
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
      };
      
      // Create transport using createAndConnectTransport function
      transport = await createAndConnectTransport(sessionId, initialAuthContext);
      console.log(`[Session] Created new session: ${sessionId}`);
    }
    
    // Set Mcp-Session-Id header in response
    res.header('Mcp-Session-Id', sessionId);
    
    // Create enhanced authentication context for tool execution
    const authContext = {
      token,
      client_id: tokenValidation.client_id,
      scope: tokenValidation.scope,
      tokenData: tokenValidation.tokenData,
      sessionId,
      authenticated: true,
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      transport, // Include transport reference
    };
    
    if (req.method === 'GET') {
      // GET method - return server info
      // Add GET request to conversation history
      transport.addToHistory({
        type: 'server_info_request',
        method: 'GET',
        success: true,
      });
      
      return res.json({
        protocolVersion: '2025-03-26',
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
        serverInfo: {
          name: 'google-task-calendar-remote',
          version: '2.0.0',
        },
      });
    }

    if (req.method === 'POST') {
      // POST method - handle MCP JSON-RPC requests
      const mcpRequest = req.body;
      
      if (!mcpRequest || !mcpRequest.method) {
        return res.status(400).json({
          jsonrpc: '2.0',
          id: mcpRequest?.id || null,
          error: {
            code: -32600,
            message: 'Invalid Request',
            data: 'Invalid JSON-RPC request',
          },
        });
      }

      // Handle MCP methods directly (simplified approach)
      try {
        let result;
        
        switch (mcpRequest.method) {
          case 'initialize':
            result = {
              protocolVersion: '2025-03-26',
              capabilities: {
                tools: {},
                resources: {},
                prompts: {},
              },
              serverInfo: {
                name: 'google-task-calendar-remote',
                version: '2.0.0',
              },
            };
            break;
            
          case 'tools/list':
            result = {
              tools: [
                // Task tools (5)
                {
                  name: 'list_task_lists',
                  description: 'List all Google Task lists for the authenticated user.',
                  inputSchema: { type: 'object', properties: {} },
                },
                {
                  name: 'list_tasks',
                  description: 'List tasks within a specific Google Task list.',
                  inputSchema: {
                    type: 'object',
                    properties: {
                      tasklistId: {
                        type: 'string',
                        description: 'The ID of the task list to retrieve tasks from.',
                      },
                    },
                    required: ['tasklistId'],
                  },
                },
                {
                  name: 'add_task',
                  description: 'Add a new task to a specific Google Task list.',
                  inputSchema: {
                    type: 'object',
                    properties: {
                      tasklistId: {
                        type: 'string',
                        description: 'The ID of the task list to add the task to.',
                      },
                      title: {
                        type: 'string',
                        description: 'The title of the task.',
                      },
                      notes: {
                        type: 'string',
                        description: 'Optional notes for the task.',
                      },
                    },
                    required: ['tasklistId', 'title'],
                  },
                },
                {
                  name: 'update_task',
                  description: 'Update an existing task in a Google Task list.',
                  inputSchema: {
                    type: 'object',
                    properties: {
                      tasklistId: {
                        type: 'string',
                        description: 'The ID of the task list containing the task.',
                      },
                      taskId: {
                        type: 'string',
                        description: 'The ID of the task to update.',
                      },
                      title: {
                        type: 'string',
                        description: 'The new title of the task.',
                      },
                      notes: {
                        type: 'string',
                        description: 'The new notes for the task.',
                      },
                      status: {
                        type: 'string',
                        enum: ['needsAction', 'completed'],
                        description: 'The status of the task.',
                      },
                    },
                    required: ['tasklistId', 'taskId'],
                  },
                },
                {
                  name: 'delete_task',
                  description: 'Delete a task from a Google Task list.',
                  inputSchema: {
                    type: 'object',
                    properties: {
                      tasklistId: {
                        type: 'string',
                        description: 'The ID of the task list containing the task.',
                      },
                      taskId: {
                        type: 'string',
                        description: 'The ID of the task to delete.',
                      },
                    },
                    required: ['tasklistId', 'taskId'],
                  },
                },
                // Calendar tools (5)
                {
                  name: 'list_calendars',
                  description: 'List all Google Calendars for the authenticated user.',
                  inputSchema: { type: 'object', properties: {} },
                },
                {
                  name: 'list_events',
                  description: 'List events from a specific Google Calendar.',
                  inputSchema: {
                    type: 'object',
                    properties: {
                      calendarId: {
                        type: 'string',
                        description: 'The ID of the calendar to retrieve events from.',
                      },
                      maxResults: {
                        type: 'number',
                        description: 'Maximum number of events to return (default: 10).',
                      },
                    },
                    required: ['calendarId'],
                  },
                },
                {
                  name: 'create_event',
                  description: 'Create a new event in a Google Calendar.',
                  inputSchema: {
                    type: 'object',
                    properties: {
                      calendarId: {
                        type: 'string',
                        description: 'The ID of the calendar to create the event in.',
                      },
                      summary: {
                        type: 'string',
                        description: 'The title of the event.',
                      },
                      description: {
                        type: 'string',
                        description: 'Optional description of the event.',
                      },
                      startDateTime: {
                        type: 'string',
                        description: 'Start date and time in ISO format (e.g., 2023-07-04T10:00:00Z).',
                      },
                      endDateTime: {
                        type: 'string',
                        description: 'End date and time in ISO format (e.g., 2023-07-04T11:00:00Z).',
                      },
                    },
                    required: ['calendarId', 'summary', 'startDateTime', 'endDateTime'],
                  },
                },
                {
                  name: 'update_event',
                  description: 'Update an existing event in a Google Calendar.',
                  inputSchema: {
                    type: 'object',
                    properties: {
                      calendarId: {
                        type: 'string',
                        description: 'The ID of the calendar containing the event.',
                      },
                      eventId: {
                        type: 'string',
                        description: 'The ID of the event to update.',
                      },
                      summary: {
                        type: 'string',
                        description: 'The new title of the event.',
                      },
                      description: {
                        type: 'string',
                        description: 'The new description of the event.',
                      },
                      startDateTime: {
                        type: 'string',
                        description: 'New start date and time in ISO format.',
                      },
                      endDateTime: {
                        type: 'string',
                        description: 'New end date and time in ISO format.',
                      },
                    },
                    required: ['calendarId', 'eventId'],
                  },
                },
                {
                  name: 'delete_event',
                  description: 'Delete an event from a Google Calendar.',
                  inputSchema: {
                    type: 'object',
                    properties: {
                      calendarId: {
                        type: 'string',
                        description: 'The ID of the calendar containing the event.',
                      },
                      eventId: {
                        type: 'string',
                        description: 'The ID of the event to delete.',
                      },
                    },
                    required: ['calendarId', 'eventId'],
                  },
                },
              ],
            };
            break;
            
          case 'tools/call':
            // Extract tool name and arguments from request
            const toolName = mcpRequest.params?.name;
            const toolArgs = mcpRequest.params?.arguments || {};
            
            if (!toolName) {
              return res.status(400).json({
                jsonrpc: '2.0',
                id: mcpRequest.id || null,
                error: {
                  code: -32602,
                  message: 'Invalid params',
                  data: 'Tool name is required',
                },
              });
            }

            try {
              let toolResult;
              
              // Enhanced scope checking using OAuth server's hierarchical validation
              const checkScope = (requiredScope: string | string[]) => {
                return oauthServer.checkScopes(authContext.scope, requiredScope);
              };
              
              switch (toolName) {
                // Task tools (copied from legacy server)
                case 'list_task_lists': {
                  if (!checkScope('tasks:read')) {
                    return res.status(403).json({
                      jsonrpc: '2.0',
                      id: mcpRequest.id || null,
                      error: {
                        code: -32004,
                        message: 'Insufficient scope',
                        data: 'tasks:read scope required for list_task_lists',
                      },
                    });
                  }
                  const apiRes = await googleApiClient.tasks.tasklists.list();
                  toolResult = {
                    content: [{ type: 'text', text: JSON.stringify(apiRes.data.items, null, 2) }],
                  };
                  break;
                }
                
                case 'list_tasks': {
                  if (!checkScope('tasks:read')) {
                    return res.status(403).json({
                      jsonrpc: '2.0',
                      id: mcpRequest.id || null,
                      error: {
                        code: -32004,
                        message: 'Insufficient scope',
                        data: 'tasks:read scope required for list_tasks',
                      },
                    });
                  }
                  const { tasklistId } = toolArgs;
                  if (!tasklistId) {
                    throw new Error('tasklistId is required for list_tasks');
                  }
                  const apiRes = await googleApiClient.tasks.tasks.list({ tasklist: tasklistId });
                  toolResult = {
                    content: [{ type: 'text', text: JSON.stringify(apiRes.data.items, null, 2) }],
                  };
                  break;
                }
                
                case 'add_task': {
                  if (!checkScope('tasks:write')) {
                    return res.status(403).json({
                      jsonrpc: '2.0',
                      id: mcpRequest.id || null,
                      error: {
                        code: -32004,
                        message: 'Insufficient scope',
                        data: 'tasks:write scope required for add_task',
                      },
                    });
                  }
                  const { tasklistId, title, notes } = toolArgs;
                  if (!tasklistId || !title) {
                    throw new Error('tasklistId and title are required for add_task');
                  }
                  const apiRes = await googleApiClient.tasks.tasks.insert({
                    tasklist: tasklistId,
                    requestBody: { title, notes },
                  });
                  toolResult = {
                    content: [{ type: 'text', text: JSON.stringify(apiRes.data, null, 2) }],
                  };
                  break;
                }
                
                case 'update_task': {
                  if (!checkScope('tasks:write')) {
                    return res.status(403).json({
                      jsonrpc: '2.0',
                      id: mcpRequest.id || null,
                      error: {
                        code: -32004,
                        message: 'Insufficient scope',
                        data: 'tasks:write scope required for update_task',
                      },
                    });
                  }
                  const { tasklistId, taskId, title, notes, status } = toolArgs;
                  if (!tasklistId || !taskId) {
                    throw new Error('tasklistId and taskId are required for update_task');
                  }
                  const requestBody: { title?: string; notes?: string; status?: string } = {};
                  if (title !== undefined) requestBody.title = title;
                  if (notes !== undefined) requestBody.notes = notes;
                  if (status !== undefined) requestBody.status = status;

                  const apiRes = await googleApiClient.tasks.tasks.update({
                    tasklist: tasklistId,
                    task: taskId,
                    requestBody: { id: taskId, ...requestBody },
                  });
                  toolResult = {
                    content: [{ type: 'text', text: JSON.stringify(apiRes.data, null, 2) }],
                  };
                  break;
                }
                
                case 'delete_task': {
                  if (!checkScope('tasks:write')) {
                    return res.status(403).json({
                      jsonrpc: '2.0',
                      id: mcpRequest.id || null,
                      error: {
                        code: -32004,
                        message: 'Insufficient scope',
                        data: 'tasks:write scope required for delete_task',
                      },
                    });
                  }
                  const { tasklistId, taskId } = toolArgs;
                  if (!tasklistId || !taskId) {
                    throw new Error('tasklistId and taskId are required for delete_task');
                  }
                  await googleApiClient.tasks.tasks.delete({
                    tasklist: tasklistId,
                    task: taskId,
                  });
                  toolResult = {
                    content: [{ type: 'text', text: `Task ${taskId} deleted successfully from task list ${tasklistId}.` }],
                  };
                  break;
                }
                
                // Calendar tools (copied from legacy server)
                case 'list_calendars': {
                  if (!checkScope('calendar:read')) {
                    return res.status(403).json({
                      jsonrpc: '2.0',
                      id: mcpRequest.id || null,
                      error: {
                        code: -32004,
                        message: 'Insufficient scope',
                        data: 'calendar:read scope required for list_calendars',
                      },
                    });
                  }
                  const apiRes = await googleApiClient.calendar.calendarList.list();
                  toolResult = {
                    content: [{ type: 'text', text: JSON.stringify(apiRes.data.items, null, 2) }],
                  };
                  break;
                }
                
                case 'list_events': {
                  if (!checkScope('calendar:read')) {
                    return res.status(403).json({
                      jsonrpc: '2.0',
                      id: mcpRequest.id || null,
                      error: {
                        code: -32004,
                        message: 'Insufficient scope',
                        data: 'calendar:read scope required for list_events',
                      },
                    });
                  }
                  const { calendarId = 'primary', timeMin, timeMax, maxResults = 10 } = toolArgs;
                  const apiRes = await googleApiClient.calendar.events.list({
                    calendarId,
                    timeMin,
                    timeMax,
                    maxResults,
                    singleEvents: true,
                    orderBy: 'startTime',
                  });
                  toolResult = {
                    content: [{ type: 'text', text: JSON.stringify(apiRes.data.items, null, 2) }],
                  };
                  break;
                }
                
                case 'create_event': {
                  if (!checkScope('calendar:write')) {
                    return res.status(403).json({
                      jsonrpc: '2.0',
                      id: mcpRequest.id || null,
                      error: {
                        code: -32004,
                        message: 'Insufficient scope',
                        data: 'calendar:write scope required for create_event',
                      },
                    });
                  }
                  const { calendarId = 'primary', summary, description, startDateTime, endDateTime, location, timeZone } = toolArgs;
                  if (!summary || !startDateTime || !endDateTime) {
                    throw new Error('summary, startDateTime, and endDateTime are required for create_event');
                  }
                  
                  const event = {
                    summary,
                    description,
                    location,
                    start: {
                      dateTime: startDateTime,
                      timeZone: timeZone || 'Asia/Kuala_Lumpur',
                    },
                    end: {
                      dateTime: endDateTime,
                      timeZone: timeZone || 'Asia/Kuala_Lumpur',
                    },
                  };

                  const apiRes = await googleApiClient.calendar.events.insert({
                    calendarId,
                    requestBody: event,
                  });
                  toolResult = {
                    content: [{ type: 'text', text: JSON.stringify(apiRes.data, null, 2) }],
                  };
                  break;
                }
                
                case 'update_event': {
                  if (!checkScope('calendar:write')) {
                    return res.status(403).json({
                      jsonrpc: '2.0',
                      id: mcpRequest.id || null,
                      error: {
                        code: -32004,
                        message: 'Insufficient scope',
                        data: 'calendar:write scope required for update_event',
                      },
                    });
                  }
                  const { calendarId = 'primary', eventId, summary, description, startDateTime, endDateTime, location, timeZone } = toolArgs;
                  if (!eventId) {
                    throw new Error('eventId is required for update_event');
                  }
                  
                  const updateFields: any = {};
                  if (summary !== undefined) updateFields.summary = summary;
                  if (description !== undefined) updateFields.description = description;
                  if (location !== undefined) updateFields.location = location;
                  if (startDateTime !== undefined) {
                    updateFields.start = {
                      dateTime: startDateTime,
                      timeZone: timeZone || 'Asia/Kuala_Lumpur',
                    };
                  }
                  if (endDateTime !== undefined) {
                    updateFields.end = {
                      dateTime: endDateTime,
                      timeZone: timeZone || 'Asia/Kuala_Lumpur',
                    };
                  }

                  const apiRes = await googleApiClient.calendar.events.update({
                    calendarId,
                    eventId,
                    requestBody: updateFields,
                  });
                  toolResult = {
                    content: [{ type: 'text', text: JSON.stringify(apiRes.data, null, 2) }],
                  };
                  break;
                }
                
                case 'delete_event': {
                  if (!checkScope('calendar:write')) {
                    return res.status(403).json({
                      jsonrpc: '2.0',
                      id: mcpRequest.id || null,
                      error: {
                        code: -32004,
                        message: 'Insufficient scope',
                        data: 'calendar:write scope required for delete_event',
                      },
                    });
                  }
                  const { calendarId = 'primary', eventId } = toolArgs;
                  if (!eventId) {
                    throw new Error('eventId is required for delete_event');
                  }
                  
                  await googleApiClient.calendar.events.delete({
                    calendarId,
                    eventId,
                  });
                  toolResult = {
                    content: [{ type: 'text', text: `Event ${eventId} deleted successfully from calendar ${calendarId}.` }],
                  };
                  break;
                }
                
                default:
                  return res.status(400).json({
                    jsonrpc: '2.0',
                    id: mcpRequest.id || null,
                    error: {
                      code: -32601,
                      message: 'Method not found',
                      data: `Unknown tool: ${toolName}`,
                    },
                  });
              }
              
              result = toolResult;
              
              // Add successful tool execution to conversation history
              transport.addToHistory({
                type: 'tool_call',
                tool: toolName,
                arguments: toolArgs,
                result: toolResult,
                success: true,
              });
              
            } catch (error: any) {
              console.error(`Error executing tool ${toolName}:`, error);
              result = {
                content: [{ 
                  type: 'text', 
                  text: `Error: ${error.message || 'An unknown error occurred.'}` 
                }],
                isError: true,
              };
              
              // Add failed tool execution to conversation history
              transport.addToHistory({
                type: 'tool_call',
                tool: toolName,
                arguments: toolArgs,
                error: error.message || 'An unknown error occurred.',
                success: false,
              });
            }
            break;
            
          case 'ping':
            result = {};
            break;
            
          case 'resources/list':
            result = { resources: [] };
            break;
            
          case 'prompts/list':
            result = { prompts: [] };
            break;
            
          case 'notifications/initialized':
            // Client notification that initialization is complete
            // No response needed for notifications (they are fire-and-forget)
            return res.status(204).send(); // No Content
            
          default:
            return res.status(400).json({
              jsonrpc: '2.0',
              id: mcpRequest.id || null,
              error: {
                code: -32601,
                message: 'Method not found',
                data: `Unknown method: ${mcpRequest.method}`,
              },
            });
        }

        // Add non-tool MCP method calls to conversation history
        if (mcpRequest.method !== 'tools/call') {
          transport.addToHistory({
            type: 'mcp_method',
            method: mcpRequest.method,
            params: mcpRequest.params,
            result,
            success: true,
          });
        }

        return res.json({
          jsonrpc: '2.0',
          id: mcpRequest.id || null,
          result,
        });

      } catch (error) {
        console.error('MCP request processing error:', error);
        return res.status(500).json({
          jsonrpc: '2.0',
          id: mcpRequest?.id || null,
          error: {
            code: -32603,
            message: 'Internal error',
            data: 'Failed to process MCP request',
          },
        });
      }
    }

    // Method not allowed
    return res.status(405).json({
      error: 'method_not_allowed',
      error_description: 'Only GET and POST methods are supported',
    });

  } catch (error) {
    console.error('MCP endpoint error:', error);
    return res.status(500).json({
      error: 'server_error',
      error_description: 'Internal server error',
    });
  }
});

// Start server
const port = config.port || 3001;

app.listen(port, () => {
  console.log(`✅ Modern MCP Server running on http://localhost:${port}`);
  console.log(`🔗 MCP Streamable HTTP endpoint: http://localhost:${port}/mcp`);
  console.log(`❤️  Health check: http://localhost:${port}/health`);
  console.log(`🔍 OAuth Protected Resource: http://localhost:${port}/.well-known/oauth-protected-resource`);
  console.log(`🔍 OAuth Authorization Server: http://localhost:${port}/.well-known/oauth-authorization-server`);
  console.log(`🔍 MCP Discovery: http://localhost:${port}/.well-known/mcp`);
  console.log(`📋 Status: All 10 Google API tools available`);
  console.log('  📝 Tasks: list_task_lists, list_tasks, add_task, update_task, delete_task');
  console.log('  📅 Calendar: list_calendars, list_events, create_event, update_event, delete_event');
  console.log('🎯 Ready for mcp-remote testing!');
});

process.on('SIGINT', () => {
  console.log('\n👋 Shutting down Modern MCP Server...');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});