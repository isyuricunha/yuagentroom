/**
 * Shared Fastify preHandler hooks for role-based access control.
 */

import type { FastifyRequest, FastifyReply } from 'fastify';

/**
 * PreHandler that verifies the request has a valid JWT and the user has admin role.
 * Use as a preHandler on admin-only routes.
 *
 * @example
 * ```ts
 * fastify.get('/admin/resource', { preHandler: [requireAdmin] }, async (req) => {
 *   // req.user is guaranteed to have userId and role
 * });
 * ```
 */
export async function requireAdmin(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    const payload = await req.jwtVerify<{ userId: string; role?: string }>();
    if (payload.role !== 'admin') {
      return reply.status(403).send({ error: 'Admin access required' });
    }
    // Attach userId to request for downstream use
    (req as FastifyRequest & { userId: string }).userId = payload.userId;
  } catch {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
}

/**
 * PreHandler that verifies the request has a valid JWT.
 * Use as a preHandler on authenticated (but not necessarily admin) routes.
 */
export async function requireAuth(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    await req.jwtVerify();
  } catch {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
}
