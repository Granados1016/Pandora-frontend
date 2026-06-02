import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Typography, Stack, Button, Chip, CircularProgress,
  Alert, Avatar, Divider, LinearProgress,
} from '@mui/material';
import LoginIcon       from '@mui/icons-material/Login';
import LogoutIcon      from '@mui/icons-material/Logout';
import LocationOnIcon  from '@mui/icons-material/LocationOn';
import LocationOffIcon from '@mui/icons-material/LocationOff';
import AccessTimeIcon  from '@mui/icons-material/AccessTime';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { checadorApi }    from '../../api/pandoraApi';
import { useAuth }        from '../../hooks/useAuth.jsx';

// Normaliza fechas UTC del backend (sin 'Z') para que JS las interprete correctamente
function utc(d) {
  if (!d) return null;
  const s = String(d);
  return new Date(s.endsWith('Z') || s.includes('+') ? s : s + 'Z');
}
function fmtTime(d) {
  if (!d) return '—';
  return utc(d).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('es-MX', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
}

export default function CheckadorPage() {
  const { fullName, username } = useAuth();

  const [registrosHoy, setRegistrosHoy] = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [marcando,     setMarcando]     = useState(false);
  const [error,        setError]        = useState('');
  const [success,      setSuccess]      = useState('');

  const [gps,          setGps]          = useState(null);   // { lat, lng, precision }
  const [gpsError,     setGpsError]     = useState('');
  const [gpsLoading,   setGpsLoading]   = useState(false);

  // Reloj en tiempo real
  const [ahora, setAhora] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setAhora(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const loadHoy = useCallback(async () => {
    setLoading(true);
    try {
      const r = await checadorApi.getHoy();
      setRegistrosHoy(r.data);
    } catch { }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadHoy(); }, [loadHoy]);

  // Obtiene la mejor lectura GPS disponible en hasta 10 segundos.
  // Usa watchPosition para acumular lecturas y quedarse con la más precisa.
  const obtenerGps = () => new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject('GPS no disponible en este dispositivo.'); return; }
    setGpsLoading(true); setGpsError('');

    let best = null;
    let watchId = null;
    const PRECISION_OBJETIVO = 50; // metros — acepta si logra ≤50m
    const TIMEOUT_MS = 12000;      // espera máx 12 segundos

    const finish = (result) => {
      navigator.geolocation.clearWatch(watchId);
      setGpsLoading(false);
      if (result) { setGps(result); resolve(result); }
      else { const msg = 'No se pudo obtener ubicación precisa.'; setGpsError(msg); reject(msg); }
    };

    const timer = setTimeout(() => finish(best), TIMEOUT_MS);

    watchId = navigator.geolocation.watchPosition(
      pos => {
        const g = { lat: pos.coords.latitude, lng: pos.coords.longitude, precision: pos.coords.accuracy };
        if (!best || g.precision < best.precision) {
          best = g;
          setGps(g); // actualiza el indicador en tiempo real
          if (g.precision <= PRECISION_OBJETIVO) {
            clearTimeout(timer);
            finish(g); // ya es suficientemente preciso
          }
        }
      },
      err => {
        clearTimeout(timer);
        const msg = err.code === 1 ? 'Permiso de ubicación denegado.'
                  : err.code === 2 ? 'Ubicación no disponible.'
                  : 'Tiempo de espera agotado.';
        setGpsLoading(false); setGpsError(msg);
        if (best) resolve(best); // usa lo que tengamos aunque no sea ideal
        else reject(msg);
      },
      { enableHighAccuracy: true, timeout: TIMEOUT_MS, maximumAge: 0 }
    );
  });

  const handleMarcar = async (tipo) => {
    setError(''); setSuccess('');
    setMarcando(true);
    try {
      let gpsData = gps;
      try { gpsData = await obtenerGps(); } catch (e) { setGpsError(String(e)); }

      await checadorApi.marcar({
        tipo,
        lat:       gpsData?.lat       ?? null,
        lng:       gpsData?.lng       ?? null,
        precision: gpsData?.precision ?? null,
        notas:     null,
      });
      setSuccess(`${tipo} registrada correctamente a las ${fmtTime(new Date())}`);
      await loadHoy();
    } catch (e) {
      const msg = e?.response?.data;
      if (typeof msg === 'string' && msg.includes('Ya existe'))
        setError(`Ya marcaste ${tipo} hoy.`);
      else
        setError('Error al registrar. Intenta de nuevo.');
    } finally { setMarcando(false); }
  };

  const yaEntro  = registrosHoy.some(r => r.tipo === 'Entrada');
  const yaSalio  = registrosHoy.some(r => r.tipo === 'Salida');
  const entrada  = registrosHoy.find(r => r.tipo === 'Entrada');
  const salida   = registrosHoy.find(r => r.tipo === 'Salida');

  return (
    <Box sx={{
      minHeight: '100vh',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'flex-start',
      p: { xs: 2, sm: 4 },
      bgcolor: 'background.default',
    }}>
      <Box sx={{ width: '100%', maxWidth: 480 }}>

        {/* Cabecera */}
        <Paper elevation={0} sx={{
          p: 3, mb: 2, borderRadius: 3, textAlign: 'center',
          background: 'linear-gradient(135deg, #1a237e 0%, #1565c0 100%)',
          color: 'white',
        }}>
          <Avatar sx={{ width: 64, height: 64, mx: 'auto', mb: 1.5, bgcolor: 'rgba(255,255,255,0.2)', fontSize: 24 }}>
            {(fullName || username || '?')[0].toUpperCase()}
          </Avatar>
          <Typography variant="h6" fontWeight={700}>{fullName || username}</Typography>
          <Typography variant="body2" sx={{ opacity: 0.8, mt: 0.5 }}>
            {fmtDate(ahora)}
          </Typography>
          <Typography variant="h3" fontWeight={800} sx={{ mt: 1, letterSpacing: 2, fontVariantNumeric: 'tabular-nums' }}>
            {ahora.toLocaleTimeString('es-MX', { hour:'2-digit', minute:'2-digit', second:'2-digit' })}
          </Typography>
        </Paper>

        {/* GPS status */}
        <Paper elevation={0} sx={{ px: 2, py: 1, mb: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            {gpsLoading
              ? <><CircularProgress size={16} />
                  <Typography variant="caption" color="text.secondary">
                    {gps ? `Mejorando precisión… ±${Math.round(gps.precision)}m` : 'Obteniendo ubicación…'}
                  </Typography></>
              : gps
              ? <><LocationOnIcon fontSize="small" color="success" />
                  <Typography variant="caption" color="success.main">
                    GPS: {gps.lat.toFixed(5)}, {gps.lng.toFixed(5)} · ±{Math.round(gps.precision)}m
                  </Typography></>
              : gpsError
              ? <><LocationOffIcon fontSize="small" color="error" />
                  <Typography variant="caption" color="error.main">{gpsError}</Typography></>
              : <><LocationOffIcon fontSize="small" color="disabled" />
                  <Typography variant="caption" color="text.secondary">Ubicación no capturada aún</Typography></>
            }
          </Stack>
          {gpsLoading && <LinearProgress sx={{ mt: 1, borderRadius: 1 }} />}
        </Paper>

        {/* Alertas */}
        {error   && <Alert severity="error"   sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setSuccess('')}
          icon={<CheckCircleIcon />}>{success}</Alert>}

        {/* Botones principales */}
        <Stack spacing={2} mb={3}>
          <Button
            variant="contained" size="large" fullWidth
            startIcon={marcando ? <CircularProgress size={22} color="inherit" /> : <LoginIcon />}
            disabled={marcando || yaEntro}
            onClick={() => handleMarcar('Entrada')}
            sx={{
              py: 2.5, borderRadius: 3, fontSize: 18, fontWeight: 700,
              bgcolor: yaEntro ? 'success.main' : 'primary.main',
              '&:hover': { bgcolor: yaEntro ? 'success.dark' : 'primary.dark' },
              '&.Mui-disabled': { bgcolor: yaEntro ? 'success.main' : undefined, color: 'white', opacity: yaEntro ? 0.7 : undefined },
            }}
          >
            {yaEntro ? `✓ Entrada registrada ${fmtTime(entrada?.timestamp)}` : 'Marcar Entrada'}
          </Button>

          <Button
            variant="contained" size="large" fullWidth
            startIcon={marcando ? <CircularProgress size={22} color="inherit" /> : <LogoutIcon />}
            disabled={marcando || !yaEntro || yaSalio}
            onClick={() => handleMarcar('Salida')}
            sx={{
              py: 2.5, borderRadius: 3, fontSize: 18, fontWeight: 700,
              bgcolor: yaSalio ? 'success.main' : '#e65100',
              '&:hover': { bgcolor: yaSalio ? 'success.dark' : '#bf360c' },
              '&.Mui-disabled': {
                bgcolor: yaSalio ? 'success.main' : !yaEntro ? '#ccc' : undefined,
                color: 'white',
                opacity: (yaSalio || !yaEntro) ? 0.7 : undefined,
              },
            }}
          >
            {yaSalio ? `✓ Salida registrada ${fmtTime(salida?.timestamp)}` : 'Marcar Salida'}
          </Button>
        </Stack>

        {/* Historial de hoy */}
        {registrosHoy.length > 0 && (
          <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="overline" color="text.secondary" fontWeight={700} display="block" mb={1.5}>
              Registros de hoy
            </Typography>
            <Stack spacing={1}>
              {registrosHoy.map((r, i) => (
                <Box key={r.id}>
                  {i > 0 && <Divider sx={{ mb: 1 }} />}
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Stack direction="row" alignItems="center" spacing={1}>
                      {r.tipo === 'Entrada'
                        ? <LoginIcon fontSize="small" color="primary" />
                        : <LogoutIcon fontSize="small" color="warning" />}
                      <Chip size="small" label={r.tipo}
                        color={r.tipo === 'Entrada' ? 'primary' : 'warning'} variant="outlined" />
                    </Stack>
                    <Stack alignItems="flex-end">
                      <Typography variant="body2" fontWeight={700}>{fmtTime(r.timestamp)}</Typography>
                      {r.lat && (
                        <Typography variant="caption" color="text.secondary">
                          <LocationOnIcon sx={{ fontSize: 12, verticalAlign: 'middle' }} />
                          ±{Math.round(r.precision ?? 0)}m
                        </Typography>
                      )}
                    </Stack>
                  </Stack>
                </Box>
              ))}
            </Stack>
          </Paper>
        )}

      </Box>
    </Box>
  );
}
