import type { ServerEvent, ClientEvent } from '@agentroom/shared';
import { AUTH_TOKEN_KEY } from './auth-constants';

type EventListener<T extends ServerEvent = ServerEvent> = (event: T) => void;

/**
 * Typed WebSocket client for a single room connection.
 * Reconnects automatically on unexpected disconnection.
 */
export class RoomWebSocket {
  private roomId: string;
  private ws: WebSocket | null = null;
  private listeners = new Map<ServerEvent['type'], Set<EventListener>>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private closed = false;

  constructor(roomId: string) {
    this.roomId = roomId;
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    let url = `${protocol}//${host}/ws/rooms/${this.roomId}`;

    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      url += `?token=${encodeURIComponent(token)}`;
    }

    this.ws = new WebSocket(url);

    this.ws.addEventListener('message', (ev) => {
      try {
        const event = JSON.parse(ev.data as string) as ServerEvent;
        this.emit(event);
      } catch {
        // Ignore malformed messages
      }
    });

    this.ws.addEventListener('close', () => {
      if (!this.closed) {
        this.reconnectTimer = setTimeout(() => this.connect(), 2000);
      }
    });

    this.ws.addEventListener('error', (err) => {
      console.error('[WS] connection error', err);
    });
  }

  disconnect(): void {
    this.closed = true;
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
  }

  send(event: ClientEvent): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(event));
    }
  }

  on<T extends ServerEvent>(type: T['type'], listener: EventListener<T>): () => void {
    let set = this.listeners.get(type);
    if (!set) {
      set = new Set();
      this.listeners.set(type, set);
    }
    set.add(listener as EventListener);

    return () => {
      set?.delete(listener as EventListener);
    };
  }

  private emit(event: ServerEvent): void {
    const set = this.listeners.get(event.type);
    if (set) {
      for (const listener of set) {
        listener(event);
      }
    }
  }
}
