import React from 'react';
import { Clock } from 'lucide-react';
import type { Room } from '@agentroom/shared';

export interface ActivityCardProps {
  title: string;
  description: string;
  status?: Room['status'];
  date: string;
  meta?: string;
  onClick?: () => void;
  delay?: number;
}

export const ActivityCard = React.memo(function ActivityCard({
  title,
  description,
  status,
  date,
  meta,
  onClick,
  delay = 0
}: ActivityCardProps) {
  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  const getStatusLabel = (s: Room['status']) => {
    switch (s) {
      case 'idle':
        return 'Waiting';
      case 'running':
        return 'Running';
      case 'paused':
        return 'Paused';
      default:
        return s;
    }
  };

  return (
    <div
      className="activity-card animate-in"
      style={{ animationDelay: `${delay * 0.1}s` }}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      aria-label={`View ${title}`}
    >
      <div className="activity-card-header">
        <h3 className="activity-card-title">{title}</h3>
        {status && (
          <span className={`status-badge-enhanced ${status}`}>
            {getStatusLabel(status)}
          </span>
        )}
      </div>
      <p className="activity-card-description">{description}</p>
      <div className="activity-card-meta">
        <div className="activity-card-meta-item">
          <Clock size={14} aria-hidden="true" />
          <span>{date}</span>
        </div>
        {meta && <span>{meta}</span>}
      </div>
    </div>
  );
});
