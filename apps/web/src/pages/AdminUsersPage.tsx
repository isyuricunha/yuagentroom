import { useEffect, useState } from 'react';
import { Users, Trash2, Shield, User as UserIcon } from 'lucide-react';
import { listUsers, updateUserRole, deleteUser } from '../lib/api.ts';
import type { User } from '@agentroom/shared';

export function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await listUsers();
        setUsers(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load users');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleRoleChange(user: User, newRole: 'admin' | 'user') {
    setUpdating(user.id);
    try {
      await updateUserRole(user.id, newRole);
      const data = await listUsers();
      setUsers(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update user role');
    } finally {
      setUpdating(null);
    }
  }

  async function handleDelete(user: User) {
    if (!confirm(`Are you sure you want to delete user "${user.username}"?`)) return;

    try {
      await deleteUser(user.id);
      const data = await listUsers();
      setUsers(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete user');
    }
  }

  if (loading && users.length === 0) return <div style={{ padding: '2rem' }}>Loading users...</div>;

  return (
    <div className="page-content">
      <header className="page-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontSize: '1.5rem' }}>
            <Users size={24} className="text-muted" /> User Management
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Administer user accounts and permissions.
          </p>
        </div>
      </header>

      {error && <div className="error-banner">{error}</div>}

      <div className="card glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--surface-elevated)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '1rem', textAlign: 'left' }}>Username</th>
              <th style={{ padding: '1rem', textAlign: 'left' }}>Email</th>
              <th style={{ padding: '1rem', textAlign: 'left' }}>Role</th>
              <th style={{ padding: '1rem', textAlign: 'left' }}>Created</th>
              <th style={{ padding: '1rem', textAlign: 'left' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '1rem' }}>{user.username}</td>
                <td style={{ padding: '1rem' }}>{user.email}</td>
                <td style={{ padding: '1rem' }}>
                  <span className={`badge ${user.role === 'admin' ? 'badge-running' : 'badge-idle'}`}>
                    {user.role === 'admin' ? <Shield size={12} /> : <UserIcon size={12} />}
                    {user.role}
                  </span>
                </td>
                <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td style={{ padding: '1rem' }}>
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user, e.target.value as 'admin' | 'user')}
                    disabled={updating === user.id}
                    className="input"
                    style={{ width: 'auto', marginRight: '0.5rem', padding: '0.25rem 0.5rem' }}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleDelete(user)}
                    disabled={updating === user.id}
                    style={{ padding: '0.25rem 0.5rem' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}