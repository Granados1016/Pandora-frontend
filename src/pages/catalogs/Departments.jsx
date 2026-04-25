import React, { useEffect, useState } from 'react';
import {
  Box, Button, Paper, Typography, Table, TableHead, TableBody,
  TableRow, TableCell, TableContainer, IconButton, Chip, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, CircularProgress, Alert, Stack,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PeopleIcon from '@mui/icons-material/People';
import TagIcon from '@mui/icons-material/Tag';
import { catalogApi } from '../../api/pandoraApi';

const EMPTY = { name: '', description: '', inventoryPrefix: '', isActive: true };

export default function Departments() {
  const [depts, setDepts]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [open, setOpen]       = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm]       = useState(EMPTY);
  const [saving, setSaving]   = useState(false);

  const load = () => {
    setLoading(true);
    catalogApi.getDepartments()
      .then(r => setDepts(r.data))
      .catch(() => setError('Error al cargar departamentos.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openNew  = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (d) => {
    setEditing(d);
    setForm({ name: d.name, description: d.description || '', inventoryPrefix: d.inventoryPrefix || '', isActive: d.isActive });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await catalogApi.updateDepartment(editing.id, form);
      } else {
        await catalogApi.createDepartment(form);
      }
      setOpen(false);
      load();
    } catch (e) {
      setError(e.response?.data || 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (d) => {
    if (d.employeeCount > 0) {
      setError(`No se puede eliminar "${d.name}": tiene ${d.employeeCount} empleado(s) asignado(s).`);
      return;
    }
    if (!window.confirm(`¿Eliminar el departamento "${d.name}"?`)) return;
    try {
      await catalogApi.deleteDepartment(d.id);
      load();
    } catch (e) {
      setError(e.response?.data || 'Error al eliminar.');
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Departamentos</Typography>
          <Typography variant="body2" color="text.secondary">Áreas y departamentos de la institución</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openNew} sx={{ borderRadius: 2 }}>
          Nuevo departamento
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
                <TableCell sx={{ fontWeight: 700 }}>Prefijo inventario</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">
                  <Stack direction="row" alignItems="center" spacing={0.5} justifyContent="center">
                    <PeopleIcon fontSize="small" />
                    <span>Personal</span>
                  </Stack>
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Estado</TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {depts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No hay departamentos registrados.
                  </TableCell>
                </TableRow>
              ) : depts.map(d => (
                <TableRow key={d.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{d.name}</TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>{d.description || '—'}</TableCell>
                  <TableCell>
                    {d.inventoryPrefix
                      ? <Chip icon={<TagIcon />} label={d.inventoryPrefix} size="small" color="primary" variant="outlined" sx={{ fontFamily: 'monospace', fontWeight: 700 }} />
                      : <Typography variant="caption" color="text.disabled">Sin prefijo</Typography>
                    }
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      icon={<PeopleIcon />}
                      label={d.employeeCount}
                      size="small"
                      color={d.employeeCount > 0 ? 'primary' : 'default'}
                      variant={d.employeeCount > 0 ? 'filled' : 'outlined'}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Chip label={d.isActive ? 'Activo' : 'Inactivo'} size="small" color={d.isActive ? 'success' : 'default'} />
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      <Tooltip title="Editar">
                        <IconButton size="small" onClick={() => openEdit(d)}><EditIcon fontSize="small" /></IconButton>
                      </Tooltip>
                      <Tooltip title={d.employeeCount > 0 ? 'Tiene personal asignado' : 'Eliminar'}>
                        <span>
                          <IconButton size="small" color="error" disabled={d.employeeCount > 0} onClick={() => handleDelete(d)}>
                            <DeleteIcon fontSize="small" />
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

      {/* Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle fontWeight={700}>{editing ? 'Editar departamento' : 'Nuevo departamento'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Nombre *" value={form.name} autoFocus fullWidth
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
            <TextField
              label="Descripción" value={form.description} fullWidth multiline rows={2}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
            <TextField
              label="Prefijo de inventario"
              value={form.inventoryPrefix}
              placeholder="Ej: EQT-TI"
              fullWidth
              inputProps={{ style: { textTransform: 'uppercase', fontFamily: 'monospace' } }}
              helperText="Se usará para generar números automáticos: EQT-TI-0001, EQT-TI-0002…"
              onChange={e => setForm(f => ({ ...f, inventoryPrefix: e.target.value.toUpperCase() }))}
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
