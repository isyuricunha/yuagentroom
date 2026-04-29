import { TurnLoop } from './turn-loop.js';
import type { Room } from '@agentroom/shared';
import type { BroadcastFn } from './turn-loop.js';

/**
 * Manages per-room TurnLoop instances.
 * Single instance shared across the application.
 */
export class RoomRunner {
  private loops = new Map<string, TurnLoop>();

  constructor(private readonly broadcast: BroadcastFn) {}

  start(room: Room): void {
    let loop = this.loops.get(room.id);

    if (!loop) {
      loop = new TurnLoop({ room, broadcast: this.broadcast });
      this.loops.set(room.id, loop);
    }

    if (!loop.isRunning) {
      loop.start();
    }
  }

  pause(roomId: string): void {
    const loop = this.loops.get(roomId);
    if (loop?.isRunning) {
      loop.pause();
    }
  }

  stop(roomId: string): void {
    const loop = this.loops.get(roomId);
    if (loop) {
      loop.pause();
      this.loops.delete(roomId);
    }
  }

  isRunning(roomId: string): boolean {
    return this.loops.get(roomId)?.isRunning ?? false;
  }
}

// Singleton — created after broadcast is available
let _runner: RoomRunner | null = null;

export function getRoomRunner(broadcast?: BroadcastFn): RoomRunner {
  if (!_runner) {
    if (!broadcast) {
      throw new Error('RoomRunner has not been initialized yet. Provide broadcast on first call.');
    }
    _runner = new RoomRunner(broadcast);
  }
  return _runner;
}
