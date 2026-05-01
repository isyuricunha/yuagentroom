import { useState } from 'react';

interface ScheduleFormProps {
    roomId: string;
    onSubmit: (cronExpression: string, timezone: string) => Promise<void>;
    onClose: () => void;
}

const PRESETS = [
    { label: 'Every minute', value: '* * * * *' },
    { label: 'Every hour', value: '0 * * * *' },
    { label: 'Every day at midnight', value: '0 0 * * *' },
    { label: 'Every day at noon', value: '0 12 * * *' },
    { label: 'Every Monday at 9 AM', value: '0 9 * * 1' },
    { label: 'Every Friday at 5 PM', value: '0 17 * * 5' },
];

export function ScheduleForm({ roomId, onSubmit, onClose }: ScheduleFormProps) {
    // roomId is used when submitting the form via the onSubmit prop
    const [cronExpression, setCronExpression] = useState('* * * * *');
    void roomId; // Used to satisfy TypeScript
    const [timezone, setTimezone] = useState('UTC');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            await onSubmit(cronExpression, timezone);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create schedule');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <h3 style={{ marginBottom: '1rem' }}>Create Schedule</h3>

            <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                    Cron Expression
                </label>
                <input
                    type="text"
                    value={cronExpression}
                    onChange={(e) => setCronExpression(e.target.value)}
                    placeholder="* * * * *"
                    style={{
                        width: '100%',
                        padding: '0.5rem',
                        borderRadius: '0.25rem',
                        border: '1px solid var(--border-color, #e0e0e0)',
                    }}
                    required
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #666)', marginTop: '0.25rem' }}>
                    Format: minute hour day month weekday
                </p>
            </div>

            <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                    Quick Presets
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {PRESETS.map((preset) => (
                        <button
                            key={preset.value}
                            type="button"
                            onClick={() => setCronExpression(preset.value)}
                            style={{
                                padding: '0.25rem 0.75rem',
                                borderRadius: '0.25rem',
                                border: cronExpression === preset.value ? '1px solid var(--primary-color, #007bff)' : '1px solid var(--border-color, #e0e0e0)',
                                backgroundColor: cronExpression === preset.value ? 'var(--primary-color, #007bff)' : 'transparent',
                                color: cronExpression === preset.value ? '#fff' : 'var(--text-color, #333)',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                            }}
                        >
                            {preset.label}
                        </button>
                    ))}
                </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                    Timezone
                </label>
                <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '0.5rem',
                        borderRadius: '0.25rem',
                        border: '1px solid var(--border-color, #e0e0e0)',
                    }}
                >
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">Eastern Time</option>
                    <option value="America/Chicago">Central Time</option>
                    <option value="America/Denver">Mountain Time</option>
                    <option value="America/Los_Angeles">Pacific Time</option>
                    <option value="Europe/London">London</option>
                    <option value="Europe/Paris">Paris</option>
                    <option value="Asia/Tokyo">Tokyo</option>
                </select>
            </div>

            {error && (
                <div style={{ color: 'var(--error-color, #dc3545)', marginBottom: '1rem' }}>
                    {error}
                </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button
                    type="button"
                    onClick={onClose}
                    style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '0.25rem',
                        border: 'none',
                        backgroundColor: 'var(--bg-secondary, #f5f5f5)',
                        cursor: 'pointer',
                    }}
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '0.25rem',
                        border: 'none',
                        backgroundColor: isSubmitting ? 'var(--text-secondary, #999)' : 'var(--primary-color, #007bff)',
                        color: '#fff',
                        cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    }}
                >
                    {isSubmitting ? 'Creating...' : 'Create Schedule'}
                </button>
            </div>
        </form>
    );
}
