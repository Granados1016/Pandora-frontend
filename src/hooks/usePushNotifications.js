import { useState, useEffect, useCallback } from 'react';
import api from '../api/pandoraApi';

const BACKEND = import.meta.env.VITE_BACKEND_URL ?? '';
const BASE_URL = BACKEND ? `${BACKEND}/api` : '/api';

// Convierte base64url a Uint8Array para VAPID
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw     = atob(base64);
  return new Uint8Array([...raw].map(c => c.charCodeAt(0)));
}

export function usePushNotifications() {
  const [supported,    setSupported]    = useState(false);
  const [permission,   setPermission]   = useState('default');
  const [subscribed,   setSubscribed]   = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [swReg,        setSwReg]        = useState(null);

  // Registrar el Service Worker al montar
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    setSupported(true);
    setPermission(Notification.permission);

    navigator.serviceWorker.register('/sw.js')
      .then(reg => {
        setSwReg(reg);
        // Verificar si ya hay suscripción activa
        return reg.pushManager.getSubscription();
      })
      .then(sub => { if (sub) setSubscribed(true); })
      .catch(() => {});
  }, []);

  const subscribe = useCallback(async () => {
    if (!swReg || !supported) return false;
    setLoading(true);
    try {
      // Pedir permiso
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') return false;

      // Obtener la VAPID public key del backend
      const { data } = await api.get('/push/vapid-key');
      const vapidKey = data.publicKey;
      if (!vapidKey) throw new Error('VAPID key no configurada');

      // Suscribir al push manager
      const sub = await swReg.pushManager.subscribe({
        userVisibleOnly:    true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const j = sub.toJSON();
      await api.post('/push/subscribe', {
        endpoint: j.endpoint,
        p256dh:   j.keys?.p256dh,
        auth:     j.keys?.auth,
      });

      setSubscribed(true);
      return true;
    } catch { return false; }
    finally { setLoading(false); }
  }, [swReg, supported]);

  const unsubscribe = useCallback(async () => {
    if (!swReg) return;
    setLoading(true);
    try {
      const sub = await swReg.pushManager.getSubscription();
      if (sub) {
        await api.delete('/push/unsubscribe', { data: { endpoint: sub.endpoint } });
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } catch { }
    finally { setLoading(false); }
  }, [swReg]);

  const sendTest = useCallback(async () => {
    await api.post('/push/test');
  }, []);

  return { supported, permission, subscribed, loading, subscribe, unsubscribe, sendTest };
}
