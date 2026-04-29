import { callLlm, resolveAgentCredentials } from '../utils/llm.js';
import type { Agent, Message } from '@agentroom/shared';

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Decides who speaks next based on:
 * 1. If an agent was mentioned by name → that agent speaks next (with smart priority).
 * 2. LLM moderator call → returns agent name.
 * 3. Fallback → round-robin.
 */
export async function pickNextSpeaker(
  agents: Agent[],
  history: Message[],
  lastSpeakerIndex: number,
  moderatorAgent: Agent,
  mentionTurnCount: Map<string, number> = new Map(),
  lastMentionedAgentId?: string,
): Promise<{ agent: Agent; nextIndex: number; wasMention: boolean }> {
  if (agents.length === 0) {
    throw new Error('No agents in the room');
  }

  // 1. Check if last message mentions any OTHER agent by name
  const lastMessage = history[history.length - 1];
  const lastSpeakerId = lastMessage?.agentId;
  const lastSpeaker = agents.find((a) => a.id === lastSpeakerId);

  if (lastMessage?.content) {
    // Collect all mentioned agents (excluding last speaker)
    const mentionedAgents: Agent[] = [];
    for (const agent of agents) {
      if (agent.id === lastSpeakerId) continue; // Ignore self-mentions
      if (agent.id === lastMentionedAgentId) continue; // Ignore just-mentioned agent
      const lowerName = agent.name.toLowerCase();
      const regex = new RegExp(`\\b${escapeRegex(lowerName)}\\b`, 'i');
      if (regex.test(lastMessage.content)) {
        mentionedAgents.push(agent);
      }
    }

    if (mentionedAgents.length > 0) {
      // Sort by mention count (ascending) to prioritize less-mentioned agents
      mentionedAgents.sort((a, b) => (mentionTurnCount.get(a.id) || 0) - (mentionTurnCount.get(b.id) || 0));
      const selectedAgent = mentionedAgents[0]!;
      const idx = agents.indexOf(selectedAgent);
      return { agent: selectedAgent, nextIndex: idx, wasMention: true };
    }
  }

  // 2. LLM moderator decides
  try {
    const agentNames = agents.map((a) => a.name).join(', ');
    const historyText = history
      .slice(-10)
      .map((m) => {
        const name = agents.find((a) => a.id === m.agentId)?.name || 'Human';
        return `[${name}]: ${m.content}`;
      })
      .join('\n');

    const modifier = lastSpeaker ? `The last speaker was ${lastSpeaker.name}. Please select a different agent to keep the conversation flowing.` : '';

    const creds = await resolveAgentCredentials(moderatorAgent);
    if (!creds) {
      throw new Error('No LLM credentials available for moderation');
    }

    const { content } = await callLlm(
      creds.providerUrl,
      creds.apiKey,
      moderatorAgent.model,
      [
        {
          role: 'system',
          content: `You are a conversation moderator. The agents in this room are: ${agentNames}.
Based on the conversation below, decide who should speak next.
${modifier}
Reply with ONLY the exact name of the next agent, nothing else.`,
        },
        { role: 'user', content: historyText || '(conversation just started)' },
      ],
    );

    const trimmed = content.trim();
    const match = agents.find(
      (a) => a.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (match && match.id !== lastSpeakerId) {
      const idx = agents.indexOf(match);
      return { agent: match, nextIndex: idx, wasMention: false };
    }
  } catch {
    // Moderator LLM failed → fall through to round-robin
  }

  // 3. Round-robin fallback
  const nextIndex = (lastSpeakerIndex + 1) % agents.length;
  const agent = agents[nextIndex];
  if (!agent) {
    throw new Error('Round-robin failed: no agent at computed index');
  }
  return { agent, nextIndex, wasMention: false };
}
