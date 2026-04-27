import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, CardHeader,
  CircularProgress, Alert, Chip, Stack, IconButton, Tooltip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Divider,
} from '@mui/material';
import RefreshIcon        from '@mui/icons-material/Refresh';
import TodayIcon          from '@mui/icons-material/Today';
import DateRangeIcon      from '@mui/icons-material/DateRange';
import EventNoteIcon      from '@mui/icons-material/EventNote';
import CalendarMonthIcon  from '@mui/icons-material/CalendarMonth';
import StorageIcon        from '@mui/icons-material/Storage';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { calendarApi } from '../../api/pandoraApi';

const fmtDate = (iso) => iso
  ? new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Mexico_City' })
  : '—';

const fmtTime = (iso) => iso
  ? new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Mexico_City' })
  : '';

const BAR_COLORS = ['#1a237e', '#0d47a1', '#1565c0', '#1976d2', '#1e88e5', '#2196f3', '#42a5f5'];

function SummaryCard({ title, value, icon, color }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="body2" color="text.secondary" fontWeight={500} mb={0.5}>
              {title}
            </Typography>
            <Typography variant="h3" fontWeight={800} color={color ?? 'primary.main'}>
              {value ?? 0}
            </Typography>
          </Box>
          <Box sx={{ color: color ?? 'primary.main', opacity: 0.7, '& svg': { fontSize: 42 } }}>
            {icon}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function CalendarReports() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await calendarApi.getReports();
      setData(res.data);
    } catch {
      setError('No se pudieron cargar los reportes. Verifica la conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
      <CircularProgress />
    </Box>
  );

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight={800} color="primary.main">
            Reportes de Reservaciones
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Estadísticas e historial del módulo Pandora Calendar
          </Typography>
        </Box>
        <Tooltip title="Actualizar datos">
          <IconButton onClick={load} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

      {data && (<>

        {/* ── Tarjetas de resumen ─────────────────────────────────────── */}
        <Grid container spacing={2} mb={3}>
          <Grid item xs={6} sm={4} md>
            <SummaryCard title="Hoy" value={data.summary.today} icon={<TodayIcon />} color="primary.main" />
          </Grid>
          <Grid item xs={6} sm={4} md>
            <SummaryCard title="Últimos 7 días" value={data.summary.thisWeek} icon={<DateRangeIcon />} color="info.main" />
          </Grid>
          <Grid item xs={6} sm={4} md>
            <SummaryCard title="Este mes" value={data.summary.thisMonth} icon={<EventNoteIcon />} color="success.main" />
          </Grid>
          <Grid item xs={6} sm={4} md>
            <SummaryCard title="Este año" value={data.summary.thisYear} icon={<CalendarMonthIcon />} color="warning.main" />
          </Grid>
          <Grid item xs={6} sm={4} md>
            <SummaryCard title="Total histórico" value={data.summary.total} icon={<StorageIcon />} color="secondary.main" />
          </Grid>
        </Grid>

        {/* ── Gráficas fila 1: por mes + por día ─────────────────────── */}
        <Grid container spacing={2} mb={3}>

          {/* Por mes */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardHeader
                title="Reservaciones por mes"
                subheader="Últimos 12 meses"
                titleTypographyProps={{ fontWeight: 700, variant: 'subtitle1' }}
                subheaderTypographyProps={{ variant: 'caption' }}
              />
              <CardContent sx={{ pt: 0, pb: '16px !important' }}>
                <Box sx={{ height: 240 }}>
                  {data.byMonth.length === 0 ? (
                    <Box display="flex" alignItems="center" justifyContent="center" height="100%">
                      <Typography color="text.secondary">Sin datos aún</Typography>
                    </Box>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.byMonth} margin={{ left: -10, right: 8, top: 4, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                        <RTooltip formatter={(v) => [v, 'Reservaciones']} />
                        <Bar dataKey="count" fill="#1a237e" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Por día de la semana */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardHeader
                title="Por día de la semana"
                subheader="Histórico acumulado"
                titleTypographyProps={{ fontWeight: 700, variant: 'subtitle1' }}
                subheaderTypographyProps={{ variant: 'caption' }}
              />
              <CardContent sx={{ pt: 0, pb: '16px !important' }}>
                <Box sx={{ height: 240 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.byDayOfWeek} margin={{ left: -20, right: 8, top: 4, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <RTooltip formatter={(v) => [v, 'Reservaciones']} />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {data.byDayOfWeek.map((_, i) => (
                          <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* ── Fila 2: por sala + resumen rápido ──────────────────────── */}
        <Grid container spacing={2} mb={3}>

          {/* Por sala — barras de progreso */}
          <Grid item xs={12} md={7}>
            <Card sx={{ height: '100%' }}>
              <CardHeader
                title="Reservaciones por sala"
                subheader="Histórico acumulado"
                titleTypographyProps={{ fontWeight: 700, variant: 'subtitle1' }}
                subheaderTypographyProps={{ variant: 'caption' }}
              />
              <CardContent sx={{ pt: 0 }}>
                {data.byRoom.length === 0 ? (
                  <Typography color="text.secondary">Sin datos</Typography>
                ) : (
                  <Stack spacing={2}>
                    {data.byRoom.map((room, i) => {
                      const max = data.byRoom[0]?.count || 1;
                      const pct = Math.round((room.count / max) * 100);
                      return (
                        <Box key={i}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.75}>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Box sx={{
                                width: 10, height: 10, borderRadius: '50%',
                                bgcolor: room.color || '#1a237e', flexShrink: 0,
                              }} />
                              <Typography variant="body2" fontWeight={500}>{room.name}</Typography>
                            </Stack>
                            <Typography variant="body2" fontWeight={700} color="primary.main">
                              {room.count}
                            </Typography>
                          </Stack>
                          <Box sx={{ height: 8, borderRadius: 4, bgcolor: 'grey.100', overflow: 'hidden' }}>
                            <Box sx={{
                              height: '100%',
                              width: `${pct}%`,
                              bgcolor: room.color || '#1a237e',
                              borderRadius: 4,
                              transition: 'width 0.6s ease',
                            }} />
                          </Box>
                        </Box>
                      );
                    })}
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Resumen rápido */}
          <Grid item xs={12} md={5}>
            <Card sx={{ height: '100%' }}>
              <CardHeader
                title="Resumen rápido"
                titleTypographyProps={{ fontWeight: 700, variant: 'subtitle1' }}
              />
              <CardContent sx={{ pt: 0 }}>
                <Stack spacing={2} divider={<Divider />}>

                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}
                      textTransform="uppercase" letterSpacing={0.5}>
                      Sala más reservada
                    </Typography>
                    {data.byRoom[0] ? (
                      <Stack direction="row" spacing={1} alignItems="center" mt={0.75}>
                        <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: data.byRoom[0].color || '#1a237e' }} />
                        <Typography fontWeight={700}>{data.byRoom[0].name}</Typography>
                        <Chip label={`${data.byRoom[0].count} reservas`} size="small" color="primary" variant="outlined" />
                      </Stack>
                    ) : <Typography color="text.secondary" mt={0.5}>—</Typography>}
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}
                      textTransform="uppercase" letterSpacing={0.5}>
                      Día más activo
                    </Typography>
                    {(() => {
                      const max = data.byDayOfWeek.reduce((a, b) => b.count > a.count ? b : a, { count: 0, day: '' });
                      return max.count > 0 ? (
                        <Stack direction="row" spacing={1} alignItems="center" mt={0.75}>
                          <Typography fontWeight={700}>{max.day}</Typography>
                          <Chip label={`${max.count} reservas`} size="small" color="info" variant="outlined" />
                        </Stack>
                      ) : <Typography color="text.secondary" mt={0.5}>—</Typography>;
                    })()}
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}
                      textTransform="uppercase" letterSpacing={0.5}>
                      Salas activas
                    </Typography>
                    <Typography fontWeight={700} mt={0.5}>
                      {data.byRoom.length} sala{data.byRoom.length !== 1 ? 's' : ''}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}
                      textTransform="uppercase" letterSpacing={0.5}>
                      Promedio mensual
                    </Typography>
                    {(() => {
                      const months = data.byMonth.length;
                      const total  = data.byMonth.reduce((a, b) => a + b.count, 0);
                      const avg    = months > 0 ? Math.round(total / months) : 0;
                      return (
                        <Typography fontWeight={700} mt={0.5}>
                          {avg} reserva{avg !== 1 ? 's' : ''}/mes
                        </Typography>
                      );
                    })()}
                  </Box>

                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* ── Historial reciente ──────────────────────────────────────── */}
        <Card>
          <CardHeader
            title="Historial reciente"
            subheader="Últimas 20 reservaciones"
            titleTypographyProps={{ fontWeight: 700, variant: 'subtitle1' }}
            subheaderTypographyProps={{ variant: 'caption' }}
          />
          <CardContent sx={{ pt: 0, pb: '0 !important' }}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Evento</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Sala</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Organizador</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Fecha</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Horario (MX)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.history.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        <Typography color="text.secondary" py={3}>Sin reservaciones registradas</Typography>
                      </TableCell>
                    </TableRow>
                  ) : data.history.map((h) => (
                    <TableRow key={h.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>{h.title}</Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.75} alignItems="center">
                          <Box sx={{
                            width: 8, height: 8, borderRadius: '50%',
                            bgcolor: h.roomColor || '#1a237e', flexShrink: 0,
                          }} />
                          <Typography variant="body2">{h.roomName}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {h.organizerName || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{fmtDate(h.startTime)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {fmtTime(h.startTime)} – {fmtTime(h.endTime)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

      </>)}
    </Box>
  );
}
