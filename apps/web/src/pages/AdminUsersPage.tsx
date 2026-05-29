import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Trash2, Shield, User as UserIcon } from 'lucide-react';
import { listUsers, updateUserRole, deleteUser } from '../lib/api.ts';
import type { User } from '@agentroom/shared';

interface Message {
  text: string;
  type: 'success' | 'error';
}

export function AdminUsersPage() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState<Message | null>(null);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listUsers();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.users.errorLoading'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    const init = async () => {
      await loadUsers();
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showMessage = useCallback((text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  }, []);

  const handleRoleChange = useCallback(
    async (user: User, newRole: 'admin' | 'user') => {
      if (newRole === user.role) return;

      setUpdating(user.id);
      try {
        await updateUserRole(user.id, newRole);
        await loadUsers();
        showMessage(t('admin.users.successUpdated'), 'success');
      } catch (err) {
        showMessage(
          err instanceof Error ? err.message : t('admin.users.errorUpdating'),
          'error'
        );
      } finally {
        setUpdating(null);
      }
    },
    [loadUsers, t, showMessage]
  );

  const handleDelete = useCallback(
    async (user: User) => {
      setDeletingId(user.id);
      try {
        await deleteUser(user.id);
        await loadUsers();
        showMessage(t('admin.users.successDeleted'), 'success');
      } catch (err) {
        showMessage(
          err instanceof Error ? err.message : t('admin.users.errorDeleting'),
          'error'
        );
      } finally {
        setDeletingId(null);
      }
    },
    [loadUsers, t, showMessage]
  );

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  }, []);

  if (loading && users.length === 0) {
    return (
      <div
        className="page-content"
        style={{ padding: '2rem' }}
        role="status"
        aria-live="polite"
      >
        {t('admin.users.loading')}
      </div>
    );
  }

  return (
    <div className="page-content">
      <header className="page-header">
        <div>
          <h1
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              margin: 0,
              fontSize: '1.5rem',
            }}
          >
            <Users size={24} className="text-muted" aria-hidden="true" />
            {t('admin.users.title')}
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {t('admin.users.description')}
          </p>
        </div>
      </header>

      {/* Message Banner */}
      {message && (
        <div
          style={{ marginBottom: '1.5rem', width: '100%' }}
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <div
            className={`badge ${
              message.type === 'success' ? 'badge-running' : 'badge-danger'
            }`}
            style={{
              padding: '0.5rem 1rem',
              display: 'inline-flex',
              borderRadius: 'var(--radius)',
              backgroundColor:
                message.type === 'success'
                  ? 'rgba(125, 154, 106, 0.1)'
                  : 'rgba(191, 97, 106, 0.1)',
              color:
                message.type === 'success'
                  ? 'var(--success)'
                  : 'var(--danger)',
            }}
          >
            {message.text}
          </div>
        </div>
      )}

      {error && (
        <div className="error-banner" role="alert" aria-live="assertive">
          {error}
        </div>
      )}

      <div className="card glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrapper" style={{ overflowX: 'auto' }}>
          <table
            className="table"
            style={{ width: '100%', borderCollapse: 'collapse' }}
            role="table"
          >
            <thead>
              <tr
                style={{
                  background: 'var(--surface-elevated)',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <th
                  scope="col"
                  style={{ padding: '1rem', textAlign: 'left' }}
                  id="username-header"
                >
                  {t('admin.users.username')}
                </th>
                <th
                  scope="col"
                  style={{ padding: '1rem', textAlign: 'left' }}
                  id="email-header"
                >
                  {t('admin.users.email')}
                </th>
                <th
                  scope="col"
                  style={{ padding: '1rem', textAlign: 'left' }}
                  id="role-header"
                >
                  {t('admin.users.role')}
                </th>
                <th
                  scope="col"
                  style={{ padding: '1rem', textAlign: 'left' }}
                  id="created-header"
                >
                  {t('admin.users.created')}
                </th>
                <th
                  scope="col"
                  style={{ padding: '1rem', textAlign: 'left' }}
                  id="actions-header"
                >
                  {t('admin.users.actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '2rem', textAlign: 'center' }}>
                    {t('admin.users.noUsers')}
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '1rem' }}>{user.username}</td>
                    <td style={{ padding: '1rem' }}>{user.email}</td>
                    <td style={{ padding: '1rem' }}>
                      <span
                        className={`badge ${
                          user.role === 'admin' ? 'badge-running' : 'badge-idle'
                        }`}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                      >
                        {user.role === 'admin' ? (
                          <Shield size={12} aria-hidden="true" />
                        ) : (
                          <UserIcon size={12} aria-hidden="true" />
                        )}
                        {user.role === 'admin'
                          ? t('admin.users.admin')
                          : t('admin.users.user')}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: '1rem',
                        color: 'var(--text-muted)',
                        fontSize: '0.875rem',
                      }}
                    >
                      {formatDate(user.createdAt)}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <select
                          value={user.role}
                          onChange={(e) =>
                            handleRoleChange(user, e.target.value as 'admin' | 'user')
                          }
                          disabled={updating === user.id || deletingId === user.id}
                          className="input"
                          style={{
                            width: 'auto',
                            padding: '0.25rem 0.5rem',
                          }}
                          aria-label={`${t('admin.users.changeRole')} ${user.username}`}
                        >
                          <option value="user">{t('admin.users.user')}</option>
                          <option value="admin">{t('admin.users.admin')}</option>
                        </select>
                        <button
                          className="btn btn-secondary"
                          onClick={() => handleDelete(user)}
                          disabled={updating === user.id || deletingId === user.id}
                          style={{
                            padding: '0.25rem 0.5rem',
                            color:
                              updating === user.id || deletingId === user.id
                                ? 'var(--text-muted)'
                                : 'var(--danger)',
                          }}
                          aria-label={`${t('admin.users.deleteUser')} ${user.username}`}
                        >
                          {deletingId === user.id ? (
                            <span className="spin" aria-label={t('admin.users.deleting')}>
                              🔄
                            </span>
                          ) : (
                            <Trash2 size={14} aria-hidden="true" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
