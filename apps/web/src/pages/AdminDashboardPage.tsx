import { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import {
  Users,
  MessageSquare,
  Cpu,
  Settings,
  TrendingUp,
  Activity,
  Shield,
  Zap
} from 'lucide-react';
import { listUsers, listRooms, listAgents } from '../lib/api.ts';
import type { User } from '@agentroom/shared';

interface AdminStats {
  totalUsers: number;
  totalRooms: number;
  totalAgents: number;
  activeRooms: number;
  isAdmin: boolean;
}

interface StatCardProps {
  icon: React.ReactNode;
  iconClass: string;
  value: string | number;
  label: string;
  trend?: 'up' | 'down' | 'neutral';
  delay?: number;
}

function StatCard({ icon, iconClass, value, label, trend = 'neutral', delay = 0 }: StatCardProps) {
  return (
    <div
      className="stat-card-enhanced animate-in"
      style={{ animationDelay: `${delay * 0.1}s` }}
      role="region"
      aria-label={`${label}: ${value}`}
    >
      <div className={`stat-card-icon ${iconClass}`}>{icon}</div>
      <div className="stat-card-content">
        <span className="stat-card-value">{value}</span>
        <span className="stat-card-label">{label}</span>
      </div>
      <div className={`stat-card-trend ${trend}`}>
        {trend === 'up' && <TrendingUp size={16} />}
        {trend === 'down' && <Activity size={16} />}
        {trend === 'neutral' && <Shield size={16} />}
      </div>
    </div>
  );
}

export function AdminDashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [usersData, roomsData, agentsData] = await Promise.all([
        listUsers(),
        listRooms(),
        listAgents()
      ]);

      setUsers(usersData);

      setStats({
        totalUsers: usersData.length,
        totalRooms: roomsData.length,
        totalAgents: agentsData.length,
        activeRooms: roomsData.filter(r => r.status === 'running').length,
        isAdmin: true
      });
    } catch {
      setLoading(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      await loadData();
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const quickActions = useMemo(() => [
    {
      icon: <Users size={24} />,
      label: t('admin.dashboard.quickActions.manageUsers'),
      path: '/admin/users',
      delay: 1
    },
    {
      icon: <MessageSquare size={24} />,
      label: t('admin.dashboard.quickActions.manageRooms'),
      path: '/rooms',
      delay: 2
    },
    {
      icon: <Cpu size={24} />,
      label: t('admin.dashboard.quickActions.manageAgents'),
      path: '/agents',
      delay: 3
    },
    {
      icon: <Settings size={24} />,
      label: t('admin.dashboard.quickActions.systemSettings'),
      path: '/settings',
      delay: 4
    }
  ], [t]);

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

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-hero animate-in">
        <div className="dashboard-hero-content">
          <h1>
            <Shield size={28} />
            {t('admin.dashboard.welcome')}
          </h1>
          <p className="dashboard-hero-subtitle">
            {t('admin.dashboard.description')}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="dashboard-stats-grid-enhanced">
        <StatCard
          icon={<Users size={24} />}
          iconClass="users"
          value={stats?.totalUsers || 0}
          label={t('admin.dashboard.stats.totalUsers')}
          trend="neutral"
          delay={1}
        />
        <StatCard
          icon={<MessageSquare size={24} />}
          iconClass="rooms"
          value={stats?.totalRooms || 0}
          label={t('admin.dashboard.stats.totalRooms')}
          trend="neutral"
          delay={2}
        />
        <StatCard
          icon={<Cpu size={24} />}
          iconClass="agents"
          value={stats?.totalAgents || 0}
          label={t('admin.dashboard.stats.totalAgents')}
          trend="neutral"
          delay={3}
        />
        <StatCard
          icon={<Activity size={24} />}
          iconClass="active"
          value={stats?.activeRooms || 0}
          label={t('admin.dashboard.stats.activeRooms')}
          trend="up"
          delay={4}
        />
      </div>

      {/* Quick Actions */}
      <div className="dashboard-section-enhanced">
        <div className="dashboard-section-header">
          <h2 className="dashboard-section-title">
            <Zap size={20} />
            {t('admin.dashboard.quickActions.systemSettings')}
          </h2>
        </div>
        <div className="quick-actions-grid-enhanced">
            {quickActions.map((action) => (
              <button
                key={action.path}
                className="quick-action-btn-enhanced animate-in"
                style={{ animationDelay: `${action.delay * 0.1}s` }}
                onClick={() => navigate(action.path)}
                type="button"
                aria-label={action.label}
              >
                <span className="quick-action-icon" aria-hidden="true">{action.icon}</span>
                <span>{action.label}</span>
              </button>
            ))}
        </div>
      </div>

      {/* Recent Users Table Preview */}
      <div className="dashboard-section-enhanced">
        <div className="dashboard-section-header">
          <h2 className="dashboard-section-title">
            <Users size={20} />
            {t('admin.users.title')}
          </h2>
          <button
            onClick={() => navigate('/admin/users')}
            className="btn btn-ghost btn-sm"
          >
            {t('dashboard.recent.viewAll')}
          </button>
        </div>
        <div className="card glass-card" style={{ overflow: 'hidden' }}>
          <table className="table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>
                  {t('admin.users.username')}
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>
                  {t('admin.users.email')}
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>
                  {t('admin.users.role')}
                </th>
              </tr>
            </thead>
            <tbody>
              {users.slice(0, 5).map((user) => (
                <tr key={user.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.75rem' }}>{user.username}</td>
                  <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>
                    {user.email}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <span
                      className={`badge ${
                        user.role === 'admin' ? 'badge-running' : 'badge-idle'
                      }`}
                    >
                      {user.role === 'admin'
                        ? t('admin.users.admin')
                        : t('admin.users.user')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
