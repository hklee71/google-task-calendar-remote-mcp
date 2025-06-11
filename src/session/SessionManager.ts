/**
 * Session Management for MCP Server
 * 
 * Implements session management patterns from SimpleScraper Part 2
 * Handles transport management, race condition prevention, and session cleanup
 */

import { v4 as uuidv4 } from 'uuid';
import { Request, Response } from 'express';

export interface SessionState {
  id: string;
  transport: any; // Transport instance (simplified for now)
  lastActivity: Date;
  clientInfo: {
    ip_address?: string;
    user_agent?: string;
    client_id?: string;
  };
  conversationHistory: any[];
  authContext?: any;
  createdAt: Date;
}

export interface SessionConfig {
  sessionTimeoutMs: number;
  maxSessions: number;
  cleanupIntervalMs: number;
}

export class SessionManager {
  private sessions = new Map<string, SessionState>();
  private pendingSessions = new Map<string, Promise<SessionState>>();
  private cleanupTimer?: NodeJS.Timeout;
  
  private readonly config: SessionConfig;

  constructor(config: Partial<SessionConfig> = {}) {
    this.config = {
      sessionTimeoutMs: 30 * 60 * 1000, // 30 minutes default
      maxSessions: 1000, // Maximum concurrent sessions
      cleanupIntervalMs: 60 * 1000, // Cleanup every minute
      ...config,
    };

    // Start cleanup timer
    this.startCleanupTimer();
    
    console.log('[SessionManager] Initialized with config:', this.config);
  }

  /**
   * Get or create a session with race condition prevention
   * Implements SimpleScraper Part 2 pattern
   */
  async getOrCreateSession(
    sessionId: string, 
    req: Request, 
    authContext?: any
  ): Promise<SessionState> {
    // Check if session already exists
    if (this.sessions.has(sessionId)) {
      const session = this.sessions.get(sessionId)!;
      this.updateActivity(sessionId, req);
      return session;
    }

    // Check if session is being created (race condition prevention)
    if (this.pendingSessions.has(sessionId)) {
      console.log(`[SessionManager] Waiting for pending session: ${sessionId}`);
      return await this.pendingSessions.get(sessionId)!;
    }

    // Enforce session limits
    if (this.sessions.size >= this.config.maxSessions) {
      throw new Error(`Maximum sessions (${this.config.maxSessions}) exceeded`);
    }

    // Create new session with race condition protection
    const sessionPromise = this.createSession(sessionId, req, authContext);
    this.pendingSessions.set(sessionId, sessionPromise);

    try {
      const session = await sessionPromise;
      this.pendingSessions.delete(sessionId);
      this.sessions.set(sessionId, session);
      
      console.log(`[SessionManager] Created session: ${sessionId}`);
      return session;
    } catch (error) {
      this.pendingSessions.delete(sessionId);
      throw error;
    }
  }

  /**
   * Create a new session state
   */
  private async createSession(
    sessionId: string, 
    req: Request, 
    authContext?: any
  ): Promise<SessionState> {
    const now = new Date();
    
    // Create simplified transport (for Streamable HTTP)
    const transport = {
      type: 'streamable-http',
      sessionId,
      onclose: () => {
        console.log(`[SessionManager] Transport closed for session: ${sessionId}`);
        this.destroySession(sessionId);
      },
    };

    const session: SessionState = {
      id: sessionId,
      transport,
      lastActivity: now,
      clientInfo: {
        ...(req.ip && { ip_address: req.ip }),
        ...(req.get('User-Agent') && { user_agent: req.get('User-Agent') }),
        ...(authContext?.client_id && { client_id: authContext.client_id }),
      },
      conversationHistory: [],
      authContext,
      createdAt: now,
    };

    return session;
  }

  /**
   * Update session activity timestamp
   */
  updateActivity(sessionId: string, req: Request): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = new Date();
      
      // Update client info if changed
      if (req.ip && req.ip !== session.clientInfo.ip_address) {
        console.log(`[SessionManager] IP changed for session ${sessionId}: ${session.clientInfo.ip_address} -> ${req.ip}`);
        session.clientInfo.ip_address = req.ip;
      }
    }
  }

  /**
   * Add conversation entry to session history
   */
  addToHistory(sessionId: string, entry: any): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.conversationHistory.push({
        timestamp: new Date(),
        ...entry,
      });
      
      // Limit history size to prevent memory issues
      if (session.conversationHistory.length > 100) {
        session.conversationHistory = session.conversationHistory.slice(-50);
      }
    }
  }

  /**
   * Get session information
   */
  getSession(sessionId: string): SessionState | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Destroy a specific session
   */
  destroySession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (session) {
      // Call transport cleanup if available
      if (session.transport?.onclose) {
        try {
          session.transport.onclose();
        } catch (error) {
          console.error(`[SessionManager] Error during transport cleanup for ${sessionId}:`, error);
        }
      }
      
      this.sessions.delete(sessionId);
      console.log(`[SessionManager] Destroyed session: ${sessionId}`);
      return true;
    }
    return false;
  }

  /**
   * Generate a unique session ID
   */
  generateSessionId(): string {
    return uuidv4();
  }

  /**
   * Get session statistics
   */
  getStats(): {
    activeSessions: number;
    pendingSessions: number;
    oldestSession?: Date;
    newestSession?: Date;
  } {
    const sessions = Array.from(this.sessions.values());
    
    const result = {
      activeSessions: this.sessions.size,
      pendingSessions: this.pendingSessions.size,
    } as {
      activeSessions: number;
      pendingSessions: number;
      oldestSession?: Date;
      newestSession?: Date;
    };

    if (sessions.length > 0) {
      result.oldestSession = new Date(Math.min(...sessions.map(s => s.createdAt.getTime())));
      result.newestSession = new Date(Math.max(...sessions.map(s => s.createdAt.getTime())));
    }

    return result;
  }

  /**
   * Start automatic cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupStaleSessions();
    }, this.config.cleanupIntervalMs);
  }

  /**
   * Clean up stale sessions based on timeout
   */
  private cleanupStaleSessions(): void {
    const now = Date.now();
    const staleSessionIds: string[] = [];

    for (const [sessionId, session] of this.sessions) {
      const timeSinceActivity = now - session.lastActivity.getTime();
      if (timeSinceActivity > this.config.sessionTimeoutMs) {
        staleSessionIds.push(sessionId);
      }
    }

    if (staleSessionIds.length > 0) {
      console.log(`[SessionManager] Cleaning up ${staleSessionIds.length} stale sessions`);
      for (const sessionId of staleSessionIds) {
        this.destroySession(sessionId);
      }
    }
  }

  /**
   * Shutdown session manager and cleanup all sessions
   */
  shutdown(): void {
    console.log('[SessionManager] Shutting down...');
    
    // Clear cleanup timer
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    // Destroy all active sessions
    const sessionIds = Array.from(this.sessions.keys());
    for (const sessionId of sessionIds) {
      this.destroySession(sessionId);
    }

    console.log('[SessionManager] Shutdown complete');
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();