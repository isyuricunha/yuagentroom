import { NavLink, Outlet, useNavigate } from 'react-router';
import { Cpu, MessageSquare, Settings, LogOut } from 'lucide-react';
import logo from '../assets/logo.png';

export function Layout() {
  const navigate = useNavigate();
  const handleLogout = () => {
    localStorage.removeItem('agentroom_token');
    navigate('/login');
  };

  return (
    <div className="layout">
      <aside className="sidebar-nav">
        <div className="sidebar-top">
          <div className="logo" style={{ cursor: 'pointer' }} onClick={() => navigate('/rooms')}>
            <img src={logo} alt="AgentRoom" style={{ width: 28, height: 28, borderRadius: 6 }} />
            <span>AgentRoom</span>
          </div>
          <nav>
            <NavLink to="/agents" className={({ isActive }) => isActive ? 'active' : ''}>
              <Cpu size={18} /> <span>Agents</span>
            </NavLink>
            <NavLink to="/rooms" className={({ isActive }) => isActive ? 'active' : ''}>
              <MessageSquare size={18} /> <span>Rooms</span>
            </NavLink>
            <NavLink to="/settings" className={({ isActive }) => isActive ? 'active' : ''}>
              <Settings size={18} /> <span>Settings</span>
            </NavLink>
          </nav>
        </div>
        
        <div className="sidebar-footer">
          <div className="user-pill">
            <div className="status-dot"></div>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>Administrator</span>
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
