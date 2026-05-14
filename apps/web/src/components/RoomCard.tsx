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
    <div className="room-card-wrapper" style={{ position: 'relative' }}>
      {/* Delete button container - positioned absolutely with higher z-index */}
      <div
        className="room-card-actions"
        style={{
          position: 'absolute',
          top: '0.75rem',
          right: '0.75rem',
          zIndex: 10,
          display: 'flex',
          gap: '0.5rem'
        }}
      >
        {isDeleting || showDeleteConfirm ? (
          <>
            <Button
              size="sm"
              onClick={handleDeleteCancel}
              disabled={isDeleting}
              style={{ zIndex: 11 }}
            >
              {t('rooms.deleteCancel')}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              style={{ zIndex: 11 }}
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
              padding: '0.25rem',
              zIndex: 11,
              backgroundColor: 'var(--bg-app)'
            }}
            aria-label={`${t('rooms.delete')} ${room.name}`}
          >
            {t('rooms.delete')}
          </Button>
        )}
      </div>

      <Link
        to={`/rooms/${room.id}`}
        className="card room-card-container"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          textDecoration: 'none',
          color: 'inherit',
          paddingRight: '4.5rem' // Make space for the delete button
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
