import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api from "../data/client";
import { useAuth } from "./AuthContext";
import { usePolling } from "../lib/hooks";

const LiveContext = createContext({ alerts: 0, unreadMessages: 0, favorites: new Set(), refresh: () => {} });

/**
 * App-wide counters kept fresh by polling: unread notifications, unread messages, and the set of saved task ids.
 */
export function LiveProvider({ children }) {
  const { user } = useAuth();
  const [counts, setCounts] = useState({ alerts: 0, unreadMessages: 0 });
  const [favorites, setFavorites] = useState(() => new Set());
  const marketplace = user && user.role !== "admin";

  const refresh = useCallback(async () => {
    if (!user) return;
    const [n, m] = await Promise.all([api.notifications.unreadCount(), marketplace ? api.messages.unreadCount() : { unread: 0 }]).catch(() => [null, null]);
    if (n && m) setCounts({ alerts: n.unread, unreadMessages: m.unread });
  }, [user, marketplace]);

  const loadFavorites = useCallback(async () => {
    if (!marketplace) return;
    try {
      const res = await api.tasks.favorites({ size: 100 });
      setFavorites(new Set(res.data.map((t) => t._id)));
    } catch {
      // keep what we have
    }
  }, [marketplace]);

  useEffect(() => {
    if (!user) {
      setCounts({ alerts: 0, unreadMessages: 0 });
      setFavorites(new Set());
      return;
    }
    refresh();
    loadFavorites();
  }, [user, refresh, loadFavorites]);

  usePolling(refresh, 2500, !!user);

  const toggleFavorite = useCallback(
    async (taskId) => {
      const saved = favorites.has(taskId);
      setFavorites((prev) => {
        const next = new Set(prev);
        if (saved) next.delete(taskId);
        else next.add(taskId);
        return next;
      });
      try {
        if (saved) await api.tasks.removeFavorite(taskId);
        else await api.tasks.addFavorite(taskId);
      } catch (e) {
        loadFavorites();
        throw e;
      }
      return !saved;
    },
    [favorites, loadFavorites]
  );

  const value = useMemo(() => ({ ...counts, favorites, toggleFavorite, refresh }), [counts, favorites, toggleFavorite, refresh]);
  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLive() {
  return useContext(LiveContext);
}
