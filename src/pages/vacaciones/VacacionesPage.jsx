import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Grid, Paper, Typography, Button, TextField, MenuItem,
  Chip, CircularProgress, Alert, Divider, Tooltip, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions,
  LinearProgress, Stack, useTheme,
} from '@mui/material';
import ChevronLeftIcon  from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import BeachAccessIcon  from '@mui/icons-material/BeachAccess';
import { DatePicker }   from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import api from '../../api/pandoraApi';
import { useAuth } from '../../hooks/useAuth.jsx';

dayjs.locale('es');

const MONTH_NAMES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];

const STATUS_COLOR = {
  aprobado:  '#4caf50',
  pendiente: '#ff9800',
  rechazado: '#f44336',
  cancelado: '#9e9e9e',
  holiday:   '#e53935',
};

const LEGEND = [
  { label: 'Aprobado',  color: STATUS_COLOR.aprobado },
  { label: 'Solicitado', color: STATUS_COLOR.pendiente },
  { label: 'Festivo',   color: STATUS_COLOR.holiday },
  { label: 'Rechazado', color: STATUS_COLOR.rechazado },
];

// ── Mini calendario mensual ───────────────────────────────────────────────────
function MonthGrid({ year, month, markedMap }) {
  const theme = useTheme();
  const firstDay = new Date(year, month, 1).getDay(); // 0=dom
  // Ajustar para que la semana empiece en Lunes
  const startOffset = (firstDay + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const today = new Date();

  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, height: '100%' }}>
      <Typography variant="subtitle2" align="center" fontWeight={700} sx={{ mb: 1 }}>
        {MONTH_NAMES[month]}
      </Typography>

      {/* Cabecera días */}
      <Grid container columns={7}>
        {['L','M','X','J','V','S','D'].map((d, i) => (
          <Grid item xs={1} key={i}>
            <Typography
              variant="caption"
              align="center"
              display="block"
              sx={{
                fontWeight: 600,
                color: i >= 5 ? 'error.main' : 'text.secondary',
                fontSize: '0.65rem',
              }}
            >
              {d}
            </Typography>
          </Grid>
        ))}
      </Grid>

      {/* Días */}
      <Grid container columns={7}>
        {cells.map((day, idx) => {
          if (!day) return <Grid item xs={1} key={`e-${idx}`} />;

          const dateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
          const mark    = markedMap[dateStr];
          const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
          const isWeekend = (idx % 7) >= 5;

          let bg = 'transparent';
          let textColor = isWeekend ? 'error.light' : 'text.primary';
          if (mark) { bg = STATUS_COLOR[mark.type] || '#90caf9'; textColor = '#fff'; }
          if (isToday && !mark) { bg = theme.palette.primary.main; textColor = '#fff'; }

          return (
            <Grid item xs={1} key={dateStr}>
              <Tooltip title={mark ? `${mark.requestType || mark.type} · ${mark.type}` : ''} disableHoverListener={!mark}>
                <Box sx={{
                  width: '100%', aspectRatio: '1',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: '50%',
                  bgcolor: bg,
                  cursor: mark ? 'pointer' : 'default',
                }}>
                  <Typography variant="caption" sx={{ color: textColor, fontSize: '0.68rem', fontWeight: mark || isToday ? 700 : 400 }}>
                    {day}
                  </Typography>
                </Box>
              </Tooltip>
            </Grid>
          );
        })}
      </Grid>
    </Paper>
  );
}

// ── Página principal ─────────────────────────────────────────────────────────
export default function VacacionesPage() {
  const { fullName } = useAuth();
  const [year, setYear]       = useState(new Date().getFullYear());
  const [markedDays, setMarked] = useState([]);
  const [diasInfo, setDiasInfo] = useState(null);
  const [loading, setLoading]  = useState(true);
  const [error, setError]      = useState('');
  const [success, setSuccess]  = useState('');

  // Formulario solicitud
  const [startDate, setStartDate] = useState(null);
  const [endDate,   setEndDate]   = useState(null);
  const [tipo,      setTipo]      = useState('Vacaciones');
  const [notas,     setNotas]     = useState('');
  const [sending,   setSending]   = useState(false);

  // Diálogo mis solicitudes
  const [historialOpen, setHistorialOpen] = useState(false);
  const [historial,     setHistorial]     = useState([]);

  const loadCalendar = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [calRes, diasRes] = await Promise.all([
        api.get(`/vacaciones/mi-calendario/${year}`),
        api.get('/vacaciones/mis-dias'),
      ]);
      setMarked(calRes.data);
      setDiasInfo(diasRes.data);
    } catch {
      setError('No se pudo cargar el calendario.');
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => { loadCalendar(); }, [loadCalendar]);

  // Construir mapa fecha → marca
  const markedMap = markedDays.reduce((acc, m) => {
    acc[m.date] = m;
    return acc;
  }, {});

  const handleSolicitar = async () => {
    if (!startDate || !endDate) { setError('Selecciona las fechas.'); return; }
    if (endDate.isBefore(startDate)) { setError('La fecha fin debe ser posterior al inicio.'); return; }
    setSending(true);
    setError('');
    try {
      const res = await api.post('/vacaciones/solicitar', {
        startDate: startDate.format('YYYY-MM-DD'),
        endDate:   endDate.format('YYYY-MM-DD'),
        type:      tipo,
        notes:     notas || null,
      });
      setSuccess(`Solicitud enviada correctamente (${res.data.totalDays} día(s) hábil(es)).`);
      setStartDate(null);
      setEndDate(null);
      setNotas('');
      loadCalendar();
    } catch (err) {
      setError(err.response?.data || 'Error al enviar la solicitud.');
    } finally {
      setSending(false);
    }
  };

  const loadHistorial = async () => {
    const res = await api.get('/vacaciones/mis-solicitudes');
    setHistorial(res.data);
    setHistorialOpen(true);
  };

  const handleCancelar = async (id) => {
    try {
      await api.delete(`/vacaciones/${id}/cancelar`);
      setHistorial(h => h.map(x => x.id === id ? { ...x, status: 'Cancelado' } : x));
      loadCalendar();
    } catch {
      alert('No se pudo cancelar la solicitud.');
    }
  };

  const pct = diasInfo ? Math.round((diasInfo.usedDays / diasInfo.totalDays) * 100) : 0;

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        {/* Encabezado */}
        <Stack direction="row" alignItems="center" spacing={1} mb={2}>
          <BeachAccessIcon color="primary" />
          <Typography variant="h5" fontWeight={700}>
            Mis Vacaciones
          </Typography>
        </Stack>

        <Grid container spacing={2}>
          {/* ── Panel izquierdo ──────────────────────────────────────────── */}
          <Grid item xs={12} md={3} lg={2.5}>
            <Paper sx={{ p: 2, borderRadius: 2, position: 'sticky', top: 80 }}>
              {/* Días disponibles */}
              <Typography variant="overline" color="text.secondary">Días Disponibles</Typography>
              {diasInfo ? (
                <>
                  <Typography variant="h4" fontWeight={800} align="center" color="primary" sx={{ my: 0.5 }}>
                    {diasInfo.availableDays}/{diasInfo.totalDays}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={pct}
                    color={pct > 80 ? 'error' : pct > 50 ? 'warning' : 'success'}
                    sx={{ borderRadius: 2, mb: 1.5 }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {diasInfo.usedDays} usado(s) · {diasInfo.year}
                  </Typography>
                </>
              ) : <CircularProgress size={24} sx={{ display: 'block', mx: 'auto', my: 1 }} />}

              <Divider sx={{ my: 2 }} />

              {/* Formulario */}
              <Typography variant="overline" color="text.secondary">Nueva Solicitud</Typography>
              <Stack spacing={1.5} mt={1}>
                <TextField
                  select size="small" label="Tipo" value={tipo}
                  onChange={e => setTipo(e.target.value)}
                >
                  {['Vacaciones','Permiso','Ausencia','Día equipo'].map(t => (
                    <MenuItem key={t} value={t}>{t}</MenuItem>
                  ))}
                </TextField>

                <DatePicker
                  label="Desde"
                  value={startDate}
                  onChange={v => { setStartDate(v); if (endDate && v && endDate.isBefore(v)) setEndDate(v); }}
                  slotProps={{ textField: { size: 'small', fullWidth: true } }}
                  disablePast
                />
                <DatePicker
                  label="Hasta"
                  value={endDate}
                  onChange={setEndDate}
                  minDate={startDate || undefined}
                  slotProps={{ textField: { size: 'small', fullWidth: true } }}
                  disablePast
                />

                <TextField
                  multiline rows={3} size="small"
                  label="Nota (opcional)"
                  value={notas}
                  onChange={e => setNotas(e.target.value)}
                  inputProps={{ maxLength: 300 }}
                />

                {error   && <Alert severity="error"   onClose={() => setError('')}   sx={{ fontSize: '0.75rem' }}>{error}</Alert>}
                {success && <Alert severity="success" onClose={() => setSuccess('')} sx={{ fontSize: '0.75rem' }}>{success}</Alert>}

                <Button
                  variant="contained" fullWidth
                  onClick={handleSolicitar} disabled={sending}
                  startIcon={sending ? <CircularProgress size={16} color="inherit" /> : null}
                >
                  {sending ? 'Enviando…' : 'Solicitar'}
                </Button>
                <Button variant="outlined" size="small" fullWidth onClick={loadHistorial}>
                  Ver mis solicitudes
                </Button>
              </Stack>

              <Divider sx={{ my: 2 }} />

              {/* Leyenda */}
              <Typography variant="overline" color="text.secondary">Leyenda</Typography>
              <Stack spacing={0.5} mt={0.5}>
                {LEGEND.map(l => (
                  <Stack direction="row" alignItems="center" spacing={1} key={l.label}>
                    <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: l.color, flexShrink: 0 }} />
                    <Typography variant="caption">{l.label}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Paper>
          </Grid>

          {/* ── Calendario año ───────────────────────────────────────────── */}
          <Grid item xs={12} md={9} lg={9.5}>
            {/* Navegación año */}
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
              <Typography variant="h6" fontWeight={700}>
                {fullName ? `${fullName} · ${year}` : year}
              </Typography>
              <Stack direction="row" alignItems="center" spacing={1}>
                <IconButton size="small" onClick={() => setYear(y => y - 1)}><ChevronLeftIcon /></IconButton>
                <Typography variant="h6" fontWeight={700} minWidth={50} align="center">{year}</Typography>
                <IconButton size="small" onClick={() => setYear(y => y + 1)}><ChevronRightIcon /></IconButton>
              </Stack>
            </Stack>

            {loading ? (
              <Box display="flex" justifyContent="center" py={8}>
                <CircularProgress />
              </Box>
            ) : (
              <Grid container spacing={1.5}>
                {Array.from({ length: 12 }, (_, i) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={i}>
                    <MonthGrid year={year} month={i} markedMap={markedMap} />
                  </Grid>
                ))}
              </Grid>
            )}
          </Grid>
        </Grid>

        {/* ── Diálogo historial ────────────────────────────────────────────── */}
        <Dialog open={historialOpen} onClose={() => setHistorialOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>Mis Solicitudes</DialogTitle>
          <DialogContent dividers>
            {historial.length === 0 ? (
              <Typography color="text.secondary" align="center" py={3}>No hay solicitudes registradas.</Typography>
            ) : historial.map(s => (
              <Paper key={s.id} variant="outlined" sx={{ p: 2, mb: 1.5, borderRadius: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1}>
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                      <Typography fontWeight={600}>{s.type}</Typography>
                      <Chip
                        label={s.status} size="small"
                        sx={{
                          bgcolor: STATUS_COLOR[s.status.toLowerCase()] || '#90a4ae',
                          color: '#fff', fontWeight: 700, fontSize: '0.7rem',
                        }}
                      />
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      {s.startDate} → {s.endDate} · {s.totalDays} día(s)
                    </Typography>
                    {s.notes && <Typography variant="caption" display="block" color="text.secondary">Nota: {s.notes}</Typography>}
                    {s.reviewNotes && <Typography variant="caption" display="block" color="primary">Respuesta: {s.reviewNotes}</Typography>}
                  </Box>
                  {s.status === 'Pendiente' && (
                    <Button size="small" color="error" variant="outlined" onClick={() => handleCancelar(s.id)}>
                      Cancelar
                    </Button>
                  )}
                </Stack>
              </Paper>
            ))}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setHistorialOpen(false)}>Cerrar</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
}
