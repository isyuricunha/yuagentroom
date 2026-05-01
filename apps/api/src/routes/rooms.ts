import type { FastifyPluginAsync } from 'fastify';
import { randomUUID } from 'crypto';
import { eq, and, isNull, desc, inArray } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import type { ConversationExport, ExportedMessage } from '@agentroom/shared';

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
  
  // GET /rooms/:roomId/export — export conversation as JSON or Markdown
  fastify.get<{
    Params: { roomId: string };
    Querystring: { format?: 'json' | 'md' };
  }>('/rooms/:roomId/export', async (req, reply) => {
    const { roomId } = req.params;
    const format = req.query.format ?? 'json';
    const client = await getDb();
  
    // Verify room exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const roomRows: unknown[] = await (client.db as any)
      .select()
      .from(client.schema.rooms)
      .where(eq(client.schema.rooms.id, roomId));
  
    if (roomRows.length === 0) {
      return reply.status(404).send({ error: 'Room not found' });
    }
  
    const room = roomRows[0] as { id: string; name: string };
  
    // Get all messages for the room
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messageRows: unknown[] = await (client.db as any)
      .select()
      .from(client.schema.messages)
      .where(eq(client.schema.messages.roomId, roomId))
      .orderBy(desc(client.schema.messages.createdAt));
  
    // Get all agents that sent messages
    const messageRowsWithTypes = messageRows as { agentId: string | null }[];
    const agentIds = [...new Set(messageRowsWithTypes.map(m => m.agentId).filter((id): id is string => id !== null))];
    
    let agents: { id: string; name: string }[] = [];
    if (agentIds.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      agents = await (client.db as any)
        .select({ id: client.schema.agents.id, name: client.schema.agents.name })
        .from(client.schema.agents)
        .where(inArray(client.schema.agents.id, agentIds as string[]));
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
  
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const templates: unknown[] = await (client.db as any)
      .select()
      .from(client.schema.roomTemplates)
      .orderBy(desc(client.schema.roomTemplates.isDefault));
  
    return reply.send(templates);
  });
  
  // POST /rooms/templates/:templateId/create — create room from template
  fastify.post<{
    Params: { templateId: string };
  }>('/rooms/templates/:templateId/create', async (req, reply) => {
    const { templateId } = req.params;
    const client = await getDb();
  
    // Get template
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const templates: unknown[] = await (client.db as any)
      .select()
      .from(client.schema.roomTemplates)
      .where(eq(client.schema.roomTemplates.id, templateId));
  
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
  
    const row = {
      id: roomId,
      name: template.name,
      topic: (config.topic || template.description) ?? null,
      status: 'idle' as const,
      turnDelayMs: config.turnDelayMs ?? 2000,
      maxContextMessages: config.maxContextMessages ?? 50,
      createdAt: client.dialect === 'sqlite' ? now.toISOString() : now,
    };
  
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (client.db as any).insert(client.schema.rooms).values(row);
  
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
        const roomAgentRow = {
          roomId,
          agentId: agentConfig.agentId,
          joinedAt: client.dialect === 'sqlite' ? now.toISOString() : now,
          leftAt: null,
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (client.db as any).insert(client.schema.roomAgents).values(roomAgentRow);
      }
    }
  
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows: unknown[] = await (client.db as any)
      .select()
      .from(client.schema.rooms)
      .where(eq(client.schema.rooms.id, roomId));
  
    return reply.status(201).send(rows[0]);
  });
  
  // GET /rooms/:roomId/analytics — get conversation analytics
  fastify.get<{
    Params: { roomId: string };
  }>('/rooms/:roomId/analytics', async (req, reply) => {
    const { roomId } = req.params;
    const client = await getDb();
  
    // Verify room exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const roomRows: unknown[] = await (client.db as any)
      .select()
      .from(client.schema.rooms)
      .where(eq(client.schema.rooms.id, roomId));
  
    if (roomRows.length === 0) {
      return reply.status(404).send({ error: 'Room not found' });
    }
  
    const room = roomRows[0] as { createdAt: string };
  
    // Get all messages for the room
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messageRows: unknown[] = await (client.db as any)
      .select()
      .from(client.schema.messages)
      .where(eq(client.schema.messages.roomId, roomId))
      .orderBy(desc(client.schema.messages.createdAt));
  
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
