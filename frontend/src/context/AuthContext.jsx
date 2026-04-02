import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('dialect_token');
    if (!token) { setLoading(false); return; }
    api.get('/auth/me')
      .then(r => setUser(r.data.user))
      .catch(() => localStorage.removeItem('dialect_token'))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const r = await api.post('/auth/login', { email, password });
    localStorage.setItem('dialect_token', r.data.token);
    setUser(r.data.user);
    return r.data.user;
  }, []);

  const register = useCallback(async (username, email, password) => {
    const r = await api.post('/auth/register', { username, email, password });
    localStorage.setItem('dialect_token', r.data.token);
    setUser(r.data.user);
    return r.data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('dialect_token');
    setUser(null);
  }, []);

  const updateMode = useCallback(async (mode) => {
    const r = await api.patch('/auth/mode', { mode });
    setUser(r.data.user);
    return r.data.user;
  }, []);

  const refreshUser = useCallback(async () => {
    const r = await api.get('/auth/me');
    setUser(r.data.user);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateMode, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);