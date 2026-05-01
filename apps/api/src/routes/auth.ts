import type { FastifyPluginAsync } from 'fastify';
import { getDb } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { readEnv } from '../utils/env.js';

// Rate limiting store for auth attempts
const loginAttempts = new Map<string, { count: number; firstAttempt: number }>();
const CLEANUP_INTERVAL = 60000; // Clean up every minute
const MAX_ATTEMPTS = 5; // Max attempts per window
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes window
const BAN_MS = 15 * 60 * 1000; // 15 minutes ban

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of loginAttempts.entries()) {
    if (now - data.firstAttempt > WINDOW_MS + BAN_MS) {
      loginAttempts.delete(key);
    }
  }
}, CLEANUP_INTERVAL);

function checkRateLimit(identifier: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const record = loginAttempts.get(identifier);
  
  if (!record) {
    return { allowed: true, remaining: MAX_ATTEMPTS - 1, resetIn: WINDOW_MS };
  }
  
  // If banned, check if ban has expired
  const banEndTime = record.firstAttempt + WINDOW_MS + BAN_MS;
  if (now > banEndTime) {
    loginAttempts.delete(identifier);
    return { allowed: true, remaining: MAX_ATTEMPTS - 1, resetIn: WINDOW_MS };
  }
  
  // Check if within window
  const windowEnd = record.firstAttempt + WINDOW_MS;
  if (now > windowEnd) {
    // Window expired, reset
    loginAttempts.set(identifier, { count: 1, firstAttempt: now });
    return { allowed: true, remaining: MAX_ATTEMPTS - 1, resetIn: WINDOW_MS };
  }
  
  // Within window, check count
  if (record.count >= MAX_ATTEMPTS) {
    return { allowed: false, remaining: 0, resetIn: banEndTime - now };
  }
  
  return { allowed: true, remaining: MAX_ATTEMPTS - record.count - 1, resetIn: windowEnd - now };
}

function recordLoginAttempt(identifier: string, success: boolean): void {
  const now = Date.now();
  if (success) {
    loginAttempts.delete(identifier);
    return;
  }
  
  const record = loginAttempts.get(identifier);
  if (!record) {
    loginAttempts.set(identifier, { count: 1, firstAttempt: now });
  } else {
    record.count++;
  }
}

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

  // POST /auth/login - User login
  fastify.post<{
    Body: { username?: string; email?: string; password?: string };
  }>('/auth/login', async (req, reply) => {
    const { username, email, password } = req.body;
    const identifier = username || email;

    if (!identifier || !password) {
      return reply.status(400).send({ error: 'Username/email and password required' });
    }

    // Check rate limit
    const rateLimit = checkRateLimit(identifier);
    if (!rateLimit.allowed) {
      return reply.status(429).send({ error: 'Too many login attempts. Please try again later.' });
    }

    const client = await getDb();

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
      recordLoginAttempt(identifier, false);
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    // Update last login
    const now = new Date().toISOString();
    await (client.db as any)
      .update(client.schema.users)
      .set({ lastLoginAt: now })
      .where(eq(client.schema.users.id, user.id));

    // Record successful login
    recordLoginAttempt(identifier, true);

    // Check if this is the user's first login
    const isFirstLogin = user.firstLogin === 1;

    const token = fastify.jwt.sign(
      { userId: user.id, role: user.role },
      { expiresIn: '30d' }
    );

    return reply.send({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        firstLogin: isFirstLogin,
      },
    });
  });

  // POST /auth/register - User registration (if enabled)
  fastify.post<{
    Body: { username?: string; email?: string; password?: string };
  }>('/auth/register', async (req, reply) => {
    const { username, email, password } = req.body;

    if (!env.ALLOW_REGISTRATION) {
      return reply.status(403).send({ error: 'Registration is disabled' });
    }

    if (!username || !email || !password) {
      return reply.status(400).send({ error: 'Username, email, and password required' });
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
    return reply.status(400).send({ error: 'Invalid email format' });
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
        firstLogin: 1, // First login is always required
      })
      .returning();

    const token = fastify.jwt.sign(
      { userId: user.id, role: user.role },
      { expiresIn: '30d' }
    );

    return reply.status(201).send({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        firstLogin: true,
      },
    });
  });

  // POST /auth/logout - User logout
  fastify.post('/auth/logout', async (_req, reply) => {
    return reply.send({ message: 'Logged out successfully' });
  });

  // GET /auth/me - Get current user
  fastify.get('/auth/me', async (req, reply) => {
    try {
      const payload = await req.jwtVerify<{ userId: string; role?: string }>();

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

      return reply.send({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt,
          firstLogin: user.firstLogin === 1,
        },
      });
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
  });

  // GET /auth/status - Get auth status (simplified - no more legacy mode)
  fastify.get('/auth/status', async (_req, reply) => {
    const client = await getDb();
    const userCount = await (client.db as any)
      .select()
      .from(client.schema.users)
      .limit(1);
    const hasUsers = userCount.length > 0;

    return reply.send({
      hasUsers,
      // Legacy mode is always false now - we have a default admin user
      legacyMode: false,
    });
  });

  // GET /auth/verify - Verify JWT token
  fastify.get('/auth/verify', async (req, reply) => {
    try {
      await req.jwtVerify();
      return reply.send({ ok: true });
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
  });

  // POST /auth/first-login - Change password on first login (mandatory)
  fastify.post<{
    Body: { newPassword: string };
  }>('/auth/first-login', async (req, reply) => {
    try {
      const payload = await req.jwtVerify<{ userId: string; role?: string }>();
      const { newPassword } = req.body;

      if (!newPassword || newPassword.length < 8) {
        return reply.status(400).send({ error: 'Password must be at least 8 characters' });
      }

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

      // Verify that this is actually a first login
      if (user.firstLogin !== 1) {
        return reply.status(400).send({ error: 'This endpoint is only for first login password change' });
      }

      const passwordHash = await hashPassword(newPassword);
      const now = new Date().toISOString();

      await (client.db as any)
        .update(client.schema.users)
        .set({
          passwordHash,
          firstLogin: 0,
          firstLoginAt: now,
        })
        .where(eq(client.schema.users.id, payload.userId));

      return reply.send({ success: true, message: 'Password changed successfully' });
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
  });
};

export default authPlugin;