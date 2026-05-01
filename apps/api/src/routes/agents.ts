import type { FastifyPluginAsync } from 'fastify';
import { randomUUID } from 'crypto';
import { eq, desc } from 'drizzle-orm';
import { getDb } from '../db/index.js';

async function getGlobalSettings() {
  const client = await getDb();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const records: { key: string; value: string }[] = await (client.db as any).select().from(client.schema.settings);
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
  };
  }>('/agents', async (req, reply) => {
  const { name, systemPrompt, model } = req.body;
  
  if (!name || !systemPrompt || !model) {
  return reply.status(400).send({ error: 'Missing required fields: name, systemPrompt, model' });
  }
  
  // Get global settings for provider URL and API key
  const settings = await getGlobalSettings();
  const globalProviderUrl = settings.global_provider_url || '';
  const globalApiKey = settings.global_api_key || '';
  
  const client = await getDb();
  const id = randomUUID();
  const now = new Date();
  
  const row = {
  id,
  name,
  systemPrompt,
  model,
  reasoningEffort: 'none',
  providerUrl: globalProviderUrl,
  apiKey: globalApiKey,
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
  const { name, systemPrompt, model } = req.body;
  if (name !== undefined) updates['name'] = name;
  if (systemPrompt !== undefined) updates['systemPrompt'] = systemPrompt;
  if (model !== undefined) updates['model'] = model;
  
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
  
  // GET /agents/templates — list all available templates
  fastify.get('/agents/templates', async (_req, reply) => {
    const client = await getDb();
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const templates: unknown[] = await (client.db as any)
      .select()
      .from(client.schema.agentTemplates)
      .orderBy(desc(client.schema.agentTemplates.isDefault));
    
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const templates: unknown[] = await (client.db as any)
      .select()
      .from(client.schema.agentTemplates)
      .where(eq(client.schema.agentTemplates.id, templateId));
  
    if (templates.length === 0) {
      return reply.status(404).send({ error: 'Template not found' });
    }
  
    const template = templates[0] as {
      name: string;
      description: string;
      systemPrompt: string;
      model: string;
      temperature: number;
      maxTokens: number;
    };
  
    // Get global settings for provider URL and API key
    const settings = await getGlobalSettings();
    const globalProviderUrl = settings.global_provider_url || '';
    const globalApiKey = settings.global_api_key || '';
  
    const id = randomUUID();
    const now = new Date();
  
    const row = {
      id,
      name: name || template.name,
      systemPrompt: template.systemPrompt,
      model: model || template.model,
      reasoningEffort: 'none' as const,
      providerUrl: globalProviderUrl,
      apiKey: globalApiKey,
      createdAt: client.dialect === 'sqlite' ? now.toISOString() : now,
    };
  
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (client.db as any).insert(client.schema.agents).values(row);
  
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows: unknown[] = await (client.db as any)
      .select()
      .from(client.schema.agents)
      .where(eq(client.schema.agents.id, id));
  
    return reply.status(201).send(rows[0]);
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
