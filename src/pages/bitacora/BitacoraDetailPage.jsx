import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Paper, Typography, Stack, Button, Chip, TextField, MenuItem,
  Select, FormControl, InputLabel, CircularProgress, Alert, Divider,
  Avatar, IconButton, Tooltip, Dialog, DialogTitle, DialogContent,
  DialogActions,
} from '@mui/material';
import ArrowBackIcon      from '@mui/icons-material/ArrowBack';
import SendIcon           from '@mui/icons-material/Send';
import EditIcon           from '@mui/icons-material/Edit';
import DeleteIcon         from '@mui/icons-material/Delete';
import BookIcon           from '@mui/icons-material/Book';
import AccessTimeIcon     from '@mui/icons-material/AccessTime';
import CheckCircleIcon    from '@mui/icons-material/CheckCircle';
import WarningAmberIcon   from '@mui/icons-material/WarningAmber';
import { bitacoraApi }    from '../../api/pandoraApi';
import { useAuth, MODULES } from '../../hooks/useAuth.jsx';

// ── Catálogos ─────────────────────────────────────────────────────────────────
const CATEGORIAS  = ['Red', 'Hardware', 'Software', 'Servidor', 'Acceso', 'Seguridad', 'Otro'];
const PRIORIDADES = ['Alta', 'Media', 'Baja'];
const ESTADOS     = ['Abierta', 'En Proceso', 'Resuelta', 'Cerrada'];
const IMPACTOS    = ['Crítico', 'Alto', 'Medio', 'Bajo'];
const TIPOS_SEG   = ['Seguimiento', 'Escalación', 'Diagnóstico', 'Cierre'];

const PRIORIDAD_COLOR = { Alta: 'error', Media: 'warning', Baja: 'success' };
const ESTADO_COLOR    = { Abierta: 'info', 'En Proceso': 'warning', Resuelta: 'success', Cerrada: 'default' };

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
}
function fmtMin(min) {
  if (min == null) return null;
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
function initials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}
function avatarColor(name) {
  const colors = ['#1565c0','#6a1b9a','#00695c','#e65100','#558b2f','#37474f'];
  let hash = 0;
  for (const c of (name || '')) hash = c.charCodeAt(0) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

// ── Formulario de edición ─────────────────────────────────────────────────────
const EMPTY = {
  titulo: '', descripcion: '', categoria: 'Red', prioridad: 'Media',
  estado: 'Abierta', impacto: '', sistemaAfectado: '', usuarioAfectado: '',
  reportadoPor: '', asignadoA: '', fechaIncidencia: '', fechaResolucion: '', resolucion: '',
};

function EditForm({ entry, onSave, onClose, saving }) {
  const [form, setForm] = useState(() => ({
    ...EMPTY, ...entry,
    fechaIncidencia: entry?.fechaIncidencia ? new Date(entry.fechaIncidencia).toISOString().slice(0,16) : '',
    fechaResolucion: entry?.fechaResolucion ? new Date(entry.fechaResolucion).toISOString().slice(0,16) : '',
  }));
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Box component="form" onSubmit={e => { e.preventDefault(); onSave(form); }}>
      <Stack spacing={2} sx={{ pt: 1 }}>
        <TextField label="Título *" value={form.titulo} onChange={e => set('titulo', e.target.value)} fullWidth required />
        <TextField label="Descripción *" value={form.descripcion} onChange={e => set('descripcion', e.target.value)}
          fullWidth multiline minRows={3} required />
        <Stack direction={{ xs:'column', sm:'row' }} spacing={2}>
          <FormControl fullWidth><InputLabel>Categoría</InputLabel>
            <Select value={form.categoria} label="Categoría" onChange={e => set('categoria', e.target.value)}>
              {CATEGORIAS.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </Select></FormControl>
          <FormControl fullWidth><InputLabel>Prioridad</InputLabel>
            <Select value={form.prioridad} label="Prioridad" onChange={e => set('prioridad', e.target.value)}>
              {PRIORIDADES.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
            </Select></FormControl>
          <FormControl fullWidth><InputLabel>Estado</InputLabel>
            <Select value={form.estado} label="Estado" onChange={e => set('estado', e.target.value)}>
              {ESTADOS.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </Select></FormControl>
        </Stack>
        <Stack direction={{ xs:'column', sm:'row' }} spacing={2}>
          <FormControl fullWidth><InputLabel>Impacto</InputLabel>
            <Select value={form.impacto || ''} label="Impacto" onChange={e => set('impacto', e.target.value)}>
              <MenuItem value="">Sin especificar</MenuItem>
              {IMPACTOS.map(i => <MenuItem key={i} value={i}>{i}</MenuItem>)}
            </Select></FormControl>
          <TextField label="Sistema afectado" value={form.sistemaAfectado} onChange={e => set('sistemaAfectado', e.target.value)} fullWidth />
          <TextField label="Usuario / Área" value={form.usuarioAfectado} onChange={e => set('usuarioAfectado', e.target.value)} fullWidth />
        </Stack>
        <Stack direction={{ xs:'column', sm:'row' }} spacing={2}>
          <TextField label="Fecha del incidente" type="datetime-local" value={form.fechaIncidencia}
            onChange={e => set('fechaIncidencia', e.target.value)} fullWidth InputLabelProps={{ shrink: true }} />
          <TextField label="Reportado por" value={form.reportadoPor} onChange={e => set('reportadoPor', e.target.value)} fullWidth />
          <TextField label="Asignado a" value={form.asignadoA} onChange={e => set('asignadoA', e.target.value)} fullWidth />
        </Stack>
        {(form.estado === 'Resuelta' || form.estado === 'Cerrada') && (
          <>
            <TextField label="Fecha resolución" type="datetime-local" value={form.fechaResolucion}
              onChange={e => set('fechaResolucion', e.target.value)} fullWidth InputLabelProps={{ shrink: true }} />
            <TextField label="Descripción de la resolución" value={form.resolucion}
              onChange={e => set('resolucion', e.target.value)} fullWidth multiline minRows={2} />
          </>
        )}
        <Stack direction="row" justifyContent="flex-end" spacing={1} pt={1}>
          <Button onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={saving}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}>
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}

// ── Página de detalle ─────────────────────────────────────────────────────────
export default function BitacoraDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin, hasModuleWrite } = useAuth();
  const canWrite = isAdmin || hasModuleWrite(MODULES.BITACORA);

  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const [nota,    setNota]    = useState('');
  const [tipoSeg, setTipoSeg] = useState('Seguimiento');
  const [sending, setSending] = useState(false);

  const [editing, setEditing] = useState(false);
  const [saving,  setSaving]  = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const r = await bitacoraApi.getById(id);
      setData(r.data);
    } catch {
      setError('No se pudo cargar la entrada.');
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleSend = async () => {
    if (!nota.trim()) return;
    setSending(true);
    try {
      await bitacoraApi.addSeguimiento(id, { nota: nota.trim(), tipo: tipoSeg });
      setNota('');
      await load();
    } catch { } finally { setSending(false); }
  };

  const handleSave = async (form) => {
    setSaving(true);
    try {
      await bitacoraApi.update(id, {
        titulo: form.titulo, descripcion: form.descripcion,
        categoria: form.categoria, prioridad: form.prioridad, estado: form.estado,
        impacto: form.impacto || null, sistemaAfectado: form.sistemaAfectado || null,
        usuarioAfectado: form.usuarioAfectado || null,
        reportadoPor: form.reportadoPor || null, asignadoA: form.asignadoA || null,
        fechaIncidencia: form.fechaIncidencia ? new Date(form.fechaIncidencia).toISOString() : null,
        fechaResolucion: form.fechaResolucion ? new Date(form.fechaResolucion).toISOString() : null,
        resolucion: form.resolucion || null,
      });
      setEditing(false);
      await load();
    } catch { } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      await bitacoraApi.remove(id);
      navigate('/bitacora');
    } catch { setConfirmDelete(false); }
  };

  if (loading) return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
      <CircularProgress />
    </Box>
  );

  if (error || !data) return (
    <Box sx={{ p: 3 }}>
      <Alert severity="error">{error || 'Entrada no encontrada.'}</Alert>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/bitacora')} sx={{ mt: 2 }}>
        Volver
      </Button>
    </Box>
  );

  const e   = data.entry;
  const seg = data.seguimientos ?? [];

  return (
    <Box sx={{ p: { xs: 1, md: 2 }, maxWidth: 1100, mx: 'auto' }}>

      {/* Cabecera */}
      <Paper elevation={0} sx={{ p: 2.5, mb: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" flexWrap="wrap" gap={1}>
          <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap">
            <Button size="small" startIcon={<ArrowBackIcon />} onClick={() => navigate('/bitacora')}
              sx={{ borderRadius: 2 }}>
              Bitácora
            </Button>
            <Typography variant="caption" color="text.secondary" fontWeight={700}>{e.folio}</Typography>
            <Chip size="small" label={e.prioridad} color={PRIORIDAD_COLOR[e.prioridad] || 'default'} />
            <Chip size="small" label={e.estado} color={ESTADO_COLOR[e.estado] || 'default'} />
          </Stack>
          {canWrite && (
            <Stack direction="row" spacing={1}>
              <Button size="small" variant="outlined" startIcon={<EditIcon />}
                onClick={() => setEditing(true)} sx={{ borderRadius: 2 }}>
                Editar
              </Button>
              {isAdmin && (
                <Tooltip title="Eliminar entrada">
                  <IconButton size="small" color="error" onClick={() => setConfirmDelete(true)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Stack>
          )}
        </Stack>

        <Typography variant="h5" fontWeight={800} mt={1.5} mb={0.5}>{e.titulo}</Typography>
        <Typography variant="caption" color="text.secondary">
          Creado {fmtDate(e.creadoEn)}
        </Typography>
      </Paper>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="flex-start">

        {/* ── Columna izquierda — Info + Seguimientos ── */}
        <Box flex={1} minWidth={0}>

          {/* Descripción */}
          <Paper elevation={0} sx={{ p: 2.5, mb: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="overline" color="text.secondary" fontWeight={700} display="block" mb={1}>
              Descripción del incidente
            </Typography>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>{e.descripcion}</Typography>

            {e.resolucion && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="overline" color="success.main" fontWeight={700} display="block" mb={1}>
                  ✅ Resolución
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{e.resolucion}</Typography>
              </>
            )}
          </Paper>

          {/* Seguimientos */}
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="overline" color="text.secondary" fontWeight={700} display="block" mb={2}>
              Actualizaciones ({seg.length})
            </Typography>

            {seg.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Aún no hay actualizaciones.
              </Typography>
            )}

            <Stack spacing={2} mb={seg.length > 0 ? 3 : 0}>
              {seg.map((s, idx) => (
                <Stack key={s.id} direction="row" spacing={1.5} alignItems="flex-start">
                  <Avatar sx={{ width: 32, height: 32, fontSize: 12, bgcolor: avatarColor(s.creadoPor), flexShrink: 0 }}>
                    {initials(s.creadoPor)}
                  </Avatar>
                  <Box flex={1} minWidth={0}>
                    <Stack direction="row" alignItems="center" spacing={1} mb={0.5} flexWrap="wrap">
                      <Typography variant="body2" fontWeight={700}>{s.creadoPor}</Typography>
                      <Chip size="small" label={s.tipo} variant="outlined" sx={{ height: 18, fontSize: 10 }} />
                      <Typography variant="caption" color="text.secondary">{fmtDate(s.creadoEn)}</Typography>
                    </Stack>
                    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{s.nota}</Typography>
                    </Paper>
                  </Box>
                </Stack>
              ))}
            </Stack>

            {/* Input nueva actualización */}
            {canWrite && (
              <>
                {seg.length > 0 && <Divider sx={{ mb: 2 }} />}
                <Stack direction="row" spacing={1} alignItems="flex-start">
                  <Avatar sx={{ width: 32, height: 32, fontSize: 12, bgcolor: 'primary.main', flexShrink: 0, mt: 0.5 }}>
                    <BookIcon sx={{ fontSize: 16 }} />
                  </Avatar>
                  <Box flex={1}>
                    <Stack direction="row" spacing={1} mb={1}>
                      <FormControl size="small" sx={{ minWidth: 150 }}>
                        <InputLabel>Tipo</InputLabel>
                        <Select value={tipoSeg} label="Tipo" onChange={e => setTipoSeg(e.target.value)}>
                          {TIPOS_SEG.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                        </Select>
                      </FormControl>
                    </Stack>
                    <TextField
                      fullWidth multiline minRows={2} maxRows={6}
                      placeholder="Escribe una actualización..."
                      value={nota}
                      onChange={e => setNota(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); handleSend(); }
                      }}
                      sx={{ mb: 1 }}
                    />
                    <Stack direction="row" justifyContent="flex-end">
                      <Button
                        variant="contained" endIcon={sending ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
                        disabled={sending || !nota.trim()}
                        onClick={handleSend}
                        sx={{ borderRadius: 2 }}
                      >
                        {sending ? 'Enviando…' : 'Agregar'}
                      </Button>
                    </Stack>
                  </Box>
                </Stack>
              </>
            )}
          </Paper>
        </Box>

        {/* ── Columna derecha — Info lateral ── */}
        <Box sx={{ width: { xs: '100%', md: 280 }, flexShrink: 0 }}>
          <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="overline" color="text.secondary" fontWeight={700} display="block" mb={1.5}>
              Información
            </Typography>
            <Stack spacing={1.5}>
              {[
                ['Categoría',       e.categoria],
                ['Prioridad',       e.prioridad],
                ['Estado',          e.estado],
                ['Impacto',         e.impacto || '—'],
                ['Sistema afectado',e.sistemaAfectado || '—'],
                ['Usuario / Área',  e.usuarioAfectado || '—'],
                ['Reportado por',   e.reportadoPor],
                ['Asignado a',      e.asignadoA || '—'],
              ].map(([label, val]) => (
                <Box key={label}>
                  <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
                  <Typography variant="body2" fontWeight={600}>{val}</Typography>
                </Box>
              ))}
              <Divider />
              {[
                ['Fecha del incidente', fmtDate(e.fechaIncidencia)],
                ['Fecha resolución',    fmtDate(e.fechaResolucion)],
                ['Tiempo resolución',   fmtMin(e.tiempoResolucion) || '—'],
                ['Creado',             fmtDate(e.creadoEn)],
              ].map(([label, val]) => (
                <Box key={label}>
                  <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
                  <Typography variant="body2" fontWeight={600}>{val}</Typography>
                </Box>
              ))}
            </Stack>
          </Paper>
        </Box>
      </Stack>

      {/* Modal edición */}
      {editing && (
        <Dialog open fullWidth maxWidth="md" onClose={() => setEditing(false)}>
          <DialogTitle>Editar entrada — {e.folio}</DialogTitle>
          <DialogContent>
            <EditForm entry={e} onSave={handleSave} onClose={() => setEditing(false)} saving={saving} />
          </DialogContent>
        </Dialog>
      )}

      {/* Confirm delete */}
      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)} maxWidth="xs">
        <DialogTitle>¿Eliminar esta entrada?</DialogTitle>
        <DialogContent>
          <Typography>Esta acción no se puede deshacer. Se eliminará <strong>{e.folio}</strong> y todos sus seguimientos.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(false)}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>Eliminar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
