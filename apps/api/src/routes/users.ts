import type { FastifyPluginAsync } from 'fastify';
import { getDb } from '../db/index.js';
import { eq } from 'drizzle-orm';

const usersPlugin: FastifyPluginAsync = async (fastify) => {
  // GET /users - list all users (admin only)
  fastify.get('/users', async (req, reply) => {
    try {
      const payload = await req.jwtVerify<{ userId: string; role?: string }>();
      
      // Check admin role
      if (payload.role !== 'admin') {
        return reply.status(403).send({ error: 'Admin access required' });
      }
      
      const client = await getDb();
      const users = await (client.db as any)
        .select()
        .from(client.schema.users);
      
      return reply.send(
        users.map((user: any) => ({
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt
        }))
      );
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
  });

  // PATCH /users/:id - update user role (admin only)
  fastify.patch<{ Params: { id: string }; Body: { role: 'admin' | 'user' } }>('/users/:id', async (req, reply) => {
    try {
      const payload = await req.jwtVerify<{ userId: string; role?: string }>();
      
      // Check admin role
      if (payload.role !== 'admin') {
        return reply.status(403).send({ error: 'Admin access required' });
      }
      
      const { id } = req.params;
      const { role } = req.body;
      
      if (!role || (role !== 'admin' && role !== 'user')) {
        return reply.status(400).send({ error: 'Invalid role' });
      }
      
      const client = await getDb();
      const [user] = await (client.db as any)
        .update(client.schema.users)
        .set({ role })
        .where(eq(client.schema.users.id, id))
        .returning();
      
      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }
      
      return reply.send({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      });
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
  });

  // DELETE /users/:id - delete user (admin only)
  fastify.delete<{ Params: { id: string } }>('/users/:id', async (req, reply) => {
    try {
      const payload = await req.jwtVerify<{ userId: string; role?: string }>();
      
      // Check admin role
      if (payload.role !== 'admin') {
        return reply.status(403).send({ error: 'Admin access required' });
      }
      
      const { id } = req.params;
      
      // Prevent self-deletion
      if (id === payload.userId) {
        return reply.status(400).send({ error: 'Cannot delete yourself' });
      }
      
      const client = await getDb();
      const [user] = await (client.db as any)
        .delete(client.schema.users)
        .where(eq(client.schema.users.id, id))
        .returning();
      
      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }
      
      return reply.status(204).send();
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
  });
};

export default usersPlugin;