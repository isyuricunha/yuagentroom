import { useState, useEffect } from 'react';
import type { Agent, CreateAgentInput } from '@agentroom/shared';
import { api } from '../lib/api.ts';
import { generateRandomAgentName } from '../lib/agent-names.ts';
import { Button } from './Button.tsx';
import { Input, Textarea } from './Input.tsx';
import { Select } from './Select.tsx';
import { Dice1 } from 'lucide-react';

interface AgentFormProps {
  initialData?: Agent;
  onSubmit: (data: CreateAgentInput) => Promise<void>;
  onCancel: () => void;
  availableModels?: string[];
}

export function AgentForm({ initialData, onSubmit, onCancel, availableModels: propAvailableModels = [] }: AgentFormProps) {
  const [name, setName] = useState(initialData?.name ?? '');
  const [systemPrompt, setSystemPrompt] = useState(initialData?.systemPrompt ?? '');
  const [model, setModel] = useState(initialData?.model || '');
  const [availableModels, setAvailableModels] = useState<string[]>(propAvailableModels);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchGlobals() {
      try {
        const settings = await api.getSettings();
        if (settings.cached_models && propAvailableModels.length === 0) {
          setAvailableModels(JSON.parse(settings.cached_models));
        }
      } catch {
        // Silently fail - settings optional
      }
    }
    fetchGlobals();
  }, [propAvailableModels]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !systemPrompt || !model) {
      setError('Name and System Prompt are required.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit({ name, systemPrompt, model });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form-row">
      {error && <div className="error-banner">{error}</div>}
      <div className="field" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <label>Name</label>
        <div style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Alice"
            autoFocus
            style={{ flex: 1, minWidth: '200px' }}
          />
          <button
            type="button"
            onClick={() => setName(generateRandomAgentName())}
            title="Generate Random Name"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '2.5rem',
              height: '2.5rem',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              background: 'var(--bg-input)',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <Dice1 size={18} />
          </button>
        </div>
      </div>
      <Textarea
        label="System Prompt"
        value={systemPrompt}
        onChange={(e) => setSystemPrompt(e.target.value)}
        placeholder="Você é Alice, uma assistente de IA..."
        rows={4}
      />
      <div className="field">
        <label>Model</label>
        <Select
          allowCustom
          value={model}
          onChange={setModel}
          options={availableModels.map((m) => ({ value: m, label: m }))}
          placeholder="e.g. gpt-4o ou seu modelo customizado"
        />
      </div>
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