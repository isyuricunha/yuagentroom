import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  MessageSquare,
  Cpu,
  Settings,
  Users,
  Plus,
  TrendingUp,
  Activity as ActivityIcon,
  Clock,
  Zap,
  ArrowRight,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { getCurrentUser, listRooms, listAgents, listUsers } from '../lib/api';
import type { User, Room, Agent } from '@agentroom/shared';
import { StatCard } from '../components/StatCard';
import { ActivityCard } from '../components/ActivityCard';
import { QuickAction } from '../components/QuickAction';

interface DashboardStats {
  totalRooms: number;
  totalAgents: number;
  totalUsers: number;
  isAdmin: boolean;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
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

        const currentUser = await getCurrentUser();
        setUser(currentUser);

        let roomsData: Room[] = [];
        try {
          roomsData = await listRooms();
          setRecentRooms(roomsData.slice(0, 4).reverse());
        } catch {
          setRecentRooms([]);
        }

        let agentsData: Agent[] = [];
        try {
          agentsData = await listAgents();
          setRecentAgents(agentsData.slice(0, 4).reverse());
        } catch {
          setRecentAgents([]);
        }

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
        setError(err instanceof Error ? err.message : String(t('dashboard.errorLoading')));
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [t]);

  const currentDate = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }, []);

  const handleNavigate = useCallback((path: string) => {
    navigate(path);
  }, [navigate]);

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
      <div className="empty-state-enhanced" role="alert" aria-live="assertive">
        <div className="empty-state-icon" style={{ borderColor: 'rgba(191, 97, 106, 0.3)', background: 'linear-gradient(135deg, rgba(191, 97, 106, 0.15), rgba(191, 97, 106, 0.05))' }}>
          <AlertCircle size={40} aria-hidden="true" />
        </div>
        <h3>{t('dashboard.errorLoading')}</h3>
        <p>{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="btn btn-primary"
          aria-label={t('dashboard.tryAgain') || 'Try Again'}
        >
          {t('dashboard.tryAgain')}
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Hero Section */}
      <div className="dashboard-hero animate-in">
        <div className="dashboard-hero-content">
          <h1>
            <Sparkles size={28} aria-hidden="true" />
            {t('dashboard.welcome')}{user ? `, ${user.username}` : ''}!
          </h1>
          <p className="dashboard-hero-subtitle">
            {currentDate} • {stats?.isAdmin ? t('dashboard.administrator') : t('dashboard.user')} {t('dashboard.subtitle')}
          </p>
          <div className="dashboard-hero-actions">
            <button
              onClick={() => handleNavigate('/rooms')}
              className="btn btn-primary"
              disabled={!stats?.isAdmin}
              aria-label={t('dashboard.newRoom') || 'New Room'}
            >
              <Plus size={18} aria-hidden="true" />
              {t('dashboard.newRoom')}
            </button>
            <button
              onClick={() => handleNavigate('/agents')}
              className="btn btn-secondary"
              aria-label={t('dashboard.manageAgents') || 'Manage Agents'}
            >
              <Cpu size={18} aria-hidden="true" />
              {t('dashboard.manageAgents')}
            </button>
          </div>
        </div>
      </div>

      {/* Admin Notice */}
      {!stats?.isAdmin && (
        <div className="dashboard-notice-enhanced animate-in" role="alert" aria-live="polite">
          <AlertCircle size={18} aria-hidden="true" />
          <span>{t('dashboard.notice')}</span>
        </div>
      )}

      {/* Stats Grid */}
      <div className="dashboard-stats-grid-enhanced">
        <StatCard
          icon={<MessageSquare size={24} />}
          iconClass="rooms"
          value={stats?.totalRooms || 0}
          label={t('dashboard.stats.totalRooms')}
          trend="neutral"
          trendIcon={<><TrendingUp size={16} aria-hidden="true" /> <span>{t('dashboard.stats.allTime')}</span></>}
          delay={1}
        />
        <StatCard
          icon={<Cpu size={24} />}
          iconClass="agents"
          value={stats?.totalAgents || 0}
          label={t('dashboard.stats.totalAgents')}
          trend="neutral"
          trendIcon={<><ActivityIcon size={16} aria-hidden="true" /> <span>{t('dashboard.stats.active')}</span></>}
          delay={2}
        />
        {stats?.isAdmin && (
          <StatCard
            icon={<Users size={24} />}
            iconClass="users"
            value={stats?.totalUsers || 0}
            label={t('dashboard.stats.totalUsers')}
            trend="neutral"
            trendIcon={<><Clock size={16} aria-hidden="true" /> <span>{t('dashboard.stats.current')}</span></>}
            delay={3}
          />
        )}
        <StatCard
          icon={<Settings size={24} />}
          iconClass="settings"
          value={stats?.isAdmin ? 'Admin' : 'User'}
          label={t('dashboard.stats.yourRole')}
          trend="neutral"
          trendIcon={<><TrendingUp size={16} aria-hidden="true" /> <span>{t('dashboard.stats.accessLevel')}</span></>}
          delay={stats?.isAdmin ? 4 : 3}
        />
      </div>

      {/* Recent Rooms Section */}
      <div className="dashboard-section-enhanced">
        <div className="dashboard-section-header">
          <h2 className="dashboard-section-title">
            <MessageSquare size={20} aria-hidden="true" />
            {t('dashboard.recent.rooms')}
          </h2>
          <button
            onClick={() => handleNavigate('/rooms')}
            className="btn btn-ghost btn-sm"
            aria-label={`${t('dashboard.recent.viewAll')} - ${t('dashboard.recent.rooms')}`}
          >
            {t('dashboard.recent.viewAll')} <ArrowRight size={14} style={{ marginLeft: 4 }} aria-hidden="true" />
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
                onClick={() => handleNavigate(`/rooms/${room.id}`)}
                delay={index + 1}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state-enhanced" role="status">
            <div className="empty-state-icon">
              <MessageSquare size={32} aria-hidden="true" />
            </div>
            <h3>{t('dashboard.recent.noRooms')}</h3>
            <p>{t('dashboard.recent.startByCreating')}</p>
            <button
              onClick={() => handleNavigate('/rooms')}
              className="btn btn-primary"
              disabled={!stats?.isAdmin}
              aria-label={t('dashboard.recent.createFirstRoom') || 'Create First Room'}
            >
              {t('dashboard.recent.createFirstRoom')}
            </button>
          </div>
        )}
      </div>

      {/* Recent Agents Section */}
      <div className="dashboard-section-enhanced">
        <div className="dashboard-section-header">
          <h2 className="dashboard-section-title">
            <Cpu size={20} aria-hidden="true" />
            {t('dashboard.recent.agents')}
          </h2>
          <button
            onClick={() => handleNavigate('/agents')}
            className="btn btn-ghost btn-sm"
            aria-label={`${t('dashboard.recent.viewAll')} - ${t('dashboard.recent.agents')}`}
          >
            {t('dashboard.recent.viewAll')} <ArrowRight size={14} style={{ marginLeft: 4 }} aria-hidden="true" />
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
                onClick={() => handleNavigate('/agents')}
                delay={index + 1}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state-enhanced" role="status">
            <div className="empty-state-icon">
              <Cpu size={32} aria-hidden="true" />
            </div>
            <h3>{t('dashboard.recent.noAgents')}</h3>
            <p>{t('dashboard.recent.createFirstAgentDesc')}</p>
            <button
              onClick={() => handleNavigate('/agents')}
              className="btn btn-primary"
              aria-label={t('dashboard.recent.createFirstAgent') || 'Create First Agent'}
            >
              {t('dashboard.recent.createFirstAgent')}
            </button>
          </div>
        )}
      </div>

      {/* Quick Actions Section */}
      <div className="dashboard-section-enhanced">
        <div className="dashboard-section-header">
          <h2 className="dashboard-section-title">
            <Zap size={20} aria-hidden="true" />
            {t('dashboard.quickActions.title')}
          </h2>
        </div>
        <div className="quick-actions-grid-enhanced">
          <QuickAction
            icon={<MessageSquare size={24} />}
            label={t('dashboard.quickActions.goToRooms')}
            onClick={() => handleNavigate('/rooms')}
            delay={1}
          />
          <QuickAction
            icon={<Cpu size={24} />}
            label={t('dashboard.quickActions.manageAgents')}
            onClick={() => handleNavigate('/agents')}
            delay={2}
          />
          <QuickAction
            icon={<Settings size={24} />}
            label={t('dashboard.quickActions.settings')}
            onClick={() => handleNavigate('/settings')}
            delay={3}
          />
          {stats?.isAdmin && (
            <QuickAction
              icon={<Users size={24} />}
              label={t('dashboard.quickActions.manageUsers')}
              onClick={() => handleNavigate('/admin/users')}
              delay={4}
            />
          )}
        </div>
      </div>
    </div>
  );
}
