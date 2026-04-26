import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Card, CardContent, Stack, Button, Chip, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Alert,
  ToggleButton, ToggleButtonGroup, CircularProgress, Tooltip, Switch,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  FormGroup, FormControlLabel, Checkbox, Divider, Radio, RadioGroup,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import PersonIcon from '@mui/icons-material/Person';
import { userApi } from '../api/pandoraApi';
import { MODULE_LABELS, MODULES, useAuth } from '../hooks/useAuth.jsx';

const ALL_MODULES = Object.entries(MODULE_LABELS).map(([value, label]) => ({
  value: parseInt(value),
  label,
}));

const ALL_MODULES_VALUE = Object.entries(MODULE_LABELS)
  .filter(([v]) => parseInt(v) !== MODULES.ADMIN)
  .reduce((acc, [v]) => acc | parseInt(v), 0);

const EMPTY_FORM = {
  username: '', fullName: '', email: '', position: '',
  password: '', role: 'User', modules: 0, isActive: true,
};

export default function Admin() {
  const { username: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const load = () =>
    userApi.getAll()
      .then(r => setUsers(r.data))
      .catch(() => setError('Error al cargar usuarios.'))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setSaveError('');
    setOpen(true);
  };

  const openEdit = (u) => {
    setEditing(u);
    setForm({
      username: u.username,
      fullName: u.fullName,
      email: u.email,
      position: u.position || '',
      password: '',
      role: u.role,
      modules: u.modules,
      isActive: u.isActive,
    });
    setSaveError('');
    setOpen(true);
  };

  const toggleModule = (mod) => {
    setForm(f => ({ ...f, modules: f.modules ^ mod }));
  };

  const handleSave = async () => {
    if (!editing && !form.password.trim()) {
      setSaveError('La contraseña es requerida para nuevos usuarios.');
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      if (editing) {
        await userApi.update(editing.id, {
          fullName: form.fullName,
          email: form.email,
          password: form.password || undefined,
          role: form.role,
          position: form.position || null,
          modules: form.modules,
          isActive: form.isActive,
        });
      } else {
        await userApi.create({
          username: form.username,
          fullName: form.fullName,
          email: form.email,
          password: form.password,
          role: form.role,
          position: form.position || null,
          modules: form.modules,
          isActive: form.isActive,
        });
      }
      setOpen(false);
      load();
    } catch (err) {
      setSaveError(err.response?.data || err.message || 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (u) => {
    if (u.username === currentUser) {
      setError('No puedes eliminar tu propio usuario.');
      return;
    }
    if (!confirm(`¿Eliminar al usuario "${u.fullName}"?`)) return;
    try {
      await userApi.remove(u.id);
      load();
    } catch {
      setError('Error al eliminar el usuario.');
    }
  };

  const moduleChips = (modules) =>
    ALL_MODULES.filter(m => modules & m.value).map(m => (
      <Chip key={m.value} label={m.label} size="small" variant="outlined"
        color={m.value === MODULES.ADMIN ? 'error' : 'primary'} sx={{ mr: 0.5, mb: 0.5 }} />
    ));

  return (
    <Box sx={{ p: 4 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <AdminPanelSettingsIcon color="primary" sx={{ fontSize: 32 }} />
          <Typography variant="h4" fontWeight={800} color="primary.main">Administración de Usuarios</Typography>
        </Stack>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>Nuevo Usuario</Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

      <Card>
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box textAlign="center" py={6}><CircularProgress /></Box>
          ) : (
            <TableContainer component={Paper} elevation={0}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'primary.main' }}>
                    {['Usuario', 'Nombre Completo', 'Puesto', 'Correo', 'Rol', 'Módulos', 'Activo', ''].map(h => (
                      <TableCell key={h} sx={{ color: 'white', fontWeight: 700 }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map(u => (
                    <TableRow key={u.id} hover>
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{u.username}</TableCell>
                      <TableCell>{u.fullName}</TableCell>
                      <TableCell sx={{ color: 'text.secondary', fontSize: 13 }}>{u.position || '—'}</TableCell>
                      <TableCell sx={{ color: 'text.secondary', fontSize: 13 }}>{u.email}</TableCell>
                      <TableCell>
                        <Chip
                          icon={u.role === 'Admin' ? <AdminPanelSettingsIcon /> : <PersonIcon />}
                          label={u.role === 'Admin' ? 'Administrador' : 'Usuario'}
                          color={u.role === 'Admin' ? 'error' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell sx={{ maxWidth: 280 }}>
                        {u.role === 'Admin'
                          ? <Chip label="Acceso total" size="small" color="error" variant="outlined" />
                          : <Box>{moduleChips(u.modules)}</Box>
                        }
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={u.isActive ? 'Activo' : 'Inactivo'}
                          color={u.isActive ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                        <Tooltip title="Editar">
                          <IconButton size="small" onClick={() => openEdit(u)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={u.username === currentUser ? 'No puedes eliminarte a ti mismo' : 'Eliminar'}>
                          <span>
                            <IconButton
                              size="small" color="error"
                              onClick={() => handleDelete(u)}
                              disabled={u.username === currentUser}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                  {users.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                        No hay usuarios registrados.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Diálogo crear/editar */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>
          {editing ? `Editar: ${editing.fullName}` : 'Nuevo Usuario'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2.5} mt={0.5}>
            <TextField
              label="Usuario (login)" fullWidth value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              disabled={!!editing}
              helperText={editing ? 'El usuario no se puede cambiar' : 'Solo minúsculas, sin espacios'}
            />
            <TextField
              label="Nombre completo" fullWidth value={form.fullName}
              onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
            />
            <TextField
              label="Puesto / Cargo" fullWidth value={form.position}
              onChange={e => setForm(f => ({ ...f, position: e.target.value }))}
              placeholder="Ej: Coordinador de TI, Docente, Director…"
            />
            <TextField
              label="Correo electrónico" fullWidth value={form.email} type="email"
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            />
            <TextField
              label={editing ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña'}
              fullWidth type="password" value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            />
            <Box>
              <Typography variant="subtitle2" fontWeight={600} mb={1}>Rol</Typography>
              <ToggleButtonGroup
                value={form.role} exclusive
                onChange={(_, v) => v && setForm(f => ({ ...f, role: v }))}
                fullWidth
              >
                <ToggleButton value="User">Usuario</ToggleButton>
                <ToggleButton value="Admin" sx={{ color: form.role === 'Admin' ? 'error.main' : undefined }}>
                  Administrador
                </ToggleButton>
              </ToggleButtonGroup>
              {form.role === 'Admin' && (
                <Alert severity="warning" sx={{ mt: 1 }} icon={false}>
                  El Administrador tiene acceso a todos los módulos automáticamente.
                </Alert>
              )}
            </Box>

            {form.role === 'User' && (
              <Box>
                <Divider sx={{ mb: 1.5 }} />
                <Typography variant="subtitle2" fontWeight={600} mb={0.5}>Acceso</Typography>

                {/* Selector rápido */}
                <RadioGroup
                  row
                  value={form.modules === ALL_MODULES_VALUE ? 'todos' : 'personalizado'}
                  onChange={e => {
                    if (e.target.value === 'todos') setForm(f => ({ ...f, modules: ALL_MODULES_VALUE }));
                  }}
                  sx={{ mb: 1 }}
                >
                  <FormControlLabel value="todos"       control={<Radio size="small" />} label="Todos los módulos" />
                  <FormControlLabel value="personalizado" control={<Radio size="small" />} label="Personalizado" />
                </RadioGroup>

                {/* Checkboxes individuales */}
                <Typography variant="caption" color="text.secondary" mb={0.5} display="block">
                  Selección manual de módulos:
                </Typography>
                <FormGroup>
                  {ALL_MODULES.filter(m => m.value !== MODULES.ADMIN).map(m => (
                    <FormControlLabel
                      key={m.value}
                      control={
                        <Checkbox
                          checked={!!(form.modules & m.value)}
                          onChange={() => toggleModule(m.value)}
                          color="primary"
                          size="small"
                        />
                      }
                      label={<Typography variant="body2">{m.label}</Typography>}
                    />
                  ))}
                </FormGroup>
              </Box>
            )}

            {editing && (
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="body2">Estado</Typography>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography variant="body2" color="text.secondary">Inactivo</Typography>
                  <Switch
                    checked={form.isActive}
                    onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                    color="success"
                  />
                  <Typography variant="body2" color="success.main">Activo</Typography>
                </Stack>
              </Stack>
            )}

            {saveError && <Alert severity="error">{saveError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            variant="contained" onClick={handleSave} disabled={saving ||
              !form.fullName.trim() || (!editing && !form.username.trim())}
          >
            {saving ? <CircularProgress size={18} /> : (editing ? 'Guardar Cambios' : 'Crear Usuario')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
