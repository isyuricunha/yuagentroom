import { readEnv } from '../utils/env.js';

import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

export type SqliteSchema = {
  agents: typeof import('./schema.js').agentsSqlite;
  rooms: typeof import('./schema.js').roomsSqlite;
  roomAgents: typeof import('./schema.js').roomAgentsSqlite;
  messages: typeof import('./schema.js').messagesSqlite;
  settings: typeof import('./schema.js').settingsSqlite;
  users: typeof import('./schema.js').usersSqlite;
  agentTemplates: typeof import('./schema.js').agentTemplatesSqlite;
  roomTemplates: typeof import('./schema.js').roomTemplatesSqlite;
  messageReactions: typeof import('./schema.js').messageReactionsSqlite;
  scheduledRooms: typeof import('./schema.js').scheduledRoomsSqlite;
};

export type PgSchema = {
  agents: typeof import('./schema.js').agentsPg;
  rooms: typeof import('./schema.js').roomsPg;
  roomAgents: typeof import('./schema.js').roomAgentsPg;
  messages: typeof import('./schema.js').messagesPg;
  settings: typeof import('./schema.js').settingsPg;
  users: typeof import('./schema.js').usersPg;
  agentTemplates: typeof import('./schema.js').agentTemplatesPg;
  roomTemplates: typeof import('./schema.js').roomTemplatesPg;
  messageReactions: typeof import('./schema.js').messageReactionsPg;
  scheduledRooms: typeof import('./schema.js').scheduledRoomsPg;
};

export type DbClient =
  | { dialect: 'sqlite'; db: BetterSQLite3Database<SqliteSchema>; schema: SqliteSchema }
  | { dialect: 'pg'; db: NodePgDatabase<PgSchema>; schema: PgSchema };

let _client: DbClient | null = null;

export async function getDb(): Promise<DbClient> {
  if (_client) return _client;

  const { DATABASE_URL } = readEnv();

  if (DATABASE_URL.startsWith('sqlite:')) {
    const path = DATABASE_URL.slice('sqlite:'.length);

    const { default: Database } = await import('better-sqlite3');
    const { drizzle } = await import('drizzle-orm/better-sqlite3');
    const schema = await import('./schema.js');
    const fs = await import('fs');
    const pathModule = await import('path');

    const dir = pathModule.dirname(path);
    if (dir !== '.' && !fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const sqlite = new Database(path);
    sqlite.pragma('journal_mode = WAL');

    const sqliteSchema: SqliteSchema = {
      agents: schema.agentsSqlite,
      rooms: schema.roomsSqlite,
      roomAgents: schema.roomAgentsSqlite,
      messages: schema.messagesSqlite,
      settings: schema.settingsSqlite,
      users: schema.usersSqlite,
      agentTemplates: schema.agentTemplatesSqlite,
      roomTemplates: schema.roomTemplatesSqlite,
      messageReactions: schema.messageReactionsSqlite,
      scheduledRooms: schema.scheduledRoomsSqlite,
    };

    const db = drizzle(sqlite, { schema: sqliteSchema });

    // Create tables if they don't exist
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        system_prompt TEXT NOT NULL,
        model TEXT NOT NULL,
        provider_url TEXT NOT NULL,
        api_key TEXT NOT NULL,
        reasoning_effort TEXT NOT NULL DEFAULT 'none',
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS rooms (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        topic TEXT,
        status TEXT NOT NULL DEFAULT 'idle',
        turn_delay_ms INTEGER NOT NULL DEFAULT 2000,
        max_context_messages INTEGER NOT NULL DEFAULT 50,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS room_agents (
        room_id TEXT NOT NULL,
        agent_id TEXT NOT NULL,
        joined_at TEXT NOT NULL,
        left_at TEXT,
        PRIMARY KEY (room_id, agent_id, joined_at)
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        room_id TEXT NOT NULL,
        agent_id TEXT,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS message_reactions (
        id TEXT PRIMARY KEY,
        message_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        emoji TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS scheduled_rooms (
        id TEXT PRIMARY KEY,
        room_id TEXT NOT NULL UNIQUE,
        cron_expression TEXT NOT NULL,
        timezone TEXT NOT NULL DEFAULT 'UTC',
        is_active INTEGER NOT NULL DEFAULT 1,
        last_run TEXT,
        next_run TEXT,
        created_at TEXT NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TEXT NOT NULL,
    last_login_at TEXT,
    first_login INTEGER NOT NULL DEFAULT 1,
    first_login_at TEXT
  );

  CREATE TABLE IF NOT EXISTS agent_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    system_prompt TEXT NOT NULL,
    model TEXT NOT NULL,
    temperature INTEGER NOT NULL DEFAULT 70,
    max_tokens INTEGER NOT NULL DEFAULT 1024,
    is_default INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS room_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    config_json TEXT NOT NULL,
    agent_configs_json TEXT NOT NULL,
    is_default INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );
  `);

  // Migration: Add reasoning_effort to agents if it doesn't exist
  const tableInfo = sqlite.prepare("PRAGMA table_info(agents)").all() as any[];
  const hasReasoningEffort = tableInfo.some((col) => col.name === 'reasoning_effort');
  if (!hasReasoningEffort) {
    sqlite.exec("ALTER TABLE agents ADD COLUMN reasoning_effort TEXT NOT NULL DEFAULT 'none'");
  }

  // Migration: Add first_login to users if it doesn't exist
  const userTableInfo = sqlite.prepare("PRAGMA table_info(users)").all() as any[];
  const hasFirstLogin = userTableInfo.some((col) => col.name === 'first_login');
  if (!hasFirstLogin) {
    sqlite.exec("ALTER TABLE users ADD COLUMN first_login INTEGER NOT NULL DEFAULT 1");
    sqlite.exec("ALTER TABLE users ADD COLUMN first_login_at TEXT");
  }

    _client = { dialect: 'sqlite', db, schema: sqliteSchema };
    return _client;
  }

  // PostgreSQL path
  const { Pool } = await import('pg');
  const { drizzle } = await import('drizzle-orm/node-postgres');
  const schema = await import('./schema.js');

  const pool = new Pool({ connectionString: DATABASE_URL });

  const pgSchema: PgSchema = {
    agents: schema.agentsPg,
    rooms: schema.roomsPg,
    roomAgents: schema.roomAgentsPg,
    messages: schema.messagesPg,
    settings: schema.settingsPg,
    users: schema.usersPg,
    agentTemplates: schema.agentTemplatesPg,
    roomTemplates: schema.roomTemplatesPg,
    messageReactions: schema.messageReactionsPg,
    scheduledRooms: schema.scheduledRoomsPg,
  };

  const db = drizzle(pool, { schema: pgSchema });

  // Ensure tables exist for PostgreSQL
  await pool.query(`
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      system_prompt TEXT NOT NULL,
      model TEXT NOT NULL,
      provider_url TEXT NOT NULL,
      api_key TEXT NOT NULL,
      reasoning_effort TEXT NOT NULL DEFAULT 'none',
      created_at TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      topic TEXT,
      status TEXT NOT NULL DEFAULT 'idle',
      turn_delay_ms INTEGER NOT NULL DEFAULT 2000,
      max_context_messages INTEGER NOT NULL DEFAULT 50,
      created_at TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE IF NOT EXISTS room_agents (
      room_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      joined_at TIMESTAMPTZ NOT NULL,
      left_at TIMESTAMPTZ,
      PRIMARY KEY (room_id, agent_id, joined_at)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      agent_id TEXT,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS message_reactions (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      emoji TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS scheduled_rooms (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL UNIQUE,
      cron_expression TEXT NOT NULL,
      timezone TEXT NOT NULL DEFAULT 'UTC',
      is_active INTEGER NOT NULL DEFAULT 1,
      last_run TIMESTAMPTZ,
      next_run TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ NOT NULL,
    last_login_at TIMESTAMPTZ,
    first_login INTEGER NOT NULL DEFAULT 1,
    first_login_at TIMESTAMPTZ
  );

  CREATE TABLE IF NOT EXISTS agent_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    system_prompt TEXT NOT NULL,
    model TEXT NOT NULL,
    temperature INTEGER NOT NULL DEFAULT 70,
    max_tokens INTEGER NOT NULL DEFAULT 1024,
    is_default INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL
  );

  CREATE TABLE IF NOT EXISTS room_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    config_json TEXT NOT NULL,
    agent_configs_json TEXT NOT NULL,
    is_default INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL
  );
  `);

  // Migration for PG: add column if missing
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='agents' AND column_name='reasoning_effort') THEN
        ALTER TABLE agents ADD COLUMN reasoning_effort TEXT NOT NULL DEFAULT 'none';
      END IF;
    END $$;
  `);

  // Migration for PG: add first_login columns if missing
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='first_login') THEN
        ALTER TABLE users ADD COLUMN first_login INTEGER NOT NULL DEFAULT 1;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='first_login_at') THEN
        ALTER TABLE users ADD COLUMN first_login_at TIMESTAMPTZ;
      END IF;
    END $$;
  `);

  _client = { dialect: 'pg', db, schema: pgSchema };
  return _client;
}