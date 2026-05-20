import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, TextField, Button,
  Typography, Alert, CircularProgress, Stack,
} from '@mui/material';
import LockResetIcon from '@mui/icons-material/LockReset';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import api from '../api/pandoraApi';
import { friendlyError } from '../utils/errorHelpers';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      setError(friendlyError(err, 'No se pudo procesar la solicitud. Intenta de nuevo.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      bgcolor: 'primary.main',
    }}>
      <Card sx={{ width: '100%', maxWidth: 420, mx: 2 }}>
        <CardContent sx={{ p: 4 }}>
          <Stack alignItems="center" mb={3}>
            <Box sx={{
              bgcolor: 'primary.main', borderRadius: '50%',
              width: 56, height: 56, display: 'flex',
              alignItems: 'center', justifyContent: 'center', mb: 2,
            }}>
              <LockResetIcon sx={{ color: 'white', fontSize: 28 }} />
            </Box>
            <Typography variant="h5" fontWeight={800} color="primary.main">
              Recuperar contraseña
            </Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center" mt={0.5}>
              Ingresa el correo registrado en tu cuenta Pandora.
            </Typography>
          </Stack>

          {sent ? (
            <Alert severity="success" sx={{ mb: 2 }}>
              Si el correo está registrado, recibirás un enlace para restablecer tu contraseña
              en los próximos minutos. Revisa tu bandeja de entrada y spam.
            </Alert>
          ) : (
            <>
              {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
              <Box component="form" onSubmit={handleSubmit}>
                <TextField
                  fullWidth label="Correo electrónico"
                  type="email" value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email" sx={{ mb: 3 }} required
                />
                <Button
                  type="submit" variant="contained" fullWidth size="large"
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={18} color="inherit" /> : null}
                >
                  {loading ? 'Enviando…' : 'Enviar enlace de recuperación'}
                </Button>
              </Box>
            </>
          )}

          <Stack alignItems="center" mt={2}>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate('/login')}
              color="inherit"
              size="small"
            >
              Volver al inicio de sesión
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
