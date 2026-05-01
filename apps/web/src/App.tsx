import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { Layout } from './components/Layout.tsx';
import { AgentsPage } from './pages/AgentsPage.tsx';
import { RoomsPage } from './pages/RoomsPage.tsx';
import { RoomPage } from './pages/RoomPage.tsx';
import { SettingsPage } from './pages/SettingsPage.tsx';
import { AdminUsersPage } from './pages/AdminUsersPage.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { FirstLoginChangePasswordPage } from './pages/FirstLoginChangePasswordPage.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { useAuth } from './hooks/useAuth.ts';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <div style={{ height: '100vh', background: 'var(--bg-app)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Verifying...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div style={{ height: '100vh', background: 'var(--bg-app)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Loading...</div>;
  if (!user || user.role !== 'admin') return <Navigate to="/rooms" replace />;
  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/first-login-change" element={<FirstLoginChangePasswordPage />} />

        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<DashboardPage />} />
          <Route path="agents" element={<AgentsPage />} />
          <Route path="rooms" element={<RoomsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="admin/users" element={<AdminRoute><AdminUsersPage /></AdminRoute>} />
        </Route>

        <Route path="/rooms/:id" element={<ProtectedRoute><RoomPage /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;