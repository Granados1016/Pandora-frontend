/**
 * useDashboardRefresh
 *
 * Devuelve un `tick` que se incrementa:
 *  1. Automáticamente cada `intervalMs` ms (default: 60 s)
 *  2. Inmediatamente cuando llega una nueva notificación de SignalR
 *
 * Usar como dependencia en los useEffect de widgets para que se auto-actualicen.
 */
import { useState, useEffect, useRef } from 'react';
import * as signalR from '@microsoft/signalr';

const BACKEND = import.meta.env.VITE_BACKEND_URL ?? '';
const HUB_URL = BACKEND ? `${BACKEND}/hubs/notifications` : '/hubs/notifications';

export function useDashboardRefresh(intervalMs = 60_000) {
  const [tick, setTick] = useState(0);
  const refresh = () => setTick(t => t + 1);

  // ── Auto-polling ──────────────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(refresh, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  // ── SignalR: refrescar al recibir nueva notificación ──────────────────────
  useEffect(() => {
    const token = localStorage.getItem('pandora_token');
    if (!token) return;

    const conn = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL, { accessTokenFactory: () => localStorage.getItem('pandora_token') ?? '' })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.None)
      .build();

    conn.on('NewNotification', () => refresh());

    conn.start()
      .then(() => conn.invoke('JoinBroadcast').catch(() => {}))
      .catch(() => {});

    return () => conn.stop().catch(() => {});
  }, []);

  return tick;
}
