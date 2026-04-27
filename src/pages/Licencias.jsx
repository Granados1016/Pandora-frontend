import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Paper, Grid, Stack, Chip, Button, Alert,
  CircularProgress, Divider, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, Tooltip, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Select, MenuItem,
  FormControl, InputLabel, InputAdornment,
} from '@mui/material';
import AssignmentIcon         from '@mui/icons-material/Assignment';
import WarningAmberIcon       from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon       from '@mui/icons-material/ErrorOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelIcon             from '@mui/icons-material/Cancel';
import DownloadIcon           from '@mui/icons-material/Download';
import AddIcon                from '@mui/icons-material/Add';
import EditIcon               from '@mui/icons-material/Edit';
import DeleteIcon             from '@mui/icons-material/Delete';
import RefreshIcon            from '@mui/icons-material/Refresh';
import SearchIcon             from '@mui/icons-material/Search';
import AttachMoneyIcon        from '@mui/icons-material/AttachMoney';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import { licenciasApi } from '../api/pandoraApi';
import { useAuth }      from '../hooks/useAuth.jsx';

// ── helpers ───────────────────────────────────────────────────────────────────
const fmt$ = (n) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n);

const ESTADO_CHIP = {
  'Activa':     { color: 'success', label: 'Activa' },
  'Por vencer': { color: 'warning', label: 'Por vencer' },
  'Vencida':    { color: 'error',   label: 'Vencida' },
  'Cancelada':  { color: 'default', label: 'Cancelada' },
};

const AREAS      = ['TI', 'Marketing', 'Innovación', 'Socios'];
const FRECUENCIAS = ['Mensual', 'Trimestral', 'Semestral', 'Anual'];
const ESTADOS    = ['Activa', 'Por vencer', 'Vencida', 'Cancelada'];

const EMPTY_FORM = {
  numero: '', plataforma: '', area: 'TI', responsable: '',
  frecuenciaPago: 'Mensual', fechaInicio: '', proximoPago: '',
  costoMXN: '', estado: 'Activa', notas: '',
};

// ── componente principal ──────────────────────────────────────────────────────
export default function Licencias() {
  const { isAdmin } = useAuth();

  const [dashboard, setDashboard] = useState(null);
  const [alertas,   setAlertas]   = useState([]);
  const [licencias, setLicencias] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

  // filtros
  const [filtroArea,   setFiltroArea]   = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [busqueda,     setBusqueda]     = useState('');

  // dialog
  const [dialog,   setDialog]   = useState({ open: false, mode: 'create', data: EMPTY_FORM });
  const [saving,   setSaving]   = useState(false);
  const [saveErr,  setSaveErr]  = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  // exportar
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dash, alert, lista] = await Promise.all([
        licenciasApi.dashboard(),
        licenciasApi.alertas(),
        licenciasApi.getAll({ area: filtroArea || undefined, estado: filtroEstado || undefined }),
      ]);
      setDashboard(dash.data);
      setAlertas(alert.data);
      setLicencias(lista.data);
    } catch (e) {
      setError('Error al cargar licencias: ' + (e.response?.data || e.message));
    } finally {
      setLoading(false);
    }
  }, [filtroArea, filtroEstado]);

  useEffect(() => { load(); }, [load]);

  const licenciasFiltradas = licencias.filter(l =>
    !busqueda || l.plataforma.toLowerCase().includes(busqueda.toLowerCase())
  );

  // ── Acciones ────────────────────────────────────────────────────────────────
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
    try {
      await licenciasApi.delete(confirmDel.id);
      setConfirmDel(null);
      load();
    } catch (e) {
      setError('Error al eliminar: ' + (e.response?.data || e.message));
    }
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

  // ── Render ──────────────────────────────────────────────────────────────────
  if (loading) return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
      <CircularProgress />
    </Box>
  );

  const { stats, areas } = dashboard ?? { stats: {}, areas: [] };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1300, mx: 'auto' }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} mb={3} spacing={2}>
        <Box>
          <Typography variant="h5" fontWeight={800}>Control de Licencias</Typography>
          <Typography variant="body2" color="text.secondary">iMET — Plataformas y servicios activos</Typography>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          {isAdmin && (
            <Button size="small" variant="outlined" startIcon={<RefreshIcon />} onClick={handleActualizarEstados}>
              Actualizar estados
            </Button>
          )}
          <Button
            size="small" variant="outlined" startIcon={exporting ? <CircularProgress size={16} /> : <DownloadIcon />}
            onClick={handleExportar} disabled={exporting}
          >
            Exportar Excel
          </Button>
          {isAdmin && (
            <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
              Nueva licencia
            </Button>
          )}
        </Stack>
      </Stack>

      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}

      {/* ── Tarjetas de resumen ──────────────────────────────────────────────── */}
      <Grid container spacing={2} mb={3}>
        {[
          { label: 'Total licencias',  value: stats.total,     icon: <AssignmentIcon />,         color: '#1a237e', bg: '#e8eaf6' },
          { label: 'Activas',          value: stats.activas,   icon: <CheckCircleOutlineIcon />,  color: '#2e7d32', bg: '#e8f5e9' },
          { label: 'Por vencer',       value: stats.porVencer, icon: <WarningAmberIcon />,        color: '#e65100', bg: '#fff3e0' },
          { label: 'Vencidas',         value: stats.vencidas,  icon: <ErrorOutlineIcon />,        color: '#c62828', bg: '#ffebee' },
          { label: 'Canceladas',       value: stats.canceladas,icon: <CancelIcon />,              color: '#616161', bg: '#f5f5f5' },
          { label: 'Costo mensual',    value: fmt$(stats.totalMensualMXN ?? 0), icon: <AttachMoneyIcon />, color: '#1565c0', bg: '#e3f2fd', wide: true },
          { label: 'Costo anual total',value: fmt$(stats.totalAnualMXN   ?? 0), icon: <AttachMoneyIcon />, color: '#4a148c', bg: '#f3e5f5', wide: true },
        ].map(({ label, value, icon, color, bg, wide }) => (
          <Grid item xs={6} sm={wide ? 4 : 4} md={wide ? 3 : 2} key={label}>
            <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: bg, height: '100%' }}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box sx={{ color, fontSize: 28 }}>{icon}</Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing={0.5} display="block">
                    {label}
                  </Typography>
                  <Typography variant="h6" fontWeight={800} sx={{ color }}>
                    {value ?? 0}
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Grid>
        ))}
      </Grid>

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
                    {urgente
                      ? <ErrorOutlineIcon color="error" fontSize="small" />
                      : <WarningAmberIcon color="warning" fontSize="small" />
                    }
                    <Box>
                      <Typography variant="body2" fontWeight={700}>{a.plataforma}</Typography>
                      <Typography variant="caption" color="text.secondary">{a.area} · {a.frecuenciaPago} · {fmt$(a.costoMXN)}</Typography>
                    </Box>
                  </Stack>
                  <Chip
                    size="small"
                    label={a.diasRestantes < 0
                      ? `Venció hace ${Math.abs(a.diasRestantes)} día${Math.abs(a.diasRestantes) !== 1 ? 's' : ''}`
                      : a.diasRestantes === 0
                        ? 'Vence HOY'
                        : `${a.diasRestantes} día${a.diasRestantes !== 1 ? 's' : ''} restantes`
                    }
                    color={urgente ? 'error' : 'warning'}
                    sx={{ fontWeight: 700 }}
                  />
                </Stack>
              );
            })}
          </Stack>
        </Paper>
      )}

      {/* ── Resumen por área ─────────────────────────────────────────────────── */}
      {areas.length > 0 && (
        <Paper elevation={0} sx={{ p: 2.5, mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle2" fontWeight={700} mb={1.5}>Costo anual por área</Typography>
          <Stack direction="row" spacing={2} flexWrap="wrap" gap={1}>
            {areas.map(a => (
              <Box key={a.area} sx={{ px: 2, py: 1, borderRadius: 2, bgcolor: '#f5f5f5', minWidth: 140 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">{a.area}</Typography>
                <Typography variant="body2" fontWeight={700}>{fmt$(a.costoAnual)}</Typography>
                <Typography variant="caption" color="text.secondary">{a.total} licencias</Typography>
              </Box>
            ))}
          </Stack>
        </Paper>
      )}

      {/* ── Filtros ───────────────────────────────────────────────────────────── */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={2}>
        <TextField
          size="small" placeholder="Buscar plataforma..." value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          sx={{ minWidth: 220 }}
        />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Área</InputLabel>
          <Select value={filtroArea} label="Área" onChange={e => setFiltroArea(e.target.value)}>
            <MenuItem value="">Todas</MenuItem>
            {AREAS.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Estado</InputLabel>
          <Select value={filtroEstado} label="Estado" onChange={e => setFiltroEstado(e.target.value)}>
            <MenuItem value="">Todos</MenuItem>
            {ESTADOS.map(e => <MenuItem key={e} value={e}>{e}</MenuItem>)}
          </Select>
        </FormControl>
      </Stack>

      {/* ── Tabla de licencias ───────────────────────────────────────────────── */}
      <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#1a237e' }}>
                {['#','Plataforma','Área','Frecuencia','Próximo Pago','Días','Costo','Anual','Estado',''].map(h => (
                  <TableCell key={h} sx={{ color: 'white', fontWeight: 700, fontSize: 12, py: 1.2 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {licenciasFiltradas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No hay licencias registradas.
                  </TableCell>
                </TableRow>
              ) : licenciasFiltradas.map((l, idx) => {
                const rowBg = idx % 2 === 0 ? 'white' : '#fafafa';
                const chip  = ESTADO_CHIP[l.estado] ?? { color: 'default', label: l.estado };
                return (
                  <TableRow key={l.id} sx={{ bgcolor: rowBg, '&:hover': { bgcolor: '#f0f4ff' } }}>
                    <TableCell sx={{ fontSize: 12, fontWeight: 600 }}>{l.numero}</TableCell>
                    <TableCell sx={{ fontSize: 13, fontWeight: 600 }}>{l.plataforma}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>
                      <Chip label={l.area} size="small" variant="outlined" sx={{ fontSize: 11 }} />
                    </TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{l.frecuenciaPago}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{l.proximoPago}</TableCell>
                    <TableCell sx={{ fontSize: 12, fontWeight: 600,
                      color: l.diasRestantes <= 0 ? 'error.main'
                           : l.diasRestantes <= 5 ? 'error.main'
                           : l.diasRestantes <= 10 ? 'warning.dark' : 'inherit'
                    }}>
                      {l.diasRestantes < 0
                        ? `−${Math.abs(l.diasRestantes)}`
                        : l.diasRestantes}
                    </TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{fmt$(l.costoMXN)}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{fmt$(l.costoAnualMXN)}</TableCell>
                    <TableCell>
                      <Chip label={chip.label} color={chip.color} size="small" sx={{ fontWeight: 600, fontSize: 11 }} />
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {isAdmin && (
                        <>
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

      {/* ── Dialog: Crear / Editar ───────────────────────────────────────────── */}
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
              <TextField label="Fecha de inicio" size="small" fullWidth type="date" InputLabelProps={{ shrink: true }} {...field('fechaInicio')} />
            </Grid>
            <Grid item xs={6}>
              <TextField label="Próximo pago" size="small" fullWidth type="date" InputLabelProps={{ shrink: true }} {...field('proximoPago')} />
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

      {/* ── Dialog: Confirmar eliminar ───────────────────────────────────────── */}
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

    </Box>
  );
}
