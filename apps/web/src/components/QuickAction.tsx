import React from 'react';

export interface QuickActionProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  delay?: number;
}

export const QuickAction = React.memo(function QuickAction({
  icon,
  label,
  onClick,
  delay = 0
}: QuickActionProps) {
  return (
    <button
      className="quick-action-btn-enhanced animate-in"
      style={{ animationDelay: `${delay * 0.1}s` }}
      onClick={onClick}
      type="button"
      aria-label={label}
    >
      <span className="quick-action-icon" aria-hidden="true">{icon}</span>
      <span>{label}</span>
    </button>
  );
});
