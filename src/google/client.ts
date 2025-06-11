/**
 * Google API Client Module
 * Copied from local server: ../google-task-calendar/src/index.ts
 * 
 * This module maintains identical Google API setup patterns from the 
 * working local server to ensure compatibility.
 */

import { google } from 'googleapis';
import { config } from '../config/environment.js';

export class GoogleApiClient {
  private oauth2Client: any;
  public tasks: any;
  public calendar: any;

  constructor() {
    console.log('🔧 Initializing Google API Client...');
    // Copy exact OAuth2 setup from local server using validated config
    console.log('🔧 Creating OAuth2 client...');
    this.oauth2Client = new google.auth.OAuth2(
      config.googleClientId,
      config.googleClientSecret,
      'urn:ietf:wg:oauth:2.0:oob'
    );
    console.log('🔧 OAuth2 client created successfully');

    console.log('🔧 Setting OAuth2 credentials...');
    this.oauth2Client.setCredentials({
      refresh_token: config.googleRefreshToken,
    });
    console.log('🔧 OAuth2 credentials set');

    // Initialize Google APIs exactly as local server does
    console.log('🔧 Initializing Google Tasks API...');
    this.tasks = google.tasks({ version: 'v1', auth: this.oauth2Client });
    console.log('🔧 Initializing Google Calendar API...');
    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    console.log('🔧 Google API client initialization completed!');
  }

  // Expose OAuth2 client for any additional auth needs
  getOAuth2Client() {
    return this.oauth2Client;
  }
}

// Export singleton instance
export const googleApiClient = new GoogleApiClient();