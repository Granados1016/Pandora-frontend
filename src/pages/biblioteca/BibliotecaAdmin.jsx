import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Tabs, Tab, Button, Table, TableHead, TableRow,
  TableCell, TableBody, IconButton, Tooltip, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, CircularProgress,
  Alert, Chip, Switch, FormControlLabel, Paper, Collapse,
  Stack, Divider, List, ListItem, ListItemText, LinearProgress,
} from '@mui/material';
import AddIcon           from '@mui/icons-material/Add';
import EditIcon          from '@mui/icons-material/Edit';
import DeleteIcon        from '@mui/icons-material/Delete';
import UploadFileIcon    from '@mui/icons-material/UploadFile';
import ImageIcon         from '@mui/icons-material/Image';
import ExpandMoreIcon    from '@mui/icons-material/ExpandMore';
import ExpandLessIcon    from '@mui/icons-material/ExpandLess';
import SyncIcon          from '@mui/icons-material/Sync';
import FolderIcon        from '@mui/icons-material/Folder';
import CheckCircleIcon   from '@mui/icons-material/CheckCircle';
import { categoriasApi, librosApi } from '../../api/bibliotecaApi';

const EMPTY_LIBRO = {
  titulo: '', autor: '', descripcion: '', anioPublicacion: '', isbn: '',
  editorial: '', nivelEducativo: '', idioma: '', totalPaginas: '',
  categoriaId: '', subcategoriaId: '', activo: true,
};
const EMPTY_CAT  = { nombre: '', descripcion: '', icono: '' };
const EMPTY_SUB  = { categoriaId: '', nombre: '', descripcion: '' };

export default function BibliotecaAdmin() {
  const [tab, setTab]                   = useState(0);
  const [categorias, setCategorias]     = useState([]);
  const [libros, setLibros]             = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [success, setSuccess]           = useState('');

  // Dialogs
  const [libroDialog, setLibroDialog]   = useState({ open: false, editing: null });
  const [catDialog, setCatDialog]       = useState({ open: false, editing: null });
  const [subDialog, setSubDialog]       = useState({ open: false, editing: null });
  const [libroForm, setLibroForm]       = useState(EMPTY_LIBRO);
  const [catForm, setCatForm]           = useState(EMPTY_CAT);
  const [subForm, setSubForm]           = useState(EMPTY_SUB);
  const [archivo, setArchivo]           = useState(null);
  const [portada, setPortada]           = useState(null);
  const [expandedCat, setExpandedCat]   = useState(null);
  const [saving, setSaving]             = useState(false);

  // Sincronización desde filesystem
  const [syncLoading, setSyncLoading]   = useState(false);
  const [syncResult, setSyncResult]     = useState(null);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);

  const showSuccess = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3000); };

  const handleSincronizar = async () => {
    setSyncLoading(true);
    setError('');
    try {
      const res = await categoriasApi.sincronizar();
      setSyncResult(res.data);
      setSyncDialogOpen(true);
      await loadData(); // recargar para reflejar los cambios
    } catch (e) {
      setError(e.response?.data || 'Error al sincronizar desde carpetas.');
    } finally {
      setSyncLoading(false);
    }
  };

  const loadData = async () => {
    try {
      const [catRes, libRes] = await Promise.all([
        categoriasApi.getAll(),
        librosApi.buscar({ tamanoPagina: 200 }),
      ]);
      setCategorias(catRes.data);
      setLibros(libRes.data.items);
    } catch {
      setError('Error al cargar datos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // ─── Categorías ────────────────────────────────────────────────────────────
  const openCatDialog = (cat = null) => {
    setCatForm(cat ? { nombre: cat.nombre, descripcion: cat.descripcion ?? '', icono: cat.icono ?? '' } : EMPTY_CAT);
    setCatDialog({ open: true, editing: cat });
  };

  const saveCat = async () => {
    setSaving(true);
    try {
      if (catDialog.editing) {
        await categoriasApi.update(catDialog.editing.id, { ...catForm, activo: catDialog.editing.activo });
      } else {
        await categoriasApi.create(catForm);
      }
      await loadData();
      setCatDialog({ open: false, editing: null });
      showSuccess(catDialog.editing ? 'Categoría actualizada.' : 'Categoría creada.');
    } catch (e) {
      setError(e.response?.data || 'Error al guardar categoría.');
    } finally {
      setSaving(false);
    }
  };

  const deleteCat = async (id) => {
    if (!window.confirm('¿Eliminar categoría? Se eliminarán sus subcategorías asociadas.')) return;
    try {
      await categoriasApi.remove(id);
      await loadData();
      showSuccess('Categoría eliminada.');
    } catch (e) {
      setError(e.response?.data || 'Error al eliminar.');
    }
  };

  // ─── Libros ────────────────────────────────────────────────────────────────
  const openLibroDialog = (libro = null) => {
    setLibroForm(libro ? {
      titulo: libro.titulo, autor: libro.autor,
      descripcion: libro.descripcion ?? '', anioPublicacion: libro.anioPublicacion ?? '',
      isbn: libro.isbn ?? '', editorial: libro.editorial ?? '',
      nivelEducativo: libro.nivelEducativo ?? '', idioma: libro.idioma ?? '',
      totalPaginas: libro.totalPaginas ?? '',
      categoriaId: libro.categoriaId, subcategoriaId: libro.subcategoriaId ?? '',
      activo: libro.activo,
    } : EMPTY_LIBRO);
    setArchivo(null);
    setLibroDialog({ open: true, editing: libro });
  };

  const saveLibro = async () => {
    setSaving(true);
    try {
      if (libroDialog.editing) {
        const body = {
          ...libroForm,
          anioPublicacion: libroForm.anioPublicacion ? Number(libroForm.anioPublicacion) : null,
          totalPaginas: libroForm.totalPaginas ? Number(libroForm.totalPaginas) : null,
          subcategoriaId: libroForm.subcategoriaId || null,
        };
        await librosApi.update(libroDialog.editing.id, body);
        if (portada) {
          const fd = new FormData();
          fd.append('imagen', portada);
          await librosApi.actualizarPortada(libroDialog.editing.id, fd);
        }
      } else {
        if (!archivo) { setError('Selecciona un archivo PDF.'); setSaving(false); return; }
        const fd = new FormData();
        Object.entries(libroForm).forEach(([k, v]) => {
          if (v !== '' && v !== null && v !== undefined) fd.append(k, v);
        });
        fd.append('archivo', archivo);
        if (portada) fd.append('portada', portada);
        await librosApi.create(fd);
      }
      await loadData();
      setLibroDialog({ open: false, editing: null });
      showSuccess(libroDialog.editing ? 'Libro actualizado.' : 'Libro subido exitosamente.');
    } catch (e) {
      setError(e.response?.data || 'Error al guardar libro.');
    } finally {
      setSaving(false);
    }
  };

  // ─── Subcategorías ─────────────────────────────────────────────────────────
  const openSubDialog = (sub = null, categoriaId = '') => {
    setSubForm(sub
      ? { categoriaId: sub.categoriaId, nombre: sub.nombre, descripcion: sub.descripcion ?? '' }
      : { ...EMPTY_SUB, categoriaId });
    setSubDialog({ open: true, editing: sub });
  };

  const saveSub = async () => {
    setSaving(true);
    try {
      if (subDialog.editing) {
        await categoriasApi.updateSubcategoria(subDialog.editing.id, {
          nombre: subForm.nombre,
          descripcion: subForm.descripcion,
          activo: subDialog.editing.activo,
        });
      } else {
        await categoriasApi.createSubcategoria(subForm.categoriaId, {
          categoriaId: subForm.categoriaId,
          nombre: subForm.nombre,
          descripcion: subForm.descripcion,
        });
      }
      await loadData();
      setSubDialog({ open: false, editing: null });
      showSuccess(subDialog.editing ? 'Subcategoría actualizada.' : 'Subcategoría creada.');
    } catch (e) {
      setError(e.response?.data || 'Error al guardar subcategoría.');
    } finally {
      setSaving(false);
    }
  };

  const deleteSub = async (id) => {
    if (!window.confirm('¿Eliminar subcategoría?')) return;
    try {
      await categoriasApi.removeSubcategoria(id);
      await loadData();
      showSuccess('Subcategoría eliminada.');
    } catch (e) {
      setError(e.response?.data || 'Error al eliminar.');
    }
  };

  const deleteLibro = async (id) => {
    if (!window.confirm('¿Eliminar este libro?')) return;
    try {
      await librosApi.remove(id);
      await loadData();
      showSuccess('Libro eliminado.');
    } catch (e) {
      setError(e.response?.data || 'Error al eliminar.');
    }
  };

  const subcatsDeCategoria = categorias
    .find(c => c.id === libroForm.categoriaId)
    ?.subcategorias ?? [];

  // Separar cuatrimestres (auto-sync) de categorías manuales
  const cuatrimestres    = categorias.filter(c => c.orden >= 1 && c.orden <= 6);
  const catsManuales     = categorias.filter(c => !(c.orden >= 1 && c.orden <= 6));

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between"
             alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2} mb={3}>
        <Box>
          <Typography variant="h4" fontWeight={800}>Gestión de Biblioteca Virtual</Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Administra categorías, subcategorías y libros del acervo digital.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={syncLoading ? <CircularProgress size={16} color="inherit" /> : <SyncIcon />}
          onClick={handleSincronizar}
          disabled={syncLoading}
          sx={{ whiteSpace: 'nowrap', bgcolor: '#1a237e', '&:hover': { bgcolor: '#283593' } }}
        >
          {syncLoading ? 'Sincronizando…' : 'Sincronizar desde carpetas'}
        </Button>
      </Stack>

      {error   && <Alert severity="error"   sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label={`Libros (${libros.length})`} />
        <Tab label={`Categorías (${categorias.length})`} />
        <Tab label="Subcategorías" />
      </Tabs>

      {/* ── Libros ─────────────────────────────────────────────────────────── */}
      {tab === 0 && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => openLibroDialog()}>
              Subir libro
            </Button>
          </Box>
          <Paper>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Título</TableCell>
                  <TableCell>Autor</TableCell>
                  <TableCell>Categoría</TableCell>
                  <TableCell>Nivel</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align="center">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {libros.map(l => (
                  <TableRow key={l.id} hover>
                    <TableCell><Typography variant="body2" fontWeight={600}>{l.titulo}</Typography></TableCell>
                    <TableCell>{l.autor}</TableCell>
                    <TableCell>{l.categoriaNombre}</TableCell>
                    <TableCell>{l.nivelEducativo ?? '—'}</TableCell>
                    <TableCell>
                      <Chip label={l.activo ? 'Activo' : 'Inactivo'}
                        color={l.activo ? 'success' : 'default'} size="small" />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Editar">
                        <IconButton size="small" onClick={() => openLibroDialog(l)}><EditIcon fontSize="small" /></IconButton>
                      </Tooltip>
                      <Tooltip title="Eliminar">
                        <IconButton size="small" color="error" onClick={() => deleteLibro(l.id)}><DeleteIcon fontSize="small" /></IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </>
      )}

      {/* ── Categorías ──────────────────────────────────────────────────────── */}
      {tab === 1 && (
        <>
          {/* Cuatrimestres — solo lectura, gestionados por sincronización */}
          {cuatrimestres.length > 0 && (
            <Box mb={3}>
              <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                <FolderIcon fontSize="small" color="action" />
                <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
                  Cuatrimestres — gestionados por sincronización
                </Typography>
                <Chip label={cuatrimestres.length} size="small" />
              </Stack>
              <Paper variant="outlined">
                <Table size="small">
                  <TableBody>
                    {cuatrimestres.map(c => (
                      <TableRow key={c.id}>
                        <TableCell>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            {c.icono && <span>{c.icono}</span>}
                            <Typography variant="body2" fontWeight={600}>{c.nombre}</Typography>
                          </Stack>
                        </TableCell>
                        <TableCell sx={{ color: 'text.secondary', fontSize: 13 }}>
                          {c.subcategorias?.length ?? 0} materias · {c.totalLibros} libros
                        </TableCell>
                        <TableCell align="right">
                          <Chip label="Sincronizado" size="small"
                            icon={<SyncIcon sx={{ fontSize: '14px !important' }} />}
                            sx={{ fontSize: 11, color: 'text.secondary', bgcolor: '#f5f5f5' }} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            </Box>
          )}

          {/* Categorías manuales — editables */}
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
                Categorías personalizadas
              </Typography>
              <Button variant="contained" startIcon={<AddIcon />} size="small" onClick={() => openCatDialog()}>
                Nueva categoría
              </Button>
            </Stack>
            {catsManuales.length === 0 ? (
              <Alert severity="info" sx={{ mt: 1 }}>
                No hay categorías personalizadas. Puedes crear una para libros que no pertenezcan a los cuatrimestres.
              </Alert>
            ) : (
              <Paper>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Nombre</TableCell>
                      <TableCell>Subcategorías</TableCell>
                      <TableCell>Libros</TableCell>
                      <TableCell>Estado</TableCell>
                      <TableCell align="center">Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {catsManuales.map(c => (
                      <TableRow key={c.id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {c.icono && <span>{c.icono}</span>}
                            <Typography variant="body2" fontWeight={600}>{c.nombre}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>{c.subcategorias?.length ?? 0}</TableCell>
                        <TableCell>{c.totalLibros}</TableCell>
                        <TableCell>
                          <Chip label={c.activo ? 'Activa' : 'Inactiva'}
                            color={c.activo ? 'success' : 'default'} size="small" />
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="Editar">
                            <IconButton size="small" onClick={() => openCatDialog(c)}><EditIcon fontSize="small" /></IconButton>
                          </Tooltip>
                          <Tooltip title="Eliminar">
                            <IconButton size="small" color="error" onClick={() => deleteCat(c.id)}><DeleteIcon fontSize="small" /></IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            )}
          </Box>
        </>
      )}

      {/* ── Subcategorías ───────────────────────────────────────────────────── */}
      {tab === 2 && (
        <Paper>
          {categorias.map(cat => {
            const subs = cat.subcategorias ?? [];
            const open = expandedCat === cat.id;
            return (
              <Box key={cat.id} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                <Box sx={{
                  display: 'flex', alignItems: 'center', px: 2, py: 1.5,
                  cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' },
                }} onClick={() => setExpandedCat(open ? null : cat.id)}>
                  <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    {cat.icono && <span>{cat.icono}</span>}
                    <Typography fontWeight={700}>{cat.nombre}</Typography>
                    <Chip label={`${subs.length} subcategorías`} size="small" sx={{ ml: 1 }} />
                  </Box>
                  <Button size="small" startIcon={<AddIcon />}
                    onClick={e => { e.stopPropagation(); openSubDialog(null, cat.id); }}>
                    Agregar
                  </Button>
                  {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </Box>

                <Collapse in={open}>
                  <Table size="small" sx={{ ml: 4 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell>Nombre</TableCell>
                        <TableCell>Descripción</TableCell>
                        <TableCell>Estado</TableCell>
                        <TableCell align="center">Acciones</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {subs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} align="center" sx={{ color: 'text.secondary', py: 2 }}>
                            Sin subcategorías
                          </TableCell>
                        </TableRow>
                      ) : subs.map(s => (
                        <TableRow key={s.id} hover>
                          <TableCell fontWeight={600}>{s.nombre}</TableCell>
                          <TableCell sx={{ color: 'text.secondary' }}>{s.descripcion ?? '—'}</TableCell>
                          <TableCell>
                            <Chip label={s.activo ? 'Activa' : 'Inactiva'}
                              color={s.activo ? 'success' : 'default'} size="small" />
                          </TableCell>
                          <TableCell align="center">
                            <Tooltip title="Editar">
                              <IconButton size="small" onClick={() => openSubDialog(s)}><EditIcon fontSize="small" /></IconButton>
                            </Tooltip>
                            <Tooltip title="Eliminar">
                              <IconButton size="small" color="error" onClick={() => deleteSub(s.id)}><DeleteIcon fontSize="small" /></IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Collapse>
              </Box>
            );
          })}
        </Paper>
      )}

      {/* ── Dialog Libro ────────────────────────────────────────────────────── */}
      <Dialog open={libroDialog.open} onClose={() => setLibroDialog({ open: false, editing: null })}
        maxWidth="sm" fullWidth>
        <DialogTitle>{libroDialog.editing ? 'Editar libro' : 'Subir nuevo libro'}</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField label="Título *" value={libroForm.titulo}
              onChange={e => setLibroForm(p => ({ ...p, titulo: e.target.value }))} fullWidth />
            <TextField label="Autor *" value={libroForm.autor}
              onChange={e => setLibroForm(p => ({ ...p, autor: e.target.value }))} fullWidth />
            <TextField label="Descripción" value={libroForm.descripcion} multiline rows={3}
              onChange={e => setLibroForm(p => ({ ...p, descripcion: e.target.value }))} fullWidth />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField select label="Categoría *" value={libroForm.categoriaId} fullWidth
                onChange={e => setLibroForm(p => ({ ...p, categoriaId: e.target.value, subcategoriaId: '' }))}>
                {categorias.map(c => <MenuItem key={c.id} value={c.id}>{c.nombre}</MenuItem>)}
              </TextField>
              {subcatsDeCategoria.length > 0 && (
                <TextField select label="Subcategoría" value={libroForm.subcategoriaId} fullWidth
                  onChange={e => setLibroForm(p => ({ ...p, subcategoriaId: e.target.value }))}>
                  <MenuItem value="">Ninguna</MenuItem>
                  {subcatsDeCategoria.map(s => <MenuItem key={s.id} value={s.id}>{s.nombre}</MenuItem>)}
                </TextField>
              )}
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField label="Año publicación" type="number" value={libroForm.anioPublicacion}
                onChange={e => setLibroForm(p => ({ ...p, anioPublicacion: e.target.value }))} fullWidth />
              <TextField label="ISBN" value={libroForm.isbn}
                onChange={e => setLibroForm(p => ({ ...p, isbn: e.target.value }))} fullWidth />
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField label="Editorial" value={libroForm.editorial}
                onChange={e => setLibroForm(p => ({ ...p, editorial: e.target.value }))} fullWidth />
              <TextField label="Páginas" type="number" value={libroForm.totalPaginas}
                onChange={e => setLibroForm(p => ({ ...p, totalPaginas: e.target.value }))} fullWidth />
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField label="Nivel educativo" value={libroForm.nivelEducativo}
                onChange={e => setLibroForm(p => ({ ...p, nivelEducativo: e.target.value }))} fullWidth />
              <TextField label="Idioma" value={libroForm.idioma}
                onChange={e => setLibroForm(p => ({ ...p, idioma: e.target.value }))} fullWidth />
            </Box>

            {libroDialog.editing && (
              <FormControlLabel
                control={<Switch checked={libroForm.activo}
                  onChange={e => setLibroForm(p => ({ ...p, activo: e.target.checked }))} />}
                label="Activo"
              />
            )}

            {!libroDialog.editing && (
              <Button variant="outlined" component="label" startIcon={<UploadFileIcon />}
                color={archivo ? 'success' : 'primary'}>
                {archivo ? `✓ ${archivo.name}` : 'Seleccionar PDF *'}
                <input type="file" accept="application/pdf" hidden
                  onChange={e => setArchivo(e.target.files[0] || null)} />
              </Button>
            )}

            <Button variant="outlined" component="label" startIcon={<ImageIcon />}
              color={portada ? 'success' : 'inherit'}>
              {portada ? `✓ ${portada.name}` : 'Portada (opcional)'}
              <input type="file" accept="image/jpeg,image/png,image/webp" hidden
                onChange={e => setPortada(e.target.files[0] || null)} />
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLibroDialog({ open: false, editing: null })}>Cancelar</Button>
          <Button variant="contained" onClick={saveLibro} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : (libroDialog.editing ? 'Guardar' : 'Subir')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog Categoría ────────────────────────────────────────────────── */}
      <Dialog open={catDialog.open} onClose={() => setCatDialog({ open: false, editing: null })}
        maxWidth="xs" fullWidth>
        <DialogTitle>{catDialog.editing ? 'Editar categoría' : 'Nueva categoría'}</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField label="Nombre *" value={catForm.nombre}
              onChange={e => setCatForm(p => ({ ...p, nombre: e.target.value }))} fullWidth />
            <TextField label="Descripción" value={catForm.descripcion} multiline rows={2}
              onChange={e => setCatForm(p => ({ ...p, descripcion: e.target.value }))} fullWidth />
            <TextField label="Ícono (emoji)" value={catForm.icono}
              onChange={e => setCatForm(p => ({ ...p, icono: e.target.value }))}
              placeholder="📚" inputProps={{ maxLength: 4 }} fullWidth />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCatDialog({ open: false, editing: null })}>Cancelar</Button>
          <Button variant="contained" onClick={saveCat} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog Subcategoría ─────────────────────────────────────────────── */}
      <Dialog open={subDialog.open} onClose={() => setSubDialog({ open: false, editing: null })}
        maxWidth="xs" fullWidth>
        <DialogTitle>{subDialog.editing ? 'Editar subcategoría' : 'Nueva subcategoría'}</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {!subDialog.editing && (
              <TextField select label="Categoría *" value={subForm.categoriaId} fullWidth
                onChange={e => setSubForm(p => ({ ...p, categoriaId: e.target.value }))}>
                {categorias.map(c => <MenuItem key={c.id} value={c.id}>{c.nombre}</MenuItem>)}
              </TextField>
            )}
            <TextField label="Nombre *" value={subForm.nombre}
              onChange={e => setSubForm(p => ({ ...p, nombre: e.target.value }))} fullWidth />
            <TextField label="Descripción" value={subForm.descripcion} multiline rows={2}
              onChange={e => setSubForm(p => ({ ...p, descripcion: e.target.value }))} fullWidth />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSubDialog({ open: false, editing: null })}>Cancelar</Button>
          <Button variant="contained" onClick={saveSub}
            disabled={saving || !subForm.nombre.trim() || (!subDialog.editing && !subForm.categoriaId)}>
            {saving ? <CircularProgress size={20} /> : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog Resultado de Sincronización ──────────────────────────────── */}
      <Dialog open={syncDialogOpen} onClose={() => setSyncDialogOpen(false)}
        maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <CheckCircleIcon color="success" />
            <Typography variant="h6" fontWeight={700}>Sincronización completada</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          {syncResult && (
            <Box>
              {/* Resumen en chips */}
              <Stack direction="row" flexWrap="wrap" gap={1.5} mb={3}>
                <Box sx={{ textAlign: 'center', p: 1.5, borderRadius: 2, bgcolor: '#e8f5e9', minWidth: 110 }}>
                  <Typography variant="h4" fontWeight={800} color="#2e7d32">
                    {syncResult.categoriasCreadas}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">Categorías creadas</Typography>
                </Box>
                <Box sx={{ textAlign: 'center', p: 1.5, borderRadius: 2, bgcolor: '#e3f2fd', minWidth: 110 }}>
                  <Typography variant="h4" fontWeight={800} color="#1565c0">
                    {syncResult.subcategoriasCreadas}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">Subcategorías creadas</Typography>
                </Box>
                <Box sx={{ textAlign: 'center', p: 1.5, borderRadius: 2, bgcolor: '#fff3e0', minWidth: 110 }}>
                  <Typography variant="h4" fontWeight={800} color="#e65100">
                    {syncResult.librosRegistrados}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">Libros registrados</Typography>
                </Box>
                <Box sx={{ textAlign: 'center', p: 1.5, borderRadius: 2, bgcolor: '#f5f5f5', minWidth: 110 }}>
                  <Typography variant="h4" fontWeight={800} color="text.secondary">
                    {syncResult.librosOmitidos}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">Libros omitidos</Typography>
                </Box>
              </Stack>

              {/* Progreso visual */}
              {syncResult.librosRegistrados + syncResult.librosOmitidos > 0 && (
                <Box mb={2}>
                  <Stack direction="row" justifyContent="space-between" mb={0.5}>
                    <Typography variant="caption" color="text.secondary">
                      PDFs procesados
                    </Typography>
                    <Typography variant="caption" fontWeight={700}>
                      {syncResult.librosRegistrados} / {syncResult.librosRegistrados + syncResult.librosOmitidos}
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={(syncResult.librosRegistrados /
                      (syncResult.librosRegistrados + syncResult.librosOmitidos)) * 100}
                    sx={{ height: 8, borderRadius: 4,
                          '& .MuiLinearProgress-bar': { bgcolor: '#43a047' } }}
                  />
                </Box>
              )}

              <Divider sx={{ my: 2 }} />

              {/* Log detallado */}
              <Typography variant="subtitle2" fontWeight={700} mb={1} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <FolderIcon fontSize="small" color="action" />
                Registro detallado ({syncResult.detalles?.length ?? 0} entradas)
              </Typography>
              <Paper variant="outlined" sx={{ maxHeight: 260, overflow: 'auto', bgcolor: '#fafafa' }}>
                <List dense disablePadding>
                  {(syncResult.detalles ?? []).map((d, i) => (
                    <ListItem key={i} divider sx={{ py: 0.5 }}>
                      <ListItemText
                        primary={d}
                        primaryTypographyProps={{ variant: 'caption', fontFamily: 'monospace' }}
                      />
                    </ListItem>
                  ))}
                  {(!syncResult.detalles || syncResult.detalles.length === 0) && (
                    <ListItem>
                      <ListItemText primary="Sin detalles adicionales."
                        primaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }} />
                    </ListItem>
                  )}
                </List>
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setSyncDialogOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}
