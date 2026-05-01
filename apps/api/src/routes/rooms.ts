import type { FastifyPluginAsync } from 'fastify';
import { randomUUID } from 'crypto';
import { eq, and, isNull, desc, inArray } from 'drizzle-orm';
import { getDb } from '../db/index.js';

const roomsPlugin: FastifyPluginAsync = async (fastify) => {
  // GET /rooms — list all rooms
  fastify.get('/rooms', async (_req, reply) => {
    const client = await getDb();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rooms = await (client.db as any)
      .select()
      .from(client.schema.rooms)
      .orderBy(client.schema.rooms.createdAt);
    return reply.send(rooms);
  });

  // POST /rooms — create room with schema validation
  const createRoomSchema = {
    body: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string', minLength: 1, maxLength: 255 },
        topic: { type: 'string', maxLength: 1000 },
        turnDelayMs: { type: 'number', minimum: 0, maximum: 60000 },
        maxContextMessages: { type: 'number', minimum: 1, maximum: 500 },
      },
    },
  };

  fastify.post<{
    Body: {
      name: string;
      topic?: string;
      turnDelayMs?: number;
      maxContextMessages?: number;
    };
  }>('/rooms', { schema: createRoomSchema }, async (req, reply) => {
    const { name, topic, turnDelayMs = 2000, maxContextMessages = 50 } = req.body;

    const client = await getDb();
    const id = randomUUID();
    const now = new Date();

    const row = {
      id,
      name,
      topic: topic ?? null,
      status: 'idle' as const,
      turnDelayMs,
      maxContextMessages,
      createdAt: client.dialect === 'sqlite' ? now.toISOString() : now,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (client.db as any).insert(client.schema.rooms).values(row);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows: unknown[] = await (client.db as any)
      .select()
      .from(client.schema.rooms)
      .where(eq(client.schema.rooms.id, id));

    return reply.status(201).send(rows[0]);
  });

  // GET /rooms/:id — get room with active agents
  fastify.get<{ Params: { id: string } }>('/rooms/:id', async (req, reply) => {
    const { id } = req.params;
    const client = await getDb();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rooms: unknown[] = await (client.db as any)
      .select()
      .from(client.schema.rooms)
      .where(eq(client.schema.rooms.id, id));

    if (rooms.length === 0) {
      return reply.status(404).send({ error: 'Room not found' });
    }

    // Get active agents (left_at is null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const roomAgentRows: Array<{ agentId: string }> = await (client.db as any)
      .select({ agentId: client.schema.roomAgents.agentId })
      .from(client.schema.roomAgents)
      .where(
        and(
          eq(client.schema.roomAgents.roomId, id),
          isNull(client.schema.roomAgents.leftAt),
        ),
      );

    const agentIds = roomAgentRows.map((r) => r.agentId);
  
    let agents: unknown[] = [];
    if (agentIds.length > 0) {
      // Fetch all agents in a single query using inList
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      agents = await (client.db as any)
        .select()
        .from(client.schema.agents)
        .where(inArray(client.schema.agents.id, agentIds));
    }
  
    return reply.send({ ...(rooms[0] as object), agents });
  });

  // GET /rooms/:id/messages — paginated message history
  fastify.get<{
    Params: { id: string };
    Querystring: { limit?: string; before?: string };
  }>('/rooms/:id/messages', async (req, reply) => {
    const { id } = req.params;
    const limit = Math.min(parseInt(req.query.limit ?? '50', 10), 200);

    const client = await getDb();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const roomRows: unknown[] = await (client.db as any)
      .select()
      .from(client.schema.rooms)
      .where(eq(client.schema.rooms.id, id));

    if (roomRows.length === 0) {
      return reply.status(404).send({ error: 'Room not found' });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messages = await (client.db as any)
      .select()
      .from(client.schema.messages)
      .where(eq(client.schema.messages.roomId, id))
      .orderBy(desc(client.schema.messages.createdAt))
      .limit(limit);

    return reply.send((messages as unknown[]).reverse());
  });

  // DELETE /rooms/:id — delete room
  fastify.delete<{ Params: { id: string } }>('/rooms/:id', async (req, reply) => {
    const { id } = req.params;
    const client = await getDb();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (client.db as any)
      .delete(client.schema.rooms)
      .where(eq(client.schema.rooms.id, id));

    return reply.status(204).send();
  });
};

export default roomsPlugin;
