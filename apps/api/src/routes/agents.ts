import type { FastifyPluginAsync } from 'fastify';
import { randomUUID } from 'crypto';
import { getDb } from '../db/index.js';
import { dbSelect, dbInsert, dbUpdate, dbDelete, eq, desc, dialectDate } from '../db/db-helpers.js';

async function getGlobalSettings() {
  const client = await getDb();
  const records = await dbSelect(client, client.schema.settings);
  const settings: Record<string, string> = {};
  for (const record of records) {
    settings[record.key] = record.value;
  }
  return settings;
}

const agentsPlugin: FastifyPluginAsync = async (fastify) => {
  // GET /agents — list all agents
  fastify.get('/agents', async (_req, reply) => {
    const client = await getDb();
    const agents = await dbSelect(client, client.schema.agents, {
      orderBy: desc(client.schema.agents.createdAt),
    });
    return reply.send(agents);
  });

  // POST /agents — create agent
  fastify.post<{
    Body: {
      name: string;
      systemPrompt: string;
      model: string;
    };
  }>('/agents', async (req, reply) => {
    const { name, systemPrompt, model } = req.body;

    if (!name || !systemPrompt || !model) {
      return reply.status(400).send({ error: 'Missing required fields: name, systemPrompt, model' });
    }

    // Get global settings for provider URL and API key
    const settings = await getGlobalSettings();
    const globalProviderUrl = settings['global_provider_url'] || '';
    const globalApiKey = settings['global_api_key'] || '';

    const client = await getDb();
    const id = randomUUID();
    const now = new Date();

    await dbInsert(client, client.schema.agents, {
      id,
      name,
      systemPrompt,
      model,
      reasoningEffort: 'none',
      providerUrl: globalProviderUrl,
      apiKey: globalApiKey,
      createdAt: dialectDate(client, now),
    } as any);

    const rows = await dbSelect(client, client.schema.agents, {
      where: eq(client.schema.agents.id, id),
    });

    return reply.status(201).send(rows[0]);
  });

  // PATCH /agents/:id — partial update
  fastify.patch<{
    Params: { id: string };
    Body: {
      name?: string;
      systemPrompt?: string;
      model?: string;
    };
  }>('/agents/:id', async (req, reply) => {
    const { id } = req.params;
    const client = await getDb();

    const existing = await dbSelect(client, client.schema.agents, {
      where: eq(client.schema.agents.id, id),
    });

    if (existing.length === 0) {
      return reply.status(404).send({ error: 'Agent not found' });
    }

    const updates: Record<string, unknown> = {};
    const { name, systemPrompt, model } = req.body;
    if (name !== undefined) updates['name'] = name;
    if (systemPrompt !== undefined) updates['systemPrompt'] = systemPrompt;
    if (model !== undefined) updates['model'] = model;

    if (Object.keys(updates).length === 0) {
      return reply.send(existing[0]);
    }

    await dbUpdate(client, client.schema.agents, updates, eq(client.schema.agents.id, id));

    const updated = await dbSelect(client, client.schema.agents, {
      where: eq(client.schema.agents.id, id),
    });

    return reply.send(updated[0]);
  });

  // GET /agents/templates — list all available templates
  fastify.get('/agents/templates', async (_req, reply) => {
    const client = await getDb();

    const templates = await dbSelect(client, client.schema.agentTemplates, {
      orderBy: desc(client.schema.agentTemplates.isDefault),
    });

    return reply.send(templates);
  });

  // POST /agents/templates/:templateId/use — create agent from template
  fastify.post<{
    Params: { templateId: string };
    Body: {
      name?: string;
      model?: string;
      temperature?: number;
      maxTokens?: number;
    };
  }>('/agents/templates/:templateId/use', async (req, reply) => {
    const { templateId } = req.params;
    const { name, model } = req.body;
    const client = await getDb();

    // Get template
    const templates = await dbSelect(client, client.schema.agentTemplates, {
      where: eq(client.schema.agentTemplates.id, templateId),
    });

    if (templates.length === 0) {
      return reply.status(404).send({ error: 'Template not found' });
    }

    const template = templates[0]!;

    // Get global settings for provider URL and API key
    const settings = await getGlobalSettings();
    const globalProviderUrl = settings['global_provider_url'] || '';
    const globalApiKey = settings['global_api_key'] || '';

    const id = randomUUID();
    const now = new Date();

    await dbInsert(client, client.schema.agents, {
      id,
      name: name || template.name,
      systemPrompt: template.systemPrompt,
      model: model || template.model,
      reasoningEffort: 'none',
      providerUrl: globalProviderUrl,
      apiKey: globalApiKey,
      createdAt: dialectDate(client, now),
    } as any);

    const rows = await dbSelect(client, client.schema.agents, {
      where: eq(client.schema.agents.id, id),
    });

    return reply.status(201).send(rows[0]);
  });

  // DELETE /agents/:id
  fastify.delete<{ Params: { id: string } }>('/agents/:id', async (req, reply) => {
    const { id } = req.params;
    const client = await getDb();

    const existing = await dbSelect(client, client.schema.agents, {
      where: eq(client.schema.agents.id, id),
    });

    if (existing.length === 0) {
      return reply.status(404).send({ error: 'Agent not found' });
    }

    await dbDelete(client, client.schema.agents, eq(client.schema.agents.id, id));

    return reply.status(204).send();
  });
};

export default agentsPlugin;
