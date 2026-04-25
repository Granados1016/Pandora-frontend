import React, { useEffect, useState } from 'react';
import {
  Box, Button, Paper, Typography, Table, TableHead, TableBody,
  TableRow, TableCell, TableContainer, IconButton, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, CircularProgress, Alert, Tooltip, Stack,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { inventoryApi } from '../../api/pandoraApi';

const EMPTY = { name: '', description: '', department: '', isActive: true };

export default function InventoryTypes() {
  const [types, setTypes]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [open, setOpen]       = useState(false);
  const [editing, setEditing] = useState(null);   // null = nuevo
  const [form, setForm]       = useState(EMPTY);
  const [saving, setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(null);

  const load = () => {
    setLoading(true);
    inventoryApi.getTypes()
      .then(r => setTypes(r.data))
      .catch(() => setError('Error al cargar categorías.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openNew  = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (t) => {
    setEditing(t);
    setForm({ name: t.name, description: t.description || '', department: t.department || '', isActive: t.isActive });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await inventoryApi.updateType(editing.id, form);
      } else {
        await inventoryApi.createType(form);
      }
      setOpen(false);
      load();
    } catch (e) {
      setError(e.response?.data || 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setDeleting(id);
    try {
      await inventoryApi.deleteType(id);
      load();
    } catch (e) {
      setError(e.response?.data || 'No se puede eliminar.');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Categorías de Inventario</Typography>
          <Typography variant="body2" color="text.secondary">Tipos de equipos registrados en el sistema</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openNew} sx={{ borderRadius: 2 }}>
          Nueva categoría
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 6 }}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 700 }}>Nombre</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Descripción</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Departamento</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Equipos</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Estado</TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {types.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No hay categorías registradas. Crea la primera.
                  </TableCell>
                </TableRow>
              ) : types.map(t => (
                <TableRow key={t.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{t.name}</TableCell>
                  <TableCell sx={{ color: 'text.secondary', maxWidth: 220 }}>{t.description || '—'}</TableCell>
                  <TableCell>{t.department || '—'}</TableCell>
                  <TableCell align="center">
                    <Chip label={t.itemCount} size="small" color={t.itemCount > 0 ? 'primary' : 'default'} />
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={t.isActive ? 'Activo' : 'Inactivo'}
                      size="small"
                      color={t.isActive ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      <Tooltip title="Editar">
                        <IconButton size="small" onClick={() => openEdit(t)}><EditIcon fontSize="small" /></IconButton>
                      </Tooltip>
                      <Tooltip title={t.itemCount > 0 ? 'Tiene equipos asociados' : 'Eliminar'}>
                        <span>
                          <IconButton
                            size="small" color="error"
                            disabled={t.itemCount > 0 || deleting === t.id}
                            onClick={() => handleDelete(t.id)}
                          >
                            {deleting === t.id ? <CircularProgress size={16} /> : <DeleteIcon fontSize="small" />}
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Dialog crear/editar */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle fontWeight={700}>{editing ? 'Editar categoría' : 'Nueva categoría'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Nombre *" value={form.name} fullWidth autoFocus
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
            <TextField
              label="Descripción" value={form.description} fullWidth multiline rows={2}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
            <TextField
              label="Departamento" value={form.department} fullWidth
              onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave} disabled={!form.name.trim() || saving}>
            {saving ? <CircularProgress size={20} /> : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
