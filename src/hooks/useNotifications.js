import { useState, useEffect, useCallback, useRef } from 'react';
import * as signalR from '@microsoft/signalr';

const BACKEND = import.meta.env.VITE_BACKEND_URL ?? '';
const HUB_URL = BACKEND ? `${BACKEND}/hubs/notifications` : '/hubs/notifications';

export function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [connected, setConnected] = useState(false);
  const hubRef = useRef(null);

  const fetchInitial = useCallback(async () => {
    // Importa pandoraApi dinámicamente para evitar circular deps
    try {
      const { default: api } = await import('../api/pandoraApi');
      const { data } = await api.get('/notifications');
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.isRead).length);
    } catch {}
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('pandora_token');
    if (!token) return;

    const conn = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL, { accessTokenFactory: () => localStorage.getItem('pandora_token') ?? '' })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    hubRef.current = conn;

    conn.on('NewNotification', (notif) => {
      setNotifications(prev => [notif, ...prev]);
      setUnreadCount(c => c + 1);
    });

    conn.start()
      .then(() => {
        setConnected(true);
        conn.invoke('JoinBroadcast').catch(() => {});
        // Unirse al grupo personal de usuario
        const storedUser = localStorage.getItem('pandora_username');
        if (storedUser) conn.invoke('JoinUser', storedUser).catch(() => {});
      })
      .catch(() => {});

    fetchInitial();

    return () => {
      conn.stop().catch(() => {});
    };
  }, [fetchInitial]);

  const markRead = useCallback(async (id) => {
    try {
      const { default: api } = await import('../api/pandoraApi');
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(c => Math.max(0, c - 1));
    } catch {}
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      const { default: api } = await import('../api/pandoraApi');
      await api.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {}
  }, []);

  return { notifications, unreadCount, connected, markRead, markAllRead, refresh: fetchInitial };
}
