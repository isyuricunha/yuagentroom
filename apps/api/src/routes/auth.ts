import type { FastifyPluginAsync } from 'fastify';

const authPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Body: { password?: string } }>('/auth/login', async (req, reply) => {
    const { password } = req.body;
    
    // Fallback: If no password is set in the environment, everything is considered authenticated (dev mode)
    const masterPassword = process.env.ADMIN_PASSWORD;
    if (!masterPassword) {
      const token = fastify.jwt.sign({ access: true });
      return reply.send({ token });
    }

    if (password === masterPassword) {
      // 30 days token
      const token = fastify.jwt.sign({ access: true }, { expiresIn: '30d' });
      return reply.send({ token });
    }

    return reply.status(401).send({ error: 'Unauthorized: Incorrect password' });
  });

  fastify.get('/auth/verify', async (req, reply) => {
    try {
      await req.jwtVerify();
      return reply.send({ ok: true });
    } catch (err) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
  });
};

export default authPlugin;
