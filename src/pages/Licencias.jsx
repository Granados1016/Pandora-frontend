import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Paper, Grid, Stack, Chip, Button, Alert,
  CircularProgress, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, Tooltip, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Select, MenuItem,
  FormControl, InputLabel, InputAdornment, Tabs, Tab, Checkbox,
} from '@mui/material';
import AssignmentIcon          from '@mui/icons-material/Assignment';
import WarningAmberIcon        from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon        from '@mui/icons-material/ErrorOutline';
import CheckCircleOutlineIcon  from '@mui/icons-material/CheckCircleOutline';
import CancelIcon              from '@mui/icons-material/Cancel';
import DownloadIcon            from '@mui/icons-material/Download';
import AddIcon                 from '@mui/icons-material/Add';
import EditIcon                from '@mui/icons-material/Edit';
import DeleteIcon              from '@mui/icons-material/Delete';
import RefreshIcon             from '@mui/icons-material/Refresh';
import SearchIcon              from '@mui/icons-material/Search';
import AttachMoneyIcon         from '@mui/icons-material/AttachMoney';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import CalendarMonthIcon       from '@mui/icons-material/CalendarMonth';
import ChevronLeftIcon         from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon        from '@mui/icons-material/ChevronRight';
import FilterListIcon          from '@mui/icons-material/FilterList';
import ClearIcon               from '@mui/icons-material/Clear';
import PaymentIcon             from '@mui/icons-material/Payment';
import HistoryIcon             from '@mui/icons-material/History';
import { licenciasApi } from '../api/pandoraApi';
import { useAuth, MODULES } from '../hooks/useAuth.jsx';

// ── helpers ───────────────────────────────────────────────────────────────────
const fmt$ = (n) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n ?? 0);

const FREQ_MONTHS = { Mensual: 1, Trimestral: 3, Semestral: 6, Anual: 12 };
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
               'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const AREA_COLOR = { TI: '#1a237e', Marketing: '#880e4f', 'Innovación': '#00695c', Socios: '#e65100' };
const AREA_BG    = { TI: '#e8eaf6', Marketing: '#fce4ec', 'Innovación': '#e0f2f1', Socios: '#fff3e0' };

const costoMensualNorm = (l) => l.costoMXN / (FREQ_MONTHS[l.frecuenciaPago] || 12);

function hasPaymentInMonth(l, year, month) {
  if (!l.proximoPago || l.estado === 'Cancelada') return false;
  const fm   = FREQ_MONTHS[l.frecuenciaPago] || 12;
  const base = new Date(l.proximoPago + 'T12:00:00');
  const diff = (year * 12 + month) - (base.getFullYear() * 12 + base.getMonth());
  return ((diff % fm) + fm) % fm === 0;
}

/** Calcula la nueva fecha de próximo pago dado el actual y la frecuencia */
function calcNuevoProximoPago(proximoPagoStr, frecuencia) {
  const meses = FREQ_MONTHS[frecuencia] || 1;
  const d = new Date(proximoPagoStr + 'T12:00:00');
  d.setMonth(d.getMonth() + meses);
  return d.toISOString().slice(0, 10);
}

/** Formatea una fecha (YYYY-MM-DD) como "DD/MM/AA", ej. 17/08/26 */
function formatFechaCorta(dateStr) {
  if (!dateStr) return '';
  const iso = String(dateStr).slice(0, 10);
  const d = new Date(iso + 'T12:00:00');
  if (isNaN(d.getTime())) return dateStr;
  const dia  = String(d.getDate()).padStart(2, '0');
  const mes  = String(d.getMonth() + 1).padStart(2, '0');
  const anio = String(d.getFullYear()).slice(-2);
  return `${dia}/${mes}/${anio}`;
}

const ESTADO_CHIP = {
  'Activa':     { color: 'success' },
  'Por vencer': { color: 'warning' },
  'Vencida':    { color: 'error'   },
  'Cancelada':  { color: 'default' },
};

const AREAS       = ['TI', 'Marketing', 'Innovación', 'Socios'];
const FRECUENCIAS = ['Mensual', 'Trimestral', 'Semestral', 'Anual'];
const ESTADOS     = ['Activa', 'Por vencer', 'Vencida', 'Cancelada'];

const EMPTY_FORM = {
  numero: '', plataforma: '', area: 'TI', responsable: '',
  frecuenciaPago: 'Mensual', fechaInicio: '', proximoPago: '',
  costoMXN: '', estado: 'Activa', notas: '',
};

// ── YearPicker ────────────────────────────────────────────────────────────────
function YearPicker({ value, onChange, light = false }) {
  const clr = light ? 'white' : 'text.primary';
  return (
    <Stack direction="row" alignItems="center" spacing={0.5}>
      <IconButton size="small" onClick={() => onChange(value - 1)} sx={{ color: clr }}>
        <ChevronLeftIcon fontSize="small" />
      </IconButton>
      <Typography
        variant="subtitle1" fontWeight={900}
        sx={{ minWidth: 56, textAlign: 'center', userSelect: 'none', color: clr }}
      >
        {value}
      </Typography>
      <IconButton size="small" onClick={() => onChange(value + 1)} sx={{ color: clr }}>
        <ChevronRightIcon fontSize="small" />
      </IconButton>
    </Stack>
  );
}

// ── GastosSection ─────────────────────────────────────────────────────────────
function GastosSection({ licencias }) {
  const today    = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());

  const activas = licencias.filter(l => l.estado !== 'Cancelada');

  const areaMap = {};
  activas.forEach(l => {
    if (!areaMap[l.area]) areaMap[l.area] = { count: 0, mensual: 0, anual: 0 };
    areaMap[l.area].count++;
    areaMap[l.area].mensual += costoMensualNorm(l);
    areaMap[l.area].anual   += (l.costoAnualMXN ?? 0);
  });
  const areaRows   = Object.entries(areaMap).map(([area, v]) => ({ area, ...v })).sort((a, b) => b.anual - a.anual);
  const totalAnual = areaRows.reduce((s, a) => s + a.anual, 0);
  const totalMens  = areaRows.reduce((s, a) => s + a.mensual, 0);

  const monthlyData = Array.from({ length: 12 }, (_, m) => {
    const items = activas.filter(l => hasPaymentInMonth(l, viewYear, m));
    return { month: m, total: items.reduce((s, l) => s + l.costoMXN, 0), count: items.length };
  });
  const maxMonthly = Math.max(...monthlyData.map(m => m.total), 1);

  return (
    <Box>
      {/* Tarjetas resumen */}
      <Grid container spacing={2} mb={3}>
        {[
          { label: 'Gasto Mensual',   value: fmt$(totalMens),  note: 'Promedio normalizado',    bg: '#e3f2fd', color: '#1565c0' },
          { label: 'Gasto Anual',     value: fmt$(totalAnual), note: 'Licencias activas',        bg: '#f3e5f5', color: '#6a1b9a' },
          { label: 'Áreas cubiertas', value: areaRows.length,  note: `${activas.length} licencias activas`, bg: '#e8f5e9', color: '#2e7d32' },
        ].map(c => (
          <Grid item xs={12} sm={4} key={c.label}>
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: c.bg, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase" letterSpacing={0.5}>
                {c.label}
              </Typography>
              <Typography variant="h5" fontWeight={800} sx={{ color: c.color, my: 0.5 }}>{c.value}</Typography>
              <Typography variant="caption" color="text.secondary">{c.note}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Tabla por área */}
      <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden', mb: 3 }}>
        <Box sx={{ px: 2.5, py: 1.5, bgcolor: '#1a237e' }}>
          <Typography variant="subtitle2" fontWeight={700} color="white">Gastos Totales por Área</Typography>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                {['Área','Licencias activas','Mensual equiv.','Costo anual','% del total','Distribución'].map(h => (
                  <TableCell key={h} sx={{ fontWeight: 700, fontSize: 12 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {areaRows.map((a, i) => {
                const pct   = totalAnual > 0 ? (a.anual / totalAnual * 100) : 0;
                const color = AREA_COLOR[a.area] || '#666';
                return (
                  <TableRow key={a.area} sx={{ bgcolor: i % 2 === 0 ? 'white' : '#fafafa' }}>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color }} />
                        <Typography variant="body2" fontWeight={700}>{a.area}</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ fontSize: 13 }}>{a.count}</TableCell>
                    <TableCell sx={{ fontSize: 13 }}>{fmt$(a.mensual)}</TableCell>
                    <TableCell sx={{ fontSize: 13, fontWeight: 700 }}>{fmt$(a.anual)}</TableCell>
                    <TableCell sx={{ fontSize: 13, fontWeight: 600 }}>{pct.toFixed(1)}%</TableCell>
                    <TableCell sx={{ minWidth: 120 }}>
                      <Box sx={{ height: 10, bgcolor: '#e0e0e0', borderRadius: 1, overflow: 'hidden' }}>
                        <Box sx={{ width: `${pct.toFixed(0)}%`, height: '100%', bgcolor: color, borderRadius: 1, transition: 'width 0.4s' }} />
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
              <TableRow sx={{ bgcolor: '#e8eaf6' }}>
                <TableCell sx={{ fontWeight: 800, fontSize: 13 }}>TOTAL</TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: 13 }}>{activas.length}</TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: 13 }}>{fmt$(totalMens)}</TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: 13 }}>{fmt$(totalAnual)}</TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: 13 }}>100%</TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Gastos mensuales del año */}
      <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden', mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 2.5, py: 1.2, bgcolor: '#1a237e' }}>
          <Typography variant="subtitle2" fontWeight={700} color="white">Gastos Mensuales</Typography>
          <YearPicker value={viewYear} onChange={setViewYear} light />
        </Stack>
        <Box sx={{ p: 2.5 }}>
          <Stack spacing={0.8}>
            {monthlyData.map(({ month, total, count }) => {
              const isNow  = today.getFullYear() === viewYear && today.getMonth() === month;
              const barPct = maxMonthly > 0 ? (total / maxMonthly * 100) : 0;
              return (
                <Stack key={month} direction="row" spacing={2} alignItems="center">
                  <Typography variant="caption" fontWeight={isNow ? 800 : 600}
                    sx={{ width: 90, color: isNow ? 'primary.main' : 'text.secondary' }}>
                    {MESES[month]}
                  </Typography>
                  <Box sx={{ flex: 1, height: 20, bgcolor: '#f0f0f0', borderRadius: 1, overflow: 'hidden' }}>
                    <Box sx={{
                      width: `${barPct}%`, height: '100%',
                      bgcolor: isNow ? '#1565c0' : '#90a4d4',
                      borderRadius: 1, transition: 'width 0.5s',
                    }} />
                  </Box>
                  <Typography variant="caption" fontWeight={700}
                    sx={{ width: 100, textAlign: 'right', color: isNow ? 'primary.main' : 'text.primary' }}>
                    {total > 0 ? fmt$(total) : '—'}
                  </Typography>
                  <Typography variant="caption" color="text.disabled" sx={{ width: 55 }}>
                    {count > 0 ? `${count} lic.` : ''}
                  </Typography>
                </Stack>
              );
            })}
          </Stack>
        </Box>
      </Paper>

      {/* Detalle por área */}
      {areaRows.map(a => (
        <Paper key={a.area} elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden', mb: 2 }}>
          <Box sx={{ px: 2.5, py: 1.3, bgcolor: AREA_COLOR[a.area] || '#424242' }}>
            <Typography variant="subtitle2" fontWeight={700} color="white">
              {a.area} — {fmt$(a.anual)} / año &nbsp;·&nbsp; {fmt$(a.mensual)} / mes equiv.
            </Typography>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: AREA_BG[a.area] || '#f5f5f5' }}>
                  {['Plataforma','Frecuencia','Monto por periodo','Equiv. mensual','Costo anual'].map(h => (
                    <TableCell key={h} sx={{ fontWeight: 700, fontSize: 12 }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {activas.filter(l => l.area === a.area).map((l, i) => (
                  <TableRow key={l.id} sx={{ bgcolor: i % 2 === 0 ? 'white' : '#fafafa' }}>
                    <TableCell sx={{ fontSize: 13, fontWeight: 600 }}>{l.plataforma}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{l.frecuenciaPago}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{fmt$(l.costoMXN)}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{fmt$(costoMensualNorm(l))}</TableCell>
                    <TableCell sx={{ fontSize: 12, fontWeight: 700 }}>{fmt$(l.costoAnualMXN)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      ))}
    </Box>
  );
}

// ── CalendarioSection ─────────────────────────────────────────────────────────
function CalendarioSection({ licencias }) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());

  const activas = licencias.filter(l => l.estado !== 'Cancelada');

  const months = Array.from({ length: 12 }, (_, m) => {
    const items = activas.filter(l => hasPaymentInMonth(l, viewYear, m));
    const total = items.reduce((s, l) => s + l.costoMXN, 0);
    return { month: m, items, total };
  });

  const yearTotal = months.reduce((s, m) => s + m.total, 0);

  return (
    <Box>
      {/* Encabezado */}
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between"
        alignItems={{ sm: 'center' }} mb={2.5} spacing={1}>
        <Box>
          <Typography variant="subtitle1" fontWeight={800}>Calendario de Pagos</Typography>
          <Typography variant="caption" color="text.secondary">
            Total proyectado {viewYear}: <strong>{fmt$(yearTotal)}</strong>
          </Typography>
        </Box>
        <YearPicker value={viewYear} onChange={setViewYear} />
      </Stack>

      {/* Leyenda */}
      <Stack direction="row" spacing={2} mb={2.5} flexWrap="wrap" gap={1}>
        {AREAS.map(a => (
          <Stack key={a} direction="row" spacing={0.5} alignItems="center">
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: AREA_COLOR[a] || '#666' }} />
            <Typography variant="caption" fontWeight={600}>{a}</Typography>
          </Stack>
        ))}
      </Stack>

      {/* Grid de meses */}
      <Grid container spacing={2} mb={3}>
        {months.map(({ month, items, total }) => {
          const isNow  = today.getFullYear() === viewYear && today.getMonth() === month;
          const isPast = viewYear < today.getFullYear() ||
                         (viewYear === today.getFullYear() && month < today.getMonth());
          return (
            <Grid item xs={12} sm={6} md={4} key={month}>
              <Paper elevation={0} sx={{
                p: 2, borderRadius: 3,
                border: '2px solid',
                borderColor: isNow ? 'primary.main' : 'divider',
                bgcolor: isPast && !isNow ? '#fafafa' : 'white',
                opacity: isPast && !isNow ? 0.82 : 1,
                minHeight: 120,
              }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="subtitle2" fontWeight={800} color={isNow ? 'primary.main' : 'text.primary'}>
                      {MESES[month]}
                    </Typography>
                    {isNow && <Chip label="Hoy" size="small" color="primary" sx={{ height: 18, fontSize: 10 }} />}
                  </Stack>
                  {total > 0
                    ? <Chip label={fmt$(total)} size="small" color={isNow ? 'primary' : 'default'} sx={{ fontWeight: 700, fontSize: 11 }} />
                    : <Typography variant="caption" color="text.disabled">—</Typography>
                  }
                </Stack>
                {items.length === 0
                  ? <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic' }}>Sin pagos programados</Typography>
                  : (
                    <Stack spacing={0.5}>
                      {items.map(l => (
                        <Stack key={l.id} direction="row" justifyContent="space-between" alignItems="center"
                          sx={{
                            px: 1, py: 0.4, borderRadius: 1.5, bgcolor: '#f5f5f5',
                            borderLeft: `3px solid ${AREA_COLOR[l.area] || '#ccc'}`,
                          }}
                        >
                          <Typography variant="caption" fontWeight={600} noWrap sx={{ maxWidth: 140 }}>
                            {l.plataforma}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap', ml: 0.5 }}>
                            {fmt$(l.costoMXN)}
                          </Typography>
                        </Stack>
                      ))}
                    </Stack>
                  )
                }
              </Paper>
            </Grid>
          );
        })}
      </Grid>

      {/* Tabla resumen anual */}
      <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
        <Box sx={{ px: 2.5, py: 1.5, bgcolor: '#1a237e' }}>
          <Typography variant="subtitle2" fontWeight={700} color="white">Resumen Anual {viewYear}</Typography>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                {['Mes','Pagos programados','Gasto del mes','Gasto acumulado'].map(h => (
                  <TableCell key={h} sx={{ fontWeight: 700, fontSize: 12 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {months.map(({ month, items, total }, _, arr) => {
                const acum  = arr.slice(0, month + 1).reduce((s, m) => s + m.total, 0);
                const isNow = today.getFullYear() === viewYear && today.getMonth() === month;
                return (
                  <TableRow key={month} sx={{ bgcolor: isNow ? '#e3f2fd' : month % 2 === 0 ? 'white' : '#fafafa' }}>
                    <TableCell sx={{ fontSize: 13, fontWeight: isNow ? 800 : 400 }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        {MESES[month]}
                        {isNow && <Chip label="actual" size="small" color="primary" sx={{ height: 16, fontSize: 10 }} />}
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ fontSize: 13 }}>
                      {items.length > 0 ? `${items.length} licencia${items.length > 1 ? 's' : ''}` : '—'}
                    </TableCell>
                    <TableCell sx={{ fontSize: 13, fontWeight: 600 }}>
                      {total > 0 ? fmt$(total) : '—'}
                    </TableCell>
                    <TableCell sx={{ fontSize: 13 }}>{fmt$(acum)}</TableCell>
                  </TableRow>
                );
              })}
              <TableRow sx={{ bgcolor: '#e8eaf6' }}>
                <TableCell sx={{ fontWeight: 800, fontSize: 13 }}>TOTAL</TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: 13 }}>{months.reduce((s, m) => s + m.items.length, 0)} pagos</TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: 13 }}>{fmt$(yearTotal)}</TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: 13 }}>{fmt$(yearTotal)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}

// ── componente principal ──────────────────────────────────────────────────────
export default function Licencias() {
  const { isAdmin, hasModuleWrite, hasSubModule } = useAuth();
  const canWrite    = hasModuleWrite(MODULES.LICENCIAS);
  const canSeeStats = hasSubModule(MODULES.LIC_STATS) || isAdmin;
  const [tab, setTab] = useState(0);

  const [dashboard, setDashboard] = useState(null);
  const [alertas,   setAlertas]   = useState([]);
  const [licencias, setLicencias] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

  // ── Filtros ───────────────────────────────────────────────────────────────
  const [busqueda,         setBusqueda]         = useState('');
  const [filtroArea,       setFiltroArea]       = useState('');
  const [filtroEstado,     setFiltroEstado]     = useState('');
  const [filtroFrecuencia, setFiltroFrecuencia] = useState('');
  const [filtroDias,       setFiltroDias]       = useState('');
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('');
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('');

  // ── CRUD dialog ───────────────────────────────────────────────────────────
  const [dialog,     setDialog]     = useState({ open: false, mode: 'create', data: EMPTY_FORM });
  const [saving,     setSaving]     = useState(false);
  const [saveErr,    setSaveErr]    = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [exporting,  setExporting]  = useState(false);

  // ── Selección + pagos ─────────────────────────────────────────────────────
  const [selectedIds,      setSelectedIds]      = useState(new Set());
  const [pagoDialog,       setPagoDialog]       = useState({ open: false, licencia: null, fechaPago: '', monto: '', notas: '' });
  const [pagoMasivoDialog, setPagoMasivoDialog] = useState({ open: false, fechaPago: '' });
  const [historialDialog,  setHistorialDialog]  = useState({ open: false, licencia: null });
  const [historial,        setHistorial]        = useState([]);
  const [loadingPago,      setLoadingPago]      = useState(false);
  const [pagoErr,          setPagoErr]          = useState(null);
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  // ── Carga ─────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [dash, alert, lista] = await Promise.all([
        licenciasApi.dashboard(),
        licenciasApi.alertas(),
        licenciasApi.getAll(),
      ]);
      setDashboard(dash.data);
      setAlertas(alert.data);
      setLicencias(lista.data);
    } catch (e) {
      setError('Error al cargar licencias: ' + (e.response?.data || e.message));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Filtrado client-side ──────────────────────────────────────────────────
  const licenciasFiltradas = licencias.filter(l => {
    if (busqueda) {
      const q = busqueda.toLowerCase();
      if (
        !l.plataforma.toLowerCase().includes(q) &&
        !l.area.toLowerCase().includes(q) &&
        !(l.responsable?.toLowerCase().includes(q)) &&
        !(l.notas?.toLowerCase().includes(q))
      ) return false;
    }
    if (filtroArea       && l.area           !== filtroArea)       return false;
    if (filtroEstado     && l.estado         !== filtroEstado)     return false;
    if (filtroFrecuencia && l.frecuenciaPago !== filtroFrecuencia) return false;
    if (filtroDias === 'vence7'   && !(l.diasRestantes >= 0 && l.diasRestantes <= 7))   return false;
    if (filtroDias === 'vence30'  && !(l.diasRestantes >= 0 && l.diasRestantes <= 30))  return false;
    if (filtroDias === 'vencidas' && l.diasRestantes >= 0)                               return false;
    if (filtroFechaDesde && (!l.proximoPago || l.proximoPago < filtroFechaDesde)) return false;
    if (filtroFechaHasta && (!l.proximoPago || l.proximoPago > filtroFechaHasta)) return false;
    return true;
  });

  const filtrosActivos = [busqueda, filtroArea, filtroEstado, filtroFrecuencia, filtroDias, filtroFechaDesde, filtroFechaHasta].filter(Boolean).length;

  const limpiarFiltros = () => {
    setBusqueda(''); setFiltroArea(''); setFiltroEstado('');
    setFiltroFrecuencia(''); setFiltroDias('');
    setFiltroFechaDesde(''); setFiltroFechaHasta('');
  };

  // ── Selección ─────────────────────────────────────────────────────────────
  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === licenciasFiltradas.length)
      setSelectedIds(new Set());
    else
      setSelectedIds(new Set(licenciasFiltradas.map(l => l.id)));
  };

  // ── Pago individual ───────────────────────────────────────────────────────
  const handleOpenPago = (l) => {
    const today = new Date().toISOString().slice(0, 10);
    setPagoDialog({ open: true, licencia: l, fechaPago: today, monto: String(l.costoMXN), notas: '' });
    setPagoErr(null);
  };

  const handleRegistrarPago = async () => {
    setLoadingPago(true); setPagoErr(null);
    try {
      await licenciasApi.registrarPago(pagoDialog.licencia.id, {
        fechaPago: pagoDialog.fechaPago,
        monto:     Number(pagoDialog.monto),
        notas:     pagoDialog.notas || null,
      });
      setPagoDialog(d => ({ ...d, open: false }));
      setSelectedIds(new Set());
      load();
    } catch (e) {
      const d = e?.response?.data;
      setPagoErr(typeof d === 'string' ? d : d?.error || d?.message || 'Error al registrar pago');
    } finally {
      setLoadingPago(false);
    }
  };

  // ── Pago masivo ───────────────────────────────────────────────────────────
  const handleOpenPagoMasivo = () => {
    const today = new Date().toISOString().slice(0, 10);
    setPagoMasivoDialog({ open: true, fechaPago: today });
    setPagoErr(null);
  };

  const handlePagoMasivo = async () => {
    setLoadingPago(true); setPagoErr(null);
    try {
      await licenciasApi.pagoMasivo({
        ids:       Array.from(selectedIds),
        fechaPago: pagoMasivoDialog.fechaPago,
        notas:     null,
      });
      setSelectedIds(new Set());
      setPagoMasivoDialog(d => ({ ...d, open: false }));
      load();
    } catch (e) {
      const d = e?.response?.data;
      setPagoErr(typeof d === 'string' ? d : d?.error || d?.message || 'Error al renovar licencias');
    } finally {
      setLoadingPago(false);
    }
  };

  // ── Historial ─────────────────────────────────────────────────────────────
  const handleOpenHistorial = async (l) => {
    setHistorialDialog({ open: true, licencia: l });
    setHistorial([]);
    setLoadingHistorial(true);
    try {
      const res = await licenciasApi.historialPagos(l.id);
      setHistorial(res.data);
    } catch { setHistorial([]); }
    finally { setLoadingHistorial(false); }
  };

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const openCreate = () => setDialog({ open: true, mode: 'create', data: { ...EMPTY_FORM } });

  const openEdit = (l) => setDialog({
    open: true, mode: 'edit',
    data: {
      numero: l.numero, plataforma: l.plataforma, area: l.area,
      responsable: l.responsable || '', frecuenciaPago: l.frecuenciaPago,
      fechaInicio: l.fechaInicio, proximoPago: l.proximoPago,
      costoMXN: l.costoMXN, estado: l.estado, notas: l.notas || '',
      _id: l.id,
    },
  });

  const handleSave = async () => {
    setSaving(true); setSaveErr(null);
    try {
      const payload = {
        numero:         Number(dialog.data.numero),
        plataforma:     dialog.data.plataforma,
        area:           dialog.data.area,
        responsable:    dialog.data.responsable || null,
        frecuenciaPago: dialog.data.frecuenciaPago,
        fechaInicio:    dialog.data.fechaInicio,
        proximoPago:    dialog.data.proximoPago,
        costoMXN:       Number(dialog.data.costoMXN),
        estado:         dialog.data.estado,
        notas:          dialog.data.notas || null,
      };
      if (dialog.mode === 'create') await licenciasApi.create(payload);
      else                          await licenciasApi.update(dialog.data._id, payload);
      setDialog(d => ({ ...d, open: false }));
      load();
    } catch (e) {
      setSaveErr('Error al guardar: ' + (e.response?.data || e.message));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try { await licenciasApi.delete(confirmDel.id); setConfirmDel(null); load(); }
    catch (e) { setError('Error al eliminar: ' + (e.response?.data || e.message)); }
  };

  const handleExportar = async () => {
    setExporting(true);
    try { await licenciasApi.exportar(); }
    catch (e) { setError('Error al exportar: ' + e.message); }
    finally { setExporting(false); }
  };

  const handleActualizarEstados = async () => {
    try { await licenciasApi.actualizarEstados(); load(); }
    catch (e) { setError('Error al actualizar estados: ' + e.message); }
  };

  const field = (key) => ({
    value: dialog.data[key] ?? '',
    onChange: (e) => setDialog(d => ({ ...d, data: { ...d.data, [key]: e.target.value } })),
  });

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
      <CircularProgress />
    </Box>
  );

  const { stats } = dashboard ?? { stats: {} };
  const allSelected = licenciasFiltradas.length > 0 && selectedIds.size === licenciasFiltradas.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between"
        alignItems={{ sm: 'center' }} mb={3} spacing={2}>
        <Box>
          <Typography variant="h5" fontWeight={800}>Control de Licencias</Typography>
          <Typography variant="body2" color="text.secondary">Plataformas y servicios activos</Typography>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          {isAdmin && (
            <Button size="small" variant="outlined" startIcon={<RefreshIcon />} onClick={handleActualizarEstados}>
              Actualizar estados
            </Button>
          )}
          <Button
            size="small" variant="outlined"
            startIcon={exporting ? <CircularProgress size={16} /> : <DownloadIcon />}
            onClick={handleExportar} disabled={exporting}
          >
            Exportar Excel
          </Button>
          {canWrite && (
            <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
              Nueva licencia
            </Button>
          )}
        </Stack>
      </Stack>

      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}

      {/* ── Alertas ──────────────────────────────────────────────────────────── */}
      {alertas.length > 0 && (
        <Paper elevation={0} sx={{ p: 2.5, mb: 3, borderRadius: 3, border: '2px solid', borderColor: 'warning.main', bgcolor: '#fffde7' }}>
          <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
            <NotificationsActiveIcon color="warning" />
            <Typography fontWeight={700} color="warning.dark">
              {alertas.length} licencia{alertas.length > 1 ? 's' : ''} próxima{alertas.length > 1 ? 's' : ''} a vencer
            </Typography>
          </Stack>
          <Stack spacing={1}>
            {alertas.map(a => {
              const urgente = a.diasRestantes <= 5;
              return (
                <Stack key={a.id} direction={{ xs: 'column', sm: 'row' }} spacing={1}
                  alignItems={{ sm: 'center' }} justifyContent="space-between"
                  sx={{
                    px: 2, py: 1, borderRadius: 2,
                    bgcolor: urgente ? '#ffebee' : '#fff8e1',
                    border: '1px solid', borderColor: urgente ? 'error.light' : 'warning.light',
                  }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    {urgente ? <ErrorOutlineIcon color="error" fontSize="small" /> : <WarningAmberIcon color="warning" fontSize="small" />}
                    <Box>
                      <Typography variant="body2" fontWeight={700}>{a.plataforma}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {a.area} · {a.frecuenciaPago} · {fmt$(a.costoMXN)}
                      </Typography>
                    </Box>
                  </Stack>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip
                      size="small" color={urgente ? 'error' : 'warning'} sx={{ fontWeight: 700 }}
                      label={
                        a.diasRestantes < 0  ? `Venció hace ${Math.abs(a.diasRestantes)} día${Math.abs(a.diasRestantes) !== 1 ? 's' : ''}` :
                        a.diasRestantes === 0 ? 'Vence HOY' :
                        `${a.diasRestantes} día${a.diasRestantes !== 1 ? 's' : ''} restantes`
                      }
                    />
                    {canWrite && (
                      <Tooltip title="Registrar pago">
                        <IconButton size="small" color="success" onClick={() => handleOpenPago(a)}>
                          <PaymentIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Stack>
                </Stack>
              );
            })}
          </Stack>
        </Paper>
      )}

      {/* ── Tabs ─────────────────────────────────────────────────────────────── */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={canSeeStats ? tab : 0} onChange={(_, v) => canSeeStats && setTab(v)} textColor="primary" indicatorColor="primary">
          <Tab icon={<AssignmentIcon fontSize="small" />} iconPosition="start" label="Licencias" sx={{ fontWeight: 700, minHeight: 48 }} />
          {canSeeStats && <Tab icon={<AttachMoneyIcon fontSize="small" />} iconPosition="start" label="Gastos" sx={{ fontWeight: 700, minHeight: 48 }} />}
          {canSeeStats && <Tab icon={<CalendarMonthIcon fontSize="small" />} iconPosition="start" label="Calendario" sx={{ fontWeight: 700, minHeight: 48 }} />}
        </Tabs>
      </Box>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* Tab 0: Licencias                                                      */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {tab === 0 && (
        <>
          {/* Tarjetas de resumen */}
          <Grid container spacing={2} mb={3}>
            {[
              { label: 'Total',       value: stats.total,      icon: <AssignmentIcon />,        color: '#1a237e', bg: '#e8eaf6' },
              { label: 'Activas',     value: stats.activas,    icon: <CheckCircleOutlineIcon />, color: '#2e7d32', bg: '#e8f5e9' },
              { label: 'Por vencer',  value: stats.porVencer,  icon: <WarningAmberIcon />,       color: '#e65100', bg: '#fff3e0' },
              { label: 'Vencidas',    value: stats.vencidas,   icon: <ErrorOutlineIcon />,       color: '#c62828', bg: '#ffebee' },
              { label: 'Canceladas',  value: stats.canceladas, icon: <CancelIcon />,             color: '#616161', bg: '#f5f5f5' },
              ...(canSeeStats ? [
                { label: 'Costo mensual', value: fmt$(stats.totalMensualMXN), icon: <AttachMoneyIcon />, color: '#1565c0', bg: '#e3f2fd', wide: true },
                { label: 'Costo anual',   value: fmt$(stats.totalAnualMXN),   icon: <AttachMoneyIcon />, color: '#4a148c', bg: '#f3e5f5', wide: true },
              ] : []),
            ].map(({ label, value, icon, color, bg, wide }) => (
              <Grid item xs={6} sm={wide ? 4 : 4} md={wide ? 3 : 2} key={label}>
                <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: bg, height: '100%' }}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box sx={{ color, fontSize: 28 }}>{icon}</Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}
                        textTransform="uppercase" letterSpacing={0.5} display="block">{label}
                      </Typography>
                      <Typography variant="h6" fontWeight={800} sx={{ color }}>{value ?? 0}</Typography>
                    </Box>
                  </Stack>
                </Paper>
              </Grid>
            ))}
          </Grid>

          {/* ── Filtros ────────────────────────────────────────────────────── */}
          <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
              <FilterListIcon fontSize="small" color="action" />
              <Typography variant="subtitle2" fontWeight={700}>Filtros</Typography>
              {filtrosActivos > 0 && (
                <Chip
                  label={`${filtrosActivos} activo${filtrosActivos > 1 ? 's' : ''}`}
                  size="small" color="primary" variant="outlined"
                />
              )}
              {filtrosActivos > 0 && (
                <Button size="small" startIcon={<ClearIcon fontSize="small" />} onClick={limpiarFiltros}
                  sx={{ ml: 'auto' }}>
                  Limpiar
                </Button>
              )}
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} flexWrap="wrap" gap={1.5}>
              <TextField
                size="small" placeholder="Buscar por plataforma, área, responsable…"
                value={busqueda} onChange={e => setBusqueda(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
                sx={{ minWidth: 280, flex: 1 }}
              />
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel id="filtro-area-label">Área</InputLabel>
                <Select labelId="filtro-area-label" value={filtroArea} label="Área" onChange={e => setFiltroArea(e.target.value)}>
                  <MenuItem value="">Todas</MenuItem>
                  {AREAS.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel id="filtro-estado-label">Estado</InputLabel>
                <Select labelId="filtro-estado-label" value={filtroEstado} label="Estado" onChange={e => setFiltroEstado(e.target.value)}>
                  <MenuItem value="">Todos</MenuItem>
                  {ESTADOS.map(e => <MenuItem key={e} value={e}>{e}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel id="filtro-freq-label">Frecuencia</InputLabel>
                <Select labelId="filtro-freq-label" value={filtroFrecuencia} label="Frecuencia" onChange={e => setFiltroFrecuencia(e.target.value)}>
                  <MenuItem value="">Todas</MenuItem>
                  {FRECUENCIAS.map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel id="filtro-dias-label">Próximo vencimiento</InputLabel>
                <Select labelId="filtro-dias-label" value={filtroDias} label="Próximo vencimiento" onChange={e => setFiltroDias(e.target.value)}>
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="vence7">Vence en 7 días</MenuItem>
                  <MenuItem value="vence30">Vence en 30 días</MenuItem>
                  <MenuItem value="vencidas">Ya vencidas</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Próximo pago desde"
                size="small" type="date"
                InputLabelProps={{ shrink: true }}
                value={filtroFechaDesde}
                onChange={e => setFiltroFechaDesde(e.target.value)}
                helperText={filtroFechaDesde ? formatFechaCorta(filtroFechaDesde) : ' '}
                sx={{ minWidth: 160 }}
              />
              <TextField
                label="Próximo pago hasta"
                size="small" type="date"
                InputLabelProps={{ shrink: true }}
                value={filtroFechaHasta}
                onChange={e => setFiltroFechaHasta(e.target.value)}
                helperText={filtroFechaHasta ? formatFechaCorta(filtroFechaHasta) : ' '}
                sx={{ minWidth: 160 }}
              />
            </Stack>

            {/* Indicador de resultados + acción masiva */}
            <Stack direction="row" spacing={1.5} alignItems="center" mt={1.5} flexWrap="wrap" gap={1}>
              <Typography variant="caption" color="text.secondary">
                Mostrando <strong>{licenciasFiltradas.length}</strong> de <strong>{licencias.length}</strong> licencias
              </Typography>
              {licenciasFiltradas.length > 0 && (
                <Typography variant="caption" color="text.secondary">
                  · Costo anual filtrado: <strong>{fmt$(licenciasFiltradas.reduce((s, l) => s + (l.costoAnualMXN ?? 0), 0))}</strong>
                </Typography>
              )}
              {canWrite && selectedIds.size > 0 && (
                <>
                  <Box sx={{ flex: 1 }} />
                  <Chip
                    label={`${selectedIds.size} seleccionada${selectedIds.size !== 1 ? 's' : ''}`}
                    size="small" color="primary" variant="filled"
                  />
                  <Button
                    size="small" variant="contained" color="success"
                    startIcon={<PaymentIcon fontSize="small" />}
                    onClick={handleOpenPagoMasivo}
                    sx={{ fontWeight: 700 }}
                  >
                    Renovar {selectedIds.size} licencia{selectedIds.size !== 1 ? 's' : ''}
                  </Button>
                  <Button size="small" onClick={() => setSelectedIds(new Set())}>
                    Cancelar selección
                  </Button>
                </>
              )}
            </Stack>
          </Paper>

          {/* ── Tabla ──────────────────────────────────────────────────────── */}
          <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#1a237e' }}>
                    {/* Columna de checkbox (solo cuando canWrite) */}
                    <TableCell padding="checkbox" sx={{ bgcolor: '#1a237e', width: 48 }}>
                      {canWrite && (
                        <Checkbox
                          size="small"
                          checked={allSelected}
                          indeterminate={someSelected}
                          onChange={toggleSelectAll}
                          sx={{ color: 'rgba(255,255,255,0.7)', '&.Mui-checked': { color: 'white' }, '&.MuiCheckbox-indeterminate': { color: 'white' } }}
                        />
                      )}
                    </TableCell>
                    {['#','Plataforma','Área','Frecuencia','Próximo Pago','Días','Costo','Anual','Último Pago','Estado',''].map(h => (
                      <TableCell key={h} sx={{ color: 'white', fontWeight: 700, fontSize: 12, py: 1.2 }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {licenciasFiltradas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                        <Stack alignItems="center" spacing={1}>
                          <FilterListIcon sx={{ fontSize: 40, color: 'text.disabled' }} />
                          <Typography variant="body2">No hay licencias que coincidan con los filtros.</Typography>
                          {filtrosActivos > 0 && (
                            <Button size="small" onClick={limpiarFiltros}>Limpiar filtros</Button>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ) : licenciasFiltradas.map((l, idx) => {
                    const chip      = ESTADO_CHIP[l.estado] ?? { color: 'default' };
                    const isChecked = selectedIds.has(l.id);
                    return (
                      <TableRow
                        key={l.id}
                        sx={{
                          bgcolor: isChecked ? '#e3f2fd' : idx % 2 === 0 ? 'white' : '#fafafa',
                          '&:hover': { bgcolor: isChecked ? '#bbdefb' : '#f0f4ff' },
                        }}
                      >
                        {/* Checkbox */}
                        <TableCell padding="checkbox">
                          {canWrite && (
                            <Checkbox
                              size="small"
                              checked={isChecked}
                              onChange={() => toggleSelect(l.id)}
                            />
                          )}
                        </TableCell>

                        <TableCell sx={{ fontSize: 12, fontWeight: 600 }}>{l.numero}</TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight={600} fontSize={13}>{l.plataforma}</Typography>
                            {l.responsable && (
                              <Typography variant="caption" color="text.secondary">{l.responsable}</Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip label={l.area} size="small" variant="outlined"
                            sx={{ fontSize: 11, borderColor: AREA_COLOR[l.area], color: AREA_COLOR[l.area] }} />
                        </TableCell>
                        <TableCell sx={{ fontSize: 12 }}>{l.frecuenciaPago}</TableCell>
                        <TableCell sx={{ fontSize: 12 }}>{l.proximoPago}</TableCell>
                        <TableCell sx={{
                          fontSize: 12, fontWeight: 600,
                          color: l.diasRestantes <  0  ? 'error.main'
                               : l.diasRestantes <= 5  ? 'error.main'
                               : l.diasRestantes <= 10 ? 'warning.dark' : 'inherit',
                        }}>
                          {l.diasRestantes < 0 ? `−${Math.abs(l.diasRestantes)}` : l.diasRestantes}
                        </TableCell>
                        <TableCell sx={{ fontSize: 12 }}>{fmt$(l.costoMXN)}</TableCell>
                        <TableCell sx={{ fontSize: 12 }}>{fmt$(l.costoAnualMXN)}</TableCell>

                        {/* Último pago */}
                        <TableCell sx={{ fontSize: 12 }}>
                          {l.ultimoPago
                            ? <Chip label={l.ultimoPago} size="small" color="success" variant="outlined"
                                sx={{ fontSize: 11, fontWeight: 600 }} />
                            : <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic' }}>—</Typography>
                          }
                        </TableCell>

                        <TableCell>
                          <Chip label={l.estado} color={chip.color} size="small" sx={{ fontWeight: 600, fontSize: 11 }} />
                        </TableCell>

                        {/* Acciones */}
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          {/* Botón historial (siempre visible) */}
                          <Tooltip title="Historial de pagos">
                            <IconButton size="small" color="default" onClick={() => handleOpenHistorial(l)}>
                              <HistoryIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {canWrite && (
                            <>
                              {/* Botón registrar pago (solo licencias no canceladas) */}
                              {l.estado !== 'Cancelada' && (
                                <Tooltip title="Registrar pago">
                                  <IconButton size="small" color="success" onClick={() => handleOpenPago(l)}>
                                    <PaymentIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                              <Tooltip title="Editar">
                                <IconButton size="small" onClick={() => openEdit(l)}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Eliminar">
                                <IconButton size="small" color="error" onClick={() => setConfirmDel(l)}>
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </>
      )}

      {/* Tab 1: Gastos */}
      {tab === 1 && <GastosSection licencias={licencias} />}

      {/* Tab 2: Calendario */}
      {tab === 2 && <CalendarioSection licencias={licencias} />}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* Dialog: Crear / Editar                                               */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <Dialog open={dialog.open} onClose={() => setDialog(d => ({ ...d, open: false }))} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {dialog.mode === 'create' ? 'Nueva Licencia' : 'Editar Licencia'}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} pt={0.5}>
            <Grid item xs={4}>
              <TextField label="# Número" size="small" fullWidth type="number" {...field('numero')} />
            </Grid>
            <Grid item xs={8}>
              <TextField label="Plataforma / Servicio" size="small" fullWidth {...field('plataforma')} />
            </Grid>
            <Grid item xs={6}>
              <FormControl size="small" fullWidth>
                <InputLabel>Área</InputLabel>
                <Select label="Área" {...field('area')}>
                  {AREAS.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl size="small" fullWidth>
                <InputLabel>Frecuencia</InputLabel>
                <Select label="Frecuencia" {...field('frecuenciaPago')}>
                  {FRECUENCIAS.map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField label="Fecha de inicio" size="small" fullWidth type="date"
                InputLabelProps={{ shrink: true }} {...field('fechaInicio')} />
            </Grid>
            <Grid item xs={6}>
              <TextField label="Próximo pago" size="small" fullWidth type="date"
                InputLabelProps={{ shrink: true }} {...field('proximoPago')} />
            </Grid>
            <Grid item xs={6}>
              <TextField label="Costo MXN" size="small" fullWidth type="number"
                InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                {...field('costoMXN')} />
            </Grid>
            <Grid item xs={6}>
              <FormControl size="small" fullWidth>
                <InputLabel>Estado</InputLabel>
                <Select label="Estado" {...field('estado')}>
                  {ESTADOS.map(e => <MenuItem key={e} value={e}>{e}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField label="Responsable" size="small" fullWidth {...field('responsable')} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Notas / Observaciones" size="small" fullWidth multiline rows={2} {...field('notas')} />
            </Grid>
          </Grid>
          {saveErr && <Alert severity="error" sx={{ mt: 2 }}>{saveErr}</Alert>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialog(d => ({ ...d, open: false }))}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? <CircularProgress size={18} /> : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* Dialog: Confirmar eliminar                                           */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <Dialog open={!!confirmDel} onClose={() => setConfirmDel(null)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700}>Eliminar licencia</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Eliminar <strong>{confirmDel?.plataforma}</strong>? Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmDel(null)}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>Eliminar</Button>
        </DialogActions>
      </Dialog>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* Dialog: Registrar Pago (individual)                                  */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <Dialog open={pagoDialog.open} onClose={() => setPagoDialog(d => ({ ...d, open: false }))} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <PaymentIcon color="success" />
          Registrar Pago
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} pt={0.5}>
            {/* Info de la licencia */}
            {pagoDialog.licencia && (
              <Paper elevation={0} sx={{ p: 1.5, bgcolor: '#f5f5f5', borderRadius: 2 }}>
                <Typography variant="subtitle2" fontWeight={700}>{pagoDialog.licencia.plataforma}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {pagoDialog.licencia.area} · {pagoDialog.licencia.frecuenciaPago} · Actual próximo pago: {formatFechaCorta(pagoDialog.licencia.proximoPago)}
                </Typography>
              </Paper>
            )}

            <TextField
              label="Fecha de pago"
              size="small" fullWidth type="date"
              InputLabelProps={{ shrink: true }}
              value={pagoDialog.fechaPago}
              onChange={e => setPagoDialog(d => ({ ...d, fechaPago: e.target.value }))}
              helperText={pagoDialog.fechaPago ? formatFechaCorta(pagoDialog.fechaPago) : ' '}
            />
            <TextField
              label="Monto pagado (MXN)"
              size="small" fullWidth type="number"
              InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
              value={pagoDialog.monto}
              onChange={e => setPagoDialog(d => ({ ...d, monto: e.target.value }))}
            />

            {/* Nuevo próximo pago (calculado) */}
            {pagoDialog.licencia && (
              <TextField
                label="Nuevo Próximo Pago (calculado automáticamente)"
                size="small" fullWidth
                value={formatFechaCorta(calcNuevoProximoPago(pagoDialog.licencia.proximoPago, pagoDialog.licencia.frecuenciaPago))}
                InputProps={{ readOnly: true }}
                sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#e8f5e9' } }}
                helperText={`Se avanzará 1 período de ${pagoDialog.licencia?.frecuenciaPago?.toLowerCase()}`}
              />
            )}

            <TextField
              label="Notas (opcional)"
              size="small" fullWidth multiline rows={2}
              value={pagoDialog.notas}
              onChange={e => setPagoDialog(d => ({ ...d, notas: e.target.value }))}
            />

            {pagoErr && <Alert severity="error">{pagoErr}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setPagoDialog(d => ({ ...d, open: false }))}>Cancelar</Button>
          <Button
            variant="contained" color="success"
            onClick={handleRegistrarPago}
            disabled={loadingPago || !pagoDialog.fechaPago || !pagoDialog.monto}
            startIcon={loadingPago ? <CircularProgress size={16} /> : <PaymentIcon />}
          >
            Confirmar Pago
          </Button>
        </DialogActions>
      </Dialog>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* Dialog: Renovación masiva                                            */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <Dialog open={pagoMasivoDialog.open} onClose={() => setPagoMasivoDialog(d => ({ ...d, open: false }))} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <PaymentIcon color="success" />
          Renovar {selectedIds.size} licencia{selectedIds.size !== 1 ? 's' : ''}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} pt={0.5}>
            <TextField
              label="Fecha de pago"
              size="small" fullWidth type="date"
              InputLabelProps={{ shrink: true }}
              value={pagoMasivoDialog.fechaPago}
              onChange={e => setPagoMasivoDialog(d => ({ ...d, fechaPago: e.target.value }))}
              helperText={pagoMasivoDialog.fechaPago ? formatFechaCorta(pagoMasivoDialog.fechaPago) : ' '}
            />

            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              Licencias seleccionadas:
            </Typography>
            <Box sx={{ maxHeight: 200, overflowY: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              {licencias.filter(l => selectedIds.has(l.id)).map((l, i) => (
                <Stack key={l.id} direction="row" justifyContent="space-between" alignItems="center"
                  sx={{
                    px: 2, py: 1,
                    bgcolor: i % 2 === 0 ? 'white' : '#fafafa',
                    borderBottom: '1px solid', borderColor: 'divider',
                    '&:last-child': { borderBottom: 'none' },
                  }}
                >
                  <Box>
                    <Typography variant="body2" fontWeight={600} fontSize={13}>{l.plataforma}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {l.area} · {l.frecuenciaPago} · Vence: {formatFechaCorta(calcNuevoProximoPago(l.proximoPago, l.frecuenciaPago))}
                    </Typography>
                  </Box>
                  <Typography variant="body2" fontWeight={700} color="success.main">
                    {fmt$(l.costoMXN)}
                  </Typography>
                </Stack>
              ))}
            </Box>

            <Typography variant="caption" color="text.secondary">
              Cada licencia avanzará automáticamente su próximo pago según su frecuencia y quedará en estado <strong>Activa</strong>.
            </Typography>

            {pagoErr && <Alert severity="error">{pagoErr}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setPagoMasivoDialog(d => ({ ...d, open: false }))}>Cancelar</Button>
          <Button
            variant="contained" color="success"
            onClick={handlePagoMasivo}
            disabled={loadingPago || !pagoMasivoDialog.fechaPago}
            startIcon={loadingPago ? <CircularProgress size={16} /> : <PaymentIcon />}
          >
            Confirmar Renovación
          </Button>
        </DialogActions>
      </Dialog>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* Dialog: Historial de pagos                                           */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <Dialog open={historialDialog.open} onClose={() => setHistorialDialog(d => ({ ...d, open: false }))} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <HistoryIcon />
          Historial de Pagos — {historialDialog.licencia?.plataforma}
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          {loadingHistorial ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : historial.length === 0 ? (
            <Box textAlign="center" py={5}>
              <HistoryIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                Sin pagos registrados para esta licencia.
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#1a237e' }}>
                    {['Fecha de Pago','Monto','Nuevo Próximo Pago','Registrado por','Notas'].map(h => (
                      <TableCell key={h} sx={{ color: 'white', fontWeight: 700, fontSize: 12 }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {historial.map((p, i) => (
                    <TableRow key={p.id} sx={{ bgcolor: i % 2 === 0 ? 'white' : '#fafafa' }}>
                      <TableCell sx={{ fontSize: 13, fontWeight: 600 }}>
                        <Chip label={formatFechaCorta(p.fechaPago)} size="small" color="success" variant="outlined"
                          sx={{ fontSize: 12, fontWeight: 700 }} />
                      </TableCell>
                      <TableCell sx={{ fontSize: 13, fontWeight: 700, color: 'success.main' }}>
                        {fmt$(p.monto)}
                      </TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{p.nuevoProximoPago ? formatFechaCorta(p.nuevoProximoPago) : '—'}</TableCell>
                      <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>{p.registradoPor ?? '—'}</TableCell>
                      <TableCell sx={{ fontSize: 12, color: 'text.secondary', fontStyle: p.notas ? 'normal' : 'italic' }}>
                        {p.notas ?? 'Sin notas'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mr: 'auto' }}>
            {historial.length > 0 ? `${historial.length} pago${historial.length !== 1 ? 's' : ''} registrado${historial.length !== 1 ? 's' : ''}` : ''}
          </Typography>
          <Button onClick={() => setHistorialDialog(d => ({ ...d, open: false }))}>Cerrar</Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}
