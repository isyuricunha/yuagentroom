import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';
import { randomUUID } from 'crypto';
import { eq, and, isNull } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import type { ClientEvent, ServerEvent } from '@agentroom/shared';
import { getDb } from '../db/index.js';
import { getRoomRunner } from '../engine/room-runner.js';

// ─── Room subscription map: roomId → set of WS clients ────────────────────
const roomClients = new Map<string, Set<WebSocket>>();

function addClient(roomId: string, ws: WebSocket): void {
  let set = roomClients.get(roomId);
  if (!set) {
    set = new Set();
    roomClients.set(roomId, set);
  }
  set.add(ws);
}

function removeClient(roomId: string, ws: WebSocket): void {
  const set = roomClients.get(roomId);
  if (set) {
    set.delete(ws);
    if (set.size === 0) roomClients.delete(roomId);
  }
}

export function broadcast(roomId: string, payload: unknown): void {
  const clients = roomClients.get(roomId);
  if (!clients) return;
  const text = JSON.stringify(payload);
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(text);
    }
  }
}

// ─── Main WebSocket upgrade handler ────────────────────────────────────────

export function createWsHandler(server: import('http').Server): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req: IncomingMessage, socket, head) => {
    const urlPath = req.url ?? '';
    const match = /^\/ws\/rooms\/([^/?]+)/.exec(urlPath);
    if (!match) {
      socket.destroy();
      return;
    }

    if (process.env.ADMIN_PASSWORD) {
      const url = new URL(urlPath, `http://${req.headers.host}`);
      const token = url.searchParams.get('token');
      if (!token) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }
      try {
        jwt.verify(token, process.env.JWT_SECRET || 'super-secret-agentroom-key-998877');
      } catch {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }
    }

    const roomId = match[1]!;
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req, roomId);
    });
  });

  wss.on('connection', (ws: WebSocket, _req: IncomingMessage, roomId: string) => {
    addClient(roomId, ws);

    ws.on('message', (raw) => {
      handleClientMessage(ws, roomId, raw.toString()).catch((err: unknown) => {
        console.error('[WS] message handler error:', err);
      });
    });

    ws.on('close', () => {
      removeClient(roomId, ws);
    });

    ws.on('error', (err) => {
      console.error('[WS] socket error:', err);
    });
  });

  return wss;
}

async function handleClientMessage(
  _ws: WebSocket,
  roomId: string,
  raw: string,
): Promise<void> {
  let event: ClientEvent;
  try {
    event = JSON.parse(raw) as ClientEvent;
  } catch {
    return; // Ignore malformed JSON
  }

  const runner = getRoomRunner();
  const client = await getDb();

  switch (event.type) {
    case 'room:start': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rooms: unknown[] = await (client.db as any)
        .select()
        .from(client.schema.rooms)
        .where(eq(client.schema.rooms.id, roomId));
      if (rooms.length === 0) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (client.db as any)
        .update(client.schema.rooms)
        .set({ status: 'running' })
        .where(eq(client.schema.rooms.id, roomId));
      runner.start(rooms[0] as Parameters<typeof runner.start>[0]);
      break;
    }

    case 'room:pause': {
      runner.pause(roomId);

      // Force immediate UI feedback and DB state update (even if loop is completing current turn)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (client.db as any)
        .update(client.schema.rooms)
        .set({ status: 'paused' })
        .where(eq(client.schema.rooms.id, roomId));

      broadcast(roomId, {
        type: 'room:status',
        payload: { roomId, status: 'paused' },
      });
      break;
    }

    case 'room:send_message': {
      const { content } = event.payload;
      if (!content?.trim()) return;

      const msgId = randomUUID();
      const now = new Date();

      const msgRow = {
        id: msgId,
        roomId,
        agentId: null,
        role: 'human' as const,
        content,
        createdAt: client.dialect === 'sqlite' ? now.toISOString() : now,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (client.db as any).insert(client.schema.messages).values(msgRow);

      const serverEvent: ServerEvent = {
        type: 'room:message',
        payload: {
          id: msgId,
          roomId,
          agentId: null,
          role: 'human',
          content,
          createdAt: now.toISOString(),
          agent: null,
        },
      };
      broadcast(roomId, serverEvent);
      break;
    }

    case 'room:add_agent': {
      const { agentId } = event.payload;

      // Check agent exists
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const agentRows: unknown[] = await (client.db as any)
        .select()
        .from(client.schema.agents)
        .where(eq(client.schema.agents.id, agentId));
      if (agentRows.length === 0) return;

      const agent = agentRows[0] as { id: string; name: string };

      // Add to room_agents if not already active
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const existing: unknown[] = await (client.db as any)
        .select()
        .from(client.schema.roomAgents)
        .where(
          and(
            eq(client.schema.roomAgents.roomId, roomId),
            eq(client.schema.roomAgents.agentId, agentId),
            isNull(client.schema.roomAgents.leftAt),
          ),
        );

      if (existing.length > 0) return;

      const now = new Date();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (client.db as any).insert(client.schema.roomAgents).values({
        roomId,
        agentId,
        joinedAt: client.dialect === 'sqlite' ? now.toISOString() : now,
        leftAt: null,
      });

      const serverEvent: ServerEvent = {
        type: 'room:agent_joined',
        payload: { agent: { id: agent.id, name: agent.name }, roomId },
      };
      broadcast(roomId, serverEvent);
      break;
    }

    case 'room:remove_agent': {
      const { agentId } = event.payload;
      const now = new Date();
      const leftAt = client.dialect === 'sqlite' ? now.toISOString() : now;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (client.db as any)
        .update(client.schema.roomAgents)
        .set({ leftAt })
        .where(
          and(
            eq(client.schema.roomAgents.roomId, roomId),
            eq(client.schema.roomAgents.agentId, agentId),
            isNull(client.schema.roomAgents.leftAt),
          ),
        );

      const serverEvent: ServerEvent = {
        type: 'room:agent_left',
        payload: { agentId, roomId },
      };
      broadcast(roomId, serverEvent);
      break;
    }

    default:
      break;
  }
}
