import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
    MessageSquare,
    Cpu,
    Settings,
    Users,
    Plus,
    TrendingUp,
    Activity,
    Clock,
    Zap,
    ArrowRight,
    Sparkles,
    AlertCircle
} from 'lucide-react';
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

interface StatCardProps {
    icon: React.ReactNode;
    iconClass: string;
    value: string | number;
    label: string;
    trend?: 'up' | 'down' | 'neutral';
    trendIcon?: React.ReactNode;
    delay?: number;
}

function StatCard({ icon, iconClass, value, label, trend = 'neutral', trendIcon, delay = 0 }: StatCardProps) {
    return (
        <div
            className="stat-card-enhanced animate-in"
            style={{ animationDelay: `${delay * 0.1}s` }}
        >
            <div className={`stat-card-icon ${iconClass}`}>
                {icon}
            </div>
            <div className="stat-card-content">
                <span className="stat-card-value">{value}</span>
                <span className="stat-card-label">{label}</span>
            </div>
            <div className={`stat-card-trend ${trend}`}>
                {trendIcon}
            </div>
        </div>
    );
}

interface ActivityCardProps {
    title: string;
    description: string;
    status?: Room['status'];
    date: string;
    meta?: string;
    onClick?: () => void;
    delay?: number;
}

function ActivityCard({ title, description, status, date, meta, onClick, delay = 0 }: ActivityCardProps) {
    return (
        <div
            className="activity-card animate-in"
            style={{ animationDelay: `${delay * 0.1}s` }}
            onClick={onClick}
        >
            <div className="activity-card-header">
                <h3 className="activity-card-title">{title}</h3>
                {status && (
                    <span className={`status-badge-enhanced ${status}`}>
                        {status === 'idle' && 'Waiting'}
                        {status === 'running' && 'Running'}
                        {status === 'paused' && 'Paused'}
                    </span>
                )}
            </div>
            <p className="activity-card-description">{description}</p>
            <div className="activity-card-meta">
                <div className="activity-card-meta-item">
                    <Clock size={14} />
                    <span>{date}</span>
                </div>
                {meta && <span>{meta}</span>}
            </div>
        </div>
    );
}

interface QuickActionProps {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    delay?: number;
}

function QuickAction({ icon, label, onClick, delay = 0 }: QuickActionProps) {
    return (
        <button
            className="quick-action-btn-enhanced animate-in"
            style={{ animationDelay: `${delay * 0.1}s` }}
            onClick={onClick}
        >
            <span className="quick-action-icon">{icon}</span>
            <span>{label}</span>
        </button>
    );
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
            <div className="dashboard-container">
                <div className="dashboard-skeleton">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="skeleton-card">
                            <div className="skeleton-line short" />
                            <div className="skeleton-line" />
                            <div className="skeleton-line medium" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="empty-state-enhanced">
                <div className="empty-state-icon" style={{ borderColor: 'rgba(239, 68, 68, 0.3)', background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.05))' }}>
                    <AlertCircle size={40} />
                </div>
                <h3>Error Loading Dashboard</h3>
                <p>{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="btn btn-primary"
                >
                    Try Again
                </button>
            </div>
        );
    }

    const currentDate = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return (
        <div className="dashboard-container">
            {/* Hero Section */}
            <div className="dashboard-hero animate-in">
                <div className="dashboard-hero-content">
                    <h1>
                        <Sparkles size={28} />
                        Welcome Back{user ? `, ${user.username}` : ''}!
                    </h1>
                    <p className="dashboard-hero-subtitle">
                        {currentDate} • {stats?.isAdmin ? 'Administrator' : 'User'} Environment
                    </p>
                    <div className="dashboard-hero-actions">
                        <button
                            onClick={() => navigate('/rooms')}
                            className="btn btn-primary"
                            disabled={!stats?.isAdmin}
                        >
                            <Plus size={18} />
                            New Room
                        </button>
                        <button
                            onClick={() => navigate('/agents')}
                            className="btn btn-secondary"
                        >
                            <Cpu size={18} />
                            Manage Agents
                        </button>
                    </div>
                </div>
            </div>

            {/* Admin Notice */}
            {!stats?.isAdmin && (
                <div className="dashboard-notice-enhanced animate-in">
                    <AlertCircle size={18} />
                    <span>You need administrator permissions to create new rooms.</span>
                </div>
            )}

            {/* Stats Grid */}
            <div className="dashboard-stats-grid-enhanced">
                <StatCard
                    icon={<MessageSquare size={24} />}
                    iconClass="rooms"
                    value={stats?.totalRooms || 0}
                    label="Total Rooms"
                    trend="neutral"
                    trendIcon={<><TrendingUp size={16} /> <span>All time</span></>}
                    delay={1}
                />
                <StatCard
                    icon={<Cpu size={24} />}
                    iconClass="agents"
                    value={stats?.totalAgents || 0}
                    label="Total Agents"
                    trend="neutral"
                    trendIcon={<><Activity size={16} /> <span>Active</span></>}
                    delay={2}
                />
                {stats?.isAdmin && (
                    <StatCard
                        icon={<Users size={24} />}
                        iconClass="users"
                        value={stats?.totalUsers || 0}
                        label="Users"
                        trend="neutral"
                        trendIcon={<><Clock size={16} /> <span>Current</span></>}
                        delay={3}
                    />
                )}
                <StatCard
                    icon={<Settings size={24} />}
                    iconClass="settings"
                    value={stats?.isAdmin ? 'Admin' : 'User'}
                    label="Your Role"
                    trend="neutral"
                    trendIcon={<><TrendingUp size={16} /> <span>Access level</span></>}
                    delay={stats?.isAdmin ? 4 : 3}
                />
            </div>

            {/* Recent Rooms Section */}
            <div className="dashboard-section-enhanced">
                <div className="dashboard-section-header">
                    <h2 className="dashboard-section-title">
                        <MessageSquare size={20} />
                        Recent Rooms
                    </h2>
                    <button
                        onClick={() => navigate('/rooms')}
                        className="btn btn-ghost btn-sm"
                    >
                        View All <ArrowRight size={14} style={{ marginLeft: 4 }} />
                    </button>
                </div>
                {recentRooms.length > 0 ? (
                    <div className="activity-cards-grid">
                        {recentRooms.map((room, index) => (
                            <ActivityCard
                                key={room.id}
                                title={room.name}
                                description={room.topic || 'No topic defined'}
                                status={room.status}
                                date={new Date(room.createdAt).toLocaleDateString()}
                                meta={`${room.maxContextMessages} msgs max`}
                                onClick={() => navigate(`/rooms/${room.id}`)}
                                delay={index + 1}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="empty-state-enhanced">
                        <div className="empty-state-icon">
                            <MessageSquare size={32} />
                        </div>
                        <h3>No rooms created yet</h3>
                        <p>Start by creating your first environment for agent collaboration.</p>
                        <button
                            onClick={() => navigate('/rooms')}
                            className="btn btn-primary"
                            disabled={!stats?.isAdmin}
                        >
                            Create First Room
                        </button>
                    </div>
                )}
            </div>

            {/* Recent Agents Section */}
            <div className="dashboard-section-enhanced">
                <div className="dashboard-section-header">
                    <h2 className="dashboard-section-title">
                        <Cpu size={20} />
                        Recent Agents
                    </h2>
                    <button
                        onClick={() => navigate('/agents')}
                        className="btn btn-ghost btn-sm"
                    >
                        View All <ArrowRight size={14} style={{ marginLeft: 4 }} />
                    </button>
                </div>
                {recentAgents.length > 0 ? (
                    <div className="activity-cards-grid">
                        {recentAgents.map((agent, index) => (
                            <ActivityCard
                                key={agent.id}
                                title={agent.name}
                                description={
                                    agent.systemPrompt
                                        ? agent.systemPrompt.substring(0, 100) + '...'
                                        : 'No description'
                                }
                                date={new Date(agent.createdAt).toLocaleDateString()}
                                meta={agent.model}
                                onClick={() => navigate('/agents')}
                                delay={index + 1}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="empty-state-enhanced">
                        <div className="empty-state-icon">
                            <Cpu size={32} />
                        </div>
                        <h3>No agents configured</h3>
                        <p>Create your first agent persona to use in rooms.</p>
                        <button
                            onClick={() => navigate('/agents')}
                            className="btn btn-primary"
                        >
                            Create First Agent
                        </button>
                    </div>
                )}
            </div>

            {/* Quick Actions Section */}
            <div className="dashboard-section-enhanced">
                <div className="dashboard-section-header">
                    <h2 className="dashboard-section-title">
                        <Zap size={20} />
                        Quick Actions
                    </h2>
                </div>
                <div className="quick-actions-grid-enhanced">
                    <QuickAction
                        icon={<MessageSquare size={24} />}
                        label="Go to Rooms"
                        onClick={() => navigate('/rooms')}
                        delay={1}
                    />
                    <QuickAction
                        icon={<Cpu size={24} />}
                        label="Manage Agents"
                        onClick={() => navigate('/agents')}
                        delay={2}
                    />
                    <QuickAction
                        icon={<Settings size={24} />}
                        label="Settings"
                        onClick={() => navigate('/settings')}
                        delay={3}
                    />
                    {stats?.isAdmin && (
                        <QuickAction
                            icon={<Users size={24} />}
                            label="Manage Users"
                            onClick={() => navigate('/admin/users')}
                            delay={4}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
