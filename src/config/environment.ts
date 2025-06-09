/**
 * Environment Configuration Management
 * 
 * Centralizes environment variable handling and validation
 * for the Google Task Calendar Remote MCP Server
 */

import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

export interface ServerConfig {
  // Server settings
  port: number;
  nodeEnv: string;
  logLevel: string;
  allowedOrigins: string[];

  // Google API credentials (copied from local server requirements)
  googleClientId: string;
  googleClientSecret: string;
  googleRefreshToken: string;

  // OAuth 2.1 security settings
  oauthIssuer: string;
  sessionSecret: string;
}

/**
 * Validate and parse environment variables
 */
function validateEnvironment(): ServerConfig {
  const errors: string[] = [];

  // Required Google API credentials
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const googleRefreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!googleClientId) errors.push('GOOGLE_CLIENT_ID is required');
  if (!googleClientSecret) errors.push('GOOGLE_CLIENT_SECRET is required');
  if (!googleRefreshToken) errors.push('GOOGLE_REFRESH_TOKEN is required');

  // Optional OAuth settings with defaults
  const oauthIssuer = process.env.OAUTH_ISSUER || 'http://localhost:3001';
  const sessionSecret = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

  // Server settings with defaults
  const port = parseInt(process.env.PORT || '3001', 10);
  const nodeEnv = process.env.NODE_ENV || 'development';
  const logLevel = process.env.LOG_LEVEL || 'info';
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];

  // Validation
  if (isNaN(port) || port < 1 || port > 65535) {
    errors.push('PORT must be a valid port number (1-65535)');
  }

  if (nodeEnv === 'production' && (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32)) {
    errors.push('SESSION_SECRET must be at least 32 characters in production');
  }

  if (errors.length > 0) {
    console.error('❌ Environment validation failed:');
    errors.forEach(error => console.error(`  - ${error}`));
    process.exit(1);
  }

  return {
    port,
    nodeEnv,
    logLevel,
    allowedOrigins,
    googleClientId: googleClientId!,
    googleClientSecret: googleClientSecret!,
    googleRefreshToken: googleRefreshToken!,
    oauthIssuer,
    sessionSecret,
  };
}

// Export validated configuration
export const config = validateEnvironment();

/**
 * Log configuration status (without sensitive data)
 */
export function logConfiguration() {
  console.log('⚙️  Configuration loaded:');
  console.log(`  🌐 Server: ${config.nodeEnv} mode on port ${config.port}`);
  console.log(`  🔒 OAuth issuer: ${config.oauthIssuer}`);
  console.log(`  🎯 Allowed origins: ${config.allowedOrigins.join(', ')}`);
  console.log(`  📊 Log level: ${config.logLevel}`);
  console.log(`  ✅ Google API: Credentials configured`);
  
  if (config.nodeEnv === 'development') {
    console.log('  ⚠️  Development mode: Some security features relaxed');
  }
}

// Re-export crypto for other modules that need it
import crypto from 'crypto';
export { crypto };