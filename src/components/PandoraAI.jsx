import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box, Drawer, IconButton, Typography, TextField, CircularProgress,
  Paper, Tooltip, Divider, Avatar, Fade, Button, Alert,
} from '@mui/material';
import AutoAwesomeIcon  from '@mui/icons-material/AutoAwesome';
import CloseIcon        from '@mui/icons-material/Close';
import SendIcon         from '@mui/icons-material/Send';
import LogoutIcon       from '@mui/icons-material/Logout';
import SmartToyIcon     from '@mui/icons-material/SmartToy';
import { useAuth }      from '../hooks/useAuth';
import { useLocation }  from 'react-router-dom';
import { azulApi }      from '../api/azulApi';

const DRAWER_WIDTH = 390;

const ROUTE_LABELS = {
  '/':                       'Dashboard principal',
  '/campaigns':              'Campañas de correo',
  '/campaigns/new':          'Nueva campaña de correo',
  '/templates':              'Plantillas de correo',
  '/inventory':              'Dashboard de inventario',
  '/inventory/items':        'Lista de equipos',
  '/inventory/types':        'Tipos de equipo',
  '/catalogs/departments':   'Catálogo de departamentos',
  '/catalogs/employees':     'Catálogo de empleados',
  '/tickets':                'Mis tickets de soporte',
  '/tickets/new':            'Nuevo ticket de soporte',
  '/licencias':              'Control de licencias de software',
  '/calendar':               'Pandora Calendar',
  '/calendar/rooms':         'Gestión de salas',
  '/calendar/solicitud':     'Nueva solicitud de sala',
  '/calendar/solicitudes':   'Solicitudes de sala',
  '/calendar/reports':       'Reportes de calendario',
  '/reports':                'Reportes del sistema',
  '/profile':                'Mi perfil',
  '/admin':                  'Administración del sistema',
};

export default function PandoraAI() {
  const [open, setOpen]               = useState(false);
  const [connected, setConnected]     = useState(azulApi.isConnected());
  const [messages, setMessages]       = useState([]);
  const [input, setInput]             = useState('');
  const [sending, setSending]         = useState(false);
  const [loginEmail, setLoginEmail]   = useState('');
  const [loginPass, setLoginPass]     = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError]   = useState('');
  const [pulse, setPulse]             = useState(true);
  const [firstMsg, setFirstMsg]       = useState(true);

  const messagesEndRef = useRef(null);
  const abortRef       = useRef(null);
  const convIdRef      = useRef(null);
  const inputRef       = useRef(null);

  const { fullName, username } = useAuth();
  const { pathname }           = useLocation();

  // Animar botón 8 segundos al cargar
  useEffect(() => {
    const t = setTimeout(() => setPulse(false), 8000);
    return () => clearTimeout(t);
  }, []);

  // Al abrir: saludo inicial
  useEffect(() => {
    if (open && connected && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        text: `¡Hola, ${fullName || username}! Soy Azul AI, tu asistente integrado en Pandora. ¿En qué te puedo ayudar hoy?`,
      }]);
    }
    if (open) setTimeout(() => inputRef.current?.focus(), 300);
  }, [open, connected]);

  // Scroll automático
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleLogin = async () => {
    if (!loginEmail || !loginPass) return;
    setLoginLoading(true);
    setLoginError('');
    try {
      await azulApi.login(loginEmail, loginPass);
      setConnected(true);
    } catch (e) {
      setLoginError(e.message || 'Error de conexión con Azul');
    } finally {
      setLoginLoading(false);
    }
  };

  const buildContext = () => {
    const page = ROUTE_LABELS[pathname] || pathname;
    return `[CONTEXTO PANDORA]\nUsuario: ${fullName || username}\nPágina actual: ${page}\nSistema: Pandora — Sistema de Gestión Empresarial\n---\n\n`;
  };

  const sendMessage = useCallback(async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);

    setMessages(prev => [...prev, { role: 'user', text }]);
    setMessages(prev => [...prev, { role: 'assistant', text: '', streaming: true }]);

    try {
      if (!convIdRef.current) {
        convIdRef.current = await azulApi.getOrCreateConv();
      }

      const content = firstMsg ? buildContext() + text : text;
      setFirstMsg(false);

      abortRef.current = azulApi.streamMessage({
        convId: convIdRef.current,
        content,
        onChunk: (delta) => {
          setMessages(prev => {
            const last = prev[prev.length - 1];
            if (!last?.streaming) return prev;
            return [
              ...prev.slice(0, -1),
              { ...last, text: last.text + delta },
            ];
          });
        },
        onDone: () => {
          setMessages(prev => {
            const last = prev[prev.length - 1];
            if (!last?.streaming) return prev;
            return [
              ...prev.slice(0, -1),
              { ...last, streaming: false },
            ];
          });
          setSending(false);
        },
        onError: (err) => {
          setMessages(prev => {
            const last = prev[prev.length - 1];
            if (!last?.streaming) return prev;
            return [
              ...prev.slice(0, -1),
              { ...last, text: `Error: ${err}`, streaming: false, error: true },
            ];
          });
          setSending(false);
        },
      });
    } catch (e) {
      setMessages(prev => {
        const updated  = [...prev];
        updated[updated.length - 1] = {
          role: 'assistant', text: `Error: ${e.message}`, error: true,
        };
        return updated;
      });
      setSending(false);
    }
  }, [input, sending, firstMsg, pathname, fullName, username]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleLogout = () => {
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
    azulApi.logout();
    setConnected(false);
    setMessages([]);
    setFirstMsg(true);
    convIdRef.current = null;
  };

  const handleClose = () => {
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
    setSending(false);
    setOpen(false);
  };

  return (
    <>
      {/* ── Botón flotante ✦ ──────────────────────────────────────────────── */}
      <Tooltip title="Azul AI — Asistente inteligente" placement="left">
        <Box
          onClick={() => { setOpen(true); setPulse(false); }}
          sx={{
            position:      'fixed',
            bottom:        28,
            right:         28,
            zIndex:        1300,
            width:         52,
            height:        52,
            borderRadius:  '50%',
            background:    'linear-gradient(135deg, #1a2744 0%, #2d4a8a 100%)',
            display:       'flex',
            alignItems:    'center',
            justifyContent:'center',
            cursor:        'pointer',
            boxShadow:     '0 4px 20px rgba(26,39,68,0.45)',
            transition:    'transform 0.2s, box-shadow 0.2s',
            '&:hover': {
              transform:  'scale(1.1)',
              boxShadow:  '0 6px 28px rgba(26,39,68,0.6)',
            },
            ...(pulse && {
              '&::before': {
                content:      '""',
                position:     'absolute',
                inset:        -6,
                borderRadius: '50%',
                border:       '2px solid rgba(45,74,138,0.55)',
                animation:    'azulPulse 2s ease-out infinite',
              },
            }),
            '@keyframes azulPulse': {
              '0%':   { transform: 'scale(1)',   opacity: 0.9 },
              '70%':  { transform: 'scale(1.5)', opacity: 0   },
              '100%': { transform: 'scale(1.5)', opacity: 0   },
            },
          }}
        >
          <AutoAwesomeIcon sx={{ color: 'white', fontSize: 22 }} />
        </Box>
      </Tooltip>

      {/* ── Drawer de chat ────────────────────────────────────────────────── */}
      <Drawer
        anchor="right"
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width:         DRAWER_WIDTH,
            display:       'flex',
            flexDirection: 'column',
            bgcolor:       '#f5f6fa',
          },
        }}
      >
        {/* Header */}
        <Box sx={{
          px: 2, py: 1.5,
          display: 'flex', alignItems: 'center', gap: 1.5,
          background: 'linear-gradient(135deg, #1a2744 0%, #2d4a8a 100%)',
          flexShrink: 0,
        }}>
          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.15)', width: 36, height: 36 }}>
            <SmartToyIcon sx={{ fontSize: 20, color: 'white' }} />
          </Avatar>
          <Box flex={1} minWidth={0}>
            <Typography variant="body2" fontWeight={700} color="white" lineHeight={1.2}>
              Azul AI
            </Typography>
            <Typography variant="caption" sx={{ color: connected ? '#7ec8a0' : 'rgba(255,255,255,0.5)' }}>
              {connected ? '● Conectado' : '○ No conectado'}
            </Typography>
          </Box>
          {connected && (
            <Tooltip title="Desconectar de Azul">
              <IconButton size="small" onClick={handleLogout}
                sx={{ color: 'rgba(255,255,255,0.6)', '&:hover': { color: 'white' } }}>
                <LogoutIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <IconButton size="small" onClick={handleClose}
            sx={{ color: 'rgba(255,255,255,0.6)', '&:hover': { color: 'white' } }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* ── Sin conexión: formulario de login ─────────────────────────── */}
        {!connected ? (
          <Box sx={{
            flex: 1, display: 'flex', flexDirection: 'column',
            justifyContent: 'center', p: 3, gap: 2,
          }}>
            <Box textAlign="center" mb={1}>
              <AutoAwesomeIcon sx={{ fontSize: 52, color: '#1a2744', mb: 1 }} />
              <Typography variant="h6" fontWeight={700} color="#1a2744">
                Conectar con Azul AI
              </Typography>
              <Typography variant="body2" color="text.secondary" mt={0.5}>
                Ingresa tus credenciales de Azul para acceder al asistente inteligente
              </Typography>
            </Box>

            {loginError && (
              <Alert severity="error" sx={{ py: 0.5 }}>{loginError}</Alert>
            )}

            <TextField
              label="Correo de Azul"
              type="email"
              size="small"
              fullWidth
              value={loginEmail}
              onChange={e => setLoginEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              autoFocus
            />
            <TextField
              label="Contraseña"
              type="password"
              size="small"
              fullWidth
              value={loginPass}
              onChange={e => setLoginPass(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
            <Button
              variant="contained"
              fullWidth
              onClick={handleLogin}
              disabled={loginLoading || !loginEmail || !loginPass}
              sx={{
                bgcolor: '#1a2744',
                '&:hover': { bgcolor: '#2d4a8a' },
                py: 1.2,
                borderRadius: 2,
              }}
            >
              {loginLoading
                ? <CircularProgress size={20} sx={{ color: 'white' }} />
                : 'Conectar'}
            </Button>
          </Box>
        ) : (
          <>
            {/* ── Mensajes ───────────────────────────────────────────────── */}
            <Box sx={{
              flex: 1, overflowY: 'auto',
              px: 2, py: 1.5,
              display: 'flex', flexDirection: 'column', gap: 1.5,
              '&::-webkit-scrollbar': { width: 4 },
              '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(0,0,0,0.15)', borderRadius: 2 },
            }}>
              {messages.map((msg, i) => (
                <Fade in key={i} timeout={200}>
                  <Box sx={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    <Paper
                      elevation={0}
                      sx={{
                        px: 1.8, py: 1.2,
                        maxWidth: '86%',
                        borderRadius: msg.role === 'user'
                          ? '16px 16px 4px 16px'
                          : '16px 16px 16px 4px',
                        bgcolor: msg.role === 'user' ? '#1a2744' : 'white',
                        border: msg.role === 'assistant' ? '1px solid rgba(0,0,0,0.07)' : 'none',
                        boxShadow: msg.role === 'assistant' ? '0 1px 4px rgba(0,0,0,0.05)' : 'none',
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          lineHeight: 1.6,
                          color: msg.role === 'user'
                            ? 'white'
                            : msg.error ? 'error.main' : 'text.primary',
                        }}
                      >
                        {msg.text || (msg.streaming ? '▋' : '')}
                      </Typography>
                    </Paper>
                  </Box>
                </Fade>
              ))}
              <div ref={messagesEndRef} />
            </Box>

            <Divider />

            {/* ── Composer ───────────────────────────────────────────────── */}
            <Box sx={{
              p: 1.5, display: 'flex', gap: 1,
              alignItems: 'flex-end', bgcolor: 'white', flexShrink: 0,
            }}>
              <TextField
                inputRef={inputRef}
                multiline
                maxRows={4}
                fullWidth
                size="small"
                placeholder="Escribe un mensaje… (Enter para enviar)"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={sending}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    fontSize: 14,
                    bgcolor: '#f5f6fa',
                  },
                }}
              />
              <IconButton
                onClick={sendMessage}
                disabled={!input.trim() || sending}
                sx={{
                  bgcolor: '#1a2744',
                  color: 'white',
                  width: 38, height: 38,
                  borderRadius: 2,
                  flexShrink: 0,
                  '&:hover':    { bgcolor: '#2d4a8a' },
                  '&:disabled': { bgcolor: 'rgba(0,0,0,0.08)', color: 'rgba(0,0,0,0.3)' },
                }}
              >
                {sending
                  ? <CircularProgress size={16} sx={{ color: 'white' }} />
                  : <SendIcon sx={{ fontSize: 16 }} />}
              </IconButton>
            </Box>
          </>
        )}
      </Drawer>
    </>
  );
}
