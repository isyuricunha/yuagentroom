import { useEffect, useState } from 'react';
import type { Agent, CreateAgentInput } from '@agentroom/shared';
import { listAgents, createAgent, updateAgent, deleteAgent } from '../lib/api.ts';
import { Button } from '../components/Button.tsx';
import { AgentCard } from '../components/AgentCard.tsx';
import { AgentForm } from '../components/AgentForm.tsx';
import { Modal } from '../components/Modal.tsx';

export function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | undefined>(undefined);

  async function loadAgents() {
    try {
      setLoading(true);
      const data = await listAgents();
      setAgents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agents');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadAgents();
  }, []);

  function handleOpenCreate() {
    setEditingAgent(undefined);
    setIsModalOpen(true);
  }

  function handleOpenEdit(agent: Agent) {
    setEditingAgent(agent);
    setIsModalOpen(true);
  }

  function handleOpenClone(agent: Agent) {
    // We pass a cloned object without the ID so the form treats it as "new"
    setEditingAgent({
      ...agent,
      id: '',
      name: `${agent.name} (Copy)`
    });
    setIsModalOpen(true);
  }

  function handleCloseModal() {
    setIsModalOpen(false);
    setEditingAgent(undefined);
  }

async function handleSubmit(data: CreateAgentInput) {
     if (editingAgent?.id) {
       await updateAgent(editingAgent.id, data);
     } else {
       await createAgent(data);
     }
    await loadAgents();
    handleCloseModal();
  }

  async function handleDelete(id: string) {
    try {
      await deleteAgent(id);
      await loadAgents();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete agent');
    }
  }

  if (loading && agents.length === 0) return <div style={{ padding: '2rem' }}>Loading agents...</div>;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Agents</h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage the personas available for your rooms.</p>
        </div>
        <Button variant="primary" onClick={handleOpenCreate}>
          + New Agent
        </Button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {agents.length === 0 && !error && !loading ? (
        <div className="empty-state fade-in">
          <div className="icon">🤖</div>
          <h2>No Intelligence Configured</h2>
          <p>The system needs at least one automated persona before activating a room.</p>
          <Button variant="primary" onClick={handleOpenCreate}>
            Initialize Agent
          </Button>
        </div>
      ) : (
        <div className="card-grid">
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onEdit={handleOpenEdit}
              onClone={handleOpenClone}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

{isModalOpen && (
         <Modal
           title={editingAgent?.id ? 'Edit Agent' : 'Create Agent'}
           onClose={handleCloseModal}
         >
          <AgentForm
            initialData={editingAgent}
            onSubmit={handleSubmit}
            onCancel={handleCloseModal}
          />
        </Modal>
      )}
    </>
  );
}
