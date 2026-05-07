import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Divider,
  CircularProgress, Alert, Stack, Chip, Tooltip,
  LinearProgress, Paper, IconButton, Button,
} from '@mui/material';
import RefreshIcon          from '@mui/icons-material/Refresh';
import DownloadIcon         from '@mui/icons-material/Download';
import PeopleIcon           from '@mui/icons-material/People';
import EmailIcon            from '@mui/icons-material/Email';
import InventoryIcon        from '@mui/icons-material/Inventory2';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import VpnKeyIcon           from '@mui/icons-material/VpnKey';
import CalendarMonthIcon    from '@mui/icons-material/CalendarMonth';
import TrendingUpIcon       from '@mui/icons-material/TrendingUp';
import TrendingDownIcon     from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon     from '@mui/icons-material/TrendingFlat';
import CheckCircleIcon      from '@mui/icons-material/CheckCircle';
import WarningAmberIcon     from '@mui/icons-material/WarningAmber';
import ErrorIcon            from '@mui/icons-material/Error';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';

import { indicadoresApi } from '../../api/pandoraApi';

// ── Paleta de colores para gráficas ──────────────────────────────────────────
const CHART_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ title, value, subtitle, icon, color = 'primary', trend, trendLabel, statusColor }) {
  const TrendIcon = trend > 0 ? TrendingUpIcon : trend < 0 ? TrendingDownIcon : TrendingFlatIcon;
  const trendColor = trend > 0 ? 'success.main' : trend < 0 ? 'error.main' : 'text.secondary';

  return (
    <Card
      variant="outlined"
      sx={{
        height: '100%',
        borderLeft: 4,
        borderLeftColor: statusColor || `${color}.main`,
        transition: 'box-shadow 0.2s',
        '&:hover': { boxShadow: 4 },
      }}
    >
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing={0.5}>
              {title}
            </Typography>
            <Typography variant="h3" fontWeight={800} color={`${color}.main`} lineHeight={1.2} mt={0.5}>
              {value ?? <CircularProgress size={24} />}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary" mt={0.5}>
                {subtitle}
              </Typography>
            )}
            {trendLabel && (
              <Stack direction="row" spacing={0.5} alignItems="center" mt={1}>
                <TrendIcon sx={{ fontSize: 16, color: trendColor }} />
                <Typography variant="caption" sx={{ color: trendColor }}>{trendLabel}</Typography>
              </Stack>
            )}
          </Box>
          <Box
            sx={{
              width: 48, height: 48, borderRadius: 2,
              bgcolor: `${color}.50`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {React.cloneElement(icon, { sx: { color: `${color}.main`, fontSize: 26 } })}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

// ── Progress Stat ─────────────────────────────────────────────────────────────
function ProgressStat({ label, value, max, color = 'primary' }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" mb={0.5}>
        <Typography variant="body2">{label}</Typography>
        <Typography variant="body2" fontWeight={600}>{value} / {max}</Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={pct}
        color={color}
        sx={{ height: 6, borderRadius: 3 }}
      />
    </Box>
  );
}

// ── Sección con título ────────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <Box>
      <Typography variant="h6" fontWeight={700} mb={2} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {title}
      </Typography>
      {children}
    </Box>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function IndicadoresPage() {
  const [data,        setData]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [ts,          setTs]          = useState(null);
  const [exporting,   setExporting]   = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try { await indicadoresApi.exportar(); }
    catch { /* silencioso — el fetch ya muestra error en consola */ }
    finally { setExporting(false); }
  };

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: d } = await indicadoresApi.getAll();
      setData(d);
      setTs(new Date().toLocaleTimeString('es-MX'));
    } catch (e) {
      setError(e?.response?.data?.message || 'Error al cargar los indicadores.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading && !data) {
    return (
      <Box sx={{ p: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1400, mx: 'auto' }}>
      {/* Encabezado */}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight={700} mb={0.5}>
            Indicadores
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Vista consolidada del sistema Pandora.
            {ts && <> — Actualizado: <b>{ts}</b></>}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            size="small"
            startIcon={exporting ? <CircularProgress size={16} /> : <DownloadIcon />}
            onClick={handleExport}
            disabled={exporting || loading || !data}
          >
            {exporting ? 'Exportando…' : 'Exportar Excel'}
          </Button>
          <Tooltip title="Actualizar datos">
            <IconButton onClick={fetchData} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

      {data && (
        <Stack spacing={5}>

          {/* ── KPIs principales ──────────────────────────────────────────── */}
          <Section title="Resumen General">
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={4} lg={2}>
                <KpiCard
                  title="Usuarios Activos"
                  value={data.users?.active}
                  subtitle={`${data.users?.total ?? '-'} totales`}
                  icon={<PeopleIcon />}
                  color="primary"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4} lg={2}>
                <KpiCard
                  title="Campañas Enviadas"
                  value={data.mail?.sent}
                  subtitle={`${data.mail?.thisMonth ?? 0} este mes`}
                  icon={<EmailIcon />}
                  color="info"
                  trend={data.mail?.trend}
                  trendLabel={data.mail?.trendLabel}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4} lg={2}>
                <KpiCard
                  title="Artículos en Inventario"
                  value={data.inventory?.totalItems}
                  subtitle={`${data.inventory?.types ?? '-'} categorías`}
                  icon={<InventoryIcon />}
                  color="success"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4} lg={2}>
                <KpiCard
                  title="Tickets Abiertos"
                  value={data.tickets?.open}
                  subtitle={`${data.tickets?.total ?? '-'} en total`}
                  icon={<ConfirmationNumberIcon />}
                  color={data.tickets?.open > 10 ? 'error' : 'warning'}
                  statusColor={data.tickets?.open > 10 ? 'error.main' : undefined}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4} lg={2}>
                <KpiCard
                  title="Licencias Activas"
                  value={data.licencias?.active}
                  subtitle={`${data.licencias?.expiringSoon ?? 0} por vencer`}
                  icon={<VpnKeyIcon />}
                  color="secondary"
                  statusColor={data.licencias?.expiringSoon > 0 ? 'warning.main' : undefined}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4} lg={2}>
                <KpiCard
                  title="Reservas del Mes"
                  value={data.calendar?.thisMonth}
                  subtitle={`${data.calendar?.upcoming ?? 0} próximas`}
                  icon={<CalendarMonthIcon />}
                  color="primary"
                />
              </Grid>
            </Grid>
          </Section>

          {/* ── Gráficas ──────────────────────────────────────────────────── */}
          <Grid container spacing={3}>

            {/* Campañas por mes */}
            {data.mail?.monthlySent?.length > 0 && (
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                  <Typography fontWeight={700} mb={2}>Campañas enviadas por mes</Typography>
                  <Box sx={{ minWidth: 0, height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.mail.monthlySent} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                        <RTooltip />
                        <Bar dataKey="count" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} name="Campañas" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </Paper>
              </Grid>
            )}

            {/* Tickets por estado */}
            {data.tickets?.byStatus?.length > 0 && (
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                  <Typography fontWeight={700} mb={2}>Tickets por estado</Typography>
                  <Box sx={{ minWidth: 0, height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.tickets.byStatus}
                          dataKey="count"
                          nameKey="status"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {data.tickets.byStatus.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <RTooltip formatter={(v, n) => [v, n]} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                </Paper>
              </Grid>
            )}

            {/* Inventario por categoría */}
            {data.inventory?.byType?.length > 0 && (
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                  <Typography fontWeight={700} mb={2}>Inventario por categoría</Typography>
                  <Box sx={{ minWidth: 0, height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.inventory.byType} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                        <YAxis dataKey="typeName" type="category" tick={{ fontSize: 11 }} width={100} />
                        <RTooltip />
                        <Bar dataKey="count" fill={CHART_COLORS[2]} radius={[0, 4, 4, 0]} name="Artículos" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </Paper>
              </Grid>
            )}

            {/* Licencias por estado */}
            {data.licencias?.byEstado?.length > 0 && (
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                  <Typography fontWeight={700} mb={2}>Licencias por estado</Typography>
                  <Box sx={{ minWidth: 0, height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.licencias.byEstado}
                          dataKey="count"
                          nameKey="estado"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                        >
                          {data.licencias.byEstado.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <RTooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                </Paper>
              </Grid>
            )}
          </Grid>

          {/* ── Estado de módulos ──────────────────────────────────────────── */}
          {(data.licencias?.expiringSoon > 0 || data.tickets?.open > 0) && (
            <Section title="Alertas">
              <Grid container spacing={2}>
                {data.licencias?.expiringSoon > 0 && (
                  <Grid item xs={12} sm={6} md={4}>
                    <Card variant="outlined" sx={{ borderLeftColor: 'warning.main', borderLeft: 4 }}>
                      <CardContent>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <WarningAmberIcon color="warning" />
                          <Box>
                            <Typography fontWeight={600}>Licencias por vencer</Typography>
                            <Typography variant="body2" color="text.secondary">
                              {data.licencias.expiringSoon} licencia(s) vencen en los próximos 30 días.
                            </Typography>
                          </Box>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
                {data.tickets?.open > 0 && (
                  <Grid item xs={12} sm={6} md={4}>
                    <Card variant="outlined" sx={{ borderLeftColor: data.tickets.open > 10 ? 'error.main' : 'warning.main', borderLeft: 4 }}>
                      <CardContent>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          {data.tickets.open > 10
                            ? <ErrorIcon color="error" />
                            : <WarningAmberIcon color="warning" />}
                          <Box>
                            <Typography fontWeight={600}>Tickets sin resolver</Typography>
                            <Typography variant="body2" color="text.secondary">
                              {data.tickets.open} ticket(s) aún abiertos.
                            </Typography>
                          </Box>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
              </Grid>
            </Section>
          )}

          {/* ── Progreso de tickets ────────────────────────────────────────── */}
          {data.tickets?.total > 0 && (
            <Section title="Resolución de Tickets">
              <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, maxWidth: 600 }}>
                <Stack spacing={2}>
                  <ProgressStat
                    label="Tickets resueltos"
                    value={data.tickets.resolved ?? 0}
                    max={data.tickets.total}
                    color="success"
                  />
                  <ProgressStat
                    label="Tickets abiertos"
                    value={data.tickets.open ?? 0}
                    max={data.tickets.total}
                    color="warning"
                  />
                </Stack>
              </Paper>
            </Section>
          )}

        </Stack>
      )}
    </Box>
  );
}
