import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Box, Card, CardContent, TextField, Button,
  Typography, Alert, CircularProgress, Stack,
  InputAdornment, IconButton, Divider,
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
  const [step,     setStep]     = useState('credentials'); // 'credentials' | 'otp' | 'access_request'
  const [otpCode,  setOtpCode]  = useState('');
  const [otpSent,  setOtpSent]  = useState(false);

  // Onboarding: solicitud de acceso con cuenta institucional
  const [accessReq, setAccessReq] = useState(null);                 // { idToken, email, sent }
  const [reqForm,   setReqForm]   = useState({ fullName: '', position: '' });

  // ── Login con Google ──────────────────────────────────────────────────────
  const googleBtnRef = useRef(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

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

  // ── Callback de Google: recibe el id_token y lo canjea por sesión Pandora ──
  const handleGoogleCredential = useCallback(async (response) => {
    const idToken = response?.credential;
    if (!idToken) return;
    setLoading(true);
    setError('');
    try {
      const res = await authApi.googleLogin(idToken);
      // Sin cuenta todavía → quedó una solicitud de acceso pendiente.
      if (res.data?.pending) {
        setAccessReq({ idToken, email: res.data.email, sent: !res.data.needsDetails });
        setReqForm({ fullName: res.data.name || '', position: '' });
        setStep('access_request');
        return;
      }
      await loginWithToken(res.data.token, res.data.refreshToken);
      navigate(from, { replace: true });
    } catch (err) {
      const data = err?.response?.data;
      if (data?.error === 'domain_not_allowed') {
        setError(data.message || 'Solo se permite el acceso con tu correo institucional.');
      } else if (data?.error === 'request_rejected' || data?.error === 'user_disabled') {
        setError(data.message);
      } else if (data?.error === 'license_suspended' || data?.error === 'license_expired') {
        setError(data.message);
      } else if (data?.error === 'google_not_configured') {
        setError('El inicio de sesión con Google no está configurado. Contacta al administrador.');
      } else {
        setError('No se pudo iniciar sesión con Google.');
      }
    } finally {
      setLoading(false);
    }
  }, [loginWithToken, navigate, from]);

  // Enviar/actualizar los datos de la solicitud de acceso (nombre, puesto).
  const submitAccessDetails = async () => {
    if (!accessReq?.idToken) return;
    setLoading(true);
    setError('');
    try {
      await authApi.googleLogin(accessReq.idToken, reqForm.fullName, reqForm.position);
      setAccessReq(a => ({ ...a, sent: true }));
    } catch {
      setError('No se pudieron enviar tus datos. Intenta iniciar sesión con Google de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // Carga Google Identity Services y renderiza el botón oficial.
  useEffect(() => {
    if (!googleClientId || step !== 'credentials') return;
    let cancelled = false;

    const render = () => {
      if (cancelled || !window.google?.accounts?.id || !googleBtnRef.current) return;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleCredential,
      });
      googleBtnRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'outline', size: 'large', width: 340,
        text: 'signin_with', shape: 'rectangular', logo_alignment: 'center',
      });
    };

    if (window.google?.accounts?.id) {
      render();
    } else {
      const existing = document.getElementById('google-gsi-script');
      if (existing) {
        existing.addEventListener('load', render, { once: true });
      } else {
        const s = document.createElement('script');
        s.src = 'https://accounts.google.com/gsi/client';
        s.async = true; s.defer = true; s.id = 'google-gsi-script';
        s.onload = render;
        document.head.appendChild(s);
      }
    }
    return () => { cancelled = true; };
  }, [googleClientId, step, handleGoogleCredential]);

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

          {step === 'access_request' ? (
            <Box>
              {!accessReq?.sent ? (
                <>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    ¡Casi listo! Completa tus datos y envía tu solicitud de acceso.
                  </Alert>
                  <TextField
                    fullWidth label="Nombre completo" value={reqForm.fullName}
                    onChange={e => setReqForm(f => ({ ...f, fullName: e.target.value }))}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth label="Puesto / Cargo (opcional)" value={reqForm.position}
                    onChange={e => setReqForm(f => ({ ...f, position: e.target.value }))}
                    sx={{ mb: 1.5 }}
                  />
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                    Cuenta institucional: {accessReq?.email}
                  </Typography>
                  <Button
                    variant="contained" fullWidth size="large" disabled={loading}
                    onClick={submitAccessDetails}
                    startIcon={loading ? <CircularProgress size={18} color="inherit" /> : null}
                  >
                    {loading ? 'Enviando...' : 'Enviar solicitud'}
                  </Button>
                </>
              ) : (
                <Alert severity="success" sx={{ mb: 1 }}>
                  <Typography fontWeight={700} gutterBottom>Tu solicitud fue enviada</Typography>
                  Un administrador debe aprobarla. Cuando te den acceso, vuelve a entrar con
                  “Iniciar sesión con Google” usando tu cuenta institucional.
                </Alert>
              )}
              <Button
                variant="text" size="small" sx={{ mt: 1 }}
                onClick={() => { setStep('credentials'); setAccessReq(null); setError(''); }}
              >
                ← Volver al inicio
              </Button>
            </Box>
          ) : (
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

            {step === 'credentials' && googleClientId && (
              <>
                <Divider sx={{ my: 2.5, fontSize: '0.75rem', color: 'text.secondary' }}>o</Divider>
                <Box display="flex" justifyContent="center">
                  <Box ref={googleBtnRef} />
                </Box>
                <Typography variant="caption" color="text.secondary" display="block" textAlign="center" mt={1}>
                  Usa tu cuenta institucional
                </Typography>
              </>
            )}
          </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
