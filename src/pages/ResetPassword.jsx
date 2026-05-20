import { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Card, CardContent, TextField, Button,
  Typography, Alert, CircularProgress, Stack,
  InputAdornment, IconButton,
} from '@mui/material';
import LockResetIcon    from '@mui/icons-material/LockReset';
import VisibilityIcon    from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import ArrowBackIcon    from '@mui/icons-material/ArrowBack';
import api from '../api/pandoraApi';
import { friendlyError } from '../utils/errorHelpers';

export default function ResetPassword() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const token     = useMemo(
    () => new URLSearchParams(location.search).get('token') ?? '',
    [location.search]
  );

  const [password,     setPassword]     = useState('');
  const [confirm,      setConfirm]      = useState('');
  const [showPass,     setShowPass]     = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [success,      setSuccess]      = useState(false);
  const [error,        setError]        = useState('');

  const mismatch = confirm && password !== confirm;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) { setError('Las contraseñas no coinciden.'); return; }
    if (password.length < 8)  { setError('La contraseña debe tener al menos 8 caracteres.'); return; }
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/reset-password', { token, newPassword: password });
      setSuccess(true);
    } catch (err) {
      setError(friendlyError(err, 'El enlace es inválido o ya expiró. Solicita uno nuevo.'));
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'primary.main' }}>
        <Card sx={{ maxWidth: 400, mx: 2 }}>
          <CardContent sx={{ p: 4, textAlign: 'center' }}>
            <Alert severity="error" sx={{ mb: 2 }}>Enlace de recuperación inválido.</Alert>
            <Button onClick={() => navigate('/forgot-password')} variant="contained">Solicitar nuevo enlace</Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

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
              Nueva contraseña
            </Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center" mt={0.5}>
              Ingresa y confirma tu nueva contraseña.
            </Typography>
          </Stack>

          {success ? (
            <>
              <Alert severity="success" sx={{ mb: 2 }}>
                ¡Contraseña actualizada correctamente! Ya puedes iniciar sesión con tu nueva contraseña.
              </Alert>
              <Button variant="contained" fullWidth onClick={() => navigate('/login')}>
                Ir a inicio de sesión
              </Button>
            </>
          ) : (
            <>
              {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
              <Box component="form" onSubmit={handleSubmit}>
                <TextField
                  fullWidth label="Nueva contraseña"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  sx={{ mb: 2 }} required
                  helperText="Mínimo 8 caracteres"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPass(v => !v)} edge="end" tabIndex={-1}>
                          {showPass ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  fullWidth label="Confirmar contraseña"
                  type={showPass ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  sx={{ mb: 3 }} required
                  error={mismatch}
                  helperText={mismatch ? 'Las contraseñas no coinciden' : ''}
                />
                <Button
                  type="submit" variant="contained" fullWidth size="large"
                  disabled={loading || mismatch}
                  startIcon={loading ? <CircularProgress size={18} color="inherit" /> : null}
                >
                  {loading ? 'Guardando…' : 'Establecer nueva contraseña'}
                </Button>
              </Box>
            </>
          )}

          {!success && (
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
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
