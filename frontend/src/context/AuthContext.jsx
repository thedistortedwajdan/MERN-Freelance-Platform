import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api from "../data/client";

const AuthContext = createContext(null);
const USER_KEY = "gp.user";

function readStoredUser() {
  try {
    const stored = JSON.parse(localStorage.getItem(USER_KEY));
    return stored && api.auth.hasSession() ? stored : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);
  const [profile, setProfile] = useState(null);

  const refreshProfile = useCallback(async () => {
    try {
      const { user: full, stats } = await api.users.me();
      setProfile({ ...full, stats });
      return full;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (user) refreshProfile();
    else setProfile(null);
  }, [user, refreshProfile]);

  const login = useCallback(async (email, password) => {
    const res = await api.auth.login({ email, password });
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    setUser(res.user);
    return res.user;
  }, []);

  const register = useCallback((body) => api.auth.register(body), []);

  const logout = useCallback(async () => {
    await api.auth.logout().catch(() => {});
    localStorage.removeItem(USER_KEY);
    setUser(null);
    setProfile(null);
  }, []);

  const value = useMemo(
    () => ({ user, profile, login, register, logout, refreshProfile, isAuthed: !!user }),
    [user, profile, login, register, logout, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}

// eslint-disable-next-line react-refresh/only-export-components
export const homePathFor = (role) => (role === "employer" ? "/my-tasks" : role === "admin" ? "/admin" : "/find");
