import { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Room, RoomTemplate } from '@agentroom/shared';
import {
  listRooms,
  createRoom,
  deleteRoom,
  type CreateRoomInput,
  getRoomTemplates,
  createRoomFromTemplate
} from '../lib/api.ts';
import { Button } from '../components/Button.tsx';
import { RoomCard } from '../components/RoomCard.tsx';
import { RoomForm } from '../components/RoomForm.tsx';
import { Modal } from '../components/Modal.tsx';
import { RoomTemplateCard } from '../components/RoomTemplateCard.tsx';
import { RoomSkeletonGrid } from '../components/RoomSkeleton.tsx';
import { useNavigate } from 'react-router';
import { FileText, MessageSquare, Play, Pause, Search, X } from 'lucide-react';

export function RoomsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templates, setTemplates] = useState<RoomTemplate[]>([]);
  const [templateLoading, setTemplateLoading] = useState(false);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const loadRooms = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listRooms();
      setRooms(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('rooms.errorLoading'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const loadTemplates = useCallback(async () => {
    try {
      setTemplateLoading(true);
      const data = await getRoomTemplates();
      setTemplates(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('rooms.errorLoading'));
    } finally {
      setTemplateLoading(false);
    }
  }, [t]);

  const handleOpenTemplateModal = useCallback(() => {
    void loadTemplates();
    setIsTemplateModalOpen(true);
  }, [loadTemplates]);

  const handleCloseTemplateModal = useCallback(() => {
    setIsTemplateModalOpen(false);
  }, []);

  const handleSelectTemplate = useCallback(async (template: RoomTemplate) => {
    try {
      const room = await createRoomFromTemplate(template.id);
      setIsTemplateModalOpen(false);
      navigate(`/rooms/${room.id}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : t('rooms.errorCreating'));
    }
  }, [navigate, t]);

  useEffect(() => {
    const initialize = async () => {
      await loadRooms();
    };
    initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateRoom = useCallback(async (data: CreateRoomInput) => {
    const room = await createRoom(data);
    setIsModalOpen(false);
    await loadRooms();
    navigate(`/rooms/${room.id}`);
  }, [loadRooms, navigate]);

  const handleDeleteRoom = useCallback(async (id: string) => {
    setDeletingId(id);
    try {
      await deleteRoom(id);
      await loadRooms();
    } catch (err) {
      alert(err instanceof Error ? err.message : t('rooms.errorDeleting'));
    } finally {
      setDeletingId(null);
    }
  }, [loadRooms, t]);

  // Filter and search rooms
  const filteredRooms = useMemo(() => {
    let result = rooms;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(room => 
        room.name.toLowerCase().includes(query) || 
        (room.topic && room.topic.toLowerCase().includes(query))
      );
    }
    
    if (statusFilter !== 'all') {
      result = result.filter(room => room.status === statusFilter);
    }
    
    return result;
  }, [rooms, searchQuery, statusFilter]);
  
  // Room stats
  const roomStats = useMemo(() => {
    return {
      total: rooms.length,
      running: rooms.filter(r => r.status === 'running').length,
      idle: rooms.filter(r => r.status === 'idle').length,
      paused: rooms.filter(r => r.status === 'paused').length
    };
  }, [rooms]);

  if (loading && rooms.length === 0) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem' }}>
              {t('rooms.title')}
            </h1>
            <p style={{ color: 'var(--text-muted)' }}>
              {t('rooms.description')}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button
              variant="secondary"
              onClick={handleOpenTemplateModal}
              aria-label={t('rooms.createFromTemplate')}
            >
              <FileText size={18} aria-hidden="true" /> {t('rooms.createFromTemplate')}
            </Button>
            <Button
              variant="primary"
              onClick={() => setIsModalOpen(true)}
              aria-label={t('rooms.create')}
            >
              {t('rooms.create')}
            </Button>
          </div>
        </div>
        <RoomSkeletonGrid count={6} />
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>
            {t('rooms.title')}
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>
            {t('rooms.description')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button
            variant="secondary"
            onClick={handleOpenTemplateModal}
            aria-label={t('rooms.createFromTemplate')}
          >
            <FileText size={18} aria-hidden="true" /> {t('rooms.createFromTemplate')}
          </Button>
          <Button
            variant="primary"
            onClick={() => setIsModalOpen(true)}
            aria-label={t('rooms.create')}
          >
            {t('rooms.create')}
          </Button>
        </div>
      </div>

      {error && (
        <div className="error-banner" role="alert" aria-live="assertive">
          {error}
        </div>
      )}

      {/* Stats Summary */}
      {rooms.length > 0 && (
        <div className="rooms-stats-summary">
          <div className="stats-summary-card">
            <div className="stats-summary-icon" style={{ background: 'rgba(201, 87, 42, 0.15)', color: 'var(--accent)' }}>
              <MessageSquare size={20} />
            </div>
            <div className="stats-summary-content">
              <span className="stats-summary-value">{roomStats.total}</span>
              <span className="stats-summary-label">Total Rooms</span>
            </div>
          </div>
          <div className="stats-summary-card">
            <div className="stats-summary-icon" style={{ background: 'rgba(136, 192, 208, 0.15)', color: 'var(--running)' }}>
              <Play size={20} />
            </div>
            <div className="stats-summary-content">
              <span className="stats-summary-value">{roomStats.running}</span>
              <span className="stats-summary-label">Running</span>
            </div>
          </div>
          <div className="stats-summary-card">
            <div className="stats-summary-icon" style={{ background: 'rgba(139, 139, 153, 0.15)', color: 'var(--idle)' }}>
              <Pause size={20} />
            </div>
            <div className="stats-summary-content">
              <span className="stats-summary-value">{roomStats.idle}</span>
              <span className="stats-summary-label">Idle</span>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filter Controls */}
      {rooms.length > 0 && (
        <div className="rooms-controls">
          <div className="search-input-wrapper">
            <Search size={16} />
            <input
              type="text"
              className="search-input"
              placeholder="Search rooms by name or topic..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '0.5rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '2rem',
                  height: '2rem',
                  borderRadius: '4px',
                }}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="running">Running</option>
            <option value="idle">Idle</option>
            <option value="paused">Paused</option>
          </select>
        </div>
      )}

      {/* Filtered results count */}
      {(searchQuery || statusFilter !== 'all') && rooms.length > 0 && (
        <div style={{ 
          marginBottom: '1rem', 
          fontSize: '0.875rem', 
          color: 'var(--text-muted)' 
        }}>
          Showing {filteredRooms.length} of {rooms.length} rooms
          {(searchQuery || statusFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent)',
                cursor: 'pointer',
                marginLeft: '0.5rem',
                fontSize: '0.875rem',
                textDecoration: 'underline'
              }}
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {filteredRooms.length === 0 && !error && !loading ? (
        rooms.length === 0 ? (
          <div className="empty-state-enhanced fade-in" role="status">
            <div
              className="icon"
              style={{
                background: 'rgba(201, 87, 42, 0.1)',
                color: 'var(--accent)',
                border: '1px solid rgba(201, 87, 42, 0.2)'
              }}
              aria-hidden="true"
            >
              💬
            </div>
            <h2>{t('rooms.noActiveEnvironments')}</h2>
            <p>{t('rooms.noActiveDescription')}</p>
            <Button variant="primary" onClick={() => setIsModalOpen(true)}>
              {t('rooms.deployEnvironment')}
            </Button>
          </div>
        ) : (
          <div className="no-results fade-in" role="status">
            <div className="no-results-icon" aria-hidden="true">🔍</div>
            <h3>No rooms found</h3>
            <p>Try adjusting your search or filter criteria.</p>
            <Button 
              variant="secondary" 
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
              }}
              style={{ marginTop: '1rem' }}
            >
              Clear filters
            </Button>
          </div>
        )
      ) : (
        <div className="card-grid">
          {filteredRooms.map((room, index) => (
            <div
              key={room.id}
              className="room-card-enter"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <RoomCard
                room={room}
                onDelete={handleDeleteRoom}
                isDeleting={deletingId === room.id}
              />
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <Modal title={t('rooms.create')} onClose={() => setIsModalOpen(false)}>
          <RoomForm
            onSubmit={handleCreateRoom}
            onCancel={() => setIsModalOpen(false)}
          />
        </Modal>
      )}

      {isTemplateModalOpen && (
        <Modal title={t('rooms.chooseTemplate')} onClose={handleCloseTemplateModal}>
          {templateLoading ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              {t('rooms.loadingTemplates')}
            </div>
          ) : templates.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              {t('rooms.noTemplates')}
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '1rem'
              }}
            >
              {templates.map((template) => (
                <RoomTemplateCard
                  key={template.id}
                  template={template}
                  onSelect={handleSelectTemplate}
                />
              ))}
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
