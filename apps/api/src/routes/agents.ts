import type { FastifyPluginAsync } from 'fastify';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import { getDb } from '../db/index.js';

const agentsPlugin: FastifyPluginAsync = async (fastify) => {
  // GET /agents — list all agents
  fastify.get('/agents', async (_req, reply) => {
    const client = await getDb();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const agents: unknown[] = await (client.db as any)
      .select()
      .from(client.schema.agents)
      .orderBy(client.schema.agents.createdAt);
    return reply.send(agents);
  });

  // POST /agents — create agent
  fastify.post<{
    Body: {
      name: string;
      systemPrompt: string;
      model: string;
      reasoningEffort?: 'none' | 'low' | 'medium' | 'high';
      providerUrl?: string;
      apiKey?: string;
    };
  }>('/agents', async (req, reply) => {
    const { name, systemPrompt, model, reasoningEffort, providerUrl, apiKey } = req.body;

    if (!name || !systemPrompt || !model) {
      return reply.status(400).send({ error: 'Missing required fields: name, systemPrompt, model' });
    }

    const client = await getDb();
    const id = randomUUID();
    const now = new Date();

    const row = {
      id,
      name,
      systemPrompt,
      model,
      reasoningEffort: reasoningEffort || 'none',
      providerUrl: providerUrl || '',
      apiKey: apiKey || '',
      createdAt: client.dialect === 'sqlite' ? now.toISOString() : now,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (client.db as any).insert(client.schema.agents).values(row);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await (client.db as any)
      .select()
      .from(client.schema.agents)
      .where(eq(client.schema.agents.id, id));

    return reply.status(201).send(rows[0]);
  });

  // PATCH /agents/:id — partial update
  fastify.patch<{
    Params: { id: string };
    Body: {
      name?: string;
      systemPrompt?: string;
      model?: string;
      reasoningEffort?: 'none' | 'low' | 'medium' | 'high';
      providerUrl?: string;
      apiKey?: string;
    };
  }>('/agents/:id', async (req, reply) => {
    const { id } = req.params;
    const client = await getDb();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing: any[] = await (client.db as any)
      .select()
      .from(client.schema.agents)
      .where(eq(client.schema.agents.id, id));

    if (existing.length === 0) {
      return reply.status(404).send({ error: 'Agent not found' });
    }

    const updates: Record<string, any> = {};
    const { name, systemPrompt, model, reasoningEffort, providerUrl, apiKey } = req.body;
    if (name !== undefined) updates['name'] = name;
    if (systemPrompt !== undefined) updates['systemPrompt'] = systemPrompt;
    if (model !== undefined) updates['model'] = model;
    if (reasoningEffort !== undefined) updates['reasoningEffort'] = reasoningEffort;
    if (providerUrl !== undefined) updates['providerUrl'] = providerUrl;
    if (apiKey !== undefined) updates['apiKey'] = apiKey;

    if (Object.keys(updates).length === 0) {
      return reply.send(existing[0]);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (client.db as any)
      .update(client.schema.agents)
      .set(updates)
      .where(eq(client.schema.agents.id, id));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updated: unknown[] = await (client.db as any)
      .select()
      .from(client.schema.agents)
      .where(eq(client.schema.agents.id, id));

    return reply.send(updated[0]);
  });

  // DELETE /agents/:id
  fastify.delete<{ Params: { id: string } }>('/agents/:id', async (req, reply) => {
    const { id } = req.params;
    const client = await getDb();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing: unknown[] = await (client.db as any)
      .select()
      .from(client.schema.agents)
      .where(eq(client.schema.agents.id, id));

    if (existing.length === 0) {
      return reply.status(404).send({ error: 'Agent not found' });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (client.db as any)
      .delete(client.schema.agents)
      .where(eq(client.schema.agents.id, id));

    return reply.status(204).send();
  });
};

export default agentsPlugin;
