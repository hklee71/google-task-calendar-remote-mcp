#!/usr/bin/env node

/**
 * Google Task Calendar Remote MCP Server
 * 
 * NEW PROJECT - Remote MCP server based on local server implementation
 * Source: ../google-task-calendar/src/index.ts (DO NOT MODIFY ORIGINAL)
 * 
 * This server provides OAuth 2.1 authentication and SSE transport
 * for Claude AI integration while preserving all 10 Google API tools
 * from the original local server.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

// Import our Google API tools
import { googleTasksTools } from './tools/tasks.js';
import { googleCalendarTools } from './tools/calendar.js';
import { googleApiClient } from './google/client.js';

// Import OAuth 2.1 authentication
import { oauthServer } from './auth/oauth.js';

// Import configuration
import { config, logConfiguration } from './config/environment.js';

// Types for tool arguments
import {
  ListTasksArgs,
  AddTaskArgs,
  UpdateTaskArgs,
  DeleteTaskArgs,
  ListCalendarsArgs,
  ListEventsArgs,
  CreateEventArgs,
  UpdateEventArgs,
  DeleteEventArgs,
} from './types/interfaces.js';

console.log('🚀 Google Task Calendar Remote MCP Server');
console.log('📍 Project: NEW remote server (separate from local)');
console.log('📂 Local reference: ../google-task-calendar/ (READ ONLY)');
console.log('🎯 Goal: Claude AI integration with OAuth 2.1 + SSE transport');

// Log configuration
logConfiguration();

// Initialize Express app
const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.allowedOrigins,
  credentials: true,
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// OAuth 2.1 Discovery endpoints
app.get('/.well-known/oauth-authorization-server', (req, res) => {
  res.json(oauthServer.getDiscoveryDocument());
});

app.get('/.well-known/mcp', (req, res) => {
  res.json(oauthServer.getMcpDiscoveryDocument());
});

// OAuth 2.1 endpoints
app.post('/oauth/register', (req, res) => {
  oauthServer.registerClient(req, res);
});

app.get('/oauth/authorize', (req, res) => {
  oauthServer.authorize(req, res);
});

app.post('/oauth/token', (req, res) => {
  oauthServer.token(req, res);
});

// Initialize MCP Server with all 10 tools (copied exactly from local server)
const server = new Server(
  {
    name: 'google-task-calendar-remote',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define all 10 tools exactly as in local server
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
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
              description: 'The ID of the calendar to retrieve events from. Defaults to primary calendar.',
            },
            timeMin: {
              type: 'string',
              description: 'Lower bound (inclusive) for an event\'s end time to filter by (RFC3339 timestamp).',
            },
            timeMax: {
              type: 'string',
              description: 'Upper bound (exclusive) for an event\'s start time to filter by (RFC3339 timestamp).',
            },
            maxResults: {
              type: 'number',
              description: 'Maximum number of events returned. Default is 10.',
            },
          },
        },
      },
      {
        name: 'create_event',
        description: 'Create a new event in Google Calendar.',
        inputSchema: {
          type: 'object',
          properties: {
            calendarId: {
              type: 'string',
              description: 'The ID of the calendar to create the event in. Defaults to primary calendar.',
            },
            summary: {
              type: 'string',
              description: 'The title/summary of the event.',
            },
            description: {
              type: 'string',
              description: 'Description of the event.',
            },
            startDateTime: {
              type: 'string',
              description: 'Start date and time (RFC3339 format, e.g., "2025-06-10T09:30:00+08:00").',
            },
            endDateTime: {
              type: 'string',
              description: 'End date and time (RFC3339 format, e.g., "2025-06-10T10:30:00+08:00").',
            },
            location: {
              type: 'string',
              description: 'Location of the event.',
            },
            timeZone: {
              type: 'string',
              description: 'Time zone for the event (e.g., "Asia/Kuala_Lumpur").',
            },
          },
          required: ['summary', 'startDateTime', 'endDateTime'],
        },
      },
      {
        name: 'update_event',
        description: 'Update an existing event in Google Calendar.',
        inputSchema: {
          type: 'object',
          properties: {
            calendarId: {
              type: 'string',
              description: 'The ID of the calendar containing the event. Defaults to primary calendar.',
            },
            eventId: {
              type: 'string',
              description: 'The ID of the event to update.',
            },
            summary: {
              type: 'string',
              description: 'The new title/summary of the event.',
            },
            description: {
              type: 'string',
              description: 'New description of the event.',
            },
            startDateTime: {
              type: 'string',
              description: 'New start date and time (RFC3339 format).',
            },
            endDateTime: {
              type: 'string',
              description: 'New end date and time (RFC3339 format).',
            },
            location: {
              type: 'string',
              description: 'New location of the event.',
            },
            timeZone: {
              type: 'string',
              description: 'Time zone for the event.',
            },
          },
          required: ['eventId'],
        },
      },
      {
        name: 'delete_event',
        description: 'Delete an event from Google Calendar.',
        inputSchema: {
          type: 'object',
          properties: {
            calendarId: {
              type: 'string',
              description: 'The ID of the calendar containing the event. Defaults to primary calendar.',
            },
            eventId: {
              type: 'string',
              description: 'The ID of the event to delete.',
            },
          },
          required: ['eventId'],
        },
      },
    ],
  };
});

// Handle tool calls - route to appropriate tool implementation
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name } = request.params;
  
  try {
    switch (name) {
      // Task tool handlers
      case 'list_task_lists':
        return await googleTasksTools.listTaskLists();
      
      case 'list_tasks':
        if (!request.params.arguments) {
          throw new McpError(ErrorCode.InvalidParams, 'Missing arguments for list_tasks');
        }
        return await googleTasksTools.listTasks(request.params.arguments as unknown as ListTasksArgs);
      
      case 'add_task':
        if (!request.params.arguments) {
          throw new McpError(ErrorCode.InvalidParams, 'Missing arguments for add_task');
        }
        return await googleTasksTools.addTask(request.params.arguments as unknown as AddTaskArgs);
      
      case 'update_task':
        if (!request.params.arguments) {
          throw new McpError(ErrorCode.InvalidParams, 'Missing arguments for update_task');
        }
        return await googleTasksTools.updateTask(request.params.arguments as unknown as UpdateTaskArgs);
      
      case 'delete_task':
        if (!request.params.arguments) {
          throw new McpError(ErrorCode.InvalidParams, 'Missing arguments for delete_task');
        }
        return await googleTasksTools.deleteTask(request.params.arguments as unknown as DeleteTaskArgs);
      
      // Calendar tool handlers
      case 'list_calendars':
        return await googleCalendarTools.listCalendars({} as ListCalendarsArgs);
      
      case 'list_events':
        const listEventsArgs = (request.params.arguments || {}) as ListEventsArgs;
        return await googleCalendarTools.listEvents(listEventsArgs);
      
      case 'create_event':
        if (!request.params.arguments) {
          throw new McpError(ErrorCode.InvalidParams, 'Missing arguments for create_event');
        }
        return await googleCalendarTools.createEvent(request.params.arguments as unknown as CreateEventArgs);
      
      case 'update_event':
        if (!request.params.arguments) {
          throw new McpError(ErrorCode.InvalidParams, 'Missing arguments for update_event');
        }
        return await googleCalendarTools.updateEvent(request.params.arguments as unknown as UpdateEventArgs);
      
      case 'delete_event':
        if (!request.params.arguments) {
          throw new McpError(ErrorCode.InvalidParams, 'Missing arguments for delete_event');
        }
        return await googleCalendarTools.deleteEvent(request.params.arguments as unknown as DeleteEventArgs);
      
      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  } catch (error) {
    console.error(`Error executing tool ${name}:`, error);
    if (error instanceof McpError) {
      throw error;
    }
    throw new McpError(ErrorCode.InternalError, `Tool execution failed: ${error}`);
  }
});

// SSE endpoint for MCP transport with OAuth validation
app.get('/sse', (req, res) => {
  // Debug logging for Claude AI connection attempts
  if (config.logLevel === 'debug') {
    console.log('[DEBUG SSE] Connection attempt', {
      headers: req.headers,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
  }
  
  // Extract and validate OAuth token
  const token = oauthServer.extractToken(req.headers.authorization);
  if (!token) {
    console.log('[ERROR SSE] Missing authorization header');
    return res.status(401).json({
      error: 'unauthorized',
      error_description: 'Missing or invalid authorization header',
    });
  }

  const validation = oauthServer.validateToken(token);
  if (!validation.valid) {
    return res.status(401).json({
      error: 'invalid_token',
      error_description: 'Invalid or expired access token',
    });
  }

  // Initialize SSE transport
  const transport = new SSEServerTransport('/sse', res);
  server.connect(transport);
  
  console.log(`🔗 MCP client connected via SSE (client: ${validation.client_id})`);
  
  // Handle client disconnect
  req.on('close', () => {
    console.log(`🔌 MCP client disconnected (client: ${validation.client_id})`);
    transport.close();
  });
  
  // SSE connections remain open, no explicit return needed
  return;
});

// Start server
app.listen(config.port, () => {
  console.log(`✅ Server running on http://localhost:${config.port}`);
  console.log(`🔗 MCP SSE endpoint: http://localhost:${config.port}/sse`);
  console.log(`❤️  Health check: http://localhost:${config.port}/health`);
  console.log(`🔍 Discovery: http://localhost:${config.port}/.well-known/mcp`);
  console.log('📋 Status: All 10 Google API tools available');
  console.log('  📝 Tasks: list_task_lists, list_tasks, add_task, update_task, delete_task');
  console.log('  📅 Calendar: list_calendars, list_events, create_event, update_event, delete_event');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Shutting down server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🛑 Shutting down server...');
  process.exit(0);
});