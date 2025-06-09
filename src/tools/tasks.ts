/**
 * Google Tasks Tools Implementation
 * Copied from local server: ../google-task-calendar/src/index.ts
 * 
 * These tool implementations are copied exactly from the working local server
 * to ensure identical functionality and compatibility.
 */

import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { googleApiClient } from '../google/client.js';
import {
  ListTasksArgs,
  AddTaskArgs,
  UpdateTaskArgs,
  DeleteTaskArgs,
} from '../types/interfaces.js';

export class GoogleTasksTools {
  /**
   * List all Google Task lists for the authenticated user
   * Copied exactly from local server
   */
  async listTaskLists() {
    try {
      const res = await googleApiClient.tasks.tasklists.list();
      return {
        content: [{ type: 'text', text: JSON.stringify(res.data.items, null, 2) }],
      };
    } catch (error: any) {
      console.error('Error in listTaskLists:', error);
      return {
        content: [{ type: 'text', text: `Error: ${error.message || 'An unknown error occurred.'}` }],
        isError: true,
      };
    }
  }

  /**
   * List tasks within a specific Google Task list
   * Copied exactly from local server
   */
  async listTasks(args: ListTasksArgs) {
    try {
      const { tasklistId } = args;
      const res = await googleApiClient.tasks.tasks.list({ tasklist: tasklistId });
      return {
        content: [{ type: 'text', text: JSON.stringify(res.data.items, null, 2) }],
      };
    } catch (error: any) {
      console.error('Error in listTasks:', error);
      return {
        content: [{ type: 'text', text: `Error: ${error.message || 'An unknown error occurred.'}` }],
        isError: true,
      };
    }
  }

  /**
   * Add a new task to a specific Google Task list
   * Copied exactly from local server
   */
  async addTask(args: AddTaskArgs) {
    try {
      const { tasklistId, title, notes } = args;
      const res = await googleApiClient.tasks.tasks.insert({
        tasklist: tasklistId,
        requestBody: { title, notes },
      });
      return {
        content: [{ type: 'text', text: JSON.stringify(res.data, null, 2) }],
      };
    } catch (error: any) {
      console.error('Error in addTask:', error);
      return {
        content: [{ type: 'text', text: `Error: ${error.message || 'An unknown error occurred.'}` }],
        isError: true,
      };
    }
  }

  /**
   * Update an existing task in a Google Task list
   * Copied exactly from local server
   */
  async updateTask(args: UpdateTaskArgs) {
    try {
      const { tasklistId, taskId, title, notes, status } = args;
      const requestBody: { title?: string; notes?: string; status?: string } = {};
      if (title !== undefined) requestBody.title = title;
      if (notes !== undefined) requestBody.notes = notes;
      if (status !== undefined) requestBody.status = status;

      const res = await googleApiClient.tasks.tasks.update({
        tasklist: tasklistId,
        task: taskId,
        requestBody: { id: taskId, ...requestBody },
      });
      return {
        content: [{ type: 'text', text: JSON.stringify(res.data, null, 2) }],
      };
    } catch (error: any) {
      console.error('Error in updateTask:', error);
      return {
        content: [{ type: 'text', text: `Error: ${error.message || 'An unknown error occurred.'}` }],
        isError: true,
      };
    }
  }

  /**
   * Delete a task from a Google Task list
   * Copied exactly from local server
   */
  async deleteTask(args: DeleteTaskArgs) {
    try {
      const { tasklistId, taskId } = args;
      await googleApiClient.tasks.tasks.delete({
        tasklist: tasklistId,
        task: taskId,
      });
      return {
        content: [{ type: 'text', text: `Task ${taskId} deleted successfully from task list ${tasklistId}.` }],
      };
    } catch (error: any) {
      console.error('Error in deleteTask:', error);
      return {
        content: [{ type: 'text', text: `Error: ${error.message || 'An unknown error occurred.'}` }],
        isError: true,
      };
    }
  }
}

// Export singleton instance
export const googleTasksTools = new GoogleTasksTools();