import Fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import fastifyFormbody from '@fastify/formbody';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readEnv } from './utils/env.js';
import { getDb } from './db/index.js';
import agentsPlugin from './routes/agents.js';
import roomsPlugin from './routes/rooms.js';
import settingsPlugin from './routes/settings.js';
import authPlugin from './routes/auth.js';
import usersPlugin from './routes/users.js';
import { createWsHandler, broadcast } from './ws/handler.js';
import { getRoomRunner } from './engine/room-runner.js';

// Load .env from project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '../../../.env') });

async function hashPassword(password: string): Promise<string> {
  const { default: bcrypt } = await import('bcryptjs');
  return bcrypt.hash(password, 10);
}

async function createDefaultAdminUser(dbClient: Awaited<ReturnType<typeof getDb>>): Promise<void> {
  const existingUsers = await (dbClient.db as any)
    .select()
    .from(dbClient.schema.users)
    .limit(1);

  if (existingUsers.length > 0) {
    return; // Users already exist
  }

  // Create default admin user with username "admin" and password "admin"
  const adminPasswordHash = await hashPassword('admin');
  const now = new Date().toISOString();
  const adminId = crypto.randomUUID();

  await (dbClient.db as any)
    .insert(dbClient.schema.users)
    .values({
      id: adminId,
      username: 'admin',
      email: 'admin@localhost',
      passwordHash: adminPasswordHash,
      role: 'admin',
      createdAt: now,
      firstLogin: 1, // Require first login password change
    });

  console.log('Default admin user created (username: admin, password: admin)');
}

async function main(): Promise<void> {
  const env = readEnv();

  // Initialize DB (creates tables if needed)
  const dbClient = await getDb();

  // Create default admin user if none exists
  await createDefaultAdminUser(dbClient);

  // Initialize the room runner with the broadcast function
  getRoomRunner(broadcast);

  // Always require auth now since we have a default admin user
  const app = Fastify({ logger: true });

  // CORS — allow all origins (frontend on different port in dev)
  app.addHook('onRequest', async (_req, reply) => {
    void reply.header('Access-Control-Allow-Origin', '*');
    void reply.header('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
    void reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  });

  // Body parser for JSON
  await app.register(fastifyFormbody);

  // Setup JWT - Uses Authorization: Bearer header by default
  await app.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || 'super-secret-agentroom-key-998877',
    // No cookie config - reads from Authorization header by default
  });

  // Require Authentication via JWT for API
  // Always require auth now since we have a default admin user
  app.addHook('onRequest', async (req, reply) => {
    if (req.method === 'OPTIONS') return; // Pre-flight
    // Allow unauthenticated access only to health and auth endpoints
    if (req.url === '/health' || req.url.startsWith('/api/auth')) return;

    // For all other routes, require authentication
    try {
      await req.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
  });

  app.addHook('preHandler', async (req, reply) => {
    if (req.method === 'OPTIONS') {
      return reply.status(204).send();
    }
  });

  // REST routes
  await app.register(authPlugin, { prefix: '/api' });
  await app.register(agentsPlugin, { prefix: '/api' });
  await app.register(roomsPlugin, { prefix: '/api' });
  await app.register(settingsPlugin, { prefix: '/api' });
  await app.register(usersPlugin, { prefix: '/api' });

  // Health check
  app.get('/health', async () => ({ status: 'ok' }));

  // Start server
  const address = await app.listen({ port: env.PORT, host: '0.0.0.0' });
  app.log.info(`AgentRoom API listening at ${address}`);

  // Attach WebSocket server to the underlying HTTP server
  createWsHandler(app.server);
}

main().catch((err: unknown) => {
  console.error('Fatal error:', err);
  process.exit(1);
});