import React from 'react';

export interface StatCardProps {
  icon: React.ReactNode;
  iconClass: string;
  value: string | number;
  label: string;
  trend?: 'up' | 'down' | 'neutral';
  trendIcon?: React.ReactNode;
  delay?: number;
}

export const StatCard = React.memo(function StatCard({
  icon,
  iconClass,
  value,
  label,
  trend = 'neutral',
  trendIcon,
  delay = 0
}: StatCardProps) {
  return (
    <div
      className="stat-card-enhanced animate-in"
      style={{ animationDelay: `${delay * 0.1}s` }}
      role="region"
      aria-label={`${label}: ${value}`}
    >
      <div className={`stat-card-icon ${iconClass}`}>
        {icon}
      </div>
      <div className="stat-card-content">
        <span className="stat-card-value">{value}</span>
        <span className="stat-card-label">{label}</span>
      </div>
      <div className={`stat-card-trend ${trend}`}>
        {trendIcon}
      </div>
    </div>
  );
});
