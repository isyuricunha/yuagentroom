import type { Agent } from '@agentroom/shared';
import { getDb } from '../db/index.js';
import { dbSelect } from '../db/db-helpers.js';

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmResponse {
  content: string;
}

export interface LlmCredentials {
  providerUrl: string;
  apiKey: string;
}

/**
 * Resolves LLM credentials with fallback to global settings.
 * Priority: agent-specific credentials > global settings.
 * Returns null if no credentials are available.
 */
export async function resolveLlmCredentials(
  agentProviderUrl: string | undefined,
  agentApiKey: string | undefined,
): Promise<LlmCredentials | null> {
  // Use agent-specific credentials if both are provided
  if (agentProviderUrl && agentApiKey) {
    return { providerUrl: agentProviderUrl, apiKey: agentApiKey };
  }

  // Fallback to global settings
  const client = await getDb();
  const records = await dbSelect(client, client.schema.settings);

  const globalSettings: Record<string, string> = {};
  for (const r of records) {
    globalSettings[r.key] = r.value;
  }

  const globalProviderUrl = globalSettings['global_provider_url'];
  const globalApiKey = globalSettings['global_api_key'];

  if (globalProviderUrl && globalApiKey) {
    return { providerUrl: globalProviderUrl, apiKey: globalApiKey };
  }

  return null;
}

/**
 * Resolves LLM credentials for an agent with fallback to global settings.
 */
export async function resolveAgentCredentials(agent: Agent): Promise<LlmCredentials | null> {
  return resolveLlmCredentials(agent.providerUrl, agent.apiKey);
}

/**
 * Calls an OpenAI-compatible chat completions endpoint.
 */
export async function callLlm(
  providerUrl: string,
  apiKey: string,
  model: string,
  messages: LlmMessage[],
  reasoningEffort?: 'none' | 'low' | 'medium' | 'high',
): Promise<LlmResponse> {
  const url = providerUrl.replace(/\/$/, '') + '/chat/completions';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ 
      model, 
      messages,
      ...(reasoningEffort && reasoningEffort !== 'none' ? { reasoning_effort: reasoningEffort } : {})
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'unknown error');
    throw new Error(`LLM request failed (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as any;
  const rawContent = data.choices[0]?.message?.content;

  if (rawContent === undefined || rawContent === null) {
    throw new Error('LLM returned no content in choices[0].message.content');
  }

  let content = '';
  if (Array.isArray(rawContent)) {
    // Handle OpenAI-style content array (e.g. for o1/o3/vision models)
    content = rawContent
      .map((block: any) => {
        if (block.type === 'text') return block.text;
        if (block.type === 'thinking' && block.thinking?.trim()) {
           return `> **Thought:**\n> ${block.thinking.trim().replace(/\n/g, '\n> ')}`;
        }
        return '';
      })
      .filter(Boolean)
      .join('\n\n');
  } else {
    content = String(rawContent);
  }

  return { content };
}
