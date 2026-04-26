import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Button, Paper, Typography, Table, TableHead, TableBody,
  TableRow, TableCell, TableContainer, IconButton, Chip, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Switch, FormControlLabel, CircularProgress, Alert, Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import { calendarApi } from '../../api/pandoraApi';
import { apiError } from '../../api/apiError';

const COLORS = [
  '#1976d2', '#388e3c', '#d32f2f', '#7b1fa2',
  '#f57c00', '#0288d1', '#00796b', '#c62828',
  '#ad1457', '#455a64',
];

const EMPTY = { name: '', description: '', capacity: 10, location: '', color: '#1976d2', isActive: true };

export default function RoomsManager() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    calendarApi.getRooms()
      .then(r => setRooms(r.data))
      .catch(() => setError('Error al cargar salas.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const openNew = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (room) => {
    setEditing(room);
    setForm({ name: room.name, description: room.description || '', capacity: room.capacity, location: room.location || '', color: room.color, isActive: room.isActive });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.name) { setError('El nombre es obligatorio.'); return; }
    setSaving(true);
    try {
      if (editing) await calendarApi.updateRoom(editing.id, form);
      else await calendarApi.createRoom(form);
      setOpen(false);
      load();
    } catch (e) {
      setError(apiError(e, 'Error al guardar.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Desactivar esta sala?')) return;
    try { await calendarApi.deleteRoom(id); load(); }
    catch { setError('Error al eliminar.'); }
  };

  const f = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }));

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Salas</Typography>
          <Typography variant="body2" color="text.secondary">Gestión de salas para el Pandora Calendar</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openNew} sx={{ borderRadius: 2 }}>
          Nueva sala
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
                <TableCell sx={{ fontWeight: 700 }}>Sala</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Ubicación</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Capacidad</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Estado</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rooms.length === 0 ? (
                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  No hay salas registradas.
                </TableCell></TableRow>
              ) : rooms.map(r => (
                <TableRow key={r.id} hover>
                  <TableCell>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: r.color, flexShrink: 0 }} />
                      <Box>
                        <Typography variant="body2" fontWeight={600}>{r.name}</Typography>
                        {r.description && <Typography variant="caption" color="text.secondary">{r.description}</Typography>}
                      </Box>
                    </Stack>
                  </TableCell>
                  <TableCell>{r.location || '—'}</TableCell>
                  <TableCell align="center">
                    <Chip icon={<MeetingRoomIcon />} label={`${r.capacity} personas`} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell align="center">
                    <Chip label={r.isActive ? 'Activa' : 'Inactiva'} color={r.isActive ? 'success' : 'default'} size="small" />
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      <Tooltip title="Editar">
                        <IconButton size="small" onClick={() => openEdit(r)}><EditIcon fontSize="small" /></IconButton>
                      </Tooltip>
                      <Tooltip title="Desactivar">
                        <IconButton size="small" color="error" onClick={() => handleDelete(r.id)}><DeleteIcon fontSize="small" /></IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Dialog sala */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle fontWeight={700}>{editing ? 'Editar sala' : 'Nueva sala'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField label="Nombre *" value={form.name} onChange={f('name')} fullWidth size="small" />
            <TextField label="Descripción" value={form.description} onChange={f('description')} fullWidth size="small" multiline rows={2} />
            <Stack direction="row" spacing={2}>
              <TextField label="Capacidad" type="number" value={form.capacity} onChange={f('capacity')} fullWidth size="small" inputProps={{ min: 1 }} />
              <TextField label="Ubicación" value={form.location} onChange={f('location')} fullWidth size="small" />
            </Stack>
            {/* Color picker simple */}
            <Box>
              <Typography variant="caption" color="text.secondary" display="block" mb={1}>Color en el calendario</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {COLORS.map(c => (
                  <Box
                    key={c} onClick={() => setForm(p => ({ ...p, color: c }))}
                    sx={{
                      width: 28, height: 28, borderRadius: '50%', bgcolor: c, cursor: 'pointer',
                      border: form.color === c ? '3px solid #000' : '3px solid transparent',
                      transition: 'border 0.15s',
                    }}
                  />
                ))}
              </Stack>
            </Box>
            {editing && (
              <FormControlLabel
                control={<Switch checked={form.isActive} onChange={e => setForm(p => ({ ...p, isActive: e.target.checked }))} />}
                label="Sala activa"
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
