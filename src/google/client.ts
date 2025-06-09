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
    // Copy exact OAuth2 setup from local server using validated config
    this.oauth2Client = new google.auth.OAuth2(
      config.googleClientId,
      config.googleClientSecret,
      'urn:ietf:wg:oauth:2.0:oob'
    );

    this.oauth2Client.setCredentials({
      refresh_token: config.googleRefreshToken,
    });

    // Initialize Google APIs exactly as local server does
    this.tasks = google.tasks({ version: 'v1', auth: this.oauth2Client });
    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  // Expose OAuth2 client for any additional auth needs
  getOAuth2Client() {
    return this.oauth2Client;
  }
}

// Export singleton instance
export const googleApiClient = new GoogleApiClient();