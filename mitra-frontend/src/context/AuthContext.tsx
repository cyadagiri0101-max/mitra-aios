import {
  createContext, useContext, useState, useCallback, useMemo,
  useEffect, ReactNode, useRef,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setAccessToken } from '../utils/api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  name?: string;
  role: string | null;
  tenantId: string | null;
  permissions: string[];
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, options?: { redirectTo?: string | null }) => Promise<void>;
  logout: () => void;
  hasRole: (roles: string[]) => boolean;
  hasPermission: (resource: string, action: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function loadStoredUser(): User | null {
  try {
    const raw = localStorage.getItem('mitra_user');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function loadStoredToken(): string | null {
  try {
    return localStorage.getItem('mitra_access_token');
  } catch { return null; }
}

function getTokenExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp ? payload.exp * 1000 : null;
  } catch { return null; }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(loadStoredUser);
  const [accessToken, setAccessTokenState] = useState<string | null>(loadStoredToken);
  const [isLoading, setIsLoading] = useState(false);
  const tokenRef = useRef(accessToken);

  useEffect(() => { tokenRef.current = accessToken; }, [accessToken]);

  // Persist token to localStorage whenever it changes
  useEffect(() => {
    if (accessToken) {
      localStorage.setItem('mitra_access_token', accessToken);
    } else {
      localStorage.removeItem('mitra_access_token');
    }
  }, [accessToken]);

  // Sync token to api module whenever it changes
  useEffect(() => {
    setAccessToken(accessToken);
  }, [accessToken]);

  // On mount: validate stored token via /auth/me
  useEffect(() => {
    const token = tokenRef.current;
    if (!token || !user) {
      // Clear any invalid stored data on mount
      if (!token) {
        localStorage.removeItem('mitra_access_token');
      }
      if (!user) {
        localStorage.removeItem('mitra_user');
      }
      return;
    }
    
    api.get('/auth/me').then(res => {
      const me = res.data;
      const enriched: User = { ...me, name: `${me.firstName ?? ''} ${me.lastName ?? ''}`.trim() };
      setUser(enriched);
      localStorage.setItem('mitra_user', JSON.stringify(enriched));
    }).catch(() => {
      setAccessTokenState(null);
      setAccessToken(null);
      localStorage.removeItem('mitra_access_token');
      localStorage.removeItem('mitra_user');
      setUser(null);
    });
  }, []);

  // HIGH FIX H-5: Cross-tab logout synchronization
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'mitra_logout_event') {
        setAccessTokenState(null);
        setAccessToken(null);
        setUser(null);
        window.location.href = '/login';
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // HIGH FIX H-6: Pre-emptive token refresh before expiry
  useEffect(() => {
    if (!accessToken) return;
    const expiry = getTokenExpiry(accessToken);
    if (!expiry) return;
    const refreshTime = expiry - Date.now() - 60000; // 60s before expiry
    if (refreshTime <= 0) return;

    const timer = setTimeout(async () => {
      try {
        const res = await api.post('/auth/refresh', {}, { withCredentials: true });
        const { access_token } = res.data;
        setAccessTokenState(access_token);
      } catch {
        logout();
      }
    }, refreshTime);

    return () => clearTimeout(timer);
  }, [accessToken]);

  const login = useCallback(async (email: string, password: string, options?: { redirectTo?: string | null }) => {
    setIsLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      const { access_token, user: rawUser } = res.data;

      setAccessTokenState(access_token);
      setAccessToken(access_token);

      const enriched: User = {
        ...rawUser,
        name: `${rawUser.firstName ?? ''} ${rawUser.lastName ?? ''}`.trim(),
      };
      localStorage.setItem('mitra_user', JSON.stringify(enriched));
      setUser(enriched);

      if (options?.redirectTo !== null) {
        navigate(options?.redirectTo ?? '/dashboard', { replace: true });
      }
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } catch { /* fire-and-forget */ }
    setAccessTokenState(null);
    setAccessToken(null);
    localStorage.removeItem('mitra_access_token');
    localStorage.removeItem('mitra_user');
    localStorage.setItem('mitra_logout_event', Date.now().toString());
    setTimeout(() => localStorage.removeItem('mitra_logout_event'), 1000);
    setUser(null);
    navigate('/login', { replace: true });
  }, [navigate]);

  const hasRole = useCallback((roles: string[]) => {
    if (!user) return false;
    if (user.role === 'ADMIN') return true;
    return user.role ? roles.map(r => r.toUpperCase()).includes(user.role.toUpperCase()) : false;
  }, [user]);

  const hasPermission = useCallback((resource: string, action: string) => {
    if (!user) return false;
    if (user.role === 'ADMIN') return true;
    return user.permissions.includes(`${resource}:${action}`);
  }, [user]);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!accessToken && !!user,
      isLoading,
      login,
      logout,
      hasRole,
      hasPermission,
    }),
    [user, accessToken, isLoading, login, logout, hasRole, hasPermission],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
