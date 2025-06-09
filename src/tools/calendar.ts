/**
 * Google Calendar Tools Implementation
 * Copied from local server: ../google-task-calendar/src/index.ts
 * 
 * These tool implementations are copied exactly from the working local server
 * to ensure identical functionality and compatibility.
 */

import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { googleApiClient } from '../google/client.js';
import {
  ListCalendarsArgs,
  ListEventsArgs,
  CreateEventArgs,
  UpdateEventArgs,
  DeleteEventArgs,
} from '../types/interfaces.js';

export class GoogleCalendarTools {
  /**
   * List all Google Calendars for the authenticated user
   * Copied exactly from local server
   */
  async listCalendars(args: ListCalendarsArgs) {
    try {
      const res = await googleApiClient.calendar.calendarList.list();
      return {
        content: [{ type: 'text', text: JSON.stringify(res.data.items, null, 2) }],
      };
    } catch (error: any) {
      console.error('Error in listCalendars:', error);
      return {
        content: [{ type: 'text', text: `Error: ${error.message || 'An unknown error occurred.'}` }],
        isError: true,
      };
    }
  }

  /**
   * List events from a specific Google Calendar
   * Copied exactly from local server
   */
  async listEvents(args: ListEventsArgs) {
    try {
      const calendarId = args.calendarId || 'primary';
      const timeMin = args.timeMin;
      const timeMax = args.timeMax;
      const maxResults = args.maxResults || 10;

      const res = await googleApiClient.calendar.events.list({
        calendarId,
        timeMin,
        timeMax,
        maxResults,
        singleEvents: true,
        orderBy: 'startTime',
      });
      return {
        content: [{ type: 'text', text: JSON.stringify(res.data.items, null, 2) }],
      };
    } catch (error: any) {
      console.error('Error in listEvents:', error);
      return {
        content: [{ type: 'text', text: `Error: ${error.message || 'An unknown error occurred.'}` }],
        isError: true,
      };
    }
  }

  /**
   * Create a new event in Google Calendar
   * Copied exactly from local server
   */
  async createEvent(args: CreateEventArgs) {
    try {
      const { calendarId = 'primary', summary, description, startDateTime, endDateTime, location, timeZone } = args;
      
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

      const res = await googleApiClient.calendar.events.insert({
        calendarId,
        requestBody: event,
      });
      return {
        content: [{ type: 'text', text: JSON.stringify(res.data, null, 2) }],
      };
    } catch (error: any) {
      console.error('Error in createEvent:', error);
      return {
        content: [{ type: 'text', text: `Error: ${error.message || 'An unknown error occurred.'}` }],
        isError: true,
      };
    }
  }

  /**
   * Update an existing event in Google Calendar
   * Copied exactly from local server
   */
  async updateEvent(args: UpdateEventArgs) {
    try {
      const { calendarId = 'primary', eventId, summary, description, startDateTime, endDateTime, location, timeZone } = args;
      
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

      const res = await googleApiClient.calendar.events.update({
        calendarId,
        eventId,
        requestBody: updateFields,
      });
      return {
        content: [{ type: 'text', text: JSON.stringify(res.data, null, 2) }],
      };
    } catch (error: any) {
      console.error('Error in updateEvent:', error);
      return {
        content: [{ type: 'text', text: `Error: ${error.message || 'An unknown error occurred.'}` }],
        isError: true,
      };
    }
  }

  /**
   * Delete an event from Google Calendar
   * Copied exactly from local server
   */
  async deleteEvent(args: DeleteEventArgs) {
    try {
      const { calendarId = 'primary', eventId } = args;
      
      await googleApiClient.calendar.events.delete({
        calendarId,
        eventId,
      });
      return {
        content: [{ type: 'text', text: `Event ${eventId} deleted successfully from calendar ${calendarId}.` }],
      };
    } catch (error: any) {
      console.error('Error in deleteEvent:', error);
      return {
        content: [{ type: 'text', text: `Error: ${error.message || 'An unknown error occurred.'}` }],
        isError: true,
      };
    }
  }
}

// Export singleton instance
export const googleCalendarTools = new GoogleCalendarTools();