import { useEffect, useState, useCallback } from 'react';
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
import { useNavigate } from 'react-router';
import { FileText } from 'lucide-react';

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

  if (loading && rooms.length === 0) {
    return (
      <div style={{ padding: '2rem' }} role="status" aria-live="polite">
        {t('rooms.loading')}
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

      {rooms.length === 0 && !error && !loading ? (
        <div className="empty-state fade-in" role="status">
          <div
            className="icon"
            style={{
              background: 'rgba(59, 130, 246, 0.1)',
              color: 'var(--accent)',
              border: '1px solid rgba(59, 130, 246, 0.2)'
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
        <div className="card-grid">
          {rooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              onDelete={handleDeleteRoom}
              isDeleting={deletingId === room.id}
            />
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
