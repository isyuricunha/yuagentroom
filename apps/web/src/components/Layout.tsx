import { NavLink, Outlet, useNavigate } from 'react-router';
import { Cpu, MessageSquare, Settings, LogOut, Users, LayoutDashboard, Shield } from 'lucide-react';
import logo from '../assets/logo.png';
import { useAuth } from '../hooks/useAuth.ts';

export function Layout() {
  const navigate = useNavigate();
  const { user, isLoading, logout: authLogout } = useAuth();

  const handleLogout = async () => {
    await authLogout();
    navigate('/login');
  };

  if (isLoading) {
    return (
      <div style={{ height: '100vh', background: 'var(--bg-app)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        Loading...
      </div>
    );
  }

  return (
    <div className="layout">
      <aside className="sidebar-nav">
        <div className="sidebar-top">
          <div className="logo" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
            <img src={logo} alt="AgentRoom" style={{ width: 28, height: 28, borderRadius: 6 }} />
            <span>AgentRoom</span>
          </div>
          <nav>
            <NavLink to="/" className={({ isActive }) => isActive ? 'active' : ''}>
              <LayoutDashboard size={18} /> <span>Dashboard</span>
            </NavLink>
            <NavLink to="/agents" className={({ isActive }) => isActive ? 'active' : ''}>
              <Cpu size={18} /> <span>Agents</span>
            </NavLink>
            <NavLink to="/rooms" className={({ isActive }) => isActive ? 'active' : ''}>
              <MessageSquare size={18} /> <span>Rooms</span>
            </NavLink>
            <NavLink to="/settings" className={({ isActive }) => isActive ? 'active' : ''}>
              <Settings size={18} /> <span>Settings</span>
            </NavLink>
            {user?.role === 'admin' && (
              <>
                <NavLink to="/admin" className={({ isActive }) => isActive ? 'active' : ''}>
                  <Shield size={18} /> <span>Admin</span>
                </NavLink>
                <NavLink to="/admin/users" className={({ isActive }) => isActive ? 'active' : ''}>
                  <Users size={18} /> <span>Users</span>
                </NavLink>
              </>
            )}
          </nav>
        </div>

        <div className="sidebar-footer">
          <div className="user-pill">
            <div className="status-dot"></div>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.role === 'admin' ? 'Administrator' : 'User'}
            </span>
            <button
              onClick={handleLogout}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
      <main className="main-wrapper">
        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}