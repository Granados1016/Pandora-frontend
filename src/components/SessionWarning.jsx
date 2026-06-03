import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, LinearProgress, Stack,
} from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { useAuth }   from '../hooks/useAuth.jsx';
import api           from '../api/pandoraApi';

const WARN_BEFORE_MS = 5 * 60 * 1000;

function getTokenExp(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.exp ? payload.exp * 1000 : null;
  } catch { return null; }
}

export default function SessionWarning() {
  const { token, logout, loginWithToken } = useAuth();
  const [open,        setOpen]        = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(300);
  const [refreshing,  setRefreshing]  = useState(false);

  const handleRenew = useCallback(async () => {
    setRefreshing(true);
    try {
      const refreshToken = localStorage.getItem('pandora_refresh_token');
      if (!refreshToken) { logout(); return; }
      const { data } = await api.post('/auth/refresh', { refreshToken });
      await loginWithToken(data.token, data.refreshToken);
      setOpen(false);
    } catch { logout(); }
    finally { setRefreshing(false); }
  }, [logout, loginWithToken]);

  useEffect(() => {
    if (!token) { setOpen(false); return; }
    const exp = getTokenExp(token);
    if (!exp) return;
    const now = Date.now();
    const msLeft = exp - now;
    const warnIn = msLeft - WARN_BEFORE_MS;
    if (msLeft <= 0) { logout(); return; }
    if (warnIn <= 0) {
      setSecondsLeft(Math.max(0, Math.floor(msLeft / 1000)));
      setOpen(true);
      return;
    }
    const t = setTimeout(() => {
      setSecondsLeft(Math.floor(WARN_BEFORE_MS / 1000));
      setOpen(true);
    }, warnIn);
    return () => clearTimeout(t);
  }, [token, logout]);

  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) { logout(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [open, logout]);

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const pct  = Math.min(100, (secondsLeft / 300) * 100);

  return (
    <Dialog open={open} maxWidth="xs" fullWidth disableEscapeKeyDown>
      <DialogTitle>
        <Stack direction="row" spacing={1} alignItems="center">
          <AccessTimeIcon color="warning" />
          <Typography fontWeight={700}>Tu sesión está por expirar</Typography>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Tu sesión cerrará automáticamente en:
        </Typography>
        <Typography variant="h4" fontWeight={900}
          color={secondsLeft < 60 ? 'error.main' : 'warning.main'}
          textAlign="center" mb={2}>
          {mins}:{secs.toString().padStart(2, '0')}
        </Typography>
        <LinearProgress variant="determinate" value={pct}
          color={secondsLeft < 60 ? 'error' : 'warning'}
          sx={{ borderRadius: 1, height: 6 }} />
        <Typography variant="caption" color="text.secondary" display="block" mt={1} textAlign="center">
          ¿Deseas continuar trabajando?
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button color="error" onClick={logout} disabled={refreshing}>Cerrar sesión</Button>
        <Button variant="contained" onClick={handleRenew} disabled={refreshing} autoFocus>
          {refreshing ? 'Renovando…' : 'Continuar sesión'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
