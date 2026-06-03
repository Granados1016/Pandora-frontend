import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import listPlugin from '@fullcalendar/list';
import esLocale from '@fullcalendar/core/locales/es';
import {
  Box, Paper, Typography, Stack, Button, Chip, TextField, MenuItem,
  Select, FormControl, InputLabel, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, CircularProgress, Dialog,
  DialogTitle, DialogContent, Tabs, Tab, IconButton, Tooltip,
} from '@mui/material';
import AddIcon          from '@mui/icons-material/Add';
import DownloadIcon     from '@mui/icons-material/Download';
import SearchIcon       from '@mui/icons-material/Search';
import BuildIcon        from '@mui/icons-material/Build';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import TableRowsIcon    from '@mui/icons-material/TableRows';
import DeleteIcon       from '@mui/icons-material/Delete';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon  from '@mui/icons-material/CheckCircle';
import AccessTimeIcon   from '@mui/icons-material/AccessTime';
import { mantenimientoApi } from '../../api/pandoraApi';
import { useAuth, MODULES } from '../../hooks/useAuth.jsx';
import MantenimientoForm from './MantenimientoForm';
import TablePager, { useTablePager } from '../../components/TablePager';

const TIPOS      = ['Preventivo', 'Correctivo', 'Predictivo', 'Limpieza'];
const ESTADOS    = ['Programado', 'En Proceso', 'Completado', 'Cancelado'];
const PRIORIDADES= ['Alta', 'Media', 'Baja'];

const ESTADO_COLOR = {
  Programado:  'info',
  'En Proceso':'warning',
  Completado:  'success',
  Cancelado:   'default',
};
const ESTADO_CAL_COLOR = {
  Programado:  '#1565c0',
  'En Proceso':'#e65100',
  Completado:  '#2e7d32',
  Cancelado:   '#757575',
};
const PRIORIDAD_COLOR = { Alta: 'error', Media: 'warning', Baja: 'success' };

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
}
function fmtMin(min) {
  if (!min) return '—';
  return min < 60 ? `${min}m` : `${Math.floor(min/60)}h ${min%60 > 0 ? `${min%60}m` : ''}`.trim();
}

export default function MantenimientoPage() {
  const { isAdmin, hasModuleWrite } = useAuth();
  const navigate  = useNavigate();
  const canWrite  = isAdmin || hasModuleWrite(MODULES.MANTENIMIENTO);

  const [rows,     setRows]     = useState([]);
  const [stats,    setStats]    = useState(null);
  const { page, setPage, pageSize, setPageSize, pagedRows } = useTablePager(rows);
  const [loading,  setLoading]  = useState(false);
  const [view,     setView]     = useState(0); // 0=tabla, 1=calendario
  const [creating, setCreating] = useState(false);
  const [saving,   setSaving]   = useState(false);

  const [search,    setSearch]   = useState('');
  const [fEstado,   setFEstado]  = useState('');
  const [fTipo,     setFTipo]    = useState('');
  const [fPrioridad,setFPrio]    = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rRows, rStats] = await Promise.all([
        mantenimientoApi.getAll({ search, estado: fEstado, tipo: fTipo, prioridad: fPrioridad }),
        mantenimientoApi.getStats(),
      ]);
      setRows(rRows.data);
      setStats(rStats.data.summary);
    } catch { setRows([]); }
    finally { setLoading(false); }
  }, [search, fEstado, fTipo, fPrioridad]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (form) => {
    setSaving(true);
    try {
      await mantenimientoApi.create(form);
      setCreating(false);
      load();
    } catch { } finally { setSaving(false); }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('¿Eliminar este mantenimiento?')) return;
    try { await mantenimientoApi.remove(id); load(); } catch {}
  };

  const exportCsv = async () => {
    try {
      const res = await mantenimientoApi.exportCsv();
      const url = URL.createObjectURL(res.data);
      const a   = document.createElement('a');
      a.href = url; a.download = 'mantenimiento.csv'; a.click();
      URL.revokeObjectURL(url);
    } catch {}
  };

  // Eventos para FullCalendar
  const calEvents = rows.map(r => ({
    id:              r.id,
    title:           `🔧 ${r.folio} — ${r.titulo}`,
    start:           r.fechaProgramada,
    end:             r.fechaRealizada ?? r.fechaProgramada,
    backgroundColor: ESTADO_CAL_COLOR[r.estado] ?? '#1565c0',
    borderColor:     ESTADO_CAL_COLOR[r.estado] ?? '#1565c0',
    extendedProps:   r,
  }));

  const KPI = ({ label, val, color }) => (
    <Paper variant="outlined" sx={{ px: 1.5, py: 0.75, borderRadius: 2, minWidth: 90, textAlign: 'center' }}>
      <Typography variant="h6" fontWeight={800} color={color} lineHeight={1}>{val ?? 0}</Typography>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
    </Paper>
  );

  return (
    <Box sx={{ p: { xs: 1, md: 2 } }}>
      {/* Header */}
      <Paper elevation={0} sx={{ p: 1.5, mb: 1.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <Stack direction={{ xs:'column', sm:'row' }} spacing={1.5} alignItems={{ sm:'center' }} justifyContent="space-between" flexWrap="wrap">
          <Stack direction="row" spacing={1} alignItems="center">
            <BuildIcon color="primary" />
            <Typography variant="h6" fontWeight={700}>Mantenimiento de Equipos</Typography>
            {loading && <CircularProgress size={18} />}
          </Stack>
          <Stack direction="row" spacing={1}>
            <Tooltip title="Exportar CSV">
              <Button size="small" variant="outlined" startIcon={<DownloadIcon />} onClick={exportCsv} sx={{ borderRadius: 2 }}>CSV</Button>
            </Tooltip>
            {canWrite && (
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreating(true)} sx={{ borderRadius: 2 }}>
                Nuevo
              </Button>
            )}
          </Stack>
        </Stack>

        {/* KPIs */}
        {stats && (
          <Stack direction="row" spacing={1} flexWrap="wrap" mt={1.5}>
            <KPI label="Total"       val={stats.total}        color="text.primary" />
            <KPI label="Programados" val={stats.programados}  color="info.main" />
            <KPI label="En Proceso"  val={stats.enProceso}    color="warning.main" />
            <KPI label="Completados" val={stats.completados}  color="success.main" />
            <KPI label="Vencidos"    val={stats.vencidos}     color="error.main" />
            <KPI label="Próx. 7 días"val={stats.proximos7Dias}color="secondary.main" />
            <KPI label="Este mes"    val={stats.esteMes}      color="text.secondary" />
            <KPI label="Prio. Alta"  val={stats.prioAlta}     color="error.main" />
          </Stack>
        )}

        {/* Filtros */}
        <Stack direction={{ xs:'column', sm:'row' }} spacing={1} mt={1.5} flexWrap="wrap">
          <TextField size="small" placeholder="Buscar folio, equipo, técnico…" value={search}
            onChange={e => setSearch(e.target.value)}
            InputProps={{ startAdornment: <SearchIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} /> }}
            sx={{ minWidth: 220 }} />
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>Estado</InputLabel>
            <Select value={fEstado} label="Estado" onChange={e => setFEstado(e.target.value)}>
              <MenuItem value="">Todos</MenuItem>
              {ESTADOS.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>Tipo</InputLabel>
            <Select value={fTipo} label="Tipo" onChange={e => setFTipo(e.target.value)}>
              <MenuItem value="">Todos</MenuItem>
              {TIPOS.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Prioridad</InputLabel>
            <Select value={fPrioridad} label="Prioridad" onChange={e => setFPrio(e.target.value)}>
              <MenuItem value="">Todas</MenuItem>
              {PRIORIDADES.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
            </Select>
          </FormControl>
          {(search || fEstado || fTipo || fPrioridad) && (
            <Button size="small" onClick={() => { setSearch(''); setFEstado(''); setFTipo(''); setFPrio(''); }}>
              Limpiar
            </Button>
          )}
        </Stack>
      </Paper>

      {/* Vista tabs */}
      <Tabs value={view} onChange={(_, v) => setView(v)} sx={{ mb: 1.5 }}>
        <Tab icon={<TableRowsIcon fontSize="small" />} iconPosition="start" label="Lista" />
        <Tab icon={<CalendarMonthIcon fontSize="small" />} iconPosition="start" label="Calendario" />
      </Tabs>

      {/* ── Vista Lista ── */}
      {view === 0 && (
        <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  {['Folio','Título','Tipo','Prioridad','Estado','Equipo','Técnico','Fecha Prog.','Duración',''].map(h => (
                    <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                      {loading ? 'Cargando…' : 'No hay mantenimientos que coincidan'}
                    </TableCell>
                  </TableRow>
                )}
                {pagedRows.map(row => {
                  const vencido = new Date(row.fechaProgramada) < new Date() && !['Completado','Cancelado'].includes(row.estado);
                  return (
                    <TableRow key={row.id} hover sx={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/mantenimiento/${row.id}`)}>
                      <TableCell sx={{ fontWeight: 700, color: vencido ? 'error.main' : 'text.secondary', whiteSpace: 'nowrap' }}>
                        {row.folio}
                        {vencido && <WarningAmberIcon fontSize="inherit" sx={{ ml: 0.5, verticalAlign: 'middle' }} />}
                      </TableCell>
                      <TableCell sx={{ maxWidth: 200 }}>
                        <Typography variant="body2" fontWeight={600} noWrap>{row.titulo}</Typography>
                      </TableCell>
                      <TableCell><Chip size="small" label={row.tipoMantenimiento} variant="outlined" /></TableCell>
                      <TableCell><Chip size="small" label={row.prioridad} color={PRIORIDAD_COLOR[row.prioridad] || 'default'} /></TableCell>
                      <TableCell><Chip size="small" label={row.estado} color={ESTADO_COLOR[row.estado] || 'default'} /></TableCell>
                      <TableCell sx={{ maxWidth: 140 }}>
                        <Typography variant="caption" noWrap display="block">{row.nombreEquipo || '—'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" noWrap display="block">{row.tecnicoAsignado || '—'}</Typography>
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        <Typography variant="caption">{fmtDate(row.fechaProgramada)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">{fmtMin(row.duracionMinutos)}</Typography>
                      </TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
                        {canWrite && (
                          <Tooltip title="Eliminar">
                            <IconButton size="small" color="error" onClick={e => handleDelete(row.id, e)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePager total={rows.length} page={page} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} />
        </Paper>
      )}

      {/* ── Vista Calendario ── */}
      {view === 1 && (
        <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', p: 2 }}>
          <FullCalendar
            plugins={[dayGridPlugin, listPlugin]}
            initialView="dayGridMonth"
            locale={esLocale}
            headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,listMonth' }}
            events={calEvents}
            eventClick={({ event }) => navigate(`/mantenimiento/${event.id}`)}
            height="auto"
            eventDisplay="block"
          />
        </Paper>
      )}

      {/* Modal crear */}
      {creating && (
        <Dialog open fullWidth maxWidth="md" onClose={() => setCreating(false)}>
          <DialogTitle>Nuevo mantenimiento</DialogTitle>
          <DialogContent>
            <MantenimientoForm onSave={handleCreate} onClose={() => setCreating(false)} saving={saving} />
          </DialogContent>
        </Dialog>
      )}
    </Box>
  );
}
