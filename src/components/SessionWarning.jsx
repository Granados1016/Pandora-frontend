/**
 * SessionWarning — muestra un diálogo cuando la sesión está a punto de expirar.
 * Se monta en el Layout y verifica el JWT cada minuto.
 * Avisa al usuario con 5 minutos de anticipación.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  Button, Typography, LinearProgress, Box,
} from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import api from '../api/pandoraApi';

function getJwtExpiry(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(decodeURIComponent(
      atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
    ));
    return payload.exp ? payload.exp * 1000 : null; // ms
  } catch { return null; }
}

const WARN_BEFORE_MS = 5 * 60 * 1000; // 5 minutos

export default function SessionWarning() {
  const [open, setOpen]           = useState(false);
  const [remaining, setRemaining] = useState(0); // segundos restantes

  const check = useCallback(() => {
    const token = localStorage.getItem('pandora_token');
    if (!token) return;
    const expiry = getJwtExpiry(token);
    if (!expiry) return;
    const diff = expiry - Date.now();
    if (diff <= 0) return; // ya expiró — el interceptor lo manejará
    if (diff <= WARN_BEFORE_MS) {
      setRemaining(Math.ceil(diff / 1000));
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, []);

  // Countdown mientras el diálogo está abierto
  useEffect(() => {
    const interval = setInterval(() => {
      if (open) {
        setRemaining(r => {
          if (r <= 1) { setOpen(false); return 0; }
          return r - 1;
        });
      }
      check();
    }, 1000);
    return () => clearInterval(interval);
  }, [open, check]);

  const handleRenew = async () => {
    try {
      const refreshToken = localStorage.getItem('pandora_refresh_token');
      if (!refreshToken) { setOpen(false); return; }
      const res = await api.post('/auth/refresh', { refreshToken });
      localStorage.setItem('pandora_token', res.data.token);
      if (res.data.refreshToken) localStorage.setItem('pandora_refresh_token', res.data.refreshToken);
      setOpen(false);
    } catch {
      // El interceptor de axios manejará la redirección al login
      setOpen(false);
    }
  };

  const pct = Math.max(0, Math.min(100, (remaining / (WARN_BEFORE_MS / 1000)) * 100));
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  return (
    <Dialog open={open} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <AccessTimeIcon color="warning" />
        Sesión a punto de expirar
      </DialogTitle>
      <DialogContent>
        <DialogContentText gutterBottom>
          Tu sesión expirará en:
        </DialogContentText>
        <Typography variant="h4" fontWeight={700} align="center" color="warning.main">
          {mins}:{String(secs).padStart(2, '0')}
        </Typography>
        <Box mt={1}>
          <LinearProgress variant="determinate" value={pct} color="warning" sx={{ borderRadius: 2 }} />
        </Box>
        <DialogContentText mt={1}>
          ¿Deseas renovar tu sesión?
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setOpen(false)} color="inherit">Cerrar</Button>
        <Button onClick={handleRenew} variant="contained" color="warning">
          Renovar sesión
        </Button>
      </DialogActions>
    </Dialog>
  );
}
