import React, { useEffect, useRef, useState } from 'react';
import {
  Box, Typography, Paper, Stack, TextField, Button, Alert,
  CircularProgress, Divider, Chip, InputAdornment, IconButton,
  Avatar, Tooltip, Grid,
} from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import PersonIcon from '@mui/icons-material/Person';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import DeleteIcon from '@mui/icons-material/Delete';
import ShieldIcon from '@mui/icons-material/Shield';
import { userApi } from '../api/pandoraApi';
import { useAuth } from '../hooks/useAuth.jsx';

export default function Profile() {
  const { username, fullName, isAdmin } = useAuth();

  const [me, setMe]           = useState(null);
  const [loading, setLoading] = useState(true);

  // Foto de perfil
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoMsg, setPhotoMsg]             = useState(null);
  const photoInputRef = useRef();

  // SMTP
  const [smtpEmail, setSmtpEmail]       = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [smtpSaving, setSmtpSaving]     = useState(false);
  const [smtpMsg, setSmtpMsg]           = useState(null);

  const loadMe = () =>
    userApi.me()
      .then(r => {
        setMe(r.data);
        setSmtpEmail(r.data.smtpEmail ?? '');
        // Sincronizar posición en localStorage para que Layout la muestre
        if (r.data?.position) localStorage.setItem('pandora_user_position', r.data.position);
        else                   localStorage.removeItem('pandora_user_position');
        window.dispatchEvent(new Event('storage'));
      })
      .catch(() => {})
      .finally(() => setLoading(false));

  useEffect(() => { loadMe(); }, []);

  // ── Foto de perfil ─────────────────────────────────────────────────────────
  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    setPhotoMsg(null);
    try {
      const r = await userApi.uploadPhoto(file);
      localStorage.setItem('pandora_profile_photo', r.data.url);
      window.dispatchEvent(new Event('storage'));
      await loadMe();
      setPhotoMsg({ type: 'success', text: 'Foto de perfil actualizada.' });
    } catch (err) {
      setPhotoMsg({ type: 'error', text: err.response?.data || 'Error al subir la foto.' });
    } finally {
      setPhotoUploading(false);
      e.target.value = '';
    }
  };

  const handleDeletePhoto = async () => {
    if (!confirm('¿Eliminar tu foto de perfil?')) return;
    setPhotoUploading(true);
    try {
      await userApi.deletePhoto();
      localStorage.removeItem('pandora_profile_photo');
      window.dispatchEvent(new Event('storage'));
      await loadMe();
      setPhotoMsg({ type: 'success', text: 'Foto eliminada.' });
    } catch {
      setPhotoMsg({ type: 'error', text: 'Error al eliminar la foto.' });
    } finally {
      setPhotoUploading(false);
    }
  };

  // ── SMTP ───────────────────────────────────────────────────────────────────
  const handleSmtpSave = async () => {
    setSmtpSaving(true);
    setSmtpMsg(null);
    try {
      await userApi.updateSmtp({
        smtpEmail:    smtpEmail.trim() || null,
        smtpPassword: smtpPassword.trim() || null,
      });
      await loadMe();
      setSmtpPassword('');
      setSmtpMsg({ type: 'success', text: 'Correo remitente guardado correctamente.' });
    } catch (err) {
      setSmtpMsg({ type: 'error', text: 'Error al guardar: ' + (err.response?.data || err.message) });
    } finally {
      setSmtpSaving(false);
    }
  };

  const handleSmtpClear = async () => {
    if (!confirm('¿Quitar tu correo remitente personal?')) return;
    setSmtpSaving(true);
    setSmtpMsg(null);
    try {
      await userApi.updateSmtp({ smtpEmail: null, smtpPassword: null });
      await loadMe();
      setSmtpEmail('');
      setSmtpPassword('');
      setSmtpMsg({ type: 'success', text: 'Correo remitente eliminado.' });
    } catch (err) {
      setSmtpMsg({ type: 'error', text: 'Error: ' + (err.response?.data || err.message) });
    } finally {
      setSmtpSaving(false);
    }
  };

  const smtpConfigured = !!me?.smtpEmail;
  const displayName    = me?.fullName || fullName || '';
  const displayUser    = me?.username || username || '';

  if (loading) return (
    <Box display="flex" alignItems="center" justifyContent="center" minHeight="60vh">
      <CircularProgress />
    </Box>
  );

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 900, mx: 'auto' }}>

      {/* ── HEADER DE PERFIL ────────────────────────────────────────────────── */}
      <Paper
        elevation={0}
        sx={{
          p: 3, mb: 3, borderRadius: 3,
          border: '1px solid', borderColor: 'divider',
          background: 'linear-gradient(135deg, #1a237e 0%, #3949ab 100%)',
        }}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems={{ xs: 'center', sm: 'flex-start' }}>

          {/* Avatar */}
          <Box sx={{ position: 'relative', flexShrink: 0 }}>
            <Avatar
              src={me?.profilePhotoUrl || undefined}
              sx={{
                width: 100, height: 100,
                border: '3px solid rgba(255,255,255,0.8)',
                bgcolor: 'secondary.main',
                fontSize: 38, fontWeight: 700,
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              }}
            >
              {!me?.profilePhotoUrl && displayName[0]?.toUpperCase()}
            </Avatar>

            <Tooltip title="Cambiar foto de perfil">
              <IconButton
                size="small"
                onClick={() => photoInputRef.current?.click()}
                disabled={photoUploading}
                sx={{
                  position: 'absolute', bottom: 2, right: 2,
                  bgcolor: 'white', color: 'primary.main',
                  width: 28, height: 28,
                  '&:hover': { bgcolor: 'grey.100' },
                  boxShadow: 2,
                }}
              >
                {photoUploading
                  ? <CircularProgress size={12} />
                  : <CameraAltIcon sx={{ fontSize: 15 }} />}
              </IconButton>
            </Tooltip>

            <input
              ref={photoInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              hidden
              onChange={handlePhotoChange}
            />
          </Box>

          {/* Info */}
          <Box sx={{ flex: 1, textAlign: { xs: 'center', sm: 'left' } }}>
            <Typography variant="h5" fontWeight={800} color="white" lineHeight={1.2}>
              {displayName}
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mt: 0.5 }}>
              @{displayUser}
            </Typography>
            <Stack
              direction="row"
              spacing={1}
              mt={1.5}
              justifyContent={{ xs: 'center', sm: 'flex-start' }}
            >
              <Chip
                icon={<ShieldIcon sx={{ fontSize: '14px !important' }} />}
                label={isAdmin ? 'Administrador' : 'Usuario'}
                size="small"
                sx={{
                  bgcolor: isAdmin ? 'rgba(244,67,54,0.25)' : 'rgba(255,255,255,0.15)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.3)',
                  '& .MuiChip-icon': { color: 'white' },
                }}
              />
              {smtpConfigured && (
                <Chip
                  icon={<EmailIcon sx={{ fontSize: '14px !important' }} />}
                  label="Remitente propio"
                  size="small"
                  sx={{
                    bgcolor: 'rgba(76,175,80,0.25)',
                    color: 'white',
                    border: '1px solid rgba(255,255,255,0.3)',
                    '& .MuiChip-icon': { color: 'white' },
                  }}
                />
              )}
            </Stack>
          </Box>

          {/* Botón quitar foto */}
          {me?.profilePhotoUrl && (
            <Box>
              <Button
                size="small" variant="outlined"
                startIcon={<DeleteIcon />}
                onClick={handleDeletePhoto}
                disabled={photoUploading}
                sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.4)', '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' } }}
              >
                Quitar foto
              </Button>
            </Box>
          )}
        </Stack>

        {/* Mensaje foto */}
        {photoMsg && (
          <Alert
            severity={photoMsg.type}
            sx={{ mt: 2, borderRadius: 2 }}
            onClose={() => setPhotoMsg(null)}
          >
            {photoMsg.text}
          </Alert>
        )}
      </Paper>

      {/* ── GRID DE TARJETAS ────────────────────────────────────────────────── */}
      <Grid container spacing={3}>

        {/* Información de cuenta */}
        <Grid item xs={12} md={5}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', height: '100%' }}>
            <Stack direction="row" spacing={1.5} alignItems="center" mb={2}>
              <PersonIcon color="primary" />
              <Typography variant="h6" fontWeight={700}>Información de cuenta</Typography>
            </Stack>
            <Divider sx={{ mb: 2 }} />
            <Stack spacing={2}>
              {[
                { label: 'Nombre completo', value: displayName },
                { label: 'Usuario',         value: `@${displayUser}`, mono: true },
                { label: 'Correo',          value: me?.email || '—' },
                { label: 'Rol',             value: isAdmin ? 'Administrador' : 'Usuario' },
              ].map(({ label, value, mono }) => (
                <Box key={label}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing={0.5}>
                    {label}
                  </Typography>
                  <Typography
                    variant="body2"
                    fontWeight={600}
                    fontFamily={mono ? 'monospace' : 'inherit'}
                    mt={0.3}
                  >
                    {value}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Paper>
        </Grid>

        {/* Correo remitente SMTP */}
        <Grid item xs={12} md={7}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', height: '100%' }}>
            <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
              <EmailIcon color="primary" />
              <Box>
                <Typography variant="h6" fontWeight={700}>Correo Remitente Personal</Typography>
                <Typography variant="body2" color="text.secondary">
                  Tus campañas saldrán desde este correo en lugar del global.
                </Typography>
              </Box>
            </Stack>
            <Divider sx={{ mb: 2.5 }} />

            {/* Estado actual */}
            <Paper
              variant="outlined"
              sx={{
                p: 1.5, mb: 2.5, borderRadius: 2,
                bgcolor: smtpConfigured ? 'success.50' : 'grey.50',
                borderColor: smtpConfigured ? 'success.200' : 'divider',
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1}>
                {smtpConfigured
                  ? <CheckCircleIcon color="success" fontSize="small" />
                  : <CancelIcon color="disabled" fontSize="small" />
                }
                <Typography variant="body2">
                  {smtpConfigured
                    ? <><strong>Configurado:</strong> {me.smtpEmail}</>
                    : 'Sin correo personal — se usa el correo global del sistema.'}
                </Typography>
              </Stack>
            </Paper>

            <Alert severity="info" sx={{ mb: 2.5, borderRadius: 2 }} icon={false}>
              <Typography variant="caption">
                <strong>Requisito Gmail:</strong> activa verificación en 2 pasos y genera una{' '}
                <strong>Contraseña de aplicación</strong> en Seguridad de tu cuenta Google.
              </Typography>
            </Alert>

            <Stack spacing={2}>
              <TextField
                label="Correo remitente"
                value={smtpEmail}
                onChange={e => setSmtpEmail(e.target.value)}
                fullWidth size="small"
                placeholder="tucorreo@imet.edu.mx"
                type="email"
              />
              <TextField
                label={smtpConfigured ? 'Contraseña de aplicación (vacío = no cambiar)' : 'Contraseña de aplicación'}
                value={smtpPassword}
                onChange={e => setSmtpPassword(e.target.value)}
                fullWidth size="small"
                type={showPassword ? 'text' : 'password'}
                placeholder="xxxx xxxx xxxx xxxx"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(v => !v)} edge="end" size="small">
                        {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              {smtpMsg && (
                <Alert severity={smtpMsg.type} onClose={() => setSmtpMsg(null)} sx={{ borderRadius: 2 }}>
                  {smtpMsg.text}
                </Alert>
              )}

              <Stack direction="row" spacing={1.5} justifyContent="flex-end">
                {smtpConfigured && (
                  <Button
                    size="small" variant="outlined" color="error"
                    onClick={handleSmtpClear} disabled={smtpSaving}
                  >
                    Quitar remitente
                  </Button>
                )}
                <Button
                  variant="contained" size="small"
                  onClick={handleSmtpSave}
                  disabled={smtpSaving || !smtpEmail.trim() || (!smtpPassword.trim() && !smtpConfigured)}
                >
                  {smtpSaving ? <CircularProgress size={16} /> : 'Guardar'}
                </Button>
              </Stack>
            </Stack>
          </Paper>
        </Grid>

      </Grid>
    </Box>
  );
}
