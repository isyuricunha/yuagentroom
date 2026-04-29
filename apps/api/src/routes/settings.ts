import type { FastifyPluginAsync } from 'fastify';
import { getDb } from '../db/index.js';

const settingsPlugin: FastifyPluginAsync = async (fastify) => {
  // GET /settings - get all user settings as an object
  fastify.get('/settings', async (_req, reply) => {
    const client = await getDb();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const records = await (client.db as any).select().from(client.schema.settings);
    
    // Convert array of {key, value} to Object
    const settings: Record<string, string> = {};
    for (const record of (records as {key: string, value: string}[])) {
      settings[record.key] = record.value;
    }
    
    return reply.send(settings);
  });

  // PUT /settings - upsert multiple keys
  fastify.put<{ Body: Record<string, string> }>('/settings', async (req, reply) => {
    const payload = req.body;
    const client = await getDb();
    
    for (const [key, value] of Object.entries(payload)) {
      if (client.dialect === 'sqlite') {
        // SQLite upsert
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (client.db as any).insert(client.schema.settings).values({ key, value }).onConflictDoUpdate({
          target: client.schema.settings.key,
          set: { value },
        });
      } else {
        // Postgres upsert
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (client.db as any).insert(client.schema.settings).values({ key, value }).onConflictDoUpdate({
          target: client.schema.settings.key,
          set: { value },
        });
      }
    }
    
    return reply.send({ success: true });
  });

  // GET /settings/models - get list of models (cached or fresh)
  fastify.get<{ Querystring: { refresh?: string } }>('/settings/models', async (req, reply) => {
    const refresh = req.query.refresh === 'true';
    const client = await getDb();
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const records: {key:string, value:string}[] = await (client.db as any).select().from(client.schema.settings);
    
    const settings: Record<string, string> = {};
    for (const r of records) settings[r.key] = r.value;
    
    if (!refresh && settings['cached_models']) {
      try {
        const cached = JSON.parse(settings['cached_models']);
        return reply.send(cached);
      } catch {
        // Drop malformed
      }
    }
    
    const providerUrl = settings['global_provider_url'];
    const apiKey = settings['global_api_key'];
    
    if (!providerUrl) {
      return reply.status(400).send({ error: 'Global Provider URL not configured. Cannot strictly fetch models.' });
    }
    
    try {
      // Normalize URL to prevent /v1/v1/models
      const normalizedUrl = providerUrl.replace(/\/v1\/?$/, '').replace(/\/+$/, '');
      const endpoint = `${normalizedUrl}/v1/models`;

      const res = await fetch(endpoint, {
        headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {}
      });
      
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      const rawText = await res.text();
      let data: any;
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error(`Provider returned invalid JSON: ${rawText.slice(0, 100)}...`);
      }
      
      if (!data || !Array.isArray(data.data)) {
        throw new Error('Invalid format returned from Provider (expected { data: [{id: ...}] })');
      }
      
      const models = data.data.map((m: any) => m.id as string).sort((a: string, b: string) => a.localeCompare(b));
      
      // Save cache
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (client.db as any).insert(client.schema.settings).values({ key: 'cached_models', value: JSON.stringify(models) }).onConflictDoUpdate({
        target: client.schema.settings.key,
        set: { value: JSON.stringify(models) },
      });
      
      return reply.send(models);
    } catch (err) {
      console.error('Failed to fetch models:', err);
      // Fallback: return what we had, or an empty array
      if (settings['cached_models']) {
        return reply.send(JSON.parse(settings['cached_models']));
      }
      return reply.status(500).send({ error: 'Failed to fetch models explicitly and no cache available.', details: err instanceof Error ? err.message : String(err) });
    }
  });
};

export default settingsPlugin;
