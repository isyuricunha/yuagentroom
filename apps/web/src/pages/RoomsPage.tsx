import { useEffect, useState } from 'react';
import type { Room } from '@agentroom/shared';
import { listRooms, createRoom, deleteRoom, type CreateRoomInput } from '../lib/api.ts';
import { Button } from '../components/Button.tsx';
import { RoomCard } from '../components/RoomCard.tsx';
import { RoomForm } from '../components/RoomForm.tsx';
import { Modal } from '../components/Modal.tsx';
import { useNavigate } from 'react-router';

export function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
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

  async function handleDeleteRoom(id: string) {
    try {
      await deleteRoom(id);
      await loadRooms();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete room');
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
        <Button variant="primary" onClick={() => setIsModalOpen(true)}>
          + New Room
        </Button>
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
            <RoomCard key={room.id} room={room} onDelete={handleDeleteRoom} />
          ))}
        </div>
      )}

      {isModalOpen && (
        <Modal title="Create Room" onClose={() => setIsModalOpen(false)}>
          <RoomForm onSubmit={handleCreateRoom} onCancel={() => setIsModalOpen(false)} />
        </Modal>
      )}
    </>
  );
}
