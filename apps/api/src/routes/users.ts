import type { FastifyPluginAsync } from 'fastify';
import { getDb } from '../db/index.js';
import { eq } from 'drizzle-orm';

const usersPlugin: FastifyPluginAsync = async (fastify) => {
  // Middleware to check if user is admin
  fastify.addHook('preHandler', async (req, reply) => {
    try {
      const payload = await req.jwtVerify<{ userId: string; role: string }>();
      if (payload.role !== 'admin') {
        return reply.status(403).send({ error: 'Admin access required' });
      }
      // Attach user info to request for later use
      (req as any).auth = payload;
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
  });

  // GET /users - List all users (admin only)
  fastify.get('/users', async (_req, reply) => {
    const client = await getDb();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const users = await (client.db as any)
      .select({
        id: client.schema.users.id,
        username: client.schema.users.username,
        email: client.schema.users.email,
        role: client.schema.users.role,
        createdAt: client.schema.users.createdAt,
        lastLoginAt: client.schema.users.lastLoginAt,
      })
      .from(client.schema.users)
      .orderBy(client.schema.users.createdAt);

    return reply.send(users);
  });

  // PATCH /users/:id - Update user role (admin only)
  fastify.patch<{
    Params: { id: string };
    Body: { role: 'admin' | 'user' };
  }>('/users/:id', async (req, reply) => {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || (role !== 'admin' && role !== 'user')) {
      return reply.status(400).send({ error: 'Invalid role. Must be "admin" or "user"' });
    }

    const client = await getDb();

    // Check if user exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing = await (client.db as any)
      .select()
      .from(client.schema.users)
      .where(eq(client.schema.users.id, id));

    if (existing.length === 0) {
      return reply.status(404).send({ error: 'User not found' });
    }

    // Prevent admin from removing their own admin role if they're the only admin
    if (existing[0].role === 'admin' && role === 'user') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const adminCount = await (client.db as any)
        .select()
        .from(client.schema.users)
        .where(eq(client.schema.users.role, 'admin'));

      if (adminCount.length <= 1) {
        return reply.status(400).send({ error: 'Cannot remove admin role - at least one admin must remain' });
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (client.db as any)
      .update(client.schema.users)
      .set({ role })
      .where(eq(client.schema.users.id, id));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updated = await (client.db as any)
      .select({
        id: client.schema.users.id,
        username: client.schema.users.username,
        email: client.schema.users.email,
        role: client.schema.users.role,
        createdAt: client.schema.users.createdAt,
        lastLoginAt: client.schema.users.lastLoginAt,
      })
      .from(client.schema.users)
      .where(eq(client.schema.users.id, id));

    return reply.send(updated[0]);
  });

  // DELETE /users/:id - Delete user (admin only)
  fastify.delete<{ Params: { id: string } }>('/users/:id', async (req, reply) => {
    const { id } = req.params;
    const client = await getDb();

    // Check if user exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing = await (client.db as any)
      .select()
      .from(client.schema.users)
      .where(eq(client.schema.users.id, id));

    if (existing.length === 0) {
      return reply.status(404).send({ error: 'User not found' });
    }

    // Prevent deletion of the only admin
    if (existing[0].role === 'admin') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const adminCount = await (client.db as any)
        .select()
        .from(client.schema.users)
        .where(eq(client.schema.users.role, 'admin'));

      if (adminCount.length <= 1) {
        return reply.status(400).send({ error: 'Cannot delete the last admin user' });
      }
    }

    // Delete user
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (client.db as any)
      .delete(client.schema.users)
      .where(eq(client.schema.users.id, id));

    return reply.status(204).send();
  });
};

export default usersPlugin;