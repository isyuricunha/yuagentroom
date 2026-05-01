import { useState, useEffect, useCallback } from 'react';
import { getCurrentUser, logout as apiLogout } from '../lib/api';
import { AUTH_TOKEN_KEY } from '../lib/auth-constants';
import type { User } from '@agentroom/shared';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const checkAuth = useCallback(async () => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (!token) {
  setAuthState({ user: null, isLoading: false, isAuthenticated: false });
  return;
  }
  
  try {
  const user = await getCurrentUser();
  setAuthState({ user, isLoading: false, isAuthenticated: !!user });
  } catch {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  setAuthState({ user: null, isLoading: false, isAuthenticated: false });
  }
  }, []);
  
  useEffect(() => {
  const initAuth = async () => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (!token) {
  setAuthState({ user: null, isLoading: false, isAuthenticated: false });
  return;
  }
  
  try {
  const user = await getCurrentUser();
  setAuthState({ user, isLoading: false, isAuthenticated: !!user });
  } catch {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  setAuthState({ user: null, isLoading: false, isAuthenticated: false });
  }
  };
  
  initAuth();
  }, []);

  const login = useCallback(async (token: string, user: User) => {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    setAuthState({ user, isLoading: false, isAuthenticated: true });
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } finally {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      setAuthState({ user: null, isLoading: false, isAuthenticated: false });
    }
  }, []);

  return { ...authState, login, logout, checkAuth };
}