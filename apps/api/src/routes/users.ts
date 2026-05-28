import type { FastifyPluginAsync } from 'fastify';
import { getDb } from '../db/index.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { dbSelect, dbUpdate, dbUpdateReturning, dbDelete, eq } from '../db/db-helpers.js';
import { requireAdmin } from './middleware.js';

const usersPlugin: FastifyPluginAsync = async (fastify) => {
  // GET /users - list all users (admin only)
  fastify.get('/users', { preHandler: [requireAdmin] }, async (_req, reply) => {
    const client = await getDb();
    const users = await dbSelect(client, client.schema.users);

    return reply.send(
      users.map((user) => ({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        firstLogin: user.firstLogin === 1,
      }))
    );
  });

  // PATCH /users/:id - update user role (admin only)
  fastify.patch<{ Params: { id: string }; Body: { role: 'admin' | 'user' } }>(
    '/users/:id',
    { preHandler: [requireAdmin] },
    async (req, reply) => {
      const { id } = req.params;
      const { role } = req.body;

      if (!role || (role !== 'admin' && role !== 'user')) {
        return reply.status(400).send({ error: 'Invalid role' });
      }

      const client = await getDb();
      const [user] = await dbUpdateReturning(
        client,
        client.schema.users,
        { role },
        eq(client.schema.users.id, id),
      ) as any;

      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      return reply.send({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      });
    }
  );

  // DELETE /users/:id - delete user (admin only)
  fastify.delete<{ Params: { id: string } }>(
    '/users/:id',
    { preHandler: [requireAdmin] },
    async (req, reply) => {
      const { id } = req.params;
      const userId = (req as any).userId as string;

      // Prevent self-deletion
      if (id === userId) {
        return reply.status(400).send({ error: 'Cannot delete yourself' });
      }

      const client = await getDb();
      const existing = await dbSelect(client, client.schema.users, {
        where: eq(client.schema.users.id, id),
        limit: 1,
      });

      if (existing.length === 0) {
        return reply.status(404).send({ error: 'User not found' });
      }

      await dbDelete(client, client.schema.users, eq(client.schema.users.id, id));

      return reply.status(204).send();
    }
  );

  // POST /users/me/password - Change password (requires current password)
  fastify.post<{ Body: { currentPassword: string; newPassword: string } }>(
    '/users/me/password',
    async (req, reply) => {
      try {
        const payload = await req.jwtVerify<{ userId: string; role?: string }>();
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
          return reply.status(400).send({ error: 'Current password and new password required' });
        }

        if (newPassword.length < 8) {
          return reply.status(400).send({ error: 'New password must be at least 8 characters' });
        }

        const client = await getDb();
        const users = await dbSelect(client, client.schema.users, {
          where: eq(client.schema.users.id, payload.userId),
          limit: 1,
        });

        const user = users[0];
        if (!user) {
          return reply.status(404).send({ error: 'User not found' });
        }

        // Verify current password
        const isValid = await verifyPassword(currentPassword, user.passwordHash);
        if (!isValid) {
          return reply.status(401).send({ error: 'Current password is incorrect' });
        }

        const passwordHash = await hashPassword(newPassword);
        await dbUpdate(
          client,
          client.schema.users,
          { passwordHash },
          eq(client.schema.users.id, payload.userId),
        );

        return reply.send({ success: true, message: 'Password changed successfully' });
      } catch {
        return reply.status(401).send({ error: 'Unauthorized' });
      }
    }
  );

  // POST /users/me/username - Change username
  fastify.post<{ Body: { username: string } }>(
    '/users/me/username',
    async (req, reply) => {
      try {
        const payload = await req.jwtVerify<{ userId: string; role?: string }>();
        const { username } = req.body;

        if (!username || username.length < 3) {
          return reply.status(400).send({ error: 'Username must be at least 3 characters' });
        }

        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
          return reply.status(400).send({ error: 'Username can only contain letters, numbers, and underscores' });
        }

        const client = await getDb();

        // Check if username is already taken
        const existingUsers = await dbSelect(client, client.schema.users, {
          where: eq(client.schema.users.username, username),
          limit: 1,
        });

        // Allow if it's the same user
        if (existingUsers.length > 0 && existingUsers[0]!.id !== payload.userId) {
          return reply.status(400).send({ error: 'Username is already taken' });
        }

        await dbUpdate(
          client,
          client.schema.users,
          { username },
          eq(client.schema.users.id, payload.userId),
        );

        return reply.send({ success: true, message: 'Username changed successfully' });
      } catch {
        return reply.status(401).send({ error: 'Unauthorized' });
      }
    }
  );
};

export default usersPlugin;
