import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Typography, Paper, Tabs, Tab, Button, TextField, MenuItem,
  Grid, Card, CardContent, CardActions, Chip, IconButton, Tooltip,
  CircularProgress, Alert, Dialog, DialogTitle, DialogContent, DialogActions,
  InputAdornment, Stack, Divider, LinearProgress, Fade, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Pagination,
} from '@mui/material';
import UploadFileIcon        from '@mui/icons-material/UploadFile';
import SearchIcon            from '@mui/icons-material/Search';
import DownloadIcon          from '@mui/icons-material/Download';
import VisibilityIcon        from '@mui/icons-material/Visibility';
import DeleteIcon            from '@mui/icons-material/Delete';
import EditIcon              from '@mui/icons-material/Edit';
import AddIcon               from '@mui/icons-material/Add';
import InsertDriveFileIcon   from '@mui/icons-material/InsertDriveFile';
import PictureAsPdfIcon      from '@mui/icons-material/PictureAsPdf';
import ImageIcon             from '@mui/icons-material/Image';
import CloudUploadIcon       from '@mui/icons-material/CloudUpload';
import FilterListIcon        from '@mui/icons-material/FilterList';
import CloseIcon             from '@mui/icons-material/Close';
import FolderOpenIcon        from '@mui/icons-material/FolderOpen';
import CategoryIcon          from '@mui/icons-material/Category';
import LabelIcon             from '@mui/icons-material/Label';
import HistoryIcon           from '@mui/icons-material/History';
import PublishIcon           from '@mui/icons-material/Publish';

import { procedimientosApi, categoriasApi } from '../../api/pandoraApi';
import { useAuth } from '../../hooks/useAuth';

// ── Opciones de color disponibles ─────────────────────────────────────────────
const COLOR_OPTIONS = [
  { value: 'default',   label: 'Gris' },
  { value: 'primary',   label: 'Azul' },
  { value: 'secondary', label: 'Morado' },
  { value: 'success',   label: 'Verde' },
  { value: 'warning',   label: 'Naranja' },
  { value: 'error',     label: 'Rojo' },
  { value: 'info',      label: 'Cyan' },
];

// ── Icono según tipo de archivo ───────────────────────────────────────────────
function FileIcon({ contentType, fontSize = 'large' }) {
  if (contentType?.includes('pdf'))       return <PictureAsPdfIcon fontSize={fontSize} color="error" />;
  if (contentType?.startsWith('image/'))  return <ImageIcon fontSize={fontSize} color="primary" />;
  return <InsertDriveFileIcon fontSize={fontSize} color="action" />;
}

function fmtSize(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1048576)     return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(2)} MB`;
}

// ── Hook: carga y cachea categorías ──────────────────────────────────────────
function useCategorias() {
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading]       = useState(true);

  const reload = useCallback(async () => {
    try {
      const { data } = await categoriasApi.getAll();
      setCategorias(data);
    } catch {
      setCategorias([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);
  return { categorias, loading, reload };
}

// ── Panel "Subir Archivo" ─────────────────────────────────────────────────────
function UploadTab({ categorias, onUploaded }) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile]         = useState(null);
  const [title, setTitle]       = useState('');
  const [desc,  setDesc]        = useState('');
  const [cat,   setCat]         = useState('');
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(false);
  const [error,   setError]     = useState('');
  const inputRef = useRef();

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) { setFile(dropped); setTitle(dropped.name.replace(/\.[^.]+$/, '')); }
  }, []);

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (f) { setFile(f); setTitle(f.name.replace(/\.[^.]+$/, '')); }
  };

  const handleSubmit = async () => {
    if (!file || !title.trim() || !cat) {
      setError('Completa el título, la categoría y selecciona un archivo.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await procedimientosApi.upload(file, { title: title.trim(), description: desc.trim(), category: cat });
      setSuccess(true);
      setFile(null); setTitle(''); setDesc(''); setCat('');
      if (inputRef.current) inputRef.current.value = '';
      onUploaded?.();
      setTimeout(() => setSuccess(false), 4000);
    } catch (e) {
      setError(e?.response?.data?.message || e?.response?.data || 'Error al subir el archivo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 700, mx: 'auto', mt: 3 }}>
      {success && (
        <Fade in>
          <Alert severity="success" sx={{ mb: 2 }}>Archivo subido correctamente.</Alert>
        </Fade>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>
      )}

      {/* Drop zone */}
      <Paper
        variant="outlined"
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !file && inputRef.current?.click()}
        sx={{
          p: 5, textAlign: 'center', cursor: file ? 'default' : 'pointer',
          borderStyle: 'dashed', borderWidth: 2,
          borderColor: dragging ? 'primary.main' : 'divider',
          bgcolor: dragging ? 'primary.50' : 'background.paper',
          transition: 'all 0.2s',
          '&:hover': { borderColor: file ? 'divider' : 'primary.main', bgcolor: file ? 'background.paper' : 'action.hover' },
        }}
      >
        {file ? (
          <Stack alignItems="center" spacing={1}>
            <FileIcon contentType={file.type} />
            <Typography fontWeight={600}>{file.name}</Typography>
            <Typography variant="caption" color="text.secondary">{fmtSize(file.size)}</Typography>
            <Button
              size="small" color="error" variant="text"
              onClick={e => { e.stopPropagation(); setFile(null); setTitle(''); if (inputRef.current) inputRef.current.value = ''; }}
            >
              Quitar archivo
            </Button>
          </Stack>
        ) : (
          <Stack alignItems="center" spacing={1}>
            <CloudUploadIcon sx={{ fontSize: 56, color: 'action.disabled' }} />
            <Typography fontWeight={600}>Arrastra un archivo aquí</Typography>
            <Typography variant="caption" color="text.secondary">
              o haz clic para buscar — PDF, Word, Excel, imágenes, etc.
            </Typography>
          </Stack>
        )}
        <input ref={inputRef} type="file" hidden onChange={handleFile} />
      </Paper>

      <Stack spacing={2} mt={3}>
        <TextField label="Título del procedimiento *" value={title} onChange={e => setTitle(e.target.value)} fullWidth />
        <TextField
          label="Descripción" value={desc} onChange={e => setDesc(e.target.value)}
          fullWidth multiline rows={3} placeholder="Breve descripción del contenido..."
        />
        <TextField select label="Categoría *" value={cat} onChange={e => setCat(e.target.value)} fullWidth>
          {categorias.map(c => (
            <MenuItem key={c.id} value={c.name}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip label={c.name} size="small" color={c.color || 'default'} />
              </Stack>
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <Box mt={3} display="flex" justifyContent="flex-end">
        <Button
          variant="contained" size="large"
          startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <UploadFileIcon />}
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? 'Subiendo…' : 'Subir Procedimiento'}
        </Button>
      </Box>
    </Box>
  );
}

// ── Panel "Buscar y Ver" ──────────────────────────────────────────────────────
const PAGE_SIZE = 12;

function SearchTab({ categorias, refresh }) {
  const { isAdmin } = useAuth();
  const [list,       setList]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [catFilter,  setCatFilter]  = useState('');
  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total,      setTotal]      = useState(0);
  const [tick,    setTick]    = useState(0);
  const fetchList = () => setTick(t => t + 1);
  const [viewer,  setViewer]  = useState(null);
  const [delConf, setDelConf] = useState(null);
  const [delLoading, setDelLoading] = useState(false);
  const [versionTarget, setVersionTarget] = useState(null); // { id, title }
  const [versions, setVersions]           = useState([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [newVersionFile, setNewVersionFile]   = useState(null);
  const [uploadingVersion, setUploadingVersion] = useState(false);
  const versionFileRef = useRef();

  // Cambia filtros → vuelve a pág 1
  const handleSearchChange  = (val) => { setSearch(val);    setPage(1); };
  const handleCatChange     = (val) => { setCatFilter(val); setPage(1); };

  useEffect(() => {
    let active = true;
    setLoading(true);
    procedimientosApi
      .getAll({ search, category: catFilter, page, pageSize: PAGE_SIZE })
      .then(({ data }) => {
        if (!active) return;
        // Soporta tanto la respuesta paginada { items, total, totalPages }
        // como la respuesta antigua (array directo) para retrocompatibilidad
        if (Array.isArray(data)) {
          setList(data);
          setTotalPages(1);
          setTotal(data.length);
        } else {
          setList(data.items ?? []);
          setTotalPages(data.totalPages ?? 1);
          setTotal(data.total ?? 0);
        }
      })
      .catch(() => { if (active) { setList([]); setTotalPages(1); setTotal(0); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [search, catFilter, page, refresh, tick]);

  const catColor = (name) => categorias.find(c => c.name === name)?.color || 'default';

  const handleView = (item) => {
    const url = procedimientosApi.viewUrl(item.id);
    setViewer({ url, contentType: item.fileContentType, title: item.title });
  };

  const handleDownload = (item) => {
    const a = document.createElement('a');
    a.href = procedimientosApi.downloadUrl(item.id);
    a.download = item.fileName;
    a.click();
  };

  const handleDelete = async () => {
    if (!delConf) return;
    setDelLoading(true);
    try { await procedimientosApi.remove(delConf); setDelConf(null); fetchList(); }
    catch { setDelConf(null); }
    finally { setDelLoading(false); }
  };

  // ── Version handlers ─────────────────────────────────────────────────────
  const openVersions = async (item) => {
    setVersionTarget({ id: item.id, title: item.title });
    setNewVersionFile(null);
    setVersionsLoading(true);
    try {
      const { data } = await procedimientosApi.getVersions(item.id);
      setVersions(data);
    } catch { setVersions([]); }
    finally { setVersionsLoading(false); }
  };

  const handleUploadNewVersion = async () => {
    if (!newVersionFile || !versionTarget) return;
    setUploadingVersion(true);
    try {
      await procedimientosApi.uploadVersion(versionTarget.id, newVersionFile);
      setNewVersionFile(null);
      // Refresh versions list
      const { data } = await procedimientosApi.getVersions(versionTarget.id);
      setVersions(data);
      fetchList();
    } catch (e) {
      console.error(e);
    } finally { setUploadingVersion(false); }
  };

  // PDF e imágenes se muestran inline; Office docs via Office Online
  const isOfficeDoc = (ct) =>
    ct?.includes('officedocument') ||   // .docx / .xlsx / .pptx
    ct?.includes('msword') ||
    ct?.includes('ms-excel') ||
    ct?.includes('ms-powerpoint') ||
    ct?.includes('opendocument');
  const isViewable = (ct) => ct?.includes('pdf') || ct?.startsWith('image/') || isOfficeDoc(ct);

  return (
    <Box mt={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={3}>
        <TextField
          placeholder="Buscar por título o descripción…"
          value={search}
          onChange={e => handleSearchChange(e.target.value)}
          sx={{ flex: 1 }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon color="action" /></InputAdornment>,
          }}
        />
        <TextField
          select label="Categoría"
          value={catFilter} onChange={e => handleCatChange(e.target.value)}
          sx={{ minWidth: 200 }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><FilterListIcon color="action" /></InputAdornment>,
          }}
        >
          <MenuItem value="">Todas</MenuItem>
          {categorias.map(c => (
            <MenuItem key={c.id} value={c.name}>
              <Chip label={c.name} size="small" color={c.color || 'default'} />
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {loading && <LinearProgress sx={{ borderRadius: 1 }} />}

      {!loading && list.length === 0 && (
        <Box textAlign="center" py={8}>
          <FolderOpenIcon sx={{ fontSize: 64, color: 'action.disabled', mb: 1 }} />
          <Typography color="text.secondary">No se encontraron procedimientos.</Typography>
        </Box>
      )}

      {!loading && total > 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
          {total} procedimiento{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}
          {totalPages > 1 && ` — página ${page} de ${totalPages}`}
        </Typography>
      )}

      <Grid container spacing={2}>
        {list.map(item => (
          <Grid item xs={12} sm={6} md={4} key={item.id}>
            <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flex: 1 }}>
                <Stack direction="row" spacing={1} alignItems="flex-start">
                  <Box mt={0.5}><FileIcon contentType={item.fileContentType} fontSize="medium" /></Box>
                  <Box flex={1} minWidth={0}>
                    <Typography fontWeight={600} noWrap title={item.title}>{item.title}</Typography>
                    <Chip label={item.category || '—'} size="small" color={catColor(item.category)} sx={{ mt: 0.5, mb: 1 }} />
                    {item.description && (
                      <Typography
                        variant="caption" color="text.secondary"
                        sx={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
                      >
                        {item.description}
                      </Typography>
                    )}
                    <Typography variant="caption" color="text.disabled" display="block" mt={1}>
                      {fmtSize(item.fileSize)} · {item.uploadedBy} · {new Date(item.uploadedAt).toLocaleDateString('es-MX')}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
              <Divider />
              <CardActions sx={{ justifyContent: 'flex-end', px: 1.5 }}>
                {isViewable(item.fileContentType) && (
                  <Tooltip title="Visualizar">
                    <IconButton size="small" color="primary" onClick={() => handleView(item)}>
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                <Tooltip title="Descargar">
                  <IconButton size="small" onClick={() => handleDownload(item)}>
                    <DownloadIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Historial de versiones">
                  <IconButton size="small" color="secondary" onClick={() => openVersions(item)}>
                    <HistoryIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                {isAdmin && (
                  <Tooltip title="Eliminar">
                    <IconButton size="small" color="error" onClick={() => setDelConf(item.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Paginación */}
      {totalPages > 1 && (
        <Box display="flex" justifyContent="center" mt={3}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, v) => setPage(v)}
            color="primary"
            shape="rounded"
          />
        </Box>
      )}

      {/* Visor */}
      <Dialog open={!!viewer} onClose={() => setViewer(null)} maxWidth="lg" fullWidth PaperProps={{ sx: { height: '90vh' } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
          <Typography fontWeight={600} noWrap sx={{ flex: 1, mr: 2 }}>{viewer?.title}</Typography>
          <IconButton size="small" onClick={() => setViewer(null)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0, overflow: 'hidden' }}>
          {viewer?.contentType?.startsWith('image/') ? (
            <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'grey.100', overflow: 'auto', p: 2 }}>
              <img src={viewer.url} alt={viewer.title} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            </Box>
          ) : isOfficeDoc(viewer?.contentType) ? (
            // Office Online Viewer para Word/Excel/PowerPoint
            <iframe
              src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(viewer.url)}`}
              title={viewer?.title}
              style={{ width: '100%', height: '100%', border: 'none' }}
            />
          ) : (
            <iframe src={viewer?.url} title={viewer?.title} style={{ width: '100%', height: '100%', border: 'none' }} />
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmar eliminación */}
      <Dialog open={!!delConf} onClose={() => setDelConf(null)} maxWidth="xs" fullWidth>
        <DialogTitle>¿Eliminar procedimiento?</DialogTitle>
        <DialogContent><Typography>Esta acción no se puede deshacer.</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setDelConf(null)} disabled={delLoading}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={handleDelete} disabled={delLoading}>
            {delLoading ? <CircularProgress size={18} /> : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Historial de versiones ── */}
      <Dialog open={!!versionTarget} onClose={() => setVersionTarget(null)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography fontWeight={700}>Historial de versiones</Typography>
            <IconButton size="small" onClick={() => setVersionTarget(null)}><CloseIcon /></IconButton>
          </Stack>
          <Typography variant="caption" color="text.secondary">{versionTarget?.title}</Typography>
        </DialogTitle>
        <DialogContent dividers>
          {versionsLoading && <LinearProgress sx={{ mb: 2 }} />}

          {/* Upload new version */}
          <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
              Subir nueva versión
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Button
                size="small" variant="outlined" startIcon={<PublishIcon />}
                onClick={() => versionFileRef.current?.click()}
              >
                {newVersionFile ? newVersionFile.name : 'Seleccionar archivo'}
              </Button>
              {newVersionFile && (
                <Button
                  size="small" variant="contained" color="primary"
                  onClick={handleUploadNewVersion}
                  disabled={uploadingVersion}
                  startIcon={uploadingVersion ? <CircularProgress size={14} /> : null}
                >
                  Publicar versión
                </Button>
              )}
            </Stack>
            <input ref={versionFileRef} type="file" hidden
              onChange={e => setNewVersionFile(e.target.files?.[0] ?? null)} />
          </Paper>

          {/* Version list */}
          {!versionsLoading && versions.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
              No hay versiones anteriores. La versión actual es la primera.
            </Typography>
          )}
          {versions.map((v) => (
            <Stack key={v.id} direction="row" alignItems="center" justifyContent="space-between"
              sx={{ py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip label={`v${v.versionNumber}`} size="small" color="secondary" />
                  <Typography variant="body2" fontWeight={600}>{v.fileName}</Typography>
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  {v.uploadedBy ?? 'desconocido'} · {new Date(v.uploadedAt).toLocaleString('es-MX')} · {fmtSize(v.fileSize)}
                </Typography>
              </Box>
              <Tooltip title="Descargar esta versión">
                <IconButton size="small"
                  href={procedimientosApi.versionDownloadUrl(versionTarget?.id, v.id)} download>
                  <DownloadIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVersionTarget(null)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ── Dialog de Crear/Editar Categoría ─────────────────────────────────────────
function CategoriaDialog({ open, onClose, onSaved, initial }) {
  const isEdit = !!initial;
  const [name,      setName]      = useState(initial?.name      || '');
  const [color,     setColor]     = useState(initial?.color     || 'default');
  const [sortOrder, setSortOrder] = useState(initial?.sortOrder ?? 0);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');

  useEffect(() => {
    if (open) {
      setName(initial?.name      || '');
      setColor(initial?.color    || 'default');
      setSortOrder(initial?.sortOrder ?? 0);
      setError('');
    }
  }, [open, initial]);

  const handleSave = async () => {
    if (!name.trim()) { setError('El nombre es requerido.'); return; }
    setLoading(true);
    setError('');
    try {
      if (isEdit) {
        await categoriasApi.update(initial.id, { name: name.trim(), color, sortOrder: Number(sortOrder) });
      } else {
        await categoriasApi.create({ name: name.trim(), color, sortOrder: Number(sortOrder) });
      }
      onSaved();
      onClose();
    } catch (e) {
      const msg = e?.response?.data?.message || e?.response?.data;
      setError(msg || 'Error al guardar la categoría.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{isEdit ? 'Editar categoría' : 'Nueva categoría'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
          <TextField
            label="Nombre *"
            value={name}
            onChange={e => setName(e.target.value)}
            fullWidth
            autoFocus
          />
          <TextField
            select label="Color"
            value={color} onChange={e => setColor(e.target.value)}
            fullWidth
          >
            {COLOR_OPTIONS.map(o => (
              <MenuItem key={o.value} value={o.value}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Chip label={o.label} size="small" color={o.value} />
                </Stack>
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Orden"
            type="number"
            value={sortOrder}
            onChange={e => setSortOrder(e.target.value)}
            fullWidth
            inputProps={{ min: 0 }}
            helperText="Número menor aparece primero"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancelar</Button>
        <Button variant="contained" onClick={handleSave} disabled={loading}>
          {loading ? <CircularProgress size={18} /> : isEdit ? 'Guardar cambios' : 'Crear'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Panel "Categorías" (solo Admin) ──────────────────────────────────────────
function CategoriasTab({ categorias, onReload }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing,    setEditing]    = useState(null);   // null = crear, object = editar
  const [delConf,    setDelConf]    = useState(null);
  const [delError,   setDelError]   = useState('');
  const [delLoading, setDelLoading] = useState(false);

  const handleDelete = async () => {
    setDelLoading(true);
    setDelError('');
    try {
      await categoriasApi.remove(delConf.id);
      setDelConf(null);
      onReload();
    } catch (e) {
      const msg = e?.response?.data?.message || e?.response?.data || 'Error al eliminar.';
      setDelError(msg);
      setDelLoading(false);
    }
  };

  return (
    <Box mt={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="body2" color="text.secondary">
          Las categorías se usan para clasificar los procedimientos. Solo los administradores pueden gestionarlas.
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => { setEditing(null); setDialogOpen(true); }}
        >
          Nueva categoría
        </Button>
      </Stack>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell sx={{ fontWeight: 700 }}>Nombre</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Color</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="center">Orden</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="center">Procedimientos</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {categorias.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  No hay categorías.
                </TableCell>
              </TableRow>
            )}
            {categorias.map(cat => (
              <TableRow key={cat.id} hover>
                <TableCell>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <LabelIcon sx={{ fontSize: 16, color: 'action.active' }} />
                    <Typography variant="body2" fontWeight={600}>{cat.name}</Typography>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Chip label={COLOR_OPTIONS.find(o => o.value === cat.color)?.label || cat.color} size="small" color={cat.color || 'default'} />
                </TableCell>
                <TableCell align="center">
                  <Typography variant="body2">{cat.sortOrder}</Typography>
                </TableCell>
                <TableCell align="center">
                  <Chip label={cat.usageCount} size="small" variant="outlined" color={cat.usageCount > 0 ? 'primary' : 'default'} />
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Editar">
                    <IconButton
                      size="small"
                      onClick={() => { setEditing(cat); setDialogOpen(true); }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={cat.usageCount > 0 ? `Tiene ${cat.usageCount} procedimiento(s)` : 'Eliminar'}>
                    <span>
                      <IconButton
                        size="small" color="error"
                        onClick={() => { setDelError(''); setDelConf(cat); }}
                        disabled={cat.usageCount > 0}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog crear/editar */}
      <CategoriaDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={onReload}
        initial={editing}
      />

      {/* Confirmar eliminación */}
      <Dialog open={!!delConf} onClose={() => setDelConf(null)} maxWidth="xs" fullWidth>
        <DialogTitle>¿Eliminar categoría?</DialogTitle>
        <DialogContent>
          {delError
            ? <Alert severity="error">{delError}</Alert>
            : <Typography>Se eliminará la categoría <b>"{delConf?.name}"</b>. Esta acción no se puede deshacer.</Typography>
          }
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDelConf(null)} disabled={delLoading}>
            {delError ? 'Cerrar' : 'Cancelar'}
          </Button>
          {!delError && (
            <Button color="error" variant="contained" onClick={handleDelete} disabled={delLoading}>
              {delLoading ? <CircularProgress size={18} /> : 'Eliminar'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function ProcedimientosPage() {
  const { isAdmin } = useAuth();
  const [tab,     setTab]     = useState(0);
  const [refresh, setRefresh] = useState(0);

  const { categorias, loading: catLoading, reload: reloadCats } = useCategorias();

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" fontWeight={700} mb={0.5}>Procedimientos</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Gestiona y consulta los procedimientos y documentos institucionales.
      </Typography>

      <Paper variant="outlined" sx={{ borderRadius: 2 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab icon={<CloudUploadIcon />} iconPosition="start" label="Subir Archivo" />
          <Tab icon={<SearchIcon />}      iconPosition="start" label="Buscar y Ver" />
          {isAdmin && (
            <Tab icon={<CategoryIcon />} iconPosition="start" label="Categorías" />
          )}
        </Tabs>

        <Box sx={{ p: { xs: 2, md: 3 } }}>
          {tab === 0 && (
            <UploadTab
              categorias={categorias}
              onUploaded={() => setRefresh(r => r + 1)}
            />
          )}
          {tab === 1 && (
            <SearchTab
              categorias={categorias}
              refresh={refresh}
            />
          )}
          {tab === 2 && isAdmin && (
            <CategoriasTab
              categorias={categorias}
              onReload={reloadCats}
            />
          )}
        </Box>
      </Paper>
    </Box>
  );
}
