import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { MessageSquare, Cpu, Settings, Users, Plus, TrendingUp, Activity, Clock } from 'lucide-react';
import { getCurrentUser, listRooms, listAgents, listUsers } from '../lib/api';
import type { User } from '@agentroom/shared';
import type { Room } from '@agentroom/shared';
import type { Agent } from '@agentroom/shared';

interface DashboardStats {
    totalRooms: number;
    totalAgents: number;
    totalUsers: number;
    isAdmin: boolean;
}

export function DashboardPage() {
    const navigate = useNavigate();
    const [user, setUser] = useState<User | null>(null);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [recentRooms, setRecentRooms] = useState<Room[]>([]);
    const [recentAgents, setRecentAgents] = useState<Agent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadData() {
            try {
                setLoading(true);
                setError(null);

                // Get current user
                const currentUser = await getCurrentUser();
                setUser(currentUser);

                // Load rooms
                let roomsData: Room[] = [];
                try {
                    roomsData = await listRooms();
                    setRecentRooms(roomsData.slice(0, 4).reverse());
                } catch {
                    setRecentRooms([]);
                }

                // Load agents
                let agentsData: Agent[] = [];
                try {
                    agentsData = await listAgents();
                    setRecentAgents(agentsData.slice(0, 4).reverse());
                } catch {
                    setRecentAgents([]);
                }

                // Load users count for stats
                let usersCount = 0;
                try {
                    const usersData = await listUsers();
                    usersCount = usersData.length;
                } catch {
                    usersCount = 0;
                }

                setStats({
                    totalRooms: roomsData.length,
                    totalAgents: agentsData.length,
                    totalUsers: usersCount,
                    isAdmin: currentUser?.role === 'admin',
                });
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load dashboard');
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    if (loading) {
        return (
            <div className="dashboard-loading">
                <div className="dashboard-spinner"></div>
                <p>Carregando dashboard...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="dashboard-error">
                <p>{error}</p>
                <button onClick={() => window.location.reload()} className="btn btn-primary">
                    Tentar Novamente
                </button>
            </div>
        );
    }

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <div className="dashboard-header-content">
                    <h1>Bem-vindo de Volta{user ? `, ${user.username}` : ''}!</h1>
                    <p className="dashboard-subtitle">Visão geral do seu ambiente AgentRoom</p>
                </div>
                <div className="dashboard-actions">
                    <button
                        onClick={() => navigate('/rooms')}
                        className="btn btn-primary"
                        disabled={!stats?.isAdmin}
                    >
                        <Plus size={18} />
                        Nova Room
                    </button>
                    <button onClick={() => navigate('/agents')} className="btn btn-secondary">
                        <Cpu size={18} />
                        Gerenciar Agents
                    </button>
                </div>
            </div>

            {!stats?.isAdmin && (
                <div className="dashboard-notice">
                    <p>ℹ️ Você precisa de permissões de administrador para criar novas rooms.</p>
                </div>
            )}

            {/* Stats Cards */}
            <div className="dashboard-stats-grid">
                <div className="stat-card">
                    <div className="stat-icon rooms">
                        <MessageSquare size={24} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{stats?.totalRooms || 0}</span>
                        <span className="stat-label">Total de Rooms</span>
                    </div>
                    <div className="stat-trend">
                        <TrendingUp size={16} />
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon agents">
                        <Cpu size={24} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{stats?.totalAgents || 0}</span>
                        <span className="stat-label">Total de Agents</span>
                    </div>
                    <div className="stat-trend">
                        <Activity size={16} />
                    </div>
                </div>

                {stats?.isAdmin && (
                    <div className="stat-card">
                        <div className="stat-icon users">
                            <Users size={24} />
                        </div>
                        <div className="stat-content">
                            <span className="stat-value">{stats?.totalUsers || 0}</span>
                            <span className="stat-label">Usuários</span>
                        </div>
                        <div className="stat-trend">
                            <Clock size={16} />
                        </div>
                    </div>
                )}

                <div className="stat-card">
                    <div className="stat-icon settings">
                        <Settings size={24} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{stats?.isAdmin ? 'Admin' : 'User'}</span>
                        <span className="stat-label">Seu Papel</span>
                    </div>
                    <div className="stat-trend">
                        <TrendingUp size={16} />
                    </div>
                </div>
            </div>

            {/* Recent Rooms */}
            <div className="dashboard-section">
                <div className="section-header">
                    <h2>
                        <MessageSquare size={20} />
                        Rooms Recentes
                    </h2>
                    <button onClick={() => navigate('/rooms')} className="btn btn-ghost btn-sm">
                        Ver Todas →
                    </button>
                </div>
                {recentRooms.length > 0 ? (
                    <div className="dashboard-cards-grid">
                        {recentRooms.map((room) => (
                            <div
                                key={room.id}
                                className="dashboard-card room-card"
                                onClick={() => navigate(`/rooms/${room.id}`)}
                                style={{ cursor: 'pointer' }}
                            >
                                <div className="card-header">
                                    <h3>{room.name}</h3>
                                    <span className={`status-badge status-${room.status}`}>
                                        {room.status === 'idle' && 'Aguardando'}
                                        {room.status === 'running' && 'Rodando'}
                                        {room.status === 'paused' && 'Pausado'}
                                    </span>
                                </div>
                                <p className="card-description">
                                    {room.topic || 'Sem tópico definido'}
                                </p>
                                <div className="card-meta">
                                    <span>
                                        <Clock size={14} />
                                        {new Date(room.createdAt).toLocaleDateString('pt-BR')}
                                    </span>
                                    <span>{room.maxContextMessages} msgs máx.</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-state-mini">
                        <p>Nenhuma room criada ainda.</p>
                        <button onClick={() => navigate('/rooms')} className="btn btn-primary btn-sm">
                            Criar Primeira Room
                        </button>
                    </div>
                )}
            </div>

            {/* Recent Agents */}
            <div className="dashboard-section">
                <div className="section-header">
                    <h2>
                        <Cpu size={20} />
                        Agents Recentes
                    </h2>
                    <button onClick={() => navigate('/agents')} className="btn btn-ghost btn-sm">
                        Ver Todos →
                    </button>
                </div>
                {recentAgents.length > 0 ? (
                    <div className="dashboard-cards-grid">
                        {recentAgents.map((agent) => (
                            <div key={agent.id} className="dashboard-card agent-card">
                                <div className="card-header">
                                    <h3>{agent.name}</h3>
                                    <span className="model-badge">{agent.model}</span>
                                </div>
                                <p className="card-description">
                                    {agent.systemPrompt
                                        ? agent.systemPrompt.substring(0, 100) + '...'
                                        : 'Sem descrição'}
                                </p>
                                <div className="card-meta">
                                    <span>
                                        <Clock size={14} />
                                        {new Date(agent.createdAt).toLocaleDateString('pt-BR')}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-state-mini">
                        <p>Nenhum agent criado ainda.</p>
                        <button onClick={() => navigate('/agents')} className="btn btn-primary btn-sm">
                            Criar Primeiro Agent
                        </button>
                    </div>
                )}
            </div>

            {/* Quick Actions */}
            <div className="dashboard-section">
                <div className="section-header">
                    <h2>⚡ Ações Rápidas</h2>
                </div>
                <div className="quick-actions-grid">
                    <button onClick={() => navigate('/rooms')} className="quick-action-btn">
                        <MessageSquare size={20} />
                        <span>Ir para Rooms</span>
                    </button>
                    <button onClick={() => navigate('/agents')} className="quick-action-btn">
                        <Cpu size={20} />
                        <span>Gerenciar Agents</span>
                    </button>
                    <button onClick={() => navigate('/settings')} className="quick-action-btn">
                        <Settings size={20} />
                        <span>Configurações</span>
                    </button>
                    {stats?.isAdmin && (
                        <button onClick={() => navigate('/admin/users')} className="quick-action-btn">
                            <Users size={20} />
                            <span>Gerenciar Usuários</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}