import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import client, { setAccessToken, setUnauthorizedHandler } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(async () => {
    try {
      await client.post('/auth/logout');
    } catch {
      /* تجاهل أخطاء الشبكة عند تسجيل الخروج */
    }
    setAccessToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
    // محاولة استعادة الجلسة عبر refresh token عند تحميل التطبيق
    (async () => {
      try {
        const { data } = await client.post('/auth/refresh');
        setAccessToken(data.accessToken);
        const meRes = await client.get('/auth/me');
        setUser(meRes.data.user);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (username, password) => {
    const { data } = await client.post('/auth/login', { username, password });
    setAccessToken(data.accessToken);
    setUser(data.user);
    return data.user;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
