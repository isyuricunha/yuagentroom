import { useState, useEffect } from 'react';
import type { Agent, CreateAgentInput } from '@agentroom/shared';
import { api } from '../lib/api.ts';
import { Button } from './Button.tsx';
import { Input, Textarea } from './Input.tsx';
import { Select } from './Select.tsx';

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
  const [reasoningEffort, setReasoningEffort] = useState<'none' | 'low' | 'medium' | 'high'>(initialData?.reasoningEffort || 'none');
  const [providerUrl, setProviderUrl] = useState(initialData?.providerUrl || '');
  const [apiKey, setApiKey] = useState(initialData?.apiKey ?? '');
  const [availableModels, setAvailableModels] = useState<string[]>(propAvailableModels);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchGlobals() {
      try {
        const settings = await api.getSettings();
        if (!initialData?.id && !initialData?.providerUrl) {
          setProviderUrl(settings.global_provider_url || '');
        }
        if (settings.cached_models && propAvailableModels.length === 0) {
          setAvailableModels(JSON.parse(settings.cached_models));
        }
      } catch {
        // Silently fail - settings optional
      }
    }
    fetchGlobals();
  }, [initialData, propAvailableModels]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !systemPrompt || !model) {
      setError('Nome e System Prompt são obrigatórios.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit({ name, systemPrompt, model, reasoningEffort, providerUrl, apiKey });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocorreu um erro');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form-row">
      {error && <div className="error-banner">{error}</div>}
      <Input
        label="Nome"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Alice"
        autoFocus
      />
      <Textarea
        label="System Prompt"
        value={systemPrompt}
        onChange={(e) => setSystemPrompt(e.target.value)}
        placeholder="Você é Alice, uma assistente de IA..."
        rows={4}
      />
      <div className="field">
        <label>Modelo</label>
        <Select
          allowCustom
          value={model}
          onChange={setModel}
          options={availableModels.map((m) => ({ value: m, label: m }))}
          placeholder="e.g. gpt-4o ou seu modelo customizado"
        />
      </div>
      <div className="field">
        <label>Esforço de Raciocínio (para modelos o1/o3)</label>
        <Select
          value={reasoningEffort}
          onChange={(v) => setReasoningEffort(v as 'none' | 'low' | 'medium' | 'high')}
          options={[
            { value: 'none', label: 'Nenhum (Regular)' },
            { value: 'low', label: 'Baixo esforço' },
            { value: 'medium', label: 'Médio esforço' },
            { value: 'high', label: 'Alto esforço' },
          ]}
        />
      </div>
      <Input
        label="URL do Provedor (deixe em branco para usar o global)"
        value={providerUrl}
        onChange={(e) => setProviderUrl(e.target.value)}
        placeholder="e.g. https://api.openai.com/v1"
      />
      <Input
        label="API Key (deixe em branco para usar a global)"
        type="password"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        placeholder="sk-..."
      />
      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando...' : 'Salvar Agent'}
        </Button>
      </div>
    </form>
  );
}