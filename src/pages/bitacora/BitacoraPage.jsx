import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Paper, Typography, Stack, Button, Chip, IconButton, Tooltip,
  TextField, MenuItem, Select, FormControl, InputLabel, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Dialog, DialogTitle,
  DialogContent, CircularProgress,
} from '@mui/material';
import AddIcon            from '@mui/icons-material/Add';
import DeleteIcon         from '@mui/icons-material/Delete';
import DownloadIcon       from '@mui/icons-material/Download';
import SearchIcon         from '@mui/icons-material/Search';
import BookIcon           from '@mui/icons-material/Book';
import CheckCircleIcon    from '@mui/icons-material/CheckCircle';
import AccessTimeIcon     from '@mui/icons-material/AccessTime';
import WarningAmberIcon   from '@mui/icons-material/WarningAmber';
import { bitacoraApi }    from '../../api/pandoraApi';
import TablePager, { useTablePager } from '../../components/TablePager';
import { useAuth, MODULES } from '../../hooks/useAuth.jsx';

// ── Catálogos ─────────────────────────────────────────────────────────────────
const CATEGORIAS = ['Red', 'Hardware', 'Software', 'Servidor', 'Acceso', 'Seguridad', 'Otro'];
const PRIORIDADES = ['Alta', 'Media', 'Baja'];
const ESTADOS = ['Abierta', 'En Proceso', 'Resuelta', 'Cerrada'];
const IMPACTOS = ['Crítico', 'Alto', 'Medio', 'Bajo'];
const TIPOS_SEG = ['Seguimiento', 'Escalación', 'Diagnóstico', 'Cierre'];

const PRIORIDAD_COLOR  = { Alta: 'error', Media: 'warning', Baja: 'success' };
const ESTADO_COLOR     = { Abierta: 'info', 'En Proceso': 'warning', Resuelta: 'success', Cerrada: 'default' };

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
}
function fmtMin(min) {
  if (min == null) return '—';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ── Formulario de entrada ─────────────────────────────────────────────────────
const EMPTY_FORM = {
  titulo: '', descripcion: '', categoria: 'Red', prioridad: 'Media',
  estado: 'Abierta', impacto: '', sistemaAfectado: '', usuarioAfectado: '',
  reportadoPor: '', asignadoA: '', fechaIncidencia: '', fechaResolucion: '', resolucion: '',
};

function EntryForm({ initial, onSave, onClose, saving }) {
  const [form, setForm] = useState(() => ({
    ...EMPTY_FORM,
    ...initial,
    fechaIncidencia: initial?.fechaIncidencia
      ? new Date(initial.fechaIncidencia).toISOString().slice(0, 16) : '',
    fechaResolucion: initial?.fechaResolucion
      ? new Date(initial.fechaResolucion).toISOString().slice(0, 16) : '',
  }));
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Box component="form" onSubmit={e => { e.preventDefault(); onSave(form); }}>
      <Stack spacing={2} sx={{ pt: 1 }}>
        <TextField label="Título *" value={form.titulo} onChange={e => set('titulo', e.target.value)} fullWidth required />
        <TextField label="Descripción *" value={form.descripcion} onChange={e => set('descripcion', e.target.value)}
          fullWidth multiline minRows={3} required />

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <FormControl fullWidth>
            <InputLabel>Categoría</InputLabel>
            <Select value={form.categoria} label="Categoría" onChange={e => set('categoria', e.target.value)}>
              {CATEGORIAS.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>Prioridad</InputLabel>
            <Select value={form.prioridad} label="Prioridad" onChange={e => set('prioridad', e.target.value)}>
              {PRIORIDADES.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>Estado</InputLabel>
            <Select value={form.estado} label="Estado" onChange={e => set('estado', e.target.value)}>
              {ESTADOS.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </Select>
          </FormControl>
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <FormControl fullWidth>
            <InputLabel>Impacto</InputLabel>
            <Select value={form.impacto} label="Impacto" onChange={e => set('impacto', e.target.value)}>
              <MenuItem value="">Sin especificar</MenuItem>
              {IMPACTOS.map(i => <MenuItem key={i} value={i}>{i}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField label="Sistema afectado" value={form.sistemaAfectado}
            onChange={e => set('sistemaAfectado', e.target.value)} fullWidth />
          <TextField label="Usuario / Área afectada" value={form.usuarioAfectado}
            onChange={e => set('usuarioAfectado', e.target.value)} fullWidth />
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField label="Fecha del incidente *" type="datetime-local" value={form.fechaIncidencia}
            onChange={e => set('fechaIncidencia', e.target.value)} fullWidth required
            InputLabelProps={{ shrink: true }} />
          <TextField label="Reportado por" value={form.reportadoPor}
            onChange={e => set('reportadoPor', e.target.value)} fullWidth />
          <TextField label="Asignado a" value={form.asignadoA}
            onChange={e => set('asignadoA', e.target.value)} fullWidth />
        </Stack>

        {(form.estado === 'Resuelta' || form.estado === 'Cerrada') && (
          <>
            <TextField label="Fecha de resolución" type="datetime-local" value={form.fechaResolucion}
              onChange={e => set('fechaResolucion', e.target.value)} fullWidth
              InputLabelProps={{ shrink: true }} />
            <TextField label="Descripción de la resolución" value={form.resolucion}
              onChange={e => set('resolucion', e.target.value)} fullWidth multiline minRows={2} />
          </>
        )}

        <Stack direction="row" justifyContent="flex-end" spacing={1} pt={1}>
          <Button onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={saving}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}>
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function BitacoraPage() {
  const { isAdmin, hasModuleWrite } = useAuth();
  const navigate  = useNavigate();
  const canWrite  = isAdmin || hasModuleWrite(MODULES.BITACORA);
  const { page, setPage, pageSize, setPageSize, pagedRows, totalPages } = useTablePager(rows);

  const [rows, setRows]         = useState([]);
  const [loading, setLoading]   = useState(false);
  const [search, setSearch]     = useState('');
  const [fCategoria, setFCat]   = useState('');
  const [fEstado, setFEst]      = useState('');
  const [fPrioridad, setFPrio]  = useState('');
  const [creating, setCreating] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [stats, setStats]       = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rRows, rStats] = await Promise.all([
        bitacoraApi.getAll({ search, categoria: fCategoria, estado: fEstado, prioridad: fPrioridad }),
        bitacoraApi.getStats(),
      ]);
      setRows(rRows.data);
      setStats(rStats.data.summary);
    } catch { setRows([]); }
    finally { setLoading(false); }
  }, [search, fCategoria, fEstado, fPrioridad]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (form) => {
    setSaving(true);
    try {
      await bitacoraApi.create({
        titulo: form.titulo, descripcion: form.descripcion,
        categoria: form.categoria, prioridad: form.prioridad, estado: form.estado,
        impacto: form.impacto || null, sistemaAfectado: form.sistemaAfectado || null,
        usuarioAfectado: form.usuarioAfectado || null,
        reportadoPor: form.reportadoPor || null, asignadoA: form.asignadoA || null,
        fechaIncidencia: form.fechaIncidencia ? new Date(form.fechaIncidencia).toISOString() : new Date().toISOString(),
        fechaResolucion: form.fechaResolucion ? new Date(form.fechaResolucion).toISOString() : null,
        resolucion: form.resolucion || null,
      });
      setCreating(false); load();
    } catch { } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar esta entrada?')) return;
    try { await bitacoraApi.remove(id); load(); } catch { }
  };

  const exportCsv = () => {
    const token = localStorage.getItem('pandora_token');
    const url   = `${import.meta.env.VITE_BACKEND_URL ?? ''}/api/bitacora/export-excel`;
    const a     = document.createElement('a');
    a.href = `${url}?access_token=${token}`;
    a.download = 'bitacora.csv';
    a.click();
  };

  return (
    <Box sx={{ p: { xs: 1, md: 2 } }}>
      {/* Header */}
      <Paper elevation={0} sx={{ p: 1.5, mb: 1.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }} justifyContent="space-between" flexWrap="wrap">
          <Stack direction="row" spacing={1} alignItems="center">
            <BookIcon color="primary" />
            <Typography variant="h6" fontWeight={700}>Bitácora de Incidencias</Typography>
            {loading && <CircularProgress size={18} />}
          </Stack>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Tooltip title="Exportar CSV">
              <Button size="small" variant="outlined" startIcon={<DownloadIcon />} onClick={exportCsv} sx={{ borderRadius: 2 }}>
                CSV
              </Button>
            </Tooltip>
            {canWrite && (
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreating(true)} sx={{ borderRadius: 2 }}>
                Nueva entrada
              </Button>
            )}
          </Stack>
        </Stack>

        {/* KPIs */}
        {stats && (
          <Stack direction="row" spacing={1} flexWrap="wrap" mt={1.5}>
            {[
              { label: 'Total',      val: stats.total,      color: 'text.primary' },
              { label: 'Abiertas',   val: stats.abiertas,   color: 'info.main' },
              { label: 'En Proceso', val: stats.enProceso,  color: 'warning.main' },
              { label: 'Resueltas',  val: stats.resueltas,  color: 'success.main' },
              { label: 'Prio. Alta', val: stats.prioAlta,   color: 'error.main' },
              { label: 'Este mes',   val: stats.esteMes,    color: 'text.secondary' },
              { label: 'T. Prom.',   val: fmtMin(stats.tiempoPromedioMin), color: 'text.secondary' },
            ].map(k => (
              <Paper key={k.label} variant="outlined" sx={{ px: 1.5, py: 0.75, borderRadius: 2, minWidth: 80, textAlign: 'center' }}>
                <Typography variant="h6" fontWeight={800} color={k.color} lineHeight={1}>{k.val}</Typography>
                <Typography variant="caption" color="text.secondary">{k.label}</Typography>
              </Paper>
            ))}
          </Stack>
        )}

        {/* Filtros */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} mt={1.5} flexWrap="wrap">
          <TextField size="small" placeholder="Buscar folio, título, sistema…" value={search}
            onChange={e => setSearch(e.target.value)}
            InputProps={{ startAdornment: <SearchIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} /> }}
            sx={{ minWidth: 220 }} />
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>Categoría</InputLabel>
            <Select value={fCategoria} label="Categoría" onChange={e => setFCat(e.target.value)}>
              <MenuItem value="">Todas</MenuItem>
              {CATEGORIAS.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>Estado</InputLabel>
            <Select value={fEstado} label="Estado" onChange={e => setFEst(e.target.value)}>
              <MenuItem value="">Todos</MenuItem>
              {ESTADOS.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Prioridad</InputLabel>
            <Select value={fPrioridad} label="Prioridad" onChange={e => setFPrio(e.target.value)}>
              <MenuItem value="">Todas</MenuItem>
              {PRIORIDADES.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
            </Select>
          </FormControl>
          {(fCategoria || fEstado || fPrioridad || search) && (
            <Button size="small" onClick={() => { setSearch(''); setFCat(''); setFEst(''); setFPrio(''); }}>
              Limpiar
            </Button>
          )}
        </Stack>
      </Paper>

      {/* Tabla */}
      <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                {['Folio', 'Título', 'Categoría', 'Prioridad', 'Estado', 'Sistema', 'Fecha', 'T. Resolución', ''].map(h => (
                  <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    {loading ? 'Cargando…' : 'No hay entradas que coincidan con los filtros'}
                  </TableCell>
                </TableRow>
              )}
              {pagedRows.map(row => (
                <TableRow key={row.id} hover sx={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/bitacora/${row.id}`)}>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary', whiteSpace: 'nowrap' }}>
                    {row.folio}
                  </TableCell>
                  <TableCell sx={{ maxWidth: 240 }}>
                    <Typography variant="body2" fontWeight={600} noWrap>{row.titulo}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={row.categoria} variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={row.prioridad} color={PRIORIDAD_COLOR[row.prioridad] || 'default'} />
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={row.estado} color={ESTADO_COLOR[row.estado] || 'default'} />
                  </TableCell>
                  <TableCell sx={{ maxWidth: 150 }}>
                    <Typography variant="caption" noWrap display="block">{row.sistemaAfectado || '—'}</Typography>
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    <Typography variant="caption">{fmtDate(row.fechaIncidencia)}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">{fmtMin(row.tiempoResolucion)}</Typography>
                  </TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    {canWrite && (
                      <Tooltip title="Eliminar">
                        <IconButton size="small" color="error" onClick={() => handleDelete(row.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePager total={rows.length} page={page} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} />
      </Paper>

      {/* Modal crear */}
      {creating && (
        <Dialog open fullWidth maxWidth="md" onClose={() => setCreating(false)}>
          <DialogTitle>Nueva entrada — Bitácora</DialogTitle>
          <DialogContent>
            <EntryForm initial={null} onSave={handleCreate} onClose={() => setCreating(false)} saving={saving} />
          </DialogContent>
        </Dialog>
      )}

    </Box>
  );
}
