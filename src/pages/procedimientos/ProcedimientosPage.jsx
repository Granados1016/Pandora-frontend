import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Typography, Paper, Tabs, Tab, Button, TextField, MenuItem,
  Grid, Card, CardContent, CardActions, Chip, IconButton, Tooltip,
  CircularProgress, Alert, Dialog, DialogTitle, DialogContent, DialogActions,
  InputAdornment, Stack, Divider, LinearProgress, Fade,
} from '@mui/material';
import UploadFileIcon        from '@mui/icons-material/UploadFile';
import SearchIcon            from '@mui/icons-material/Search';
import DownloadIcon          from '@mui/icons-material/Download';
import VisibilityIcon        from '@mui/icons-material/Visibility';
import DeleteIcon            from '@mui/icons-material/Delete';
import InsertDriveFileIcon   from '@mui/icons-material/InsertDriveFile';
import PictureAsPdfIcon      from '@mui/icons-material/PictureAsPdf';
import ImageIcon             from '@mui/icons-material/Image';
import CloudUploadIcon       from '@mui/icons-material/CloudUpload';
import FilterListIcon        from '@mui/icons-material/FilterList';
import CloseIcon             from '@mui/icons-material/Close';
import FolderOpenIcon        from '@mui/icons-material/FolderOpen';

import { procedimientosApi } from '../../api/pandoraApi';
import { useAuth } from '../../hooks/useAuth';

// ── Categorías disponibles ────────────────────────────────────────────────────
const CATEGORIAS = [
  'Académico',
  'Administrativo',
  'Recursos Humanos',
  'Finanzas',
  'Tecnología',
  'Legal',
  'Comunicaciones',
  'Otros',
];

// ── Colores por categoría ─────────────────────────────────────────────────────
const CAT_COLORS = {
  'Académico':       'primary',
  'Administrativo':  'secondary',
  'Recursos Humanos':'success',
  'Finanzas':        'warning',
  'Tecnología':      'info',
  'Legal':           'error',
  'Comunicaciones':  'default',
  'Otros':           'default',
};

// ── Icono según tipo de archivo ───────────────────────────────────────────────
function FileIcon({ contentType, fontSize = 'large' }) {
  if (contentType?.includes('pdf'))  return <PictureAsPdfIcon fontSize={fontSize} color="error" />;
  if (contentType?.startsWith('image/')) return <ImageIcon fontSize={fontSize} color="primary" />;
  return <InsertDriveFileIcon fontSize={fontSize} color="action" />;
}

// ── Formatear tamaño ──────────────────────────────────────────────────────────
function fmtSize(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

// ── Panel "Subir Archivo" ─────────────────────────────────────────────────────
function UploadTab({ onUploaded }) {
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
          <Alert severity="success" sx={{ mb: 2 }}>
            Archivo subido correctamente.
          </Alert>
        </Fade>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
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

      {/* Campos del formulario */}
      <Stack spacing={2} mt={3}>
        <TextField
          label="Título del procedimiento *"
          value={title}
          onChange={e => setTitle(e.target.value)}
          fullWidth
        />
        <TextField
          label="Descripción"
          value={desc}
          onChange={e => setDesc(e.target.value)}
          fullWidth multiline rows={3}
          placeholder="Breve descripción del contenido..."
        />
        <TextField
          select label="Categoría *"
          value={cat} onChange={e => setCat(e.target.value)}
          fullWidth
        >
          {CATEGORIAS.map(c => (
            <MenuItem key={c} value={c}>{c}</MenuItem>
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
function SearchTab({ refresh }) {
  const { isAdmin } = useAuth();
  const [list,    setList]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [viewer,  setViewer]  = useState(null);   // { url, contentType, title }
  const [delConf, setDelConf] = useState(null);   // id to delete
  const [delLoading, setDelLoading] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await procedimientosApi.getAll({ search, category: catFilter });
      setList(data);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [search, catFilter]);

  useEffect(() => { fetchList(); }, [fetchList, refresh]);

  const handleView = async (item) => {
    try {
      const url = procedimientosApi.viewUrl(item.id);
      setViewer({ url, contentType: item.fileContentType, title: item.title });
    } catch { /* ignore */ }
  };

  const handleDownload = (item) => {
    const url = procedimientosApi.downloadUrl(item.id);
    const a = document.createElement('a');
    a.href = url; a.download = item.fileName; a.click();
  };

  const handleDelete = async () => {
    if (!delConf) return;
    setDelLoading(true);
    try {
      await procedimientosApi.remove(delConf);
      setDelConf(null);
      fetchList();
    } catch {
      setDelConf(null);
    } finally {
      setDelLoading(false);
    }
  };

  const isViewable = (ct) =>
    ct?.includes('pdf') || ct?.startsWith('image/');

  return (
    <Box mt={3}>
      {/* Filtros */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={3}>
        <TextField
          placeholder="Buscar por título o descripción…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{ flex: 1 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start"><SearchIcon color="action" /></InputAdornment>
            ),
          }}
        />
        <TextField
          select label="Categoría"
          value={catFilter} onChange={e => setCatFilter(e.target.value)}
          sx={{ minWidth: 200 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start"><FilterListIcon color="action" /></InputAdornment>
            ),
          }}
        >
          <MenuItem value="">Todas</MenuItem>
          {CATEGORIAS.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
        </TextField>
      </Stack>

      {loading && <LinearProgress sx={{ borderRadius: 1 }} />}

      {!loading && list.length === 0 && (
        <Box textAlign="center" py={8}>
          <FolderOpenIcon sx={{ fontSize: 64, color: 'action.disabled', mb: 1 }} />
          <Typography color="text.secondary">No se encontraron procedimientos.</Typography>
        </Box>
      )}

      <Grid container spacing={2}>
        {list.map(item => (
          <Grid item xs={12} sm={6} md={4} key={item.id}>
            <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flex: 1 }}>
                <Stack direction="row" spacing={1} alignItems="flex-start">
                  <Box mt={0.5}>
                    <FileIcon contentType={item.fileContentType} fontSize="medium" />
                  </Box>
                  <Box flex={1} minWidth={0}>
                    <Typography fontWeight={600} noWrap title={item.title}>
                      {item.title}
                    </Typography>
                    <Chip
                      label={item.category}
                      size="small"
                      color={CAT_COLORS[item.category] || 'default'}
                      sx={{ mt: 0.5, mb: 1 }}
                    />
                    {item.description && (
                      <Typography
                        variant="caption" color="text.secondary"
                        display="block"
                        sx={{
                          overflow: 'hidden',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}
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

      {/* Visor de archivo */}
      <Dialog
        open={!!viewer}
        onClose={() => setViewer(null)}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { height: '90vh' } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
          <Typography fontWeight={600} noWrap sx={{ flex: 1, mr: 2 }}>{viewer?.title}</Typography>
          <IconButton size="small" onClick={() => setViewer(null)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0, overflow: 'hidden' }}>
          {viewer?.contentType?.startsWith('image/') ? (
            <Box
              sx={{
                height: '100%', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                bgcolor: 'grey.100', overflow: 'auto', p: 2,
              }}
            >
              <img
                src={viewer.url}
                alt={viewer.title}
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
              />
            </Box>
          ) : (
            <iframe
              src={viewer?.url}
              title={viewer?.title}
              style={{ width: '100%', height: '100%', border: 'none' }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmar eliminación */}
      <Dialog open={!!delConf} onClose={() => setDelConf(null)} maxWidth="xs" fullWidth>
        <DialogTitle>¿Eliminar procedimiento?</DialogTitle>
        <DialogContent>
          <Typography>Esta acción no se puede deshacer.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDelConf(null)} disabled={delLoading}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={handleDelete} disabled={delLoading}>
            {delLoading ? <CircularProgress size={18} /> : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function ProcedimientosPage() {
  const [tab,     setTab]     = useState(0);
  const [refresh, setRefresh] = useState(0);

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" fontWeight={700} mb={0.5}>
        Procedimientos
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Gestiona y consulta los procedimientos y documentos institucionales.
      </Typography>

      <Paper variant="outlined" sx={{ borderRadius: 2 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab icon={<CloudUploadIcon />} iconPosition="start" label="Subir Archivo"   />
          <Tab icon={<SearchIcon />}      iconPosition="start" label="Buscar y Ver"   />
        </Tabs>

        <Box sx={{ p: { xs: 2, md: 3 } }}>
          {tab === 0 && (
            <UploadTab onUploaded={() => { setRefresh(r => r + 1); }} />
          )}
          {tab === 1 && (
            <SearchTab refresh={refresh} />
          )}
        </Box>
      </Paper>
    </Box>
  );
}
