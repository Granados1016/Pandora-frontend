import { useEffect, useState } from 'react';
import {
  Box, Typography, Card, CardContent, Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, Paper, Select, MenuItem, Switch, Chip, CircularProgress, Snackbar, Alert,
  TextField, InputAdornment, Avatar, Stack, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, FormControlLabel, InputLabel, FormControl,
} from '@mui/material';
import SearchIcon            from '@mui/icons-material/Search';
import ManageAccountsIcon    from '@mui/icons-material/ManageAccounts';
import PersonAddIcon         from '@mui/icons-material/PersonAdd';
import { superAdminApi, tenantsApi } from '../../api/pandoraApi';

const EMPTY_FORM = {
  username: '', fullName: '', email: '', password: '',
  role: 'User', tenantId: '', position: '', isActive: true,
  googleOnly: false,
};

const ROLE_OPTIONS = [
  { value: 'SuperAdmin',   label: 'Super Admin',  color: 'secondary' },
  { value: 'Admin',        label: 'Administrador', color: 'primary' },
  { value: 'Inventarista', label: 'Inventarista',  color: 'info' },
  { value: 'User',         label: 'Usuario',       color: 'default' },
];

export default function UsersRolesPage() {
  const [users,   setUsers]   = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q,       setQ]       = useState('');
  const [busy,    setBusy]    = useState(null);   // id en proceso
  const [snack,   setSnack]   = useState(null);   // { sev, msg }
  const [open,    setOpen]    = useState(false);  // diálogo nuevo usuario
  const [form,    setForm]    = useState(EMPTY_FORM);
  const [saving,  setSaving]  = useState(false);
  const [formErr, setFormErr] = useState('');

  const load = () => {
    setLoading(true);
    superAdminApi.listUsers()
      .then(r => setUsers(r.data))
      .catch(() => setSnack({ sev: 'error', msg: 'No se pudieron cargar los usuarios.' }))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
    tenantsApi.getAll().then(r => setTenants(r.data)).catch(() => {});
  }, []);

  const openNew = () => {
    setForm({ ...EMPTY_FORM, tenantId: tenants[0]?.id || '' });
    setFormErr('');
    setOpen(true);
  };

  const createUser = async () => {
    if (!form.username.trim()) { setFormErr('El usuario es obligatorio.'); return; }
    if (form.googleOnly) {
      if (!form.email.trim()) { setFormErr('Para una cuenta institucional (Google) el correo es obligatorio.'); return; }
    } else if (!form.password || form.password.length < 6) {
      setFormErr('La contraseña debe tener al menos 6 caracteres.'); return;
    }
    if (!form.tenantId) { setFormErr('Selecciona un cliente.'); return; }
    setSaving(true); setFormErr('');
    try {
      await superAdminApi.createUser({
        username:   form.username.trim(),
        fullName:   form.fullName.trim() || null,
        email:      form.email.trim() || null,
        password:   form.googleOnly ? null : form.password,
        role:       form.role,
        tenantId:   form.tenantId,
        position:   form.position.trim() || null,
        isActive:   form.isActive,
        googleOnly: form.googleOnly,
      });
      setOpen(false);
      setSnack({ sev: 'success', msg: `Usuario ${form.username.trim()} creado.` });
      load();
    } catch (e) {
      setFormErr(e?.response?.data || e?.response?.data?.message || 'No se pudo crear el usuario.');
    } finally { setSaving(false); }
  };

  const changeRole = async (u, role) => {
    if (role === u.role) return;
    setBusy(u.id);
    try {
      await superAdminApi.setRole(u.id, role);
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, role } : x));
      setSnack({ sev: 'success', msg: `Rol de ${u.username} cambiado a ${role}.` });
    } catch {
      setSnack({ sev: 'error', msg: 'No se pudo cambiar el rol.' });
    } finally { setBusy(null); }
  };

  const toggleActive = async (u) => {
    setBusy(u.id);
    try {
      await superAdminApi.toggleActive(u.id);
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, isActive: !x.isActive } : x));
    } catch {
      setSnack({ sev: 'error', msg: 'No se pudo cambiar el estado.' });
    } finally { setBusy(null); }
  };

  const filtered = users.filter(u => {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return [u.username, u.fullName, u.email, u.tenantName, u.role]
      .some(v => (v || '').toLowerCase().includes(s));
  });

  return (
    <Box>
      <Stack direction="row" spacing={1.5} alignItems="center" mb={0.5}>
        <Avatar sx={{ bgcolor: 'primary.main' }}><ManageAccountsIcon /></Avatar>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h5" fontWeight={800} color="primary.main">Usuarios y Roles</Typography>
          <Typography variant="body2" color="text.secondary">
            Gestión global de roles a través de todos los clientes (solo Super Admin).
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<PersonAddIcon />} onClick={openNew} sx={{ borderRadius: 2 }}>
          Nuevo usuario
        </Button>
      </Stack>

      <Card sx={{ mt: 2, borderRadius: 3 }}>
        <CardContent>
          <TextField
            size="small" placeholder="Buscar por usuario, nombre, correo o cliente…"
            value={q} onChange={e => setQ(e.target.value)} fullWidth sx={{ mb: 2, maxWidth: 480 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          />

          {loading ? (
            <Box textAlign="center" py={6}><CircularProgress /></Box>
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'primary.main' }}>
                    {['Usuario', 'Cliente', 'Rol', 'Activo'].map(h => (
                      <TableCell key={h} sx={{ color: 'white', fontWeight: 700 }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map((u, i) => (
                    <TableRow key={u.id} hover sx={{ bgcolor: i % 2 ? 'grey.50' : 'white' }}>
                      <TableCell>
                        <Typography fontWeight={600} fontSize="0.9rem">{u.fullName || u.username}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {u.username}{u.email ? ` · ${u.email}` : ''}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={u.tenantName} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Select
                          size="small" value={u.role}
                          onChange={e => changeRole(u, e.target.value)}
                          disabled={busy === u.id}
                          sx={{ minWidth: 160 }}
                        >
                          {ROLE_OPTIONS.map(r => (
                            <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
                          ))}
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Switch checked={u.isActive} onChange={() => toggleActive(u)} disabled={busy === u.id} />
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      Sin usuarios que coincidan.
                    </TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onClose={() => !saving && setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: 'primary.main' }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <PersonAddIcon /> <span>Nuevo usuario</span>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          {formErr && <Alert severity="error" sx={{ mb: 2 }}>{formErr}</Alert>}
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <TextField
              label="Usuario" required size="small" fullWidth
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              helperText="Se guardará en minúsculas. Es el identificador de inicio de sesión."
            />
            <TextField
              label="Nombre completo" size="small" fullWidth
              value={form.fullName}
              onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
            />
            <TextField
              label={form.googleOnly ? 'Correo institucional' : 'Correo'} type="email"
              required={form.googleOnly} size="small" fullWidth
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              helperText={form.googleOnly ? 'Con este correo entrará por Google (sin contraseña).' : ''}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={form.googleOnly}
                  onChange={e => setForm(f => ({ ...f, googleOnly: e.target.checked }))}
                />
              }
              label="Acceso con cuenta institucional (Google), sin contraseña"
            />
            {!form.googleOnly && (
              <TextField
                label="Contraseña" type="password" required size="small" fullWidth
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                helperText="Mínimo 6 caracteres."
              />
            )}
            <FormControl size="small" fullWidth required>
              <InputLabel id="tenant-lbl">Cliente</InputLabel>
              <Select
                labelId="tenant-lbl" label="Cliente" value={form.tenantId}
                onChange={e => setForm(f => ({ ...f, tenantId: e.target.value }))}
              >
                {tenants.map(t => (
                  <MenuItem key={t.id} value={t.id}>{t.displayName || t.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel id="role-lbl">Rol</InputLabel>
              <Select
                labelId="role-lbl" label="Rol" value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              >
                {ROLE_OPTIONS.map(r => (
                  <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Puesto / Cargo" size="small" fullWidth
              value={form.position}
              onChange={e => setForm(f => ({ ...f, position: e.target.value }))}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={form.isActive}
                  onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                />
              }
              label="Activo"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
          <Button
            variant="contained" onClick={createUser} disabled={saving}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <PersonAddIcon />}
          >
            {saving ? 'Creando…' : 'Crear usuario'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!snack} autoHideDuration={3500} onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {snack ? <Alert severity={snack.sev} variant="filled" onClose={() => setSnack(null)}>{snack.msg}</Alert> : undefined}
      </Snackbar>
    </Box>
  );
}
