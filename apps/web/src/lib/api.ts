import type { Agent, Room, Message, RoomWithAgents, User, AuthResponse, CreateAgentInput } from '@agentroom/shared';

const BASE = '/api';

async function request<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const headers = new Headers(options?.headers);
  if (options?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // Get token from localStorage and add to Authorization header
  const token = localStorage.getItem('agentroom_token');
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (res.status === 204) return undefined as T;

  const data: unknown = await res.json();

  if (!res.ok) {
    const err = data as { error?: string };
    throw new Error(err.error ?? `Request failed: ${res.status}`);
  }

  return data as T;
}

// ─── Auth ───────────────────────────────────────────────────────────────

export async function login(input: { username: string; password: string }): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function register(input: { username: string; email: string; password: string }): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function logout(): Promise<void> {
  await request('/auth/logout', { method: 'POST' });
  localStorage.removeItem('agentroom_token');
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const data = await request<{ user: User }>('/auth/me');
    return data.user;
  } catch {
    return null;
  }
}

// ─── Users (Admin) ───────────────────────────────────────────────────────────

export async function listUsers(): Promise<User[]> {
  return request<User[]>('/users');
}

export async function updateUserRole(id: string, role: 'admin' | 'user'): Promise<User> {
  return request<User>(`/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
}

export async function deleteUser(id: string): Promise<void> {
  return request<void>(`/users/${id}`, { method: 'DELETE' });
}

// ─── First Login Password Change ───────────────────────────────────────────

export async function firstLoginChangePassword(newPassword: string): Promise<{ success: boolean; message: string }> {
  return request<{ success: boolean; message: string }>('/auth/first-login', {
    method: 'POST',
    body: JSON.stringify({ newPassword }),
  });
}

// ─── User Profile Management ───────────────────────────────────────────────

export async function changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
  return request<{ success: boolean; message: string }>('/users/me/password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export async function changeUsername(username: string): Promise<{ success: boolean; message: string }> {
  return request<{ success: boolean; message: string }>('/users/me/username', {
    method: 'POST',
    body: JSON.stringify({ username }),
  });
}

// ─── Agents ──────────────────────────────────────────────────────────────

export async function listAgents(): Promise<Agent[]> {
  return request<Agent[]>('/agents');
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