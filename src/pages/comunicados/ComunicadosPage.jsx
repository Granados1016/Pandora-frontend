import { useState, useEffect, useCallback } from 'react';
import MDEditor from '@uiw/react-md-editor';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardHeader,
  CardActions,
  Chip,
  Button,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  CircularProgress,
  Stack,
  Divider,
  LinearProgress,
  Fade,
  Select,
  FormControl,
  InputLabel,
  Pagination,
  Switch,
  FormControlLabel,
  Snackbar,
} from '@mui/material';
import CampaignIcon from '@mui/icons-material/Campaign';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import AnnouncementIcon from '@mui/icons-material/Announcement';

import { comunicadosApi } from '../../api/pandoraApi';
import { useAuth } from '../../hooks/useAuth';

// ── Chip de prioridad ────────────────────────────────────────────────────────
function PriorityChip({ priority }) {
  const map = {
    urgent: { color: 'error',   label: '🔴 Urgente' },
    high:   { color: 'warning', label: '🟠 Alta'    },
    normal: { color: 'primary', label: '🔵 Normal'  },
    low:    { color: 'default', label: '⚪ Baja'    },
  };
  const cfg = map[priority] ?? map.normal;
  return <Chip size="small" color={cfg.color} label={cfg.label} />;
}

// ── Extraer mensaje de error de una respuesta Axios ─────────────────────────
function extractError(err) {
  const d = err?.response?.data;
  if (!d) return err?.message ?? 'Error de red. Verifica tu conexión.';
  // ASP.NET Core ProblemDetails usa "title", Flask/Express usan "message"
  return d.title ?? d.message ?? d.error ?? (typeof d === 'string' ? d : 'Ocurrió un error inesperado.');
}

// ── Hook useComunicados ──────────────────────────────────────────────────────
function useComunicados() {
  const [list, setList]             = useState([]);
  const [loading, setLoading]       = useState(false);
  const [loadError, setLoadError]   = useState('');
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const load = useCallback(async (currentPage) => {
    setLoading(true);
    setLoadError('');
    try {
      const { data } = await comunicadosApi.getAll({ page: currentPage, pageSize: 10 });
      if (Array.isArray(data)) {
        setList(data);
        setTotal(data.length);
        setTotalPages(1);
      } else {
        setList(data.items ?? []);
        setTotal(data.total ?? 0);
        setTotalPages(data.totalPages ?? 1);
      }
    } catch (err) {
      setLoadError(extractError(err));
      setList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(page);
  }, [page, load]);

  const reload = useCallback(() => load(page), [load, page]);

  return { list, loading, loadError, total, page, setPage, totalPages, reload };
}

// ── Dialog de creación / edición ─────────────────────────────────────────────
function ComunicadoDialog({ open, onClose, onSaved, initial }) {
  const isEdit = Boolean(initial);

  const emptyForm = {
    title:       '',
    content:     '',
    priority:    'normal',
    isPublished: true,
    expiresAt:   '',
  };

  const [form, setForm]     = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  // Resetear / cargar al abrir
  useEffect(() => {
    if (!open) return;
    setError('');
    setForm(initial ? {
      title:       initial.title       ?? '',
      content:     initial.content     ?? '',
      priority:    initial.priority    ?? 'normal',
      isPublished: initial.isPublished ?? true,
      expiresAt:   initial.expiresAt
        ? new Date(initial.expiresAt).toISOString().slice(0, 16)
        : '',
    } : emptyForm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = (field) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm(prev => ({ ...prev, [field]: val }));
  };

  const handleSubmit = async () => {
    if (!form.title.trim())   { setError('El título es obligatorio.');    return; }
    if (!form.content.trim()) { setError('El contenido es obligatorio.'); return; }

    setSaving(true);
    setError('');
    try {
      const payload = {
        title:       form.title.trim(),
        content:     form.content.trim(),
        priority:    form.priority,
        isPublished: form.isPublished,
        expiresAt:   form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
      };
      if (isEdit) {
        await comunicadosApi.update(initial.id, payload);
      } else {
        await comunicadosApi.create(payload);
      }
      onSaved(isEdit ? 'Comunicado actualizado.' : 'Comunicado creado correctamente.');
    } catch (err) {
      setError(extractError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <AnnouncementIcon fontSize="small" />
        {isEdit ? 'Editar comunicado' : 'Nuevo comunicado'}
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

          <TextField
            id="com-title"
            label="Título"
            required
            fullWidth
            value={form.title}
            onChange={set('title')}
            inputProps={{ maxLength: 200 }}
            helperText={`${form.title.length}/200`}
          />

          {/* Editor Markdown enriquecido */}
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
              Contenido *
            </Typography>
            <Box data-color-mode="light">
              <MDEditor
                id="com-content"
                value={form.content}
                onChange={val => setForm(prev => ({ ...prev, content: val ?? '' }))}
                height={220}
                preview="edit"
                hideToolbar={false}
                textareaProps={{ placeholder: 'Escribe el comunicado… soporta **negrita**, _cursiva_, listas y más.' }}
              />
            </Box>
            {!form.content.trim() && (
              <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                El contenido es obligatorio
              </Typography>
            )}
          </Box>

          <FormControl fullWidth>
            <InputLabel id="com-priority-label">Prioridad</InputLabel>
            <Select
              labelId="com-priority-label"
              id="com-priority"
              label="Prioridad"
              value={form.priority}
              onChange={set('priority')}
            >
              <MenuItem value="low">⚪ Baja</MenuItem>
              <MenuItem value="normal">🔵 Normal</MenuItem>
              <MenuItem value="high">🟠 Alta</MenuItem>
              <MenuItem value="urgent">🔴 Urgente</MenuItem>
            </Select>
          </FormControl>

          <TextField
            id="com-expires"
            label="Fecha de vencimiento (opcional)"
            type="datetime-local"
            fullWidth
            value={form.expiresAt}
            onChange={set('expiresAt')}
            InputLabelProps={{ shrink: true }}
            helperText="Si se deja vacío el comunicado no expira"
          />

          <FormControlLabel
            control={
              <Switch
                id="com-published"
                checked={form.isPublished}
                onChange={set('isPublished')}
              />
            }
            label="Publicar inmediatamente"
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} /> : undefined}
        >
          {saving
            ? (isEdit ? 'Guardando…' : 'Creando…')
            : (isEdit ? 'Guardar cambios' : 'Crear comunicado')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Página principal ─────────────────────────────────────────────────────────
export default function ComunicadosPage() {
  const { isAdmin } = useAuth();
  const { list, loading, loadError, page, setPage, totalPages, reload } = useComunicados();

  // Estado de diálogos
  const [dialogOpen, setDialogOpen]     = useState(false);
  const [editTarget, setEditTarget]     = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]         = useState(false);
  const [deleteError, setDeleteError]   = useState('');
  const [viewTarget, setViewTarget]     = useState(null);

  // Snackbar feedback
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' });
  const showSnack = (msg, severity = 'success') => setSnack({ open: true, msg, severity });

  const handleNew = () => {
    setEditTarget(null);
    setDialogOpen(true);
  };

  const handleEdit = (item) => {
    setEditTarget(item);
    setDialogOpen(true);
  };

  const handleSaved = (msg) => {
    setDialogOpen(false);
    reload();
    showSnack(msg);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await comunicadosApi.remove(deleteTarget.id);
      setDeleteTarget(null);
      reload();
      showSnack('Comunicado eliminado.');
    } catch (err) {
      setDeleteError(extractError(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: { xs: 'flex-start', sm: 'center' },
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          gap: 2,
          mb: 3,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <CampaignIcon color="primary" sx={{ fontSize: 36 }} />
          <Box>
            <Typography variant="h5" fontWeight={700}>
              Comunicados Institucionales
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Avisos y comunicaciones oficiales de la organización
            </Typography>
          </Box>
        </Box>

        {isAdmin && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleNew}
          >
            Nuevo Comunicado
          </Button>
        )}
      </Box>

      {/* Barra de progreso */}
      {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

      {/* Error de carga */}
      {loadError && (
        <Alert severity="error" sx={{ mb: 2 }}>{loadError}</Alert>
      )}

      {/* Grid de cards */}
      <Grid container spacing={2}>
        {!loading && list.length === 0 && (
          <Grid item xs={12}>
            <Paper
              sx={{
                p: 6,
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <AnnouncementIcon sx={{ fontSize: 56, color: 'text.disabled' }} />
              <Typography variant="h6" color="text.secondary">
                No hay comunicados disponibles
              </Typography>
            </Paper>
          </Grid>
        )}

        {list.map((item) => (
          <Grid item xs={12} sm={6} md={4} key={item.id}>
            <Fade in>
              <Card
                elevation={2}
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'box-shadow .2s',
                  '&:hover': { boxShadow: 6 },
                }}
              >
                <CardHeader
                  title={
                    <Typography variant="subtitle1" fontWeight={600} noWrap>
                      {item.title}
                    </Typography>
                  }
                  subheader={
                    <Typography variant="caption" color="text.secondary">
                      Por {item.author} •{' '}
                      {new Date(item.createdAt).toLocaleDateString('es-MX')}
                    </Typography>
                  }
                  action={<PriorityChip priority={item.priority} />}
                  sx={{ pb: 0 }}
                />

                <CardContent sx={{ flex: 1, pt: 1 }}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {item.content}
                  </Typography>

                  {item.expiresAt && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                      <AccessTimeIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                      <Typography variant="caption" color="text.disabled">
                        Vence:{' '}
                        {new Date(item.expiresAt).toLocaleDateString('es-MX', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Typography>
                    </Box>
                  )}
                </CardContent>

                <Divider />

                <CardActions sx={{ justifyContent: 'space-between', px: 1.5 }}>
                  <Button size="small" onClick={() => setViewTarget(item)}>
                    Ver más
                  </Button>

                  {isAdmin && (
                    <Box>
                      <Tooltip title="Editar">
                        <IconButton size="small" onClick={() => handleEdit(item)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Eliminar">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => setDeleteTarget(item)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  )}
                </CardActions>
              </Card>
            </Fade>
          </Grid>
        ))}
      </Grid>

      {/* Paginación */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, v) => setPage(v)}
            color="primary"
            shape="rounded"
          />
        </Box>
      )}

      {/* Dialog crear / editar */}
      <ComunicadoDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={handleSaved}
        initial={editTarget}
      />

      {/* Dialog confirmar eliminación */}
      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>¿Eliminar comunicado?</DialogTitle>
        <DialogContent>
          {deleteError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {deleteError}
            </Alert>
          )}
          <Typography>
            Esta acción eliminará permanentemente el comunicado{' '}
            <strong>"{deleteTarget?.title}"</strong>. ¿Deseas continuar?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteConfirm}
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={16} /> : <DeleteIcon />}
          >
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar de feedback */}
      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snack.severity}
          onClose={() => setSnack(s => ({ ...s, open: false }))}
          sx={{ width: '100%' }}
        >
          {snack.msg}
        </Alert>
      </Snackbar>

      {/* Dialog "Ver más" — texto completo */}
      <Dialog
        open={Boolean(viewTarget)}
        onClose={() => setViewTarget(null)}
        maxWidth="sm"
        fullWidth
      >
        {viewTarget && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PriorityHighIcon fontSize="small" />
              {viewTarget.title}
            </DialogTitle>
            <DialogContent dividers>
              <Stack spacing={1.5}>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <PriorityChip priority={viewTarget.priority} />
                  <Chip
                    size="small"
                    label={`Por ${viewTarget.author}`}
                    variant="outlined"
                  />
                  <Chip
                    size="small"
                    label={new Date(viewTarget.createdAt).toLocaleDateString('es-MX')}
                    variant="outlined"
                  />
                </Box>
                <Divider />
                <Box data-color-mode="light" sx={{ '& .wmde-markdown': { fontSize: '0.95rem', fontFamily: 'Inter, sans-serif' } }}>
                  <MDEditor.Markdown source={viewTarget.content} />
                </Box>
                {viewTarget.expiresAt && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                    <AccessTimeIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                    <Typography variant="caption" color="text.disabled">
                      Vence:{' '}
                      {new Date(viewTarget.expiresAt).toLocaleString('es-MX')}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={() => setViewTarget(null)}>Cerrar</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
