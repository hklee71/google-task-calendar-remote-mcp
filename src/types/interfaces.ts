/**
 * TypeScript Interfaces
 * Copied from local server: ../google-task-calendar/src/index.ts
 * 
 * These interfaces maintain exact compatibility with the local server
 * to ensure identical tool functionality.
 */

// Task interfaces - copied exactly from local server
export interface ListTasksArgs {
  tasklistId: string;
}

export interface AddTaskArgs {
  tasklistId: string;
  title: string;
  notes?: string;
}

export interface UpdateTaskArgs {
  tasklistId: string;
  taskId: string;
  title?: string;
  notes?: string;
  status?: 'needsAction' | 'completed';
}

export interface DeleteTaskArgs {
  tasklistId: string;
  taskId: string;
}

// Calendar interfaces - copied exactly from local server
export interface ListCalendarsArgs {
  // No required arguments - lists all calendars
}

export interface ListEventsArgs {
  calendarId?: string;
  timeMin?: string;
  timeMax?: string;
  maxResults?: number;
}

export interface CreateEventArgs {
  calendarId?: string;
  summary: string;
  description?: string;
  startDateTime: string;
  endDateTime: string;
  location?: string;
  timeZone?: string;
}

export interface UpdateEventArgs {
  calendarId?: string;
  eventId: string;
  summary?: string;
  description?: string;
  startDateTime?: string;
  endDateTime?: string;
  location?: string;
  timeZone?: string;
}

export interface DeleteEventArgs {
  calendarId?: string;
  eventId: string;
}