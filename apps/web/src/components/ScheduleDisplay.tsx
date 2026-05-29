import type { ScheduledRoom } from '@agentroom/shared';

interface ScheduleDisplayProps {
    schedule: ScheduledRoom | null;
    onDelete: () => Promise<void>;
}

export function ScheduleDisplay({ schedule, onDelete }: ScheduleDisplayProps) {
    if (!schedule) {
        return (
            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No schedule configured
            </div>
        );
    }

    const nextRun = schedule.nextRun ? new Date(schedule.nextRun).toLocaleString() : 'Not scheduled';
    const lastRun = schedule.lastRun ? new Date(schedule.lastRun).toLocaleString() : 'Never';

    return (
        <div className="schedule-display" style={{ padding: '1rem', borderRadius: '0.5rem', backgroundColor: 'var(--bg-panel)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ margin: 0 }}>Active Schedule</h4>
                <span style={{
                    padding: '0.25rem 0.5rem',
                    borderRadius: '0.25rem',
                    fontSize: '0.75rem',
                    backgroundColor: schedule.isActive ? 'var(--success)' : 'var(--text-muted)',
                    color: 'var(--text-heading)'
                }}>
                    {schedule.isActive ? 'Active' : 'Inactive'}
                </span>
            </div>

            <div style={{ marginBottom: '0.5rem' }}>
                <strong>Cron Expression:</strong>
                <code style={{ display: 'block', padding: '0.5rem', marginTop: '0.25rem', borderRadius: '0.25rem', backgroundColor: 'var(--bg-surface)', fontSize: '0.875rem' }}>
                    {schedule.cronExpression}
                </code>
            </div>

            <div style={{ marginBottom: '0.5rem' }}>
                <strong>Timezone:</strong> {schedule.timezone}
            </div>

            <div style={{ marginBottom: '0.5rem' }}>
                <strong>Next Run:</strong> {nextRun}
            </div>

            <div style={{ marginBottom: '1rem' }}>
                <strong>Last Run:</strong> {lastRun}
            </div>

            <button
                onClick={onDelete}
                style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '0.25rem',
                    border: 'none',
                    backgroundColor: 'var(--danger)',
                    color: 'var(--text-heading)',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                }}
            >
                Delete Schedule
            </button>
        </div>
    );
}
