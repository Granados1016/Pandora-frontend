import { useState, useEffect, useRef } from 'react';

const AZUL_URL = import.meta.env.VITE_AZUL_FRONTEND_URL || 'http://localhost:5174';
const BACKEND  = import.meta.env.VITE_BACKEND_URL       || 'http://localhost:5000';

export default function AzulWidget() {
  const [open,   setOpen]   = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [url,    setUrl]    = useState('');

  // Detectar modo oscuro desde el body/html de MUI
  const [dark, setDark] = useState(
    () => document.documentElement.classList.contains('dark') ||
          document.body.getAttribute('data-mui-color-scheme') === 'dark'
  );
  useEffect(() => {
    const obs = new MutationObserver(() => {
      setDark(document.body.getAttribute('data-mui-color-scheme') === 'dark');
    });
    obs.observe(document.body, { attributes: true, attributeFilter: ['data-mui-color-scheme', 'class'] });
    return () => obs.disconnect();
  }, []);

  const openWidget = async () => {
    if (open) { setOpen(false); return; }
    setLoaded(false);
    try {
      const token = localStorage.getItem('pandora_token');
      if (token) {
        const res = await fetch(`${BACKEND}/api/azul-sso/token`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        if (res.ok) {
          const data = await res.json();
          setUrl(`${AZUL_URL}/login?pandora_token=${data.token}`);
          setOpen(true);
          return;
        }
      }
    } catch { /* fallback */ }
    setUrl(AZUL_URL);
    setOpen(true);
  };

  const accent = '#1a6ca8';

  return (
    <>
      {/* Panel flotante */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 88, right: 24, zIndex: 1400,
          width: 420, height: 620,
          background: dark ? '#1a1a2e' : '#fff',
          borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
          border: `1px solid ${dark ? '#2a2a4a' : '#dde3ea'}`,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          animation: 'azulWidgetIn 0.22s ease',
        }}>
          {/* Header */}
          <div style={{
            background: accent, color: '#fff',
            padding: '10px 16px',
            display: 'flex', alignItems: 'center', gap: 10,
            flexShrink: 0,
          }}>
            <svg width="18" height="18" viewBox="0 0 20 20" fill="#fff" opacity="0.9">
              <path d="M10 0 L11.5 8.5 L20 10 L11.5 11.5 L10 20 L8.5 11.5 L0 10 L8.5 8.5 Z" />
            </svg>
            <span style={{ fontWeight: 600, fontSize: 15, letterSpacing: -0.3 }}>Azul AI</span>
            <span style={{ fontSize: 11, opacity: 0.75, marginLeft: 4 }}>Asistente personal</span>
            <button
              onClick={() => setOpen(false)}
              style={{
                marginLeft: 'auto', background: 'none', border: 'none',
                color: '#fff', cursor: 'pointer', fontSize: 22, lineHeight: 1,
                opacity: 0.85, padding: '0 2px',
              }}
            >×</button>
          </div>

          {/* Iframe */}
          <div style={{ flex: 1, position: 'relative' }}>
            {!loaded && (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: dark ? '#1a1a2e' : '#f8f9fc',
                flexDirection: 'column', gap: 12,
              }}>
                <svg width="32" height="32" viewBox="0 0 20 20" fill={accent}
                  style={{ animation: 'azulPulse 1.4s ease infinite' }}>
                  <path d="M10 0 L11.5 8.5 L20 10 L11.5 11.5 L10 20 L8.5 11.5 L0 10 L8.5 8.5 Z" />
                </svg>
                <span style={{ fontSize: 13, color: '#888', fontFamily: 'sans-serif' }}>
                  Cargando Azul...
                </span>
              </div>
            )}
            {url && (
              <iframe
                src={url}
                onLoad={() => setLoaded(true)}
                style={{
                  width: '100%', height: '100%', border: 'none',
                  display: loaded ? 'block' : 'none',
                }}
                allow="microphone; notifications"
                title="Azul AI"
              />
            )}
          </div>
        </div>
      )}

      {/* Botón flotante */}
      <button
        onClick={openWidget}
        title="Abrir Azul AI"
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 1400,
          width: 56, height: 56, borderRadius: '50%',
          background: open ? '#0f4f8a' : accent,
          border: 'none', cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(26,108,168,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.2s ease, transform 0.2s ease',
          transform: open ? 'rotate(45deg)' : 'none',
        }}
      >
        {open
          ? <span style={{ color: '#fff', fontSize: 24, lineHeight: 1, transform: 'rotate(-45deg)', display: 'block' }}>×</span>
          : <svg width="24" height="24" viewBox="0 0 20 20" fill="#fff">
              <path d="M10 0 L11.5 8.5 L20 10 L11.5 11.5 L10 20 L8.5 11.5 L0 10 L8.5 8.5 Z" />
            </svg>
        }
      </button>

      <style>{`
        @keyframes azulWidgetIn {
          from { opacity: 0; transform: translateY(14px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes azulPulse {
          0%, 100% { opacity: 1;   transform: scale(1);    }
          50%       { opacity: 0.4; transform: scale(0.82); }
        }
      `}</style>
    </>
  );
}
