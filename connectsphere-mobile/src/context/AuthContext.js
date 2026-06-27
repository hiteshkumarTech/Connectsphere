import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api, { tokenStore, setAccessToken, setAuthFailureHandler } from '../api/client';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  // Restore an existing session when the app opens.
  useEffect(() => {
    setAuthFailureHandler(() => {
      setAccessToken(null);
      setUser(null);
    });

    (async () => {
      try {
        const { accessToken } = await tokenStore.get();
        if (accessToken) {
          setAccessToken(accessToken);
          const { data } = await api.get('/auth/me');
          setUser(data.data.user);
        }
      } catch (_e) {
        await tokenStore.clear();
        setAccessToken(null);
      } finally {
        setBooting(false);
      }
    })();
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    const { user: u, accessToken, refreshToken } = data.data;
    await tokenStore.set(accessToken, refreshToken);
    setAccessToken(accessToken);
    setUser(u);
    return u;
  }, []);

  const register = useCallback(async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    const { user: u, accessToken, refreshToken } = data.data;
    await tokenStore.set(accessToken, refreshToken);
    setAccessToken(accessToken);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    try {
      const { refreshToken } = await tokenStore.get();
      await api.post('/auth/logout', { refreshToken });
    } catch (_e) {
      /* even if the call fails, clear locally */
    }
    await tokenStore.clear();
    setAccessToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, booting, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
