import type { Agent, Message, RoomStatus } from './types.js';

// ─── Server → Client Events ────────────────────────────────────────────────

export interface ServerRoomMessage {
  type: 'room:message';
  payload: Message & { agent: Pick<Agent, 'id' | 'name'> | null };
}

export interface ServerRoomAgentJoined {
  type: 'room:agent_joined';
  payload: { agent: Pick<Agent, 'id' | 'name'>; roomId: string };
}

export interface ServerRoomAgentLeft {
  type: 'room:agent_left';
  payload: { agentId: string; roomId: string };
}

export interface ServerRoomStatus {
  type: 'room:status';
  payload: { roomId: string; status: RoomStatus };
}

export interface ServerRoomTyping {
  type: 'room:typing';
  payload: { agentId: string; agentName: string; roomId: string };
}

export interface ServerRoomError {
  type: 'room:error';
  payload: { roomId: string; error: string; agentId?: string };
}

export type ServerEvent =
  | ServerRoomMessage
  | ServerRoomAgentJoined
  | ServerRoomAgentLeft
  | ServerRoomStatus
  | ServerRoomTyping
  | ServerRoomError;

// ─── Client → Server Events ────────────────────────────────────────────────

export interface ClientRoomStart {
  type: 'room:start';
  payload: { roomId: string };
}

export interface ClientRoomPause {
  type: 'room:pause';
  payload: { roomId: string };
}

export interface ClientRoomSendMessage {
  type: 'room:send_message';
  payload: { roomId: string; content: string };
}

export interface ClientRoomAddAgent {
  type: 'room:add_agent';
  payload: { roomId: string; agentId: string };
}

export interface ClientRoomRemoveAgent {
  type: 'room:remove_agent';
  payload: { roomId: string; agentId: string };
}

export type ClientEvent =
  | ClientRoomStart
  | ClientRoomPause
  | ClientRoomSendMessage
  | ClientRoomAddAgent
  | ClientRoomRemoveAgent;
