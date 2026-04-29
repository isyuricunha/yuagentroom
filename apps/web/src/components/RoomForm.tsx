import { useState } from 'react';
import type { CreateRoomInput } from '../lib/api.ts';
import { Button } from './Button.tsx';
import { Input, Textarea } from './Input.tsx';

interface RoomFormProps {
  onSubmit: (data: CreateRoomInput) => Promise<void>;
  onCancel: () => void;
}

export function RoomForm({ onSubmit, onCancel }: RoomFormProps) {
  const [name, setName] = useState('');
  const [topic, setTopic] = useState('');
  const [turnDelayMs, setTurnDelayMs] = useState('2000');
  const [maxContextMessages, setMaxContextMessages] = useState('50');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name) {
      setError('Name is required.');
      return;
    }
    
    const delay = parseInt(turnDelayMs, 10);
    const limit = parseInt(maxContextMessages, 10);
    
    if (isNaN(delay) || delay < 0) {
      setError('Turn Delay must be a positive number.'); return;
    }
    if (isNaN(limit) || limit < 1) {
      setError('Context Limit must be at least 1.'); return;
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
        placeholder="e.g. Writers Room"
        autoFocus
      />

      <Textarea
        label="Initial Topic (Optional)"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder="A group of agents discussing..."
        rows={3}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <Input
          type="number"
          label="Turn Delay (ms)"
          value={turnDelayMs}
          onChange={(e) => setTurnDelayMs(e.target.value)}
        />
        <Input
          type="number"
          label="Context Limit"
          value={maxContextMessages}
          onChange={(e) => setMaxContextMessages(e.target.value)}
        />
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create Room'}
        </Button>
      </div>
    </form>
  );
}
