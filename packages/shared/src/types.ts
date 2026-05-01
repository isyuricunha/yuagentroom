export type RoomStatus = 'idle' | 'running' | 'paused';

export type MessageRole = 'agent' | 'human' | 'system';

export interface Agent {
  id: string;
  name: string;
  systemPrompt: string;
  model: string;
  providerUrl: string;
  apiKey: string;
  reasoningEffort?: 'none' | 'low' | 'medium' | 'high';
  createdAt: string;
}

export interface Room {
  id: string;
  name: string;
  topic: string | null;
  status: RoomStatus;
  turnDelayMs: number;
  maxContextMessages: number;
  createdAt: string;
}

export interface RoomAgent {
  roomId: string;
  agentId: string;
  joinedAt: string;
  leftAt: string | null;
}

export interface Message {
  id: string;
  roomId: string;
  agentId: string | null;
  role: MessageRole;
  content: string;
  createdAt: string;
}

export interface RoomWithAgents extends Room {
  agents: Agent[];
}

export interface SettingsRecord {
  key: string;
  value: string;
}

export interface Settings {
  global_provider_url?: string;
  global_api_key?: string;
  cached_models?: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: string;
  lastLoginAt?: string;
  firstLogin?: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface CreateAgentInput {
name: string;
systemPrompt: string;
model: string;
}

export interface CreateRoomInput {
  name: string;
  topic?: string;
  turnDelayMs?: number;
  maxContextMessages?: number;
}
