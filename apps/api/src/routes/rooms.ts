import type { FastifyPluginAsync } from 'fastify';
import { randomUUID } from 'crypto';
import { getDb } from '../db/index.js';
import { dbSelect, dbInsert, dbDelete, dbSelectColumns, eq, and, isNull, desc, inArray, dialectDate } from '../db/db-helpers.js';
import type { ConversationExport, ExportedMessage } from '@agentroom/shared';

const roomsPlugin: FastifyPluginAsync = async (fastify) => {
  // GET /rooms — list all rooms
  fastify.get('/rooms', async (_req, reply) => {
    const client = await getDb();
    const rooms = await dbSelect(client, client.schema.rooms, {
      orderBy: desc(client.schema.rooms.createdAt),
    });
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

    await dbInsert(client, client.schema.rooms, {
      id,
      name,
      topic: topic ?? null,
      status: 'idle',
      turnDelayMs,
      maxContextMessages,
      createdAt: dialectDate(client, now),
    } as any);

    const rows = await dbSelect(client, client.schema.rooms, {
      where: eq(client.schema.rooms.id, id),
    });

    return reply.status(201).send(rows[0]);
  });

  // GET /rooms/:id — get room with active agents
  fastify.get<{ Params: { id: string } }>('/rooms/:id', async (req, reply) => {
    const { id } = req.params;
    const client = await getDb();

    const rooms = await dbSelect(client, client.schema.rooms, {
      where: eq(client.schema.rooms.id, id),
    });

    if (rooms.length === 0) {
      return reply.status(404).send({ error: 'Room not found' });
    }

    // Get active agents (left_at is null)
    const roomAgentRows = await dbSelectColumns(
      client,
      client.schema.roomAgents,
      { agentId: true },
      {
        where: and(
          eq(client.schema.roomAgents.roomId, id),
          isNull(client.schema.roomAgents.leftAt),
        ),
      },
    );

    const agentIds = (roomAgentRows as Array<{ agentId: string }>).map((r) => r.agentId);

    let agents: unknown[] = [];
    if (agentIds.length > 0) {
      // Fetch all agents in a single query using inList
      agents = await dbSelect(client, client.schema.agents, {
        where: inArray(client.schema.agents.id, agentIds),
      });
    }

    return reply.send({ ...(rooms[0] as object), agents });
  });

  // GET /rooms/:roomId/export — export conversation as JSON or Markdown
  fastify.get<{
    Params: { roomId: string };
    Querystring: { format?: 'json' | 'md' };
  }>('/rooms/:roomId/export', async (req, reply) => {
    const { roomId } = req.params;
    const format = req.query.format ?? 'json';
    const client = await getDb();

    // Verify room exists
    const roomRows = await dbSelect(client, client.schema.rooms, {
      where: eq(client.schema.rooms.id, roomId),
    });

    if (roomRows.length === 0) {
      return reply.status(404).send({ error: 'Room not found' });
    }

    const room = roomRows[0] as { id: string; name: string };

    // Get all messages for the room
    const messageRows = await dbSelect(client, client.schema.messages, {
      where: eq(client.schema.messages.roomId, roomId),
      orderBy: desc(client.schema.messages.createdAt),
    });

    // Get all agents that sent messages
    const messageRowsWithTypes = messageRows as { agentId: string | null }[];
    const agentIds = [...new Set(messageRowsWithTypes.map(m => m.agentId).filter((id): id is string => id !== null))];

    let agents: { id: string; name: string }[] = [];
    if (agentIds.length > 0) {
      agents = await dbSelect(client, client.schema.agents, {
        where: inArray(client.schema.agents.id, agentIds as string[]),
      }) as { id: string; name: string }[];
    }

    const agentMap = new Map(agents.map(a => [a.id, a.name]));

    const exportedMessages: ExportedMessage[] = (messageRows as {
      id: string;
      role: string;
      content: string;
      agentId: string | null;
      createdAt: string;
    }[]).map(msg => ({
      id: msg.id,
      role: msg.role as 'agent' | 'human' | 'system',
      content: msg.content,
      senderName: msg.agentId ? agentMap.get(msg.agentId) : 'Human',
      createdAt: msg.createdAt,
    }));

    if (format === 'md') {
      // Return as Markdown text
      const mdContent = [
        `# ${room.name} - Conversation Export`,
        ``,
        `**Exported:** ${new Date().toISOString()}`,
        ``,
        `---`,
        ``,
        ...exportedMessages.map(msg => {
          const timestamp = new Date(msg.createdAt).toLocaleString();
          return `**[${timestamp}] ${msg.senderName ?? 'Unknown'}:**\n\n${msg.content}\n\n`;
        }),
      ].join('\n');

      reply.header('Content-Type', 'text/markdown; charset=utf-8');
      reply.header('Content-Disposition', `attachment; filename="${room.name.replace(/\s+/g, '_')}_conversation.md"`);
      return reply.send(mdContent);
    }

    // Return as JSON
    const exportData: ConversationExport = {
      roomId: room.id,
      roomName: room.name,
      format: 'json',
      exportedAt: new Date().toISOString(),
      messages: exportedMessages,
    };

    reply.header('Content-Type', 'application/json');
    reply.header('Content-Disposition', `attachment; filename="${room.name.replace(/\s+/g, '_')}_conversation.json"`);
    return reply.send(exportData);
  });

  // GET /rooms/templates — list all available room templates
  fastify.get('/rooms/templates', async (_req, reply) => {
    const client = await getDb();

    const templates = await dbSelect(client, client.schema.roomTemplates, {
      orderBy: desc(client.schema.roomTemplates.isDefault),
    });

    return reply.send(templates);
  });

  // POST /rooms/templates/:templateId/create — create room from template
  fastify.post<{
    Params: { templateId: string };
  }>('/rooms/templates/:templateId/create', async (req, reply) => {
    const { templateId } = req.params;
    const client = await getDb();

    // Get template
    const templates = await dbSelect(client, client.schema.roomTemplates, {
      where: eq(client.schema.roomTemplates.id, templateId),
    });

    if (templates.length === 0) {
      return reply.status(404).send({ error: 'Template not found' });
    }

    const template = templates[0] as {
      name: string;
      description: string;
      configJson: string;
      agentConfigsJson: string;
    };

    // Parse config JSON
    let config: { topic?: string; turnDelayMs?: number; maxContextMessages?: number } = {};
    try {
      config = JSON.parse(template.configJson);
    } catch {
      // Use defaults if parsing fails
    }

    // Create the room
    const roomId = randomUUID();
    const now = new Date();

    await dbInsert(client, client.schema.rooms, {
      id: roomId,
      name: template.name,
      topic: (config.topic || template.description) ?? null,
      status: 'idle',
      turnDelayMs: config.turnDelayMs ?? 2000,
      maxContextMessages: config.maxContextMessages ?? 50,
      createdAt: dialectDate(client, now),
    } as any);

    // Parse agent configs and add agents to room
    let agentConfigs: Array<{ agentId: string }> = [];
    try {
      agentConfigs = JSON.parse(template.agentConfigsJson);
    } catch {
      // No agents to add
    }

    // Add each agent to the room
    for (const agentConfig of agentConfigs) {
      if (agentConfig.agentId) {
        await dbInsert(client, client.schema.roomAgents, {
          roomId,
          agentId: agentConfig.agentId,
          joinedAt: now,
          leftAt: null,
        });
      }
    }

    const rows = await dbSelect(client, client.schema.rooms, {
      where: eq(client.schema.rooms.id, roomId),
    });

    return reply.status(201).send(rows[0]);
  });

  // GET /rooms/:roomId/analytics — get conversation analytics
  fastify.get<{
    Params: { roomId: string };
  }>('/rooms/:roomId/analytics', async (req, reply) => {
    const { roomId } = req.params;
    const client = await getDb();

    // Verify room exists
    const roomRows = await dbSelect(client, client.schema.rooms, {
      where: eq(client.schema.rooms.id, roomId),
    });

    if (roomRows.length === 0) {
      return reply.status(404).send({ error: 'Room not found' });
    }

    const room = roomRows[0] as { createdAt: string };

    // Get all messages for the room
    const messageRows = await dbSelect(client, client.schema.messages, {
      where: eq(client.schema.messages.roomId, roomId),
      orderBy: desc(client.schema.messages.createdAt),
    });

    const messages = messageRows as {
      id: string;
      role: string;
      agentId: string | null;
      createdAt: string;
    }[];

    // Calculate analytics
    const totalMessages = messages.length;
    const messagesPerAgent: Record<string, number> = {};
    let humanMessageCount = 0;
    let lastMessageAt = room.createdAt;
    let avgResponseTimeMs = 0;
    const responseTimes: number[] = [];

    // Track last human message time for response time calculation
    let lastHumanMessageTime: Date | null = null;

    for (const msg of messages) {
      // Count messages per agent
      if (msg.agentId) {
        messagesPerAgent[msg.agentId] = (messagesPerAgent[msg.agentId] || 0) + 1;
      } else if (msg.role === 'human') {
        humanMessageCount++;
        lastHumanMessageTime = new Date(msg.createdAt);
      }

      // Track last message time
      const msgTime = new Date(msg.createdAt);
      if (msgTime > new Date(lastMessageAt)) {
        lastMessageAt = msg.createdAt;
      }

      // Calculate response time if this is an agent message after a human message
      if (msg.role === 'agent' && lastHumanMessageTime) {
        const responseTime = msgTime.getTime() - lastHumanMessageTime.getTime();
        if (responseTime > 0) {
          responseTimes.push(responseTime);
        }
        lastHumanMessageTime = null; // Reset for next human message
      }
    }

    // Calculate average response time
    if (responseTimes.length > 0) {
      avgResponseTimeMs = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    }

    // Calculate conversation duration
    const conversationDurationMs = new Date(lastMessageAt).getTime() - new Date(room.createdAt).getTime();

    return reply.send({
      totalMessages,
      messagesPerAgent,
      humanMessageCount,
      avgResponseTimeMs: Math.round(avgResponseTimeMs),
      conversationDurationMs,
      createdAt: room.createdAt,
      lastMessageAt,
    });
  });

  // GET /rooms/:id/messages — paginated message history
  fastify.get<{
    Params: { id: string };
    Querystring: { limit?: string; before?: string };
  }>('/rooms/:id/messages', async (req, reply) => {
    const { id } = req.params;
    const limit = Math.min(parseInt(req.query.limit ?? '50', 10), 200);

    const client = await getDb();

    const roomRows = await dbSelect(client, client.schema.rooms, {
      where: eq(client.schema.rooms.id, id),
    });

    if (roomRows.length === 0) {
      return reply.status(404).send({ error: 'Room not found' });
    }

    const messages = await dbSelect(client, client.schema.messages, {
      where: eq(client.schema.messages.roomId, id),
      orderBy: desc(client.schema.messages.createdAt),
      limit,
    });

    return reply.send((messages as unknown[]).reverse());
  });

  // DELETE /rooms/:id — delete room and cascade to related tables
  fastify.delete<{ Params: { id: string } }>('/rooms/:id', async (req, reply) => {
    const { id } = req.params;
    const client = await getDb();

    // Delete messages in this room (reactions are orphaned, then cleaned)
    const msgIds = (await dbSelect(client, client.schema.messages, {
      where: eq(client.schema.messages.roomId, id),
    }) as { id: string }[]).map(m => m.id);

    if (msgIds.length > 0) {
      await dbDelete(client, client.schema.messageReactions, inArray(client.schema.messageReactions.messageId, msgIds));
    }
    await dbDelete(client, client.schema.messages, eq(client.schema.messages.roomId, id));
    await dbDelete(client, client.schema.roomAgents, eq(client.schema.roomAgents.roomId, id));
    await dbDelete(client, client.schema.scheduledRooms, eq(client.schema.scheduledRooms.roomId, id));
    await dbDelete(client, client.schema.rooms, eq(client.schema.rooms.id, id));

    return reply.status(204).send();
  });

  // ─── Message Reactions ──────────────────────────────────────────────────────

  // GET /rooms/:roomId/messages/:messageId/reactions — Get all reactions for a message
  fastify.get<{ Params: { roomId: string; messageId: string } }>('/rooms/:roomId/messages/:messageId/reactions', async (req, reply) => {
    const { messageId } = req.params;
    const client = await getDb();

    // Verify message exists
    const messageRows = await dbSelect(client, client.schema.messages, {
      where: eq(client.schema.messages.id, messageId),
    });

    if (messageRows.length === 0) {
      return reply.status(404).send({ error: 'Message not found' });
    }

    // Get all reactions for the message
    const reactions = await dbSelect(client, client.schema.messageReactions, {
      where: eq(client.schema.messageReactions.messageId, messageId),
      orderBy: desc(client.schema.messageReactions.createdAt),
    });

    return reply.send(reactions);
  });

  // POST /rooms/:roomId/messages/:messageId/reactions — Add a reaction
  fastify.post<{
    Params: { roomId: string; messageId: string };
    Body: { emoji: string };
  }>('/rooms/:roomId/messages/:messageId/reactions', async (req, reply) => {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const payload = await req.jwtVerify<{ userId: string }>();
    const userId = payload.userId;
    const client = await getDb();

    // Verify message exists
    const messageRows = await dbSelect(client, client.schema.messages, {
      where: eq(client.schema.messages.id, messageId),
    });

    if (messageRows.length === 0) {
      return reply.status(404).send({ error: 'Message not found' });
    }

    const id = randomUUID();
    const now = new Date();

    await dbInsert(client, client.schema.messageReactions, {
      id,
      messageId,
      userId,
      emoji,
      createdAt: dialectDate(client, now),
    } as any);

    const rows = await dbSelect(client, client.schema.messageReactions, {
      where: eq(client.schema.messageReactions.id, id),
    });

    return reply.status(201).send(rows[0]);
  });

  // DELETE /rooms/:roomId/messages/:messageId/reactions/:reactionId — Remove a reaction
  fastify.delete<{ Params: { roomId: string; messageId: string; reactionId: string } }>(
    '/rooms/:roomId/messages/:messageId/reactions/:reactionId',
    async (req, reply) => {
      const { messageId, reactionId } = req.params;
      const client = await getDb();

      // Verify reaction exists and belongs to the message
      const reactionRows = await dbSelect(client, client.schema.messageReactions, {
        where: and(
          eq(client.schema.messageReactions.id, reactionId),
          eq(client.schema.messageReactions.messageId, messageId),
        ),
      });

      if (reactionRows.length === 0) {
        return reply.status(404).send({ error: 'Reaction not found' });
      }

      await dbDelete(client, client.schema.messageReactions, eq(client.schema.messageReactions.id, reactionId));

      return reply.status(204).send();
    },
  );

  // ─── Scheduled Rooms ──────────────────────────────────────────────────────

  // GET /rooms/:roomId/schedule — Get room schedule
  fastify.get<{ Params: { roomId: string } }>('/rooms/:roomId/schedule', async (req, reply) => {
    const { roomId } = req.params;
    const client = await getDb();

    const schedules = await dbSelect(client, client.schema.scheduledRooms, {
      where: eq(client.schema.scheduledRooms.roomId, roomId),
    });

    if (schedules.length === 0) {
      return reply.status(404).send({ error: 'Schedule not found' });
    }

    return reply.send(schedules[0]);
  });

  // POST /rooms/:roomId/schedule — Create/update schedule
  fastify.post<{
    Params: { roomId: string };
    Body: { cronExpression: string; timezone?: string };
  }>('/rooms/:roomId/schedule', async (req, reply) => {
    const { roomId } = req.params;
    const { cronExpression, timezone = 'UTC' } = req.body;
    const client = await getDb();

    // Verify room exists
    const roomRows = await dbSelect(client, client.schema.rooms, {
      where: eq(client.schema.rooms.id, roomId),
    });

    if (roomRows.length === 0) {
      return reply.status(404).send({ error: 'Room not found' });
    }

    const id = randomUUID();
    const now = new Date();

    await dbInsert(client, client.schema.scheduledRooms, {
      id,
      roomId,
      cronExpression,
      timezone,
      isActive: 1,
      lastRun: null,
      nextRun: null,
      createdAt: dialectDate(client, now),
    } as any);

    const rows = await dbSelect(client, client.schema.scheduledRooms, {
      where: eq(client.schema.scheduledRooms.id, id),
    });

    return reply.status(201).send(rows[0]);
  });

  // DELETE /rooms/:roomId/schedule — Delete schedule
  fastify.delete<{ Params: { roomId: string } }>('/rooms/:roomId/schedule', async (req, reply) => {
    const { roomId } = req.params;
    const client = await getDb();

    await dbDelete(client, client.schema.scheduledRooms, eq(client.schema.scheduledRooms.roomId, roomId));

    return reply.status(204).send();
  });
};

export default roomsPlugin;
