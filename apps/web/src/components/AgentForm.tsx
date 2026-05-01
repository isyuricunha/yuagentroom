import { useState, useEffect } from 'react';
import type { Agent, CreateAgentInput } from '@agentroom/shared';
import { api } from '../lib/api.ts';
import { generateRandomAgentName } from '../lib/agent-names.ts';
import { Button } from './Button.tsx';
import { Input, Textarea } from './Input.tsx';
import { Select } from './Select.tsx';
import { Dice1, Sparkles, Brain } from 'lucide-react';

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
    <form onSubmit={handleSubmit} className="agent-form">
      {error && <div className="error-banner">{error}</div>}

      {/* Section: Agent Identity */}
      <div className="form-section">
        <div className="section-header">
          <Sparkles size={16} className="section-icon" />
          <h3 className="section-title">Agent Identity</h3>
        </div>

        <div className="form-row-compact">
          <div className="field">
            <label htmlFor="agent-name">Name</label>
            <div className="input-with-button">
              <Input
                id="agent-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alice"
                autoFocus
                className="agent-name-input"
              />
              <button
                type="button"
                onClick={() => setName(generateRandomAgentName())}
                title="Generate Random Name"
                className="random-name-btn"
              >
                <Dice1 size={18} />
              </button>
            </div>
          </div>

          <div className="field">
            <label>Model</label>
            <Select
              allowCustom
              value={model}
              onChange={setModel}
              options={availableModels.map((m) => ({ value: m, label: m }))}
              placeholder="e.g. gpt-4o"
            />
          </div>
        </div>
      </div>

      {/* Section: Behavior Configuration */}
      <div className="form-section">
        <div className="section-header">
          <Brain size={16} className="section-icon" />
          <h3 className="section-title">Behavior Configuration</h3>
        </div>

        <div className="field">
          <label htmlFor="system-prompt">System Prompt</label>
          <Textarea
            id="system-prompt"
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="Você é Alice, uma assistente de IA..."
            rows={6}
            className="system-prompt-textarea"
          />
        </div>
      </div>

      {/* Form Actions */}
      <div className="form-actions">
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
