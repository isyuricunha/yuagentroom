/**
 * Drizzle ORM schema for AgentRoom.
 * Supports both SQLite and PostgreSQL via conditional imports.
 * The actual table objects are created in connection.ts after determining the dialect.
 */

export const ROOM_STATUSES = ['idle', 'running', 'paused'] as const;
export const MESSAGE_ROLES = ['agent', 'human', 'system'] as const;

// ─── SQLite schema (used when DATABASE_URL starts with "sqlite:") ──────────

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const agentsSqlite = sqliteTable('agents', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  systemPrompt: text('system_prompt').notNull(),
  model: text('model').notNull(),
  providerUrl: text('provider_url').notNull(),
  apiKey: text('api_key').notNull(),
  reasoningEffort: text('reasoning_effort', { enum: ['none', 'low', 'medium', 'high'] }).notNull().default('none'),
  createdAt: text('created_at').notNull(),
});

export const roomsSqlite = sqliteTable('rooms', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  topic: text('topic'),
  status: text('status', { enum: ROOM_STATUSES }).notNull().default('idle'),
  turnDelayMs: integer('turn_delay_ms').notNull().default(2000),
  maxContextMessages: integer('max_context_messages').notNull().default(50),
  createdAt: text('created_at').notNull(),
});

export const roomAgentsSqlite = sqliteTable('room_agents', {
  roomId: text('room_id').notNull(),
  agentId: text('agent_id').notNull(),
  joinedAt: text('joined_at').notNull(),
  leftAt: text('left_at'),
});

export const messagesSqlite = sqliteTable('messages', {
  id: text('id').primaryKey(),
  roomId: text('room_id').notNull(),
  agentId: text('agent_id'),
  role: text('role', { enum: MESSAGE_ROLES }).notNull(),
  content: text('content').notNull(),
  createdAt: text('created_at').notNull(),
});

export const settingsSqlite = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export const usersSqlite = sqliteTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['admin', 'user'] }).notNull().default('user'),
  createdAt: text('created_at').notNull(),
  lastLoginAt: text('last_login_at'),
  firstLogin: integer('first_login').notNull().default(1),
  firstLoginAt: text('first_login_at'),
});

// ─── PostgreSQL schema ─────────────────────────────────────────────────────

import { pgTable, text as pgText, integer as pgInteger, timestamp } from 'drizzle-orm/pg-core';

export const agentsPg = pgTable('agents', {
  id: pgText('id').primaryKey(),
  name: pgText('name').notNull(),
  systemPrompt: pgText('system_prompt').notNull(),
  model: pgText('model').notNull(),
  providerUrl: pgText('provider_url').notNull(),
  apiKey: pgText('api_key').notNull(),
  reasoningEffort: pgText('reasoning_effort').$type<'none' | 'low' | 'medium' | 'high'>().notNull().default('none'),
  createdAt: timestamp('created_at').notNull(),
});

export const roomsPg = pgTable('rooms', {
  id: pgText('id').primaryKey(),
  name: pgText('name').notNull(),
  topic: pgText('topic'),
  status: pgText('status').$type<'idle' | 'running' | 'paused'>().notNull().default('idle'),
  turnDelayMs: pgInteger('turn_delay_ms').notNull().default(2000),
  maxContextMessages: pgInteger('max_context_messages').notNull().default(50),
  createdAt: timestamp('created_at').notNull(),
});

export const roomAgentsPg = pgTable('room_agents', {
  roomId: pgText('room_id').notNull(),
  agentId: pgText('agent_id').notNull(),
  joinedAt: timestamp('joined_at').notNull(),
  leftAt: timestamp('left_at'),
});

export const messagesPg = pgTable('messages', {
  id: pgText('id').primaryKey(),
  roomId: pgText('room_id').notNull(),
  agentId: pgText('agent_id'),
  role: pgText('role').$type<'agent' | 'human' | 'system'>().notNull(),
  content: pgText('content').notNull(),
  createdAt: timestamp('created_at').notNull(),
});

export const settingsPg = pgTable('settings', {
  key: pgText('key').primaryKey(),
  value: pgText('value').notNull(),
});

export const usersPg = pgTable('users', {
  id: pgText('id').primaryKey(),
  username: pgText('username').notNull().unique(),
  email: pgText('email').notNull().unique(),
  passwordHash: pgText('password_hash').notNull(),
  role: pgText('role').$type<'admin' | 'user'>().notNull().default('user'),
  createdAt: timestamp('created_at').notNull(),
  lastLoginAt: timestamp('last_login_at'),
  firstLogin: pgInteger('first_login').notNull().default(1),
  firstLoginAt: timestamp('first_login_at'),
});
