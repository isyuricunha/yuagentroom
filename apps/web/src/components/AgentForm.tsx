import { useState, useEffect } from 'react';
import type { Agent } from '@agentroom/shared';
import type { CreateAgentInput } from '../lib/api.ts';
import { api } from '../lib/api.ts';
import { Button } from './Button.tsx';
import { Input, Textarea } from './Input.tsx';
import { Select } from './Select.tsx';

interface AgentFormProps {
  initialData?: Agent;
  onSubmit: (data: CreateAgentInput) => Promise<void>;
  onCancel: () => void;
}

export function AgentForm({ initialData, onSubmit, onCancel }: AgentFormProps) {
  const [name, setName] = useState(initialData?.name ?? '');
  const [systemPrompt, setSystemPrompt] = useState(initialData?.systemPrompt ?? '');
  const [model, setModel] = useState(initialData?.model || '');
  const [reasoningEffort, setReasoningEffort] = useState<'none' | 'low' | 'medium' | 'high'>(initialData?.reasoningEffort || 'none');
  const [providerUrl, setProviderUrl] = useState(initialData?.providerUrl || '');
  const [apiKey, setApiKey] = useState(initialData?.apiKey ?? '');

  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchGlobals() {
      try {
        const settings = await api.getSettings();
        if (!initialData?.id && !initialData?.providerUrl) {
          setProviderUrl(settings.global_provider_url || '');
        }
        if (settings.cached_models) setAvailableModels(JSON.parse(settings.cached_models));
      } catch (err) {}
    }
    fetchGlobals();
  }, [initialData]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !systemPrompt || !model) {
      setError('Name, System Prompt, and Model are required.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit({ name, systemPrompt, model, reasoningEffort, providerUrl, apiKey });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form-row">
      {error && <div className="error-banner">{error}</div>}

      <Input
        label="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Alice"
        autoFocus
      />

      <Textarea
        label="System Prompt"
        value={systemPrompt}
        onChange={(e) => setSystemPrompt(e.target.value)}
        placeholder="You are Alice, a helpful AI assistant..."
        rows={4}
      />

      <div className="field">
        <label>Model</label>
        <Select
          allowCustom
          value={model}
          onChange={setModel}
          options={availableModels.map(m => ({ value: m, label: m }))}
          placeholder="e.g. gpt-4o or your custom model"
        />
      </div>

      <div className="field">
        <label>Reasoning Effort (for o1/o3 models)</label>
        <Select
          value={reasoningEffort}
          onChange={(v) => setReasoningEffort(v as any)}
          options={[
            { value: 'none', label: 'None (Regular)' },
            { value: 'low', label: 'Low effort' },
            { value: 'medium', label: 'Medium effort' },
            { value: 'high', label: 'High effort' },
          ]}
        />
      </div>

      <Input
        label="Provider URL (Leave blank to use global default)"
        value={providerUrl}
        onChange={(e) => setProviderUrl(e.target.value)}
        placeholder="e.g. https://api.openai.com/v1"
      />

      <Input
        label="API Key (Leave blank to use global default)"
        type="password"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        placeholder="sk-..."
      />

      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save Agent'}
        </Button>
      </div>
    </form>
  );
}
