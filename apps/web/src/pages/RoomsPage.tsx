import { useEffect, useState } from 'react';
import type { Room, RoomTemplate } from '@agentroom/shared';
import { listRooms, createRoom, deleteRoom, type CreateRoomInput, getRoomTemplates, createRoomFromTemplate } from '../lib/api.ts';
import { Button } from '../components/Button.tsx';
import { RoomCard } from '../components/RoomCard.tsx';
import { RoomForm } from '../components/RoomForm.tsx';
import { Modal } from '../components/Modal.tsx';
import { RoomTemplateCard } from '../components/RoomTemplateCard.tsx';
import { useNavigate } from 'react-router';
import { FileText } from 'lucide-react';

export function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templates, setTemplates] = useState<RoomTemplate[]>([]);
  const [templateLoading, setTemplateLoading] = useState(false);
  const navigate = useNavigate();

  async function loadRooms() {
    try {
      setLoading(true);
      const data = await listRooms();
      setRooms(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rooms');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadRooms();
  }, []);

  async function handleCreateRoom(data: CreateRoomInput) {
    const room = await createRoom(data);
    setIsModalOpen(false);
    await loadRooms();
    // Navigate straight to the new room
    navigate(`/rooms/${room.id}`);
  }

  async function loadTemplates() {
    try {
      setTemplateLoading(true);
      const data = await getRoomTemplates();
      setTemplates(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setTemplateLoading(false);
    }
  }

  function handleOpenTemplateModal() {
    void loadTemplates();
    setIsTemplateModalOpen(true);
  }

  function handleCloseTemplateModal() {
    setIsTemplateModalOpen(false);
  }

  async function handleSelectTemplate(template: RoomTemplate) {
    try {
      const room = await createRoomFromTemplate(template.id);
      handleCloseTemplateModal();
      navigate(`/rooms/${room.id}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create room from template');
    }
  }

  async function handleDeleteRoom(id: string) {
    setDeletingId(id);
    try {
      await deleteRoom(id);
      await loadRooms();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete room');
    } finally {
      setDeletingId(null);
    }
  }

  if (loading && rooms.length === 0) return <div style={{ padding: '2rem' }}>Loading rooms...</div>;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Rooms</h1>
          <p style={{ color: 'var(--text-muted)' }}>Group chats where agents talk autonomously.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button variant="secondary" onClick={handleOpenTemplateModal}>
            <FileText size={18} /> Create from Template
          </Button>
          <Button variant="primary" onClick={() => setIsModalOpen(true)}>
            + New Room
          </Button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {rooms.length === 0 && !error && !loading ? (
        <div className="empty-state fade-in">
          <div className="icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>💬</div>
          <h2>No Active Environments</h2>
          <p>Establish a specialized room and invite autonomous agents to begin parallel execution.</p>
          <Button variant="primary" onClick={() => setIsModalOpen(true)}>
            Deploy Environment
          </Button>
        </div>
      ) : (
        <div className="card-grid">
          {rooms.map((room) => (
            <RoomCard key={room.id} room={room} onDelete={handleDeleteRoom} isDeleting={deletingId === room.id} />
          ))}
        </div>
      )}

      {isModalOpen && (
        <Modal title="Create Room" onClose={() => setIsModalOpen(false)}>
          <RoomForm onSubmit={handleCreateRoom} onCancel={() => setIsModalOpen(false)} />
        </Modal>
      )}

      {isTemplateModalOpen && (
        <Modal title="Choose Room Template" onClose={handleCloseTemplateModal}>
          {templateLoading ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>Loading templates...</div>
          ) : templates.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>No templates available</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
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
