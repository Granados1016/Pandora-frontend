import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Button, Paper, Typography, Table, TableHead, TableBody,
  TableRow, TableCell, TableContainer, IconButton, Chip, Stack, Avatar,
  Dialog, DialogTitle, DialogContent, DialogActions, Grid,
  TextField, Switch, FormControlLabel, CircularProgress, Alert, Tooltip,
} from '@mui/material';
import AddIcon          from '@mui/icons-material/Add';
import EditIcon         from '@mui/icons-material/Edit';
import DeleteIcon       from '@mui/icons-material/Delete';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import PhotoCameraIcon  from '@mui/icons-material/PhotoCamera';
import { flotillaApi } from '../../api/pandoraApi';
import { apiError } from '../../api/apiError';

const EMPTY = {
  nombre: '', placa: '', marca: '', modelo: '', anio: '', color: '',
  capacidad: 5, colorEtiqueta: '#1565c0', notas: '', isActive: true, fotoBase64: null,
};

export default function VehiculosManager() {
  const [vehiculos, setVehiculos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [dlg, setDlg]         = useState(null);   // objeto en edición/creación
  const [saving, setSaving]   = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    flotillaApi.getVehiculos(true)   // incluye inactivos (admin)
      .then(r => setVehiculos(r.data))
      .catch(() => setError('Error al cargar vehículos.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const openNew  = () => { setError(''); setDlg({ ...EMPTY }); };
  const openEdit = (v) => {
    setError('');
    setDlg({
      id: v.id, nombre: v.nombre, placa: v.placa || '', marca: v.marca || '',
      modelo: v.modelo || '', anio: v.anio ?? '', color: v.color || '',
      capacidad: v.capacidad ?? 5, colorEtiqueta: v.colorEtiqueta || '#1565c0',
      notas: v.notas || '', isActive: v.isActive, fotoBase64: null, hasFoto: v.hasFoto,
    });
  };

  const onFotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setDlg(prev => ({ ...prev, fotoBase64: reader.result }));
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    const d = dlg;
    if (!d.nombre.trim()) { setError('El nombre del vehículo es obligatorio.'); return; }
    const payload = {
      nombre: d.nombre.trim(), placa: d.placa || null, marca: d.marca || null,
      modelo: d.modelo || null, anio: d.anio === '' ? null : Number(d.anio),
      color: d.color || null, capacidad: Number(d.capacidad) || 5,
      colorEtiqueta: d.colorEtiqueta || null, notas: d.notas || null,
      isActive: d.isActive, fotoBase64: d.fotoBase64,
    };
    setSaving(true);
    try {
      if (d.id) await flotillaApi.updateVehiculo(d.id, payload);
      else      await flotillaApi.createVehiculo(payload);
      setDlg(null);
      load();
    } catch (e) {
      setError(apiError(e, 'Error al guardar el vehículo.'));
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Desactivar este vehículo? No se eliminarán sus reservas.')) return;
    try { await flotillaApi.deleteVehiculo(id); load(); }
    catch { setError('Error al eliminar.'); }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openNew} sx={{ borderRadius: 2 }}>
          Nuevo vehículo
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
                <TableCell sx={{ fontWeight: 700 }}>Vehículo</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Placa</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Marca / Modelo</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Capacidad</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Estado</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {vehiculos.length === 0 ? (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  No hay vehículos registrados.
                </TableCell></TableRow>
              ) : vehiculos.map(v => (
                <TableRow key={v.id} hover sx={{ opacity: v.isActive ? 1 : 0.55 }}>
                  <TableCell>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Avatar variant="rounded" src={v.hasFoto ? flotillaApi.getFotoUrl(v.id) : undefined}
                        sx={{ width: 40, height: 40, bgcolor: v.colorEtiqueta || '#1565c0' }}>
                        <DirectionsCarIcon fontSize="small" />
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>{v.nombre}</Typography>
                        {v.color && <Typography variant="caption" color="text.secondary">{v.color}</Typography>}
                      </Box>
                    </Stack>
                  </TableCell>
                  <TableCell>{v.placa || '—'}</TableCell>
                  <TableCell>{[v.marca, v.modelo, v.anio].filter(Boolean).join(' ') || '—'}</TableCell>
                  <TableCell align="center">
                    <Chip icon={<DirectionsCarIcon />} label={`${v.capacidad} pas.`} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell align="center">
                    <Chip label={v.isActive ? 'Activo' : 'Inactivo'} color={v.isActive ? 'success' : 'default'} size="small" />
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      <Tooltip title="Editar">
                        <IconButton size="small" onClick={() => openEdit(v)}><EditIcon fontSize="small" /></IconButton>
                      </Tooltip>
                      {v.isActive && (
                        <Tooltip title="Desactivar">
                          <IconButton size="small" color="error" onClick={() => handleDelete(v.id)}><DeleteIcon fontSize="small" /></IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Dialog vehículo */}
      <Dialog open={!!dlg} onClose={() => setDlg(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle fontWeight={700}>{dlg?.id ? 'Editar vehículo' : 'Nuevo vehículo'}</DialogTitle>
        <DialogContent dividers>
          {dlg && (
            <Grid container spacing={1.5} sx={{ mt: 0 }}>
              <Grid item xs={12} sm={8}>
                <TextField fullWidth size="small" label="Nombre / alias *" value={dlg.nombre}
                  onChange={e => setDlg({ ...dlg, nombre: e.target.value })}
                  helperText="Ej. Camioneta blanca, Nissan NP300" />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth size="small" label="Placa" value={dlg.placa}
                  onChange={e => setDlg({ ...dlg, placa: e.target.value })} />
              </Grid>
              <Grid item xs={6} sm={4}>
                <TextField fullWidth size="small" label="Marca" value={dlg.marca}
                  onChange={e => setDlg({ ...dlg, marca: e.target.value })} />
              </Grid>
              <Grid item xs={6} sm={4}>
                <TextField fullWidth size="small" label="Modelo" value={dlg.modelo}
                  onChange={e => setDlg({ ...dlg, modelo: e.target.value })} />
              </Grid>
              <Grid item xs={6} sm={4}>
                <TextField fullWidth size="small" type="number" label="Año" value={dlg.anio}
                  onChange={e => setDlg({ ...dlg, anio: e.target.value })} />
              </Grid>
              <Grid item xs={6} sm={4}>
                <TextField fullWidth size="small" label="Color" value={dlg.color}
                  onChange={e => setDlg({ ...dlg, color: e.target.value })} />
              </Grid>
              <Grid item xs={6} sm={4}>
                <TextField fullWidth size="small" type="number" label="Capacidad" value={dlg.capacidad}
                  onChange={e => setDlg({ ...dlg, capacidad: e.target.value })} inputProps={{ min: 1 }} />
              </Grid>
              <Grid item xs={6} sm={4}>
                <TextField fullWidth size="small" type="color" label="Color etiqueta" InputLabelProps={{ shrink: true }}
                  value={dlg.colorEtiqueta} onChange={e => setDlg({ ...dlg, colorEtiqueta: e.target.value })} />
              </Grid>
              <Grid item xs={12}>
                <Button component="label" variant="outlined" startIcon={<PhotoCameraIcon />} sx={{ borderRadius: 2 }}>
                  {dlg.fotoBase64 ? 'Foto seleccionada' : (dlg.hasFoto ? 'Cambiar foto' : 'Subir foto')}
                  <input hidden type="file" accept="image/*" onChange={onFotoChange} />
                </Button>
                {dlg.fotoBase64 && (
                  <Avatar variant="rounded" src={dlg.fotoBase64} sx={{ width: 64, height: 64, mt: 1 }} />
                )}
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth size="small" multiline minRows={2} label="Notas" value={dlg.notas}
                  onChange={e => setDlg({ ...dlg, notas: e.target.value })} />
              </Grid>
              {dlg.id && (
                <Grid item xs={12}>
                  <FormControlLabel
                    control={<Switch checked={dlg.isActive} onChange={e => setDlg({ ...dlg, isActive: e.target.checked })} />}
                    label="Vehículo activo"
                  />
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDlg(null)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
