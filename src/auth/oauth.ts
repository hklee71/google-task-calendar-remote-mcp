/**
 * OAuth 2.1 Authentication Module
 * 
 * Implements OAuth 2.1 with PKCE for secure remote authentication
 * Required for Claude AI integration with the remote MCP server
 */

import crypto from 'crypto';
import { Request, Response } from 'express';
import { config } from '../config/environment.js';

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
  grant_type: 'authorization_code';
  code: string;
  redirect_uri: string;
  client_id: string;
  code_verifier: string;
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
  }> = new Map();

  constructor() {
    // Clean up expired codes and tokens every 5 minutes
    setInterval(() => {
      this.cleanupExpired();
    }, 5 * 60 * 1000);
  }

  /**
   * OAuth 2.1 Discovery Endpoint
   * Returns server metadata for auto-discovery
   */
  getDiscoveryDocument() {
    return {
      issuer: config.oauthIssuer,
      authorization_endpoint: '/oauth/authorize',
      token_endpoint: '/oauth/token',
      registration_endpoint: '/oauth/register',
      scopes_supported: ['mcp'],
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code'],
      code_challenge_methods_supported: ['S256'],
      token_endpoint_auth_methods_supported: ['none'],
      subject_types_supported: ['public'],
    };
  }

  /**
   * MCP Discovery Endpoint
   * Returns MCP-specific metadata
   */
  getMcpDiscoveryDocument() {
    return {
      mcpVersion: '2024-11-05',
      protocolVersion: '1.0',
      transport: {
        type: 'sse',
        endpoint: '/sse',
      },
      authentication: {
        type: 'oauth2',
        authorizationEndpoint: '/oauth/authorize',
        tokenEndpoint: '/oauth/token',
        scopes: ['mcp'],
      },
      capabilities: {
        tools: {
          count: 10,
          categories: ['tasks', 'calendar'],
        },
      },
    };
  }

  /**
   * Register a new OAuth client
   * Dynamic client registration per OAuth 2.1
   */
  registerClient(req: Request, res: Response) {
    try {
      const { client_name, redirect_uris } = req.body;

      if (!client_name || !redirect_uris || !Array.isArray(redirect_uris)) {
        return res.status(400).json({
          error: 'invalid_request',
          error_description: 'client_name and redirect_uris are required',
        });
      }

      // Validate redirect URIs
      for (const uri of redirect_uris) {
        try {
          const url = new URL(uri);
          if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            throw new Error('Invalid protocol');
          }
        } catch (error) {
          return res.status(400).json({
            error: 'invalid_redirect_uri',
            error_description: `Invalid redirect URI: ${uri}`,
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
  authorize(req: Request, res: Response) {
    try {
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
  token(req: Request, res: Response) {
    try {
      const {
        grant_type,
        code,
        redirect_uri,
        client_id,
        code_verifier,
      } = req.body;

      // Validate required parameters
      if (!grant_type || !code || !redirect_uri || !client_id || !code_verifier) {
        return res.status(400).json({
          error: 'invalid_request',
          error_description: 'Missing required parameters',
        });
      }

      if (grant_type !== 'authorization_code') {
        return res.status(400).json({
          error: 'unsupported_grant_type',
          error_description: 'Only authorization code grant is supported',
        });
      }

      // Validate authorization code
      const authCode = this.authCodes.get(code);
      if (!authCode) {
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

      // Verify PKCE code challenge
      const challengeFromVerifier = crypto
        .createHash('sha256')
        .update(code_verifier)
        .digest('base64url');

      if (challengeFromVerifier !== authCode.code_challenge) {
        return res.status(400).json({
          error: 'invalid_grant',
          error_description: 'PKCE verification failed',
        });
      }

      // Generate access token
      const access_token = crypto.randomBytes(32).toString('hex');
      this.tokens.set(access_token, {
        client_id,
        expires_at: Date.now() + 60 * 60 * 1000, // 1 hour
      });

      // Clean up used authorization code
      this.authCodes.delete(code);

      return res.json({
        access_token,
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'mcp',
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
   * Validate access token
   * Used by SSE endpoint to authenticate requests
   */
  validateToken(token: string): { valid: boolean; client_id?: string } {
    const tokenData = this.tokens.get(token);
    if (!tokenData) {
      return { valid: false };
    }

    if (Date.now() > tokenData.expires_at) {
      this.tokens.delete(token);
      return { valid: false };
    }

    return { valid: true, client_id: tokenData.client_id };
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