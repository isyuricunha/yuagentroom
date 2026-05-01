import { useState } from 'react';
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <div className="room-card-wrapper" style={{ position: 'relative' }}>
      <Link to={`/rooms/${room.id}`} className="card room-card-container" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textDecoration: 'none', color: 'inherit' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <div className="message-avatar" style={{ width: 40, height: 40, background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
              <MessageSquare size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-heading)' }}>{room.name}</h3>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                Created {new Date(room.createdAt).toLocaleDateString()}
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
          {room.topic || 'No topic provided. Agents will chat freely.'}
        </div>

        <div style={{ marginTop: 'auto', display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }} title="Turn Delay">
              <Clock size={14} /> {room.turnDelayMs}ms
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }} title="Context Limit">
              <Layers size={14} /> {room.maxContextMessages} msgs
            </span>
          </div>
        </div>
      </Link>

      <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', display: 'flex', gap: '0.5rem' }}>
        {isDeleting || showDeleteConfirm ? (
          <>
            <Button size="sm" onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={() => onDelete(room.id)} disabled={isDeleting}>
              {isDeleting ? '...' : 'Confirm'}
            </Button>
          </>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDeleteConfirm(true)}
            style={{ color: 'var(--danger)', padding: '0.25rem' }}
            aria-label="Delete room"
          >
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}
