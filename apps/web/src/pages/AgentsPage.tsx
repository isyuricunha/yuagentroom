import { useEffect, useState } from 'react';
import type { Agent, CreateAgentInput } from '@agentroom/shared';
import { listAgents, createAgent, updateAgent, deleteAgent, api as apiClient } from '../lib/api.ts';
import { Button } from '../components/Button.tsx';
import { AgentCard } from '../components/AgentCard.tsx';
import { AgentForm } from '../components/AgentForm.tsx';
import { Modal } from '../components/Modal.tsx';
import { Search, Plus, Cpu } from 'lucide-react';

export function AgentsPage() {
    const [agents, setAgents] = useState<Agent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<'name' | 'date'>('name');
    const [availableModels, setAvailableModels] = useState<string[]>([]);
    const [globalProvider, setGlobalProvider] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAgent, setEditingAgent] = useState<Agent | undefined>(undefined);

    async function loadSettings() {
        try {
            const settings = await apiClient.getSettings();
            if (settings.cached_models) {
                setAvailableModels(JSON.parse(settings.cached_models || '[]'));
            }
            setGlobalProvider(settings.global_provider_url || '');
        } catch {
            // Silently fail - settings optional
        }
    }

    async function loadAgents() {
        try {
            setLoading(true);
            setError(null);
            const data = await listAgents();
            setAgents(data);
            await loadSettings();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Falha ao carregar agents');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        let cancelled = false;

        async function loadAgentsEffect() {
            try {
                setLoading(true);
                setError(null);
                const data = await listAgents();
                if (cancelled) return;
                setAgents(data);
                await loadSettings();
            } catch (err) {
                if (cancelled) return;
                setError(err instanceof Error ? err.message : 'Falha ao carregar agents');
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        loadAgentsEffect();

        return () => {
            cancelled = true;
        };
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
        setEditingAgent({ ...agent, id: '', name: `${agent.name} (Cópia)` });
        setIsModalOpen(true);
    }

    function handleCloseModal() {
        setIsModalOpen(false);
        setEditingAgent(undefined);
        setError(null);
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
            alert(err instanceof Error ? err.message : 'Falha ao deletar agent');
        }
    }

    const filteredAgents = agents
        .filter((agent) =>
            agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            agent.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
            agent.systemPrompt.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => {
            if (sortBy === 'name') {
                return a.name.localeCompare(b.name);
            }
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

    if (loading) {
        return (
            <div className="agents-loading">
                <div className="agents-spinner"></div>
                <p>Carregando agents...</p>
            </div>
        );
    }

    return (
        <>
            <div className="page-header">
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Cpu size={24} />
                        Agents
                    </h1>
                    <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        Gerencie os personas disponíveis para suas rooms.
                    </p>
                </div>
                <Button variant="primary" onClick={handleOpenCreate}>
                    <Plus size={18} /> Novo Agent
                </Button>
            </div>

            {error && <div className="error-banner">{error}</div>}

            {agents.length === 0 && !error && !loading ? (
                <div className="empty-state fade-in">
                    <div
                        className="icon"
                        style={{
                            background: 'rgba(59, 130, 246, 0.1)',
                            color: 'var(--accent)',
                            border: '1px solid rgba(59, 130, 246, 0.2)',
                        }}
                    >
                        🤖
                    </div>
                    <h2>Nenhuma Inteligência Configurada</h2>
                    <p>O sistema precisa de pelo menos um persona automatizado antes de ativar uma room.</p>
                    <Button variant="primary" onClick={handleOpenCreate}>
                        Inicializar Agent
                    </Button>
                </div>
            ) : (
                <>
                    {/* Search and Sort Bar */}
                    <div className="agents-toolbar">
                        <div className="search-wrapper">
                            <Search className="search-icon" size={18} />
                            <input
                                type="text"
                                className="search-input"
                                placeholder="Buscar agents por nome, modelo ou prompt..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="sort-wrapper">
                            <label>Ordenar por:</label>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as 'name' | 'date')}
                                className="sort-select"
                            >
                                <option value="name">Nome (A-Z)</option>
                                <option value="date">Mais Recente</option>
                            </select>
                        </div>
                    </div>

                    {/* Stats Bar */}
                    <div className="agents-stats">
                        <span className="stat-item">
                            <strong>{filteredAgents.length}</strong> de <strong>{agents.length}</strong> agents
                        </span>
                        {globalProvider && (
                            <span className="stat-item">
                                {' '}
                                Provedor: <strong>{globalProvider}</strong>
                            </span>
                        )}
                        {availableModels.length > 0 && (
                            <span className="stat-item">
                                {' '}
                                Modelos: <strong>{availableModels.length} disponíveis</strong>
                            </span>
                        )}
                    </div>

                    <div className="card-grid">
                        {filteredAgents.length > 0 ? (
                            filteredAgents.map((agent) => (
                                <AgentCard
                                    key={agent.id}
                                    agent={agent}
                                    onEdit={handleOpenEdit}
                                    onClone={handleOpenClone}
                                    onDelete={handleDelete}
                                />
                            ))
                        ) : (
                            <div className="empty-search-state">
                                <Search size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                                <p>Nenhum agent encontrado para "{searchTerm}"</p>
                                <Button variant="ghost" onClick={() => setSearchTerm('')} style={{ marginTop: '0.5rem' }}>
                                    Limpar busca
                                </Button>
                            </div>
                        )}
                    </div>
                </>
            )}

            {isModalOpen && (
                <Modal title={editingAgent?.id ? 'Editar Agent' : 'Criar Agent'} onClose={handleCloseModal}>
                    <AgentForm
                        initialData={editingAgent}
                        onSubmit={handleSubmit}
                        onCancel={handleCloseModal}
                        availableModels={availableModels}
                    />
                </Modal>
            )}
        </>
    );
}