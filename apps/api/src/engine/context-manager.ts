import { callLlm, resolveAgentCredentials } from '../utils/llm.js';
import type { Agent, Message } from '@agentroom/shared';

/**
 * Estimates token count heuristically: ~4 chars per token.
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export interface ContextResult {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
}

/**
 * Builds the LLM message array for the current agent's turn.
 * If history is too long (> maxContextMessages), older messages are summarized.
 */
export async function buildContext(
  history: Message[],
  maxContextMessages: number,
  currentAgent: Agent,
  activeAgents: Agent[],
  summarizerAgent: Agent,
  roomTopic: string | null,
): Promise<ContextResult> {
  const dynamicSystemPrompt = buildSystemPrompt(currentAgent, activeAgents, roomTopic);

  if (history.length <= maxContextMessages) {
    return {
      messages: [
        { role: 'system', content: dynamicSystemPrompt },
        ...historyToLlmMessages(history, currentAgent, activeAgents),
      ],
    };
  }

  // Split: summarize old messages, keep recent N in full
  const keepCount = Math.floor(maxContextMessages / 2);
  const oldMessages = history.slice(0, history.length - keepCount);
  const recentMessages = history.slice(history.length - keepCount);

  const summary = await summarizeHistory(oldMessages, summarizerAgent);

  return {
    messages: [
      { role: 'system', content: dynamicSystemPrompt },
      { role: 'system', content: `[Earlier conversation summary]: ${summary}` },
      ...historyToLlmMessages(recentMessages, currentAgent, activeAgents),
    ],
  };
}

function buildSystemPrompt(agent: Agent, activeAgents: Agent[], roomTopic: string | null): string {
  const names = activeAgents.map((a) => a.name).join(', ');
  let prompt = `Your name is: ${agent.name}\nAgents currently in the room: ${names}\n`;
  if (roomTopic) {
    prompt += `Room Topic/Context: ${roomTopic}\n\n`;
  } else {
    prompt += '\n';
  }
  prompt += agent.systemPrompt;
  return prompt;
}

function historyToLlmMessages(
  messages: Message[],
  currentAgent: Agent,
  activeAgents: Agent[]
): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
  const getName = (agentId: string | null) => {
    if (!agentId) return 'Human';
    return activeAgents.find((a) => a.id === agentId)?.name ?? 'Unknown';
  };

  const results: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  for (const m of messages) {
    const isMe = m.agentId === currentAgent.id;
    const role = isMe ? 'assistant' : 'user';
    const content = isMe ? m.content : `[${getName(m.agentId)}]: ${m.content}`;

    const last = results[results.length - 1];
    if (last && last.role === role) {
      last.content += `\n\n${content}`;
    } else {
      results.push({ role, content });
    }
  }

  if (results.length === 0) {
    results.push({ role: 'user', content: 'You can start the conversation.' });
  } else if (results[results.length - 1]!.role === 'assistant') {
    results.push({ role: 'user', content: 'Please continue.' });
  }

  return results as Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
}

async function summarizeHistory(messages: Message[], summarizerAgent: Agent): Promise<string> {
  const text = messages.map((m) => `[${m.role}]: ${m.content}`).join('\n');

  // Rough token estimate to avoid huge summarization requests
  const tokenCount = estimateTokens(text);
  if (tokenCount < 200) {
    return text;
  }

  try {
    const creds = await resolveAgentCredentials(summarizerAgent);
    if (!creds) {
      throw new Error('No LLM credentials available for summarization');
    }
    const { content } = await callLlm(
      creds.providerUrl,
      creds.apiKey,
      summarizerAgent.model,
      [
        {
          role: 'system',
          content:
            'Summarize the following conversation excerpt concisely, preserving key facts, decisions, and character relationships.',
        },
        { role: 'user', content: text },
      ],
    );
    return content;
  } catch {
    // If summarization fails, return a truncated version
    return `[${messages.length} earlier messages — summarization unavailable]`;
  }
}
