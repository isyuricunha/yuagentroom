import { randomUUID } from 'crypto';
import { eq, and, isNull } from 'drizzle-orm';
import type { Agent, Message, Room } from '@agentroom/shared';
import { getDb } from '../db/index.js';
import { callLlm, resolveAgentCredentials } from '../utils/llm.js';
import { pickNextSpeaker } from './moderator.js';
import { buildContext } from './context-manager.js';

export type BroadcastFn = (roomId: string, payload: unknown) => void;

interface TurnLoopOptions {
  room: Room;
  broadcast: BroadcastFn;
}

const MAX_CONSECUTIVE_MENTION_TURNS = 3;

export class TurnLoop {
  private running = false;
  private pausing = false;
  private lastSpeakerIndex = -1;
  // Track consecutive mention-driven turns per agent to prevent deadlocks
  private mentionTurnCount: Map<string, number> = new Map();
  private consecutiveMentionTurns = 0;
  private lastMentionedAgentId?: string;

  constructor(private readonly options: TurnLoopOptions) {}

  get isRunning(): boolean {
    return this.running;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.pausing = false;
    this.run().catch((err: unknown) => {
      console.error(`[TurnLoop] room ${this.options.room.id} crashed:`, err);
      this.running = false;
    });
  }

  pause(): void {
    this.pausing = true;
  }

  private async run(): Promise<void> {
    const { room, broadcast } = this.options;

    broadcast(room.id, { type: 'room:status', payload: { roomId: room.id, status: 'running' } });

    while (this.running && !this.pausing) {
      const client = await getDb();

      // Fetch active agents in the room
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const roomAgentRows: Array<{ agentId: string }> = await (client.db as any)
        .select({ agentId: client.schema.roomAgents.agentId })
        .from(client.schema.roomAgents)
        .where(
          and(
            eq(client.schema.roomAgents.roomId, room.id),
            isNull(client.schema.roomAgents.leftAt),
          ),
        );

      if (roomAgentRows.length === 0) {
        // No agents — pause and wait
        await sleep(1000);
        continue;
      }

      const agents: Agent[] = (
        await Promise.all(
          roomAgentRows.map(async ({ agentId }) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const rows: Agent[] = await (client.db as any)
              .select()
              .from(client.schema.agents)
              .where(eq(client.schema.agents.id, agentId));
            return rows[0];
          }),
        )
      ).filter((a): a is Agent => a !== undefined);

      if (agents.length === 0) {
        await sleep(1000);
        continue;
      }

      // Fetch message history
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const history: Message[] = await (client.db as any)
        .select()
        .from(client.schema.messages)
        .where(eq(client.schema.messages.roomId, room.id))
        .orderBy(client.schema.messages.createdAt);

      // Pick the moderator agent (first agent acts as moderator for now)
      const moderatorAgent = agents[0]!;

      // Pick next speaker
      const { agent: currentAgent, nextIndex, wasMention } = await pickNextSpeaker(
        agents,
        history,
        this.lastSpeakerIndex,
        moderatorAgent,
        this.mentionTurnCount,
        this.lastMentionedAgentId,
      );
      this.lastSpeakerIndex = nextIndex;

      // Track mention-driven turns to prevent deadlock
      if (wasMention) {
        this.consecutiveMentionTurns++;
        this.mentionTurnCount.set(currentAgent.id, (this.mentionTurnCount.get(currentAgent.id) || 0) + 1);
        this.lastMentionedAgentId = currentAgent.id;
      } else {
        this.consecutiveMentionTurns = 0;
        this.mentionTurnCount.clear();
        this.lastMentionedAgentId = undefined;
      }

      // If too many consecutive mention-turns, force round-robin next round
      if (this.consecutiveMentionTurns >= MAX_CONSECUTIVE_MENTION_TURNS) {
        this.lastSpeakerIndex = (this.lastSpeakerIndex + 1) % agents.length;
        this.consecutiveMentionTurns = 0;
        this.mentionTurnCount.clear();
      }

      // Emit typing indicator
      broadcast(room.id, {
        type: 'room:typing',
        payload: { agentId: currentAgent.id, agentName: currentAgent.name, roomId: room.id },
      });

      // Build context
      const { messages: contextMessages } = await buildContext(
        history,
        room.maxContextMessages,
        currentAgent,
        agents,
        moderatorAgent,
        room.topic
      );

// Call the agent's LLM with fallback to global credentials
       let responseContent: string;
       try {
         const creds = await resolveAgentCredentials(currentAgent);
         if (!creds) {
           throw new Error('No LLM credentials available. Configure agent credentials or set global settings.');
         }
         const { content } = await callLlm(
           creds.providerUrl,
           creds.apiKey,
           currentAgent.model,
           contextMessages,
           currentAgent.reasoningEffort
         );
         responseContent = content;
       } catch (err) {
         console.error(`[TurnLoop] LLM call failed for agent ${currentAgent.name}:`, err);
         // Update index so next iteration skips this agent
         this.lastSpeakerIndex = (this.lastSpeakerIndex + 1) % agents.length;
         await sleep(room.turnDelayMs);
         continue;
       }

      // Save message to DB
      const msgId = randomUUID();
      const now = new Date();
      const msgRow = {
        id: msgId,
        roomId: room.id,
        agentId: currentAgent.id || null,
        role: 'agent' as const,
        content: responseContent,
        createdAt: client.dialect === 'sqlite' ? now.toISOString() : now,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (client.db as any).insert(client.schema.messages).values(msgRow);

      // Broadcast new message
      const savedMessage: Message = {
        id: msgId,
        roomId: room.id,
        agentId: currentAgent.id,
        role: 'agent',
        content: responseContent,
        createdAt: now.toISOString(),
      };

      broadcast(room.id, {
        type: 'room:message',
        payload: {
          ...savedMessage,
          agent: { id: currentAgent.id, name: currentAgent.name },
        },
      });

      // Wait before next turn
      await sleep(room.turnDelayMs);
    }

    this.running = false;

    // Update room status in DB
    const client = await getDb();
    const newStatus = this.pausing ? 'paused' : 'idle';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (client.db as any)
      .update(client.schema.rooms)
      .set({ status: newStatus })
      .where(eq(client.schema.rooms.id, this.options.room.id));

    broadcast(this.options.room.id, {
      type: 'room:status',
      payload: { roomId: this.options.room.id, status: newStatus },
    });

    this.pausing = false;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
