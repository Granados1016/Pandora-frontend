import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Button, Paper, Typography, Table, TableHead, TableBody,
  TableRow, TableCell, TableContainer, IconButton, Chip, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, CircularProgress, Alert, Stack,
  InputAdornment, Grid, Avatar,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import BadgeIcon from '@mui/icons-material/Badge';
import { catalogApi } from '../../api/pandoraApi';
import { apiError } from '../../api/apiError';

const EMPTY = {
  fullName: '', position: '', email: '', phone: '',
  departmentId: '', isActive: true,
};

const initials = (name) => name?.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() ?? '?';

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [search, setSearch]     = useState('');
  const [filterDept, setFilterDept] = useState('');

  const [open, setOpen]         = useState(false);
  const [editing, setEditing]   = useState(null);
  const [form, setForm]         = useState(EMPTY);
  const [saving, setSaving]     = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([catalogApi.getEmployees(), catalogApi.getDepartments()])
      .then(([er, dr]) => { setEmployees(er.data); setDepartments(dr.data); })
      .catch(() => setError('Error al cargar datos.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const filtered = employees.filter(e => {
    const q = search.toLowerCase();
    const matchSearch = !q || [e.fullName, e.position, e.email, e.departmentName]
      .some(v => v?.toLowerCase().includes(q));
    const matchDept = !filterDept || e.departmentId === filterDept;
    return matchSearch && matchDept;
  });

  const openNew  = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (e) => {
    setEditing(e);
    setForm({
      fullName:     e.fullName,
      position:     e.position || '',
      email:        e.email || '',
      phone:        e.phone || '',
      departmentId: e.departmentId || '',
      isActive:     e.isActive,
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.fullName.trim()) return;
    setSaving(true);
    const payload = {
      ...form,
      departmentId: form.departmentId || null,
    };
    try {
      if (editing) {
        await catalogApi.updateEmployee(editing.id, payload);
      } else {
        await catalogApi.createEmployee(payload);
      }
      setOpen(false);
      load();
    } catch (e) {
      setError(apiError(e, 'Error al guardar.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (emp) => {
    if (!window.confirm(`¿Eliminar a "${emp.fullName}"?`)) return;
    try {
      await catalogApi.deleteEmployee(emp.id);
      load();
    } catch (e) {
      setError(apiError(e, 'Error al eliminar.'));
    }
  };

  const AVATAR_COLORS = [
    '#1976d2','#388e3c','#f57c00','#7b1fa2','#c62828','#00838f',
  ];
  const avatarColor = (name) => AVATAR_COLORS[(name?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Personal</Typography>
          <Typography variant="body2" color="text.secondary">
            {filtered.length} persona{filtered.length !== 1 ? 's' : ''} registrada{filtered.length !== 1 ? 's' : ''}
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openNew} sx={{ borderRadius: 2 }}>
          Nuevo empleado
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Filtros */}
      <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={5}>
            <TextField
              size="small" fullWidth placeholder="Buscar por nombre, puesto, correo…"
              value={search} onChange={e => setSearch(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
            />
          </Grid>
          <Grid item xs={12} sm={4} md={3}>
            <TextField
              select size="small" fullWidth label="Departamento"
              value={filterDept} onChange={e => setFilterDept(e.target.value)}
            >
              <MenuItem value="">Todos</MenuItem>
              {departments.map(d => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={2} md={4} sx={{ textAlign: 'right' }}>
            <Button size="small" onClick={() => { setSearch(''); setFilterDept(''); }}>
              Limpiar
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Tabla */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 6 }}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 700 }}>Nombre</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Cargo / Puesto</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Departamento</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Correo</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Teléfono</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Estado</TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No hay personal que coincida con los filtros.
                  </TableCell>
                </TableRow>
              ) : filtered.map(emp => (
                <TableRow key={emp.id} hover>
                  <TableCell>
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                      <Avatar sx={{ width: 32, height: 32, bgcolor: avatarColor(emp.fullName), fontSize: 12, fontWeight: 700 }}>
                        {initials(emp.fullName)}
                      </Avatar>
                      <Typography variant="body2" fontWeight={600}>{emp.fullName}</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    {emp.position
                      ? <Chip icon={<BadgeIcon />} label={emp.position} size="small" variant="outlined" />
                      : <Typography variant="caption" color="text.disabled">Sin cargo</Typography>
                    }
                  </TableCell>
                  <TableCell>{emp.departmentName || <Typography variant="caption" color="text.disabled">Sin depto.</Typography>}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{emp.email || '—'}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{emp.phone || '—'}</TableCell>
                  <TableCell align="center">
                    <Chip label={emp.isActive ? 'Activo' : 'Inactivo'} size="small" color={emp.isActive ? 'success' : 'default'} />
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      <Tooltip title="Editar">
                        <IconButton size="small" onClick={() => openEdit(emp)}><EditIcon fontSize="small" /></IconButton>
                      </Tooltip>
                      <Tooltip title="Eliminar">
                        <IconButton size="small" color="error" onClick={() => handleDelete(emp)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
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
        <DialogTitle fontWeight={700}>{editing ? 'Editar empleado' : 'Nuevo empleado'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label="Nombre completo *" value={form.fullName} autoFocus fullWidth
                onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Cargo / Puesto" value={form.position} fullWidth
                onChange={e => setForm(f => ({ ...f, position: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select label="Departamento" value={form.departmentId} fullWidth
                onChange={e => setForm(f => ({ ...f, departmentId: e.target.value }))}
              >
                <MenuItem value="">Sin departamento</MenuItem>
                {departments.map(d => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Correo electrónico" type="email" value={form.email} fullWidth
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Teléfono" value={form.phone} fullWidth
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave} disabled={!form.fullName.trim() || saving}>
            {saving ? <CircularProgress size={20} /> : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
