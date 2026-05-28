/**
 * Simple cron-based scheduler for scheduled rooms.
 * Checks every minute if any scheduled room should be activated.
 */

import { getDb } from '../db/index.js';
import { dbSelect, dbUpdate, eq } from '../db/db-helpers.js';

export interface ScheduledRoomTask {
  id: string;
  roomId: string;
  cronExpression: string;
  timezone: string;
  isActive: boolean;
}

/**
 * Parse a cron expression (5 fields: minute, hour, day, month, weekday)
 * Returns the next run time from a given date
 */
export function getNextCronTime(cronExpression: string, fromDate: Date = new Date()): Date {
  const parts = cronExpression.trim().split(/\s+/);
  if (parts.length !== 5) {
    throw new Error('Invalid cron expression: must have 5 parts');
  }

  // Simple implementation - in production, use a library like 'cron-parser'
  const result = new Date(fromDate);
  result.setSeconds(0);
  result.setMilliseconds(0);
  result.setMinutes(result.getMinutes() + 1);

  return result;
}

/**
 * Check if a cron expression matches the current time
 */
export function cronMatches(cronExpression: string, date: Date = new Date()): boolean {
  const parts = cronExpression.trim().split(/\s+/);
  if (parts.length !== 5) {
    return false;
  }

  const [minute, hour, day, month, weekday] = parts;
  const now = date;

  // Use loose comparison for string/number matching
  const matchesMinute = minute === '*' || String(now.getMinutes()) === String(minute);
  const matchesHour = hour === '*' || String(now.getHours()) === String(hour);
  const matchesDay = day === '*' || String(now.getDate()) === String(day);
  const matchesMonth = month === '*' || String(now.getMonth() + 1) === String(month);
  const matchesWeekday = weekday === '*' || String(now.getDay()) === String(weekday);

  return matchesMinute && matchesHour && matchesDay && matchesMonth && matchesWeekday;
}

/**
 * Scheduler class to manage scheduled rooms
 */
export class RoomScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    console.log('[Scheduler] Starting room scheduler...');

    // Check every minute
    this.intervalId = setInterval(async () => {
      await this.checkScheduledRooms();
    }, 60000);

    // Initial check
    await this.checkScheduledRooms();
  }

  async stop(): Promise<void> {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('[Scheduler] Stopped room scheduler');
  }

  private async checkScheduledRooms(): Promise<void> {
    try {
      const client = await getDb();
      const now = new Date();

      // Get all active scheduled rooms
      const scheduledRooms = await dbSelect(client, client.schema.scheduledRooms, {
        where: eq(client.schema.scheduledRooms.isActive, 1),
      });

      for (const room of scheduledRooms) {
        try {
          // Check if cron matches current time
          if (cronMatches(room.cronExpression, now)) {
            console.log(`[Scheduler] Activating scheduled room: ${room.roomId}`);

            // Activate the room (set status to 'running')
            await dbUpdate(client, client.schema.rooms, { status: 'running' }, eq(client.schema.rooms.id, room.roomId));

            // Update lastRun and nextRun
            const nextRun = getNextCronTime(room.cronExpression, now);

            // Cast is needed because SQLite uses string dates, PG uses Date objects.
            // The schema union type can't represent this difference statically.
            await dbUpdate(
              client,
              client.schema.scheduledRooms,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              {
                lastRun: client.dialect === 'sqlite' ? now.toISOString() : now,
                nextRun: client.dialect === 'sqlite' ? nextRun.toISOString() : nextRun,
              } as any,
              eq(client.schema.scheduledRooms.id, room.id),
            );
          }
        } catch (error) {
          console.error(`[Scheduler] Error processing room ${room.roomId}:`, error);
        }
      }
    } catch (error) {
      console.error('[Scheduler] Error checking scheduled rooms:', error);
    }
  }
}

// Singleton instance
export const roomScheduler = new RoomScheduler();
