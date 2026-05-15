import type { RoomStatus } from '@agentroom/shared';

interface StatusBadgeProps {
  status: RoomStatus;
}

const LABELS: Record<RoomStatus, string> = {
  idle: 'idle',
  running: 'running',
  paused: 'paused',
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`badge badge-${status} ${status === 'running' ? 'status-dot-pulse' : ''}`}>
      {LABELS[status]}
    </span>
  );
}
