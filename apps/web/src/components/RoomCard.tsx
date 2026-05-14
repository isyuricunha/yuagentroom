import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import type { Room } from '@agentroom/shared';
import { StatusBadge } from './StatusBadge.tsx';
import { Button } from './Button.tsx';
import { Clock, Layers, MessageSquare } from 'lucide-react';

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

  return (
    <div className="card room-card-container" style={{ position: 'relative' }}>
      {/* Delete button - positioned absolutely over the card */}
      <div
        className="room-card-actions"
        style={{
          position: 'absolute',
          top: '0.5rem',
          right: '0.5rem',
          zIndex: 20,
          display: 'flex',
          gap: '0.5rem'
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {isDeleting || showDeleteConfirm ? (
          <>
            <Button
              size="sm"
              onClick={handleDeleteCancel}
              disabled={isDeleting}
            >
              {t('rooms.deleteCancel')}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? t('rooms.status') : t('rooms.deleteConfirm')}
            </Button>
          </>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDeleteClick}
            style={{
              color: 'var(--danger)',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
            }}
            aria-label={`${t('rooms.delete')} ${room.name}`}
          >
            {t('rooms.delete')}
          </Button>
        )}
      </div>

      {/* Card content wrapped in Link */}
      <Link
        to={`/rooms/${room.id}`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          textDecoration: 'none',
          color: 'inherit',
          paddingRight: '5rem' // Space for delete button
        }}
        role="article"
        aria-label={`Room: ${room.name}`}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <div
              className="message-avatar"
              style={{
                width: 40,
                height: 40,
                background: 'rgba(59, 130, 246, 0.1)',
                color: 'var(--accent)',
                border: '1px solid rgba(59, 130, 246, 0.2)'
              }}
              aria-hidden="true"
            >
              <MessageSquare size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-heading)' }}>
                {room.name}
              </h3>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                {t('rooms.created')} {formatDate(room.createdAt)}
              </p>
            </div>
          </div>
          <StatusBadge status={room.status} />
        </div>

        <div
          style={{
            flex: 1,
            fontSize: '0.85rem',
            color: room.topic ? 'var(--text)' : 'var(--text-muted)',
            fontStyle: room.topic ? 'normal' : 'italic',
            lineHeight: 1.5,
            marginTop: '0.5rem'
          }}
        >
          {room.topic || t('rooms.noTopic')}
        </div>

        <div
          style={{
            marginTop: 'auto',
            display: 'flex',
            gap: '1rem',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border)'
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: '1rem',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              fontFamily: 'var(--mono)'
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }} title={t('rooms.turnDelay')}>
              <Clock size={14} aria-hidden="true" /> {room.turnDelayMs}ms
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }} title={t('rooms.contextLimit')}>
              <Layers size={14} aria-hidden="true" /> {room.maxContextMessages} {t('rooms.msgs')}
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}
