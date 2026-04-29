import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router';
import { useState, useEffect } from 'react';
import { Layout } from './components/Layout.tsx';
import { AgentsPage } from './pages/AgentsPage.tsx';
import { RoomsPage } from './pages/RoomsPage.tsx';
import { RoomPage } from './pages/RoomPage.tsx';
import { SettingsPage } from './pages/SettingsPage.tsx';
import { LoginPage } from './pages/LoginPage.tsx';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [isAuth, setIsAuth] = useState<boolean | null>(null);
  const location = useLocation();

  useEffect(() => {
    async function check() {
      const token = localStorage.getItem('agentroom_token');
      if (!token) {
        setIsAuth(false);
        return;
      }
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/auth/verify`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setIsAuth(res.ok);
      } catch {
        setIsAuth(false);
      }
    }
    check();
  }, [location.pathname]);

  if (isAuth === null) return <div style={{ height: '100vh', background: 'var(--bg-app)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Verifying...</div>;
  if (!isAuth) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/rooms" replace />} />
          <Route path="agents" element={<AgentsPage />} />
          <Route path="rooms" element={<RoomsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        <Route path="/rooms/:id" element={<ProtectedRoute><RoomPage /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
