import type { Agent, Room, Message, RoomWithAgents } from '@agentroom/shared';

const BASE = '/api';

async function request<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const headers = new Headers(options?.headers);
  if (options?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const token = localStorage.getItem('agentroom_token');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 204) return undefined as T;

  const data: unknown = await res.json();

  if (!res.ok) {
    const err = data as { error?: string };
    throw new Error(err.error ?? `Request failed: ${res.status}`);
  }

  return data as T;
}

// ─── Agents ──────────────────────────────────────────────────────────────

export async function listAgents(): Promise<Agent[]> {
  return request<Agent[]>('/agents');
}

export interface CreateAgentInput {
  name: string;
  systemPrompt: string;
  model: string;
  reasoningEffort?: 'none' | 'low' | 'medium' | 'high';
  providerUrl: string;
  apiKey: string;
}

export async function createAgent(input: CreateAgentInput): Promise<Agent> {
  return request<Agent>('/agents', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateAgent(
  id: string,
  input: Partial<CreateAgentInput>,
): Promise<Agent> {
  return request<Agent>(`/agents/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function deleteAgent(id: string): Promise<void> {
  return request<void>(`/agents/${id}`, { method: 'DELETE' });
}

// ─── Rooms ───────────────────────────────────────────────────────────────

export async function listRooms(): Promise<Room[]> {
  return request<Room[]>('/rooms');
}

export interface CreateRoomInput {
  name: string;
  topic?: string;
  turnDelayMs?: number;
  maxContextMessages?: number;
}

export const api = {
  postMessage: (roomId: string, content: string) =>
    request<{ success: boolean }>(`/rooms/${roomId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  getSettings: () => request<Record<string, string>>('/settings'),
  updateSettings: (settings: Record<string, string>) =>
    request<{ success: boolean }>('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    }),
  getModels: (refresh = false) => request<string[]>(`/settings/models?refresh=${refresh}`),
};

export async function createRoom(input: CreateRoomInput): Promise<Room> {
  return request<Room>('/rooms', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function getRoom(id: string): Promise<RoomWithAgents> {
  return request<RoomWithAgents>(`/rooms/${id}`);
}

export async function getRoomMessages(id: string, limit = 50): Promise<Message[]> {
  return request<Message[]>(`/rooms/${id}/messages?limit=${limit}`);
}

export async function deleteRoom(id: string): Promise<void> {
  return request<void>(`/rooms/${id}`, { method: 'DELETE' });
}
