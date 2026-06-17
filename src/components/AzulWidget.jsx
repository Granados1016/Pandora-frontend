import { useState, useEffect, useRef } from 'react';

const AZUL_BACKEND = import.meta.env.VITE_AZUL_API_URL  || 'https://azul-backend-production-858a.up.railway.app';
const PANDORA_BACK = import.meta.env.VITE_BACKEND_URL   || 'https://pandora-backend-production-1e2a.up.railway.app';

const NAVY   = '#0d2137';
const ACCENT = '#1a6ca8';
const LIGHT  = '#e8f1f8';

// ── Azul API helpers ──────────────────────────────────────────────────────────
async function ssoLogin(pandoraToken) {
  const res = await fetch(`${AZUL_BACKEND}/api/auth/from-pandora`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pandoraToken }),
  });
  if (!res.ok) throw new Error('SSO failed');
  return res.json(); // { accessToken, refreshToken }
}

async function getOrCreateConv(azulToken) {
  // List conversations and take the first, or create one
  const res = await fetch(`${AZUL_BACKEND}/api/chat`, {
    headers: { Authorization: `Bearer ${azulToken}` },
  });
  if (!res.ok) throw new Error('No se pudo obtener conversaciones');
  const list = await res.json();
  if (list.length > 0) return list[0].id;
  const created = await fetch(`${AZUL_BACKEND}/api/chat`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${azulToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Chat Pandora' }),
  });
  const conv = await created.json();
  return conv.id;
}

function streamMessage(azulToken, convId, content, onChunk, onDone, onError) {
  fetch(`${AZUL_BACKEND}/api/chat/${convId}/messages/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${azulToken}` },
    body: JSON.stringify({ content }),
  }).then(async res => {
    if (!res.ok) { onError('Error del servidor'); return; }
    const reader  = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) { onDone(); break; }
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const chunk = JSON.parse(line.slice(6));
          if (chunk.error) { onError(chunk.error); return; }
          onChunk(chunk);
          if (chunk.isDone) { onDone(chunk); return; }
        } catch { /* ignore */ }
      }
    }
  }).catch(onError);
}

// ── Markdown mínimo ───────────────────────────────────────────────────────────
function renderText(text) {
  // Bold, inline code, links básicos
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**'))
      return <strong key={i}>{p.slice(2, -2)}</strong>;
    if (p.startsWith('`') && p.endsWith('`'))
      return <code key={i} style={{ background: '#dde8f0', borderRadius: 3, padding: '1px 4px', fontSize: 12 }}>{p.slice(1, -1)}</code>;
    return p;
  });
}

function Message({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 10,
      alignItems: 'flex-end',
      gap: 8,
    }}>
      {!isUser && (
        <div style={{
          width: 30, height: 30, borderRadius: '50%',
          background: NAVY, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <AzulGlyph size={14} color="#fff" />
        </div>
      )}
      <div style={{
        maxWidth: '75%',
        background: isUser ? ACCENT : '#fff',
        color: isUser ? '#fff' : '#1a1a2e',
        borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        padding: '9px 13px',
        fontSize: 13.5,
        lineHeight: 1.55,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        border: isUser ? 'none' : '1px solid #e0e8f0',
      }}>
        {renderText(msg.content)}
        {msg.streaming && (
          <span style={{ display: 'inline-block', width: 6, height: 12, background: ACCENT, borderRadius: 2, marginLeft: 3, animation: 'azulBlink 0.8s steps(1) infinite' }} />
        )}
      </div>
    </div>
  );
}

function AzulGlyph({ size = 18, color = '#fff' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill={color}>
      <path d="M10 0 L11.5 8.5 L20 10 L11.5 11.5 L10 20 L8.5 11.5 L0 10 L8.5 8.5 Z" />
    </svg>
  );
}

// ── Widget principal ──────────────────────────────────────────────────────────
export default function AzulWidget() {
  const [open,      setOpen]      = useState(false);
  const [messages,  setMessages]  = useState([]);
  const [input,     setInput]     = useState('');
  const [sending,   setSending]   = useState(false);
  const [azulToken, setAzulToken] = useState(null);
  const [convId,    setConvId]    = useState(null);
  const [error,     setError]     = useState('');
  const [initing,   setIniting]   = useState(false);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  // ── Inicializar SSO al abrir ──────────────────────────────────────────────
  const init = async () => {
    if (azulToken && convId) return;
    setIniting(true);
    setError('');
    try {
      // 1. Obtener token SSO de Pandora
      const pandoraToken = localStorage.getItem('pandora_token');
      if (!pandoraToken) throw new Error('No hay sesión de Pandora');

      const ssoRes = await fetch(`${PANDORA_BACK}/api/azul-sso/token`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${pandoraToken}`, 'Content-Type': 'application/json' },
      });
      if (!ssoRes.ok) throw new Error('Error SSO');
      const { token: ssoToken } = await ssoRes.json();

      // 2. Canjear token en Azul
      const azul = await ssoLogin(ssoToken);
      setAzulToken(azul.accessToken);

      // 3. Obtener/crear conversación
      const cid = await getOrCreateConv(azul.accessToken);
      setConvId(cid);

      // 4. Mensaje de bienvenida
      setMessages([{ role: 'assistant', content: '¡Hola! Soy Azul, tu asistente personal. ¿En qué te puedo ayudar hoy?' }]);
    } catch (e) {
      setError('No se pudo conectar con Azul AI.');
    } finally {
      setIniting(false);
    }
  };

  const handleOpen = () => {
    if (open) { setOpen(false); return; }
    setOpen(true);
    init();
  };

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Enviar mensaje ────────────────────────────────────────────────────────
  const send = async () => {
    const text = input.trim();
    if (!text || sending || !azulToken || !convId) return;
    setInput('');
    setSending(true);

    setMessages(prev => [...prev, { role: 'user', content: text }]);

    // Placeholder de respuesta
    const aiIdx = Date.now();
    setMessages(prev => [...prev, { role: 'assistant', content: '', streaming: true, _id: aiIdx }]);

    streamMessage(
      azulToken, convId, text,
      (chunk) => {
        setMessages(prev => prev.map(m =>
          m._id === aiIdx ? { ...m, content: m.content + (chunk.delta || '') } : m
        ));
      },
      () => {
        setMessages(prev => prev.map(m =>
          m._id === aiIdx ? { ...m, streaming: false } : m
        ));
        setSending(false);
      },
      (err) => {
        setMessages(prev => prev.map(m =>
          m._id === aiIdx ? { ...m, content: 'Error al obtener respuesta.', streaming: false } : m
        ));
        setSending(false);
      },
    );
  };

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <>
      {/* ── Panel ── */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 88, right: 24, zIndex: 1400,
          width: 370, height: 560,
          borderRadius: 16,
          boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          animation: 'azulWidgetIn 0.2s ease',
          background: LIGHT,
        }}>

          {/* Header */}
          <div style={{
            background: NAVY, color: '#fff',
            padding: '12px 16px',
            display: 'flex', alignItems: 'center', gap: 10,
            flexShrink: 0,
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: '50%',
              background: ACCENT,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <AzulGlyph size={18} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: -0.2 }}>Azul AI</div>
              <div style={{ fontSize: 11, opacity: 0.7, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
                Asistente personal · en línea
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{
              background: 'none', border: 'none', color: '#fff',
              cursor: 'pointer', fontSize: 22, lineHeight: 1, opacity: 0.8, padding: 2,
            }}>×</button>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '14px 14px 8px',
            display: 'flex', flexDirection: 'column',
          }}>
            {initing && (
              <div style={{ textAlign: 'center', color: '#888', fontSize: 13, marginTop: 20 }}>
                <AzulGlyph size={22} color={ACCENT} />
                <div style={{ marginTop: 8 }}>Conectando con Azul...</div>
              </div>
            )}
            {error && (
              <div style={{ textAlign: 'center', color: '#ef4444', fontSize: 13, marginTop: 20 }}>{error}</div>
            )}
            {messages.map((msg, i) => <Message key={msg._id || i} msg={msg} />)}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: '10px 12px 14px',
            background: '#fff',
            borderTop: '1px solid #dde8f0',
            display: 'flex', gap: 8, alignItems: 'flex-end',
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder="Pregúntale a Azul..."
              rows={1}
              disabled={sending || initing || !!error}
              style={{
                flex: 1, resize: 'none', border: '1px solid #ccd8e8',
                borderRadius: 20, padding: '9px 14px',
                fontSize: 13.5, fontFamily: 'inherit',
                outline: 'none', background: '#f4f8fb',
                maxHeight: 100, overflowY: 'auto',
                lineHeight: 1.4,
              }}
            />
            <button
              onClick={send}
              disabled={!input.trim() || sending || initing || !!error}
              style={{
                width: 38, height: 38, borderRadius: '50%',
                background: (!input.trim() || sending || initing) ? '#ccd8e8' : ACCENT,
                border: 'none', cursor: (!input.trim() || sending) ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, transition: 'background 0.2s',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff">
                <path d="M2 21L23 12 2 3v7l15 2-15 2z" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* ── Botón flotante ── */}
      <button
        onClick={handleOpen}
        title="Abrir Azul AI"
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 1400,
          width: 56, height: 56, borderRadius: '50%',
          background: open ? '#0a1929' : NAVY,
          border: `2px solid ${ACCENT}`,
          cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(13,33,55,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.2s, transform 0.2s',
          transform: open ? 'rotate(45deg)' : 'none',
        }}
      >
        {open
          ? <span style={{ color: '#fff', fontSize: 24, lineHeight: 1, transform: 'rotate(-45deg)', display: 'block' }}>×</span>
          : <AzulGlyph size={24} />
        }
      </button>

      <style>{`
        @keyframes azulWidgetIn {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes azulBlink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
      `}</style>
    </>
  );
}
