import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
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

export function AgentForm({
  initialData,
  onSubmit,
  onCancel,
  availableModels: propAvailableModels = []
}: AgentFormProps) {
  const { t } = useTranslation();
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

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !systemPrompt || !model) {
      setError(t('agents.nameRequired'));
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit({ name, systemPrompt, model });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setIsSubmitting(false);
    }
  }, [name, systemPrompt, model, onSubmit, t]);

  const handleGenerateName = useCallback(() => {
    setName(generateRandomAgentName());
  }, []);

  return (
    <form onSubmit={handleSubmit} className="agent-form">
      {error && <div className="error-banner">{error}</div>}

      {/* Section: Agent Identity */}
      <div className="form-section">
        <div className="section-header">
          <Sparkles size={16} className="section-icon" aria-hidden="true" />
          <h3 className="section-title">{t('agents.agentIdentity')}</h3>
        </div>

        <div className="form-row-compact">
          <div className="field">
            <label htmlFor="agent-name">{t('agents.name')}</label>
            <div className="input-with-button">
              <Input
                id="agent-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('agents.name')}
                autoFocus
                className="agent-name-input"
                required
              />
              <button
                type="button"
                onClick={handleGenerateName}
                title={t('agents.generateName')}
                className="random-name-btn"
                aria-label={t('agents.generateName')}
              >
                <Dice1 size={18} />
              </button>
            </div>
          </div>

          <div className="field">
            <label>{t('agents.model')}</label>
            <Select
              allowCustom
              value={model}
              onChange={setModel}
              options={availableModels.map((m) => ({ value: m, label: m }))}
              placeholder={t('agents.model')}
            />
          </div>
        </div>
      </div>

      {/* Section: Behavior Configuration */}
      <div className="form-section">
        <div className="section-header">
          <Brain size={16} className="section-icon" aria-hidden="true" />
          <h3 className="section-title">{t('agents.behaviorConfig')}</h3>
        </div>

        <div className="field">
          <label htmlFor="system-prompt">{t('agents.systemPrompt')}</label>
          <Textarea
            id="system-prompt"
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder={t('agents.systemPrompt')}
            rows={6}
            className="system-prompt-textarea"
            required
          />
        </div>
      </div>

      {/* Form Actions */}
      <div className="form-actions">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
        >
          {t('agents.cancel')}
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? t('agents.saving') : t('agents.saveAgent')}
        </Button>
      </div>
    </form>
  );
}
