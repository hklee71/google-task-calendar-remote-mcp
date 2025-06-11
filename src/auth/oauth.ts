/**
 * OAuth 2.1 Authentication Module
 * 
 * Implements OAuth 2.1 with PKCE for secure remote authentication
 * Required for Claude AI integration with the remote MCP server
 */

import crypto from 'crypto';
import { Request, Response } from 'express';
import { promises as fs } from 'fs';
import * as fsSync from 'fs';
import { config } from '../config/environment.js';

// Enhanced logging function
function debugLog(message: string, ...args: any[]) {
  if (config.logLevel === 'debug') {
    console.log(`[DEBUG OAuth] ${message}`, ...args);
  }
}

export interface OAuthClient {
  client_id: string;
  client_name: string;
  redirect_uris: string[];
  created_at: number;
}

export interface AuthorizationRequest {
  client_id: string;
  response_type: 'code';
  redirect_uri: string;
  scope?: string;
  state?: string;
  code_challenge: string;
  code_challenge_method: 'S256';
}

export interface TokenRequest {
  grant_type: 'authorization_code' | 'client_credentials';
  code?: string;
  redirect_uri?: string;
  client_id: string;
  code_verifier?: string;
  client_secret?: string;
}

export class OAuthServer {
  private clients: Map<string, OAuthClient> = new Map();
  private authCodes: Map<string, {
    client_id: string;
    redirect_uri: string;
    code_challenge: string;
    expires_at: number;
  }> = new Map();
  private tokens: Map<string, {
    client_id: string;
    expires_at: number;
    scope?: string;
    token_type: 'Bearer';
    granted_at: number;
    // Enhanced OAuth 2.1 fields
    sub?: string; // Subject identifier
    aud?: string; // Audience
    iat: number;  // Issued at timestamp
    jti: string;  // JWT ID (unique token identifier)
    grant_type: 'authorization_code' | 'client_credentials';
    // Security enhancements
    ip_address?: string;
    user_agent?: string;
    // OAuth 2.1 compliance
    refresh_count?: number;
    last_used?: number;
  }> = new Map();
  
  private readonly storageFile = './oauth_clients.json';
  private clientsLoaded = false;

  constructor() {
    debugLog('OAuthServer constructor started');
    debugLog(`Storage file path: ${this.storageFile}`);
    debugLog(`Current working directory: ${process.cwd()}`);
    
    // Don't load clients in constructor - load them on first use
    // This prevents hanging during server startup
    debugLog('OAuth server initialization completed - clients will be loaded on demand');
    
    // Clean up expired codes and tokens every 5 minutes
    setInterval(() => {
      this.cleanupExpired();
    }, 5 * 60 * 1000);
  }

  private async ensureClientsLoaded(): Promise<void> {
    if (this.clientsLoaded) {
      return;
    }
    
    debugLog('ensureClientsLoaded() called - loading clients for first time');
    try {
      debugLog(`Attempting to read file: ${this.storageFile}`);
      
      // Use synchronous file operations to avoid hanging
      if (fsSync.existsSync(this.storageFile)) {
        debugLog('File exists, reading synchronously');
        const data = fsSync.readFileSync(this.storageFile, 'utf8');
        debugLog(`File read successfully, data length: ${data.length}`);
        const clientsData = JSON.parse(data);
        debugLog(`Parsed JSON data:`, clientsData);
        this.clients = new Map(Object.entries(clientsData));
        debugLog(`Loaded ${this.clients.size} OAuth clients from storage`);
      } else {
        debugLog('Storage file does not exist - starting with empty clients');
      }
      this.clientsLoaded = true;
    } catch (error: any) {
      debugLog(`Error in ensureClientsLoaded():`, error);
      debugLog('Error loading clients:', error.message);
      // File doesn't exist, is invalid, or failed to read - start fresh
      this.clientsLoaded = true; // Mark as loaded even on error to prevent retry loops
    }
  }

  private async saveClients(): Promise<void> {
    try {
      const clientsData = Object.fromEntries(this.clients);
      await fs.writeFile(this.storageFile, JSON.stringify(clientsData, null, 2), 'utf8');
      debugLog(`Saved ${this.clients.size} OAuth clients to storage`);
    } catch (error: any) {
      debugLog('Error saving clients:', error.message);
    }
  }

  /**
   * OAuth 2.1 Discovery Endpoint
   * Returns server metadata for auto-discovery (RFC8414 compliant)
   */
  getDiscoveryDocument() {
    return {
      // Required fields per RFC8414
      issuer: config.oauthIssuer,
      authorization_endpoint: `${config.oauthIssuer}/oauth/authorize`,
      token_endpoint: `${config.oauthIssuer}/oauth/token`,
      
      // Optional but recommended fields
      registration_endpoint: `${config.oauthIssuer}/oauth/register`,
      jwks_uri: `${config.oauthIssuer}/.well-known/jwks.json`,
      scopes_supported: ['mcp', 'claudeai', 'tasks:read', 'tasks:write', 'calendar:read', 'calendar:write'],
      response_types_supported: ['code'],
      response_modes_supported: ['query'],
      grant_types_supported: ['authorization_code', 'client_credentials'],
      token_endpoint_auth_methods_supported: ['none', 'client_secret_post'],
      registration_endpoint_auth_methods_supported: ['none'],
      code_challenge_methods_supported: ['S256'],
      subject_types_supported: ['public'],
      
      // RFC8414 required metadata fields for OAuth 2.1 compliance
      token_endpoint_auth_signing_alg_values_supported: ['RS256', 'ES256'],
      display_values_supported: ['page'],
      claim_types_supported: ['normal'],
      claims_supported: ['sub', 'iss', 'aud', 'exp', 'iat', 'scope', 'client_id'],
      
      // Additional OAuth 2.1 / MCP specific fields
      revocation_endpoint: `${config.oauthIssuer}/oauth/revoke`,
      introspection_endpoint: `${config.oauthIssuer}/oauth/introspect`,
      service_documentation: `${config.oauthIssuer}/.well-known/mcp`,
      ui_locales_supported: ['en'],
      
      // MCP-specific extensions
      mcp_version: '2025-03-26',
      bearer_methods_supported: ['header', 'body', 'query'],
    };
  }

  /**
   * MCP Discovery Endpoint
   * Returns MCP-specific metadata for 2025-03-26 specification
   */
  getMcpDiscoveryDocument() {
    return {
      mcpVersion: '2025-03-26',
      protocolVersion: '2025-03-26',
      transport: {
        type: 'streamable-http',
        endpoint: '/mcp',
        methods: ['GET', 'POST'],
      },
      // Backward compatibility with legacy SSE transport
      legacyTransport: {
        type: 'sse',
        endpoint: '/sse',
      },
      authentication: {
        type: 'oauth2',
        authorizationEndpoint: '/oauth/authorize',
        tokenEndpoint: '/oauth/token',
        registrationEndpoint: '/oauth/register',
        scopes: ['mcp', 'claudeai'],
        protectedResourceMetadata: '/.well-known/oauth-protected-resource',
      },
      capabilities: {
        tools: {
          count: 10,
          categories: ['tasks', 'calendar'],
        },
        resources: {},
        prompts: {},
      },
    };
  }

  /**
   * Register a new OAuth client
   * Dynamic client registration per OAuth 2.1
   */
  async registerClient(req: Request, res: Response) {
    try {
      await this.ensureClientsLoaded();
      debugLog('Client registration attempt', { body: req.body, headers: req.headers });
      const { client_name, redirect_uris } = req.body;

      if (!client_name || !redirect_uris || !Array.isArray(redirect_uris)) {
        return res.status(400).json({
          error: 'invalid_request',
          error_description: 'client_name and redirect_uris are required',
        });
      }

      // Validate redirect URIs per MCP 2025-03-26 spec
      // Only allow HTTPS URLs or localhost URLs (including http://localhost)
      for (const uri of redirect_uris) {
        try {
          const url = new URL(uri);
          const isHttps = url.protocol === 'https:';
          const isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
          
          if (!isHttps && !isLocalhost) {
            return res.status(400).json({
              error: 'invalid_redirect_uri',
              error_description: `Redirect URI must be HTTPS or localhost: ${uri}`,
            });
          }
        } catch (error) {
          return res.status(400).json({
            error: 'invalid_redirect_uri',
            error_description: `Invalid redirect URI format: ${uri}`,
          });
        }
      }

      const client_id = crypto.randomBytes(16).toString('hex');
      const client: OAuthClient = {
        client_id,
        client_name,
        redirect_uris,
        created_at: Date.now(),
      };

      this.clients.set(client_id, client);
      
      // Save clients to persistent storage
      await this.saveClients();

      return res.json({
        client_id,
        client_name,
        redirect_uris,
        registration_client_uri: `/oauth/clients/${client_id}`,
      });
    } catch (error) {
      console.error('Client registration error:', error);
      return res.status(500).json({
        error: 'server_error',
        error_description: 'Internal server error',
      });
    }
  }

  /**
   * OAuth 2.1 Authorization Endpoint
   * Handles authorization requests with PKCE
   */
  async authorize(req: Request, res: Response) {
    try {
      await this.ensureClientsLoaded();
      debugLog('Authorization request', { query: req.query, headers: req.headers });
      const {
        client_id,
        response_type,
        redirect_uri,
        scope,
        state,
        code_challenge,
        code_challenge_method,
      } = req.query as any;

      // Validate required parameters
      if (!client_id || !response_type || !redirect_uri || !code_challenge || !code_challenge_method) {
        return res.status(400).json({
          error: 'invalid_request',
          error_description: 'Missing required parameters',
        });
      }

      if (response_type !== 'code') {
        return res.status(400).json({
          error: 'unsupported_response_type',
          error_description: 'Only authorization code flow is supported',
        });
      }

      if (code_challenge_method !== 'S256') {
        return res.status(400).json({
          error: 'invalid_request',
          error_description: 'Only S256 code challenge method is supported',
        });
      }

      // Validate client
      const client = this.clients.get(client_id);
      if (!client) {
        return res.status(400).json({
          error: 'invalid_client',
          error_description: 'Unknown client',
        });
      }

      // Validate redirect URI
      if (!client.redirect_uris.includes(redirect_uri)) {
        return res.status(400).json({
          error: 'invalid_redirect_uri',
          error_description: 'Redirect URI not registered for this client',
        });
      }

      // For simplicity in this demo, auto-approve the authorization
      // In production, this would show a consent screen
      const code = crypto.randomBytes(16).toString('hex');
      this.authCodes.set(code, {
        client_id,
        redirect_uri,
        code_challenge,
        expires_at: Date.now() + 10 * 60 * 1000, // 10 minutes
      });

      // Redirect back to client with authorization code
      const redirectUrl = new URL(redirect_uri);
      redirectUrl.searchParams.set('code', code);
      if (state) {
        redirectUrl.searchParams.set('state', state);
      }

      return res.redirect(redirectUrl.toString());
    } catch (error) {
      console.error('Authorization error:', error);
      return res.status(500).json({
        error: 'server_error',
        error_description: 'Internal server error',
      });
    }
  }

  /**
   * OAuth 2.1 Token Endpoint
   * Exchanges authorization code for access token with PKCE verification
   */
  async token(req: Request, res: Response) {
    try {
      await this.ensureClientsLoaded();
      debugLog('Token request', { 
        body: { 
          ...req.body, 
          client_secret: req.body.client_secret ? '[REDACTED]' : undefined,
          code_verifier: req.body.code_verifier ? '[REDACTED]' : undefined 
        }, 
        headers: req.headers 
      });
      const {
        grant_type,
        code,
        redirect_uri,
        client_id,
        code_verifier,
        client_secret,
      } = req.body;

      // Validate required parameters based on grant type
      if (!grant_type || !client_id) {
        debugLog('Token request validation failed', { 
          missing: { grant_type: !grant_type, client_id: !client_id },
          received: { grant_type, client_id }
        });
        return res.status(400).json({
          error: 'invalid_request',
          error_description: 'Missing required parameters: grant_type and client_id',
        });
      }

      if (grant_type !== 'authorization_code' && grant_type !== 'client_credentials') {
        return res.status(400).json({
          error: 'unsupported_grant_type',
          error_description: 'Supported grant types: authorization_code, client_credentials',
        });
      }

      // Handle Client Credentials grant type
      if (grant_type === 'client_credentials') {
        // Validate client exists
        const client = this.clients.get(client_id);
        if (!client) {
          return res.status(400).json({
            error: 'invalid_client',
            error_description: 'Unknown client',
          });
        }

        // Generate access token for client credentials flow
        const access_token = crypto.randomBytes(32).toString('hex');
        const scope = 'mcp tasks:read tasks:write calendar:read calendar:write';
        const now = Date.now();
        this.tokens.set(access_token, {
          client_id,
          expires_at: now + 60 * 60 * 1000, // 1 hour
          scope,
          token_type: 'Bearer' as const,
          granted_at: now,
          // Enhanced OAuth 2.1 fields
          iat: Math.floor(now / 1000), // Issued at (Unix timestamp)
          jti: crypto.randomBytes(16).toString('hex'), // Unique token ID
          grant_type: 'client_credentials' as const,
          sub: client_id, // Subject is the client ID
          aud: config.oauthIssuer, // Audience is this server
          refresh_count: 0,
          last_used: now,
        } as any);

        return res.json({
          access_token,
          token_type: 'Bearer',
          expires_in: 3600,
          scope,
        });
      }

      // Handle Authorization Code grant type (existing logic)
      if (!code || !redirect_uri || !code_verifier) {
        debugLog('Authorization code grant validation failed', {
          missing: { code: !code, redirect_uri: !redirect_uri, code_verifier: !code_verifier },
          received: { code: code ? '[PRESENT]' : undefined, redirect_uri, code_verifier: code_verifier ? '[PRESENT]' : undefined }
        });
        return res.status(400).json({
          error: 'invalid_request',
          error_description: 'Missing required parameters for authorization_code grant',
        });
      }

      // Validate authorization code
      const authCode = this.authCodes.get(code);
      if (!authCode) {
        debugLog('Authorization code validation failed', { 
          code: code ? '[PRESENT]' : 'MISSING',
          availableCodes: Array.from(this.authCodes.keys()).length
        });
        return res.status(400).json({
          error: 'invalid_grant',
          error_description: 'Invalid or expired authorization code',
        });
      }

      // Check expiration
      if (Date.now() > authCode.expires_at) {
        this.authCodes.delete(code);
        return res.status(400).json({
          error: 'invalid_grant',
          error_description: 'Authorization code expired',
        });
      }

      // Validate client and redirect URI
      if (authCode.client_id !== client_id || authCode.redirect_uri !== redirect_uri) {
        return res.status(400).json({
          error: 'invalid_grant',
          error_description: 'Client ID or redirect URI mismatch',
        });
      }

      // Verify PKCE code challenge with enhanced security
      if (!authCode.code_challenge) {
        debugLog('Missing code_challenge in stored auth code');
        return res.status(400).json({
          error: 'invalid_grant',
          error_description: 'Invalid authorization code - missing PKCE challenge',
        });
      }

      // Validate code_verifier format (43-128 characters, unreserved characters only)
      if (code_verifier.length < 43 || code_verifier.length > 128) {
        return res.status(400).json({
          error: 'invalid_request',
          error_description: 'code_verifier must be 43-128 characters long',
        });
      }

      if (!/^[A-Za-z0-9._~-]+$/.test(code_verifier)) {
        return res.status(400).json({
          error: 'invalid_request', 
          error_description: 'code_verifier contains invalid characters',
        });
      }

      // Calculate challenge from verifier using S256 method
      const challengeFromVerifier = crypto
        .createHash('sha256')
        .update(code_verifier)
        .digest('base64url');

      if (challengeFromVerifier !== authCode.code_challenge) {
        debugLog('PKCE verification failed', {
          expected: authCode.code_challenge,
          calculated: challengeFromVerifier,
          verifierLength: code_verifier.length
        });
        return res.status(400).json({
          error: 'invalid_grant',
          error_description: 'PKCE verification failed',
        });
      }

      debugLog('PKCE verification successful');

      // Generate access token
      const access_token = crypto.randomBytes(32).toString('hex');
      const scope = 'mcp tasks:read tasks:write calendar:read calendar:write';
      const now = Date.now();
      this.tokens.set(access_token, {
        client_id,
        expires_at: now + 60 * 60 * 1000, // 1 hour
        scope,
        token_type: 'Bearer' as const,
        granted_at: now,
        // Enhanced OAuth 2.1 fields
        iat: Math.floor(now / 1000), // Issued at (Unix timestamp)
        jti: crypto.randomBytes(16).toString('hex'), // Unique token ID
        grant_type: 'authorization_code' as const,
        sub: client_id, // Subject is the client ID for client flows
        aud: config.oauthIssuer, // Audience is this server
        refresh_count: 0,
        last_used: now,
      } as any);

      // Clean up used authorization code
      this.authCodes.delete(code);

      return res.json({
        access_token,
        token_type: 'Bearer',
        expires_in: 3600,
        scope,
      });
    } catch (error) {
      console.error('Token error:', error);
      return res.status(500).json({
        error: 'server_error',
        error_description: 'Internal server error',
      });
    }
  }

  /**
   * Enhanced OAuth 2.1 compliant token validation
   * Used by MCP endpoint to authenticate and authorize requests
   */
  validateToken(
    token: string, 
    requiredScope?: string | string[],
    context?: {
      ip_address?: string;
      user_agent?: string;
      resource?: string;
      action?: string;
    }
  ): {
    valid: boolean;
    client_id?: string;
    scope?: string;
    tokenData?: any;
    authContext?: any;
    error?: string;
    error_description?: string;
  } {
    debugLog('Token validation started', {
      tokenProvided: !!token,
      requiredScope,
      context
    });

    // Basic token presence validation
    if (!token || typeof token !== 'string') {
      debugLog('Token validation failed: missing or invalid token format');
      return { 
        valid: false, 
        error: 'invalid_token',
        error_description: 'Access token required'
      };
    }

    // Token format validation (should be hex string)
    if (!/^[a-f0-9]{64}$/i.test(token)) {
      debugLog('Token validation failed: invalid token format', {
        tokenLength: token.length,
        tokenFormat: typeof token,
        tokenSample: token.substring(0, 20) + '...',
        expectedFormat: '64 character hex string',
        actualCharacters: token.split('').map(c => c.charCodeAt(0)).slice(0, 10)
      });
      return { 
        valid: false, 
        error: 'invalid_token',
        error_description: 'Invalid token format'
      };
    }

    const tokenData = this.tokens.get(token);
    if (!tokenData) {
      debugLog('Token validation failed: token not found');
      return { 
        valid: false, 
        error: 'invalid_token',
        error_description: 'Token not found or expired'
      };
    }

    // Expiration validation
    const now = Date.now();
    if (now > tokenData.expires_at) {
      debugLog('Token validation failed: token expired', {
        expires_at: tokenData.expires_at,
        current_time: now
      });
      this.tokens.delete(token);
      return { 
        valid: false, 
        error: 'invalid_token',
        error_description: 'Access token expired'
      };
    }

    // Update last used timestamp
    tokenData.last_used = now;

    // Enhanced scope validation
    if (requiredScope) {
      const scopeValidation = this.validateScopes(tokenData.scope, requiredScope);
      if (!scopeValidation.valid) {
        debugLog('Token validation failed: insufficient scope', {
          granted: tokenData.scope,
          required: requiredScope,
          reason: scopeValidation.reason
        });
        return { 
          valid: false, 
          client_id: tokenData.client_id,
          error: 'insufficient_scope',
          error_description: `Required scope not granted: ${scopeValidation.reason}`
        };
      }
    }

    // Security context validation (if provided)
    if (context) {
      const securityValidation = this.validateSecurityContext(tokenData, context);
      if (!securityValidation.valid) {
        debugLog('Token validation failed: security context mismatch', {
          reason: securityValidation.reason
        });
        return {
          valid: false,
          client_id: tokenData.client_id,
          error: 'invalid_token',
          error_description: `Security validation failed: ${securityValidation.reason}`
        };
      }
    }

    // Create authentication context
    const authContext = this.createAuthContext(tokenData, context);

    debugLog('Token validation successful', {
      client_id: tokenData.client_id,
      scope: tokenData.scope,
      grant_type: tokenData.grant_type
    });

    return { 
      valid: true, 
      client_id: tokenData.client_id,
      scope: tokenData.scope,
      tokenData: {
        client_id: tokenData.client_id,
        scope: tokenData.scope,
        expires_at: tokenData.expires_at,
        granted_at: tokenData.granted_at,
        token_type: tokenData.token_type,
        iat: tokenData.iat,
        jti: tokenData.jti,
        grant_type: tokenData.grant_type,
        sub: tokenData.sub,
        aud: tokenData.aud,
        last_used: tokenData.last_used,
      },
      authContext
    } as any;
  }

  /**
   * Enhanced scope validation with hierarchical scope support
   */
  private validateScopes(
    grantedScope?: string, 
    requiredScope?: string | string[]
  ): { valid: boolean; reason?: string } {
    if (!requiredScope) {
      return { valid: true };
    }

    if (!grantedScope) {
      return { valid: false, reason: 'No scopes granted' };
    }

    const grantedScopes = grantedScope.split(' ').filter(s => s.length > 0);
    const requiredScopes = Array.isArray(requiredScope) ? requiredScope : [requiredScope];

    // Special case: 'mcp' scope grants access to all MCP operations
    if (grantedScopes.includes('mcp')) {
      return { valid: true };
    }

    // Check each required scope
    for (const scope of requiredScopes) {
      let scopeGranted = false;

      // Direct scope match
      if (grantedScopes.includes(scope)) {
        scopeGranted = true;
      } 
      // Hierarchical scope matching (e.g., "tasks:write" includes "tasks:read")
      else if (scope.includes(':read')) {
        const writeScope = scope.replace(':read', ':write');
        if (grantedScopes.includes(writeScope)) {
          scopeGranted = true;
        }
      }

      if (!scopeGranted) {
        return { valid: false, reason: `Missing required scope: ${scope}` };
      }
    }

    return { valid: true };
  }

  /**
   * Security context validation for enhanced OAuth 2.1 compliance
   */
  private validateSecurityContext(
    tokenData: any, 
    context: { ip_address?: string; user_agent?: string; resource?: string; action?: string }
  ): { valid: boolean; reason?: string } {
    // Note: In production, you might want to enable IP validation
    // For development and behind proxies, IP validation can be problematic
    
    // User agent validation (optional security measure)
    if (context.user_agent && tokenData.user_agent) {
      // Allow user agent changes for legitimate client updates
      // but log for security monitoring
      if (context.user_agent !== tokenData.user_agent) {
        debugLog('User agent changed since token issuance', {
          original: tokenData.user_agent,
          current: context.user_agent
        });
      }
    }

    return { valid: true };
  }

  /**
   * Create authentication context for request processing
   */
  private createAuthContext(tokenData: any, context?: any) {
    return {
      client_id: tokenData.client_id,
      sub: tokenData.sub,
      aud: tokenData.aud,
      scope: tokenData.scope?.split(' ') || [],
      grant_type: tokenData.grant_type,
      iat: tokenData.iat,
      jti: tokenData.jti,
      // Request context
      ip_address: context?.ip_address,
      user_agent: context?.user_agent,
      resource: context?.resource,
      action: context?.action,
      // Token metadata
      issued_at: new Date(tokenData.granted_at).toISOString(),
      expires_at: new Date(tokenData.expires_at).toISOString(),
      last_used: new Date(tokenData.last_used || tokenData.granted_at).toISOString(),
    };
  }

  /**
   * OAuth 2.1 Token Introspection Endpoint (RFC 7662)
   * Allows clients to query token status and metadata
   */
  async introspectToken(req: Request, res: Response) {
    try {
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({
          error: 'invalid_request',
          error_description: 'token parameter is required'
        });
      }

      const validation = this.validateToken(token);
      
      if (!validation.valid) {
        // For invalid tokens, return active: false per RFC 7662
        return res.json({
          active: false
        });
      }

      // Return detailed token information for valid tokens
      return res.json({
        active: true,
        client_id: validation.client_id,
        scope: validation.scope,
        token_type: validation.tokenData?.token_type || 'Bearer',
        exp: Math.floor(validation.tokenData?.expires_at / 1000),
        iat: validation.tokenData?.iat,
        sub: validation.tokenData?.sub,
        aud: validation.tokenData?.aud,
        jti: validation.tokenData?.jti,
        grant_type: validation.tokenData?.grant_type,
      });
    } catch (error) {
      console.error('Token introspection error:', error);
      return res.status(500).json({
        error: 'server_error',
        error_description: 'Internal server error'
      });
    }
  }

  /**
   * OAuth 2.1 Token Revocation Endpoint (RFC 7009)
   * Allows clients to revoke access tokens
   */
  async revokeToken(req: Request, res: Response) {
    try {
      const { token, token_type_hint } = req.body;
      
      if (!token) {
        return res.status(400).json({
          error: 'invalid_request',
          error_description: 'token parameter is required'
        });
      }

      // Remove token from storage
      const existed = this.tokens.delete(token);
      
      debugLog('Token revocation', {
        token_existed: existed,
        token_type_hint
      });

      // Always return 200 OK per RFC 7009, even for non-existent tokens
      return res.status(200).send();
    } catch (error) {
      console.error('Token revocation error:', error);
      return res.status(500).json({
        error: 'server_error',
        error_description: 'Internal server error'
      });
    }
  }

  /**
   * Extract Bearer token from Authorization header
   */
  extractToken(authHeader?: string): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }

  /**
   * OAuth 2.1 Token Introspection Endpoint (RFC 7662)
   * Provides information about the current state of a token
   */
  async introspect(req: Request, res: Response) {
    try {
      await this.ensureClientsLoaded();
      
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({
          error: 'invalid_request',
          error_description: 'token parameter is required',
        });
      }

      const tokenData = this.tokens.get(token);
      
      if (!tokenData || tokenData.expires_at < Date.now()) {
        // Token is inactive
        return res.json({
          active: false,
        });
      }

      // Token is active - return token information
      return res.json({
        active: true,
        client_id: tokenData.client_id,
        scope: tokenData.scope,
        token_type: 'bearer',
        exp: Math.floor(tokenData.expires_at / 1000),
        iat: tokenData.iat, // Already in seconds format
        sub: tokenData.sub,
        aud: tokenData.aud,
      });
    } catch (error: any) {
      debugLog('Error in token introspection:', error.message);
      return res.status(500).json({
        error: 'server_error',
        error_description: 'Internal server error during token introspection',
      });
    }
  }

  /**
   * OAuth 2.1 Token Revocation Endpoint (RFC 7009)
   * Allows clients to revoke access tokens
   */
  async revoke(req: Request, res: Response) {
    try {
      await this.ensureClientsLoaded();
      
      const { token, token_type_hint } = req.body;
      
      if (!token) {
        return res.status(400).json({
          error: 'invalid_request',
          error_description: 'token parameter is required',
        });
      }

      // Remove the token from our storage
      const deleted = this.tokens.delete(token);
      
      // Also clean up any associated authorization codes
      for (const [code, codeData] of this.authCodes.entries()) {
        if (codeData.expires_at < Date.now()) {
          this.authCodes.delete(code);
        }
      }

      debugLog(`Token revocation: ${deleted ? 'successful' : 'token not found'}`);
      
      // RFC 7009: Return 200 OK regardless of whether token existed
      return res.status(200).json({});
    } catch (error: any) {
      debugLog('Error in token revocation:', error.message);
      return res.status(500).json({
        error: 'server_error',
        error_description: 'Internal server error during token revocation',
      });
    }
  }

  /**
   * Enhanced scope checking with hierarchical support
   * Supports both single scope and array of scopes
   */
  checkScopes(grantedScope: string | undefined, requiredScopes: string | string[]): boolean {
    if (!grantedScope) return false;
    
    const grantedScopes = grantedScope.split(' ');
    const requiredScopeArray = Array.isArray(requiredScopes) ? requiredScopes : [requiredScopes];
    
    // Check if all required scopes are granted (with hierarchical support)
    return requiredScopeArray.every(required => {
      // Direct scope match
      if (grantedScopes.includes(required)) return true;
      
      // Universal MCP scope grants all access
      if (grantedScopes.includes('mcp')) return true;
      
      // Hierarchical scope checking
      const [resource, action] = required.split(':');
      if (resource && action) {
        // Check for broader resource scope (e.g., 'tasks' grants 'tasks:read' and 'tasks:write')
        if (grantedScopes.includes(resource)) return true;
        
        // Check for write scope granting read access (e.g., 'tasks:write' grants 'tasks:read')
        if (action === 'read' && grantedScopes.includes(`${resource}:write`)) return true;
      }
      
      return false;
    });
  }

  /**
   * Clean up expired codes and tokens
   */
  private cleanupExpired() {
    const now = Date.now();

    // Clean up expired auth codes
    for (const [code, data] of this.authCodes.entries()) {
      if (now > data.expires_at) {
        this.authCodes.delete(code);
      }
    }

    // Clean up expired tokens
    for (const [token, data] of this.tokens.entries()) {
      if (now > data.expires_at) {
        this.tokens.delete(token);
      }
    }
  }
}

// Export singleton instance
export const oauthServer = new OAuthServer();