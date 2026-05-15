import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import type { Room } from '@agentroom/shared';
import { StatusBadge } from './StatusBadge.tsx';
import { Button } from './Button.tsx';
import { Clock, Layers, MessageSquare, Trash2 } from 'lucide-react';

interface RoomCardProps {
  room: Room;
  onDelete: (id: string) => void;
  isDeleting?: boolean;
}

export function RoomCard({ room, onDelete, isDeleting = false }: RoomCardProps) {
  const { t } = useTranslation();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteClick = useCallback(() => {
    setShowDeleteConfirm(true);
  }, []);

  const handleDeleteCancel = useCallback(() => {
    setShowDeleteConfirm(false);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    onDelete(room.id);
    setShowDeleteConfirm(false);
  }, [onDelete, room.id]);

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  }, []);

  // Status-based accent color for card top border
  const statusColors: Record<string, string> = {
    running: 'rgba(136, 192, 208, 0.4)',
    idle: 'rgba(76, 86, 90, 0.4)',
    paused: 'rgba(235, 203, 139, 0.4)',
  };

  const statusAccent = statusColors[room.status] || 'transparent';

  return (
    <div 
      className={`room-card ${isDeleting ? 'room-card-deleting' : ''}`}
      style={{ 
        position: 'relative',
        borderTop: `2px solid ${statusAccent}`,
      }}
    >
      {/* Delete button - absolutely positioned in top-right corner */}
      <div
        className="room-card-delete"
        style={{
          position: 'absolute',
          top: '0.75rem',
          right: '0.75rem',
          zIndex: 10
        }}
      >
        {isDeleting || showDeleteConfirm ? (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDeleteCancel}
              disabled={isDeleting}
            >
              {t('rooms.deleteCancel')}
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {t('rooms.deleteConfirm')}
            </Button>
          </div>
        ) : (
          <button
            onClick={handleDeleteClick}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleDeleteClick();
              }
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--danger)',
              cursor: 'pointer',
              padding: '0.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px',
              transition: 'background-color 0.2s'
            }}
            aria-label={`${t('rooms.delete')} ${room.name}`}
            title={t('rooms.delete')}
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>

      {/* Card content */}
      <Link
        to={`/rooms/${room.id}`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          textDecoration: 'none',
          color: 'inherit',
          minHeight: '140px'
        }}
        role="article"
        aria-label={`Room: ${room.name}`}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', paddingTop: '0.5rem' }}>
          <div
            className="room-card-icon"
            style={{
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(59, 130, 246, 0.1)',
              color: 'var(--accent)',
              borderRadius: '8px',
              flexShrink: 0
            }}
            aria-hidden="true"
          >
            <MessageSquare size={20} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text-heading)' }}>
              {room.name}
            </h3>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {t('rooms.created')} {formatDate(room.createdAt)}
            </p>
          </div>
          <StatusBadge status={room.status} />
        </div>

        {/* Topic/Description */}
        <div
          style={{
            fontSize: '0.875rem',
            color: room.topic ? 'var(--text)' : 'var(--text-muted)',
            fontStyle: !room.topic ? 'italic' : 'normal',
            lineHeight: 1.5,
            paddingTop: '0.5rem'
          }}
        >
          {room.topic || t('rooms.noTopic')}
        </div>

        {/* Footer stats */}
        <div
          style={{
            display: 'flex',
            gap: '1rem',
            alignItems: 'center',
            paddingTop: '0.75rem',
            marginTop: 'auto',
            borderTop: '1px solid var(--border)',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            fontFamily: 'var(--mono)'
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Clock size={14} aria-hidden="true" />
            {room.turnDelayMs}ms
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Layers size={14} aria-hidden="true" />
            {room.maxContextMessages} {t('rooms.msgs')}
          </span>
        </div>
      </Link>
    </div>
  );
}
