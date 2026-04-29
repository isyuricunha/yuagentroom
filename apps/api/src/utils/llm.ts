export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmResponse {
  content: string;
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
