import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { CreateRoomInput } from '../lib/api.ts';
import { Button } from './Button.tsx';
import { Input, Textarea } from './Input.tsx';

interface RoomFormProps {
  onSubmit: (data: CreateRoomInput) => Promise<void>;
  onCancel: () => void;
}

export function RoomForm({ onSubmit, onCancel }: RoomFormProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [topic, setTopic] = useState('');
  const [turnDelayMs, setTurnDelayMs] = useState('2000');
  const [maxContextMessages, setMaxContextMessages] = useState('50');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      setError(t('rooms.form.nameRequired'));
      return;
    }

    const delay = parseInt(turnDelayMs, 10);
    const limit = parseInt(maxContextMessages, 10);

    if (isNaN(delay) || delay < 0) {
      setError(t('rooms.form.turnDelayError'));
      return;
    }
    if (isNaN(limit) || limit < 1) {
      setError(t('rooms.form.contextLimitError'));
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit({
        name,
        topic: topic.trim() || undefined,
        turnDelayMs: delay,
        maxContextMessages: limit
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setIsSubmitting(false);
    }
  }, [name, topic, turnDelayMs, maxContextMessages, onSubmit, t]);

  return (
    <form onSubmit={handleSubmit} className="form-row">
      {error && <div className="error-banner">{error}</div>}

      <Input
        label={t('rooms.form.name')}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t('rooms.form.namePlaceholder')}
        autoFocus
      />

      <Textarea
        label={t('rooms.form.topic')}
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder={t('rooms.form.topicPlaceholder')}
        rows={3}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <Input
          type="number"
          label={t('rooms.form.turnDelayMs')}
          value={turnDelayMs}
          onChange={(e) => setTurnDelayMs(e.target.value)}
        />
        <Input
          type="number"
          label={t('rooms.form.contextLimit')}
          value={maxContextMessages}
          onChange={(e) => setMaxContextMessages(e.target.value)}
        />
      </div>

      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          justifyContent: 'flex-end',
          marginTop: '1rem'
        }}
      >
        <Button type="button" variant="ghost" onClick={onCancel}>
          {t('rooms.form.cancel')}
        </Button>
        <Button type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? t('rooms.form.creating') : t('rooms.form.createRoom')}
        </Button>
      </div>
    </form>
  );
}
