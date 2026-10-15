import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, TextField, Button, Typography, Alert, CircularProgress, Stack, Avatar,
} from '@mui/material';
import BadgeIcon from '@mui/icons-material/Badge';
import { useAuth } from '../hooks/useAuth.jsx';
import { authApi } from '../api/pandoraApi';

// Primer ingreso de una cuenta institucional precargada: la persona completa su
// nombre y puesto para homologar sus datos en todo Pandora (tickets, etc.).
export default function CompletarPerfil() {
  const navigate = useNavigate();
  const { fullName, loginWithToken } = useAuth();
  const [form, setForm]   = useState({ fullName: fullName || '', position: '' });
  const [loading, setLoad] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!form.fullName.trim()) { setError('Tu nombre completo es obligatorio.'); return; }
    setLoad(true); setError('');
    try {
      const { data } = await authApi.completeProfile(form.fullName.trim(), form.position.trim());
      // Token fresco ya sin la bandera de perfil pendiente.
      await loginWithToken(data.token);
      navigate('/', { replace: true });
    } catch {
      setError('No se pudo guardar tu perfil. Intenta de nuevo.');
    } finally { setLoad(false); }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
               bgcolor: 'primary.main', p: 2 }}>
      <Card sx={{ width: '100%', maxWidth: 440, borderRadius: 3 }}>
        <CardContent sx={{ p: 4 }}>
          <Stack alignItems="center" spacing={1} mb={2}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}><BadgeIcon /></Avatar>
            <Typography variant="h6" fontWeight={800} color="primary.main">Completa tu perfil</Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              Para que tus datos aparezcan correctamente en todo el sistema (tickets, reportes, etc.),
              confirma tu nombre y tu puesto.
            </Typography>
          </Stack>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Box component="form" onSubmit={submit}>
            <TextField
              fullWidth label="Nombre completo" value={form.fullName} required sx={{ mb: 2 }}
              onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
              autoFocus
            />
            <TextField
              fullWidth label="Puesto / Cargo" value={form.position} sx={{ mb: 3 }}
              onChange={e => setForm(f => ({ ...f, position: e.target.value }))}
              placeholder="Ej. Asesor educativo"
            />
            <Button
              type="submit" variant="contained" fullWidth size="large" disabled={loading}
              startIcon={loading ? <CircularProgress size={18} color="inherit" /> : null}
            >
              {loading ? 'Guardando...' : 'Guardar y entrar'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
