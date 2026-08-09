import { useState, useMemo } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Box, Card, CardContent, TextField, Button,
  Typography, Alert, CircularProgress, Stack,
  InputAdornment, IconButton,
} from '@mui/material';
import LockIcon        from '@mui/icons-material/Lock';
import VisibilityIcon  from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { useAuth } from '../hooks/useAuth.jsx';
import { authApi } from '../api/pandoraApi';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithToken } = useAuth();

  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // 2FA state
  const [step,     setStep]     = useState('credentials'); // 'credentials' | 'otp'
  const [otpCode,  setOtpCode]  = useState('');
  const [otpSent,  setOtpSent]  = useState(false);

  const from = location.state?.from?.pathname || '/';
  const sessionExpired = useMemo(
    () => new URLSearchParams(location.search).get('expired') === '1',
    [location.search]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (step === 'otp') { handleVerifyOtp(); return; }
    setLoading(true);
    setError('');
    try {
      await login(form.username, form.password);
      navigate(from, { replace: true });
    } catch (err) {
      const res = err?.response;
      if (res?.status === 202 && res?.data?.requires2FA) {
        await authApi.sendOtp(form.username);
        setOtpSent(true);
        setStep('otp');
        setError('');
      } else if (res?.status === 403 && res?.data?.error === 'license_suspended') {
        setError('🔒 ' + (res.data.message || 'Acceso suspendido. Contacte al proveedor.'));
      } else if (res?.status === 403 && res?.data?.error === 'license_expired') {
        setError('📅 ' + (res.data.message || 'La licencia ha expirado. Contacte al proveedor.'));
      } else {
        setError('Usuario o contraseña incorrectos.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await authApi.verifyOtp({ username: form.username, code: otpCode.trim() });
      // verifyOtp returns { token, refreshToken }
      if (loginWithToken) {
        await loginWithToken(res.data.token, res.data.refreshToken);
      } else {
        localStorage.setItem('pandora_token', res.data.token);
        if (res.data.refreshToken) localStorage.setItem('pandora_refresh_token', res.data.refreshToken);
        window.location.href = from;
        return;
      }
      navigate(from, { replace: true });
    } catch {
      setError('Código incorrecto o expirado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'primary.main',
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 420, mx: 2 }}>
        <CardContent sx={{ p: 4 }}>
          <Stack alignItems="center" mb={3}>
            <Box
              sx={{
                bgcolor: 'primary.main', borderRadius: '50%',
                width: 56, height: 56, display: 'flex',
                alignItems: 'center', justifyContent: 'center', mb: 2,
              }}
            >
              <LockIcon sx={{ color: 'white', fontSize: 28 }} />
            </Box>
            <Typography variant="h5" fontWeight={800} color="primary.main">
              PANDORA
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Sistema de Gestión
            </Typography>
          </Stack>

          {sessionExpired && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Tu sesión ha expirado. Por favor inicia sesión nuevamente.
            </Alert>
          )}
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Box component="form" onSubmit={handleSubmit}>
            {step === 'credentials' ? (
              <>
                <TextField
                  fullWidth label="Usuario" value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  autoComplete="username" sx={{ mb: 2 }} required
                />
                <TextField
                  fullWidth label="Contraseña" value={form.password}
                  type={showPassword ? 'text' : 'password'}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  autoComplete="current-password" sx={{ mb: 3 }} required
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword(v => !v)} edge="end" tabIndex={-1}>
                          {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </>
            ) : (
              <>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Se envió un código de verificación al correo registrado.
                </Alert>
                <TextField
                  fullWidth label="Código de verificación (6 dígitos)"
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value.replace(/\D/g,'').slice(0,6))}
                  inputProps={{ maxLength: 6, style: { letterSpacing: 8, fontSize: 24, textAlign: 'center' } }}
                  sx={{ mb: 3 }} autoFocus required
                />
                <Button variant="text" size="small" sx={{ mb: 1 }}
                  onClick={() => { setStep('credentials'); setOtpCode(''); setError(''); }}>
                  ← Volver
                </Button>
              </>
            )}
            <Button
              type="submit" variant="contained" fullWidth size="large"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={18} color="inherit" /> : null}
            >
              {loading ? 'Verificando...' : step === 'otp' ? 'Verificar código' : 'Iniciar Sesión'}
            </Button>
            {step === 'credentials' && (
              <Box textAlign="center" mt={1.5}>
                <Link to="/forgot-password" style={{ color: 'inherit', fontSize: '0.82rem', opacity: 0.65 }}>
                  ¿Olvidaste tu contraseña?
                </Link>
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
