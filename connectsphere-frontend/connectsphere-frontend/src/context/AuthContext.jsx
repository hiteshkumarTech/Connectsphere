import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, setAuthToken } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // bootstrapping the session

  // On load, exchange the refresh cookie for an access token + current user.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data } = await api.post('/auth/refresh');
        if (!active) return;
        setAuthToken(data.data.accessToken);
        setUser(data.data.user);
      } catch {
        if (active) {
          setAuthToken(null);
          setUser(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // If a refresh ever fails mid-session, drop back to logged-out.
  useEffect(() => {
    const onExpired = () => {
      setAuthToken(null);
      setUser(null);
    };
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    setAuthToken(data.data.accessToken);
    setUser(data.data.user);
    return data.data.user;
  }, []);

  const register = useCallback(async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    setAuthToken(data.data.accessToken);
    setUser(data.data.user);
    return data.data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      /* best effort */
    }
    setAuthToken(null);
    setUser(null);
  }, []);

  const patchUser = useCallback((partial) => setUser((u) => (u ? { ...u, ...partial } : u)), []);

  return (
    <AuthContext.Provider
      value={{ user, loading, isAuthenticated: !!user, login, register, logout, patchUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
