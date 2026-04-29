import type { FastifyPluginAsync } from 'fastify';
import { getDb } from '../db/index.js';
import { readEnv } from '../utils/env.js';
import { eq } from 'drizzle-orm';

async function hashPassword(password: string): Promise<string> {
  const { default: bcrypt } = await import('bcryptjs');
  return bcrypt.hash(password, 10);
}

async function comparePassword(password: string, hash: string): Promise<boolean> {
  const { default: bcrypt } = await import('bcryptjs');
  return bcrypt.compare(password, hash);
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  const env = readEnv();

  fastify.post<{
    Body: { username?: string; email?: string; password?: string }
  }>('/auth/login', async (req, reply) => {
    const { username, email, password } = req.body;
    const identifier = username || email;

    if (!identifier || !password) {
      return reply.status(400).send({ error: 'Username/email and password required' });
    }

    const client = await getDb();

    // Fallback: If no users exist and ADMIN_PASSWORD is set, use legacy auth
    if (env.ADMIN_PASSWORD) {
      const users = await (client.db as any)
        .select()
        .from(client.schema.users)
        .limit(1);

      if (users.length === 0 && password === env.ADMIN_PASSWORD) {
        const token = fastify.jwt.sign({ access: true });
        return reply.send({ token });
      }
    }

    const users = await (client.db as any)
      .select()
      .from(client.schema.users)
      .where(eq(client.schema.users.username, identifier))
      .limit(1);

    let user = users[0];

    // Try email if username not found
    if (!user) {
      const emailUsers = await (client.db as any)
        .select()
        .from(client.schema.users)
        .where(eq(client.schema.users.email, identifier))
        .limit(1);
      user = emailUsers[0];
    }

    if (!user || !(await comparePassword(password, user.passwordHash))) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    // Update last login
    const now = new Date().toISOString();
    await (client.db as any)
      .update(client.schema.users)
      .set({ lastLoginAt: now })
      .where(eq(client.schema.users.id, user.id));

    const token = fastify.jwt.sign({ userId: user.id, role: user.role }, { expiresIn: '30d' });
    return reply.send({ token, user: { id: user.id, username: user.username, email: user.email, role: user.role, createdAt: user.createdAt } });
  });

  fastify.post<{
    Body: { username?: string; email?: string; password?: string }
  }>('/auth/register', async (req, reply) => {
    const { username, email, password } = req.body;

    if (!env.ALLOW_REGISTRATION) {
      return reply.status(403).send({ error: 'Registration is disabled' });
    }

    if (!username || !email || !password) {
      return reply.status(400).send({ error: 'Username, email, and password required' });
    }

    if (password.length < 8) {
      return reply.status(400).send({ error: 'Password must be at least 8 characters' });
    }

    const client = await getDb();

    // Check if any users exist (first user becomes admin)
    const existingUsers = await (client.db as any)
      .select()
      .from(client.schema.users)
      .limit(1);
    const isFirstUser = existingUsers.length === 0;

    const passwordHash = await hashPassword(password);
    const now = new Date().toISOString();
    const userId = crypto.randomUUID();

    const [user] = await (client.db as any)
      .insert(client.schema.users)
      .values({
        id: userId,
        username,
        email,
        passwordHash,
        role: isFirstUser ? 'admin' : 'user',
        createdAt: now,
      })
      .returning();

    const token = fastify.jwt.sign({ userId: user.id, role: user.role }, { expiresIn: '30d' });
    return reply.status(201).send({ token, user: { id: user.id, username: user.username, email: user.email, role: user.role, createdAt: user.createdAt } });
  });

  fastify.post('/auth/logout', async (_req, reply) => {
    return reply.send({ message: 'Logged out successfully' });
  });

  fastify.get('/auth/me', async (req, reply) => {
    try {
      const payload = await req.jwtVerify<{ userId: string }>();
      const client = await getDb();
      const users = await (client.db as any)
        .select()
        .from(client.schema.users)
        .where(eq(client.schema.users.id, payload.userId))
        .limit(1);

      const user = users[0];
      if (!user) {
        return reply.status(401).send({ error: 'User not found' });
      }

      return reply.send({ user: { id: user.id, username: user.username, email: user.email, role: user.role, createdAt: user.createdAt } });
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
  });

  fastify.get('/auth/verify', async (req, reply) => {
    try {
      await req.jwtVerify();
      return reply.send({ ok: true });
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
  });
};

export default authPlugin;