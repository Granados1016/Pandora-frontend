const BASE      = import.meta.env.VITE_AZUL_API_URL ?? 'http://localhost:5016';
const TOKEN_KEY = 'pandora_azul_token';
const CONV_KEY  = 'pandora_azul_conv_id';

const token = () => localStorage.getItem(TOKEN_KEY);

export const azulApi = {
  isConnected: () => !!token(),

  async login(email, password) {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error('Credenciales incorrectas');
    const data = await res.json();
    localStorage.setItem(TOKEN_KEY, data.token);
    return data;
  },

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(CONV_KEY);
  },

  async getOrCreateConv() {
    const existing = localStorage.getItem(CONV_KEY);
    if (existing) return existing;

    const res = await fetch(`${BASE}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token()}`,
      },
      body: JSON.stringify({ title: 'Pandora AI' }),
    });
    if (!res.ok) throw new Error('Error creando conversación en Azul');
    const data = await res.json();
    localStorage.setItem(CONV_KEY, String(data.id));
    return String(data.id);
  },

  streamMessage({ convId, content, onChunk, onDone, onError }) {
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await fetch(`${BASE}/api/chat/${convId}/messages/stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token()}`,
          },
          body: JSON.stringify({ content }),
          signal: ctrl.signal,
        });
        if (!res.ok) { onError('Error del servidor de Azul'); return; }

        const reader = res.body.getReader();
        const dec    = new TextDecoder();
        let buf      = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) { onDone(); break; }
          buf += dec.decode(value, { stream: true });
          const lines = buf.split('\n');
          buf = lines.pop() ?? '';
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const raw = line.slice(6).trim();
            if (!raw) continue;
            try {
              const chunk = JSON.parse(raw);
              if (chunk.delta) onChunk(chunk.delta);
              if (chunk.error) onError(chunk.error);
            } catch { /* ignorar líneas malformadas */ }
          }
        }
      } catch (e) {
        if (e.name !== 'AbortError') onError(e.message);
      }
    })();
    return ctrl;
  },
};
